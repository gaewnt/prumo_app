import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type WeightCheckinProps = {
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  heightCm: number | null;
  onLogWeight: (weightKg: number) => void;
  isLoggingWeight: boolean;
  onUpdateHeight: (heightCm: number) => void;
  isSavingHeight: boolean;
};

function formatLogDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

/**
 * Check-in rápido antes do treino — peso do dia (o pedido explícito) e altura
 * do perfil, editável ali mesmo já que raramente muda. Sem fotos/vídeos de
 * exercício: o foco é o número que alimenta o gráfico de evolução e as metas.
 */
export function WeightCheckin({
  latestWeightKg,
  latestWeightDate,
  heightCm,
  onLogWeight,
  isLoggingWeight,
  onUpdateHeight,
  isSavingHeight,
}: WeightCheckinProps) {
  const { tokens } = useTheme();
  const [weightText, setWeightText] = useState("");
  const [editingHeight, setEditingHeight] = useState(false);
  const [heightText, setHeightText] = useState(heightCm ? String(heightCm) : "");

  const weight = Number(weightText.replace(",", "."));
  const canLog = weight > 0;
  const height = Number(heightText.replace(",", "."));

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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
          Check-in de hoje
        </Text>
        {editingHeight ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TextInput
              value={heightText}
              onChangeText={setHeightText}
              placeholder="cm"
              placeholderTextColor={tokens.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 12,
                color: tokens.text,
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                width: 56,
              }}
            />
            <Pressable
              onPress={() => {
                if (height > 0) onUpdateHeight(height);
                setEditingHeight(false);
              }}
              disabled={isSavingHeight}
              hitSlop={8}
            >
              {isSavingHeight ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.accent }}>
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditingHeight(true)} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Altura: {heightCm ? `${heightCm} cm` : "definir"} ✎
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
        {latestWeightKg
          ? `Último peso registrado: ${latestWeightKg} kg${latestWeightDate ? ` · ${formatLogDate(latestWeightDate)}` : ""}`
          : "Nenhum peso registrado ainda."}
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={weightText}
          onChangeText={setWeightText}
          placeholder="Peso de hoje (kg)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={{
            flex: 1,
            fontFamily: fontFamily.body,
            fontSize: 15,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />
        <Pressable
          onPress={() => {
            onLogWeight(weight);
            setWeightText("");
          }}
          disabled={!canLog || isLoggingWeight}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
            opacity: !canLog || isLoggingWeight ? 0.6 : 1,
          }}
        >
          {isLoggingWeight ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
              Registrar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
