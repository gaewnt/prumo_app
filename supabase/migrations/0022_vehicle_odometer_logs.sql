-- "km do dia" — jeito simples de registrar o km do painel de
-- vez em quando (sem precisar lançar todo dia). Se a pessoa esquecer, a diferença é distribuída:
-- um registro de 400 km no dia 1 e 800 km no dia 7 distribui os 400km rodados pela
-- quantidade de dias sem marcação entre eles. A distribuição em si é calculada em
-- código (`distributeOdometerLogs` em lib/veiculo.ts) a partir das leituras brutas guardadas
-- aqui — a tabela só guarda o que a pessoa realmente digitou, nunca um valor inventado.
create table public.vehicle_odometer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  data date not null default current_date,
  km_atual numeric(10, 1) not null,
  created_at timestamptz not null default now()
);

create index vehicle_odometer_logs_vehicle_data_idx on public.vehicle_odometer_logs (vehicle_id, data);
create index vehicle_odometer_logs_user_id_idx on public.vehicle_odometer_logs (user_id);

alter table public.vehicle_odometer_logs enable row level security;

create policy "vehicle_odometer_logs_select_own" on public.vehicle_odometer_logs for select using (auth.uid() = user_id);
create policy "vehicle_odometer_logs_insert_own" on public.vehicle_odometer_logs for insert with check (auth.uid() = user_id);
create policy "vehicle_odometer_logs_update_own" on public.vehicle_odometer_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicle_odometer_logs_delete_own" on public.vehicle_odometer_logs for delete using (auth.uid() = user_id);
