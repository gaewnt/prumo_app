-- Frequências de remédio além de "todo dia" — a cada 7/15 dias, mensal, trimestral,
-- semestral (ex: injeção quinzenal, anticoncepcional trimestral, exame semestral).
-- Reaproveita a tabela `medications` já existente: remédios diários continuam exatamente
-- como antes (frequency_kind = 'diaria', o padrão), só usando `times`/`active_days`. Os
-- campos novos só valem pras frequências não diárias, que passam a ter uma ÚNICA próxima
-- data prevista em vez de um checklist de horários por dia da semana.
alter table public.medications
  add column frequency_kind text not null default 'diaria'
    check (frequency_kind in ('diaria', 'dias', 'mensal', 'trimestral', 'semestral')),
  add column frequency_interval_days smallint,
  add column next_dose_date date;
