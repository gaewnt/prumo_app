import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SESSION_KINDS, SESSION_KIND_LABELS, SESSION_QUICK_ADD_MINUTES, type SessionKind } from "@/lib/mente";

type SessionLoggerProps = {
  onLog: (kind: SessionKind, minutes: number) => void;
  isLogging: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  hasSessionToUndo: boolean;
};

export function SessionLogger({ onLog, isLogging, onUndo, isUndoing, hasSessionToUndo }: SessionLoggerProps) {
  const { tokens } = useTheme();
  const [kind, setKind] = useState<SessionKind>("meditacao");
  const [customMinutes, setCustomMinutes] = useState("");

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

      {hasSessionToUndo ? (
        <Pressable onPress={onUndo} disabled={isUndoing} hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
            {isUndoing ? "Desfazendo…" : "Desfazer última sessão"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
