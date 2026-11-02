import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Oficina } from "@/lib/types";

/**
 * Retorna o Supabase e a oficina do usuário logado.
 * Sem login -> /login. Sem oficina -> /onboarding.
 */
export async function getContexto() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: oficina } = await supabase
    .from("oficinas")
    .select("id, nome, whatsapp, assinatura_texto")
    .order("criado_em")
    .limit(1)
    .maybeSingle<Oficina>();

  if (!oficina) redirect("/onboarding");

  return { supabase, user, oficina };
}
