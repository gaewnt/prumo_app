import React from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

const PLUS_BENEFITS = [
  { icon: "🚗", title: "Módulos extras", detail: "Veículo, Desenvolvimento Pessoal, Carreira, Casa, Saúde e Pet." },
  { icon: "🔭", title: "Visão Hoje cruzando módulos", detail: "O que vence ou está programado em todos os módulos, num lugar só." },
  { icon: "💡", title: "Insights com IA", detail: "Cruza seus próprios dados pra apontar padrões — sem inventar nada." },
  { icon: "✉️", title: "Envelope, extrato e exportação", detail: "Orçamento por envelope, importar extrato bancário e exportar CSV em Finanças." },
  { icon: "🔥", title: "Força do hábito e desafios", detail: "Métrica de consistência e desafios prontos de N dias em Rotina." },
  { icon: "🔒", title: "Segunda camada de verificação", detail: "Proteção extra no login (2FA)." },
  { icon: "📱", title: "Widget de tela inicial", detail: "O que vence hoje, direto na tela inicial do Android." },
  { icon: "🚫", title: "Sem anúncio", detail: "A tela inicial fica limpa, sem banner de anúncio." },
];

/**
 * Tela de "vitrine" do Prumo Plus — mostrada quando alguém no plano grátis tenta abrir um
 * módulo ou recurso que exige Plus (ver `plusOnly` em `lib/modules.ts`).
 *
 * IMPORTANTE: ainda não existe cobrança de verdade ligada aqui — falta configurar os
 * produtos de assinatura nas contas de desenvolvedor (App Store Connect / Google Play
 * Console) e integrar algo como o RevenueCat pra processar a compra dentro do app. Por
 * isso essa tela só explica o que o Plus libera, sem botão de assinar ainda — colocar um
 * botão que não assina nada de verdade seria pior do que não ter botão nenhum.
 */
export default function PrumoPlusScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>✨</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Prumo Plus</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Esse recurso faz parte do Prumo Plus — a versão paga do Prumo.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {PLUS_BENEFITS.map((benefit) => (
            <View
              key={benefit.title}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 20 }}>{benefit.icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                  {benefit.title}
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  {benefit.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: tokens.accentMuted, borderRadius: 14, padding: 16, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
            Assinatura ainda não disponível
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Estamos preparando o jeito de assinar o Prumo Plus direto pelo app. Assim que
            estiver pronto, um botão de assinar aparece bem aqui.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
