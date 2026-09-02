import React, { useEffect, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator, AppState, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QualityBadge } from "@/components/veiculo/quality-badge";
import { PeriodSwitcher } from "@/components/veiculo/period-switcher";
import { MonthNav } from "@/components/ui/month-nav";
import { StatTile } from "@/components/veiculo/stat-tile";
import { RideRow } from "@/components/veiculo/ride-row";
import { NewRideForm, type NewRideFormInput } from "@/components/veiculo/new-ride-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchActiveVehicle,
  createRide,
  monthlyFixedCost,
  fuelCostPerKm,
  fetchRides,
  updateRide,
  deleteRide,
  periodRange,
  computeVehicleStats,
  goalProgress,
  fetchFuelLogs,
  computeFuelConsumption,
  averageRealConsumption,
  averageFuelPrice,
  fetchMaintenanceLogs,
  sumInPeriod,
  type PeriodKind,
} from "@/lib/veiculo";
import {
  calculateRide,
  isAutoDetectAvailable,
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  hasOverlayPermission,
  requestOverlayPermission,
  startWatching,
  stopWatching,
  addRideDetectedListener,
  fetchCopilotoConfig,
  saveCopilotoConfig,
  getCopilotoDiagnostics,
  SUPPORTED_APPS,
  type DetectedRide,
  type CopilotoConfig,
  type CopilotoCardPosition,
  type CopilotoDesign,
  type CopilotoColorScheme,
  type CopilotoFontSize,
  type CopilotoDiagnostics,
} from "@/lib/copiloto";
import { APP_ORIGEM_LABELS, formatCurrency } from "@/components/veiculo/format";

function parseNum(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Pílulas de opção — mesmo padrão usado no cadastro do veículo (situação/combustível). */
function pillGroup<T extends string>(
  options: { value: T; label: string }[],
  selected: T,
  onSelect: (v: T) => void,
  tokens: any
) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: active ? tokens.accent : tokens.surfaceAlt,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.bodyMedium,
                fontSize: 12.5,
                color: active ? tokens.accentText : tokens.text,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Complemento de gênero/número pro rótulo "Faturamento ___" mudar com o período — mesmo
 * texto usado antes em `veiculo.tsx`, de onde essa seção de estatísticas foi movida pra cá. */
const PERIOD_LABEL: Record<PeriodKind, string> = {
  dia: "do dia",
  semana: "da semana",
  mes: "do mês",
  ano: "do ano",
};

function periodDaysOf(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function toggleRow(label: string, value: boolean, onToggle: () => void, tokens: any, disabled?: boolean) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 9,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ fontFamily: fontFamily.body, fontSize: 13.5, color: tokens.text, flex: 1 }}>{label}</Text>
      <View
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          backgroundColor: value ? tokens.accent : tokens.surfaceAlt,
          padding: 2,
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: tokens.surface }} />
      </View>
    </Pressable>
  );
}

export default function VeiculoCopilotoScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const vehicleQuery = useQuery({
    queryKey: ["veiculo-active", userId],
    queryFn: fetchActiveVehicle,
    enabled: !!userId,
  });
  const vehicle = vehicleQuery.data ?? null;
  const vehicleId = vehicle?.id ?? null;

  // Consumo/preço reais dos abastecimentos — o lançamento em si só
  // acontece em `veiculo.tsx` (módulo Veículo), mas essa tela lê os mesmos registros (mesma
  // queryKey) pra usar o consumo real no custo por km/lucro em vez do "consumo médio" digitado.
  const fuelLogsQuery = useQuery({
    queryKey: ["veiculo-fuel-logs", vehicleId],
    queryFn: () => fetchFuelLogs(vehicleId!),
    enabled: !!vehicleId,
  });
  const fuelLogsWithConsumption = computeFuelConsumption(fuelLogsQuery.data ?? []);
  const realFuel = {
    consumoMedio: averageRealConsumption(fuelLogsWithConsumption),
    precoLitro: averageFuelPrice(fuelLogsQuery.data ?? []),
  };

  // "Custos por KM" só fica disponível pras opções de custo/lucro do card se o veículo
  // já tiver dado o suficiente pra calcular alguma coisa (mesma lógica de `computeVehicleStats`).
  const hasCostData = !!vehicle && (monthlyFixedCost(vehicle) > 0 || fuelCostPerKm(vehicle, realFuel) > 0);

  // ============ Faturamento, custos, meta e corridas ============
  // Movido de `veiculo.tsx` pra cá — essa tela agora é a única dona dessa seção, tanto no
  // app quanto no site (que devolveu o Copiloto manual pro navegador).
  // `veiculo.tsx` só aponta pra cá, não duplica mais nada disso.
  const [period, setPeriod] = useState<PeriodKind>("dia");
  // Referência de data pro período escolhido — separado de "hoje" pra dar pra navegar meses
  // anteriores quando o período é "mes". Volta pra hoje sempre que a pessoa
  // troca de período nas pills, pra "semana"/"dia"/"ano" continuarem ancorados no presente.
  const [periodReference, setPeriodReference] = useState(new Date());
  function handlePeriodChange(next: PeriodKind) {
    setPeriod(next);
    setPeriodReference(new Date());
  }
  const [showNewRideForm, setShowNewRideForm] = useState(false);
  const [editingRideId, setEditingRideId] = useState<string | null>(null);

  const { start: periodStart, end: periodEnd } = periodRange(period, periodReference);
  const ridesQuery = useQuery({
    queryKey: ["veiculo-rides", userId, period, periodStart.getTime(), periodEnd.getTime()],
    queryFn: () => fetchRides(periodStart, periodEnd),
    enabled: !!userId && !!vehicle,
  });
  const rides = ridesQuery.data ?? [];

  // Progresso da meta é sempre relativo ao mês, independente do período escolhido nas pills.
  const { start: monthStart, end: monthEnd } = periodRange("mes", new Date());
  const monthRidesQuery = useQuery({
    queryKey: ["veiculo-rides-mes", userId],
    queryFn: () => fetchRides(monthStart, monthEnd),
    enabled: !!userId && !!vehicle,
  });
  const monthRides = monthRidesQuery.data ?? [];

  function invalidateRides() {
    queryClient.invalidateQueries({ queryKey: ["veiculo-rides", userId] });
    queryClient.invalidateQueries({ queryKey: ["veiculo-rides-mes", userId] });
  }

  const createRideMutation = useMutation({
    mutationFn: (input: NewRideFormInput) =>
      createRide(userId!, vehicleId, {
        app_origem: "manual",
        origem_deteccao: "manual",
        valor: input.valor,
        valor_liquido: input.valor_liquido,
        distancia_km: input.distancia_km,
        duracao_min: input.duracao_min,
        horas_trabalhadas: input.horas_trabalhadas,
        km_rodados: input.km_rodados,
      }),
    onSuccess: () => {
      setShowNewRideForm(false);
      invalidateRides();
    },
  });

  const updateRideMutation = useMutation({
    mutationFn: ({ rideId, input }: { rideId: string; input: NewRideFormInput }) =>
      updateRide(userId!, rideId, {
        valor: input.valor,
        valor_liquido: input.valor_liquido,
        distancia_km: input.distancia_km,
        duracao_min: input.duracao_min,
        horas_trabalhadas: input.horas_trabalhadas,
        km_rodados: input.km_rodados,
      }),
    onSuccess: () => {
      setEditingRideId(null);
      invalidateRides();
    },
  });

  const deleteRideMutation = useMutation({
    mutationFn: (rideId: string) => deleteRide(rideId),
    onSuccess: invalidateRides,
  });

  // Manutenções — lançadas só em `veiculo.tsx`, lidas aqui pra somar no
  // "despesas totais" do período com o mesmo critério de lá (mesma queryKey, cache compartilhado).
  const maintenanceQuery = useQuery({
    queryKey: ["veiculo-maintenance", vehicleId],
    queryFn: () => fetchMaintenanceLogs(vehicleId!),
    enabled: !!vehicleId,
  });
  const maintenanceLogs = maintenanceQuery.data ?? [];
  const maintenanceInPeriod = sumInPeriod(maintenanceLogs, periodStart, periodEnd);
  const maintenanceInMonth = sumInPeriod(maintenanceLogs, monthStart, monthEnd);

  const stats = computeVehicleStats(rides, vehicle, periodDaysOf(periodStart, periodEnd), realFuel, maintenanceInPeriod);
  const monthStats = computeVehicleStats(
    monthRides,
    vehicle,
    periodDaysOf(monthStart, monthEnd),
    realFuel,
    maintenanceInMonth
  );
  const goal = goalProgress(monthStats, vehicle);

  // A meta é mensal — proporcionaliza pro período escolhido (ex: meta/30 num dia) pra
  // barra do card principal fazer sentido em qualquer pill, não só em "Mês".
  const periodGoalTarget =
    period === "ano" ? goal.goal * 12 : period === "mes" ? goal.goal : (goal.goal / 30) * periodDaysOf(periodStart, periodEnd);
  const periodGoalPct = periodGoalTarget > 0 ? Math.min(1, stats.faturamento / periodGoalTarget) : 0;

  const configQuery = useQuery({
    queryKey: ["copiloto-config", userId],
    queryFn: fetchCopilotoConfig,
    enabled: !!userId,
  });
  const config = configQuery.data;

  const saveConfigMutation = useMutation({
    mutationFn: (patch: Partial<CopilotoConfig>) => saveCopilotoConfig(userId!, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(["copiloto-config", userId], updated);
    },
  });

  function patchConfig(patch: Partial<CopilotoConfig>) {
    saveConfigMutation.mutate(patch);
  }

  // Calculadora manual
  const [valorText, setValorText] = useState("");
  const [distanciaText, setDistanciaText] = useState("");
  const [duracaoText, setDuracaoText] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const valor = parseNum(valorText);
  const distanciaKm = parseNum(distanciaText);
  const duracaoMin = parseNum(duracaoText);
  const showResult = valor != null && (distanciaKm != null || duracaoMin != null);
  const calculation = showResult ? calculateRide(valor!, distanciaKm, duracaoMin) : null;

  const saveManualMutation = useMutation({
    mutationFn: () =>
      createRide(userId!, vehicleId, {
        app_origem: "manual",
        origem_deteccao: "manual",
        valor: valor!,
        distancia_km: distanciaKm,
        duracao_min: duracaoMin,
      }),
    onSuccess: () => {
      setSavedFeedback(true);
      setValorText("");
      setDistanciaText("");
      setDuracaoText("");
      setTimeout(() => setSavedFeedback(false), 2500);
      invalidateRides();
    },
  });

  // Detecção automática
  const [autoAvailable, setAutoAvailable] = useState<boolean | null>(null);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [watching, setWatching] = useState(false);
  const [detectedRides, setDetectedRides] = useState<DetectedRide[]>([]);
  const [diagnostics, setDiagnostics] = useState<CopilotoDiagnostics | null>(null);

  async function checkPermissions() {
    const [acc, overlay] = await Promise.all([isAccessibilityServiceEnabled(), hasOverlayPermission()]);
    setAccessibilityEnabled(acc);
    setOverlayGranted(overlay);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const available = await isAutoDetectAvailable();
      if (!mounted) return;
      setAutoAvailable(available);
      if (available) await checkPermissions();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // As telas de permissão (acessibilidade/overlay) são externas ao app — ao voltar
  // pro Prumo, reconfere o status em vez de exigir que a pessoa recarregue a tela.
  useEffect(() => {
    if (!autoAvailable) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermissions();
    });
    return () => subscription.remove();
  }, [autoAvailable]);

  const bothGranted = accessibilityEnabled && overlayGranted;

  async function handleToggleWatching() {
    if (watching) {
      await stopWatching();
      setWatching(false);
    } else {
      await startWatching();
      setWatching(true);
    }
  }

  useEffect(() => {
    if (!watching) return;
    let mounted = true;
    let subscription: { remove: () => void } | null = null;
    (async () => {
      const sub = await addRideDetectedListener((ride) => {
        setDetectedRides((current) => [ride, ...current]);
      });
      if (mounted) subscription = sub;
      else sub?.remove();
    })();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [watching]);

  // "Modo diagnóstico" — enquanto a leitura automática estiver ligada,
  // atualiza a cada 3s o que o serviço nativo realmente está vendo. Criado depois de um
  // teste real de 2h em que NENHUM dos 5 apps detectou nada — isso dá visibilidade de
  // dentro do próprio app (quantos eventos de tela, de qual app, com qual texto bruto) sem
  // precisar de `adb logcat`, nem sempre configurado no celular de quem está testando.
  useEffect(() => {
    if (!watching) {
      setDiagnostics(null);
      return;
    }
    let mounted = true;
    async function poll() {
      const snapshot = await getCopilotoDiagnostics();
      if (mounted) setDiagnostics(snapshot);
    }
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [watching]);

  const saveDetectedMutation = useMutation({
    mutationFn: (ride: DetectedRide) =>
      createRide(userId!, vehicleId, {
        app_origem: ride.appOrigem,
        origem_deteccao: "auto",
        valor: ride.valor,
        distancia_km: ride.distanciaKm,
        duracao_min: ride.duracaoMin,
      }),
    onSuccess: (_data, ride) => {
      setDetectedRides((current) => current.filter((r) => r !== ride));
      invalidateRides();
    },
  });

  const inputStyle = {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: tokens.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as const;

  function metricRow(label: string, value: number | null, quality: "bom" | "medio" | "ruim" | null, unit: string) {
    if (value == null || quality == null) return null;
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 16, color: tokens.text }}>
            {formatCurrency(value)}
            {unit}
          </Text>
          <QualityBadge quality={quality} />
        </View>
      </View>
    );
  }

  const isLoadingGate = configQuery.isLoading || vehicleQuery.isLoading;

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>🧭</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Copiloto
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Calcule quanto vale a corrida antes de aceitar — pra quem faz corridas ou entregas.
          </Text>
        </View>

        {isLoadingGate ? (
          <ActivityIndicator color={tokens.accent} />
        ) : !config?.enabled ? (
          <View
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28 }}>🧭</Text>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text, textAlign: "center" }}>
              Copiloto desativado
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted, textAlign: "center" }}>
              Nem todo mundo que cadastra um veículo faz corrida ou entrega — por isso o
              Copiloto fica desligado até você ativar. Ative pra ter a calculadora, o
              faturamento e as corridas
              {/* Leitura automática de tela é recurso do
                  AccessibilityService, só existe no app Android instalado. */}
              {Platform.OS === "android"
                ? ", e se quiser, a leitura automática da tela do Uber, 99, InDrive, iFood ou MT Entregas."
                : "."}
            </Text>
            <Pressable
              onPress={() => patchConfig({ enabled: true })}
              disabled={saveConfigMutation.isPending}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 20,
                marginTop: 4,
                opacity: saveConfigMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                Ativar Copiloto
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {/* ============ Faturamento, custos, meta e corridas ============ */}
            <PeriodSwitcher value={period} onChange={handlePeriodChange} />

            {period === "mes" ? (
              <MonthNav monthDate={periodReference} onChange={setPeriodReference} />
            ) : null}

            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Faturamento {PERIOD_LABEL[period]}
              </Text>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 30, color: tokens.text }}>
                {formatCurrency(stats.faturamento)}
              </Text>
              {periodGoalTarget > 0 ? (
                <View style={{ gap: 6 }}>
                  <ProgressBar progress={periodGoalPct} height={10} />
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                    {Math.round(periodGoalPct * 100)}% da meta proporcional ({formatCurrency(periodGoalTarget)})
                  </Text>
                </View>
              ) : (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                  Defina uma meta financeira em "Editar veículo" pra ver o progresso aqui.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: tokens.dangerMuted,
                  borderRadius: 16,
                  padding: 14,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.danger }}>
                  Despesas totais
                </Text>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: tokens.danger }}>
                  {formatCurrency(stats.despesasTotais)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: tokens.successMuted,
                  borderRadius: 16,
                  padding: 14,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.success }}>
                  Saldo livre
                </Text>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: tokens.success }}>
                  {formatCurrency(stats.saldoLivre)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <StatTile label="Horas trabalhadas" value={`${stats.horasTrabalhadas.toLocaleString("pt-BR")}h`} />
              <StatTile label="Km rodados" value={`${stats.kmRodados.toLocaleString("pt-BR")} km`} />
              <StatTile label="Faturamento médio/hora" value={formatCurrency(stats.faturamentoMedioPorHora)} />
              <StatTile label="Faturamento médio/km" value={formatCurrency(stats.faturamentoMedioPorKm)} />
              <StatTile label="Custo por hora" value={formatCurrency(stats.custoPorHora)} />
              <StatTile label="Custo por km" value={formatCurrency(stats.custoPorKm)} />
              <StatTile label="Lucro por hora" value={formatCurrency(stats.lucroPorHora)} />
              <StatTile label="Lucro por km" value={formatCurrency(stats.lucroPorKm)} />
            </View>

            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Progresso da meta
              </Text>
              {goal.goal > 0 ? (
                <View style={{ gap: 6 }}>
                  <ProgressBar progress={goal.pct} height={10} color={goal.pct >= 1 ? tokens.success : undefined} />
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                      Faturamento atual: {formatCurrency(goal.current)}
                    </Text>
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                      Meta do mês: {formatCurrency(goal.goal)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Preencha "custos pessoais" e "lucro desejado" em Editar veículo pra acompanhar sua meta mensal.
                </Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Corridas e sessões
                </Text>
                <Pressable onPress={() => setShowNewRideForm(!showNewRideForm)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showNewRideForm ? "Cancelar" : "+ Novo lançamento"}
                  </Text>
                </Pressable>
              </View>

              {showNewRideForm ? (
                <NewRideForm
                  isSaving={createRideMutation.isPending}
                  onCancel={() => setShowNewRideForm(false)}
                  onSubmit={(input) => createRideMutation.mutate(input)}
                />
              ) : null}

              {ridesQuery.isLoading ? (
                <ActivityIndicator color={tokens.accent} />
              ) : rides.length === 0 && !showNewRideForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum lançamento neste período.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {rides.map((ride) => (
                    <RideRow
                      key={ride.id}
                      ride={ride}
                      onDelete={() => deleteRideMutation.mutate(ride.id)}
                      isEditing={editingRideId === ride.id}
                      onStartEdit={() => setEditingRideId(ride.id)}
                      onCancelEdit={() => setEditingRideId(null)}
                      onUpdate={(input) => updateRideMutation.mutate({ rideId: ride.id, input })}
                      isUpdating={updateRideMutation.isPending && updateRideMutation.variables?.rideId === ride.id}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ============ Calculadora rápida ============ */}
            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 12,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Calculadora
              </Text>

              <TextInput
                value={valorText}
                onChangeText={setValorText}
                placeholder="Valor R$"
                placeholderTextColor={tokens.textMuted}
                keyboardType="decimal-pad"
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: 15,
                  color: tokens.text,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={distanciaText}
                  onChangeText={setDistanciaText}
                  placeholder="Distância km"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
                <TextInput
                  value={duracaoText}
                  onChangeText={setDuracaoText}
                  placeholder="Duração min"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>

              {calculation ? (
                <View style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 12, padding: 12, gap: 8 }}>
                  {config.showValorKm ? metricRow("R$/km", calculation.porKm, calculation.qualidadeKm, "") : null}
                  {config.showValorHora ? metricRow("R$/hora", calculation.porHora, calculation.qualidadeHora, "") : null}
                  {config.showValorMin ? metricRow("R$/min", calculation.porMin, calculation.qualidadeMin, "") : null}

                  <Pressable
                    onPress={() => saveManualMutation.mutate()}
                    disabled={saveManualMutation.isPending}
                    style={{
                      backgroundColor: tokens.accent,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      marginTop: 4,
                      opacity: saveManualMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {saveManualMutation.isPending ? (
                      <ActivityIndicator color={tokens.accentText} />
                    ) : (
                      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                        Salvar corrida
                      </Text>
                    )}
                  </Pressable>
                  {savedFeedback ? (
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.success, textAlign: "center" }}>
                      Corrida salva ✓
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* ============ Configuração do card ============ */}
            {/* Esse card é a aparência do overlay flutuante
                mostrado por cima do app de corrida/entrega enquanto a leitura automática
                está ligada; um recurso que só existe no Android (AccessibilityService +
                overlay). Na web não faz sentido nenhuma dessas opções. */}
            {Platform.OS === "android" ? (
            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 16,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Configuração do card
              </Text>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Posicionamento
                </Text>
                {pillGroup<CopilotoCardPosition>(
                  [
                    { value: "esquerda", label: "Esquerda" },
                    { value: "centro", label: "Centro" },
                    { value: "direita", label: "Direita" },
                  ],
                  config.position,
                  (v) => patchConfig({ position: v }),
                  tokens
                )}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Design
                </Text>
                {pillGroup<CopilotoDesign>(
                  [
                    { value: "tradicional", label: "Tradicional" },
                    { value: "novo", label: "Novo" },
                  ],
                  config.design,
                  (v) => patchConfig({ design: v }),
                  tokens
                )}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Esquema de cores
                </Text>
                {pillGroup<CopilotoColorScheme>(
                  [
                    { value: "escuro", label: "Escuro" },
                    { value: "claro", label: "Claro" },
                  ],
                  config.colorScheme,
                  (v) => patchConfig({ colorScheme: v }),
                  tokens
                )}
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted, marginBottom: 4 }}>
                  Informações do card
                </Text>
                {toggleRow("Valor por km", config.showValorKm, () => patchConfig({ showValorKm: !config.showValorKm }), tokens)}
                {toggleRow("Valor por hora", config.showValorHora, () => patchConfig({ showValorHora: !config.showValorHora }), tokens)}
                {toggleRow("Valor por minuto", config.showValorMin, () => patchConfig({ showValorMin: !config.showValorMin }), tokens)}
                {toggleRow("Valores totais (km e minutos)", config.showTotais, () => patchConfig({ showTotais: !config.showTotais }), tokens)}
                {toggleRow("Paradas (se houver)", config.showParadas, () => patchConfig({ showParadas: !config.showParadas }), tokens)}
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted, marginBottom: 4 }}>
                  Custo e lucro da corrida
                </Text>
                {!hasCostData ? (
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted, marginBottom: 4 }}>
                    Preencha os custos do veículo em "Editar veículo" pra liberar essas opções.
                  </Text>
                ) : null}
                {toggleRow("Custo total", config.showCustoTotal, () => patchConfig({ showCustoTotal: !config.showCustoTotal }), tokens, !hasCostData)}
                {toggleRow("Custo por km", config.showCustoKm, () => patchConfig({ showCustoKm: !config.showCustoKm }), tokens, !hasCostData)}
                {toggleRow("Lucro", config.showLucro, () => patchConfig({ showLucro: !config.showLucro }), tokens, !hasCostData)}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Tempo de exibição do card
                </Text>
                {pillGroup<string>(
                  [5, 10, 12, 20, 30].map((s) => ({ value: String(s), label: `${s}s` })),
                  String(config.displaySeconds),
                  (v) => patchConfig({ displaySeconds: Number(v) }),
                  tokens
                )}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Opacidade do card
                </Text>
                {pillGroup<string>(
                  [60, 80, 90, 100].map((p) => ({ value: String(p), label: `${p}%` })),
                  String(config.opacityPct),
                  (v) => patchConfig({ opacityPct: Number(v) }),
                  tokens
                )}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                  Tamanho da fonte
                </Text>
                {pillGroup<CopilotoFontSize>(
                  [
                    { value: "pequena", label: "Pequena" },
                    { value: "media", label: "Média" },
                    { value: "grande", label: "Grande" },
                  ],
                  config.fontSize,
                  (v) => patchConfig({ fontSize: v }),
                  tokens
                )}
              </View>

              {toggleRow(
                "Empilhar ofertas simultâneas",
                config.stackSimultaneous,
                () => patchConfig({ stackSimultaneous: !config.stackSimultaneous }),
                tokens
              )}
            </View>
            ) : null}

            {/* ============ Detecção automática ============ */}
            <View
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                gap: 12,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 15, color: tokens.text }}>
                Detecção automática
              </Text>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
                Apps suportados: {SUPPORTED_APPS.map((a) => a.nome).join(", ")}.
              </Text>

              {autoAvailable === null ? (
                <ActivityIndicator color={tokens.accent} />
              ) : autoAvailable === false && Platform.OS !== "android" ? (
                // No site isso nunca vai "ficar disponível
                // depois", é um recurso exclusivo do Android (AccessibilityService não
                // existe em navegador/PWA). Mensagem diferente da de baixo, que é sobre uma
                // versão do APP Android ainda sem o módulo nativo — esse caso é temporário.
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  A leitura automática de tela funciona só no aplicativo Android instalado —
                  no site, use a calculadora acima.
                </Text>
              ) : autoAvailable === false ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  A leitura automática de tela ainda não está disponível nesta versão do app —
                  assim que estiver, você vai poder ativá-la aqui. Por enquanto, use a
                  calculadora acima.
                </Text>
              ) : !bothGranted ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                    Pra detectar ofertas de corrida automaticamente, o Copiloto precisa de duas permissões:
                  </Text>

                  {!accessibilityEnabled ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                        Leitura de tela — permite ler o valor da oferta na tela do app de corrida.
                      </Text>
                      <Pressable
                        onPress={() => openAccessibilitySettings()}
                        style={{ backgroundColor: tokens.accent, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      >
                        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                          Ativar leitura de tela
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {!overlayGranted ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                        Sobrepor outros apps — permite mostrar o cálculo por cima do app de corrida.
                      </Text>
                      <Pressable
                        onPress={() => requestOverlayPermission()}
                        style={{ backgroundColor: tokens.accent, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      >
                        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 13, color: tokens.accentText }}>
                          Permitir sobrepor outros apps
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.text }}>
                      {watching ? "Copiloto ativo" : "Leitura automática pausada"}
                    </Text>
                    <Pressable
                      onPress={handleToggleWatching}
                      style={{
                        backgroundColor: watching ? tokens.successMuted : tokens.surfaceAlt,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.bodySemibold,
                          fontSize: 12.5,
                          color: watching ? tokens.success : tokens.textMuted,
                        }}
                      >
                        {watching ? "Pausar" : "Ativar"}
                      </Text>
                    </Pressable>
                  </View>

                  {watching && detectedRides.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.textMuted }}>
                        Corridas detectadas
                      </Text>
                      {detectedRides.map((ride, index) => {
                        const detectedCalc = calculateRide(ride.valor, ride.distanciaKm, ride.duracaoMin);
                        return (
                          <View
                            key={`${ride.appOrigem}-${index}-${ride.valor}`}
                            style={{ backgroundColor: tokens.surfaceAlt, borderRadius: 10, padding: 12, gap: 6 }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
                                {APP_ORIGEM_LABELS[ride.appOrigem]} · {formatCurrency(ride.valor)}
                              </Text>
                              {detectedCalc.qualidadeKm ? <QualityBadge quality={detectedCalc.qualidadeKm} /> : null}
                            </View>
                            <Pressable
                              onPress={() => saveDetectedMutation.mutate(ride)}
                              disabled={saveDetectedMutation.isPending}
                              style={{
                                backgroundColor: tokens.accent,
                                borderRadius: 8,
                                paddingVertical: 8,
                                alignItems: "center",
                                opacity: saveDetectedMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12.5, color: tokens.accentText }}>
                                Salvar
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ) : watching ? (
                    <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                      Nenhuma corrida detectada ainda. Abra o app de corrida pra testar.
                    </Text>
                  ) : null}

                  {watching ? (
                    <View
                      style={{
                        backgroundColor: tokens.surfaceAlt,
                        borderRadius: 10,
                        padding: 10,
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.textMuted }}>
                        Diagnóstico (se nada for detectado, mande print disto)
                      </Text>
                      {!diagnostics ? (
                        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                          Carregando…
                        </Text>
                      ) : (
                        <>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                            Serviço rodando: {diagnostics.serviceRunning ? "sim" : "não"}
                          </Text>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                            Telas vistas (qualquer app): {diagnostics.totalEventsSeen}
                            {diagnostics.lastPackageSeen ? ` · última: ${diagnostics.lastPackageSeen}` : ""}
                          </Text>
                          <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                            Telas de apps suportados vistas: {diagnostics.targetEventsSeen}
                            {diagnostics.lastTargetPackage
                              ? ` · última: ${SUPPORTED_APPS.find((a) => a.pacote === diagnostics.lastTargetPackage)?.nome ?? diagnostics.lastTargetPackage}`
                              : ""}
                          </Text>
                          {/* O card de oferta some da tela em 5-12s, então
                              "lastRawText" abaixo costuma já estar sobrescrito por uma tela
                              seguinte (ex: navegação) antes de dar tempo de olhar. Este bloco
                              só atualiza quando a tela parece um card de oferta de verdade —
                              continua mostrando o último card real mesmo que já tenha sumido.
                              Antes só contava como "parece card de
                              oferta" se o texto tivesse "R$" literalmente. Um teste real (vídeo)
                              mostrou um card de R$21,50 na tela por 15s+ sem isso nunca disparar
                             — sinal de que o símbolo "R$" pode nem aparecer no texto lido pela
                              acessibilidade (só o número). Por isso o gatilho (no nativo) agora
                              também aceita o padrão "Nmin (Ykm)" e o botão "Aceitar" — daí o
                              rótulo abaixo não falar mais só em "valor (R$)". */}
                          {diagnostics.lastOfferLikeText ? (
                            <>
                              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.text }}>
                                Última tela parecida com oferta vista — reconhecido como oferta:{" "}
                                {diagnostics.lastOfferLikeParseSucceeded ? "sim" : "não"} (
                                {SUPPORTED_APPS.find((a) => a.pacote === diagnostics.lastOfferLikeTextPackage)?.nome ??
                                  diagnostics.lastOfferLikeTextPackage}
                                )
                              </Text>
                              <Text style={{ fontFamily: fontFamily.mono, fontSize: 10.5, color: tokens.text }}>
                                {diagnostics.lastOfferLikeText}
                              </Text>
                            </>
                          ) : (
                            <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                              Nenhuma tela parecida com oferta ("R$", "Aceitar" ou "min (km)") capturada
                              ainda de um app suportado.
                            </Text>
                          )}
                          {diagnostics.lastRawText ? (
                            <>
                              <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                                Última tela vista (qualquer conteúdo) — reconhecido como oferta:{" "}
                                {diagnostics.lastParseSucceeded ? "sim" : "não"} (
                                {SUPPORTED_APPS.find((a) => a.pacote === diagnostics.lastRawTextPackage)?.nome ??
                                  diagnostics.lastRawTextPackage}
                                )
                              </Text>
                              <Text style={{ fontFamily: fontFamily.mono, fontSize: 10.5, color: tokens.textMuted }}>
                                {diagnostics.lastRawText}
                              </Text>
                            </>
                          ) : (
                            <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}>
                              Nenhum texto capturado ainda de um app suportado.
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <Pressable onPress={() => patchConfig({ enabled: false })} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted, textAlign: "center" }}>
                Desativar Copiloto
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted, lineHeight: 16 }}>
          O Copiloto não tem vínculo com Uber, 99, InDrive, iFood ou MT Entregas — os valores
          calculados são uma estimativa de apoio, não uma garantia. Veja mais em
          Configurações › Legal › Termos de Uso.
        </Text>
      </View>
    </Screen>
  );
}
