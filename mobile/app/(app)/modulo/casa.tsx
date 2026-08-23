import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { NewShoppingItemForm } from "@/components/casa/new-shopping-item-form";
import { ShoppingItemRow } from "@/components/casa/shopping-item-row";
import { HomeTaskRow } from "@/components/casa/home-task-row";
import { NewHomeTaskForm } from "@/components/casa/new-home-task-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchCasa,
  createShoppingItem,
  updateShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedShoppingItems,
  createHomeTask,
  updateHomeTask,
  deleteHomeTask,
  toggleHomeTaskToday,
  computeTodayTasks,
  computeWeeklyTaskCompletion,
} from "@/lib/casa";

export default function CasaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["casa", userId],
    queryFn: fetchCasa,
    enabled: !!userId,
  });
  const shoppingItems = query.data?.shoppingItems ?? [];
  const tasks = query.data?.tasks ?? [];
  const taskLogs = query.data?.taskLogs ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["casa", userId] });
  }

  const pendingItems = shoppingItems.filter((i) => !i.checked);
  const checkedItems = shoppingItems.filter((i) => i.checked);
  const todayTasks = computeTodayTasks(tasks, taskLogs);
  const weeklyTasks = computeWeeklyTaskCompletion(tasks, taskLogs);

  // Junta com `tasks` inteiro (não só as ativas) pra tarefas pausadas continuarem
  // editáveis/reativáveis na seção "não programadas", em vez de sumirem da tela.
  const taskEntries = tasks.map((t) => {
    const entry = todayTasks.find((d) => d.task.id === t.id);
    return { task: t, scheduled: entry?.scheduled ?? false, done: entry?.done ?? false };
  });
  const scheduledEntries = taskEntries.filter((e) => e.scheduled);
  const unscheduledEntries = taskEntries.filter((e) => !e.scheduled);
  const doneTodayCount = scheduledEntries.filter((e) => e.done).length;

  const createItemMutation = useMutation({
    mutationFn: ({ name, quantity }: { name: string; quantity: string }) =>
      createShoppingItem(userId!, name, quantity),
    onSuccess: invalidate,
  });
  const updateItemMutation = useMutation({
    mutationFn: ({ id, name, quantity }: { id: string; name: string; quantity: string }) =>
      updateShoppingItem(id, name, quantity),
    onSuccess: () => {
      setEditingItemId(null);
      invalidate();
    },
  });
  const toggleItemMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) => toggleShoppingItem(id, checked),
    onSuccess: invalidate,
  });
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => deleteShoppingItem(id),
    onSuccess: invalidate,
  });
  const clearCheckedMutation = useMutation({
    mutationFn: () => clearCheckedShoppingItems(userId!),
    onSuccess: invalidate,
  });

  const createTaskMutation = useMutation({
    mutationFn: (input: { title: string; activeDays: number[]; notes: string; active: boolean }) =>
      createHomeTask(userId!, input.title, input.activeDays, input.notes),
    onSuccess: () => {
      setShowTaskForm(false);
      invalidate();
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateHomeTask>[1] }) =>
      updateHomeTask(id, input),
    onSuccess: () => {
      setEditingTaskId(null);
      invalidate();
    },
  });
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteHomeTask(id),
    onSuccess: invalidate,
  });
  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleHomeTaskToday(userId!, id, done),
    onMutate: ({ id }) => setPendingTaskId(id),
    onSettled: () => setPendingTaskId(null),
    onSuccess: invalidate,
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
          <Text style={{ fontSize: 32 }}>🏠</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Casa</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Lista de compras e as tarefas domésticas que se repetem toda semana.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar sua Casa agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Lista de compras
                </Text>
                {checkedItems.length > 0 ? (
                  <Pressable onPress={() => clearCheckedMutation.mutate()} hitSlop={8}>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                      Limpar concluídos · {checkedItems.length}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <NewShoppingItemForm
                isSaving={createItemMutation.isPending}
                onSubmit={(name, quantity) => createItemMutation.mutate({ name, quantity })}
              />

              {shoppingItems.length === 0 ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Lista vazia — adicione o que está faltando.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {[...pendingItems, ...checkedItems].map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      isEditing={editingItemId === item.id}
                      onStartEdit={() => setEditingItemId(item.id)}
                      onCancelEdit={() => setEditingItemId(null)}
                      onUpdate={(name, quantity) => updateItemMutation.mutate({ id: item.id, name, quantity })}
                      onToggleChecked={() => toggleItemMutation.mutate({ id: item.id, checked: !item.checked })}
                      onDelete={() => deleteItemMutation.mutate(item.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Tarefas de hoje
              </Text>

              {scheduledEntries.length > 0 ? (
                <StatCard
                  label="Tarefas cumpridas — últimos 7 dias"
                  value={`${doneTodayCount} de ${scheduledEntries.length} hoje`}
                >
                  <WeeklyBarChart data={weeklyTasks} highlightIndex={6} />
                </StatCard>
              ) : null}

              {tasks.length === 0 && !showTaskForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma tarefa cadastrada ainda.
                </Text>
              ) : null}

              {tasks.length > 0 && scheduledEntries.length === 0 ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nada programado pra hoje.
                </Text>
              ) : null}

              {scheduledEntries.map(({ task, done }) => (
                <HomeTaskRow
                  key={task.id}
                  task={task}
                  doneToday={done}
                  isEditing={editingTaskId === task.id}
                  onStartEdit={() => setEditingTaskId(task.id)}
                  onCancelEdit={() => setEditingTaskId(null)}
                  onUpdate={(input) => updateTaskMutation.mutate({ id: task.id, input })}
                  isSaving={updateTaskMutation.isPending}
                  onDelete={() => deleteTaskMutation.mutate(task.id)}
                  onToggleToday={() => toggleTaskMutation.mutate({ id: task.id, done })}
                  isToggling={pendingTaskId === task.id}
                />
              ))}

              {unscheduledEntries.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    Não programadas pra hoje
                  </Text>
                  {unscheduledEntries.map(({ task, done }) => (
                    <HomeTaskRow
                      key={task.id}
                      task={task}
                      doneToday={done}
                      isEditing={editingTaskId === task.id}
                      onStartEdit={() => setEditingTaskId(task.id)}
                      onCancelEdit={() => setEditingTaskId(null)}
                      onUpdate={(input) => updateTaskMutation.mutate({ id: task.id, input })}
                      isSaving={updateTaskMutation.isPending}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                      onToggleToday={() => toggleTaskMutation.mutate({ id: task.id, done })}
                      isToggling={pendingTaskId === task.id}
                    />
                  ))}
                </View>
              ) : null}

              {showTaskForm ? (
                <NewHomeTaskForm
                  isSaving={createTaskMutation.isPending}
                  onCancel={() => setShowTaskForm(false)}
                  onSubmit={(input) => createTaskMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowTaskForm(true)}
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
                    + Nova tarefa
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
