-- Controle de abastecimentos do veículo, nos moldes do
-- Fuelio: a cada abastecimento registra km atual + litros + valor total gasto, e o app
-- calcula sozinho o consumo real (km/l) comparando com o abastecimento anterior, em vez
-- de depender só do "consumo médio" digitado à mão no cadastro do veículo.
-- Extensão aditiva — nenhuma tabela/coluna existente é alterada.
create table public.vehicle_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  abastecido_em date not null default current_date,
  km_atual numeric(10, 1) not null,
  litros numeric(8, 2) not null,
  valor_total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

-- Consumo real é calculado comparando cada abastecimento com o anterior do MESMO veículo,
-- ordenado por km_atual — esse índice cobre a query de listagem/cálculo.
create index vehicle_fuel_logs_vehicle_km_idx on public.vehicle_fuel_logs (vehicle_id, km_atual);
create index vehicle_fuel_logs_user_id_idx on public.vehicle_fuel_logs (user_id);

alter table public.vehicle_fuel_logs enable row level security;

create policy "vehicle_fuel_logs_select_own" on public.vehicle_fuel_logs for select using (auth.uid() = user_id);
create policy "vehicle_fuel_logs_insert_own" on public.vehicle_fuel_logs for insert with check (auth.uid() = user_id);
create policy "vehicle_fuel_logs_update_own" on public.vehicle_fuel_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicle_fuel_logs_delete_own" on public.vehicle_fuel_logs for delete using (auth.uid() = user_id);
