// Brøk Tutor: service worker, kun så appen kan installeres. Intet gemmes offline.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
