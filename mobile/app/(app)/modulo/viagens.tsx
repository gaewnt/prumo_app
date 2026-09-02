import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { TripCard } from "@/components/viagens/trip-card";
import { NewTripForm } from "@/components/viagens/new-trip-form";
import { ChecklistItemRow } from "@/components/viagens/checklist-item-row";
import { NewChecklistItemForm } from "@/components/viagens/new-checklist-item-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchViagens,
  createTrip,
  updateTrip,
  deleteTrip,
  tripsByStatus,
  createChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  checklistForTrip,
  computeChecklistProgress,
  TRIP_STATUSES,
  TRIP_STATUS_LABELS,
  type ChecklistCategory,
  type TripInput,
} from "@/lib/viagens";

/** Conteúdo de Viagens — usado tanto na rota própria quanto como aba dentro do hub Desenvolvimento Pessoal. */
export function ViagensContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["viagens", userId],
    queryFn: fetchViagens,
    enabled: !!userId,
  });
  const trips = query.data?.trips ?? [];
  const checklistItems = query.data?.checklistItems ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["viagens", userId] });
  }

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const selectedTripItems = selectedTripId ? checklistForTrip(checklistItems, selectedTripId) : [];

  const createTripMutation = useMutation({
    mutationFn: (input: TripInput) => createTrip(userId!, input),
    onSuccess: () => {
      setShowTripForm(false);
      invalidate();
    },
  });
  const updateTripMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TripInput }) => updateTrip(id, input),
    onSuccess: () => {
      setEditingTripId(null);
      invalidate();
    },
  });
  const deleteTripMutation = useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: invalidate,
  });

  function handleDeleteTrip(tripId: string) {
    if (selectedTripId === tripId) setSelectedTripId(null);
    deleteTripMutation.mutate(tripId);
  }

  const createItemMutation = useMutation({
    mutationFn: ({ tripId, title, category }: { tripId: string; title: string; category: ChecklistCategory }) =>
      createChecklistItem(userId!, tripId, title, category),
    onSuccess: invalidate,
  });
  const updateItemMutation = useMutation({
    mutationFn: ({ id, title, category }: { id: string; title: string; category: ChecklistCategory }) =>
      updateChecklistItem(id, title, category),
    onSuccess: () => {
      setEditingItemId(null);
      invalidate();
    },
  });
  const toggleItemMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleChecklistItem(id, done),
    onSuccess: invalidate,
  });
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: invalidate,
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>✈️</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Viagens</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Roteiro, checklist e datas de cada viagem.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar suas viagens agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 20 }}>
          {trips.length === 0 && !showTripForm ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Nenhuma viagem cadastrada ainda.
            </Text>
          ) : null}

          {TRIP_STATUSES.map((status) => {
            const statusTrips = tripsByStatus(trips, status);
            if (statusTrips.length === 0) return null;
            return (
              <View key={status} style={{ gap: 10 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  {TRIP_STATUS_LABELS[status]}
                </Text>
                {statusTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isSelected={selectedTripId === trip.id}
                    onSelect={() => setSelectedTripId((current) => (current === trip.id ? null : trip.id))}
                    isEditing={editingTripId === trip.id}
                    onStartEdit={() => setEditingTripId(trip.id)}
                    onCancelEdit={() => setEditingTripId(null)}
                    onUpdate={(input) => updateTripMutation.mutate({ id: trip.id, input })}
                    isSaving={updateTripMutation.isPending}
                    onDelete={() => handleDeleteTrip(trip.id)}
                    checklistProgress={computeChecklistProgress(checklistForTrip(checklistItems, trip.id))}
                  />
                ))}
              </View>
            );
          })}

          {showTripForm ? (
            <NewTripForm
              isSaving={createTripMutation.isPending}
              onCancel={() => setShowTripForm(false)}
              onSubmit={(input) => createTripMutation.mutate(input)}
            />
          ) : (
            <Pressable
              onPress={() => setShowTripForm(true)}
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
                + Nova viagem
              </Text>
            </Pressable>
          )}

          {selectedTrip ? (
            <View
              style={{
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 14,
                padding: 14,
                gap: 10,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Checklist — {selectedTrip.name}
              </Text>

              {selectedTripItems.length === 0 ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Nenhum item cadastrado ainda.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {selectedTripItems.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      isEditing={editingItemId === item.id}
                      onStartEdit={() => setEditingItemId(item.id)}
                      onCancelEdit={() => setEditingItemId(null)}
                      onUpdate={(title, category) => updateItemMutation.mutate({ id: item.id, title, category })}
                      onToggle={() => toggleItemMutation.mutate({ id: item.id, done: !item.done })}
                      onDelete={() => deleteItemMutation.mutate(item.id)}
                    />
                  ))}
                </View>
              )}

              <NewChecklistItemForm
                isSaving={createItemMutation.isPending}
                onSubmit={(title, category) => createItemMutation.mutate({ tripId: selectedTrip.id, title, category })}
              />
            </View>
          ) : trips.length > 0 ? (
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              Toque numa viagem acima pra ver e editar a checklist dela.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function ViagensScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>
        <ViagensContent />
      </View>
    </Screen>
  );
}
