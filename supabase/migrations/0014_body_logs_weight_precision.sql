-- Amplia a precisão de body_logs.weight_kg: numeric(5,1) só guardava 1 casa decimal
-- (100g), truncando registros como "55.32" (55kg e 320g) pra "55.3". numeric(6,3)
-- guarda até 3 casas decimais (gramas) mantendo a mesma faixa de valores (até 999,999).
alter table body_logs
  alter column weight_kg type numeric(6, 3);
