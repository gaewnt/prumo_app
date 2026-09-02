import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";
import { fetchModulePreference } from "@/lib/onboarding";

/**
 * Camada de dados do módulo Dieta — cardápio semanal editável, água do dia e
 * evolução de peso. O peso em si é o mesmo `body_logs` do Treino (check-in
 * único, sem duplicar o campo de "registrar peso" aqui): Dieta só lê essa
 * série pra mostrar a distância até a meta, no padrão dos apps de referência
 * (Dietbox/Lifesum) — atual, objetivo, distância, variação, maior e menor.
 */

export type MealItem = {
  id: string;
  day_of_week: number;
  meal_type: string;
  description: string;
  position: number;
};

export type WaterLog = {
  id: string;
  log_date: string;
  amount_ml: number;
};

export type WeightGoalSummary = {
  title: string;
  target_value: number;
};

export const MEAL_TYPES = [
  { value: "cafe_da_manha", label: "Café da manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "lanche", label: "Lanche" },
  { value: "janta", label: "Janta" },
] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Atalhos de "+ copo" — os tamanhos mais comuns (copo, garrafinha, garrafa). */
export const WATER_QUICK_ADD_ML = [200, 300, 500] as const;

export async function fetchDieta() {
  const today = toDateString(new Date());
  const waterStart = toDateString(new Date(Date.now() - 6 * 86400000)); // últimos 7 dias
  const weightStart = toDateString(new Date(Date.now() - 89 * 86400000)); // últimos 90 dias

  const [mealRes, waterRes, bodyLogsRes, goalRes, preferences] = await Promise.all([
    supabase
      .from("meal_plan_items")
      .select("id, day_of_week, meal_type, description, position")
      .order("day_of_week", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("water_logs")
      .select("id, log_date, amount_ml")
      .gte("log_date", waterStart)
      .order("created_at", { ascending: true }),
    supabase
      .from("body_logs")
      .select("id, log_date, weight_kg")
      .gte("log_date", weightStart)
      .order("log_date", { ascending: true }),
    supabase
      .from("training_goals")
      .select("title, target_value")
      .eq("metric_type", "weight")
      .is("completed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchModulePreference("dieta"),
  ]);

  if (mealRes.error) throw mealRes.error;
  if (waterRes.error) throw waterRes.error;
  if (bodyLogsRes.error) throw bodyLogsRes.error;
  if (goalRes.error) throw goalRes.error;

  const metaAguaLitros = Number(preferences.meta_agua_litros as string | number | undefined);

  return {
    mealItems: (mealRes.data ?? []) as MealItem[],
    waterLogs: (waterRes.data ?? []) as WaterLog[],
    bodyLogs: (bodyLogsRes.data ?? []) as { id: string; log_date: string; weight_kg: number }[],
    weightGoal: (goalRes.data as WeightGoalSummary | null) ?? null,
    metaAguaMl: metaAguaLitros > 0 ? Math.round(metaAguaLitros * 1000) : null,
    today,
  };
}

export async function createMealItem(
  userId: string,
  dayOfWeek: number,
  mealType: string,
  description: string,
  position: number
) {
  const { error } = await supabase.from("meal_plan_items").insert({
    user_id: userId,
    day_of_week: dayOfWeek,
    meal_type: mealType,
    description,
    position,
  });
  if (error) throw error;

  // Melhor esforço: alimenta a camada de eventos cruzados (Fase 2) — se falhar, o item
  // já foi salvo, não vale travar o usuário por causa disso.
  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "dieta",
    event_type: "meal_item_added",
    payload: { day_of_week: dayOfWeek, meal_type: mealType },
  });
}

export async function updateMealItem(id: string, description: string) {
  const { error } = await supabase
    .from("meal_plan_items")
    .update({ description })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMealItem(id: string) {
  const { error } = await supabase.from("meal_plan_items").delete().eq("id", id);
  if (error) throw error;
}

/** Limpa todos os itens de um dia (usado por "Limpar dia"). */
export async function clearDay(dayOfWeek: number) {
  const { error } = await supabase.from("meal_plan_items").delete().eq("day_of_week", dayOfWeek);
  if (error) throw error;
}

/**
 * Copia o cardápio de `fromDay` pra `toDay`, substituindo o que já existia em `toDay`
 * (mesmo padrão "copiar/limpar dia" do Core).
 */
export async function copyDay(userId: string, fromDay: number, toDay: number) {
  if (fromDay === toDay) return;

  const { data: sourceItems, error: fetchError } = await supabase
    .from("meal_plan_items")
    .select("meal_type, description, position")
    .eq("day_of_week", fromDay);
  if (fetchError) throw fetchError;

  const { error: clearError } = await supabase
    .from("meal_plan_items")
    .delete()
    .eq("day_of_week", toDay);
  if (clearError) throw clearError;

  if (!sourceItems || sourceItems.length === 0) return;

  const { error: insertError } = await supabase.from("meal_plan_items").insert(
    sourceItems.map((item) => ({
      user_id: userId,
      day_of_week: toDay,
      meal_type: item.meal_type,
      description: item.description,
      position: item.position,
    }))
  );
  if (insertError) throw insertError;
}

/** Registra um "+ copo" — uma linha por toque, pra somar o dia e dar pra desfazer o último. */
export async function logWater(userId: string, amountMl: number, date = toDateString(new Date())) {
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, log_date: date, amount_ml: amountMl });
  if (error) throw error;
}

/** Remove o registro de água mais recente do dia — corrige um toque errado sem zerar o dia todo. */
export async function undoLastWaterLog(userId: string, date = toDateString(new Date())) {
  const { data, error } = await supabase
    .from("water_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const { error: deleteError } = await supabase.from("water_logs").delete().eq("id", data.id);
  if (deleteError) throw deleteError;
}

/**
 * Corrige a quantidade do registro de água mais recente do dia —
 * mesmo alcance de "Desfazer último": antes só dava pra apagar e lançar de novo.
 */
export async function updateLastWaterLog(userId: string, amountMl: number, date = toDateString(new Date())) {
  const { data, error } = await supabase
    .from("water_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const { error: updateError } = await supabase
    .from("water_logs")
    .update({ amount_ml: amountMl })
    .eq("id", data.id);
  if (updateError) throw updateError;
}

export function computeWaterToday(waterLogs: WaterLog[], today: string) {
  return waterLogs.filter((w) => w.log_date === today).reduce((sum, w) => sum + w.amount_ml, 0);
}

/** Água total de um dia qualquer — mesma conta do `computeWaterToday`, só que reaproveitada
 * pra qualquer data (usada pelo `MonthHeatmap` do histórico de meses anteriores). */
export function computeDayWater(dateStr: string, waterLogs: WaterLog[]): number {
  return computeWaterToday(waterLogs, dateStr);
}

/** Só os registros de água de um mês específico — `fetchDieta` só traz os últimos 7 dias, então
 * o histórico de meses anteriores busca à parte, sob demanda. */
export async function fetchWaterLogsForMonth(monthDate: Date): Promise<WaterLog[]> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = toDateString(new Date(year, month, 1));
  const end = toDateString(new Date(year, month + 1, 0));

  const { data, error } = await supabase
    .from("water_logs")
    .select("id, log_date, amount_ml")
    .gte("log_date", start)
    .lte("log_date", end);
  if (error) throw error;

  return (data ?? []) as WaterLog[];
}

/** Total de água por dia, últimos 7 dias — mesmo formato do gráfico de barras do Treino/Finanças. */
export function computeWeeklyWater(waterLogs: WaterLog[], today = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day) => {
    const dateStr = toDateString(day);
    const value = waterLogs
      .filter((w) => w.log_date === dateStr)
      .reduce((sum, w) => sum + w.amount_ml, 0);
    return { label: WEEKDAY_LABELS[day.getDay()], value };
  });
}

export type WeightEvolution = {
  atualKg: number;
  variacaoTotalKg: number;
  maiorKg: number;
  menorKg: number;
  objetivoKg: number | null;
  distanciaKg: number | null;
  series: number[];
};

/**
 * Painel "evolução de peso" no formato Dietbox/Lifesum (atual, objetivo, distância,
 * variação, maior, menor) — tudo calculado em cima do `body_logs` real, sem inventar
 * nenhum número que a pessoa não registrou.
 */
export function computeWeightEvolution(
  bodyLogs: { weight_kg: number }[],
  weightGoal: WeightGoalSummary | null
): WeightEvolution | null {
  if (bodyLogs.length === 0) return null;
  const values = bodyLogs.map((b) => b.weight_kg);
  const atualKg = values[values.length - 1];
  const primeiroKg = values[0];
  const objetivoKg = weightGoal?.target_value ?? null;
  return {
    atualKg,
    variacaoTotalKg: Math.round((atualKg - primeiroKg) * 10) / 10,
    maiorKg: Math.max(...values),
    menorKg: Math.min(...values),
    objetivoKg,
    distanciaKg: objetivoKg !== null ? Math.round((objetivoKg - atualKg) * 10) / 10 : null,
    series: values,
  };
}
