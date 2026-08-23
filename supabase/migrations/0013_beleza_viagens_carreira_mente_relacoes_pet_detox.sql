-- Prumo — últimos 7 módulos: Beleza, Viagens, Carreira, Mente, Relações, Pet e Detox.
-- Beleza, Viagens e Mente seguem referências que ela mandou (Skincare Diary, Todoist,
-- Calm/Headspace/Cíngulo/Buddhify). Carreira não teve referência. Relações, Pet e Detox
-- foram desenhados por mim, por pedido explícito dela ("vc pode criar o que preferir").
-- Com essa migration, os 16 módulos do app têm schema próprio.

-- ============================================================
-- BELEZA
-- ============================================================

create table public.beauty_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'outro' check (category in ('limpeza', 'esfoliante', 'tonico', 'hidratante', 'protetor_solar', 'tratamento', 'outro')),
  opened_at date,
  expires_at date,
  -- dias de antecedência do lembrete de validade; null = sem lembrete. Só faz sentido com expires_at preenchido.
  expiry_reminder_days_before int,
  notification_id text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.beauty_routine_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null check (period in ('manha', 'noite')),
  title text not null,
  product_id uuid references public.beauty_products (id) on delete set null,
  created_at timestamptz not null default now()
);

-- registro de "passo feito hoje" — um por passo/dia, igual ao molde de home_task_logs da Casa.
create table public.beauty_routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id uuid not null references public.beauty_routine_steps (id) on delete cascade,
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (step_id, log_date)
);

-- check-in diário da pele — 5 notas de 1 a 5, um registro por dia (upsert por user+dia).
create table public.skin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  overall int not null check (overall between 1 and 5),
  texture int not null check (texture between 1 and 5),
  oiliness int not null check (oiliness between 1 and 5),
  sensitivity int not null check (sensitivity between 1 and 5),
  moisture int not null check (moisture between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index beauty_products_user_idx on public.beauty_products (user_id);
create index beauty_routine_steps_user_idx on public.beauty_routine_steps (user_id);
create index beauty_routine_logs_step_date_idx on public.beauty_routine_logs (step_id, log_date);
create index skin_logs_user_date_idx on public.skin_logs (user_id, log_date);

alter table public.beauty_products enable row level security;
alter table public.beauty_routine_steps enable row level security;
alter table public.beauty_routine_logs enable row level security;
alter table public.skin_logs enable row level security;

create policy "beauty_products: acesso aos próprios dados"
  on public.beauty_products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "beauty_routine_steps: acesso aos próprios dados"
  on public.beauty_routine_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "beauty_routine_logs: acesso aos próprios dados"
  on public.beauty_routine_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skin_logs: acesso aos próprios dados"
  on public.skin_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- VIAGENS
-- ============================================================

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  status text not null default 'planejando' check (status in ('planejando', 'confirmada', 'concluida')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  category text not null default 'outro' check (category in ('documentos', 'malas', 'reservas', 'outro')),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index trips_user_idx on public.trips (user_id);
create index trip_checklist_items_trip_idx on public.trip_checklist_items (trip_id);

alter table public.trips enable row level security;
alter table public.trip_checklist_items enable row level security;

create policy "trips: acesso aos próprios dados"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trip_checklist_items: acesso aos próprios dados"
  on public.trip_checklist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CARREIRA
-- ============================================================

create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  institution text,
  status text not null default 'planejado' check (status in ('planejado', 'em_andamento', 'concluido')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.career_deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_date date not null,
  -- lembrete relativo ao prazo (dias antes), disparado às 9h — mesma receita das tarefas de Estudos.
  reminder_days_before int,
  notification_id text,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index career_goals_user_idx on public.career_goals (user_id);
create index courses_user_idx on public.courses (user_id);
create index career_deadlines_user_idx on public.career_deadlines (user_id);

alter table public.career_goals enable row level security;
alter table public.courses enable row level security;
alter table public.career_deadlines enable row level security;

create policy "career_goals: acesso aos próprios dados"
  on public.career_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "courses: acesso aos próprios dados"
  on public.courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "career_deadlines: acesso aos próprios dados"
  on public.career_deadlines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MENTE
-- ============================================================

create table public.mindfulness_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'outro' check (kind in ('meditacao', 'respiracao', 'journaling', 'outro')),
  duration_minutes int not null check (duration_minutes > 0),
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index mindfulness_sessions_user_date_idx on public.mindfulness_sessions (user_id, session_date);

alter table public.mindfulness_sessions enable row level security;

create policy "mindfulness_sessions: acesso aos próprios dados"
  on public.mindfulness_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- RELAÇÕES
-- ============================================================

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  relationship text,
  -- ano pode ser fictício se ela não quiser informar; só dia/mês importam pro cálculo de aniversário.
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.relationship_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  title text not null,
  reminder_date date not null,
  notification_id text,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index people_user_idx on public.people (user_id);
create index relationship_reminders_user_idx on public.relationship_reminders (user_id);

alter table public.people enable row level security;
alter table public.relationship_reminders enable row level security;

create policy "people: acesso aos próprios dados"
  on public.people for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "relationship_reminders: acesso aos próprios dados"
  on public.relationship_reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PET
-- ============================================================

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  species text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pet_care_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  kind text not null default 'outro' check (kind in ('vacina', 'consulta', 'vermifugo', 'banho_tosa', 'outro')),
  scheduled_at timestamptz not null,
  -- minutos de antecedência do lembrete (ex: 60 = 1h antes, 1440 = 1 dia antes); null = sem lembrete.
  reminder_offset_minutes int,
  notes text,
  completed_at timestamptz,
  notification_id text,
  created_at timestamptz not null default now()
);

create index pets_user_idx on public.pets (user_id);
create index pet_care_events_pet_scheduled_idx on public.pet_care_events (pet_id, scheduled_at);

alter table public.pets enable row level security;
alter table public.pet_care_events enable row level security;

create policy "pets: acesso aos próprios dados"
  on public.pets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pet_care_events: acesso aos próprios dados"
  on public.pet_care_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- DETOX
-- ============================================================

-- hábito que a pessoa quer reduzir, eliminar ou só monitorar (ex: cigarro, tela à noite).
create table public.detox_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target text not null default 'reduzir' check (target in ('reduzir', 'eliminar', 'monitorar')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- cada ocorrência é um registro (+1) — sem meta numérica fabricada, só a contagem real por dia.
create table public.detox_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.detox_habits (id) on delete cascade,
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index detox_habits_user_idx on public.detox_habits (user_id);
create index detox_logs_habit_date_idx on public.detox_logs (habit_id, log_date);

alter table public.detox_habits enable row level security;
alter table public.detox_logs enable row level security;

create policy "detox_habits: acesso aos próprios dados"
  on public.detox_habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "detox_logs: acesso aos próprios dados"
  on public.detox_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
