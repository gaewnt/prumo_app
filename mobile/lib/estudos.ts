import { supabase } from "@/lib/supabase";
import { toDateString, lastSevenDays, WEEKDAY_LABELS, streakMilestone } from "@/lib/rotina";
import { fetchModulePreference } from "@/lib/onboarding";
import { scheduleWeeklyReminder, scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Estudos — matérias (com horário de aula, pra quem é
 * universitário), sessões de estudo (tempo registrado, não cronômetro ao vivo — mesma
 * escolha já feita em Biblioteca pro cronômetro de leitura: fica pra uma leva futura se ela
 * quiser) e tarefas/atividades com prazo e lembrete, ligadas a uma matéria de forma opcional.
 */

export const SUBJECT_COLOR_KEYS = ["chart1", "chart2", "chart3", "chart4", "chart5"] as const;
export type SubjectColorKey = (typeof SUBJECT_COLOR_KEYS)[number];

export type Subject = {
  id: string;
  name: string;
  color_key: SubjectColorKey;
};

export type ClassSchedule = {
  id: string;
  subject_id: string;
  weekday: number; // 0 = domingo … 6 = sábado
  start_time: string; // "HH:MM"
  end_time: string | null;
  location: string | null;
  reminder_minutes_before: number | null;
  notification_id: string | null;
};

export type StudySession = {
  id: string;
  subject_id: string;
  duration_minutes: number;
  session_date: string;
};

export type StudyTask = {
  id: string;
  subject_id: string | null;
  title: string;
  due_date: string | null; // YYYY-MM-DD
  notes: string | null;
  done: boolean;
  reminder_days_before: number | null;
  notification_id: string | null;
};

/** Quantidades de atalho pro registro rápido de sessão — pomodoro (25) e o dobro (50). */
export const SESSION_QUICK_ADD_MINUTES = [25, 50] as const;

/** Horário fixo do lembrete de tarefa/atividade — `due_date` não tem hora, só dia. */
const TASK_REMINDER_HOUR = 9;

export const TASK_REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No dia (9h)", value: 0 },
  { label: "1 dia antes", value: 1 },
  { label: "3 dias antes", value: 3 },
  { label: "1 semana antes", value: 7 },
] as const;

export const CLASS_REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No horário", value: 0 },
  { label: "10 min antes", value: 10 },
  { label: "30 min antes", value: 30 },
  { label: "1h antes", value: 60 },
] as const;

export async function fetchEstudos() {
  // ~5 semanas de histórico dá folga pro cálculo de streak; o início do mês atual garante
  // que o MonthHeatmap sempre tenha o mês inteiro, mesmo nos primeiros dias dele — mesma
  // lógica do `fetchHabitsWithLogs` da Rotina.
  const today = new Date();
  const streakWindowStart = new Date();
  streakWindowStart.setDate(streakWindowStart.getDate() - 34);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < streakWindowStart ? monthStart : streakWindowStart;

  const [subjectsRes, schedulesRes, sessionsRes, tasksRes, prefs] = await Promise.all([
    supabase.from("subjects").select("id, name, color_key").order("created_at", { ascending: true }),
    supabase
      .from("subject_schedules")
      .select("id, subject_id, weekday, start_time, end_time, location, reminder_minutes_before, notification_id")
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("study_sessions")
      .select("id, subject_id, duration_minutes, session_date")
      .gte("session_date", toDateString(since))
      .order("created_at", { ascending: true }),
    supabase
      .from("study_tasks")
      .select("id, subject_id, title, due_date, notes, done, reminder_days_before, notification_id")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    fetchModulePreference("estudos"),
  ]);

  if (subjectsRes.error) throw subjectsRes.error;
  if (schedulesRes.error) throw schedulesRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const metaHorasSemana = Number(prefs.meta_horas_semana as string | number | undefined);

  return {
    subjects: (subjectsRes.data ?? []) as Subject[],
    schedules: (schedulesRes.data ?? []) as ClassSchedule[],
    sessions: (sessionsRes.data ?? []) as StudySession[],
    tasks: (tasksRes.data ?? []) as StudyTask[],
    metaMinutosSemana: metaHorasSemana > 0 ? Math.round(metaHorasSemana * 60) : null,
  };
}

// ---------------------------------------------------------------------------
// Matérias
// ---------------------------------------------------------------------------

export async function createSubject(userId: string, name: string, colorKey: SubjectColorKey) {
  const { error } = await supabase.from("subjects").insert({ user_id: userId, name, color_key: colorKey });
  if (error) throw error;
}

export async function updateSubject(subjectId: string, name: string, colorKey: SubjectColorKey) {
  const { error } = await supabase.from("subjects").update({ name, color_key: colorKey }).eq("id", subjectId);
  if (error) throw error;
}

/** Some com a matéria e, em cascata, com as sessões e horários dela — tarefas ligadas ficam sem matéria (não são apagadas). */
export async function deleteSubject(subjectId: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Horário de aula
// ---------------------------------------------------------------------------

export type ClassScheduleInput = {
  weekday: number;
  startTime: string;
  endTime: string;
  location: string;
  reminderMinutesBefore: number | null;
};

function parseTimeParts(hhmm: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Calcula dia da semana + horário do lembrete subtraindo minutos do horário de início da
 * aula — se isso "voltar" pro dia anterior (aula de madrugada + lembrete de 30min antes, por
 * exemplo), o dia da semana do lembrete também volta um, senão o lembrete dispararia no dia
 * errado.
 */
function reminderWeekdayTime(weekday: number, startTime: string, minutesBefore: number) {
  const parsed = parseTimeParts(startTime);
  if (!parsed) return null;
  let totalMinutes = parsed.hour * 60 + parsed.minute - minutesBefore;
  let reminderWeekday = weekday;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    reminderWeekday = (weekday + 6) % 7;
  }
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { weekday: reminderWeekday, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

async function scheduleClassReminder(subjectName: string, input: ClassScheduleInput) {
  if (input.reminderMinutesBefore === null) return null;
  const reminder = reminderWeekdayTime(input.weekday, input.startTime, input.reminderMinutesBefore);
  if (!reminder) return null;
  const body = `${subjectName} às ${input.startTime}${input.location ? ` · ${input.location}` : ""}`;
  return scheduleWeeklyReminder(reminder.weekday, reminder.time, `Aula: ${subjectName}`, body);
}

export async function createClassSchedule(userId: string, subjectId: string, subjectName: string, input: ClassScheduleInput) {
  const { data, error } = await supabase
    .from("subject_schedules")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime || null,
      location: input.location || null,
      reminder_minutes_before: input.reminderMinutesBefore,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleClassReminder(subjectName, input);
  if (notificationId) {
    await supabase.from("subject_schedules").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateClassSchedule(schedule: ClassSchedule, subjectName: string, input: ClassScheduleInput) {
  await cancelReminder(schedule.notification_id);
  const notificationId = await scheduleClassReminder(subjectName, input);

  const { error } = await supabase
    .from("subject_schedules")
    .update({
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime || null,
      location: input.location || null,
      reminder_minutes_before: input.reminderMinutesBefore,
      notification_id: notificationId,
    })
    .eq("id", schedule.id);
  if (error) throw error;
}

export async function deleteClassSchedule(schedule: ClassSchedule) {
  await cancelReminder(schedule.notification_id);
  const { error } = await supabase.from("subject_schedules").delete().eq("id", schedule.id);
  if (error) throw error;
}

/** Aulas de um dia da semana, ordenadas por horário — usado pra montar a agenda semanal. */
export function schedulesForWeekday(schedules: ClassSchedule[], weekday: number) {
  return schedules.filter((s) => s.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

// ---------------------------------------------------------------------------
// Sessões de estudo
// ---------------------------------------------------------------------------

/** Cada registro é uma linha nova (igual à água da Dieta) — dá pra desfazer o último sem zerar o dia inteiro. */
export async function logStudySession(userId: string, subjectId: string, minutes: number) {
  const { error } = await supabase
    .from("study_sessions")
    .insert({ user_id: userId, subject_id: subjectId, duration_minutes: minutes });
  if (error) throw error;
}

export async function undoLastStudySession(sessionId: string) {
  const { error } = await supabase.from("study_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export function computeMinutesToday(sessions: StudySession[], today = toDateString(new Date())) {
  return sessions.filter((s) => s.session_date === today).reduce((sum, s) => sum + s.duration_minutes, 0);
}

export function computeMinutesLast7Days(sessions: StudySession[]) {
  const dates = new Set(lastSevenDays().map(toDateString));
  return sessions.filter((s) => dates.has(s.session_date)).reduce((sum, s) => sum + s.duration_minutes, 0);
}

export function computeWeeklyMinutesByDay(sessions: StudySession[]) {
  return lastSevenDays().map((date) => {
    const dateStr = toDateString(date);
    const value = sessions.filter((s) => s.session_date === dateStr).reduce((sum, s) => sum + s.duration_minutes, 0);
    return { label: WEEKDAY_LABELS[date.getDay()], value };
  });
}

export function computeSubjectBreakdown(subjects: Subject[], sessions: StudySession[], colorFor: (key: SubjectColorKey) => string) {
  return subjects
    .map((subject) => ({
      label: subject.name,
      value: sessions.filter((s) => s.subject_id === subject.id).reduce((sum, s) => sum + s.duration_minutes, 0),
      color: colorFor(subject.color_key),
    }))
    .filter((item) => item.value > 0);
}

export function computeDayMinutes(dateStr: string, sessions: StudySession[]) {
  return sessions.filter((s) => s.session_date === dateStr).reduce((sum, s) => sum + s.duration_minutes, 0);
}

/** Dias consecutivos com pelo menos uma sessão registrada, olhando os últimos 60 dias. */
export function computeStudyStreak(allSessionDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const dateStr = toDateString(cursor);
    if (allSessionDates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // hoje ainda sem sessão não quebra a sequência, só não conta ainda.
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export { streakMilestone };

// ---------------------------------------------------------------------------
// Tarefas e atividades com prazo
// ---------------------------------------------------------------------------

export type StudyTaskInput = {
  title: string;
  subjectId: string | null;
  dueDate: string | null; // YYYY-MM-DD
  notes: string;
  reminderDaysBefore: number | null;
};

async function scheduleTaskReminder(input: StudyTaskInput) {
  if (input.reminderDaysBefore === null || !input.dueDate) return null;
  const [y, m, d] = input.dueDate.split("-").map(Number);
  const reminderDate = new Date(y, m - 1, d, TASK_REMINDER_HOUR, 0, 0);
  reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);
  const body = input.notes ? input.notes : "Prazo chegando — dá uma olhada nessa atividade.";
  return scheduleOneTimeReminder(reminderDate, `Entrega: ${input.title}`, body);
}

export async function createStudyTask(userId: string, input: StudyTaskInput) {
  const { data, error } = await supabase
    .from("study_tasks")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      title: input.title,
      due_date: input.dueDate,
      notes: input.notes || null,
      reminder_days_before: input.reminderDaysBefore,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleTaskReminder(input);
  if (notificationId) {
    await supabase.from("study_tasks").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateStudyTask(task: StudyTask, input: StudyTaskInput) {
  await cancelReminder(task.notification_id);
  const notificationId = await scheduleTaskReminder(input);

  const { error } = await supabase
    .from("study_tasks")
    .update({
      subject_id: input.subjectId,
      title: input.title,
      due_date: input.dueDate,
      notes: input.notes || null,
      reminder_days_before: input.reminderDaysBefore,
      notification_id: notificationId,
    })
    .eq("id", task.id);
  if (error) throw error;
}

/** Ao concluir, cancela o lembrete pendente (não faz sentido lembrar de algo já feito). */
export async function toggleStudyTaskDone(task: StudyTask, done: boolean) {
  if (done) await cancelReminder(task.notification_id);
  const { error } = await supabase
    .from("study_tasks")
    .update({ done, notification_id: done ? null : task.notification_id })
    .eq("id", task.id);
  if (error) throw error;
}

export async function deleteStudyTask(task: StudyTask) {
  await cancelReminder(task.notification_id);
  const { error } = await supabase.from("study_tasks").delete().eq("id", task.id);
  if (error) throw error;
}

export function daysUntilDate(dueDate: string, now = new Date()) {
  const target = new Date(`${dueDate}T12:00:00`);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function formatDueDate(dueDate: string) {
  const [y, m, d] = dueDate.split("-");
  return `${d}/${m}/${y}`;
}
