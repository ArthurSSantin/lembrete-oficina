import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta: ignora o RLS. Só para tarefas automáticas no servidor
 * (aviso diário e backup). Nunca importe em componente de navegador.
 */
export function criarAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
