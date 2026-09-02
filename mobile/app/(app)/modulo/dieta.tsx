import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { BalanceLineChart } from "@/components/charts/balance-line-chart";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { DayTabs } from "@/components/dieta/day-tabs";
import { MealSection } from "@/components/dieta/meal-section";
import { WaterTracker } from "@/components/dieta/water-tracker";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchDieta,
  createMealItem,
  updateMealItem,
  deleteMealItem,
  clearDay,
  copyDay,
  logWater,
  updateLastWaterLog,
  undoLastWaterLog,
  computeWaterToday,
  computeWeeklyWater,
  computeDayWater,
  fetchWaterLogsForMonth,
  computeWeightEvolution,
  MEAL_TYPES,
  WEEKDAY_SHORT,
} from "@/lib/dieta";

/** Conteúdo de Dieta — usado tanto na rota própria quanto como aba dentro do hub Desenvolvimento Pessoal. */
export function DietaContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [addFormMealType, setAddFormMealType] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["dieta", userId],
    queryFn: fetchDieta,
    enabled: !!userId,
  });
  const items = query.data?.mealItems ?? [];
  const waterLogs = query.data?.waterLogs ?? [];
  const bodyLogs = query.data?.bodyLogs ?? [];
  const weightGoal = query.data?.weightGoal ?? null;
  const metaAguaMl = query.data?.metaAguaMl ?? null;
  const today = query.data?.today ?? "";
  const dayItems = items.filter((i) => i.day_of_week === selectedDay);

  function itemsFor(mealType: string) {
    return dayItems.filter((i) => i.meal_type === mealType);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["dieta", userId] });
  }

  const waterToday = computeWaterToday(waterLogs, today);
  const weeklyWater = computeWeeklyWater(waterLogs);
  const weightEvolution = computeWeightEvolution(bodyLogs, weightGoal);
  // waterLogs vem ordenado por created_at ascendente (ver fetchDieta) — o último item de
  // hoje é o registro mais recente, o mesmo que "Desfazer último" removeria.
  const todaysWaterLogs = waterLogs.filter((w) => w.log_date === today);
  const lastWaterLogAmountMl = todaysWaterLogs.length > 0 ? todaysWaterLogs[todaysWaterLogs.length - 1].amount_ml : null;

  // Histórico de meses anteriores (Tarefa #20, 01/09) — `waterLogs` só cobre os últimos 7 dias
  // (a busca de sempre da Dieta), então aqui busca sempre o mês selecionado, inclusive o atual.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const historyWaterQuery = useQuery({
    queryKey: ["dieta", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchWaterLogsForMonth(historyMonth),
    enabled: !!userId,
  });
  const heatmapWaterLogs = historyWaterQuery.data ?? [];

  const addWaterMutation = useMutation({
    mutationFn: (amountMl: number) => logWater(userId!, amountMl),
    onSuccess: invalidate,
  });

  const undoWaterMutation = useMutation({
    mutationFn: () => undoLastWaterLog(userId!),
    onSuccess: invalidate,
  });

  const updateWaterMutation = useMutation({
    mutationFn: (amountMl: number) => updateLastWaterLog(userId!, amountMl),
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: ({ mealType, description }: { mealType: string; description: string }) =>
      createMealItem(userId!, selectedDay, mealType, description, itemsFor(mealType).length),
    onSuccess: () => {
      setAddFormMealType(null);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      updateMealItem(id, description),
    onSuccess: () => {
      setEditingItemId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMealItem(id),
    onSuccess: invalidate,
  });

  const clearDayMutation = useMutation({
    mutationFn: (day: number) => clearDay(day),
    onSuccess: invalidate,
  });

  const copyDayMutation = useMutation({
    mutationFn: (fromDay: number) => copyDay(userId!, fromDay, selectedDay),
    onSuccess: () => {
      setShowCopyPicker(false);
      invalidate();
    },
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>🥗</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
          Dieta
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Cardápio da semana, refeição por refeição.
        </Text>
      </View>

      {!query.isLoading && !query.isError ? (
        <View style={{ gap: 16 }}>
          <WaterTracker
            totalMl={waterToday}
            goalMl={metaAguaMl}
            onAdd={(ml) => addWaterMutation.mutate(ml)}
            isAdding={addWaterMutation.isPending}
            onUndo={() => undoWaterMutation.mutate()}
            isUndoing={undoWaterMutation.isPending}
            hasLogsToday={waterToday > 0}
            lastLogAmountMl={lastWaterLogAmountMl}
            onUpdateLast={(amountMl) => updateWaterMutation.mutate(amountMl)}
            isUpdatingLast={updateWaterMutation.isPending}
          />

          <StatCard label="Água — últimos 7 dias" value={`${weeklyWater.reduce((s, d) => s + d.value, 0)}ml`}>
            <WeeklyBarChart data={weeklyWater} highlightIndex={6} />
          </StatCard>

          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
              Histórico de água
            </Text>
            <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
            <MonthHeatmap
              monthDate={historyMonth}
              showMonthLabel={false}
              getCellColor={(dateStr) => {
                const ml = computeDayWater(dateStr, heatmapWaterLogs);
                if (ml <= 0) return null;
                if (metaAguaMl && ml >= metaAguaMl) return tokens.accent;
                return tokens.accentMuted;
              }}
            />
          </View>

          {weightEvolution ? (
            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 14,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Evolução de peso
              </Text>
              <BalanceLineChart points={weightEvolution.series} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {[
                  { label: "Atual", value: `${weightEvolution.atualKg} kg` },
                  {
                    label: "Objetivo",
                    value: weightEvolution.objetivoKg !== null ? `${weightEvolution.objetivoKg} kg` : "—",
                  },
                  {
                    label: "Distância",
                    value:
                      weightEvolution.distanciaKg !== null
                        ? `${Math.abs(weightEvolution.distanciaKg)} kg`
                        : "—",
                  },
                  {
                    label: "Variação total",
                    value: `${weightEvolution.variacaoTotalKg > 0 ? "+" : ""}${weightEvolution.variacaoTotalKg} kg`,
                  },
                  { label: "Maior", value: `${weightEvolution.maiorKg} kg` },
                  { label: "Menor", value: `${weightEvolution.menorKg} kg` },
                ].map((stat) => (
                  <View key={stat.label} style={{ width: "30%", gap: 2 }}>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.textMuted }}>
                      {stat.label}
                    </Text>
                    <Text style={{ fontFamily: fontFamily.mono, fontSize: 14.5, color: tokens.text }}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              Registre seu peso no check-in do módulo Treino pra ver sua evolução aqui.
            </Text>
          )}
        </View>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar seu cardápio agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          <DayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} />

          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable onPress={() => setShowCopyPicker((v) => !v)} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                {showCopyPicker ? "Cancelar" : "Copiar de outro dia"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => clearDayMutation.mutate(selectedDay)}
              disabled={dayItems.length === 0 || clearDayMutation.isPending}
              hitSlop={8}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: tokens.textMuted,
                  opacity: dayItems.length === 0 ? 0.5 : 1,
                }}
              >
                Limpar dia
              </Text>
            </Pressable>
          </View>

          {showCopyPicker ? (
            <View
              style={{
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Copiar o cardápio de qual dia pra {WEEKDAY_SHORT[selectedDay]}? Isso substitui o que já
                estiver em {WEEKDAY_SHORT[selectedDay]}.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {WEEKDAY_SHORT.map((label, day) =>
                  day === selectedDay ? null : (
                    <Pressable
                      key={day}
                      onPress={() => copyDayMutation.mutate(day)}
                      disabled={copyDayMutation.isPending}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
              {copyDayMutation.isPending ? <ActivityIndicator color={tokens.accent} /> : null}
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            {MEAL_TYPES.map((meal) => (
              <MealSection
                key={meal.value}
                label={meal.label}
                items={itemsFor(meal.value)}
                showAddForm={addFormMealType === meal.value}
                onToggleAddForm={() =>
                  setAddFormMealType((current) => (current === meal.value ? null : meal.value))
                }
                isAdding={createMutation.isPending}
                onAddItem={(description) => createMutation.mutate({ mealType: meal.value, description })}
                editingItemId={editingItemId}
                onStartEdit={(id) => setEditingItemId(id)}
                onCancelEdit={() => setEditingItemId(null)}
                onUpdateItem={(id, description) => updateMutation.mutate({ id, description })}
                isSavingEdit={updateMutation.isPending}
                onDeleteItem={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function DietaScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>
        <DietaContent />
      </View>
    </Screen>
  );
}
