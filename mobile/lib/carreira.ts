import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/rotina";
import { scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Carreira — metas de carreira (com prazo, status derivado por
 * data), cursos/certificações (com status manual) e prazos importantes com lembrete (mesma
 * receita de lembrete das tarefas de Estudos). Sem referência específica dela pra esse
 * módulo — desenhado com base no que apps de carreira/produtividade profissional costumam
 * cobrir, e no resumo que já estava anotado em `lib/modules.ts`.
 */

export type CareerGoal = {
  id: string;
  title: string;
  target_date: string | null; // YYYY-MM-DD
  completed_at: string | null;
  notes: string | null;
};

export type GoalStatus = "completed" | "overdue" | "active";

export function deriveGoalStatus(goal: CareerGoal, today = toDateString(new Date())): GoalStatus {
  if (goal.completed_at) return "completed";
  if (goal.target_date && goal.target_date < today) return "overdue";
  return "active";
}

export const COURSE_STATUSES = ["planejado", "em_andamento", "concluido"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export type Course = {
  id: string;
  title: string;
  institution: string | null;
  status: CourseStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

export const DEADLINE_REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No dia (9h)", value: 0 },
  { label: "1 dia antes", value: 1 },
  { label: "3 dias antes", value: 3 },
  { label: "1 semana antes", value: 7 },
] as const;

export type CareerDeadline = {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  reminder_days_before: number | null;
  notification_id: string | null;
  notes: string | null;
  done: boolean;
};

export async function fetchCarreira() {
  const [goalsRes, coursesRes, deadlinesRes] = await Promise.all([
    supabase
      .from("career_goals")
      .select("id, title, target_date, completed_at, notes")
      .order("target_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("courses")
      .select("id, title, institution, status, start_date, end_date, notes")
      .order("created_at", { ascending: true }),
    supabase
      .from("career_deadlines")
      .select("id, title, due_date, reminder_days_before, notification_id, notes, done")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true }),
  ]);

  if (goalsRes.error) throw goalsRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (deadlinesRes.error) throw deadlinesRes.error;

  return {
    goals: (goalsRes.data ?? []) as CareerGoal[],
    courses: (coursesRes.data ?? []) as Course[],
    deadlines: (deadlinesRes.data ?? []) as CareerDeadline[],
  };
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

export type GoalInput = { title: string; targetDate: string | null; notes: string };

export async function createCareerGoal(userId: string, input: GoalInput) {
  const { error } = await supabase
    .from("career_goals")
    .insert({ user_id: userId, title: input.title, target_date: input.targetDate, notes: input.notes || null });
  if (error) throw error;
}

export async function updateCareerGoal(goalId: string, input: GoalInput) {
  const { error } = await supabase
    .from("career_goals")
    .update({ title: input.title, target_date: input.targetDate, notes: input.notes || null })
    .eq("id", goalId);
  if (error) throw error;
}

export async function toggleCareerGoalCompleted(goal: CareerGoal) {
  const { error } = await supabase
    .from("career_goals")
    .update({ completed_at: goal.completed_at ? null : new Date().toISOString() })
    .eq("id", goal.id);
  if (error) throw error;
}

export async function deleteCareerGoal(goalId: string) {
  const { error } = await supabase.from("career_goals").delete().eq("id", goalId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Cursos e certificações
// ---------------------------------------------------------------------------

export type CourseInput = {
  title: string;
  institution: string;
  status: CourseStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string;
};

export async function createCourse(userId: string, input: CourseInput) {
  const { error } = await supabase.from("courses").insert({
    user_id: userId,
    title: input.title,
    institution: input.institution || null,
    status: input.status,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function updateCourse(courseId: string, input: CourseInput) {
  const { error } = await supabase
    .from("courses")
    .update({
      title: input.title,
      institution: input.institution || null,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes || null,
    })
    .eq("id", courseId);
  if (error) throw error;
}

export async function deleteCourse(courseId: string) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Prazos importantes
// ---------------------------------------------------------------------------

export type DeadlineInput = { title: string; dueDate: string; reminderDaysBefore: number | null; notes: string };

async function scheduleDeadlineReminder(input: DeadlineInput) {
  if (input.reminderDaysBefore === null) return null;
  const [y, m, d] = input.dueDate.split("-").map(Number);
  const reminderDate = new Date(y, m - 1, d, 9, 0, 0);
  reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);
  const body = input.notes ? input.notes : "Prazo chegando — dá uma olhada.";
  return scheduleOneTimeReminder(reminderDate, `Prazo: ${input.title}`, body);
}

export async function createCareerDeadline(userId: string, input: DeadlineInput) {
  const { data, error } = await supabase
    .from("career_deadlines")
    .insert({ user_id: userId, title: input.title, due_date: input.dueDate, reminder_days_before: input.reminderDaysBefore, notes: input.notes || null })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleDeadlineReminder(input);
  if (notificationId) {
    await supabase.from("career_deadlines").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateCareerDeadline(deadline: CareerDeadline, input: DeadlineInput) {
  await cancelReminder(deadline.notification_id);
  const notificationId = await scheduleDeadlineReminder(input);

  const { error } = await supabase
    .from("career_deadlines")
    .update({
      title: input.title,
      due_date: input.dueDate,
      reminder_days_before: input.reminderDaysBefore,
      notification_id: notificationId,
      notes: input.notes || null,
    })
    .eq("id", deadline.id);
  if (error) throw error;
}

export async function toggleCareerDeadlineDone(deadline: CareerDeadline, done: boolean) {
  if (done) await cancelReminder(deadline.notification_id);
  const { error } = await supabase
    .from("career_deadlines")
    .update({ done, notification_id: done ? null : deadline.notification_id })
    .eq("id", deadline.id);
  if (error) throw error;
}

export async function deleteCareerDeadline(deadline: CareerDeadline) {
  await cancelReminder(deadline.notification_id);
  const { error } = await supabase.from("career_deadlines").delete().eq("id", deadline.id);
  if (error) throw error;
}

export function daysUntilDate(dateStr: string, now = new Date()) {
  const target = new Date(`${dateStr}T12:00:00`);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
