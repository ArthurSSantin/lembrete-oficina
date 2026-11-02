"use client";

import { useActionState } from "react";
import { criarOficina } from "@/app/actions";

export function FormOnboarding() {
  const [estado, acao, pendente] = useActionState(criarOficina, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome da oficina</label>
        <input id="nome" name="nome" required placeholder="Ex: Auto Center Silva" className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="whatsapp">WhatsApp da oficina</label>
        <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="(11) 99999-9999" className="campo" />
      </div>
      {estado?.erro && <p className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Criando..." : "Começar"}
      </button>
    </form>
  );
}
