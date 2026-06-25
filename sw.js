// =====================================================
// 森清淨工具系統 — Service Worker
// 每次更新時，只需更改 CACHE_NAME 的版本號
// =====================================================
var CACHE_NAME = "senjing-v20260625-03";

// 需要快取的靜態資源
var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// ── 安裝：快取靜態資源 ──
self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE);
    })
  );
  // 立即接管，不等舊 SW 結束
  self.skipWaiting();
});

// ── 啟動：刪除舊快取 ──
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// ── 攔截請求：網路優先，失敗才用快取 ──
self.addEventListener("fetch", function(e){
  var req = e.request;

  // Google Sheets / Apps Script / 外部字型 → 直接走網路，不快取
  if(req.url.indexOf("google") > -1 ||
     req.url.indexOf("script.google") > -1 ||
     req.url.indexOf("fonts.googleapis") > -1 ||
     req.url.indexOf("fonts.gstatic") > -1 ||
     req.url.indexOf("cdn.jsdelivr") > -1){
    e.respondWith(fetch(req).catch(function(){ return caches.match(req); }));
    return;
  }

  // index.html：永遠走網路（確保拿到最新版），失敗才用快取
  if(req.url.indexOf("index.html") > -1 || req.url.endsWith("/")){
    e.respondWith(
      fetch(req, { cache:"no-store" })
        .then(function(res){
          // 成功：同時更新快取
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
          return res;
        })
        .catch(function(){
          return caches.match(req);
        })
    );
    return;
  }

  // 其他資源：快取優先，背景更新
  e.respondWith(
    caches.match(req).then(function(cached){
      var fetchPromise = fetch(req).then(function(res){
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, res.clone()); });
        return res;
      });
      return cached || fetchPromise;
    })
  );
});

// ── 接收主頁面的訊息（SKIP_WAITING） ──
self.addEventListener("message", function(e){
  if(e.data && e.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});
