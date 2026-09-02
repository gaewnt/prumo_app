import { View } from "react-native";

/**
 * Versão web do `AdBanner` — o Metro escolhe este arquivo automaticamente em vez de
 * `ad-banner.tsx` quando empacota pra `--platform web` (convenção padrão do Expo/Metro:
 * sufixo `.web.tsx` vence o arquivo genérico nessa plataforma, sem precisar configurar nada).
 *
 * Por quê existe: `react-native-google-mobile-ads` (o pacote de anúncios) importa, nos
 * arquivos dele mesmo, `codegenNativeComponent` do React Native — um utilitário que só
 * existe no bundle nativo (Android/iOS), não tem equivalente na web. O `ad-banner.tsx`
 * original já importava esse pacote de forma dinâmica (`await import(...)`, só dentro de
 * `useEffect`, guardado por `isExpoGo`) pensando em nunca carregar isso no Expo Go — mas
 * isso não protege a build **web**: o Metro resolve/inclui o módulo inteiro no bundle na
 * hora de gerar o `dist/` (não faz code-splitting real de rotas aqui), então o import
 * quebra o `expo export --platform web` inteiro antes mesmo do app rodar, mesmo o código
 * nunca chamando a função de verdade nessa plataforma.
 *
 * Anúncio nunca fez sentido na versão web mesmo (não tem SDK do Google Mobile Ads pra
 * navegador) — este arquivo só garante que o espaço reservado ao banner simplesmente
 * não renderiza nada na web, sem tentar puxar o pacote nativo.
 */
export function AdBanner() {
  return <View />;
}
