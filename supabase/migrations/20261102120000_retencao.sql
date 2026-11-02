-- Onda 1: retenção
-- Serviços recomendados (o cliente não quis fazer agora), pós-venda com pedido de
-- avaliação, reativação de clientes sumidos, "não contatar" e mensagens editáveis.

-- Serviço feito ou só recomendado. O recomendado entra na mesma fila de lembretes.
alter table servicos
  add column if not exists origem text not null default 'feito'
    check (origem in ('feito', 'recomendado'));

-- Pós-venda: quando a mensagem de agradecimento/avaliação foi enviada.
alter table servicos add column if not exists posvenda_em timestamptz;

-- Cliente pediu para não receber mais mensagens (LGPD).
alter table clientes add column if not exists nao_contatar boolean not null default false;
-- Última mensagem de reativação ("faz tempo que não vem").
alter table clientes add column if not exists reativacao_em timestamptz;

-- Link para o cliente avaliar a oficina no Google.
alter table oficinas add column if not exists link_avaliacao text;
-- Modelos de mensagem. Vazio = usa o texto padrão do sistema.
alter table oficinas add column if not exists modelo_lembrete text;
alter table oficinas add column if not exists modelo_recomendado text;
alter table oficinas add column if not exists modelo_posvenda text;
alter table oficinas add column if not exists modelo_reativacao text;
-- Depois de quantos dias sem vir o cliente conta como sumido.
alter table oficinas add column if not exists dias_sumido int not null default 300;

-- Modelo próprio por serviço (opcional, tem prioridade sobre o da oficina).
alter table tipos_servico add column if not exists modelo_mensagem text;

create index if not exists servicos_posvenda_idx
  on servicos (oficina_id, data) where posvenda_em is null and origem = 'feito';

-- Clientes cuja última visita foi antes de p_antes e que não têm lembrete em aberto.
-- security invoker: o RLS das tabelas continua valendo.
create or replace function clientes_sumidos(p_oficina uuid, p_antes date, p_limite int default 50)
returns table (
  cliente_id uuid,
  nome text,
  whatsapp text,
  consentimento boolean,
  veiculo text,
  placa text,
  ultima_visita date,
  ultimo_servico text
)
language sql stable security invoker set search_path = public
as $$
  with ultimas as (
    select distinct on (v.cliente_id)
      v.cliente_id,
      concat_ws(' ', v.modelo, v.ano::text) as veiculo,
      v.placa,
      s.data as ultima_visita,
      t.nome as ultimo_servico
    from servicos s
    join veiculos v on v.id = s.veiculo_id
    join tipos_servico t on t.id = s.tipo_servico_id
    where s.oficina_id = p_oficina and s.origem = 'feito'
    order by v.cliente_id, s.data desc
  )
  select c.id, c.nome, c.whatsapp, c.consentimento, u.veiculo, u.placa, u.ultima_visita, u.ultimo_servico
  from ultimas u
  join clientes c on c.id = u.cliente_id
  where u.ultima_visita < p_antes
    and not c.nao_contatar
    and (c.reativacao_em is null or c.reativacao_em < now() - interval '90 days')
    and not exists (
      select 1 from servicos s2
      join veiculos v2 on v2.id = s2.veiculo_id
      where v2.cliente_id = c.id
        and s2.lembrete_status in ('pendente', 'contatado')
        and s2.proxima_data is not null
        and s2.proxima_data >= current_date - 30
    )
  order by u.ultima_visita desc
  limit p_limite
$$;

grant execute on function clientes_sumidos(uuid, date, int) to authenticated;
