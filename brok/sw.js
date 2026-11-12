// Brøk Tutor: service worker. Gør appen installerbar og brugbar uden internet.
// Altid nyeste udgave fra nettet først; uden net bruges den gemte kopi. Brøkhjælperen (POST /api/…) røres ikke.
const CACHE = "brok-v2";
const CORE = ["./", "index.html", "app.js", "manifest.json", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("brok-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  const key = req.mode === "navigate" ? "./" : req;
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok && r.type === "basic") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key, { ignoreSearch: true }).then(r => r || Response.error()))
  );
});
