import React, { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SUBJECT_COLOR_KEYS, type Subject, type SubjectColorKey } from "@/lib/estudos";

type SubjectRowProps = {
  subject: Subject;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (name: string, colorKey: SubjectColorKey) => void;
  onDelete: () => void;
  colorFor: (colorKey: SubjectColorKey) => string;
};

export function SubjectRow({ subject, isEditing, onStartEdit, onCancelEdit, onUpdate, onDelete, colorFor }: SubjectRowProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(subject.name);
  const [colorKey, setColorKey] = useState<SubjectColorKey>(subject.color_key);

  if (isEditing) {
    return (
      <View
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          gap: 10,
        }}
      >
        <TextInput
          value={name}
          onChangeText={setName}
          style={{
            fontFamily: fontFamily.body,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SUBJECT_COLOR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setColorKey(key)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colorFor(key),
                borderWidth: colorKey === key ? 2 : 0,
                borderColor: tokens.text,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={() => name.trim() && onUpdate(name.trim(), colorKey)} hitSlop={8} disabled={!name.trim()}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorFor(subject.color_key) }} />
      <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 14.5, color: tokens.text }}>
        {subject.name}
      </Text>
      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>Excluir</Text>
      </Pressable>
    </View>
  );
}
