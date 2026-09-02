import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { MOOD_EMOJI, type MoodLog } from "@/lib/dev-pessoal";

type MoodDayFormProps = {
  dateLabel: string;
  existingLog?: MoodLog;
  onSave: (score: number, note: string, emoji: string) => void;
  onDelete: () => void;
  onClose: () => void;
  isSaving: boolean;
};

export function MoodDayForm({ dateLabel, existingLog, onSave, onDelete, onClose, isSaving }: MoodDayFormProps) {
  const { tokens } = useTheme();
  const [score, setScore] = useState(existingLog?.score ?? 3);
  const [note, setNote] = useState(existingLog?.note ?? "");
  // Emoji livre digitado pelo teclado do aparelho (globo/emoji do teclado), além
  // da faixa rápida de 1..5 abaixo. Puramente visual: quem decide a cor no calendário e
  // alimenta a IA cruzada continua sendo `score`, escolhido nos botões.
  const [emoji, setEmoji] = useState(existingLog?.emoji ?? "");

  return (
    <View
      style={{
        backgroundColor: tokens.surfaceAlt,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
        Humor — {dateLabel}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {MOOD_EMOJI.map((emoji, index) => {
          const value = index + 1;
          const selected = score === value;
          return (
            <Pressable
              key={value}
              onPress={() => setScore(value)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? tokens.accent : tokens.surface,
              }}
            >
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          value={emoji}
          onChangeText={(text) => {
            // Fica só com o ÚLTIMO caractere digitado (na prática, o emoji escolhido no
            // teclado) — evita que a pessoa acumule vários emojis seguidos sem querer.
            const chars = Array.from(text);
            setEmoji(chars.length > 0 ? chars[chars.length - 1] : "");
          }}
          placeholder={MOOD_EMOJI[score - 1]}
          placeholderTextColor={tokens.textMuted}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: tokens.surface,
            textAlign: "center",
            fontSize: 18,
          }}
        />
        <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
          Toque e abra o teclado de emoji do seu aparelho pra escolher outro — deixe em
          branco pra usar o emoji padrão da faixa acima.
        </Text>
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota (opcional)"
        placeholderTextColor={tokens.textMuted}
        style={{
          fontFamily: fontFamily.body,
          fontSize: 13,
          color: tokens.text,
          backgroundColor: tokens.surface,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Pressable onPress={onClose} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
            Cancelar
          </Text>
        </Pressable>
        {existingLog ? (
          <Pressable onPress={onDelete} style={{ paddingVertical: 8 }}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
              Remover
            </Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => onSave(score, note.trim(), emoji.trim())}
          disabled={isSaving}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.accentText} size="small" />
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
              Salvar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
