import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = [
  "/login",
  "/esqueci",
  "/auth/confirmar",
  "/privacidade",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/sw.js",
  // Protegida pelo CRON_SECRET dentro da própria rota.
  "/api/cron/diario",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims confere o token localmente (chaves ES256), sem ir ao servidor de Auth.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(r + "/"));

  if (!user && !publica && caminho.startsWith("/api/")) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
