"use client";

import { useActionState } from "react";
import { salvarOficina } from "@/app/actions";
import type { Oficina } from "@/lib/types";
import { formatarWhatsapp } from "@/lib/util";

export function FormOficina({ oficina }: { oficina: Oficina }) {
  const [estado, acao, pendente] = useActionState(salvarOficina, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome da oficina</label>
        <input id="nome" name="nome" defaultValue={oficina.nome} required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="whatsapp">WhatsApp da oficina</label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          defaultValue={oficina.whatsapp ? formatarWhatsapp(oficina.whatsapp) : ""}
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="assinatura">Assinatura das mensagens</label>
        <input
          id="assinatura"
          name="assinatura"
          defaultValue={oficina.assinatura_texto ?? ""}
          placeholder="Ex: Auto Center Silva - Rua X, 123"
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="link_avaliacao">Link de avaliação no Google</label>
        <input
          id="link_avaliacao"
          name="link_avaliacao"
          type="url"
          defaultValue={oficina.link_avaliacao ?? ""}
          placeholder="https://g.page/r/..."
          className="campo"
        />
        <p className="mt-1 text-xs text-tinta-3">
          No Perfil da Empresa no Google, toque em &quot;Pedir avaliações&quot; e copie o link. Ele vai
          na mensagem de pós-venda.
        </p>
      </div>
      <div>
        <label className="rotulo" htmlFor="dias_sumido">Cliente sumido depois de (dias)</label>
        <input
          id="dias_sumido"
          name="dias_sumido"
          inputMode="numeric"
          defaultValue={oficina.dias_sumido}
          className="campo"
        />
      </div>
      {estado?.erro && <p className="text-sm text-vermelho">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-verde">{estado.ok}</p>}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
