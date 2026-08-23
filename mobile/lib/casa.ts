import { supabase } from "@/lib/supabase";
import { toDateString, lastSevenDays, WEEKDAY_LABELS } from "@/lib/rotina";

/**
 * Camada de dados do módulo Casa — lista de compras (sem histórico: item marcado vira
 * "limpar concluídos" quando quiser) e tarefas domésticas recorrentes, no mesmo modelo de
 * hábito+log da Rotina (`active_days` por dia da semana, um log por tarefa+dia).
 */

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  created_at: string;
};

export type HomeTask = {
  id: string;
  title: string;
  active_days: number[];
  notes: string | null;
  active: boolean;
};

export type HomeTaskLog = {
  task_id: string;
  log_date: string;
};

export async function fetchCasa() {
  const since = toDateString(lastSevenDays()[0]);

  const [shoppingRes, tasksRes, taskLogsRes] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("id, name, quantity, checked, created_at")
      .order("checked", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("home_tasks").select("id, title, active_days, notes, active").order("created_at", { ascending: true }),
    supabase.from("home_task_logs").select("task_id, log_date").gte("log_date", since),
  ]);

  if (shoppingRes.error) throw shoppingRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (taskLogsRes.error) throw taskLogsRes.error;

  return {
    shoppingItems: (shoppingRes.data ?? []) as ShoppingItem[],
    tasks: (tasksRes.data ?? []) as HomeTask[],
    taskLogs: (taskLogsRes.data ?? []) as HomeTaskLog[],
  };
}

// ---------------------------------------------------------------------------
// Lista de compras
// ---------------------------------------------------------------------------

export async function createShoppingItem(userId: string, name: string, quantity: string) {
  const { error } = await supabase
    .from("shopping_list_items")
    .insert({ user_id: userId, name, quantity: quantity || null });
  if (error) throw error;
}

export async function updateShoppingItem(itemId: string, name: string, quantity: string) {
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ name, quantity: quantity || null })
    .eq("id", itemId);
  if (error) throw error;
}

export async function toggleShoppingItem(itemId: string, checked: boolean) {
  const { error } = await supabase.from("shopping_list_items").update({ checked }).eq("id", itemId);
  if (error) throw error;
}

export async function deleteShoppingItem(itemId: string) {
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", itemId);
  if (error) throw error;
}

/** Some com os itens já marcados de uma vez — "esvaziar o carrinho" depois da compra. */
export async function clearCheckedShoppingItems(userId: string) {
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("user_id", userId)
    .eq("checked", true);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tarefas domésticas
// ---------------------------------------------------------------------------

export async function createHomeTask(userId: string, title: string, activeDays: number[], notes: string) {
  const { error } = await supabase
    .from("home_tasks")
    .insert({ user_id: userId, title, active_days: activeDays, notes: notes || null });
  if (error) throw error;
}

export async function updateHomeTask(
  taskId: string,
  input: { title: string; activeDays: number[]; notes: string; active: boolean }
) {
  const { error } = await supabase
    .from("home_tasks")
    .update({
      title: input.title,
      active_days: input.activeDays,
      notes: input.notes || null,
      active: input.active,
    })
    .eq("id", taskId);
  if (error) throw error;
}

export async function deleteHomeTask(taskId: string) {
  const { error } = await supabase.from("home_tasks").delete().eq("id", taskId);
  if (error) throw error;
}

/** Alterna o log de hoje pra tarefa — upsert/delete, mesmo padrão do `toggleHabitToday` da Rotina. */
export async function toggleHomeTaskToday(userId: string, taskId: string, isCurrentlyDone: boolean) {
  const today = toDateString(new Date());

  if (isCurrentlyDone) {
    const { error } = await supabase
      .from("home_task_logs")
      .delete()
      .eq("task_id", taskId)
      .eq("log_date", today);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("home_task_logs")
    .upsert({ user_id: userId, task_id: taskId, log_date: today }, { onConflict: "task_id,log_date" });
  if (error) throw error;
}

/**
 * Todas as tarefas ativas, com `scheduled` (programada pro dia da semana atual) e `done`
 * (log de hoje já existe) — inclui as não programadas também, porque, igual aos hábitos da
 * Rotina, sempre dá pra marcar uma tarefa como feita hoje mesmo fora do dia programado.
 */
export function computeTodayTasks(tasks: HomeTask[], logs: HomeTaskLog[], today = toDateString(new Date())) {
  const dow = new Date(`${today}T12:00:00`).getDay();
  const doneIds = new Set(logs.filter((l) => l.log_date === today).map((l) => l.task_id));
  return tasks
    .filter((t) => t.active)
    .map((t) => ({ task: t, scheduled: t.active_days.includes(dow), done: doneIds.has(t.id) }));
}

/** % de tarefas programadas cumpridas por dia, últimos 7 dias — mesmo formato dos outros gráficos de barra. */
export function computeWeeklyTaskCompletion(tasks: HomeTask[], logs: HomeTaskLog[]) {
  return lastSevenDays().map((date) => {
    const dateStr = toDateString(date);
    const dow = date.getDay();
    const scheduled = tasks.filter((t) => t.active && t.active_days.includes(dow));
    const doneIds = new Set(logs.filter((l) => l.log_date === dateStr).map((l) => l.task_id));
    const done = scheduled.filter((t) => doneIds.has(t.id)).length;
    const value = scheduled.length > 0 ? Math.round((done / scheduled.length) * 100) : 0;
    return { label: WEEKDAY_LABELS[dow], value };
  });
}
