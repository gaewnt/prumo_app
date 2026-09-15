import React, { useEffect, useRef, useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { CardRow } from "@/components/financas/card-row";
import { NewCardForm } from "@/components/financas/new-card-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancasExtras,
  fetchCustomCategories,
  allCategoryNames,
  createCard,
  updateCard,
  setCardArchived,
  deleteCard,
  payCardCycle,
  createTransaction,
  createRecurringCharge,
  updateRecurringCharge,
  setRecurringChargeActive,
  deleteRecurringCharge,
  ensureCardRecurringChargesGenerated,
  type CreditCardRecurringCharge,
} from "@/lib/financas";

type OpenForm = "none" | "card";

export default function FinancasCartaoScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState<OpenForm>("none");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  // Atalho "+ Lançar despesa nessa fatura" direto na tela do cartão.
  const [chargingCardId, setChargingCardId] = useState<string | null>(null);
  // Lançamentos fixos (assinaturas) no cartão.
  const [addingRecurringChargeCardId, setAddingRecurringChargeCardId] = useState<string | null>(null);
  const [editingRecurringChargeId, setEditingRecurringChargeId] = useState<string | null>(null);
  const [togglingRecurringChargeId, setTogglingRecurringChargeId] = useState<string | null>(null);
  const [deletingRecurringChargeId, setDeletingRecurringChargeId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });

  // Mesma queryKey usada em `financas.tsx` — cache compartilhado, sem busca duplicada
  // se a pessoa já passou por lá antes.
  const customCategoriesQuery = useQuery({
    queryKey: ["financas-custom-categories", userId],
    queryFn: fetchCustomCategories,
    enabled: !!userId,
  });
  const allCategories = allCategoryNames(customCategoriesQuery.data ?? []);

  const cards = query.data?.cards ?? [];
  const accounts = (query.data?.accounts ?? []).filter((a) => !a.archived);
  const balanceRows = query.data?.balanceRows ?? [];
  const payments = query.data?.cardPayments ?? [];
  const recurringCharges = query.data?.recurringCharges ?? [];
  const activeCards = cards.filter((c) => !c.archived);
  const archivedCards = cards.filter((c) => c.archived);

  function invalidateExtras() {
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  // Gera sozinho, ao abrir a tela, os lançamentos fixos ainda não gerados no ciclo aberto de
  // cada cartão (ver `ensureCardRecurringChargesGenerated`) — é isso que faz a assinatura
  // cair na fatura sem a pessoa precisar relançar todo mês. `hasGenerated` trava contra rodar
  // de novo a cada refetch/invalidate (ex: depois de pagar uma fatura), já que os dados
  // recém-buscados sempre disparam esse efeito de novo.
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (!userId || !query.data || hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;
    ensureCardRecurringChargesGenerated(userId, query.data.cards, query.data.recurringCharges, query.data.balanceRows)
      .then((count) => {
        if (count > 0) invalidateExtras();
      })
      .catch(() => {
        // Falha silenciosa — a próxima abertura da tela tenta gerar de novo, e
        // `hasGeneratedRef` volta a `false` num novo mount do componente.
        hasGeneratedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, query.data]);

  const createCardMutation = useMutation({
    mutationFn: (input: Parameters<typeof createCard>[1]) => createCard(userId!, input),
    onSuccess: () => {
      setOpenForm("none");
      invalidateExtras();
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCard>[1] }) =>
      updateCard(id, input),
    onSuccess: () => {
      setEditingCardId(null);
      invalidateExtras();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setCardArchived(id, archived),
    onMutate: ({ id }) => setSavingCardId(id),
    onSettled: () => {
      setSavingCardId(null);
      invalidateExtras();
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onMutate: (id) => setSavingCardId(id),
    onSettled: () => {
      setSavingCardId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const payCycleMutation = useMutation({
    mutationFn: ({
      cardId,
      input,
    }: {
      cardId: string;
      input: Omit<Parameters<typeof payCardCycle>[1], "cardId">;
    }) => payCardCycle(userId!, { cardId, ...input }),
    onMutate: ({ cardId }) => setPayingCardId(cardId),
    onSettled: () => {
      setPayingCardId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const logChargeMutation = useMutation({
    mutationFn: (input: Parameters<typeof createTransaction>[1]) => createTransaction(userId!, input),
    onSuccess: () => {
      setChargingCardId(null);
      invalidateExtras();
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

  const createRecurringChargeMutation = useMutation({
    mutationFn: (input: Parameters<typeof createRecurringCharge>[1]) => createRecurringCharge(userId!, input),
    onSuccess: () => {
      setAddingRecurringChargeCardId(null);
      invalidateExtras();
    },
  });

  const updateRecurringChargeMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRecurringCharge>[1] }) =>
      updateRecurringCharge(id, input),
    onSuccess: () => {
      setEditingRecurringChargeId(null);
      invalidateExtras();
    },
  });

  const toggleRecurringChargeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setRecurringChargeActive(id, active),
    onMutate: ({ id }) => setTogglingRecurringChargeId(id),
    onSettled: () => {
      setTogglingRecurringChargeId(null);
      invalidateExtras();
    },
  });

  const deleteRecurringChargeMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringCharge(id),
    onMutate: (id) => setDeletingRecurringChargeId(id),
    onSettled: () => {
      setDeletingRecurringChargeId(null);
      invalidateExtras();
    },
  });

  function renderCard(card: (typeof cards)[number]) {
    return (
      <CardRow
        key={card.id}
        card={card}
        accounts={accounts}
        balanceRows={balanceRows}
        payments={payments}
        isSaving={savingCardId === card.id}
        isEditing={editingCardId === card.id}
        onStartEdit={() => setEditingCardId(card.id)}
        onCancelEdit={() => setEditingCardId(null)}
        onUpdate={(input) => updateCardMutation.mutate({ id: card.id, input })}
        isUpdating={updateCardMutation.isPending && editingCardId === card.id}
        onArchiveToggle={() => archiveMutation.mutate({ id: card.id, archived: !card.archived })}
        onDelete={() => deleteCardMutation.mutate(card.id)}
        onPayCycle={(input) => payCycleMutation.mutate({ cardId: card.id, input })}
        isPaying={payingCardId === card.id && payCycleMutation.isPending}
        allCategories={allCategories}
        tags={query.data?.tags ?? []}
        isCharging={chargingCardId === card.id}
        onStartCharge={() => setChargingCardId(card.id)}
        onCancelCharge={() => setChargingCardId(null)}
        onLogCharge={(input) => logChargeMutation.mutate(input)}
        isLoggingCharge={chargingCardId === card.id && logChargeMutation.isPending}
        recurringCharges={recurringCharges}
        isAddingRecurringCharge={addingRecurringChargeCardId === card.id}
        onStartAddRecurringCharge={() => setAddingRecurringChargeCardId(card.id)}
        onCancelAddRecurringCharge={() => setAddingRecurringChargeCardId(null)}
        onCreateRecurringCharge={(input) =>
          createRecurringChargeMutation.mutate({ cardId: card.id, ...input })
        }
        isCreatingRecurringCharge={
          addingRecurringChargeCardId === card.id && createRecurringChargeMutation.isPending
        }
        editingRecurringChargeId={editingRecurringChargeId}
        onStartEditRecurringCharge={(id) => setEditingRecurringChargeId(id)}
        onCancelEditRecurringCharge={() => setEditingRecurringChargeId(null)}
        onUpdateRecurringCharge={(id, input) => updateRecurringChargeMutation.mutate({ id, input })}
        isUpdatingRecurringCharge={updateRecurringChargeMutation.isPending}
        onToggleRecurringChargeActive={(charge: CreditCardRecurringCharge) =>
          toggleRecurringChargeMutation.mutate({ id: charge.id, active: !charge.active })
        }
        togglingRecurringChargeId={togglingRecurringChargeId}
        onDeleteRecurringCharge={(id) => deleteRecurringChargeMutation.mutate(id)}
        deletingRecurringChargeId={deletingRecurringChargeId}
      />
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>💳</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Cartão de crédito
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Faturas por ciclo, sem se perder no fechamento.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                    Meus cartões
                  </Text>
                </View>
                <Pressable onPress={() => setOpenForm(openForm === "card" ? "none" : "card")}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm === "card" ? "Cancelar" : "+ Novo cartão"}
                  </Text>
                </Pressable>
              </View>

              {openForm === "card" ? (
                <NewCardForm
                  isSaving={createCardMutation.isPending}
                  onCancel={() => setOpenForm("none")}
                  onSubmit={(input) => createCardMutation.mutate(input)}
                />
              ) : null}

              {activeCards.length === 0 && openForm !== "card" ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum cartão cadastrado ainda.
                </Text>
              ) : (
                activeCards.map(renderCard)
              )}
            </View>

            {archivedCards.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Cartões arquivados
                </Text>
                {archivedCards.map(renderCard)}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
