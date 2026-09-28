import { defineConfig } from "@playwright/test";

const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/amora_e2e",
  AMORA_MOCK_INTEGRATIONS: "1",
  ADMIN_PHONES: "254700000001",
  ID_HASH_PEPPER: "e2e-pepper",
  CRON_SECRET: "e2e-cron",
  APP_URL: "http://localhost:3100",
  ANTHROPIC_API_KEY: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
      // Use a preinstalled Chromium when the environment provides one.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    },
  },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env,
  },
});

process.env.E2E_DATABASE_URL = env.DATABASE_URL;
process.env.E2E_CRON_SECRET = env.CRON_SECRET;
