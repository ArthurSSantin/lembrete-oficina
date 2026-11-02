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
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-green-700">{estado.ok}</p>}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
