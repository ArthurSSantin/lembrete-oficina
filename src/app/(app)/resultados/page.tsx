import { getContexto } from "@/lib/oficina";
import { formatarMoeda, hojeISO, somarDias } from "@/lib/util";

const PERIODOS = [
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "365", rotulo: "12 meses" },
];

export default async function ResultadosPage({ searchParams }: PageProps<"/resultados">) {
  const { supabase, oficina } = await getContexto();
  const { p } = await searchParams;
  const dias = PERIODOS.some((x) => x.valor === p) ? Number(p) : 30;
  const inicio = somarDias(hojeISO(), -dias);

  const [{ data: chamados }, { count: atendimentos }, { count: clientes }] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, lembrete_status, retorno_servico_id")
      .eq("oficina_id", oficina.id)
      .in("lembrete_status", ["contatado", "retornou"])
      .gte("contatado_em", inicio),
    supabase
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("oficina_id", oficina.id)
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

  const numeros = [
    { rotulo: "Clientes chamados", valor: String(lista.length) },
    { rotulo: "Voltaram", valor: String(retornos.length) },
    { rotulo: "Taxa de retorno", valor: `${taxa}%` },
    { rotulo: "Faturado com retornos", valor: formatarMoeda(valorRetornos) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resultados</h1>
        <p className="text-sm text-gray-600">O que os lembretes trouxeram de volta.</p>
      </div>

      <div className="flex gap-2">
        {PERIODOS.map((x) => (
          <a
            key={x.valor}
            href={`?p=${x.valor}`}
            className={`rounded-full px-3 py-1 text-sm ${
              Number(x.valor) === dias ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            {x.rotulo}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {numeros.map((n) => (
          <div key={n.rotulo} className="cartao">
            <p className="text-sm text-gray-600">{n.rotulo}</p>
            <p className="mt-1 text-2xl font-bold">{n.valor}</p>
          </div>
        ))}
      </div>

      <div className="cartao text-sm text-gray-600">
        <p>
          {atendimentos ?? 0} serviços registrados no período · {clientes ?? 0} clientes no total.
        </p>
        <p className="mt-2">
          Um retorno é contado quando você chama o cliente pelo sistema e depois registra o mesmo
          serviço para o carro dele. O valor só aparece se você informar o valor no atendimento.
        </p>
      </div>
    </div>
  );
}
