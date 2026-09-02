import React from "react";
import { View, ScrollView, KeyboardAvoidingView, useWindowDimensions, Platform, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme/theme-provider";

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

const DESKTOP_BREAKPOINT = 900;
/** Largura de leitura confortável em telas largas — evita o conteúdo esticar de ponta a ponta. */
const DESKTOP_CONTENT_MAX_WIDTH = 760;

/** Wrapper padrão de tela: fundo do tema + safe area + padding opcional + largura máxima no desktop. */
export function Screen({ scroll = false, padded = true, style, children, ...rest }: ScreenProps) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
  const Container = scroll ? ScrollView : View;

  // Importante: a largura máxima do desktop só pode ir no
  // `contentContainerStyle` (o conteúdo DENTRO do scroll), nunca no `style` do próprio
  // `ScrollView` quando `scroll` é usado — o `style` é o elemento que o React Native Web
  // marca com `overflow` de verdade, e é nele que o navegador desenha a barra de rolagem
  // nativa. Se ele também levasse `maxWidth`, a barra de rolagem ficava presa na borda
  // dessa caixa estreita e centralizada — ou seja, no MEIO da tela larga, em vez de na
  // borda de verdade da janela do navegador.
  // Deixando o `style` sempre com largura total, o scroll (e a barra dele) ocupa a janela
  // inteira; só o conteúdo visível é que fica centralizado e limitado a
  // `DESKTOP_CONTENT_MAX_WIDTH` por dentro.
  const inner = (
    <Container
      style={[{ flex: scroll ? undefined : 1, padding: padded ? 20 : 0 }, !scroll && isDesktop ? { width: "100%", maxWidth: DESKTOP_CONTENT_MAX_WIDTH, alignSelf: "center" } : null, style]}
      contentContainerStyle={
        scroll
          ? [
              { padding: padded ? 20 : 0, flexGrow: 1 },
              isDesktop ? { width: "100%", maxWidth: DESKTOP_CONTENT_MAX_WIDTH, alignSelf: "center" } : null,
            ]
          : undefined
      }
      {...rest}
    >
      {children}
    </Container>
  );

  // `alignItems: "stretch"` (o padrão) aqui de propósito, não "center": o filho (a
  // `ScrollView`/`View` de dentro) precisa ocupar a largura TOTAL pra que seu scroll (e a
  // barra de rolagem do navegador) fique na borda de verdade da janela — quem centraliza
  // visualmente o conteúdo é o `maxWidth`+`alignSelf: "center"` aplicado por dentro dele
  // (no `contentContainerStyle` pro scroll, no próprio `style` pra tela sem scroll).
  // Corrige campos de formulário perto do fim da tela (ex: o
  // formulário de corrida em Veículo) ficando escondidos atrás do teclado ao digitar. O
  // `KeyboardAvoidingView` empurra o conteúdo pra cima quando o teclado abre; combinado com
  // `ScrollView` (quando `scroll` está ligado), o campo focado rola automaticamente pra
  // dentro da área visível — comportamento padrão do React Native, sem precisar de código
  // extra em cada tela. Como isso envolve toda tela que usa `<Screen>`, corrigido aqui uma
  // vez só em vez de em cada formulário separadamente.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      >
        {isDesktop ? <View style={{ flex: 1 }}>{inner}</View> : inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
