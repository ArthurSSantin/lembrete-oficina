"use client";

import {
  adiarLembrete,
  definirNaoContatar,
  ignorarLembrete,
  marcarContatado,
  marcarPosvenda,
  marcarReativacao,
  reabrirLembrete,
} from "@/app/actions";
import type { Lembrete, Posvenda, Sumido } from "@/lib/types";
import { formatarData, plural } from "@/lib/util";
import { Placa } from "./Placa";
import { ContatoCard } from "./ContatoCard";

function nomeCarro(v: { modelo: string | null; ano: number | null }) {
  return [v.modelo, v.ano].filter(Boolean).join(" ") || "Veículo";
}

/** Adesivo de troca de óleo: quando vence. */
function prazo(atrasoDias: number) {
  if (atrasoDias > 0) {
    return { texto: `${plural(atrasoDias, "dia")} de atraso`, cor: "bg-vermelho-claro text-vermelho" };
  }
  if (atrasoDias === 0) return { texto: "Vence hoje", cor: "bg-sinal text-tinta" };
  return { texto: `Em ${plural(-atrasoDias, "dia")}`, cor: "bg-fundo text-tinta-2" };
}

export function LembreteCard({
  lembrete,
  atrasoDias,
}: {
  lembrete: Lembrete;
  atrasoDias: number;
}) {
  const v = lembrete.veiculos;
  const c = v.clientes;
  const recomendado = lembrete.origem === "recomendado";

  return (
    <ContatoCard
      nome={c.nome}
      whatsapp={c.whatsapp}
      consentimento={c.consentimento}
      linha={<><Placa placa={v.placa} />{nomeCarro(v)}</>}
      etiqueta={prazo(atrasoDias)}
      detalhe={
        recomendado ? (
          <p>
            <span className="font-semibold">{lembrete.tipos_servico.nome}</span>
            <span className="text-tinta-2">
              {" "}
              foi recomendado em {formatarData(lembrete.data)} e o cliente preferiu deixar para depois.
            </span>
          </p>
        ) : (
          <p>
            <span className="font-semibold">{lembrete.tipos_servico.nome}</span>
            <span className="text-tinta-2">
              {" "}
              feito em {formatarData(lembrete.data)}
              {lembrete.km ? ` com ${lembrete.km.toLocaleString("pt-BR")} km` : ""}
              {lembrete.proxima_km ? `. Próxima com ${lembrete.proxima_km.toLocaleString("pt-BR")} km` : ""}
            </span>
          </p>
        )
      }
      pedido={{ tipo: "lembrete", servicoId: lembrete.id }}
      aoEnviar={() => marcarContatado(lembrete.id)}
      feito={
        lembrete.lembrete_status === "contatado"
          ? { rotulo: "Chamado", desfazer: () => reabrirLembrete(lembrete.id) }
          : undefined
      }
      acoes={[
        { rotulo: "Lembrar daqui a 7 dias", executar: () => adiarLembrete(lembrete.id, 7) },
        { rotulo: "Lembrar daqui a 30 dias", executar: () => adiarLembrete(lembrete.id, 30) },
        { rotulo: "Não lembrar este serviço", executar: () => ignorarLembrete(lembrete.id) },
        {
          rotulo: "Cliente não quer mensagens",
          executar: () => definirNaoContatar(c.id, true),
          perigo: true,
        },
      ]}
    />
  );
}

export function PosvendaCard({ visita }: { visita: Posvenda }) {
  const { cliente: c, veiculo: v } = visita;
  return (
    <ContatoCard
      nome={c.nome}
      whatsapp={c.whatsapp}
      consentimento={c.consentimento}
      linha={<><Placa placa={v.placa} />{nomeCarro(v)}</>}
      etiqueta={{ texto: `Veio em ${formatarData(visita.data).slice(0, 5)}`, cor: "bg-fundo text-tinta-2" }}
      detalhe={<p className="text-tinta-2">{visita.servicos.join(", ")}</p>}
      pedido={{ tipo: "posvenda", veiculoId: visita.veiculo_id, data: visita.data }}
      aoEnviar={() => marcarPosvenda(visita.veiculo_id, visita.data)}
      acoes={[
        { rotulo: "Não mandar pós-venda", executar: () => marcarPosvenda(visita.veiculo_id, visita.data) },
      ]}
    />
  );
}

export function SumidoCard({ cliente: s }: { cliente: Sumido }) {
  return (
    <ContatoCard
      nome={s.nome}
      whatsapp={s.whatsapp}
      consentimento={s.consentimento}
      linha={<><Placa placa={s.placa} />{s.veiculo || "Veículo"}</>}
      etiqueta={{ texto: `Última vez em ${formatarData(s.ultima_visita)}`, cor: "bg-fundo text-tinta-2" }}
      detalhe={<p className="text-tinta-2">Último serviço: {s.ultimo_servico}</p>}
      pedido={{ tipo: "reativacao", clienteId: s.cliente_id }}
      aoEnviar={() => marcarReativacao(s.cliente_id)}
      acoes={[
        { rotulo: "Tirar da lista por 90 dias", executar: () => marcarReativacao(s.cliente_id) },
        {
          rotulo: "Cliente não quer mensagens",
          executar: () => definirNaoContatar(s.cliente_id, true),
          perigo: true,
        },
      ]}
    />
  );
}
