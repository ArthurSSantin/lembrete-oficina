import Anthropic from "@anthropic-ai/sdk";

import { mensagemPadrao, preencherModelo, type DadosMensagem, type TipoMensagem } from "./modelos";

export * from "./modelos";

const MODELO_IA = "claude-opus-5-5";

const SISTEMA = `Você escreve mensagens curtas de WhatsApp para um auto center brasileiro falar com clientes.

Regras:
- Português do Brasil, tom amigável e respeitoso, como o dono da oficina falaria com um cliente conhecido.
- Use o primeiro nome do cliente e cite o carro.
- Entre 2 e 4 frases. No máximo 1 emoji.
- Convide para agendar, sem pressão e sem inventar promoções, preços ou descontos.
- Não invente informações que não foram passadas.
- Termine com a assinatura da oficina, se houver.
- Responda apenas com o texto da mensagem, sem aspas e sem comentários.`;

const OBJETIVO: Record<TipoMensagem, string> = {
  lembrete: "Lembrar que está na hora de refazer um serviço de manutenção.",
  recomendado:
    "Na última visita a oficina recomendou um serviço que o cliente preferiu não fazer na hora. Lembrar disso com cuidado, explicando que é para a segurança e o bom funcionamento do carro.",
  posvenda:
    "Agradecer a visita recente e perguntar se ficou tudo certo com o carro. Se houver link de avaliação, pedir com educação uma avaliação no Google e incluir o link.",
  reativacao:
    "O cliente não aparece faz tempo. Dizer que sentiu falta e oferecer uma checagem do carro.",
};

export async function gerarMensagem(
  d: DadosMensagem,
): Promise<{ texto: string; origem: "ia" | "padrao" | "modelo" }> {
  if (d.modelo?.trim()) return { texto: preencherModelo(d.modelo, d), origem: "modelo" };

  const temCredencial =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (!temCredencial) return { texto: mensagemPadrao(d), origem: "padrao" };

  const situacao =
    d.tipo !== "lembrete" && d.tipo !== "recomendado"
      ? null
      : d.atrasoDias > 0
        ? `O prazo passou há ${d.atrasoDias} dias.`
        : d.atrasoDias === 0
          ? "O prazo é hoje."
          : `Faltam ${-d.atrasoDias} dias para o prazo.`;

  const dados = [
    `Objetivo: ${OBJETIVO[d.tipo]}`,
    `Oficina: ${d.oficina}`,
    `Assinatura: ${d.assinatura || d.oficina}`,
    `Cliente: ${d.cliente}`,
    `Carro: ${d.veiculo}`,
    `Serviço: ${d.servico}`,
    `Data da visita: ${d.data}${d.km ? ` com ${d.km} km` : ""}`,
    d.proximaKm ? `Próxima troca prevista com: ${d.proximaKm} km` : null,
    d.linkAvaliacao && d.tipo === "posvenda" ? `Link de avaliação: ${d.linkAvaliacao}` : null,
    situacao,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: MODELO_IA,
      max_tokens: 2000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SISTEMA,
      messages: [{ role: "user", content: `Escreva a mensagem:\n${dados}` }],
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
