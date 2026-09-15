import { scheduleDailyReminder, cancelReminders } from "@/lib/notifications";

/**
 * Lembretes locais "de bem-estar/rotina" — bem mais leves que os lembretes médicos de
 * Saúde (remédio/consulta, ver `lib/saude.ts`): são avisos genéricos recorrentes todo dia,
 * com mensagem sorteada de um pool por categoria pra não cansar sempre com o mesmo texto.
 *
 * Substitui o antigo "lembrete diário de lançamento" (um único horário fixo) por três
 * categorias intercaladas ao longo do dia. Tudo dentro da janela 7h–22h — nada é agendado
 * de madrugada (22h–7h), por pedido explícito de silêncio nesse período.
 *
 * Atenção: no iOS existe um limite de 64 notificações locais pendentes por app (Android não
 * tem esse teto). Esse conjunto usa ~47 horários (15 "registrar" + 30 "água" + 2 "dentes"),
 * o que deixa pouca folga pra outros lembretes (remédio, consulta, conta a vencer) no iPhone.
 * Se um dia isso apertar, dá pra reduzir a frequência da água (ex: de 30 em 30 pra de hora em
 * hora) sem perder o conceito.
 */

export type WellnessReminderCategory = "registrar" | "agua" | "dentes";

const REGISTRAR_MESSAGES = [
  "Rolou algum gasto ou ganho na última hora? Anota antes que a memória apague 🧾",
  "Hora de fazer as pazes com a carteira: registra o que já rolou até agora 💸",
  "Seu eu do futuro agradece — bora anotar os lançamentos de hoje? 📒",
  "Um minutinho de registro agora = uma vida financeira mais tranquila depois ✨",
  "Não deixa nenhum gasto escapar: dá uma passada rápida no Prumo 📝",
];

const AGUA_MESSAGES = [
  "Um golinho de água agora vai fazer bem 💧",
  "Seu corpo é a maior parte água — reabastece! 🚰",
  "Pausa pra hidratar: bebe um copo d'água 🥤",
  "Lembrete carinhoso: já bebeu água na última meia hora? 🌊",
  "Água agora, disposição depois 💦",
];

const DENTES_MESSAGES = [
  "Sorriso brilhando começa com escovação em dia 🦷✨",
  "Hora de cuidar do sorriso: escova os dentes! 🪥",
  "2 minutinhos de escovação por um sorriso saudável 😁",
  "Seu dentista agradece esse lembrete: escova os dentes 🦷",
  "Antes de seguir o dia, escova os dentes! 🌙🪥",
];

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type ReminderSlot = { time: string; title: string; body: string; category: WellnessReminderCategory };

/** Janela ativa dos lembretes — fora dela (22h–7h) não agenda nada. */
const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 21; // último horário "cheio" agendado é 21h/21h30

/** Monta os horários do dia: "registrar" de hora em hora, "água" de 30 em 30 min, e
 * "escovar os dentes" de manhã e à noite — mensagens sorteadas do pool de cada categoria. */
export function buildWellnessReminderSlots(): ReminderSlot[] {
  const slots: ReminderSlot[] = [];

  const registrarMsgs = shuffled(REGISTRAR_MESSAGES);
  for (let hour = ACTIVE_START_HOUR; hour <= ACTIVE_END_HOUR; hour++) {
    slots.push({
      time: `${pad(hour)}:00`,
      title: "Prumo",
      body: registrarMsgs[(hour - ACTIVE_START_HOUR) % registrarMsgs.length],
      category: "registrar",
    });
  }

  const aguaMsgs = shuffled(AGUA_MESSAGES);
  let aguaIndex = 0;
  for (let hour = ACTIVE_START_HOUR; hour <= ACTIVE_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      slots.push({
        time: `${pad(hour)}:${pad(minute)}`,
        title: "Prumo",
        body: aguaMsgs[aguaIndex % aguaMsgs.length],
        category: "agua",
      });
      aguaIndex++;
    }
  }

  const dentesMsgs = shuffled(DENTES_MESSAGES);
  slots.push({ time: "07:15", title: "Prumo", body: dentesMsgs[0], category: "dentes" });
  slots.push({ time: "21:45", title: "Prumo", body: dentesMsgs[1 % dentesMsgs.length], category: "dentes" });

  return slots;
}

/** Agenda todos os horários — devolve os ids das notificações que deram certo (pra
 * cancelar depois, se a pessoa desativar). Roda em paralelo pra não demorar muito com ~47
 * chamadas. */
export async function scheduleAllWellnessReminders(): Promise<string[]> {
  const slots = buildWellnessReminderSlots();
  const results = await Promise.all(slots.map((slot) => scheduleDailyReminder(slot.time, slot.title, slot.body)));
  return results.filter((id): id is string => id !== null);
}

export async function cancelAllWellnessReminders(ids: Array<string | null | undefined>) {
  await cancelReminders(ids);
}
