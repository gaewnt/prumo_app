import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { OdometerLogWithGap } from "@/lib/veiculo";
import { NewOdometerLogForm, type NewOdometerLogFormInput } from "@/components/veiculo/new-odometer-log-form";

type OdometerLogRowProps = {
  log: OdometerLogWithGap;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: NewOdometerLogFormInput) => void;
  isUpdating: boolean;
};

function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Linha do histórico de leituras do painel — mesmo padrão de `FuelLogRow`/`MaintenanceLogRow`. */
export function OdometerLogRow({ log, onDelete, isEditing, onStartEdit, onCancelEdit, onUpdate, isUpdating }: OdometerLogRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewOdometerLogForm
        initial={{ data: log.data, km_atual: log.km_atual }}
        submitLabel="Salvar alterações"
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSaving={isUpdating}
      />
    );
  }

  let detail = "Primeira leitura registrada";
  if (log.kmDesdeAnterior != null && log.diasDesdeAnterior != null) {
    const kmStr = `${log.kmDesdeAnterior.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
    detail =
      log.diasDesdeAnterior > 1
        ? `${kmStr} em ${log.diasDesdeAnterior} dias — média distribuída (~${(log.kmDesdeAnterior / log.diasDesdeAnterior).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/dia)`
        : `${kmStr} desde a leitura anterior`;
  }

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
        <Text style={{ fontSize: 16 }}>🧭</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
          {toBrDate(log.data)} · {log.km_atual.toLocaleString("pt-BR")} km
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>{detail}</Text>
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
