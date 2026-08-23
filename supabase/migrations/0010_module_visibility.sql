-- Prumo — módulos ocultáveis
-- Reaproveita `module_preferences` (já é 1 linha por usuário+módulo) pra guardar também
-- se a pessoa escondeu aquele módulo da lista principal. Continua sem apagar dado nenhum:
-- só decide o que aparece na Home, igual `skipped` já decide o que é "personalizado".

alter table public.module_preferences
  add column hidden boolean not null default false;
