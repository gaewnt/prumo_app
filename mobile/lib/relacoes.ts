import { supabase } from "@/lib/supabase";
import { scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Relações — pessoas (com aniversário, pra saber quem tá
 * chegando) e lembretes avulsos ligados a elas (ex: "date night", "ligar pra vó"). Sem
 * referência específica dela — desenhado do zero.
 *
 * Limitação conhecida: o próximo aniversário é calculado sempre (lista "Próximos
 * aniversários"), mas não dispara notificação sozinho — a lib de notificação local não tem
 * um gatilho "todo ano" (só diário, semanal ou uma data específica), então um lembrete de
 * aniversário empurrado por notificação precisaria ser recriado a cada ano. Por enquanto só
 * mostra a lista na tela; os lembretes avulsos abaixo (não ligados a aniversário) sim podem
 * ter notificação, porque são pra uma data específica e não se repetem.
 */

export type Person = {
  id: string;
  name: string;
  relationship: string | null;
  birth_date: string | null; // YYYY-MM-DD (ano pode ser fictício se ela não quiser informar)
  notes: string | null;
};

export type RelationshipReminder = {
  id: string;
  person_id: string | null;
  title: string;
  reminder_date: string; // YYYY-MM-DD
  notification_id: string | null;
  notes: string | null;
  done: boolean;
};

export async function fetchRelacoes() {
  const [peopleRes, remindersRes] = await Promise.all([
    supabase.from("people").select("id, name, relationship, birth_date, notes").order("name", { ascending: true }),
    supabase
      .from("relationship_reminders")
      .select("id, person_id, title, reminder_date, notification_id, notes, done")
      .order("done", { ascending: true })
      .order("reminder_date", { ascending: true }),
  ]);

  if (peopleRes.error) throw peopleRes.error;
  if (remindersRes.error) throw remindersRes.error;

  return {
    people: (peopleRes.data ?? []) as Person[],
    reminders: (remindersRes.data ?? []) as RelationshipReminder[],
  };
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export type PersonInput = { name: string; relationship: string; birthDate: string | null; notes: string };

export async function createPerson(userId: string, input: PersonInput) {
  const { error } = await supabase
    .from("people")
    .insert({ user_id: userId, name: input.name, relationship: input.relationship || null, birth_date: input.birthDate, notes: input.notes || null });
  if (error) throw error;
}

export async function updatePerson(personId: string, input: PersonInput) {
  const { error } = await supabase
    .from("people")
    .update({ name: input.name, relationship: input.relationship || null, birth_date: input.birthDate, notes: input.notes || null })
    .eq("id", personId);
  if (error) throw error;
}

/** Some com a pessoa; lembretes ligados a ela ficam sem pessoa (não são apagados). */
export async function deletePerson(personId: string) {
  const { error } = await supabase.from("people").delete().eq("id", personId);
  if (error) throw error;
}

/** Dias até o próximo aniversário (0 = hoje), ignorando o ano de nascimento. */
export function daysUntilNextBirthday(birthDate: string, now = new Date()): number {
  const [, m, d] = birthDate.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function formatBirthdayLabel(birthDate: string) {
  const [, m, d] = birthDate.split("-");
  return `${d}/${m}`;
}

/** Pessoas com aniversário cadastrado, ordenadas pelas mais próximas primeiro. */
export function upcomingBirthdays(people: Person[]) {
  return people
    .filter((p) => p.birth_date)
    .map((p) => ({ person: p, daysUntil: daysUntilNextBirthday(p.birth_date as string) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// ---------------------------------------------------------------------------
// Lembretes avulsos
// ---------------------------------------------------------------------------

export type ReminderInput = { personId: string | null; title: string; reminderDate: string; remindMe: boolean; notes: string };

async function scheduleRelationshipReminder(input: ReminderInput) {
  if (!input.remindMe) return null;
  const [y, m, d] = input.reminderDate.split("-").map(Number);
  const reminderDate = new Date(y, m - 1, d, 9, 0, 0);
  return scheduleOneTimeReminder(reminderDate, input.title, input.notes || "Lembrete de hoje.");
}

export async function createRelationshipReminder(userId: string, input: ReminderInput) {
  const { data, error } = await supabase
    .from("relationship_reminders")
    .insert({ user_id: userId, person_id: input.personId, title: input.title, reminder_date: input.reminderDate, notes: input.notes || null })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleRelationshipReminder(input);
  if (notificationId) {
    await supabase.from("relationship_reminders").update({ notification_id: notificationId }).eq("id", data.id);
  }
}

export async function updateRelationshipReminder(reminder: RelationshipReminder, input: ReminderInput) {
  await cancelReminder(reminder.notification_id);
  const notificationId = await scheduleRelationshipReminder(input);

  const { error } = await supabase
    .from("relationship_reminders")
    .update({
      person_id: input.personId,
      title: input.title,
      reminder_date: input.reminderDate,
      notification_id: notificationId,
      notes: input.notes || null,
    })
    .eq("id", reminder.id);
  if (error) throw error;
}

export async function toggleRelationshipReminderDone(reminder: RelationshipReminder, done: boolean) {
  if (done) await cancelReminder(reminder.notification_id);
  const { error } = await supabase
    .from("relationship_reminders")
    .update({ done, notification_id: done ? null : reminder.notification_id })
    .eq("id", reminder.id);
  if (error) throw error;
}

export async function deleteRelationshipReminder(reminder: RelationshipReminder) {
  await cancelReminder(reminder.notification_id);
  const { error } = await supabase.from("relationship_reminders").delete().eq("id", reminder.id);
  if (error) throw error;
}

export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
