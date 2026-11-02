"use client";

import { useState, useTransition } from "react";
import { ignorarLembrete, marcarContatado, reabrirLembrete } from "@/app/actions";
import type { Lembrete } from "@/lib/types";
import { formatarData, formatarPlaca, formatarWhatsapp, linkWhatsapp } from "@/lib/util";

function plural(n: number, palavra: string) {
  return `${n} ${palavra}${n > 1 ? "s" : ""}`;
}

export function LembreteCard({
  lembrete,
  atrasoDias,
}: {
  lembrete: Lembrete;
  atrasoDias: number;
}) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [origem, setOrigem] = useState<"ia" | "padrao" | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const v = lembrete.veiculos;
  const c = v.clientes;
  const contatado = lembrete.lembrete_status === "contatado";

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const r = await fetch("/api/mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicoId: lembrete.id }),
      });
      if (!r.ok) throw new Error();
      const dados = (await r.json()) as { texto: string; origem: "ia" | "padrao" };
      setMensagem(dados.texto);
      setOrigem(dados.origem);
    } catch {
      setErro("Não foi possível gerar a mensagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  function enviar() {
    if (!mensagem) return;
    window.open(linkWhatsapp(c.whatsapp, mensagem), "_blank", "noopener");
    startTransition(() => marcarContatado(lembrete.id));
  }

  const etiqueta =
    atrasoDias > 0
      ? { texto: `${plural(atrasoDias, "dia")} de atraso`, cor: "bg-red-100 text-red-700" }
      : atrasoDias === 0
        ? { texto: "Vence hoje", cor: "bg-amber-100 text-amber-800" }
        : { texto: `Em ${plural(-atrasoDias, "dia")}`, cor: "bg-blue-100 text-blue-700" };

  return (
    <div className={`cartao space-y-3 ${pendente ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{c.nome}</p>
          <p className="text-sm text-gray-600">
            {[v.modelo, v.ano].filter(Boolean).join(" ") || "Veículo"} · {formatarPlaca(v.placa)}
          </p>
        </div>
        {contatado ? (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            Chamado
          </span>
        ) : (
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${etiqueta.cor}`}>
            {etiqueta.texto}
          </span>
        )}
      </div>

      <p className="text-sm">
        <span className="font-medium">{lembrete.tipos_servico.nome}</span>
        <span className="text-gray-600">
          {" "}
          · última em {formatarData(lembrete.data)}
          {lembrete.km ? ` com ${lembrete.km.toLocaleString("pt-BR")} km` : ""}
        </span>
      </p>

      {!c.consentimento && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Cliente sem autorização registrada para receber mensagens.
        </p>
      )}

      {contatado ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/${c.whatsapp}`}
            target="_blank"
            rel="noopener"
            className="botao-sec flex-1"
          >
            Abrir conversa
          </a>
          <button
            onClick={() => startTransition(() => reabrirLembrete(lembrete.id))}
            className="botao-sec"
          >
            Desfazer
          </button>
        </div>
      ) : mensagem === null ? (
        <div className="flex gap-2">
          <button onClick={gerar} disabled={gerando} className="botao flex-1">
            {gerando ? "Escrevendo..." : "💬 Preparar mensagem"}
          </button>
          <button
            onClick={() => startTransition(() => ignorarLembrete(lembrete.id))}
            className="botao-sec"
            title="Não lembrar mais este serviço"
          >
            Ignorar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            className="campo text-sm"
          />
          {origem === "padrao" && (
            <p className="text-xs text-gray-500">
              Mensagem padrão (IA não configurada ou indisponível).
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={enviar} className="botao flex-1 !bg-green-600">
              Enviar no WhatsApp
            </button>
            <button onClick={gerar} disabled={gerando} className="botao-sec" title="Escrever outra">
              {gerando ? "..." : "↻"}
            </button>
          </div>
          <p className="text-xs text-gray-500">Para {formatarWhatsapp(c.whatsapp)}</p>
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
