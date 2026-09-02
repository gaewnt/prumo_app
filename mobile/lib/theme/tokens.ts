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
  /**
   * Degradê azul→verde da identidade visual do Prumo — usado em barras de
   * navegação, cabeçalhos, botões de destaque e divisórias marcantes via
   * `<LinearGradient colors={[tokens.gradientStart, tokens.gradientEnd]}>`.
   * Não é o mesmo que `accent` (que continua sendo uma cor sólida, pra texto
   * e ícones onde um degradê não fica legível).
   */
  gradientStart: string;
  gradientEnd: string;
};

export const lightTheme: ThemeTokens = {
  background: "#FFFFFF",
  surface: "#F5F9FB",
  surfaceAlt: "#E9F1F5",
  border: "#D7E2E9",
  text: "#152430",
  textMuted: "#5C7386",
  accent: "#12968A",
  accentText: "#FFFFFF",
  accentMuted: "#DCF2ED",
  success: "#1E9D6B",
  successMuted: "#DEF3E8",
  warning: "#B8862E",
  warningMuted: "#F3E7D2",
  danger: "#C1432E",
  dangerMuted: "#F6DFDA",
  chart1: "#2E6FA7",
  chart2: "#7A5A9F",
  chart3: "#B98232",
  chart4: "#B15C74",
  chart5: "#5C7386",
  gradientStart: "#0EA8D6",
  gradientEnd: "#1FBE9E",
};

export const darkTheme: ThemeTokens = {
  background: "#2F455C",
  surface: "#3A5674",
  surfaceAlt: "#33506B",
  border: "#4A6785",
  text: "#EDF3F7",
  textMuted: "#A9BFD1",
  accent: "#34F5C5",
  accentText: "#0B2430",
  accentMuted: "#16394A",
  success: "#3ED598",
  successMuted: "#163A2E",
  warning: "#F5B942",
  warningMuted: "#3A2E12",
  danger: "#F2665A",
  dangerMuted: "#3A1B18",
  chart1: "#6FA8DC",
  chart2: "#B49CE0",
  chart3: "#F0B463",
  chart4: "#E08FA0",
  chart5: "#9FB4C4",
  gradientStart: "#1DCDFE",
  gradientEnd: "#34F5C5",
};

export type ThemePreference = "system" | "light" | "dark";
