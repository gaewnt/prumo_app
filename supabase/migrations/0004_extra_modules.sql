-- Prumo — módulos "simples" (os 10 que ainda não tinham tabela própria)
-- Cobre Saúde, Casa, Estudos, Beleza, Viagens, Carreira, Mente, Relações,
-- Pet e Detox com uma única tabela, diferenciada por `module_slug`. Ver
-- mobile/lib/simple-list.ts e mobile/components/simple-list/ pro motor
-- genérico que lê/escreve nela.

create table public.simple_module_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_slug text not null,
  group_name text,
  title text not null,
  notes text,
  item_date date,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index simple_module_items_user_module_idx
  on public.simple_module_items (user_id, module_slug, done, position);

alter table public.simple_module_items enable row level security;

create policy "simple_module_items: acesso aos próprios dados"
  on public.simple_module_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
