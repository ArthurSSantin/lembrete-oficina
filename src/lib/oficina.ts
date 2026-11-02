import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Oficina } from "@/lib/types";

/**
 * Retorna o Supabase e a oficina do usuário logado.
 * Sem login -> /login. Sem oficina -> /onboarding.
 *
 * `cache` faz layout e página dividirem a mesma consulta na mesma requisição,
 * e `getClaims` confere o token localmente, sem ir ao servidor de Auth.
 */
export const getContexto = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const user = { id: claims.sub, email: claims.email as string | undefined };

  const { data: oficina } = await supabase
    .from("oficinas")
    .select("id, nome, whatsapp, assinatura_texto")
    .order("criado_em")
    .limit(1)
    .maybeSingle<Oficina>();

  if (!oficina) redirect("/onboarding");

  return { supabase, user, oficina };
});
