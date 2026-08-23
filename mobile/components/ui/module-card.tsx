import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { ModuleDefinition } from "@/lib/modules";

export function ModuleCard({ module }: { module: ModuleDefinition }) {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/modulo/${module.slug}`)}
      style={({ pressed }) => ({
        flexBasis: "47%",
        flexGrow: 1,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: tokens.accentMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{module.icone}</Text>
      </View>
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
        {module.nome}
      </Text>
      {module.status === "a-definir" ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Em definição
        </Text>
      ) : null}
    </Pressable>
  );
}
