import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewHomeTaskForm } from "@/components/casa/new-home-task-form";
import type { HomeTask } from "@/lib/casa";

type HomeTaskFormInput = {
  title: string;
  activeDays: number[];
  notes: string;
  active: boolean;
};

type HomeTaskRowProps = {
  task: HomeTask;
  doneToday: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: HomeTaskFormInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleToday: () => void;
  isToggling: boolean;
};

export function HomeTaskRow({
  task,
  doneToday,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleToday,
  isToggling,
}: HomeTaskRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewHomeTaskForm
        initial={{ title: task.title, activeDays: task.active_days, notes: task.notes ?? "", active: task.active }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        opacity: task.active ? 1 : 0.6,
      }}
    >
      <Pressable
        onPress={onToggleToday}
        disabled={isToggling}
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1.5,
          borderColor: doneToday ? tokens.accent : tokens.border,
          backgroundColor: doneToday ? tokens.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color={doneToday ? tokens.accentText : tokens.accent} />
        ) : doneToday ? (
          <Text style={{ fontSize: 14, color: tokens.accentText }}>✓</Text>
        ) : null}
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fontFamily.bodySemibold,
            fontSize: 15,
            color: tokens.text,
            textDecorationLine: doneToday ? "line-through" : "none",
          }}
        >
          {task.title}
          {!task.active ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {"  ·  pausada"}
            </Text>
          ) : null}
        </Text>
        {task.notes ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
            {task.notes}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 10, alignItems: "flex-end" }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}
