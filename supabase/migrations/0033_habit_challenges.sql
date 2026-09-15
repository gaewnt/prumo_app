-- Desafios prontos de N dias (Rotina) — programas pré-montados com conteúdo curado (a
-- lista em si, `CHALLENGE_PROGRAMS`, vive só no app, mesma linha das `QUICK_TECHNIQUES` do
-- Mente: referência fixa, sem IA/personalização nenhuma). Aqui só fica o que É dado da
-- pessoa: quando ela começou um programa e quais dias marcou como feitos.
create table public.habit_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Chave estática de `CHALLENGE_PROGRAMS` em lib/rotina.ts (ex: "agua-30") — não é FK pra
  -- tabela nenhuma porque o conteúdo do programa não muda por pessoa nem precisa de
  -- histórico próprio, é só uma referência fixa dentro do app.
  program_id text not null,
  started_at date not null,
  completed_at date,
  abandoned_at date,
  created_at timestamptz not null default now()
);

create table public.habit_challenge_logs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.habit_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (challenge_id, log_date)
);

create index habit_challenges_user_idx on public.habit_challenges (user_id);
create index habit_challenge_logs_challenge_idx on public.habit_challenge_logs (challenge_id);

alter table public.habit_challenges enable row level security;
create policy "habit_challenges: acesso aos próprios dados"
  on public.habit_challenges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.habit_challenge_logs enable row level security;
create policy "habit_challenge_logs: acesso aos próprios dados"
  on public.habit_challenge_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
