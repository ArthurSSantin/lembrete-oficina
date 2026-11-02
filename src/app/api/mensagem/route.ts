import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarMensagem } from "@/lib/mensagem";
import type { Lembrete, Oficina } from "@/lib/types";
import { diasEntre, formatarData, hojeISO } from "@/lib/util";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const user = auth?.claims;
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  const { servicoId } = (await request.json()) as { servicoId?: string };
  if (!servicoId) return NextResponse.json({ erro: "servicoId obrigatório" }, { status: 400 });

  // RLS garante que só vem serviço da oficina do usuário
  const { data: s } = await supabase
    .from("servicos")
    .select(
      "*, tipos_servico(nome), veiculos(*, clientes(*)), oficinas(id, nome, whatsapp, assinatura_texto)",
    )
    .eq("id", servicoId)
    .maybeSingle<Lembrete & { oficinas: Oficina }>();

  if (!s) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  const v = s.veiculos;
  const veiculo = [v.modelo, v.ano].filter(Boolean).join(" ") || `carro de placa ${v.placa}`;

  const { texto, origem } = await gerarMensagem({
    oficina: s.oficinas.nome,
    assinatura: s.oficinas.assinatura_texto,
    cliente: v.clientes.nome,
    veiculo,
    servico: s.tipos_servico.nome,
    ultimaData: formatarData(s.data),
    ultimaKm: s.km,
    proximaKm: s.proxima_km,
    atrasoDias: s.proxima_data ? diasEntre(s.proxima_data, hojeISO()) : 0,
  });

  return NextResponse.json({ texto, origem });
}
