import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type NewShoppingItemFormProps = {
  onSubmit: (name: string, quantity: string) => void;
  isSaving: boolean;
};

/** Linha de adição rápida, sempre visível no topo da lista — sem esconder atrás de um botão "+ novo". */
export function NewShoppingItemForm({ onSubmit, isSaving }: NewShoppingItemFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name.trim(), quantity.trim());
    setName("");
    setQuantity("");
  }

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Adicionar item (ex: arroz)"
        placeholderTextColor={tokens.textMuted}
        onSubmitEditing={handleSubmit}
        style={[inputStyle, { flex: 2 }]}
      />
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Qtd."
        placeholderTextColor={tokens.textMuted}
        onSubmitEditing={handleSubmit}
        style={[inputStyle, { flex: 1 }]}
      />
      <Pressable
        onPress={handleSubmit}
        disabled={isSaving || !name.trim()}
        style={{
          backgroundColor: tokens.accent,
          borderRadius: 10,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          opacity: isSaving || !name.trim() ? 0.5 : 1,
        }}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={tokens.accentText} />
        ) : (
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 18, color: tokens.accentText }}>+</Text>
        )}
      </Pressable>
    </View>
  );
}
