import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import {
  SESSION_KINDS,
  SESSION_KIND_LABELS,
  SESSION_QUICK_ADD_MINUTES,
  type SessionKind,
  type MindfulnessSession,
} from "@/lib/mente";

type SessionLoggerProps = {
  onLog: (kind: SessionKind, minutes: number) => void;
  isLogging: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  hasSessionToUndo: boolean;
  /** A tela só expõe a última sessão (é a única que dá pra desfazer),
   * então a edição segue o mesmo alcance: só a última sessão registrada. */
  lastSession: MindfulnessSession | null;
  onUpdateLast: (kind: SessionKind, minutes: number) => void;
  isUpdatingLast: boolean;
};

export function SessionLogger({
  onLog,
  isLogging,
  onUndo,
  isUndoing,
  hasSessionToUndo,
  lastSession,
  onUpdateLast,
  isUpdatingLast,
}: SessionLoggerProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<SessionKind>("meditacao");
  const [customMinutes, setCustomMinutes] = useState("");
  const [isEditingLast, setIsEditingLast] = useState(false);
  const [editKind, setEditKind] = useState<SessionKind>("meditacao");
  const [editMinutesText, setEditMinutesText] = useState("");

  return (
    <View
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>Registrar sessão</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SESSION_KINDS.map((k) => {
          const selected = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
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
                  fontSize: 13,
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
        {SESSION_QUICK_ADD_MINUTES.map((minutes) => (
          <Pressable
            key={minutes}
            onPress={() => onLog(kind, minutes)}
            disabled={isLogging}
            style={{
              flex: 1,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: isLogging ? 0.5 : 1,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>+ {minutes}min</Text>
          </Pressable>
        ))}
        <TextInput
          value={customMinutes}
          onChangeText={setCustomMinutes}
          placeholder="Outro"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={{
            flex: 1,
            fontFamily: fontFamily.body,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 10,
            textAlign: "center",
          }}
        />
        <Pressable
          onPress={() => {
            const minutes = Number(customMinutes);
            if (minutes > 0) {
              onLog(kind, Math.round(minutes));
              setCustomMinutes("");
            }
          }}
          disabled={isLogging || !(Number(customMinutes) > 0)}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent: "center",
            opacity: !isLogging && Number(customMinutes) > 0 ? 1 : 0.5,
          }}
        >
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.accentText }}>+</Text>
        </Pressable>
      </View>

      {isLogging ? <ActivityIndicator color={tokens.accent} /> : null}

      {hasSessionToUndo && !isEditingLast ? (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable
            onPress={() => {
              if (lastSession) {
                setEditKind(lastSession.kind);
                setEditMinutesText(String(lastSession.duration_minutes));
              }
              setIsEditingLast(true);
            }}
            hitSlop={8}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.accent }}>
              Editar última sessão
            </Text>
          </Pressable>
          <Pressable onPress={onUndo} disabled={isUndoing} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {isUndoing ? "Desfazendo…" : "Desfazer última sessão"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isEditingLast ? (
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 12 }}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
            Editar última sessão
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SESSION_KINDS.map((k) => {
              const selected = editKind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setEditKind(k)}
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
                      fontSize: 13,
                      color: selected ? tokens.accentText : tokens.text,
                    }}
                  >
                    {SESSION_KIND_LABELS[k]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={editMinutesText}
            onChangeText={setEditMinutesText}
            placeholder="Minutos"
            placeholderTextColor={tokens.textMuted}
            keyboardType="number-pad"
            style={{
              fontFamily: fontFamily.body,
              fontSize: 14,
              color: tokens.text,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
            <Pressable onPress={() => setIsEditingLast(false)} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const minutes = Math.round(Number(editMinutesText));
                if (minutes > 0) {
                  onUpdateLast(editKind, minutes);
                  setIsEditingLast(false);
                }
              }}
              disabled={isUpdatingLast || !(Number(editMinutesText) > 0)}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: isUpdatingLast || !(Number(editMinutesText) > 0) ? 0.6 : 1,
              }}
            >
              {isUpdatingLast ? (
                <ActivityIndicator color={tokens.accentText} size="small" />
              ) : (
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
