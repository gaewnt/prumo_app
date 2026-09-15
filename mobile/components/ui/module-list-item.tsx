import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { ModuleDefinition } from "@/lib/modules";

/** Linha de módulo em formato de lista (ícone + nome + resumo + seta) — substitui o grid antigo.
 * `locked` (módulo `plusOnly` com plano grátis) manda pra vitrine do Plus em vez do módulo. */
export function ModuleListItem({ module, locked = false }: { module: ModuleDefinition; locked?: boolean }) {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(locked ? "/prumo-plus" : `/modulo/${module.slug}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        opacity: pressed ? 0.7 : locked ? 0.75 : 1,
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {module.nome}
          </Text>
          {locked ? (
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 10,
                color: tokens.accent,
                backgroundColor: tokens.accentMuted,
                paddingHorizontal: 7,
                paddingVertical: 1,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              PLUS
            </Text>
          ) : null}
        </View>
        <Text
          style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}
          numberOfLines={1}
        >
          {module.resumo}
        </Text>
      </View>

      <Text style={{ fontSize: 20, color: tokens.textMuted }}>{locked ? "🔒" : "›"}</Text>
    </Pressable>
  );
}
