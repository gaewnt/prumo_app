import React, { useEffect, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { OptionPill } from "@/components/onboarding/option-pill";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { supabase } from "@/lib/supabase";
import { fetchOnboardingProfile, updateOnboardingProfile, type Gender } from "@/lib/onboarding";
import { fetchLatestBodyLog, logBodyWeight } from "@/lib/treino";

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

  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightText, setHeightText] = useState("");
  const [weightText, setWeightText] = useState("");
  const [hydrated, setHydrated] = useState(false);

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

      await updateOnboardingProfile(freshUserId, { gender, birthDate, heightCm });
      if (weightKg && weightKg > 0) {
        await logBodyWeight(freshUserId, weightKg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil", userId] });
      queryClient.invalidateQueries({ queryKey: ["treino", userId] });
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
                  onChangeText={(t) => setBirthDay(t.replace(/\D/g, "").slice(0, 2))}
                  placeholder="DD"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[fieldStyle, { width: 64, textAlign: "center", fontFamily: fontFamily.mono }]}
                />
                <TextInput
                  value={birthMonth}
                  onChangeText={(t) => setBirthMonth(t.replace(/\D/g, "").slice(0, 2))}
                  placeholder="MM"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[fieldStyle, { width: 64, textAlign: "center", fontFamily: fontFamily.mono }]}
                />
                <TextInput
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
