import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // Los módulos de servidor se prueban como en un Server Component (`server-only` vacío).
      "server-only": path.resolve(root, "node_modules/server-only/empty.js"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
