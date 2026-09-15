import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { CATEGORY_PRESETS, type FinancialAccount, type TransactionKind } from "@/lib/financas";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";

export type RecurringTransactionFormInput = {
  kind: TransactionKind;
  accountId: string | null;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  /** Parcelas restantes — `null` pra recorrência sem fim definido (assinatura, aluguel),
   * um número pra financiamento/parcelamento que tem fim (ex: 24x). */
  installmentsRemaining: number | null;
};

type NewRecurringTransactionFormProps = {
  /** Preenche o formulário com um lançamento fixo já existente — usado na edição. Ao
   * editar, tipo (despesa/receita) e conta não mudam (ver `updateRecurringTransaction`). */
  initial?: RecurringTransactionFormInput;
  isEditing?: boolean;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  isSaving: boolean;
  onSubmit: (input: RecurringTransactionFormInput) => void;
  onCancel: () => void;
  accounts: FinancialAccount[];
  /** Categorias disponíveis no grid — padrão + as que a pessoa criou. */
  allCategories?: readonly string[];
};

function parseDay(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < 1 || n > 28) return null;
  return n;
}

/** Campo opcional — texto vazio é válido e significa "sem parcelas" (`null`). Preenchido,
 * só aceita inteiro positivo. */
function parseInstallments(text: string): { value: number | null; valid: boolean } {
  if (text.trim().length === 0) return { value: null, valid: true };
  if (!/^\d+$/.test(text.trim())) return { value: null, valid: false };
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < 1) return { value: null, valid: false };
  return { value: n, valid: true };
}

export function NewRecurringTransactionForm({
  initial,
  isEditing = false,
  submitLabel = "Salvar",
  isSaving,
  onSubmit,
  onCancel,
  accounts,
  allCategories = CATEGORY_PRESETS,
}: NewRecurringTransactionFormProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? "expense");
  const [accountId, setAccountId] = useState<string | null>(initial?.accountId ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [category, setCategory] = useState<string>(initial?.category ?? allCategories[0] ?? "Outros");
  const [dayText, setDayText] = useState(initial ? String(initial.dayOfMonth) : "");
  const [installmentsText, setInstallmentsText] = useState(
    initial?.installmentsRemaining != null ? String(initial.installmentsRemaining) : ""
  );

  const amount = Number(amountText.replace(",", "."));
  const day = parseDay(dayText);
  const installments = parseInstallments(installmentsText);
  const isValid = name.trim().length > 0 && amount > 0 && day !== null && installments.valid;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({
      kind,
      accountId,
      name: name.trim(),
      amount,
      category,
      dayOfMonth: day!,
      installmentsRemaining: installments.value,
    });
  }

  function chip(label: string, selected: boolean, onPress: () => void, key: string) {
    return (
      <Pressable
        key={key}
        onPress={onPress}
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
            fontSize: 12.5,
            color: selected ? tokens.accentText : tokens.textMuted,
          }}
        >
          {label}
        </Text>
      </Pressable>
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
      {isEditing ? null : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["expense", "income"] as const).map((k) => {
            const selected = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
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
                  {k === "expense" ? "Débito automático" : "Receita recorrente"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={kind === "expense" ? "Nome (ex: Aluguel, Academia)" : "Nome (ex: Aluguel recebido)"}
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

      <CategoryIconGrid categories={allCategories} selected={category} onSelect={setCategory} />

      {accounts.length > 0 && !isEditing ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
            Conta (opcional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chip("Nenhuma", accountId === null, () => setAccountId(null), "none")}
            {accounts.map((acc) => chip(acc.name, accountId === acc.id, () => setAccountId(acc.id), acc.id))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Valor
          </Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Ex: 1200,00"
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
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {kind === "expense" ? "Debita dia" : "Recebe dia"}
          </Text>
          <TextInput
            value={dayText}
            onChangeText={setDayText}
            placeholder="Ex: 5"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
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
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Parcelas restantes (opcional)
        </Text>
        <TextInput
          value={installmentsText}
          onChangeText={setInstallmentsText}
          placeholder="Deixe em branco se não tem fim (ex: assinatura, aluguel)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={{
            fontFamily: fontFamily.body,
            fontSize: 15,
            color: installments.valid ? tokens.text : tokens.danger,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />
        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
          Pra financiamento/parcelamento com fim (ex: 24x). A cada parcela gerada esse número
          desce 1; ao chegar em 0, o lançamento se desativa sozinho.
        </Text>
      </View>

      <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
        A partir de agora, esse lançamento entra sozinho todo mês — sem precisar relançar
        manualmente. Dá pra editar ou excluir uma ocorrência específica depois, se precisar.
      </Text>

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
