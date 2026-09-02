import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { GoalRow } from "@/components/financas/goal-row";
import { NewGoalForm } from "@/components/financas/new-goal-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancasExtras,
  createGoal,
  updateGoal,
  contributeToGoal,
  setGoalCompleted,
  deleteGoal,
} from "@/lib/financas";

export default function FinancasMetasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });
  const goals = query.data?.goals ?? [];
  const activeGoals = goals.filter((g) => !g.completed_at);
  const completedGoals = goals.filter((g) => g.completed_at);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createGoal>[1]) => createGoal(userId!, input),
    onSuccess: () => {
      setOpenForm(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateGoal>[1] }) =>
      updateGoal(id, input),
    onSuccess: () => {
      setEditingGoalId(null);
      invalidate();
    },
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, currentAmount, addAmount }: { id: string; currentAmount: number; addAmount: number }) =>
      contributeToGoal(id, currentAmount, addAmount),
    onMutate: ({ id }) => setContributingGoalId(id),
    onSettled: () => {
      setContributingGoalId(null);
      invalidate();
    },
  });

  const toggleCompletedMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setGoalCompleted(id, completed),
    onMutate: ({ id }) => setSavingGoalId(id),
    onSettled: () => {
      setSavingGoalId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onMutate: (id) => setSavingGoalId(id),
    onSettled: () => {
      setSavingGoalId(null);
      invalidate();
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
          <Text style={{ fontSize: 32 }}>🎯</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Metas financeiras
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Separe um valor até chegar lá.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Suas metas
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm((v) => !v)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm ? "Cancelar" : "+ Nova meta"}
                  </Text>
                </Pressable>
              </View>

              {openForm ? (
                <NewGoalForm
                  isSaving={createMutation.isPending}
                  onCancel={() => setOpenForm(false)}
                  onSubmit={(input) => createMutation.mutate(input)}
                />
              ) : null}

              {activeGoals.length === 0 && !openForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma meta ativa ainda.
                </Text>
              ) : (
                activeGoals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    isSaving={savingGoalId === g.id}
                    isEditing={editingGoalId === g.id}
                    onStartEdit={() => setEditingGoalId(g.id)}
                    onCancelEdit={() => setEditingGoalId(null)}
                    onUpdate={(input) => updateMutation.mutate({ id: g.id, input })}
                    isUpdating={updateMutation.isPending && editingGoalId === g.id}
                    onContribute={(amount) =>
                      contributeMutation.mutate({ id: g.id, currentAmount: g.current_amount, addAmount: amount })
                    }
                    isContributing={contributingGoalId === g.id && contributeMutation.isPending}
                    onToggleCompleted={() => toggleCompletedMutation.mutate({ id: g.id, completed: true })}
                    onDelete={() => deleteMutation.mutate(g.id)}
                  />
                ))
              )}
            </View>

            {completedGoals.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Concluídas
                </Text>
                {completedGoals.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    isSaving={savingGoalId === g.id}
                    isEditing={editingGoalId === g.id}
                    onStartEdit={() => setEditingGoalId(g.id)}
                    onCancelEdit={() => setEditingGoalId(null)}
                    onUpdate={(input) => updateMutation.mutate({ id: g.id, input })}
                    isUpdating={updateMutation.isPending && editingGoalId === g.id}
                    onContribute={(amount) =>
                      contributeMutation.mutate({ id: g.id, currentAmount: g.current_amount, addAmount: amount })
                    }
                    isContributing={contributingGoalId === g.id && contributeMutation.isPending}
                    onToggleCompleted={() => toggleCompletedMutation.mutate({ id: g.id, completed: false })}
                    onDelete={() => deleteMutation.mutate(g.id)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
