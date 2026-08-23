import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewWorkoutForm } from "@/components/treino/new-workout-form";
import { NewExerciseForm } from "@/components/treino/new-exercise-form";
import { WEEKDAY_NAMES, type Workout, type Exercise } from "@/lib/treino";

type ExerciseInput = { name: string; sets: number; reps: number; loadLabel: string };
type WorkoutInput = { name: string; dayOfWeek: number };

type WorkoutCardProps = {
  workout: Workout;
  exercises: Exercise[];

  // Criar exercício novo
  showExerciseForm: boolean;
  onToggleExerciseForm: () => void;
  onAddExercise: (input: ExerciseInput) => void;
  isAddingExercise: boolean;

  // Editar/excluir o treino em si (nome, dia da semana)
  isEditingWorkout: boolean;
  onStartEditWorkout: () => void;
  onCancelEditWorkout: () => void;
  onUpdateWorkout: (input: WorkoutInput) => void;
  isSavingWorkout: boolean;
  onDeleteWorkout: () => void;

  // Editar/excluir um exercício existente
  editingExerciseId: string | null;
  onStartEditExercise: (id: string) => void;
  onCancelEditExercise: () => void;
  onUpdateExercise: (id: string, input: ExerciseInput) => void;
  isSavingExercise: boolean;
  onDeleteExercise: (id: string) => void;
};

export function WorkoutCard({
  workout,
  exercises,
  showExerciseForm,
  onToggleExerciseForm,
  onAddExercise,
  isAddingExercise,
  isEditingWorkout,
  onStartEditWorkout,
  onCancelEditWorkout,
  onUpdateWorkout,
  isSavingWorkout,
  onDeleteWorkout,
  editingExerciseId,
  onStartEditExercise,
  onCancelEditExercise,
  onUpdateExercise,
  isSavingExercise,
  onDeleteExercise,
}: WorkoutCardProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      {isEditingWorkout ? (
        <NewWorkoutForm
          initial={{ name: workout.name, dayOfWeek: workout.day_of_week }}
          submitLabel="Salvar alterações"
          isSaving={isSavingWorkout}
          onCancel={onCancelEditWorkout}
          onSubmit={onUpdateWorkout}
        />
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
              {workout.name}
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {WEEKDAY_NAMES[workout.day_of_week]}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={onStartEditWorkout} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>
                Editar
              </Text>
            </Pressable>
            <Pressable onPress={onDeleteWorkout} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Excluir treino
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {exercises.length > 0 ? (
        <View style={{ gap: 8 }}>
          {exercises.map((exercise) =>
            editingExerciseId === exercise.id ? (
              <NewExerciseForm
                key={exercise.id}
                initial={{
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  loadLabel: exercise.load_label ?? "",
                }}
                submitLabel="Salvar alterações"
                isSaving={isSavingExercise}
                onCancel={onCancelEditExercise}
                onSubmit={(input) => onUpdateExercise(exercise.id, input)}
              />
            ) : (
              <View
                key={exercise.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
                    {exercise.name}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    {exercise.sets}x{exercise.reps}
                    {exercise.load_label ? ` · ${exercise.load_label}` : ""}
                  </Text>
                </View>
                <Pressable onPress={() => onStartEditExercise(exercise.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>
                    Editar
                  </Text>
                </Pressable>
                <Pressable onPress={() => onDeleteExercise(exercise.id)} hitSlop={8}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      ) : !showExerciseForm ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
          Nenhum exercício ainda.
        </Text>
      ) : null}

      {showExerciseForm ? (
        <NewExerciseForm
          isSaving={isAddingExercise}
          onCancel={onToggleExerciseForm}
          onSubmit={onAddExercise}
        />
      ) : (
        <Pressable onPress={onToggleExerciseForm} style={{ paddingVertical: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
            + Exercício
          </Text>
        </Pressable>
      )}
    </View>
  );
}
