import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewRoutineStepForm } from "@/components/beleza/new-routine-step-form";
import type { BeautyProduct, RoutineStep, RoutineStepInput } from "@/lib/beleza";

type RoutineStepRowProps = {
  step: RoutineStep;
  product: BeautyProduct | undefined;
  products: BeautyProduct[];
  done: boolean;
  onToggleDone: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: RoutineStepInput) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function RoutineStepRow({
  step,
  product,
  products,
  done,
  onToggleDone,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
}: RoutineStepRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewRoutineStepForm
        products={products}
        initial={{ period: step.period, title: step.title, productId: step.product_id }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Pressable
        onPress={onToggleDone}
        hitSlop={8}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: done ? tokens.accent : tokens.border,
          backgroundColor: done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fontFamily.body,
            fontSize: 14.5,
            color: done ? tokens.textMuted : tokens.text,
            textDecorationLine: done ? "line-through" : "none",
          }}
        >
          {step.title}
        </Text>
        {product ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>{product.name}</Text>
        ) : null}
      </View>

      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
