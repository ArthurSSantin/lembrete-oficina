import Link from "next/link";
import { notFound } from "next/navigation";
import { getContexto } from "@/lib/oficina";
import type { Cliente, Servico, Veiculo } from "@/lib/types";
import { BotaoNaoContatar } from "@/components/BotaoNaoContatar";
import { Placa } from "@/components/Placa";
import { formatarData, formatarMoeda, formatarWhatsapp } from "@/lib/util";

type ServicoLinha = Servico & { tipos_servico: { nome: string } };
type VeiculoComServicos = Veiculo & { servicos: ServicoLinha[] };

const STATUS: Record<Servico["lembrete_status"], string> = {
  pendente: "Lembrete agendado",
  contatado: "Cliente chamado",
  retornou: "Voltou depois do lembrete",
  ignorado: "Lembrete ignorado",
  substituido: "Refeito",
};

// Depende do usuário logado: renderiza na hora, atrás do loading.tsx.
export const instant = false;

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
      <Link href="/clientes" className="link-toque text-sm">
        Voltar para Clientes
      </Link>
      <div className="cartao">
        <h1 className="text-3xl font-bold">{cliente.nome}</h1>
        <p className="text-tinta-2">{formatarWhatsapp(cliente.whatsapp)}</p>
        <p className="mt-1 text-sm">
          {cliente.nao_contatar ? (
            <span className="text-vermelho">Pediu para não receber mensagens</span>
          ) : cliente.consentimento ? (
            <span className="text-verde">Autorizou receber lembretes</span>
          ) : (
            <span className="text-sinal-escuro">Sem autorização registrada</span>
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
        <div className="mt-2">
          <BotaoNaoContatar clienteId={cliente.id} ativo={cliente.nao_contatar} />
        </div>
      </div>

      {cliente.veiculos.map((v) => {
        const servicos = [...v.servicos].sort((a, b) => b.data.localeCompare(a.data));
        return (
          <div key={v.id} className="cartao">
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              <Placa placa={v.placa} />
              {[v.modelo, v.ano].filter(Boolean).join(" ") || "Veículo"}
            </h2>
            <ul className="mt-3 divide-y divide-linha">
              {servicos.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {s.tipos_servico.nome}
                      {s.origem === "recomendado" && (
                        <span className="etiqueta ml-2 bg-sinal-claro text-sinal-escuro">
                          Recomendado
                        </span>
                      )}
                    </span>
                    <span className="text-tinta-3">{formatarData(s.data)}</span>
                  </div>
                  <div className="text-tinta-2">
                    {s.km ? `${s.km.toLocaleString("pt-BR")} km` : "km não informado"}
                    {s.valor ? ` · ${formatarMoeda(Number(s.valor))}` : ""}
                    {s.proxima_data && s.lembrete_status === "pendente"
                      ? ` · próximo em ${formatarData(s.proxima_data)}`
                      : ""}
                  </div>
                  <div className="text-xs text-tinta-3">{STATUS[s.lembrete_status]}</div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
