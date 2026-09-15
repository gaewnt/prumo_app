import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, Switch, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { OptionPill } from "@/components/onboarding/option-pill";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { supabase } from "@/lib/supabase";
import {
  fetchOnboardingProfile,
  updateOnboardingProfile,
  fetchModulePreference,
  updateModulePreferenceField,
  type Gender,
} from "@/lib/onboarding";
import { fetchLatestBodyLog, logBodyWeight } from "@/lib/treino";
import { cancelReminder, notificationsSupported } from "@/lib/notifications";
import { scheduleAllWellnessReminders, cancelAllWellnessReminders } from "@/lib/wellness-reminders";
import { subscribeWebPush, unsubscribeWebPush, webPushSupported } from "@/lib/web-push";

function SectionLabel({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, letterSpacing: 0.4, color: tokens.textMuted }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

/** Editar perfil — os mesmos dados coletados no onboarding, revisáveis a qualquer hora. */
export default function PerfilScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: ["perfil", userId],
    queryFn: async () => {
      const [profile, latestWeight] = await Promise.all([fetchOnboardingProfile(), fetchLatestBodyLog()]);
      return { profile, latestWeight };
    },
    enabled: !!userId,
  });

  // Lembrete diário de lançamento — antes só existia dentro de
  // Finanças (Configurações), avisando só de "lançar despesas e receitas". Virou
  // uma opção geral no Perfil, pra lembrar de registrar o dia de um jeito genérico
  // (qualquer módulo), não só Finanças. Guardado em `module_preferences` com slug "app"
  // (mesmo lugar do bloqueio por biometria — preferência do app como um todo).
  const appPrefsQuery = useQuery({
    queryKey: ["app-prefs", userId],
    queryFn: () => fetchModulePreference("app"),
    enabled: !!userId,
  });
  const lembreteId = appPrefsQuery.data?.lembrete_diario_id as string | null | undefined;
  // Só usado no caminho web (Web Push, horário único fixo) — no nativo virou vários
  // horários por categoria, ver `lib/wellness-reminders.ts`.
  const lembreteHora = (appPrefsQuery.data?.lembrete_diario_hora as string | undefined) ?? "20:00";
  const lembreteIds = (appPrefsQuery.data?.lembrete_diario_ids as string[] | undefined) ?? [];
  const lembreteAtivo = !!lembreteId;

  // Migração de uma vez — se a pessoa já tinha ativado o lembrete antigo (só em
  // Finanças), traz pra cá e desativa lá, pra não ficar um alarme órfão sem controle na
  // tela nova. Só roda quando os dois já carregaram e a versão nova ainda não tem nada
  // salvo (evita rodar de novo toda vez que a tela abre).
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current || !userId || !appPrefsQuery.data) return;
    if (appPrefsQuery.data.lembrete_diario_id) return; // já migrado ou já configurado na versão nova
    migratedRef.current = true;
    (async () => {
      const legacy = await fetchModulePreference("financas");
      const legacyId = legacy.lembrete_diario_id as string | null | undefined;
      const legacyHora = legacy.lembrete_diario_hora as string | undefined;
      if (!legacyId) return;
      await updateModulePreferenceField(userId, "app", {
        lembrete_diario_id: legacyId,
        lembrete_diario_hora: legacyHora ?? "20:00",
      });
      await updateModulePreferenceField(userId, "financas", { lembrete_diario_id: null });
      queryClient.invalidateQueries({ queryKey: ["app-prefs", userId] });
    })();
  }, [appPrefsQuery.data, userId, queryClient]);

  // `expo-notifications` não funciona na web de jeito
  // nenhum, então na versão site o caminho é outro: Web Push de verdade (inscrição do
  // navegador salva em `push_subscriptions`, disparada por um agendador do lado do
  // servidor — ver `lib/web-push.ts` e `supabase/functions/send-web-push`). O
  // `lembrete_diario_id` guardado nesse caso é só um marcador fixo ("web-push"), já que
  // não existe um id de notificação nativo pra cancelar depois — quem controla se está
  // ativo é a linha em `push_subscriptions`.
  const reminderSupported = Platform.OS === "web" ? webPushSupported : notificationsSupported;

  const toggleLembreteMutation = useMutation({
    mutationFn: async (ativar: boolean) => {
      if (Platform.OS === "web") {
        if (ativar) {
          const result = await subscribeWebPush(userId!);
          if (!result.ok) {
            const messages: Record<typeof result.reason, string> = {
              unsupported: "Seu navegador não suporta notificações push.",
              denied:
                "Permissão de notificação negada. Pra ativar, mude isso nas configurações do site no navegador (ícone de cadeado/sino na barra de endereço) e tente de novo.",
              timeout:
                "Não recebemos resposta ao pedido de permissão. Olhe se apareceu um aviso perto da barra de endereço (às vezes é só um ícone, não um popup) e tente de novo.",
              error:
                "Não deu pra ativar. Verifique se você permitiu notificações pra este site nas configurações do navegador.",
            };
            throw new Error(messages[result.reason]);
          }
          await updateModulePreferenceField(userId!, "app", {
            lembrete_diario_id: "web-push",
            lembrete_diario_hora: lembreteHora,
          });
        } else {
          await unsubscribeWebPush();
          await updateModulePreferenceField(userId!, "app", { lembrete_diario_id: null });
        }
        return;
      }
      if (ativar) {
        // Vários horários por categoria (registrar/água/dentes) em vez de um único horário
        // fixo — ver `lib/wellness-reminders.ts` pros detalhes de cada um.
        const ids = await scheduleAllWellnessReminders();
        await updateModulePreferenceField(userId!, "app", {
          lembrete_diario_id: ids[0] ?? "multi",
          lembrete_diario_ids: ids,
        });
      } else {
        // Cancela tanto os ids novos (array) quanto um eventual id único antigo (de antes
        // dessa mudança, ou migrado do lembrete legado de Finanças).
        await cancelReminder(lembreteId);
        await cancelAllWellnessReminders(lembreteIds);
        await updateModulePreferenceField(userId!, "app", {
          lembrete_diario_id: null,
          lembrete_diario_ids: [],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-prefs", userId] });
    },
  });

  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightText, setHeightText] = useState("");
  const [weightText, setWeightText] = useState("");
  // Como você quer ser chamada — antes o app só usava o início do
  // e-mail como nome, sem nenhum jeito de personalizar. `display_name`/`updateDisplayName`
  // já existiam no schema desde o onboarding original, mas nunca tinham UI nenhuma ligada.
  const [displayNameText, setDisplayNameText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const birthMonthRef = useRef<TextInput>(null);
  const birthYearRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!query.data || hydrated) return;
    const { profile, latestWeight } = query.data;
    setGender(profile.gender);
    if (profile.birth_date) {
      const [y, m, d] = profile.birth_date.split("-");
      setBirthYear(y);
      setBirthMonth(m);
      setBirthDay(d);
    }
    if (profile.height_cm) setHeightText(String(profile.height_cm));
    if (profile.display_name) setDisplayNameText(profile.display_name);
    if (latestWeight) setWeightText(String(latestWeight.weight_kg));
    setHydrated(true);
  }, [query.data, hydrated]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Confere a sessão atual no servidor em vez de confiar num id já guardado —
      // evita gravar com a conta errada se a sessão mudou desde que a tela abriu.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Sessão não encontrada — feche o app e entre de novo antes de salvar.");
      }
      const freshUserId = authData.user.id;

      const birthDate =
        birthDay.length > 0 && birthMonth.length > 0 && birthYear.length === 4
          ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
          : null;
      const heightCm = heightText ? Number(heightText.replace(",", ".")) : null;
      const weightKg = weightText ? Number(weightText.replace(",", ".")) : null;

      await updateOnboardingProfile(freshUserId, {
        gender,
        birthDate,
        heightCm,
        displayName: displayNameText.trim(),
      });
      if (weightKg && weightKg > 0) {
        await logBodyWeight(freshUserId, weightKg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil", userId] });
      queryClient.invalidateQueries({ queryKey: ["treino", userId] });
      // Nome mostrado na saudação da Home vem de outra query (`onboarding-status`) — sem
      // isso invalidar aqui, o nome novo só apareceria depois de fechar e abrir o app.
      queryClient.invalidateQueries({ queryKey: ["onboarding-status", userId] });
      router.back();
    },
  });

  const fieldStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

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
          Editar perfil
        </Text>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : (
          <View style={{ gap: 24 }}>
            <View style={{ gap: 10 }}>
              <SectionLabel>Como você quer ser chamada?</SectionLabel>
              <TextInput
                value={displayNameText}
                onChangeText={setDisplayNameText}
                placeholder="Ex: Ana, Ana Lívia..."
                placeholderTextColor={tokens.textMuted}
                maxLength={40}
                style={fieldStyle}
              />
              <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                Aparece na saudação da tela inicial. Deixe em branco pra usar o início do seu e-mail.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <SectionLabel>Gênero</SectionLabel>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <OptionPill label="Mulher" selected={gender === "feminino"} onPress={() => setGender("feminino")} />
                </View>
                <View style={{ flex: 1 }}>
                  <OptionPill label="Homem" selected={gender === "masculino"} onPress={() => setGender("masculino")} />
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <SectionLabel>Data de nascimento</SectionLabel>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Formato DD-MM-AAAA
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={birthDay}
                  onChangeText={(t) => {
                    const digits = t.replace(/\D/g, "").slice(0, 2);
                    setBirthDay(digits);
                    if (digits.length === 2) birthMonthRef.current?.focus();
                  }}
                  placeholder="DD"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[fieldStyle, { width: 64, textAlign: "center", fontFamily: fontFamily.mono }]}
                />
                <TextInput
                  ref={birthMonthRef}
                  value={birthMonth}
                  onChangeText={(t) => {
                    const digits = t.replace(/\D/g, "").slice(0, 2);
                    setBirthMonth(digits);
                    if (digits.length === 2) birthYearRef.current?.focus();
                  }}
                  placeholder="MM"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[fieldStyle, { width: 64, textAlign: "center", fontFamily: fontFamily.mono }]}
                />
                <TextInput
                  ref={birthYearRef}
                  value={birthYear}
                  onChangeText={(t) => setBirthYear(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="AAAA"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={[fieldStyle, { width: 88, textAlign: "center", fontFamily: fontFamily.mono }]}
                />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <SectionLabel>Altura e peso</SectionLabel>
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Altura (cm)
                </Text>
                <TextInput
                  value={heightText}
                  onChangeText={setHeightText}
                  placeholder="Ex: 165"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={fieldStyle}
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Peso atual (kg) — registra um novo check-in de hoje
                </Text>
                <TextInput
                  value={weightText}
                  onChangeText={setWeightText}
                  placeholder="Ex: 60"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={fieldStyle}
                />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <SectionLabel>Lembretes</SectionLabel>
              <View
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.text }}>
                      Lembretes de registro e bem-estar
                    </Text>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                      {Platform.OS === "web"
                        ? `Um aviso por dia às ${lembreteHora} pra não esquecer de registrar o que rolou.`
                        : "Registrar de hora em hora, beber água a cada 30 min e escovar os dentes de manhã e à noite — mensagem diferente a cada vez, sem avisos entre 22h e 7h."}
                    </Text>
                  </View>
                  {toggleLembreteMutation.isPending ? (
                    <ActivityIndicator color={tokens.accent} />
                  ) : (
                    <Switch
                      value={lembreteAtivo}
                      onValueChange={(next) => toggleLembreteMutation.mutate(next)}
                      trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
                    />
                  )}
                </View>
                {!reminderSupported ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.warning }}>
                    {Platform.OS === "web"
                      ? "Seu navegador não parece suportar notificações. No iPhone/iPad, o site precisa estar Adicionado à Tela de Início (Safari em aba normal não recebe notificação)."
                      : "Notificações só funcionam no app instalado (não no Expo Go)."}
                  </Text>
                ) : null}
                {toggleLembreteMutation.isError ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.danger }}>
                    {(toggleLembreteMutation.error as Error)?.message ?? "Não deu pra ativar."}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Remédios, consultas e outros lembretes ficam configurados dentro de cada módulo (ex: Saúde).
              </Text>
            </View>

            {saveMutation.isError ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.danger }}>
                Não deu pra salvar: {(saveMutation.error as Error)?.message ?? "erro desconhecido"}.
              </Text>
            ) : null}

            <Pressable
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: saveMutation.isPending ? 0.6 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                  Salvar alterações
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}
