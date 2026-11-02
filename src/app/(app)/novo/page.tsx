import { FormAtendimento } from "@/components/FormAtendimento";
import { getContexto } from "@/lib/oficina";
import { hojeISO } from "@/lib/util";

export default async function NovoPage() {
  const { supabase, oficina } = await getContexto();
  const { data: tipos } = await supabase
    .from("tipos_servico")
    .select("id, nome")
    .eq("oficina_id", oficina.id)
    .eq("ativo", true)
    .order("ordem");

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Novo atendimento</h1>
      <p className="mb-4 text-sm text-gray-600">
        Digite a placa: se o carro já veio antes, os dados aparecem sozinhos.
      </p>
      <FormAtendimento tipos={tipos ?? []} hoje={hojeISO()} />
    </div>
  );
}
