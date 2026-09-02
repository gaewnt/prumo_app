import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
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
  /** Mesmo alcance de "Desfazer último": só o registro mais recente. */
  lastLogAmountMl: number | null;
  onUpdateLast: (amountMl: number) => void;
  isUpdatingLast: boolean;
};

function formatMl(ml: number) {
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L` : `${ml}ml`;
}

/** Registro rápido de água — um toque por copo, no padrão do monitor de água do Lifesum. */
export function WaterTracker({
  totalMl,
  goalMl,
  onAdd,
  isAdding,
  onUndo,
  isUndoing,
  hasLogsToday,
  lastLogAmountMl,
  onUpdateLast,
  isUpdatingLast,
}: WaterTrackerProps) {
  const { tokens } = useTheme();
  const percent = goalMl ? Math.round((totalMl / goalMl) * 100) : 0;
  const [isEditingLast, setIsEditingLast] = useState(false);
  const [editAmountText, setEditAmountText] = useState("");

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

      {hasLogsToday && !isEditingLast ? (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable
            onPress={() => {
              setEditAmountText(lastLogAmountMl != null ? String(lastLogAmountMl) : "");
              setIsEditingLast(true);
            }}
            hitSlop={8}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>
              Editar último
            </Text>
          </Pressable>
          <Pressable onPress={onUndo} disabled={isUndoing} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {isUndoing ? "Desfazendo…" : "Desfazer último"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isEditingLast ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={editAmountText}
            onChangeText={setEditAmountText}
            placeholder="Quantidade (ml)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            autoFocus
            style={{
              flex: 1,
              fontFamily: fontFamily.body,
              fontSize: 14,
              color: tokens.text,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <Pressable onPress={() => setIsEditingLast(false)} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const amount = Math.round(Number(editAmountText));
              if (amount > 0) {
                onUpdateLast(amount);
                setIsEditingLast(false);
              }
            }}
            disabled={isUpdatingLast || !(Number(editAmountText) > 0)}
            style={{
              backgroundColor: tokens.accent,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              opacity: isUpdatingLast || !(Number(editAmountText) > 0) ? 0.6 : 1,
            }}
          >
            {isUpdatingLast ? (
              <ActivityIndicator color={tokens.accentText} size="small" />
            ) : (
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                Salvar
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
