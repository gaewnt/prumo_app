import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MotivationRow } from "@/components/dev-pessoal/motivation-row";
import { NewMotivationForm } from "@/components/dev-pessoal/new-motivation-form";
import { LevelCard } from "@/components/dev-pessoal/level-card";
import { GoalCard } from "@/components/dev-pessoal/goal-card";
import { NewGoalForm } from "@/components/dev-pessoal/new-goal-form";
import { JournalEntryRow } from "@/components/dev-pessoal/journal-entry-row";
import { NewJournalForm } from "@/components/dev-pessoal/new-journal-form";
import { MoodStrip } from "@/components/dev-pessoal/mood-strip";
import { MoodDayForm } from "@/components/dev-pessoal/mood-day-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { toDateString } from "@/lib/rotina";
import {
  fetchDevPessoal,
  pickPhraseOfDay,
  computeGamification,
  deriveGoalStatus,
  createMotivation,
  updateMotivation,
  deleteMotivation,
  createGoal,
  updateGoal,
  toggleGoalCompleted,
  deleteGoal,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  upsertMoodLog,
  deleteMoodLog,
  type Goal,
} from "@/lib/dev-pessoal";

function formatDateLabel(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function DevPessoalScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showMotivationForm, setShowMotivationForm] = useState(false);
  const [editingMotivationId, setEditingMotivationId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [selectedMoodDate, setSelectedMoodDate] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["dev-pessoal", userId],
    queryFn: fetchDevPessoal,
    enabled: !!userId,
  });
  const motivations = query.data?.motivations ?? [];
  const goals = query.data?.goals ?? [];
  const journalEntries = query.data?.journalEntries ?? [];
  const moodLogs = query.data?.moodLogs ?? [];
  const phraseOfDay = pickPhraseOfDay(motivations);
  const gamification = computeGamification(goals, journalEntries, moodLogs);

  const overdueGoals = goals.filter((g) => deriveGoalStatus(g) === "overdue");
  const activeGoals = goals.filter((g) => deriveGoalStatus(g) === "active");
  const completedGoals = goals.filter((g) => deriveGoalStatus(g) === "completed");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["dev-pessoal", userId] });
  }

  // ---- Motivações ----
  const createMotivationMutation = useMutation({
    mutationFn: (label: string) => createMotivation(userId!, label, motivations.length),
    onSuccess: () => {
      setShowMotivationForm(false);
      invalidate();
    },
  });
  const updateMotivationMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateMotivation(id, label),
    onSuccess: () => {
      setEditingMotivationId(null);
      invalidate();
    },
  });
  const deleteMotivationMutation = useMutation({
    mutationFn: (id: string) => deleteMotivation(id),
    onSuccess: invalidate,
  });

  // ---- Metas ----
  const createGoalMutation = useMutation({
    mutationFn: (input: Parameters<typeof createGoal>[1]) => createGoal(userId!, input),
    onSuccess: () => {
      setShowGoalForm(false);
      invalidate();
    },
  });
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateGoal>[1] }) =>
      updateGoal(id, input),
    onSuccess: () => {
      setEditingGoalId(null);
      invalidate();
    },
  });
  const toggleGoalMutation = useMutation({
    mutationFn: ({ goal, isCompleted }: { goal: Goal; isCompleted: boolean }) =>
      toggleGoalCompleted(userId!, goal, isCompleted),
    onSuccess: invalidate,
  });
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: invalidate,
  });

  // ---- Diário ----
  const createJournalMutation = useMutation({
    mutationFn: ({ content, moodScore }: { content: string; moodScore: number | null }) =>
      createJournalEntry(userId!, content, moodScore),
    onSuccess: () => {
      setShowJournalForm(false);
      invalidate();
    },
  });
  const updateJournalMutation = useMutation({
    mutationFn: ({ id, content, moodScore }: { id: string; content: string; moodScore: number | null }) =>
      updateJournalEntry(id, content, moodScore),
    onSuccess: () => {
      setEditingJournalId(null);
      invalidate();
    },
  });
  const deleteJournalMutation = useMutation({
    mutationFn: (id: string) => deleteJournalEntry(id),
    onSuccess: invalidate,
  });

  // ---- Humor ----
  const saveMoodMutation = useMutation({
    mutationFn: ({ date, score, note }: { date: string; score: number; note: string }) =>
      upsertMoodLog(userId!, date, score, note),
    onSuccess: () => {
      setSelectedMoodDate(null);
      invalidate();
    },
  });
  const deleteMoodMutation = useMutation({
    mutationFn: (id: string) => deleteMoodLog(id),
    onSuccess: () => {
      setSelectedMoodDate(null);
      invalidate();
    },
  });

  const selectedMoodLog = selectedMoodDate ? moodLogs.find((l) => l.log_date === selectedMoodDate) : undefined;

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
          <Text style={{ fontSize: 32 }}>🌱</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Dev. Pessoal
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Motivação, metas, diário e humor.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Nível e XP */}
            <LevelCard gamification={gamification} />

            {/* Frase do dia */}
            {phraseOfDay ? (
              <View
                style={{
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 14,
                  padding: 16,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                  Frase do dia
                </Text>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  "{phraseOfDay.label}"
                </Text>
              </View>
            ) : null}

            {/* Humor */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Humor
              </Text>
              <MoodStrip
                logs={moodLogs}
                selectedDate={selectedMoodDate ?? toDateString(new Date())}
                onSelectDate={(date) => setSelectedMoodDate((current) => (current === date ? null : date))}
              />
              <MonthHeatmap
                monthDate={new Date()}
                selectedDate={selectedMoodDate}
                onSelectDate={(date) => setSelectedMoodDate((current) => (current === date ? null : date))}
                getCellColor={(dateStr) => {
                  const log = moodLogs.find((l) => l.log_date === dateStr);
                  if (!log) return null;
                  if (log.score <= 2) return tokens.danger;
                  if (log.score === 3) return tokens.warning;
                  return tokens.success;
                }}
              />
              {selectedMoodDate ? (
                <MoodDayForm
                  dateLabel={formatDateLabel(selectedMoodDate)}
                  existingLog={selectedMoodLog}
                  isSaving={saveMoodMutation.isPending || deleteMoodMutation.isPending}
                  onClose={() => setSelectedMoodDate(null)}
                  onSave={(score, note) => saveMoodMutation.mutate({ date: selectedMoodDate, score, note })}
                  onDelete={() => {
                    if (selectedMoodLog) deleteMoodMutation.mutate(selectedMoodLog.id);
                  }}
                />
              ) : null}
            </View>

            {/* Motivações */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Motivações
                </Text>
                <Pressable onPress={() => setShowMotivationForm((v) => !v)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showMotivationForm ? "Cancelar" : "+ Nova"}
                  </Text>
                </Pressable>
              </View>

              {showMotivationForm ? (
                <NewMotivationForm
                  isSaving={createMotivationMutation.isPending}
                  onCancel={() => setShowMotivationForm(false)}
                  onSubmit={(label) => createMotivationMutation.mutate(label)}
                />
              ) : null}

              {motivations.length === 0 && !showMotivationForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma motivação cadastrada ainda.
                </Text>
              ) : (
                <View
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  {motivations.map((m) => (
                    <MotivationRow
                      key={m.id}
                      motivation={m}
                      isEditing={editingMotivationId === m.id}
                      onStartEdit={() => setEditingMotivationId(m.id)}
                      onCancelEdit={() => setEditingMotivationId(null)}
                      onUpdate={(label) => updateMotivationMutation.mutate({ id: m.id, label })}
                      isSaving={updateMotivationMutation.isPending}
                      onDelete={() => deleteMotivationMutation.mutate(m.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Metas — agrupadas por situação (estilo Todoist: atrasado / em andamento / feito) */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Metas
                </Text>
                <Pressable onPress={() => setShowGoalForm((v) => !v)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showGoalForm ? "Cancelar" : "+ Nova"}
                  </Text>
                </Pressable>
              </View>

              {showGoalForm ? (
                <NewGoalForm
                  isSaving={createGoalMutation.isPending}
                  onCancel={() => setShowGoalForm(false)}
                  onSubmit={(input) => createGoalMutation.mutate(input)}
                />
              ) : null}

              {goals.length === 0 && !showGoalForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma meta cadastrada ainda.
                </Text>
              ) : (
                [
                  { key: "overdue", title: "Atrasadas", items: overdueGoals },
                  { key: "active", title: "Em andamento", items: activeGoals },
                  { key: "completed", title: "Concluídas", items: completedGoals },
                ].map((group) =>
                  group.items.length === 0 ? null : (
                    <View key={group.key} style={{ gap: 8 }}>
                      <Text
                        style={{
                          fontFamily: fontFamily.bodyMedium,
                          fontSize: 12,
                          letterSpacing: 0.4,
                          color: tokens.textMuted,
                        }}
                      >
                        {group.title.toUpperCase()} ({group.items.length})
                      </Text>
                      <View style={{ gap: 8 }}>
                        {group.items.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            isEditing={editingGoalId === goal.id}
                            onStartEdit={() => setEditingGoalId(goal.id)}
                            onCancelEdit={() => setEditingGoalId(null)}
                            onUpdate={(input) => updateGoalMutation.mutate({ id: goal.id, input })}
                            isSaving={updateGoalMutation.isPending}
                            onToggleCompleted={() =>
                              toggleGoalMutation.mutate({ goal, isCompleted: !!goal.completed_at })
                            }
                            isTogglingCompleted={toggleGoalMutation.isPending}
                            onDelete={() => deleteGoalMutation.mutate(goal.id)}
                          />
                        ))}
                      </View>
                    </View>
                  )
                )
              )}
            </View>

            {/* Diário */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Diário
                </Text>
                <Pressable onPress={() => setShowJournalForm((v) => !v)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showJournalForm ? "Cancelar" : "+ Nova entrada"}
                  </Text>
                </Pressable>
              </View>

              {showJournalForm ? (
                <NewJournalForm
                  isSaving={createJournalMutation.isPending}
                  onCancel={() => setShowJournalForm(false)}
                  onSubmit={(input) => createJournalMutation.mutate(input)}
                />
              ) : null}

              {journalEntries.length === 0 && !showJournalForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma entrada no diário ainda.
                </Text>
              ) : (
                journalEntries.map((entry) => (
                  <JournalEntryRow
                    key={entry.id}
                    entry={entry}
                    isEditing={editingJournalId === entry.id}
                    onStartEdit={() => setEditingJournalId(entry.id)}
                    onCancelEdit={() => setEditingJournalId(null)}
                    onUpdate={(input) => updateJournalMutation.mutate({ id: entry.id, ...input })}
                    isSaving={updateJournalMutation.isPending}
                    onDelete={() => deleteJournalMutation.mutate(entry.id)}
                  />
                ))
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
