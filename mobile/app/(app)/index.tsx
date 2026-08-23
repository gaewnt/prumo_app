import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/ui/screen";
import { ModuleListItem } from "@/components/ui/module-list-item";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { modules } from "@/lib/modules";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchOnboardingProfile, fetchAllModulePreferences } from "@/lib/onboarding";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomeScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);

  // Fase 1: trocar pelo display_name vindo de `profiles`.
  const firstName = session?.user.email?.split("@")[0] ?? "";

  // Onboarding aparece uma única vez — só some depois de completado ou pulado inteiro.
  const onboardingQuery = useQuery({
    queryKey: ["onboarding-status", session?.user.id],
    queryFn: fetchOnboardingProfile,
    enabled: !!session?.user.id,
  });

  // Módulos escondidos em Configurações somem daqui — se essa busca falhar, mostra
  // todos os módulos mesmo assim (mais seguro que sumir com módulo sem motivo aparente).
  const preferencesQuery = useQuery({
    queryKey: ["module-preferences", session?.user.id],
    queryFn: fetchAllModulePreferences,
    enabled: !!session?.user.id && !!onboardingQuery.data?.onboarding_completed_at,
  });
  const hiddenSlugs = new Set((preferencesQuery.data ?? []).filter((p) => p.hidden).map((p) => p.module_slug));
  const visibleModules = modules.filter((m) => !hiddenSlugs.has(m.slug));

  if (onboardingQuery.isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </Screen>
    );
  }

  // Importante: checar erro ANTES de checar "não completou onboarding". `data` fica
  // `undefined` tanto quando a pessoa realmente não fez o onboarding quanto quando a
  // busca falhou (queda de rede, etc.) — sem essa distinção, um erro passageiro
  // mandava a pessoa de volta pro questionário como se nada tivesse sido salvo.
  if (onboardingQuery.isError) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 }}>
          <Text
            style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted, textAlign: "center" }}
          >
            Não deu pra carregar seu perfil agora.
          </Text>
          <Pressable
            onPress={() => onboardingQuery.refetch()}
            style={{
              backgroundColor: tokens.accent,
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              Tentar de novo
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!onboardingQuery.data?.onboarding_completed_at) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: 28 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
              {getGreeting()}
            </Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
              {firstName || "Prumo"}
            </Text>
            <Text
              style={{ fontFamily: fontFamily.body, fontSize: 14.5, color: tokens.textMuted, marginTop: 2 }}
            >
              Como vamos melhorar sua organização hoje?
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Módulos
            </Text>
            {visibleModules.length === 0 ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum módulo ativo — reative algum em Configurações › Módulos.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {visibleModules.map((module) => (
                  <ModuleListItem key={module.slug} module={module} />
                ))}
              </View>
            )}
          </View>
        </View>
      </Screen>

      <Pressable
        onPress={() => router.push("/configuracoes")}
        hitSlop={8}
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 20 }}>⚙️</Text>
      </Pressable>
    </View>
  );
}
