import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CATEGORY_PRESETS, type TransactionKind } from "@/lib/financas";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";

type TransactionInput = { kind: TransactionKind; category: string; amount: number; description: string };

type NewTransactionFormProps = {
  /** Preenche o formulário com um lançamento existente — usado na edição. */
  initial?: TransactionInput;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (input: TransactionInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewTransactionForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewTransactionFormProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? "expense");
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORY_PRESETS[0]);
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const amount = Number(amountText.replace(",", "."));
  const isValid = category.trim().length > 0 && amount > 0;

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
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["expense", "income"] as const).map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.textMuted,
                }}
              >
                {k === "expense" ? "Despesa" : "Receita"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <CategoryIconGrid categories={CATEGORY_PRESETS} selected={category} onSelect={setCategory} />

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Valor (ex: 45,90)"
        placeholderTextColor={tokens.textMuted}
        keyboardType="decimal-pad"
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ kind, category, amount, description })}
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
