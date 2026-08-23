import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { categoryColor, formatCurrency } from "@/lib/financas";
import { CategoryDonut } from "@/components/charts/category-donut";

type CategoryBreakdownProps = {
  items: { category: string; amount: number }[];
};

/** Donut de gasto por categoria do mês + legenda com valor — estilo relatório. */
export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  const { tokens } = useTheme();
  if (items.length === 0) return null;

  const donutItems = items.map((item) => ({
    label: item.category,
    value: item.amount,
    color: categoryColor(tokens, item.category),
  }));

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 14,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
        Gastos por categoria
      </Text>

      <CategoryDonut items={donutItems} />

      <View style={{ gap: 6 }}>
        {items.map((item) => (
          <View key={item.category} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              {item.category}
            </Text>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 12.5, color: tokens.text }}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
