import React from "react";
import { View, ScrollView, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme/theme-provider";

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

/** Wrapper padrão de tela: fundo do tema + safe area + padding opcional. */
export function Screen({ scroll = false, padded = true, style, children, ...rest }: ScreenProps) {
  const { tokens } = useTheme();
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }} edges={["top", "left", "right"]}>
      <Container
        style={[{ flex: scroll ? undefined : 1, padding: padded ? 20 : 0 }, style]}
        contentContainerStyle={scroll ? { padding: padded ? 20 : 0, flexGrow: 1 } : undefined}
        {...rest}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
