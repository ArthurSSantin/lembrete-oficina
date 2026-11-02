import { defineConfig, devices } from "@playwright/test";
import {
  BASE_URL,
  CRON_SECRET,
  PORTA,
  PORTA_PUSH,
  PUSH_FALSO,
  SUPABASE_KEY,
  SUPABASE_SECRET_KEY,
  SUPABASE_URL,
  VAPID_PRIVADA,
  VAPID_PUBLICA,
} from "./tests/e2e/ambiente";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // O `next dev` compila cada rota na primeira visita: dá folga.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/servidor.mjs",
      url: `${BASE_URL}/login`,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PORTA_E2E: String(PORTA),
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
        SUPABASE_SECRET_KEY,
        CRON_SECRET,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID_PUBLICA,
        VAPID_PRIVATE_KEY: VAPID_PRIVADA,
        // O push falso usa certificado autoassinado. Só no servidor de teste.
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
        ANTHROPIC_API_KEY: "",
        ANTHROPIC_AUTH_TOKEN: "",
      },
    },
    {
      command: "node tests/e2e/push-falso.mjs",
      url: `${PUSH_FALSO}/saude`,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { PORTA_PUSH: String(PORTA_PUSH) },
    },
  ],
});
