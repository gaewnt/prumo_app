-- Lançamentos fixos (assinaturas, mensalidades) no cartão de crédito. Uma vez cadastrado,
-- o app lança a despesa sozinho em cada fatura aberta (ver `ensureCardRecurringChargesGenerated`
-- em lib/financas.ts) — sem precisar redigitar todo mês.
create table public.credit_card_recurring_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.credit_cards (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'Outros',
  day_of_month smallint not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Liga um lançamento gerado automaticamente ao lançamento fixo que o originou, e guarda
-- em qual ciclo (fatura) ele foi gerado — é o que permite checar "essa fatura já tem o
-- lançamento desse mês?" sem depender só da data exata (o dia configurado pode cair fora
-- do ciclo em alguns meses, aí é ajustado pro ciclo mesmo assim).
alter table public.transactions
  add column recurring_charge_id uuid references public.credit_card_recurring_charges (id) on delete set null,
  add column recurring_cycle_end date;

-- Trava contra gerar a mesma ocorrência duas vezes no mesmo ciclo (ex: app aberto em dois
-- aparelhos ao mesmo tempo) — mesmo espírito do unique (card_id, cycle_end) de
-- credit_card_payments.
create unique index transactions_recurring_charge_cycle_uidx
  on public.transactions (recurring_charge_id, recurring_cycle_end)
  where recurring_charge_id is not null;

-- Fatura: guarda também o valor previsto (o total calculado das compras do ciclo) separado
-- do valor realmente pago — antes o pagamento sempre usava o total calculado sem poder
-- editar; agora dá pra ajustar (ex: cobrança de anuidade que ainda não tinha caído no
-- extrato) e ainda mostrar a diferença, mesmo padrão de bills.amount x bills.paid_amount.
alter table public.credit_card_payments
  add column expected_amount numeric(12, 2);

create index credit_card_recurring_charges_card_idx on public.credit_card_recurring_charges (card_id);

alter table public.credit_card_recurring_charges enable row level security;

create policy "credit_card_recurring_charges: acesso aos próprios dados"
  on public.credit_card_recurring_charges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
