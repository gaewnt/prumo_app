import React from "react";
import { Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";

type BalanceLineChartProps = {
  /** Série acumulada (ex: fluxo de caixa dia a dia) — precisa de pelo menos 2 pontos. */
  points: number[];
  height?: number;
};

/**
 * Linha em área, no padrão do gráfico de investimento do Pierre. Depende de
 * `react-native-svg` — rodar `npx expo install react-native-svg` se ainda não
 * estiver instalado.
 */
export function BalanceLineChart({ points, height = 72 }: BalanceLineChartProps) {
  const { tokens } = useTheme();

  if (points.length < 2) {
    return (
      <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: tokens.textMuted }}>
        Ainda não há lançamentos suficientes pra desenhar esse gráfico.
      </Text>
    );
  }

  const width = 300;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((value, index) => ({
    x: index * stepX,
    y: height - ((value - min) / range) * height,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={tokens.accent} stopOpacity={0.28} />
          <Stop offset="100%" stopColor={tokens.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#balanceFill)" />
      <Path
        d={linePath}
        fill="none"
        stroke={tokens.accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={4} fill={tokens.accent} />
    </Svg>
  );
}
