-- Novo tipo de conta "Benefício" (VR/VA e afins) — cobre o caso de quem recebe
-- VR: não é fatura de cartão (não acumula dívida pra pagar depois), é um saldo que
-- recarrega ~R$300/mês e vai sendo gasto direto, igual uma carteira. Modelado como um
-- `kind` novo em `financial_accounts` (mesmo mecanismo de saldo de "carteira" — sem
-- ciclo de fatura), só pra ficar identificado separado na UI e não confundir com
-- dinheiro de verdade. Extensão aditiva.
alter table public.financial_accounts drop constraint financial_accounts_kind_check;
alter table public.financial_accounts
  add constraint financial_accounts_kind_check
  check (kind in ('carteira', 'conta', 'poupanca', 'investimento', 'beneficio', 'outro'));
