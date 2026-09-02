import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { VehicleMaintenanceLog } from "@/lib/veiculo";
import { MAINTENANCE_TYPE_EMOJI, MAINTENANCE_TYPE_LABELS, formatCurrency } from "@/components/veiculo/format";
import { NewMaintenanceLogForm, type NewMaintenanceLogFormInput } from "@/components/veiculo/new-maintenance-log-form";

type MaintenanceLogRowProps = {
  log: VehicleMaintenanceLog;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: NewMaintenanceLogFormInput) => void;
  isUpdating: boolean;
};

function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Linha do histórico de manutenções — mesmo padrão de `RideRow`/`FuelLogRow`. */
export function MaintenanceLogRow({
  log,
  onDelete,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isUpdating,
}: MaintenanceLogRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewMaintenanceLogForm
        initial={{
          tipo: log.tipo,
          descricao: log.descricao,
          valor: log.valor,
          km_atual: log.km_atual,
          realizado_em: log.realizado_em,
        }}
        submitLabel="Salvar alterações"
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSaving={isUpdating}
      />
    );
  }

  const detailParts: string[] = [toBrDate(log.realizado_em)];
  if (log.km_atual != null) detailParts.push(`${log.km_atual.toLocaleString("pt-BR")} km`);
  if (log.tipo === "outro" && log.descricao) detailParts.push(log.descricao);

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
        <Text style={{ fontSize: 16 }}>{MAINTENANCE_TYPE_EMOJI[log.tipo]}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
          {MAINTENANCE_TYPE_LABELS[log.tipo]}
        </Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {detailParts.join(" · ")}
        </Text>
      </View>

      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.danger }}>
        {formatCurrency(log.valor)}
      </Text>

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
