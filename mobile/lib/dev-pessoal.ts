import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/rotina";

/**
 * Camada de dados do módulo Dev. Pessoal — motivações (frase do dia), metas, diário e
 * humor diário (esse último em `mood_logs`, compartilhado com a Fase 2 de IA cruzada).
 */

export type Motivation = {
  id: string;
  label: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null; // YYYY-MM-DD
  completed_at: string | null;
};

export type JournalEntry = {
  id: string;
  content: string;
  mood_score: number | null;
  created_at: string;
};

export type MoodLog = {
  id: string;
  log_date: string; // YYYY-MM-DD
  score: number;
  note: string | null;
};

/** Emojis pra representar score 1..5 — índice 0 = score 1. Fonte única, reusada nos
 * formulários de diário e de humor pra não desalinhar a escala entre as telas. */
export const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"] as const;

export async function fetchDevPessoal() {
  // Cobre o mês atual inteiro (pro MonthHeatmap) e ao menos os últimos 7 dias (pra fita
  // rápida de humor) — usa o que for mais cedo, igual à Rotina.
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < sevenDaysAgo ? monthStart : sevenDaysAgo;

  const [motivationsRes, goalsRes, journalRes, moodRes] = await Promise.all([
    supabase.from("motivations").select("id, label").order("position", { ascending: true }),
    supabase
      .from("goals")
      .select("id, title, description, target_date, completed_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("id, content, mood_score, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("mood_logs")
      .select("id, log_date, score, note")
      .gte("log_date", toDateString(since)),
  ]);

  if (motivationsRes.error) throw motivationsRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (journalRes.error) throw journalRes.error;
  if (moodRes.error) throw moodRes.error;

  return {
    motivations: (motivationsRes.data ?? []) as Motivation[],
    goals: (goalsRes.data ?? []) as Goal[],
    journalEntries: (journalRes.data ?? []) as JournalEntry[],
    moodLogs: (moodRes.data ?? []) as MoodLog[],
  };
}

// ---- Gamificação (inspirado no Habitica) ----
//
// Nada de tabela nova: o XP é só uma soma determinística em cima de ações que a pessoa já
// fez de verdade (meta concluída, entrada no diário, humor registrado) — mesmo princípio
// de "insights manuais" do resto do app, sem fabricar progresso nenhum.

export const XP_PER_GOAL_COMPLETED = 30;
export const XP_PER_JOURNAL_ENTRY = 10;
export const XP_PER_MOOD_LOG = 5;
/** XP necessário por nível — nível sobe a cada 100 XP acumulado. */
export const XP_PER_LEVEL = 100;

export type Gamification = {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  breakdown: { goalsXp: number; journalXp: number; moodXp: number };
};

export function computeGamification(
  goals: Goal[],
  journalEntries: JournalEntry[],
  moodLogs: MoodLog[]
): Gamification {
  const goalsXp = goals.filter((g) => g.completed_at).length * XP_PER_GOAL_COMPLETED;
  const journalXp = journalEntries.length * XP_PER_JOURNAL_ENTRY;
  const moodXp = moodLogs.length * XP_PER_MOOD_LOG;
  const totalXp = goalsXp + journalXp + moodXp;

  return {
    totalXp,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: totalXp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
    breakdown: { goalsXp, journalXp, moodXp },
  };
}

// ---- Metas: status derivado (sem coluna nova) ----

export type GoalStatus = "completed" | "overdue" | "active";

export function deriveGoalStatus(goal: Goal, today = toDateString(new Date())): GoalStatus {
  if (goal.completed_at) return "completed";
  if (goal.target_date && goal.target_date < today) return "overdue";
  return "active";
}

/** Dias até o prazo (negativo se já passou) — só faz sentido pra metas com `target_date`. */
export function daysUntil(dateStr: string, today = toDateString(new Date())): number {
  const a = new Date(`${today}T12:00:00`);
  const b = new Date(`${dateStr}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Escolhe a "frase do dia" de forma determinística — a mesma frase o dia inteiro. */
export function pickPhraseOfDay(motivations: Motivation[]): Motivation | null {
  if (motivations.length === 0) return null;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return motivations[dayOfYear % motivations.length];
}

// ---- Motivações ----

export async function createMotivation(userId: string, label: string, position: number) {
  const { error } = await supabase.from("motivations").insert({ user_id: userId, label, position });
  if (error) throw error;
}

export async function updateMotivation(id: string, label: string) {
  const { error } = await supabase.from("motivations").update({ label }).eq("id", id);
  if (error) throw error;
}

export async function deleteMotivation(id: string) {
  const { error } = await supabase.from("motivations").delete().eq("id", id);
  if (error) throw error;
}

// ---- Metas ----

export async function createGoal(
  userId: string,
  input: { title: string; description: string; targetDate: string | null }
) {
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: input.title,
    description: input.description || null,
    target_date: input.targetDate,
  });
  if (error) throw error;
}

export async function updateGoal(
  id: string,
  input: { title: string; description: string; targetDate: string | null }
) {
  const { error } = await supabase
    .from("goals")
    .update({
      title: input.title,
      description: input.description || null,
      target_date: input.targetDate,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleGoalCompleted(userId: string, goal: Goal, isCurrentlyCompleted: boolean) {
  const { error } = await supabase
    .from("goals")
    .update({ completed_at: isCurrentlyCompleted ? null : new Date().toISOString() })
    .eq("id", goal.id);
  if (error) throw error;

  // Só grava evento ao concluir, nunca ao desmarcar — mesmo padrão da Rotina/Treino.
  if (!isCurrentlyCompleted) {
    await supabase.from("module_events").insert({
      user_id: userId,
      module_slug: "dev-pessoal",
      event_type: "goal_completed",
      payload: { goal_id: goal.id, title: goal.title },
    });
  }
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

// ---- Diário ----

export async function createJournalEntry(userId: string, content: string, moodScore: number | null) {
  const { error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, content, mood_score: moodScore });
  if (error) throw error;
}

export async function updateJournalEntry(id: string, content: string, moodScore: number | null) {
  const { error } = await supabase
    .from("journal_entries")
    .update({ content, mood_score: moodScore })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteJournalEntry(id: string) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

// ---- Humor diário (mood_logs) ----

/** Cria ou atualiza o humor de um dia específico (upsert por ser único por user+dia). */
export async function upsertMoodLog(userId: string, logDate: string, score: number, note: string) {
  const { error } = await supabase
    .from("mood_logs")
    .upsert(
      { user_id: userId, log_date: logDate, score, note: note || null },
      { onConflict: "user_id,log_date" }
    );
  if (error) throw error;

  // Alimenta a Fase 2 (correlação humor x outros módulos). Grava com a data do log (que
  // pode ser um dia passado sendo corrigido), não a data de hoje.
  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "dev-pessoal",
    event_type: "mood_logged",
    payload: { score },
    occurred_at: new Date(`${logDate}T12:00:00`).toISOString(),
  });
}

export async function deleteMoodLog(id: string) {
  const { error } = await supabase.from("mood_logs").delete().eq("id", id);
  if (error) throw error;
}
