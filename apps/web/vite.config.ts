import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    // Pacote do workspace é CommonJS; força o esbuild a converter para ESM
    // no pre-bundle (sem isso o navegador recebe o CJS puro e falha ao importar).
    include: ["@gestao/shared"],
  },
});
