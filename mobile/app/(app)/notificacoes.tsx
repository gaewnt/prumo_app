import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchRecentEvents, describeEvent } from "@/lib/notificacoes";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export default function NotificacoesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);

  const eventsQuery = useQuery({
    queryKey: ["notificacoes", userId],
    queryFn: () => fetchRecentEvents(),
    enabled: !!userId,
  });
  const events = eventsQuery.data ?? [];

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🔔</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Notificações</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
            O que aconteceu recentemente nos seus módulos.
          </Text>
        </View>

        {eventsQuery.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : events.length === 0 ? (
          <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 14, padding: 16, gap: 4 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
              Nada por aqui ainda
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Conquistas e marcos dos seus módulos vão aparecer aqui.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {events.map((event) => (
              <View
                key={event.id}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                    {describeEvent(event)}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    {timeAgo(event.occurred_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
