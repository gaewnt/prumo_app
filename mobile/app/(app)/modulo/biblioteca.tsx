import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { BookCard } from "@/components/biblioteca/book-card";
import { NewBookForm } from "@/components/biblioteca/new-book-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { streakMilestone } from "@/lib/rotina";
import {
  fetchBiblioteca,
  createBook,
  updateBook,
  deleteBook,
  logReadingToday,
  updateReadingLog,
  deleteReadingLog,
  createQuote,
  deleteQuote,
  computeBooksFinishedThisYear,
  computeReadingStreak,
  computeWeeklyPages,
  STATUS_LABELS,
  type Book,
  type ReadingLog,
  type BookStatus,
} from "@/lib/biblioteca";

export default function BibliotecaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [logFormBookId, setLogFormBookId] = useState<string | null>(null);
  const [historyOpenIds, setHistoryOpenIds] = useState<string[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [quoteFormBookId, setQuoteFormBookId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["biblioteca", userId],
    queryFn: fetchBiblioteca,
    enabled: !!userId,
  });
  const books = query.data?.books ?? [];
  const logs = query.data?.logs ?? [];
  const quotes = query.data?.quotes ?? [];
  const metaLivros = query.data?.metaLivros ?? null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["biblioteca", userId] });
  }
  function findLog(id: string): ReadingLog | undefined {
    return logs.find((l) => l.id === id);
  }

  const booksFinishedThisYear = computeBooksFinishedThisYear(books);
  const readingStreak = computeReadingStreak(logs);
  const weeklyPages = computeWeeklyPages(logs);
  const milestone = streakMilestone(readingStreak);

  const readingBooks = books.filter((b) => b.status === "reading");
  const wishlistBooks = books.filter((b) => b.status === "wishlist");
  const finishedBooks = books.filter((b) => b.status === "finished");
  const sections: { key: BookStatus; title: string; items: Book[] }[] = [
    { key: "reading", title: STATUS_LABELS.reading, items: readingBooks },
    { key: "wishlist", title: STATUS_LABELS.wishlist, items: wishlistBooks },
    { key: "finished", title: STATUS_LABELS.finished, items: finishedBooks },
  ];

  const createBookMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBook>[1]) => createBook(userId!, input),
    onSuccess: () => {
      setShowBookForm(false);
      invalidate();
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ book, input }: { book: Book; input: Parameters<typeof updateBook>[1] }) =>
      updateBook(book, input),
    onSuccess: () => {
      setEditingBookId(null);
      invalidate();
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: invalidate,
  });

  const addLogMutation = useMutation({
    mutationFn: ({ book, pagesRead }: { book: Book; pagesRead: number }) =>
      logReadingToday(userId!, book, pagesRead),
    onSuccess: () => {
      setLogFormBookId(null);
      invalidate();
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ log, book, pagesRead }: { log: ReadingLog; book: Book; pagesRead: number }) =>
      updateReadingLog(log, book, pagesRead),
    onSuccess: () => {
      setEditingLogId(null);
      invalidate();
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: ({ log, book }: { log: ReadingLog; book: Book }) => deleteReadingLog(log, book),
    onSuccess: invalidate,
  });

  const addQuoteMutation = useMutation({
    mutationFn: ({ bookId, content }: { bookId: string; content: string }) =>
      createQuote(userId!, bookId, content),
    onSuccess: () => {
      setQuoteFormBookId(null);
      invalidate();
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: invalidate,
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>📚</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Biblioteca
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Progresso de leitura, sequência e citações salvas.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus livros agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            {metaLivros ? (
              <StatCard
                label={`Livros lidos em ${new Date().getFullYear()}`}
                value={`${booksFinishedThisYear} de ${metaLivros}`}
              >
                <ProgressBar progress={booksFinishedThisYear / metaLivros} />
              </StatCard>
            ) : null}

            <StatCard
              label="Sequência de leitura"
              value={`${readingStreak} ${readingStreak === 1 ? "dia" : "dias"}`}
              deltaLabel={milestone ? `🏅 ${milestone} dias` : undefined}
              deltaTone="positive"
            >
              <WeeklyBarChart data={weeklyPages} highlightIndex={6} />
            </StatCard>

            {books.length === 0 && !showBookForm ? (
              <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 14, padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                  Nenhum livro ainda
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Adicione o que você está lendo (ou quer ler) pra acompanhar o progresso.
                </Text>
              </View>
            ) : null}

            {sections.map((section) =>
              section.items.length > 0 ? (
                <View key={section.key} style={{ gap: 10 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                    {section.title} · {section.items.length}
                  </Text>
                  {section.items.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      logs={logs}
                      isEditingBook={editingBookId === book.id}
                      onStartEditBook={() => setEditingBookId(book.id)}
                      onCancelEditBook={() => setEditingBookId(null)}
                      onUpdateBook={(input) => updateBookMutation.mutate({ book, input })}
                      isSavingBook={updateBookMutation.isPending}
                      onDeleteBook={() => deleteBookMutation.mutate(book.id)}
                      showLogForm={logFormBookId === book.id}
                      onToggleLogForm={() =>
                        setLogFormBookId((current) => (current === book.id ? null : book.id))
                      }
                      onAddLog={(pagesRead) => addLogMutation.mutate({ book, pagesRead })}
                      isAddingLog={addLogMutation.isPending}
                      showHistory={historyOpenIds.includes(book.id)}
                      onToggleHistory={() =>
                        setHistoryOpenIds((current) =>
                          current.includes(book.id)
                            ? current.filter((id) => id !== book.id)
                            : [...current, book.id]
                        )
                      }
                      editingLogId={editingLogId}
                      onStartEditLog={(id) => setEditingLogId(id)}
                      onCancelEditLog={() => setEditingLogId(null)}
                      onUpdateLog={(id, pagesRead) => {
                        const log = findLog(id);
                        if (!log) return;
                        updateLogMutation.mutate({ log, book, pagesRead });
                      }}
                      isSavingLog={updateLogMutation.isPending}
                      onDeleteLog={(id) => {
                        const log = findLog(id);
                        if (!log) return;
                        deleteLogMutation.mutate({ log, book });
                      }}
                      quotes={quotes.filter((q) => q.book_id === book.id)}
                      showQuoteForm={quoteFormBookId === book.id}
                      onToggleQuoteForm={() =>
                        setQuoteFormBookId((current) => (current === book.id ? null : book.id))
                      }
                      onAddQuote={(content) => addQuoteMutation.mutate({ bookId: book.id, content })}
                      isAddingQuote={addQuoteMutation.isPending}
                      onDeleteQuote={(id) => deleteQuoteMutation.mutate(id)}
                    />
                  ))}
                </View>
              ) : null
            )}

            {showBookForm ? (
              <NewBookForm
                isSaving={createBookMutation.isPending}
                onCancel={() => setShowBookForm(false)}
                onSubmit={(input) => createBookMutation.mutate(input)}
              />
            ) : (
              <Pressable
                onPress={() => setShowBookForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo livro
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
