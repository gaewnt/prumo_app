import { supabase } from "@/lib/supabase";
import { toDateString, WEEKDAY_LABELS } from "@/lib/rotina";
import type { ThemeTokens } from "@/lib/theme/tokens";
import { fetchModulePreference, updateModulePreferenceField } from "@/lib/onboarding";

/**
 * Camada de dados do módulo Finanças — lançamentos (receita/despesa), contas a vencer
 * e investimentos (posições simples: nome + valor atual, sem histórico de aportes).
 */

export type TransactionKind = "income" | "expense" | "transfer";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  category: string;
  amount: number;
  description: string | null;
  occurred_at: string; // YYYY-MM-DD
  account_id: string | null;
  card_id: string | null;
  transfer_to_account_id: string | null;
  tagIds: string[];
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

export type AccountKind = "carteira" | "conta" | "poupanca" | "investimento" | "beneficio" | "outro";

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  carteira: "Carteira",
  conta: "Conta corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
  // VR/VA e afins: saldo que recarrega todo mês e é gasto direto, sem fatura
  // (mesmo mecanismo de saldo de "carteira" por baixo — só separado na UI).
  beneficio: "Benefício (VR/VA)",
  outro: "Outro",
};

export type FinancialAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  initial_balance: number;
  color_key: CategoryColorKey;
  archived: boolean;
  position: number;
};

export type CreditCard = {
  id: string;
  name: string;
  card_limit: number | null;
  closing_day: number;
  due_day: number;
  color_key: CategoryColorKey;
  archived: boolean;
};

export type CreditCardPayment = {
  id: string;
  card_id: string;
  cycle_start: string;
  cycle_end: string;
  amount: number;
  paid_from_account_id: string | null;
  paid_at: string;
};

export type FinancialTag = {
  id: string;
  name: string;
  color_key: CategoryColorKey;
};

export type BudgetCategory = {
  id: string;
  month: string; // YYYY-MM-01
  category: string;
  planned_amount: number;
};

export type FinancialGoal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  completed_at: string | null;
  notes: string | null;
};

/**
 * Linha enxuta de transação usada só pra calcular saldo de conta/fatura de cartão —
 * busca TODO o histórico (sem o limite de `TRANSACTION_HISTORY_LIMIT`), porque saldo é
 * acumulado desde sempre, não só dos lançamentos recentes.
 */
export type BalanceRow = {
  // `id`/`category`/`description` adicionados pra dar pra montar um histórico de
  // lançamentos por conta (ver `accountHistory`), não só o número final do saldo. Antes só
  // dava pra conferir o total; quando o saldo não batia com o esperado, não tinha como
  // ver QUAIS lançamentos estavam entrando na conta ali sem abrir cada um manualmente.
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  description: string | null;
  account_id: string | null;
  card_id: string | null;
  transfer_to_account_id: string | null;
  occurred_at: string;
};

export const CATEGORY_PRESETS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Renda variável",
  "Contas",
  "Copiloto",
  "Combustível",
  "Manutenção veículo",
  "Outros",
] as const;

/** Categoria usada no lançamento gerado automaticamente ao marcar uma conta como paga. */
export const BILL_PAYMENT_CATEGORY = "Contas";

/** Categoria fixa dos lançamentos de transferência entre contas (não é escolhida
 * manualmente — computeCategoryBreakdown já ignora `kind !== "expense"`, então
 * transferência nunca aparece no gráfico de gasto por categoria). */
export const TRANSFER_CATEGORY = "Transferência";

/** Categoria usada no lançamento gerado automaticamente ao pagar uma fatura de cartão. */
export const CARD_PAYMENT_CATEGORY = "Fatura do cartão";

/** Categorias dos lançamentos gerados automaticamente pela integração com o módulo
 * Veículo/Copiloto — ver `syncRideTransaction`/`syncVehicleExpenseTransaction`
 * em `lib/veiculo.ts`. Também ficam disponíveis pra escolha manual (`CATEGORY_PRESETS` acima),
 * caso a pessoa queira lançar um gasto de combustível/manutenção sem passar pelo Veículo. */
export const COPILOTO_INCOME_CATEGORY = "Copiloto";
export const VEHICLE_FUEL_CATEGORY = "Combustível";
export const VEHICLE_MAINTENANCE_CATEGORY = "Manutenção veículo";

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
  "Renda variável": { emoji: "💸", colorKey: "success" },
  "Renda fixa": { emoji: "💰", colorKey: "success" },
  "Contas": { emoji: "📄", colorKey: "warning" },
  "Transferência": { emoji: "🔁", colorKey: "chart5" },
  "Fatura do cartão": { emoji: "💳", colorKey: "warning" },
  "Copiloto": { emoji: "🧭", colorKey: "chart2" },
  "Combustível": { emoji: "⛽", colorKey: "chart4" },
  "Manutenção veículo": { emoji: "🔧", colorKey: "chart1" },
  "Outros": { emoji: "✳️", colorKey: "chart5" },
};

export function categoryEmoji(category: string) {
  return CATEGORY_META[category]?.emoji ?? "✳️";
}

export function categoryColor(tokens: ThemeTokens, category: string) {
  const key = CATEGORY_META[category]?.colorKey ?? "chart5";
  return tokens[key];
}

// ============================================================
// Categorias personalizadas — criadas pela própria pessoa, além dos presets.
// Guardadas em `module_preferences.financas.custom_categories` (mesmo lugar
// da renda fixa) pra não precisar de tabela nova nem migration extra.
// ============================================================

export type CustomCategory = { name: string; emoji: string; colorKey: CategoryColorKey };

/** Registra categorias personalizadas em `CATEGORY_META` (em memória) pra
 * `categoryEmoji`/`categoryColor` funcionarem em qualquer tela sem precisar
 * mudar quem já consome essas funções. Chamar depois de buscar as categorias
 * salvas (ex: ao abrir a tela de Finanças ou a de Categorias). */
export function registerCustomCategories(categories: CustomCategory[]) {
  for (const c of categories) {
    CATEGORY_META[c.name] = { emoji: c.emoji, colorKey: c.colorKey };
  }
}

export function allCategoryNames(customCategories: CustomCategory[]): string[] {
  return [...CATEGORY_PRESETS, ...customCategories.map((c) => c.name)];
}

export async function fetchCustomCategories(): Promise<CustomCategory[]> {
  const answers = await fetchModulePreference("financas");
  const list = (answers.custom_categories as CustomCategory[] | undefined) ?? [];
  registerCustomCategories(list);
  return list;
}

export async function addCustomCategory(
  userId: string,
  existing: CustomCategory[],
  category: CustomCategory
) {
  await updateModulePreferenceField(userId, "financas", {
    custom_categories: [...existing, category],
  });
  registerCustomCategories([category]);
}

export async function removeCustomCategory(userId: string, existing: CustomCategory[], name: string) {
  await updateModulePreferenceField(userId, "financas", {
    custom_categories: existing.filter((c) => c.name !== name),
  });
}

/** Antes só dava pra excluir e recriar uma categoria própria pra
 * corrigir um nome/emoji/cor. Se o nome mudar, atualiza também os lançamentos que já usam
 * essa categoria — senão eles ficam apontando pra um nome que não existe mais em lugar
 * nenhum ("não inventar dado": os lançamentos continuam reais, só o rótulo acompanha). */
export async function updateCustomCategory(
  userId: string,
  existing: CustomCategory[],
  oldName: string,
  updated: CustomCategory
) {
  const nextList = existing.map((c) => (c.name === oldName ? updated : c));
  await updateModulePreferenceField(userId, "financas", { custom_categories: nextList });
  registerCustomCategories([updated]);
  if (updated.name !== oldName) {
    const { error } = await supabase
      .from("transactions")
      .update({ category: updated.name })
      .eq("user_id", userId)
      .eq("category", oldName);
    if (error) throw error;
  }
}

function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { start: toDateString(start), end: toDateString(end) };
}

function isInMonth(occurredAt: string, reference: Date) {
  const { start, end } = monthRange(reference);
  return occurredAt >= start && occurredAt <= end;
}

function isInCurrentMonth(occurredAt: string) {
  return isInMonth(occurredAt, new Date());
}

// Histórico completo, não só o mês atual (pra dar pra revisar/editar lançamentos
// antigos) — limitado aos 200 mais recentes só pra não puxar um payload gigante.
export const TRANSACTION_HISTORY_LIMIT = 200;

export async function fetchFinancas() {
  const [transactionsRes, billsRes, investmentsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, kind, category, amount, description, occurred_at, account_id, card_id, transfer_to_account_id, transaction_tags(tag_id)"
      )
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

  const transactions: Transaction[] = (transactionsRes.data ?? []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    category: row.category,
    amount: row.amount,
    description: row.description,
    occurred_at: row.occurred_at,
    account_id: row.account_id,
    card_id: row.card_id,
    transfer_to_account_id: row.transfer_to_account_id,
    tagIds: ((row.transaction_tags ?? []) as { tag_id: string }[]).map((tt) => tt.tag_id),
  }));

  return {
    transactions,
    bills: (billsRes.data ?? []) as Bill[],
    investments: (investmentsRes.data ?? []) as Investment[],
  };
}

/**
 * Busca dados "extras" do módulo (contas, cartões, faturas pagas, tags, metas) + o
 * histórico COMPLETO de transações (só as colunas usadas pra calcular saldo — sem o
 * limite de `TRANSACTION_HISTORY_LIMIT`, já que saldo de conta é acumulado desde
 * sempre). Buscado à parte de `fetchFinancas` pra não pesar a busca principal.
 */
export async function fetchFinancasExtras() {
  const [accountsRes, cardsRes, paymentsRes, tagsRes, goalsRes, balanceRowsRes] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("id, name, kind, initial_balance, color_key, archived, position")
      .order("position", { ascending: true }),
    supabase
      .from("credit_cards")
      .select("id, name, card_limit, closing_day, due_day, color_key, archived")
      .order("created_at", { ascending: true }),
    supabase
      .from("credit_card_payments")
      .select("id, card_id, cycle_start, cycle_end, amount, paid_from_account_id, paid_at")
      .order("cycle_end", { ascending: false }),
    supabase.from("financial_tags").select("id, name, color_key").order("name", { ascending: true }),
    supabase
      .from("financial_goals")
      .select("id, title, target_amount, current_amount, target_date, completed_at, notes")
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, kind, amount, category, description, account_id, card_id, transfer_to_account_id, occurred_at"),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (cardsRes.error) throw cardsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (tagsRes.error) throw tagsRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (balanceRowsRes.error) throw balanceRowsRes.error;

  return {
    accounts: (accountsRes.data ?? []) as FinancialAccount[],
    cards: (cardsRes.data ?? []) as CreditCard[],
    cardPayments: (paymentsRes.data ?? []) as CreditCardPayment[],
    tags: (tagsRes.data ?? []) as FinancialTag[],
    goals: (goalsRes.data ?? []) as FinancialGoal[],
    balanceRows: (balanceRowsRes.data ?? []) as BalanceRow[],
  };
}

/** Recebe o histórico completo e calcula o resumo só do mês atual. */
/** `referenceDate` — opcional, mês a resumir; sem ele continua sendo o mês
 * atual (comportamento de sempre). Permite navegar meses anteriores sem precisar de uma busca
 * nova: `fetchFinancas` já traz os 200 lançamentos mais recentes, isso só filtra em cima disso. */
export function computeSummary(transactions: Transaction[], referenceDate = new Date()) {
  const monthly = transactions.filter((t) => isInMonth(t.occurred_at, referenceDate));
  const income = monthly
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = monthly
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  return { income, expense, balance: income - expense };
}

/** Categoria usada no lançamento automático do botão "Efetivado" da renda fixa. */
export const RENDA_FIXA_CATEGORY = "Renda fixa";

/** Se a renda fixa já foi marcada como "Efetivado" neste mês — usado pra esconder o botão
 * depois do primeiro toque e não deixar duplicar o lançamento se a pessoa tocar de novo. */
export function rendaFixaJaEfetivadaEsteMes(transactions: Transaction[]): boolean {
  return transactions.some(
    (t) => t.kind === "income" && t.category === RENDA_FIXA_CATEGORY && isInCurrentMonth(t.occurred_at)
  );
}

export function computeInvestedTotal(investments: Investment[]) {
  return investments.reduce((sum, i) => sum + Number(i.amount), 0);
}

/** Também recebe o histórico completo e calcula só a fatia de um mês (`referenceDate`, opcional
 * — sem ele é o mês atual, comportamento de sempre). */
export function computeCategoryBreakdown(transactions: Transaction[], referenceDate = new Date()) {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense" || !isInMonth(t.occurred_at, referenceDate)) continue;
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

export type TransactionInput = {
  kind: TransactionKind;
  category: string;
  amount: number;
  description: string;
  /** Conta de onde sai o dinheiro (despesa/transferência) ou onde entra (receita).
   * Opcional — sem conta, o lançamento continua contando no resumo geral do mês, só
   * não aparece em nenhuma conta específica (comportamento de antes desta função). */
  accountId?: string | null;
  /** Só pra despesas feitas no cartão de crédito — não soma na conta até a fatura ser paga. */
  cardId?: string | null;
  /** Só pra `kind: "transfer"` — conta de destino do dinheiro. */
  transferToAccountId?: string | null;
  tagIds?: string[];
  /** "YYYY-MM-DD" — quando omitido, usa a data de hoje (comportamento de sempre). Usado
   * pela integração com Veículo/Copiloto pra o lançamento em Finanças
   * carregar a data real da corrida/abastecimento/manutenção, não a data em que foi salvo. */
  occurredAt?: string;
};

async function syncTransactionTags(transactionId: string, tagIds: string[] | undefined) {
  if (tagIds === undefined) return;
  const { error: deleteError } = await supabase
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) throw deleteError;
  if (tagIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("transaction_tags")
    .insert(tagIds.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId })));
  if (insertError) throw insertError;
}

/** Retorna o id do lançamento criado — usado pela integração com Veículo/Copiloto
 * pra guardar o vínculo (`finance_transaction_id`) na corrida/abastecimento/
 * manutenção de origem. Chamadas existentes que não usam o retorno continuam funcionando
 * normalmente (mudança aditiva). */
export async function createTransaction(userId: string, input: TransactionInput): Promise<string> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      kind: input.kind,
      category: input.category,
      amount: input.amount,
      description: input.description || null,
      occurred_at: input.occurredAt ?? toDateString(new Date()),
      account_id: input.accountId ?? null,
      card_id: input.cardId ?? null,
      transfer_to_account_id: input.transferToAccountId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  await syncTransactionTags(data.id, input.tagIds);

  // Transferência não é receita nem despesa de verdade — não teria pra qual dos dois
  // event_type mandar, então não gera evento de módulo aqui.
  if (input.kind !== "transfer") {
    await supabase.from("module_events").insert({
      user_id: userId,
      module_slug: "financas",
      event_type: input.kind === "expense" ? "expense_added" : "income_added",
      payload: { category: input.category, amount: input.amount },
    });
  }

  return data.id as string;
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const { error } = await supabase
    .from("transactions")
    .update({
      kind: input.kind,
      category: input.category,
      amount: input.amount,
      description: input.description || null,
      account_id: input.accountId ?? null,
      card_id: input.cardId ?? null,
      transfer_to_account_id: input.transferToAccountId ?? null,
      // Nunca reseta a data se `occurredAt` não for passado — mesmo comportamento de
      // antes desta integração (edição normal em Finanças não mexe na data).
      ...(input.occurredAt ? { occurred_at: input.occurredAt } : {}),
    })
    .eq("id", id);
  if (error) throw error;

  await syncTransactionTags(id, input.tagIds);
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
 *
 * Essa despesa nunca levava `account_id`, então nunca entrava no
 * saldo de nenhuma conta específica em `computeAccountBalance`: o "saldo em contas"
 * ficava sempre inflado, sem descontar as contas já pagas. Agora recebe de qual conta
 * saiu o pagamento (opcional — `null` mantém o comportamento antigo, só some do
 * resumo geral do mês sem afetar saldo de conta nenhuma).
 */
export async function markBillPaid(
  userId: string,
  bill: Bill,
  paidAmount: number,
  accountId?: string | null
) {
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
    account_id: accountId ?? null,
  });
  if (transactionError) throw transactionError;

  await supabase.from("module_events").insert({
    user_id: userId,
    module_slug: "financas",
    event_type: "bill_paid",
    payload: { bill_name: bill.name, amount: paidAmount, amount_expected: bill.amount },
  });
}

export async function updateBill(
  id: string,
  input: { name: string; amount: number; dueDate: string; recurring: boolean }
) {
  const { error } = await supabase
    .from("bills")
    .update({
      name: input.name,
      amount: input.amount,
      due_date: input.dueDate,
      recurring: input.recurring,
    })
    .eq("id", id);
  if (error) throw error;
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

/**
 * Atualiza uma posição já existente — nome e valor atual (antes só
 * dava pra corrigir o valor; um nome digitado errado ficava travado pra sempre).
 */
export async function updateInvestment(id: string, input: { name: string; amount: number }) {
  const { error } = await supabase
    .from("investments")
    .update({ name: input.name, amount: input.amount })
    .eq("id", id);
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

// ============================================================
// Contas
// ============================================================

export async function createAccount(
  userId: string,
  input: { name: string; kind: AccountKind; initialBalance: number; colorKey: CategoryColorKey; position: number }
) {
  const { error } = await supabase.from("financial_accounts").insert({
    user_id: userId,
    name: input.name,
    kind: input.kind,
    initial_balance: input.initialBalance,
    color_key: input.colorKey,
    position: input.position,
  });
  if (error) throw error;
}

export async function updateAccount(
  id: string,
  input: { name: string; kind: AccountKind; initialBalance: number; colorKey: CategoryColorKey }
) {
  const { error } = await supabase
    .from("financial_accounts")
    .update({
      name: input.name,
      kind: input.kind,
      initial_balance: input.initialBalance,
      color_key: input.colorKey,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setAccountArchived(id: string, archived: boolean) {
  const { error } = await supabase.from("financial_accounts").update({ archived }).eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("financial_accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function createTransferBetweenAccounts(
  userId: string,
  input: { fromAccountId: string; toAccountId: string; amount: number; description: string }
) {
  await createTransaction(userId, {
    kind: "transfer",
    category: TRANSFER_CATEGORY,
    amount: input.amount,
    description: input.description,
    accountId: input.fromAccountId,
    transferToAccountId: input.toAccountId,
  });
}

/**
 * Edita uma transferência já lançada. Antes só dava pra excluir e
 * lançar de novo (a edição rápida de lançamentos usa outro formulário, sem campo de conta
 * de destino). Como o saldo de cada conta é sempre recalculado a partir das linhas de
 * `transactions` (ver `computeAccountBalance`), não existe nenhum outro dado pra corrigir
 * à parte — só atualizar a própria linha já resolve.
 */
export async function updateTransferBetweenAccounts(
  id: string,
  input: { fromAccountId: string; toAccountId: string; amount: number; description: string }
) {
  await updateTransaction(id, {
    kind: "transfer",
    category: TRANSFER_CATEGORY,
    amount: input.amount,
    description: input.description,
    accountId: input.fromAccountId,
    transferToAccountId: input.toAccountId,
  });
}

/** Saldo de uma conta: saldo inicial + receitas - despesas +/- transferências que
 * entraram ou saíram dela. Usa `balanceRows` (histórico completo, sem limite). */
export function computeAccountBalance(account: FinancialAccount, rows: BalanceRow[]) {
  let balance = Number(account.initial_balance);
  for (const r of rows) {
    if (r.kind === "income" && r.account_id === account.id) balance += Number(r.amount);
    else if (r.kind === "expense" && r.account_id === account.id) balance -= Number(r.amount);
    else if (r.kind === "transfer") {
      if (r.account_id === account.id) balance -= Number(r.amount);
      if (r.transfer_to_account_id === account.id) balance += Number(r.amount);
    }
  }
  return balance;
}

export function computeTotalAccountsBalance(accounts: FinancialAccount[], rows: BalanceRow[]) {
  return accounts
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + computeAccountBalance(a, rows), 0);
}

export type AccountHistoryEntry = {
  id: string;
  occurred_at: string;
  kind: TransactionKind;
  category: string;
  description: string | null;
  /** Já com o sinal aplicado do ponto de vista DESSA conta — positivo quando entra
   * (receita, ou lado de destino de uma transferência), negativo quando sai (despesa, ou
   * lado de origem de uma transferência). Somar tudo aqui dá o mesmo total de
   * `computeAccountBalance` (menos o saldo inicial) — é o que dá pra conferir item a item
   * de onde vem o saldo mostrado, em vez de só confiar no número final. */
  signedAmount: number;
  // Conta(s) reais do lançamento (não só o valor assinado pro ponto de vista desta
  // conta), pra dar pra editar: mover pra outra conta, ou (se for transferência) corrigir
  // origem/destino — depois de um caso de lançamento errado ficar difícil de rastrear no histórico.
  account_id: string | null;
  transfer_to_account_id: string | null;
};

/** Lançamentos que compõem o saldo de uma conta específica, do mais recente pro mais
 * antigo — pra dar pra conferir de onde vem o saldo mostrado. Uma transferência entra duas vezes se envolver a
 * mesma conta duas vezes de algum jeito (não deveria acontecer no fluxo normal), e nunca
 * mais de uma vez pro caso comum (origem OU destino, não os dois). */
export function accountHistory(account: FinancialAccount, rows: BalanceRow[]): AccountHistoryEntry[] {
  const entries: AccountHistoryEntry[] = [];
  for (const r of rows) {
    const base = {
      id: r.id,
      occurred_at: r.occurred_at,
      kind: r.kind,
      category: r.category,
      description: r.description,
      account_id: r.account_id,
      transfer_to_account_id: r.transfer_to_account_id,
    };
    if (r.kind === "income" && r.account_id === account.id) {
      entries.push({ ...base, signedAmount: Number(r.amount) });
    } else if (r.kind === "expense" && r.account_id === account.id) {
      entries.push({ ...base, signedAmount: -Number(r.amount) });
    } else if (r.kind === "transfer") {
      if (r.account_id === account.id) entries.push({ ...base, signedAmount: -Number(r.amount) });
      if (r.transfer_to_account_id === account.id) entries.push({ ...base, signedAmount: Number(r.amount) });
    }
  }
  return entries.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0));
}

/** Move um lançamento pra outra conta (ou desvincula, com `null`) sem mexer em mais nada
 * dele (categoria, valor, cartão, tags...) — pensado pro histórico por conta, que só tem
 * acesso aos campos enxutos de `BalanceRow`, não à transação inteira, cobrindo o caso de
 * transferir uma cobrança entre contas. Pra uma transferência, dá pra
 * corrigir os dois lados de uma vez passando `transferToAccountId` também. */
export async function updateTransactionAccount(
  id: string,
  patch: { accountId?: string | null; transferToAccountId?: string | null }
) {
  const update: Record<string, string | null> = {};
  if ("accountId" in patch) update.account_id = patch.accountId ?? null;
  if ("transferToAccountId" in patch) update.transfer_to_account_id = patch.transferToAccountId ?? null;
  const { error } = await supabase.from("transactions").update(update).eq("id", id);
  if (error) throw error;
}

// ============================================================
// Cartão de crédito
// ============================================================

export async function createCard(
  userId: string,
  input: { name: string; cardLimit: number | null; closingDay: number; dueDay: number; colorKey: CategoryColorKey }
) {
  const { error } = await supabase.from("credit_cards").insert({
    user_id: userId,
    name: input.name,
    card_limit: input.cardLimit,
    closing_day: input.closingDay,
    due_day: input.dueDay,
    color_key: input.colorKey,
  });
  if (error) throw error;
}

export async function updateCard(
  id: string,
  input: { name: string; cardLimit: number | null; closingDay: number; dueDay: number; colorKey: CategoryColorKey }
) {
  const { error } = await supabase
    .from("credit_cards")
    .update({
      name: input.name,
      card_limit: input.cardLimit,
      closing_day: input.closingDay,
      due_day: input.dueDay,
      color_key: input.colorKey,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setCardArchived(id: string, archived: boolean) {
  const { error } = await supabase.from("credit_cards").update({ archived }).eq("id", id);
  if (error) throw error;
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);
  if (error) throw error;
}

/** Ciclo (fatura) que contém a data `today`, dado o dia de fechamento do cartão. */
export function currentCardCycle(closingDay: number, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const thisMonthClose = new Date(y, m, closingDay);
  const cycleEnd = today <= thisMonthClose ? thisMonthClose : new Date(y, m + 1, closingDay);
  const cycleStart = new Date(cycleEnd);
  cycleStart.setMonth(cycleStart.getMonth() - 1);
  cycleStart.setDate(cycleStart.getDate() + 1);
  return { start: toDateString(cycleStart), end: toDateString(cycleEnd) };
}

export function computeCardCycleTotal(cardId: string, cycleStart: string, cycleEnd: string, rows: BalanceRow[]) {
  return rows
    .filter((r) => r.card_id === cardId && r.occurred_at >= cycleStart && r.occurred_at <= cycleEnd)
    .reduce((sum, r) => sum + Number(r.amount), 0);
}

/**
 * Faturas já fechadas (ciclo anterior ao aberto) que ainda não têm pagamento
 * registrado e têm algum lançamento — pra listar como "faturas fechadas" a pagar.
 * Limitado a 36 ciclos (3 anos) pra nunca rodar sem fim.
 */
export function closedUnpaidCycles(
  card: CreditCard,
  rows: BalanceRow[],
  payments: CreditCardPayment[],
  today = new Date()
) {
  const cardRows = rows.filter((r) => r.card_id === card.id);
  if (cardRows.length === 0) return [] as { start: string; end: string; total: number }[];

  const earliestDate = cardRows.reduce((min, r) => (r.occurred_at < min ? r.occurred_at : min), cardRows[0].occurred_at);
  const paidCycleEnds = new Set(payments.filter((p) => p.card_id === card.id).map((p) => p.cycle_end));

  const openCycle = currentCardCycle(card.closing_day, today);
  const cycles: { start: string; end: string; total: number }[] = [];

  let prevEnd = new Date(openCycle.start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  let safety = 0;
  while (toDateString(prevEnd) >= earliestDate && safety < 36) {
    safety++;
    const cycleEndStr = toDateString(prevEnd);
    const cycleStartDate = new Date(prevEnd);
    cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
    cycleStartDate.setDate(cycleStartDate.getDate() + 1);
    const cycleStartStr = toDateString(cycleStartDate);

    if (!paidCycleEnds.has(cycleEndStr)) {
      const total = computeCardCycleTotal(card.id, cycleStartStr, cycleEndStr, rows);
      if (total > 0) cycles.push({ start: cycleStartStr, end: cycleEndStr, total });
    }

    prevEnd = new Date(cycleStartDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
  }

  return cycles;
}

/** Paga uma fatura: registra o pagamento (trava contra pagar de novo, via unique
 * (card_id, cycle_end)) e lança a despesa correspondente na conta escolhida. */
export async function payCardCycle(
  userId: string,
  input: { cardId: string; cycleStart: string; cycleEnd: string; amount: number; paidFromAccountId: string }
) {
  const { error: paymentError } = await supabase.from("credit_card_payments").insert({
    user_id: userId,
    card_id: input.cardId,
    cycle_start: input.cycleStart,
    cycle_end: input.cycleEnd,
    amount: input.amount,
    paid_from_account_id: input.paidFromAccountId,
  });
  if (paymentError) throw paymentError;

  await createTransaction(userId, {
    kind: "expense",
    category: CARD_PAYMENT_CATEGORY,
    amount: input.amount,
    description: "Pagamento de fatura",
    accountId: input.paidFromAccountId,
  });
}

// ============================================================
// Tags
// ============================================================

export async function createTag(userId: string, input: { name: string; colorKey: CategoryColorKey }) {
  const { error } = await supabase
    .from("financial_tags")
    .insert({ user_id: userId, name: input.name, color_key: input.colorKey });
  if (error) throw error;
}

/** Antes só dava pra excluir uma tag e criar outra do zero. */
export async function updateTag(id: string, input: { name: string; colorKey: CategoryColorKey }) {
  const { error } = await supabase
    .from("financial_tags")
    .update({ name: input.name, color_key: input.colorKey })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTag(id: string) {
  const { error } = await supabase.from("financial_tags").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Planejamento mensal (orçamento por categoria)
// ============================================================

/** Sempre o dia 1 do mês, formato YYYY-MM-DD — é assim que a coluna `month` é guardada. */
export function monthKey(reference = new Date()) {
  return toDateString(new Date(reference.getFullYear(), reference.getMonth(), 1));
}

export async function fetchBudgetForMonth(month: string) {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("id, month, category, planned_amount")
    .eq("month", month);
  if (error) throw error;
  return (data ?? []) as BudgetCategory[];
}

export async function setBudgetCategory(
  userId: string,
  input: { month: string; category: string; plannedAmount: number }
) {
  const { error } = await supabase
    .from("budget_categories")
    .upsert(
      { user_id: userId, month: input.month, category: input.category, planned_amount: input.plannedAmount },
      { onConflict: "user_id,month,category" }
    );
  if (error) throw error;
}

export async function deleteBudgetCategory(id: string) {
  const { error } = await supabase.from("budget_categories").delete().eq("id", id);
  if (error) throw error;
}

/** Copia os valores planejados do mês anterior pro mês atual — retorna quantas
 * categorias foram copiadas (0 se o mês anterior não tinha planejamento nenhum). */
export async function copyBudgetFromPreviousMonth(userId: string, currentMonth: string) {
  // `new Date("YYYY-MM-DD")` interpreta a string como UTC — num fuso negativo (Brasil
  // inteiro) isso "puxa" a data um dia pra trás e o mês fica errado. Construindo com
  // ano/mês/dia numéricos o Date fica em horário local, que é o que `toDateString` espera.
  const [year, monthNum] = currentMonth.split("-").map(Number);
  const prev = new Date(year, monthNum - 2, 1);
  const prevMonth = toDateString(prev);
  const prevBudget = await fetchBudgetForMonth(prevMonth);
  if (prevBudget.length === 0) return 0;

  const rows = prevBudget.map((b) => ({
    user_id: userId,
    month: currentMonth,
    category: b.category,
    planned_amount: b.planned_amount,
  }));
  const { error } = await supabase.from("budget_categories").upsert(rows, { onConflict: "user_id,month,category" });
  if (error) throw error;
  return rows.length;
}

/** Planejado x realizado por categoria, considerando só as transações do mês em questão. */
export function computeBudgetProgress(budget: BudgetCategory[], transactions: Transaction[], month: string) {
  // Mesmo cuidado de `copyBudgetFromPreviousMonth`: parsear "YYYY-MM-DD" direto com `new
  // Date(string)` lê como UTC e desalinha o mês em qualquer fuso negativo (Brasil todo) —
  // por isso quebra ano/mês/dia manualmente antes de montar o Date em horário local.
  const [year, monthNum] = month.split("-").map(Number);
  const monthEnd = toDateString(new Date(year, monthNum, 0));
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.occurred_at < month || t.occurred_at > monthEnd) continue;
    spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + Number(t.amount));
  }
  return budget
    .map((b) => ({
      category: b.category,
      planned: Number(b.planned_amount),
      spent: spentByCategory.get(b.category) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent);
}

// ============================================================
// Metas financeiras
// ============================================================

export async function createGoal(
  userId: string,
  input: { title: string; targetAmount: number; targetDate: string | null; notes: string }
) {
  const { error } = await supabase.from("financial_goals").insert({
    user_id: userId,
    title: input.title,
    target_amount: input.targetAmount,
    target_date: input.targetDate,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function updateGoal(
  id: string,
  input: { title: string; targetAmount: number; targetDate: string | null; notes: string }
) {
  const { error } = await supabase
    .from("financial_goals")
    .update({
      title: input.title,
      target_amount: input.targetAmount,
      target_date: input.targetDate,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function contributeToGoal(id: string, currentAmount: number, addAmount: number) {
  const { error } = await supabase
    .from("financial_goals")
    .update({ current_amount: currentAmount + addAmount })
    .eq("id", id);
  if (error) throw error;
}

export async function setGoalCompleted(id: string, completed: boolean) {
  const { error } = await supabase
    .from("financial_goals")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) throw error;
}
