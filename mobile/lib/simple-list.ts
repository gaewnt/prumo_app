import { supabase } from "@/lib/supabase";

/**
 * Camada de dados genérica pros 10 módulos "simples" (Saúde, Casa, Estudos,
 * Beleza, Viagens, Carreira, Mente, Relações, Pet, Detox) — todos usam a
 * mesma tabela `simple_module_items`, diferenciados só pelo `module_slug`.
 * A config de UI (rótulo do grupo, rótulo da data) fica em cada tela fina
 * de `mobile/app/(app)/modulo/<slug>.tsx`.
 */

export type SimpleListItem = {
  id: string;
  module_slug: string;
  group_name: string | null;
  title: string;
  notes: string | null;
  item_date: string | null; // YYYY-MM-DD
  done: boolean;
  position: number;
  created_at: string;
};

export type SimpleListItemDraft = {
  group_name: string | null;
  title: string;
  notes: string | null;
  item_date: string | null;
};

export async function fetchSimpleListItems(moduleSlug: string) {
  const { data, error } = await supabase
    .from("simple_module_items")
    .select("id, module_slug, group_name, title, notes, item_date, done, position, created_at")
    .eq("module_slug", moduleSlug)
    .order("done", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SimpleListItem[];
}

export async function createSimpleListItem(
  userId: string,
  moduleSlug: string,
  draft: SimpleListItemDraft
) {
  const { error } = await supabase.from("simple_module_items").insert({
    user_id: userId,
    module_slug: moduleSlug,
    group_name: draft.group_name,
    title: draft.title,
    notes: draft.notes,
    item_date: draft.item_date,
  });
  if (error) throw error;
}

export async function updateSimpleListItem(itemId: string, draft: SimpleListItemDraft) {
  const { error } = await supabase
    .from("simple_module_items")
    .update({
      group_name: draft.group_name,
      title: draft.title,
      notes: draft.notes,
      item_date: draft.item_date,
    })
    .eq("id", itemId);
  if (error) throw error;
}

export async function toggleSimpleListItemDone(itemId: string, done: boolean) {
  const { error } = await supabase
    .from("simple_module_items")
    .update({ done })
    .eq("id", itemId);
  if (error) throw error;
}

export async function deleteSimpleListItem(itemId: string) {
  const { error } = await supabase.from("simple_module_items").delete().eq("id", itemId);
  if (error) throw error;
}
