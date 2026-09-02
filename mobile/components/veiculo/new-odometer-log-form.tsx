import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";

export type NewOdometerLogFormInput = {
  data: string; // "YYYY-MM-DD"
  km_atual: number;
};

type NewOdometerLogFormProps = {
  onSubmit: (input: NewOdometerLogFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Preenche pra editar uma leitura já lançada (ver `OdometerLogRow`). */
  initial?: NewOdometerLogFormInput;
  submitLabel?: string;
};

/** Mesmo padrão de data livre "DD/MM/AAAA" duplicado por componente (ver `new-fuel-log-form.tsx`). */
function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Leitura simples do km do painel — só data + km atual. Não precisa ser todo dia: o
 * intervalo entre duas leituras é distribuído em `distributeOdometerLogs` (lib/veiculo.ts). */
export function NewOdometerLogForm({ onSubmit, onCancel, isSaving, initial, submitLabel }: NewOdometerLogFormProps) {
  const { tokens } = useTheme();
  const [dateText, setDateText] = useState(toBrDate(initial?.data ?? toDateString(new Date())));
  const [kmText, setKmText] = useState(initial ? String(initial.km_atual).replace(".", ",") : "");

  const parsedDate = parseBrDate(dateText);
  const km = parseNum(kmText);
  const isValid = parsedDate !== null && km != null && km > 0;

  function handleSubmit() {
    if (!isValid || parsedDate == null || km == null) return;
    onSubmit({ data: parsedDate, km_atual: km });
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
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          value={dateText}
          onChangeText={setDateText}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tokens.textMuted}
          keyboardType="numbers-and-punctuation"
          style={{
            flex: 1,
            // Mesmo ajuste dos outros formulários com dois campos na
            // mesma linha (ver `new-shopping-item-form.tsx`).
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
        <TextInput
          value={kmText}
          onChangeText={setKmText}
          placeholder="Km no painel"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={{
            flex: 1,
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
      </View>

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
              {submitLabel ?? "Salvar"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
