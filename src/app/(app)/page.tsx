import Link from "next/link";
import { LembreteCard } from "@/components/LembreteCard";
import { getContexto } from "@/lib/oficina";
import type { Lembrete } from "@/lib/types";
import { diasEntre, hojeISO, somarDias } from "@/lib/util";

const SELECT = "*, tipos_servico(nome), veiculos(*, clientes(*))";

export default async function HojePage() {
  const { supabase, oficina } = await getContexto();
  const hoje = hojeISO();

  const [{ data: pendentes }, { data: chamados }] = await Promise.all([
    supabase
      .from("servicos")
      .select(SELECT)
      .eq("oficina_id", oficina.id)
      .eq("lembrete_status", "pendente")
      .lte("proxima_data", somarDias(hoje, 7))
      .order("proxima_data")
      .limit(200)
      .returns<Lembrete[]>(),
    supabase
      .from("servicos")
      .select(SELECT)
      .eq("oficina_id", oficina.id)
      .eq("lembrete_status", "contatado")
      .order("contatado_em", { ascending: false })
      .limit(30)
      .returns<Lembrete[]>(),
  ]);

  const lista = pendentes ?? [];
  const jaChamados = chamados ?? [];
  const paraChamar = lista.filter((l) => l.proxima_data! <= hoje);
  const proximos = lista.filter((l) => l.proxima_data! > hoje);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Chamar hoje</h1>
        <p className="mb-4 text-sm text-gray-600">
          {paraChamar.length === 0
            ? "Nenhum cliente para chamar hoje."
            : `${paraChamar.length} cliente(s) com serviço vencido ou vencendo hoje.`}
        </p>
        <div className="space-y-3">
          {paraChamar.map((l) => (
            <LembreteCard key={l.id} lembrete={l} atrasoDias={diasEntre(l.proxima_data!, hoje)} />
          ))}
        </div>
        {lista.length === 0 && jaChamados.length === 0 && (
          <div className="cartao text-center">
            <p className="mb-3 text-gray-700">
              Registre os atendimentos e o sistema avisa aqui quando for hora de chamar cada
              cliente.
            </p>
            <Link href="/novo" className="botao">
              ➕ Registrar atendimento
            </Link>
          </div>
        )}
      </section>

      {proximos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos 7 dias</h2>
          <div className="space-y-3">
            {proximos.map((l) => (
              <LembreteCard key={l.id} lembrete={l} atrasoDias={diasEntre(l.proxima_data!, hoje)} />
            ))}
          </div>
        </section>
      )}

      {jaChamados.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Já chamados</h2>
          <p className="mb-3 text-sm text-gray-600">
            Quando o cliente voltar e você registrar o serviço, conta como retorno nos Resultados.
          </p>
          <div className="space-y-3">
            {jaChamados.map((l) => (
              <LembreteCard
                key={l.id}
                lembrete={l}
                atrasoDias={diasEntre(l.proxima_data ?? hoje, hoje)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
