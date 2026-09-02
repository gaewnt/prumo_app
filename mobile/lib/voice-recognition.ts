import Constants from "expo-constants";

/**
 * Reconhecimento de voz (fala → texto), usado no "lançar despesa por voz". Mesmo cuidado do
 * `lib/notifications.ts`: o pacote nativo `expo-speech-recognition`
 * não funciona no Expo Go, então todo import dele é dinâmico e só acontece de verdade fora
 * do Expo Go — `isExpoGo` decide isso antes de qualquer `import`. A tela que usa isso
 * (`lancar-por-voz.tsx`) só importa ESTE arquivo, nunca o pacote nativo direto, pra ficar
 * seguro mesmo se o app for aberto pelo Expo Go de novo no futuro.
 *
 * Evitamos de propósito o hook `useSpeechRecognitionEvent` da lib (ele exigiria um import
 * estático do pacote lá no topo do arquivo da tela) e usamos a API imperativa
 * (`addListener`) por baixo, chamada de dentro de um `useEffect` — assim o import continua
 * 100% dinâmico, do mesmo jeito que as notificações.
 */

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

/** Pra UI mostrar um aviso honesto quando o reconhecimento de voz não roda neste ambiente. */
export const voiceCommandsSupported = !isExpoGo;

async function getSpeechRecognition() {
  if (isExpoGo) return null;
  return await import("expo-speech-recognition");
}

export async function ensureVoicePermission(): Promise<boolean> {
  try {
    const mod = await getSpeechRecognition();
    if (!mod) return false;
    const result = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export type VoiceListenerHandlers = {
  /** Chamado a cada trecho reconhecido — `isFinal` indica se é o resultado definitivo. */
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
};

/**
 * Começa a escutar. Devolve uma função de limpeza (chamar no cleanup do `useEffect`, ou
 * quando a pessoa cancela manualmente) que para o reconhecimento e remove os listeners —
 * ou `null` se não deu pra começar (Expo Go / permissão negada / erro), caso em que
 * `handlers.onError` já é chamado com o motivo.
 */
export async function startListening(handlers: VoiceListenerHandlers): Promise<(() => void) | null> {
  try {
    const mod = await getSpeechRecognition();
    if (!mod) {
      handlers.onError("Reconhecimento de voz não funciona neste modo do app (Expo Go) — precisa do build instalado.");
      return null;
    }

    const granted = await ensureVoicePermission();
    if (!granted) {
      handlers.onError("Permissão de microfone/voz negada. Ative em Configurações do celular pra esse app.");
      return null;
    }

    const resultSub = mod.ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
      const transcript = event?.results?.[0]?.transcript ?? "";
      handlers.onResult(transcript, !!event?.isFinal);
    });
    const endSub = mod.ExpoSpeechRecognitionModule.addListener("end", () => {
      handlers.onEnd();
    });
    const errorSub = mod.ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
      handlers.onError(event?.message ?? "Não consegui entender — tenta de novo.");
    });

    mod.ExpoSpeechRecognitionModule.start({ lang: "pt-BR", interimResults: true, continuous: false });

    return () => {
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
      try {
        mod.ExpoSpeechRecognitionModule.stop();
      } catch {
        // best-effort — se já tiver parado sozinho, não tem problema.
      }
    };
  } catch {
    handlers.onError("Não consegui iniciar o reconhecimento de voz.");
    return null;
  }
}
