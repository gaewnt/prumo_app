import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { GLUCOSE_CONTEXT_LABELS, MEASUREMENT_KIND_LABELS, type GlucoseContext, type MeasurementKind } from "@/lib/saude";

export type MeasurementFormOutput =
  | { kind: "pressao"; measuredAt: Date; systolic: number; diastolic: number; pulse: number | null; notes: string }
  | { kind: "glicemia"; measuredAt: Date; glucoseMgDl: number; glucoseContext: GlucoseContext; notes: string };

type NewMeasurementFormProps = {
  onSubmit: (input: MeasurementFormOutput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function toHm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Mesma máscara de horário usada no formulário de compromissos — o teclado é
 * `number-pad`, então os dois pontos são inseridos automaticamente. */
function maskTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function NewMeasurementForm({ onSubmit, onCancel, isSaving }: NewMeasurementFormProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<MeasurementKind>("pressao");
  const [timeText, setTimeText] = useState(toHm(new Date()));
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [glucose, setGlucose] = useState("");
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>("jejum");
  const [notes, setNotes] = useState("");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  const measuredAt = (() => {
    if (!timeMatch) return null;
    const now = new Date();
    const [, h, m] = timeMatch;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m));
    return Number.isNaN(date.getTime()) ? null : date;
  })();

  const systolicNum = Number(systolic);
  const diastolicNum = Number(diastolic);
  const pulseNum = pulse.trim() ? Number(pulse) : null;
  const glucoseNum = Number(glucose);

  const isValid =
    measuredAt !== null &&
    (kind === "pressao"
      ? systolic.trim().length > 0 && diastolic.trim().length > 0 && systolicNum > 0 && diastolicNum > 0
      : glucose.trim().length > 0 && glucoseNum > 0);

  function handleSubmit() {
    if (!measuredAt || !isValid) return;
    if (kind === "pressao") {
      onSubmit({
        kind: "pressao",
        measuredAt,
        systolic: systolicNum,
        diastolic: diastolicNum,
        pulse: pulseNum,
        notes: notes.trim(),
      });
    } else {
      onSubmit({
        kind: "glicemia",
        measuredAt,
        glucoseMgDl: glucoseNum,
        glucoseContext,
        notes: notes.trim(),
      });
    }
  }

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(MEASUREMENT_KIND_LABELS) as MeasurementKind[]).map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.text,
                }}
              >
                {MEASUREMENT_KIND_LABELS[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kind === "pressao" ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={systolic}
            onChangeText={(t) => setSystolic(t.replace(/\D/g, "").slice(0, 3))}
            placeholder="Sistólica"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1 }]}
          />
          <TextInput
            value={diastolic}
            onChangeText={(t) => setDiastolic(t.replace(/\D/g, "").slice(0, 3))}
            placeholder="Diastólica"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1 }]}
          />
          <TextInput
            value={pulse}
            onChangeText={(t) => setPulse(t.replace(/\D/g, "").slice(0, 3))}
            placeholder="Pulso"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1 }]}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            value={glucose}
            onChangeText={(t) => setGlucose(t.replace(/\D/g, "").slice(0, 3))}
            placeholder="Glicemia (mg/dL)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(GLUCOSE_CONTEXT_LABELS) as GlucoseContext[]).map((c) => {
              const selected = glucoseContext === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setGlucoseContext(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.text,
                    }}
                  >
                    {GLUCOSE_CONTEXT_LABELS[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Horário (hoje)
        </Text>
        <TextInput
          value={timeText}
          onChangeText={(text) => setTimeText(maskTimeInput(text))}
          placeholder="HH:MM"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          maxLength={5}
          style={[inputStyle, { width: 90 }]}
        />
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Observações (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={isSaving || !isValid}
          style={{
            flex: 1,
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: isSaving || !isValid ? 0.6 : 1,
          }}
        >
          {isSaving ? (
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
