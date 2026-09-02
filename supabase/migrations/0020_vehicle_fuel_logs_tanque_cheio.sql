-- Às vezes a pessoa só coloca uma parte do tanque (ex: R$50), e nesse
-- caso o cálculo de consumo real da 0019 fica errado — ele assumia que TODO abastecimento
-- enche o tanque. Adiciona uma chave "tanque cheio" por lançamento; o consumo real só é
-- calculado entre dois abastecimentos com tanque cheio, somando os litros de todos os
-- parciais no meio (é assim que apps de consumo tipo o Fuelio fazem essa conta).
-- Extensão aditiva — default `true` preserva o comportamento anterior pra quem já lançou
-- abastecimento antes dessa coluna existir (a 0019 só rodou pouco antes desta).
alter table public.vehicle_fuel_logs
  add column if not exists tanque_cheio boolean not null default true;
