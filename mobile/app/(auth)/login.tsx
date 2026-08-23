import React, { useState } from "react";
import { Text, TextInput, Pressable, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { PasswordInput } from "@/components/ui/password-input";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const { tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // sucesso: o listener em auth-store atualiza a sessão e o layout redireciona
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 30, color: tokens.text }}>
            Prumo
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Entre pra continuar de onde parou.
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
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Senha" />
        </View>

        {error ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading || !email || !password}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: loading || !email || !password ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
              Entrar
            </Text>
          )}
        </Pressable>

        <Link href="/signup" asChild>
          <Pressable style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
              Ainda não tem conta? <Text style={{ color: tokens.accent, fontFamily: fontFamily.bodyMedium }}>Criar conta</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
