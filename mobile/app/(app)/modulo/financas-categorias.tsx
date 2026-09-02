import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ColorSwatchPicker } from "@/components/financas/color-swatch-picker";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  CATEGORY_PRESETS,
  fetchCustomCategories,
  addCustomCategory,
  updateCustomCategory,
  removeCustomCategory,
  categoryColor,
  type CustomCategory,
  type CategoryColorKey,
} from "@/lib/financas";

/** Categorias fixas do app não podem ser excluídas — só as criadas pela própria pessoa. */
export default function FinancasCategoriasScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [openForm, setOpenForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✳️");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("chart1");
  const [removingName, setRemovingName] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["financas-custom-categories", userId],
    queryFn: fetchCustomCategories,
    enabled: !!userId,
  });
  const customCategories = query.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["financas-custom-categories", userId] });
  }

  const addMutation = useMutation({
    mutationFn: (category: CustomCategory) => addCustomCategory(userId!, customCategories, category),
    onSuccess: () => {
      setOpenForm(false);
      setName("");
      setEmoji("✳️");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ oldName, updated }: { oldName: string; updated: CustomCategory }) =>
      updateCustomCategory(userId!, customCategories, oldName, updated),
    onSuccess: () => {
      setEditingName(null);
      setName("");
      setEmoji("✳️");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (categoryName: string) => removeCustomCategory(userId!, customCategories, categoryName),
    onMutate: (categoryName) => setRemovingName(categoryName),
    onSettled: () => {
      setRemovingName(null);
      invalidate();
    },
  });

  // Nomes reservados pra categorias geradas automaticamente pelo próprio app (transferência,
  // fatura de cartão, renda fixa) — criar uma categoria com esse nome sobrescreveria o
  // emoji/cor delas pro resto da sessão.
  const RESERVED_NAMES = ["Transferência", "Fatura do cartão", "Renda fixa"];
  const trimmedName = name.trim();
  const isValid =
    trimmedName.length > 0 &&
    !CATEGORY_PRESETS.includes(trimmedName as any) &&
    !RESERVED_NAMES.some((r) => r.toLowerCase() === trimmedName.toLowerCase()) &&
    !customCategories.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.name !== editingName
    );

  function startEdit(c: CustomCategory) {
    setOpenForm(false);
    setEditingName(c.name);
    setName(c.name);
    setEmoji(c.emoji);
    setColorKey(c.colorKey);
  }

  function cancelForms() {
    setOpenForm(false);
    setEditingName(null);
    setName("");
    setEmoji("✳️");
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
          <Text style={{ fontSize: 32 }}>🗂️</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Categorias
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            As categorias padrão já vêm prontas — crie outras só se precisar.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar suas categorias agora. Tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.textMuted }}>
                PADRÃO DO APP
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORY_PRESETS.map((c) => (
                  <View
                    key={c}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: tokens.surfaceAlt,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: categoryColor(tokens, c),
                      }}
                    />
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text }}>
                      {c}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.textMuted }}>
                  SUAS CATEGORIAS
                </Text>
                <Pressable
                  onPress={() => {
                    if (openForm || editingName) {
                      cancelForms();
                    } else {
                      setOpenForm(true);
                    }
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {openForm || editingName ? "Cancelar" : "+ Nova categoria"}
                  </Text>
                </Pressable>
              </View>

              {openForm || editingName ? (
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
                  {editingName ? (
                    <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12.5, color: tokens.textMuted }}>
                      Editando "{editingName}"
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={emoji}
                      onChangeText={setEmoji}
                      placeholder="🙂"
                      placeholderTextColor={tokens.textMuted}
                      maxLength={2}
                      style={{
                        fontFamily: fontFamily.body,
                        fontSize: 18,
                        color: tokens.text,
                        backgroundColor: tokens.surfaceAlt,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        width: 60,
                        textAlign: "center",
                      }}
                    />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Nome da categoria"
                      placeholderTextColor={tokens.textMuted}
                      style={{
                        flex: 1,
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

                  <ColorSwatchPicker selected={colorKey} onSelect={setColorKey} />

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable onPress={cancelForms} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>
                        Cancelar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (editingName) {
                          updateMutation.mutate({
                            oldName: editingName,
                            updated: { name: name.trim(), emoji: emoji.trim() || "✳️", colorKey },
                          });
                        } else {
                          addMutation.mutate({ name: name.trim(), emoji: emoji.trim() || "✳️", colorKey });
                        }
                      }}
                      disabled={addMutation.isPending || updateMutation.isPending || !isValid}
                      style={{
                        flex: 1,
                        backgroundColor: tokens.accent,
                        borderRadius: 10,
                        paddingVertical: 12,
                        alignItems: "center",
                        opacity: addMutation.isPending || updateMutation.isPending || !isValid ? 0.6 : 1,
                      }}
                    >
                      {addMutation.isPending || updateMutation.isPending ? (
                        <ActivityIndicator color={tokens.accentText} />
                      ) : (
                        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                          Salvar
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {customCategories.length === 0 && !openForm && !editingName ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma categoria própria ainda.
                </Text>
              ) : (
                customCategories.map((c) => (
                  <View
                    key={c.name}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                      borderWidth: 1,
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: tokens[c.colorKey],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                      {c.name}
                    </Text>
                    <Pressable onPress={() => startEdit(c)} hitSlop={8}>
                      <Text style={{ fontSize: 14 }}>✎</Text>
                    </Pressable>
                    {removingName === c.name && removeMutation.isPending ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <Pressable onPress={() => removeMutation.mutate(c.name)} hitSlop={8}>
                        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                          Excluir
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
