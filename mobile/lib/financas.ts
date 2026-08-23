import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";
import type { ThemeTokens } from "@/lib/theme/tokens";

/**
 * Camada de dados do módulo Finanças — lançamentos (receita/despesa), contas a vencer
 * e investimentos (posições simples: nome + valor atual, sem histórico de aportes).
 */

export type TransactionKind = "income" | "expense";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  category: string;
  amount: number;
  description: string | null;
  occurred_at: string; // YYYY-MM-DD
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  recurring: boolean;
  paid_at: string | null;
  paid_amount: number | null;
};

export type Investment = {
  id: string;
  name: string;
  amount: number;
};

export const CATEGORY_PRESETS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Salário",
  "Contas",
  "Outros",
] as const;

/** Categoria usada no lançamento gerado automaticamente ao marcar uma conta como paga. */
export const BILL_PAYMENT_CATEGORY = "Contas";

/**
 * Emoji + cor por categoria — usado no grid de categorias do formulário e no
 * donut de gasto por categoria. `colorKey` bate com um token de `ThemeTokens`;
 * categorias fora da lista caem no chart5 (neutro).
 */
export type CategoryColorKey = "accent" | "success" | "warning" | "danger" | "chart1" | "chart2" | "chart3" | "chart4" | "chart5";

export const CATEGORY_META: Record<string, { emoji: string; colorKey: CategoryColorKey }> = {
  "Alimentação": { emoji: "🍔", colorKey: "chart1" },
  "Transporte": { emoji: "🚌", colorKey: "chart3" },
  "Moradia": { emoji: "🏠", colorKey: "accent" },
  "Lazer": { emoji: "🎮", colorKey: "chart4" },
  "Saúde": { emoji: "❤️", colorKey: "chart2" },
  "Salário": { emoji: "💰", colorKey: "success" },
  "Contas": { emoji: "📄", colorKey: "warning" },
  "Outros": { emoji: "✳️", colorKey: "chart5" },
};

export function categoryEmoji(category: string) {
  return CATEGORY_META[category]?.emoji ?? "✳️";
}

export function categoryColor(tokens: ThemeTokens, category: string) {
  const key = CATEGORY_META[category]?.colorKey ?? "chart5";
  return tokens[key];
}

function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { start: toDateString(start), end: toDateString(end) };
}

function isInCurrentMonth(occurredAt: string) {
  const { start, end } = monthRange();
  return occurredAt >= start && occurredAt <= end;
}

// Histórico completo, não só o mês atual (pra dar pra revisar/editar lançamentos
// antigos) — limitado aos 200 mais recentes só pra não puxar um payload gigante.
export const TRANSACTION_HISTORY_LIMIT = 200;

export async function fetchFinancas() {
  const [transactionsRes, billsRes, investmentsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, kind, category, amount, description, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(TRANSACTION_HISTORY_LIMIT),
    supabase
      .from("bills")
      .select("id, name, amount, due_date, recurring, paid_at, paid_amount")
      .order("due_date", { ascending: true }),
    supabase
      .from("investments")
      .select("id, name, amount")
      .order("created_at", { ascending: true }),
  ]);

  if (transactionsRes.error) throw transactionsRes.error;
  if (billsRes.error) throw billsRes.error;
  if (investmentsRes.error) throw investmentsRes.error;

  return {
    transactions: (transactionsRes.data ?? []) as Transaction[],
    bills: (billsRes.data ?? []) as Bill[],
    investments: (investmentsRes.data ?? []) as Investment[],
  };
}

/** Recebe o histórico completo e calcula o resumo só do mês atual. */
export function computeSummary(transactions: Transaction[]) {
  const monthly = transactions.filter((t) => isInCurrentMonth(t.occurred_at));
  const income = monthly
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = monthly
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  return { income, expense, balance: income - expense };
}

export function computeInvestedTotal(investments: Investment[]) {
  return investments.reduce((sum, i) => sum + Number(i.amount), 0);
}

/** Também recebe o histórico completo e calcula só a fatia do mês atual. */
export function computeCategoryBreakdown(transactions: Transaction[]) {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense" || !isInCurrentMonth(t.occurred_at)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount));
  }
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Gasto por dia dos últimos 7 dias (pro `WeeklyBarChart`) + comparação com os
 * 7 dias anteriores (pro `StatCard` de "gastos essa semana"). Cálculo puro,
 * sem IA — soma direta do que já está em `transactions`.
 */
export function computeWeeklySpend(transactions: Transaction[], today = new Date()) {
  function spendOn(dateStr: string) {
    return transactions
      .filter((t) => t.kind === "expense" && t.occurred_at === dateStr)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ label: WEEKDAY_LABELS[d.getDay()], value: spendOn(toDateString(d)) });
  }
  const total = days.reduce((sum, d) => sum + d.value, 0);

  let previousTotal = 0;
  for (let i = 13; i >= 7; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    previousTotal += spendOn(toDateString(d));
  }

  const deltaPct =
    previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : total > 0 ? 100 : 0;

  return { days, total, previousTotal, deltaPct };
}

/**
 * Fluxo de caixa acumulado dos últimos `days` dias (receita menos despesa,
 * somado dia a dia) — não é "patrimônio" (o Prumo ainda não guarda saldo de
 * conta persistido), é a curva de entra-e-sai no período, pra dar visualmente
 * a mesma ideia do gráfico de investimento do Pierre.
 */
export function computeCashFlowSeries(transactions: Transaction[], days = 30, today = new Date()) {
  const series: number[] = [];
  let running = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toDateString(d);
    const net = transactions
      .filter((t) => t.occurred_at === dateStr)
      .reduce((sum, t) => sum + (t.kind === "income" ? Number(t.amount) : -Number(t.amount)), 0);
    running += net;
    series.push(running);
  }
  return series;
}

/** Soma de todas as contas ainda não pagas — usada no cálculo do "saldo seguro". */
export function computePendingBillsTotal(bills: Bill[]) {
  return bills.filter((b) => !b.paid_at).reduce((sum, b) => sum + Number(b.amount), 0);
}

/** Contas não pagas com vencimento dentro de `withinDays`, já ordenadas por data. */
export function upcomingBills(bills: Bill[], withinDays = 7, today = new Date()) {
  const limit = new Date(today);
  limit.setDate(limit.getDate() + withinDays);
  const limitStr = toDateString(limit);
  return bills
    .filter((b) => !b.paid_at && b.due_date <= limitStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export async function createTransaction(
  userId: string,
  input: { kind: TransactionKind; category: string; amount: number; description: string }
) {
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    kind: input.kind,
    category: input.category,
    amount: input.amount,
    description: input.description || null,
    occurred_at: toDateString(new Date()),
  });
  if (error) throw error;

  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "financas",
    event_type: input.kind === "expense" ? "expense_added" : "income_added",
    payload: { category: input.category, amount: input.amount },
  });
}

export async function updateTransaction(
  id: string,
  input: { kind: TransactionKind; category: string; amount: number; description: string }
) {
  const { error } = await supabase
    .from("transactions")
    .update({
      kind: input.kind,
      category: input.category,
      amount: input.amount,
      description: input.description || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function createBill(
  userId: string,
  input: { name: string; amount: number; dueDate: string; recurring: boolean }
) {
  const { error } = await supabase.from("bills").insert({
    user_id: userId,
    name: input.name,
    amount: input.amount,
    due_date: input.dueDate,
    recurring: input.recurring,
  });
  if (error) throw error;
}

/**
 * Marca a conta como paga E lança a despesa correspondente (com o valor
 * realmente pago, que pode incluir multa/juros de atraso) — é isso que faz o
 * pagamento debitar do saldo do mês na hora em que a pessoa marca como pago.
 */
export async function markBillPaid(userId: string, bill: Bill, paidAmount: number) {
  const { error: billError } = await supabase
    .from("bills")
    .update({ paid_at: new Date().toISOString(), paid_amount: paidAmount })
    .eq("id", bill.id);
  if (billError) throw billError;

  const { error: transactionError } = await supabase.from("transactions").insert({
    user_id: userId,
    kind: "expense",
    category: BILL_PAYMENT_CATEGORY,
    amount: paidAmount,
    description: bill.name,
    occurred_at: toDateString(new Date()),
  });
  if (transactionError) throw transactionError;

  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "financas",
    event_type: "bill_paid",
    payload: { bill_name: bill.name, amount: paidAmount, amount_expected: bill.amount },
  });
}

export async function deleteBill(id: string) {
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

export async function createInvestment(userId: string, input: { name: string; amount: number }) {
  const { error } = await supabase
    .from("investments")
    .insert({ user_id: userId, name: input.name, amount: input.amount });
  if (error) throw error;

  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "financas",
    event_type: "investment_added",
    payload: { name: input.name, amount: input.amount },
  });
}

/** Atualiza o valor atual de uma posição já existente (ex: rendimento do mês). */
export async function updateInvestmentAmount(id: string, amount: number) {
  const { error } = await supabase.from("investments").update({ amount }).eq("id", id);
  if (error) throw error;
}

export async function deleteInvestment(id: string) {
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
}

export function billUrgency(bill: Bill, today = new Date()): "paga" | "atrasada" | "vence-hoje" | "em-dia" {
  if (bill.paid_at) return "paga";
  const todayStr = toDateString(today);
  if (bill.due_date < todayStr) return "atrasada";
  if (bill.due_date === todayStr) return "vence-hoje";
  return "em-dia";
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2026-08-25" -> "25/08" — o schema guarda a data como texto ISO. */
export function formatShortDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** Como `formatShortDate`, mas com o ano (2 dígitos) — usada no histórico de
 * lançamentos, que agora não fica mais restrito ao mês atual. */
export function formatHistoryDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}
