import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, Switch } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WEEKDAY_LABELS } from "@/lib/rotina";

type MedicationFormInput = {
  name: string;
  dosage: string;
  times: string[];
  activeDays: number[];
  notes: string;
  active: boolean;
};

type NewMedicationFormProps = {
  initial?: MedicationFormInput;
  submitLabel?: string;
  onSubmit: (input: MedicationFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function normalizeTime(text: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function NewMedicationForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewMedicationFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [dosage, setDosage] = useState(initial?.dosage ?? "");
  const [times, setTimes] = useState<string[]>(initial?.times ?? []);
  const [timeText, setTimeText] = useState("");
  const [activeDays, setActiveDays] = useState<number[]>(initial?.activeDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function toggleDay(day: number) {
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function addTime() {
    const normalized = normalizeTime(timeText);
    if (!normalized || times.includes(normalized)) return;
    setTimes((prev) => [...prev, normalized].sort());
    setTimeText("");
  }

  const isValid = name.trim().length > 0 && times.length > 0 && activeDays.length > 0;

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
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nome do remédio"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <TextInput
        value={dosage}
        onChangeText={setDosage}
        placeholder="Dosagem (ex: 1 comprimido, 10mg)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Horários (lembrete por notificação)
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={timeText}
            onChangeText={setTimeText}
            placeholder="HH:MM"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            maxLength={5}
            style={[inputStyle, { flex: 1 }]}
          />
          <Pressable
            onPress={addTime}
            disabled={!normalizeTime(timeText)}
            style={{
              backgroundColor: tokens.accent,
              borderRadius: 10,
              paddingHorizontal: 16,
              alignItems: "center",
              justifyContent: "center",
              opacity: normalizeTime(timeText) ? 1 : 0.5,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>+</Text>
          </Pressable>
        </View>
        {times.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {times.map((time) => (
              <Pressable
                key={time}
                onPress={() => setTimes((prev) => prev.filter((t) => t !== time))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, color: tokens.text }}>{time}</Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Tomar em quais dias
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {WEEKDAY_LABELS.map((label, day) => {
            const selected = activeDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 12,
                    color: selected ? tokens.accentText : tokens.textMuted,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Observações (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>
          {active ? "Em uso" : "Pausado (sem lembrete)"}
        </Text>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: tokens.surfaceAlt, true: tokens.accent }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({ name: name.trim(), dosage: dosage.trim(), times, activeDays, notes: notes.trim(), active })
          }
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
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
