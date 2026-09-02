import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { HabitsSummaryCard } from "@/components/saude/habits-summary-card";
import { MedicationCard } from "@/components/saude/medication-card";
import { NewMedicationForm } from "@/components/saude/new-medication-form";
import { AppointmentCard } from "@/components/saude/appointment-card";
import { NewAppointmentForm } from "@/components/saude/new-appointment-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { notificationsSupported } from "@/lib/notifications";
import {
  fetchSaude,
  createMedication,
  updateMedication,
  deleteMedication,
  logDoseTaken,
  undoDoseTaken,
  computeTodayDoses,
  computeAdherenceWeekly,
  computeDayAdherence,
  fetchMedicationLogsForMonth,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  toggleAppointmentCompleted,
  type Medication,
  type Appointment,
} from "@/lib/saude";

export default function SaudeScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["saude", userId],
    queryFn: fetchSaude,
    enabled: !!userId,
  });
  const medications = query.data?.medications ?? [];
  const medicationLogs = query.data?.medicationLogs ?? [];
  const appointments = query.data?.appointments ?? [];
  const habitsSummary = query.data?.habitsSummary;
  const today = query.data?.today ?? "";

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["saude", userId] });
  }

  const todayDoses = computeTodayDoses(medications, medicationLogs, today);
  const adherenceWeekly = computeAdherenceWeekly(medications, medicationLogs);

  // Histórico de meses anteriores — `medicationLogs` só cobre os últimos 7
  // dias (a busca de sempre da Saúde), então aqui busca sempre o mês selecionado, inclusive o atual.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const historyDoseLogsQuery = useQuery({
    queryKey: ["saude", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchMedicationLogsForMonth(historyMonth),
    enabled: !!userId,
  });
  const heatmapDoseLogs = historyDoseLogsQuery.data ?? [];

  const upcomingAppointments = appointments.filter((a) => !a.completed_at);
  const completedAppointments = appointments
    .filter((a) => a.completed_at)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));

  const createMedicationMutation = useMutation({
    mutationFn: (input: Parameters<typeof createMedication>[1]) => createMedication(userId!, input),
    onSuccess: () => {
      setShowMedicationForm(false);
      invalidate();
    },
  });

  const updateMedicationMutation = useMutation({
    mutationFn: ({ medication, input }: { medication: Medication; input: Parameters<typeof updateMedication>[1] }) =>
      updateMedication(medication, input),
    onSuccess: () => {
      setEditingMedicationId(null);
      invalidate();
    },
  });

  const deleteMedicationMutation = useMutation({
    mutationFn: (medication: Medication) => deleteMedication(medication),
    onSuccess: invalidate,
  });

  const toggleDoseMutation = useMutation({
    mutationFn: ({ medicationId, time, taken }: { medicationId: string; time: string; taken: boolean }) =>
      taken ? undoDoseTaken(medicationId, time, today) : logDoseTaken(userId!, medicationId, time, today),
    onSuccess: invalidate,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAppointment>[1]) => createAppointment(userId!, input),
    onSuccess: () => {
      setShowAppointmentForm(false);
      invalidate();
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ appointment, input }: { appointment: Appointment; input: Parameters<typeof updateAppointment>[1] }) =>
      updateAppointment(appointment, input),
    onSuccess: () => {
      setEditingAppointmentId(null);
      invalidate();
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (appointment: Appointment) => deleteAppointment(appointment),
    onSuccess: invalidate,
  });

  const toggleAppointmentMutation = useMutation({
    mutationFn: (appointment: Appointment) => toggleAppointmentCompleted(appointment),
    onSuccess: invalidate,
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>❤️</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Saúde</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Remédios com lembrete, consultas e terapias, e seus hábitos de hoje num só lugar.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar sua Saúde agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 20 }}>
            {!notificationsSupported ? (
              <View
                style={{
                  backgroundColor: tokens.warningMuted,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.text }}>
                  ⚠️ No Expo Go, remédios e compromissos salvam normalmente, mas o lembrete por
                  notificação não dispara — esse recurso só funciona rodando o app como
                  development build.
                </Text>
              </View>
            ) : null}

            {habitsSummary ? <HabitsSummaryCard summary={habitsSummary} /> : null}

            {medications.length > 0 ? (
              <StatCard label="Adesão aos remédios — últimos 7 dias" value={`${adherenceWeekly[6].value}% hoje`}>
                <WeeklyBarChart data={adherenceWeekly} highlightIndex={6} />
              </StatCard>
            ) : null}

            {medications.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                  Histórico de adesão
                </Text>
                <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
                <MonthHeatmap
                  monthDate={historyMonth}
                  showMonthLabel={false}
                  getCellColor={(dateStr) => {
                    const ratio = computeDayAdherence(dateStr, medications, heatmapDoseLogs);
                    if (ratio === null) return null;
                    if (ratio >= 1) return tokens.accent;
                    if (ratio > 0) return tokens.accentMuted;
                    return tokens.surfaceAlt;
                  }}
                />
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Remédios
              </Text>

              {medications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  todayDoses={todayDoses.filter((d) => d.medication.id === medication.id).map((d) => ({ time: d.time, taken: d.taken }))}
                  isEditing={editingMedicationId === medication.id}
                  onStartEdit={() => setEditingMedicationId(medication.id)}
                  onCancelEdit={() => setEditingMedicationId(null)}
                  onUpdate={(input) => updateMedicationMutation.mutate({ medication, input })}
                  isSaving={updateMedicationMutation.isPending}
                  onDelete={() => deleteMedicationMutation.mutate(medication)}
                  onToggleDose={(time, taken) => toggleDoseMutation.mutate({ medicationId: medication.id, time, taken })}
                />
              ))}

              {showMedicationForm ? (
                <NewMedicationForm
                  isSaving={createMedicationMutation.isPending}
                  onCancel={() => setShowMedicationForm(false)}
                  onSubmit={(input) => createMedicationMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowMedicationForm(true)}
                  style={{
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                    + Novo remédio
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Consultas e terapias
              </Text>

              {upcomingAppointments.length === 0 && completedAppointments.length === 0 && !showAppointmentForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum compromisso agendado ainda.
                </Text>
              ) : null}

              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isEditing={editingAppointmentId === appointment.id}
                  onStartEdit={() => setEditingAppointmentId(appointment.id)}
                  onCancelEdit={() => setEditingAppointmentId(null)}
                  onUpdate={(input) => updateAppointmentMutation.mutate({ appointment, input })}
                  isSaving={updateAppointmentMutation.isPending}
                  onDelete={() => deleteAppointmentMutation.mutate(appointment)}
                  onToggleCompleted={() => toggleAppointmentMutation.mutate(appointment)}
                />
              ))}

              {showAppointmentForm ? (
                <NewAppointmentForm
                  isSaving={createAppointmentMutation.isPending}
                  onCancel={() => setShowAppointmentForm(false)}
                  onSubmit={(input) => createAppointmentMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowAppointmentForm(true)}
                  style={{
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                    + Novo compromisso
                  </Text>
                </Pressable>
              )}

              {completedAppointments.length > 0 ? (
                <View style={{ gap: 10, marginTop: 6 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    Concluídos · {completedAppointments.length}
                  </Text>
                  {completedAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isEditing={editingAppointmentId === appointment.id}
                      onStartEdit={() => setEditingAppointmentId(appointment.id)}
                      onCancelEdit={() => setEditingAppointmentId(null)}
                      onUpdate={(input) => updateAppointmentMutation.mutate({ appointment, input })}
                      isSaving={updateAppointmentMutation.isPending}
                      onDelete={() => deleteAppointmentMutation.mutate(appointment)}
                      onToggleCompleted={() => toggleAppointmentMutation.mutate(appointment)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
