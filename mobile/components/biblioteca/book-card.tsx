import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewBookForm } from "@/components/biblioteca/new-book-form";
import { LogReadingForm } from "@/components/biblioteca/log-reading-form";
import { QuoteForm } from "@/components/biblioteca/quote-form";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  STATUS_LABELS,
  computePace,
  formatLogDate,
  formatShortDate,
  type Book,
  type ReadingLog,
  type Quote,
  type BookStatus,
} from "@/lib/biblioteca";

type BookInput = {
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
};

type BookCardProps = {
  book: Book;
  logs: ReadingLog[];

  isEditingBook: boolean;
  onStartEditBook: () => void;
  onCancelEditBook: () => void;
  onUpdateBook: (input: BookInput) => void;
  isSavingBook: boolean;
  onDeleteBook: () => void;

  showLogForm: boolean;
  onToggleLogForm: () => void;
  onAddLog: (pagesRead: number) => void;
  isAddingLog: boolean;

  showHistory: boolean;
  onToggleHistory: () => void;

  editingLogId: string | null;
  onStartEditLog: (id: string) => void;
  onCancelEditLog: () => void;
  onUpdateLog: (id: string, pagesRead: number) => void;
  isSavingLog: boolean;
  onDeleteLog: (id: string) => void;

  quotes: Quote[];
  showQuoteForm: boolean;
  onToggleQuoteForm: () => void;
  onAddQuote: (content: string) => void;
  isAddingQuote: boolean;
  onDeleteQuote: (id: string) => void;
  editingQuoteId: string | null;
  onStartEditQuote: (id: string) => void;
  onCancelEditQuote: () => void;
  onUpdateQuote: (id: string, content: string) => void;
  isSavingQuoteEdit: boolean;
};

export function BookCard({
  book,
  logs,
  isEditingBook,
  onStartEditBook,
  onCancelEditBook,
  onUpdateBook,
  isSavingBook,
  onDeleteBook,
  showLogForm,
  onToggleLogForm,
  onAddLog,
  isAddingLog,
  showHistory,
  onToggleHistory,
  editingLogId,
  onStartEditLog,
  onCancelEditLog,
  onUpdateLog,
  isSavingLog,
  onDeleteLog,
  quotes,
  showQuoteForm,
  onToggleQuoteForm,
  onAddQuote,
  isAddingQuote,
  onDeleteQuote,
  editingQuoteId,
  onStartEditQuote,
  onCancelEditQuote,
  onUpdateQuote,
  isSavingQuoteEdit,
}: BookCardProps) {
  const { tokens } = useTheme();

  if (isEditingBook) {
    return (
      <NewBookForm
        initial={{
          title: book.title,
          author: book.author ?? "",
          totalPages: book.total_pages,
          currentPage: book.current_page,
          status: book.status,
        }}
        submitLabel="Salvar alterações"
        isSaving={isSavingBook}
        onCancel={onCancelEditBook}
        onSubmit={onUpdateBook}
      />
    );
  }

  const progress = book.total_pages > 0 ? Math.min(1, book.current_page / book.total_pages) : 0;
  const pace = computePace(logs, book);
  const bookLogs = logs.filter((l) => l.book_id === book.id).slice().reverse();

  const statusColor =
    book.status === "finished" ? tokens.success : book.status === "wishlist" ? tokens.textMuted : tokens.accent;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {book.title}
          </Text>
          {book.author ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {book.author}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onStartEditBook} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDeleteBook} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: statusColor }}>
          {STATUS_LABELS[book.status]}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <ProgressBar progress={progress} />
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {book.current_page} de {book.total_pages} páginas ({Math.round(progress * 100)}%)
          {pace && pace.projectedDate
            ? ` · ~${pace.pagesPerDay.toFixed(1)} pág/dia · previsão ${formatShortDate(pace.projectedDate)}`
            : pace && pace.remaining === 0
              ? " · concluído"
              : ""}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable onPress={onToggleLogForm} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            {showLogForm ? "Cancelar" : "Registrar leitura"}
          </Text>
        </Pressable>
        {bookLogs.length > 0 ? (
          <Pressable onPress={onToggleHistory} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
              {showHistory ? "Ocultar histórico" : `Histórico (${bookLogs.length})`}
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onToggleQuoteForm} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            {showQuoteForm ? "Cancelar" : `Citações${quotes.length > 0 ? ` (${quotes.length})` : ""}`}
          </Text>
        </Pressable>
      </View>

      {showLogForm ? (
        <LogReadingForm isSaving={isAddingLog} onCancel={onToggleLogForm} onSubmit={onAddLog} />
      ) : null}

      {showHistory ? (
        <View style={{ gap: 6, paddingTop: 4 }}>
          {bookLogs.map((log) =>
            editingLogId === log.id ? (
              <LogReadingForm
                key={log.id}
                initial={{ pagesRead: log.pages_read }}
                submitLabel="Salvar"
                isSaving={isSavingLog}
                onCancel={onCancelEditLog}
                onSubmit={(pagesRead) => onUpdateLog(log.id, pagesRead)}
              />
            ) : (
              <View
                key={log.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, width: 60 }}>
                  {formatLogDate(log.log_date)}
                </Text>
                <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>
                  {log.pages_read} páginas
                </Text>
                <Pressable onPress={() => onStartEditLog(log.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>
                    Editar
                  </Text>
                </Pressable>
                <Pressable onPress={() => onDeleteLog(log.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      ) : null}

      {showQuoteForm ? (
        <QuoteForm isSaving={isAddingQuote} onCancel={onToggleQuoteForm} onSubmit={onAddQuote} />
      ) : null}

      {quotes.length > 0 ? (
        <View style={{ gap: 8, paddingTop: 4 }}>
          {quotes.map((quote) =>
            editingQuoteId === quote.id ? (
              <QuoteForm
                key={quote.id}
                initialContent={quote.content}
                submitLabel="Salvar alterações"
                isSaving={isSavingQuoteEdit}
                onCancel={onCancelEditQuote}
                onSubmit={(content) => onUpdateQuote(quote.id, content)}
              />
            ) : (
              <View
                key={quote.id}
                style={{
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fontFamily.body,
                    fontSize: 13,
                    fontStyle: "italic",
                    color: tokens.text,
                  }}
                >
                  "{quote.content}"
                </Text>
                <Pressable onPress={() => onStartEditQuote(quote.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✎</Text>
                </Pressable>
                <Pressable onPress={() => onDeleteQuote(quote.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      ) : null}
    </View>
  );
}
