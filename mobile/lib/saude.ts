import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";
import { computeWaterToday } from "@/lib/dieta";
import { fetchModulePreference } from "@/lib/onboarding";
import {
  scheduleDailyReminder,
  scheduleOneTimeReminder,
  cancelReminder,
  cancelReminders,
} from "@/lib/notifications";

/**
 * Camada de dados do módulo Saúde — remédios com horário + registro de doses tomadas
 * (mede adesão real, sem inventar "dose perdida" que ninguém marcou), compromissos
 * (consulta/terapia/exame) com lembrete configurável, e um resumo puxado dos outros
 * módulos (água da Dieta, hábitos da Rotina, treino de hoje) — tudo lido direto das
 * tabelas reais, nada fabricado.
 */

/** "diaria" (padrão) usa `times`+`active_days`, igual sempre foi. As outras usam
 * `next_dose_date` — uma ÚNICA próxima data prevista, sem checklist de horários — pensadas
 * pra remédio de ciclo longo (injeção, anticoncepcional trimestral, exame periódico). */
export type MedicationFrequencyKind = "diaria" | "dias" | "mensal" | "trimestral" | "semestral";

export const MEDICATION_FREQUENCY_OPTIONS: {
  label: string;
  kind: MedicationFrequencyKind;
  intervalDays: number | null;
}[] = [
  { label: "Todo dia", kind: "diaria", intervalDays: null },
  { label: "A cada 7 dias", kind: "dias", intervalDays: 7 },
  { label: "A cada 15 dias", kind: "dias", intervalDays: 15 },
  { label: "Mensal", kind: "mensal", intervalDays: null },
  { label: "Trimestral", kind: "trimestral", intervalDays: null },
  { label: "Semestral", kind: "semestral", intervalDays: null },
];

export function medicationFrequencyLabel(kind: MedicationFrequencyKind, intervalDays: number | null): string {
  const match = MEDICATION_FREQUENCY_OPTIONS.find((o) => o.kind === kind && o.intervalDays === intervalDays);
  return match?.label ?? "Todo dia";
}

export type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  times: string[]; // "HH:MM"
  active_days: number[];
  notes: string | null;
  active: boolean;
  notification_ids: Record<string, string>;
  frequency_kind: MedicationFrequencyKind;
  frequency_interval_days: number | null;
  next_dose_date: string | null; // "YYYY-MM-DD", só quando frequency_kind !== "diaria"
};

export type MedicationLog = {
  id: string;
  medication_id: string;
  log_date: string;
  scheduled_time: string;
  taken_at: string | null;
};

export type AppointmentKind = "consulta" | "terapia" | "exame" | "outro";

export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  consulta: "Consulta",
  terapia: "Terapia",
  exame: "Exame",
  outro: "Outro",
};

export const REMINDER_OFFSET_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No horário", value: 0 },
  { label: "1 hora antes", value: 60 },
  { label: "3 horas antes", value: 180 },
  { label: "1 dia antes", value: 1440 },
] as const;

export type Appointment = {
  id: string;
  title: string;
  kind: AppointmentKind;
  professional: string | null;
  scheduled_at: string; // ISO
  reminder_offset_minutes: number | null;
  notes: string | null;
  completed_at: string | null;
  notification_id: string | null;
};

export type HealthHabitsSummary = {
  water: { totalMl: number; goalMl: number | null };
  rotina: { done: number; total: number };
  treino: { scheduled: boolean; completed: boolean };
};

export async function fetchSaude() {
  const today = toDateString(new Date());
  const logsStart = toDateString(new Date(Date.now() - 6 * 86400000));
  const dow = new Date().getDay();

  const [
    medicationsRes,
    medicationLogsRes,
    appointmentsRes,
    waterRes,
    dietaPrefs,
    habitsRes,
    habitLogsRes,
    workoutsRes,
    exercisesRes,
    workoutLogsRes,
  ] = await Promise.all([
    supabase
      .from("medications")
      .select(
        "id, name, dosage, times, active_days, notes, active, notification_ids, frequency_kind, frequency_interval_days, next_dose_date"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("medication_logs")
      .select("id, medication_id, log_date, scheduled_time, taken_at")
      .gte("log_date", logsStart),
    supabase
      .from("appointments")
      .select("id, title, kind, professional, scheduled_at, reminder_offset_minutes, notes, completed_at, notification_id")
      .order("scheduled_at", { ascending: true }),
    supabase.from("water_logs").select("id, log_date, amount_ml").eq("log_date", today),
    fetchModulePreference("dieta"),
    supabase.from("habits").select("id, name, active_days"),
    supabase.from("habit_logs").select("habit_id, log_date, completed").eq("log_date", today),
    supabase.from("workouts").select("id, name, day_of_week").eq("day_of_week", dow),
    supabase.from("exercises").select("id, workout_id"),
    supabase.from("workout_logs").select("workout_id, log_date, completed_exercise_ids").eq("log_date", today),
  ]);

  if (medicationsRes.error) throw medicationsRes.error;
  if (medicationLogsRes.error) throw medicationLogsRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;
  if (waterRes.error) throw waterRes.error;
  if (habitsRes.error) throw habitsRes.error;
  if (habitLogsRes.error) throw habitLogsRes.error;
  if (workoutsRes.error) throw workoutsRes.error;
  if (exercisesRes.error) throw exercisesRes.error;
  if (workoutLogsRes.error) throw workoutLogsRes.error;

  const metaAguaLitros = Number(dietaPrefs.meta_agua_litros as string | number | undefined);
  const waterLogs = (waterRes.data ?? []) as { id: string; log_date: string; amount_ml: number }[];

  const habits = (habitsRes.data ?? []) as { id: string; name: string; active_days: number[] }[];
  const habitLogs = (habitLogsRes.data ?? []) as { habit_id: string; log_date: string; completed: boolean }[];
  const scheduledHabits = habits.filter((h) => h.active_days.includes(dow));
  const doneHabitIds = new Set(habitLogs.filter((l) => l.completed).map((l) => l.habit_id));

  const todaysWorkout = (workoutsRes.data ?? [])[0] as { id: string } | undefined;
  const exercises = (exercisesRes.data ?? []) as { id: string; workout_id: string }[];
  const workoutLogsToday = (workoutLogsRes.data ?? []) as { workout_id: string; completed_exercise_ids: string[] }[];
  const todaysLog = todaysWorkout ? workoutLogsToday.find((l) => l.workout_id === todaysWorkout.id) : undefined;
  const todaysExerciseCount = todaysWorkout ? exercises.filter((e) => e.workout_id === todaysWorkout.id).length : 0;

  const habitsSummary: HealthHabitsSummary = {
    water: {
      totalMl: computeWaterToday(waterLogs, today),
      goalMl: metaAguaLitros > 0 ? Math.round(metaAguaLitros * 1000) : null,
    },
    rotina: { done: scheduledHabits.filter((h) => doneHabitIds.has(h.id)).length, total: scheduledHabits.length },
    treino: {
      scheduled: !!todaysWorkout,
      completed: !!todaysWorkout && todaysExerciseCount > 0 && (todaysLog?.completed_exercise_ids.length ?? 0) >= todaysExerciseCount,
    },
  };

  return {
    medications: (medicationsRes.data ?? []) as Medication[],
    medicationLogs: (medicationLogsRes.data ?? []) as MedicationLog[],
    appointments: (appointmentsRes.data ?? []) as Appointment[],
    habitsSummary,
    today,
  };
}

// ---------------------------------------------------------------------------
// Remédios
// ---------------------------------------------------------------------------

type MedicationInput = {
  name: string;
  dosage: string;
  times: string[];
  activeDays: number[];
  notes: string;
  active: boolean;
  frequencyKind: MedicationFrequencyKind;
  frequencyIntervalDays: number | null;
  /** "YYYY-MM-DD" — obrigatório quando `frequencyKind !== "diaria"`, ignorado quando é. */
  nextDoseDate: string | null;
};

export async function createMedication(userId: string, input: MedicationInput) {
  const { data, error } = await supabase
    .from("medications")
    .insert({
      user_id: userId,
      name: input.name,
      dosage: input.dosage || null,
      times: input.times,
      active_days: input.activeDays,
      notes: input.notes || null,
      active: input.active,
      frequency_kind: input.frequencyKind,
      frequency_interval_days: input.frequencyIntervalDays,
      next_dose_date: input.frequencyKind === "diaria" ? null : input.nextDoseDate,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationIds = input.active ? await scheduleMedicationReminders(input) : {};
  if (Object.keys(notificationIds).length > 0) {
    await supabase.from("medications").update({ notification_ids: notificationIds }).eq("id", data.id);
  }
}

export async function updateMedication(medication: Medication, input: MedicationInput) {
  await cancelReminders(Object.values(medication.notification_ids));
  const notificationIds = input.active ? await scheduleMedicationReminders(input) : {};

  const { error } = await supabase
    .from("medications")
    .update({
      name: input.name,
      dosage: input.dosage || null,
      times: input.times,
      active_days: input.activeDays,
      notes: input.notes || null,
      active: input.active,
      notification_ids: notificationIds,
      frequency_kind: input.frequencyKind,
      frequency_interval_days: input.frequencyIntervalDays,
      next_dose_date: input.frequencyKind === "diaria" ? null : input.nextDoseDate,
    })
    .eq("id", medication.id);
  if (error) throw error;
}

export async function deleteMedication(medication: Medication) {
  await cancelReminders(Object.values(medication.notification_ids));
  const { error } = await supabase.from("medications").delete().eq("id", medication.id);
  if (error) throw error;
}

async function scheduleAllTimes(name: string, dosage: string, times: string[]) {
  const entries = await Promise.all(
    times.map(async (time) => {
      const id = await scheduleDailyReminder(time, `Remédio: ${name}`, dosage ? `Tomar ${dosage}` : "Hora de tomar");
      return [time, id] as const;
    })
  );
  return Object.fromEntries(entries.filter(([, id]) => id !== null)) as Record<string, string>;
}

/** Remédio diário agenda um lembrete repetido por horário (como sempre); frequência não
 * diária agenda um ÚNICO lembrete pra próxima data prevista — sem trigger nativo de
 * "repete a cada N dias" no `expo-notifications`, a repetição é feita "na mão": cada vez
 * que a dose é marcada como tomada (`advanceMedicationDose`), a próxima é recalculada e um
 * novo lembrete único é agendado por cima. */
async function scheduleMedicationReminders(input: MedicationInput): Promise<Record<string, string>> {
  if (input.frequencyKind === "diaria") {
    return scheduleAllTimes(input.name, input.dosage, input.times);
  }
  if (!input.nextDoseDate || input.times.length === 0) return {};
  const id = await scheduleDoseReminder(input.name, input.dosage, input.nextDoseDate, input.times[0]);
  return id ? { proxima: id } : {};
}

async function scheduleDoseReminder(name: string, dosage: string, dateStr: string, time: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const when = new Date(y, (m ?? 1) - 1, d, hour ?? 8, minute ?? 0, 0);
  return scheduleOneTimeReminder(when, `Remédio: ${name}`, dosage ? `Tomar ${dosage}` : "Hora de tomar");
}

/** Data da próxima ocorrência a partir da atual, conforme a frequência escolhida. */
export function computeNextDoseDate(
  currentDateStr: string,
  kind: MedicationFrequencyKind,
  intervalDays: number | null
): string {
  const [y, m, d] = currentDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (kind === "dias" && intervalDays) date.setDate(date.getDate() + intervalDays);
  else if (kind === "mensal") date.setMonth(date.getMonth() + 1);
  else if (kind === "trimestral") date.setMonth(date.getMonth() + 3);
  else if (kind === "semestral") date.setMonth(date.getMonth() + 6);
  return toDateString(date);
}

/**
 * Marca a dose (de uma frequência NÃO diária) de hoje como tomada e já agenda a próxima —
 * ex: injeção de hoje tomada -> próxima data vira "daqui a 15 dias" e o lembrete é
 * reagendado sozinho. Diferente do remédio diário, não existe "desmarcar" aqui: não tem
 * checklist do dia, só a próxima data prevista.
 */
export async function advanceMedicationDose(userId: string, medication: Medication) {
  if (medication.frequency_kind === "diaria" || !medication.next_dose_date) return;

  await logDoseTaken(userId, medication.id, medication.times[0] ?? "00:00", medication.next_dose_date);
  await cancelReminders(Object.values(medication.notification_ids));

  const nextDoseDate = computeNextDoseDate(
    medication.next_dose_date,
    medication.frequency_kind,
    medication.frequency_interval_days
  );
  const notificationIds = medication.active
    ? await scheduleMedicationReminders({
        name: medication.name,
        dosage: medication.dosage ?? "",
        times: medication.times,
        activeDays: medication.active_days,
        notes: medication.notes ?? "",
        active: medication.active,
        frequencyKind: medication.frequency_kind,
        frequencyIntervalDays: medication.frequency_interval_days,
        nextDoseDate,
      })
    : {};

  const { error } = await supabase
    .from("medications")
    .update({ next_dose_date: nextDoseDate, notification_ids: notificationIds })
    .eq("id", medication.id);
  if (error) throw error;
}

/** Frequências não diárias com próxima dose atrasada ou pra hoje — mesmo espírito do
 * `computeTodayDoses`, mas sem checklist de horários (é só a próxima data prevista). */
export function computeDueNonDailyMedications(
  medications: Medication[],
  todayStr = toDateString(new Date())
): { medication: Medication; urgency: "atrasada" | "hoje" }[] {
  return medications
    .filter((m) => m.active && m.frequency_kind !== "diaria" && m.next_dose_date)
    .map((m) => {
      if (m.next_dose_date! > todayStr) return null;
      const urgency: "atrasada" | "hoje" = m.next_dose_date! < todayStr ? "atrasada" : "hoje";
      return { medication: m, urgency };
    })
    .filter((x): x is { medication: Medication; urgency: "atrasada" | "hoje" } => x !== null);
}

/** Marca uma dose de hoje (ou de outro dia) como tomada — upsert por remédio+data+horário. */
export async function logDoseTaken(userId: string, medicationId: string, scheduledTime: string, logDate = toDateString(new Date())) {
  const { error } = await supabase.from("medication_logs").upsert(
    { user_id: userId, medication_id: medicationId, log_date: logDate, scheduled_time: scheduledTime, taken_at: new Date().toISOString() },
    { onConflict: "medication_id,log_date,scheduled_time" }
  );
  if (error) throw error;
}

/** Desfaz a marcação de uma dose — remove o registro em vez de deixar "não tomada", pra não inventar histórico. */
export async function undoDoseTaken(medicationId: string, scheduledTime: string, logDate = toDateString(new Date())) {
  const { error } = await supabase
    .from("medication_logs")
    .delete()
    .eq("medication_id", medicationId)
    .eq("scheduled_time", scheduledTime)
    .eq("log_date", logDate);
  if (error) throw error;
}

/** Doses esperadas hoje (remédios ativos, agendados pro dia da semana atual) que ainda não foram marcadas. */
export function computeTodayDoses(medications: Medication[], logs: MedicationLog[], today = toDateString(new Date())) {
  const dow = new Date(`${today}T12:00:00`).getDay();
  const takenKeys = new Set(
    logs.filter((l) => l.log_date === today && l.taken_at).map((l) => `${l.medication_id}|${l.scheduled_time}`)
  );
  return medications
    .filter((m) => m.active && m.frequency_kind === "diaria" && m.active_days.includes(dow))
    .flatMap((m) => m.times.map((time) => ({ medication: m, time, taken: takenKeys.has(`${m.id}|${time}`) })));
}

/** % de doses tomadas por dia, últimos 7 dias — mesmo formato de gráfico de barras dos outros módulos. */
export function computeAdherenceWeekly(medications: Medication[], logs: MedicationLog[], today = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day) => {
    const dateStr = toDateString(day);
    const dow = day.getDay();
    const expected = medications
      .filter((m) => m.active && m.frequency_kind === "diaria" && m.active_days.includes(dow))
      .reduce((sum, m) => sum + m.times.length, 0);
    const taken = logs.filter((l) => l.log_date === dateStr && l.taken_at).length;
    const value = expected > 0 ? Math.round((Math.min(taken, expected) / expected) * 100) : 0;
    return { label: WEEKDAY_LABELS[dow], value };
  });
}

/** Só os logs de dose de um mês específico — `fetchSaude` só traz o dia de hoje, então o
 * histórico de meses anteriores busca à parte, sob demanda. */
export async function fetchMedicationLogsForMonth(monthDate: Date): Promise<MedicationLog[]> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const start = toDateString(new Date(year, month, 1));
  const end = toDateString(new Date(year, month + 1, 0));

  const { data, error } = await supabase
    .from("medication_logs")
    .select("id, medication_id, log_date, scheduled_time, taken_at")
    .gte("log_date", start)
    .lte("log_date", end);
  if (error) throw error;

  return (data ?? []) as MedicationLog[];
}

/** % de doses tomadas num dia específico — mesma conta do `computeAdherenceWeekly`, só que
 * pra uma data isolada (usada pelo `MonthHeatmap` do histórico). `null` quando não havia dose
 * nenhuma esperada nesse dia (nenhum remédio ativo agendado pro dia da semana). */
export function computeDayAdherence(dateStr: string, medications: Medication[], logs: MedicationLog[]): number | null {
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const expected = medications
    .filter((m) => m.active && m.frequency_kind === "diaria" && m.active_days.includes(dow))
    .reduce((sum, m) => sum + m.times.length, 0);
  if (expected === 0) return null;
  const taken = logs.filter((l) => l.log_date === dateStr && l.taken_at).length;
  return Math.min(taken, expected) / expected;
}

// ---------------------------------------------------------------------------
// Compromissos
// ---------------------------------------------------------------------------

type AppointmentInput = {
  title: string;
  kind: AppointmentKind;
  professional: string;
  scheduledAt: Date;
  reminderOffsetMinutes: number | null;
  notes: string;
};

function reminderBody(input: AppointmentInput) {
  const when = input.scheduledAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${APPOINTMENT_KIND_LABELS[input.kind]} em ${when}${input.professional ? ` · ${input.professional}` : ""}`;
}

export async function createAppointment(userId: string, input: AppointmentInput) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: userId,
      title: input.title,
      kind: input.kind,
      professional: input.professional || null,
      scheduled_at: input.scheduledAt.toISOString(),
      reminder_offset_minutes: input.reminderOffsetMinutes,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleAppointmentReminder(input);
  if (notificationId) {
    await supabase.from("appointments").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateAppointment(appointment: Appointment, input: AppointmentInput) {
  await cancelReminder(appointment.notification_id);
  const notificationId = await scheduleAppointmentReminder(input);

  const { error } = await supabase
    .from("appointments")
    .update({
      title: input.title,
      kind: input.kind,
      professional: input.professional || null,
      scheduled_at: input.scheduledAt.toISOString(),
      reminder_offset_minutes: input.reminderOffsetMinutes,
      notes: input.notes || null,
      notification_id: notificationId,
    })
    .eq("id", appointment.id);
  if (error) throw error;
}

async function scheduleAppointmentReminder(input: AppointmentInput) {
  if (input.reminderOffsetMinutes === null) return null;
  const reminderDate = new Date(input.scheduledAt.getTime() - input.reminderOffsetMinutes * 60000);
  return scheduleOneTimeReminder(reminderDate, `Lembrete: ${input.title}`, reminderBody(input));
}

export async function deleteAppointment(appointment: Appointment) {
  await cancelReminder(appointment.notification_id);
  const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
  if (error) throw error;
}

export async function toggleAppointmentCompleted(appointment: Appointment) {
  const { error } = await supabase
    .from("appointments")
    .update({ completed_at: appointment.completed_at ? null : new Date().toISOString() })
    .eq("id", appointment.id);
  if (error) throw error;
}

export function daysUntil(dateIso: string, now = new Date()) {
  const target = new Date(dateIso);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function formatAppointmentDate(dateIso: string) {
  return new Date(dateIso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Medições (pressão arterial / glicemia)
// ---------------------------------------------------------------------------

/**
 * Registro avulso de medição — separado de remédio (que é lembrete recorrente) e de
 * compromisso (que é evento agendado): aqui é só "medi agora, anota o número". Pressão e
 * glicemia na mesma tabela (`kind` diferencia o formato dos campos) porque as duas são
 * leituras rápidas do mesmo tipo — número(s) + horário — sem precisar de duas telas
 * separadas fazendo a mesma coisa.
 */
export type MeasurementKind = "pressao" | "glicemia";

export const MEASUREMENT_KIND_LABELS: Record<MeasurementKind, string> = {
  pressao: "Pressão arterial",
  glicemia: "Glicemia",
};

export type GlucoseContext = "jejum" | "pos_prandial" | "aleatoria";

export const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  jejum: "Em jejum",
  pos_prandial: "Depois de comer",
  aleatoria: "A qualquer hora",
};

export type HealthMeasurement = {
  id: string;
  kind: MeasurementKind;
  measured_at: string; // ISO
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  glucose_mg_dl: number | null;
  glucose_context: GlucoseContext | null;
  notes: string | null;
};

export async function fetchHealthMeasurements(): Promise<HealthMeasurement[]> {
  const { data, error } = await supabase
    .from("health_measurements")
    .select("id, kind, measured_at, systolic, diastolic, pulse, glucose_mg_dl, glucose_context, notes")
    .order("measured_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as HealthMeasurement[];
}

type PressureInput = { measuredAt: Date; systolic: number; diastolic: number; pulse: number | null; notes: string };
type GlucoseInput = { measuredAt: Date; glucoseMgDl: number; glucoseContext: GlucoseContext; notes: string };

export async function createPressureMeasurement(userId: string, input: PressureInput) {
  const { error } = await supabase.from("health_measurements").insert({
    user_id: userId,
    kind: "pressao",
    measured_at: input.measuredAt.toISOString(),
    systolic: input.systolic,
    diastolic: input.diastolic,
    pulse: input.pulse,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function createGlucoseMeasurement(userId: string, input: GlucoseInput) {
  const { error } = await supabase.from("health_measurements").insert({
    user_id: userId,
    kind: "glicemia",
    measured_at: input.measuredAt.toISOString(),
    glucose_mg_dl: input.glucoseMgDl,
    glucose_context: input.glucoseContext,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function deleteHealthMeasurement(id: string) {
  const { error } = await supabase.from("health_measurements").delete().eq("id", id);
  if (error) throw error;
}

export type MeasurementTone = "success" | "warning" | "danger";

/**
 * Classificação de pressão arterial por faixas de referência gerais (mesmas usadas por
 * monitores de pressão de farmácia, baseadas em diretrizes públicas de sociedades de
 * cardiologia) — é só uma referência informativa, NÃO é diagnóstico nem substitui avaliação
 * médica. Quando sistólica e diastólica caem em faixas diferentes, vale a mais alta das
 * duas (convenção médica padrão).
 */
export function classifyBloodPressure(systolic: number, diastolic: number): { label: string; tone: MeasurementTone } {
  if (systolic > 180 || diastolic > 120) return { label: "Crise hipertensiva — procure ajuda médica", tone: "danger" };
  if (systolic >= 140 || diastolic >= 90) return { label: "Alta (estágio 2)", tone: "danger" };
  if (systolic >= 130 || diastolic >= 80) return { label: "Alta (estágio 1)", tone: "warning" };
  if (systolic >= 120) return { label: "Elevada", tone: "warning" };
  return { label: "Normal", tone: "success" };
}

/**
 * Classificação de glicemia por faixas de referência gerais — varia bastante com o
 * contexto (jejum x depois de comer), então o contexto informado no registro entra na
 * conta. Mesma ressalva: referência informativa, não é diagnóstico.
 */
export function classifyGlucose(mgDl: number, context: GlucoseContext): { label: string; tone: MeasurementTone } {
  if (mgDl < 70) return { label: "Baixa", tone: "danger" };
  if (context === "jejum") {
    if (mgDl <= 99) return { label: "Normal", tone: "success" };
    if (mgDl <= 125) return { label: "Elevada (referência de pré-diabetes)", tone: "warning" };
    return { label: "Muito elevada (referência de diabetes)", tone: "danger" };
  }
  // Depois de comer / a qualquer hora — faixa mais alta é esperada.
  if (mgDl <= 139) return { label: "Normal", tone: "success" };
  if (mgDl <= 199) return { label: "Elevada (referência de pré-diabetes)", tone: "warning" };
  return { label: "Muito elevada (referência de diabetes)", tone: "danger" };
}

export function formatMeasuredAt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
