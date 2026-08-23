-- Prumo — módulo Finanças: investimentos. O Core mostra "saldo, investimentos" no
-- dashboard; isso vira uma lista simples de posições (nome + valor atual), sem
-- histórico de aportes/resgates por enquanto — só o suficiente pra somar um
-- "total investido" ao lado do saldo.
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_investments_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

alter table public.investments enable row level security;

create policy "investments: acesso aos próprios dados"
  on public.investments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
