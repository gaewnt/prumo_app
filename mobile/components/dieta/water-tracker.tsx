import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WATER_QUICK_ADD_ML } from "@/lib/dieta";

type WaterTrackerProps = {
  totalMl: number;
  goalMl: number | null;
  onAdd: (amountMl: number) => void;
  isAdding: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  hasLogsToday: boolean;
};

function formatMl(ml: number) {
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L` : `${ml}ml`;
}

/** Registro rápido de água — um toque por copo, no padrão do monitor de água do Lifesum. */
export function WaterTracker({ totalMl, goalMl, onAdd, isAdding, onUndo, isUndoing, hasLogsToday }: WaterTrackerProps) {
  const { tokens } = useTheme();
  const percent = goalMl ? Math.round((totalMl / goalMl) * 100) : 0;

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {goalMl ? (
          <ProgressRing percent={percent} size={64} strokeWidth={8} color={tokens.accent} />
        ) : (
          <Text style={{ fontSize: 32 }}>💧</Text>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            Água hoje
          </Text>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 22, color: tokens.text }}>
            {formatMl(totalMl)}
            {goalMl ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                {" "}
                / {formatMl(goalMl)}
              </Text>
            ) : null}
          </Text>
          {!goalMl ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
              Defina uma meta em Configurações → Editar perfil.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {WATER_QUICK_ADD_ML.map((ml) => (
          <Pressable
            key={ml}
            onPress={() => onAdd(ml)}
            disabled={isAdding}
            style={{
              flex: 1,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: isAdding ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
              + {formatMl(ml)}
            </Text>
          </Pressable>
        ))}
        {isAdding ? <ActivityIndicator color={tokens.accent} /> : null}
      </View>

      {hasLogsToday ? (
        <Pressable onPress={onUndo} disabled={isUndoing} hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {isUndoing ? "Desfazendo…" : "Desfazer último"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
