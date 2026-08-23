import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { PetCard } from "@/components/pet/pet-card";
import { NewPetForm } from "@/components/pet/new-pet-form";
import { CareEventCard } from "@/components/pet/care-event-card";
import { NewCareEventForm } from "@/components/pet/new-care-event-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchPet,
  createPet,
  updatePet,
  deletePet,
  createCareEvent,
  updateCareEvent,
  toggleCareEventCompleted,
  deleteCareEvent,
  careEventsForPet,
  type CareEventInput,
  type PetCareEvent,
  type PetInput,
} from "@/lib/pet";

export default function PetScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [showPetForm, setShowPetForm] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const query = useQuery({
    queryKey: ["pet", userId],
    queryFn: fetchPet,
    enabled: !!userId,
  });
  const pets = query.data?.pets ?? [];
  const careEvents = query.data?.careEvents ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["pet", userId] });
  }

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const selectedPetEvents = selectedPetId ? careEventsForPet(careEvents, selectedPetId) : [];

  const createPetMutation = useMutation({
    mutationFn: (input: PetInput) => createPet(userId!, input),
    onSuccess: () => {
      setShowPetForm(false);
      invalidate();
    },
  });
  const updatePetMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PetInput }) => updatePet(id, input),
    onSuccess: () => {
      setEditingPetId(null);
      invalidate();
    },
  });
  const deletePetMutation = useMutation({
    mutationFn: (id: string) => deletePet(id),
    onSuccess: invalidate,
  });

  function handleDeletePet(petId: string) {
    if (selectedPetId === petId) setSelectedPetId(null);
    deletePetMutation.mutate(petId);
  }

  const createEventMutation = useMutation({
    mutationFn: ({ petId, petName, input }: { petId: string; petName: string; input: CareEventInput }) =>
      createCareEvent(userId!, petId, petName, input),
    onSuccess: () => {
      setShowEventForm(false);
      invalidate();
    },
  });
  const updateEventMutation = useMutation({
    mutationFn: ({ event, petName, input }: { event: PetCareEvent; petName: string; input: CareEventInput }) =>
      updateCareEvent(event, petName, input),
    onSuccess: () => {
      setEditingEventId(null);
      invalidate();
    },
  });
  const toggleEventMutation = useMutation({
    mutationFn: (event: PetCareEvent) => toggleCareEventCompleted(event),
    onSuccess: invalidate,
  });
  const deleteEventMutation = useMutation({
    mutationFn: (event: PetCareEvent) => deleteCareEvent(event),
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
          <Text style={{ fontSize: 32 }}>🐾</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Pet</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Vacinas, consultas e cuidados de cada pet.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados de Pet agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>Pets</Text>

              {pets.length === 0 && !showPetForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum pet cadastrado ainda.
                </Text>
              ) : null}

              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  isSelected={selectedPetId === pet.id}
                  onSelect={() => setSelectedPetId((current) => (current === pet.id ? null : pet.id))}
                  isEditing={editingPetId === pet.id}
                  onStartEdit={() => setEditingPetId(pet.id)}
                  onCancelEdit={() => setEditingPetId(null)}
                  onUpdate={(input) => updatePetMutation.mutate({ id: pet.id, input })}
                  isSaving={updatePetMutation.isPending}
                  onDelete={() => handleDeletePet(pet.id)}
                  upcomingCount={careEventsForPet(careEvents, pet.id).filter((e) => !e.completed_at).length}
                />
              ))}

              {showPetForm ? (
                <NewPetForm
                  isSaving={createPetMutation.isPending}
                  onCancel={() => setShowPetForm(false)}
                  onSubmit={(input) => createPetMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowPetForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo pet</Text>
                </Pressable>
              )}
            </View>

            {selectedPet ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Cuidados — {selectedPet.name}
                </Text>

                {selectedPetEvents.length === 0 && !showEventForm ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                    Nenhum cuidado agendado ainda.
                  </Text>
                ) : null}

                {selectedPetEvents.map((event) => (
                  <CareEventCard
                    key={event.id}
                    event={event}
                    isEditing={editingEventId === event.id}
                    onStartEdit={() => setEditingEventId(event.id)}
                    onCancelEdit={() => setEditingEventId(null)}
                    onUpdate={(input) => updateEventMutation.mutate({ event, petName: selectedPet.name, input })}
                    isSaving={updateEventMutation.isPending}
                    onDelete={() => deleteEventMutation.mutate(event)}
                    onToggleCompleted={() => toggleEventMutation.mutate(event)}
                  />
                ))}

                {showEventForm ? (
                  <NewCareEventForm
                    isSaving={createEventMutation.isPending}
                    onCancel={() => setShowEventForm(false)}
                    onSubmit={(input) => createEventMutation.mutate({ petId: selectedPet.id, petName: selectedPet.name, input })}
                  />
                ) : (
                  <Pressable
                    onPress={() => setShowEventForm(true)}
                    style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo cuidado</Text>
                  </Pressable>
                )}
              </View>
            ) : pets.length > 0 ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                Toque num pet acima pra ver e agendar os cuidados dele.
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
