import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { ACCOUNT_KIND_LABELS, type AccountKind, type CategoryColorKey } from "@/lib/financas";
import { ColorSwatchPicker } from "@/components/financas/color-swatch-picker";

const ACCOUNT_KINDS = Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[];

type AccountFormInput = {
  name: string;
  kind: AccountKind;
  initialBalance: number;
  colorKey: CategoryColorKey;
};

type NewAccountFormProps = {
  /** Preenche o formulário com uma conta existente — usado na edição. */
  initial?: AccountFormInput;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  isSaving: boolean;
  onSubmit: (input: AccountFormInput) => void;
  onCancel: () => void;
};

export function NewAccountForm({
  initial,
  submitLabel = "Salvar",
  isSaving,
  onSubmit,
  onCancel,
}: NewAccountFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? "conta");
  const [balanceText, setBalanceText] = useState(
    initial ? String(initial.initialBalance).replace(".", ",") : ""
  );
  const [colorKey, setColorKey] = useState<CategoryColorKey>(initial?.colorKey ?? "accent");

  const isValid = name.trim().length > 0;

  function handleSubmit() {
    const parsedBalance = Number(balanceText.replace(",", "."));
    onSubmit({
      name: name.trim(),
      kind,
      initialBalance: Number.isFinite(parsedBalance) && balanceText.trim() ? parsedBalance : 0,
      colorKey,
    });
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
        placeholder="Nome da conta (ex: Nubank, Carteira)"
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ACCOUNT_KINDS.map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.textMuted,
                }}
              >
                {ACCOUNT_KIND_LABELS[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={balanceText}
        onChangeText={setBalanceText}
        placeholder="Saldo inicial (ex: 1200,00)"
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

      <ColorSwatchPicker selected={colorKey} onSelect={setColorKey} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
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
