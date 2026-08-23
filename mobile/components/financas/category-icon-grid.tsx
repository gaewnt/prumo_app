import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CATEGORY_META, categoryColor, categoryEmoji } from "@/lib/financas";

type CategoryIconGridProps = {
  categories: readonly string[];
  selected: string;
  onSelect: (category: string) => void;
};

/** Grid de categorias como círculo colorido + emoji, no lugar de texto livre. */
export function CategoryIconGrid({ categories, selected, onSelect }: CategoryIconGridProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {categories.map((category) => {
        const isSelected = category === selected;
        const color = categoryColor(tokens, category);
        return (
          <Pressable key={category} onPress={() => onSelect(category)} style={{ alignItems: "center", gap: 5, width: 60 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSelected ? color : tokens.surfaceAlt,
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: color,
              }}
            >
              <Text style={{ fontSize: 18 }}>{categoryEmoji(category)}</Text>
            </View>
            <Text
              style={{ fontFamily: fontFamily.body, fontSize: 10.5, color: tokens.textMuted, textAlign: "center" }}
              numberOfLines={1}
            >
              {category}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Reexporta pra quem só precisa do mapeamento (evita import duplicado em outros arquivos).
export { CATEGORY_META };
