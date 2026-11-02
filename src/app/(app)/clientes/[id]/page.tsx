import Link from "next/link";
import { notFound } from "next/navigation";
import { getContexto } from "@/lib/oficina";
import type { Cliente, Servico, Veiculo } from "@/lib/types";
import { formatarData, formatarMoeda, formatarPlaca, formatarWhatsapp } from "@/lib/util";

type ServicoLinha = Servico & { tipos_servico: { nome: string } };
type VeiculoComServicos = Veiculo & { servicos: ServicoLinha[] };

const STATUS: Record<Servico["lembrete_status"], string> = {
  pendente: "Lembrete agendado",
  contatado: "Cliente chamado",
  retornou: "Voltou depois do lembrete",
  ignorado: "Lembrete ignorado",
  substituido: "Refeito",
};

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { supabase } = await getContexto();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*, veiculos(*, servicos(*, tipos_servico(nome)))")
    .eq("id", id)
    .maybeSingle<Cliente & { veiculos: VeiculoComServicos[] }>();

  if (!cliente) notFound();

  return (
    <div className="space-y-4">
      <Link href="/clientes" className="text-sm text-blue-600">
        ← Clientes
      </Link>
      <div className="cartao">
        <h1 className="text-2xl font-bold">{cliente.nome}</h1>
        <p className="text-gray-600">{formatarWhatsapp(cliente.whatsapp)}</p>
        <p className="mt-1 text-sm">
          {cliente.consentimento ? (
            <span className="text-green-700">✓ Autorizou receber lembretes</span>
          ) : (
            <span className="text-amber-700">Sem autorização registrada</span>
          )}
        </p>
        <a
          href={`https://wa.me/${cliente.whatsapp}`}
          target="_blank"
          rel="noopener"
          className="botao-sec mt-3 w-full"
        >
          Abrir no WhatsApp
        </a>
      </div>

      {cliente.veiculos.map((v) => {
        const servicos = [...v.servicos].sort((a, b) => b.data.localeCompare(a.data));
        return (
          <div key={v.id} className="cartao">
            <h2 className="text-lg font-semibold">
              {[v.modelo, v.ano].filter(Boolean).join(" ") || "Veículo"}{" "}
              <span className="font-mono text-gray-500">{formatarPlaca(v.placa)}</span>
            </h2>
            <ul className="mt-3 divide-y divide-gray-100">
              {servicos.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{s.tipos_servico.nome}</span>
                    <span className="text-gray-500">{formatarData(s.data)}</span>
                  </div>
                  <div className="text-gray-600">
                    {s.km ? `${s.km.toLocaleString("pt-BR")} km` : "km não informado"}
                    {s.valor ? ` · ${formatarMoeda(Number(s.valor))}` : ""}
                    {s.proxima_data && s.lembrete_status === "pendente"
                      ? ` · próximo em ${formatarData(s.proxima_data)}`
                      : ""}
                  </div>
                  <div className="text-xs text-gray-400">{STATUS[s.lembrete_status]}</div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
