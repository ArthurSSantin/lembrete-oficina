"use client";

import { useTransition } from "react";
import { definirNaoContatar } from "@/app/actions";

export function BotaoNaoContatar({ clienteId, ativo }: { clienteId: string; ativo: boolean }) {
  const [pendente, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => startTransition(() => definirNaoContatar(clienteId, !ativo))}
      className="botao-sec w-full text-sm"
    >
      {ativo ? "Voltar a mandar lembretes" : "Cliente não quer mais mensagens"}
    </button>
  );
}
