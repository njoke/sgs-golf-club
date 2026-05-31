import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "support/e2e.ts",
    specPattern: "e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
