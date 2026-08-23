import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { HealthHabitsSummary } from "@/lib/saude";

function formatMl(ml: number) {
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L` : `${ml}ml`;
}

type HabitsSummaryCardProps = {
  summary: HealthHabitsSummary;
};

/**
 * Resumo do dia puxado direto de Dieta e Rotina/Treino — nada calculado ou fabricado
 * aqui, só uma vitrine dos números que já existem em cada módulo, pra Saúde funcionar
 * como um painel central em vez de mais um app isolado.
 */
export function HabitsSummaryCard({ summary }: HabitsSummaryCardProps) {
  const { tokens } = useTheme();

  const rows = [
    {
      key: "water",
      icon: "💧",
      label: "Água",
      detail: summary.water.goalMl
        ? `${formatMl(summary.water.totalMl)} de ${formatMl(summary.water.goalMl)}`
        : formatMl(summary.water.totalMl),
      progress: summary.water.goalMl ? summary.water.totalMl / summary.water.goalMl : null,
    },
    {
      key: "rotina",
      icon: "📅",
      label: "Hábitos",
      detail:
        summary.rotina.total > 0
          ? `${summary.rotina.done} de ${summary.rotina.total} hoje`
          : "Nada agendado hoje",
      progress: summary.rotina.total > 0 ? summary.rotina.done / summary.rotina.total : null,
    },
    {
      key: "treino",
      icon: "💪",
      label: "Treino",
      detail: !summary.treino.scheduled ? "Sem treino hoje" : summary.treino.completed ? "Concluído" : "Pendente",
      progress: summary.treino.scheduled ? (summary.treino.completed ? 1 : 0) : null,
    },
  ];

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
        Hábitos de hoje
      </Text>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>
              {row.icon} {row.label}
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              {row.detail}
            </Text>
          </View>
          {row.progress !== null ? <ProgressBar progress={row.progress} height={6} /> : null}
        </View>
      ))}
    </View>
  );
}
