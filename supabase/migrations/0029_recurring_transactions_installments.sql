-- Parcelas restantes em lançamento fixo genérico (0028) — cobre financiamento/parcelamento
-- que tem fim (ex: 24x), diferente de assinatura/aluguel que não tem data pra acabar.
-- `null` mantém o comportamento de antes (recorrência sem fim definido). Quando preenchido,
-- decrementa a cada ocorrência gerada e desativa sozinho ao chegar em 0 (lógica em
-- `ensureRecurringTransactionsGenerated`, não em trigger — mesmo estilo do resto do projeto,
-- que evita lógica de negócio no banco).
alter table public.recurring_transactions
  add column installments_remaining smallint check (installments_remaining is null or installments_remaining >= 0);
