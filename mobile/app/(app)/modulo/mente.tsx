import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { SessionLogger } from "@/components/mente/session-logger";
import { TechniqueCard } from "@/components/mente/technique-card";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchMente,
  logMindfulnessSession,
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

export default function MenteScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: ["mente", userId],
    queryFn: fetchMente,
    enabled: !!userId,
  });
  const sessions = query.data?.sessions ?? [];

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

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

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

              {sessions.length > 0 ? (
                <MonthHeatmap
                  monthDate={new Date()}
                  getCellColor={(dateStr) => {
                    const minutes = computeDayMinutes(dateStr, sessions);
                    return minutes > 0 ? tokens.accent : null;
                  }}
                />
              ) : null}

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
            />

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
    </Screen>
  );
}
