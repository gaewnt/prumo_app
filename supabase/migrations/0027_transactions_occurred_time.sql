-- Hora do lançamento (opcional) — até agora `transactions.occurred_at` só guardava a
-- data (YYYY-MM-DD). Coluna nova e independente em vez de virar timestamp, pra não mexer
-- em nenhuma das comparações de string por data já feitas em lib/financas.ts (intervalo de
-- mês, ordenação, agrupamento). Formato "HH:MM", NULL quando a pessoa não informar.
alter table public.transactions
  add column occurred_time text;

alter table public.transactions
  add constraint transactions_occurred_time_format
  check (occurred_time is null or occurred_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
