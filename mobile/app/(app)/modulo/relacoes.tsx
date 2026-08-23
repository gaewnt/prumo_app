import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { PersonRow } from "@/components/relacoes/person-row";
import { NewPersonForm } from "@/components/relacoes/new-person-form";
import { ReminderRow } from "@/components/relacoes/reminder-row";
import { NewReminderForm } from "@/components/relacoes/new-reminder-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchRelacoes,
  createPerson,
  updatePerson,
  deletePerson,
  upcomingBirthdays,
  createRelationshipReminder,
  updateRelationshipReminder,
  toggleRelationshipReminderDone,
  deleteRelationshipReminder,
  formatBirthdayLabel,
  type PersonInput,
  type ReminderInput,
  type RelationshipReminder,
} from "@/lib/relacoes";

export default function RelacoesScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);

  const query = useQuery({
    queryKey: ["relacoes", userId],
    queryFn: fetchRelacoes,
    enabled: !!userId,
  });
  const people = query.data?.people ?? [];
  const reminders = query.data?.reminders ?? [];
  const pendingReminders = reminders.filter((r) => !r.done);
  const doneReminders = reminders.filter((r) => r.done);
  const birthdays = upcomingBirthdays(people).slice(0, 5);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["relacoes", userId] });
  }

  const createPersonMutation = useMutation({
    mutationFn: (input: PersonInput) => createPerson(userId!, input),
    onSuccess: () => {
      setShowPersonForm(false);
      invalidate();
    },
  });
  const updatePersonMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PersonInput }) => updatePerson(id, input),
    onSuccess: () => {
      setEditingPersonId(null);
      invalidate();
    },
  });
  const deletePersonMutation = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: invalidate,
  });

  const createReminderMutation = useMutation({
    mutationFn: (input: ReminderInput) => createRelationshipReminder(userId!, input),
    onSuccess: () => {
      setShowReminderForm(false);
      invalidate();
    },
  });
  const updateReminderMutation = useMutation({
    mutationFn: ({ reminder, input }: { reminder: RelationshipReminder; input: ReminderInput }) => updateRelationshipReminder(reminder, input),
    onSuccess: () => {
      setEditingReminderId(null);
      invalidate();
    },
  });
  const toggleReminderMutation = useMutation({
    mutationFn: ({ reminder, done }: { reminder: RelationshipReminder; done: boolean }) => toggleRelationshipReminderDone(reminder, done),
    onSuccess: invalidate,
  });
  const deleteReminderMutation = useMutation({
    mutationFn: (reminder: RelationshipReminder) => deleteRelationshipReminder(reminder),
    onSuccess: invalidate,
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>👥</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Relações</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Aniversários, lembretes e datas de quem você gosta.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados de Relações agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 24 }}>
            {birthdays.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Próximos aniversários
                </Text>
                <View
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  {birthdays.map(({ person, daysUntil }) => (
                    <View key={person.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text }}>
                        🎂 {person.name} · {formatBirthdayLabel(person.birth_date as string)}
                      </Text>
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.accent }}>
                        {daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dias`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Pessoas */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>Pessoas</Text>

              {people.length === 0 && !showPersonForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma pessoa cadastrada ainda.
                </Text>
              ) : null}

              <View style={{ gap: 8 }}>
                {people.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    isEditing={editingPersonId === person.id}
                    onStartEdit={() => setEditingPersonId(person.id)}
                    onCancelEdit={() => setEditingPersonId(null)}
                    onUpdate={(input) => updatePersonMutation.mutate({ id: person.id, input })}
                    isSaving={updatePersonMutation.isPending}
                    onDelete={() => deletePersonMutation.mutate(person.id)}
                  />
                ))}
              </View>

              {showPersonForm ? (
                <NewPersonForm
                  isSaving={createPersonMutation.isPending}
                  onCancel={() => setShowPersonForm(false)}
                  onSubmit={(input) => createPersonMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowPersonForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Nova pessoa</Text>
                </Pressable>
              )}
            </View>

            {/* Lembretes */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>Lembretes</Text>

              {reminders.length === 0 && !showReminderForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum lembrete cadastrado ainda.
                </Text>
              ) : null}

              {pendingReminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  person={people.find((p) => p.id === reminder.person_id)}
                  people={people}
                  isEditing={editingReminderId === reminder.id}
                  onStartEdit={() => setEditingReminderId(reminder.id)}
                  onCancelEdit={() => setEditingReminderId(null)}
                  onUpdate={(input) => updateReminderMutation.mutate({ reminder, input })}
                  isSaving={updateReminderMutation.isPending}
                  onDelete={() => deleteReminderMutation.mutate(reminder)}
                  onToggleDone={() => toggleReminderMutation.mutate({ reminder, done: !reminder.done })}
                />
              ))}

              {showReminderForm ? (
                <NewReminderForm
                  people={people}
                  isSaving={createReminderMutation.isPending}
                  onCancel={() => setShowReminderForm(false)}
                  onSubmit={(input) => createReminderMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowReminderForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo lembrete</Text>
                </Pressable>
              )}

              {doneReminders.length > 0 ? (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    Concluídos · {doneReminders.length}
                  </Text>
                  {doneReminders.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      person={people.find((p) => p.id === reminder.person_id)}
                      people={people}
                      isEditing={editingReminderId === reminder.id}
                      onStartEdit={() => setEditingReminderId(reminder.id)}
                      onCancelEdit={() => setEditingReminderId(null)}
                      onUpdate={(input) => updateReminderMutation.mutate({ reminder, input })}
                      isSaving={updateReminderMutation.isPending}
                      onDelete={() => deleteReminderMutation.mutate(reminder)}
                      onToggleDone={() => toggleReminderMutation.mutate({ reminder, done: !reminder.done })}
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
