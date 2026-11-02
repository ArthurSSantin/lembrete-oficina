import { NextResponse } from "next/server";
import { getContexto } from "@/lib/oficina";
import { gerarMensagem, type DadosMensagem } from "@/lib/mensagem";
import type { Lembrete, Oficina, Sumido } from "@/lib/types";
import { diasEntre, formatarData, hojeISO, somarDias } from "@/lib/util";

type Pedido =
  | { tipo?: "lembrete"; servicoId: string }
  | { tipo: "posvenda"; veiculoId: string; data: string }
  | { tipo: "reativacao"; clienteId: string };

function nomeVeiculo(v: { modelo: string | null; ano: number | null; placa: string }) {
  return [v.modelo, v.ano].filter(Boolean).join(" ") || `carro de placa ${v.placa}`;
}

function base(oficina: Oficina) {
  return {
    oficina: oficina.nome,
    assinatura: oficina.assinatura_texto,
    linkAvaliacao: oficina.link_avaliacao,
  };
}

export async function POST(request: Request) {
  // RLS garante que só vêm dados da oficina do usuário.
  const { supabase, oficina } = await getContexto();
  const pedido = (await request.json().catch(() => null)) as Pedido | null;
  if (!pedido) return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });

  let dados: DadosMensagem;

  if (pedido.tipo === "posvenda") {
    const { data: linhas } = await supabase
      .from("servicos")
      .select("km, tipos_servico(nome), veiculos(*, clientes(*))")
      .eq("veiculo_id", pedido.veiculoId)
      .eq("data", pedido.data)
      .eq("origem", "feito")
      .returns<Pick<Lembrete, "km" | "tipos_servico" | "veiculos">[]>();
    const primeira = linhas?.[0];
    if (!primeira) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    dados = {
      ...base(oficina),
      tipo: "posvenda",
      cliente: primeira.veiculos.clientes.nome,
      veiculo: nomeVeiculo(primeira.veiculos),
      servico: linhas!.map((l) => l.tipos_servico.nome).join(", "),
      data: formatarData(pedido.data),
      km: primeira.km,
      proximaKm: null,
      atrasoDias: 0,
      modelo: oficina.modelo_posvenda,
    };
  } else if (pedido.tipo === "reativacao") {
    const { data: lista } = await supabase.rpc("clientes_sumidos", {
      p_oficina: oficina.id,
      p_antes: somarDias(hojeISO(), 1),
      p_limite: 500,
    });
    const s = ((lista ?? []) as Sumido[]).find((x) => x.cliente_id === pedido.clienteId);
    if (!s) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    dados = {
      ...base(oficina),
      tipo: "reativacao",
      cliente: s.nome,
      veiculo: s.veiculo || `carro de placa ${s.placa}`,
      servico: s.ultimo_servico,
      data: formatarData(s.ultima_visita),
      km: null,
      proximaKm: null,
      atrasoDias: 0,
      modelo: oficina.modelo_reativacao,
    };
  } else {
    if (!pedido.servicoId) {
      return NextResponse.json({ erro: "servicoId obrigatório" }, { status: 400 });
    }
    const { data: s } = await supabase
      .from("servicos")
      .select("*, tipos_servico(nome, modelo_mensagem), veiculos(*, clientes(*))")
      .eq("id", pedido.servicoId)
      .maybeSingle<
        Lembrete & { tipos_servico: { nome: string; modelo_mensagem: string | null } }
      >();
    if (!s) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

    const recomendado = s.origem === "recomendado";
    dados = {
      ...base(oficina),
      tipo: recomendado ? "recomendado" : "lembrete",
      cliente: s.veiculos.clientes.nome,
      veiculo: nomeVeiculo(s.veiculos),
      servico: s.tipos_servico.nome,
      data: formatarData(s.data),
      km: s.km,
      proximaKm: s.proxima_km,
      atrasoDias: s.proxima_data ? diasEntre(s.proxima_data, hojeISO()) : 0,
      modelo: recomendado
        ? oficina.modelo_recomendado
        : s.tipos_servico.modelo_mensagem || oficina.modelo_lembrete,
    };
  }

  const { texto, origem } = await gerarMensagem(dados);
  return NextResponse.json({ texto, origem });
}
