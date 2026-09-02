-- Prumo — Web Push (lembretes funcionando na versão site)
--
-- `expo-notifications` (usado hoje pros lembretes) não tem NENHUM suporte a navegador —
-- só Android/iOS nativos. Pra um lembrete disparar de verdade no site (Netlify), o
-- caminho é Web Push de verdade: o navegador guarda uma "inscrição" (endpoint + chaves
-- de criptografia) nesta tabela, e um agendador do lado do servidor (ver migration
-- seguinte, 0025) manda a notificação na hora certa através dela.
--
-- Cada dispositivo/navegador em que a pessoa ativa o lembrete gera sua própria inscrição
-- (por isso não é 1 por usuário, é 1 por navegador — ela pode ter ativado no notebook e
-- no celular Android, por exemplo, e os dois recebem).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: acesso aos próprios dados"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
