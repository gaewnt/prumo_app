import { supabase } from "@/lib/supabase";

/**
 * Camada de dados do módulo Rotina — hábitos diários com repetição semanal.
 * `active_days` usa a mesma convenção do Postgres/JS Date: 0 = domingo … 6 = sábado.
 */

export type Habit = {
  id: string;
  name: string;
  active_days: number[];
  created_at: string;
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

/** Janela de histórico buscada por padrão — dá folga suficiente pra streak (que antes
 * ficava presa a ~34 dias, bem menos que o próprio limite de 60 dias que `computeStreak`
 * tentava olhar) e principalmente pra "força do hábito" (`computeHabitStrength`), que
 * precisa de várias ocorrências pra convergir num número que signifique alguma coisa —
 * ainda mais pra hábito de frequência baixa (1x/semana só dá ~4 ocorrências em 34 dias). */
const HABIT_LOGS_WINDOW_DAYS = 180;

export async function fetchHabitsWithLogs() {
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, active_days, created_at")
    .order("created_at", { ascending: true });
  if (habitsError) throw habitsError;

  // O início do mês atual garante que o MonthHeatmap sempre tenha o mês inteiro, mesmo nos
  // primeiros dias dele (quando a janela de 180 dias, sozinha, ainda cobriria de sobra —
  // mas o `min` é mantido por segurança/clareza, e porque é o mesmo padrão usado nos outros
  // módulos com streak). Usa o que for mais cedo.
  const today = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - HABIT_LOGS_WINDOW_DAYS);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const since = monthStart < windowStart ? monthStart : windowStart;
  const logsSince = toDateString(since);

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date, completed")
    .gte("log_date", logsSince);
  if (logsError) throw logsError;

  return { habits: (habits ?? []) as Habit[], logs: (logs ?? []) as HabitLog[], logsSince };
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

/** Dias consecutivos completados, contando só os dias em que o hábito está ativo. Conta só
 * até `logsSince` (o início real da janela buscada, ver `fetchHabitsWithLogs`) — antes tinha
 * um limite fixo de 60 dias que não batia com a janela de fato buscada (~34 dias), então uma
 * streak genuinamente mais longa que a janela buscada podia ser subcontada sem aviso. */
export function computeStreak(logs: HabitLog[], habit: Habit, logsSince?: string): number {
  const doneDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.log_date)
  );

  let streak = 0;
  const cursor = new Date();
  let i = 0;

  // Trava de segurança (~2 anos) além do corte por `logsSince` — nunca deixa rodar pra
  // sempre se algum dia essa função for chamada sem o parâmetro.
  while (i < 730 && (!logsSince || toDateString(cursor) >= logsSince)) {
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
    i++;
  }

  return streak;
}

/** Peso de cada nova ocorrência na "força do hábito" — meia-vida de ~4 ocorrências
 * (`ln(0.5) / ln(1 - STRENGTH_DECAY)`): um punhado de faltas seguidas já derruba a força
 * visivelmente, mas uma falta isolada não zera nada, diferente da streak. */
const STRENGTH_DECAY = 0.15;

/**
 * "Força do hábito" (0 a 1) — inspirada no Loop Habit Tracker: em vez de só contar dias
 * seguidos (streak, que uma falta isolada zera inteira), pondera a frequência de
 * cumprimento ao longo do tempo com peso maior pro que é mais recente (média móvel
 * exponencial sobre os dias PROGRAMADOS, não sobre dias corridos — assim um hábito de
 * 1x/semana não é penalizado só por ter menos ocorrências que um diário).
 *
 * `null` quando ainda não há nenhuma ocorrência programada dentro da janela conhecida
 * (hábito criado hoje, ou só programado pra dias que ainda não chegaram) — nesse caso não
 * tem base nenhuma pra calcular, então não inventa um número.
 */
export function computeHabitStrength(
  logs: HabitLog[],
  habit: Habit,
  logsSince: string,
  referenceDate = new Date()
): number | null {
  const doneDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.log_date)
  );

  // Nunca considera "programado mas faltou" antes do hábito existir, mesmo que a janela de
  // busca (`logsSince`) vá mais longe — `habit_logs` só grava dia FEITO (desmarcar apaga a
  // linha), então não tem como distinguir "não fez" de "hábito nem existia ainda" sem essa
  // data de criação.
  const createdDate = habit.created_at.slice(0, 10);
  const earliestDate = createdDate > logsSince ? createdDate : logsSince;

  const todayStr = toDateString(referenceDate);
  const scheduledDates: string[] = [];
  const cursor = new Date(referenceDate);
  while (toDateString(cursor) >= earliestDate) {
    if (habit.active_days.includes(cursor.getDay())) {
      scheduledDates.push(toDateString(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  scheduledDates.reverse(); // mais antigo primeiro

  // Hoje só entra na conta se já foi marcado — um dia programado "ainda não vivido" não é
  // falta, mesmo padrão do `i === 0` em `computeStreak`.
  const relevantDates = scheduledDates.filter((d) => d < todayStr || doneDates.has(d));
  if (relevantDates.length === 0) return null;

  let score = doneDates.has(relevantDates[0]) ? 1 : 0;
  for (let i = 1; i < relevantDates.length; i++) {
    const hit = doneDates.has(relevantDates[i]) ? 1 : 0;
    score = score * (1 - STRENGTH_DECAY) + hit * STRENGTH_DECAY;
  }
  return score;
}

/** Rótulo qualitativo da força do hábito — mesma ideia do Loop Habit Tracker (força alta =
 * verde, baixa = vermelho), só que em português e nas faixas que fazem sentido aqui. */
export function habitStrengthLabel(strength: number): string {
  if (strength >= 0.85) return "Muito consistente";
  if (strength >= 0.6) return "Consistente";
  if (strength >= 0.3) return "Instável";
  return "Fraca";
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

// ============================================================
// Desafios prontos de N dias
// ============================================================

export type ChallengeProgram = {
  id: string;
  title: string;
  description: string;
  days: number;
  icon: string;
};

/**
 * Desafios prontos — conteúdo curado por mim, sem IA/personalização nenhuma, mesma linha
 * das `QUICK_TECHNIQUES` do Mente: uma lista fixa dentro do app, não um "plano" gerado ou
 * adaptado à pessoa. Cada programa repete a mesma ação todo dia por N dias — sem tarefa
 * diferente por dia, pra não inventar um currículo elaborado que eu não tenho como validar.
 */
export const CHALLENGE_PROGRAMS: ChallengeProgram[] = [
  {
    id: "agua-30",
    title: "30 dias de água",
    description: "Beba pelo menos 2 litros de água por dia.",
    days: 30,
    icon: "💧",
  },
  {
    id: "gratidao-21",
    title: "21 dias de gratidão",
    description: "Anote uma coisa pela qual você é grata hoje, por menor que seja.",
    days: 21,
    icon: "🙏",
  },
  {
    id: "leitura-30",
    title: "30 dias de leitura",
    description: "Leia pelo menos 10 páginas de um livro, todo dia.",
    days: 30,
    icon: "📖",
  },
  {
    id: "sem-reclamar-21",
    title: "21 dias sem reclamar",
    description: "Passe o dia sem reclamar de nada — o ponto é perceber quando quase escapa.",
    days: 21,
    icon: "🤐",
  },
  {
    id: "sem-tela-7",
    title: "7 dias sem tela antes de dormir",
    description: "Na última hora antes de dormir, nada de celular ou TV.",
    days: 7,
    icon: "🌙",
  },
  {
    id: "alongamento-30",
    title: "30 dias de alongamento",
    description: "5 minutos de alongamento, em qualquer horário do dia.",
    days: 30,
    icon: "🧘",
  },
  {
    id: "organizacao-14",
    title: "14 dias de organização",
    description: "Arrume ou organize um cantinho da casa, todo dia.",
    days: 14,
    icon: "🧹",
  },
];

export function challengeProgramById(id: string): ChallengeProgram | undefined {
  return CHALLENGE_PROGRAMS.find((p) => p.id === id);
}

export type Challenge = {
  id: string;
  program_id: string;
  started_at: string; // YYYY-MM-DD
  completed_at: string | null;
  abandoned_at: string | null;
};

export type ChallengeLog = {
  challenge_id: string;
  log_date: string;
};

/** Todos os desafios (ativos, concluídos e desistidos) + todos os check-ins deles — sem
 * janela de tempo (diferente de hábito): um desafio nunca passa de 30 dias, então o volume
 * de dados é sempre pequeno mesmo somando vários desafios feitos ao longo do tempo. */
export async function fetchChallenges() {
  const [challengesRes, logsRes] = await Promise.all([
    supabase
      .from("habit_challenges")
      .select("id, program_id, started_at, completed_at, abandoned_at")
      .order("started_at", { ascending: false }),
    supabase.from("habit_challenge_logs").select("challenge_id, log_date"),
  ]);
  if (challengesRes.error) throw challengesRes.error;
  if (logsRes.error) throw logsRes.error;
  return {
    challenges: (challengesRes.data ?? []) as Challenge[],
    logs: (logsRes.data ?? []) as ChallengeLog[],
  };
}

export async function startChallenge(userId: string, programId: string) {
  const { error } = await supabase
    .from("habit_challenges")
    .insert({ user_id: userId, program_id: programId, started_at: toDateString(new Date()) });
  if (error) throw error;
}

export async function toggleChallengeDay(
  userId: string,
  challengeId: string,
  dateStr: string,
  isCurrentlyDone: boolean
) {
  if (isCurrentlyDone) {
    const { error } = await supabase
      .from("habit_challenge_logs")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("log_date", dateStr);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("habit_challenge_logs")
    .upsert(
      { challenge_id: challengeId, user_id: userId, log_date: dateStr },
      { onConflict: "challenge_id,log_date" }
    );
  if (error) throw error;
}

/** Marca o desafio como concluído — só chamada depois que o período de calendário já
 * terminou (`computeChallengeProgress().periodEnded`), nunca antes do prazo. */
export async function finishChallenge(challengeId: string) {
  const { error } = await supabase
    .from("habit_challenges")
    .update({ completed_at: toDateString(new Date()) })
    .eq("id", challengeId);
  if (error) throw error;
}

/** Desistência — mantém o histórico (dias já marcados continuam contando "quantos dias
 * fez"), só marca que não vai terminar esse ciclo. Diferente de excluir. */
export async function abandonChallenge(challengeId: string) {
  const { error } = await supabase
    .from("habit_challenges")
    .update({ abandoned_at: toDateString(new Date()) })
    .eq("id", challengeId);
  if (error) throw error;
}

export async function deleteChallenge(challengeId: string) {
  const { error } = await supabase.from("habit_challenges").delete().eq("id", challengeId);
  if (error) throw error;
}

/**
 * Progresso de um desafio: dia atual (capado em `program.days`), quantos dias de fato
 * foram marcados, e se o período de calendário já terminou. De propósito NÃO é uma streak
 * — faltar um dia não "zera" nada, o desafio é sobre quantos dos N dias foram cumpridos no
 * total, sem inventar pressão de sequência que a pessoa não pediu.
 */
export function computeChallengeProgress(
  challenge: Challenge,
  program: ChallengeProgram,
  logs: ChallengeLog[],
  today = toDateString(new Date())
) {
  const doneDates = new Set(
    logs.filter((l) => l.challenge_id === challenge.id).map((l) => l.log_date)
  );
  const [sy, sm, sd] = challenge.started_at.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const [ty, tm, td] = today.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const elapsedDays = Math.round((todayDate.getTime() - start.getTime()) / 86400000) + 1;
  const currentDay = Math.max(1, Math.min(elapsedDays, program.days));

  return {
    currentDay,
    totalDays: program.days,
    doneCount: doneDates.size,
    periodEnded: elapsedDays > program.days,
    doneDates,
  };
}

/** Data (YYYY-MM-DD) do N-ésimo dia do desafio (1-based) — usado pra desenhar a grade de
 * dias e saber quais células já podem ser tocadas (nunca dia futuro). */
export function challengeDayDate(challenge: Challenge, dayNumber: number): string {
  const [sy, sm, sd] = challenge.started_at.split("-").map(Number);
  const date = new Date(sy, sm - 1, sd);
  date.setDate(date.getDate() + (dayNumber - 1));
  return toDateString(date);
}
