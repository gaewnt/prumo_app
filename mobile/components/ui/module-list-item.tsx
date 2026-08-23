import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { ModuleDefinition } from "@/lib/modules";

/** Linha de módulo em formato de lista (ícone + nome + resumo + seta) — substitui o grid antigo. */
export function ModuleListItem({ module }: { module: ModuleDefinition }) {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/modulo/${module.slug}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: tokens.accentMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 20 }}>{module.icone}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
          {module.nome}
        </Text>
        <Text
          style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}
          numberOfLines={1}
        >
          {module.resumo}
        </Text>
      </View>

      <Text style={{ fontSize: 20, color: tokens.textMuted }}>›</Text>
    </Pressable>
  );
}
