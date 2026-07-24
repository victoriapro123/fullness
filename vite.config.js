import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";
import backofficeDataExportHandler from "./api/backoffice/data-export.js";
import backofficeDnsHandler from "./api/backoffice/dns.js";
import backofficeExportsHandler from "./api/backoffice/exports.js";
import backofficePasswordRecoveryHandler from "./api/backoffice/password-recovery.js";
import backofficeR2AssetsHandler from "./api/backoffice/r2-assets.js";
import mediaHandler from "./api/media.js";
import mercadoPagoPaymentsHandler from "./api/mercadopago/payments.js";
import mercadoPagoPreferencesHandler from "./api/mercadopago/preferences.js";
import mercadoPagoWebhookHandler from "./api/mercadopago/webhook.js";
import subscriptionsHandler from "./api/subscriptions.js";
import uploadMediaHandler from "./api/upload-media.js";

function mountApiHandler(server, path, handler) {
  server.middlewares.use(path, async (req, res) => {
    const url = new URL(req.url || "", "http://localhost");
    req.query = Object.fromEntries(url.searchParams.entries());
    await handler(req, res);
  });
}

function apiDevServer() {
  return {
    name: "fullness-api-dev-server",
    configureServer(server) {
      mountApiHandler(server, "/api/backoffice/data-export", backofficeDataExportHandler);
      mountApiHandler(server, "/api/backoffice/dns", backofficeDnsHandler);
      mountApiHandler(server, "/api/backoffice/exports", backofficeExportsHandler);
      mountApiHandler(server, "/api/backoffice/password-recovery", backofficePasswordRecoveryHandler);
      mountApiHandler(server, "/api/backoffice/r2-assets", backofficeR2AssetsHandler);
      mountApiHandler(server, "/api/media", mediaHandler);
      mountApiHandler(server, "/api/upload-media", uploadMediaHandler);
      mountApiHandler(server, "/api/mercadopago/preferences", mercadoPagoPreferencesHandler);
      mountApiHandler(server, "/api/mercadopago/payments", mercadoPagoPaymentsHandler);
      mountApiHandler(server, "/api/mercadopago/webhook", mercadoPagoWebhookHandler);
      mountApiHandler(server, "/api/subscriptions", subscriptionsHandler);
    }
  };
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), apiDevServer()]
});
