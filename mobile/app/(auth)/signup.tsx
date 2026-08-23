import React, { useState } from "react";
import { Text, TextInput, Pressable, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { PasswordInput } from "@/components/ui/password-input";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const { tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Se a confirmação de e-mail estiver ligada no projeto Supabase, ainda
    // não existe sessão aqui — avisamos a pessoa em vez de parecer travado.
    if (!data.session) setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: tokens.text }}>
            Confirma seu e-mail
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Mandamos um link de confirmação pra {email}. Depois de confirmar, volte e entre normalmente.
          </Text>
          <Link href="/login" asChild>
            <Pressable style={{ paddingVertical: 12 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 15, color: tokens.accent }}>
                Voltar pro login
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 30, color: tokens.text }}>
            Criar conta
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Leva menos de um minuto.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              fontFamily: fontFamily.body,
              fontSize: 15,
              color: tokens.text,
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha (mínimo 6 caracteres)"
          />
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSignup}
          disabled={loading || !email || password.length < 6}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: loading || !email || password.length < 6 ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
              Criar conta
            </Text>
          )}
        </Pressable>

        <Link href="/login" asChild>
          <Pressable style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
              Já tem conta? <Text style={{ color: tokens.accent, fontFamily: fontFamily.bodyMedium }}>Entrar</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
