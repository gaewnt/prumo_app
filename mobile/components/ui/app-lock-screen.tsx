import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { authenticateWithBiometrics } from "@/lib/biometric-lock";
import { useAuthStore } from "@/lib/store/auth-store";

type AppLockScreenProps = {
  onUnlock: () => void;
};

/** Mostrada quando o bloqueio por biometria está ligado (Configurações > Segurança) —
 * fica no caminho antes de qualquer tela do app até a pessoa confirmar a digital/rosto. */
export function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const { tokens } = useTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const [isChecking, setIsChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleUnlock() {
    setIsChecking(true);
    setFailed(false);
    const success = await authenticateWithBiometrics();
    setIsChecking(false);
    if (success) onUnlock();
    else setFailed(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 44 }}>🔒</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: tokens.text, textAlign: "center" }}>
          Prumo bloqueado
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted, textAlign: "center" }}>
          Confirme sua digital ou rosto pra continuar.
        </Text>
        {failed ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger, textAlign: "center" }}>
            Não deu pra confirmar. Tenta de novo.
          </Text>
        ) : null}
        <Pressable
          onPress={handleUnlock}
          disabled={isChecking}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 24,
            alignItems: "center",
            opacity: isChecking ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {isChecking ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
              Desbloquear
            </Text>
          )}
        </Pressable>
        <Pressable onPress={() => signOut()} hitSlop={8} style={{ marginTop: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            Não consegue confirmar? Sair da conta
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
