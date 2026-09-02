import { supabase } from "@/lib/supabase";

/**
 * Central de notificações — por enquanto, uma leitura amigável de
 * `module_events` (mesma tabela que hábitos, metas etc. já usam pra registrar
 * conquistas). Não é um sistema de push; é o "sininho" do cabeçalho mostrando
 * o que aconteceu recentemente nos módulos.
 */

export type ModuleEvent = {
  id: string;
  module_slug: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
};

const EVENT_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  habit_completed: (p) => `Hábito "${p.habit_name ?? ""}" marcado como feito 🔥`,
  goal_reached: (p) => `Meta "${p.goal_name ?? ""}" atingida 🎉`,
  budget_exceeded: (p) => `Categoria "${p.category ?? ""}" passou do orçamento do mês`,
};

export function describeEvent(event: ModuleEvent): string {
  const describer = EVENT_LABELS[event.event_type];
  if (describer) return describer(event.payload ?? {});
  return event.event_type.replace(/_/g, " ");
}

export async function fetchRecentEvents(limit = 30): Promise<ModuleEvent[]> {
  const { data, error } = await supabase
    .from("module_events")
    .select("id, module_slug, event_type, payload, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ModuleEvent[];
}
