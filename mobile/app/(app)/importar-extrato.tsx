import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Screen } from "@/components/ui/screen";
import { CategoryIconGrid } from "@/components/financas/category-icon-grid";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchFinancas,
  fetchFinancasExtras,
  fetchCustomCategories,
  allCategoryNames,
  createTransaction,
  formatCurrency,
  formatHistoryDate,
  categoryEmoji,
} from "@/lib/financas";
import { parseStatementFile, isLikelyDuplicate, type ImportedTransaction } from "@/lib/bank-import";

type Step = "picker" | "review" | "done";

const SUPPORTED_EXTENSIONS = ["csv", "ofx", "qfx", "txt"];

/**
 * Lê o conteúdo do arquivo escolhido. Bug corrigido: na versão site, o `DocumentPicker`
 * não devolve um caminho de arquivo de verdade em `asset.uri` (vem um `data:`/`blob:`, já
 * que o navegador não expõe o sistema de arquivos) — e `expo-file-system`'s `File` só sabe
 * ler caminho de arquivo nativo, então `new File(asset.uri).text()` sempre falhava lá,
 * mesmo com um CSV perfeitamente válido (por isso caía direto no erro genérico "Não deu
 * pra ler esse arquivo"). Na web usa o `File` do próprio navegador que o DocumentPicker já
 * devolve (`asset.file`) e, se por algum motivo ele não vier, cai pra um `fetch` na própria
 * URI — funciona tanto pra `blob:` quanto `data:`.
 */
async function readPickedFileText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web") {
    if (asset.file) return asset.file.text();
    const response = await fetch(asset.uri);
    return response.text();
  }
  return new File(asset.uri).text();
}

/** Importar extrato bancário (CSV/OFX) — reduz digitação manual sem custo de Open Finance
 * nem risco de acionar algum bloqueio de segurança do banco (não acessa a conta, só lê um
 * arquivo que a própria pessoa exportou do app/site do banco). Sempre passa por uma revisão
 * antes de salvar qualquer coisa — ver `lib/bank-import.ts` pro porquê. */
export default function ImportarExtratoScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [step, setStep] = useState<Step>("picker");
  const [isPicking, setIsPicking] = useState(false);
  const [pickError, setPickError] = useState("");
  const [parsed, setParsed] = useState<ImportedTransaction[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Categoria padrão (pré-preenche todo lançamento) + overrides por linha — cada lançamento
  // pode ter sua própria categoria em vez de todo mundo cair na mesma (um extrato de um mês
  // inteiro normalmente mistura mercado, transporte, assinatura etc na mesma leva).
  const [defaultCategory, setDefaultCategory] = useState<string>("Outros");
  const [rowCategories, setRowCategories] = useState<Record<number, string>>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  function categoryForRow(index: number): string {
    return rowCategories[index] ?? defaultCategory;
  }

  const financasQuery = useQuery({ queryKey: ["financas", userId], queryFn: fetchFinancas, enabled: !!userId });
  const extrasQuery = useQuery({ queryKey: ["financas-extras", userId], queryFn: fetchFinancasExtras, enabled: !!userId });
  const customCategoriesQuery = useQuery({
    queryKey: ["financas-custom-categories", userId],
    queryFn: fetchCustomCategories,
    enabled: !!userId,
  });
  const allCategories = allCategoryNames(customCategoriesQuery.data ?? []);
  const activeAccounts = (extrasQuery.data?.accounts ?? []).filter((a) => !a.archived);
  const existingTransactions = financasQuery.data?.transactions ?? [];

  const duplicateCount = parsed.filter((t) => isLikelyDuplicate(t, existingTransactions)).length;

  async function handlePickFile() {
    setPickError("");
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const extension = asset.name.toLowerCase().split(".").pop() ?? "";
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        setPickError("Formato não suportado — escolha um arquivo CSV ou OFX exportado do banco.");
        return;
      }
      const content = await readPickedFileText(asset);
      const { transactions, skippedCount: skipped } = parseStatementFile(asset.name, content);
      if (transactions.length === 0) {
        setPickError("Não consegui reconhecer os lançamentos desse arquivo — confira se é um extrato em CSV ou OFX.");
        return;
      }
      setParsed(transactions);
      setSkippedCount(skipped);
      setRowCategories({});
      setExpandedRow(null);
      const preSelected = new Set<number>();
      transactions.forEach((t, i) => {
        if (!isLikelyDuplicate(t, existingTransactions)) preSelected.add(i);
      });
      setSelected(preSelected);
      setStep("review");
    } catch {
      setPickError("Não deu pra ler esse arquivo. Tenta escolher de novo?");
    } finally {
      setIsPicking(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = parsed
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => selected.has(index));
      for (const { row, index } of rows) {
        await createTransaction(userId!, {
          kind: row.kind,
          category: categoryForRow(index),
          amount: row.amount,
          description: row.description,
          accountId,
          occurredAt: row.occurredAt,
        });
      }
      return rows.length;
    },
    onSuccess: (count) => {
      setImportedCount(count);
      queryClient.invalidateQueries({ queryKey: ["financas", userId] });
      queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
      setStep("done");
    },
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>📥</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Importar extrato</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Escolha um arquivo CSV ou OFX exportado do app/site do seu banco — nada é salvo
            sem você revisar e confirmar antes.
          </Text>
        </View>

        {step === "picker" ? (
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={handlePickFile}
              disabled={isPicking}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: isPicking ? 0.6 : 1,
              }}
            >
              {isPicking ? (
                <ActivityIndicator color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                  Escolher arquivo
                </Text>
              )}
            </Pressable>
            {pickError ? (
              <View style={{ backgroundColor: tokens.dangerMuted, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>{pickError}</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              Cada banco exporta num formato um pouco diferente — se o arquivo não for
              reconhecido, confira se ele tem colunas de data, descrição e valor (CSV) ou se é
              um OFX de verdade.
            </Text>
          </View>
        ) : null}

        {step === "review" ? (
          <View style={{ gap: 16 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              {parsed.length} lançamento{parsed.length === 1 ? "" : "s"} encontrado
              {parsed.length === 1 ? "" : "s"}
              {skippedCount > 0 ? ` · ${skippedCount} linha${skippedCount === 1 ? "" : "s"} não reconhecida${skippedCount === 1 ? "" : "s"}` : ""}
              {duplicateCount > 0 ? ` · ${duplicateCount} possível${duplicateCount === 1 ? "" : "eis"} duplicata${duplicateCount === 1 ? "" : "s"} (já desmarcada${duplicateCount === 1 ? "" : "s"})` : ""}
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
                Categoria padrão — toque na categoria de um lançamento aqui embaixo pra mudar só ele
              </Text>
              <CategoryIconGrid categories={allCategories} selected={defaultCategory} onSelect={setDefaultCategory} />
            </View>

            {activeAccounts.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.textMuted }}>
                  Conta (opcional)
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Pressable
                    onPress={() => setAccountId(null)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: accountId === null ? tokens.accent : tokens.surfaceAlt,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.bodyMedium,
                        fontSize: 12.5,
                        color: accountId === null ? tokens.accentText : tokens.textMuted,
                      }}
                    >
                      Nenhuma
                    </Text>
                  </Pressable>
                  {activeAccounts.map((acc) => (
                    <Pressable
                      key={acc.id}
                      onPress={() => setAccountId(acc.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: accountId === acc.id ? tokens.accent : tokens.surfaceAlt,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.bodyMedium,
                          fontSize: 12.5,
                          color: accountId === acc.id ? tokens.accentText : tokens.textMuted,
                        }}
                      >
                        {acc.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              {parsed.map((row, index) => {
                const isSelected = selected.has(index);
                const isDuplicate = isLikelyDuplicate(row, existingTransactions);
                const rowCategory = categoryForRow(index);
                const isExpanded = expandedRow === index;
                return (
                  <View
                    key={index}
                    style={{
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      gap: 10,
                      opacity: isSelected ? 1 : 0.55,
                    }}
                  >
                    <Pressable
                      onPress={() => toggleSelected(index)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 1.5,
                          borderColor: isSelected ? tokens.accent : tokens.border,
                          backgroundColor: isSelected ? tokens.accent : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected ? <Text style={{ color: tokens.accentText, fontSize: 13 }}>✓</Text> : null}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13.5, color: tokens.text }}
                          numberOfLines={1}
                        >
                          {row.description || "(sem descrição)"}
                        </Text>
                        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                          {formatHistoryDate(row.occurredAt)}
                          {isDuplicate ? " · possível duplicata" : ""}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: fontFamily.bodySemibold,
                          fontSize: 13.5,
                          color: row.kind === "income" ? tokens.success : tokens.danger,
                        }}
                      >
                        {row.kind === "income" ? "+" : "-"}
                        {formatCurrency(row.amount)}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setExpandedRow(isExpanded ? null : index)}
                      style={{
                        alignSelf: "flex-start",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: tokens.surfaceAlt,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        marginLeft: 30,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{categoryEmoji(rowCategory)}</Text>
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.textMuted }}>
                        {rowCategory}
                      </Text>
                      <Text style={{ fontSize: 10, color: tokens.textMuted }}>{isExpanded ? "▲" : "▼"}</Text>
                    </Pressable>

                    {isExpanded ? (
                      <View style={{ marginLeft: 30 }}>
                        <CategoryIconGrid
                          categories={allCategories}
                          selected={rowCategory}
                          onSelect={(cat) => {
                            setRowCategories((prev) => ({ ...prev, [index]: cat }));
                            setExpandedRow(null);
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {importMutation.isError ? (
              <View style={{ backgroundColor: tokens.dangerMuted, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.text }}>
                  Não deu pra salvar: {(importMutation.error as Error)?.message ?? "erro desconhecido"}.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => importMutation.mutate()}
              disabled={selected.size === 0 || importMutation.isPending}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: selected.size === 0 || importMutation.isPending ? 0.6 : 1,
              }}
            >
              {importMutation.isPending ? (
                <ActivityIndicator color={tokens.accentText} />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                  Importar {selected.size} selecionado{selected.size === 1 ? "" : "s"}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {step === "done" ? (
          <View style={{ gap: 16 }}>
            <View style={{ backgroundColor: tokens.successMuted, borderRadius: 14, padding: 16, gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                {importedCount} lançamento{importedCount === 1 ? "" : "s"} importado{importedCount === 1 ? "" : "s"}
              </Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Já aparecem no histórico de Finanças, cada um com a categoria escolhida na
                revisão — dá pra editar categoria e conta um por um se precisar.
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.accentText }}>
                Voltar pra Finanças
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
