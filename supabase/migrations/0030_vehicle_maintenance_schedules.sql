-- Manutenção agendada do Veículo — antes só existia manutenção JÁ REALIZADA
-- (vehicle_maintenance_logs.realizado_em, sempre passado). Isso cobre a próxima manutenção
-- prevista, por data e/ou por km, no mesmo padrão de lembrete configurável já usado em
-- career_deadlines/beauty_products/relationship_reminders.
create table public.vehicle_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  tipo text not null check (tipo in ('troca_oleo', 'pneus', 'freios', 'revisao', 'bateria', 'suspensao', 'outro')),
  descricao text,
  -- Pelo menos um dos dois precisa estar preenchido — por data (com lembrete opcional,
  -- disparado às 9h) e/ou por km (comparado direto com `vehicles.km_atual`, o mesmo campo
  -- manual já usado no resto do módulo — sem estimativa nova nenhuma, já que não existe uma
  -- leitura confiável de "km de hoje" no app).
  due_date date,
  due_km numeric(10, 1),
  reminder_days_before int,
  notification_id text,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  constraint vehicle_maintenance_schedules_due_check check (due_date is not null or due_km is not null)
);

create index vehicle_maintenance_schedules_vehicle_idx on public.vehicle_maintenance_schedules (vehicle_id);

alter table public.vehicle_maintenance_schedules enable row level security;
create policy "vehicle_maintenance_schedules: acesso aos próprios dados"
  on public.vehicle_maintenance_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
