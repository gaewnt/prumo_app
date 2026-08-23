-- Prumo — evolução do módulo Treino
-- Adiciona altura ao perfil, histórico de peso corporal (check-in antes do
-- treino) e metas de treino com progresso (peso corporal ou métrica
-- personalizada — desempenho, reps ou carga de um exercício, atualizada
-- manualmente pela própria pessoa, seguindo o princípio de "insights
-- manuais" já usado em Finanças: sem geração automática, o cálculo é
-- honesto e a pessoa acompanha o próprio número).

-- ============================================================
-- profiles — altura, usada no check-in do Treino
-- ============================================================
alter table public.profiles
  add column height_cm numeric(5, 1) check (height_cm is null or height_cm > 0);

-- ============================================================
-- body_logs — peso corporal, um registro por dia
-- ============================================================
create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5, 1) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index body_logs_user_date_idx
  on public.body_logs (user_id, log_date desc);

-- ============================================================
-- training_goals — metas de peso ou de métrica personalizada
-- (desempenho/reps/carga), com progresso 0–100% calculado a partir de
-- start_value → target_value. Pra metric_type = 'weight' o valor atual vem
-- do último body_logs; pra 'custom' vem de current_value, atualizado à mão.
-- ============================================================
create table public.training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  metric_type text not null check (metric_type in ('weight', 'custom')),
  start_value numeric(8, 2) not null,
  target_value numeric(8, 2) not null,
  current_value numeric(8, 2),
  unit text not null default 'kg',
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_training_goals_updated_at
  before update on public.training_goals
  for each row execute function public.set_updated_at();

create index training_goals_user_idx
  on public.training_goals (user_id, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.body_logs enable row level security;
alter table public.training_goals enable row level security;

create policy "body_logs: acesso aos próprios dados"
  on public.body_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "training_goals: acesso aos próprios dados"
  on public.training_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
