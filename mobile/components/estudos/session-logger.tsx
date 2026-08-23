import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SubjectChipPicker } from "@/components/estudos/subject-chip-picker";
import { SESSION_QUICK_ADD_MINUTES, type Subject, type SubjectColorKey } from "@/lib/estudos";

type SessionLoggerProps = {
  subjects: Subject[];
  onLog: (subjectId: string, minutes: number) => void;
  isLogging: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  hasSessionToUndo: boolean;
  colorFor: (colorKey: SubjectColorKey) => string;
};

/** Registro rápido de sessão — pomodoro (25min) ou o dobro, ou um valor customizado, sempre ligado a uma matéria. */
export function SessionLogger({ subjects, onLog, isLogging, onUndo, isUndoing, hasSessionToUndo, colorFor }: SessionLoggerProps) {
  const { tokens } = useTheme();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [customMinutes, setCustomMinutes] = useState("");

  if (subjects.length === 0) {
    return (
      <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
        Cadastre uma matéria abaixo pra começar a registrar sessões de estudo.
      </Text>
    );
  }

  const canLog = selectedSubjectId !== null && !isLogging;

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
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
        Registrar sessão
      </Text>

      <SubjectChipPicker
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={setSelectedSubjectId}
        colorFor={colorFor}
      />

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {SESSION_QUICK_ADD_MINUTES.map((minutes) => (
          <Pressable
            key={minutes}
            onPress={() => selectedSubjectId && onLog(selectedSubjectId, minutes)}
            disabled={!canLog}
            style={{
              flex: 1,
              backgroundColor: tokens.surfaceAlt,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              opacity: canLog ? 1 : 0.5,
            }}
          >
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
              + {minutes}min
            </Text>
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
            if (selectedSubjectId && minutes > 0) {
              onLog(selectedSubjectId, Math.round(minutes));
              setCustomMinutes("");
            }
          }}
          disabled={!canLog || !(Number(customMinutes) > 0)}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent: "center",
            opacity: canLog && Number(customMinutes) > 0 ? 1 : 0.5,
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
