import Link from "next/link";
import { LembreteCard, PosvendaCard, SumidoCard } from "@/components/LembreteCard";
import { carregarHoje } from "@/lib/consultas";
import { diasEntre, plural } from "@/lib/util";

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold">{titulo}</h2>
      {descricao && <p className="mb-3 text-sm text-tinta-2">{descricao}</p>}
      <div className={`space-y-3 ${descricao ? "" : "mt-3"}`}>{children}</div>
    </section>
  );
}

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

export default async function HojePage() {
  const { hoje, oficina, paraChamar, proximos, chamados, posvenda, sumidos } =
    await carregarHoje();

  const total = paraChamar.length + posvenda.length + sumidos.length;
  const vazio = total === 0 && proximos.length === 0 && chamados.length === 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Hoje</h1>
        {total > 0 ? (
          <>
            <p className="text-tinta-2">
              {plural(total, "mensagem", "mensagens")} para mandar.
              {paraChamar.length > 0 &&
                ` ${plural(paraChamar.length, "lembrete vencido", "lembretes vencidos")}.`}
            </p>
            <Link href="/chamar" className="botao w-full sm:w-auto">
              Chamar um por um
            </Link>
          </>
        ) : (
          !vazio && <p className="text-tinta-2">Ninguém para chamar hoje. Tudo em dia.</p>
        )}
      </header>

      {vazio && (
        <div className="cartao space-y-3">
          <p>
            Registre cada atendimento e o sistema avisa aqui quando for hora de chamar o cliente de
            volta.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/novo" className="botao">
              Registrar atendimento
            </Link>
            <Link href="/clientes/importar" className="botao-sec">
              Importar planilha de clientes
            </Link>
          </div>
        </div>
      )}

      {paraChamar.length > 0 && (
        <Secao titulo="Para chamar hoje">
          {paraChamar.map((l) => (
            <LembreteCard key={l.id} lembrete={l} atrasoDias={diasEntre(l.proxima_data!, hoje)} />
          ))}
        </Secao>
      )}

      {posvenda.length > 0 && (
        <Secao
          titulo="Agradecer a visita"
          descricao={
            oficina.link_avaliacao
              ? "Clientes que vieram nos últimos dias. A mensagem pede uma avaliação no Google."
              : "Clientes que vieram nos últimos dias. Cadastre o link de avaliação do Google em Ajustes para pedir avaliações."
          }
        >
          {posvenda.map((v) => (
            <PosvendaCard key={`${v.veiculo_id}${v.data}`} visita={v} />
          ))}
        </Secao>
      )}

      {sumidos.length > 0 && (
        <Secao
          titulo="Clientes sumidos"
          descricao={`Não vêm há mais de ${oficina.dias_sumido} dias e não têm lembrete em aberto.`}
        >
          {sumidos.map((s) => (
            <SumidoCard key={s.cliente_id} cliente={s} />
          ))}
        </Secao>
      )}

      {proximos.length > 0 && (
        <Secao titulo="Próximos 7 dias">
          {proximos.map((l) => (
            <LembreteCard key={l.id} lembrete={l} atrasoDias={diasEntre(l.proxima_data!, hoje)} />
          ))}
        </Secao>
      )}

      {chamados.length > 0 && (
        <Secao
          titulo="Já chamados"
          descricao="Quando o cliente voltar e você registrar o serviço, conta como retorno em Resultados."
        >
          {chamados.map((l) => (
            <LembreteCard
              key={l.id}
              lembrete={l}
              atrasoDias={diasEntre(l.proxima_data ?? hoje, hoje)}
            />
          ))}
        </Secao>
      )}
    </div>
  );
}
