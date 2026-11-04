import assert from "node:assert/strict";

const environmentKeys = [
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "ORDER_NOTIFICATION_RECIPIENT",
  "RESEND_API_KEY",
  "SITE_URL"
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

try {
  Object.assign(process.env, {
    EMAIL_FROM: "Fullness Lab <cecilia@fullnesslab.com>",
    EMAIL_REPLY_TO: "cecilia@fullnesslab.com",
    ORDER_NOTIFICATION_RECIPIENT: "cecilia@fullnesslab.com",
    RESEND_API_KEY: "re_qa",
    SITE_URL: "https://www.fullnesslab.com"
  });

  const messages = [];
  globalThis.fetch = async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return new Response(JSON.stringify({id: `email-${messages.length}`}), {
      status: 200,
      headers: {"Content-Type": "application/json"}
    });
  };

  const {sendApprovedOrderEmails, sendOrderStatusUpdateEmail} = await import("../server/transactional-email.mjs");
  const supabase = createEmailDeliveryStore();
  const order = {
    id: "620b9baa-8b74-4baf-8d30-3dd552ae1b6d",
    subtotal_clp: 58200,
    delivery_fee_clp: 3990,
    total_clp: 62190,
    customer_snapshot: {
      name: "Cliente QA",
      email: "cliente@example.com",
      phone: "+56 9 1234 5678",
      mode: "delivery",
      address: "Avenida Prueba 123, departamento 4",
      comuna: "Lo Barnechea",
      instructions: "Llamar al llegar"
    }
  };
  const items = [
    {quantity: 1, product_name: "Plan semanal antinflamatorio"},
    {quantity: 2, product_name: "Apple golden chicken"}
  ];

  const firstDelivery = await sendApprovedOrderEmails({order, items, supabase});
  assert.equal(firstDelivery.customer.sent, true);
  assert.equal(firstDelivery.operations.sent, true);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to[0], "cliente@example.com");
  assert.equal(messages[1].to[0], "cecilia@fullnesslab.com");
  assert.match(messages[1].text, /Avenida Prueba 123/);
  assert.match(messages[1].text, /Plan semanal antinflamatorio/);
  assert.match(messages[1].text, /Lo Barnechea/);
  for (const message of messages.slice(0, 2)) {
    assert.match(message.text, /Subtotal de productos:.*58.200/);
    assert.match(message.text, /Envío:.*3.990/);
    assert.match(message.text, /Total:.*62.190/);
    assert.match(message.html, /Envío:.*3.990/);
  }

  const duplicateDelivery = await sendApprovedOrderEmails({order, items, supabase});
  assert.equal(duplicateDelivery.customer.duplicate, true);
  assert.equal(duplicateDelivery.operations.duplicate, true);
  assert.equal(messages.length, 2, "Un reintento no debe reenviar correos aceptados.");

  const statusDelivery = await sendOrderStatusUpdateEmail({
    order,
    items,
    nextStatus: "preparing",
    supabase
  });
  assert.equal(statusDelivery.sent, true);
  assert.equal(messages.length, 3);
  assert.equal(messages[2].to[0], "cliente@example.com");
  assert.match(messages[2].subject, /preparando/i);

  const duplicateStatusDelivery = await sendOrderStatusUpdateEmail({
    order,
    items,
    nextStatus: "preparing",
    supabase
  });
  assert.equal(duplicateStatusDelivery.duplicate, true);
  assert.equal(messages.length, 3, "Un mismo cambio de estado no debe reenviar el correo.");

  const sandboxSupabase = createEmailDeliveryStore();
  const testDelivery = await sendApprovedOrderEmails({
    order: {...order, checkout_mode: "test", id: "1e1f75b8-e2d6-4ad1-82a8-4e5f88741f23"},
    items,
    supabase: sandboxSupabase
  });
  assert.equal(testDelivery.customer.reason, "test-checkout");
  assert.equal(testDelivery.operations.reason, "test-checkout");
  assert.equal(messages.length, 3, "Una compra TEST nunca dispara correos comerciales.");

  for(const mode of ['delivery','pickup']){
    const before=messages.length;
    await sendApprovedOrderEmails({order:{...order,id:mode+'-qa',delivery_fee_clp:0,total_clp:58200,customer_snapshot:{...order.customer_snapshot,mode,comuna:'Providencia'}},items,supabase:createEmailDeliveryStore()});
    for(const message of messages.slice(before)){
      assert.match(message.text,mode==='delivery'?/no incluye despacho/:/Retiro en local, sin costo/);
      if(mode==='delivery')assert.match(message.html,/wa.me\/56996588199/);
    }
  }
  for(const mode of ['delivery','pickup']){
    const before=messages.length;
    await sendApprovedOrderEmails({order:{...order,id:'mix-'+mode+'-qa',delivery_fee_clp:0,discount_clp:23520,subtotal_clp:235200,total_clp:211680,customer_snapshot:{...order.customer_snapshot,purchaseModel:'mix_v1',mode}},items,supabase:createEmailDeliveryStore()});
    const customer=messages[before];
    assert.match(customer.text,mode==='delivery'?/Te informaremos el valor del despacho para tu aprobación antes de coordinar el envío\./:/Te contactaremos para coordinar el retiro de tu pedido\./);
    assert.match(customer.html,/Arma tu mix/);
    assert.match(customer.text,/Descuento Fullness Rewards:.*23.520/);
    assert.match(customer.text,/Total:.*211.680/);
    assert.doesNotMatch(customer.text,/3.990|5.990/);
  }
  console.log("Checkout email QA OK: tarifas legacy, mix con despacho separado/retiro, descuento, deduplicación y aislamiento TEST verificados.");
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function createEmailDeliveryStore() {
  const rows = [];

  return {
    from(table) {
      assert.equal(table, "email_deliveries");

      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, "delivery_key");
              return {
                maybeSingle: async () => ({
                  data: rows.find((row) => row.delivery_key === value) || null,
                  error: null
                })
              };
            }
          };
        },
        insert(record) {
          return {
            select() {
              return {
                single: async () => {
                  const data = {id: `delivery-${rows.length + 1}`, ...record};
                  rows.push(data);
                  return {data, error: null};
                }
              };
            }
          };
        },
        update(changes) {
          return {
            eq(column, value) {
              assert.equal(column, "id");
              const row = rows.find((item) => item.id === value);
              assert.ok(row, "La entrega que se actualiza debe existir.");
              Object.assign(row, changes);
              return Promise.resolve({error: null});
            }
          };
        }
      };
    }
  };
}
