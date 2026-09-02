import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { formatCurrency, formatHistoryDate, type AccountHistoryEntry, type FinancialAccount } from "@/lib/financas";

type MovePatch = { accountId?: string | null; transferToAccountId?: string | null };

type AccountHistoryRowProps = {
  entry: AccountHistoryEntry;
  accounts: FinancialAccount[];
  onMove: (patch: MovePatch) => void;
  isMoving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  isFirst: boolean;
};

/** Linha de um lançamento dentro do histórico de uma conta — dá pra
 * editar (mover pra outra conta, ou os dois lados se for transferência) ou excluir direto
 * dali, sem precisar ir até Finanças achar o lançamento de novo. */
export function AccountHistoryRow({
  entry,
  accounts,
  onMove,
  isMoving,
  onDelete,
  isDeleting,
  isFirst,
}: AccountHistoryRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<string | null>(entry.account_id);
  const [toAccountId, setToAccountId] = useState<string | null>(entry.transfer_to_account_id);
  const isTransfer = entry.kind === "transfer";

  function startEdit() {
    setFromAccountId(entry.account_id);
    setToAccountId(entry.transfer_to_account_id);
    setIsEditing(true);
  }

  function save() {
    if (isTransfer) {
      onMove({ accountId: fromAccountId, transferToAccountId: toAccountId });
    } else {
      onMove({ accountId: fromAccountId });
    }
    setIsEditing(false);
  }

  function accountChips(selected: string | null, onSelect: (id: string | null) => void) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Pressable
          onPress={() => onSelect(null)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: selected === null ? tokens.accent : tokens.surfaceAlt,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.bodyMedium,
              fontSize: 11.5,
              color: selected === null ? tokens.accentText : tokens.textMuted,
            }}
          >
            Nenhuma
          </Text>
        </Pressable>
        {accounts.map((acc) => (
          <Pressable
            key={acc.id}
            onPress={() => onSelect(acc.id)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: selected === acc.id ? tokens.accent : tokens.surfaceAlt,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 11.5,
                color: selected === acc.id ? tokens.accentText : tokens.textMuted,
              }}
            >
              {acc.name}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (isEditing) {
    return (
      <View
        style={{
          gap: 10,
          paddingVertical: 10,
          borderTopWidth: isFirst ? 0 : 1,
          borderTopColor: tokens.border,
        }}
      >
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {entry.description || entry.category} · {formatCurrency(Math.abs(entry.signedAmount))}
        </Text>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.textMuted }}>
            {isTransfer ? "Conta de origem" : "Mover pra conta"}
          </Text>
          {accountChips(fromAccountId, setFromAccountId)}
        </View>
        {isTransfer ? (
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.textMuted }}>
              Conta de destino
            </Text>
            {accountChips(toAccountId, setToAccountId)}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 14, justifyContent: "flex-end" }}>
          <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
              Cancelar
            </Text>
          </Pressable>
          <Pressable onPress={save} disabled={isMoving} hitSlop={8}>
            {isMoving ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12.5, color: tokens.accent }}>
                Salvar
              </Text>
            )}
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
        paddingVertical: 7,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: tokens.border,
      }}
    >
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 11.5, color: tokens.textMuted, width: 60 }}>
        {formatHistoryDate(entry.occurred_at)}
      </Text>
      <Text
        style={{ flex: 1, minWidth: 0, fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text }}
        numberOfLines={1}
      >
        {isTransfer
          ? `${entry.signedAmount >= 0 ? "Transferência recebida" : "Transferência enviada"}${entry.description ? ` · ${entry.description}` : ""}`
          : entry.description || entry.category}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 12.5,
          color: entry.signedAmount >= 0 ? tokens.success : tokens.danger,
        }}
      >
        {entry.signedAmount >= 0 ? "+" : "-"}
        {formatCurrency(Math.abs(entry.signedAmount))}
      </Text>
      {isDeleting ? (
        <ActivityIndicator size="small" color={tokens.textMuted} />
      ) : (
        <>
          <Pressable onPress={startEdit} hitSlop={8}>
            <Text style={{ fontSize: 13 }}>✎</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontSize: 13, color: tokens.textMuted }}>✕</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
