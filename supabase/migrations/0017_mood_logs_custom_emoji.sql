-- Humor com emoji escolhido livremente pelo usuário direto do teclado, em vez de
-- uma lista fixa de opções.
--
-- Mantém `score` (1-5, obrigatório) intacto: é o campo usado pra colorir o calendário e
-- pra Fase 2 de IA cruzada (correlação humor x outros módulos) — não dá pra inferir uma
-- pontuação confiável a partir de um emoji livre qualquer. `emoji` é só um adicional
-- opcional: quando preenchido, é o glifo mostrado no lugar do emoji padrão da faixa
-- 1..5 (`MOOD_EMOJI`); quando `null`, a UI cai de volta pro emoji padrão do score.
-- Extensão aditiva — não altera nem remove nada existente.
alter table public.mood_logs
  add column if not exists emoji text;
