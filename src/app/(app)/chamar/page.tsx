import { Sequencia, type ItemSequencia } from "@/components/Sequencia";
import { carregarHoje } from "@/lib/consultas";
import { diasEntre, formatarData, plural } from "@/lib/util";

function carro(v: { modelo: string | null; ano: number | null }) {
  return [v.modelo, v.ano].filter(Boolean).join(" ") || "Veículo";
}

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

export default async function ChamarPage() {
  const { hoje, paraChamar, posvenda, sumidos } = await carregarHoje();

  const itens: ItemSequencia[] = [
    ...paraChamar.map((l): ItemSequencia => {
      const atraso = diasEntre(l.proxima_data!, hoje);
      const v = l.veiculos;
      return {
        chave: l.id,
        motivo:
          l.origem === "recomendado"
            ? "Serviço recomendado que ficou para depois"
            : atraso > 0
              ? `Lembrete com ${plural(atraso, "dia")} de atraso`
              : "Lembrete que vence hoje",
        nome: v.clientes.nome,
        whatsapp: v.clientes.whatsapp,
        consentimento: v.clientes.consentimento,
        carro: carro(v),
        placa: v.placa,
        detalhe: `${l.tipos_servico.nome}, última vez em ${formatarData(l.data)}.`,
        pedido: { tipo: "lembrete", servicoId: l.id },
        alvo: { tipo: "lembrete", servicoId: l.id },
      };
    }),
    ...posvenda.map(
      (p): ItemSequencia => ({
        chave: `${p.veiculo_id}${p.data}`,
        motivo: "Agradecer a visita",
        nome: p.cliente.nome,
        whatsapp: p.cliente.whatsapp,
        consentimento: p.cliente.consentimento,
        carro: carro(p.veiculo),
        placa: p.veiculo.placa,
        detalhe: `Veio em ${formatarData(p.data)}: ${p.servicos.join(", ")}.`,
        pedido: { tipo: "posvenda", veiculoId: p.veiculo_id, data: p.data },
        alvo: { tipo: "posvenda", veiculoId: p.veiculo_id, data: p.data },
      }),
    ),
    ...sumidos.map(
      (s): ItemSequencia => ({
        chave: s.cliente_id,
        motivo: "Cliente sumido",
        nome: s.nome,
        whatsapp: s.whatsapp,
        consentimento: s.consentimento,
        carro: s.veiculo || "Veículo",
        placa: s.placa,
        detalhe: `Última visita em ${formatarData(s.ultima_visita)} (${s.ultimo_servico}).`,
        pedido: { tipo: "reativacao", clienteId: s.cliente_id },
        alvo: { tipo: "reativacao", clienteId: s.cliente_id },
      }),
    ),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Chamar um por um</h1>
      <Sequencia itens={itens} />
    </div>
  );
}
