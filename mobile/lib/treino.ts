import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";

/**
 * Camada de dados do módulo Treino — treinos (um por dia da semana), exercícios
 * (séries/reps/carga), o checklist de conclusão do dia, e a evolução: peso
 * corporal (check-in antes do treino) e metas de treino.
 */

export type Workout = {
  id: string;
  name: string;
  day_of_week: number; // 0 = domingo … 6 = sábado, igual Rotina
};

export type Exercise = {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  load_label: string | null;
  position: number;
};

export type WorkoutLog = {
  workout_id: string;
  log_date: string; // YYYY-MM-DD
  completed_exercise_ids: string[];
};

export type BodyLog = {
  id: string;
  log_date: string;
  weight_kg: number;
};

export type GoalMetricType = "weight" | "custom";

export type TrainingGoal = {
  id: string;
  title: string;
  metric_type: GoalMetricType;
  start_value: number;
  target_value: number;
  current_value: number | null; // usado só quando metric_type === "custom"
  unit: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TrainingGoalInput = {
  title: string;
  metricType: GoalMetricType;
  startValue: number;
  targetValue: number;
  currentValue: number | null;
  unit: string;
  targetDate: string | null;
};

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export async function fetchTreino() {
  const today = toDateString(new Date());
  const weekStart = toDateString(new Date(Date.now() - 6 * 86400000));
  const bodyLogStart = toDateString(new Date(Date.now() - 29 * 86400000));

  const [workoutsRes, exercisesRes, logsRes, bodyLogsRes, goalsRes, profileRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, name, day_of_week")
      .order("day_of_week", { ascending: true }),
    supabase
      .from("exercises")
      .select("id, workout_id, name, sets, reps, load_label, position")
      .order("position", { ascending: true }),
    // Últimos 7 dias (não só hoje): dá pra desenhar "séries concluídas essa
    // semana" honestamente, sem inventar histórico que não existe.
    supabase
      .from("workout_logs")
      .select("workout_id, log_date, completed_exercise_ids")
      .gte("log_date", weekStart)
      .lte("log_date", today),
    supabase
      .from("body_logs")
      .select("id, log_date, weight_kg")
      .gte("log_date", bodyLogStart)
      .order("log_date", { ascending: true }),
    supabase
      .from("training_goals")
      .select("id, title, metric_type, start_value, target_value, current_value, unit, target_date, completed_at, created_at")
      .is("completed_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("height_cm").single(),
  ]);

  if (workoutsRes.error) throw workoutsRes.error;
  if (exercisesRes.error) throw exercisesRes.error;
  if (logsRes.error) throw logsRes.error;
  if (bodyLogsRes.error) throw bodyLogsRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (profileRes.error) throw profileRes.error;

  const weekLogs = (logsRes.data ?? []) as WorkoutLog[];

  return {
    workouts: (workoutsRes.data ?? []) as Workout[],
    exercises: (exercisesRes.data ?? []) as Exercise[],
    todayLogs: weekLogs.filter((l) => l.log_date === today),
    weekLogs,
    bodyLogs: (bodyLogsRes.data ?? []) as BodyLog[],
    goals: (goalsRes.data ?? []) as TrainingGoal[],
    heightCm: (profileRes.data?.height_cm as number | null | undefined) ?? null,
  };
}

export async function createWorkout(userId: string, input: { name: string; dayOfWeek: number }) {
  const { error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name: input.name, day_of_week: input.dayOfWeek });
  if (error) throw error;
}

export async function updateWorkout(id: string, input: { name: string; dayOfWeek: number }) {
  const { error } = await supabase
    .from("workouts")
    .update({ name: input.name, day_of_week: input.dayOfWeek })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWorkout(id: string) {
  // Exercícios e logs desse treino caem junto por causa do "on delete cascade" no schema.
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

export async function createExercise(
  userId: string,
  workoutId: string,
  input: { name: string; sets: number; reps: number; loadLabel: string },
  position: number
) {
  const { error } = await supabase.from("exercises").insert({
    user_id: userId,
    workout_id: workoutId,
    name: input.name,
    sets: input.sets,
    reps: input.reps,
    load_label: input.loadLabel || null,
    position,
  });
  if (error) throw error;
}

export async function updateExercise(
  id: string,
  input: { name: string; sets: number; reps: number; loadLabel: string }
) {
  const { error } = await supabase
    .from("exercises")
    .update({
      name: input.name,
      sets: input.sets,
      reps: input.reps,
      load_label: input.loadLabel || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Marca/desmarca um exercício no checklist de hoje. Grava em `module_events` só ao
 * concluir (não ao desmarcar) — mesmo padrão da Rotina — e, se essa marcação fechar
 * o treino inteiro, grava também um "workout_completed" (preparando a Fase 2: sugestão
 * de ajuste no cardápio baseada em dia de treino).
 */
export async function toggleExerciseCompletion(
  userId: string,
  workout: Workout,
  allWorkoutExercises: Exercise[],
  currentLog: WorkoutLog | undefined,
  exercise: Exercise
) {
  const today = toDateString(new Date());
  const currentIds = currentLog?.completed_exercise_ids ?? [];
  const isCurrentlyDone = currentIds.includes(exercise.id);
  const newIds = isCurrentlyDone
    ? currentIds.filter((id) => id !== exercise.id)
    : [...currentIds, exercise.id];

  const { error } = await supabase
    .from("workout_logs")
    .upsert(
      { workout_id: workout.id, user_id: userId, log_date: today, completed_exercise_ids: newIds },
      { onConflict: "workout_id,log_date" }
    );
  if (error) throw error;

  if (isCurrentlyDone) return;

  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "treino",
    event_type: "exercise_completed",
    payload: { workout_id: workout.id, workout_name: workout.name, exercise_name: exercise.name },
  });

  const allDone = allWorkoutExercises.every((e) => newIds.includes(e.id));
  if (allDone && allWorkoutExercises.length > 0) {
    await supabase.from("module_events").insert({
      user_id: userId,
      module_slug: "treino",
      event_type: "workout_completed",
      payload: { workout_id: workout.id, workout_name: workout.name },
    });
  }
}

/**
 * Séries concluídas por dia, últimos 7 dias — métrica de "desempenho" honesta,
 * calculada a partir do que já existe (checklist × séries do exercício), sem
 * depender do `load_label` livre (que mistura kg, placas etc e não dá pra somar).
 */
export function computeWeeklySetsCompleted(
  logs: WorkoutLog[],
  exercises: Exercise[],
  today = new Date()
) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day) => {
    const dateStr = toDateString(day);
    const value = logs
      .filter((l) => l.log_date === dateStr)
      .flatMap((l) => l.completed_exercise_ids)
      .reduce((sum, exId) => sum + (exerciseById.get(exId)?.sets ?? 0), 0);
    return { label: WEEKDAY_LABELS[day.getDay()], value };
  });
}

/** Peso mais recente registrado (qualquer data) — usado na tela "Editar perfil". */
export async function fetchLatestBodyLog() {
  const { data, error } = await supabase
    .from("body_logs")
    .select("id, log_date, weight_kg")
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BodyLog | null;
}

/** Registra (ou substitui) o peso do dia — upsert por (user_id, log_date). */
export async function logBodyWeight(userId: string, weightKg: number, date = toDateString(new Date())) {
  const { error } = await supabase
    .from("body_logs")
    .upsert({ user_id: userId, log_date: date, weight_kg: weightKg }, { onConflict: "user_id,log_date" });
  if (error) throw error;
}

export async function updateProfileHeight(userId: string, heightCm: number) {
  const { error } = await supabase.from("profiles").update({ height_cm: heightCm }).eq("id", userId);
  if (error) throw error;
}

/** Peso mais recente registrado, variação desde o primeiro peso da janela de 30 dias. */
export function computeWeightDelta(bodyLogs: BodyLog[]) {
  if (bodyLogs.length === 0) return null;
  const latest = bodyLogs[bodyLogs.length - 1];
  const first = bodyLogs[0];
  return {
    latestKg: latest.weight_kg,
    deltaKg: Math.round((latest.weight_kg - first.weight_kg) * 10) / 10,
    logDate: latest.log_date,
  };
}

export async function createTrainingGoal(userId: string, input: TrainingGoalInput) {
  const { error } = await supabase.from("training_goals").insert({
    user_id: userId,
    title: input.title,
    metric_type: input.metricType,
    start_value: input.startValue,
    target_value: input.targetValue,
    current_value: input.metricType === "custom" ? input.currentValue ?? input.startValue : null,
    unit: input.unit,
    target_date: input.targetDate,
  });
  if (error) throw error;
}

export async function updateTrainingGoal(id: string, input: TrainingGoalInput) {
  const { error } = await supabase
    .from("training_goals")
    .update({
      title: input.title,
      metric_type: input.metricType,
      start_value: input.startValue,
      target_value: input.targetValue,
      current_value: input.metricType === "custom" ? input.currentValue ?? input.startValue : null,
      unit: input.unit,
      target_date: input.targetDate,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Atualização rápida do progresso de uma meta "custom" (reps, carga, etc — à mão). */
export async function updateGoalManualProgress(id: string, currentValue: number) {
  const { error } = await supabase.from("training_goals").update({ current_value: currentValue }).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingGoal(id: string) {
  const { error } = await supabase.from("training_goals").delete().eq("id", id);
  if (error) throw error;
}

/** Valor atual de uma meta: peso vem do último check-in, custom vem do campo manual. */
export function goalCurrentValue(goal: TrainingGoal, latestWeightKg: number | null) {
  if (goal.metric_type === "weight") return latestWeightKg ?? goal.start_value;
  return goal.current_value ?? goal.start_value;
}

/**
 * Progresso 0–100%, funciona pra metas que sobem (ex: reps 8→12) e pra metas
 * que descem (ex: peso 80→75kg) sem precisar de um campo de "direção" — o
 * sinal do intervalo (target - start) já resolve os dois casos.
 */
export function goalProgressPercent(goal: TrainingGoal, latestWeightKg: number | null) {
  const current = goalCurrentValue(goal, latestWeightKg);
  const span = goal.target_value - goal.start_value;
  if (span === 0) return current === goal.target_value ? 100 : 0;
  const pct = ((current - goal.start_value) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
