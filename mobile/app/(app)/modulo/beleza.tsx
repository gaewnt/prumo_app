import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { NewProductForm } from "@/components/beleza/new-product-form";
import { ProductRow } from "@/components/beleza/product-row";
import { NewRoutineStepForm } from "@/components/beleza/new-routine-step-form";
import { RoutineStepRow } from "@/components/beleza/routine-step-row";
import { SkinDayForm } from "@/components/beleza/skin-day-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { toDateString } from "@/lib/rotina";
import {
  fetchBeleza,
  fetchSkinLogsForMonth,
  createBeautyProduct,
  updateBeautyProduct,
  deleteBeautyProduct,
  createRoutineStep,
  updateRoutineStep,
  deleteRoutineStep,
  toggleRoutineStepToday,
  stepsForPeriod,
  upsertSkinLog,
  deleteSkinLog,
  computeWeeklyOverall,
  computeSkinStreak,
  type BeautyProduct,
  type ProductInput,
  type RoutineStepInput,
  type SkinLogInput,
} from "@/lib/beleza";

function formatDateLabel(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

/** Conteúdo de Beleza — usado tanto na rota própria quanto como aba dentro do hub Desenvolvimento Pessoal. */
export function BelezaContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showStepForm, setShowStepForm] = useState(false);
  const [selectedSkinDate, setSelectedSkinDate] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["beleza", userId],
    queryFn: fetchBeleza,
    enabled: !!userId,
  });
  const products = query.data?.products ?? [];
  const routineSteps = query.data?.routineSteps ?? [];
  const routineLogsToday = query.data?.routineLogsToday ?? [];
  const skinLogs = query.data?.skinLogs ?? [];

  // Histórico de meses anteriores — mesmo padrão da Rotina: o mês atual
  // reaproveita `skinLogs` (já vem na busca de sempre), só busca de novo ao navegar de mês.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentHistoryMonth =
    historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();
  const historySkinLogsQuery = useQuery({
    queryKey: ["beleza", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchSkinLogsForMonth(historyMonth),
    enabled: !!userId && !isCurrentHistoryMonth,
  });
  const heatmapSkinLogs = isCurrentHistoryMonth ? skinLogs : historySkinLogsQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["beleza", userId] });
  }

  const doneStepIdsToday = new Set(routineLogsToday.map((l) => l.step_id));
  const weeklyOverall = computeWeeklyOverall(skinLogs);
  const streak = computeSkinStreak(skinLogs);
  const selectedSkinLog = selectedSkinDate ? heatmapSkinLogs.find((l) => l.log_date === selectedSkinDate) : undefined;

  const createProductMutation = useMutation({
    mutationFn: (input: ProductInput) => createBeautyProduct(userId!, input),
    onSuccess: () => {
      setShowProductForm(false);
      invalidate();
    },
  });
  const updateProductMutation = useMutation({
    mutationFn: ({ product, input }: { product: BeautyProduct; input: ProductInput }) =>
      updateBeautyProduct(product, input),
    onSuccess: () => {
      setEditingProductId(null);
      invalidate();
    },
  });
  const deleteProductMutation = useMutation({
    mutationFn: (product: BeautyProduct) => deleteBeautyProduct(product),
    onSuccess: invalidate,
  });

  const createStepMutation = useMutation({
    mutationFn: (input: RoutineStepInput) => createRoutineStep(userId!, input),
    onSuccess: () => {
      setShowStepForm(false);
      invalidate();
    },
  });
  const updateStepMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoutineStepInput }) => updateRoutineStep(id, input),
    onSuccess: () => {
      setEditingStepId(null);
      invalidate();
    },
  });
  const deleteStepMutation = useMutation({
    mutationFn: (id: string) => deleteRoutineStep(id),
    onSuccess: invalidate,
  });
  const toggleStepMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleRoutineStepToday(userId!, id, done),
    onSuccess: invalidate,
  });

  const saveSkinLogMutation = useMutation({
    mutationFn: ({ date, input }: { date: string; input: SkinLogInput }) => upsertSkinLog(userId!, date, input),
    onSuccess: () => {
      setSelectedSkinDate(null);
      invalidate();
    },
  });
  const deleteSkinLogMutation = useMutation({
    mutationFn: (id: string) => deleteSkinLog(id),
    onSuccess: () => {
      setSelectedSkinDate(null);
      invalidate();
    },
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>💧</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Beleza</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Rotina de cuidados, produtos com validade e check-in da pele.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar seus dados de Beleza agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 24 }}>
          {/* Check-in da pele */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Como está sua pele
            </Text>
            <StatCard label="Nota geral, últimos 7 dias" value={streak > 0 ? `🔥 ${streak} dias seguidos` : "Sem sequência ainda"}>
              <WeeklyBarChart data={weeklyOverall} highlightIndex={6} />
            </StatCard>
            <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
            <MonthHeatmap
              monthDate={historyMonth}
              showMonthLabel={false}
              selectedDate={selectedSkinDate}
              onSelectDate={(date) => setSelectedSkinDate((current) => (current === date ? null : date))}
              getCellColor={(dateStr) => {
                const log = heatmapSkinLogs.find((l) => l.log_date === dateStr);
                if (!log) return null;
                if (log.overall <= 2) return tokens.warning;
                return tokens.accent;
              }}
            />
            {selectedSkinDate ? (
              <SkinDayForm
                dateLabel={formatDateLabel(selectedSkinDate)}
                existingLog={selectedSkinLog}
                isSaving={saveSkinLogMutation.isPending || deleteSkinLogMutation.isPending}
                onClose={() => setSelectedSkinDate(null)}
                onSave={(input) => saveSkinLogMutation.mutate({ date: selectedSkinDate, input })}
                onDelete={() => {
                  if (selectedSkinLog) deleteSkinLogMutation.mutate(selectedSkinLog.id);
                }}
              />
            ) : (
              <Pressable onPress={() => setSelectedSkinDate(toDateString(new Date()))} hitSlop={8}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                  + Registrar hoje
                </Text>
              </Pressable>
            )}
          </View>

          {/* Rotina */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Rotina
            </Text>

            {routineSteps.length === 0 && !showStepForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum passo de rotina cadastrado ainda.
              </Text>
            ) : null}

            {(["manha", "noite"] as const).map((period) => {
              const steps = stepsForPeriod(routineSteps, period);
              if (steps.length === 0) return null;
              return (
                <View key={period} style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    {period === "manha" ? "☀️ Manhã" : "🌙 Noite"}
                  </Text>
                  {steps.map((step) => (
                    <RoutineStepRow
                      key={step.id}
                      step={step}
                      product={products.find((p) => p.id === step.product_id)}
                      products={products}
                      done={doneStepIdsToday.has(step.id)}
                      onToggleDone={() => toggleStepMutation.mutate({ id: step.id, done: doneStepIdsToday.has(step.id) })}
                      isEditing={editingStepId === step.id}
                      onStartEdit={() => setEditingStepId(step.id)}
                      onCancelEdit={() => setEditingStepId(null)}
                      onUpdate={(input) => updateStepMutation.mutate({ id: step.id, input })}
                      isSaving={updateStepMutation.isPending}
                      onDelete={() => deleteStepMutation.mutate(step.id)}
                    />
                  ))}
                </View>
              );
            })}

            {showStepForm ? (
              <NewRoutineStepForm
                products={products}
                isSaving={createStepMutation.isPending}
                onCancel={() => setShowStepForm(false)}
                onSubmit={(input) => createStepMutation.mutate(input)}
              />
            ) : (
              <Pressable
                onPress={() => setShowStepForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo passo
                </Text>
              </Pressable>
            )}
          </View>

          {/* Produtos */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Produtos
            </Text>

            {products.length === 0 && !showProductForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum produto cadastrado ainda.
              </Text>
            ) : null}

            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isEditing={editingProductId === product.id}
                onStartEdit={() => setEditingProductId(product.id)}
                onCancelEdit={() => setEditingProductId(null)}
                onUpdate={(input) => updateProductMutation.mutate({ product, input })}
                isSaving={updateProductMutation.isPending}
                onDelete={() => deleteProductMutation.mutate(product)}
              />
            ))}

            {showProductForm ? (
              <NewProductForm
                isSaving={createProductMutation.isPending}
                onCancel={() => setShowProductForm(false)}
                onSubmit={(input) => createProductMutation.mutate(input)}
              />
            ) : (
              <Pressable
                onPress={() => setShowProductForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo produto
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function BelezaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>
        <BelezaContent />
      </View>
    </Screen>
  );
}
