import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { GoalMetricType, TrainingGoalInput } from "@/lib/treino";

type NewGoalFormProps = {
  /** Preenche o formulário com uma meta existente — usado na edição. */
  initial?: TrainingGoalInput;
  submitLabel?: string;
  onSubmit: (input: TrainingGoalInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Meta de treino: peso corporal (progresso calculado automaticamente pelos
 * check-ins) ou uma métrica personalizada — desempenho, reps ou carga de um
 * exercício específico — cujo progresso a própria pessoa atualiza aos poucos.
 */
export function NewGoalForm({ initial, submitLabel = "Criar meta", onSubmit, onCancel, isSaving }: NewGoalFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [metricType, setMetricType] = useState<GoalMetricType>(initial?.metricType ?? "weight");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [startText, setStartText] = useState(initial ? String(initial.startValue) : "");
  const [targetText, setTargetText] = useState(initial ? String(initial.targetValue) : "");
  const [currentText, setCurrentText] = useState(
    initial?.currentValue != null ? String(initial.currentValue) : ""
  );
  const [dateText, setDateText] = useState(toBrDate(initial?.targetDate ?? null));

  const startValue = Number(startText.replace(",", "."));
  const targetValue = Number(targetText.replace(",", "."));
  const currentValue = currentText ? Number(currentText.replace(",", ".")) : null;
  const dateIsValid = dateText.trim().length === 0 || parseBrDate(dateText) !== null;
  const isValid =
    title.trim().length > 0 &&
    !Number.isNaN(startValue) &&
    !Number.isNaN(targetValue) &&
    targetValue !== startValue &&
    dateIsValid;

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Meta (ex: Chegar em 12 reps no supino)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["weight", "custom"] as const).map((type) => {
          const selected = metricType === type;
          return (
            <Pressable
              key={type}
              onPress={() => {
                setMetricType(type);
                if (type === "weight") setUnit("kg");
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: selected ? tokens.accent : tokens.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.textMuted,
                }}
              >
                {type === "weight" ? "Peso corporal" : "Personalizada"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {metricType === "custom" ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Pra desempenho, reps ou carga de um exercício — você mesma vai atualizando o progresso.
        </Text>
      ) : (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          O progresso atualiza sozinho a cada check-in de peso na tela de Treino.
        </Text>
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={startText}
          onChangeText={setStartText}
          placeholder={`Início (${unit || "un."})`}
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={[inputStyle, { flex: 1 }]}
        />
        <TextInput
          value={targetText}
          onChangeText={setTargetText}
          placeholder={`Objetivo (${unit || "un."})`}
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={[inputStyle, { flex: 1 }]}
        />
      </View>

      {metricType === "custom" ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={unit}
            onChangeText={setUnit}
            placeholder="Unidade (ex: reps, kg)"
            placeholderTextColor={tokens.textMuted}
            style={[inputStyle, { flex: 1 }]}
          />
          <TextInput
            value={currentText}
            onChangeText={setCurrentText}
            placeholder="Atual (opcional)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={[inputStyle, { flex: 1 }]}
          />
        </View>
      ) : null}

      <TextInput
        value={dateText}
        onChangeText={setDateText}
        placeholder="Data alvo (opcional, DD/MM/AAAA)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      {!dateIsValid ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>
          Use o formato DD/MM/AAAA.
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({
              title: title.trim(),
              metricType,
              startValue,
              targetValue,
              currentValue,
              unit: unit.trim() || "kg",
              targetDate: dateText.trim() ? parseBrDate(dateText) : null,
            })
          }
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
