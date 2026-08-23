-- Prumo — schema inicial (Fase 0 / Fase 1)
-- Núcleo (profiles, module_events, ai_insights, user_modules) +
-- tabelas dos 6 módulos já mapeados: rotina, finanças, treino, dieta,
-- biblioteca, dev. pessoal. Os outros 10 módulos entram em migrations
-- futuras, quando forem especificados (ver Prumo.md).

-- ============================================================
-- Extensões
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Helper: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles — um registro por pessoa usuária, espelhando auth.users
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme_preference text not null default 'system' check (theme_preference in ('system', 'light', 'dark')),
  notification_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- user_modules — quais dos 16 módulos estão ativos e em que ordem
-- ============================================================
create table public.user_modules (
  user_id uuid not null references auth.users (id) on delete cascade,
  module_slug text not null,
  enabled boolean not null default true,
  position int not null default 0,
  primary key (user_id, module_slug)
);

-- Cria o profile (e os módulos padrão) automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));

  insert into public.user_modules (user_id, module_slug, enabled, position)
  select new.id, slug, true, ordinality
  from unnest(array[
    'financas', 'rotina', 'treino', 'dieta', 'biblioteca', 'dev-pessoal',
    'saude', 'casa', 'estudos', 'beleza', 'viagens', 'carreira',
    'mente', 'relacoes', 'pet', 'detox'
  ]) with ordinality as t(slug, ordinality);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- module_events — camada compartilhada que permite cruzar dados
-- entre módulos (é o que alimenta a IA e as pendências da home)
-- ============================================================
create table public.module_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_slug text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index module_events_user_occurred_idx
  on public.module_events (user_id, occurred_at desc);

-- ============================================================
-- ai_insights — cache dos insights gerados pela Edge Function de IA
-- ============================================================
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  source_modules text[] not null default '{}',
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index ai_insights_user_generated_idx
  on public.ai_insights (user_id, generated_at desc);

-- ============================================================
-- Rotina — hábitos
-- ============================================================
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  active_days smallint[] not null default '{0,1,2,3,4,5,6}', -- 0=domingo … 6=sábado
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- ============================================================
-- Finanças
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  description text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  recurring boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Treino
-- ============================================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sets int not null,
  reps int not null,
  load_label text, -- texto livre: "22 kilos", "7 placas" etc, como no Core
  position int not null default 0
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  completed_exercise_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (workout_id, log_date)
);

-- ============================================================
-- Dieta
-- ============================================================
create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  meal_type text not null, -- 'cafe_da_manha' | 'almoco' | 'lanche' | 'janta' | custom
  description text not null,
  position int not null default 0
);

-- ============================================================
-- Biblioteca
-- ============================================================
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text,
  total_pages int not null check (total_pages > 0),
  current_page int not null default 0 check (current_page >= 0),
  status text not null default 'reading' check (status in ('reading', 'finished', 'wishlist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  pages_read int not null check (pages_read > 0),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Dev. Pessoal
-- ============================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  mood_score smallint check (mood_score between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.motivations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Humor (compartilhado entre Dev. Pessoal e a IA cruzada)
-- ============================================================
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  score smallint not null check (score between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ============================================================
-- Row Level Security — cada pessoa só acessa os próprios dados
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_modules enable row level security;
alter table public.module_events enable row level security;
alter table public.ai_insights enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.books enable row level security;
alter table public.reading_logs enable row level security;
alter table public.goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.motivations enable row level security;
alter table public.mood_logs enable row level security;

-- profiles: só a própria pessoa lê/edita o próprio perfil (linha por id, não user_id)
create policy "profiles: acesso ao próprio perfil"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Todas as demais tabelas seguem o mesmo padrão: auth.uid() = user_id.
-- (Repetido tabela a tabela porque o Postgres não tem "apply to all".)
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_modules', 'module_events', 'ai_insights',
    'habits', 'habit_logs',
    'transactions', 'bills',
    'workouts', 'exercises', 'workout_logs',
    'meal_plan_items',
    'books', 'reading_logs',
    'goals', 'journal_entries', 'motivations',
    'mood_logs'
  ]
  loop
    execute format(
      'create policy "%1$s: acesso aos próprios dados" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;
