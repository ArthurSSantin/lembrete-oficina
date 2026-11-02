import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link do e-mail de "esqueci minha senha".
 * Aceita os dois formatos do Supabase: ?code= (PKCE) e ?token_hash=&type=.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const destino = url.searchParams.get("next") ?? "/nova-senha";
  // Só caminhos internos, para o link não virar redirecionamento para outro site.
  const seguro = destino.startsWith("/") && !destino.startsWith("//") ? destino : "/nova-senha";

  const supabase = await createClient();
  let erro = true;
  if (code) {
    erro = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  } else if (tokenHash && tipo) {
    erro = Boolean((await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error);
  }

  const volta = url.clone();
  volta.search = "";
  if (erro) {
    volta.pathname = "/esqueci";
    volta.searchParams.set("erro", "link");
  } else {
    volta.pathname = seguro;
  }
  return NextResponse.redirect(volta);
}
