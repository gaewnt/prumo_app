import React from "react";
import { Text, View, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type AppHeaderProps = {
  name: string;
  avatarUrl?: string | null;
  greeting: string;
  onPressAvatar?: () => void;
  onPressMic?: () => void;
  onPressNotifications?: () => void;
  hasUnreadNotifications?: boolean;
  /** Corrige o botão de configurações "rondando" solto, flutuando
   * por cima do conteúdo no canto da tela, longe dos outros botões de ação rápida. Opcional
   * pra não forçar toda tela que usa `AppHeader` a ter engrenagem (só a Home usa por ora). */
  onPressSettings?: () => void;
};

/** Cabeçalho padrão das telas principais: foto, saudação + nome, microfone e notificações. */
export function AppHeader({
  name,
  avatarUrl,
  greeting,
  onPressAvatar,
  onPressMic,
  onPressNotifications,
  hasUnreadNotifications,
  onPressSettings,
}: AppHeaderProps) {
  const { tokens } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "P";

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={onPressAvatar} hitSlop={6}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: tokens.gradientEnd }}
            />
          ) : (
            <LinearGradient
              colors={[tokens.gradientStart, tokens.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 17, color: "#0B2430" }}>
                {initial}
              </Text>
            </LinearGradient>
          )}
        </Pressable>

        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>{greeting}</Text>
          <Text style={{ fontFamily: fontFamily.displaySemibold, fontSize: 17, color: tokens.text }} numberOfLines={1}>
            {name || "Prumo"}
          </Text>
        </View>

        <Pressable
          onPress={onPressMic}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: tokens.accentMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16 }}>🎙️</Text>
        </Pressable>

        <Pressable onPress={onPressNotifications} hitSlop={8} style={{ position: "relative" }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: tokens.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </View>
          {hasUnreadNotifications ? (
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: tokens.danger,
                borderWidth: 1.5,
                borderColor: tokens.background,
              }}
            />
          ) : null}
        </Pressable>

        {onPressSettings ? (
          <Pressable
            onPress={onPressSettings}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: tokens.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </Pressable>
        ) : null}
      </View>

      <LinearGradient
        colors={[tokens.gradientStart, tokens.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 2, borderRadius: 1, opacity: 0.5 }}
      />
    </View>
  );
}
