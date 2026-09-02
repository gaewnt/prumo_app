/**
 * Formatação e rótulos compartilhados entre as telas do módulo Veículo —
 * mesmo espírito de `lib/financas.ts`, mas mantido local a este módulo pra
 * não criar acoplamento com Finanças.
 */

import type { VehicleSituacao, VehicleCombustivel } from "@/lib/veiculo";
import type { RideAppOrigem, RideQuality } from "@/lib/veiculo";
import type { MaintenanceType } from "@/lib/veiculo";

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** `ocorrido_em` é timestamp ISO completo (com hora) — diferente de datas "YYYY-MM-DD"
 * puras, não tem o problema de fuso do `new Date("YYYY-MM-DD"), por isso pode usar
 * `new Date(iso)` direto aqui. */
export function formatRideDateTime(iso: string) {
  const date = new Date(iso);
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} · ${timeStr}`;
}

export const SITUACAO_LABELS: Record<VehicleSituacao, string> = {
  proprio: "Próprio (quitado)",
  financiado: "Financiado",
  alugado_semana: "Alugado por semana",
  alugado_mes: "Alugado por mês",
  outro: "Outro",
};

export const COMBUSTIVEL_LABELS: Record<VehicleCombustivel, string> = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  gnv: "GNV",
  diesel: "Diesel",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
};

export const APP_ORIGEM_LABELS: Record<RideAppOrigem, string> = {
  uber: "Uber",
  "99": "99",
  indrive: "InDrive",
  ifood: "iFood",
  mtentregas: "MT Entregas",
  manual: "Manual",
};

export const APP_ORIGEM_EMOJI: Record<RideAppOrigem, string> = {
  uber: "🚘",
  "99": "🚕",
  indrive: "🚗",
  ifood: "🍔",
  mtentregas: "🛵",
  manual: "✍️",
};

export const QUALITY_LABELS: Record<RideQuality, string> = {
  bom: "BOM",
  medio: "MÉDIO",
  ruim: "RUIM",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  troca_oleo: "Troca de óleo",
  pneus: "Pneus",
  freios: "Freios",
  revisao: "Revisão",
  bateria: "Bateria",
  suspensao: "Suspensão",
  outro: "Outro",
};

export const MAINTENANCE_TYPE_EMOJI: Record<MaintenanceType, string> = {
  troca_oleo: "🛢️",
  pneus: "🛞",
  freios: "🛑",
  revisao: "🔧",
  bateria: "🔋",
  suspensao: "⚙️",
  outro: "🧰",
};
