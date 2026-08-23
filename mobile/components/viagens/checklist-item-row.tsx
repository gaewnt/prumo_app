import React, { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS, type ChecklistCategory, type TripChecklistItem } from "@/lib/viagens";

type ChecklistItemRowProps = {
  item: TripChecklistItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (title: string, category: ChecklistCategory) => void;
  onToggle: () => void;
  onDelete: () => void;
};

export function ChecklistItemRow({ item, isEditing, onStartEdit, onCancelEdit, onUpdate, onToggle, onDelete }: ChecklistItemRowProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState<ChecklistCategory>(item.category);

  if (isEditing) {
    return (
      <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 10, padding: 10, gap: 8 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={{
            fontFamily: fontFamily.body,
            fontSize: 13.5,
            color: tokens.text,
            backgroundColor: tokens.surface,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHECKLIST_CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: selected ? tokens.accent : tokens.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 11.5,
                    color: selected ? tokens.accentText : tokens.text,
                  }}
                >
                  {CHECKLIST_CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={() => title.trim() && onUpdate(title.trim(), category)} hitSlop={8} disabled={!title.trim()}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: item.done ? tokens.accent : tokens.border,
          backgroundColor: item.done ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.done ? <Text style={{ fontSize: 10, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>
      <Text
        style={{
          flex: 1,
          fontFamily: fontFamily.body,
          fontSize: 13.5,
          color: item.done ? tokens.textMuted : tokens.text,
          textDecorationLine: item.done ? "line-through" : "none",
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.bodyMedium,
          fontSize: 10,
          color: tokens.textMuted,
          backgroundColor: tokens.surfaceAlt,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        {CHECKLIST_CATEGORY_LABELS[item.category].toUpperCase()}
      </Text>
      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
