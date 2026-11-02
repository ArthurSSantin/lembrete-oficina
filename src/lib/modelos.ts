/** Modelos de mensagem e troca de variáveis. Sem dependências: pode ir para o navegador. */

export type TipoMensagem = "lembrete" | "recomendado" | "posvenda" | "reativacao";

export type DadosMensagem = {
  tipo: TipoMensagem;
  oficina: string;
  assinatura: string | null;
  cliente: string;
  veiculo: string;
  /** Um serviço ou vários, já juntos em texto. */
  servico: string;
  /** Data da visita de referência, dd/mm/aaaa. */
  data: string;
  km: number | null;
  proximaKm: number | null;
  /** Negativo = ainda falta. */
  atrasoDias: number;
  linkAvaliacao?: string | null;
  /** Modelo escrito pela oficina. Quando existe, a IA não é usada. */
  modelo?: string | null;
};

export const VARIAVEIS: { chave: string; descricao: string }[] = [
  { chave: "{nome}", descricao: "primeiro nome do cliente" },
  { chave: "{carro}", descricao: "modelo e ano, ou a placa" },
  { chave: "{servico}", descricao: "serviço do lembrete" },
  { chave: "{data}", descricao: "data da última visita" },
  { chave: "{km}", descricao: "km da última visita" },
  { chave: "{oficina}", descricao: "nome da oficina" },
  { chave: "{assinatura}", descricao: "assinatura da oficina" },
  { chave: "{link}", descricao: "link de avaliação no Google" },
];

export const MODELOS_PADRAO: Record<TipoMensagem, string> = {
  lembrete:
    "Oi, {nome}! Tudo bem? Aqui é da {oficina}. O serviço de {servico} do seu {carro} foi feito em {data}, e já está chegando a hora de fazer de novo. Quer agendar um horário? É só responder aqui.\n\n{assinatura}",
  recomendado:
    "Oi, {nome}! Aqui é da {oficina}. Quando o {carro} esteve aqui em {data}, a gente viu que precisava de: {servico}. Quer agendar para resolver isso? É só responder aqui.\n\n{assinatura}",
  posvenda:
    "Oi, {nome}! Aqui é da {oficina}. Obrigado por trazer o {carro}. Ficou tudo certo com ele? Se notar qualquer coisa, é só chamar.\n\nSe puder, deixe sua avaliação no Google. Ajuda muito a gente: {link}\n\n{assinatura}",
  reativacao:
    "Oi, {nome}! Aqui é da {oficina}. O {carro} não passa aqui desde {data}. Se quiser, a gente faz uma checagem rápida para ver se está tudo em ordem. É só responder aqui.\n\n{assinatura}",
};

/** Posvenda sem link de avaliação: tira o parágrafo do link. */
const POSVENDA_SEM_LINK =
  "Oi, {nome}! Aqui é da {oficina}. Obrigado por trazer o {carro}. Ficou tudo certo com ele? Se notar qualquer coisa, é só chamar.\n\n{assinatura}";

export function modeloPadrao(tipo: TipoMensagem, temLink: boolean): string {
  if (tipo === "posvenda" && !temLink) return POSVENDA_SEM_LINK;
  return MODELOS_PADRAO[tipo];
}

/** Troca as variáveis do modelo pelos dados. Variável desconhecida fica como está. */
export function preencherModelo(modelo: string, d: DadosMensagem): string {
  const valores: Record<string, string> = {
    "{nome}": d.cliente.trim().split(/\s+/)[0] ?? "",
    "{carro}": d.veiculo,
    "{servico}": d.tipo === "recomendado" ? d.servico : d.servico.toLowerCase(),
    "{data}": d.data,
    "{km}": d.km ? `${d.km.toLocaleString("pt-BR")} km` : "",
    "{oficina}": d.oficina,
    "{assinatura}": d.assinatura || d.oficina,
    "{link}": d.linkAvaliacao ?? "",
  };
  // Sem km, some também o "com" que vinha antes ("feito com {km}").
  const base = d.km ? modelo : modelo.replace(/\s+(com|aos|a)\s+\{km\}/gi, "");
  return base
    .replace(/\{[a-z_]+\}/g, (v) => valores[v] ?? v)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Mensagem pronta usada quando não há modelo próprio e a IA não está disponível. */
export function mensagemPadrao(d: DadosMensagem): string {
  return preencherModelo(modeloPadrao(d.tipo, Boolean(d.linkAvaliacao)), d);
}
