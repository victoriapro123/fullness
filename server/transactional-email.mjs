import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "./r2-media.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));
const RESEND_API_URL = "https://api.resend.com";
const DEFAULT_SITE_URL = "https://fullnesslab.com";
const DEFAULT_EMAIL_LOGO_URL = "https://pub-16818329ca464c2e9bff6605b2f520f4.r2.dev/assets/brand/fullness-lab-horizontal-contrast-2026.png";
const DEFAULT_ORDER_NOTIFICATION_RECIPIENT = "cecilia@fullnesslab.com";
let supabaseAdmin;

export async function registerEmailSubscriber({email, name, phone}) {
  await localEnvReady;
  const normalized = normalizeSubscriber({email, name, phone});
  const supabase = getSupabaseAdmin();
  const {data: subscriber, error} = await supabase
    .from("email_subscribers")
    .upsert(
      {
        ...normalized,
        source: "subscription-lightbox",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null
      },
      {onConflict: "email"}
    )
    .select("id,email,name")
    .single();

  if (error || !subscriber) {
    throw statusError(502, "No pudimos registrar tu suscripción.", error);
  }

  const delivery = await sendEmailOnce({
    deliveryKey: `welcome:${subscriber.id}`,
    kind: "subscription_welcome",
    recipientEmail: resolveRecipient(subscriber.email),
    subscriberId: subscriber.id,
    subject: "Bienvenida a Fullness Lab",
    text: [
      `Hola ${subscriber.name},`,
      "",
      "Gracias por ser parte de Fullness Lab.",
      "Te iremos compartiendo novedades, planes y experiencias pensadas para nutrirte desde la raíz.",
      "",
      "Fullness Lab"
    ].join("\n"),
    html: renderEmail({
      eyebrow: "Experiencia Fullness",
      title: `Hola, ${subscriber.name}.`,
      body: "Gracias por ser parte de Fullness Lab. Te iremos compartiendo novedades, planes y experiencias pensadas para nutrirte desde la raíz.",
      ctaHref: siteUrl("/tienda"),
      ctaLabel: "Descubrir planes"
    })
  });

  return {emailSent: delivery.sent, subscriber};
}

export async function sendOrderConfirmationEmail({order, items, supabase}) {
  await localEnvReady;
  const customerEmail = cleanText(order.customer_snapshot?.email).toLowerCase();
  if (!customerEmail) return {sent: false, skipped: true};

  const amount = formatClp(order.total_clp);
  const itemLines = (items || []).map((item) => `${item.quantity}x ${item.product_name}`).join("\n");
  const deliveryMode = order.customer_snapshot?.mode === "pickup" ? "Retiro en local" : "Despacho a domicilio";

  return sendEmailOnce({
    deliveryKey: `order-confirmation:${order.id}`,
    kind: "order_confirmation",
    recipientEmail: resolveRecipient(customerEmail),
    orderId: order.id,
    supabase,
    subject: `Confirmamos tu pedido Fullness Lab · ${amount}`,
    text: [
      `Hola ${cleanText(order.customer_snapshot?.name) || ""},`,
      "",
      "Tu pago fue aprobado y recibimos tu pedido Fullness Lab.",
      itemLines,
      "",
      `Total: ${amount}`,
      `Modalidad: ${deliveryMode}`,
      "",
      "Te contactaremos con los detalles de entrega o retiro.",
      "",
      "Fullness Lab"
    ].filter(Boolean).join("\n"),
    html: renderEmail({
      eyebrow: "Pedido confirmado",
      title: "Tu pedido ya está en Fullness.",
      body: "Tu pago fue aprobado. Te contactaremos con los detalles de entrega o retiro.",
      details: [
        ...((items || []).map((item) => `${item.quantity}x ${item.product_name}`)),
        `Total: ${amount}`,
        deliveryMode
      ],
      ctaHref: siteUrl("/tienda"),
      ctaLabel: "Ver planes"
    })
  });
}

export async function sendOrderStatusUpdateEmail({order, items, nextStatus, supabase}) {
  await localEnvReady;

  const customerEmail = cleanText(order.customer_snapshot?.email).toLowerCase();
  if (!customerEmail) return {sent: false, skipped: true, reason: "missing-recipient"};

  const update = orderStatusEmailCopy({order, nextStatus});
  const orderReference = formatOrderReference(order.id);
  const amount = formatClp(order.total_clp);
  const itemLines = (items || []).map((item) => `${item.quantity}x ${item.product_name}`).join("\n");

  return sendEmailOnce({
    deliveryKey: `order-status:${order.id}:${nextStatus}`,
    kind: "order_status_update",
    recipientEmail: resolveRecipient(customerEmail),
    orderId: order.id,
    supabase,
    subject: `${update.subject} · ${orderReference}`,
    text: [
      `Hola ${cleanText(order.customer_snapshot?.name) || ""},`,
      "",
      update.text,
      itemLines,
      "",
      `Total: ${amount}`,
      "",
      "Fullness Lab"
    ].filter(Boolean).join("\n"),
    html: renderEmail({
      eyebrow: "Actualización de pedido",
      title: update.title,
      body: update.text,
      details: [
        `Pedido ${orderReference}`,
        ...((items || []).map((item) => `${item.quantity}x ${item.product_name}`)),
        `Total: ${amount}`
      ],
      ctaHref: siteUrl("/tienda"),
      ctaLabel: "Ver planes"
    })
  });
}

export async function sendOrderNotificationEmail({order, items, supabase}) {
  await localEnvReady;
  const customer = order.customer_snapshot || {};
  const orderReference = formatOrderReference(order.id);
  const amount = formatClp(order.total_clp);
  const deliveryMode = customer.mode === "pickup" ? "Retiro en local" : "Despacho a domicilio";
  const orderLines = (items || []).map((item) => `${item.quantity}x ${item.product_name}`);
  const details = [
    `Orden ${orderReference}`,
    ...orderLines,
    `Total: ${amount}`,
    `Cliente: ${cleanText(customer.name) || "Por confirmar"}`,
    `Correo: ${cleanText(customer.email) || "Por confirmar"}`,
    `Teléfono: ${cleanText(customer.phone) || "Por confirmar"}`,
    `Modalidad: ${deliveryMode}`,
    ...(customer.mode === "delivery" ? [
      `Dirección: ${cleanText(customer.address) || "Por confirmar"}`,
      `Comuna: ${cleanText(customer.comuna) || "Por confirmar"}`
    ] : []),
    ...(cleanText(customer.instructions) ? [`Notas: ${cleanText(customer.instructions)}`] : [])
  ];

  return sendEmailOnce({
    deliveryKey: `order-notification:${order.id}`,
    kind: "order_notification",
    recipientEmail: resolveRecipient(resolveOrderNotificationRecipient()),
    orderId: order.id,
    supabase,
    subject: `Nuevo pedido pagado ${orderReference} · ${amount}`,
    text: [
      "Se aprobó un pago en Fullness Lab.",
      "",
      ...details,
      "",
      "Revisa la orden en el Backoffice para continuar con su preparación."
    ].join("\n"),
    html: renderEmail({
      eyebrow: "Nuevo pedido pagado",
      title: `Orden ${orderReference}`,
      body: "El pago fue aprobado. Revisa sus datos y coordina la preparación, despacho o retiro.",
      details,
      ctaHref: siteUrl("/#backoffice"),
      ctaLabel: "Abrir Backoffice"
    })
  });
}

export async function sendApprovedOrderEmails({order, items, supabase}) {
  const [customer, operations] = await Promise.all([
    sendOrderConfirmationEmail({order, items, supabase}),
    sendOrderNotificationEmail({order, items, supabase})
  ]);

  const failures = [
    !customer.sent && "la confirmación al cliente",
    !operations.sent && "el aviso operativo"
  ].filter(Boolean);

  if (failures.length > 0) {
    throw statusError(502, `No pudimos enviar ${failures.join(" y ")}. Se reintentará automáticamente.`);
  }

  return {customer, operations};
}

async function sendEmailOnce({
  deliveryKey,
  kind,
  recipientEmail,
  subscriberId = null,
  orderId = null,
  subject,
  text,
  html,
  supabase = getSupabaseAdmin()
}) {
  const {data: existing, error: existingError} = await supabase
    .from("email_deliveries")
    .select("id,status")
    .eq("delivery_key", deliveryKey)
    .maybeSingle();

  if (existingError) throw statusError(502, "No pudimos revisar el estado del correo.", existingError);
  if (existing?.status === "sent") return {sent: true, duplicate: true};

  let delivery = existing;
  if (!delivery) {
    const {data, error} = await supabase
      .from("email_deliveries")
      .insert({
        delivery_key: deliveryKey,
        kind,
        recipient_email: recipientEmail,
        subscriber_id: subscriberId,
        order_id: orderId,
        provider: "resend",
        status: "pending"
      })
      .select("id,status")
      .single();

    if (error?.code === "23505") return {sent: false, duplicate: true};
    if (error || !data) throw statusError(502, "No pudimos preparar el correo.", error);
    delivery = data;
  }

  const apiKey = cleanText(process.env.RESEND_API_KEY);
  if (!apiKey) {
    await supabase
      .from("email_deliveries")
      .update({status: "pending", error_message: "RESEND_API_KEY no configurada"})
      .eq("id", delivery.id);
    return {sent: false, skipped: true};
  }

  try {
    const response = await fetch(`${RESEND_API_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: cleanText(process.env.EMAIL_FROM) || "Fullness Lab <hola@fullnesslab.com>",
        reply_to: cleanText(process.env.EMAIL_REPLY_TO) || undefined,
        to: [recipientEmail],
        subject,
        text,
        html
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(cleanText(payload.message || payload.name || "Resend rechazó el correo."));
    }

    await supabase
      .from("email_deliveries")
      .update({
        status: "sent",
        provider_message_id: cleanText(payload.id) || null,
        error_message: null,
        sent_at: new Date().toISOString()
      })
      .eq("id", delivery.id);

    return {sent: true};
  } catch (error) {
    await supabase
      .from("email_deliveries")
      .update({status: "failed", error_message: cleanText(error.message).slice(0, 1000)})
      .eq("id", delivery.id);
    return {sent: false, error: cleanText(error.message)};
  }
}

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = cleanText(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) throw statusError(500, "Falta configurar Supabase para enviar correos.");

  supabaseAdmin = createClient(url, serviceRoleKey, {auth: {autoRefreshToken: false, persistSession: false}});
  return supabaseAdmin;
}

function normalizeSubscriber({email, name, phone}) {
  const normalizedEmail = cleanText(email).toLowerCase();
  const normalizedName = cleanText(name);
  const normalizedPhone = cleanText(phone);

  if (normalizedName.length < 2 || normalizedName.length > 120) throw statusError(422, "Ingresa un nombre válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw statusError(422, "Ingresa un correo válido.");
  if (normalizedPhone.length < 8 || normalizedPhone.length > 30) throw statusError(422, "Ingresa un teléfono válido.");

  return {email: normalizedEmail, name: normalizedName, phone: normalizedPhone};
}

function resolveRecipient(email) {
  if (cleanText(process.env.MERCADOPAGO_TEST_MODE).toLowerCase() === "true") {
    return cleanText(process.env.EMAIL_TEST_RECIPIENT || process.env.ORDER_CONFIRMATION_RECIPIENT) || email;
  }
  return email;
}

function resolveOrderNotificationRecipient() {
  return cleanText(
    process.env.ORDER_NOTIFICATION_RECIPIENT
    || process.env.ORDER_CONFIRMATION_RECIPIENT
    || DEFAULT_ORDER_NOTIFICATION_RECIPIENT
  );
}

function orderStatusEmailCopy({order, nextStatus}) {
  const pickup = order.customer_snapshot?.mode === "pickup";
  const copies = {
    preparing: {
      subject: "Estamos preparando tu pedido Fullness Lab",
      title: "Tu pedido está en preparación.",
      text: "Ya comenzamos a preparar tu pedido con mucho cuidado. Te avisaremos apenas esté listo."
    },
    ready: {
      subject: "Tu pedido Fullness Lab está listo",
      title: pickup ? "Tu pedido está listo para retiro." : "Tu pedido está listo.",
      text: pickup
        ? "Tu pedido ya está preparado y listo para que puedas retirarlo."
        : "Tu pedido ya está preparado y estamos coordinando su despacho."
    },
    out_for_delivery: {
      subject: "Tu pedido Fullness Lab va en camino",
      title: "Tu pedido va en camino.",
      text: "Tu pedido ya salió a despacho y pronto llegará a la dirección indicada."
    },
    delivered: {
      subject: "Tu pedido Fullness Lab fue completado",
      title: pickup ? "Tu retiro fue completado." : "Tu pedido fue entregado.",
      text: "Esperamos que disfrutes esta experiencia pensada para nutrirte desde la raíz."
    },
    cancelled: {
      subject: "Actualización de tu pedido Fullness Lab",
      title: "Tu pedido fue cancelado.",
      text: "Tu pedido fue cancelado. Si corresponde un reembolso, te avisaremos una vez que esté gestionado."
    },
    refunded: {
      subject: "Tu reembolso Fullness Lab fue solicitado",
      title: "Tu reembolso ya fue gestionado.",
      text: "Solicitamos el reembolso completo a Mercado Pago. El abono se reflejará según los plazos de tu medio de pago."
    }
  };

  return copies[nextStatus] || {
    subject: "Actualización de tu pedido Fullness Lab",
    title: "Tu pedido fue actualizado.",
    text: "Actualizamos el estado de tu pedido. Si necesitas ayuda, puedes responder a este correo."
  };
}

function renderEmail({eyebrow, title, body, details = [], ctaHref, ctaLabel}) {
  const detailList = details.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;border-top:1px solid #3a302b;">${details.map((detail) => `<tr><td style="padding:11px 0;border-bottom:1px solid #3a302b;color:#d8cfc3;font-size:15px;line-height:1.55;">${escapeHtml(detail)}</td></tr>`).join("")}</table>`
    : "";
  const logoUrl = cleanText(process.env.EMAIL_LOGO_URL) || DEFAULT_EMAIL_LOGO_URL;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#030405;color:#f4eadb;font-family:'Avenir Next',Avenir,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#030405;"><tr><td align="center" style="padding:28px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #302724;background:#080808;"><tr><td style="padding:34px 34px 26px;border-bottom:1px solid #302724;"><a href="${escapeHtml(siteUrl("/"))}" style="text-decoration:none;"><img src="${escapeHtml(logoUrl)}" width="260" alt="Fullness Lab" style="display:block;width:260px;max-width:72%;height:auto;border:0;"></a></td></tr><tr><td style="padding:38px 34px 42px;"><p style="margin:0 0 18px;color:#a95b65;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 22px;color:#f4eadb;font-size:34px;line-height:1.15;font-weight:400;letter-spacing:0;">${escapeHtml(title)}</h1><p style="margin:0;color:#d8cfc3;font-size:16px;line-height:1.75;font-weight:400;">${escapeHtml(body)}</p>${detailList}<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;"><tr><td style="background:#803f47;border:1px solid #a95b65;"><a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:15px 24px;color:#fff7ed;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(ctaLabel)} &nbsp;↗</a></td></tr></table></td></tr><tr><td style="padding:24px 34px;border-top:1px solid #302724;color:#8f8379;font-size:12px;line-height:1.65;"><a href="${escapeHtml(siteUrl("/"))}" style="color:#bda89a;text-decoration:none;">fullnesslab.com</a><br>Nutrirse desde la raíz</td></tr></table></td></tr></table></body></html>`;
}

function siteUrl(path = "/") {
  const base = (cleanText(process.env.SITE_URL) || DEFAULT_SITE_URL).replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatClp(value) {
  return new Intl.NumberFormat("es-CL", {style: "currency", currency: "CLP", maximumFractionDigits: 0}).format(Number(value || 0));
}

function formatOrderReference(orderId) {
  const normalized = cleanText(orderId).replace(/-/g, "").slice(0, 8).toUpperCase();
  return normalized ? `#${normalized}` : "Fullness";
}

function escapeHtml(value) {
  return cleanText(value).replace(/[&<>'"]/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"})[character]);
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function statusError(statusCode, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.statusCode = statusCode;
  return error;
}
