const CACHE_NAME = "jauregui-semana2-offline-v1";
const APP_FILES = [
  "./", "./index.html", "./styles.css", "./script.js", "./manifest.json",
  "./data/canciones.json", "./assets/portada-musica.svg",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => event.request.mode === "navigate"
      ? caches.match("./index.html")
      : new Response("Recurso no disponible sin conexión", {status:503}));
  }));
});