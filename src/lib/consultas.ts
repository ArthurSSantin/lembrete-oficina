import { getContexto } from "@/lib/oficina";
import type { Cliente, Lembrete, Posvenda, Sumido, Veiculo } from "@/lib/types";
import { hojeISO, somarDias } from "@/lib/util";

// !inner permite filtrar quem não quer mensagens direto no banco, antes do limite.
const SELECT_LEMBRETE = "*, tipos_servico(nome), veiculos!inner(*, clientes!inner(*))";

/** Tudo o que a tela Hoje e o modo sequência precisam, em consultas paralelas. */
export async function carregarHoje() {
  const { supabase, oficina } = await getContexto();
  const hoje = hojeISO();

  const [pendentes, chamados, recentes, sumidos] = await Promise.all([
    supabase
      .from("servicos")
      .select(SELECT_LEMBRETE)
      .eq("oficina_id", oficina.id)
      .eq("lembrete_status", "pendente")
      .eq("veiculos.clientes.nao_contatar", false)
      .lte("proxima_data", somarDias(hoje, 7))
      .order("proxima_data")
      .limit(300)
      .returns<Lembrete[]>(),
    supabase
      .from("servicos")
      .select(SELECT_LEMBRETE)
      .eq("oficina_id", oficina.id)
      .eq("lembrete_status", "contatado")
      .eq("veiculos.clientes.nao_contatar", false)
      .gte("contatado_em", somarDias(hoje, -30))
      .order("contatado_em", { ascending: false })
      .limit(30)
      .returns<Lembrete[]>(),
    supabase
      .from("servicos")
      .select("veiculo_id, data, tipos_servico(nome), veiculos(*, clientes(*))")
      .eq("oficina_id", oficina.id)
      .eq("origem", "feito")
      .is("posvenda_em", null)
      .gte("data", somarDias(hoje, -7))
      .lte("data", somarDias(hoje, -1))
      .order("data", { ascending: false })
      .limit(200)
      .returns<
        {
          veiculo_id: string;
          data: string;
          tipos_servico: { nome: string };
          veiculos: Veiculo & { clientes: Cliente };
        }[]
      >(),
    supabase.rpc("clientes_sumidos", {
      p_oficina: oficina.id,
      p_antes: somarDias(hoje, -oficina.dias_sumido),
      p_limite: 30,
    }),
  ]);

  const lista = pendentes.data ?? [];
  // Quem já tem lembrete aparece nele; não repete em "sumidos".
  const comLembrete = new Set(lista.map((l) => l.veiculos.clientes.id));

  // Agrupa os serviços recentes por visita (carro + dia).
  const visitas = new Map<string, Posvenda>();
  for (const r of recentes.data ?? []) {
    if (r.veiculos.clientes.nao_contatar) continue;
    const chave = `${r.veiculo_id}|${r.data}`;
    const v = visitas.get(chave);
    if (v) {
      if (!v.servicos.includes(r.tipos_servico.nome)) v.servicos.push(r.tipos_servico.nome);
    } else {
      visitas.set(chave, {
        veiculo_id: r.veiculo_id,
        data: r.data,
        servicos: [r.tipos_servico.nome],
        cliente: r.veiculos.clientes,
        veiculo: r.veiculos,
      });
    }
  }

  return {
    hoje,
    oficina,
    paraChamar: lista.filter((l) => l.proxima_data! <= hoje),
    proximos: lista.filter((l) => l.proxima_data! > hoje),
    chamados: chamados.data ?? [],
    posvenda: [...visitas.values()],
    sumidos: ((sumidos.data ?? []) as Sumido[]).filter((s) => !comLembrete.has(s.cliente_id)),
  };
}
