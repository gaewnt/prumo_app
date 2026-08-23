import React from "react";
import { Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { getModuleBySlug } from "@/lib/modules";

export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { tokens } = useTheme();
  const router = useRouter();
  const module = getModuleBySlug(slug ?? "");

  if (!module) {
    return (
      <Screen>
        <Text style={{ fontFamily: fontFamily.body, color: tokens.text }}>Módulo não encontrado.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>{module.icone}</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            {module.nome}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            {module.resumo}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            {module.status === "mapeado" ? "Especificado — chega na Fase 1" : "Ainda a definir — Fase 3"}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted, marginTop: 4 }}>
            {module.status === "mapeado"
              ? "As funções deste módulo já estão descritas no Prumo.md. A tela real entra na próxima fase de construção."
              : "Ainda não decidimos o que este módulo faz. Ver Prumo.md → Próximos passos."}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
