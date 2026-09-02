import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Web Push de verdade — `expo-notifications` (usado no app instalado)
 * não tem NENHUM suporte a navegador, então o lembrete diário simplesmente
 * não disparava na versão site. Aqui é o lado do navegador: pede permissão, registra o
 * service worker (`public/sw.js`, servido na raiz do site) e guarda a "inscrição" push no
 * Supabase — um agendador do lado do servidor (`supabase/functions/send-web-push`, chamado
 * a cada minuto por um pg_cron) decide quando mandar de verdade.
 *
 * Só existe de verdade em `Platform.OS === "web"`, num navegador com suporte a Service
 * Worker + Push API (a maioria dos navegadores modernos — Chrome/Edge/Firefox em qualquer
 * SO, e Safari a partir do iOS 16.4/macOS 13, mas no iPhone/iPad SÓ funciona depois de
 * "Adicionar à Tela de Início" — Safari normal, em aba, não recebe push).
 */

// Chave pública VAPID — não é segredo, pode ficar no código do app; a
// privada mora só nas secrets da Edge Function.
const VAPID_PUBLIC_KEY = "BO_Ax51A1baVXQK0_KCR3A2WxZhILWS8QiVtEX_cpyYeBfnlIR98fVLEYy38lwYC4Pv1ZYmfnOr22Pe6m7lrbNg";

export const webPushSupported =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Corrida contra um timeout — resolve `null` se `promise` não terminar em `ms`.
 * Usado especificamente em volta de `Notification.requestPermission()`: o Chrome às
 * vezes não mostra um popup, só um ícone discreto do lado da barra de endereço, e essa
 * promise só resolve quando a pessoa clica nele — sem timeout, o botão ficava girando
 * pra sempre se a pessoa não percebesse o ícone. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export type SubscribeWebPushResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "timeout" | "error" };

/** Pede permissão, registra o service worker e guarda a inscrição no Supabase. Devolve
 * `{ ok: false, reason }` (nunca lança) se qualquer passo falhar — mesmo espírito
 * "melhor esforço" já usado em `lib/notifications.ts` pro app nativo, mas com motivo
 * pra dar um retorno útil na tela em vez de só "não deu". */
export async function subscribeWebPush(userId: string): Promise<SubscribeWebPushResult> {
  if (!webPushSupported) return { ok: false, reason: "unsupported" };
  try {
    const permission = await withTimeout((window as any).Notification.requestPermission(), 20000);
    if (permission === null) return { ok: false, reason: "timeout" };
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const pushManager = (registration as any).pushManager;
    const existing = await pushManager.getSubscription();
    const subscription =
      existing ??
      (await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { ok: false, reason: "error" };
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      { onConflict: "endpoint" }
    );
    return error ? { ok: false, reason: "error" } : { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Cancela a inscrição deste navegador (best-effort — se falhar, não trava nada). */
export async function unsubscribeWebPush(): Promise<void> {
  if (!webPushSupported) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const pushManager = (registration as any)?.pushManager;
    const subscription = await pushManager?.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint as string;
      await subscription.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  } catch {
    // best-effort — se já não existir mais, não tem problema.
  }
}
