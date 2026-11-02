"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { pedirNovaSenha } from "@/app/actions";

export function FormEsqueci({ linkVencido }: { linkVencido: boolean }) {
  const [estado, acao, pendente] = useActionState(pedirNovaSenha, null);
  const [email, setEmail] = useState("");

  if (estado?.ok) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-lg bg-verde-claro p-3 text-sm text-verde">
          {estado.ok}
        </p>
        <Link href="/login" className="link-toque text-sm">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      {linkVencido && (
        <p role="alert" className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">
          O link venceu ou já foi usado. Peça um novo abaixo.
        </p>
      )}
      <div>
        <label className="rotulo" htmlFor="email">
          E-mail da conta
        </label>
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
      {estado?.erro && (
        <p role="alert" className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">
          {estado.erro}
        </p>
      )}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Enviando..." : "Enviar link para criar nova senha"}
      </button>
      <Link href="/login" className="link-toque text-sm">
        Voltar para o login
      </Link>
    </form>
  );
}
