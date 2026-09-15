import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { fetchWidgetHojeState } from "@/lib/widget-hoje";
import { renderHojeWidget } from "@/components/widgets/hoje-widget";

/**
 * Handler headless chamado pelo Android pra cada evento do widget de tela inicial "Hoje"
 * (`app.json` > plugin `react-native-android-widget`) — adicionado, atualização periódica
 * (`updatePeriodMillis`, mínimo 30 min), redimensionado ou removido. Registrado em
 * `index.js`, ANTES do `expo-router/entry`, porque o Android pode disparar isso com o app
 * inteiro fechado (processo dedicado só pra atualizar o widget).
 *
 * Cliques nos itens do widget usam `clickAction="OPEN_URI"` (deep link direto pro módulo,
 * ver `components/widgets/hoje-widget.tsx`) — esses NUNCA chegam aqui como `WIDGET_CLICK`,
 * então não precisa tratar navegação neste handler.
 */
export async function hojeWidgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== "HojeWidget") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const state = await fetchWidgetHojeState();
      props.renderWidget(renderHojeWidget(state));
      break;
    }
    case "WIDGET_DELETED":
    case "WIDGET_CLICK":
    default:
      break;
  }
}
