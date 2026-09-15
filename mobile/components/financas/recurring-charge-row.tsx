import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { categoryEmoji, formatCurrency, type CreditCardRecurringCharge } from "@/lib/financas";
import { NewRecurringChargeForm, type RecurringChargeFormInput } from "@/components/financas/new-recurring-charge-form";

type RecurringChargeRowProps = {
  charge: CreditCardRecurringCharge;
  allCategories: readonly string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: RecurringChargeFormInput) => void;
  isUpdating: boolean;
  onToggleActive: () => void;
  isTogglingActive: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

export function RecurringChargeRow({
  charge,
  allCategories,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
  onToggleActive,
  isTogglingActive,
  onDelete,
  isDeleting,
}: RecurringChargeRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewRecurringChargeForm
        initial={{
          name: charge.name,
          amount: charge.amount,
          category: charge.category,
          dayOfMonth: charge.day_of_month,
        }}
        submitLabel="Salvar alterações"
        isSaving={isUpdating}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        allCategories={allCategories}
      />
    );
  }

  const isBusy = isTogglingActive || isDeleting;

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 10,
        padding: 10,
        gap: 6,
        opacity: charge.active ? 1 : 0.55,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 16 }}>{categoryEmoji(charge.category)}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
            {charge.name}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Todo dia {charge.day_of_month} · {charge.category}
            {!charge.active ? " · pausado" : ""}
          </Text>
        </View>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 14, color: tokens.text }}>
          {formatCurrency(charge.amount)}
        </Text>
      </View>

      {isBusy ? (
        <ActivityIndicator size="small" color={tokens.accent} />
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Editar
            </Text>
          </Pressable>
          <Pressable onPress={onToggleActive} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {charge.active ? "Pausar" : "Reativar"}
            </Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Excluir
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
