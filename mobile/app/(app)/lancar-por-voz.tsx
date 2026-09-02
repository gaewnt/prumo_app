import React, { useEffect, useRef, useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { NewTransactionForm } from "@/components/financas/new-transaction-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { createTransaction, type TransactionKind } from "@/lib/financas";
import { voiceCommandsSupported, startListening } from "@/lib/voice-recognition";
import { parseExpenseCommand, type ParsedExpenseCommand } from "@/lib/voice-command";

type Step = "unsupported" | "idle" | "listening" | "review" | "error";

export default function LancarPorVozScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [step, setStep] = useState<Step>(voiceCommandsSupported ? "idle" : "unsupported");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [parsed, setParsed] = useState<ParsedExpenseCommand | null>(null);

  const transcriptRef = useRef("");
  const stopListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopListeningRef.current?.();
    };
  }, []);

  async function handleStart() {
    setLiveTranscript("");
    transcriptRef.current = "";
    setStep("listening");

    const stop = await startListening({
      onResult: (transcript) => {
        transcriptRef.current = transcript;
        setLiveTranscript(transcript);
      },
      onEnd: () => {
        stopListeningRef.current = null;
        const finalTranscript = transcriptRef.current.trim();
        if (!finalTranscript) {
          setErrorMessage("Não entendi nada — tenta falar de novo, bem perto do microfone.");
          setStep("error");
          return;
        }
        setParsed(parseExpenseCommand(finalTranscript));
        setStep("review");
      },
      onError: (message) => {
        stopListeningRef.current = null;
        setErrorMessage(message);
        setStep("error");
      },
    });

    stopListeningRef.current = stop;
  }

  function handleStopManually() {
    stopListeningRef.current?.();
    stopListeningRef.current = null;
  }

  const createMutation = useMutation({
    mutationFn: (input: { kind: TransactionKind; category: string; amount: number; description: string }) =>
      createTransaction(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
      router.back();
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🎙️</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Lançar por voz</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Diga algo como "lançar despesa do mercado de 45 reais".
          </Text>
        </View>

        {step === "unsupported" ? (
          <View
            style={{
              backgroundColor: tokens.warningMuted,
              borderRadius: 14,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
              Não disponível neste modo do app
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Reconhecimento de voz precisa do app instalado como build de verdade (o mesmo motivo
              dos lembretes/notificação) — não funciona rodando pelo Expo Go.
            </Text>
          </View>
        ) : null}

        {step === "idle" ? (
          <View style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}>
            <Pressable
              onPress={handleStart}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: tokens.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 36 }}>🎙️</Text>
            </Pressable>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Toque pra falar
            </Text>
          </View>
        ) : null}

        {step === "listening" ? (
          <View style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}>
            <Pressable
              onPress={handleStopManually}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: tokens.danger,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={tokens.accentText} />
            </Pressable>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
              Ouvindo… toque pra parar
            </Text>
            {liveTranscript ? (
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: 15,
                  color: tokens.textMuted,
                  textAlign: "center",
                }}
              >
                "{liveTranscript}"
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === "error" ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                backgroundColor: tokens.dangerMuted,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>{errorMessage}</Text>
            </View>
            <Pressable
              onPress={handleStart}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === "review" && parsed ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              Entendi: "{parsed.rawTranscript}"
            </Text>
            {!parsed.categoryConfident ? (
              <View style={{ backgroundColor: tokens.warningMuted, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text }}>
                  Não identifiquei a categoria com certeza — confira antes de salvar.
                </Text>
              </View>
            ) : null}
            {parsed.amount === null ? (
              <View style={{ backgroundColor: tokens.warningMuted, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text }}>
                  Não identifiquei o valor — preencha abaixo antes de salvar.
                </Text>
              </View>
            ) : null}
            <NewTransactionForm
              initial={{
                kind: "expense",
                category: parsed.category,
                amount: parsed.amount ?? 0,
                description: parsed.description,
              }}
              submitLabel="Salvar despesa"
              isSaving={createMutation.isPending}
              onCancel={() => router.back()}
              onSubmit={(input) => createMutation.mutate(input)}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
