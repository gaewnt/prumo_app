import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Bloqueio do app por biometria (Face ID / impressão digital) — opcional, ligado em
 * Configurações > Segurança. Mesmo cuidado do `lib/notifications.ts` e do
 * `lib/voice-recognition.ts`: `expo-local-authentication` é nativo e não funciona no
 * Expo Go, então todo import dele é dinâmico e só acontece de verdade fora do Expo Go.
 *
 * IMPORTANTE — por que também excluímos a web aqui: `biometric_lock_enabled` é UMA
 * preferência só, salva na conta (`module_preferences`, slug "app") — a mesma conta que
 * pode abrir tanto pelo app instalado no celular (com sensor) quanto pela versão web num
 * notebook (sem sensor nenhum). Se a pessoa ligar o bloqueio no celular e depois abrir o
 * site num notebook sem leitor de digital/câmera de reconhecimento facial, não existe
 * biometria nenhuma pra confirmar — ficaria trancada pra sempre na tela de bloqueio, sem
 * ESCAPE (a única saída ali é "Sair da conta", que desloga em vez de destrancar). Por
 * isso, na web, o bloqueio nunca é aplicado — não é uma limitação técnica que dê pra
 * ignorar, é a mesma preferência sendo tecnicamente impossível de cumprir nesse ambiente.
 */

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

/** Pra UI avisar quando o bloqueio não pode ser ativado neste ambiente. */
export const biometricLockSupported = !isExpoGo && Platform.OS !== "web";

async function getLocalAuthentication() {
  if (isExpoGo) return null;
  return await import("expo-local-authentication");
}

/** O aparelho tem sensor de biometria E já tem alguma digital/rosto cadastrado nele. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const mod = await getLocalAuthentication();
    if (!mod) return false;
    const hasHardware = await mod.hasHardwareAsync();
    if (!hasHardware) return false;
    return await mod.isEnrolledAsync();
  } catch {
    return false;
  }
}

/** Pede a biometria — devolve `true` só se a pessoa confirmou de verdade. */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const mod = await getLocalAuthentication();
    if (!mod) return false;
    const result = await mod.authenticateAsync({
      promptMessage: "Desbloquear o Prumo",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
