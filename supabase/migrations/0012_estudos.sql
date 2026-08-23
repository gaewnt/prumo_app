-- Prumo — módulo Estudos: matérias (com horário de aula), sessões de estudo e
-- tarefas/atividades com prazo e lembrete.
-- Inspirado nos prints que ela mandou (Evernote, TickTick, apps de plano/ciclo de estudo pra
-- concurso/vestibular, PomodoroTimer&Tasks, Agenda do Estudante) mais o pedido explícito dela
-- de horário de aula por matéria (pra quem é universitário) e lembrete de entrega. Substitui
-- a lista genérica (`simple_module_items`) por tabelas próprias — "matéria" deixa de ser um
-- texto livre de grupo e passa a ser uma entidade de verdade, o que permite tempo estudado
-- por matéria de forma confiável (donut/gráfico) e horário de aula ligado a ela.

-- ============================================================
-- subjects — matérias
-- ============================================================
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color_key text not null default 'chart1' check (color_key in ('chart1', 'chart2', 'chart3', 'chart4', 'chart5')),
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "subjects: acesso aos próprios dados"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index subjects_user_idx on public.subjects (user_id);

-- ============================================================
-- subject_schedules — horário de aula de cada matéria (pra quem é universitário)
-- ============================================================
create table public.subject_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time text not null,
  end_time text,
  location text,
  reminder_minutes_before int,
  notification_id text,
  created_at timestamptz not null default now()
);

alter table public.subject_schedules enable row level security;

create policy "subject_schedules: acesso aos próprios dados"
  on public.subject_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index subject_schedules_user_idx on public.subject_schedules (user_id);
create index subject_schedules_subject_idx on public.subject_schedules (subject_id);

-- ============================================================
-- study_sessions — sessões de estudo registradas (tempo por matéria)
-- ============================================================
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  duration_minutes integer not null check (duration_minutes > 0),
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create policy "study_sessions: acesso aos próprios dados"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index study_sessions_user_date_idx on public.study_sessions (user_id, session_date);

-- ============================================================
-- study_tasks — tarefas e provas com prazo (matéria é opcional)
-- ============================================================
create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  due_date date,
  notes text,
  done boolean not null default false,
  -- Lembrete é relativo ao prazo (dias antes), disparado sempre às 9h — só faz sentido
  -- quando `due_date` está preenchido; ver `REMINDER_DAYS_OPTIONS` em lib/estudos.ts.
  reminder_days_before int,
  notification_id text,
  created_at timestamptz not null default now()
);

alter table public.study_tasks enable row level security;

create policy "study_tasks: acesso aos próprios dados"
  on public.study_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index study_tasks_user_idx on public.study_tasks (user_id);
