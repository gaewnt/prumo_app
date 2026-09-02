// Service worker do Prumo — só cuida de Web Push (mostrar a notificação
// quando o servidor manda uma, e abrir o site ao tocar nela). De propósito bem simples:
// sem cache offline, sem interceptar `fetch` — o objetivo aqui é só fazer o lembrete
// diário funcionar na versão site, não virar um app offline completo.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Prumo", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Prumo";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
