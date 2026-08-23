import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { BalanceLineChart } from "@/components/charts/balance-line-chart";
import { ExerciseChecklistItem } from "@/components/treino/exercise-checklist-item";
import { WorkoutCard } from "@/components/treino/workout-card";
import { NewWorkoutForm } from "@/components/treino/new-workout-form";
import { WeightCheckin } from "@/components/treino/weight-checkin";
import { NewGoalForm } from "@/components/treino/new-goal-form";
import { GoalCard } from "@/components/treino/goal-card";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchTreino,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  createExercise,
  updateExercise,
  deleteExercise,
  toggleExerciseCompletion,
  computeWeeklySetsCompleted,
  logBodyWeight,
  updateProfileHeight,
  computeWeightDelta,
  createTrainingGoal,
  updateTrainingGoal,
  updateGoalManualProgress,
  deleteTrainingGoal,
  WEEKDAY_NAMES,
  type Workout,
  type Exercise,
  type TrainingGoalInput,
} from "@/lib/treino";
import { fetchModulePreference } from "@/lib/onboarding";

export default function TreinoScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [addingExerciseWorkoutId, setAddingExerciseWorkoutId] = useState<string | null>(null);
  const [togglingExerciseId, setTogglingExerciseId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["treino", userId],
    queryFn: fetchTreino,
    enabled: !!userId,
  });
  const workouts = query.data?.workouts ?? [];
  const exercises = query.data?.exercises ?? [];
  const todayLogs = query.data?.todayLogs ?? [];
  const weekLogs = query.data?.weekLogs ?? [];
  const bodyLogs = query.data?.bodyLogs ?? [];
  const goals = query.data?.goals ?? [];
  const heightCm = query.data?.heightCm ?? null;

  const prefsQuery = useQuery({
    queryKey: ["treino-prefs", userId],
    queryFn: () => fetchModulePreference("treino"),
    enabled: !!userId,
  });
  const objetivos = (prefsQuery.data?.objetivos as string[] | undefined) ?? [];

  const today = new Date().getDay();
  const todaysWorkouts = workouts.filter((w) => w.day_of_week === today);

  function exercisesFor(workoutId: string) {
    return exercises.filter((e) => e.workout_id === workoutId);
  }
  function logFor(workoutId: string) {
    return todayLogs.find((l) => l.workout_id === workoutId);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["treino", userId] });
  }

  const createWorkoutMutation = useMutation({
    mutationFn: (input: Parameters<typeof createWorkout>[1]) => createWorkout(userId!, input),
    onSuccess: () => {
      setShowWorkoutForm(false);
      invalidate();
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateWorkout>[1] }) =>
      updateWorkout(id, input),
    onSuccess: () => {
      setEditingWorkoutId(null);
      invalidate();
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onSuccess: invalidate,
  });

  const createExerciseMutation = useMutation({
    mutationFn: ({
      workoutId,
      input,
      position,
    }: {
      workoutId: string;
      input: Parameters<typeof createExercise>[2];
      position: number;
    }) => createExercise(userId!, workoutId, input, position),
    onSuccess: () => {
      setAddingExerciseWorkoutId(null);
      invalidate();
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateExercise>[1] }) =>
      updateExercise(id, input),
    onSuccess: () => {
      setEditingExerciseId(null);
      invalidate();
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: invalidate,
  });

  const toggleExerciseMutation = useMutation({
    mutationFn: ({ workout, exercise }: { workout: Workout; exercise: Exercise }) =>
      toggleExerciseCompletion(userId!, workout, exercisesFor(workout.id), logFor(workout.id), exercise),
    onMutate: ({ exercise }) => setTogglingExerciseId(exercise.id),
    onSettled: () => {
      setTogglingExerciseId(null);
      invalidate();
    },
  });

  const logWeightMutation = useMutation({
    mutationFn: (weightKg: number) => logBodyWeight(userId!, weightKg),
    onSuccess: invalidate,
  });

  const updateHeightMutation = useMutation({
    mutationFn: (cm: number) => updateProfileHeight(userId!, cm),
    onSuccess: invalidate,
  });

  const createGoalMutation = useMutation({
    mutationFn: (input: TrainingGoalInput) => createTrainingGoal(userId!, input),
    onSuccess: () => {
      setShowGoalForm(false);
      invalidate();
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TrainingGoalInput }) => updateTrainingGoal(id, input),
    onSuccess: () => {
      setEditingGoalId(null);
      invalidate();
    },
  });

  const updateGoalProgressMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => updateGoalManualProgress(id, value),
    onSuccess: invalidate,
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => deleteTrainingGoal(id),
    onSuccess: invalidate,
  });

  const weeklySets = computeWeeklySetsCompleted(weekLogs, exercises);
  const weeklySetsTotal = weeklySets.reduce((sum, d) => sum + d.value, 0);
  const weightDelta = computeWeightDelta(bodyLogs);
  const latestWeightKg = weightDelta?.latestKg ?? null;

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
          <Text style={{ fontSize: 32 }}>💪</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Treino
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Treino do dia, desempenho e evolução.
          </Text>
          {objetivos.length > 0 ? (
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent, marginTop: 2 }}>
              Seu foco: {objetivos.join(", ")}
            </Text>
          ) : null}
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus treinos agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 20 }}>
            <WeightCheckin
              latestWeightKg={latestWeightKg}
              latestWeightDate={weightDelta?.logDate ?? null}
              heightCm={heightCm}
              onLogWeight={(kg) => logWeightMutation.mutate(kg)}
              isLoggingWeight={logWeightMutation.isPending}
              onUpdateHeight={(cm) => updateHeightMutation.mutate(cm)}
              isSavingHeight={updateHeightMutation.isPending}
            />

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Treino de hoje · {WEEKDAY_NAMES[today]}
              </Text>

              {todaysWorkouts.length === 0 ? (
                <View
                  style={{
                    backgroundColor: tokens.surfaceAlt,
                    borderRadius: 14,
                    padding: 16,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                    Sem treino marcado pra hoje
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                    Dia de descanso, ou você ainda não cadastrou um treino pra {WEEKDAY_NAMES[today]}.
                  </Text>
                </View>
              ) : (
                todaysWorkouts.map((workout) => {
                  const workoutExercises = exercisesFor(workout.id);
                  const log = logFor(workout.id);
                  const doneCount = workoutExercises.filter((e) =>
                    (log?.completed_exercise_ids ?? []).includes(e.id)
                  ).length;
                  const allDone = workoutExercises.length > 0 && doneCount === workoutExercises.length;

                  return (
                    <View
                      key={workout.id}
                      style={{
                        backgroundColor: tokens.surface,
                        borderColor: allDone ? tokens.success : tokens.border,
                        borderWidth: 1,
                        borderRadius: 14,
                        padding: 14,
                        gap: 4,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                          {workout.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: fontFamily.bodyMedium,
                            fontSize: 12,
                            color: allDone ? tokens.success : tokens.textMuted,
                          }}
                        >
                          {allDone ? "Concluído ✓" : `${doneCount}/${workoutExercises.length}`}
                        </Text>
                      </View>

                      {workoutExercises.length === 0 ? (
                        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                          Nenhum exercício cadastrado — adicione em "Sua semana" abaixo.
                        </Text>
                      ) : (
                        workoutExercises.map((exercise) => (
                          <ExerciseChecklistItem
                            key={exercise.id}
                            exercise={exercise}
                            isDone={(log?.completed_exercise_ids ?? []).includes(exercise.id)}
                            isToggling={togglingExerciseId === exercise.id}
                            onToggle={() => toggleExerciseMutation.mutate({ workout, exercise })}
                          />
                        ))
                      )}
                    </View>
                  );
                })
              )}
            </View>

            <StatCard
              label="Séries concluídas essa semana"
              value={String(weeklySetsTotal)}
              deltaLabel={weeklySets[6].value > 0 ? "Hoje ✓" : undefined}
              deltaTone="positive"
            >
              <WeeklyBarChart data={weeklySets} highlightIndex={6} />
            </StatCard>

            <StatCard
              label="Evolução de peso — últimos 30 dias"
              value={latestWeightKg ? `${latestWeightKg} kg` : "—"}
              deltaLabel={
                weightDelta && weightDelta.deltaKg !== 0
                  ? `${weightDelta.deltaKg > 0 ? "▲" : "▼"} ${Math.abs(weightDelta.deltaKg)} kg`
                  : undefined
              }
              deltaTone={
                weightDelta && weightDelta.deltaKg !== 0
                  ? weightDelta.deltaKg < 0
                    ? "positive"
                    : "neutral"
                  : "neutral"
              }
            >
              <BalanceLineChart points={bodyLogs.map((b) => b.weight_kg)} />
            </StatCard>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Suas metas
                </Text>
                <Pressable onPress={() => setShowGoalForm((v) => !v)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showGoalForm ? "Cancelar" : "+ Nova meta"}
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
                  Nenhuma meta cadastrada ainda — pode ser peso, reps ou carga de um exercício.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      latestWeightKg={latestWeightKg}
                      isEditing={editingGoalId === goal.id}
                      onStartEdit={() => setEditingGoalId(goal.id)}
                      onCancelEdit={() => setEditingGoalId(null)}
                      onUpdate={(input) => updateGoalMutation.mutate({ id: goal.id, input })}
                      isSaving={updateGoalMutation.isPending}
                      onDelete={() => deleteGoalMutation.mutate(goal.id)}
                      onUpdateManualProgress={(value) =>
                        updateGoalProgressMutation.mutate({ id: goal.id, value })
                      }
                      isSavingProgress={updateGoalProgressMutation.isPending}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Sua semana
                </Text>
                <Pressable onPress={() => setShowWorkoutForm((v) => !v)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showWorkoutForm ? "Cancelar" : "+ Novo treino"}
                  </Text>
                </Pressable>
              </View>

              {showWorkoutForm ? (
                <NewWorkoutForm
                  isSaving={createWorkoutMutation.isPending}
                  onCancel={() => setShowWorkoutForm(false)}
                  onSubmit={(input) => createWorkoutMutation.mutate(input)}
                />
              ) : null}

              {workouts.length === 0 && !showWorkoutForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum treino cadastrado ainda.
                </Text>
              ) : (
                workouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    exercises={exercisesFor(workout.id)}
                    showExerciseForm={addingExerciseWorkoutId === workout.id}
                    onToggleExerciseForm={() =>
                      setAddingExerciseWorkoutId((current) => (current === workout.id ? null : workout.id))
                    }
                    isAddingExercise={createExerciseMutation.isPending}
                    onAddExercise={(input) =>
                      createExerciseMutation.mutate({
                        workoutId: workout.id,
                        input,
                        position: exercisesFor(workout.id).length,
                      })
                    }
                    isEditingWorkout={editingWorkoutId === workout.id}
                    onStartEditWorkout={() => setEditingWorkoutId(workout.id)}
                    onCancelEditWorkout={() => setEditingWorkoutId(null)}
                    onUpdateWorkout={(input) => updateWorkoutMutation.mutate({ id: workout.id, input })}
                    isSavingWorkout={updateWorkoutMutation.isPending}
                    onDeleteWorkout={() => deleteWorkoutMutation.mutate(workout.id)}
                    editingExerciseId={editingExerciseId}
                    onStartEditExercise={(id) => setEditingExerciseId(id)}
                    onCancelEditExercise={() => setEditingExerciseId(null)}
                    onUpdateExercise={(id, input) => updateExerciseMutation.mutate({ id, input })}
                    isSavingExercise={updateExerciseMutation.isPending}
                    onDeleteExercise={(id) => deleteExerciseMutation.mutate(id)}
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
