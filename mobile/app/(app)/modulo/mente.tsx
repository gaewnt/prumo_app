import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { SessionLogger } from "@/components/mente/session-logger";
import { SessionHistoryRow } from "@/components/mente/session-history-row";
import { TechniqueCard } from "@/components/mente/technique-card";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchMente,
  fetchMenteLogsForMonth,
  logMindfulnessSession,
  updateMindfulnessSession,
  undoLastMindfulnessSession,
  computeMinutesLast7Days,
  computeWeeklyMinutesByDay,
  computeKindBreakdown,
  computeDayMinutes,
  computeMindfulnessStreak,
  streakMilestone,
  QUICK_TECHNIQUES,
  type SessionKind,
} from "@/lib/mente";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

/** Conteúdo de Mente — usado tanto na rota própria quanto como aba dentro do hub Desenvolvimento Pessoal. */
export function MenteContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: ["mente", userId],
    queryFn: fetchMente,
    enabled: !!userId,
  });
  const sessions = query.data?.sessions ?? [];

  // Histórico de meses anteriores — mesmo padrão da Rotina: o mês atual
  // reaproveita `sessions` (já vem na busca de sempre), só busca de novo ao navegar pra outro mês.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentHistoryMonth =
    historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();
  const historySessionsQuery = useQuery({
    queryKey: ["mente", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchMenteLogsForMonth(historyMonth),
    enabled: !!userId && !isCurrentHistoryMonth,
  });
  const heatmapSessions = isCurrentHistoryMonth ? sessions : historySessionsQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["mente", userId] });
  }

  function colorFor(key: "chart1" | "chart2" | "chart3" | "chart4") {
    return tokens[key];
  }

  const minutesLast7Days = computeMinutesLast7Days(sessions);
  const weeklyMinutes = computeWeeklyMinutesByDay(sessions);
  const kindBreakdown = computeKindBreakdown(sessions, colorFor);
  const streak = computeMindfulnessStreak(sessions);
  const milestone = streakMilestone(streak);
  const lastSession = sessions[sessions.length - 1];

  const logSessionMutation = useMutation({
    mutationFn: ({ kind, minutes }: { kind: SessionKind; minutes: number }) => logMindfulnessSession(userId!, kind, minutes),
    onSuccess: invalidate,
  });
  const undoSessionMutation = useMutation({
    mutationFn: (id: string) => undoLastMindfulnessSession(id),
    onSuccess: invalidate,
  });
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, kind, minutes }: { id: string; kind: SessionKind; minutes: number }) =>
      updateMindfulnessSession(id, kind, minutes),
    onSuccess: invalidate,
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>🧠</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Mente</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Mindfulness, meditação e respiração.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar seus dados de Mente agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 12 }}>
            <StatCard label="Praticado nos últimos 7 dias" value={formatMinutes(minutesLast7Days)}>
              <WeeklyBarChart data={weeklyMinutes} highlightIndex={6} />
            </StatCard>

            {streak > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.warning }}>
                  🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"} praticando
                </Text>
                {milestone ? (
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.success }}>
                    · 🏅 marco de {milestone} dias
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
              <MonthHeatmap
                monthDate={historyMonth}
                showMonthLabel={false}
                getCellColor={(dateStr) => {
                  const minutes = computeDayMinutes(dateStr, heatmapSessions);
                  return minutes > 0 ? tokens.accent : null;
                }}
              />
            </View>

            {kindBreakdown.length > 0 ? (
              <View
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  gap: 12,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Tempo por tipo de prática
                </Text>
                <CategoryDonut items={kindBreakdown} />
              </View>
            ) : null}
          </View>

          <SessionLogger
            onLog={(kind, minutes) => logSessionMutation.mutate({ kind, minutes })}
            isLogging={logSessionMutation.isPending}
            onUndo={() => lastSession && undoSessionMutation.mutate(lastSession.id)}
            isUndoing={undoSessionMutation.isPending}
            hasSessionToUndo={!!lastSession}
            lastSession={lastSession ?? null}
            onUpdateLast={(kind, minutes) =>
              lastSession && updateSessionMutation.mutate({ id: lastSession.id, kind, minutes })
            }
            isUpdatingLast={updateSessionMutation.isPending}
          />

          {/* Antes só a última sessão registrada dava pra corrigir;
              qualquer sessão mais antiga do mês selecionado ficava só como número agregado
              no calendário, sem poder ser vista/editada/excluída individualmente. */}
          {heatmapSessions.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                Sessões do mês
              </Text>
              <View style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 }}>
                {[...heatmapSessions]
                  .sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0))
                  .map((session, index) => (
                    <View
                      key={session.id}
                      style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: tokens.border }}
                    >
                      <SessionHistoryRow
                        session={session}
                        onUpdate={(kind, minutes) => updateSessionMutation.mutate({ id: session.id, kind, minutes })}
                        isSaving={updateSessionMutation.isPending && updateSessionMutation.variables?.id === session.id}
                        onDelete={() => undoSessionMutation.mutate(session.id)}
                        isDeleting={undoSessionMutation.isPending && undoSessionMutation.variables === session.id}
                      />
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Técnicas rápidas
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              Um cheat sheet fixo — sem IA, sem personalização, só uma referência rápida pra momentos difíceis.
            </Text>
            {QUICK_TECHNIQUES.map((technique) => (
              <TechniqueCard key={technique.title} technique={technique} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function MenteScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>
        <MenteContent />
      </View>
    </Screen>
  );
}
