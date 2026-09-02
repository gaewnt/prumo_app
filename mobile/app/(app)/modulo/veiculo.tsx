import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { FuelLogRow } from "@/components/veiculo/fuel-log-row";
import { NewFuelLogForm, type NewFuelLogFormInput } from "@/components/veiculo/new-fuel-log-form";
import { MaintenanceLogRow } from "@/components/veiculo/maintenance-log-row";
import { NewMaintenanceLogForm, type NewMaintenanceLogFormInput } from "@/components/veiculo/new-maintenance-log-form";
import { OdometerLogRow } from "@/components/veiculo/odometer-log-row";
import { NewOdometerLogForm, type NewOdometerLogFormInput } from "@/components/veiculo/new-odometer-log-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchActiveVehicle,
  periodRange,
  fetchFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  computeFuelConsumption,
  averageRealConsumption,
  averageFuelPrice,
  fetchMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  fetchOdometerLogs,
  createOdometerLog,
  updateOdometerLog,
  deleteOdometerLog,
  computeOdometerGaps,
  distributeOdometerLogs,
  sumOdometerInPeriod,
} from "@/lib/veiculo";
import { formatCurrency } from "@/components/veiculo/format";

export default function VeiculoScreen() {
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

  // Só usado aqui pro resumo mensal de "Km do dia" — faturamento/corridas/meta viraram
  // responsabilidade só do Copiloto (ver comentário mais abaixo).
  const { start: monthStart, end: monthEnd } = periodRange("mes", new Date());

  // ============ Abastecimentos ============
  // Mesma queryKey usada em `veiculo-copiloto.tsx`, pra o consumo real calculado aqui
  // também alimentar as estatísticas de custo/km lá (Copiloto lê os mesmos abastecimentos,
  // só não tem o formulário de lançamento — esse fica só aqui, no módulo Veículo).
  const [showNewFuelLogForm, setShowNewFuelLogForm] = useState(false);
  const [editingFuelLogId, setEditingFuelLogId] = useState<string | null>(null);

  const fuelLogsQuery = useQuery({
    queryKey: ["veiculo-fuel-logs", vehicle?.id],
    queryFn: () => fetchFuelLogs(vehicle!.id),
    enabled: !!vehicle,
  });
  const fuelLogs = fuelLogsQuery.data ?? [];
  const fuelLogsWithConsumption = computeFuelConsumption(fuelLogs);
  const realConsumo = averageRealConsumption(fuelLogsWithConsumption);
  const realPrecoLitro = averageFuelPrice(fuelLogs);

  function invalidateFuelLogs() {
    queryClient.invalidateQueries({ queryKey: ["veiculo-fuel-logs", vehicle?.id] });
  }

  const createFuelLogMutation = useMutation({
    mutationFn: (input: NewFuelLogFormInput) => createFuelLog(userId!, vehicle!.id, input),
    onSuccess: () => {
      setShowNewFuelLogForm(false);
      invalidateFuelLogs();
    },
  });

  const updateFuelLogMutation = useMutation({
    mutationFn: ({ logId, input }: { logId: string; input: NewFuelLogFormInput }) => updateFuelLog(userId!, logId, input),
    onSuccess: () => {
      setEditingFuelLogId(null);
      invalidateFuelLogs();
    },
  });

  const deleteFuelLogMutation = useMutation({
    mutationFn: (logId: string) => deleteFuelLog(logId),
    onSuccess: invalidateFuelLogs,
  });

  // ============ Manutenção ============
  const [showNewMaintenanceForm, setShowNewMaintenanceForm] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);

  const maintenanceQuery = useQuery({
    queryKey: ["veiculo-maintenance", vehicle?.id],
    queryFn: () => fetchMaintenanceLogs(vehicle!.id),
    enabled: !!vehicle,
  });
  const maintenanceLogs = maintenanceQuery.data ?? [];

  function invalidateMaintenance() {
    queryClient.invalidateQueries({ queryKey: ["veiculo-maintenance", vehicle?.id] });
  }

  const createMaintenanceMutation = useMutation({
    mutationFn: (input: NewMaintenanceLogFormInput) => createMaintenanceLog(userId!, vehicle!.id, input),
    onSuccess: () => {
      setShowNewMaintenanceForm(false);
      invalidateMaintenance();
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ logId, input }: { logId: string; input: NewMaintenanceLogFormInput }) =>
      updateMaintenanceLog(userId!, logId, input),
    onSuccess: () => {
      setEditingMaintenanceId(null);
      invalidateMaintenance();
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: (logId: string) => deleteMaintenanceLog(logId),
    onSuccess: invalidateMaintenance,
  });

  // ============ Km do dia ============
  const [showNewOdometerForm, setShowNewOdometerForm] = useState(false);
  const [editingOdometerId, setEditingOdometerId] = useState<string | null>(null);

  const odometerQuery = useQuery({
    queryKey: ["veiculo-odometer", vehicle?.id],
    queryFn: () => fetchOdometerLogs(vehicle!.id),
    enabled: !!vehicle,
  });
  const odometerLogs = odometerQuery.data ?? [];
  const odometerGaps = computeOdometerGaps(odometerLogs);
  const odometerEstimates = distributeOdometerLogs(odometerLogs);
  const odometerKmMes = sumOdometerInPeriod(odometerEstimates, monthStart, monthEnd);

  function invalidateOdometer() {
    queryClient.invalidateQueries({ queryKey: ["veiculo-odometer", vehicle?.id] });
  }

  const createOdometerMutation = useMutation({
    mutationFn: (input: NewOdometerLogFormInput) => createOdometerLog(userId!, vehicle!.id, input),
    onSuccess: () => {
      setShowNewOdometerForm(false);
      invalidateOdometer();
    },
  });

  const updateOdometerMutation = useMutation({
    mutationFn: ({ logId, input }: { logId: string; input: NewOdometerLogFormInput }) => updateOdometerLog(logId, input),
    onSuccess: () => {
      setEditingOdometerId(null);
      invalidateOdometer();
    },
  });

  const deleteOdometerMutation = useMutation({
    mutationFn: (logId: string) => deleteOdometerLog(logId),
    onSuccess: invalidateOdometer,
  });

  const isLoading = vehicleQuery.isLoading;

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
          <Text style={{ fontSize: 32 }}>🚗</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>
            Veículo
          </Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            {vehicle
              ? `${vehicle.marca ?? ""} ${vehicle.modelo ?? ""}`.trim() || (vehicle.tipo === "moto" ? "Moto" : "Carro")
              : "Abastecimento, manutenção, km rodado e o Copiloto."}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : vehicleQuery.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : !vehicle ? (
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
            <Text style={{ fontSize: 28 }}>🚗</Text>
            <Text
              style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text, textAlign: "center" }}
            >
              Nenhum veículo cadastrado ainda
            </Text>
            <Text
              style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted, textAlign: "center" }}
            >
              Cadastre seu carro ou moto de trabalho pra começar a acompanhar faturamento, custos e lucro.
            </Text>
            <Pressable
              onPress={() => router.push("/modulo/veiculo-cadastro" as any)}
              style={{
                backgroundColor: tokens.accent,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 20,
                marginTop: 4,
              }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accentText }}>
                Cadastrar veículo
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* O Copiloto voltou a existir no site (só a
                  parte manual: calculadora, faturamento, corridas e meta). Por isso esse
                  botão não é mais Android-only — a leitura automática de tela é que
                  continua exclusiva do app (ver `veiculo-copiloto.tsx`). */}
              <Pressable
                onPress={() => router.push("/modulo/veiculo-copiloto" as any)}
                style={{
                  flex: 1,
                  backgroundColor: tokens.accentMuted,
                  borderRadius: 14,
                  padding: 14,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>🧭</Text>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.accent }}>
                  Abrir Copiloto
                </Text>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.accent }}>
                  Faturamento, corridas e meta
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/modulo/veiculo-cadastro" as any)}
                style={{
                  flex: 1,
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>🔧</Text>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.text }}>
                  Editar veículo
                </Text>
              </Pressable>
            </View>

            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
              Faturamento, custos, meta, progresso e corridas ficam dentro do Copiloto —
              toque em "Abrir Copiloto" acima.
            </Text>

            {/* ============ Abastecimentos ============ */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Abastecimentos
                </Text>
                <Pressable onPress={() => setShowNewFuelLogForm(!showNewFuelLogForm)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showNewFuelLogForm ? "Cancelar" : "+ Novo abastecimento"}
                  </Text>
                </Pressable>
              </View>

              {realConsumo != null ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Consumo real médio: {realConsumo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/l
                  {realPrecoLitro != null ? ` · ${formatCurrency(realPrecoLitro)}/l em média` : ""} — calculado a
                  partir dos seus abastecimentos e já usado no custo por km do Copiloto.
                </Text>
              ) : (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Registre pelo menos 2 abastecimentos de tanque cheio pra calcular o consumo
                  real do veículo (até lá, o custo por km usa o "consumo médio" do cadastro, se
                  preenchido). Abastecimentos parciais também podem ser registrados — eles
                  entram na conta do próximo tanque cheio.
                </Text>
              )}

              {showNewFuelLogForm ? (
                <NewFuelLogForm
                  isSaving={createFuelLogMutation.isPending}
                  onCancel={() => setShowNewFuelLogForm(false)}
                  onSubmit={(input) => createFuelLogMutation.mutate(input)}
                />
              ) : null}

              {fuelLogsQuery.isLoading ? (
                <ActivityIndicator color={tokens.accent} />
              ) : fuelLogs.length === 0 && !showNewFuelLogForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum abastecimento registrado ainda.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {[...fuelLogsWithConsumption].reverse().map((log) => (
                    <FuelLogRow
                      key={log.id}
                      log={log}
                      onDelete={() => deleteFuelLogMutation.mutate(log.id)}
                      isEditing={editingFuelLogId === log.id}
                      onStartEdit={() => setEditingFuelLogId(log.id)}
                      onCancelEdit={() => setEditingFuelLogId(null)}
                      onUpdate={(input) => updateFuelLogMutation.mutate({ logId: log.id, input })}
                      isUpdating={updateFuelLogMutation.isPending && updateFuelLogMutation.variables?.logId === log.id}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ============ Manutenção ============ */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Manutenção
                </Text>
                <Pressable onPress={() => setShowNewMaintenanceForm(!showNewMaintenanceForm)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showNewMaintenanceForm ? "Cancelar" : "+ Nova manutenção"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                Cada manutenção soma no "despesas totais" do Copiloto no período em que foi feita.
              </Text>

              {showNewMaintenanceForm ? (
                <NewMaintenanceLogForm
                  isSaving={createMaintenanceMutation.isPending}
                  onCancel={() => setShowNewMaintenanceForm(false)}
                  onSubmit={(input) => createMaintenanceMutation.mutate(input)}
                />
              ) : null}

              {maintenanceQuery.isLoading ? (
                <ActivityIndicator color={tokens.accent} />
              ) : maintenanceLogs.length === 0 && !showNewMaintenanceForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma manutenção registrada ainda.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {maintenanceLogs.map((log) => (
                    <MaintenanceLogRow
                      key={log.id}
                      log={log}
                      onDelete={() => deleteMaintenanceMutation.mutate(log.id)}
                      isEditing={editingMaintenanceId === log.id}
                      onStartEdit={() => setEditingMaintenanceId(log.id)}
                      onCancelEdit={() => setEditingMaintenanceId(null)}
                      onUpdate={(input) => updateMaintenanceMutation.mutate({ logId: log.id, input })}
                      isUpdating={
                        updateMaintenanceMutation.isPending && updateMaintenanceMutation.variables?.logId === log.id
                      }
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ============ Km do dia ============ */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                  Km do dia
                </Text>
                <Pressable onPress={() => setShowNewOdometerForm(!showNewOdometerForm)}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.accent }}>
                    {showNewOdometerForm ? "Cancelar" : "+ Nova leitura"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                Não precisa lançar todo dia — se você pular alguns, a gente distribui o km
                rodado igualmente pelos dias que ficaram sem leitura.
                {odometerKmMes > 0 ? ` Este mês: ~${odometerKmMes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km.` : ""}
              </Text>

              {showNewOdometerForm ? (
                <NewOdometerLogForm
                  isSaving={createOdometerMutation.isPending}
                  onCancel={() => setShowNewOdometerForm(false)}
                  onSubmit={(input) => createOdometerMutation.mutate(input)}
                />
              ) : null}

              {odometerQuery.isLoading ? (
                <ActivityIndicator color={tokens.accent} />
              ) : odometerLogs.length === 0 && !showNewOdometerForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma leitura registrada ainda.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {[...odometerGaps].reverse().map((log) => (
                    <OdometerLogRow
                      key={log.id}
                      log={log}
                      onDelete={() => deleteOdometerMutation.mutate(log.id)}
                      isEditing={editingOdometerId === log.id}
                      onStartEdit={() => setEditingOdometerId(log.id)}
                      onCancelEdit={() => setEditingOdometerId(null)}
                      onUpdate={(input) => updateOdometerMutation.mutate({ logId: log.id, input })}
                      isUpdating={updateOdometerMutation.isPending && updateOdometerMutation.variables?.logId === log.id}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
