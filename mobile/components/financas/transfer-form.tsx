import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { FinancialAccount } from "@/lib/financas";

type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
};

type TransferFormProps = {
  accounts: FinancialAccount[];
  isSaving: boolean;
  onSubmit: (input: TransferInput) => void;
  onCancel: () => void;
  /** Preenche com a transferência já lançada — usado pra editar. */
  initial?: TransferInput;
  submitLabel?: string;
};

export function TransferForm({ accounts, isSaving, onSubmit, onCancel, initial, submitLabel }: TransferFormProps) {
  const { tokens } = useTheme();
  const [fromAccountId, setFromAccountId] = useState<string | null>(initial?.fromAccountId || null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.toAccountId || null);
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [description, setDescription] = useState(initial?.description ?? "");

  if (accounts.length < 2) {
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
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
          Você precisa de pelo menos 2 contas ativas pra transferir entre elas.
        </Text>
        <Pressable onPress={onCancel} style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Fechar
          </Text>
        </Pressable>
      </View>
    );
  }

  const amount = Number(amountText.replace(",", "."));
  const isValid =
    !!fromAccountId && !!toAccountId && fromAccountId !== toAccountId && amount > 0;

  function renderChips(options: FinancialAccount[], selectedId: string | null, onSelect: (id: string) => void) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((acc) => {
          const selected = acc.id === selectedId;
          return (
            <Pressable
              key={acc.id}
              onPress={() => onSelect(acc.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
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
                {acc.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
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
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
          De:
        </Text>
        {renderChips(accounts, fromAccountId, (id) => {
          setFromAccountId(id);
          if (toAccountId === id) setToAccountId(null);
        })}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
          Para:
        </Text>
        {renderChips(
          accounts.filter((acc) => acc.id !== fromAccountId),
          toAccountId,
          setToAccountId
        )}
      </View>

      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Valor (ex: 100,00)"
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

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição (opcional)"
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({ fromAccountId: fromAccountId!, toAccountId: toAccountId!, amount, description })
          }
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
              {submitLabel ?? "Salvar"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
