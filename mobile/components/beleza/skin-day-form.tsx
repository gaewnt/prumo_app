import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { SkinLog, SkinLogInput } from "@/lib/beleza";

type Attribute = { key: keyof SkinLogInput & string; label: string };

const ATTRIBUTES: Attribute[] = [
  { key: "overall", label: "Geral" },
  { key: "texture", label: "Textura" },
  { key: "oiliness", label: "Oleosidade" },
  { key: "sensitivity", label: "Sensibilidade" },
  { key: "moisture", label: "Hidratação" },
];

type SkinDayFormProps = {
  dateLabel: string;
  existingLog?: SkinLog;
  onSave: (input: SkinLogInput) => void;
  onDelete: () => void;
  onClose: () => void;
  isSaving: boolean;
};

export function SkinDayForm({ dateLabel, existingLog, onSave, onDelete, onClose, isSaving }: SkinDayFormProps) {
  const { tokens } = useTheme();
  const [values, setValues] = useState<Record<string, number>>({
    overall: existingLog?.overall ?? 3,
    texture: existingLog?.texture ?? 3,
    oiliness: existingLog?.oiliness ?? 3,
    sensitivity: existingLog?.sensitivity ?? 3,
    moisture: existingLog?.moisture ?? 3,
  });
  const [notes, setNotes] = useState(existingLog?.notes ?? "");

  return (
    <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 12, padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
        Pele — {dateLabel}
      </Text>

      {ATTRIBUTES.map((attr) => (
        <View key={attr.key} style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>{attr.label}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = values[attr.key] === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setValues((prev) => ({ ...prev, [attr.key]: n }))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? tokens.accent : tokens.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.textMuted,
                    }}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Nota (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 13,
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Pressable onPress={onClose} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        {existingLog ? (
          <Pressable onPress={onDelete} style={{ paddingVertical: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>Remover</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() =>
            onSave({
              overall: values.overall,
              texture: values.texture,
              oiliness: values.oiliness,
              sensitivity: values.sensitivity,
              moisture: values.moisture,
              notes: notes.trim(),
            })
          }
          disabled={isSaving}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} size="small" />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
              Salvar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
