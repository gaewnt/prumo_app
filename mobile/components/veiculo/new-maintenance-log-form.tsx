import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";
import type { MaintenanceType } from "@/lib/veiculo";
import { MAINTENANCE_TYPE_LABELS } from "@/components/veiculo/format";

export type NewMaintenanceLogFormInput = {
  tipo: MaintenanceType;
  descricao: string | null;
  valor: number;
  km_atual: number | null;
  realizado_em: string; // "YYYY-MM-DD"
};

type NewMaintenanceLogFormProps = {
  onSubmit: (input: NewMaintenanceLogFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Preenche pra editar uma manutenção já lançada (ver `MaintenanceLogRow`). */
  initial?: NewMaintenanceLogFormInput;
  submitLabel?: string;
};

const MAINTENANCE_TYPES = Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[];

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

function numToText(n: number | null | undefined): string {
  return n != null ? String(n).replace(".", ",") : "";
}

/** Lançamento de manutenção — tipo (pílulas, com "Outro" liberando descrição livre), valor,
 * km atual (opcional — nem toda manutenção tem km relevante, ex: troca de item elétrico) e
 * data. O valor soma direto no "despesas totais"/"saldo livre" do período em que foi feita. */
export function NewMaintenanceLogForm({
  onSubmit,
  onCancel,
  isSaving,
  initial,
  submitLabel,
}: NewMaintenanceLogFormProps) {
  const { tokens } = useTheme();
  const [tipo, setTipo] = useState<MaintenanceType>(initial?.tipo ?? "revisao");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [valorText, setValorText] = useState(numToText(initial?.valor));
  const [kmText, setKmText] = useState(numToText(initial?.km_atual));
  const [dateText, setDateText] = useState(toBrDate(initial?.realizado_em ?? toDateString(new Date())));

  const parsedDate = parseBrDate(dateText);
  const valor = parseNum(valorText);
  const km = parseNum(kmText);
  const isValid = parsedDate !== null && valor != null && valor > 0;

  const inputStyle = {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function handleSubmit() {
    if (!isValid || parsedDate == null || valor == null) return;
    onSubmit({ tipo, descricao: descricao.trim() || null, valor, km_atual: km, realizado_em: parsedDate });
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MAINTENANCE_TYPES.map((t) => {
          const selected = tipo === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTipo(t)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: selected ? tokens.accent : tokens.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bodyMedium,
                  fontSize: 12.5,
                  color: selected ? tokens.accentText : tokens.text,
                }}
              >
                {MAINTENANCE_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tipo === "outro" ? (
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="O que foi feito"
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
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          value={valorText}
          onChangeText={setValorText}
          placeholder="Valor pago (ex: 250,00)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
        <TextInput
          value={kmText}
          onChangeText={setKmText}
          placeholder="Km (opcional)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
      </View>

      <TextInput
        value={dateText}
        onChangeText={setDateText}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={tokens.textMuted}
        keyboardType="numbers-and-punctuation"
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
