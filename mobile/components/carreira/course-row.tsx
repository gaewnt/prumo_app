import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewCourseForm } from "@/components/carreira/new-course-form";
import { COURSE_STATUS_LABELS, formatDate, type Course, type CourseInput } from "@/lib/carreira";

type CourseRowProps = {
  course: Course;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: CourseInput) => void;
  isSaving: boolean;
  onDelete: () => void;
};

export function CourseRow({ course, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete }: CourseRowProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewCourseForm
        initial={{
          title: course.title,
          institution: course.institution ?? "",
          status: course.status,
          startDate: course.start_date,
          endDate: course.end_date,
          notes: course.notes ?? "",
        }}
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
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>{course.title}</Text>
        <Text
          style={{
            fontFamily: fontFamily.bodyMedium,
            fontSize: 10.5,
            color: tokens.accent,
            backgroundColor: tokens.accentMuted,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {COURSE_STATUS_LABELS[course.status].toUpperCase()}
        </Text>
      </View>
      {course.institution ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{course.institution}</Text>
      ) : null}
      {course.start_date ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          {formatDate(course.start_date)}
          {course.end_date ? ` – ${formatDate(course.end_date)}` : ""}
        </Text>
      ) : null}
      {course.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{course.notes}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
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
