import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/rotina";
import { scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Beleza — rotina de cuidados (manhã/noite, com passos ligados a
 * produtos opcionalmente), produtos com validade (e lembrete opcional antes de vencer) e um
 * check-in diário simples da pele (sem radar chart — 5 notas de 1 a 5, mostradas como barras).
 * Inspirado no "Skincare Diary" (rotina + validade + condição da pele) que ela mandou.
 */

export const PRODUCT_CATEGORIES = [
  "limpeza",
  "esfoliante",
  "tonico",
  "hidratante",
  "protetor_solar",
  "tratamento",
  "outro",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  limpeza: "Limpeza",
  esfoliante: "Esfoliante",
  tonico: "Tônico",
  hidratante: "Hidratante",
  protetor_solar: "Protetor solar",
  tratamento: "Tratamento",
  outro: "Outro",
};

export const EXPIRY_REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No dia", value: 0 },
  { label: "3 dias antes", value: 3 },
  { label: "7 dias antes", value: 7 },
] as const;

export type BeautyProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  opened_at: string | null;
  expires_at: string | null;
  expiry_reminder_days_before: number | null;
  notification_id: string | null;
  notes: string | null;
};

export type RoutinePeriod = "manha" | "noite";

export type RoutineStep = {
  id: string;
  period: RoutinePeriod;
  title: string;
  product_id: string | null;
  created_at: string;
};

export type RoutineLog = {
  step_id: string;
  log_date: string;
};

export type SkinLog = {
  id: string;
  log_date: string;
  overall: number;
  texture: number;
  oiliness: number;
  sensitivity: number;
  moisture: number;
  notes: string | null;
};

export async function fetchBeleza() {
  const today = new Date();
  const streakWindowStart = new Date();
  streakWindowStart.setDate(streakWindowStart.getDate() - 34);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < streakWindowStart ? monthStart : streakWindowStart;
  const todayStr = toDateString(today);

  const [productsRes, stepsRes, logsRes, skinLogsRes] = await Promise.all([
    supabase
      .from("beauty_products")
      .select("id, name, category, opened_at, expires_at, expiry_reminder_days_before, notification_id, notes")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("beauty_routine_steps")
      .select("id, period, title, product_id, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("beauty_routine_logs").select("step_id, log_date").eq("log_date", todayStr),
    supabase
      .from("skin_logs")
      .select("id, log_date, overall, texture, oiliness, sensitivity, moisture, notes")
      .gte("log_date", toDateString(since))
      .order("log_date", { ascending: true }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (stepsRes.error) throw stepsRes.error;
  if (logsRes.error) throw logsRes.error;
  if (skinLogsRes.error) throw skinLogsRes.error;

  return {
    products: (productsRes.data ?? []) as BeautyProduct[],
    routineSteps: (stepsRes.data ?? []) as RoutineStep[],
    routineLogsToday: (logsRes.data ?? []) as RoutineLog[],
    skinLogs: (skinLogsRes.data ?? []) as SkinLog[],
    today: todayStr,
  };
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export type ProductInput = {
  name: string;
  category: ProductCategory;
  openedAt: string | null; // YYYY-MM-DD
  expiresAt: string | null; // YYYY-MM-DD
  expiryReminderDaysBefore: number | null;
  notes: string;
};

async function scheduleExpiryReminder(input: ProductInput) {
  if (input.expiryReminderDaysBefore === null || !input.expiresAt) return null;
  const [y, m, d] = input.expiresAt.split("-").map(Number);
  const reminderDate = new Date(y, m - 1, d, 9, 0, 0);
  reminderDate.setDate(reminderDate.getDate() - input.expiryReminderDaysBefore);
  return scheduleOneTimeReminder(reminderDate, `Validade: ${input.name}`, "Confira se ainda está bom pra uso ou hora de repor.");
}

export async function createBeautyProduct(userId: string, input: ProductInput) {
  const { data, error } = await supabase
    .from("beauty_products")
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      opened_at: input.openedAt,
      expires_at: input.expiresAt,
      expiry_reminder_days_before: input.expiryReminderDaysBefore,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleExpiryReminder(input);
  if (notificationId) {
    await supabase.from("beauty_products").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateBeautyProduct(product: BeautyProduct, input: ProductInput) {
  await cancelReminder(product.notification_id);
  const notificationId = await scheduleExpiryReminder(input);

  const { error } = await supabase
    .from("beauty_products")
    .update({
      name: input.name,
      category: input.category,
      opened_at: input.openedAt,
      expires_at: input.expiresAt,
      expiry_reminder_days_before: input.expiryReminderDaysBefore,
      notification_id: notificationId,
      notes: input.notes || null,
    })
    .eq("id", product.id);
  if (error) throw error;
}

export async function deleteBeautyProduct(product: BeautyProduct) {
  await cancelReminder(product.notification_id);
  const { error } = await supabase.from("beauty_products").delete().eq("id", product.id);
  if (error) throw error;
}

export function daysUntilExpiry(expiresAt: string, now = new Date()) {
  const target = new Date(`${expiresAt}T12:00:00`);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// Rotina (passos de manhã/noite)
// ---------------------------------------------------------------------------

export type RoutineStepInput = {
  period: RoutinePeriod;
  title: string;
  productId: string | null;
};

export async function createRoutineStep(userId: string, input: RoutineStepInput) {
  const { error } = await supabase
    .from("beauty_routine_steps")
    .insert({ user_id: userId, period: input.period, title: input.title, product_id: input.productId });
  if (error) throw error;
}

export async function updateRoutineStep(stepId: string, input: RoutineStepInput) {
  const { error } = await supabase
    .from("beauty_routine_steps")
    .update({ period: input.period, title: input.title, product_id: input.productId })
    .eq("id", stepId);
  if (error) throw error;
}

export async function deleteRoutineStep(stepId: string) {
  const { error } = await supabase.from("beauty_routine_steps").delete().eq("id", stepId);
  if (error) throw error;
}

/** Alterna o passo de hoje — mesmo padrão do `toggleHomeTaskToday` da Casa. */
export async function toggleRoutineStepToday(userId: string, stepId: string, isCurrentlyDone: boolean) {
  const today = toDateString(new Date());

  if (isCurrentlyDone) {
    const { error } = await supabase
      .from("beauty_routine_logs")
      .delete()
      .eq("step_id", stepId)
      .eq("log_date", today);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("beauty_routine_logs")
    .upsert({ user_id: userId, step_id: stepId, log_date: today }, { onConflict: "step_id,log_date" });
  if (error) throw error;
}

export function stepsForPeriod(steps: RoutineStep[], period: RoutinePeriod) {
  return steps.filter((s) => s.period === period);
}

// ---------------------------------------------------------------------------
// Check-in de pele
// ---------------------------------------------------------------------------

export type SkinLogInput = {
  overall: number;
  texture: number;
  oiliness: number;
  sensitivity: number;
  moisture: number;
  notes: string;
};

/** Cria/atualiza o check-in de um dia específico — upsert por ser único por user+dia (só um registro por dia, editável). */
export async function upsertSkinLog(userId: string, logDate: string, input: SkinLogInput) {
  const { error } = await supabase.from("skin_logs").upsert(
    {
      user_id: userId,
      log_date: logDate,
      overall: input.overall,
      texture: input.texture,
      oiliness: input.oiliness,
      sensitivity: input.sensitivity,
      moisture: input.moisture,
      notes: input.notes || null,
    },
    { onConflict: "user_id,log_date" }
  );
  if (error) throw error;
}

export async function deleteSkinLog(logId: string) {
  const { error } = await supabase.from("skin_logs").delete().eq("id", logId);
  if (error) throw error;
}

export function computeWeeklyOverall(logs: SkinLog[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return days.map((date) => {
    const dateStr = toDateString(date);
    const log = logs.find((l) => l.log_date === dateStr);
    return { label: ["D", "S", "T", "Q", "Q", "S", "S"][date.getDay()], value: log?.overall ?? 0 };
  });
}

/** Dias consecutivos com check-in registrado, olhando os últimos 60 dias (mesma folga dos outros streaks). */
export function computeSkinStreak(logs: SkinLog[]): number {
  const dates = new Set(logs.map((l) => l.log_date));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const dateStr = toDateString(cursor);
    if (dates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // hoje ainda sem check-in não quebra a sequência, só não conta ainda.
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
