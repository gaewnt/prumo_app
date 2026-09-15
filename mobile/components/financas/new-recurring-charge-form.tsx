import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CATEGORY_PRESETS } from "@/lib/financas";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";

export type RecurringChargeFormInput = {
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
};

type NewRecurringChargeFormProps = {
  /** Preenche o formulário com um lançamento fixo já existente — usado na edição. */
  initial?: RecurringChargeFormInput;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  isSaving: boolean;
  onSubmit: (input: RecurringChargeFormInput) => void;
  onCancel: () => void;
  /** Categorias disponíveis no grid — padrão + as que a pessoa criou. */
  allCategories?: readonly string[];
};

function parseDay(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < 1 || n > 28) return null;
  return n;
}

export function NewRecurringChargeForm({
  initial,
  submitLabel = "Salvar",
  isSaving,
  onSubmit,
  onCancel,
  allCategories = CATEGORY_PRESETS,
}: NewRecurringChargeFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [category, setCategory] = useState<string>(initial?.category ?? allCategories[0] ?? "Outros");
  const [dayText, setDayText] = useState(initial ? String(initial.dayOfMonth) : "");

  const amount = Number(amountText.replace(",", "."));
  const day = parseDay(dayText);
  const isValid = name.trim().length > 0 && amount > 0 && day !== null;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({ name: name.trim(), amount, category, dayOfMonth: day! });
  }

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
        placeholder="Nome (ex: Netflix, Academia)"
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

      <CategoryIconGrid categories={allCategories} selected={category} onSelect={setCategory} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Valor
          </Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Ex: 39,90"
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
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Cobra dia
          </Text>
          <TextInput
            value={dayText}
            onChangeText={setDayText}
            placeholder="Ex: 5"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
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
        </View>
      </View>

      <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
        A partir de agora, esse valor entra sozinho em cada fatura aberta — sem precisar
        relançar todo mês. Dá pra editar ou excluir uma ocorrência específica depois, se
        precisar.
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
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
