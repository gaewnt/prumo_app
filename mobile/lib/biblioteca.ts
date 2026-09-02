import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";
import { fetchModulePreference } from "@/lib/onboarding";

/**
 * Camada de dados do módulo Biblioteca — progresso de leitura por livro (com projeção de
 * data de término a partir do ritmo real), citações salvas e os números "de app de
 * referência" (Skoob/Goodreads/Kindle): meta anual de livros e sequência de dias lendo.
 */

export type BookStatus = "reading" | "finished" | "wishlist";

export type Book = {
  id: string;
  title: string;
  author: string | null;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  finished_at: string | null;
};

export type ReadingLog = {
  id: string;
  book_id: string;
  log_date: string; // YYYY-MM-DD
  pages_read: number;
};

export type Quote = {
  id: string;
  book_id: string;
  content: string;
  created_at: string;
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  reading: "Lendo",
  finished: "Concluído",
  wishlist: "Quero ler",
};

export async function fetchBiblioteca() {
  const weekStart = toDateString(new Date(Date.now() - 6 * 86400000));

  const [booksRes, logsRes, quotesRes, preferences] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, total_pages, current_page, status, finished_at")
      .order("created_at", { ascending: true }),
    // Sem filtro de data: a projeção de ritmo (`computePace`) e a sequência de dias
    // (`computeReadingStreak`) precisam do histórico inteiro, não só da última semana.
    supabase
      .from("reading_logs")
      .select("id, book_id, log_date, pages_read")
      .order("log_date", { ascending: true }),
    supabase
      .from("book_quotes")
      .select("id, book_id, content, created_at")
      .order("created_at", { ascending: false }),
    fetchModulePreference("biblioteca"),
  ]);
  if (booksRes.error) throw booksRes.error;
  if (logsRes.error) throw logsRes.error;
  if (quotesRes.error) throw quotesRes.error;

  const metaLivros = Number(preferences.meta_livros as string | number | undefined);

  return {
    books: (booksRes.data ?? []) as Book[],
    logs: (logsRes.data ?? []) as ReadingLog[],
    quotes: (quotesRes.data ?? []) as Quote[],
    metaLivros: metaLivros > 0 ? Math.round(metaLivros) : null,
    weekStart,
  };
}

export async function createBook(
  userId: string,
  input: { title: string; author: string; totalPages: number; currentPage: number; status: BookStatus }
) {
  const { error } = await supabase.from("books").insert({
    user_id: userId,
    title: input.title,
    author: input.author || null,
    total_pages: input.totalPages,
    current_page: input.currentPage,
    status: input.status,
    finished_at: input.status === "finished" ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

/** Recebe o livro atual (não só o id) pra saber se a edição é uma transição de/pra "Concluído". */
export async function updateBook(
  book: Book,
  input: { title: string; author: string; totalPages: number; currentPage: number; status: BookStatus }
) {
  const becameFinished = input.status === "finished" && book.status !== "finished";
  const leftFinished = input.status !== "finished" && book.status === "finished";

  const { error } = await supabase
    .from("books")
    .update({
      title: input.title,
      author: input.author || null,
      total_pages: input.totalPages,
      current_page: input.currentPage,
      status: input.status,
      ...(becameFinished ? { finished_at: new Date().toISOString() } : {}),
      ...(leftFinished ? { finished_at: null } : {}),
    })
    .eq("id", book.id);
  if (error) throw error;
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

/** Aplica uma variação em `current_page` (positiva ou negativa), com clamp em [0, total]. */
async function adjustCurrentPage(book: Book, delta: number) {
  const newCurrentPage = Math.max(0, Math.min(book.total_pages, book.current_page + delta));
  // Se saiu do fim do livro por causa de uma edição/remoção de log, volta o status pra
  // "lendo" — não faz sentido continuar marcado como concluído com página < total.
  const newStatus: BookStatus =
    newCurrentPage >= book.total_pages
      ? "finished"
      : book.status === "finished"
        ? "reading"
        : book.status;
  const becameFinished = newStatus === "finished" && book.status !== "finished";
  const leftFinished = newStatus !== "finished" && book.status === "finished";

  const { error } = await supabase
    .from("books")
    .update({
      current_page: newCurrentPage,
      status: newStatus,
      ...(becameFinished ? { finished_at: new Date().toISOString() } : {}),
      ...(leftFinished ? { finished_at: null } : {}),
    })
    .eq("id", book.id);
  if (error) throw error;
}

/** Registra a leitura de hoje: cria o log e soma nas páginas já lidas do livro. */
export async function logReadingToday(userId: string, book: Book, pagesRead: number) {
  const { error: insertError } = await supabase.from("reading_logs").insert({
    book_id: book.id,
    user_id: userId,
    log_date: toDateString(new Date()),
    pages_read: pagesRead,
  });
  if (insertError) throw insertError;

  await adjustCurrentPage(book, pagesRead);
}

/** Edita um registro de leitura já lançado, ajustando `current_page` pela diferença. */
export async function updateReadingLog(log: ReadingLog, book: Book, newPagesRead: number) {
  const { error } = await supabase
    .from("reading_logs")
    .update({ pages_read: newPagesRead })
    .eq("id", log.id);
  if (error) throw error;

  await adjustCurrentPage(book, newPagesRead - log.pages_read);
}

export async function deleteReadingLog(log: ReadingLog, book: Book) {
  const { error } = await supabase.from("reading_logs").delete().eq("id", log.id);
  if (error) throw error;

  await adjustCurrentPage(book, -log.pages_read);
}

export async function createQuote(userId: string, bookId: string, content: string) {
  const { error } = await supabase.from("book_quotes").insert({
    user_id: userId,
    book_id: bookId,
    content,
  });
  if (error) throw error;
}

/** Corrige uma citação digitada errado sem precisar excluir e recriar. */
export async function updateQuote(id: string, content: string) {
  const { error } = await supabase.from("book_quotes").update({ content }).eq("id", id);
  if (error) throw error;
}

export async function deleteQuote(id: string) {
  const { error } = await supabase.from("book_quotes").delete().eq("id", id);
  if (error) throw error;
}

/** Ritmo médio (páginas/dia) e projeção de data de término, a partir do histórico real. */
export function computePace(logs: ReadingLog[], book: Book) {
  const bookLogs = logs.filter((l) => l.book_id === book.id);
  if (bookLogs.length === 0) return null;

  const totalPagesLogged = bookLogs.reduce((sum, l) => sum + l.pages_read, 0);
  const distinctDays = new Set(bookLogs.map((l) => l.log_date)).size;
  const pagesPerDay = totalPagesLogged / distinctDays;
  if (pagesPerDay <= 0) return null;

  const remaining = Math.max(0, book.total_pages - book.current_page);
  if (remaining === 0) return { pagesPerDay, remaining: 0, projectedDate: null };

  const daysNeeded = Math.ceil(remaining / pagesPerDay);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysNeeded);

  return { pagesPerDay, remaining, projectedDate };
}

/** Quantos livros foram concluídos no ano informado (padrão: ano atual) — alimenta a meta do onboarding. */
export function computeBooksFinishedThisYear(books: Book[], year = new Date().getFullYear()) {
  return books.filter((b) => b.finished_at && new Date(b.finished_at).getFullYear() === year).length;
}

/**
 * Dias consecutivos com pelo menos um registro de leitura — mesma lógica de folga do
 * streak de hábitos (Rotina): hoje ainda não logado não quebra a sequência, só ainda não conta.
 */
export function computeReadingStreak(logs: ReadingLog[]): number {
  const doneDates = new Set(logs.map((l) => l.log_date));
  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 365; i++) {
    if (doneDates.has(toDateString(cursor))) {
      streak++;
    } else if (i === 0) {
      // hoje ainda não leu — não quebra a streak, só não conta ainda.
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Páginas lidas por dia, últimos 7 dias — mesmo formato de gráfico de barras dos outros módulos. */
export function computeWeeklyPages(logs: ReadingLog[], today = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day) => {
    const dateStr = toDateString(day);
    const value = logs.filter((l) => l.log_date === dateStr).reduce((sum, l) => sum + l.pages_read, 0);
    return { label: WEEKDAY_LABELS[day.getDay()], value };
  });
}

/** Páginas lidas num dia específico — mesma conta do `computeWeeklyPages`, só que pra uma data
 * isolada. `fetchBiblioteca` já traz o histórico inteiro (sem filtro de data), então o
 * histórico de meses anteriores não precisa de busca nova, só reaproveita
 * os `logs` que já vêm na tela. */
export function computeDayPages(dateStr: string, logs: ReadingLog[]): number {
  return logs.filter((l) => l.log_date === dateStr).reduce((sum, l) => sum + l.pages_read, 0);
}

export function formatLogDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function formatShortDate(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}
