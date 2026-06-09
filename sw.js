var CACHE_NAME = 'sencingjing-tools-v1';
var urlsToCache = [
  '/tool-system/',
  '/tool-system/index.html'
];

// 安裝
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(urlsToCache);
    })
  );
});

// 攔截請求
self.addEventListener('fetch', function(e){
  e.respondWith(
    caches.match(e.request).then(function(response){
      // 有快取就用快取，沒有就去網路抓
      if(response) return response;
      return fetch(e.request).then(function(response){
        // 只快取同源的請求
        if(!response||response.status!==200||response.type!=="basic"){
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, responseToCache);
        });
        return response;
      });
    })
  );
});

// 更新時清除舊快取
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){
          return name !== CACHE_NAME;
        }).map(function(name){
          return caches.delete(name);
        })
      );
    })
  );
});
