import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CARE_EVENT_KINDS, CARE_EVENT_KIND_LABELS, REMINDER_OFFSET_OPTIONS, type CareEventInput, type CareEventKind } from "@/lib/pet";

type NewCareEventFormProps = {
  initial?: CareEventInput;
  submitLabel?: string;
  onSubmit: (input: CareEventInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function toBrDate(date: Date | null): string {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function toHm(date: Date | null): string {
  if (!date) return "";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateText.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, d, m, y] = dateMatch;
  const [, h, min] = timeMatch;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function NewCareEventForm({ initial, submitLabel = "Agendar", onSubmit, onCancel, isSaving }: NewCareEventFormProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<CareEventKind>(initial?.kind ?? "vacina");
  const [dateText, setDateText] = useState(toBrDate(initial?.scheduledAt ?? null));
  const [timeText, setTimeText] = useState(toHm(initial?.scheduledAt ?? null));
  const [reminderOffset, setReminderOffset] = useState<number | null>(initial?.reminderOffsetMinutes ?? 1440);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const scheduledAt = parseDateTime(dateText, timeText);
  const isValid = scheduledAt !== null;

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
        {CARE_EVENT_KINDS.map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: selected ? tokens.accent : tokens.surfaceAlt }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: selected ? tokens.accentText : tokens.text }}>
                {CARE_EVENT_KIND_LABELS[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={[inputStyle, { flex: 1 }]}
        />
        <TextInput
          value={timeText}
          onChangeText={setTimeText}
          placeholder="HH:MM"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          maxLength={5}
          style={[inputStyle, { width: 90 }]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Lembrete</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {REMINDER_OFFSET_OPTIONS.map((option) => {
            const selected = reminderOffset === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => setReminderOffset(option.value)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: selected ? tokens.accent : tokens.surfaceAlt }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: selected ? tokens.accentText : tokens.text }}>
                  {option.label}
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => scheduledAt && onSubmit({ kind, scheduledAt, reminderOffsetMinutes: reminderOffset, notes: notes.trim() })}
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
