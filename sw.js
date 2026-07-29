function randDelay(min,max){ return new Promise(r=>setTimeout(r, min+Math.random()*(max-min))); }

class MockSheet {
  constructor(initial){ this.qty = initial; }
}
class MockLock {
  constructor(){ this._locked=false; this._q=[]; }
  async wait(){ if(!this._locked){this._locked=true;return;} return new Promise(res=>{ this._q.push(()=>{this._locked=true;res();}); }); }
  release(){ this._locked=false; const n=this._q.shift(); if(n) n(); }
}

// 舊版：前端算好絕對值，後端直接覆寫（沒有lock內重讀）
async function oldWayOperate(sheet, lock, delta){
  // 模擬：前端先讀一次現有庫存（可能過時）
  await randDelay(3,15);
  var clientSeenQty = sheet.qty; // 前端此刻看到的庫存
  await randDelay(3,15); // 使用者操作到送出之間的時間
  var newQty = clientSeenQty + delta; // 前端自己算好的絕對值
  await lock.wait();
  try{
    await randDelay(3,10);
    sheet.qty = newQty; // 直接覆寫
  } finally { lock.release(); }
}

// 新版：送delta，後端在鎖內重讀現在的值再加
async function newWayOperate(sheet, lock, delta){
  await randDelay(3,15); // 操作到送出的時間（跟前端算不算沒關係了）
  await lock.wait();
  try{
    await randDelay(3,10);
    sheet.qty = sheet.qty + delta; // 鎖內讀現在真正的值再加
    if(sheet.qty<0) sheet.qty=0;
  } finally { lock.release(); }
}

async function runTest(label, operateFn, n, initialQty, deltas){
  const sheet = new MockSheet(initialQty);
  const lock = new MockLock();
  await Promise.all(deltas.slice(0,n).map(d => operateFn(sheet, lock, d)));
  const expected = initialQty + deltas.slice(0,n).reduce((a,b)=>a+b,0);
  const pass = sheet.qty === Math.max(0,expected);
  console.log(`${label} (${n}人同時操作): 預期=${Math.max(0,expected)} 實際=${sheet.qty}  ${pass?"✅":"❌"}`);
  return pass;
}

(async()=>{
  console.log("=== 舊版（前端算絕對值覆寫）===");
  for(let n=2;n<=5;n++){
    await runTest("舊版", oldWayOperate, n, 10, [-2,-1,-3,+5,-1]);
  }
  console.log("\n=== 新版（送delta，後端鎖內重讀）===");
  for(let n=2;n<=5;n++){
    await runTest("新版", newWayOperate, n, 10, [-2,-1,-3,+5,-1]);
  }
})();
