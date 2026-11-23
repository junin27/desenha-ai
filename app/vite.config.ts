import { defineConfig } from "vitest/config";

// `base: "./"` permite abrir o build de qualquer pasta (a demo roda offline, sem servidor fixo).
export default defineConfig({
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
