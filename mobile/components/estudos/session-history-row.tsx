import React, { useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { SubjectChipPicker } from "@/components/estudos/subject-chip-picker";
import type { Subject, SubjectColorKey, StudySession } from "@/lib/estudos";

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
  session: StudySession;
  subjects: Subject[];
  colorFor: (colorKey: SubjectColorKey) => string;
  onUpdate: (subjectId: string, minutes: number) => void;
  isSaving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

/** Linha de sessão de estudo passada — mesmo padrão do
 * `components/mente/session-history-row.tsx`: antes só a última sessão dava pra corrigir. */
export function SessionHistoryRow({
  session,
  subjects,
  colorFor,
  onUpdate,
  isSaving,
  onDelete,
  isDeleting,
}: SessionHistoryRowProps) {
  const { tokens } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(session.subject_id);
  const [minutesText, setMinutesText] = useState(String(session.duration_minutes));

  const subject = subjects.find((s) => s.id === session.subject_id);

  if (isEditing) {
    return (
      <View style={{ gap: 10, backgroundColor: tokens.surfaceAlt, borderRadius: 12, padding: 12 }}>
        <SubjectChipPicker subjects={subjects} selectedId={subjectId} onSelect={setSubjectId} colorFor={colorFor} />
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
              if (subjectId && minutes > 0) {
                onUpdate(subjectId, minutes);
                setIsEditing(false);
              }
            }}
            disabled={isSaving || !subjectId || !(Number(minutesText) > 0)}
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
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
        {subject ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorFor(subject.color_key) }} />
        ) : null}
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text }}>
          {subject?.name ?? "Matéria removida"}
        </Text>
      </View>
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
