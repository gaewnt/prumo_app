import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { BalanceLineChart } from "@/components/charts/balance-line-chart";
import { SummaryCard } from "@/components/financas/summary-card";
import { MonthNav } from "@/components/ui/month-nav";
import { PendingAlerts } from "@/components/financas/pending-alerts";
import { CategoryBreakdown } from "@/components/financas/category-breakdown";
import { BillRow } from "@/components/financas/bill-row";
import { InvestmentRow } from "@/components/financas/investment-row";
import { NewTransactionForm } from "@/components/financas/new-transaction-form";
import { NewBillForm } from "@/components/financas/new-bill-form";
import { NewInvestmentForm } from "@/components/financas/new-investment-form";
import { TransferForm } from "@/components/financas/transfer-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancas,
  fetchFinancasExtras,
  fetchCustomCategories,
  allCategoryNames,
  computeSummary,
  computeCategoryBreakdown,
  computeInvestedTotal,
  computeWeeklySpend,
  computeCashFlowSeries,
  computeAccountBalance,
  computeTotalAccountsBalance,
  computePendingBillsTotal,
  upcomingBills,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createBill,
  updateBill,
  markBillPaid,
  deleteBill,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  updateTransferBetweenAccounts,
  formatCurrency,
  formatHistoryDate,
  categoryEmoji,
  rendaFixaJaEfetivadaEsteMes,
  RENDA_FIXA_CATEGORY,
  TRANSACTION_HISTORY_LIMIT,
  type Bill,
} from "@/lib/financas";
import { fetchModulePreference, updateModulePreferenceField } from "@/lib/onboarding";

type OpenForm = "none" | "transaction" | "bill" | "investment";

/** Atalhos pras telas novas do módulo — cada uma é uma rota própria, pra não empilhar
 * tudo numa única tela gigante. */
const SHORTCUTS: { icon: string; label: string; route: string }[] = [
  { icon: "🏦", label: "Contas", route: "/modulo/financas-contas" },
  { icon: "💳", label: "Cartão", route: "/modulo/financas-cartao" },
  { icon: "📊", label: "Planejamento", route: "/modulo/financas-orcamento" },
  { icon: "🎯", label: "Metas", route: "/modulo/financas-metas" },
  { icon: "🏷️", label: "Tags", route: "/modulo/financas-tags" },
  { icon: "🗂️", label: "Categorias", route: "/modulo/financas-categorias" },
];

export default function FinancasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState<OpenForm>("none");
  const [savingBillId, setSavingBillId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [savingInvestmentId, setSavingInvestmentId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingRendaFixa, setEditingRendaFixa] = useState(false);
  const [rendaFixaText, setRendaFixaText] = useState("");

  const query = useQuery({
    queryKey: ["financas", userId],
    queryFn: fetchFinancas,
    enabled: !!userId,
  });
  const transactions = query.data?.transactions ?? [];
  const bills = query.data?.bills ?? [];
  const investments = query.data?.investments ?? [];
  const gastosFixos = bills.filter((b) => b.recurring);
  const outrasContas = bills.filter((b) => !b.recurring);

  const prefsQuery = useQuery({
    queryKey: ["financas-prefs", userId],
    queryFn: () => fetchModulePreference("financas"),
    enabled: !!userId,
  });
  const rendaFixa = prefsQuery.data?.renda_fixa as string | undefined;
  // Trava contra duplicar o lançamento de renda fixa se a pessoa tocar em "Efetivado"
  // mais de uma vez no mesmo mês (o botão antes ficava sempre visível, sem checar isso).
  const rendaFixaEfetivada = rendaFixaJaEfetivadaEsteMes(transactions);

  // Contas, cartões e tags — usados pro seletor no formulário de lançamento. Busca
  // separada de `fetchFinancas` (mesmo padrão de "financas-extras" usado nas telas novas).
  const extrasQuery = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });
  const activeAccounts = (extrasQuery.data?.accounts ?? []).filter((a) => !a.archived);
  const activeCards = (extrasQuery.data?.cards ?? []).filter((c) => !c.archived);
  const tags = extrasQuery.data?.tags ?? [];
  // Saldo por conta e somado direto na visão geral,
  // sem precisar entrar em Finanças › Contas. Mesmos dados/cálculo já usados lá
  // (`fetchFinancasExtras` + `computeAccountBalance`/`computeTotalAccountsBalance`).
  const balanceRows = extrasQuery.data?.balanceRows ?? [];
  const totalAccountsBalance = computeTotalAccountsBalance(activeAccounts, balanceRows);

  const customCategoriesQuery = useQuery({
    queryKey: ["financas-custom-categories", userId],
    queryFn: fetchCustomCategories,
    enabled: !!userId,
  });
  const allCategories = allCategoryNames(customCategoriesQuery.data ?? []);

  // Descrições recentes (sem repetir), pro autocompletar do formulário de lançamento.
  const recentDescriptions = Array.from(
    new Set(transactions.map((t) => t.description).filter((d): d is string => !!d && d.trim().length > 0))
  ).slice(0, 30);

  const rendaFixaMutation = useMutation({
    mutationFn: (valor: string) => updateModulePreferenceField(userId!, "financas", { renda_fixa: valor }),
    onSuccess: () => {
      setEditingRendaFixa(false);
      queryClient.invalidateQueries({ queryKey: ["financas-prefs", userId] });
    },
  });
  // Histórico de meses anteriores — `transactions` já traz os 200
  // lançamentos mais recentes de qualquer mês (ver `fetchFinancas`), então navegar de mês só
  // filtra o que já veio, sem busca nova. Fora desse limite (mês bem antigo), pode não aparecer
  // tudo — é a mesma limitação de sempre do "últimos 200", só agora fica visível ao navegar.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentHistoryMonth =
    historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();
  const summary = computeSummary(transactions, historyMonth);
  const categoryBreakdown = computeCategoryBreakdown(transactions, historyMonth);
  const historyMonthStart = new Date(historyMonth.getFullYear(), historyMonth.getMonth(), 1);
  const historyMonthEnd = new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1, 0);
  const historyMonthStartStr = `${historyMonthStart.getFullYear()}-${String(historyMonthStart.getMonth() + 1).padStart(2, "0")}-01`;
  const historyMonthEndStr = `${historyMonthEnd.getFullYear()}-${String(historyMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(historyMonthEnd.getDate()).padStart(2, "0")}`;
  const transactionsInHistoryMonth = transactions.filter(
    (t) => t.occurred_at >= historyMonthStartStr && t.occurred_at <= historyMonthEndStr
  );
  const investedTotal = computeInvestedTotal(investments);
  const weeklySpend = computeWeeklySpend(transactions);
  const cashFlowSeries = computeCashFlowSeries(transactions);
  const pendingBillsTotal = computePendingBillsTotal(bills);
  const saldoSeguro = summary.balance - pendingBillsTotal;
  const alertBills = upcomingBills(bills);
  const cashFlowEnd = cashFlowSeries[cashFlowSeries.length - 1] ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    // Lançamentos agora podem estar ligados a conta/cartão — invalida os saldos também.
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  const createTransactionMutation = useMutation({
    mutationFn: (input: Parameters<typeof createTransaction>[1]) => createTransaction(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidate();
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTransaction>[1] }) =>
      updateTransaction(id, input),
    onSuccess: () => {
      setEditingTransactionId(null);
      invalidate();
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: invalidate,
  });

  const createBillMutation = useMutation({
    mutationFn: (input: Parameters<typeof createBill>[1]) => createBill(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidate();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ bill, paidAmount, accountId }: { bill: Bill; paidAmount: number; accountId: string | null }) =>
      markBillPaid(userId!, bill, paidAmount, accountId),
    onMutate: ({ bill }) => setSavingBillId(bill.id),
    onSettled: () => {
      setSavingBillId(null);
      invalidate();
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateBill>[1] }) =>
      updateBill(id, input),
    onSuccess: () => {
      setEditingBillId(null);
      invalidate();
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onMutate: (id) => setSavingBillId(id),
    onSettled: () => {
      setSavingBillId(null);
      invalidate();
    },
  });

  const createInvestmentMutation = useMutation({
    mutationFn: (input: Parameters<typeof createInvestment>[1]) => createInvestment(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidate();
    },
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateInvestment>[1] }) =>
      updateInvestment(id, input),
    onMutate: ({ id }) => setSavingInvestmentId(id),
    onSettled: () => {
      setSavingInvestmentId(null);
      invalidate();
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTransferBetweenAccounts>[1] }) =>
      updateTransferBetweenAccounts(id, input),
    onSuccess: () => {
      setEditingTransactionId(null);
      invalidate();
    },
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: (id: string) => deleteInvestment(id),
    onMutate: (id) => setSavingInvestmentId(id),
    onSettled: () => {
      setSavingInvestmentId(null);
      invalidate();
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>💰</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Finanças
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Receitas, despesas e contas a vencer deste mês.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {SHORTCUTS.map((shortcut) => (
            <Pressable
              key={shortcut.route}
              onPress={() => router.push(shortcut.route as any)}
              style={{
                width: 80,
                alignItems: "center",
                gap: 6,
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ fontSize: 20 }}>{shortcut.icon}</Text>
              <Text
                style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: tokens.textMuted, textAlign: "center" }}
                numberOfLines={1}
              >
                {shortcut.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />

            <SummaryCard income={summary.income} expense={summary.expense} balance={summary.balance} />

            {activeAccounts.length > 0 ? (
              <View
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  gap: 10,
                }}
              >
                <Pressable
                  onPress={() => router.push("/modulo/financas-contas")}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                    Saldo em contas
                  </Text>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                    Ver contas ›
                  </Text>
                </Pressable>
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 24,
                    color: totalAccountsBalance >= 0 ? tokens.text : tokens.danger,
                  }}
                >
                  {formatCurrency(totalAccountsBalance)}
                </Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {activeAccounts.map((acc) => (
                    <View key={acc.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens[acc.color_key] }}
                      />
                      <Text
                        style={{ flex: 1, minWidth: 0, fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}
                        numberOfLines={1}
                      >
                        {acc.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fontFamily.mono,
                          fontSize: 13,
                          color: tokens.textMuted,
                        }}
                      >
                        {formatCurrency(computeAccountBalance(acc, balanceRows))}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Renda fixa mensal
                </Text>
                {editingRendaFixa ? (
                  <TextInput
                    value={rendaFixaText}
                    onChangeText={setRendaFixaText}
                    placeholder="Ex: 2500,00"
                    placeholderTextColor={tokens.textMuted}
                    keyboardType="decimal-pad"
                    autoFocus
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 18,
                      color: tokens.text,
                      backgroundColor: tokens.surfaceAlt,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      marginTop: 4,
                    }}
                  />
                ) : (
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 20, color: tokens.text, marginTop: 2 }}>
                    {rendaFixa ? formatCurrency(Number(rendaFixa.replace(",", "."))) : "Não informado"}
                  </Text>
                )}
              </View>
              {editingRendaFixa ? (
                <Pressable onPress={() => rendaFixaMutation.mutate(rendaFixaText)} disabled={rendaFixaMutation.isPending}>
                  {rendaFixaMutation.isPending ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                      Salvar
                    </Text>
                  )}
                </Pressable>
              ) : (
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  {rendaFixa ? (
                    rendaFixaEfetivada ? (
                      // Já foi lançada este mês — esconde o botão em vez de deixar visível
                      // pra sempre, que era o que deixava fácil tocar de novo sem querer e
                      // duplicar a receita.
                      <View
                        style={{
                          backgroundColor: tokens.successMuted,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.success }}>
                          Efetivada este mês
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() =>
                          createTransactionMutation.mutate({
                            kind: "income",
                            category: RENDA_FIXA_CATEGORY,
                            amount: Number(rendaFixa.replace(",", ".")),
                            description: "Renda fixa mensal",
                          })
                        }
                        disabled={createTransactionMutation.isPending}
                        style={{
                          backgroundColor: tokens.successMuted,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          opacity: createTransactionMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.success }}>
                          Efetivado
                        </Text>
                      </Pressable>
                    )
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setRendaFixaText(rendaFixa ?? "");
                      setEditingRendaFixa(true);
                    }}
                    hitSlop={8}
                  >
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                      Editar
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <PendingAlerts bills={alertBills} saldoSeguro={saldoSeguro} />

            <StatCard
              label="Gastos essa semana"
              value={formatCurrency(weeklySpend.total)}
              deltaLabel={`${weeklySpend.deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(weeklySpend.deltaPct))}%`}
              deltaTone={weeklySpend.deltaPct > 0 ? "negative" : weeklySpend.deltaPct < 0 ? "positive" : "neutral"}
            >
              <WeeklyBarChart data={weeklySpend.days} highlightIndex={weeklySpend.days.length - 1} />
            </StatCard>

            <CategoryBreakdown items={categoryBreakdown} />

            <StatCard
              label="Fluxo de caixa — últimos 30 dias"
              value={formatCurrency(cashFlowEnd)}
              deltaTone={cashFlowEnd >= 0 ? "positive" : "negative"}
            >
              <BalanceLineChart points={cashFlowSeries} />
            </StatCard>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Contas a vencer
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "bill" ? "none" : "bill")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "bill" ? "Cancelar" : "+ Nova conta"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "bill" ? (
                <NewBillForm
                  isSaving={createBillMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) => createBillMutation.mutate(input)}
                />
              ) : null}

              {gastosFixos.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    Gastos fixos (recorrentes)
                  </Text>
                  {gastosFixos.map((bill) => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      accounts={activeAccounts}
                      isSaving={savingBillId === bill.id}
                      onMarkPaid={(paidAmount, accountId) => markPaidMutation.mutate({ bill, paidAmount, accountId })}
                      onDelete={() => deleteBillMutation.mutate(bill.id)}
                      isEditing={editingBillId === bill.id}
                      onStartEdit={() => setEditingBillId(bill.id)}
                      onCancelEdit={() => setEditingBillId(null)}
                      onUpdate={(input) => updateBillMutation.mutate({ id: bill.id, input })}
                      isUpdating={updateBillMutation.isPending && editingBillId === bill.id}
                    />
                  ))}
                </View>
              ) : null}

              {outrasContas.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {gastosFixos.length > 0 ? (
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                      Outras contas
                    </Text>
                  ) : null}
                  {outrasContas.map((bill) => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      accounts={activeAccounts}
                      isSaving={savingBillId === bill.id}
                      onMarkPaid={(paidAmount, accountId) => markPaidMutation.mutate({ bill, paidAmount, accountId })}
                      onDelete={() => deleteBillMutation.mutate(bill.id)}
                      isEditing={editingBillId === bill.id}
                      onStartEdit={() => setEditingBillId(bill.id)}
                      onCancelEdit={() => setEditingBillId(null)}
                      onUpdate={(input) => updateBillMutation.mutate({ id: bill.id, input })}
                      isUpdating={updateBillMutation.isPending && editingBillId === bill.id}
                    />
                  ))}
                </View>
              ) : null}

              {bills.length === 0 && openForm !== "bill" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma conta cadastrada. Marque "Conta recorrente" ao criar pra ela entrar em Gastos fixos.
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Lançar despesa/receita
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    {isCurrentHistoryMonth
                      ? `Mês atual — busca os últimos ${TRANSACTION_HISTORY_LIMIT} lançamentos de qualquer mês`
                      : "Lançamentos do mês selecionado acima — pode não aparecer tudo se for um mês bem antigo"}
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "transaction" ? "none" : "transaction")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "transaction" ? "Cancelar" : "+ Adicionar"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "transaction" ? (
                <NewTransactionForm
                  isSaving={createTransactionMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) => createTransactionMutation.mutate(input)}
                  allCategories={allCategories}
                  accounts={activeAccounts}
                  cards={activeCards}
                  tags={tags}
                  recentDescriptions={recentDescriptions}
                />
              ) : null}

              {transactionsInHistoryMonth.length === 0 && openForm !== "transaction" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  {isCurrentHistoryMonth ? "Nenhum lançamento ainda." : "Nenhum lançamento nesse mês."}
                </Text>
              ) : (
                transactionsInHistoryMonth.map((t) => {
                  const account = activeAccounts.find((a) => a.id === t.account_id);
                  const card = activeCards.find((c) => c.id === t.card_id);
                  const transactionTags = tags.filter((tag) => t.tagIds.includes(tag.id));
                  return editingTransactionId === t.id && t.kind === "transfer" ? (
                    // Transferência usa o mesmo `TransferForm` do
                    // cadastro (com conta de origem/destino), não o formulário rápido de
                    // despesa/receita, que não tem esses campos.
                    <TransferForm
                      key={t.id}
                      initial={{
                        fromAccountId: t.account_id ?? "",
                        toAccountId: t.transfer_to_account_id ?? "",
                        amount: t.amount,
                        description: t.description ?? "",
                      }}
                      submitLabel="Salvar alterações"
                      accounts={activeAccounts}
                      isSaving={updateTransferMutation.isPending}
                      onCancel={() => setEditingTransactionId(null)}
                      onSubmit={(input) => updateTransferMutation.mutate({ id: t.id, input })}
                    />
                  ) : editingTransactionId === t.id ? (
                    <NewTransactionForm
                      key={t.id}
                      initial={{
                        kind: t.kind,
                        category: t.category,
                        amount: t.amount,
                        description: t.description ?? "",
                        accountId: t.account_id,
                        cardId: t.card_id,
                        tagIds: t.tagIds,
                      }}
                      submitLabel="Salvar alterações"
                      isSaving={updateTransactionMutation.isPending}
                      onCancel={() => setEditingTransactionId(null)}
                      onSubmit={(input) => updateTransactionMutation.mutate({ id: t.id, input })}
                      allCategories={allCategories}
                      accounts={activeAccounts}
                      cards={activeCards}
                      tags={tags}
                      recentDescriptions={recentDescriptions}
                    />
                  ) : (
                    <View
                      key={t.id}
                      style={{
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                        borderWidth: 1,
                        borderRadius: 14,
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: tokens.surfaceAlt,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{t.kind === "transfer" ? "🔁" : categoryEmoji(t.category)}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                            {t.description || t.category}
                          </Text>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                            {t.category} · {formatHistoryDate(t.occurred_at)}
                            {account ? ` · ${account.name}` : ""}
                            {card ? ` · 💳 ${card.name}` : ""}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontFamily: fontFamily.bodySemibold,
                            fontSize: 14,
                            color: t.kind === "income" ? tokens.success : t.kind === "transfer" ? tokens.textMuted : tokens.danger,
                          }}
                        >
                          {t.kind === "income" ? "+" : t.kind === "transfer" ? "" : "-"}
                          {formatCurrency(t.amount)}
                        </Text>
                        <Pressable onPress={() => setEditingTransactionId(t.id)} hitSlop={8}>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>
                            Editar
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => deleteTransactionMutation.mutate(t.id)} hitSlop={8}>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                            ✕
                          </Text>
                        </Pressable>
                      </View>
                      {transactionTags.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {transactionTags.map((tag) => (
                            <View
                              key={tag.id}
                              style={{
                                backgroundColor: tokens[tag.color_key],
                                borderRadius: 6,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                              }}
                            >
                              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10.5, color: tokens.accentText }}>
                                {tag.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>

            {/* Investimentos é o bloco menos usado do módulo — fica por último de propósito. */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Investimentos
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    Total investido: {formatCurrency(investedTotal)}
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "investment" ? "none" : "investment")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "investment" ? "Cancelar" : "+ Novo investimento"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "investment" ? (
                <NewInvestmentForm
                  isSaving={createInvestmentMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) => createInvestmentMutation.mutate(input)}
                />
              ) : null}

              {investments.length === 0 && openForm !== "investment" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum investimento cadastrado.
                </Text>
              ) : (
                investments.map((investment) => (
                  <InvestmentRow
                    key={investment.id}
                    investment={investment}
                    isSaving={savingInvestmentId === investment.id}
                    onUpdate={(input) => updateInvestmentMutation.mutate({ id: investment.id, input })}
                    onDelete={() => deleteInvestmentMutation.mutate(investment.id)}
                  />
                ))
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
