import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

export type NewRideFormInput = {
  valor: number;
  /** Valor real recebido, se diferente do bruto — taxa de saque/imposto da plataforma.
   * Opcional; quando vazio, Finanças usa o valor bruto. */
  valor_liquido?: number | null;
  distancia_km?: number | null;
  duracao_min?: number | null;
  horas_trabalhadas?: number | null;
  km_rodados?: number | null;
};

type EntryMode = "corrida" | "sessao";

type NewRideFormProps = {
  onSubmit: (input: NewRideFormInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Preenche o formulário com uma corrida já lançada — usado pra editar (ver `RideRow`). */
  initial?: NewRideFormInput;
  /** "Salvar" por padrão; `RideRow` passa "Salvar alterações" no modo de edição. */
  submitLabel?: string;
};

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function numToText(n: number | null | undefined): string {
  return n != null ? String(n).replace(".", ",") : "";
}

/**
 * Lançamento manual — duas formas de registrar, porque nem todo mundo quer
 * anotar corrida por corrida:
 * - "corrida": uma corrida/entrega específica (valor + distância + duração).
 * - "sessão de trabalho": um bloco de trabalho sem detalhar cada corrida
 *   (valor total + horas trabalhadas + km rodados no período).
 *
 * `initial` — antes só existia o cadastro; corrigir um valor digitado
 * errado exigia excluir e lançar de novo. Agora `RideRow` reaproveita este mesmo formulário
 * pra editar, pré-preenchido com os dados já salvos (mesmo padrão de `NewBillForm`/
 * `bill-row.tsx` em Finanças).
 */
export function NewRideForm({ onSubmit, onCancel, isSaving, initial, submitLabel }: NewRideFormProps) {
  const { tokens } = useTheme();
  // Se a corrida editada tem horas/km rodados mas não distância/duração, era um lançamento
  // em modo "sessão de trabalho" — reabre nesse modo em vez do padrão "corrida".
  const initialMode: EntryMode =
    initial && (initial.horas_trabalhadas != null || initial.km_rodados != null) &&
    initial.distancia_km == null && initial.duracao_min == null
      ? "sessao"
      : "corrida";
  const [mode, setMode] = useState<EntryMode>(initialMode);
  const [valorText, setValorText] = useState(() => numToText(initial?.valor));
  const [valorLiquidoText, setValorLiquidoText] = useState(() => numToText(initial?.valor_liquido));
  const [distanciaText, setDistanciaText] = useState(() => numToText(initial?.distancia_km));
  const [duracaoText, setDuracaoText] = useState(() => numToText(initial?.duracao_min));
  const [horasText, setHorasText] = useState(() => numToText(initial?.horas_trabalhadas));
  const [kmText, setKmText] = useState(() => numToText(initial?.km_rodados));

  const valor = parseNum(valorText);
  const isValid = valor != null && valor > 0;

  // "Duração min" cortava na borda da tela no site mobile porque o
  // campo, sem `minWidth: 0`, não encolhia abaixo da largura do próprio placeholder dentro
  // da linha flex (mesmo padrão corrigido em `new-shopping-item-form.tsx` e `weight-checkin.tsx`).
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
    if (valor == null) return;
    const valor_liquido = parseNum(valorLiquidoText);
    if (mode === "corrida") {
      onSubmit({
        valor,
        valor_liquido,
        distancia_km: parseNum(distanciaText),
        duracao_min: parseNum(duracaoText),
      });
    } else {
      onSubmit({
        valor,
        valor_liquido,
        horas_trabalhadas: parseNum(horasText),
        km_rodados: parseNum(kmText),
      });
    }
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
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["corrida", "sessao"] as const).map((m) => {
          const selected = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
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
                {m === "corrida" ? "Corrida" : "Sessão de trabalho"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={valorText}
        onChangeText={setValorText}
        placeholder="Valor recebido (ex: 32,50)"
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

      {mode === "corrida" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={distanciaText}
            onChangeText={setDistanciaText}
            placeholder="Distância km"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
          <TextInput
            value={duracaoText}
            onChangeText={setDuracaoText}
            placeholder="Duração min"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={horasText}
            onChangeText={setHorasText}
            // O formato relógio (ex: "8:30") é uma confusão comum aqui,
            // já que o teclado numérico não tem ":" (só "." e ","), porque o campo é decimal de
            // propósito (8,5 = 8h30), não HH:MM. Placeholder agora deixa isso explícito com
            // um exemplo, pra não repetir a confusão.
            placeholder="Horas (ex: 8,5 = 8h30)"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
          <TextInput
            value={kmText}
            onChangeText={setKmText}
            placeholder="Km rodados"
            placeholderTextColor={tokens.textMuted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>
      )}

      <View style={{ gap: 4 }}>
        <TextInput
          value={valorLiquidoText}
          onChangeText={setValorLiquidoText}
          // Algumas plataformas descontam taxa de
          // saque/imposto antes do dinheiro cair de verdade, então o valor recebido pode ser
          // menor que o valor da corrida. Opcional — só usado no lançamento em Finanças; os
          // indicadores de R$/km e R$/hora acima continuam usando o valor bruto.
          placeholder="Valor líquido recebido, se diferente (opcional)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="decimal-pad"
          style={{
            fontFamily: fontFamily.body,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        />
        <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.textMuted }}>
          Usado só na receita lançada em Finanças (taxa de saque, imposto etc.)
        </Text>
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
