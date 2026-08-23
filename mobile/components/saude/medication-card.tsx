import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewMedicationForm } from "@/components/saude/new-medication-form";
import type { Medication } from "@/lib/saude";

type MedicationFormInput = {
  name: string;
  dosage: string;
  times: string[];
  activeDays: number[];
  notes: string;
  active: boolean;
};

type MedicationCardProps = {
  medication: Medication;
  todayDoses: { time: string; taken: boolean }[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: MedicationFormInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDose: (time: string, taken: boolean) => void;
};

export function MedicationCard({
  medication,
  todayDoses,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleDose,
}: MedicationCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewMedicationForm
        initial={{
          name: medication.name,
          dosage: medication.dosage ?? "",
          times: medication.times,
          activeDays: medication.active_days,
          notes: medication.notes ?? "",
          active: medication.active,
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
        gap: 10,
        opacity: medication.active ? 1 : 0.6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
            {medication.name}
            {!medication.active ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                {"  ·  pausado"}
              </Text>
            ) : null}
          </Text>
          {medication.dosage ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
              {medication.dosage}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
          </Pressable>
        </View>
      </View>

      {medication.notes ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
          {medication.notes}
        </Text>
      ) : null}

      {todayDoses.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {todayDoses.map((dose) => (
            <Pressable
              key={dose.time}
              onPress={() => onToggleDose(dose.time, dose.taken)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: dose.taken ? tokens.successMuted : tokens.surfaceAlt,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 13,
                  color: dose.taken ? tokens.success : tokens.text,
                }}
              >
                {dose.taken ? "✓ " : ""}
                {dose.time}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
          Sem horário hoje.
        </Text>
      )}
    </View>
  );
}
