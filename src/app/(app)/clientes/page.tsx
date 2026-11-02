import Link from "next/link";
import { getContexto } from "@/lib/oficina";
import { formatarPlaca, formatarWhatsapp, normalizarPlaca } from "@/lib/util";

type Linha = {
  id: string;
  nome: string;
  whatsapp: string;
  veiculos: { placa: string; modelo: string | null }[];
};

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { supabase, oficina } = await getContexto();
  const { q } = await searchParams;
  const busca = (typeof q === "string" ? q : "").trim();

  let consulta = supabase
    .from("clientes")
    .select("id, nome, whatsapp, veiculos(placa, modelo)")
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
      <h1 className="mb-4 text-2xl font-bold">Clientes</h1>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome, placa ou telefone"
          className="campo"
        />
      </form>

      {clientes.length === 0 ? (
        <p className="text-gray-600">Nenhum cliente encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="cartao block active:bg-gray-50">
                <p className="font-semibold">{c.nome}</p>
                <p className="text-sm text-gray-600">{formatarWhatsapp(c.whatsapp)}</p>
                {c.veiculos.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {c.veiculos
                      .map((v) => `${v.modelo ?? "Veículo"} (${formatarPlaca(v.placa)})`)
                      .join(" · ")}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
