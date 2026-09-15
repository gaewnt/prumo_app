import { toDateString } from "@/lib/rotina";
import {
  type Bill,
  type CreditCard,
  type CreditCardRecurringCharge,
  type RecurringTransaction,
  type BalanceRow,
  billUrgency,
  upcomingBills,
  dueRecurringChargeCycles,
  dueRecurringTransactions,
  formatCurrency,
} from "@/lib/financas";
import type { Habit, HabitLog } from "@/lib/rotina";
import { type HomeTask, type HomeTaskLog, computeTodayTasks } from "@/lib/casa";
import {
  type Medication,
  type MedicationLog,
  type Appointment,
  computeTodayDoses,
  computeDueNonDailyMedications,
  medicationFrequencyLabel,
  APPOINTMENT_KIND_LABELS,
} from "@/lib/saude";
import type { StudyTask } from "@/lib/estudos";
import type { CareerDeadline } from "@/lib/carreira";
import type { Workout, Exercise, WorkoutLog } from "@/lib/treino";
import { type Pet, type PetCareEvent, CARE_EVENT_KIND_LABELS } from "@/lib/pet";
import { type Person, type RelationshipReminder, daysUntilNextBirthday } from "@/lib/relacoes";
import type { RoutineStep, RoutineLog, BeautyProduct } from "@/lib/beleza";
import { type Trip, type TripChecklistItem, computeChecklistProgress } from "@/lib/viagens";
import type { VehicleMaintenanceSchedule, Vehicle, MaintenanceType } from "@/lib/veiculo";
import { type ReadingLog, computeDayPages } from "@/lib/biblioteca";

/**
 * Visão Hoje — cruza os módulos ativos e junta, num lugar só, tudo que tem uma noção
 * natural de "hoje" (vence hoje, atrasado, programado pra hoje), pra não precisar abrir
 * cada módulo separado só pra saber o que precisa fazer no dia. Cada `todayItemsFromX`
 * abaixo é uma função pura — recebe dados já buscados pela própria tela do módulo (mesma
 * `queryKey`, sem busca duplicada) e devolve os itens relevantes de hoje, nunca busca nada
 * sozinha.
 *
 * De propósito, isso NÃO inclui tudo que cada módulo tem — só o que é claramente
 * acionável hoje (vencimento, tarefa do dia). Coisas de status contínuo (ex: orçamento
 * estourado em Finanças) continuam só na tela do próprio módulo, que é o lugar certo pra
 * decidir o que fazer a respeito, não um lembrete do dia.
 */

export type TodayUrgency = "atrasada" | "hoje";

export type TodayItem = {
  id: string;
  /** Slug do módulo de topo (o mesmo usado em `hiddenSlugs` na Home) — não necessariamente
   * o mesmo da rota (ex: aniversário é do módulo "rotina" mesmo levando pra `/modulo/relacoes`). */
  moduleSlug: string;
  icon: string;
  label: string;
  subtitle?: string;
  urgency: TodayUrgency;
  route: string;
};

/** `null` quando a data é no futuro — não é "hoje", não entra na lista. */
function dateUrgency(dateStr: string, todayStr: string): TodayUrgency | null {
  if (dateStr < todayStr) return "atrasada";
  if (dateStr === todayStr) return "hoje";
  return null;
}

// ============================================================
// Finanças
// ============================================================

export function todayItemsFromFinancas(
  input: {
    bills: Bill[];
    cards: CreditCard[];
    recurringCharges: CreditCardRecurringCharge[];
    recurringTransactions: RecurringTransaction[];
    balanceRows: BalanceRow[];
  },
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  // `withinDays: 0` == só o que já venceu ou vence exatamente hoje (nunca o que vem depois).
  for (const bill of upcomingBills(input.bills, 0, today)) {
    const urgency = billUrgency(bill, today);
    if (urgency !== "atrasada" && urgency !== "vence-hoje") continue;
    items.push({
      id: `financas-conta-${bill.id}`,
      moduleSlug: "financas",
      icon: "💰",
      label: bill.name,
      subtitle: formatCurrency(bill.amount),
      urgency: urgency === "atrasada" ? "atrasada" : "hoje",
      route: "/modulo/financas",
    });
  }

  const cardsById = new Map(input.cards.map((c) => [c.id, c]));
  for (const due of dueRecurringChargeCycles(input.cards, input.recurringCharges, input.balanceRows, today)) {
    // Só o que cai exatamente hoje — o resto ainda nem foi gerado, não é "hoje" pra ninguém.
    if (due.occurredAt !== todayStr) continue;
    const card = cardsById.get(due.charge.card_id);
    items.push({
      id: `financas-fixo-cartao-${due.charge.id}-${due.cycle.end}`,
      moduleSlug: "financas",
      icon: "💳",
      label: due.charge.name,
      subtitle: `${card ? `${card.name} · ` : ""}${formatCurrency(due.charge.amount)}`,
      urgency: "hoje",
      route: "/modulo/financas-cartao",
    });
  }

  for (const due of dueRecurringTransactions(input.recurringTransactions, input.balanceRows, today)) {
    if (due.occurredAt !== todayStr) continue;
    items.push({
      id: `financas-fixo-${due.item.id}-${due.period}`,
      moduleSlug: "financas",
      icon: due.item.kind === "expense" ? "🔁" : "💵",
      label: due.item.name,
      subtitle: `${due.item.kind === "expense" ? "Débito automático" : "Receita"} · ${formatCurrency(due.item.amount)}`,
      urgency: "hoje",
      route: "/modulo/financas-recorrentes",
    });
  }

  return items;
}

// ============================================================
// Rotina (hábitos)
// ============================================================

export function todayItemsFromRotina(habits: Habit[], logs: HabitLog[], today = new Date()): TodayItem[] {
  const todayStr = toDateString(today);
  const dow = today.getDay();
  const doneIds = new Set(logs.filter((l) => l.log_date === todayStr && l.completed).map((l) => l.habit_id));
  return habits
    .filter((h) => h.active_days.includes(dow) && !doneIds.has(h.id))
    .map((h) => ({
      id: `rotina-habito-${h.id}`,
      moduleSlug: "rotina",
      icon: "📅",
      label: h.name,
      subtitle: "Hábito de hoje",
      urgency: "hoje" as const,
      route: "/modulo/rotina",
    }));
}

// ============================================================
// Casa
// ============================================================

export function todayItemsFromCasa(tasks: HomeTask[], logs: HomeTaskLog[], today = new Date()): TodayItem[] {
  const todayStr = toDateString(today);
  return computeTodayTasks(tasks, logs, todayStr)
    .filter((t) => t.scheduled && !t.done)
    .map(({ task }) => ({
      id: `casa-tarefa-${task.id}`,
      moduleSlug: "casa",
      icon: "🏠",
      label: task.title,
      subtitle: "Tarefa de hoje",
      urgency: "hoje" as const,
      route: "/modulo/casa",
    }));
}

// ============================================================
// Saúde (remédios + compromissos)
// ============================================================

export function todayItemsFromSaude(
  medications: Medication[],
  medicationLogs: MedicationLog[],
  appointments: Appointment[],
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  for (const dose of computeTodayDoses(medications, medicationLogs, todayStr)) {
    if (dose.taken) continue;
    items.push({
      id: `saude-dose-${dose.medication.id}-${dose.time}`,
      moduleSlug: "saude",
      icon: "💊",
      label: `${dose.medication.name} · ${dose.time}`,
      subtitle: dose.medication.dosage ?? undefined,
      urgency: "hoje",
      route: "/modulo/saude",
    });
  }

  // Remédios de frequência não diária (a cada N dias, mensal, trimestral, semestral) —
  // não têm checklist de horário, só uma próxima data prevista.
  for (const due of computeDueNonDailyMedications(medications, todayStr)) {
    items.push({
      id: `saude-dose-ciclo-${due.medication.id}`,
      moduleSlug: "saude",
      icon: "💊",
      label: due.medication.name,
      subtitle: medicationFrequencyLabel(due.medication.frequency_kind, due.medication.frequency_interval_days),
      urgency: due.urgency,
      route: "/modulo/saude",
    });
  }

  for (const appt of appointments) {
    if (appt.completed_at) continue;
    const urgency = dateUrgency(appt.scheduled_at.slice(0, 10), todayStr);
    if (!urgency) continue;
    items.push({
      id: `saude-compromisso-${appt.id}`,
      moduleSlug: "saude",
      icon: "🩺",
      label: appt.title,
      subtitle: `${APPOINTMENT_KIND_LABELS[appt.kind]}${appt.professional ? ` · ${appt.professional}` : ""}`,
      urgency,
      route: "/modulo/saude",
    });
  }

  return items;
}

// ============================================================
// Estudos
// ============================================================

export function todayItemsFromEstudos(tasks: StudyTask[], today = new Date()): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];
  for (const task of tasks) {
    if (task.done || !task.due_date) continue;
    const urgency = dateUrgency(task.due_date, todayStr);
    if (!urgency) continue;
    items.push({
      id: `estudos-tarefa-${task.id}`,
      moduleSlug: "estudos",
      icon: "🎓",
      label: task.title,
      subtitle: urgency === "atrasada" ? "Atrasada" : "Prazo hoje",
      urgency,
      route: "/modulo/estudos",
    });
  }
  return items;
}

// ============================================================
// Carreira
// ============================================================

export function todayItemsFromCarreira(deadlines: CareerDeadline[], today = new Date()): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];
  for (const deadline of deadlines) {
    if (deadline.done) continue;
    const urgency = dateUrgency(deadline.due_date, todayStr);
    if (!urgency) continue;
    items.push({
      id: `carreira-prazo-${deadline.id}`,
      moduleSlug: "carreira",
      icon: "💼",
      label: deadline.title,
      subtitle: urgency === "atrasada" ? "Atrasado" : "Prazo hoje",
      urgency,
      route: "/modulo/carreira",
    });
  }
  return items;
}

// ============================================================
// Treino (dentro do hub Desenvolvimento Pessoal)
// ============================================================

export function todayItemsFromTreino(
  workouts: Workout[],
  exercises: Exercise[],
  todayLogs: WorkoutLog[],
  today = new Date()
): TodayItem[] {
  const workout = workouts.find((w) => w.day_of_week === today.getDay());
  if (!workout) return [];
  const exerciseCount = exercises.filter((e) => e.workout_id === workout.id).length;
  if (exerciseCount === 0) return [];
  const log = todayLogs.find((l) => l.workout_id === workout.id);
  const doneCount = log?.completed_exercise_ids.length ?? 0;
  if (doneCount >= exerciseCount) return [];
  return [
    {
      id: `treino-${workout.id}`,
      // Treino vive dentro do hub "dev-pessoal" pra fins de módulo escondido/visível.
      moduleSlug: "dev-pessoal",
      icon: "🏋️",
      label: workout.name,
      subtitle: `${doneCount}/${exerciseCount} exercícios`,
      urgency: "hoje",
      route: "/modulo/treino",
    },
  ];
}

// ============================================================
// Pet
// ============================================================

export function todayItemsFromPet(pets: Pet[], careEvents: PetCareEvent[], today = new Date()): TodayItem[] {
  const todayStr = toDateString(today);
  const petsById = new Map(pets.map((p) => [p.id, p]));
  const items: TodayItem[] = [];
  for (const event of careEvents) {
    if (event.completed_at) continue;
    const urgency = dateUrgency(event.scheduled_at.slice(0, 10), todayStr);
    if (!urgency) continue;
    const pet = petsById.get(event.pet_id);
    items.push({
      id: `pet-evento-${event.id}`,
      moduleSlug: "pet",
      icon: "🐾",
      label: `${CARE_EVENT_KIND_LABELS[event.kind]}${pet ? ` · ${pet.name}` : ""}`,
      subtitle: urgency === "atrasada" ? "Atrasado" : "Hoje",
      urgency,
      route: "/modulo/pet",
    });
  }
  return items;
}

// ============================================================
// Relações (dentro do hub Rotina) — aniversário de hoje + lembretes avulsos
// ============================================================

export function todayItemsFromRelacoes(
  people: Person[],
  reminders: RelationshipReminder[],
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  for (const person of people) {
    if (!person.birth_date) continue;
    if (daysUntilNextBirthday(person.birth_date, today) !== 0) continue;
    items.push({
      id: `relacoes-aniversario-${person.id}`,
      moduleSlug: "rotina",
      icon: "🎂",
      label: `Aniversário de ${person.name}`,
      subtitle: person.relationship ?? undefined,
      urgency: "hoje",
      route: "/modulo/relacoes",
    });
  }

  for (const reminder of reminders) {
    if (reminder.done) continue;
    const urgency = dateUrgency(reminder.reminder_date, todayStr);
    if (!urgency) continue;
    items.push({
      id: `relacoes-lembrete-${reminder.id}`,
      moduleSlug: "rotina",
      icon: "💬",
      label: reminder.title,
      subtitle: urgency === "atrasada" ? "Atrasado" : "Hoje",
      urgency,
      route: "/modulo/relacoes",
    });
  }

  return items;
}

// ============================================================
// Veículo — manutenção agendada (por data e/ou por km)
// ============================================================

const VEICULO_MAINTENANCE_LABELS: Record<MaintenanceType, string> = {
  troca_oleo: "Troca de óleo",
  pneus: "Pneus",
  freios: "Freios",
  revisao: "Revisão",
  bateria: "Bateria",
  suspensao: "Suspensão",
  outro: "Manutenção",
};

export function todayItemsFromVeiculo(
  vehicle: Vehicle | null,
  schedules: VehicleMaintenanceSchedule[],
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  for (const schedule of schedules) {
    if (schedule.done) continue;
    const dateUrg = schedule.due_date ? dateUrgency(schedule.due_date, todayStr) : null;
    const kmHit =
      schedule.due_km != null && vehicle?.km_atual != null && vehicle.km_atual >= schedule.due_km;
    // Sem data vencida mas o km_atual (atualizado manualmente) já bateu o previsto: entra
    // como "hoje" mesmo assim — foi essa atualização que revelou que já está na hora.
    const urgency: TodayUrgency | null = dateUrg ?? (kmHit ? "hoje" : null);
    if (!urgency) continue;

    items.push({
      id: `veiculo-manutencao-${schedule.id}`,
      moduleSlug: "veiculo",
      icon: "🚗",
      label: schedule.descricao || VEICULO_MAINTENANCE_LABELS[schedule.tipo],
      subtitle:
        urgency === "atrasada"
          ? "Atrasada"
          : kmHit && !dateUrg
            ? `Bateu ${schedule.due_km!.toLocaleString("pt-BR")} km`
            : "Hoje",
      urgency,
      route: "/modulo/veiculo",
    });
  }

  return items;
}

// ============================================================
// Beleza (dentro do hub Desenvolvimento Pessoal) — rotina do dia + validade de produtos
// ============================================================

export function todayItemsFromBeleza(
  input: { routineSteps: RoutineStep[]; routineLogsToday: RoutineLog[]; products: BeautyProduct[] },
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  const doneStepIds = new Set(input.routineLogsToday.map((l) => l.step_id));
  const periods: { period: RoutineStep["period"]; label: string }[] = [
    { period: "manha", label: "manhã" },
    { period: "noite", label: "noite" },
  ];
  for (const { period, label } of periods) {
    const pendingCount = input.routineSteps.filter((s) => s.period === period && !doneStepIds.has(s.id)).length;
    if (pendingCount === 0) continue;
    items.push({
      id: `beleza-rotina-${period}`,
      moduleSlug: "dev-pessoal",
      icon: "🧴",
      label: `Rotina de ${label}`,
      subtitle: `${pendingCount} ${pendingCount === 1 ? "passo pendente" : "passos pendentes"}`,
      urgency: "hoje",
      route: "/modulo/beleza",
    });
  }

  for (const product of input.products) {
    if (!product.expires_at) continue;
    const urgency = dateUrgency(product.expires_at, todayStr);
    if (!urgency) continue;
    items.push({
      id: `beleza-produto-${product.id}`,
      moduleSlug: "dev-pessoal",
      icon: "🧴",
      label: `${product.name} vence`,
      subtitle: urgency === "atrasada" ? "Vencido" : "Vence hoje",
      urgency,
      route: "/modulo/beleza",
    });
  }

  return items;
}

// ============================================================
// Viagens (dentro do hub Desenvolvimento Pessoal) — viagem em andamento hoje
// ============================================================

export function todayItemsFromViagens(
  input: { trips: Trip[]; checklistItems: TripChecklistItem[] },
  today = new Date()
): TodayItem[] {
  const todayStr = toDateString(today);
  const items: TodayItem[] = [];

  for (const trip of input.trips) {
    if (trip.status === "concluida" || !trip.start_date || !trip.end_date) continue;
    if (todayStr < trip.start_date || todayStr > trip.end_date) continue;
    const { done, total } = computeChecklistProgress(
      input.checklistItems.filter((i) => i.trip_id === trip.id)
    );
    items.push({
      id: `viagens-em-andamento-${trip.id}`,
      moduleSlug: "dev-pessoal",
      icon: "✈️",
      label: `${trip.name} em andamento`,
      subtitle: total > 0 ? `Checklist: ${done}/${total}` : (trip.destination ?? undefined),
      urgency: "hoje",
      route: "/modulo/viagens",
    });
  }

  return items;
}

// ============================================================
// Biblioteca (dentro do hub Estudos) — meta diária de páginas
// ============================================================

export function todayItemsFromBiblioteca(
  input: { logs: ReadingLog[]; metaPaginasDia: number | null },
  today = new Date()
): TodayItem[] {
  if (!input.metaPaginasDia) return [];
  const paginasHoje = computeDayPages(toDateString(today), input.logs);
  const faltam = input.metaPaginasDia - paginasHoje;
  if (faltam <= 0) return [];

  return [
    {
      id: "biblioteca-meta-paginas",
      moduleSlug: "estudos",
      icon: "📚",
      label: "Meta de leitura de hoje",
      subtitle: `Faltam ${faltam} ${faltam === 1 ? "página" : "páginas"}`,
      urgency: "hoje",
      route: "/modulo/biblioteca",
    },
  ];
}

/** Atrasadas primeiro, mantendo a ordem relativa dentro de cada grupo (sort estável). */
export function sortTodayItems(items: TodayItem[]): TodayItem[] {
  return [...items].sort((a, b) => {
    if (a.urgency === b.urgency) return 0;
    return a.urgency === "atrasada" ? -1 : 1;
  });
}
