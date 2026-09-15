import React from "react";
import { TextInput, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Campo de busca simples pra filtrar listas longas — mesmo visual dos outros TextInput do
 * app, com ícone de lupa e um "x" pra limpar quando tem texto digitado. */
export function SearchInput({ value, onChangeText, placeholder = "Buscar" }: SearchInputProps) {
  const { tokens } = useTheme();

  return (
    <View style={{ justifyContent: "center" }}>
      <Ionicons
        name="search"
        size={17}
        color={tokens.textMuted}
        style={{ position: "absolute", left: 14, zIndex: 1 }}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 14,
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingLeft: 38,
          paddingRight: value.length > 0 ? 38 : 14,
          paddingVertical: 10,
          minWidth: 0,
        }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={{ position: "absolute", right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
        >
          <Ionicons name="close-circle" size={18} color={tokens.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
