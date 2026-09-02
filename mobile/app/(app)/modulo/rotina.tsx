import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { ModuleTabs } from "@/components/ui/module-tabs";
import { HabitRow } from "@/components/rotina/habit-row";
import { NewHabitForm } from "@/components/rotina/new-habit-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchHabitsWithLogs,
  fetchHabitLogsForMonth,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitOnDate,
  computeWeeklyCompletion,
  dayCompletionRatio,
  type Habit,
} from "@/lib/rotina";
import { RelacoesContent } from "./relacoes";

const TABS = [
  { key: "rotina", label: "Hábitos" },
  { key: "relacoes", label: "Relações" },
];

/** Conteúdo de Rotina (hábitos) — usado tanto na rota própria quanto como aba dentro do hub Rotina. */
export function RotinaContent() {
  const { tokens } = useTheme();
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

  // Histórico de meses anteriores — o mês atual reaproveita `logs` (já vem
  // na busca de sempre); só busca de novo quando a pessoa navega pra outro mês no MonthHeatmap.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentHistoryMonth =
    historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();
  const historyLogsQuery = useQuery({
    queryKey: ["rotina", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchHabitLogsForMonth(historyMonth),
    enabled: !!userId && !isCurrentHistoryMonth,
  });
  const heatmapLogs = isCurrentHistoryMonth ? logs : historyLogsQuery.data ?? [];

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

  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: ({ habit, dateStr, isCurrentlyDone }: { habit: Habit; dateStr: string; isCurrentlyDone: boolean }) =>
      toggleHabitOnDate(userId!, habit, dateStr, isCurrentlyDone),
    onMutate: ({ habit, dateStr }) => {
      setPendingHabitId(habit.id);
      setPendingDate(dateStr);
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
      setPendingDate(null);
      queryClient.invalidateQueries({ queryKey: ["rotina", "habits", userId] });
    },
  });

  return (
    <View style={{ gap: 20 }}>
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
              <View style={{ gap: 8 }}>
                <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
                <MonthHeatmap
                  monthDate={historyMonth}
                  showMonthLabel={false}
                  getCellColor={(dateStr) => {
                    const ratio = dayCompletionRatio(dateStr, habits, heatmapLogs);
                    if (ratio === null) return null;
                    if (ratio >= 1) return tokens.accent;
                    if (ratio > 0) return tokens.accentMuted;
                    return tokens.surfaceAlt;
                  }}
                />
              </View>
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
                pendingDate={pendingHabitId === habit.id ? pendingDate : null}
                toggleError={toggleErrors[habit.id]}
                onToggleDate={(dateStr) => {
                  // Bug corrigido: antes checava se o hábito JÁ tinha sido feito em
                  // qualquer dia do histórico (~34 dias), não só no dia certo — então,
                  // se ele tivesse sido concluído ontem mas não nesse dia, tocar mandava
                  // `isCurrentlyDone: true` e a função ia direto pro ramo de "desmarcar"
                  // (apagar um log que nem existia ainda), sem nunca criar o log do dia.
                  // Precisa filtrar pela data específica sendo tocada.
                  const isCurrentlyDone = logs.some(
                    (l) => l.habit_id === habit.id && l.completed && l.log_date === dateStr
                  );
                  toggleMutation.mutate({ habit, dateStr, isCurrentlyDone });
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
  );
}

export default function RotinaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        {/* Sem cabeçalho próprio aqui — cada aba (`RotinaContent`/`RelacoesContent`) já
           mostra seu próprio ícone/título/descrição, então um segundo cabeçalho fixo do
           hub só duplicava a mesma informação. */}
        <ModuleTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <View style={{ marginTop: 16 }}>
          {activeTab === "relacoes" ? <RelacoesContent /> : <RotinaContent />}
        </View>
      </View>
    </Screen>
  );
}
