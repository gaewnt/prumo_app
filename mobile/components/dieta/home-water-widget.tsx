import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WaterTracker } from "@/components/dieta/water-tracker";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchDieta, logWater, undoLastWaterLog, updateLastWaterLog, computeWaterToday } from "@/lib/dieta";

/**
 * Registro de copo de água na Home, de fácil
 * acesso, levando os dados registrados na home pra dentro do registro de dieta (mesmo
 * card repetido, o que muda em um, muda em outro).
 *
 * Não duplica dado nenhum: usa a MESMA `queryKey` ["dieta", userId] que `DietaContent`
 * (ver `app/(app)/modulo/dieta.tsx`) usa pra `fetchDieta` — é o cache do React Query, não
 * um estado próprio. Registrar um copo aqui invalida essa chave; se a tela de Dieta
 * estiver montada ao mesmo tempo (ou for aberta em seguida), ela recebe os dados
 * atualizados automaticamente, sem precisar de nenhuma sincronização manual entre os
 * dois lugares — são literalmente a mesma fonte.
 */
export function HomeWaterWidget() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const query = useQuery({
    queryKey: ["dieta", userId],
    queryFn: fetchDieta,
    enabled: !!userId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["dieta", userId] });
  }

  const addWaterMutation = useMutation({
    mutationFn: (amountMl: number) => logWater(userId!, amountMl),
    onSuccess: invalidate,
  });
  const undoWaterMutation = useMutation({
    mutationFn: () => undoLastWaterLog(userId!),
    onSuccess: invalidate,
  });
  const updateWaterMutation = useMutation({
    mutationFn: (amountMl: number) => updateLastWaterLog(userId!, amountMl),
    onSuccess: invalidate,
  });

  if (!query.data) return null;

  const waterLogs = query.data.waterLogs ?? [];
  const today = query.data.today;
  const waterToday = computeWaterToday(waterLogs, today);
  const todaysWaterLogs = waterLogs.filter((w) => w.log_date === today);
  const lastWaterLogAmountMl =
    todaysWaterLogs.length > 0 ? todaysWaterLogs[todaysWaterLogs.length - 1].amount_ml : null;

  return (
    <WaterTracker
      totalMl={waterToday}
      goalMl={query.data.metaAguaMl}
      onAdd={(ml) => addWaterMutation.mutate(ml)}
      isAdding={addWaterMutation.isPending}
      onUndo={() => undoWaterMutation.mutate()}
      isUndoing={undoWaterMutation.isPending}
      hasLogsToday={waterToday > 0}
      lastLogAmountMl={lastWaterLogAmountMl}
      onUpdateLast={(amountMl) => updateWaterMutation.mutate(amountMl)}
      isUpdatingLast={updateWaterMutation.isPending}
    />
  );
}
