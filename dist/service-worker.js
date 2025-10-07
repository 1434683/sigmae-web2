self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const url = notification.data.url || '/';

    event.notification.close();

    // Este código procura por uma janela/aba do aplicativo já aberta e a foca.
    // Se não encontrar, abre uma nova.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se uma aba já estiver na URL de destino, foque nela.
            for (const client of clientList) {
                // A URL do cliente no HashRouter pode ser algo como ".../#/dashboard"
                const clientPath = new URL(client.url).hash.substring(1); // Pega a parte após o '#'
                if (clientPath === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Se nenhuma aba corresponder exatamente, mas uma aba do app estiver aberta, foque nela.
            if (clientList.length > 0 && 'focus' in clientList[0]) {
                clientList[0].navigate(`/#${url}`);
                return clientList[0].focus();
            }
            // Se nenhuma aba do app estiver aberta, abra uma nova.
            if (clients.openWindow) {
                return clients.openWindow(`/#${url}`);
            }
        })
    );
});
