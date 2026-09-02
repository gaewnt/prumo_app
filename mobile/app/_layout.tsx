import "@/global.css";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Archivo_600SemiBold,
  Archivo_700Bold,
} from "@expo-google-fonts/archivo";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-provider";
import { queryClient } from "@/lib/query-client";
import { bootstrapAuthListener, useAuthStore } from "@/lib/store/auth-store";
import { IntroScreen } from "@/components/ui/intro-screen";
import { AppLockScreen } from "@/components/ui/app-lock-screen";
import { biometricLockSupported } from "@/lib/biometric-lock";
import { fetchModulePreference } from "@/lib/onboarding";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* já pode ter sido escondida em recarregamentos rápidos do Metro */
});

function RootNavigator() {
  const { scheme } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

/** Fundo neutro enquanto ainda não se sabe se o bloqueio por biometria tá ligado — evita
 * um flash em branco entre a introzinha e a tela de fato. */
function CheckingScreen() {
  const { tokens } = useTheme();
  return <View style={{ flex: 1, backgroundColor: tokens.background }} />;
}

export default function RootLayout() {
  // Antes só líamos `fontsLoaded` e ignorávamos o `fontError` que
  // o hook também devolve — se QUALQUER uma das 6 fontes falhasse ao carregar (ex: 404 num
  // deploy do site que saiu incompleto, sem a pasta `assets/`), `fontsLoaded` nunca virava
  // `true` e ficava assim pra sempre, porque o hook só seta `loaded=true` no `.then()` de
  // sucesso — o `.catch()` de erro só guarda o erro, nunca "libera" o loading. Resultado:
  // `!fontsLoaded` continuava `true` pra sempre e a tela ficava em branco permanentemente
  // (exatamente o que acontecia no site publicado). Agora, se alguma fonte falhar, a
  // gente segue em frente mesmo assim — o texto só aparece com a fonte de sistema como
  // reserva em vez de travar o app inteiro por causa de UM arquivo de fonte que não carregou.
  const [fontsLoaded, fontError] = useFonts({
    Archivo_700Bold,
    Archivo_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
  });
  const fontsReady = fontsLoaded || !!fontError;
  const authLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const [showIntro, setShowIntro] = useState(true);
  // "checking" evita um flash da tela normal antes de saber se o bloqueio tá ligado.
  const [lockState, setLockState] = useState<"checking" | "locked" | "unlocked">("checking");

  useEffect(() => bootstrapAuthListener(), []);

  useEffect(() => {
    if (fontsReady && !authLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, authLoading]);

  // Checa o bloqueio por biometria (Configurações > Segurança) uma vez, quando a intro
  // termina e já se sabe se tem sessão — não reavalia se o app só volta do segundo plano
  // (isso pediria um listener de AppState, deixado de fora desta primeira versão).
  useEffect(() => {
    if (showIntro || authLoading) return;
    if (!session) {
      setLockState("unlocked");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const prefs = await fetchModulePreference("app");
        const enabled = !!prefs.biometric_lock_enabled && biometricLockSupported;
        if (!cancelled) setLockState(enabled ? "locked" : "unlocked");
      } catch {
        if (!cancelled) setLockState("unlocked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showIntro, authLoading, session?.user.id]);

  if (!fontsReady || authLoading) return null;

  return (
    <ThemeProvider>
      {showIntro ? (
        // Splash nativa já escondeu (efeito acima) — agora mostra a introzinha animada antes
        // de entrar no app de fato. Some sozinha e chama `onFinish`.
        <IntroScreen onFinish={() => setShowIntro(false)} />
      ) : lockState === "checking" ? (
        <CheckingScreen />
      ) : lockState === "locked" ? (
        <AppLockScreen onUnlock={() => setLockState("unlocked")} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      )}
    </ThemeProvider>
  );
}
