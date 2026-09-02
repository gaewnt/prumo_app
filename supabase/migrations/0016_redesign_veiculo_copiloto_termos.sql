-- Redesign do módulo Veículo (+ Copiloto) e aceite de termos/privacidade.
-- Extensão aditiva e retrocompatível — nenhuma coluna/tabela existente é alterada
-- de forma destrutiva.

-- ============================================================
-- profiles — foto de perfil e registro do aceite dos termos
-- ============================================================
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists legal_version text;

-- ============================================================
-- vehicles — cadastro do veículo de trabalho (um ativo por vez, mas
-- modelado como tabela pra permitir histórico/múltiplos veículos depois)
-- ============================================================
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ativo boolean not null default true,
  tipo text not null default 'carro' check (tipo in ('carro', 'moto')),
  marca text,
  modelo text,
  ano int,
  situacao text check (situacao in ('proprio', 'financiado', 'alugado_semana', 'alugado_mes', 'outro')),
  combustivel text check (combustivel in ('flex', 'gasolina', 'etanol', 'gnv', 'diesel', 'eletrico', 'hibrido')),
  consumo_medio numeric(8, 2), -- km/l, opcional
  km_atual numeric(10, 1),
  -- custos usados no cálculo de custo por km/hora
  km_rodados_mes numeric(10, 1),
  preco_combustivel numeric(8, 2),
  financiamento_parcela numeric(10, 2),
  financiamento_vencimento_dia int check (financiamento_vencimento_dia between 1 and 31),
  financiamento_parcelas_restantes int,
  seguro_mensal numeric(10, 2),
  valor_veiculo numeric(12, 2),
  ipva_anual numeric(10, 2),
  -- meta financeira opcional, usada pra calcular a barra de progresso do módulo
  custos_pessoais_mes numeric(10, 2),
  lucro_desejado_mes numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create index vehicles_user_id_idx on public.vehicles (user_id);
create index vehicles_user_ativo_idx on public.vehicles (user_id, ativo) where ativo;

alter table public.vehicles enable row level security;

create policy "vehicles_select_own" on public.vehicles for select using (auth.uid() = user_id);
create policy "vehicles_insert_own" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "vehicles_update_own" on public.vehicles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicles_delete_own" on public.vehicles for delete using (auth.uid() = user_id);

-- ============================================================
-- vehicle_rides — cada corrida/entrega registrada (manual ou via Copiloto)
-- ============================================================
create table public.vehicle_rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  app_origem text check (app_origem in ('uber', '99', 'indrive', 'ifood', 'mtentregas', 'manual')),
  origem_deteccao text not null default 'manual' check (origem_deteccao in ('auto', 'manual')),
  valor numeric(10, 2) not null,
  distancia_km numeric(8, 2),
  duracao_min numeric(8, 1),
  horas_trabalhadas numeric(6, 2), -- pra lançamentos manuais de "jornada do dia" sem corrida individual
  km_rodados numeric(8, 1),
  ocorrido_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index vehicle_rides_user_id_idx on public.vehicle_rides (user_id);
create index vehicle_rides_user_ocorrido_idx on public.vehicle_rides (user_id, ocorrido_em desc);

alter table public.vehicle_rides enable row level security;

create policy "vehicle_rides_select_own" on public.vehicle_rides for select using (auth.uid() = user_id);
create policy "vehicle_rides_insert_own" on public.vehicle_rides for insert with check (auth.uid() = user_id);
create policy "vehicle_rides_update_own" on public.vehicle_rides for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicle_rides_delete_own" on public.vehicle_rides for delete using (auth.uid() = user_id);
