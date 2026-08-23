/**
 * Tokens de cor do Prumo.
 *
 * Conceito: um instrumento de precisão, não uma grade colorida de módulos.
 * Base neutra grafite com leve viés quente (puxando pro tom do accent), e um
 * único accent forte — um vinho/oxblood que remete à linha de prumo (o fio
 * de chumbo/corda tensionada usada por pedreiros e carpinteiros pra achar o
 * eixo vertical certo). Cores semânticas (sucesso, alerta, perigo) ficam
 * deliberadamente separadas do accent pra nunca se confundirem com ele.
 */

export const fontFamily = {
  display: "Archivo_700Bold",
  displaySemibold: "Archivo_600SemiBold",
  body: "IBMPlexSans_400Regular",
  bodyMedium: "IBMPlexSans_500Medium",
  bodySemibold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_500Medium",
} as const;

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  /**
   * Paleta categórica pra gráficos (donut, legendas) — deliberadamente separada
   * de success/warning/danger, que carregam significado (bom/atenção/ruim) e
   * não devem ser reaproveitadas pra rotular categorias sem essa conotação.
   */
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
};

export const lightTheme: ThemeTokens = {
  background: "#F6F4F1",
  surface: "#FFFFFF",
  surfaceAlt: "#EDEAE4",
  border: "#DEDAD2",
  text: "#201C1B",
  textMuted: "#6F6864",
  accent: "#7A2A38",
  accentText: "#FFFFFF",
  accentMuted: "#F1DEE0",
  success: "#3D7A5C",
  successMuted: "#DFEEE6",
  warning: "#B8862E",
  warningMuted: "#F3E7D2",
  danger: "#C1432E",
  dangerMuted: "#F6DFDA",
  chart1: "#3C6E8F",
  chart2: "#7A5A8F",
  chart3: "#A67C3D",
  chart4: "#3D8A82",
  chart5: "#847C74",
};

export const darkTheme: ThemeTokens = {
  background: "#17161A",
  surface: "#201D21",
  surfaceAlt: "#2B272C",
  border: "#3A353A",
  text: "#F2EFEC",
  textMuted: "#A8A29C",
  accent: "#D98D98",
  accentText: "#2A1216",
  accentMuted: "#3A2328",
  success: "#6FB894",
  successMuted: "#213229",
  warning: "#D7A752",
  warningMuted: "#332A18",
  danger: "#E2705B",
  dangerMuted: "#3A241F",
  chart1: "#7FAFCB",
  chart2: "#B79BCB",
  chart3: "#CBA268",
  chart4: "#7BC4BA",
  chart5: "#A69C92",
};

export type ThemePreference = "system" | "light" | "dark";
