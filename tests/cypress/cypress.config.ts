import { defineConfig } from "cypress";

export default defineConfig({
  screenshotsFolder: "artifacts/screenshots",
  videosFolder: "artifacts/videos",
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    supportFile: "support/e2e.ts",
    specPattern: "e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      graphqlUrl: process.env.CYPRESS_GRAPHQL_URL ?? "http://localhost:4000/graphql",
    },
  },
});
