import Link from "next/link";
import { sair, salvarTipoServico } from "@/app/actions";
import { FormOficina } from "@/components/FormOficina";
import { getContexto } from "@/lib/oficina";
import type { TipoServico } from "@/lib/types";

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
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <section className="cartao">
        <h2 className="mb-3 text-lg font-semibold">Oficina</h2>
        <FormOficina oficina={oficina} />
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-lg font-semibold">Serviços e prazos</h2>
        <p className="mb-4 text-sm text-gray-600">
          O lembrete sai no que vier primeiro: os dias ou os km (estimados pelo quanto o carro
          roda). Deixe em branco o que não se aplica.
        </p>
        <ul className="space-y-3">
          {(tipos ?? []).map((t) => (
            <li key={t.id}>
              <form action={salvarTipoServico} className="rounded-lg border border-gray-200 p-3">
                <input type="hidden" name="id" value={t.id} />
                <input name="nome" defaultValue={t.nome} className="campo mb-2 font-medium" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">
                    A cada (dias)
                    <input
                      name="intervalo_dias"
                      inputMode="numeric"
                      defaultValue={t.intervalo_dias ?? ""}
                      className="campo mt-1"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    A cada (km)
                    <input
                      name="intervalo_km"
                      inputMode="numeric"
                      defaultValue={t.intervalo_km ?? ""}
                      className="campo mt-1"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="ativo" defaultChecked={t.ativo} className="h-5 w-5" />
                    Ativo
                  </label>
                  <button type="submit" className="botao-sec !py-2 text-sm">
                    Salvar
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>

        <form action={salvarTipoServico} className="mt-4 rounded-lg border border-dashed border-gray-300 p-3">
          <p className="mb-2 text-sm font-medium">Adicionar serviço</p>
          <input name="nome" required placeholder="Ex: Troca de correia dentada" className="campo mb-2" />
          <div className="grid grid-cols-2 gap-2">
            <input name="intervalo_dias" inputMode="numeric" placeholder="Dias" className="campo" />
            <input name="intervalo_km" inputMode="numeric" placeholder="Km" className="campo" />
          </div>
          <button type="submit" className="botao mt-2 w-full">
            Adicionar
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          Mudar um prazo vale para os próximos atendimentos, não muda lembretes já agendados.
        </p>
      </section>

      <section className="cartao space-y-3 text-sm">
        <p className="text-gray-600">Conectado como {user.email}</p>
        <Link href="/privacidade" className="block text-blue-600">
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
