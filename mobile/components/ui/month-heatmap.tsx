import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";

const WEEKDAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

/**
 * Cor do número por cima de uma célula colorida — calculada pela luminância do hex
 * recebido, já que as cores das células vêm de fora (accent, success, danger, warning...)
 * e o contraste ideal muda dependendo do tema e de qual cor foi passada.
 */
function contrastTextColor(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#1A1A1A";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

type MonthHeatmapProps = {
  /** Qualquer data dentro do mês que deve ser desenhado. */
  monthDate: Date;
  /** Cor da célula desse dia — `null` = sem dado (célula vazia). */
  getCellColor: (dateStr: string) => string | null;
  selectedDate?: string | null;
  onSelectDate?: (dateStr: string) => void;
  /** Desabilita o toque em dias futuros (padrão: true). */
  disableFuture?: boolean;
};

/**
 * Calendário do mês com uma cor por dia (estilo Daylio/HabitNow) — mais denso que uma
 * fita de 7 dias, e serve tanto pra hábitos (Rotina) quanto humor (Dev. Pessoal): quem
 * chama decide a cor de cada célula, o componente só desenha a grade.
 */
export function MonthHeatmap({
  monthDate,
  getCellColor,
  selectedDate,
  onSelectDate,
  disableFuture = true,
}: MonthHeatmapProps) {
  const { tokens } = useTheme();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = toDateString(new Date());

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateString(new Date(year, month, i + 1))),
  ];

  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
        {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
      </Text>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAY_HEADERS.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 10, color: tokens.textMuted }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          }
          const isFuture = dateStr > today;
          const isToday = dateStr === today;
          const isSelected = selectedDate === dateStr;
          const color = getCellColor(dateStr);
          const disabled = disableFuture && isFuture;

          return (
            <View key={dateStr} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <Pressable
                onPress={onSelectDate && !disabled ? () => onSelectDate(dateStr) : undefined}
                disabled={!onSelectDate || disabled}
                style={{
                  flex: 1,
                  borderRadius: 7,
                  backgroundColor: color ?? (isFuture ? "transparent" : tokens.surfaceAlt),
                  borderWidth: isToday || isSelected ? 1.5 : 0,
                  borderColor: isSelected ? tokens.accent : tokens.text,
                  opacity: isFuture ? 0.35 : 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 10,
                    color: color ? contrastTextColor(color) : tokens.textMuted,
                  }}
                >
                  {Number(dateStr.slice(-2))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
