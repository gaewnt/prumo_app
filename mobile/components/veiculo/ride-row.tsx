import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { VehicleRide } from "@/lib/veiculo";
import { APP_ORIGEM_EMOJI, APP_ORIGEM_LABELS, formatCurrency, formatRideDateTime } from "@/components/veiculo/format";
import { NewRideForm, type NewRideFormInput } from "@/components/veiculo/new-ride-form";

type RideRowProps = {
  ride: VehicleRide;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: NewRideFormInput) => void;
  isUpdating: boolean;
};

/** Linha do histórico de corridas/sessões — sem confirmação antes de excluir,
 * seguindo o mesmo padrão de `bill-row.tsx` em Finanças. A edição
 * reaproveita o mesmo `NewRideForm` do cadastro, pré-preenchido, já que antes não dava pra
 * corrigir um valor de corrida lançado errado, só existia excluir. */
export function RideRow({ ride, onDelete, isEditing, onStartEdit, onCancelEdit, onUpdate, isUpdating }: RideRowProps) {
  const { tokens } = useTheme();
  const appOrigem = ride.app_origem ?? "manual";

  if (isEditing) {
    return (
      <NewRideForm
        initial={{
          valor: ride.valor,
          valor_liquido: ride.valor_liquido,
          distancia_km: ride.distancia_km,
          duracao_min: ride.duracao_min,
          horas_trabalhadas: ride.horas_trabalhadas,
          km_rodados: ride.km_rodados,
        }}
        submitLabel="Salvar alterações"
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSaving={isUpdating}
      />
    );
  }

  const detailParts: string[] = [];
  if (ride.distancia_km != null) detailParts.push(`${ride.distancia_km} km`);
  if (ride.duracao_min != null) detailParts.push(`${ride.duracao_min} min`);
  if (ride.horas_trabalhadas != null) detailParts.push(`${ride.horas_trabalhadas}h trabalhadas`);
  if (ride.km_rodados != null) detailParts.push(`${ride.km_rodados} km rodados`);

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tokens.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16 }}>{APP_ORIGEM_EMOJI[appOrigem]}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
            {APP_ORIGEM_LABELS[appOrigem]}
          </Text>
          {ride.origem_deteccao === "auto" ? (
            <View
              style={{
                backgroundColor: tokens.accentMuted,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10, color: tokens.accent }}>
                Auto
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {formatRideDateTime(ride.ocorrido_em)}
          {detailParts.length > 0 ? ` · ${detailParts.join(" · ")}` : ""}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.success }}>
          {formatCurrency(ride.valor)}
        </Text>
        {ride.valor_liquido != null && ride.valor_liquido !== ride.valor ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 10.5, color: tokens.textMuted }}>
            líquido: {formatCurrency(ride.valor_liquido)}
          </Text>
        ) : null}
      </View>

      {isUpdating ? (
        <ActivityIndicator color={tokens.accent} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>✎</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
