import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { TRIP_STATUSES, TRIP_STATUS_LABELS, type TripInput, type TripStatus } from "@/lib/viagens";

type NewTripFormProps = {
  initial?: TripInput;
  submitLabel?: string;
  onSubmit: (input: TripInput) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function parseBrDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function NewTripForm({ initial, submitLabel = "Salvar", onSubmit, onCancel, isSaving }: NewTripFormProps) {
  const { tokens } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [status, setStatus] = useState<TripStatus>(initial?.status ?? "planejando");
  const [startText, setStartText] = useState(toBrDate(initial?.startDate ?? null));
  const [endText, setEndText] = useState(toBrDate(initial?.endDate ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const inputStyle = {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  const startIsValid = startText.trim().length === 0 || parseBrDate(startText) !== null;
  const endIsValid = endText.trim().length === 0 || parseBrDate(endText) !== null;
  const isValid = name.trim().length > 0 && startIsValid && endIsValid;

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
        value={name}
        onChangeText={setName}
        placeholder="Nome da viagem (ex: Férias em Lisboa)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />
      <TextInput
        value={destination}
        onChangeText={setDestination}
        placeholder="Destino (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TRIP_STATUSES.map((s) => {
          const selected = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
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
                {TRIP_STATUS_LABELS[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={startText}
            onChangeText={setStartText}
            placeholder="Início (opcional)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!startIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use DD/MM/AAAA.</Text>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={endText}
            onChangeText={setEndText}
            placeholder="Fim (opcional)"
            placeholderTextColor={tokens.textMuted}
            style={inputStyle}
          />
          {!endIsValid ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: tokens.danger }}>Use DD/MM/AAAA.</Text>
          ) : null}
        </View>
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        style={[inputStyle, { minHeight: 48, textAlignVertical: "top" }]}
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.textMuted }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onSubmit({
              name: name.trim(),
              destination: destination.trim(),
              startDate: startText.trim() ? parseBrDate(startText) : null,
              endDate: endText.trim() ? parseBrDate(endText) : null,
              status,
              notes: notes.trim(),
            })
          }
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
