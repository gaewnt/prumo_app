import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { STATUS_LABELS, type BookStatus } from "@/lib/biblioteca";

type NewBookFormProps = {
  /** Preenche o formulário com um livro existente — usado na edição. */
  initial?: {
    title: string;
    author: string;
    totalPages: number;
    currentPage: number;
    status: BookStatus;
  };
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (input: {
    title: string;
    author: string;
    totalPages: number;
    currentPage: number;
    status: BookStatus;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
};

const STATUS_OPTIONS: BookStatus[] = ["reading", "finished", "wishlist"];

export function NewBookForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewBookFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [totalPagesText, setTotalPagesText] = useState(initial ? String(initial.totalPages) : "");
  const [currentPageText, setCurrentPageText] = useState(initial ? String(initial.currentPage) : "0");
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? "reading");

  const totalPages = Number(totalPagesText);
  const currentPage = Number(currentPageText);
  const isValid = title.trim().length > 0 && totalPages > 0 && currentPage >= 0;

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Título do livro"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <TextInput
        value={author}
        onChangeText={setAuthor}
        placeholder="Autor (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Total de páginas
          </Text>
          <TextInput
            value={totalPagesText}
            onChangeText={setTotalPagesText}
            placeholder="320"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Página atual
          </Text>
          <TextInput
            value={currentPageText}
            onChangeText={setCurrentPageText}
            placeholder="0"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Status</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {STATUS_OPTIONS.map((option) => {
            const selected = status === option;
            return (
              <Pressable
                key={option}
                onPress={() => setStatus(option)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 12,
                    color: selected ? tokens.accentText : tokens.textMuted,
                  }}
                >
                  {STATUS_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ title: title.trim(), author: author.trim(), totalPages, currentPage, status })}
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
