import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";
import backofficeDataExportHandler from "./api/backoffice/data-export.js";
import backofficeDnsHandler from "./api/backoffice/dns.js";
import dispatchCalendarHandler from "./api/backoffice/dispatch-calendar.js";
import stockLetterHandler from "./api/commerce/stock-letter.js";
import stockLetterAdminHandler from "./api/backoffice/stock-letter.js";
import planProductsHandler from './api/backoffice/plan-products.js';
import mealprepStockHandler from './api/backoffice/mealprep-stock.js';
import stockHandoffHandler from './api/backoffice/mealprep-stock-handoff.js';
import stockOperationHandler from './api/backoffice/mealprep-stock-operation.js';
import stockBindingHandler from './api/backoffice/mealprep-stock-binding.js';
import localMenuHandler from "./api/commerce/local-menu.js";
import localMenuAdminHandler from "./api/backoffice/local-menu.js";
import mealprepAvailabilityHandler from "./api/backoffice/mealprep-availability.js";
import backofficeExportsHandler from "./api/backoffice/exports.js";
import backofficePasswordRecoveryHandler from "./api/backoffice/password-recovery.js";
import backofficeR2AssetsHandler from "./api/backoffice/r2-assets.js";
import mediaHandler from "./api/media.js";
import core360CatalogHandler from "./api/commerce/catalog-projection.js";
import checkoutQuoteHandler from "./api/commerce/checkout-quote.js";
import core360MenuImageHandler from "./api/commerce/menu-image.js";
import core360RecoveryHandler from "./api/internal/core360/recover.js";
import mercadoPagoPaymentsHandler from "./api/mercadopago/payments.js";
import mercadoPagoPreferencesHandler from "./api/mercadopago/preferences.js";
import mercadoPagoWebhookHandler from "./api/mercadopago/webhook.js";
import mercadoPagoTestSessionHandler from './api/mercadopago/test-session.js';
import mercadoPagoTestWebhookHandler from './api/mercadopago/test-webhook.js';
import subscriptionsHandler from "./api/subscriptions.js";
import sitemapHandler from "./api/sitemap.xml.js";
import uploadMediaHandler from "./api/upload-media.js";

function mountApiHandler(server, path, handler) {
  server.middlewares.use(path, async (req, res) => {
    const url = new URL(req.url || "", "http://localhost");
    req.query = Object.fromEntries(url.searchParams.entries());
    // Vercel helpers are absent on Vite's native ServerResponse.
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return res;
    };
    await handler(req, res);
  });
}

function apiDevServer() {
  return {
    name: "fullness-api-dev-server",
    configureServer(server) {
      mountApiHandler(server, "/api/backoffice/data-export", backofficeDataExportHandler);
      mountApiHandler(server, "/api/backoffice/dns", backofficeDnsHandler);
      mountApiHandler(server, "/api/backoffice/dispatch-calendar", dispatchCalendarHandler);
      mountApiHandler(server, "/api/backoffice/stock-letter", stockLetterAdminHandler);
      mountApiHandler(server, '/api/backoffice/plan-products', planProductsHandler);
      mountApiHandler(server, '/api/backoffice/mealprep-stock-handoff', stockHandoffHandler);
      mountApiHandler(server, '/api/backoffice/mealprep-stock-operation', stockOperationHandler);
      mountApiHandler(server, '/api/backoffice/mealprep-stock-binding', stockBindingHandler);
      mountApiHandler(server, '/api/backoffice/mealprep-stock', mealprepStockHandler);
      mountApiHandler(server, "/api/commerce/stock-letter", stockLetterHandler);
      mountApiHandler(server, "/api/commerce/local-menu", localMenuHandler);
      mountApiHandler(server, "/api/backoffice/local-menu", localMenuAdminHandler);
      mountApiHandler(server, "/api/backoffice/mealprep-availability", mealprepAvailabilityHandler);
      mountApiHandler(server, "/api/backoffice/exports", backofficeExportsHandler);
      mountApiHandler(server, "/api/backoffice/password-recovery", backofficePasswordRecoveryHandler);
      mountApiHandler(server, "/api/backoffice/r2-assets", backofficeR2AssetsHandler);
      mountApiHandler(server, "/api/media", mediaHandler);
      mountApiHandler(server, "/api/commerce/catalog-projection", core360CatalogHandler);
      mountApiHandler(server, "/api/commerce/checkout-quote", checkoutQuoteHandler);
      mountApiHandler(server, "/api/commerce/menu-image", core360MenuImageHandler);
      mountApiHandler(server, "/api/internal/core360/recover", core360RecoveryHandler);
      mountApiHandler(server, "/api/upload-media", uploadMediaHandler);
      mountApiHandler(server, "/api/mercadopago/preferences", mercadoPagoPreferencesHandler);
      mountApiHandler(server, "/api/mercadopago/payments", mercadoPagoPaymentsHandler);
      mountApiHandler(server, "/api/mercadopago/webhook", mercadoPagoWebhookHandler);
      mountApiHandler(server, '/api/mercadopago/test-session', mercadoPagoTestSessionHandler);
      mountApiHandler(server, '/api/mercadopago/test-webhook', mercadoPagoTestWebhookHandler);
      mountApiHandler(server, "/api/subscriptions", subscriptionsHandler);
      mountApiHandler(server, "/api/sitemap.xml", sitemapHandler);
      mountApiHandler(server, "/sitemap.xml", sitemapHandler);
    }
  };
}

export default defineConfig({
  // Local QA/release snapshots under runtime/ are not application entrypoints.
  optimizeDeps: {entries: ["index.html"]},
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), apiDevServer()]
});
