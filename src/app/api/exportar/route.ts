import { getContexto } from "@/lib/oficina";
import { formatarData, hojeISO } from "@/lib/util";

type Linha = {
  data: string;
  km: number | null;
  valor: number | null;
  origem: string;
  tipos_servico: { nome: string };
  veiculos: {
    placa: string;
    modelo: string | null;
    ano: number | null;
    clientes: { id: string; nome: string; whatsapp: string };
  };
};

function celula(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Planilha com todos os atendimentos, no mesmo formato da importação.
 * Separador ";" e BOM para abrir certo no Excel em português.
 */
export async function GET() {
  const { supabase, oficina } = await getContexto();

  const linhas: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await supabase
      .from("servicos")
      .select("data, km, valor, origem, tipos_servico(nome), veiculos(placa, modelo, ano, clientes(id, nome, whatsapp))")
      .eq("oficina_id", oficina.id)
      .order("data")
      .range(de, de + 999)
      .returns<Linha[]>();
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  // Carros sem atendimento e clientes sem carro também entram.
  const placasComServico = new Set(linhas.map((l) => l.veiculos.placa));
  const [{ data: clientes }, { data: veiculos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, whatsapp").eq("oficina_id", oficina.id),
    supabase
      .from("veiculos")
      .select("placa, modelo, ano, cliente_id")
      .eq("oficina_id", oficina.id),
  ]);
  const clientesComCarro = new Set((veiculos ?? []).map((v) => v.cliente_id));
  const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

  const cab = ["nome", "whatsapp", "placa", "modelo", "ano", "servico", "data", "km", "valor", "situacao"];
  const corpo = [
    ...linhas.map((l) => [
      l.veiculos.clientes.nome,
      l.veiculos.clientes.whatsapp,
      l.veiculos.placa,
      l.veiculos.modelo,
      l.veiculos.ano,
      l.tipos_servico.nome,
      formatarData(l.data),
      l.km,
      l.valor != null ? String(l.valor).replace(".", ",") : "",
      l.origem === "recomendado" ? "recomendado" : "feito",
    ]),
    ...(veiculos ?? [])
      .filter((v) => !placasComServico.has(v.placa) && clientePorId.has(v.cliente_id))
      .map((v) => {
        const c = clientePorId.get(v.cliente_id)!;
        return [c.nome, c.whatsapp, v.placa, v.modelo, v.ano, "", "", "", "", ""];
      }),
    ...(clientes ?? [])
      .filter((c) => !clientesComCarro.has(c.id))
      .map((c) => [c.nome, c.whatsapp, "", "", "", "", "", "", "", ""]),
  ];

  const csv = "﻿" + [cab, ...corpo].map((l) => l.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lembrete-oficina-${hojeISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
