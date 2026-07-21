import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "./r2-media.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));
const RESEND_API_URL = "https://api.resend.com";
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
      ctaHref: "https://fullnesslab.com/tienda",
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
      ctaHref: "https://fullnesslab.com/tienda",
      ctaLabel: "Ver planes"
    })
  });
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

function renderEmail({eyebrow, title, body, details = [], ctaHref, ctaLabel}) {
  const detailList = details.length
    ? `<ul style="margin:24px 0;padding:0;list-style:none;color:#34251f;line-height:1.6;">${details.map((detail) => `<li style="padding:8px 0;border-bottom:1px solid #e6d8c6;">${escapeHtml(detail)}</li>`).join("")}</ul>`
    : "";

  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4eadb;color:#34251f;font-family:Arial,sans-serif;"><main style="max-width:560px;margin:0 auto;padding:40px 24px;"><p style="margin:0 0 16px;color:#8b2735;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 20px;font-size:32px;line-height:1.1;font-weight:500;">${escapeHtml(title)}</h1><p style="margin:0;font-size:16px;line-height:1.7;">${escapeHtml(body)}</p>${detailList}<a href="${escapeHtml(ctaHref)}" style="display:inline-block;margin-top:20px;padding:14px 20px;background:#8b2735;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(ctaLabel)}</a><p style="margin:36px 0 0;color:#6b5547;font-size:13px;line-height:1.6;">Fullness Lab<br>Nutrirse desde la raíz</p></main></body></html>`;
}

function formatClp(value) {
  return new Intl.NumberFormat("es-CL", {style: "currency", currency: "CLP", maximumFractionDigits: 0}).format(Number(value || 0));
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
