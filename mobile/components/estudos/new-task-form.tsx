import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SubjectChipPicker } from "@/components/estudos/subject-chip-picker";
import { TASK_REMINDER_OPTIONS, type Subject, type SubjectColorKey, type StudyTaskInput } from "@/lib/estudos";

type NewTaskFormProps = {
  subjects: Subject[];
  initial?: StudyTaskInput;
  submitLabel?: string;
  onSubmit: (input: StudyTaskInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  colorFor: (colorKey: SubjectColorKey) => string;
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

export function NewTaskForm({
  subjects,
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
  colorFor,
}: NewTaskFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subjectId ?? null);
  const [dateText, setDateText] = useState(toBrDate(initial?.dueDate ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(initial?.reminderDaysBefore ?? null);

  const dateIsValid = dateText.trim().length === 0 || parseBrDate(dateText) !== null;
  const isValid = title.trim().length > 0 && dateIsValid;

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
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Tarefa ou prova (ex: Simulado de Direito)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      {subjects.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Matéria</Text>
          <SubjectChipPicker subjects={subjects} selectedId={subjectId} onSelect={setSubjectId} allowNone colorFor={colorFor} />
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="Prazo (opcional, DD/MM/AAAA)"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
        {!dateIsValid ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>
            Use o formato DD/MM/AAAA.
          </Text>
        ) : null}
      </View>

      {dateIsValid && dateText.trim() ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Lembrete</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TASK_REMINDER_OPTIONS.map((option) => {
              const selected = reminderDaysBefore === option.value;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => setReminderDaysBefore(option.value)}
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
      ) : null}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
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
          onPress={() =>
            onSubmit({
              title: title.trim(),
              subjectId,
              dueDate: dateText.trim() ? parseBrDate(dateText) : null,
              notes: notes.trim(),
              reminderDaysBefore: dateText.trim() ? reminderDaysBefore : null,
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
