import { NextResponse, type NextRequest } from "next/server";
import { criarAdmin } from "@/lib/supabase/admin";
import { ehDiaDeBackup, enviarAvisoDiario, fazerBackup } from "@/lib/automacoes";

/**
 * Roda uma vez por dia (Vercel Cron, ver vercel.json):
 * aviso da manhã no celular, backup às segundas, e mantém o banco ativo
 * (o Supabase grátis pausa projetos parados por 7 dias).
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = criarAdmin();
  const resultado: Record<string, unknown> = {};

  try {
    resultado.aviso = await enviarAvisoDiario(admin);
  } catch (e) {
    resultado.aviso = { erro: (e as Error).message };
  }

  const forcar = request.nextUrl.searchParams.get("backup") === "1";
  if (forcar || ehDiaDeBackup()) {
    try {
      resultado.backup = await fazerBackup(admin);
    } catch (e) {
      resultado.backup = { erro: (e as Error).message };
    }
  }

  const falhou = Object.values(resultado).some((r) => r && typeof r === "object" && "erro" in r);
  return NextResponse.json(resultado, { status: falhou ? 500 : 200 });
}
