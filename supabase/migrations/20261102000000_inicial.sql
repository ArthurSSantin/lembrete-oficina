-- Lembrete Oficina: esquema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Tudo é separado por oficina (multi-tenant) com Row Level Security.

create extension if not exists "pgcrypto";

-- ===================== TABELAS =====================

create table if not exists oficinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text,
  assinatura_texto text, -- ex: "Auto Center Silva - (11) 99999-9999"
  criado_em timestamptz not null default now()
);

create table if not exists membros (
  oficina_id uuid not null references oficinas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'atendente')),
  criado_em timestamptz not null default now(),
  primary key (oficina_id, user_id)
);

create table if not exists tipos_servico (
  id uuid primary key default gen_random_uuid(),
  oficina_id uuid not null references oficinas(id) on delete cascade,
  nome text not null,
  intervalo_dias int,      -- ex: 180
  intervalo_km int,        -- ex: 10000
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  oficina_id uuid not null references oficinas(id) on delete cascade,
  nome text not null,
  whatsapp text not null,          -- só dígitos, com DDI 55
  consentimento boolean not null default false,
  consentimento_em timestamptz,
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (oficina_id, whatsapp)
);

create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  oficina_id uuid not null references oficinas(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  placa text not null,             -- maiúsculas, sem traço
  modelo text,
  ano int,
  criado_em timestamptz not null default now(),
  unique (oficina_id, placa)
);

-- Cada serviço feito vira uma linha. O lembrete é a "próxima" data dele.
create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  oficina_id uuid not null references oficinas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  tipo_servico_id uuid not null references tipos_servico(id) on delete restrict,
  data date not null default current_date,
  km int,
  valor numeric(10,2),
  proxima_data date,
  proxima_km int,
  -- pendente: aguardando a data | contatado: mensagem enviada
  -- retornou: cliente voltou e fez o serviço de novo | ignorado | substituido
  lembrete_status text not null default 'pendente'
    check (lembrete_status in ('pendente', 'contatado', 'retornou', 'ignorado', 'substituido')),
  contatado_em timestamptz,
  retorno_servico_id uuid references servicos(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists servicos_lembrete_idx
  on servicos (oficina_id, lembrete_status, proxima_data);
create index if not exists servicos_veiculo_tipo_idx
  on servicos (veiculo_id, tipo_servico_id, data desc);
create index if not exists clientes_nome_idx on clientes (oficina_id, nome);

-- ===================== SEGURANÇA (RLS) =====================

-- Retorna as oficinas do usuário logado.
create or replace function minhas_oficinas()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select oficina_id from membros where user_id = auth.uid()
$$;

alter table oficinas enable row level security;
alter table membros enable row level security;
alter table tipos_servico enable row level security;
alter table clientes enable row level security;
alter table veiculos enable row level security;
alter table servicos enable row level security;

drop policy if exists oficinas_rw on oficinas;
create policy oficinas_rw on oficinas for all
  using (id in (select minhas_oficinas()))
  with check (id in (select minhas_oficinas()));

drop policy if exists membros_r on membros;
create policy membros_r on membros for select
  using (oficina_id in (select minhas_oficinas()));

drop policy if exists tipos_rw on tipos_servico;
create policy tipos_rw on tipos_servico for all
  using (oficina_id in (select minhas_oficinas()))
  with check (oficina_id in (select minhas_oficinas()));

drop policy if exists clientes_rw on clientes;
create policy clientes_rw on clientes for all
  using (oficina_id in (select minhas_oficinas()))
  with check (oficina_id in (select minhas_oficinas()));

drop policy if exists veiculos_rw on veiculos;
create policy veiculos_rw on veiculos for all
  using (oficina_id in (select minhas_oficinas()))
  with check (oficina_id in (select minhas_oficinas()));

drop policy if exists servicos_rw on servicos;
create policy servicos_rw on servicos for all
  using (oficina_id in (select minhas_oficinas()))
  with check (oficina_id in (select minhas_oficinas()));

-- ===================== CRIAR OFICINA =====================
-- Cria a oficina, torna o usuário dono e cadastra serviços padrão.

create or replace function criar_oficina(p_nome text, p_whatsapp text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  insert into oficinas (nome, whatsapp, assinatura_texto)
  values (p_nome, p_whatsapp, p_nome)
  returning id into v_id;

  insert into membros (oficina_id, user_id, papel)
  values (v_id, auth.uid(), 'dono');

  insert into tipos_servico (oficina_id, nome, intervalo_dias, intervalo_km, ordem) values
    (v_id, 'Troca de óleo e filtro',      180, 10000, 1),
    (v_id, 'Alinhamento e balanceamento', 180, 10000, 2),
    (v_id, 'Revisão de freios',           365, 20000, 3),
    (v_id, 'Filtro de ar e cabine',       365, 15000, 4),
    (v_id, 'Fluido de arrefecimento',     730, 40000, 5),
    (v_id, 'Bateria',                     730, null,  6),
    (v_id, 'Pneus',                      1095, 40000, 7),
    (v_id, 'Revisão geral',               365, 10000, 8);

  return v_id;
end;
$$;

grant execute on function criar_oficina(text, text) to authenticated;
grant execute on function minhas_oficinas() to authenticated;
