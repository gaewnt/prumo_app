-- Integração Veículo/Copiloto ↔ Finanças — corridas viram
-- receita e abastecimento/manutenção viram despesa automaticamente em Finanças, em vez de
-- ficarem só dentro do módulo Veículo.
--
-- `finance_transaction_id` guarda o vínculo com a linha criada em `transactions`, pra poder
-- atualizar/excluir esse lançamento quando a corrida/abastecimento/manutenção de origem for
-- editada ou excluída — sem isso, editar uma corrida deixaria um lançamento desatualizado
-- "solto" em Finanças.
--
-- `valor_liquido` em `vehicle_rides` é o valor REAL recebido pela corrida, quando diferente
-- do valor bruto — cobre o caso de plataformas que cobram taxa de saque e
-- impostos. Quando preenchido, é ele (não o valor bruto) que vira a receita em Finanças; o
-- valor bruto continua sendo o usado nos indicadores de R$/km e R$/hora do Copiloto (esses
-- servem pra decidir se vale aceitar a corrida, e o app cobra o valor bruto por ela).
alter table public.vehicle_rides
  add column if not exists finance_transaction_id uuid references public.transactions (id) on delete set null,
  add column if not exists valor_liquido numeric(10, 2);

alter table public.vehicle_fuel_logs
  add column if not exists finance_transaction_id uuid references public.transactions (id) on delete set null;

alter table public.vehicle_maintenance_logs
  add column if not exists finance_transaction_id uuid references public.transactions (id) on delete set null;
