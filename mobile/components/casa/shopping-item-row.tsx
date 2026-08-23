import React, { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { ShoppingItem } from "@/lib/casa";

type ShoppingItemRowProps = {
  item: ShoppingItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (name: string, quantity: string) => void;
  onToggleChecked: () => void;
  onDelete: () => void;
};

export function ShoppingItemRow({
  item,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onToggleChecked,
  onDelete,
}: ShoppingItemRowProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as const;

  if (isEditing) {
    return (
      <View
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={name} onChangeText={setName} style={[inputStyle, { flex: 2 }]} />
          <TextInput value={quantity} onChangeText={setQuantity} style={[inputStyle, { flex: 1 }]} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={() => name.trim() && onUpdate(name.trim(), quantity.trim())}
            hitSlop={8}
            disabled={!name.trim()}
          >
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
      <Pressable
        onPress={onToggleChecked}
        hitSlop={8}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: item.checked ? tokens.accent : tokens.border,
          backgroundColor: item.checked ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.checked ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
      </Pressable>

      <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text
          style={{
            fontFamily: fontFamily.body,
            fontSize: 14.5,
            color: item.checked ? tokens.textMuted : tokens.text,
            textDecorationLine: item.checked ? "line-through" : "none",
          }}
        >
          {item.name}
        </Text>
        {item.quantity ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {item.quantity}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={onStartEdit} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.accent }}>Editar</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>✕</Text>
      </Pressable>
    </View>
  );
}
