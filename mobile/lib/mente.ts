import { supabase } from "@/lib/supabase";
import { toDateString, lastSevenDays, WEEKDAY_LABELS, streakMilestone } from "@/lib/rotina";

/**
 * Camada de dados do módulo Mente — sessões de mindfulness (meditação, respiração,
 * journaling) registradas manualmente (mesmo modelo de "registrar sessão" do Estudos, sem
 * cronômetro ao vivo) e uma referência estática de técnicas rápidas, inspirada no formato
 * "escolha como você está e veja uma técnica" do Cíngulo/Buddhify que ela mandou — conteúdo
 * curado por mim, sem IA/personalização, pra não inventar "insight" nenhum.
 */

export const SESSION_KINDS = ["meditacao", "respiracao", "journaling", "outro"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  meditacao: "Meditação",
  respiracao: "Respiração",
  journaling: "Journaling",
  outro: "Outro",
};

export const SESSION_KIND_COLOR_KEYS: Record<SessionKind, "chart1" | "chart2" | "chart3" | "chart4"> = {
  meditacao: "chart1",
  respiracao: "chart2",
  journaling: "chart3",
  outro: "chart4",
};

export const SESSION_QUICK_ADD_MINUTES = [5, 10, 20] as const;

export type MindfulnessSession = {
  id: string;
  kind: SessionKind;
  duration_minutes: number;
  session_date: string;
};

export type QuickTechnique = { title: string; description: string };

/** Referência estática — não é dado da pessoa, é só um cheat sheet fixo dentro do app. */
export const QUICK_TECHNIQUES: QuickTechnique[] = [
  {
    title: "Respiração 4-7-8",
    description: "Inspire contando até 4, segure contando até 7, solte contando até 8. Repita 4 vezes.",
  },
  {
    title: "Grounding 5-4-3-2-1",
    description: "Note 5 coisas que você vê, 4 que sente, 3 que ouve, 2 que cheira e 1 que saboreia.",
  },
  {
    title: "Body scan rápido",
    description: "Da cabeça aos pés, perceba tensão em cada parte do corpo e solte devagar, sem pressa.",
  },
  {
    title: "Journaling de 3 linhas",
    description: "Escreva 1 coisa que te incomodou hoje, 1 pela qual é grata e 1 intenção pra amanhã.",
  },
];

export async function fetchMente() {
  const today = new Date();
  const streakWindowStart = new Date();
  streakWindowStart.setDate(streakWindowStart.getDate() - 34);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < streakWindowStart ? monthStart : streakWindowStart;

  const { data, error } = await supabase
    .from("mindfulness_sessions")
    .select("id, kind, duration_minutes, session_date")
    .gte("session_date", toDateString(since))
    .order("created_at", { ascending: true });
  if (error) throw error;

  return { sessions: (data ?? []) as MindfulnessSession[] };
}

export async function logMindfulnessSession(userId: string, kind: SessionKind, minutes: number) {
  const { error } = await supabase
    .from("mindfulness_sessions")
    .insert({ user_id: userId, kind, duration_minutes: minutes });
  if (error) throw error;
}

export async function undoLastMindfulnessSession(sessionId: string) {
  const { error } = await supabase.from("mindfulness_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export function computeMinutesLast7Days(sessions: MindfulnessSession[]) {
  const dates = new Set(lastSevenDays().map(toDateString));
  return sessions.filter((s) => dates.has(s.session_date)).reduce((sum, s) => sum + s.duration_minutes, 0);
}

export function computeWeeklyMinutesByDay(sessions: MindfulnessSession[]) {
  return lastSevenDays().map((date) => {
    const dateStr = toDateString(date);
    const value = sessions.filter((s) => s.session_date === dateStr).reduce((sum, s) => sum + s.duration_minutes, 0);
    return { label: WEEKDAY_LABELS[date.getDay()], value };
  });
}

export function computeKindBreakdown(sessions: MindfulnessSession[], colorFor: (key: "chart1" | "chart2" | "chart3" | "chart4") => string) {
  return SESSION_KINDS.map((kind) => ({
      label: SESSION_KIND_LABELS[kind],
      value: sessions.filter((s) => s.kind === kind).reduce((sum, s) => sum + s.duration_minutes, 0),
      color: colorFor(SESSION_KIND_COLOR_KEYS[kind]),
    }))
    .filter((item) => item.value > 0);
}

export function computeDayMinutes(dateStr: string, sessions: MindfulnessSession[]) {
  return sessions.filter((s) => s.session_date === dateStr).reduce((sum, s) => sum + s.duration_minutes, 0);
}

/** Dias consecutivos com pelo menos uma sessão, olhando os últimos 60 dias — mesma folga dos outros streaks. */
export function computeMindfulnessStreak(sessions: MindfulnessSession[]): number {
  const dates = new Set(sessions.map((s) => s.session_date));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const dateStr = toDateString(cursor);
    if (dates.has(dateStr)) {
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
