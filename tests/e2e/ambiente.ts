// Supabase LOCAL (supabase start). Nunca aponte os testes para produção.
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
// Chave pública de demonstração do CLI local do Supabase.
export const SUPABASE_KEY =
  process.env.E2E_SUPABASE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const PORTA = 3100;
export const BASE_URL = `http://localhost:${PORTA}`;

// Senha das contas de teste criadas no Supabase local.
export const SENHA_TESTE = "Teste-local-123";
