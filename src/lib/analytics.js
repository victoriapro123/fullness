const measurementId = String(import.meta.env?.VITE_GA_MEASUREMENT_ID || "").trim();
const pixelId = String(import.meta.env?.VITE_META_PIXEL_ID || "").trim();
const metaEvents = {view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase"};
const purchasesInFlight = new Set();
const checkoutStarts = new Set();
let analyticsPromise;
let metaInitialized = false;

function canTrack() {
  return import.meta.env?.PROD && typeof window !== "undefined" &&
    ["www.fullnesslab.com", "fullnesslab.com"].includes(window.location.hostname);
}

function initializeMeta() {
  if (!canTrack() || !/^\d{10,20}$/.test(pixelId)) return false;
  if (metaInitialized) return true;
  if (!window.fbq) {
    const queue = function (...args) {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    };
    queue.push = queue;
    queue.loaded = true;
    queue.version = "2.0";
    queue.queue = [];
    window.fbq = window._fbq = queue;
  }
  window.fbq("set", "autoConfig", false, pixelId);
  window.fbq("init", pixelId);
  metaInitialized = true;
  if (!document.querySelector('script[src^="https://connect.facebook.net/"][src$="/fbevents.js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  return true;
}

export function initializeAnalytics() {
  if (!canTrack() || !/^G-[A-Z0-9]+$/.test(measurementId)) return Promise.resolve(false);
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = new Promise((resolve) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {send_page_view: false});

    if (document.querySelector(`script[data-fullness-ga="${measurementId}"]`)) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.fullnessGa = measurementId;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return analyticsPromise;
}

export function trackEvent(name, parameters = {}) {
  if (!canTrack()) return;

  try {
   if (Object.hasOwn(metaEvents, name) && initializeMeta()) {
    const contents = (parameters.items || []).filter(item => item?.item_id).map(
      item => ({id: item.item_id, quantity: item.quantity, item_price: item.price})
    );
    const data = {currency: "CLP", value: parameters.metaValue ?? parameters.value};
    if (contents.length) Object.assign(data, {
      content_type: "product", content_ids: contents.map(item => item.id), contents,
      num_items: contents.reduce((total, item) => total + item.quantity, 0)
    });
    if (name === "purchase") window.fbq("trackSingle", pixelId, metaEvents[name], data, {eventID: parameters.transaction_id});
    else window.fbq("trackSingle", pixelId, metaEvents[name], data);
   }
  } catch { /* Analytics must not interrupt the storefront. */ }
  const {metaValue, ...gaParameters} = parameters;
  void initializeAnalytics().then((ready) => {
    if (!ready || typeof window.gtag !== "function") return;
    window.gtag("event", name, {...gaParameters, send_to: measurementId});
  }).catch(() => {});
}

export function trackCheckoutStart(checkoutId, items, value) {
  if (!canTrack() || !checkoutId || checkoutStarts.has(checkoutId)) return;
  checkoutStarts.add(checkoutId);
  trackEvent("begin_checkout", {currency: "CLP", value, items});
}

export function trackApprovedPurchase(payment, items = []) {
  if (!canTrack() || (!/^G-[A-Z0-9]+$/.test(measurementId) && !/^\d{10,20}$/.test(pixelId))) return;
  const transactionId = String(payment?.orderId || "").trim();
  const total = Number(payment?.total);
  if (payment?.status !== "approved" || payment.testMode !== false || !transactionId || !Number.isSafeInteger(total) || total <= 0) return;
  if (purchasesInFlight.has(transactionId)) return;
  purchasesInFlight.add(transactionId);
  const emit = () => {
    const key = `fullness_conversion_purchase_v1_${transactionId}`;
    try { if (window.localStorage.getItem(key)) return; } catch { /* Storage may be blocked. */ }
    const shipping = Number(payment.deliveryFee ?? 0);
    trackEvent("purchase", {
      transaction_id: transactionId,
      currency: "CLP",
      value: Math.max(0, total - shipping),
      shipping,
      metaValue: total,
      items
    });
    try { window.localStorage.setItem(key, "1"); } catch { /* In-memory guard still applies. */ }
  };
  // Serialize concurrent payment callbacks across tabs when Web Locks is available.
  if (window.navigator?.locks) void window.navigator.locks.request(`fullness-conversion-${transactionId}`, emit).catch(emit);
  else emit();
}

export function trackPageView(pathname) {
  if (!canTrack()) return;
  try { if (initializeMeta()) window.fbq("trackSingle", pixelId, "PageView"); } catch { /* Optional tracking. */ }

  void initializeAnalytics().then((ready) => {
    if (!ready || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
      send_to: measurementId
    });
  }).catch(() => {});
}

export function buildAnalyticsItem(product, quantity = 1) {
  if (!product) return null;

  return {
    item_id: String(product.sku || product.slug || product.id || "").trim(),
    item_name: String(product.name || "").trim(),
    price: Number(product.price ?? product.priceClp) || 0,
    quantity: Number(quantity) || 1
  };
}
