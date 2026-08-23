import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";

type NewBillFormProps = {
  onSubmit: (input: { name: string; amount: number; dueDate: string; recurring: boolean }) => void;
  onCancel: () => void;
  isSaving: boolean;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function NewBillForm({ onSubmit, onCancel, isSaving }: NewBillFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [dueDate, setDueDate] = useState(addDays(7));
  const [recurring, setRecurring] = useState(false);

  const amount = Number(amountText.replace(",", "."));
  const isValid = name.trim().length > 0 && amount > 0 && DATE_REGEX.test(dueDate);

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
        value={name}
        onChangeText={setName}
        placeholder="Nome da conta (ex: Aluguel, Internet)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Valor (ex: 120,00)"
        placeholderTextColor={tokens.textMuted}
        keyboardType="decimal-pad"
        style={{
          fontFamily: fontFamily.body,
          fontSize: 15,
          color: tokens.text,
          backgroundColor: tokens.surfaceAlt,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Vencimento
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { label: "Em 7 dias", value: addDays(7) },
            { label: "Em 15 dias", value: addDays(15) },
            { label: "Em 30 dias", value: addDays(30) },
          ].map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => setDueDate(preset.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: dueDate === preset.value ? tokens.accentMuted : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: 12,
                  color: dueDate === preset.value ? tokens.accent : tokens.textMuted,
                }}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={tokens.textMuted}
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
      </View>

      <Pressable
        onPress={() => setRecurring((r) => !r)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: recurring ? tokens.accent : tokens.border,
            backgroundColor: recurring ? tokens.accent : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {recurring ? <Text style={{ fontSize: 12, color: tokens.accentText }}>✓</Text> : null}
        </View>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>
          Conta recorrente (todo mês)
        </Text>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ name: name.trim(), amount, dueDate, recurring })}
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
              Salvar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
