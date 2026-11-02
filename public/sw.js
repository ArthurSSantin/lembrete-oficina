// Service worker: recebe o aviso diário e abre a fila ao tocar.
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || "Lembrete Oficina", {
      body: dados.corpo || "Você tem clientes para chamar hoje.",
      icon: "/icon",
      badge: "/icon",
      tag: "aviso-diario",
      data: { url: dados.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ("focus" in j) {
          j.navigate(destino);
          return j.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
