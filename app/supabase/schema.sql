-- ============================================================================
-- Altoprints — Sistema de pedidos DTF
-- Estrutura do banco no Supabase (PostgreSQL)
--
-- Como usar:
--   1. Crie um projeto gratuito em https://supabase.com
--   2. Abra "SQL Editor" > "New query"
--   3. Cole TODO este arquivo e clique em "Run"
--   4. Em "Storage" crie um bucket chamado  artes  e marque como PUBLIC
--      (Storage > New bucket > nome: artes > Public bucket: ON)
--   5. Em Project Settings > API copie a URL e a chave "anon public"
--      e coloque no arquivo .env do sistema:
--         VITE_SUPABASE_URL=...
--         VITE_SUPABASE_ANON_KEY=...
-- ============================================================================

-- ------------------------------- vendedores --------------------------------
create table if not exists public.vendedores (
  id          text primary key,
  nome        text not null,
  created_at  text not null default now()::text
);

-- -------------------------------- clientes ---------------------------------
create table if not exists public.clientes (
  id                   text primary key,
  nome                 text not null,
  telefone             text default '',
  email                text default '',
  observacoes          text default '',
  vendedor_id          text default '',
  valor_especial_metro double precision,
  especial             boolean default false,
  created_at           text not null default now()::text
);
create index if not exists clientes_nome_idx on public.clientes (lower(nome));

-- --------------------------------- pedidos ---------------------------------
create table if not exists public.pedidos (
  id               text primary key,
  numero           integer not null,
  cliente_nome     text not null,
  cliente_id       text,
  vendedor_id      text default '',
  descricao        text default '',
  metragem         double precision,
  valor            double precision default 0,
  valor_modo       text default 'auto',
  status_producao  text default 'editar_arte',
  status_pagamento text default 'pendente',
  forma_pagamento  text default '',
  data_pagamento   text,
  data_pedido      text not null default now()::text,
  observacoes      text default '',
  tipo_entrega     text default 'retirada',
  endereco         text default '',
  cidade           text default '',
  estado           text default '',
  cep              text default '',
  codigo_rastreio  text default '',
  data_envio       text,
  data_entrega     text,
  retirado_por     text default '',
  data_retirada    text,
  impresso         boolean default false,
  impresso_em      text,
  aviso_visto      boolean default true,
  created_at       text not null default now()::text,
  updated_at       text not null default now()::text
);
create index if not exists pedidos_numero_idx on public.pedidos (numero desc);
create index if not exists pedidos_vendedor_idx on public.pedidos (vendedor_id);
create index if not exists pedidos_pagamento_idx on public.pedidos (status_pagamento, data_pagamento);

-- -------------------------------- arquivos ---------------------------------
-- metadados dos arquivos de arte; o conteúdo fica no Storage (bucket "artes")
create table if not exists public.arquivos (
  id         text primary key,
  pedido_id  text not null references public.pedidos (id) on delete cascade,
  nome       text not null,
  tipo       text default '',
  tamanho    bigint default 0,
  url        text default '',
  created_at text not null default now()::text
);
create index if not exists arquivos_pedido_idx on public.arquivos (pedido_id);

-- -------------------------------- usuários ---------------------------------
-- contas de acesso ao sistema: uma conta de proprietário (vê tudo) e as contas
-- dos vendedores (veem apenas os pedidos/clientes ligados a eles).
-- A senha nunca fica em texto puro: guardamos apenas um hash (impressão digital).
create table if not exists public.usuarios (
  id          text primary key,
  nome        text not null,
  usuario     text not null,
  senha_hash  text default '',
  papel       text default 'vendedor',
  vendedor_id text default '',
  ativo       boolean default true,
  criado_em   text not null default now()::text
);
create unique index if not exists usuarios_usuario_idx on public.usuarios (lower(usuario));

-- ----------------------------- configurações -------------------------------
-- linha única (id = 1) com as preferências do sistema (logo, nome, etc.)
create table if not exists public.configuracoes (
  id    integer primary key default 1,
  valor jsonb not null default '{}'::jsonb
);
insert into public.configuracoes (id, valor) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- --------------------------- acesso (RLS) ----------------------------------
-- O sistema é de uso interno e o login é o do próprio sistema (nome de usuário
-- + senha). Mantemos a leitura/escrita liberada pela chave anon — não divulgue
-- a chave, use uma senha forte para o proprietário e não torne o link público.
-- Se quiser trancar mais, troque as políticas abaixo pelas do Supabase Auth.
alter table public.vendedores    enable row level security;
alter table public.clientes      enable row level security;
alter table public.pedidos       enable row level security;
alter table public.arquivos      enable row level security;
alter table public.configuracoes enable row level security;
alter table public.usuarios      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['vendedores','clientes','pedidos','arquivos','configuracoes','usuarios'] loop
    execute format('drop policy if exists "%1$s_acesso_total" on public.%1$I', t);
    execute format(
      'create policy "%1$s_acesso_total" on public.%1$I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ------------------------- políticas do Storage ----------------------------
-- Permite enviar/ler/excluir arquivos do bucket "artes" pela chave anon.
drop policy if exists "artes_leitura" on storage.objects;
create policy "artes_leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'artes');

drop policy if exists "artes_envio" on storage.objects;
create policy "artes_envio" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'artes');

drop policy if exists "artes_exclusao" on storage.objects;
create policy "artes_exclusao" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'artes');
