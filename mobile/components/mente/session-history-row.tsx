import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SESSION_KINDS, SESSION_KIND_LABELS, type SessionKind, type MindfulnessSession } from "@/lib/mente";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function formatShortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

type SessionHistoryRowProps = {
  session: MindfulnessSession;
  onUpdate: (kind: SessionKind, minutes: number) => void;
  isSaving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

/** Linha de sessão passada — antes só a ÚLTIMA sessão registrada dava
 * pra editar/corrigir; qualquer sessão mais antiga ficava travada (só dava pra ver o
 * minuto agregado no calendário do mês, sem abrir individualmente). Reaproveita
 * `updateMindfulnessSession`/exclusão, que já aceitavam qualquer id — só faltava a UI. */
export function SessionHistoryRow({ session, onUpdate, isSaving, onDelete, isDeleting }: SessionHistoryRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [kind, setKind] = useState<SessionKind>(session.kind);
  const [minutesText, setMinutesText] = useState(String(session.duration_minutes));

  if (isEditing) {
    return (
      <View style={{ gap: 10, backgroundColor: tokens.surfaceAlt, borderRadius: 12, padding: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SESSION_KINDS.map((k) => {
            const selected = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={{
                  backgroundColor: selected ? tokens.accent : tokens.surface,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 12.5,
                    color: selected ? tokens.accentText : tokens.text,
                  }}
                >
                  {SESSION_KIND_LABELS[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={minutesText}
            onChangeText={setMinutesText}
            keyboardType="number-pad"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: fontFamily.body,
              fontSize: 14,
              color: tokens.text,
              backgroundColor: tokens.surface,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>min</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
          <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const minutes = Math.round(Number(minutesText));
              if (minutes > 0) {
                onUpdate(kind, minutes);
                setIsEditing(false);
              }
            }}
            disabled={isSaving || !(Number(minutesText) > 0)}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12.5, color: tokens.accent }}>
                Salvar
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: tokens.textMuted, width: 34 }}>
        {formatShortDate(session.session_date)}
      </Text>
      <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text }}>
        {SESSION_KIND_LABELS[session.kind]}
      </Text>
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
        {formatMinutes(session.duration_minutes)}
      </Text>
      <Pressable onPress={() => setIsEditing(true)} hitSlop={8}>
        <Text style={{ fontSize: 14 }}>✎</Text>
      </Pressable>
      <Pressable onPress={onDelete} disabled={isDeleting} hitSlop={8}>
        {isDeleting ? (
          <ActivityIndicator size="small" color={tokens.textMuted} />
        ) : (
          <Text style={{ fontSize: 14, color: tokens.textMuted }}>✕</Text>
        )}
      </Pressable>
    </View>
  );
}
