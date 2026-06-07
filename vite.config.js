import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";
import mediaHandler from "./api/media.js";

function mediaApiDevServer() {
  return {
    name: "fullness-media-api-dev-server",
    configureServer(server) {
      server.middlewares.use("/api/media", async (req, res) => {
        const url = new URL(req.url || "", "http://localhost");
        req.query = Object.fromEntries(url.searchParams.entries());
        await mediaHandler(req, res);
      });
    }
  };
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), mediaApiDevServer()]
});
