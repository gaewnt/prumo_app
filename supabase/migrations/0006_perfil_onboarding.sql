-- Prumo — perfil pessoal + onboarding de personalização
-- Adiciona gênero, data de nascimento e o marcador de onboarding concluído ao
-- perfil, e uma tabela genérica `module_preferences` que guarda as respostas
-- do questionário inicial por módulo (frequência de treino, renda fixa,
-- hábitos que a pessoa quer acompanhar etc). Cada módulo é sempre visível —
-- `module_preferences` só decide o que fica "personalizado" com dado real.

-- ============================================================
-- profiles — gênero, nascimento, conclusão do onboarding
-- ============================================================
alter table public.profiles
  add column gender text check (gender is null or gender in ('feminino', 'masculino')),
  add column birth_date date,
  add column onboarding_completed_at timestamptz;

-- ============================================================
-- module_preferences — respostas do questionário inicial, por módulo
-- ============================================================
create table public.module_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_slug text not null,
  answers jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_slug)
);

create trigger set_module_preferences_updated_at
  before update on public.module_preferences
  for each row execute function public.set_updated_at();

create index module_preferences_user_idx
  on public.module_preferences (user_id);

alter table public.module_preferences enable row level security;

create policy "module_preferences: acesso aos próprios dados"
  on public.module_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
