/* Mis Cuentas — service worker (versión nube)
   Cachea la interfaz para que la app abra rápido y sin conexión.
   Los datos se leen/escriben en Supabase, por lo que las operaciones
   con datos necesitan internet. Sube la versión al cambiar archivos. */
const CACHE = "mis-cuentas-cloud-v3";
const ASSETS = [
  "./", "./index.html", "./app.js", "./config.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // No interceptar las llamadas a la API de Supabase: siempre a la red.
  if (url.hostname.endsWith("supabase.co")) return;
  e.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
