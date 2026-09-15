import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * HTML raiz customizável do expo-router — só tem efeito quando `web.output` no
 * `app.json` é `"static"` ou `"server"`. O Prumo roda em `web.output` padrão (SPA de
 * página única, sem pré-renderização no servidor) porque mudar pra `"static"` quebra o
 * build: a criação do client do Supabase roda durante a exportação, no Node, e ele
 * depende de `window`/`AsyncStorage`, que só existem no navegador. Por isso esse arquivo
 * hoje não é usado de verdade — o HTML raiz de verdade, incluindo o script do Google
 * AdSense, está em `public/index.html` (esse aqui, sim, é lido pelo `expo export` mesmo
 * no modo SPA). Mantido por enquanto caso um dia valha a pena migrar pra `"static"` (com
 * o Supabase ajustado pra não rodar na exportação) — nesse caso o script do AdSense
 * precisaria ser copiado pra cá também.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Deixa o ScrollView do RN se comportar mais perto do nativo na web (sem scroll do body). */}
        <ScrollViewStyleReset />

        {/* Google AdSense — Anúncios automáticos: o próprio Google escolhe os melhores
         * lugares da página pra exibir os anúncios, sem precisar reservar espaço manualmente
         * aqui no código. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1697150630482564"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
