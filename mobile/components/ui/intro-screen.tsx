import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { fontFamily } from "@/lib/theme/tokens";

const BACKGROUND = "#17161A";
const MARK_COLOR = "#F5F1EC";

type IntroScreenProps = {
  onFinish: () => void;
};

/**
 * Tela de abertura animada — some sozinha depois da sequência (chama `onFinish`), mostrada
 * logo depois que a splash nativa do sistema esconde (ver `app/_layout.tsx`). Antes disso o
 * app ficava com fundo branco nesse intervalo (a splash nunca tinha sido configurada de
 * verdade em app.json — corrigido junto com isso).
 *
 * Cores fixas (fundo escuro + marca clara), sem depender do tema claro/escuro escolhido pela
 * pessoa — é um momento único antes dela "entrar" no app propriamente dito, igual a splash
 * nativa (que usa esse mesmo fundo `#17161A`, configurada em app.json).
 */
export function IntroScreen({ onFinish }: IntroScreenProps) {
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.85)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslate = useRef(new Animated.Value(-8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const groupOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(markScale, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(wordmarkTranslate, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(700),
      Animated.timing(groupOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => sequence.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ opacity: groupOpacity, alignItems: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Animated.Image
            source={require("../../assets/splash-mark.png")}
            style={{ width: 40, height: 40, opacity: markOpacity, transform: [{ scale: markScale }] }}
            resizeMode="contain"
          />
          <Animated.Text
            style={{
              opacity: wordmarkOpacity,
              transform: [{ translateX: wordmarkTranslate }],
              fontFamily: fontFamily.display,
              fontSize: 30,
              color: MARK_COLOR,
              letterSpacing: 0.5,
            }}
          >
            Prumo
          </Animated.Text>
        </View>
        <Animated.Text
          style={{
            opacity: taglineOpacity,
            fontFamily: fontFamily.body,
            fontSize: 13,
            color: MARK_COLOR,
            letterSpacing: 0.3,
          }}
        >
          Sua vida em prumo.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
