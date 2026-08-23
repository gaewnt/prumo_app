import { supabase } from "@/lib/supabase";
import { scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Pet — um ou mais bichos, cada um com seus próprios cuidados
 * agendados (vacina, consulta, vermífugo, banho/tosa) com lembrete opcional. Sem referência
 * dela — desenhado no mesmo molde dos compromissos da Saúde (mesmo tipo de evento, mesma
 * receita de lembrete), só que agrupado por pet em vez de ser só da pessoa.
 */

export type Pet = {
  id: string;
  name: string;
  species: string | null;
  birth_date: string | null;
  notes: string | null;
};

export const CARE_EVENT_KINDS = ["vacina", "consulta", "vermifugo", "banho_tosa", "outro"] as const;
export type CareEventKind = (typeof CARE_EVENT_KINDS)[number];

export const CARE_EVENT_KIND_LABELS: Record<CareEventKind, string> = {
  vacina: "Vacina",
  consulta: "Consulta",
  vermifugo: "Vermífugo",
  banho_tosa: "Banho/Tosa",
  outro: "Outro",
};

export const REMINDER_OFFSET_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No horário", value: 0 },
  { label: "1 hora antes", value: 60 },
  { label: "1 dia antes", value: 1440 },
] as const;

export type PetCareEvent = {
  id: string;
  pet_id: string;
  kind: CareEventKind;
  scheduled_at: string; // ISO
  reminder_offset_minutes: number | null;
  notes: string | null;
  completed_at: string | null;
  notification_id: string | null;
};

export async function fetchPet() {
  const [petsRes, eventsRes] = await Promise.all([
    supabase.from("pets").select("id, name, species, birth_date, notes").order("created_at", { ascending: true }),
    supabase
      .from("pet_care_events")
      .select("id, pet_id, kind, scheduled_at, reminder_offset_minutes, notes, completed_at, notification_id")
      .order("scheduled_at", { ascending: true }),
  ]);

  if (petsRes.error) throw petsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  return {
    pets: (petsRes.data ?? []) as Pet[],
    careEvents: (eventsRes.data ?? []) as PetCareEvent[],
  };
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

export type PetInput = { name: string; species: string; birthDate: string | null; notes: string };

export async function createPet(userId: string, input: PetInput) {
  const { error } = await supabase
    .from("pets")
    .insert({ user_id: userId, name: input.name, species: input.species || null, birth_date: input.birthDate, notes: input.notes || null });
  if (error) throw error;
}

export async function updatePet(petId: string, input: PetInput) {
  const { error } = await supabase
    .from("pets")
    .update({ name: input.name, species: input.species || null, birth_date: input.birthDate, notes: input.notes || null })
    .eq("id", petId);
  if (error) throw error;
}

/** Some com o pet e, em cascata, com os cuidados agendados dele. */
export async function deletePet(petId: string) {
  const { error } = await supabase.from("pets").delete().eq("id", petId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Cuidados agendados
// ---------------------------------------------------------------------------

export type CareEventInput = {
  kind: CareEventKind;
  scheduledAt: Date;
  reminderOffsetMinutes: number | null;
  notes: string;
};

function reminderBody(petName: string, input: CareEventInput) {
  const when = input.scheduledAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${CARE_EVENT_KIND_LABELS[input.kind]} de ${petName} em ${when}`;
}

async function scheduleCareReminder(petName: string, input: CareEventInput) {
  if (input.reminderOffsetMinutes === null) return null;
  const reminderDate = new Date(input.scheduledAt.getTime() - input.reminderOffsetMinutes * 60000);
  return scheduleOneTimeReminder(reminderDate, `${petName}: ${CARE_EVENT_KIND_LABELS[input.kind]}`, reminderBody(petName, input));
}

export async function createCareEvent(userId: string, petId: string, petName: string, input: CareEventInput) {
  const { data, error } = await supabase
    .from("pet_care_events")
    .insert({
      user_id: userId,
      pet_id: petId,
      kind: input.kind,
      scheduled_at: input.scheduledAt.toISOString(),
      reminder_offset_minutes: input.reminderOffsetMinutes,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleCareReminder(petName, input);
  if (notificationId) {
    await supabase.from("pet_care_events").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateCareEvent(event: PetCareEvent, petName: string, input: CareEventInput) {
  await cancelReminder(event.notification_id);
  const notificationId = await scheduleCareReminder(petName, input);

  const { error } = await supabase
    .from("pet_care_events")
    .update({
      kind: input.kind,
      scheduled_at: input.scheduledAt.toISOString(),
      reminder_offset_minutes: input.reminderOffsetMinutes,
      notification_id: notificationId,
      notes: input.notes || null,
    })
    .eq("id", event.id);
  if (error) throw error;
}

export async function toggleCareEventCompleted(event: PetCareEvent) {
  const { error } = await supabase
    .from("pet_care_events")
    .update({ completed_at: event.completed_at ? null : new Date().toISOString() })
    .eq("id", event.id);
  if (error) throw error;
}

export async function deleteCareEvent(event: PetCareEvent) {
  await cancelReminder(event.notification_id);
  const { error } = await supabase.from("pet_care_events").delete().eq("id", event.id);
  if (error) throw error;
}

export function careEventsForPet(events: PetCareEvent[], petId: string) {
  return events.filter((e) => e.pet_id === petId);
}

export function daysUntil(dateIso: string, now = new Date()) {
  return Math.ceil((new Date(dateIso).getTime() - now.getTime()) / 86400000);
}

export function formatEventDate(dateIso: string) {
  return new Date(dateIso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
