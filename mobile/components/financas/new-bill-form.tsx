import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";

export type BillFormInput = { name: string; amount: number; dueDate: string; recurring: boolean };

type NewBillFormProps = {
  initial?: { name: string; amount: number; dueDate: string; recurring: boolean };
  submitLabel?: string;
  onSubmit: (input: BillFormInput) => void;
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
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function NewBillForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewBillFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [dateText, setDateText] = useState(toBrDate(initial?.dueDate ?? addDays(7)));
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);

  const amount = Number(amountText.replace(",", "."));
  const parsedDate = parseBrDate(dateText);
  const isValid = name.trim().length > 0 && amount > 0 && parsedDate !== null;

  function presetValue(days: number) {
    return toBrDate(addDays(days));
  }

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
            { label: "Em 7 dias", value: presetValue(7) },
            { label: "Em 15 dias", value: presetValue(15) },
            { label: "Em 30 dias", value: presetValue(30) },
          ].map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => setDateText(preset.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: dateText === preset.value ? tokens.accentMuted : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: 12,
                  color: dateText === preset.value ? tokens.accent : tokens.textMuted,
                }}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          maxLength={10}
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
          onPress={() => {
            if (!parsedDate) return;
            onSubmit({ name: name.trim(), amount, dueDate: parsedDate, recurring });
          }}
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
