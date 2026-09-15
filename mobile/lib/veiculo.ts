import { supabase } from "@/lib/supabase";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  COPILOTO_INCOME_CATEGORY,
  VEHICLE_FUEL_CATEGORY,
  VEHICLE_MAINTENANCE_CATEGORY,
} from "@/lib/financas";
import { scheduleOneTimeReminder, cancelReminder } from "@/lib/notifications";

/**
 * Camada de dados do módulo Veículo — cadastro do veículo de trabalho, custos
 * fixos, corridas/entregas (manuais ou detectadas pelo Copiloto) e os
 * indicadores de faturamento/custo/lucro por hora e por km.
 *
 * Datas: sempre usar `toDateString`/construtor numérico do `Date` (nunca
 * `new Date("YYYY-MM-DD")`, que é interpretado em UTC e desloca um dia pra
 * trás em qualquer fuso do Brasil — bug já visto e corrigido em `financas.ts`).
 *
 * Integração com Finanças — o dinheiro do Copiloto aparece
 * na visão financeira geral: toda corrida vira uma receita, todo abastecimento/manutenção
 * vira uma despesa, automaticamente, sem conta vinculada (entram só no resumo geral do mês,
 * igual um lançamento manual sem conta escolhida). O vínculo (`finance_transaction_id`) fica
 * guardado na própria corrida/abastecimento/manutenção, pra editar ou excluir a origem
 * manter o lançamento em Finanças em sincronia (nunca fica um lançamento "solto"
 * desatualizado). Registros de ANTES dessa integração existir ainda não têm vínculo — mas
 * ganham um assim que forem editados pela primeira vez (`update*` cria o vínculo se não
 * existir, em vez de só sincronizar um que já existe).
 */

export type VehicleSituacao = "proprio" | "financiado" | "alugado_semana" | "alugado_mes" | "outro";
export type VehicleCombustivel = "flex" | "gasolina" | "etanol" | "gnv" | "diesel" | "eletrico" | "hibrido";

export type Vehicle = {
  id: string;
  tipo: "carro" | "moto";
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  situacao: VehicleSituacao | null;
  combustivel: VehicleCombustivel | null;
  consumo_medio: number | null;
  km_atual: number | null;
  km_rodados_mes: number | null;
  preco_combustivel: number | null;
  financiamento_parcela: number | null;
  financiamento_vencimento_dia: number | null;
  financiamento_parcelas_restantes: number | null;
  seguro_mensal: number | null;
  valor_veiculo: number | null;
  ipva_anual: number | null;
  custos_pessoais_mes: number | null;
  lucro_desejado_mes: number | null;
};

export type RideAppOrigem = "uber" | "99" | "indrive" | "ifood" | "mtentregas" | "manual";

export type VehicleRide = {
  id: string;
  vehicle_id: string | null;
  app_origem: RideAppOrigem | null;
  origem_deteccao: "auto" | "manual";
  valor: number;
  /** Valor REAL recebido, se diferente do bruto (taxa de saque/imposto da plataforma) —
   * Quando preenchido, é ele que vira a receita em Finanças; os
   * indicadores de R$/km e R$/hora do Copiloto continuam usando `valor` (bruto). */
  valor_liquido: number | null;
  distancia_km: number | null;
  duracao_min: number | null;
  horas_trabalhadas: number | null;
  km_rodados: number | null;
  ocorrido_em: string; // ISO timestamp
  finance_transaction_id: string | null;
};

export type PeriodKind = "dia" | "semana" | "mes" | "ano";

/** Formata uma data no fuso local (evita o off-by-one de `toISOString`, que usa UTC). */
export function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Início/fim (inclusive) de um período, em horário local — usado pra filtrar corridas. */
export function periodRange(kind: PeriodKind, reference: Date): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);

  if (kind === "dia") return { start, end };

  if (kind === "semana") {
    const dow = start.getDay(); // 0 = domingo
    start.setDate(start.getDate() - dow);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (kind === "mes") {
    start.setDate(1);
    const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end: monthEnd };
  }

  // ano
  start.setMonth(0, 1);
  const yearEnd = new Date(reference.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end: yearEnd };
}

export async function fetchActiveVehicle(): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Vehicle) ?? null;
}

export async function upsertVehicle(userId: string, vehicleId: string | null, fields: Partial<Vehicle>) {
  if (vehicleId) {
    const { error } = await supabase.from("vehicles").update(fields).eq("id", vehicleId);
    if (error) throw error;
    return vehicleId;
  }
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ user_id: userId, ...fields })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function fetchRides(start: Date, end: Date): Promise<VehicleRide[]> {
  const { data, error } = await supabase
    .from("vehicle_rides")
    .select("*")
    .gte("ocorrido_em", start.toISOString())
    .lte("ocorrido_em", end.toISOString())
    .order("ocorrido_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleRide[];
}

/** Descrição fixa, simples de propósito — ver comentário de integração no topo do arquivo. */
const RIDE_TRANSACTION_DESCRIPTION = "Corrida (Copiloto)";

export async function createRide(
  userId: string,
  vehicleId: string | null,
  fields: {
    app_origem: RideAppOrigem;
    origem_deteccao: "auto" | "manual";
    valor: number;
    valor_liquido?: number | null;
    distancia_km?: number | null;
    duracao_min?: number | null;
    horas_trabalhadas?: number | null;
    km_rodados?: number | null;
    ocorrido_em?: string;
  }
) {
  const { data, error } = await supabase
    .from("vehicle_rides")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      ...fields,
    })
    .select("id, ocorrido_em")
    .single();
  if (error) throw error;

  const transactionId = await createTransaction(userId, {
    kind: "income",
    category: COPILOTO_INCOME_CATEGORY,
    amount: fields.valor_liquido ?? fields.valor,
    description: RIDE_TRANSACTION_DESCRIPTION,
    occurredAt: (data.ocorrido_em as string).slice(0, 10),
  });
  await supabase.from("vehicle_rides").update({ finance_transaction_id: transactionId }).eq("id", data.id);
}

/** Edição de uma corrida já lançada (manual ou detectada) — corrige valor/km/tempo digitados
 * errado. Também mantém o lançamento em Finanças em sincronia (cria o vínculo agora, se a
 * corrida for de antes dessa integração existir). */
export async function updateRide(
  userId: string,
  rideId: string,
  fields: Partial<{
    valor: number;
    valor_liquido: number | null;
    distancia_km: number | null;
    duracao_min: number | null;
    horas_trabalhadas: number | null;
    km_rodados: number | null;
    ocorrido_em: string;
  }>
) {
  const { data, error } = await supabase
    .from("vehicle_rides")
    .update(fields)
    .eq("id", rideId)
    .select("valor, valor_liquido, ocorrido_em, finance_transaction_id")
    .single();
  if (error) throw error;

  const transactionInput = {
    kind: "income" as const,
    category: COPILOTO_INCOME_CATEGORY,
    amount: data.valor_liquido ?? data.valor,
    description: RIDE_TRANSACTION_DESCRIPTION,
    occurredAt: (data.ocorrido_em as string).slice(0, 10),
  };
  if (data.finance_transaction_id) {
    await updateTransaction(data.finance_transaction_id, transactionInput);
  } else {
    const transactionId = await createTransaction(userId, transactionInput);
    await supabase.from("vehicle_rides").update({ finance_transaction_id: transactionId }).eq("id", rideId);
  }
}

export async function deleteRide(rideId: string) {
  const { data: existing } = await supabase
    .from("vehicle_rides")
    .select("finance_transaction_id")
    .eq("id", rideId)
    .maybeSingle();
  const { error } = await supabase.from("vehicle_rides").delete().eq("id", rideId);
  if (error) throw error;
  if (existing?.finance_transaction_id) {
    await deleteTransaction(existing.finance_transaction_id);
  }
}

/** Custo fixo mensal do veículo: parcela do financiamento + seguro + IPVA rateado por mês. */
export function monthlyFixedCost(vehicle: Vehicle | null): number {
  if (!vehicle) return 0;
  const parcela = vehicle.situacao === "financiado" ? vehicle.financiamento_parcela ?? 0 : 0;
  const seguro = vehicle.seguro_mensal ?? 0;
  const ipvaMensal = (vehicle.ipva_anual ?? 0) / 12;
  return parcela + seguro + ipvaMensal;
}

/** Consumo/preço reais calculados a partir dos abastecimentos (ver `averageRealConsumption`/
 * `averageFuelPrice` abaixo) — quando existem, são mais confiáveis que os campos digitados à
 * mão no cadastro do veículo, então `fuelCostPerKm`/`computeVehicleStats` usam isso primeiro
 * e só caem pro campo manual se ainda não houver abastecimento suficiente registrado. */
export type RealFuelData = { consumoMedio: number | null; precoLitro: number | null };

/** Custo de combustível por km — só calculável se preço e consumo médio estiverem disponíveis
 * (reais, vindos dos abastecimentos, ou manuais, digitados no cadastro do veículo). */
export function fuelCostPerKm(vehicle: Vehicle | null, real?: RealFuelData): number {
  const consumo = real?.consumoMedio ?? vehicle?.consumo_medio ?? null;
  const preco = real?.precoLitro ?? vehicle?.preco_combustivel ?? null;
  if (!vehicle || !preco || !consumo) return 0;
  return preco / consumo;
}

export type VehicleStats = {
  faturamento: number;
  despesasTotais: number;
  saldoLivre: number;
  horasTrabalhadas: number;
  kmRodados: number;
  faturamentoMedioPorHora: number;
  faturamentoMedioPorKm: number;
  custoPorHora: number;
  custoPorKm: number;
  lucroPorHora: number;
  lucroPorKm: number;
};

/**
 * Indicadores do período: proporcionaliza o custo fixo mensal do veículo pelos
 * dias do período (ex: 1 dia = 1/30 do custo fixo do mês) e soma o custo
 * variável de combustível pelos km efetivamente rodados nas corridas do período.
 */
export function computeVehicleStats(
  rides: VehicleRide[],
  vehicle: Vehicle | null,
  periodDays: number,
  realFuel?: RealFuelData,
  /** Soma das manutenções (`VehicleMaintenanceLog.valor`) realizadas dentro do mesmo
   * período — ver `sumInPeriod`. Custo real, lançado, não estimado. */
  manutencaoNoPeriodo: number = 0
): VehicleStats {
  const faturamento = rides.reduce((sum, r) => sum + (r.valor ?? 0), 0);
  const horasTrabalhadas = rides.reduce((sum, r) => sum + (r.horas_trabalhadas ?? 0), 0);
  const kmRodados = rides.reduce((sum, r) => sum + (r.km_rodados ?? r.distancia_km ?? 0), 0);

  const fixedMonthly = monthlyFixedCost(vehicle);
  const fixedForPeriod = (fixedMonthly / 30) * periodDays;
  const fuelForPeriod = fuelCostPerKm(vehicle, realFuel) * kmRodados;
  const despesasTotais = fixedForPeriod + fuelForPeriod + manutencaoNoPeriodo;

  const saldoLivre = faturamento - despesasTotais;

  return {
    faturamento,
    despesasTotais,
    saldoLivre,
    horasTrabalhadas,
    kmRodados,
    faturamentoMedioPorHora: horasTrabalhadas > 0 ? faturamento / horasTrabalhadas : 0,
    faturamentoMedioPorKm: kmRodados > 0 ? faturamento / kmRodados : 0,
    custoPorHora: horasTrabalhadas > 0 ? despesasTotais / horasTrabalhadas : 0,
    custoPorKm: kmRodados > 0 ? despesasTotais / kmRodados : 0,
    lucroPorHora: horasTrabalhadas > 0 ? saldoLivre / horasTrabalhadas : 0,
    lucroPorKm: kmRodados > 0 ? saldoLivre / kmRodados : 0,
  };
}

/** Progresso da meta de faturamento do mês (0–1), usando a meta = custos pessoais + lucro desejado. */
export function goalProgress(stats: VehicleStats, vehicle: Vehicle | null): { current: number; goal: number; pct: number } {
  const goal = (vehicle?.custos_pessoais_mes ?? 0) + (vehicle?.lucro_desejado_mes ?? 0);
  const pct = goal > 0 ? Math.min(1, stats.faturamento / goal) : 0;
  return { current: stats.faturamento, goal, pct };
}

/**
 * Avalia se um valor de corrida está bom, médio ou ruim por km/hora/minuto —
 * limiares simples e ajustáveis, iguais em espírito ao selo "BOM/RUIM" do
 * calculador do Copiloto.
 */
export type RideQuality = "bom" | "medio" | "ruim";

export function rateRideValue(valuePerUnit: number, kind: "km" | "hora" | "min"): RideQuality {
  const thresholds: Record<typeof kind, [number, number]> = {
    km: [1.5, 2.2],
    hora: [25, 40],
    min: [0.5, 0.8],
  } as any;
  const [low, high] = thresholds[kind];
  if (valuePerUnit >= high) return "bom";
  if (valuePerUnit >= low) return "medio";
  return "ruim";
}

/**
 * Abastecimentos — registra valor total gasto e km
 * atual, e a partir do último abastecimento calcula a média pra saber o consumo real do
 * veículo (mesma ideia de apps como o Fuelio). Cada linha assume tanque cheio (mesma simplificação que a maioria dos
 * apps de consumo usa): o consumo do abastecimento é sempre "km rodados desde o anterior ÷
 * litros deste abastecimento".
 */
export type VehicleFuelLog = {
  id: string;
  vehicle_id: string;
  abastecido_em: string; // "YYYY-MM-DD"
  km_atual: number;
  litros: number;
  valor_total: number;
  /** Às vezes o abastecimento cobre só uma parte do tanque (ex: R$50).
   * O consumo real só pode ser calculado com segurança entre dois abastecimentos de tanque
   * cheio; um parcial no meio entra na soma de litros, mas não fecha uma conta sozinho. */
  tanque_cheio: boolean;
  finance_transaction_id: string | null;
};

/** Sempre ordenado por km_atual crescente — é a ordem que `computeFuelConsumption` espera
 * pra saber quem é "o abastecimento anterior" de cada linha. */
export async function fetchFuelLogs(vehicleId: string): Promise<VehicleFuelLog[]> {
  const { data, error } = await supabase
    .from("vehicle_fuel_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("km_atual", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VehicleFuelLog[];
}

/** Sincroniza `vehicles.km_atual` (o campo manual usado em Configurações e no resto do
 * módulo) com o km de um abastecimento/manutenção — só AVANÇA, nunca volta: um lançamento
 * retroativo com km menor não pode "atrasar" o km atual do veículo. Quem quiser corrigir
 * o km atual pra um valor menor sempre pode editar direto em Configurações. */
async function syncVehicleKmAtual(vehicleId: string, km: number | null) {
  if (km == null) return;
  const { data: vehicle } = await supabase.from("vehicles").select("km_atual").eq("id", vehicleId).maybeSingle();
  if (vehicle && (vehicle.km_atual == null || km > vehicle.km_atual)) {
    await supabase.from("vehicles").update({ km_atual: km }).eq("id", vehicleId);
  }
}

export async function createFuelLog(
  userId: string,
  vehicleId: string,
  fields: { abastecido_em: string; km_atual: number; litros: number; valor_total: number; tanque_cheio: boolean }
) {
  const { data, error } = await supabase
    .from("vehicle_fuel_logs")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw error;

  const transactionId = await createTransaction(userId, {
    kind: "expense",
    category: VEHICLE_FUEL_CATEGORY,
    amount: fields.valor_total,
    description: "Abastecimento",
    occurredAt: fields.abastecido_em,
  });
  await supabase.from("vehicle_fuel_logs").update({ finance_transaction_id: transactionId }).eq("id", data.id);
  await syncVehicleKmAtual(vehicleId, fields.km_atual);
}

export async function updateFuelLog(
  userId: string,
  logId: string,
  fields: Partial<{
    abastecido_em: string;
    km_atual: number;
    litros: number;
    valor_total: number;
    tanque_cheio: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("vehicle_fuel_logs")
    .update(fields)
    .eq("id", logId)
    .select("valor_total, abastecido_em, finance_transaction_id, vehicle_id, km_atual")
    .single();
  if (error) throw error;

  const transactionInput = {
    kind: "expense" as const,
    category: VEHICLE_FUEL_CATEGORY,
    amount: data.valor_total,
    description: "Abastecimento",
    occurredAt: data.abastecido_em as string,
  };
  if (data.finance_transaction_id) {
    await updateTransaction(data.finance_transaction_id, transactionInput);
  } else {
    const transactionId = await createTransaction(userId, transactionInput);
    await supabase.from("vehicle_fuel_logs").update({ finance_transaction_id: transactionId }).eq("id", logId);
  }
  if (fields.km_atual != null) {
    await syncVehicleKmAtual(data.vehicle_id as string, data.km_atual as number);
  }
}

export async function deleteFuelLog(logId: string) {
  const { data: existing } = await supabase
    .from("vehicle_fuel_logs")
    .select("finance_transaction_id")
    .eq("id", logId)
    .maybeSingle();
  const { error } = await supabase.from("vehicle_fuel_logs").delete().eq("id", logId);
  if (error) throw error;
  if (existing?.finance_transaction_id) {
    await deleteTransaction(existing.finance_transaction_id);
  }
}

export type FuelLogWithConsumption = VehicleFuelLog & {
  precoLitro: number;
  /** Só preenchido quando este é um tanque cheio com um tanque cheio anterior pra comparar. */
  kmDesdeUltimoTanqueCheio: number | null;
  /** Soma de litros de todos os abastecimentos (parciais + este) desde o tanque cheio
   * anterior — é o divisor certo do consumo, não só os litros deste lançamento. */
  litrosDesdeUltimoTanqueCheio: number | null;
  consumoKmL: number | null;
};

/**
 * Espera `logs` ordenados por km_atual crescente (a ordem que `fetchFuelLogs` já devolve).
 *
 * Consumo real só é confiável entre dois abastecimentos de TANQUE CHEIO — é preciso saber
 * quanto coube no tanque pra saber quanto ele rendeu. Um abastecimento parcial no meio (ex:
 * só R$50) não fecha a conta sozinho, mas os litros dele entram na soma até o próximo tanque
 * cheio: consumo = (km do tanque cheio atual − km do tanque cheio anterior) ÷ (litros de
 * TODOS os abastecimentos nesse intervalo, parciais inclusos). Mesma lógica que o Fuelio usa.
 */
export function computeFuelConsumption(logs: VehicleFuelLog[]): FuelLogWithConsumption[] {
  let lastFullTankLog: VehicleFuelLog | null = null;
  let litrosAcumulados = 0;

  return logs.map((log) => {
    const precoLitro = log.litros > 0 ? log.valor_total / log.litros : 0;
    litrosAcumulados += log.litros;

    let kmDesdeUltimoTanqueCheio: number | null = null;
    let litrosDesdeUltimoTanqueCheio: number | null = null;
    let consumoKmL: number | null = null;

    if (log.tanque_cheio) {
      if (lastFullTankLog) {
        kmDesdeUltimoTanqueCheio = log.km_atual - lastFullTankLog.km_atual;
        litrosDesdeUltimoTanqueCheio = litrosAcumulados;
        if (kmDesdeUltimoTanqueCheio > 0 && litrosAcumulados > 0) {
          consumoKmL = kmDesdeUltimoTanqueCheio / litrosAcumulados;
        }
      }
      lastFullTankLog = log;
      litrosAcumulados = 0;
    }

    return { ...log, precoLitro, kmDesdeUltimoTanqueCheio, litrosDesdeUltimoTanqueCheio, consumoKmL };
  });
}

/** Média dos consumos reais calculados — ignora o primeiro abastecimento (não tem um
 * anterior pra comparar) e qualquer linha sem km/litros suficientes. `null` se não houver
 * pelo menos um consumo calculável ainda, sinal de usar o "consumo médio" manual como
 * substituto (ver `fuelCostPerKm`). */
export function averageRealConsumption(logsWithConsumption: FuelLogWithConsumption[]): number | null {
  const values = logsWithConsumption.map((l) => l.consumoKmL).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Preço médio pago por litro nos abastecimentos registrados. */
export function averageFuelPrice(logs: VehicleFuelLog[]): number | null {
  const values = logs.map((l) => (l.litros > 0 ? l.valor_total / l.litros : null)).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Manutenção do veículo — registro adicionado junto com abastecimento, cobrindo o mesmo
 * tipo de despesa recorrente. Cada lançamento soma no "despesas totais"/"saldo livre" do período em que foi
 * feito (`computeVehicleStats`, via `sumInPeriod`).
 */
export type MaintenanceType = "troca_oleo" | "pneus" | "freios" | "revisao" | "bateria" | "suspensao" | "outro";

export type VehicleMaintenanceLog = {
  id: string;
  vehicle_id: string;
  tipo: MaintenanceType;
  descricao: string | null;
  valor: number;
  km_atual: number | null;
  realizado_em: string; // "YYYY-MM-DD"
  finance_transaction_id: string | null;
};

/** Rótulo curto por tipo, só pra descrição do lançamento gerado em Finanças — duplicado de
 * propósito em vez de importar `MAINTENANCE_TYPE_LABELS` (esse é da camada de UI, em
 * `components/veiculo/format.ts`; `lib/` não depende de `components/`). */
const MAINTENANCE_TRANSACTION_LABEL: Record<MaintenanceType, string> = {
  troca_oleo: "Troca de óleo",
  pneus: "Pneus",
  freios: "Freios",
  revisao: "Revisão",
  bateria: "Bateria",
  suspensao: "Suspensão",
  outro: "Manutenção",
};

function maintenanceTransactionDescription(tipo: MaintenanceType, descricao: string | null): string {
  if (tipo === "outro" && descricao) return descricao;
  return MAINTENANCE_TRANSACTION_LABEL[tipo];
}

/** Sempre ordenado do mais recente pro mais antigo — é a ordem certa pro histórico exibido
 * na tela; quem precisa somar por período usa `sumInPeriod` em cima do array já carregado. */
export async function fetchMaintenanceLogs(vehicleId: string): Promise<VehicleMaintenanceLog[]> {
  const { data, error } = await supabase
    .from("vehicle_maintenance_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("realizado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VehicleMaintenanceLog[];
}

export async function createMaintenanceLog(
  userId: string,
  vehicleId: string,
  fields: { tipo: MaintenanceType; descricao: string | null; valor: number; km_atual: number | null; realizado_em: string }
) {
  const { data, error } = await supabase
    .from("vehicle_maintenance_logs")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      ...fields,
    })
    .select("id")
    .single();
  if (error) throw error;

  const transactionId = await createTransaction(userId, {
    kind: "expense",
    category: VEHICLE_MAINTENANCE_CATEGORY,
    amount: fields.valor,
    description: maintenanceTransactionDescription(fields.tipo, fields.descricao),
    occurredAt: fields.realizado_em,
  });
  await supabase.from("vehicle_maintenance_logs").update({ finance_transaction_id: transactionId }).eq("id", data.id);
}

export async function updateMaintenanceLog(
  userId: string,
  logId: string,
  fields: Partial<{
    tipo: MaintenanceType;
    descricao: string | null;
    valor: number;
    km_atual: number | null;
    realizado_em: string;
  }>
) {
  const { data, error } = await supabase
    .from("vehicle_maintenance_logs")
    .update(fields)
    .eq("id", logId)
    .select("tipo, descricao, valor, realizado_em, finance_transaction_id")
    .single();
  if (error) throw error;

  const transactionInput = {
    kind: "expense" as const,
    category: VEHICLE_MAINTENANCE_CATEGORY,
    amount: data.valor,
    description: maintenanceTransactionDescription(data.tipo as MaintenanceType, data.descricao),
    occurredAt: data.realizado_em as string,
  };
  if (data.finance_transaction_id) {
    await updateTransaction(data.finance_transaction_id, transactionInput);
  } else {
    const transactionId = await createTransaction(userId, transactionInput);
    await supabase.from("vehicle_maintenance_logs").update({ finance_transaction_id: transactionId }).eq("id", logId);
  }
}

export async function deleteMaintenanceLog(logId: string) {
  const { data: existing } = await supabase
    .from("vehicle_maintenance_logs")
    .select("finance_transaction_id")
    .eq("id", logId)
    .maybeSingle();
  const { error } = await supabase.from("vehicle_maintenance_logs").delete().eq("id", logId);
  if (error) throw error;
  if (existing?.finance_transaction_id) {
    await deleteTransaction(existing.finance_transaction_id);
  }
}

// ============================================================
// Manutenção agendada — diferente de `VehicleMaintenanceLog` (sempre passado, já feita),
// isso é a próxima manutenção PREVISTA, por data e/ou por km. Por km compara direto com
// `vehicle.km_atual` (o mesmo campo manual usado no resto do módulo) — não existe no app
// nenhuma leitura confiável de "km de hoje" pra fazer melhor que isso (ver `distributeOdometerLogs`,
// que só interpola entre leituras já registradas, nunca projeta pra frente).
// ============================================================

export const MAINTENANCE_SCHEDULE_REMINDER_OPTIONS = [
  { label: "Sem lembrete", value: null },
  { label: "No dia (9h)", value: 0 },
  { label: "1 dia antes", value: 1 },
  { label: "3 dias antes", value: 3 },
  { label: "1 semana antes", value: 7 },
] as const;

export type VehicleMaintenanceSchedule = {
  id: string;
  vehicle_id: string;
  tipo: MaintenanceType;
  descricao: string | null;
  due_date: string | null; // "YYYY-MM-DD"
  due_km: number | null;
  reminder_days_before: number | null;
  notification_id: string | null;
  notes: string | null;
  done: boolean;
};

/** Mais antigas (por data) primeiro, pendentes antes das já concluídas. */
export async function fetchMaintenanceSchedules(vehicleId: string): Promise<VehicleMaintenanceSchedule[]> {
  const { data, error } = await supabase
    .from("vehicle_maintenance_schedules")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as VehicleMaintenanceSchedule[];
}

export type MaintenanceScheduleInput = {
  tipo: MaintenanceType;
  descricao: string | null;
  /** Pelo menos um de `dueDate`/`dueKm` precisa vir preenchido (travado por check no banco). */
  dueDate: string | null;
  dueKm: number | null;
  /** Só faz sentido junto de `dueDate` — não dá pra agendar notificação em cima de "quando
   * bater tal km", só existe gatilho de data/hora. */
  reminderDaysBefore: number | null;
  notes: string;
};

async function scheduleMaintenanceReminder(input: MaintenanceScheduleInput): Promise<string | null> {
  if (!input.dueDate || input.reminderDaysBefore === null) return null;
  const [y, m, d] = input.dueDate.split("-").map(Number);
  const reminderDate = new Date(y, m - 1, d, 9, 0, 0);
  reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);
  const body = input.notes ? input.notes : "Manutenção prevista chegando — dá uma olhada.";
  return scheduleOneTimeReminder(reminderDate, `Manutenção: ${MAINTENANCE_TRANSACTION_LABEL[input.tipo]}`, body);
}

export async function createMaintenanceSchedule(userId: string, vehicleId: string, input: MaintenanceScheduleInput) {
  const { data, error } = await supabase
    .from("vehicle_maintenance_schedules")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      tipo: input.tipo,
      descricao: input.descricao,
      due_date: input.dueDate,
      due_km: input.dueKm,
      reminder_days_before: input.reminderDaysBefore,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const notificationId = await scheduleMaintenanceReminder(input);
  if (notificationId) {
    await supabase
      .from("vehicle_maintenance_schedules")
      .update({ notification_id: notificationId })
      .eq("id", data.id);
  }
}

export async function updateMaintenanceSchedule(
  schedule: VehicleMaintenanceSchedule,
  input: MaintenanceScheduleInput
) {
  await cancelReminder(schedule.notification_id);
  const notificationId = await scheduleMaintenanceReminder(input);

  const { error } = await supabase
    .from("vehicle_maintenance_schedules")
    .update({
      tipo: input.tipo,
      descricao: input.descricao,
      due_date: input.dueDate,
      due_km: input.dueKm,
      reminder_days_before: input.reminderDaysBefore,
      notification_id: notificationId,
      notes: input.notes || null,
    })
    .eq("id", schedule.id);
  if (error) throw error;
}

/** Marca como feita (ou volta a marcar como pendente) sem apagar — se a manutenção
 * realmente aconteceu, o certo é também lançar em "Manutenção" (histórico); isso aqui só
 * encerra o lembrete. */
export async function toggleMaintenanceScheduleDone(schedule: VehicleMaintenanceSchedule, done: boolean) {
  if (done) await cancelReminder(schedule.notification_id);
  const { error } = await supabase
    .from("vehicle_maintenance_schedules")
    .update({ done, notification_id: done ? null : schedule.notification_id })
    .eq("id", schedule.id);
  if (error) throw error;
}

export async function deleteMaintenanceSchedule(schedule: VehicleMaintenanceSchedule) {
  await cancelReminder(schedule.notification_id);
  const { error } = await supabase.from("vehicle_maintenance_schedules").delete().eq("id", schedule.id);
  if (error) throw error;
}

/** Soma o `valor` de lançamentos com data "YYYY-MM-DD" dentro de um período — usado pra
 * somar manutenções (mas serve pra qualquer lista com esse formato). Constrói a data pelo
 * construtor numérico (nunca `new Date("YYYY-MM-DD")`, que é UTC e desloca um dia pra trás
 * em qualquer fuso do Brasil — mesmo cuidado do resto do módulo). */
export function sumInPeriod(logs: { realizado_em: string; valor: number }[], start: Date, end: Date): number {
  return logs.reduce((sum, log) => {
    const [y, m, d] = log.realizado_em.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date >= start && date <= end) return sum + log.valor;
    return sum;
  }, 0);
}

/**
 * "Km do dia" — leituras esparsas do painel (a pessoa não precisa lançar
 * todo dia). Um registro de 400 km no dia 1 e 800 km no dia 7, por exemplo, distribui os 400km
 * rodados pela quantidade de dias sem marcação entre eles: guardamos só a leitura bruta e a
 * distribuição é sempre recalculada em código — nunca um valor "esquecido" é inventado e
 * gravado como se fosse real.
 */
export type VehicleOdometerLog = {
  id: string;
  vehicle_id: string;
  data: string; // "YYYY-MM-DD"
  km_atual: number;
};

/** Sempre ordenado por data crescente — é a ordem que `distributeOdometerLogs` espera. */
export async function fetchOdometerLogs(vehicleId: string): Promise<VehicleOdometerLog[]> {
  const { data, error } = await supabase
    .from("vehicle_odometer_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("data", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VehicleOdometerLog[];
}

export async function createOdometerLog(userId: string, vehicleId: string, fields: { data: string; km_atual: number }) {
  const { error } = await supabase.from("vehicle_odometer_logs").insert({
    user_id: userId,
    vehicle_id: vehicleId,
    ...fields,
  });
  if (error) throw error;
}

export async function updateOdometerLog(logId: string, fields: Partial<{ data: string; km_atual: number }>) {
  const { error } = await supabase.from("vehicle_odometer_logs").update(fields).eq("id", logId);
  if (error) throw error;
}

export async function deleteOdometerLog(logId: string) {
  const { error } = await supabase.from("vehicle_odometer_logs").delete().eq("id", logId);
  if (error) throw error;
}

export type OdometerLogWithGap = VehicleOdometerLog & {
  kmDesdeAnterior: number | null;
  diasDesdeAnterior: number | null;
};

/** Espera `logs` ordenados por data crescente — usado só pro histórico exibido na tela
 * (km e dias desde a leitura anterior); o cálculo de distribuição em si é o
 * `distributeOdometerLogs` abaixo. */
export function computeOdometerGaps(logs: VehicleOdometerLog[]): OdometerLogWithGap[] {
  return logs.map((log, index) => {
    if (index === 0) return { ...log, kmDesdeAnterior: null, diasDesdeAnterior: null };
    const prev = logs[index - 1];
    const [py, pm, pd] = prev.data.split("-").map(Number);
    const [cy, cm, cd] = log.data.split("-").map(Number);
    const prevDate = new Date(py, pm - 1, pd);
    const currDate = new Date(cy, cm - 1, cd);
    const diasDesdeAnterior = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
    const kmDesdeAnterior = log.km_atual - prev.km_atual;
    return { ...log, kmDesdeAnterior, diasDesdeAnterior };
  });
}

export type OdometerDayEstimate = {
  date: string; // "YYYY-MM-DD"
  kmRodados: number;
  /** `false` só no dia exato de uma leitura registrada quando o intervalo até a leitura
   * anterior é de 1 dia (nesse caso não há distribuição — é o km real do dia). Em qualquer
   * intervalo maior, todo dia do intervalo (inclusive o da leitura) é uma média estimada. */
  estimado: boolean;
};

/** Espera `logs` ordenados por data crescente (a ordem que `fetchOdometerLogs` já devolve).
 * Pra cada par de leituras consecutivas, divide a diferença de km igualmente pelos dias do
 * intervalo — por exemplo, 400km em 6 dias vira ~66,7km/dia. O primeiro
 * registro nunca gera estimativa sozinho, ele só vira a referência do próximo intervalo. */
export function distributeOdometerLogs(logs: VehicleOdometerLog[]): OdometerDayEstimate[] {
  const result: OdometerDayEstimate[] = [];

  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    const [py, pm, pd] = prev.data.split("-").map(Number);
    const [cy, cm, cd] = curr.data.split("-").map(Number);
    const prevDate = new Date(py, pm - 1, pd);
    const currDate = new Date(cy, cm - 1, cd);
    const daysGap = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
    if (daysGap <= 0) continue; // datas iguais/fora de ordem — ignora, não dá pra distribuir

    const deltaKm = curr.km_atual - prev.km_atual;
    const perDay = deltaKm / daysGap;

    for (let d = 1; d <= daysGap; d++) {
      const day = new Date(prevDate);
      day.setDate(day.getDate() + d);
      result.push({ date: toDateString(day), kmRodados: perDay, estimado: daysGap > 1 });
    }
  }

  return result;
}

/** Soma os km (reais ou distribuídos) dentro de um período — mesmo critério de `sumInPeriod`. */
export function sumOdometerInPeriod(estimates: OdometerDayEstimate[], start: Date, end: Date): number {
  return estimates.reduce((sum, e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date >= start && date <= end) return sum + e.kmRodados;
    return sum;
  }, 0);
}
