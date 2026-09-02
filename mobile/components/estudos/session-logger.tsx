import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SubjectChipPicker } from "@/components/estudos/subject-chip-picker";
import { SESSION_QUICK_ADD_MINUTES, type Subject, type SubjectColorKey, type StudySession } from "@/lib/estudos";

type SessionLoggerProps = {
  subjects: Subject[];
  onLog: (subjectId: string, minutes: number) => void;
  isLogging: boolean;
  onUndo: () => void;
  isUndoing: boolean;
  hasSessionToUndo: boolean;
  colorFor: (colorKey: SubjectColorKey) => string;
  /** A tela só expõe a última sessão (é a única que dá pra desfazer),
   * então a edição segue o mesmo alcance: só a última sessão registrada. */
  lastSession: StudySession | null;
  onUpdateLast: (subjectId: string, minutes: number) => void;
  isUpdatingLast: boolean;
};

/** Registro rápido de sessão — pomodoro (25min) ou o dobro, ou um valor customizado, sempre ligado a uma matéria. */
export function SessionLogger({
  subjects,
  onLog,
  isLogging,
  onUndo,
  isUndoing,
  hasSessionToUndo,
  colorFor,
  lastSession,
  onUpdateLast,
  isUpdatingLast,
}: SessionLoggerProps) {
  const { tokens } = useTheme();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [isEditingLast, setIsEditingLast] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
  const [editMinutesText, setEditMinutesText] = useState("");

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

      {/* Corrige os horários/valores dessa linha aparecendo
          sobrepostos na versão site pro celular ("250min" grudado). Causa: os 2 botões de
          atalho + o campo "Outro" + o botão "+" dividiam a mesma linha com `flex: 1` cada
          um — 4 elementos espremidos não cabem na largura de uma tela de celular. Separado
          em duas linhas: atalhos numa linha (com espaço de sobra), "Outro" + "+" na linha
          de baixo. */}
      <View style={{ flexDirection: "row", gap: 8 }}>
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
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          value={customMinutes}
          onChangeText={setCustomMinutes}
          placeholder="Outro (minutos)"
          placeholderTextColor={tokens.textMuted}
          keyboardType="number-pad"
          style={{
            flex: 1,
            fontFamily: fontFamily.body,
            fontSize: 14,
            color: tokens.text,
            backgroundColor: tokens.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
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
            paddingHorizontal: 18,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            opacity: canLog && Number(customMinutes) > 0 ? 1 : 0.5,
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
                setEditSubjectId(lastSession.subject_id);
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
          <SubjectChipPicker
            subjects={subjects}
            selectedId={editSubjectId}
            onSelect={setEditSubjectId}
            colorFor={colorFor}
          />
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
                if (editSubjectId && minutes > 0) {
                  onUpdateLast(editSubjectId, minutes);
                  setIsEditingLast(false);
                }
              }}
              disabled={isUpdatingLast || !editSubjectId || !(Number(editMinutesText) > 0)}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: isUpdatingLast || !editSubjectId || !(Number(editMinutesText) > 0) ? 0.6 : 1,
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
