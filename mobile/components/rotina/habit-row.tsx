import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  WEEKDAY_LABELS,
  computeStreak,
  streakMilestone,
  lastSevenDays,
  toDateString,
  type Habit,
  type HabitLog,
} from "@/lib/rotina";

type HabitRowProps = {
  habit: Habit;
  logs: HabitLog[];
  onToggleToday: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
  /** Mensagem de erro da última tentativa de marcar/desmarcar (se falhou). */
  toggleError?: string | null;
};

export function HabitRow({
  habit,
  logs,
  onToggleToday,
  onEdit,
  onDelete,
  isToggling,
  toggleError,
}: HabitRowProps) {
  const { tokens } = useTheme();
  const streak = computeStreak(logs, habit);
  const milestone = streakMilestone(streak);
  const doneDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.log_date)
  );
  const today = toDateString(new Date());
  const isDoneToday = doneDates.has(today);

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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {habit.name}
          </Text>
          {streak > 0 ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.warning }}>
              🔥 {streak} {streak === 1 ? "dia" : "dias"} seguidos
            </Text>
          ) : null}
          {milestone ? (
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: tokens.success }}>
              🏅 Marco de {milestone} dias batido!
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {lastSevenDays().map((date) => {
          const dateStr = toDateString(date);
          const dow = date.getDay();
          const isScheduled = habit.active_days.includes(dow);
          const isDone = doneDates.has(dateStr);
          const isToday = dateStr === today;
          // Hoje sempre pode ser marcado, mesmo se o hábito não estiver programado pra
          // repetir nesse dia da semana — não fazia sentido bloquear (o usuário pode
          // querer registrar mesmo assim). Dias passados continuam só informativos.
          const looksActive = isScheduled || isToday;

          const bg = isDone ? tokens.accent : looksActive ? tokens.surfaceAlt : "transparent";
          const border = isToday ? tokens.accent : tokens.border;

          return (
            <View key={dateStr} style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.textMuted }}>
                {WEEKDAY_LABELS[dow]}
              </Text>
              <Pressable
                onPress={isToday ? onToggleToday : undefined}
                disabled={!isToday || isToggling}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: bg,
                  borderWidth: looksActive ? 1.5 : 1,
                  borderColor: border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isToday && isToggling ? (
                  <ActivityIndicator size="small" color={isDone ? tokens.accentText : tokens.accent} />
                ) : isDone ? (
                  <Text style={{ fontSize: 13, color: tokens.accentText }}>✓</Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {!isDoneToday ? (
        <Pressable
          onPress={onToggleToday}
          disabled={isToggling}
          style={{
            backgroundColor: tokens.accentMuted,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            opacity: isToggling ? 0.6 : 1,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            Marcar feito hoje
          </Text>
        </Pressable>
      ) : null}

      {toggleError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.danger }}>
          {toggleError}
        </Text>
      ) : null}
    </View>
  );
}
