import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ModuleListItem } from "@/components/ui/module-list-item";
import { AppHeader } from "@/components/ui/app-header";
import { AdBanner } from "@/components/ui/ad-banner";
import { HomeWaterWidget } from "@/components/dieta/home-water-widget";
import { TodayView } from "@/components/home/today-view";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { modules } from "@/lib/modules";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchOnboardingProfile, fetchAllModulePreferences } from "@/lib/onboarding";
import { fetchPlan } from "@/lib/subscription";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomeScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
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

  // Plano Grátis/Plus — ver `lib/subscription.ts`. Enquanto carrega, trata como "plus"
  // (não free) só pra não piscar banner de anúncio pra quem já é Plus; módulo trancado
  // continua trancado até a busca confirmar o plano de qualquer forma (o próprio clique
  // manda pra vitrine do Plus, então não há risco de deixar passar).
  const planQuery = useQuery({
    queryKey: ["subscription-plan", session?.user.id],
    queryFn: fetchPlan,
    enabled: !!session?.user.id,
  });
  const isFreePlan = planQuery.data === "free";

  // Dieta não é mais um slug de módulo de topo desde o redesign em hubs:
  // ela só existe como sub-aba dentro do hub "dev-pessoal" (ver `hubOf` em
  // `lib/modules.ts`). `visibleModules.some(m => m.slug === "dieta")` nunca vai ser
  // verdadeiro, porque nenhum item de `modules` tem esse slug — por isso o card de água
  // nunca aparecia na home, mesmo com Dieta ativa. O que precisa ser checado é se o HUB
  // que contém "dieta" está visível (esconder módulo só acontece no nível do hub inteiro,
  // não por aba interna — ver `configuracoes.tsx`).
  const dietaHubModule = modules.find((m) => m.hubOf?.includes("dieta"));
  const dietaVisible = !!dietaHubModule && !hiddenSlugs.has(dietaHubModule.slug);

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

  // Aceite dos Termos de Uso / Política de Privacidade vem antes do onboarding —
  // é a primeira coisa que qualquer conta nova (ou reaceite de versão nova) precisa confirmar.
  if (!onboardingQuery.data?.legal_accepted_at) {
    return <Redirect href="/aceite-termos" />;
  }

  if (!onboardingQuery.data?.onboarding_completed_at) {
    return <Redirect href="/onboarding" />;
  }

  const displayName = onboardingQuery.data?.display_name || firstName || "Prumo";

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: 24 }}>
          <AppHeader
            name={displayName}
            avatarUrl={onboardingQuery.data?.avatar_url}
            greeting={getGreeting()}
            onPressAvatar={() => router.push("/perfil")}
            onPressMic={() => router.push("/lancar-por-voz")}
            onPressNotifications={() => router.push("/notificacoes")}
            onPressSettings={() => router.push("/configuracoes")}
          />

          {/* Visão Hoje: junta o que vence/está programado pra hoje em todos os módulos
              ativos, num lugar só — ver `components/home/today-view.tsx`. */}
          <TodayView hiddenSlugs={hiddenSlugs} />

          {/* Água na Home, de fácil acesso, sincronizada com Dieta
              (mesmo cache/mesma fonte — ver `HomeWaterWidget`). Só aparece se o módulo
              Dieta estiver ativo. */}
          {dietaVisible ? <HomeWaterWidget /> : null}

          <View style={{ gap: 12 }}>
            {visibleModules.length === 0 ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum módulo ativo — reative algum em Configurações › Módulos.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {visibleModules.map((module) => (
                  <ModuleListItem
                    key={module.slug}
                    module={module}
                    locked={!!module.plusOnly && isFreePlan}
                  />
                ))}
              </View>
            )}
          </View>

          {isFreePlan ? <AdBanner /> : null}
        </View>
      </Screen>
    </View>
  );
}
