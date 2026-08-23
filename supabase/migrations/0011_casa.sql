-- Prumo — módulo Casa: lista de compras + tarefas domésticas recorrentes
-- Inspirado em Yadahome/HomeSlice (lista de compras compartilhada — aqui, versão pessoal,
-- sem o lado social/multiusuário) e Motivated Moms (um pouco de limpeza por dia, em vez de
-- tudo de uma vez). Ficaram de fora: comparação de preço entre mercados (Boa Lista — exigiria
-- dado real de preço que não temos, foge do princípio de não fabricar informação) e o lado
-- "vários moradores" do Yadahome (fora de escopo de um app pessoal).

-- ============================================================
-- shopping_list_items — lista de compras
-- ============================================================
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  quantity text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items: acesso aos próprios dados"
  on public.shopping_list_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index shopping_list_items_user_idx on public.shopping_list_items (user_id);

-- ============================================================
-- home_tasks — tarefas domésticas recorrentes (ex: "lavar louça", "trocar lençol")
-- ============================================================
create table public.home_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  active_days int[] not null default '{0,1,2,3,4,5,6}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_home_tasks_updated_at
  before update on public.home_tasks
  for each row execute function public.set_updated_at();

alter table public.home_tasks enable row level security;

create policy "home_tasks: acesso aos próprios dados"
  on public.home_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- home_task_logs — dias em que cada tarefa foi feita
-- ============================================================
create table public.home_task_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.home_tasks (id) on delete cascade,
  log_date date not null default current_date,
  done_at timestamptz not null default now(),
  unique (task_id, log_date)
);

alter table public.home_task_logs enable row level security;

create policy "home_task_logs: acesso aos próprios dados"
  on public.home_task_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index home_task_logs_task_date_idx on public.home_task_logs (task_id, log_date);
