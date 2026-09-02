-- Prumo — Web Push, parte 2 (agendador)
--
-- ATENÇÃO — esta migration precisa de 2 valores SEUS antes de rodar (procurar/substituir
-- os dois marcadores abaixo, veja onde achar cada um logo em seguida):
--
--   1. COLOQUE_AQUI_SUA_PROJECT_REF
--      → Painel do Supabase → seu projeto → Project Settings → General → "Reference ID"
--        (também aparece na própria URL do painel: https://supabase.com/dashboard/project/AQUI-ESSE-TRECHO)
--
--   2. COLOQUE_AQUI_SUA_SERVICE_ROLE_KEY
--      → Painel do Supabase → seu projeto → Project Settings → API → seção "Project API keys"
--        → chave "service_role" (NÃO é a "anon" — essa é secreta, nunca vai no app, só aqui
--        dentro do banco mesmo).
--
-- O que isso faz: agenda uma tarefa que roda A CADA MINUTO dentro do próprio banco
-- (pg_cron) e, a cada execução, chama a Edge Function `send-web-push` (pg_net faz a
-- chamada HTTP). A função em si decide se tem algum lembrete pra disparar nesse minuto —
-- rodar a cada minuto só "bate na porta" perguntando, é uma chamada barata e rápida. É o
-- mesmo padrão que o próprio Supabase recomenda no guia deles de notificação agendada.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('send-web-push-reminders')
where exists (select 1 from cron.job where jobname = 'send-web-push-reminders');

select cron.schedule(
  'send-web-push-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://COLOQUE_AQUI_SUA_PROJECT_REF.supabase.co/functions/v1/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer COLOQUE_AQUI_SUA_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Pra conferir que ficou agendado certo:
-- select jobid, jobname, schedule, active from cron.job where jobname = 'send-web-push-reminders';
--
-- Pra ver o histórico de execuções (últimas 20) e se deu erro:
-- select * from cron.job_run_details
-- where jobid = (select jobid from cron.job where jobname = 'send-web-push-reminders')
-- order by start_time desc limit 20;
