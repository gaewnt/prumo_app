import React, { useEffect } from "react";
import { View, useWindowDimensions, Platform } from "react-native";
import { Redirect, Slot, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionRouting, type RouterAction } from "expo-quick-actions/router";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTheme } from "@/lib/theme/theme-provider";
import { modules } from "@/lib/modules";
import { fetchAllModulePreferences } from "@/lib/onboarding";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";

/** Atalhos de app (long-press no ícone, Android/iOS) — sem ícone customizado de propósito
 * (o plugin de config só é preciso pra isso; sem ele cai no ícone padrão do app, que já
 * é a recomendação do próprio guia da lib pra não destoar dos atalhos nativos do sistema). */
const APP_SHORTCUTS: RouterAction[] = [
  { id: "lancar-por-voz", title: "Lançar por voz", icon: "compose", params: { href: "/lancar-por-voz" } },
  { id: "financas", title: "Finanças", icon: "add", params: { href: "/modulo/financas" } },
  { id: "rotina", title: "Rotina", icon: "task", params: { href: "/modulo/rotina" } },
];

/** A partir daqui a tela deixa de ser "celular esticado" — vira sidebar + conteúdo. */
const DESKTOP_BREAKPOINT = 900;

/** Área autenticada: qualquer rota aqui dentro exige sessão ativa. */
export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  // Sessão existe mas ainda falta confirmar o código da verificação em duas etapas (ver
  // `lib/mfa.ts`) — conta como "não autenticado" pra fins de navegação; a tela de login é
  // quem mostra a etapa de código, então volta pra lá em vez de deixar entrar.
  const mfaPending = useAuthStore((s) => s.mfaPending);
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  const preferencesQuery = useQuery({
    queryKey: ["module-preferences", session?.user.id],
    queryFn: fetchAllModulePreferences,
    enabled: !!session?.user.id && isDesktop,
  });

  // Atalhos de app (tela inicial, long-press no ícone) — precisa ficar num layout "filho"
  // (esse aqui, não o `app/_layout.tsx` raiz) porque o hook já dispara navegação sozinho.
  // Sem efeito na web (o pacote tem um fallback que não faz nada nesse ambiente).
  useQuickActionRouting();
  useEffect(() => {
    if (!session) return;
    QuickActions.setItems<RouterAction>(APP_SHORTCUTS).catch(() => {
      // sem suporte no aparelho/ambiente — segue sem atalho, não trava o app.
    });
  }, [session]);

  if (!session || mfaPending) return <Redirect href="/login" />;

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
