import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Import via namespace + cast: os tipos publicados desta versão do react-native-svg têm
// um bug conhecido de resolução em cadeias de `export *` que faz o TS não enxergar
// `SvgXml` como export nomeado, mesmo existindo de verdade em tempo de execução (Metro
// resolve por um caminho diferente do `tsc`, sem esse problema).
import * as RNSvg from "react-native-svg";
const SvgXml = (RNSvg as unknown as { SvgXml: React.ComponentType<{ xml: string; width?: number; height?: number }> })
  .SvgXml;
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  getVerifiedTotpFactor,
  startTotpEnrollment,
  confirmTotpEnrollment,
  cancelTotpEnrollment,
  disableTotp,
  type TotpEnrollment,
} from "@/lib/mfa";

/**
 * Verificação em duas etapas (2FA) — segunda camada de segurança no LOGIN da conta, via
 * TOTP (qualquer app autenticador: Google Authenticator, Authy, 1Password etc.). Diferente
 * do bloqueio por biometria (Configurações > Segurança), que só protege quem já está com o
 * app aberto no celular, isso protege contra alguém que descubra sua senha — sem o código
 * do app autenticador, o login não completa nem no app nem no site.
 */
export default function VerificacaoDuasEtapasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [confirmingDisable, setConfirmingDisable] = useState(false);

  const factorQuery = useQuery({
    queryKey: ["mfa-factor", userId],
    queryFn: getVerifiedTotpFactor,
    enabled: !!userId,
  });
  const factor = factorQuery.data ?? null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["mfa-factor", userId] });
  }

  const startMutation = useMutation({
    mutationFn: startTotpEnrollment,
    onSuccess: (result) => {
      setEnrollment(result);
      setCode("");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmTotpEnrollment(enrollment!.factorId, code.trim()),
    onSuccess: () => {
      setEnrollment(null);
      setCode("");
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelTotpEnrollment(enrollment!.factorId),
    onSuccess: () => {
      setEnrollment(null);
      setCode("");
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => disableTotp(factor!.id),
    onSuccess: () => {
      setConfirmingDisable(false);
      invalidate();
    },
  });

  const inputStyle = {
    fontFamily: fontFamily.mono,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: "center" as const,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 12,
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: tokens.text }}>
            Verificação em duas etapas
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.textMuted }}>
            Além da senha, pede um código de um app autenticador pra entrar na conta.
          </Text>
        </View>

        {factorQuery.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : enrollment ? (
          // ---- Cadastro em andamento: escanear QR code + confirmar código ----
          <View
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 14,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
              1. Escaneie com seu app autenticador
            </Text>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, alignSelf: "center" }}>
              <SvgXml xml={enrollment.qrCode} width={180} height={180} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Não deu pra escanear? Digite esse código manualmente no app:
              </Text>
              <Text
                selectable
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 13,
                  color: tokens.text,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                {enrollment.secret}
              </Text>
            </View>

            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text, marginTop: 4 }}>
              2. Digite o código de 6 dígitos gerado
            </Text>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={tokens.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={inputStyle}
            />
            {confirmMutation.isError ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.danger }}>
                Código inválido. Confira o horário do aparelho e tenta de novo.
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || code.length !== 6}
                style={{
                  flex: 1,
                  backgroundColor: tokens.accent,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: confirmMutation.isPending || code.length !== 6 ? 0.6 : 1,
                }}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color={tokens.accentText} />
                ) : (
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                    Confirmar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : factor ? (
          // ---- Já ativada ----
          <View
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  backgroundColor: tokens.successMuted,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.success }}>
                  Ativada
                </Text>
              </View>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted, flex: 1 }}>
                Todo login pede o código do app autenticador, além da senha.
              </Text>
            </View>

            {confirmingDisable ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text }}>
                  Tem certeza? Sua conta vai passar a exigir só a senha pra entrar.
                </Text>
                {disableMutation.isError ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.danger }}>
                    Não deu pra desativar agora. Tenta de novo em instantes.
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setConfirmingDisable(false)}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}
                  >
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => disableMutation.mutate()}
                    disabled={disableMutation.isPending}
                    style={{
                      flex: 1,
                      backgroundColor: tokens.dangerMuted,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    {disableMutation.isPending ? (
                      <ActivityIndicator color={tokens.danger} />
                    ) : (
                      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.danger }}>
                        Sim, desativar
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingDisable(true)} style={{ paddingVertical: 4 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.danger }}>
                  Desativar
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          // ---- Desativada — oferece pra ativar ----
          <View
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.textMuted }}>
              Você vai precisar de um app autenticador instalado (Google Authenticator, Authy,
              1Password ou parecido) pra escanear um QR code.
            </Text>
            {startMutation.isError ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.danger }}>
                Não deu pra começar o cadastro agora. Tenta de novo em instantes.
              </Text>
            ) : null}
            <Pressable
              onPress={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: startMutation.isPending ? 0.6 : 1,
              }}
            >
              {startMutation.isPending ? (
                <ActivityIndicator color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                  Ativar verificação em duas etapas
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}
