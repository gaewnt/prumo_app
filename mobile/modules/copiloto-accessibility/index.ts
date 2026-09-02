import { requireNativeModule, NativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";

/**
 * API JS do módulo nativo do Copiloto — a parte que lê a tela dos apps de
 * corrida/entrega (Uber Driver, 99 Motorista, InDrive, iFood Entregador, MT
 * Entregas) via AccessibilityService do Android e mostra a bolha flutuante
 * com o cálculo.
 *
 * Só existe de verdade no Android: a Apple não permite esse tipo de leitura
 * de tela em apps de terceiros no iOS, então lá embaixo devolvemos um
 * "módulo" inofensivo que nunca lança erro, só resolve pra "indisponível".
 *
 * Esse arquivo é o contrato consumido por `lib/copiloto.ts` (via
 * `import("@/modules/copiloto-accessibility")`) — qualquer mudança de
 * assinatura aqui precisa ser espelhada lá. `SupportedApp` e `CopilotoConfig`
 * abaixo são cópias estruturais dos tipos de mesmo nome em `lib/copiloto.ts`
 * (fonte da verdade) — mantidas em sincronia manualmente porque este módulo
 * não pode importar de `lib/` (limite do pacote local do Expo Module).
 *
 * Ver `android/src/main/java/expo/modules/copilotoaccessibility/CopilotoAccessibilityModule.kt`
 * pro lado nativo e `plugins/withCopilotoAccessibility.js` pro registro do
 * AccessibilityService no AndroidManifest.
 */

export type SupportedApp = "uber" | "99" | "indrive" | "ifood" | "mtentregas";

export type DetectedRide = {
  appOrigem: SupportedApp;
  valor: number;
  distanciaKm: number | null;
  duracaoMin: number | null;
  textoOriginal: string;
};

/** Espelho de `CopilotoConfig` em `lib/copiloto.ts` — ver o comentário acima do arquivo. */
export type CopilotoConfig = {
  enabled: boolean;
  position: "esquerda" | "centro" | "direita";
  design: "tradicional" | "novo";
  colorScheme: "escuro" | "claro";
  showValorKm: boolean;
  showValorHora: boolean;
  showValorMin: boolean;
  showTotais: boolean;
  showParadas: boolean;
  showCustoTotal: boolean;
  showCustoKm: boolean;
  showLucro: boolean;
  displaySeconds: number;
  opacityPct: number;
  fontSize: "pequena" | "media" | "grande";
  stackSimultaneous: boolean;
};

type CopilotoAccessibilityEvents = {
  onRideDetected: (ride: DetectedRide) => void;
};

/**
 * "Modo diagnóstico" — depois de um teste real em aparelho
 * mostrar NENHUM dos 5 apps detectando nada, isso dá visibilidade de dentro do próprio
 * app sobre o que o serviço nativo está realmente vendo, sem precisar de `adb logcat`
 * (que nem sempre está configurado no celular de quem está testando).
 */
export type CopilotoDiagnostics = {
  /** `true` só se o Android de fato ligou o serviço (permissão concedida). */
  serviceRunning: boolean;
  /** Reflete o toggle "Ativar"/"Pausar" da tela — igual a `bothGranted && watching`. */
  watchingEnabled: boolean;
  /** Quantos eventos de troca de tela o serviço viu no total (qualquer app) — se ficar
   * em 0 mesmo usando o celular normalmente, o serviço não está recebendo evento nenhum. */
  totalEventsSeen: number;
  /** Pacote do último app em que um evento foi visto (qualquer um, não só os suportados). */
  lastPackageSeen: string | null;
  /** Quantas vezes um evento bateu com um dos 5 apps suportados. */
  targetEventsSeen: number;
  /** Pacote do último app suportado em que um evento bateu. */
  lastTargetPackage: string | null;
  /** Texto bruto (nós de acessibilidade concatenados) do último app suportado em que
   * ALGUM texto foi capturado — mesmo que o parser não tenha reconhecido como oferta. */
  lastRawText: string | null;
  /** A qual app suportado pertence `lastRawText`. */
  lastRawTextPackage: string | null;
  /** Se o parser daquele app conseguiu reconhecer `lastRawText` como uma oferta de verdade. */
  lastParseSucceeded: boolean | null;
  /**
   * `lastRawText` é sobrescrito por QUALQUER tela seguinte do mesmo
   * app (ex: a tela de navegação depois de aceitar), mesmo sem valor nenhum. Como o card de
   * oferta some da tela em 5-12s, isso apagava a evidência antes de dar pra conferir.
   * Esses três campos só são atualizados quando a tela capturada contém "R$" — ou seja,
   * "gruda" no texto do último card de oferta real visto, e não é apagado por telas sem
   * valor.
   */
  lastOfferLikeText: string | null;
  /** A qual app suportado pertence `lastOfferLikeText`. */
  lastOfferLikeTextPackage: string | null;
  /** Se o parser daquele app reconheceu `lastOfferLikeText` como oferta. */
  lastOfferLikeParseSucceeded: boolean | null;
};

/** Forma do módulo nativo tal como o Kotlin (`CopilotoAccessibilityModule.kt`) o expõe. */
declare class CopilotoAccessibilityNativeModule extends NativeModule<CopilotoAccessibilityEvents> {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<void>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  setOverlayConfig(config: CopilotoConfig): Promise<void>;
  getDiagnostics(): Promise<CopilotoDiagnostics>;
}

/** Forma final exposta pra `lib/copiloto.ts` — igual ao tipo `CopilotoNativeModule` de lá. */
export type CopilotoAccessibilityJsModule = {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<void>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  setOverlayConfig(config: CopilotoConfig): Promise<void>;
  addRideDetectedListener(callback: (ride: DetectedRide) => void): EventSubscription;
  getDiagnostics(): Promise<CopilotoDiagnostics>;
};

const UNAVAILABLE_DIAGNOSTICS: CopilotoDiagnostics = {
  serviceRunning: false,
  watchingEnabled: false,
  totalEventsSeen: 0,
  lastPackageSeen: null,
  targetEventsSeen: 0,
  lastTargetPackage: null,
  lastRawText: null,
  lastRawTextPackage: null,
  lastParseSucceeded: null,
  lastOfferLikeText: null,
  lastOfferLikeTextPackage: null,
  lastOfferLikeParseSucceeded: null,
};

/**
 * Fallback usado no iOS (e em qualquer ambiente sem o módulo nativo linkado):
 * todo método resolve pra um valor neutro, nada lança exceção, nada chama
 * API nativa nenhuma. É assim que "não disponível" se comporta pro resto do
 * app — sem crash, sem promise rejeitada.
 */
function createUnavailableModule(): CopilotoAccessibilityJsModule {
  return {
    async isAccessibilityServiceEnabled() {
      return false;
    },
    async openAccessibilitySettings() {
      // Sem-op no iOS — não existe tela de Acessibilidade equivalente pra esse fim.
    },
    async hasOverlayPermission() {
      return false;
    },
    async requestOverlayPermission() {
      // Sem-op no iOS.
    },
    async startWatching() {
      // Sem-op no iOS.
    },
    async stopWatching() {
      // Sem-op no iOS.
    },
    async setOverlayConfig() {
      // Sem-op no iOS — não existe overlay nativo pra configurar.
    },
    addRideDetectedListener() {
      // Nunca dispara — devolve um `remove` inofensivo pra manter a mesma API.
      return { remove() {} };
    },
    async getDiagnostics() {
      return UNAVAILABLE_DIAGNOSTICS;
    },
  };
}

/** Envolve o módulo nativo cru do Android na forma final da API JS. */
function createAndroidModule(): CopilotoAccessibilityJsModule {
  const native = requireNativeModule<CopilotoAccessibilityNativeModule>("CopilotoAccessibility");
  return {
    isAccessibilityServiceEnabled: () => native.isAccessibilityServiceEnabled(),
    openAccessibilitySettings: () => native.openAccessibilitySettings(),
    hasOverlayPermission: () => native.hasOverlayPermission(),
    requestOverlayPermission: () => native.requestOverlayPermission(),
    startWatching: () => native.startWatching(),
    stopWatching: () => native.stopWatching(),
    setOverlayConfig: (config) => native.setOverlayConfig(config),
    addRideDetectedListener: (callback) => native.addListener("onRideDetected", callback),
    getDiagnostics: () => native.getDiagnostics(),
  };
}

const CopilotoAccessibility: CopilotoAccessibilityJsModule =
  Platform.OS === "android" ? createAndroidModule() : createUnavailableModule();

export default CopilotoAccessibility;
