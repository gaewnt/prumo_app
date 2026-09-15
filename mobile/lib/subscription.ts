import { supabase } from "@/lib/supabase";

/**
 * Camada de dados do plano (Grátis / Prumo Plus). Por enquanto só lê o que está salvo em
 * `profiles.plan` — a cobrança de verdade (assinatura pela loja) ainda não está ligada, ver
 * o comentário em `app/(app)/prumo-plus.tsx` pro estado atual disso. Quais módulos exigem
 * Plus é decidido em `lib/modules.ts` (`plusOnly` em cada `ModuleDefinition`), não aqui —
 * esse arquivo só sabe qual é o plano da pessoa, não o que cada plano libera.
 */

export type Plan = "free" | "plus";

export async function fetchPlan(): Promise<Plan> {
  const { data, error } = await supabase.from("profiles").select("plan").single();
  if (error) throw error;
  return (data?.plan as Plan | null) ?? "free";
}
