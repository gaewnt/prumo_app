import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { Subject } from "@/lib/estudos";

/** Mesmo cálculo de contraste do `MonthHeatmap` — as cores de matéria vêm de fora (chart1..5). */
function contrastTextColor(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#1A1A1A";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

type SubjectChipPickerProps = {
  subjects: Subject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Mostra um chip "Sem matéria" — usado nas tarefas, que podem não ter matéria ligada. */
  allowNone?: boolean;
  colorFor: (colorKey: Subject["color_key"]) => string;
};

export function SubjectChipPicker({ subjects, selectedId, onSelect, allowNone, colorFor }: SubjectChipPickerProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {allowNone ? (
        <Pressable
          onPress={() => onSelect(null)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: selectedId === null ? tokens.accent : tokens.surfaceAlt,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 13,
              color: selectedId === null ? tokens.accentText : tokens.textMuted,
            }}
          >
            Sem matéria
          </Text>
        </Pressable>
      ) : null}
      {subjects.map((subject) => {
        const selected = selectedId === subject.id;
        return (
          <Pressable
            key={subject.id}
            onPress={() => onSelect(subject.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: selected ? colorFor(subject.color_key) : tokens.surfaceAlt,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            {!selected ? (
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorFor(subject.color_key) }}
              />
            ) : null}
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 13,
                color: selected ? contrastTextColor(colorFor(subject.color_key)) : tokens.text,
              }}
            >
              {subject.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
