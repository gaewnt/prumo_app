import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  CATEGORY_PRESETS,
  maskDateInput,
  maskTimeInput,
  parseMaskedDate,
  isValidMaskedTime,
  type TransactionKind,
  type FinancialAccount,
  type CreditCard,
  type FinancialTag,
} from "@/lib/financas";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";

type TransactionInput = {
  kind: TransactionKind;
  category: string;
  amount: number;
  description: string;
  accountId?: string | null;
  cardId?: string | null;
  tagIds?: string[];
  /** "YYYY-MM-DD" — quando omitido, usa a data de hoje. */
  occurredAt?: string;
  /** "HH:MM", opcional. */
  occurredTime?: string | null;
};

/** "YYYY-MM-DD" -> "DD/MM/AAAA", pra preencher o campo de data já mascarado. */
function isoToMaskedDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function nowMaskedDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function nowMaskedTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type NewTransactionFormProps = {
  /** Preenche o formulário com um lançamento existente — usado na edição. */
  initial?: TransactionInput;
  /** "Salvar" ao criar, "Salvar alterações" ao editar. */
  submitLabel?: string;
  onSubmit: (input: TransactionInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Categorias disponíveis no grid — padrão + as que a pessoa criou. Se não vier, usa só os presets. */
  allCategories?: readonly string[];
  /** Contas ativas — pra marcar de onde saiu/entrou o dinheiro (opcional). */
  accounts?: FinancialAccount[];
  /** Cartões ativos — só faz sentido pra despesa (opcional). */
  cards?: CreditCard[];
  /** Tags cadastradas — multi-seleção (opcional). */
  tags?: FinancialTag[];
  /** Descrições de lançamentos recentes — alimenta o autocompletar. */
  recentDescriptions?: string[];
  /** Pré-seleciona um cartão como forma de pagamento (usado pelo
   * atalho "+ Lançar despesa" direto na tela do cartão, em `financas-cartao.tsx`). Só
   * tem efeito quando `initial` não é passado (edição sempre usa o que já foi salvo). */
  defaultCardId?: string;
};

/** Só aceita dígitos, vírgula, ponto, os operadores básicos, parênteses e espaço — evita
 * passar qualquer coisa pro avaliador. */
const SAFE_EXPRESSION = /^[0-9+\-*\/.,() ]+$/;

function evaluateExpression(expression: string): number | null {
  if (!SAFE_EXPRESSION.test(expression)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expression.replace(/,/g, ".")})`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

type PaymentMethod = { type: "account" | "card"; id: string } | null;

export function NewTransactionForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
  allCategories = CATEGORY_PRESETS,
  accounts = [],
  cards = [],
  tags = [],
  recentDescriptions = [],
  defaultCardId,
}: NewTransactionFormProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind === "income" ? "income" : "expense");
  const [category, setCategory] = useState<string>(initial?.category ?? allCategories[0] ?? "Outros");
  const [amountText, setAmountText] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [expression, setExpression] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.cardId
      ? { type: "card", id: initial.cardId }
      : initial?.accountId
        ? { type: "account", id: initial.accountId }
        : !initial && defaultCardId
          ? { type: "card", id: defaultCardId }
          : null
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initial?.tagIds ?? []);
  // Data/hora do gasto/receita — antes não existia esse campo, todo lançamento virava
  // "agora" na hora de salvar. Hora fica opcional (nem todo mundo quer ser tão específico).
  const [dateText, setDateText] = useState(initial?.occurredAt ? isoToMaskedDate(initial.occurredAt) : nowMaskedDate());
  const [timeText, setTimeText] = useState(
    initial?.occurredTime ? initial.occurredTime : initial ? "" : nowMaskedTime()
  );

  const amount = Number(amountText.replace(",", "."));
  const occurredAt = parseMaskedDate(dateText);
  const timeValid = timeText.trim().length === 0 || isValidMaskedTime(timeText);
  const isValid = category.trim().length > 0 && amount > 0 && occurredAt !== null && timeValid;

  const descriptionMatches =
    descriptionFocused && description.trim().length >= 2
      ? recentDescriptions
          .filter((d) => d.toLowerCase().includes(description.trim().toLowerCase()) && d !== description)
          .slice(0, 5)
      : [];

  function toggleTag(id: string) {
    setSelectedTagIds((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  function handleApplyCalculator() {
    const result = evaluateExpression(expression);
    if (result !== null) {
      setAmountText(result.toFixed(2).replace(".", ","));
      setShowCalculator(false);
      setExpression("");
    }
  }

  function handleSubmit() {
    if (!occurredAt) return; // botão já fica desabilitado nesse caso — guarda extra
    onSubmit({
      kind,
      category,
      amount,
      description,
      accountId: paymentMethod?.type === "account" ? paymentMethod.id : null,
      cardId: paymentMethod?.type === "card" ? paymentMethod.id : null,
      tagIds: selectedTagIds,
      occurredAt,
      occurredTime: timeText.trim().length > 0 ? timeText : null,
    });
  }

  function paymentChip(label: string, selected: boolean, onPress: () => void, key: string) {
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
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["expense", "income"] as const).map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => {
                setKind(k);
                setPaymentMethod(null);
              }}
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
                {k === "expense" ? "Despesa" : "Receita"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <CategoryIconGrid categories={allCategories} selected={category} onSelect={setCategory} />

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Valor (ex: 45,90)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              // Mesmo ajuste feito em Casa/Treino/Veículo: sem isso o
              // campo não encolhe abaixo da largura do placeholder e passa da borda da tela.
              minWidth: 0,
              fontFamily: fontFamily.body,
              fontSize: 15,
              color: tokens.text,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <Pressable
            onPress={() => setShowCalculator(!showCalculator)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: showCalculator ? tokens.accent : tokens.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={4}
          >
            <Text style={{ fontSize: 18 }}>🧮</Text>
          </Pressable>
        </View>

        {showCalculator ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={expression}
              onChangeText={setExpression}
              placeholder="Ex: 45,90+12,50*2"
              placeholderTextColor={tokens.textMuted}
              keyboardType="numbers-and-punctuation"
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: fontFamily.mono,
                fontSize: 14,
                color: tokens.text,
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            />
            <Pressable
              onPress={handleApplyCalculator}
              style={{
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: tokens.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                =
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
          Quando
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={dateText}
            onChangeText={(text) => setDateText(maskDateInput(text))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            style={{
              flex: 1.3,
              minWidth: 0,
              fontFamily: fontFamily.mono,
              fontSize: 14,
              color: occurredAt ? tokens.text : tokens.danger,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <TextInput
            value={timeText}
            onChangeText={(text) => setTimeText(maskTimeInput(text))}
            placeholder="HH:MM (opcional)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            maxLength={5}
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: fontFamily.mono,
              fontSize: 14,
              color: timeValid ? tokens.text : tokens.danger,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          onFocus={() => setDescriptionFocused(true)}
          onBlur={() => setTimeout(() => setDescriptionFocused(false), 150)}
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
        {descriptionMatches.length > 0 ? (
          <View
            style={{
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {descriptionMatches.map((match, index) => (
              <Pressable
                key={match + index}
                onPress={() => {
                  setDescription(match);
                  setDescriptionFocused(false);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: tokens.border,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  {match}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {accounts.length > 0 || (kind === "expense" && cards.length > 0) ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
            Conta / cartão (opcional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {paymentChip("Nenhuma", paymentMethod === null, () => setPaymentMethod(null), "none")}
            {accounts.map((acc) =>
              paymentChip(
                acc.name,
                paymentMethod?.type === "account" && paymentMethod.id === acc.id,
                () => setPaymentMethod({ type: "account", id: acc.id }),
                `account-${acc.id}`
              )
            )}
            {kind === "expense"
              ? cards.map((card) =>
                  paymentChip(
                    `💳 ${card.name}`,
                    paymentMethod?.type === "card" && paymentMethod.id === card.id,
                    () => setPaymentMethod({ type: "card", id: card.id }),
                    `card-${card.id}`
                  )
                )
              : null}
          </View>
        </View>
      ) : null}

      {tags.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
            Tags (opcional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: selected ? tokens[tag.color_key] : tokens.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.textMuted,
                    }}
                  >
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

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
