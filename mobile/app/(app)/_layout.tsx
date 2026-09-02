import React from "react";
import { View, useWindowDimensions, Platform } from "react-native";
import { Redirect, Slot, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTheme } from "@/lib/theme/theme-provider";
import { modules } from "@/lib/modules";
import { fetchAllModulePreferences } from "@/lib/onboarding";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";

/** A partir daqui a tela deixa de ser "celular esticado" — vira sidebar + conteúdo. */
const DESKTOP_BREAKPOINT = 900;

/** Área autenticada: qualquer rota aqui dentro exige sessão ativa. */
export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  const preferencesQuery = useQuery({
    queryKey: ["module-preferences", session?.user.id],
    queryFn: fetchAllModulePreferences,
    enabled: !!session?.user.id && isDesktop,
  });

  if (!session) return <Redirect href="/login" />;

  if (isDesktop) {
    const hiddenSlugs = new Set((preferencesQuery.data ?? []).filter((p) => p.hidden).map((p) => p.module_slug));
    const visibleSlugs = new Set(modules.filter((m) => !hiddenSlugs.has(m.slug)).map((m) => m.slug));

    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: tokens.background }}>
        <DesktopSidebar visibleSlugs={visibleSlugs} />
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
