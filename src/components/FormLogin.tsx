"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cadastrar, entrar } from "@/app/actions";

export function FormLogin() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  // Controlado: o React limpa o formulário depois da action, e o e-mail não pode sumir.
  const [email, setEmail] = useState("");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState(entrar, null);
  const [estadoCad, acaoCad, cadastrando] = useActionState(cadastrar, null);

  const estado = modo === "entrar" ? estadoEntrar : estadoCad;
  const pendente = entrando || cadastrando;

  return (
    <form action={modo === "entrar" ? acaoEntrar : acaoCad} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="campo"
        />
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

      {estado?.erro && <p className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">{estado.erro}</p>}
      {estado?.ok && <p className="rounded-lg bg-verde-claro p-3 text-sm text-verde">{estado.ok}</p>}

      {modo === "entrar" && (
        <Link href="/esqueci" className="link-toque text-sm">
          Esqueci minha senha
        </Link>
      )}

      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}
        className="min-h-11 w-full text-sm text-tinta underline"
      >
        {modo === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </form>
  );
}
