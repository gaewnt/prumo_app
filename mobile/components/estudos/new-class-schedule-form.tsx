import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SubjectChipPicker } from "@/components/estudos/subject-chip-picker";
import { CLASS_REMINDER_OPTIONS, type Subject, type SubjectColorKey, type ClassScheduleInput } from "@/lib/estudos";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

type NewClassScheduleFormProps = {
  subjects: Subject[];
  initial?: ClassScheduleInput & { subjectId: string };
  submitLabel?: string;
  onSubmit: (subjectId: string, input: ClassScheduleInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  colorFor: (colorKey: SubjectColorKey) => string;
};

function isValidTime(text: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function NewClassScheduleForm({
  subjects,
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
  colorFor,
}: NewClassScheduleFormProps) {
  const { tokens } = useTheme();
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subjectId ?? subjects[0]?.id ?? null);
  const [weekday, setWeekday] = useState<number>(initial?.weekday ?? 1);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(
    initial?.reminderMinutesBefore ?? null
  );

  const startIsValid = isValidTime(startTime);
  const endIsValid = endTime.trim().length === 0 || isValidTime(endTime);
  const isValid = !!subjectId && startIsValid && endIsValid;

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
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      }}
    >
      {subjects.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Matéria</Text>
          <SubjectChipPicker subjects={subjects} selectedId={subjectId} onSelect={setSubjectId} colorFor={colorFor} />
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Dia da semana</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {WEEKDAY_OPTIONS.map((option) => {
            const selected = weekday === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setWeekday(option.value)}
                style={{
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  minWidth: 44,
                  alignItems: "center",
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

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="Início (HH:MM)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!startIsValid && startTime.trim() ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use HH:MM.</Text>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            placeholder="Fim (opcional)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!endIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use HH:MM.</Text>
          ) : null}
        </View>
      </View>

      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Local (opcional, ex: Bloco B, sala 12)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Lembrete</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CLASS_REMINDER_OPTIONS.map((option) => {
            const selected = reminderMinutesBefore === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => setReminderMinutesBefore(option.value)}
                style={{
                  backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            subjectId &&
            onSubmit(subjectId, {
              weekday,
              startTime: startTime.trim(),
              endTime: endTime.trim(),
              location: location.trim(),
              reminderMinutesBefore,
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
