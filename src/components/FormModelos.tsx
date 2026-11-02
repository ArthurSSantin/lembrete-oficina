"use client";

import { useActionState } from "react";
import { salvarModelos } from "@/app/actions";
import { modeloPadrao, VARIAVEIS, type TipoMensagem } from "@/lib/modelos";
import type { Oficina } from "@/lib/types";

const CAMPOS: { tipo: TipoMensagem; campo: keyof Oficina; titulo: string }[] = [
  { tipo: "lembrete", campo: "modelo_lembrete", titulo: "Lembrete de serviço" },
  { tipo: "recomendado", campo: "modelo_recomendado", titulo: "Serviço que ficou para depois" },
  { tipo: "posvenda", campo: "modelo_posvenda", titulo: "Agradecimento depois da visita" },
  { tipo: "reativacao", campo: "modelo_reativacao", titulo: "Cliente sumido" },
];

export function FormModelos({ oficina, temIA }: { oficina: Oficina; temIA: boolean }) {
  const [estado, acao, pendente] = useActionState(salvarModelos, null);
  return (
    <form action={acao} className="space-y-5">
      <p className="text-sm text-tinta-2">
        {temIA
          ? "Em branco, cada mensagem é escrita na hora para o cliente. Preencha para usar sempre o seu texto."
          : "Em branco, o sistema usa o texto de exemplo. Preencha para usar o seu."}
      </p>
      {CAMPOS.map((c) => (
        <div key={c.campo}>
          <label className="rotulo" htmlFor={c.campo}>
            {c.titulo}
          </label>
          <textarea
            id={c.campo}
            name={c.campo}
            rows={5}
            defaultValue={(oficina[c.campo] as string | null) ?? ""}
            placeholder={modeloPadrao(c.tipo, true)}
            className="campo text-sm"
          />
        </div>
      ))}
      <div className="rounded-lg bg-fundo p-3 text-sm">
        <p className="mb-2 font-semibold">Palavras que o sistema troca pelos dados</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {VARIAVEIS.map((v) => (
            <div key={v.chave} className="contents">
              <dt className="font-semibold">{v.chave}</dt>
              <dd className="text-tinta-2">{v.descricao}</dd>
            </div>
          ))}
        </dl>
      </div>
      {estado?.erro && <p className="text-sm text-vermelho">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-verde">{estado.ok}</p>}
      <button type="submit" disabled={pendente} className="botao w-full">
        {pendente ? "Salvando..." : "Salvar mensagens"}
      </button>
    </form>
  );
}
