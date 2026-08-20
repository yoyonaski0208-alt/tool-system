// =====================================================
// 森清淨工具系統 — Service Worker
// 每次更新時，只需更改 CACHE_NAME 的版本號
// =====================================================
var CACHE_NAME = "senjing-v20260817-03";
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
      return cache.addAll(PRECACHE).catch(function(err){
        // 就算某個檔案快取失敗，也不要讓整個安裝失敗
        console.warn("SW precache 失敗（不影響安裝）：", err);
      });
    })
  );
  // 立即接管，不等舊 SW 結束
  self.skipWaiting();
});

// ── 啟動：刪除舊版本的快取 ──
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

// ── 攔截請求 ──
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return; // 只處理 GET，避免攔截到寫入類請求

  var url = new URL(req.url);

  // 外部網域（Google Sheets / Apps Script / 字型 / CDN…）
  // 用 origin 判斷是不是同網域，比列舉網址字串更嚴謹，
  // 以後多接其他外部服務也不用回來改這裡
  if(url.origin !== self.location.origin){
    e.respondWith(fetch(req).catch(function(){ return caches.match(req); }));
    return;
  }

  // index.html／根目錄：永遠走網路優先，確保拿到最新版本，離線才退回用快取
  if(url.pathname.endsWith("index.html") || url.pathname.endsWith("/")){
    e.respondWith(
      fetch(req, { cache:"no-store" })
        .then(function(res){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
          return res;
        })
        .catch(function(){
          return caches.match(req).then(function(cached){
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // 其他同網域靜態資源（manifest.json、圖示等不常變動的檔案）：
  // 快取優先，同時背景偷偷去要最新版本更新快取，兼顧速度跟資料不過時
  e.respondWith(
    caches.match(req).then(function(cached){
      var fetchPromise = fetch(req).then(function(res){
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, res.clone()); });
        return res;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});

// ── 接收主頁面的訊息（SKIP_WAITING），備用機制 ──
self.addEventListener("message", function(e){
  if(e.data && e.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});
