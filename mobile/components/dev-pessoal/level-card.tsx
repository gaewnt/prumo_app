import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { Gamification } from "@/lib/dev-pessoal";

type LevelCardProps = { gamification: Gamification };

/**
 * Nível e XP, inspirado no Habitica — mas sem virar um RPG completo: só o marco de
 * progresso visível que o Habitica faz tão bem. Cada fonte de XP vem de uma ação real
 * (meta concluída, entrada de diário, humor registrado), listada abaixo pra ficar claro
 * de onde veio cada ponto — nada de número mágico.
 */
export function LevelCard({ gamification }: LevelCardProps) {
  const { tokens } = useTheme();
  const { level, xpIntoLevel, xpForNextLevel, totalXp, breakdown } = gamification;
  const percent = Math.round((xpIntoLevel / xpForNextLevel) * 100);

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 16,
        alignItems: "center",
      }}
    >
      <ProgressRing percent={percent} size={72} strokeWidth={8} color={tokens.success} />

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: tokens.text }}>
          Nível {level}
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
          {xpIntoLevel} / {xpForNextLevel} XP pro próximo nível · {totalXp} XP no total
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted, marginTop: 4 }}>
          Metas +{breakdown.goalsXp} · Diário +{breakdown.journalXp} · Humor +{breakdown.moodXp}
        </Text>
      </View>
    </View>
  );
}
