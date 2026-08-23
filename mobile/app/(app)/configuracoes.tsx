import React from "react";
import { Text, View, Pressable, Switch } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { modules } from "@/lib/modules";
import { fetchAllModulePreferences, setModuleHidden } from "@/lib/onboarding";

function SectionLabel({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fontFamily.bodySemibold,
        fontSize: 12,
        letterSpacing: 0.4,
        color: tokens.textMuted,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

/** Todas as configurações do app — tema, idioma e conta — acessada pela engrenagem da Home. */
export default function ConfiguracoesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["module-preferences", userId],
    queryFn: fetchAllModulePreferences,
    enabled: !!userId,
  });
  const hiddenSlugs = new Set(
    (preferencesQuery.data ?? []).filter((p) => p.hidden).map((p) => p.module_slug)
  );

  const toggleModuleMutation = useMutation({
    mutationFn: ({ slug, hidden }: { slug: string; hidden: boolean }) =>
      setModuleHidden(userId!, slug, hidden),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-preferences", userId] });
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 24 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
          Configurações
        </Text>

        <View style={{ gap: 10 }}>
          <SectionLabel>Perfil</SectionLabel>
          <Pressable
            onPress={() => router.push("/perfil")}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>
              Editar perfil
            </Text>
            <Text style={{ fontSize: 18, color: tokens.textMuted }}>›</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Aparência</SectionLabel>
          <ThemeToggle />
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Módulos</SectionLabel>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            Desative o que você não usa — some da lista principal, mas nada é apagado.
          </Text>
          <View style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1, borderRadius: 14 }}>
            {modules.map((module, index) => {
              const visible = !hiddenSlugs.has(module.slug);
              return (
                <View
                  key={module.slug}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: tokens.border,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{module.icone}</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fontFamily.body,
                      fontSize: 14,
                      color: visible ? tokens.text : tokens.textMuted,
                    }}
                  >
                    {module.nome}
                  </Text>
                  <Switch
                    value={visible}
                    onValueChange={(next) => toggleModuleMutation.mutate({ slug: module.slug, hidden: !next })}
                    trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Idioma</SectionLabel>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>
              Português (Brasil)
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Único por enquanto
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Conta</SectionLabel>
          <Pressable
            onPress={signOut}
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.danger }}>
              Sair da conta
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
