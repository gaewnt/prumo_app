import { supabase } from "@/lib/supabase";
import { toDateString, lastSevenDays, WEEKDAY_LABELS } from "@/lib/rotina";

/**
 * Camada de dados do módulo Detox — hábitos que a pessoa quer reduzir, eliminar ou só
 * monitorar (ex: cigarro, tela à noite, refrigerante). Cada ocorrência é um registro (+1),
 * igual ao modelo de água da Dieta — sem meta numérica fabricada: só mostra a contagem real
 * ao longo dos dias e deixa a pessoa julgar a própria evolução, sem inventar "parabéns, você
 * reduziu 20%" ou qualquer insight que a gente não tenha certeza absoluta que é verdade.
 */

export const DETOX_TARGETS = ["reduzir", "eliminar", "monitorar"] as const;
export type DetoxTarget = (typeof DETOX_TARGETS)[number];

export const DETOX_TARGET_LABELS: Record<DetoxTarget, string> = {
  reduzir: "Reduzir",
  eliminar: "Eliminar",
  monitorar: "Monitorar",
};

export type DetoxHabit = {
  id: string;
  title: string;
  target: DetoxTarget;
  notes: string | null;
  active: boolean;
};

export type DetoxLog = {
  id: string;
  habit_id: string;
  log_date: string;
  created_at: string;
};

export async function fetchDetox() {
  const since = toDateString(lastSevenDays()[0]);

  const [habitsRes, logsRes] = await Promise.all([
    supabase.from("detox_habits").select("id, title, target, notes, active").order("created_at", { ascending: true }),
    supabase.from("detox_logs").select("id, habit_id, log_date, created_at").gte("log_date", since).order("created_at", { ascending: true }),
  ]);

  if (habitsRes.error) throw habitsRes.error;
  if (logsRes.error) throw logsRes.error;

  return {
    habits: (habitsRes.data ?? []) as DetoxHabit[],
    logs: (logsRes.data ?? []) as DetoxLog[],
  };
}

// ---------------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------------

export type DetoxHabitInput = { title: string; target: DetoxTarget; notes: string; active: boolean };

export async function createDetoxHabit(userId: string, input: DetoxHabitInput) {
  const { error } = await supabase
    .from("detox_habits")
    .insert({ user_id: userId, title: input.title, target: input.target, notes: input.notes || null, active: input.active });
  if (error) throw error;
}

export async function updateDetoxHabit(habitId: string, input: DetoxHabitInput) {
  const { error } = await supabase
    .from("detox_habits")
    .update({ title: input.title, target: input.target, notes: input.notes || null, active: input.active })
    .eq("id", habitId);
  if (error) throw error;
}

/** Some com o hábito e, em cascata, com os registros dele. */
export async function deleteDetoxHabit(habitId: string) {
  const { error } = await supabase.from("detox_habits").delete().eq("id", habitId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Registros (+1 por ocorrência)
// ---------------------------------------------------------------------------

export async function logDetoxOccurrence(userId: string, habitId: string) {
  const { error } = await supabase.from("detox_logs").insert({ user_id: userId, habit_id: habitId });
  if (error) throw error;
}

/** Desfaz o registro mais recente de hoje pra esse hábito. */
export async function undoLastDetoxOccurrence(habitId: string, today = toDateString(new Date())) {
  const { data, error } = await supabase
    .from("detox_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("log_date", today)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0];
  if (!last) return;
  const { error: deleteError } = await supabase.from("detox_logs").delete().eq("id", last.id);
  if (deleteError) throw deleteError;
}

export function countToday(logs: DetoxLog[], habitId: string, today = toDateString(new Date())) {
  return logs.filter((l) => l.habit_id === habitId && l.log_date === today).length;
}

/** Só os registros de um mês específico (todos os hábitos) — `fetchDetox` só traz os últimos
 * 7 dias, então o histórico de meses anteriores busca à parte, sob demanda. */
export async function fetchDetoxLogsForMonth(monthDate: Date): Promise<DetoxLog[]> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = toDateString(new Date(year, month, 1));
  const end = toDateString(new Date(year, month + 1, 0));

  const { data, error } = await supabase
    .from("detox_logs")
    .select("id, habit_id, log_date, created_at")
    .gte("log_date", start)
    .lte("log_date", end)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []) as DetoxLog[];
}

/** Quantas vezes um hábito foi registrado num dia específico — mesma conta do `countToday`,
 * só que pra qualquer data (usada pelo `MonthHeatmap` do histórico). */
export function countOnDate(logs: DetoxLog[], habitId: string, dateStr: string): number {
  return logs.filter((l) => l.habit_id === habitId && l.log_date === dateStr).length;
}

export function weeklyCountsForHabit(logs: DetoxLog[], habitId: string) {
  return lastSevenDays().map((date) => {
    const dateStr = toDateString(date);
    const value = logs.filter((l) => l.habit_id === habitId && l.log_date === dateStr).length;
    return { label: WEEKDAY_LABELS[date.getDay()], value };
  });
}
