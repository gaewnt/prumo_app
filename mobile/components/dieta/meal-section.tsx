import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewMealItemForm } from "@/components/dieta/new-meal-item-form";
import type { MealItem } from "@/lib/dieta";

type MealSectionProps = {
  label: string;
  items: MealItem[];

  showAddForm: boolean;
  onToggleAddForm: () => void;
  onAddItem: (description: string) => void;
  isAdding: boolean;

  editingItemId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onUpdateItem: (id: string, description: string) => void;
  isSavingEdit: boolean;

  onDeleteItem: (id: string) => void;
};

export function MealSection({
  label,
  items,
  showAddForm,
  onToggleAddForm,
  onAddItem,
  isAdding,
  editingItemId,
  onStartEdit,
  onCancelEdit,
  onUpdateItem,
  isSavingEdit,
  onDeleteItem,
}: MealSectionProps) {
  const { tokens } = useTheme();

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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
          {label}
        </Text>
        <Pressable onPress={onToggleAddForm} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            {showAddForm ? "Cancelar" : "+ Item"}
          </Text>
        </Pressable>
      </View>

      {items.length === 0 && !showAddForm ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
          Nenhum item ainda.
        </Text>
      ) : (
        <View style={{ gap: 6 }}>
          {items.map((item) =>
            editingItemId === item.id ? (
              <NewMealItemForm
                key={item.id}
                initial={{ description: item.description }}
                submitLabel="Salvar alterações"
                isSaving={isSavingEdit}
                onCancel={onCancelEdit}
                onSubmit={(description) => onUpdateItem(item.id, description)}
              />
            ) : (
              <View
                key={item.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 }}
              >
                <Text
                  style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}
                >
                  {item.description}
                </Text>
                <Pressable onPress={() => onStartEdit(item.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>
                    Editar
                  </Text>
                </Pressable>
                <Pressable onPress={() => onDeleteItem(item.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      )}

      {showAddForm ? (
        <NewMealItemForm isSaving={isAdding} onCancel={onToggleAddForm} onSubmit={onAddItem} />
      ) : null}
    </View>
  );
}
