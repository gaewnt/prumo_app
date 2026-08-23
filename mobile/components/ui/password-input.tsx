import React, { useState } from "react";
import { TextInput, Pressable, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry" | "style" | "placeholderTextColor">;

/** Campo de senha com o mesmo visual dos TextInput do app + botão de olhinho pra mostrar/esconder o texto digitado. */
export function PasswordInput(props: PasswordInputProps) {
  const { tokens } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ justifyContent: "center" }}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingRight: 44,
          paddingVertical: 12,
        }}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={{ position: "absolute", right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Esconder senha" : "Mostrar senha"}
      >
        <Ionicons name={visible ? "eye-off" : "eye"} size={20} color={tokens.textMuted} />
      </Pressable>
    </View>
  );
}
