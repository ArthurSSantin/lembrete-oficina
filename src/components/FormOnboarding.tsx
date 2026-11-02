"use client";

import { useActionState, useState } from "react";
import { criarOficina } from "@/app/actions";

export function FormOnboarding() {
  const [estado, acao, pendente] = useActionState(criarOficina, null);
  const [campos, setCampos] = useState({ nome: "", whatsapp: "" });
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome da oficina</label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="Ex: Auto Center Silva"
          value={campos.nome}
          onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="whatsapp">WhatsApp da oficina</label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={campos.whatsapp}
          onChange={(e) => setCampos({ ...campos, whatsapp: e.target.value })}
          className="campo"
        />
      </div>
      {estado?.erro && <p className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Criando..." : "Começar"}
      </button>
    </form>
  );
}
