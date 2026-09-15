-- Lançamento fixo genérico fora do cartão — mesma ideia de "lança sozinho" dos
-- lançamentos fixos de cartão (0026_credit_card_recurring_charges.sql), mas pra débito
-- automático de conta (despesa) ou receita recorrente fora da renda fixa (receita).
-- Sem conceito de ciclo de fatura aqui — contas não têm fechamento — então a checagem de
-- "já gerou este mês?" é por mês calendário: `recurring_period` é sempre o dia 1 do mês
-- (mesma convenção de `budget_categories.month`), não um intervalo de datas.
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  -- Opcional: débito/receita pode não estar ligado a nenhuma conta específica, mesmo
  -- comportamento de `transactions.account_id`.
  account_id uuid references public.financial_accounts (id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'Outros',
  day_of_month smallint not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column recurring_transaction_id uuid references public.recurring_transactions (id) on delete set null,
  add column recurring_period date;

-- Mesmo travamento anti-duplicação de 0026, agora por (item, mês) em vez de (item, ciclo).
create unique index transactions_recurring_transaction_period_uidx
  on public.transactions (recurring_transaction_id, recurring_period)
  where recurring_transaction_id is not null;

create index recurring_transactions_user_idx on public.recurring_transactions (user_id);

alter table public.recurring_transactions enable row level security;
create policy "recurring_transactions: acesso aos próprios dados"
  on public.recurring_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
