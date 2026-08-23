-- Data em que um livro foi concluído — precisa pra "livros lidos esse ano" (a meta do
-- onboarding vira progresso de verdade) sem depender de inferir pela data do último log.
alter table public.books add column if not exists finished_at timestamptz;

-- Citações salvas por livro, no estilo do Seeds — texto simples, sem digitalização de foto
-- por enquanto.
create table if not exists public.book_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.book_quotes enable row level security;

drop policy if exists "book_quotes: acesso aos próprios dados" on public.book_quotes;
create policy "book_quotes: acesso aos próprios dados"
  on public.book_quotes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists book_quotes_book_idx on public.book_quotes (book_id);
