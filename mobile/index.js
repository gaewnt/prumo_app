// Entrada custom só pra registrar o task handler do widget de tela inicial ANTES do app
// carregar — precisa disso porque o Android às vezes chama o handler com o app inteiro
// fechado (atualização periódica do widget, processo dedicado). Fora isso, delega 100%
// pro entry padrão do Expo Router — nenhum outro comportamento de boot muda.
//
// Só registra em Android (widget de tela inicial não existe em iOS/web, e o app também
// roda como site — `npm run build:web` — que não deve carregar nada dessa lib nativa).
const { Platform } = require("react-native");

if (Platform.OS === "android") {
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  const { hojeWidgetTaskHandler } = require("./widget-task-handler");
  registerWidgetTaskHandler(hojeWidgetTaskHandler);
}

require("expo-router/entry");
