import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { DetoxHabitCard } from "@/components/detox/detox-habit-card";
import { NewDetoxHabitForm } from "@/components/detox/new-detox-habit-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchDetox,
  createDetoxHabit,
  updateDetoxHabit,
  deleteDetoxHabit,
  logDetoxOccurrence,
  undoLastDetoxOccurrence,
  countToday,
  weeklyCountsForHabit,
  type DetoxHabitInput,
} from "@/lib/detox";

export default function DetoxScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showHabitForm, setShowHabitForm] = useState(false);

  const query = useQuery({
    queryKey: ["detox", userId],
    queryFn: fetchDetox,
    enabled: !!userId,
  });
  const habits = query.data?.habits ?? [];
  const logs = query.data?.logs ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["detox", userId] });
  }

  const createHabitMutation = useMutation({
    mutationFn: (input: DetoxHabitInput) => createDetoxHabit(userId!, input),
    onSuccess: () => {
      setShowHabitForm(false);
      invalidate();
    },
  });
  const updateHabitMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DetoxHabitInput }) => updateDetoxHabit(id, input),
    onSuccess: () => {
      setEditingHabitId(null);
      invalidate();
    },
  });
  const deleteHabitMutation = useMutation({
    mutationFn: (id: string) => deleteDetoxHabit(id),
    onSuccess: invalidate,
  });

  function handleDeleteHabit(habitId: string) {
    if (editingHabitId === habitId) setEditingHabitId(null);
    deleteHabitMutation.mutate(habitId);
  }

  const logMutation = useMutation({
    mutationFn: (habitId: string) => logDetoxOccurrence(userId!, habitId),
    onSuccess: invalidate,
  });
  const undoMutation = useMutation({
    mutationFn: (habitId: string) => undoLastDetoxOccurrence(habitId),
    onSuccess: invalidate,
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🌿</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Detox</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Hábitos que você quer reduzir, eliminar ou só acompanhar.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados de Detox agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {habits.length === 0 && !showHabitForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum hábito cadastrado ainda.
              </Text>
            ) : null}

            {habits.map((habit) => (
              <DetoxHabitCard
                key={habit.id}
                habit={habit}
                todayCount={countToday(logs, habit.id)}
                weeklyCounts={weeklyCountsForHabit(logs, habit.id)}
                onLogOccurrence={() => logMutation.mutate(habit.id)}
                isLogging={logMutation.isPending && logMutation.variables === habit.id}
                onUndo={() => undoMutation.mutate(habit.id)}
                isUndoing={undoMutation.isPending && undoMutation.variables === habit.id}
                isEditing={editingHabitId === habit.id}
                onStartEdit={() => setEditingHabitId(habit.id)}
                onCancelEdit={() => setEditingHabitId(null)}
                onUpdate={(input) => updateHabitMutation.mutate({ id: habit.id, input })}
                isSaving={updateHabitMutation.isPending}
                onDelete={() => handleDeleteHabit(habit.id)}
              />
            ))}

            {showHabitForm ? (
              <NewDetoxHabitForm
                isSaving={createHabitMutation.isPending}
                onCancel={() => setShowHabitForm(false)}
                onSubmit={(input) => createHabitMutation.mutate(input)}
              />
            ) : (
              <Pressable
                onPress={() => setShowHabitForm(true)}
                style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo hábito</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
