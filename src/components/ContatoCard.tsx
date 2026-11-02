"use client";

import { useId, useState, useTransition } from "react";
import { formatarWhatsapp, linkWhatsapp } from "@/lib/util";

export type PedidoMensagem =
  | { tipo: "lembrete"; servicoId: string }
  | { tipo: "posvenda"; veiculoId: string; data: string }
  | { tipo: "reativacao"; clienteId: string };

export type Acao = { rotulo: string; executar: () => Promise<void>; perigo?: boolean };

const ORIGEM: Record<string, string> = {
  padrao: "Mensagem padrão. Você pode editar antes de enviar.",
  modelo: "Mensagem do seu modelo (Ajustes > Mensagens).",
  ia: "",
};

export async function buscarMensagem(pedido: PedidoMensagem) {
  const r = await fetch("/api/mensagem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as { texto: string; origem: "ia" | "padrao" | "modelo" };
}

/**
 * Cartão de uma pessoa para chamar no WhatsApp.
 * Prepara a mensagem, deixa editar, abre o WhatsApp e marca como feito.
 */
export function ContatoCard({
  nome,
  whatsapp,
  consentimento,
  linha,
  detalhe,
  etiqueta,
  pedido,
  aoEnviar,
  acoes = [],
  feito,
}: {
  nome: string;
  whatsapp: string;
  consentimento: boolean;
  linha: React.ReactNode;
  detalhe: React.ReactNode;
  etiqueta?: { texto: string; cor: string };
  pedido: PedidoMensagem;
  aoEnviar: () => Promise<void>;
  acoes?: Acao[];
  /** Já foi chamado: mostra só abrir conversa e desfazer. */
  feito?: { rotulo: string; desfazer?: () => Promise<void> };
}) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [origem, setOrigem] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const idMensagem = useId();

  async function preparar() {
    setGerando(true);
    setErro(null);
    try {
      const dados = await buscarMensagem(pedido);
      setMensagem(dados.texto);
      setOrigem(dados.origem);
    } catch {
      setErro("A mensagem não foi preparada. Confira a internet e toque de novo.");
    } finally {
      setGerando(false);
    }
  }

  function enviar() {
    if (!mensagem) return;
    window.open(linkWhatsapp(whatsapp, mensagem), "_blank", "noopener");
    startTransition(aoEnviar);
  }

  return (
    <article className={`cartao space-y-3 ${pendente ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{nome}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tinta-2">{linha}</div>
        </div>
        {feito ? (
          <span className="etiqueta bg-verde-claro text-verde">{feito.rotulo}</span>
        ) : (
          etiqueta && <span className={`etiqueta ${etiqueta.cor}`}>{etiqueta.texto}</span>
        )}
      </div>

      <div className="text-sm">{detalhe}</div>

      {!consentimento && !feito && (
        <p className="aviso">Este cliente não tem autorização registrada para receber mensagens.</p>
      )}

      {feito ? (
        <div className="flex gap-2">
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className="botao-sec flex-1">
            Abrir conversa
          </a>
          {feito.desfazer && (
            <button onClick={() => startTransition(feito.desfazer!)} className="botao-sec">
              Desfazer
            </button>
          )}
        </div>
      ) : mensagem === null ? (
        <div className="flex gap-2">
          <button onClick={preparar} disabled={gerando} className="botao flex-1">
            {gerando ? "Preparando..." : "Preparar mensagem"}
          </button>
          {acoes.length > 0 && <MenuAcoes acoes={acoes} onAcao={(a) => startTransition(a.executar)} />}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="sr-only" htmlFor={idMensagem}>
            Mensagem para {nome}
          </label>
          <textarea
            id={idMensagem}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            className="campo text-sm"
          />
          {origem && ORIGEM[origem] && <p className="text-xs text-tinta-3">{ORIGEM[origem]}</p>}
          <div className="flex gap-2">
            <button onClick={enviar} className="botao-whats flex-1">
              Enviar no WhatsApp
            </button>
            <button onClick={preparar} disabled={gerando} className="botao-sec" aria-label="Preparar outra mensagem">
              {gerando ? "..." : "Outra"}
            </button>
          </div>
          <p className="text-xs text-tinta-3">Para {formatarWhatsapp(whatsapp)}</p>
        </div>
      )}

      {erro && <p className="text-sm text-vermelho">{erro}</p>}
    </article>
  );
}

function MenuAcoes({ acoes, onAcao }: { acoes: Acao[]; onAcao: (a: Acao) => void }) {
  return (
    <details className="menu relative">
      <summary className="botao-sec list-none" aria-label="Mais opções">
        Mais
      </summary>
      <ul className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-lg border border-linha bg-white shadow-lg">
        {acoes.map((a) => (
          <li key={a.rotulo}>
            <button
              onClick={(e) => {
                (e.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                onAcao(a);
              }}
              className={`block w-full px-4 py-3 text-left text-sm hover:bg-fundo ${a.perigo ? "text-vermelho" : ""}`}
            >
              {a.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
