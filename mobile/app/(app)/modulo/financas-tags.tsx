import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { NewTagForm } from "@/components/financas/new-tag-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchFinancasExtras, createTag, updateTag, deleteTag, type CategoryColorKey } from "@/lib/financas";

export default function FinancasTagsScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId,
  });

  const tags = query.data?.tags ?? [];

  function invalidateExtras() {
    queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
  }

  const createMutation = useMutation({
    mutationFn: (input: { name: string; colorKey: CategoryColorKey }) => createTag(userId!, input),
    onSuccess: () => {
      setOpenForm(false);
      invalidateExtras();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; colorKey: CategoryColorKey } }) =>
      updateTag(id, input),
    onSuccess: () => {
      setEditingId(null);
      invalidateExtras();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      invalidateExtras();
      // Apagar uma tag remove (on delete cascade) seus vínculos em transaction_tags,
      // o que muda o `tagIds` dos lançamentos buscados por ["financas", userId].
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
    },
  });

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
          <Text style={{ fontSize: 32 }}>🏷️</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Tags
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Marcações livres além da categoria — ex: reembolsável, viagem.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Tags aparecem no formulário de lançamento pra marcar transações — use pra agrupar gastos
              que atravessam categorias.
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setOpenForm(!openForm)}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                  {openForm ? "Cancelar" : "+ Nova tag"}
                </Text>
              </Pressable>
            </View>

            {openForm ? (
              <NewTagForm
                isSaving={createMutation.isPending}
                onSubmit={(input) => createMutation.mutate(input)}
                onCancel={() => setOpenForm(false)}
              />
            ) : null}

            {tags.length === 0 && !openForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhuma tag criada ainda.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {tags.map((tag) =>
                  editingId === tag.id ? (
                    <NewTagForm
                      key={tag.id}
                      initial={{ name: tag.name, colorKey: tag.color_key }}
                      submitLabel="Salvar alterações"
                      isSaving={updateMutation.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(input) => updateMutation.mutate({ id: tag.id, input })}
                    />
                  ) : (
                    <View
                      key={tag.id}
                      style={{
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                        borderWidth: 1,
                        borderRadius: 14,
                        padding: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: tokens[tag.color_key],
                        }}
                      />
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text, flex: 1 }}>
                        {tag.name}
                      </Text>
                      {deletingId === tag.id ? (
                        <ActivityIndicator size="small" color={tokens.accent} />
                      ) : (
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable onPress={() => setEditingId(tag.id)} hitSlop={8}>
                            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>
                              Editar
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => deleteMutation.mutate(tag.id)} hitSlop={8}>
                            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                              Excluir
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
