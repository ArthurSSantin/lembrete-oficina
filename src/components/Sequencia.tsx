"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  adiarLembrete,
  marcarContatado,
  marcarPosvenda,
  marcarReativacao,
} from "@/app/actions";
import { formatarWhatsapp, linkWhatsapp, plural } from "@/lib/util";
import { buscarMensagem, type PedidoMensagem } from "./ContatoCard";
import { Placa } from "./Placa";

export type ItemSequencia = {
  chave: string;
  motivo: string;
  nome: string;
  whatsapp: string;
  consentimento: boolean;
  carro: string;
  placa: string;
  detalhe: string;
  pedido: PedidoMensagem;
  /** Para marcar como feito. */
  alvo:
    | { tipo: "lembrete"; servicoId: string }
    | { tipo: "posvenda"; veiculoId: string; data: string }
    | { tipo: "reativacao"; clienteId: string };
};

function concluir(alvo: ItemSequencia["alvo"]) {
  if (alvo.tipo === "lembrete") return marcarContatado(alvo.servicoId);
  if (alvo.tipo === "posvenda") return marcarPosvenda(alvo.veiculoId, alvo.data);
  return marcarReativacao(alvo.clienteId);
}

export function Sequencia({ itens: inicial }: { itens: ItemSequencia[] }) {
  // A fila fica congelada: ao marcar alguém como chamado o servidor atualiza a página,
  // e a lista nova não pode fazer o índice pular clientes.
  const [itens] = useState(inicial);
  const [indice, setIndice] = useState(0);
  const [enviados, setEnviados] = useState(0);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const item = itens[indice];

  useEffect(() => {
    if (!item) return;
    let ativo = true;
    buscarMensagem(item.pedido)
      .then((r) => ativo && setMensagem(r.texto))
      .catch(() => ativo && setErro("A mensagem não foi preparada. Toque em Pular ou tente de novo."));
    return () => {
      ativo = false;
    };
  }, [item]);

  function proximo() {
    setMensagem(null);
    setErro(null);
    setIndice((i) => i + 1);
  }

  function enviar() {
    if (!item || !mensagem) return;
    window.open(linkWhatsapp(item.whatsapp, mensagem), "_blank", "noopener");
    const alvo = item.alvo;
    startTransition(() => concluir(alvo));
    setEnviados((n) => n + 1);
    proximo();
  }

  function adiar() {
    if (item?.alvo.tipo !== "lembrete") return;
    const id = item.alvo.servicoId;
    startTransition(() => adiarLembrete(id, 7));
    proximo();
  }

  if (!item) {
    return (
      <div className="cartao space-y-3">
        <h2 className="text-2xl font-bold">Fila concluída</h2>
        <p className="text-tinta-2">
          {enviados > 0
            ? `${plural(enviados, "mensagem enviada", "mensagens enviadas")}. Quando os clientes voltarem, registre o atendimento para contar o retorno.`
            : "Ninguém foi chamado nesta rodada."}
        </p>
        <Link href="/" className="botao w-full">
          Voltar para Hoje
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-tinta-2">
        <span>
          {indice + 1} de {itens.length}
        </span>
        <Link href="/" className="link-toque px-2">
          Sair da fila
        </Link>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-linha" aria-hidden>
        <div
          className="h-full bg-sinal motion-safe:transition-[width]"
          style={{ width: `${(indice / itens.length) * 100}%` }}
        />
      </div>

      <article className="cartao space-y-3">
        <div>
          <span className="etiqueta inline-block bg-sinal-claro text-sinal-escuro">{item.motivo}</span>
          <h2 className="mt-2 text-2xl font-bold">{item.nome}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tinta-2">
            <Placa placa={item.placa} />
            {item.carro}
          </div>
        </div>
        <p className="text-sm">{item.detalhe}</p>
        {!item.consentimento && (
          <p className="aviso">Este cliente não tem autorização registrada para receber mensagens.</p>
        )}

        <label className="sr-only" htmlFor="mensagem-seq">
          Mensagem
        </label>
        {mensagem === null && !erro ? (
          <div className="h-36 motion-safe:animate-pulse rounded-lg bg-fundo" aria-label="Preparando mensagem" />
        ) : (
          <textarea
            id="mensagem-seq"
            value={mensagem ?? ""}
            onChange={(e) => setMensagem(e.target.value)}
            rows={7}
            className="campo text-sm"
          />
        )}
        {erro && <p className="text-sm text-vermelho">{erro}</p>}
        <p className="text-xs text-tinta-3">Para {formatarWhatsapp(item.whatsapp)}</p>

        <button onClick={enviar} disabled={!mensagem} className="botao-whats w-full">
          Enviar no WhatsApp e ir para o próximo
        </button>
        <div className="flex gap-2">
          <button onClick={proximo} className="botao-sec flex-1">
            Pular
          </button>
          {item.alvo.tipo === "lembrete" && (
            <button onClick={adiar} className="botao-sec flex-1">
              Chamar em 7 dias
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
