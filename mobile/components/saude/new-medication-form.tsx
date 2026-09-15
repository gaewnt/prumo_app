import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, Switch } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { WEEKDAY_LABELS } from "@/lib/rotina";
import { MEDICATION_FREQUENCY_OPTIONS, type MedicationFrequencyKind } from "@/lib/saude";

type MedicationFormInput = {
  name: string;
  dosage: string;
  times: string[];
  activeDays: number[];
  notes: string;
  active: boolean;
  frequencyKind: MedicationFrequencyKind;
  frequencyIntervalDays: number | null;
  nextDoseDate: string | null;
};

/** Mesmo padrão de data livre "DD/MM/AAAA" já usado em `new-maintenance-schedule-form.tsx`. */
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

function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type NewMedicationFormProps = {
  initial?: MedicationFormInput;
  submitLabel?: string;
  onSubmit: (input: MedicationFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

/**
 * Máscara pro campo de horário — o teclado fica em `number-pad` (só números), então
 * a pessoa não consegue digitar o ":" manualmente. Aqui a gente extrai só os dígitos
 * e insere o ":" sozinho depois do 2º dígito (ex: "0600" -> "06:00").
 */
function maskTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

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
  const [frequencyKind, setFrequencyKind] = useState<MedicationFrequencyKind>(initial?.frequencyKind ?? "diaria");
  const [frequencyIntervalDays, setFrequencyIntervalDays] = useState<number | null>(
    initial?.frequencyIntervalDays ?? null
  );
  const [nextDoseDateText, setNextDoseDateText] = useState(toBrDate(initial?.nextDoseDate ?? null));

  const isDaily = frequencyKind === "diaria";
  const parsedNextDoseDate = nextDoseDateText.trim() ? parseBrDate(nextDoseDateText) : null;
  const nextDoseDateInvalid = nextDoseDateText.trim().length > 0 && parsedNextDoseDate === null;

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
    // Frequência não diária tem só UM horário (o da próxima dose) — cada novo substitui o
    // anterior em vez de acumular, diferente do remédio diário (vários horários por dia).
    setTimes((prev) => (isDaily ? [...prev, normalized].sort() : [normalized]));
    setTimeText("");
  }

  function selectFrequency(kind: MedicationFrequencyKind, intervalDays: number | null) {
    setFrequencyKind(kind);
    setFrequencyIntervalDays(intervalDays);
    if (kind !== "diaria" && times.length > 1) setTimes((prev) => [prev[0]]);
  }

  const isValid = isDaily
    ? name.trim().length > 0 && times.length > 0 && activeDays.length > 0
    : name.trim().length > 0 && times.length > 0 && parsedNextDoseDate !== null;

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
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Frequência</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MEDICATION_FREQUENCY_OPTIONS.map((option) => {
            const selected = frequencyKind === option.kind && frequencyIntervalDays === option.intervalDays;
            return (
              <Pressable
                key={option.label}
                onPress={() => selectFrequency(option.kind, option.intervalDays)}
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
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isDaily ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Próxima dose
          </Text>
          <TextInput
            value={nextDoseDateText}
            onChangeText={(text) => setNextDoseDateText(maskDateInput(text))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            style={inputStyle}
          />
          {nextDoseDateInvalid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>
              Use o formato DD/MM/AAAA.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {isDaily ? "Horários (lembrete por notificação)" : "Horário do lembrete"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={timeText}
            onChangeText={(text) => setTimeText(maskTimeInput(text))}
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

      {isDaily ? (
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
      ) : null}

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
            onSubmit({
              name: name.trim(),
              dosage: dosage.trim(),
              times,
              activeDays: isDaily ? activeDays : [0, 1, 2, 3, 4, 5, 6],
              notes: notes.trim(),
              active,
              frequencyKind,
              frequencyIntervalDays: isDaily ? null : frequencyIntervalDays,
              nextDoseDate: isDaily ? null : parsedNextDoseDate,
            })
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
