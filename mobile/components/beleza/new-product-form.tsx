import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  EXPIRY_REMINDER_OPTIONS,
  type ProductCategory,
  type ProductInput,
} from "@/lib/beleza";

type NewProductFormProps = {
  initial?: ProductInput;
  submitLabel?: string;
  onSubmit: (input: ProductInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewProductForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewProductFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "hidratante");
  const [openedText, setOpenedText] = useState(toBrDate(initial?.openedAt ?? null));
  const [expiresText, setExpiresText] = useState(toBrDate(initial?.expiresAt ?? null));
  const [expiryReminderDaysBefore, setExpiryReminderDaysBefore] = useState<number | null>(
    initial?.expiryReminderDaysBefore ?? null
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const openedIsValid = openedText.trim().length === 0 || parseBrDate(openedText) !== null;
  const expiresIsValid = expiresText.trim().length === 0 || parseBrDate(expiresText) !== null;
  const isValid = name.trim().length > 0 && openedIsValid && expiresIsValid;

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
        value={name}
        onChangeText={setName}
        placeholder="Nome do produto (ex: Protetor solar FPS 50)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PRODUCT_CATEGORIES.map((c) => {
          const selected = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 12.5,
                  color: selected ? tokens.accentText : tokens.text,
                }}
              >
                {PRODUCT_CATEGORY_LABELS[c]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={openedText}
            onChangeText={setOpenedText}
            placeholder="Aberto em (opcional)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!openedIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use DD/MM/AAAA.</Text>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={expiresText}
            onChangeText={setExpiresText}
            placeholder="Validade (opcional)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!expiresIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use DD/MM/AAAA.</Text>
          ) : null}
        </View>
      </View>

      {expiresIsValid && expiresText.trim() ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Lembrete de validade
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EXPIRY_REMINDER_OPTIONS.map((option) => {
              const selected = expiryReminderDaysBefore === option.value;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => setExpiryReminderDaysBefore(option.value)}
                  style={{
                    backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.text,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({
              name: name.trim(),
              category,
              openedAt: openedText.trim() ? parseBrDate(openedText) : null,
              expiresAt: expiresText.trim() ? parseBrDate(expiresText) : null,
              expiryReminderDaysBefore: expiresText.trim() ? expiryReminderDaysBefore : null,
              notes: notes.trim(),
            })
          }
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
