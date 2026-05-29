import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@pkg": path.resolve(__dirname, "../../packages"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
