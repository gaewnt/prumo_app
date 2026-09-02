import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { FuelLogWithConsumption } from "@/lib/veiculo";
import { formatCurrency } from "@/components/veiculo/format";
import { NewFuelLogForm, type NewFuelLogFormInput } from "@/components/veiculo/new-fuel-log-form";

type FuelLogRowProps = {
  log: FuelLogWithConsumption;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: NewFuelLogFormInput) => void;
  isUpdating: boolean;
};

function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Linha do histórico de abastecimentos — mesmo padrão de `RideRow` (sem confirmação antes
 * de excluir, edição reaproveitando o próprio formulário de lançamento). */
export function FuelLogRow({ log, onDelete, isEditing, onStartEdit, onCancelEdit, onUpdate, isUpdating }: FuelLogRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewFuelLogForm
        initial={{
          abastecido_em: log.abastecido_em,
          km_atual: log.km_atual,
          litros: log.litros,
          valor_total: log.valor_total,
          tanque_cheio: log.tanque_cheio,
        }}
        submitLabel="Salvar alterações"
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isSaving={isUpdating}
      />
    );
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
        <Text style={{ fontSize: 16 }}>⛽</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
            {toBrDate(log.abastecido_em)} · {log.km_atual.toLocaleString("pt-BR")} km · {log.litros.toLocaleString("pt-BR")} L
          </Text>
          {!log.tanque_cheio ? (
            <View
              style={{
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10, color: tokens.textMuted }}>
                Parcial
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {formatCurrency(log.precoLitro)}/L
          {log.consumoKmL != null
            ? ` · consumo real: ${log.consumoKmL.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/l`
            : log.tanque_cheio
              ? " · sem tanque cheio anterior pra calcular consumo"
              : " · consumo entra no cálculo do próximo tanque cheio"}
        </Text>
      </View>

      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.danger }}>
        {formatCurrency(log.valor_total)}
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
