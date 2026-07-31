const measurementId = String(import.meta.env?.VITE_GA_MEASUREMENT_ID || "").trim();
let analyticsPromise;

function canTrack() {
  return Boolean(measurementId && import.meta.env.PROD && typeof window !== "undefined");
}

export function initializeAnalytics() {
  if (!canTrack()) return Promise.resolve(false);
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

  void initializeAnalytics().then((ready) => {
    if (!ready || typeof window.gtag !== "function") return;
    window.gtag("event", name, parameters);
  });
}

export function trackPageView(pathname) {
  if (!canTrack()) return;

  void initializeAnalytics().then((ready) => {
    if (!ready || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title
    });
  });
}

export function buildAnalyticsItem(product, quantity = 1) {
  if (!product) return null;

  return {
    item_id: String(product.sku || product.slug || product.id || "").trim(),
    item_name: String(product.name || "").trim(),
    price: Number(product.price) || 0,
    quantity: Number(quantity) || 1
  };
}
