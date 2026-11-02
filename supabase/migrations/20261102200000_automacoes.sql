-- Automações: aviso diário no celular (Web Push) e backup semanal.

-- Celulares/navegadores inscritos para receber o aviso diário.
create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  oficina_id uuid not null references oficinas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

alter table push_inscricoes enable row level security;

drop policy if exists push_proprias on push_inscricoes;
create policy push_proprias on push_inscricoes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and oficina_id in (select minhas_oficinas()));

-- Bucket privado para os backups semanais. Sem políticas: só o servidor
-- (chave secreta) lê e grava.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
