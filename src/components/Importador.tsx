"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importarClientes, type ResultadoImportacao } from "@/app/actions";
import { COLUNAS, lerPlanilha, type LinhaImportada } from "@/lib/importacao";
import { formatarData, plural } from "@/lib/util";

const EXEMPLO = "nome\twhatsapp\tplaca\tmodelo\tano\tservico\tdata\tkm\nJoão Silva\t(11) 98888-7777\tABC1D23\tOnix 1.0\t2020\tTroca de óleo\t15/03/2026\t45000";

export function Importador() {
  const [texto, setTexto] = useState("");
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [autorizaram, setAutorizaram] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [pendente, startTransition] = useTransition();

  function ler(conteudo: string) {
    setTexto(conteudo);
    setResultado(null);
    const r = lerPlanilha(conteudo);
    setLinhas(r.linhas);
    setColunas(r.colunasAchadas);
  }

  async function arquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) ler(await f.text());
  }

  function importar() {
    startTransition(async () => {
      setResultado(await importarClientes(linhas, autorizaram));
    });
  }

  const faltando = ["nome", "whatsapp"].filter((c) => !colunas.includes(c));

  if (resultado && !resultado.erro) {
    return (
      <div className="cartao space-y-3">
        <h2 className="text-2xl font-bold">Importação concluída</h2>
        <ul className="space-y-1">
          <li>{plural(resultado.clientesNovos ?? 0, "cliente novo", "clientes novos")}</li>
          <li>{plural(resultado.veiculosNovos ?? 0, "carro novo", "carros novos")}</li>
          <li>{plural(resultado.servicos ?? 0, "serviço com lembrete", "serviços com lembrete")}</li>
          {(resultado.repetidos ?? 0) > 0 && (
            <li className="text-tinta-2">
              {plural(resultado.repetidos!, "serviço já existia", "serviços já existiam")} e não foi
              repetido
            </li>
          )}
        </ul>
        {resultado.ignoradas && resultado.ignoradas.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              {plural(resultado.ignoradas.length, "observação", "observações")}
            </summary>
            <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm text-tinta-2">
              {resultado.ignoradas.map((i, k) => (
                <li key={k}>
                  Linha {i.linha}: {i.motivo}
                </li>
              ))}
            </ul>
          </details>
        )}
        <Link href="/" className="botao w-full">
          Ver quem chamar hoje
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="cartao space-y-3 text-sm">
        <p>
          Copie as linhas da sua planilha (Excel ou Google Planilhas), com o cabeçalho, e cole
          abaixo. Ou envie um arquivo CSV.
        </p>
        <p className="text-tinta-2">
          Colunas que o sistema reconhece:{" "}
          {COLUNAS.map((c) => c.chave).join(", ")}. Só nome e WhatsApp são obrigatórios. Com serviço
          e data, o lembrete já é calculado.
        </p>
        <button type="button" onClick={() => ler(EXEMPLO)} className="text-tinta underline underline-offset-2">
          Ver um exemplo
        </button>
      </div>

      <div>
        <label htmlFor="planilha" className="rotulo">
          Planilha
        </label>
        <textarea
          id="planilha"
          value={texto}
          onChange={(e) => ler(e.target.value)}
          rows={8}
          placeholder="Cole aqui"
          className="campo font-mono text-xs"
        />
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="botao-sec !py-2">Escolher arquivo CSV</span>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={arquivo} className="sr-only" />
        </label>
      </div>

      {linhas.length > 0 && (
        <div className="cartao space-y-3">
          <p className="font-semibold">{plural(linhas.length, "linha encontrada", "linhas encontradas")}</p>
          {faltando.length > 0 ? (
            <p className="text-sm text-vermelho">
              Falta a coluna {faltando.join(" e ")} no cabeçalho.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-tinta-2">
                    <tr>
                      <th className="py-1 pr-3">Nome</th>
                      <th className="py-1 pr-3">WhatsApp</th>
                      <th className="py-1 pr-3">Placa</th>
                      <th className="py-1 pr-3">Serviço</th>
                      <th className="py-1">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {linhas.slice(0, 5).map((l, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-3">{l.nome}</td>
                        <td className="py-1 pr-3">{l.whatsapp}</td>
                        <td className="py-1 pr-3">{l.placa}</td>
                        <td className="py-1 pr-3">{l.servico}</td>
                        <td className="py-1">{l.data ? formatarData(l.data) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {linhas.length > 5 && <p className="text-xs text-tinta-3">Mostrando as 5 primeiras.</p>}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={autorizaram}
                  onChange={(e) => setAutorizaram(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-tinta"
                />
                Estes clientes autorizaram receber lembretes pelo WhatsApp
              </label>
              {resultado?.erro && <p className="text-sm text-vermelho">{resultado.erro}</p>}
              <button onClick={importar} disabled={pendente} className="botao w-full">
                {pendente ? "Importando..." : `Importar ${plural(linhas.length, "linha", "linhas")}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
