// Supabase LOCAL (supabase start). Nunca aponte os testes para produção.
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
// Chave pública de demonstração do CLI local do Supabase.
export const SUPABASE_KEY =
  process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const PORTA = 3100;
export const BASE_URL = `http://localhost:${PORTA}`;

// Senha das contas de teste criadas no Supabase local.
export const SENHA_TESTE = "Teste-local-123";

// Chave secreta de demonstração do CLI local do Supabase (`npx supabase status`). Só serve no local.
export const SUPABASE_SECRET_KEY =
  process.env.E2E_SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

export const CRON_SECRET = "segredo-do-cron-de-teste";

// Par VAPID só para os testes (gerado com web-push.generateVAPIDKeys()).
export const VAPID_PUBLICA =
  "BPBamALeRYyAQc1AOZ2bO9FOBNHh8niGV2uq1yRX45eYry4tZexyzZ0wE90tfLONxKxaF_atqc_JeVdTNrxYrTM";
export const VAPID_PRIVADA = "y59ycB4SGqKv8b4dBfiOzPb5Z7bZX39q7atXZVEeuyU";

// Servidor de push falso (tests/e2e/push-falso.mjs) e Mailpit do Supabase local.
export const PORTA_PUSH = 3101;
export const PUSH_FALSO = `https://127.0.0.1:${PORTA_PUSH}`;
export const MAILPIT = process.env.E2E_MAILPIT ?? "http://127.0.0.1:54324";
