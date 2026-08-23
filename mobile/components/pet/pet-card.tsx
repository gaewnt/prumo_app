import React from "react";
import { Text, View, Pressable } from "react-native";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { NewPetForm } from "@/components/pet/new-pet-form";
import type { Pet, PetInput } from "@/lib/pet";

type PetCardProps = {
  pet: Pet;
  isSelected: boolean;
  onSelect: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: PetInput) => void;
  isSaving: boolean;
  onDelete: () => void;
  upcomingCount: number;
};

export function PetCard({ pet, isSelected, onSelect, isEditing, onStartEdit, onCancelEdit, onUpdate, isSaving, onDelete, upcomingCount }: PetCardProps) {
  const { tokens } = useTheme();

  if (isEditing) {
    return (
      <NewPetForm
        initial={{ name: pet.name, species: pet.species ?? "", birthDate: pet.birth_date, notes: pet.notes ?? "" }}
        submitLabel="Salvar alterações"
        isSaving={isSaving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    );
  }

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: tokens.surface,
        borderColor: isSelected ? tokens.accent : tokens.border,
        borderWidth: isSelected ? 1.5 : 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>🐾 {pet.name}</Text>
      {pet.species ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>{pet.species}</Text>
      ) : null}
      {upcomingCount > 0 ? (
        <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12, color: tokens.accent }}>
          {upcomingCount} {upcomingCount === 1 ? "cuidado agendado" : "cuidados agendados"}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 2 }}>
        <Pressable onPress={onStartEdit} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.accent }}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>Excluir</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
