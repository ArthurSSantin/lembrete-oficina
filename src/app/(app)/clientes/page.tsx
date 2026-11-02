import Link from "next/link";
import { getContexto } from "@/lib/oficina";
import { Placa } from "@/components/Placa";
import { formatarWhatsapp, normalizarPlaca } from "@/lib/util";

type Linha = {
  id: string;
  nome: string;
  whatsapp: string;
  nao_contatar: boolean;
  veiculos: { placa: string; modelo: string | null }[];
};

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { supabase, oficina } = await getContexto();
  const { q } = await searchParams;
  const busca = (typeof q === "string" ? q : "").trim();

  let consulta = supabase
    .from("clientes")
    .select("id, nome, whatsapp, nao_contatar, veiculos(placa, modelo)")
    .eq("oficina_id", oficina.id)
    .order("nome")
    .limit(100);

  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    const placa = normalizarPlaca(busca);
    const termo = busca.replace(/[,()%]/g, " ");
    const filtros = [`nome.ilike.%${termo}%`];
    if (digitos.length >= 4) filtros.push(`whatsapp.ilike.%${digitos}%`);
    if (placa.length >= 3) {
      const { data: veic } = await supabase
        .from("veiculos")
        .select("cliente_id")
        .eq("oficina_id", oficina.id)
        .ilike("placa", `%${placa}%`)
        .limit(50);
      const ids = (veic ?? []).map((v) => v.cliente_id);
      if (ids.length) filtros.push(`id.in.(${ids.join(",")})`);
    }
    consulta = consulta.or(filtros.join(","));
  }

  const { data } = await consulta.returns<Linha[]>();
  const clientes = data ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Link href="/clientes/importar" className="botao-sec !py-2 text-sm">
          Importar planilha
        </Link>
      </div>
      <form className="mb-4">
        <label htmlFor="q" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={busca}
          placeholder="Buscar por nome, placa ou telefone"
          className="campo"
        />
      </form>

      {clientes.length === 0 ? (
        <p className="text-tinta-2">
          {busca
            ? "Nenhum cliente com esse nome, placa ou telefone."
            : "Nenhum cliente ainda. Eles aparecem aqui quando você registra um atendimento."}
        </p>
      ) : (
        <ul className="space-y-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="cartao block active:bg-fundo">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{c.nome}</p>
                  {c.nao_contatar && (
                    <span className="etiqueta bg-fundo text-tinta-3">Não quer mensagens</span>
                  )}
                </div>
                <p className="text-sm text-tinta-2">{formatarWhatsapp(c.whatsapp)}</p>
                {c.veiculos.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-tinta-2">
                    {c.veiculos.map((v) => (
                      <li key={v.placa} className="flex items-center gap-2">
                        <Placa placa={v.placa} />
                        {v.modelo ?? "Veículo"}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
