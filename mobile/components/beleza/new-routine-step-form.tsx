import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import type { BeautyProduct, RoutinePeriod, RoutineStepInput } from "@/lib/beleza";

type NewRoutineStepFormProps = {
  products: BeautyProduct[];
  initial?: RoutineStepInput;
  submitLabel?: string;
  onSubmit: (input: RoutineStepInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function NewRoutineStepForm({
  products,
  initial,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  isSaving,
}: NewRoutineStepFormProps) {
  const { tokens } = useTheme();
  const [period, setPeriod] = useState<RoutinePeriod>(initial?.period ?? "manha");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [productId, setProductId] = useState<string | null>(initial?.productId ?? null);

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const isValid = title.trim().length > 0;

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
        {(["manha", "noite"] as RoutinePeriod[]).map((p) => {
          const selected = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 13,
                  color: selected ? tokens.accentText : tokens.text,
                }}
              >
                {p === "manha" ? "☀️ Manhã" : "🌙 Noite"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Passo (ex: Limpeza facial, Hidratante)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      {products.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            Produto ligado (opcional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => setProductId(null)}
              style={{
                backgroundColor: productId === null ? tokens.accent : tokens.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 12.5,
                  color: productId === null ? tokens.accentText : tokens.textMuted,
                }}
              >
                Nenhum
              </Text>
            </Pressable>
            {products.map((product) => {
              const selected = productId === product.id;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => setProductId(product.id)}
                  style={{
                    backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamily.bodyMedium,
                      fontSize: 12.5,
                      color: selected ? tokens.accentText : tokens.text,
                    }}
                  >
                    {product.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit({ period, title: title.trim(), productId })}
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
