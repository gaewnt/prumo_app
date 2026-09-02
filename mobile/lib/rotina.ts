import { supabase } from "@/lib/supabase";

/**
 * Camada de dados do módulo Rotina — hábitos diários com repetição semanal.
 * `active_days` usa a mesma convenção do Postgres/JS Date: 0 = domingo … 6 = sábado.
 */

export type Habit = {
  id: string;
  name: string;
  active_days: number[];
};

export type HabitLog = {
  habit_id: string;
  log_date: string; // YYYY-MM-DD, sempre no fuso local da pessoa usuária
  completed: boolean;
};

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

/** Formata uma data no fuso local (evita o off-by-one de `toISOString`, que usa UTC). */
export function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchHabitsWithLogs() {
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, active_days")
    .order("created_at", { ascending: true });
  if (habitsError) throw habitsError;

  // ~5 semanas de histórico dá folga suficiente pro cálculo de streak; o início do mês
  // atual garante que o MonthHeatmap sempre tenha o mês inteiro, mesmo nos primeiros dias
  // dele (quando "34 dias atrás" ainda não cobriria o mês anterior). Usa o que for mais cedo.
  const today = new Date();
  const streakWindowStart = new Date();
  streakWindowStart.setDate(streakWindowStart.getDate() - 34);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < streakWindowStart ? monthStart : streakWindowStart;

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date, completed")
    .gte("log_date", toDateString(since));
  if (logsError) throw logsError;

  return { habits: (habits ?? []) as Habit[], logs: (logs ?? []) as HabitLog[] };
}

/** Só os logs de um mês específico — usado pelo `MonthHeatmap` quando a pessoa navega pra um
 * mês anterior. Separado de `fetchHabitsWithLogs` de propósito: a streak e
 * a semana atual continuam usando a janela rolante de sempre, esse aqui é só pra "passear" pelo
 * histórico sem re-buscar tudo de novo a cada troca de mês. */
export async function fetchHabitLogsForMonth(monthDate: Date): Promise<HabitLog[]> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = toDateString(new Date(year, month, 1));
  const end = toDateString(new Date(year, month + 1, 0));

  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date, completed")
    .gte("log_date", start)
    .lte("log_date", end);
  if (error) throw error;

  return (data ?? []) as HabitLog[];
}

export async function createHabit(userId: string, name: string, activeDays: number[]) {
  const { error } = await supabase
    .from("habits")
    .insert({ user_id: userId, name, active_days: activeDays });
  if (error) throw error;
}

export async function updateHabit(habitId: string, name: string, activeDays: number[]) {
  const { error } = await supabase
    .from("habits")
    .update({ name, active_days: activeDays })
    .eq("id", habitId);
  if (error) throw error;
}

export async function deleteHabit(habitId: string) {
  const { error } = await supabase.from("habits").delete().eq("id", habitId);
  if (error) throw error;
}

/**
 * Alterna o log de um dia específico pro hábito e, ao completar, registra em
 * `module_events`. Permite marcar hábito em dias que passaram
 * sem registrar, não só hoje; antes só existia `toggleHabitToday` (data fixa
 * internamente). Generalizado pra receber a data — `HabitRow` chama isso pra qualquer um
 * dos últimos 7 dias, não só hoje, mas segue sem permitir data futura (ver `HabitRow`).
 */
export async function toggleHabitOnDate(
  userId: string,
  habit: Habit,
  dateStr: string,
  isCurrentlyDone: boolean
) {
  if (isCurrentlyDone) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habit.id)
      .eq("log_date", dateStr);
    if (error) throw error;
    return;
  }

  // upsert em vez de insert: evita erro de chave duplicada se a pessoa tocar duas vezes rápido
  // ou se o dado local estiver um passo atrás do servidor (unique é (habit_id, log_date)).
  const { error } = await supabase
    .from("habit_logs")
    .upsert(
      { habit_id: habit.id, user_id: userId, log_date: dateStr, completed: true },
      { onConflict: "habit_id,log_date" }
    );
  if (error) throw error;

  // Melhor esforço: se isso falhar, o hábito já foi marcado — não vale travar o usuário por causa disso.
  // `occurred_at` usa a data do log (que pode ser um dia passado sendo corrigido agora),
  // não o momento do toque — mesmo padrão já usado em `upsertMoodLog` (Dev. Pessoal).
  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "rotina",
    event_type: "habit_completed",
    payload: { habit_id: habit.id, habit_name: habit.name },
    occurred_at: new Date(`${dateStr}T12:00:00`).toISOString(),
  });
}

/** Dias consecutivos completados, contando só os dias em que o hábito está ativo. */
export function computeStreak(logs: HabitLog[], habit: Habit): number {
  const doneDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.log_date)
  );

  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 60; i++) {
    const dow = cursor.getDay();
    if (habit.active_days.includes(dow)) {
      if (doneDates.has(toDateString(cursor))) {
        streak++;
      } else if (i === 0) {
        // hoje ainda não foi marcado — não quebra a streak, só não conta ainda.
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Últimos 7 dias (mais antigo → hoje), pra desenhar a fita semanal. */
export function lastSevenDays(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

/** Marcos de streak que ganham um selo visual — do menor pro maior. */
export const STREAK_MILESTONES = [7, 30, 100] as const;

/** Maior marco já alcançado por essa streak, ou `null` se ainda não bateu o primeiro. */
export function streakMilestone(streak: number): number | null {
  let reached: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) reached = m;
  }
  return reached;
}

/**
 * Quantos dias "possíveis" (hábito estava programado pra aquele dia da semana) foram de
 * fato cumpridos nos últimos 7 dias, somando todos os hábitos — a métrica honesta de
 * consistência da semana, sem inventar nada além do que já foi marcado ou não.
 */
export function computeWeeklyCompletion(habits: Habit[], logs: HabitLog[]) {
  const doneSet = new Set(logs.filter((l) => l.completed).map((l) => `${l.habit_id}|${l.log_date}`));
  let possible = 0;
  let done = 0;
  for (const date of lastSevenDays()) {
    const dateStr = toDateString(date);
    const dow = date.getDay();
    for (const habit of habits) {
      if (!habit.active_days.includes(dow)) continue;
      possible++;
      if (doneSet.has(`${habit.id}|${dateStr}`)) done++;
    }
  }
  return { done, possible };
}

/**
 * Fração 0–1 de hábitos programados pra um dia que foram cumpridos — usada pra colorir
 * a célula do `MonthHeatmap`. `null` quando não havia hábito nenhum programado pra esse
 * dia (célula fica vazia em vez de "0%", que passaria a ideia errada de falha).
 */
export function dayCompletionRatio(dateStr: string, habits: Habit[], logs: HabitLog[]): number | null {
  const date = new Date(`${dateStr}T12:00:00`);
  const dow = date.getDay();
  const scheduled = habits.filter((h) => h.active_days.includes(dow));
  if (scheduled.length === 0) return null;
  const doneSet = new Set(
    logs.filter((l) => l.completed && l.log_date === dateStr).map((l) => l.habit_id)
  );
  const done = scheduled.filter((h) => doneSet.has(h.id)).length;
  return done / scheduled.length;
}
