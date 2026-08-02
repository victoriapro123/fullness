import assert from "node:assert/strict";

const environmentKeys = [
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "EMAIL_TEST_RECIPIENT",
  "MERCADOPAGO_TEST_MODE",
  "ORDER_NOTIFICATION_RECIPIENT",
  "RESEND_API_KEY",
  "SITE_URL"
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

try {
  Object.assign(process.env, {
    EMAIL_FROM: "Fullness Lab <hola@fullnesslab.com>",
    EMAIL_REPLY_TO: "hola@fullnesslab.com",
    EMAIL_TEST_RECIPIENT: "qa@fullnesslab.com",
    MERCADOPAGO_TEST_MODE: "false",
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

  const {sendApprovedOrderEmails} = await import("../server/transactional-email.mjs");
  const supabase = createEmailDeliveryStore();
  const order = {
    id: "620b9baa-8b74-4baf-8d30-3dd552ae1b6d",
    total_clp: 58200,
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

  const duplicateDelivery = await sendApprovedOrderEmails({order, items, supabase});
  assert.equal(duplicateDelivery.customer.duplicate, true);
  assert.equal(duplicateDelivery.operations.duplicate, true);
  assert.equal(messages.length, 2, "Un reintento no debe reenviar correos aceptados.");

  process.env.MERCADOPAGO_TEST_MODE = "true";
  const sandboxSupabase = createEmailDeliveryStore();
  await sendApprovedOrderEmails({
    order: {...order, id: "1e1f75b8-e2d6-4ad1-82a8-4e5f88741f23"},
    items,
    supabase: sandboxSupabase
  });
  assert.equal(messages[2].to[0], "qa@fullnesslab.com");
  assert.equal(messages[3].to[0], "qa@fullnesslab.com");

  console.log("Checkout email QA OK: confirmación cliente, aviso operativo, deduplicación y sandbox verificados.");
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
