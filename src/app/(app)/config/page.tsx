import Link from "next/link";
import { sair, salvarTipoServico } from "@/app/actions";
import { AvisoDiario } from "@/components/AvisoDiario";
import { FormModelos } from "@/components/FormModelos";
import { FormOficina } from "@/components/FormOficina";
import { getContexto } from "@/lib/oficina";
import type { TipoServico } from "@/lib/types";

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

export default async function ConfigPage() {
  const { supabase, oficina, user } = await getContexto();
  const { data: tipos } = await supabase
    .from("tipos_servico")
    .select("*")
    .eq("oficina_id", oficina.id)
    .order("ordem")
    .returns<TipoServico[]>();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ajustes</h1>

      <section className="cartao">
        <h2 className="mb-3 text-xl font-bold">Oficina</h2>
        <FormOficina oficina={oficina} />
      </section>

      <section className="cartao">
        <h2 className="mb-3 text-xl font-bold">Aviso diário no celular</h2>
        <AvisoDiario chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </section>

      <section className="cartao">
        <h2 className="mb-3 text-xl font-bold">Mensagens</h2>
        <FormModelos
          oficina={oficina}
          temIA={Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)}
        />
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-xl font-bold">Serviços e prazos</h2>
        <p className="mb-4 text-sm text-tinta-2">
          O lembrete sai no que vier primeiro: os dias ou os km (estimados pelo quanto o carro
          roda). Deixe em branco o que não se aplica.
        </p>
        <ul className="divide-y divide-linha border-y border-linha">
          {(tipos ?? []).map((t) => (
            <li key={t.id}>
              <form action={salvarTipoServico} className="py-4">
                <input type="hidden" name="tipo_id" value={t.id} />
                <label className="sr-only" htmlFor={`nome-${t.id}`}>
                  Nome do serviço
                </label>
                <input
                  id={`nome-${t.id}`}
                  name="nome"
                  defaultValue={t.nome}
                  className="campo mb-2 font-semibold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-tinta-2">
                    A cada (dias)
                    <input
                      name="intervalo_dias"
                      inputMode="numeric"
                      defaultValue={t.intervalo_dias ?? ""}
                      className="campo mt-1"
                    />
                  </label>
                  <label className="text-xs text-tinta-2">
                    A cada (km)
                    <input
                      name="intervalo_km"
                      inputMode="numeric"
                      defaultValue={t.intervalo_km ?? ""}
                      className="campo mt-1"
                    />
                  </label>
                </div>
                <details className="mt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm text-tinta-2">
                    Mensagem própria para este serviço
                  </summary>
                  <textarea
                    name="modelo_mensagem"
                    rows={4}
                    defaultValue={t.modelo_mensagem ?? ""}
                    placeholder="Em branco, usa a mensagem de lembrete geral."
                    className="campo mt-2 text-sm"
                  />
                </details>
                <div className="flex items-center justify-between">
                  <label className="flex min-h-11 items-center gap-2 pr-4 text-sm">
                    <input
                      type="checkbox"
                      name="ativo"
                      defaultChecked={t.ativo}
                      className="h-5 w-5 accent-tinta"
                    />
                    Ativo
                  </label>
                  <button type="submit" className="botao-sec text-sm">
                    Salvar
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>

        <form action={salvarTipoServico} className="mt-6 space-y-3">
          <h3 className="font-display text-lg font-bold">Adicionar serviço</h3>
          <div>
            <label className="rotulo" htmlFor="novo-nome">
              Nome
            </label>
            <input
              id="novo-nome"
              name="nome"
              required
              placeholder="Ex: Troca de correia dentada"
              className="campo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="rotulo" htmlFor="novo-dias">
                A cada (dias)
              </label>
              <input id="novo-dias" name="intervalo_dias" inputMode="numeric" className="campo" />
            </div>
            <div>
              <label className="rotulo" htmlFor="novo-km">
                A cada (km)
              </label>
              <input id="novo-km" name="intervalo_km" inputMode="numeric" className="campo" />
            </div>
          </div>
          <button type="submit" className="botao mt-2 w-full">
            Adicionar
          </button>
        </form>
        <p className="mt-3 text-xs text-tinta-3">
          Mudar um prazo vale para os próximos atendimentos, não muda lembretes já agendados.
        </p>
      </section>

      <section className="cartao space-y-3 text-sm">
        <h2 className="text-xl font-bold">Seus dados</h2>
        <p className="text-tinta-2">
          Baixe uma planilha com todos os clientes, carros e serviços. Ela abre no Excel e pode ser
          importada de volta. Toda segunda o sistema também guarda uma cópia automática.
        </p>
        <a href="/api/exportar" download className="botao-sec w-full">
          Baixar planilha com meus dados
        </a>
      </section>

      <section className="cartao space-y-3 text-sm">
        <p className="text-tinta-2">Conectado como {user.email}</p>
        <Link href="/privacidade" className="link-toque">
          Política de privacidade
        </Link>
        <form action={sair}>
          <button type="submit" className="botao-sec w-full">
            Sair
          </button>
        </form>
      </section>
    </div>
  );
}
