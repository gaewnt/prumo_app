import React from "react";
import { Text, View, Pressable, Switch, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { modules } from "@/lib/modules";
import { fetchAllModulePreferences, setModuleHidden, fetchModulePreference, updateModulePreferenceField } from "@/lib/onboarding";
import { biometricLockSupported, isBiometricAvailable } from "@/lib/biometric-lock";

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

function Card({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1, borderRadius: 14 }}>
      {children}
    </View>
  );
}

function CardRow({
  label,
  onPress,
  right,
  isFirst,
}: {
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  isFirst?: boolean;
}) {
  const { tokens } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: tokens.border,
      }}
    >
      <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>{label}</Text>
      {right ?? (onPress ? <Text style={{ fontSize: 18, color: tokens.textMuted }}>›</Text> : null)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

/** Todas as configurações do app, reorganizadas em 4 seções (referência: apps de finanças
 * com bastante opção, adaptado ao que o Prumo realmente tem por baixo — ver observações
 * no diário sobre "Sincronização", que aqui virou "Dados na nuvem"). */
export default function ConfiguracoesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const userId = useAuthStore((s) => s.session?.user.id);
  const userEmail = useAuthStore((s) => s.session?.user.email);
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

  // Preferências do app como um todo (não de um módulo específico) — module_preferences
  // com slug "app": bloqueio por biometria e o lembrete
  // diário de lançamento (esse aqui só mostra o status; editar mora em Editar perfil).
  const appPrefsQuery = useQuery({
    queryKey: ["app-prefs", userId],
    queryFn: () => fetchModulePreference("app"),
    enabled: !!userId,
  });
  const bloqueioAtivo = !!appPrefsQuery.data?.biometric_lock_enabled;
  const lembreteAtivo = !!appPrefsQuery.data?.lembrete_diario_id;
  const lembreteHora = (appPrefsQuery.data?.lembrete_diario_hora as string | undefined) ?? "20:00";

  const toggleBloqueioMutation = useMutation({
    mutationFn: async (ativar: boolean) => {
      if (ativar) {
        const available = await isBiometricAvailable();
        if (!available) {
          throw new Error(
            "Não achamos biometria cadastrada nesse aparelho. Cadastre uma digital ou rosto nas configurações do celular primeiro."
          );
        }
      }
      await updateModulePreferenceField(userId!, "app", { biometric_lock_enabled: ativar });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-prefs", userId] }),
  });

  function handleRefreshData() {
    queryClient.invalidateQueries();
  }

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

        {/* ============ Preferências ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Preferências</SectionLabel>
          <Card>
            <CardRow label="Editar perfil" onPress={() => router.push("/perfil")} isFirst />
            <CardRow label="Português (Brasil)" right={<Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Idioma</Text>} />
            <CardRow label="Mais opções" onPress={() => router.push("/mais-opcoes")} />
          </Card>
          <ThemeToggle />
        </View>

        {/* ============ Módulos ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Módulos</SectionLabel>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            Desative o que você não usa — some da lista principal, mas nada é apagado.
          </Text>
          <Card>
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
          </Card>
        </View>

        {/* ============ Alertas e notificações ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Alertas e notificações</SectionLabel>
          <Card>
            <CardRow
              label="Lembrete diário de lançamento"
              onPress={() => router.push("/perfil")}
              right={
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  {lembreteAtivo ? `Ativado · ${lembreteHora}` : "Desativado"}
                </Text>
              }
              isFirst
            />
          </Card>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Configurável em Editar perfil. Remédios, consultas e outros lembretes ficam
            configurados dentro de cada módulo (ex: Saúde).
          </Text>
        </View>

        {/* ============ Segurança ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Segurança</SectionLabel>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>
                  Bloqueio por biometria
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                  Pede digital ou rosto pra abrir o app.
                </Text>
                {toggleBloqueioMutation.isError ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.danger, marginTop: 4 }}>
                    {(toggleBloqueioMutation.error as Error)?.message ?? "Não deu pra ativar."}
                  </Text>
                ) : null}
                {!biometricLockSupported ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.warning, marginTop: 4 }}>
                    Só funciona no app instalado no celular — não dá pra ativar aqui (nem no
                    Expo Go, nem na versão web, que não tem sensor de biometria).
                  </Text>
                ) : null}
              </View>
              {toggleBloqueioMutation.isPending ? (
                <ActivityIndicator color={tokens.accent} />
              ) : (
                <Switch
                  value={bloqueioAtivo}
                  onValueChange={(next) => toggleBloqueioMutation.mutate(next)}
                  trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
                  disabled={!biometricLockSupported}
                />
              )}
            </View>
          </Card>
          <Card>
            <Pressable onPress={signOut} style={{ padding: 14 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.danger }}>
                Sair da conta
              </Text>
            </Pressable>
          </Card>
        </View>

        {/* ============ Sincronização ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Sincronização</SectionLabel>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            O Prumo não guarda nada só no aparelho — os dados ficam na nuvem e atualizam na
            hora em qualquer dispositivo em que você entrar.
          </Text>
          <Card>
            <CardRow
              label="Conta"
              right={
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }} numberOfLines={1}>
                  {userEmail ?? "—"}
                </Text>
              }
              isFirst
            />
            <CardRow
              label="Atualizar dados agora"
              onPress={handleRefreshData}
              right={<Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>Atualizar</Text>}
            />
          </Card>
        </View>

        {/* ============ Legal ============ */}
        <View style={{ gap: 10 }}>
          <SectionLabel>Legal</SectionLabel>
          <Card>
            <CardRow label="Termos de Uso" onPress={() => router.push("/termos")} isFirst />
            <CardRow label="Política de Privacidade" onPress={() => router.push("/privacidade")} />
          </Card>
        </View>
      </View>
    </Screen>
  );
}
