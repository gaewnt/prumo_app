import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily, type ThemeTokens } from "@/lib/theme/tokens";
import { NewProductForm } from "@/components/beleza/new-product-form";
import { PRODUCT_CATEGORY_LABELS, daysUntilExpiry, type BeautyProduct, type ProductInput } from "@/lib/beleza";

type ProductRowProps = {
  product: BeautyProduct;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: ProductInput) => void;
  isSaving: boolean;
  onDelete: () => void;
};

function expiryBadge(expiresAt: string, tokens: ThemeTokens) {
  const days = daysUntilExpiry(expiresAt);
  if (days < 0) return { text: "Vencido", color: tokens.danger, bg: tokens.dangerMuted };
  if (days <= 7) return { text: `Vence em ${days}d`, color: tokens.warning, bg: tokens.warningMuted };
  return null;
}

export function ProductRow({ product, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete }: ProductRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewProductForm
        initial={{
          name: product.name,
          category: product.category,
          openedAt: product.opened_at,
          expiresAt: product.expires_at,
          expiryReminderDaysBefore: product.expiry_reminder_days_before,
          notes: product.notes ?? "",
        }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  const badge = product.expires_at ? expiryBadge(product.expires_at, tokens) : null;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>{product.name}</Text>
        <Text
          style={{
            fontFamily: fontFamily.bodyMedium,
            fontSize: 10.5,
            color: tokens.accent,
            backgroundColor: tokens.accentMuted,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {PRODUCT_CATEGORY_LABELS[product.category].toUpperCase()}
        </Text>
        {badge ? (
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 10.5,
              color: badge.color,
              backgroundColor: badge.bg,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            {badge.text.toUpperCase()}
          </Text>
        ) : null}
      </View>
      {product.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{product.notes}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}
