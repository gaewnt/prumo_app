import React from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { modules } from "@/lib/modules";

/**
 * Navegação lateral fixa pra telas largas (web/desktop) — substitui a lista de
 * módulos + botões flutuantes como forma principal de navegar. No mobile essa
 * sidebar não é usada; ver `app/(app)/_layout.tsx`, que escolhe entre os dois
 * layouts pela largura da janela.
 */
export function DesktopSidebar({ visibleSlugs }: { visibleSlugs: Set<string> }) {
  const { tokens } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const items = modules.filter((m) => visibleSlugs.has(m.slug));

  const secondary = [
    { slug: "notificacoes", nome: "Notificações", icone: "🔔", href: "/notificacoes" },
    { slug: "configuracoes", nome: "Configurações", icone: "⚙️", href: "/configuracoes" },
    { slug: "mais-opcoes", nome: "Mais opções", icone: "⋯", href: "/mais-opcoes" },
  ];

  return (
    <View
      style={{
        width: 248,
        borderRightWidth: 1,
        borderRightColor: tokens.border,
        backgroundColor: tokens.surface,
        paddingVertical: 24,
        paddingHorizontal: 16,
        gap: 24,
      }}
    >
      <Pressable onPress={() => router.push("/")} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8 }}>
        <LinearGradient
          colors={[tokens.gradientStart, tokens.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 30, height: 30, borderRadius: 9 }}
        />
        <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: tokens.text }}>Prumo</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ gap: 2 }}>
          {items.map((module) => {
            const href = `/modulo/${module.slug}`;
            const active = pathname === href;
            return (
              <Pressable
                key={module.slug}
                onPress={() => router.push(href as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: active ? tokens.accentMuted : "transparent",
                }}
              >
                <Text style={{ fontSize: 16 }}>{module.icone}</Text>
                <Text
                  style={{
                    fontFamily: active ? fontFamily.bodySemibold : fontFamily.body,
                    fontSize: 14,
                    color: active ? tokens.accent : tokens.text,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {module.nome}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 12 }}>
        {secondary.map((item) => {
          const active = pathname === item.href;
          return (
            <Pressable
              key={item.slug}
              onPress={() => router.push(item.href as any)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 9,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: active ? tokens.surfaceAlt : "transparent",
              }}
            >
              <Text style={{ fontSize: 15 }}>{item.icone}</Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text }}>{item.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
