import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  classifyBloodPressure,
  classifyGlucose,
  formatMeasuredAt,
  GLUCOSE_CONTEXT_LABELS,
  type HealthMeasurement,
  type MeasurementTone,
} from "@/lib/saude";

type MeasurementRowProps = {
  measurement: HealthMeasurement;
  onDelete: () => void;
};

function toneColors(tokens: ReturnType<typeof useTheme>["tokens"], tone: MeasurementTone) {
  if (tone === "danger") return { fg: tokens.danger, bg: tokens.dangerMuted };
  if (tone === "warning") return { fg: tokens.warning, bg: tokens.warningMuted };
  return { fg: tokens.success, bg: tokens.successMuted };
}

export function MeasurementRow({ measurement, onDelete }: MeasurementRowProps) {
  const { tokens } = useTheme();

  const valueLabel =
    measurement.kind === "pressao"
      ? `${measurement.systolic}/${measurement.diastolic} mmHg${measurement.pulse ? ` · ${measurement.pulse} bpm` : ""}`
      : `${measurement.glucose_mg_dl} mg/dL${
          measurement.glucose_context ? ` · ${GLUCOSE_CONTEXT_LABELS[measurement.glucose_context]}` : ""
        }`;

  const classification =
    measurement.kind === "pressao"
      ? classifyBloodPressure(measurement.systolic!, measurement.diastolic!)
      : classifyGlucose(measurement.glucose_mg_dl!, measurement.glucose_context ?? "aleatoria");
  const { fg, bg } = toneColors(tokens, classification.tone);

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {valueLabel}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {formatMeasuredAt(measurement.measured_at)}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: bg,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: fg }}>
            {classification.label}
          </Text>
        </View>
      </View>

      {measurement.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
          {measurement.notes}
        </Text>
      ) : null}

      <Pressable onPress={onDelete} hitSlop={8} style={{ alignSelf: "flex-start" }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>Excluir</Text>
      </Pressable>
    </View>
  );
}
