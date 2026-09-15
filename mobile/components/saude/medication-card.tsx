import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewMedicationForm } from "@/components/saude/new-medication-form";
import { medicationFrequencyLabel, type Medication, type MedicationFrequencyKind } from "@/lib/saude";

type MedicationFormInput = {
  name: string;
  dosage: string;
  times: string[];
  activeDays: number[];
  notes: string;
  active: boolean;
  frequencyKind: MedicationFrequencyKind;
  frequencyIntervalDays: number | null;
  nextDoseDate: string | null;
};

type MedicationCardProps = {
  medication: Medication;
  todayDoses: { time: string; taken: boolean }[];
  dueNonDaily: { urgency: "atrasada" | "hoje" } | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: MedicationFormInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  onToggleDose: (time: string, taken: boolean) => void;
  onAdvanceDose: () => void;
};

function formatIsoDateBr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function MedicationCard({
  medication,
  todayDoses,
  dueNonDaily,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  isSaving,
  onDelete,
  onToggleDose,
  onAdvanceDose,
}: MedicationCardProps) {
  const { tokens } = useTheme();
  const isDaily = medication.frequency_kind === "diaria";

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
          frequencyKind: medication.frequency_kind,
          frequencyIntervalDays: medication.frequency_interval_days,
          nextDoseDate: medication.next_dose_date,
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

      {isDaily ? (
        todayDoses.length > 0 ? (
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
        )
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              {medicationFrequencyLabel(medication.frequency_kind, medication.frequency_interval_days)}
              {medication.next_dose_date ? ` · próxima dose ${formatIsoDateBr(medication.next_dose_date)}` : ""}
            </Text>
            {dueNonDaily ? (
              <View
                style={{
                  backgroundColor: dueNonDaily.urgency === "atrasada" ? tokens.dangerMuted : tokens.accentMuted,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.bodyMedium,
                    fontSize: 11,
                    color: dueNonDaily.urgency === "atrasada" ? tokens.danger : tokens.accent,
                  }}
                >
                  {dueNonDaily.urgency === "atrasada" ? "Atrasada" : "Hoje"}
                </Text>
              </View>
            ) : null}
          </View>
          {medication.active && dueNonDaily ? (
            <Pressable
              onPress={onAdvanceDose}
              style={{
                alignSelf: "flex-start",
                backgroundColor: tokens.successMuted,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.success }}>
                ✓ Tomei
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
