import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { BalanceLineChart } from "@/components/charts/balance-line-chart";
import { SummaryCard } from "@/components/financas/summary-card";
import { PendingAlerts } from "@/components/financas/pending-alerts";
import { CategoryBreakdown } from "@/components/financas/category-breakdown";
import { BillRow } from "@/components/financas/bill-row";
import { InvestmentRow } from "@/components/financas/investment-row";
import { NewTransactionForm } from "@/components/financas/new-transaction-form";
import { NewBillForm } from "@/components/financas/new-bill-form";
import { NewInvestmentForm } from "@/components/financas/new-investment-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancas,
  computeSummary,
  computeCategoryBreakdown,
  computeInvestedTotal,
  computeWeeklySpend,
  computeCashFlowSeries,
  computePendingBillsTotal,
  upcomingBills,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createBill,
  markBillPaid,
  deleteBill,
  createInvestment,
  updateInvestmentAmount,
  deleteInvestment,
  formatCurrency,
  formatHistoryDate,
  categoryEmoji,
  TRANSACTION_HISTORY_LIMIT,
  type Bill,
} from "@/lib/financas";
import { fetchModulePreference, updateModulePreferenceField } from "@/lib/onboarding";

type OpenForm = "none" | "transaction" | "bill" | "investment";

export default function FinancasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState<OpenForm>("none");
  const [savingBillId, setSavingBillId] = useState<string | null>(null);
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

  const rendaFixaMutation = useMutation({
    mutationFn: (valor: string) => updateModulePreferenceField(userId!, "financas", { renda_fixa: valor }),
    onSuccess: () => {
      setEditingRendaFixa(false);
      queryClient.invalidateQueries({ queryKey: ["financas-prefs", userId] });
    },
  });
  const summary = computeSummary(transactions);
  const categoryBreakdown = computeCategoryBreakdown(transactions);
  const investedTotal = computeInvestedTotal(investments);
  const weeklySpend = computeWeeklySpend(transactions);
  const cashFlowSeries = computeCashFlowSeries(transactions);
  const pendingBillsTotal = computePendingBillsTotal(bills);
  const saldoSeguro = summary.balance - pendingBillsTotal;
  const alertBills = upcomingBills(bills);
  const cashFlowEnd = cashFlowSeries[cashFlowSeries.length - 1] ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["financas", userId] });
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
    mutationFn: ({ bill, paidAmount }: { bill: Bill; paidAmount: number }) =>
      markBillPaid(userId!, bill, paidAmount),
    onMutate: ({ bill }) => setSavingBillId(bill.id),
    onSettled: () => {
      setSavingBillId(null);
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
    mutationFn: ({ id, amount }: { id: string; amount: number }) => updateInvestmentAmount(id, amount),
    onMutate: ({ id }) => setSavingInvestmentId(id),
    onSettled: () => {
      setSavingInvestmentId(null);
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

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <SummaryCard income={summary.income} expense={summary.expense} balance={summary.balance} />

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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
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
                    onUpdateAmount={(amount) => updateInvestmentMutation.mutate({ id: investment.id, amount })}
                    onDelete={() => deleteInvestmentMutation.mutate(investment.id)}
                  />
                ))
              )}
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Contas a vencer
                </Text>
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
                      isSaving={savingBillId === bill.id}
                      onMarkPaid={(paidAmount) => markPaidMutation.mutate({ bill, paidAmount })}
                      onDelete={() => deleteBillMutation.mutate(bill.id)}
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
                      isSaving={savingBillId === bill.id}
                      onMarkPaid={(paidAmount) => markPaidMutation.mutate({ bill, paidAmount })}
                      onDelete={() => deleteBillMutation.mutate(bill.id)}
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Histórico de lançamentos
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    Últimos {TRANSACTION_HISTORY_LIMIT} — o resumo acima considera só o mês atual
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "transaction" ? "none" : "transaction")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "transaction" ? "Cancelar" : "+ Novo"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "transaction" ? (
                <NewTransactionForm
                  isSaving={createTransactionMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) => createTransactionMutation.mutate(input)}
                />
              ) : null}

              {transactions.length === 0 && openForm !== "transaction" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum lançamento ainda.
                </Text>
              ) : (
                transactions.map((t) =>
                  editingTransactionId === t.id ? (
                    <NewTransactionForm
                      key={t.id}
                      initial={{
                        kind: t.kind,
                        category: t.category,
                        amount: t.amount,
                        description: t.description ?? "",
                      }}
                      submitLabel="Salvar alterações"
                      isSaving={updateTransactionMutation.isPending}
                      onCancel={() => setEditingTransactionId(null)}
                      onSubmit={(input) => updateTransactionMutation.mutate({ id: t.id, input })}
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
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
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
                        <Text style={{ fontSize: 16 }}>{categoryEmoji(t.category)}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                          {t.description || t.category}
                        </Text>
                        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                          {t.category} · {formatHistoryDate(t.occurred_at)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: fontFamily.bodySemibold,
                          fontSize: 14,
                          color: t.kind === "income" ? tokens.success : tokens.danger,
                        }}
                      >
                        {t.kind === "income" ? "+" : "-"}
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
                  )
                )
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
