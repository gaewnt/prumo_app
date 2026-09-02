-- Prumo — Finanças fica com um modelo bem mais completo: contas (carteira, banco,
-- poupança...), cartão de crédito com fatura por ciclo, tags, planejamento mensal por
-- categoria e metas financeiras. Pedido dela depois de ver o Mobills como referência.
--
-- Decisão importante: NENHUMA leitura automática de notificação de outros apps (o
-- Mobills tem isso pra detectar transação sozinho) — ela pediu explicitamente pra manter
-- só o lançamento manual/por voz que o Prumo já tem, sem esse tipo de automação.
--
-- Todos os campos novos em `transactions` são OPCIONAIS: um lançamento sem conta/cartão
-- continua funcionando exatamente como antes (conta pro resumo geral do mês), então
-- todo o histórico anterior a esta migration não quebra nem precisa de backfill.

-- ============================================================
-- Contas (carteira, conta corrente, poupança, investimento...)
-- ============================================================
-- O saldo não fica guardado aqui — é sempre calculado a partir de `initial_balance` +
-- as transações que apontam pra essa conta. Isso evita saldo "desalinhado" se uma
-- transação for editada ou excluída depois.
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'conta' check (kind in ('carteira', 'conta', 'poupanca', 'investimento', 'outro')),
  initial_balance numeric(12, 2) not null default 0,
  color_key text not null default 'chart1',
  archived boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Cartão de crédito
-- ============================================================
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  card_limit numeric(12, 2),
  closing_day smallint not null check (closing_day between 1 and 28),
  due_day smallint not null check (due_day between 1 and 28),
  color_key text not null default 'chart2',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Registra o pagamento de uma fatura fechada (um ciclo inteiro) — evita pagar a mesma
-- fatura duas vezes e mantém histórico de faturas fechadas/pagas.
create table public.credit_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.credit_cards (id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_from_account_id uuid references public.financial_accounts (id) on delete set null,
  paid_at timestamptz not null default now(),
  unique (card_id, cycle_end)
);

-- ============================================================
-- Tags (marcação livre além da categoria — ex: "reembolsável", "viagem SP")
-- ============================================================
create table public.financial_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color_key text not null default 'chart3',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.financial_tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);

-- ============================================================
-- Planejamento mensal (orçamento por categoria)
-- ============================================================
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null, -- sempre o dia 1 do mês em questão (ex: 2026-08-01)
  category text not null,
  planned_amount numeric(12, 2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month, category)
);

-- ============================================================
-- Metas financeiras (tabela própria — a `goals` genérica já existe pro Dev. Pessoal
-- e não tem campo de valor, então não dá pra reaproveitar aqui)
-- ============================================================
create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Transações: ligação opcional com conta/cartão + novo kind "transfer"
-- ============================================================
alter table public.transactions
  add column account_id uuid references public.financial_accounts (id) on delete set null,
  add column card_id uuid references public.credit_cards (id) on delete set null,
  add column transfer_to_account_id uuid references public.financial_accounts (id) on delete set null;

alter table public.transactions drop constraint transactions_kind_check;
alter table public.transactions
  add constraint transactions_kind_check check (kind in ('income', 'expense', 'transfer'));

-- ============================================================
-- Índices
-- ============================================================
create index financial_accounts_user_idx on public.financial_accounts (user_id);
create index credit_cards_user_idx on public.credit_cards (user_id);
create index credit_card_payments_card_idx on public.credit_card_payments (card_id);
create index financial_tags_user_idx on public.financial_tags (user_id);
create index transaction_tags_tag_idx on public.transaction_tags (tag_id);
create index budget_categories_user_month_idx on public.budget_categories (user_id, month);
create index financial_goals_user_idx on public.financial_goals (user_id);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_card_idx on public.transactions (card_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.financial_accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_payments enable row level security;
alter table public.financial_tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budget_categories enable row level security;
alter table public.financial_goals enable row level security;

create policy "financial_accounts: acesso aos próprios dados"
  on public.financial_accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "credit_cards: acesso aos próprios dados"
  on public.credit_cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "credit_card_payments: acesso aos próprios dados"
  on public.credit_card_payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "financial_tags: acesso aos próprios dados"
  on public.financial_tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budget_categories: acesso aos próprios dados"
  on public.budget_categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "financial_goals: acesso aos próprios dados"
  on public.financial_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transaction_tags não tem user_id próprio — a posse é herdada da transação ligada.
create policy "transaction_tags: acesso via transação"
  on public.transaction_tags for all
  using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()));
