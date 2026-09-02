import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { acceptLegalTerms } from "@/lib/onboarding";

/** Portão de aceite: ninguém passa daqui sem marcar que leu Termos + Privacidade. */
export default function AceiteTermosScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [checked, setChecked] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => acceptLegalTerms(userId!),
    onSuccess: () => {
      // Bug corrigido: só invalidar a query não bastava — como chegamos aqui via
      // `<Redirect href="/aceite-termos" />` (não um `push`), a Home nem está montada
      // pra reagir ao refetch, então a tela ficava parada aqui pra sempre depois do
      // aceite (só saía fechando e reabrindo o app). `removeQueries` (não só invalidate,
      // mesmo padrão usado no fluxo de onboarding) garante um fetch fresco, e o
      // `router.replace` de fato leva de volta pra Home, que aí sim reavalia os
      // redirects (legal → onboarding → app) com o dado atualizado.
      queryClient.removeQueries({ queryKey: ["onboarding-status", userId] });
      router.replace("/");
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: "center", gap: 28 }}>
        <View style={{ gap: 6, alignItems: "center" }}>
          <Text style={{ fontSize: 36 }}>📜</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: tokens.text, textAlign: "center" }}>
            Antes de começar
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.body,
              fontSize: 14.5,
              color: tokens.textMuted,
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            Dá uma lida rápida em como o Prumo cuida dos seus dados antes de continuar.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => router.push("/termos")}
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14.5, color: tokens.text }}>
              📄 Termos de Uso
            </Text>
            <Text style={{ fontSize: 18, color: tokens.textMuted }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/privacidade")}
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14.5, color: tokens.text }}>
              🔒 Política de Privacidade
            </Text>
            <Text style={{ fontSize: 18, color: tokens.textMuted }}>›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setChecked((v) => !v)}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 4 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: checked ? tokens.accent : tokens.border,
              backgroundColor: checked ? tokens.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {checked ? <Text style={{ fontSize: 13, color: tokens.accentText }}>✓</Text> : null}
          </View>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text, flex: 1, lineHeight: 20 }}>
            Li e concordo com os Termos de Uso e a Política de Privacidade do Prumo.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => acceptMutation.mutate()}
          disabled={!checked || acceptMutation.isPending}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: "center",
            opacity: !checked || acceptMutation.isPending ? 0.5 : 1,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
            Continuar
          </Text>
        </Pressable>

        {acceptMutation.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger, textAlign: "center" }}>
            Não deu pra salvar o aceite agora. Tente de novo.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
