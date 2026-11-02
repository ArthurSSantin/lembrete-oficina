"use client";

import { useActionState, useState } from "react";
import { cadastrar, entrar } from "@/app/actions";

export function FormLogin() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState(entrar, null);
  const [estadoCad, acaoCad, cadastrando] = useActionState(cadastrar, null);

  const estado = modo === "entrar" ? estadoEntrar : estadoCad;
  const pendente = entrando || cadastrando;

  return (
    <form action={modo === "entrar" ? acaoEntrar : acaoCad} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={modo === "cadastrar" ? 8 : undefined}
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
          className="campo"
        />
      </div>

      {estado?.erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.erro}</p>}
      {estado?.ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{estado.ok}</p>}

      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}
        className="w-full text-sm text-blue-600"
      >
        {modo === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </form>
  );
}
