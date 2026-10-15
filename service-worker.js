const CACHE = "marine-nav-shell-v1";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./assets/icon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  // Cache only this app's shell. Do not cache third-party map tiles: providers' terms and
  // tile availability may restrict offline storage. Map imagery/charts need a licensed offline source.
  if (url.origin === self.location.origin && event.request.method === "GET") {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
    }).catch(() => caches.match("./index.html"))));
  }
});