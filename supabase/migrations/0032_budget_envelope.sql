-- Orçamento por envelope — opcional, por categoria: em vez de resetar todo mês, o que
-- sobra (ou falta) de uma categoria marcada como envelope fica reservado e entra na conta
-- do mês seguinte (ver `computeEnvelopeBalances` em lib/financas.ts, que deriva o saldo
-- acumulado a partir do histórico de `budget_categories` + despesas — nada é somado/gravado
-- aqui, só a marcação de "essa categoria é um envelope" fica salva por mês).
alter table public.budget_categories
  add column is_envelope boolean not null default false;
