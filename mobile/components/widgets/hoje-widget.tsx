import React from "react";
import { FlexWidget, TextWidget, ListWidget, type ColorProp } from "react-native-android-widget";
import { fontFamily, lightTheme, darkTheme, type ThemeTokens } from "@/lib/theme/tokens";
import type { WidgetHojeState } from "@/lib/widget-hoje";
import type { TodayItem } from "@/lib/hoje";

/** Os tokens de tema são `string` genérico (vêm de fora, também usados em CSS/etc), mas
 * os componentes de widget exigem literal `#RRGGBB`/`rgba(...)` (`ColorProp`) — os valores
 * em si já são hex de verdade (ver `lib/theme/tokens.ts`), então é só um cast de tipo. */
type WidgetTokens = { [K in keyof ThemeTokens]: ColorProp };

function toWidgetTokens(tokens: ThemeTokens): WidgetTokens {
  return tokens as unknown as WidgetTokens;
}

/**
 * Widget de tela inicial "Visão Hoje" — mesmo conteúdo da seção Hoje da Home (ver
 * `lib/widget-hoje.ts`), só que compacto e read-only: tocar num item abre o módulo certo
 * dentro do Prumo (deep link `prumo://...`), mas nada aqui escreve no banco — pra isso é
 * preciso abrir o app de verdade. Decisão da Ana: sem escrita direto pelo widget, só
 * leitura rápida do que precisa de atenção hoje.
 *
 * Roda fora da árvore React do app (task handler headless do `react-native-android-widget`,
 * "não pode usar hooks"), então as cores vêm direto dos tokens (`lightTheme`/`darkTheme`)
 * em vez de `useTheme()`, e cada tema é montado à parte — ver `renderHojeWidget` abaixo,
 * que devolve os dois (`{ light, dark }`) pro widget acompanhar o tema do sistema sozinho.
 */

function deepLinkFor(route: string): string {
  return `prumo://${route.replace(/^\//, "")}`;
}

function WidgetShell({
  tokens,
  clickAction,
  clickActionData,
  children,
}: {
  tokens: WidgetTokens;
  clickAction?: string;
  clickActionData?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <FlexWidget
      clickAction={clickAction}
      clickActionData={clickActionData}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: tokens.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: tokens.border,
        padding: 12,
        flexDirection: "column",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text="Hoje" style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }} />
        </FlexWidget>
        <TextWidget text="Prumo" style={{ fontFamily: fontFamily.body, fontSize: 10.5, color: tokens.textMuted }} />
      </FlexWidget>
      {children}
    </FlexWidget>
  );
}

function MessageWidget({ tokens, message, clickAction }: { tokens: WidgetTokens; message: string; clickAction: string }) {
  return (
    <WidgetShell tokens={tokens} clickAction={clickAction}>
      <FlexWidget style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <TextWidget
          text={message}
          style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted, textAlign: "center" }}
          maxLines={3}
        />
      </FlexWidget>
    </WidgetShell>
  );
}

function ItemRow({ item, tokens }: { item: TodayItem; tokens: WidgetTokens }) {
  const isLate = item.urgency === "atrasada";
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLinkFor(item.route) }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "match_parent",
        paddingVertical: 7,
      }}
    >
      <TextWidget text={item.icon} style={{ fontSize: 15, marginRight: 8 }} />
      <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
        <TextWidget
          text={item.label}
          style={{ fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: tokens.text }}
          truncate="END"
          maxLines={1}
        />
        {item.subtitle ? (
          <TextWidget
            text={item.subtitle}
            style={{ fontFamily: fontFamily.body, fontSize: 10.5, color: tokens.textMuted }}
            truncate="END"
            maxLines={1}
          />
        ) : null}
      </FlexWidget>
      {isLate ? (
        <FlexWidget
          style={{
            backgroundColor: tokens.dangerMuted,
            borderRadius: 999,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginLeft: 6,
          }}
        >
          <TextWidget text="ATRASADO" style={{ fontFamily: fontFamily.bodyMedium, fontSize: 8.5, color: tokens.danger }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

function HojeWidgetForTheme({ state, tokens }: { state: WidgetHojeState; tokens: WidgetTokens }) {
  if (state.status === "logged-out") {
    return <MessageWidget tokens={tokens} message="Abra o Prumo pra entrar." clickAction="OPEN_APP" />;
  }
  if (state.status === "error") {
    return <MessageWidget tokens={tokens} message="Não deu pra atualizar agora. Toque pra abrir o app." clickAction="OPEN_APP" />;
  }
  if (state.items.length === 0) {
    return <MessageWidget tokens={tokens} message="Nada pendente por hoje. 🎉" clickAction="OPEN_APP" />;
  }
  return (
    <WidgetShell tokens={tokens}>
      <ListWidget style={{ width: "match_parent", height: "match_parent" }}>
        {state.items.map((item) => (
          <ItemRow key={item.id} item={item} tokens={tokens} />
        ))}
      </ListWidget>
    </WidgetShell>
  );
}

/** Monta as duas versões (clara/escura) — o widget escolhe sozinho conforme o tema do
 * sistema no aparelho, sem depender do `ThemePreference` salvo nas Configurações do app
 * (não dá pra ler `AsyncStorage` de preferência de forma síncrona aqui). */
export function renderHojeWidget(state: WidgetHojeState) {
  return {
    light: <HojeWidgetForTheme state={state} tokens={toWidgetTokens(lightTheme)} />,
    dark: <HojeWidgetForTheme state={state} tokens={toWidgetTokens(darkTheme)} />,
  };
}
