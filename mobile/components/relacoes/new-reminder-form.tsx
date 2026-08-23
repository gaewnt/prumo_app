import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { Person, ReminderInput } from "@/lib/relacoes";

type NewReminderFormProps = {
  people: Person[];
  initial?: ReminderInput;
  submitLabel?: string;
  onSubmit: (input: ReminderInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewReminderForm({ people, initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewReminderFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [personId, setPersonId] = useState<string | null>(initial?.personId ?? null);
  const [dateText, setDateText] = useState(toBrDate(initial?.reminderDate ?? ""));
  const [remindMe, setRemindMe] = useState(initial?.remindMe ?? true);
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

  const parsedDate = parseBrDate(dateText);
  const isValid = title.trim().length > 0 && parsedDate !== null;

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
        placeholder="Lembrete (ex: Date night, Ligar pra vó)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      {people.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>Pessoa (opcional)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => setPersonId(null)}
              style={{
                backgroundColor: personId === null ? tokens.accent : tokens.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: personId === null ? tokens.accentText : tokens.textMuted }}>
                Nenhuma
              </Text>
            </Pressable>
            {people.map((person) => {
              const selected = personId === person.id;
              return (
                <Pressable
                  key={person.id}
                  onPress={() => setPersonId(person.id)}
                  style={{
                    backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: selected ? tokens.accentText : tokens.text }}>
                    {person.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="Data (DD/MM/AAAA)"
          placeholderTextColor={tokens.textMuted}
          style={inputStyle}
        />
        {dateText.trim() && !parsedDate ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.danger }}>Use o formato DD/MM/AAAA.</Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => setRemindMe((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: remindMe ? tokens.accent : tokens.border,
            backgroundColor: remindMe ? tokens.accent : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {remindMe ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
        </View>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>Notificar às 9h nesse dia</Text>
      </Pressable>

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
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => parsedDate && onSubmit({ personId, title: title.trim(), reminderDate: parsedDate, remindMe, notes: notes.trim() })}
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
