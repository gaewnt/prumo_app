-- Registro de manutenção do veículo, adicionado junto com o
-- abastecimento. Cada manutenção soma no "despesas totais"/
-- "saldo livre" do período em que foi feita (mesmo espírito de `computeVehicleStats`, que
-- já soma custo fixo mensal + combustível gasto no período).
-- Extensão aditiva.
create table public.vehicle_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  tipo text not null check (tipo in ('troca_oleo', 'pneus', 'freios', 'revisao', 'bateria', 'suspensao', 'outro')),
  descricao text,
  valor numeric(10, 2) not null,
  km_atual numeric(10, 1),
  realizado_em date not null default current_date,
  created_at timestamptz not null default now()
);

create index vehicle_maintenance_logs_vehicle_data_idx on public.vehicle_maintenance_logs (vehicle_id, realizado_em desc);
create index vehicle_maintenance_logs_user_id_idx on public.vehicle_maintenance_logs (user_id);

alter table public.vehicle_maintenance_logs enable row level security;

create policy "vehicle_maintenance_logs_select_own" on public.vehicle_maintenance_logs for select using (auth.uid() = user_id);
create policy "vehicle_maintenance_logs_insert_own" on public.vehicle_maintenance_logs for insert with check (auth.uid() = user_id);
create policy "vehicle_maintenance_logs_update_own" on public.vehicle_maintenance_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicle_maintenance_logs_delete_own" on public.vehicle_maintenance_logs for delete using (auth.uid() = user_id);
