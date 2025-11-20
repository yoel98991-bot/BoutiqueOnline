self.addEventListener('push', function(event) {
  // Si llega una notificación sin datos, ponemos un texto por defecto
  const data = event.data ? event.data.json() : { title: 'Nueva Alerta', body: 'Revisa tu panel' };

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041888.png', // Puedes cambiar este icono por el de tu logo
    badge: 'https://cdn-icons-png.flaticon.com/512/1041/1041888.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/' // A donde lleva el clic
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});