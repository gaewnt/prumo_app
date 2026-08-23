import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { HabitRow } from "@/components/rotina/habit-row";
import { NewHabitForm } from "@/components/rotina/new-habit-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchHabitsWithLogs,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitToday,
  computeWeeklyCompletion,
  dayCompletionRatio,
  type Habit,
} from "@/lib/rotina";

export default function RotinaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showForm, setShowForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [pendingHabitId, setPendingHabitId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const habitsQuery = useQuery({
    queryKey: ["rotina", "habits", userId],
    queryFn: fetchHabitsWithLogs,
    enabled: !!userId,
  });
  const habits = habitsQuery.data?.habits ?? [];
  const logs = habitsQuery.data?.logs ?? [];

  const createMutation = useMutation({
    mutationFn: ({ name, activeDays }: { name: string; activeDays: number[] }) =>
      createHabit(userId!, name, activeDays),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["rotina", "habits", userId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, activeDays }: { id: string; name: string; activeDays: number[] }) =>
      updateHabit(id, name, activeDays),
    onSuccess: () => {
      setEditingHabitId(null);
      queryClient.invalidateQueries({ queryKey: ["rotina", "habits", userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (habitId: string) => deleteHabit(habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rotina", "habits", userId] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habit, isCurrentlyDone }: { habit: Habit; isCurrentlyDone: boolean }) =>
      toggleHabitToday(userId!, habit, isCurrentlyDone),
    onMutate: ({ habit }) => {
      setPendingHabitId(habit.id);
      setToggleErrors((prev) => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
    },
    onError: (error: any, { habit }) => {
      setToggleErrors((prev) => ({
        ...prev,
        [habit.id]: error?.message ?? "Não deu pra atualizar esse hábito agora. Tente de novo.",
      }));
    },
    onSettled: () => {
      setPendingHabitId(null);
      queryClient.invalidateQueries({ queryKey: ["rotina", "habits", userId] });
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>📅</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Rotina
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Hábitos diários, streaks e consistência.
          </Text>
        </View>

        {habitsQuery.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : habitsQuery.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus hábitos agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 20 }}>
            {habits.length > 0 ? (
              <View style={{ gap: 16 }}>
                {(() => {
                  const { done, possible } = computeWeeklyCompletion(habits, logs);
                  const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
                  return (
                    <StatCard
                      label="Essa semana"
                      value={`${done} de ${possible} dias`}
                      deltaLabel={possible > 0 ? `${pct}%` : undefined}
                      deltaTone={pct >= 70 ? "positive" : pct >= 40 ? "neutral" : "negative"}
                    />
                  );
                })()}
                <MonthHeatmap
                  monthDate={new Date()}
                  getCellColor={(dateStr) => {
                    const ratio = dayCompletionRatio(dateStr, habits, logs);
                    if (ratio === null) return null;
                    if (ratio >= 1) return tokens.accent;
                    if (ratio > 0) return tokens.accentMuted;
                    return tokens.surfaceAlt;
                  }}
                />
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
            {habits.length === 0 && !showForm ? (
              <View
                style={{
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 14,
                  padding: 16,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                  Nenhum hábito ainda
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Adicione o primeiro pra começar a acompanhar sua consistência.
                </Text>
              </View>
            ) : null}

            {habits.map((habit) =>
              editingHabitId === habit.id ? (
                <NewHabitForm
                  key={habit.id}
                  initial={{ name: habit.name, activeDays: habit.active_days }}
                  submitLabel="Salvar alterações"
                  isSaving={updateMutation.isPending}
                  onCancel={() => setEditingHabitId(null)}
                  onSubmit={(name, activeDays) =>
                    updateMutation.mutate({ id: habit.id, name, activeDays })
                  }
                />
              ) : (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  logs={logs}
                  isToggling={pendingHabitId === habit.id}
                  toggleError={toggleErrors[habit.id]}
                  onToggleToday={() => {
                    const isCurrentlyDone = logs.some(
                      (l) => l.habit_id === habit.id && l.completed
                    );
                    toggleMutation.mutate({ habit, isCurrentlyDone });
                  }}
                  onEdit={() => setEditingHabitId(habit.id)}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                />
              )
            )}

            {showForm ? (
              <NewHabitForm
                isSaving={createMutation.isPending}
                onCancel={() => setShowForm(false)}
                onSubmit={(name, activeDays) => createMutation.mutate({ name, activeDays })}
              />
            ) : (
              <Pressable
                onPress={() => setShowForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo hábito
                </Text>
              </Pressable>
            )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
