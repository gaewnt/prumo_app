import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS, type ChecklistCategory } from "@/lib/viagens";

type NewChecklistItemFormProps = {
  onSubmit: (title: string, category: ChecklistCategory) => void;
  isSaving: boolean;
};

export function NewChecklistItemForm({ onSubmit, isSaving }: NewChecklistItemFormProps) {
  const { tokens } = useTheme();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>("documentos");

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit(title.trim(), category);
    setTitle("");
  }

  return (
    <View style={{ gap: 8 }}>
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
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
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
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Adicionar item (ex: Passaporte)"
          placeholderTextColor={tokens.textMuted}
          onSubmitEditing={handleSubmit}
          style={{
            flex: 1,
            fontFamily: fontFamily.body,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={isSaving || !title.trim()}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
            opacity: isSaving || !title.trim() ? 0.5 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={tokens.accentText} />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.accentText }}>+</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
