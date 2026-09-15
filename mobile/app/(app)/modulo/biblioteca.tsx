import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { BookCard } from "@/components/biblioteca/book-card";
import { NewBookForm } from "@/components/biblioteca/new-book-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { streakMilestone, toDateString } from "@/lib/rotina";
import {
  fetchBiblioteca,
  createBook,
  updateBook,
  deleteBook,
  logReadingToday,
  updateReadingLog,
  deleteReadingLog,
  createQuote,
  updateQuote,
  deleteQuote,
  computeBooksFinishedThisYear,
  computeReadingStreak,
  computeWeeklyPages,
  computeDayPages,
  STATUS_LABELS,
  type Book,
  type ReadingLog,
  type BookStatus,
} from "@/lib/biblioteca";
import { updateModulePreferenceField } from "@/lib/onboarding";

/** Conteúdo de Biblioteca — usado tanto na rota própria quanto como aba dentro do hub Estudos. */
export function BibliotecaContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [logFormBookId, setLogFormBookId] = useState<string | null>(null);
  const [historyOpenIds, setHistoryOpenIds] = useState<string[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [quoteFormBookId, setQuoteFormBookId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingMetaPaginas, setEditingMetaPaginas] = useState(false);
  const [metaPaginasText, setMetaPaginasText] = useState("");

  const query = useQuery({
    queryKey: ["biblioteca", userId],
    queryFn: fetchBiblioteca,
    enabled: !!userId,
  });
  const books = query.data?.books ?? [];
  const logs = query.data?.logs ?? [];
  const quotes = query.data?.quotes ?? [];
  const metaLivros = query.data?.metaLivros ?? null;
  const metaPaginasDia = query.data?.metaPaginasDia ?? null;
  const paginasHoje = computeDayPages(toDateString(new Date()), logs);

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

  // Histórico de meses anteriores — `fetchBiblioteca` já traz o histórico
  // de leitura inteiro (sem filtro de data), então aqui não precisa de busca nova: só navega
  // o mês exibido no MonthHeatmap sobre os `logs` que já vêm na tela.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

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

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updateQuote(id, content),
    onSuccess: () => {
      setEditingQuoteId(null);
      invalidate();
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: invalidate,
  });

  /** Meta diária de páginas — mesmo padrão de "renda fixa" em Finanças: guardada em
   * `module_preferences.answers` (sem tabela nova), editável direto aqui. Alimenta a Visão
   * Hoje ("faltam X páginas hoje"), diferente de `metaLivros` (anual, só onboarding). */
  const metaPaginasMutation = useMutation({
    mutationFn: (valor: string) => updateModulePreferenceField(userId!, "biblioteca", { meta_paginas_dia: valor }),
    onSuccess: () => {
      setEditingMetaPaginas(false);
      invalidate();
    },
  });

  return (
    <View style={{ gap: 20 }}>
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

          <View
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Meta diária de páginas
                </Text>
                {editingMetaPaginas ? (
                  <TextInput
                    value={metaPaginasText}
                    onChangeText={setMetaPaginasText}
                    placeholder="Ex: 20"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="number-pad"
                    autoFocus
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 18,
                      color: tokens.text,
                      backgroundColor: tokens.surfaceAlt,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      marginTop: 4,
                    }}
                  />
                ) : (
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 20, color: tokens.text, marginTop: 2 }}>
                    {metaPaginasDia ? `${paginasHoje} de ${metaPaginasDia} páginas` : "Não definida"}
                  </Text>
                )}
              </View>
              {editingMetaPaginas ? (
                <Pressable
                  onPress={() => metaPaginasMutation.mutate(metaPaginasText)}
                  disabled={metaPaginasMutation.isPending}
                >
                  {metaPaginasMutation.isPending ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                      Salvar
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    setMetaPaginasText(metaPaginasDia ? String(metaPaginasDia) : "");
                    setEditingMetaPaginas(true);
                  }}
                  hitSlop={8}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    Editar
                  </Text>
                </Pressable>
              )}
            </View>
            {metaPaginasDia ? <ProgressBar progress={paginasHoje / metaPaginasDia} /> : null}
          </View>

          <StatCard
            label="Sequência de leitura"
            value={`${readingStreak} ${readingStreak === 1 ? "dia" : "dias"}`}
            deltaLabel={milestone ? `🏅 ${milestone} dias` : undefined}
            deltaTone="positive"
          >
            <WeeklyBarChart data={weeklyPages} highlightIndex={6} />
          </StatCard>

          {logs.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                Histórico
              </Text>
              <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
              <MonthHeatmap
                monthDate={historyMonth}
                showMonthLabel={false}
                getCellColor={(dateStr) => {
                  const pages = computeDayPages(dateStr, logs);
                  return pages > 0 ? tokens.accent : null;
                }}
              />
            </View>
          ) : null}

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
                    editingQuoteId={editingQuoteId}
                    onStartEditQuote={(id) => setEditingQuoteId(id)}
                    onCancelEditQuote={() => setEditingQuoteId(null)}
                    onUpdateQuote={(id, content) => updateQuoteMutation.mutate({ id, content })}
                    isSavingQuoteEdit={updateQuoteMutation.isPending}
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
  );
}

export default function BibliotecaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>
        <BibliotecaContent />
      </View>
    </Screen>
  );
}
