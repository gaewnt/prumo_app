import React from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { TERMS_OF_USE, LEGAL_LAST_UPDATED } from "@/lib/legal-content";

export default function TermosScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: tokens.text }}>Termos de Uso</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Última atualização: {LEGAL_LAST_UPDATED}
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          {TERMS_OF_USE.map((section) => (
            <View key={section.title} style={{ gap: 6 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                {section.title}
              </Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted, lineHeight: 21 }}>
                {section.body}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
