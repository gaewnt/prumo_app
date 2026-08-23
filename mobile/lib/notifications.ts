import Constants from "expo-constants";

/**
 * Notificações locais (agendadas no próprio aparelho, sem servidor de push) pra remédios
 * e compromissos.
 *
 * IMPORTANTE — Expo Go no Android (a partir do SDK 53) não sustenta mais o módulo
 * `expo-notifications` de jeito nenhum: mesmo sendo só notificação local (sem push),
 * o simples fato de IMPORTAR a biblioteca já dispara uma tela de erro, porque o próprio
 * módulo tenta se registrar automaticamente pra push assim que é carregado. Por isso o
 * import aqui é sempre dinâmico (`await import(...)`) e só acontece de verdade fora do
 * Expo Go — `isExpoGo` decide isso antes de qualquer `import`. Dentro do Expo Go, todas
 * as funções abaixo silenciosamente não fazem nada (mesmo comportamento de "a notificação
 * falhou, mas nada trava"), e o lembrete de verdade só passa a funcionar quando o app
 * rodar como development build (`npx expo run:android` ou `eas build --profile development`)
 * em vez de Expo Go.
 */

const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

/** Pra UI mostrar um aviso honesto quando o lembrete não vai disparar de verdade neste ambiente. */
export const notificationsSupported = !isExpoGo;

let handlerReady = false;

async function getNotifications() {
  if (isExpoGo) return null;
  const mod = await import("expo-notifications");
  if (!handlerReady) {
    handlerReady = true;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return mod;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return false;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Agenda um lembrete diário repetido num horário "HH:MM" — devolve o id da notificação, ou `null` se falhar. */
export async function scheduleDailyReminder(time: string, title: string, body: string): Promise<string | null> {
  const parsed = parseTime(time);
  if (!parsed) return null;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Agenda um lembrete repetido toda semana num dia+horário específico — usado pro horário de
 * aula (ex: toda terça às 13h50). `weekday` segue a convenção do JS/Postgres (0 = domingo …
 * 6 = sábado); a lib do Expo usa 1 = domingo … 7 = sábado por baixo, a conversão é feita aqui.
 */
export async function scheduleWeeklyReminder(
  weekday: number,
  time: string,
  title: string,
  body: string
): Promise<string | null> {
  const parsed = parseTime(time);
  if (!parsed) return null;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekday + 1,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
  } catch {
    return null;
  }
}

/** Agenda um lembrete único numa data específica (futura) — devolve o id da notificação, ou `null` se falhar/já passou. */
export async function scheduleOneTimeReminder(date: Date, title: string, body: string): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null | undefined) {
  if (!id) return;
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // best-effort — se já não existir mais, não tem problema.
  }
}

export async function cancelReminders(ids: Array<string | null | undefined>) {
  await Promise.all(ids.map((id) => cancelReminder(id)));
}
