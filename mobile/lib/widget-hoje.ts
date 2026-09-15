import { supabase } from "@/lib/supabase";
import { fetchAllModulePreferences } from "@/lib/onboarding";
import { fetchFinancas, fetchFinancasExtras } from "@/lib/financas";
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

/**
 * Mesma junção de módulos que `components/home/today-view.tsx` faz na Home, só que sem
 * hooks — o widget de tela inicial roda num contexto headless (task handler do
 * `react-native-android-widget`), então busca tudo direto com `Promise.all` em vez de
 * `useQuery`. Repete a lógica de visibilidade por módulo (preferências escondidas em
 * Configurações) pra não mostrar no widget algo que a pessoa escondeu na Home.
 *
 * Não geram os lançamentos fixos ainda não gerados (isso fica só a cargo do app aberto,
 * `today-view.tsx`) — o widget só LÊ o estado atual, nunca escreve nada no banco.
 */

const MAX_WIDGET_ITEMS = 6;

export type WidgetHojeState =
  | { status: "logged-out" }
  | { status: "error" }
  | { status: "ok"; items: TodayItem[] };

export async function fetchWidgetHojeState(): Promise<WidgetHojeState> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { status: "logged-out" };

    const preferences = await fetchAllModulePreferences();
    const hiddenSlugs = new Set(preferences.filter((p) => p.hidden).map((p) => p.module_slug));

    const financasVisible = !hiddenSlugs.has("financas");
    const rotinaVisible = !hiddenSlugs.has("rotina");
    const casaVisible = !hiddenSlugs.has("casa");
    const saudeVisible = !hiddenSlugs.has("saude");
    const estudosVisible = !hiddenSlugs.has("estudos");
    const carreiraVisible = !hiddenSlugs.has("carreira");
    const treinoVisible = !hiddenSlugs.has("dev-pessoal");
    const belezaVisible = !hiddenSlugs.has("dev-pessoal");
    const viagensVisible = !hiddenSlugs.has("dev-pessoal");
    const petVisible = !hiddenSlugs.has("pet");
    const veiculoVisible = !hiddenSlugs.has("veiculo");
    const bibliotecaVisible = !hiddenSlugs.has("estudos");

    const [
      financas,
      financasExtras,
      rotina,
      casa,
      saude,
      estudos,
      carreira,
      treino,
      pet,
      relacoes,
      beleza,
      viagens,
      biblioteca,
      vehicle,
    ] = await Promise.all([
      financasVisible ? fetchFinancas() : null,
      financasVisible ? fetchFinancasExtras() : null,
      rotinaVisible ? fetchHabitsWithLogs() : null,
      casaVisible ? fetchCasa() : null,
      saudeVisible ? fetchSaude() : null,
      estudosVisible ? fetchEstudos() : null,
      carreiraVisible ? fetchCarreira() : null,
      treinoVisible ? fetchTreino() : null,
      petVisible ? fetchPet() : null,
      rotinaVisible ? fetchRelacoes() : null,
      belezaVisible ? fetchBeleza() : null,
      viagensVisible ? fetchViagens() : null,
      bibliotecaVisible ? fetchBiblioteca() : null,
      veiculoVisible ? fetchActiveVehicle() : null,
    ]);

    const veiculoSchedules =
      veiculoVisible && vehicle ? await fetchMaintenanceSchedules(vehicle.id) : null;

    let items: TodayItem[] = [];
    if (financas && financasExtras) {
      items = items.concat(
        todayItemsFromFinancas({
          bills: financas.bills,
          cards: financasExtras.cards,
          recurringCharges: financasExtras.recurringCharges,
          recurringTransactions: financasExtras.recurringTransactions,
          balanceRows: financasExtras.balanceRows,
        })
      );
    }
    if (rotina) items = items.concat(todayItemsFromRotina(rotina.habits, rotina.logs));
    if (casa) items = items.concat(todayItemsFromCasa(casa.tasks, casa.taskLogs));
    if (saude) items = items.concat(todayItemsFromSaude(saude.medications, saude.medicationLogs, saude.appointments));
    if (estudos) items = items.concat(todayItemsFromEstudos(estudos.tasks));
    if (carreira) items = items.concat(todayItemsFromCarreira(carreira.deadlines));
    if (treino) items = items.concat(todayItemsFromTreino(treino.workouts, treino.exercises, treino.todayLogs));
    if (pet) items = items.concat(todayItemsFromPet(pet.pets, pet.careEvents));
    if (relacoes) items = items.concat(todayItemsFromRelacoes(relacoes.people, relacoes.reminders));
    if (beleza) {
      items = items.concat(
        todayItemsFromBeleza({
          routineSteps: beleza.routineSteps,
          routineLogsToday: beleza.routineLogsToday,
          products: beleza.products,
        })
      );
    }
    if (viagens) {
      items = items.concat(todayItemsFromViagens({ trips: viagens.trips, checklistItems: viagens.checklistItems }));
    }
    if (biblioteca) {
      items = items.concat(
        todayItemsFromBiblioteca({ logs: biblioteca.logs, metaPaginasDia: biblioteca.metaPaginasDia })
      );
    }
    if (vehicle && veiculoSchedules) items = items.concat(todayItemsFromVeiculo(vehicle, veiculoSchedules));

    return { status: "ok", items: sortTodayItems(items).slice(0, MAX_WIDGET_ITEMS) };
  } catch {
    return { status: "error" };
  }
}
