import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type ProgressRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

/** Anel de progresso 0–100%, no padrão da tela "sua evolução" de referência. */
export function ProgressRing({ percent, size = 64, strokeWidth = 8, color }: ProgressRingProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;
  const ringColor = color ?? tokens.accent;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={tokens.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text
        style={{
          position: "absolute",
          fontFamily: fontFamily.bodySemibold,
          fontSize: size * 0.22,
          color: tokens.text,
        }}
      >
        {clamped}%
      </Text>
    </View>
  );
}
