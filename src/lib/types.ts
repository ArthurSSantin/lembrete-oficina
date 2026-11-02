export type Oficina = {
  id: string;
  nome: string;
  whatsapp: string | null;
  assinatura_texto: string | null;
  link_avaliacao: string | null;
  modelo_lembrete: string | null;
  modelo_recomendado: string | null;
  modelo_posvenda: string | null;
  modelo_reativacao: string | null;
  dias_sumido: number;
};

export type TipoServico = {
  id: string;
  oficina_id: string;
  nome: string;
  intervalo_dias: number | null;
  intervalo_km: number | null;
  ativo: boolean;
  ordem: number;
  modelo_mensagem: string | null;
};

export type Cliente = {
  id: string;
  nome: string;
  whatsapp: string;
  consentimento: boolean;
  observacoes: string | null;
  nao_contatar: boolean;
};

export type Veiculo = {
  id: string;
  cliente_id: string;
  placa: string;
  modelo: string | null;
  ano: number | null;
};

export type LembreteStatus =
  | "pendente"
  | "contatado"
  | "retornou"
  | "ignorado"
  | "substituido";

export type Servico = {
  id: string;
  veiculo_id: string;
  tipo_servico_id: string;
  data: string;
  km: number | null;
  valor: number | null;
  proxima_data: string | null;
  proxima_km: number | null;
  lembrete_status: LembreteStatus;
  contatado_em: string | null;
  origem: "feito" | "recomendado";
  posvenda_em: string | null;
};

/** Lembrete com os dados juntados para a tela "Hoje". */
export type Lembrete = Servico & {
  tipos_servico: Pick<TipoServico, "nome">;
  veiculos: Veiculo & { clientes: Cliente };
};

/** Linha da função clientes_sumidos. */
export type Sumido = {
  cliente_id: string;
  nome: string;
  whatsapp: string;
  consentimento: boolean;
  veiculo: string;
  placa: string;
  ultima_visita: string;
  ultimo_servico: string;
};

/** Visita recente que ainda não recebeu a mensagem de pós-venda. */
export type Posvenda = {
  veiculo_id: string;
  data: string;
  servicos: string[];
  cliente: Cliente;
  veiculo: Veiculo;
};
