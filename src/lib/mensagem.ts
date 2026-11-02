import Anthropic from "@anthropic-ai/sdk";

export type DadosMensagem = {
  oficina: string;
  assinatura: string | null;
  cliente: string;
  veiculo: string;
  servico: string;
  ultimaData: string; // dd/mm/aaaa
  ultimaKm: number | null;
  proximaKm: number | null;
  atrasoDias: number; // negativo = ainda falta
};

const MODELO = "claude-opus-5-5";

const SISTEMA = `Você escreve mensagens curtas de WhatsApp para um auto center brasileiro lembrar clientes de serviços de manutenção do carro.

Regras:
- Português do Brasil, tom amigável e respeitoso, como o dono da oficina falaria com um cliente conhecido.
- Use o primeiro nome do cliente e cite o carro e o serviço.
- Entre 2 e 4 frases. No máximo 1 emoji.
- Convide para agendar, sem pressão e sem inventar promoções, preços ou descontos.
- Não invente informações que não foram passadas.
- Termine com a assinatura da oficina, se houver.
- Responda apenas com o texto da mensagem, sem aspas e sem comentários.`;

/** Mensagem pronta usada quando a IA não está configurada ou falha. */
export function mensagemPadrao(d: DadosMensagem): string {
  const nome = d.cliente.split(" ")[0];
  const km = d.ultimaKm ? ` com ${d.ultimaKm.toLocaleString("pt-BR")} km` : "";
  const assinatura = d.assinatura ?? d.oficina;
  return `Oi, ${nome}! Tudo bem? Aqui é da ${d.oficina}. A última ${d.servico.toLowerCase()} do seu ${d.veiculo} foi em ${d.ultimaData}${km}, e já está chegando a hora de fazer de novo. Quer agendar um horário? É só responder aqui.\n\n${assinatura}`;
}

export async function gerarMensagem(
  d: DadosMensagem,
): Promise<{ texto: string; origem: "ia" | "padrao" }> {
  const temCredencial =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (!temCredencial) return { texto: mensagemPadrao(d), origem: "padrao" };

  const situacao =
    d.atrasoDias > 0
      ? `O prazo passou há ${d.atrasoDias} dias.`
      : d.atrasoDias === 0
        ? "O prazo é hoje."
        : `Faltam ${-d.atrasoDias} dias para o prazo.`;

  const dados = [
    `Oficina: ${d.oficina}`,
    `Assinatura: ${d.assinatura ?? d.oficina}`,
    `Cliente: ${d.cliente}`,
    `Carro: ${d.veiculo}`,
    `Serviço: ${d.servico}`,
    `Última vez: ${d.ultimaData}${d.ultimaKm ? ` com ${d.ultimaKm} km` : ""}`,
    d.proximaKm ? `Próxima troca prevista com: ${d.proximaKm} km` : null,
    situacao,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SISTEMA,
      messages: [{ role: "user", content: `Escreva o lembrete:\n${dados}` }],
    });

    if (resposta.stop_reason === "refusal") {
      return { texto: mensagemPadrao(d), origem: "padrao" };
    }

    const texto = resposta.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    return texto
      ? { texto, origem: "ia" }
      : { texto: mensagemPadrao(d), origem: "padrao" };
  } catch (erro) {
    if (erro instanceof Anthropic.APIError) {
      console.error("Erro na API do Claude:", erro.status, erro.message);
    } else {
      console.error("Erro ao gerar mensagem:", erro);
    }
    return { texto: mensagemPadrao(d), origem: "padrao" };
  }
}
