create table public.health_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pressao', 'glicemia')),
  measured_at timestamptz not null default now(),
  systolic smallint,
  diastolic smallint,
  pulse smallint,
  glucose_mg_dl smallint,
  glucose_context text check (glucose_context in ('jejum', 'pos_prandial', 'aleatoria')),
  notes text,
  created_at timestamptz not null default now(),
  constraint health_measurements_pressao_check check (
    kind <> 'pressao' or (systolic is not null and diastolic is not null)
  ),
  constraint health_measurements_glicemia_check check (
    kind <> 'glicemia' or glucose_mg_dl is not null
  )
);

create index health_measurements_user_kind_idx on public.health_measurements (user_id, kind, measured_at desc);

alter table public.health_measurements enable row level security;

create policy "health_measurements: acesso aos próprios dados"
  on public.health_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
