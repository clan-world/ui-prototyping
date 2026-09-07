import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "happy-dom", include: ["**/*.test.{ts,tsx}"], exclude: ["node_modules/**", ".next/**", "e2e/**"] },
});
