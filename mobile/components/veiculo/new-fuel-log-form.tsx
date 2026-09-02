import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { toDateString } from "@/lib/rotina";

export type NewFuelLogFormInput = {
  abastecido_em: string; // "YYYY-MM-DD"
  km_atual: number;
  litros: number;
  valor_total: number;
  tanque_cheio: boolean;
};

type NewFuelLogFormProps = {
  onSubmit: (input: NewFuelLogFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Preenche pra editar um abastecimento já lançado (ver `FuelLogRow`). */
  initial?: NewFuelLogFormInput;
  submitLabel?: string;
};

/** Mesmo padrão de data livre "DD/MM/AAAA" usado nos outros formulários do app (ex:
 * `new-bill-form.tsx`) — duplicado aqui de propósito, cada módulo mantém o seu. */
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

function numToText(n: number | undefined): string {
  return n != null ? String(n).replace(".", ",") : "";
}

/**
 * Lançamento de abastecimento — km atual + litros + valor total gasto. Com esses três
 * números o app calcula sozinho preço/litro e, comparando com o abastecimento anterior do
 * mesmo veículo, o consumo real em km/l (ver `computeFuelConsumption` em `lib/veiculo.ts`).
 * Assume tanque cheio a cada lançamento, igual ao Fuelio.
 */
export function NewFuelLogForm({ onSubmit, onCancel, isSaving, initial, submitLabel }: NewFuelLogFormProps) {
  const { tokens } = useTheme();
  const [dateText, setDateText] = useState(toBrDate(initial?.abastecido_em ?? toDateString(new Date())));
  const [kmText, setKmText] = useState(numToText(initial?.km_atual));
  const [litrosText, setLitrosText] = useState(numToText(initial?.litros));
  const [valorText, setValorText] = useState(numToText(initial?.valor_total));
  // Tanque cheio por padrão — é o caso mais comum e o único que fecha o cálculo de consumo
  // sozinho; a pessoa desmarca quando colocar só uma parte (ex: "coloquei R$50").
  const [tanqueCheio, setTanqueCheio] = useState(initial?.tanque_cheio ?? true);

  const parsedDate = parseBrDate(dateText);
  const km = parseNum(kmText);
  const litros = parseNum(litrosText);
  const valor = parseNum(valorText);
  const isValid = parsedDate !== null && km != null && km > 0 && litros != null && litros > 0 && valor != null && valor > 0;

  const precoLitro = litros && valor ? valor / litros : null;

  // Mesmo ajuste dos outros formulários com dois campos na mesma linha
  // (ver `new-shopping-item-form.tsx`).
  const inputStyle = {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function handleSubmit() {
    if (!isValid || parsedDate == null || km == null || litros == null || valor == null) return;
    onSubmit({ abastecido_em: parsedDate, km_atual: km, litros, valor_total: valor, tanque_cheio: tanqueCheio });
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

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          value={kmText}
          onChangeText={setKmText}
          placeholder="Km no painel"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
        <TextInput
          value={litrosText}
          onChangeText={setLitrosText}
          placeholder="Litros"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
      </View>

      <TextInput
        value={valorText}
        onChangeText={setValorText}
        placeholder="Valor total pago (ex: 180,00)"
        placeholderTextColor={tokens.textMuted}
        keyboardType="decimal-pad"
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

      {precoLitro != null ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {precoLitro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/litro
        </Text>
      ) : null}

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {([true, false] as const).map((option) => {
            const selected = tanqueCheio === option;
            return (
              <Pressable
                key={String(option)}
                onPress={() => setTanqueCheio(option)}
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
                  {option ? "Tanque cheio" : "Parcial"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!tanqueCheio ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
            Sem problema — o consumo real é calculado quando você registrar o próximo tanque
            cheio, somando os litros de todos os parciais no meio.
          </Text>
        ) : null}
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
