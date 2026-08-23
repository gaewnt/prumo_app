-- Prumo — guarda o valor realmente pago de uma conta (pode diferir do valor
-- previsto por causa de multa/juros de atraso). NULL enquanto a conta não foi paga.
alter table public.bills
  add column paid_amount numeric(12, 2);
