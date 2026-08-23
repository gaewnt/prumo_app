import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ItemRow } from "@/components/simple-list/item-row";
import { NewItemForm } from "@/components/simple-list/new-item-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { getModuleBySlug } from "@/lib/modules";
import {
  fetchSimpleListItems,
  createSimpleListItem,
  updateSimpleListItem,
  toggleSimpleListItemDone,
  deleteSimpleListItem,
  type SimpleListItemDraft,
} from "@/lib/simple-list";

export type SimpleListScreenConfig = {
  /** Slug do módulo (bate com `lib/modules.ts`) — chave usada na tabela. */
  moduleSlug: string;
  /** Rótulo do campo de grupo. Omitido = módulo não agrupa itens. */
  groupLabel?: string;
  /** Rótulo do campo de data. Omitido = módulo não usa data. */
  dateLabel?: string;
  emptyTitle: string;
  emptySubtitle: string;
};

/**
 * Tela genérica que dá conta dos 10 módulos "simples" — cada arquivo em
 * `app/(app)/modulo/<slug>.tsx` só passa a config abaixo. Ver
 * `mobile/lib/simple-list.ts` pra camada de dados compartilhada.
 */
export function SimpleListScreen({
  moduleSlug,
  groupLabel,
  dateLabel,
  emptyTitle,
  emptySubtitle,
}: SimpleListScreenConfig) {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const module = getModuleBySlug(moduleSlug);

  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const queryKey = ["simple-list", moduleSlug, userId];

  const itemsQuery = useQuery({
    queryKey,
    queryFn: () => fetchSimpleListItems(moduleSlug),
    enabled: !!userId,
  });
  const items = itemsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (draft: SimpleListItemDraft) => createSimpleListItem(userId!, moduleSlug, draft),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: SimpleListItemDraft }) =>
      updateSimpleListItem(id, draft),
    onSuccess: () => {
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleSimpleListItemDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSimpleListItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (!module) {
    return (
      <Screen>
        <Text style={{ fontFamily: fontFamily.body, color: tokens.text }}>Módulo não encontrado.</Text>
      </Screen>
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
          <Text style={{ fontSize: 32 }}>{module.icone}</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            {module.nome}
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            {module.resumo}
          </Text>
        </View>

        {itemsQuery.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : itemsQuery.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar essa lista agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {items.length === 0 && !showForm ? (
              <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 14, padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                  {emptyTitle}
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  {emptySubtitle}
                </Text>
              </View>
            ) : null}

            {items.map((item) =>
              editingItemId === item.id ? (
                <NewItemForm
                  key={item.id}
                  groupLabel={groupLabel}
                  dateLabel={dateLabel}
                  initial={{
                    group_name: item.group_name,
                    title: item.title,
                    notes: item.notes,
                    item_date: item.item_date,
                  }}
                  submitLabel="Salvar alterações"
                  isSaving={updateMutation.isPending}
                  onCancel={() => setEditingItemId(null)}
                  onSubmit={(draft) => updateMutation.mutate({ id: item.id, draft })}
                />
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  showGroup={!!groupLabel}
                  showDate={!!dateLabel}
                  onToggleDone={() => toggleMutation.mutate({ id: item.id, done: !item.done })}
                  onEdit={() => setEditingItemId(item.id)}
                  onDelete={() => deleteMutation.mutate(item.id)}
                />
              )
            )}

            {showForm ? (
              <NewItemForm
                groupLabel={groupLabel}
                dateLabel={dateLabel}
                isSaving={createMutation.isPending}
                onCancel={() => setShowForm(false)}
                onSubmit={(draft) => createMutation.mutate(draft)}
              />
            ) : (
              <Pressable
                onPress={() => setShowForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo item
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
