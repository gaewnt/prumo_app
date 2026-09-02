import Constants from "expo-constants";
import { rateRideValue, type RideQuality } from "@/lib/veiculo";

/**
 * Camada do Copiloto — o "leitor de tela" que detecta ofertas de corrida/entrega
 * nos apps suportados (Uber Driver, 99 Motorista, InDrive, Rappi) e calcula o
 * quanto vale por km/hora/minuto, como o card do DSW.
 *
 * A leitura automática da tela depende de um AccessibilityService nativo
 * Android (ver `plugins/withCopilotoAccessibility.js` + `android/.../CopilotoAccessibilityService.kt`)
 * — só existe em builds de verdade (EAS/dev client), nunca no Expo Go. Por
 * isso todo acesso ao módulo nativo passa pelo guard `isExpoGo`, igual ao
 * padrão já usado em `lib/notifications.ts`, `lib/voice-recognition.ts` e
 * `lib/biometric-lock.ts`.
 *
 * Mesmo sem a leitura automática (ou enquanto ela ainda não foi ajustada pro
 * layout real de cada app — ver aviso na tela de Copiloto), a calculadora
 * manual abaixo sempre funciona, em qualquer build.
 */

export const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

export type SupportedApp = "uber" | "99" | "indrive" | "ifood" | "mtentregas";

// Pacotes confirmados via busca (Play Store) — MT Entregas confirmado
// via link direto da ficha na Play Store (play.google.com/store/apps/details?id=...).
export const SUPPORTED_APPS: { id: SupportedApp; nome: string; pacote: string; pacoteConfirmado: boolean }[] = [
  { id: "uber", nome: "Uber Driver", pacote: "com.ubercab.driver", pacoteConfirmado: true },
  { id: "99", nome: "99 Motorista", pacote: "com.app99.driver", pacoteConfirmado: true },
  { id: "indrive", nome: "InDrive", pacote: "sinet.startup.inDriver", pacoteConfirmado: true },
  // "br.com.brainweb.ifood" era o pacote do iFood CONSUMIDOR (pedir
  // comida), não do iFood Entregador — bug real: o Copiloto
  // aparecia mesmo em um pedido de comida (não uma entrega de
  // trabalho). Pacote certo do app de entregador confirmado via URL da própria Play Store.
  { id: "ifood", nome: "iFood Entregador", pacote: "br.com.ifood.driver.app", pacoteConfirmado: true },
  { id: "mtentregas", nome: "MT Entregas", pacote: "br.com.mtentregas.taxi.taximachine", pacoteConfirmado: true },
];

export type CopilotoCardPosition = "esquerda" | "centro" | "direita";
export type CopilotoDesign = "tradicional" | "novo";
export type CopilotoColorScheme = "escuro" | "claro";
export type CopilotoFontSize = "pequena" | "media" | "grande";

export type CopilotoConfig = {
  /** Chave-mestra: se o Copiloto aparece como opção dentro do módulo Veículo. */
  enabled: boolean;
  position: CopilotoCardPosition;
  design: CopilotoDesign;
  colorScheme: CopilotoColorScheme;
  showValorKm: boolean;
  showValorHora: boolean;
  showValorMin: boolean;
  showTotais: boolean;
  showParadas: boolean;
  showCustoTotal: boolean;
  showCustoKm: boolean;
  showLucro: boolean;
  displaySeconds: number; // 1–30
  opacityPct: number; // 0–100
  fontSize: CopilotoFontSize;
  stackSimultaneous: boolean;
};

export const DEFAULT_COPILOTO_CONFIG: CopilotoConfig = {
  enabled: false,
  position: "centro",
  design: "tradicional",
  colorScheme: "escuro",
  showValorKm: true,
  showValorHora: true,
  showValorMin: true,
  showTotais: true,
  showParadas: true,
  showCustoTotal: false,
  showCustoKm: false,
  showLucro: false,
  displaySeconds: 12,
  opacityPct: 100,
  fontSize: "media",
  stackSimultaneous: true,
};

const COPILOTO_MODULE_SLUG = "veiculo-copiloto";

export async function fetchCopilotoConfig(): Promise<CopilotoConfig> {
  const { fetchModulePreference } = await import("@/lib/onboarding");
  const saved = await fetchModulePreference(COPILOTO_MODULE_SLUG);
  return { ...DEFAULT_COPILOTO_CONFIG, ...(saved as Partial<CopilotoConfig>) };
}

export async function saveCopilotoConfig(userId: string, patch: Partial<CopilotoConfig>): Promise<CopilotoConfig> {
  const { updateModulePreferenceField, fetchModulePreference } = await import("@/lib/onboarding");
  await updateModulePreferenceField(userId, COPILOTO_MODULE_SLUG, patch as Record<string, unknown>);
  const saved = await fetchModulePreference(COPILOTO_MODULE_SLUG);
  const merged = { ...DEFAULT_COPILOTO_CONFIG, ...(saved as Partial<CopilotoConfig>) };
  // Melhor esforço: se não tiver módulo nativo (Expo Go, build antiga), a config
  // ainda fica salva no banco — só o overlay em si não reflete a mudança até o
  // próximo build ter o módulo.
  const native = await getNativeModule();
  if (native && typeof native.setOverlayConfig === "function") {
    try {
      await native.setOverlayConfig(merged);
    } catch {
      // melhor esforço — a config já está salva no banco de qualquer forma.
    }
  }
  return merged;
}

export type DetectedRide = {
  appOrigem: SupportedApp; // "uber" | "99" | "indrive" | "ifood" | "mtentregas"
  valor: number;
  distanciaKm: number | null;
  duracaoMin: number | null;
  textoOriginal: string;
};

export type RideCalculation = {
  valor: number;
  distanciaKm: number | null;
  duracaoMin: number | null;
  porKm: number | null;
  porHora: number | null;
  porMin: number | null;
  qualidadeKm: RideQuality | null;
  qualidadeHora: RideQuality | null;
  qualidadeMin: RideQuality | null;
};

/** Calculadora manual — sempre disponível, é a base do card "R$ X, Y km, Z min". */
export function calculateRide(valor: number, distanciaKm: number | null, duracaoMin: number | null): RideCalculation {
  const porKm = distanciaKm && distanciaKm > 0 ? valor / distanciaKm : null;
  const porMin = duracaoMin && duracaoMin > 0 ? valor / duracaoMin : null;
  const porHora = porMin !== null ? porMin * 60 : null;

  return {
    valor,
    distanciaKm,
    duracaoMin,
    porKm,
    porHora,
    porMin,
    qualidadeKm: porKm !== null ? rateRideValue(porKm, "km") : null,
    qualidadeHora: porHora !== null ? rateRideValue(porHora, "hora") : null,
    qualidadeMin: porMin !== null ? rateRideValue(porMin, "min") : null,
  };
}

type CopilotoNativeModule = {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<void>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  addRideDetectedListener(callback: (ride: DetectedRide) => void): { remove: () => void };
  /**
   * Espelha a configuração do card (posição, cores, quais infos mostrar, opacidade,
   * duração, fonte) pra SharedPreferences — o overlay nativo roda independente do JS
   * (a Accessibility Service continua rodando mesmo com o app fechado), então ele lê
   * daqui em vez de esperar uma ponte ativa com o React Native.
   */
  setOverlayConfig(config: CopilotoConfig): Promise<void>;
  getDiagnostics(): Promise<CopilotoDiagnostics>;
};

/** "Modo diagnóstico" — ver comentário em `modules/copiloto-accessibility/index.ts`. */
export type CopilotoDiagnostics = {
  serviceRunning: boolean;
  watchingEnabled: boolean;
  totalEventsSeen: number;
  lastPackageSeen: string | null;
  targetEventsSeen: number;
  lastTargetPackage: string | null;
  lastRawText: string | null;
  lastRawTextPackage: string | null;
  lastParseSucceeded: boolean | null;
  /** Ver comentário em `modules/copiloto-accessibility/index.ts`:
   * só atualiza quando a tela capturada tem "R$", então "gruda" no card de oferta real
   * mesmo depois dele sumir da tela. */
  lastOfferLikeText: string | null;
  lastOfferLikeTextPackage: string | null;
  lastOfferLikeParseSucceeded: boolean | null;
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

let cachedModule: CopilotoNativeModule | null | undefined;

/** Import preguiçoso do módulo nativo — `null` no Expo Go ou se o build ainda não tem o módulo. */
async function getNativeModule(): Promise<CopilotoNativeModule | null> {
  if (isExpoGo) return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    const mod = await import("@/modules/copiloto-accessibility");
    cachedModule = (mod.default ?? mod) as CopilotoNativeModule;
  } catch {
    // Build ainda não tem o módulo nativo linkado (ex: build antiga) — falha graciosamente.
    cachedModule = null;
  }
  return cachedModule;
}

export async function isAutoDetectAvailable(): Promise<boolean> {
  const native = await getNativeModule();
  return native !== null;
}

export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  const native = await getNativeModule();
  if (!native) return false;
  try {
    return await native.isAccessibilityServiceEnabled();
  } catch {
    return false;
  }
}

export async function openAccessibilitySettings(): Promise<void> {
  const native = await getNativeModule();
  await native?.openAccessibilitySettings();
}

export async function hasOverlayPermission(): Promise<boolean> {
  const native = await getNativeModule();
  if (!native) return false;
  try {
    return await native.hasOverlayPermission();
  } catch {
    return false;
  }
}

export async function requestOverlayPermission(): Promise<void> {
  const native = await getNativeModule();
  await native?.requestOverlayPermission();
}

export async function startWatching(): Promise<void> {
  const native = await getNativeModule();
  await native?.startWatching();
}

export async function stopWatching(): Promise<void> {
  const native = await getNativeModule();
  await native?.stopWatching();
}

/** Assina corridas detectadas automaticamente — retorna `null` se a detecção não estiver disponível. */
export async function addRideDetectedListener(
  callback: (ride: DetectedRide) => void
): Promise<{ remove: () => void } | null> {
  const native = await getNativeModule();
  if (!native) return null;
  return native.addRideDetectedListener(callback);
}

/**
 * "Modo diagnóstico" — mostra, de dentro do próprio app, o que o
 * serviço nativo de acessibilidade está de fato vendo (quantos eventos de tela, de qual
 * app, com qual texto bruto), sem precisar de `adb logcat`. Usado na tela do Copiloto
 * quando a detecção automática está ligada mas nada é detectado, pra separar "o serviço
 * não está nem tentando ler a tela" de "está lendo, mas o texto não bate com o parser".
 */
export async function getCopilotoDiagnostics(): Promise<CopilotoDiagnostics> {
  const native = await getNativeModule();
  if (!native) return UNAVAILABLE_DIAGNOSTICS;
  try {
    return await native.getDiagnostics();
  } catch {
    return UNAVAILABLE_DIAGNOSTICS;
  }
}
