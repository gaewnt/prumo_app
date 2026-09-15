import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, Switch } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";

type NewBudgetCategoryFormProps = {
  availableCategories: readonly string[];
  isSaving: boolean;
  onSubmit: (input: { category: string; plannedAmount: number; isEnvelope: boolean }) => void;
  onCancel: () => void;
};

export function NewBudgetCategoryForm({
  availableCategories,
  isSaving,
  onSubmit,
  onCancel,
}: NewBudgetCategoryFormProps) {
  const { tokens } = useTheme();
  const [category, setCategory] = useState<string>(availableCategories[0] ?? "");
  const [amountText, setAmountText] = useState("");
  const [isEnvelope, setIsEnvelope] = useState(false);

  const plannedAmount = Number(amountText.replace(",", "."));
  const isValid = category.trim().length > 0 && plannedAmount > 0;
  const hasCategories = availableCategories.length > 0;

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
      {hasCategories ? (
        <>
          <CategoryIconGrid categories={availableCategories} selected={category} onSelect={setCategory} />

          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Valor planejado (ex: 500,00)"
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

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
                Modo envelope
              </Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                O que sobrar (ou faltar) fica guardado pro próximo mês, em vez de resetar.
              </Text>
            </View>
            <Switch
              value={isEnvelope}
              onValueChange={setIsEnvelope}
              trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit({ category, plannedAmount, isEnvelope })}
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
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Todas as categorias já têm planejamento este mês.
          </Text>
          <Pressable onPress={onCancel} style={{ alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
              Cancelar
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
