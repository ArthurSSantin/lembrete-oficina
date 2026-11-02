"use client";

import { useActionState } from "react";
import { definirNovaSenha } from "@/app/actions";

export function FormNovaSenha() {
  const [estado, acao, pendente] = useActionState(definirNovaSenha, null);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="senha">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="campo"
        />
        <p className="mt-1 text-xs text-tinta-3">Pelo menos 8 caracteres.</p>
      </div>
      {estado?.erro && (
        <p role="alert" className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">
          {estado.erro}
        </p>
      )}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
