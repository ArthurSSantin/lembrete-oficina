export type Oficina = {
  id: string;
  nome: string;
  whatsapp: string | null;
  assinatura_texto: string | null;
};

export type TipoServico = {
  id: string;
  oficina_id: string;
  nome: string;
  intervalo_dias: number | null;
  intervalo_km: number | null;
  ativo: boolean;
  ordem: number;
};

export type Cliente = {
  id: string;
  nome: string;
  whatsapp: string;
  consentimento: boolean;
  observacoes: string | null;
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
};

/** Lembrete com os dados juntados para a tela "Hoje". */
export type Lembrete = Servico & {
  tipos_servico: Pick<TipoServico, "nome">;
  veiculos: Veiculo & { clientes: Cliente };
};
