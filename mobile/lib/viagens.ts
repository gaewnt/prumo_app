import { supabase } from "@/lib/supabase";

/**
 * Camada de dados do módulo Viagens — cada viagem (nome, destino, datas, status) tem sua
 * própria checklist de itens (documentos, malas, reservas, outro), inspirado no uso do
 * Todoist pra organizar os preparativos de uma viagem em categorias separadas.
 */

export const TRIP_STATUSES = ["planejando", "confirmada", "concluida"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planejando: "Planejando",
  confirmada: "Confirmada",
  concluida: "Concluída",
};

export const CHECKLIST_CATEGORIES = ["documentos", "malas", "reservas", "outro"] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documentos: "Documentos",
  malas: "Malas",
  reservas: "Reservas",
  outro: "Outro",
};

export type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;
  status: TripStatus;
  notes: string | null;
};

export type TripChecklistItem = {
  id: string;
  trip_id: string;
  title: string;
  category: ChecklistCategory;
  done: boolean;
};

export async function fetchViagens() {
  const [tripsRes, itemsRes] = await Promise.all([
    supabase
      .from("trips")
      .select("id, name, destination, start_date, end_date, status, notes")
      .order("created_at", { ascending: true }),
    supabase.from("trip_checklist_items").select("id, trip_id, title, category, done").order("created_at", { ascending: true }),
  ]);

  if (tripsRes.error) throw tripsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  return {
    trips: (tripsRes.data ?? []) as Trip[],
    checklistItems: (itemsRes.data ?? []) as TripChecklistItem[],
  };
}

// ---------------------------------------------------------------------------
// Viagens
// ---------------------------------------------------------------------------

export type TripInput = {
  name: string;
  destination: string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  status: TripStatus;
  notes: string;
};

export async function createTrip(userId: string, input: TripInput) {
  const { error } = await supabase.from("trips").insert({
    user_id: userId,
    name: input.name,
    destination: input.destination || null,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function updateTrip(tripId: string, input: TripInput) {
  const { error } = await supabase
    .from("trips")
    .update({
      name: input.name,
      destination: input.destination || null,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      notes: input.notes || null,
    })
    .eq("id", tripId);
  if (error) throw error;
}

/** Some com a viagem e, em cascata, com a checklist dela. */
export async function deleteTrip(tripId: string) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw error;
}

export function tripsByStatus(trips: Trip[], status: TripStatus) {
  return trips.filter((t) => t.status === status);
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function createChecklistItem(userId: string, tripId: string, title: string, category: ChecklistCategory) {
  const { error } = await supabase
    .from("trip_checklist_items")
    .insert({ user_id: userId, trip_id: tripId, title, category });
  if (error) throw error;
}

export async function updateChecklistItem(itemId: string, title: string, category: ChecklistCategory) {
  const { error } = await supabase.from("trip_checklist_items").update({ title, category }).eq("id", itemId);
  if (error) throw error;
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const { error } = await supabase.from("trip_checklist_items").update({ done }).eq("id", itemId);
  if (error) throw error;
}

export async function deleteChecklistItem(itemId: string) {
  const { error } = await supabase.from("trip_checklist_items").delete().eq("id", itemId);
  if (error) throw error;
}

export function checklistForTrip(items: TripChecklistItem[], tripId: string) {
  return items.filter((i) => i.trip_id === tripId);
}

export function computeChecklistProgress(items: TripChecklistItem[]) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, ratio: total > 0 ? done / total : 0 };
}

export function formatTripDates(trip: Trip) {
  if (!trip.start_date) return null;
  const [, sm, sd] = trip.start_date.split("-");
  if (!trip.end_date || trip.end_date === trip.start_date) return `${sd}/${sm}`;
  const [, em, ed] = trip.end_date.split("-");
  return `${sd}/${sm} – ${ed}/${em}`;
}
