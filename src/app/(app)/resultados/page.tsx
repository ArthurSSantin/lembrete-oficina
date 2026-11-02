import Link from "next/link";
import { getContexto } from "@/lib/oficina";
import { formatarMoeda, hojeISO, plural, somarDias } from "@/lib/util";

const PERIODOS = [
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "365", rotulo: "12 meses" },
];

type Chamado = {
  id: string;
  origem: "feito" | "recomendado";
  lembrete_status: string;
  retorno_servico_id: string | null;
};

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

export default async function ResultadosPage({ searchParams }: PageProps<"/resultados">) {
  const { supabase, oficina } = await getContexto();
  const { p } = await searchParams;
  const dias = PERIODOS.some((x) => x.valor === p) ? Number(p) : 30;
  const inicio = somarDias(hojeISO(), -dias);

  const [{ data: chamados }, { count: atendimentos }, { count: recomendacoes }, { count: clientes }] =
    await Promise.all([
      supabase
        .from("servicos")
        .select("id, origem, lembrete_status, retorno_servico_id")
        .eq("oficina_id", oficina.id)
        .in("lembrete_status", ["contatado", "retornou"])
        .gte("contatado_em", inicio)
        .returns<Chamado[]>(),
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("oficina_id", oficina.id)
        .eq("origem", "feito")
        .gte("data", inicio),
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("oficina_id", oficina.id)
        .eq("origem", "recomendado")
        .gte("data", inicio),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("oficina_id", oficina.id),
    ]);

  const lista = chamados ?? [];
  const retornos = lista.filter((s) => s.lembrete_status === "retornou");
  const idsRetorno = retornos.map((s) => s.retorno_servico_id).filter(Boolean) as string[];

  let valorRetornos = 0;
  if (idsRetorno.length) {
    const { data } = await supabase.from("servicos").select("valor").in("id", idsRetorno);
    valorRetornos = (data ?? []).reduce((soma, s) => soma + Number(s.valor ?? 0), 0);
  }

  const taxa = lista.length ? Math.round((retornos.length / lista.length) * 100) : 0;
  const recomendadosVoltaram = retornos.filter((r) => r.origem === "recomendado").length;

  const linhas = [
    { rotulo: "Clientes chamados", valor: String(lista.length) },
    { rotulo: "Voltaram depois da mensagem", valor: String(retornos.length) },
    { rotulo: "Taxa de retorno", valor: `${taxa}%` },
    { rotulo: "Recomendações que viraram serviço", valor: String(recomendadosVoltaram) },
    { rotulo: "Atendimentos registrados", valor: String(atendimentos ?? 0) },
    { rotulo: "Serviços recomendados", valor: String(recomendacoes ?? 0) },
    { rotulo: "Clientes cadastrados", valor: String(clientes ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Resultados</h1>

      <nav aria-label="Período" className="flex gap-2">
        {PERIODOS.map((x) => {
          const atual = Number(x.valor) === dias;
          return (
            <Link
              key={x.valor}
              href={`?p=${x.valor}`}
              aria-current={atual ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ${
                atual ? "bg-asfalto text-white" : "border border-linha bg-white text-tinta-2"
              }`}
            >
              {x.rotulo}
            </Link>
          );
        })}
      </nav>

      <section className="text-xl leading-snug">
        {retornos.length > 0 ? (
          <p>
            Nos últimos {PERIODOS.find((x) => Number(x.valor) === dias)!.rotulo},{" "}
            {plural(retornos.length, "cliente voltou", "clientes voltaram")} depois da mensagem e
            deixou{retornos.length > 1 ? "ram" : ""}{" "}
            <strong className="font-display text-3xl whitespace-nowrap">
              {formatarMoeda(valorRetornos)}
            </strong>{" "}
            na oficina.
          </p>
        ) : (
          <p className="text-tinta-2">
            Ainda nenhum retorno neste período. Quando um cliente chamado pelo sistema voltar e você
            registrar o serviço, o valor aparece aqui.
          </p>
        )}
      </section>

      <section className="cartao">
        <dl className="divide-y divide-linha">
          {linhas.map((l) => (
            <div key={l.rotulo} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-tinta-2">{l.rotulo}</dt>
              <dd className="font-display text-xl font-bold">{l.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-tinta-3">
        Um retorno conta quando você chama o cliente pelo sistema e depois registra o mesmo serviço
        para o carro dele. O valor só entra se você informar o valor no atendimento.
      </p>
    </div>
  );
}
