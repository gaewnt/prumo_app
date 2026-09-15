import React, { useEffect, useMemo, useRef } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestWidgetUpdate } from "react-native-android-widget";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import { renderHojeWidget } from "@/components/widgets/hoje-widget";
import {
  fetchFinancas,
  fetchFinancasExtras,
  ensureCardRecurringChargesGenerated,
  ensureRecurringTransactionsGenerated,
} from "@/lib/financas";
import { fetchHabitsWithLogs } from "@/lib/rotina";
import { fetchCasa } from "@/lib/casa";
import { fetchSaude } from "@/lib/saude";
import { fetchEstudos } from "@/lib/estudos";
import { fetchCarreira } from "@/lib/carreira";
import { fetchTreino } from "@/lib/treino";
import { fetchPet } from "@/lib/pet";
import { fetchRelacoes } from "@/lib/relacoes";
import { fetchBeleza } from "@/lib/beleza";
import { fetchViagens } from "@/lib/viagens";
import { fetchActiveVehicle, fetchMaintenanceSchedules } from "@/lib/veiculo";
import { fetchBiblioteca } from "@/lib/biblioteca";
import {
  todayItemsFromFinancas,
  todayItemsFromRotina,
  todayItemsFromCasa,
  todayItemsFromSaude,
  todayItemsFromEstudos,
  todayItemsFromCarreira,
  todayItemsFromTreino,
  todayItemsFromPet,
  todayItemsFromRelacoes,
  todayItemsFromVeiculo,
  todayItemsFromBeleza,
  todayItemsFromViagens,
  todayItemsFromBiblioteca,
  sortTodayItems,
  type TodayItem,
} from "@/lib/hoje";

type TodayViewProps = {
  /** Slugs de módulo de topo escondidos em Configurações — mesmo `Set` usado pra filtrar a
   * lista de módulos na Home. Um módulo escondido não entra na Visão Hoje (nem gera busca
   * a mais pra ele). */
  hiddenSlugs: Set<string>;
};

/**
 * Seção "Hoje" da Home — junta, de vários módulos ao mesmo tempo, tudo que vence ou está
 * programado pra hoje (ver `lib/hoje.ts`). Cada módulo é buscado com a mesma `queryKey` já
 * usada pela própria tela dele, então visitar essa tela antes (ou depois) não duplica busca.
 */
export function TodayView({ hiddenSlugs }: TodayViewProps) {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const financasVisible = !hiddenSlugs.has("financas");
  // Relações vive dentro do hub Rotina (ver `lib/modules.ts`) — some junto se Rotina
  // estiver escondida, não tem preferência própria.
  const rotinaVisible = !hiddenSlugs.has("rotina");
  const casaVisible = !hiddenSlugs.has("casa");
  const saudeVisible = !hiddenSlugs.has("saude");
  const estudosVisible = !hiddenSlugs.has("estudos");
  const carreiraVisible = !hiddenSlugs.has("carreira");
  // Treino, Beleza e Viagens vivem dentro do hub Desenvolvimento Pessoal.
  const treinoVisible = !hiddenSlugs.has("dev-pessoal");
  const belezaVisible = !hiddenSlugs.has("dev-pessoal");
  const viagensVisible = !hiddenSlugs.has("dev-pessoal");
  const petVisible = !hiddenSlugs.has("pet");
  const veiculoVisible = !hiddenSlugs.has("veiculo");
  // Biblioteca vive dentro do hub Estudos.
  const bibliotecaVisible = !hiddenSlugs.has("estudos");

  const financasQuery = useQuery({
    queryKey: ["financas", userId],
    queryFn: fetchFinancas,
    enabled: !!userId && financasVisible,
  });
  const financasExtrasQuery = useQuery({
    queryKey: ["financas-extras", userId],
    queryFn: fetchFinancasExtras,
    enabled: !!userId && financasVisible,
  });
  const rotinaQuery = useQuery({
    queryKey: ["rotina", "habits", userId],
    queryFn: fetchHabitsWithLogs,
    enabled: !!userId && rotinaVisible,
  });
  const casaQuery = useQuery({
    queryKey: ["casa", userId],
    queryFn: fetchCasa,
    enabled: !!userId && casaVisible,
  });
  const saudeQuery = useQuery({
    queryKey: ["saude", userId],
    queryFn: fetchSaude,
    enabled: !!userId && saudeVisible,
  });
  const estudosQuery = useQuery({
    queryKey: ["estudos", userId],
    queryFn: fetchEstudos,
    enabled: !!userId && estudosVisible,
  });
  const carreiraQuery = useQuery({
    queryKey: ["carreira", userId],
    queryFn: fetchCarreira,
    enabled: !!userId && carreiraVisible,
  });
  const treinoQuery = useQuery({
    queryKey: ["treino", userId],
    queryFn: fetchTreino,
    enabled: !!userId && treinoVisible,
  });
  const petQuery = useQuery({
    queryKey: ["pet", userId],
    queryFn: fetchPet,
    enabled: !!userId && petVisible,
  });
  const relacoesQuery = useQuery({
    queryKey: ["relacoes", userId],
    queryFn: fetchRelacoes,
    enabled: !!userId && rotinaVisible,
  });
  const belezaQuery = useQuery({
    queryKey: ["beleza", userId],
    queryFn: fetchBeleza,
    enabled: !!userId && belezaVisible,
  });
  const viagensQuery = useQuery({
    queryKey: ["viagens", userId],
    queryFn: fetchViagens,
    enabled: !!userId && viagensVisible,
  });
  const bibliotecaQuery = useQuery({
    queryKey: ["biblioteca", userId],
    queryFn: fetchBiblioteca,
    enabled: !!userId && bibliotecaVisible,
  });
  const veiculoQuery = useQuery({
    queryKey: ["veiculo-active", userId],
    queryFn: fetchActiveVehicle,
    enabled: !!userId && veiculoVisible,
  });
  const vehicle = veiculoQuery.data ?? null;
  const veiculoSchedulesQuery = useQuery({
    queryKey: ["veiculo-maintenance-schedules", vehicle?.id],
    queryFn: () => fetchMaintenanceSchedules(vehicle!.id),
    enabled: !!userId && veiculoVisible && !!vehicle?.id,
  });

  // Gera sozinho, direto na Home (a tela mais visitada do app), os lançamentos fixos de
  // Finanças ainda não gerados neste ciclo/mês — mesma lógica já usada em
  // `financas.tsx`/`financas-cartao.tsx`, repetida aqui pra não depender da pessoa abrir
  // alguma tela de Finanças pro lançamento cair sozinho. `hasGeneratedRef` trava contra
  // rodar de novo a cada refetch/invalidate.
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (!userId || !financasExtrasQuery.data || hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;
    const { cards, recurringCharges, recurringTransactions, balanceRows } = financasExtrasQuery.data;
    Promise.all([
      ensureCardRecurringChargesGenerated(userId, cards, recurringCharges, balanceRows),
      ensureRecurringTransactionsGenerated(userId, recurringTransactions, balanceRows),
    ])
      .then(([cardCount, genericCount]) => {
        if (cardCount > 0 || genericCount > 0) {
          queryClient.invalidateQueries({ queryKey: ["financas", userId] });
          queryClient.invalidateQueries({ queryKey: ["financas-extras", userId] });
        }
      })
      .catch(() => {
        hasGeneratedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, financasExtrasQuery.data]);

  const activeQueries = [
    financasVisible ? financasQuery : null,
    financasVisible ? financasExtrasQuery : null,
    rotinaVisible ? rotinaQuery : null,
    casaVisible ? casaQuery : null,
    saudeVisible ? saudeQuery : null,
    estudosVisible ? estudosQuery : null,
    carreiraVisible ? carreiraQuery : null,
    treinoVisible ? treinoQuery : null,
    petVisible ? petQuery : null,
    rotinaVisible ? relacoesQuery : null,
    belezaVisible ? belezaQuery : null,
    viagensVisible ? viagensQuery : null,
    bibliotecaVisible ? bibliotecaQuery : null,
    // A busca dos agendamentos só entra na conta de "carregando" quando já tem veículo —
    // sem veículo cadastrado ela nem é habilitada, e não deve travar a seção esperando.
    veiculoVisible ? veiculoQuery : null,
    veiculoVisible && vehicle?.id ? veiculoSchedulesQuery : null,
  ].filter((q): q is NonNullable<typeof q> => q !== null);

  const isLoading = activeQueries.some((q) => q.isLoading);

  // `useMemo` (não um early return antes) porque hooks não podem ser condicionais — o
  // early return de "nenhum módulo ativo" só pode vir depois de todos os hooks já terem
  // rodado (ver `activeQueries.length === 0` abaixo).
  const items = useMemo(() => {
    let list: TodayItem[] = [];
    if (financasVisible && financasQuery.data && financasExtrasQuery.data) {
      list = list.concat(
        todayItemsFromFinancas({
          bills: financasQuery.data.bills,
          cards: financasExtrasQuery.data.cards,
          recurringCharges: financasExtrasQuery.data.recurringCharges,
          recurringTransactions: financasExtrasQuery.data.recurringTransactions,
          balanceRows: financasExtrasQuery.data.balanceRows,
        })
      );
    }
    if (rotinaVisible && rotinaQuery.data) {
      list = list.concat(todayItemsFromRotina(rotinaQuery.data.habits, rotinaQuery.data.logs));
    }
    if (casaVisible && casaQuery.data) {
      list = list.concat(todayItemsFromCasa(casaQuery.data.tasks, casaQuery.data.taskLogs));
    }
    if (saudeVisible && saudeQuery.data) {
      list = list.concat(
        todayItemsFromSaude(saudeQuery.data.medications, saudeQuery.data.medicationLogs, saudeQuery.data.appointments)
      );
    }
    if (estudosVisible && estudosQuery.data) {
      list = list.concat(todayItemsFromEstudos(estudosQuery.data.tasks));
    }
    if (carreiraVisible && carreiraQuery.data) {
      list = list.concat(todayItemsFromCarreira(carreiraQuery.data.deadlines));
    }
    if (treinoVisible && treinoQuery.data) {
      list = list.concat(
        todayItemsFromTreino(treinoQuery.data.workouts, treinoQuery.data.exercises, treinoQuery.data.todayLogs)
      );
    }
    if (petVisible && petQuery.data) {
      list = list.concat(todayItemsFromPet(petQuery.data.pets, petQuery.data.careEvents));
    }
    if (rotinaVisible && relacoesQuery.data) {
      list = list.concat(todayItemsFromRelacoes(relacoesQuery.data.people, relacoesQuery.data.reminders));
    }
    if (belezaVisible && belezaQuery.data) {
      list = list.concat(
        todayItemsFromBeleza({
          routineSteps: belezaQuery.data.routineSteps,
          routineLogsToday: belezaQuery.data.routineLogsToday,
          products: belezaQuery.data.products,
        })
      );
    }
    if (viagensVisible && viagensQuery.data) {
      list = list.concat(
        todayItemsFromViagens({ trips: viagensQuery.data.trips, checklistItems: viagensQuery.data.checklistItems })
      );
    }
    if (bibliotecaVisible && bibliotecaQuery.data) {
      list = list.concat(
        todayItemsFromBiblioteca({ logs: bibliotecaQuery.data.logs, metaPaginasDia: bibliotecaQuery.data.metaPaginasDia })
      );
    }
    // Só monta os itens de manutenção quando os agendamentos já vieram — sem veículo
    // cadastrado `veiculoSchedulesQuery.data` fica sempre undefined, e a seção não aparece.
    if (veiculoVisible && vehicle && veiculoSchedulesQuery.data) {
      list = list.concat(todayItemsFromVeiculo(vehicle, veiculoSchedulesQuery.data));
    }
    return sortTodayItems(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    financasVisible,
    financasQuery.data,
    financasExtrasQuery.data,
    rotinaVisible,
    rotinaQuery.data,
    casaVisible,
    casaQuery.data,
    saudeVisible,
    saudeQuery.data,
    estudosVisible,
    estudosQuery.data,
    carreiraVisible,
    carreiraQuery.data,
    treinoVisible,
    treinoQuery.data,
    petVisible,
    petQuery.data,
    relacoesQuery.data,
    belezaVisible,
    belezaQuery.data,
    viagensVisible,
    viagensQuery.data,
    bibliotecaVisible,
    bibliotecaQuery.data,
    veiculoVisible,
    vehicle,
    veiculoSchedulesQuery.data,
  ]);

  // Empurra a mesma Visão Hoje pro widget de tela inicial (Android) sempre que ela muda
  // aqui — assim o widget fica atualizado na hora sem esperar o ciclo de 30 min do
  // `updatePeriodMillis`. Em iOS/web `requestWidgetUpdate` é um no-op seguro (biblioteca
  // já trata isso sozinha, ver `AndroidWidget.js`), não precisa checar `Platform.OS` aqui.
  useEffect(() => {
    if (!userId || isLoading) return;
    requestWidgetUpdate({
      widgetName: "HojeWidget",
      renderWidget: () => renderHojeWidget({ status: "ok", items }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoading, items]);

  // Nenhum módulo com noção de "hoje" está ativo — seção some inteira em vez de aparecer
  // vazia sem sentido.
  if (activeQueries.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>Hoje</Text>

      {isLoading && items.length === 0 ? (
        <View
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
          }}
        >
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : items.length === 0 ? (
        <View
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
            Nada pendente por hoje. 🎉
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            borderWidth: 1,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: tokens.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13.5, color: tokens.text }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.subtitle ? (
                  <Text
                    style={{ fontFamily: fontFamily.body, fontSize: 11.5, color: tokens.textMuted }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {item.urgency === "atrasada" ? (
                <View
                  style={{
                    backgroundColor: tokens.dangerMuted,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10.5, color: tokens.danger }}>
                    ATRASADO
                  </Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 16, color: tokens.textMuted }}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
