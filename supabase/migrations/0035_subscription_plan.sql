alter table public.profiles
  add column plan text not null default 'free' check (plan in ('free', 'plus'));

-- Quem já tinha conta antes do freemium entrar continua com acesso a tudo — ninguém perde
-- módulo nenhum por causa dessa mudança. Só cadastro novo a partir de agora começa no
-- plano gratuito (é o `default 'free'` da coluna, que vale pra linha nova que o gatilho
-- `handle_new_user` cria).
update public.profiles set plan = 'plus';
