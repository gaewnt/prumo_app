import React, { useEffect, useState } from "react";
import { Text, TextInput, Pressable, View, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { getVerifiedTotpFactor, verifyLoginCode } from "@/lib/mfa";

/** Segunda etapa do login — a própria tela de login (`app/(auth)/login.tsx`) mostra isso
 * em vez do formulário de senha quando a conta tem verificação em duas etapas ativa
 * (`useAuthStore().mfaPending`, ver `lib/mfa.ts`). Pede o código de 6 dígitos do app
 * autenticador antes de liberar a navegação pro resto do app. */
export function TotpChallengeForm() {
  const { tokens } = useTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerifiedTotpFactor()
      .then((factor) => {
        if (cancelled) return;
        if (!factor) {
          // Estado inesperado (fator removido entre o login e essa checagem) — sem fator
          // não tem o que verificar; desloga pra ela tentar de novo do zero.
          signOut();
          return;
        }
        setFactorId(factor.id);
      })
      .catch(() => {
        if (!cancelled) setError("Não deu pra carregar a verificação. Tenta de novo em instantes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify() {
    if (!factorId || code.trim().length !== 6) return;
    setError(null);
    setVerifying(true);
    try {
      await verifyLoginCode(factorId, code.trim());
      // sucesso: a sessão sobe pra aal2 sozinha — o listener em auth-store.ts percebe e
      // libera a navegação, não precisa fazer mais nada aqui.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido. Confira e tenta de novo.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
          Verificação em duas etapas
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Abra seu app autenticador e digite o código de 6 dígitos gerado pra sua conta Prumo.
        </Text>
      </View>

      <TextInput
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        placeholderTextColor={tokens.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 28,
          letterSpacing: 8,
          textAlign: "center",
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingVertical: 14,
        }}
      />

      {error ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={handleVerify}
        disabled={verifying || code.length !== 6}
        style={{
          backgroundColor: tokens.accent,
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: "center",
          opacity: verifying || code.length !== 6 ? 0.6 : 1,
        }}
      >
        {verifying ? (
          <ActivityIndicator color={tokens.accentText} />
        ) : (
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
            Confirmar
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => signOut()} style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
          Usar outra conta
        </Text>
      </Pressable>
    </View>
  );
}
