-- Saúde deixa de ser um módulo de lista genérica (simple_module_items) e ganha schema
-- próprio: remédios com horário (+ registro de doses tomadas, pra medir adesão sem
-- inventar nada que não foi de fato marcado) e compromissos (consultas/terapias/exames)
-- com lembrete configurável.

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dosage text,
  -- horários no formato "HH:MM", um por lembrete/dia (ex: ['08:00', '20:00']).
  times text[] not null default '{}',
  -- dias da semana em que o remédio é tomado, mesma convenção 0=domingo…6=sábado do resto do app.
  active_days int[] not null default '{0,1,2,3,4,5,6}',
  notes text,
  active boolean not null default true,
  -- guarda o id da notificação local agendada por horário, pra dar pra cancelar/reagendar
  -- quando o remédio é editado ou pausado: { "08:00": "<notification-id>", ... }.
  notification_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_medications_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  log_date date not null default current_date,
  scheduled_time text not null,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (medication_id, log_date, scheduled_time)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null default 'consulta' check (kind in ('consulta', 'terapia', 'exame', 'outro')),
  professional text,
  scheduled_at timestamptz not null,
  -- minutos de antecedência do lembrete (ex: 60 = 1h antes, 1440 = 1 dia antes); null = sem lembrete.
  reminder_offset_minutes int,
  notes text,
  completed_at timestamptz,
  notification_id text,
  created_at timestamptz not null default now()
);

create index medications_user_idx on public.medications (user_id, active);
create index medication_logs_user_date_idx on public.medication_logs (user_id, log_date);
create index appointments_user_scheduled_idx on public.appointments (user_id, scheduled_at);

alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.appointments enable row level security;

create policy "medications: acesso aos próprios dados"
  on public.medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "medication_logs: acesso aos próprios dados"
  on public.medication_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "appointments: acesso aos próprios dados"
  on public.appointments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
