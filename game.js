/* game.js - Webzombite */
(function () {
  'use strict';
  var WZ = window.WZ, ITEMS = WZ.ITEMS, ZDEF = WZ.ZOMBIES, ZTYPES = WZ.ZTYPE_LIST, C = window.WZ_CONFIG || {};
  var Net = WZ.Net, THREE = window.THREE, MAX_PLAYERS = C.maxPlayers || 4;
  var SFX = WZ.Sound || { unlock: function () {}, play: function () {}, setNight: function () {}, toggleMute: function () { return false; }, isMuted: function () { return false; } };
  var DAY_LEN = 1440, START_HOUR = 7; /* 24 real minutes per in-game day */

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd() { return Math.random(); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function clockInfo(t) {
    var tot = START_HOUR + (t / DAY_LEN) * 24, day = Math.floor(tot / 24) + 1, h = ((tot % 24) + 24) % 24;
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    var fase = h >= 5.5 && h < 10.5 ? 'Morning' : h >= 10.5 && h < 15.5 ? 'Noon' : h >= 15.5 && h < 18.8 ? 'Afternoon' : 'Night';
    return { day: day, hour: h, str: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, fase: fase, night: fase === 'Night' };
  }

  var scene, camera, renderer, W, torch = null, torchOn = false, autoTorchDone = false;
  var P = { x: -32, y: 0, z: 32, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, onGround: false, hp: 100, hunger: 100, thirst: 100, energy: 100, comfort: 100 };
  var inv = {}, hot = [null, null, null, null, null, null, null, null], sel = 0;
  var equip = { head: null, chest: null, legs: null, boots: null };
  var T = 0, kills = 0, dead = false, rest = null, status = freshStatus();
  var coins = 0, kc = {}, bf = [0, 0], baseSeed = 20261116, epoch = 0, bloodOn = false, bmAnn = -1, bossT = 2, dorm = { n: 0, t: 0 }, ugCd = 0, ugOn = false;
  var gfx = loadGfx(), chunkT = 0, waterT = 0, cubeCam = null, fogObj = null, lastBiome = 'city';
  var zombies = [], zMap = Object.create(null), nextZid = 1;
  var keys = {}, lmb = false, swingCd = 0, eatT = 0, spawnT = 3, stepT = 0, groanT = 4, voxVer = 0, cache = { ver: -1, list: [] };
  var mode = 'boot', selItem = null, lastHud = 0, respawnCheck = 0, fallbackLook = false, playerName = 'Survivor';

  function freshStatus() { return { poison: 0, stomach: 0, wpoison: 0, keylock: 0, acid: 0, acidN: 0 }; }
  var acc = [null, null, null, null], corpses = [], cooking = [], fish = null, bobber = null, tracers = [], virus = [], mineT = 5, sb = null, userId = null, userName = '', fpsAcc = 0, fpsN = 0, fpsVal = 0, dbgOn = false;
  var mp = { role: 'solo', room: '', slot: 0, online: false, peers: Object.create(null), lastHostSeen: 0, lastPoseSent: 0, lastZSent: 0, swingPulse: 0, joinTimer: null };
  var SLOT_COLS = [0xe3b02a, 0x3b82f6, 0x22c55e, 0xec4899], SLOT_HEX = ['#e3b02a', '#3b82f6', '#22c55e', '#ec4899'];

  function armorStats() {
    var def = 0, woodN = 0, ironN = 0, copN = 0, goldN = 0, bucket = false, slots = ['head', 'chest', 'legs', 'boots'];
    for (var i = 0; i < slots.length; i++) {
      var it = ITEMS[equip[slots[i]]];
      if (!it || it.type !== 'armor') continue;
      def += it.def || 0;
      if (it.tier === 'wood') woodN++; else if (it.tier === 'iron') ironN++; else if (it.tier === 'copper') copN++; else if (it.tier === 'golden') goldN++; else if (it.tier === 'bucket') bucket = true;
    }
    return { def: def, woodN: woodN, ironN: ironN, bucket: bucket, spdBonus: 1 + woodN * 0.03 + goldN * 0.03, energyDrain: 1 - woodN * 0.06, comfortDrain: 1 - woodN * 0.06, hpMax: 100 + ironN * 5 + copN * 3, dmgMult: 1 + ironN * 0.06 + copN * 0.03 + goldN * 0.04, poisonResist: 1, wpResist: bucket ? 0.5 : 1 };
  }
  function accStats() {
    var o = { watch: 0, radar: false, gps: false };
    for (var i = 0; i < acc.length; i++) { var id = acc[i]; if (id === 'iron_watch') o.watch = Math.max(o.watch, 1); else if (id === 'golden_watch') o.watch = 2; else if (id === 'radar') o.radar = true; else if (id === 'gps') o.gps = true; }
    return o;
  }

  /* ---------------- Save & load code ---------------- */
  /* ---- helpers: tiers, blood moon, seeds, graphics ---- */
  function worldTier(day) { var t = 1; for (var i = 0; i < WZ.TIER_DAYS.length; i++) if (day >= WZ.TIER_DAYS[i]) t = i + 1; return t; }
  function hash32(a) { a = Math.imul(a ^ (a >>> 16), 0x85ebca6b); a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35); return (a ^ (a >>> 16)) >>> 0; }
  function bloodFlag(night) { if (night < 1) return false; var pc = WZ.BLOOD[Math.min(worldTier(night), 10) - 1]; if (!pc) return false; return (hash32((baseSeed | 0) ^ Math.imul(night, 0x9e3779b1)) % 10000) / 100 < pc; }
  function curSeed(base, ep) { return ep <= 0 ? base : (hash32((base | 0) ^ Math.imul(ep, 0x7f4a7c15)) || 1); }
  function epochOf(t) { return Math.floor((clockInfo(t).day - 1) / 10); }
  function newWorld(seed) { W.resetWorld(seed); baseSeed = W.seed; epoch = 0; bf = [0, 0]; }
  function GFXD() { return { rd: 12, ed: 8, fog: true, shadow: true, smap: true, godray: false, water: true, cull: true }; }
  function loadGfx() {
    var g = GFXD(), GFX_DEF = g; try { var q = JSON.parse(localStorage.getItem('wz_gfx') || 'null'); if (q) { ['rd', 'ed'].forEach(function (k) { if (typeof q[k] === 'number' && q[k] >= 2) g[k] = q[k] >= 9999 ? 9999 : Math.min(100, Math.round(q[k])); }); ['fog', 'shadow', 'smap', 'godray', 'water', 'cull'].forEach(function (k) { if (typeof q[k] === 'boolean') g[k] = q[k]; }); } } catch (e) {}
    return g;
  }
  function saveGfx() { try { localStorage.setItem('wz_gfx', JSON.stringify(gfx)); } catch (e) {} }
  function rdMeters() { return gfx.rd >= 9999 ? 1e9 : gfx.rd * 20; }
  function edMeters() { return gfx.ed >= 9999 ? 1e9 : gfx.ed * 20; }
  function entVisible(x, z) {
    var dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > rdMeters() + 10) return false;
    if (gfx.cull && (dx * -Math.sin(P.yaw) + dz * -Math.cos(P.yaw)) < -20) return false; return true; /* 1 chunk of slack */
  }

  /* ---- save codes ---- */
  var te = new TextEncoder(), td = new TextDecoder();
  function b64e(bytes) {
    var bin = ''; for (var i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(str) {
    var q = str.replace(/-/g, '+').replace(/_/g, '/'); while (q.length % 4) q += '=';
    var bin = atob(q), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  function snapshot(worldOnly) {
    if (cache.ver !== voxVer) { cache.list = W.voxList(); cache.ver = voxVer; }
    var o = { v: 3, sd: baseSeed, t: Math.round(T * 10) / 10, b: cache.list, tr: [], rk: [], pl: [], cr: [], cs: [], bf: bf.slice(), tu: [] };
    W.turrets.forEach(function (e) { if (e.alive && e.ammo > 0) o.tu.push([e.vx, e.vy, e.vz, e.ammo]); });
    W.trees.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.tr.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.rocks.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.rk.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.piles.forEach(function (p, i) { if (p.searched) o.pl.push([i, Math.round(p.respawn)]); });
    W.crates.forEach(function (p, i) { if (p.searched) o.cr.push([i, Math.round(p.respawn)]); });
    W.cars.forEach(function (c, i) { if (!c.alive || c.hp < c.max) o.cs.push([i, Math.round(c.hp)]); });
    if (!worldOnly) {
      o.k = kills; o.cn = coins; o.kc = kc; o.p = [r2(P.x), r2(P.y), r2(P.z), Math.round(P.yaw * 1000) / 1000, Math.round(P.pitch * 1000) / 1000];
      o.s = [Math.round(P.hp), Math.round(P.hunger), Math.round(P.thirst), Math.round(P.energy), Math.round(P.comfort), Math.round(status.poison * 10) / 10, Math.round(status.stomach * 10) / 10, Math.round(status.wpoison * 10) / 10];
      o.i = inv; o.h = hot; o.l = sel; o.eq = equip; o.ac = acc; o.co = corpses.filter(function (c) { return c.mine; }).map(function (c) { return [r2(c.x), r2(c.z), c.loot]; });
    }
    return o;
  }
  /* WZL2 = AES-GCM(PBKDF2(password)) + account id bound inside the encrypted payload (a save can only be loaded by the same account with the right password) */
  function accountId() { return userId || 'guest'; }
  function pwKey(pw, salt) {
    return crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function encodeSaveCode(pw) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('Encryption is not available in this browser.'));
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), snap = snapshot(false); snap.u = accountId();
    return pwKey(pw, salt).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, te.encode(JSON.stringify(snap))); }).then(function (ct) {
      var c = new Uint8Array(ct), all = new Uint8Array(28 + c.length); all.set(salt, 0); all.set(iv, 16); all.set(c, 28); return 'WZL2:' + b64e(all);
    });
  }
  function decodeSaveCode(raw, pw) {
    var q = String(raw || '').trim().replace(/\s+/g, '');
    if (q.indexOf('WZL1:') === 0) return Promise.resolve({ err: 'This is an old WZL1 code from the 500 m map. Old codes cannot be loaded into the 2000 m world.' });
    if (q.indexOf('WZL2:') !== 0) return Promise.resolve({ err: 'Wrong format. A save code must start with "WZL2:".' });
    if (!pw) return Promise.resolve({ err: 'Enter the security password of this save code.' });
    var bytes; try { bytes = b64d(q.slice(5)); } catch (e) { return Promise.resolve({ err: 'The save code is damaged or incomplete.' }); }
    if (bytes.length < 45) return Promise.resolve({ err: 'The save code is damaged or incomplete.' });
    return pwKey(pw, bytes.subarray(0, 16)).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(16, 28) }, k, bytes.subarray(28)); }).then(function (pt) {
      var obj = JSON.parse(td.decode(pt));
      if (!obj || obj.v !== 3 || !Array.isArray(obj.p) || typeof obj.i !== 'object') return { err: 'The save code structure is not recognized.' };
      if (obj.u !== accountId()) return { err: 'This save code belongs to a different account and cannot be loaded here.' };
      return { data: obj };
    }, function () { return { err: 'Wrong password, or the code was changed / damaged.' }; });
  }
  function applySave(s, worldOnly) {
    if (!s || s.v !== 3) return false;
    baseSeed = s.sd != null ? s.sd : 20261116; T = s.t || 0; epoch = epochOf(T); W.resetWorld(curSeed(baseSeed, epoch)); W.voxLoad(s.b || [], 3); voxVer++; (s.tu || []).forEach(function (a) { var te = turretAt(a[0], a[1], a[2]); if (te) te.ammo = a[3] | 0; });
    bf = Array.isArray(s.bf) ? [s.bf[0] | 0, s.bf[1] | 0] : [0, 0];
    (s.tr || []).forEach(function (a) { var t = W.trees[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setTree(t, false); });
    (s.rk || []).forEach(function (a) { var t = W.rocks[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setRock(t, false); });
    (s.pl || []).forEach(function (a) { var p = W.piles[a[0]]; if (p) { W.setPile(p, false); p.respawn = a[1]; } });
    (s.cr || []).forEach(function (a) { var p = W.crates[a[0]]; if (p) { W.setCrate(p, false); p.respawn = a[1]; } });
    (s.cs || []).forEach(function (a) { var c = W.cars[a[0]]; if (!c) return; c.hp = a[1]; if (c.hp <= 0) W.setCar(c, false); });
    if (!worldOnly) {
      kills = s.k || 0; coins = s.cn || 0; kc = s.kc && typeof s.kc === 'object' ? s.kc : {};
      P.x = clamp(s.p[0] || -32, -W.half + 1, W.ug.x1 - 7); P.y = Math.max(0, s.p[1] || 0); P.z = clamp(s.p[2] || 32, -W.half + 1, W.half - 1); if (inUG(P.x)) { P.z = clamp(s.p[2], W.ug.z0 + 7, W.ug.z1 - 7); ugOn = true; W.setUnderground(true); torchOn = true; } else { ugOn = false; W.setUnderground(false); }
      P.vx = P.vz = P.vy = 0; P.yaw = s.p[3] || 0; P.pitch = clamp(s.p[4] || 0, -1.5, 1.5);
      equip = { head: null, chest: null, legs: null, boots: null };
      if (s.eq) { ['head', 'chest', 'legs', 'boots'].forEach(function (sl) { var id = s.eq[sl]; if (id && ITEMS[id] && ITEMS[id].slot === sl) equip[sl] = id; }); }
      var mxHp = armorStats().hpMax;
      if (Array.isArray(s.s)) {
        P.hp = s.s[0] > 0 ? clamp(s.s[0], 1, mxHp) : mxHp; P.hunger = clamp(s.s[1] != null ? s.s[1] : 100, 0, 100);
        P.thirst = clamp(s.s[2] != null ? s.s[2] : 100, 0, 100); P.energy = clamp(s.s[3] != null ? s.s[3] : 100, 0, 100);
        P.comfort = clamp(s.s[4] != null ? s.s[4] : 100, 0, 100); status = freshStatus(); status.poison = s.s[5] || 0; status.stomach = s.s[6] || 0; status.wpoison = s.s[7] || 0;
      }
      inv = {}; for (var k in (s.i || {})) if (ITEMS[k] && s.i[k] > 0) inv[k] = s.i[k];
      acc = [null, null, null, null]; (s.ac || []).slice(0, 4).forEach(function (id, i) { if (id && ITEMS[id] && ITEMS[id].type === 'acc') acc[i] = id; });
      clearCorpses(); (s.co || []).forEach(function (c) { if (c && c[2]) addCorpse(c[0], c[1], c[2], true, playerName); });
      hot = (s.h || []).concat([null, null, null, null, null, null, null, null]).slice(0, 8);
      sel = clamp(s.l || 0, 0, 7); dead = false; rest = null; $('#dark').style.opacity = 0;
    }
    return true;
  }

  function placeAtSpawn(slotIdx) {
    var off = slotIdx || 0; P.x = W.spawn.x + (off % 2) * 1.4; P.z = W.spawn.z + Math.floor(off / 2) * 1.4;
    P.y = 0; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.pitch = 0; ugOn = false; if (W.setUnderground) { W.setUnderground(false); }
    while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1;
  }
  function newPlayerState(slotIdx) {
    inv = { rusty_axe: 1, rusty_pickaxe: 1, plastic_bottled_water: 1 };
    hot = [null, 'rusty_axe', 'rusty_pickaxe', 'plastic_bottled_water', null, null, null, null]; sel = 1;
    equip = { head: null, chest: null, legs: null, boots: null }; acc = [null, null, null, null]; clearCorpses(); cooking = []; heatQ = []; burn.left = 0; heatGot = 0; manning = null; mg = null; endFish();
    P.hp = P.hunger = P.thirst = P.energy = P.comfort = 100; status = freshStatus(); kills = 0; dead = false; rest = null;
    $('#dark').style.opacity = 0; placeAtSpawn(slotIdx || 0);
  }
  function clearZombies() { zombies.forEach(function (z) { scene.remove(z.g); }); zombies.length = 0; dorm.n = 0; zMap = Object.create(null); }

  function count(id) { return inv[id] || 0; }
  function slotCap() { return WZ.BAG_SLOTS + (count('wood_plank_basket') > 0 ? 6 : 0); }
  function slotsUsed() { var n = 0; Object.keys(inv).forEach(function (id) { if (inv[id] > 0 && ITEMS[id] && !ITEMS[id].pack) n += Math.ceil(inv[id] / WZ.maxStack(id)); }); return n; }
  function dropBag(id, n, name) {
    var near = null; corpses.forEach(function (c) { if (c.name === (name || 'Dropped Items') && Math.hypot(c.x - P.x, c.z - P.z) < 1.5) near = c; });
    if (near) { near.loot.inv[id] = (near.loot.inv[id] || 0) + n; return; }
    var L = { inv: {}, eq: [], ac: [] }; L.inv[id] = n; addCorpse(P.x, P.z, L, true, name || 'Dropped Items');
  }
  function give(id, n) {
    if (!ITEMS[id] || !n) return; var it = ITEMS[id], cur = inv[id] || 0, ok = n;
    if (!it.pack) { var st = WZ.maxStack(id), free = slotCap() - slotsUsed(), cs = Math.ceil(cur / st); ok = Math.max(0, Math.min(n, (cs + free) * st - cur)); }
    if (ok < n) { dropBag(id, n - ok); say('Bag full! ' + (n - ok) + ' x ' + it.name + ' dropped on the ground. Pick it up with [E].', true); }
    if (ok <= 0) return; inv[id] = cur + ok;
    if (it && it.type !== 'material' && it.type !== 'armor' && it.type !== 'acc' && hot.indexOf(id) < 0) { for (var i = 1; i < 8; i++) if (!hot[i]) { hot[i] = id; break; } }
    renderHotbar();
  }
  function take(id, n) {
    inv[id] = (inv[id] || 0) - n;
    if (inv[id] <= 0) { delete inv[id]; for (var i = 1; i < 8; i++) if (hot[i] === id) hot[i] = null; }
    renderHotbar();
  }
  function curItem() { return ITEMS[hot[sel] || 'fists']; }
  function say(t, bad) {
    var f = $('#feed'); if (!f) return; var d = document.createElement('div'); d.textContent = t; if (bad) d.className = 'bad';
    f.appendChild(d); while (f.children.length > 5) f.removeChild(f.firstChild);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4200);
  }

  /* ---------------- Input & controls ---------------- */
  function inputDelay() { return P.comfort <= 0 ? 0.1 : P.comfort <= 30 ? 0.05 : 0; }
  function speedMult() { return (P.comfort <= 0 ? 0.98 : P.comfort <= 30 ? 0.99 : 1) * armorStats().spdBonus; }
  var queue = [];
  function push(ev) { var d = inputDelay(); if (d <= 0 && !queue.length) applyEv(ev); else { ev.t = performance.now() + d * 1000; queue.push(ev); } }
  function drain() { var n = performance.now(); while (queue.length && queue[0].t <= n) applyEv(queue.shift()); }
  function applyEv(e) {
    if (e.type === 'key' && status.keylock > 0 && e.down) { keys[e.code] = false; return; }
    if (mode !== 'play') { if (e.type === 'key' && !e.down) keys[e.code] = false; if (e.type === 'btn' && !e.down) lmb = false; return; }
    if (e.type === 'key') {
      keys[e.code] = e.down;
      if (e.down) {
        if (/^Digit[1-8]$/.test(e.code)) { sel = +e.code.slice(5) - 1; eatT = 0; SFX.play('click'); renderHotbar(); }
        else if (e.code === 'KeyE') interact();
        else if (e.code === 'KeyF') { torchOn = !torchOn; SFX.play('click'); say(torchOn ? 'Flashlight on.' : 'Flashlight off.'); }
        else if (e.code === 'KeyM') { var mt = SFX.toggleMute(); say(mt ? 'Sound muted (M).' : 'Sound on (M).'); }
      }
    } else if (e.type === 'mouse') {
      P.yaw -= e.dx * 0.0022; P.pitch = clamp(P.pitch - e.dy * 0.0022, -1.5, 1.5);
    } else if (e.type === 'btn') {
      if (e.b === 0) { lmb = e.down; if (!e.down) eatT = 0; } else if (e.b === 2 && e.down) placeBlock();
    } else if (e.type === 'wheel') {
      sel = (sel + (e.d > 0 ? 1 : 7)) % 8; eatT = 0; renderHotbar();
    }
  }
  window.addEventListener('keydown', function (e) {
    SFX.unlock();
    if (e.code === 'Backquote') { e.preventDefault(); if (!e.repeat) toggleDebug(); return; }
    if (status.keylock > 0 && e.code !== 'KeyP') { e.preventDefault(); return; }
    if (e.code === 'Tab' || e.code === 'KeyI') {
      if (mode === 'play' || mode === 'inv') { e.preventDefault(); if (!e.repeat) { if (mode === 'play') openInv(); else closeInv(); } }
      return;
    }
    if (e.code === 'KeyP' && mode === 'play' && !e.repeat) { showPause(); return; }
    if (mode !== 'play') return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (!e.repeat) push({ type: 'key', code: e.code, down: true });
  });
  window.addEventListener('keyup', function (e) { if (mode === 'play') push({ type: 'key', code: e.code, down: false }); else keys[e.code] = false; });
  document.addEventListener('mousemove', function (e) { if (mode === 'play' && (document.pointerLockElement || (fallbackLook && e.buttons === 4))) push({ type: 'mouse', dx: e.movementX || 0, dy: e.movementY || 0 }); });
  document.addEventListener('mousedown', function (e) {
    SFX.unlock();
    if (mode !== 'play' || (e.target && e.target.closest && e.target.closest('#altHint'))) return;
    if ((document.pointerLockElement || fallbackLook) && (e.button === 0 || e.button === 2)) { e.preventDefault(); push({ type: 'btn', b: e.button, down: true }); }
  });
  document.addEventListener('mouseup', function (e) { if (mode === 'play') push({ type: 'btn', b: e.button, down: false }); else lmb = false; });
  document.addEventListener('wheel', function (e) { if (mode === 'play') push({ type: 'wheel', d: e.deltaY }); }, { passive: true });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function lock(onFail) {
    SFX.unlock();
    try { var p = $('#gl').requestPointerLock(); if (p && p.catch) p.catch(function () { if (onFail) enableFallbackLook(); }); }
    catch (e) { if (onFail) enableFallbackLook(); }
  }
  function enableFallbackLook() {
    fallbackLook = true; mode = 'play'; $('#screen').hidden = true; $('#inv').hidden = true; $('#hud').hidden = false; $('#altHint').classList.add('on');
  }
  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement) {
      fallbackLook = false; $('#altHint').classList.remove('on');
      if (mode === 'pause' || mode === 'ready') { mode = 'play'; $('#screen').hidden = true; $('#inv').hidden = true; $('#hud').hidden = false; }
      return;
    }
    if (mode === 'play' && !fallbackLook) showPause();
  });
  document.addEventListener('pointerlockerror', function () { if (mode === 'ready' || mode === 'pause') enableFallbackLook(); });
  function screen(html) { var s = $('#screen'); s.innerHTML = html; s.hidden = false; }
  function controlsHtml() {
    return '<div class="keys"><b>W A S D</b><span>Move</span><b>Shift</b><span>Sprint</span><b>Space</b><span>Jump</span>' +
      '<b>Left Click</b><span>Attack / chop / dismantle / shoot / cast / use medical</span><b>Right Click</b><span>Place blocks &amp; furniture</span><b>E</b><span>Loot, corpse, bed, couch, furnace, sink, campfire, workbenches</span>' +
      '<b>F / M</b><span>Flashlight / Mute</span><b>1-8 / Scroll</b><span>Hotbar</span><b>Tab / I</b><span>Bag, Gear &amp; Crafting</span><b>Esc / P</b><span>Pause &amp; Save Code</span><b>`</b><span>Debug panel</span></div>';
  }

  /* ---------------- Main menu & multiplayer ---------------- */
  function totalPlayers() { return 1 + Object.keys(mp.peers).length; }
  function playerListHtml() {
    var arr = ['<span style="border-color:' + SLOT_HEX[mp.slot] + '">● ' + esc(playerName) + (mp.role === 'host' ? ' (Host)' : '') + '</span>'];
    for (var pid in mp.peers) { var pr = mp.peers[pid]; arr.push('<span style="border-color:' + SLOT_HEX[pr.slot % 4] + '">● ' + esc(pr.name) + (pr.slot === 0 ? ' (Host)' : '') + '</span>'); }
    return '<div class="plist">' + arr.join('') + '</div>';
  }
  function showMainMenu(errMsg) {
    mode = 'menu'; keys = {}; lmb = false; eatT = 0; queue.length = 0; $('#hud').hidden = true; $('#inv').hidden = true; $('#eat').style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    screen('<div class="card"><span class="tag">Under Development &middot; Beta</span><h1><b>Webzombite</b></h1>' +
      '<p>Survive in the ruins of XKing City, a 2000 m &times; 2000 m map with four biomes (City, Desert City, Jungle Village, Snow City) and a Morning–Noon–Afternoon–Night cycle. Chop trees, mine rocks, fish, craft gear and build a base for up to 4 players.</p>' +
      '<div class="warn-note">Progress only lasts for this session and is <b>erased when the tab closes</b>. Use <b>Save Code &amp; Load</b> (or Cloud Save) to keep your world safe!</div>' +
      '<div class="box-sub"><div class="row" style="justify-content:space-between"><label style="font-size:.86rem;color:var(--muted)">Survivor name</label><span style="font-size:.78rem;color:var(--muted)">' + esc(userName || 'Signed in') + ' &middot; <a href="#" id="bSignOut" style="color:var(--gold)">Sign out</a></span></div>' +
      '<input type="text" id="inpName" maxlength="16" value="' + esc(playerName) + '" placeholder="Enter your name...">' +
      '<div class="row"><button class="btn primary" id="bSolo">Play Solo</button><button class="btn" id="bHost">Create Room (Max 4)</button><button class="btn" id="bOpenLoad">Load Save Code</button><button class="btn" id="bGfx">Graphics Settings</button></div></div>' +
      '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Join a Friend\'s Room (6 random characters)</div>' +
      '<div class="row" style="flex-wrap:nowrap"><input type="text" id="inpRoom" maxlength="6" placeholder="Example: k4m9p2 (not case sensitive)" style="text-transform:lowercase;letter-spacing:.12em"><button class="btn primary" id="bJoin" style="white-space:nowrap">Join Room</button></div>' +
      '<div class="err" id="menuErr">' + esc(errMsg || '') + '</div></div>' +
      controlsHtml() + '<div class="row"><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');

    function syncName() { playerName = ($('#inpName').value || '').trim().slice(0, 16) || 'Survivor'; }
    $('#bSignOut').onclick = function (ev) { ev.preventDefault(); signOut(); };
    $('#bSolo').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); leaveRoom(); newWorld(); newPlayerState(0); coins = 0; kc = {}; T = 0; spawnT = 3; clearZombies(); enterGame(); say('30 seconds of safe time have started! Gather materials quickly.'); };
    $('#bHost').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); hostRoom(false); };
    $('#bJoin').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); var c = Net.normalizeCode($('#inpRoom').value); if (c.length !== 6) { $('#menuErr').textContent = 'Enter exactly 6 letters/numbers for the room code.'; return; } joinRoom(c); };
    $('#inpRoom').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') $('#bJoin').click(); });
    $('#bOpenLoad').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); openCodeModal('menu'); };
    $('#bGfx').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); openGfxModal('menu'); };
  }
  function enterGame() {
    renderHotbar(); renderStats(); $('#hud').hidden = false; mode = 'ready'; fallbackLook = false; $('#altHint').classList.remove('on');
    lock(true); setTimeout(function () { if (mode === 'ready' && !document.pointerLockElement) enableFallbackLook(); }, 450);
  }

  /* ---------------- Sign in / sign out (Supabase) ---------------- */
  function authStore() {
    return {
      getItem: function (k) { var v = null; try { v = localStorage.getItem(k); } catch (e) {} if (v == null) { try { v = sessionStorage.getItem(k); } catch (e) {} } return v; },
      setItem: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { try { sessionStorage.setItem(k, v); } catch (e2) {} } },
      removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) {} try { sessionStorage.removeItem(k); } catch (e) {} }
    };
  }
  function backLink() { return '<a class="btn" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a>'; }
  function gateScreen(html) { mode = 'menu'; screen('<div class="card"><span class="tag">Under Development &middot; Beta</span><h1><b>Webzombite</b></h1>' + html + '</div>'); }
  function authGate() {
    if (!window.supabase || !C.supabaseUrl) { gateScreen('<p>The sign-in library did not load. Check that vendor/supabase.js was uploaded, then reload.</p><div class="row"><button class="btn primary" onclick="location.reload()">Reload</button>' + backLink() + '</div>'); return; }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { storage: authStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    sb.auth.getSession().then(function (r) {
      var se = r.data && r.data.session; if (!se) { askLogin(); return; }
      afterLogin(se);
    }, function () { gateScreen('<p>Could not reach the server. Try again in a moment.</p><div class="row"><button class="btn primary" onclick="location.reload()">Retry</button>' + backLink() + '</div>'); });
  }
  function askLogin(msg) {
    gateScreen('<p>Sign in with your XKing account to play. This is the same account as XKing Core.</p><input type="text" id="le" placeholder="Email" autocomplete="username"><input type="password" id="lp" placeholder="Password" autocomplete="current-password" style="width:100%;min-height:44px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--line);background:#100e0b;color:var(--fg);font:inherit"><div class="err" id="lerr">' + esc(msg || '') + '</div><div class="row"><button class="btn primary" id="bLogin">Sign in</button><button class="btn" id="bDisc">Sign in with Discord</button>' + backLink() + '</div>');
    function go() {
      var e = $('#le').value.trim(), pw = $('#lp').value; if (!e || !pw) return; $('#bLogin').disabled = true;
      sb.auth.signInWithPassword({ email: e, password: pw }).then(function (r) { if (r.error || !r.data.session) askLogin(r.error ? (/Invalid/i.test(r.error.message) ? 'Incorrect email or password.' : r.error.message) : 'Could not sign in.'); else afterLogin(r.data.session); });
    }
    $('#bLogin').onclick = go; $('#lp').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(); });
    $('#bDisc').onclick = function () { sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: location.origin + location.pathname, scopes: 'identify email' } }); };
  }
  function afterLogin(se) {
    userId = se.user.id; var md = se.user.user_metadata || {};
    userName = md.username || md.full_name || md.name || (se.user.email || '').split('@')[0] || 'Survivor';
    if (playerName === 'Survivor') playerName = String(userName).slice(0, 16);
    sb.rpc('beta_check').then(function (c) { if (c.data === true) showMainMenu(); else askPassword(); }, function () { askPassword(); });
  }
  function askPassword() {
    gateScreen('<p>This game is Under Development. Enter the beta password to play.</p><input type="password" id="pw" placeholder="Beta password" autocomplete="off" style="width:100%;min-height:44px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--line);background:#100e0b;color:var(--fg);font:inherit"><div class="err" id="perr"></div><div class="row"><button class="btn primary" id="bUnlock">Unlock</button><button class="btn" id="bOut">Sign out</button>' + backLink() + '</div>');
    function go() {
      var v = $('#pw').value.trim(); if (!v) return; $('#bUnlock').disabled = true;
      sb.rpc('beta_unlock', { p_password: v }).then(function (r) { if (r.error) { $('#perr').textContent = r.error.message; $('#bUnlock').disabled = false; } else if (r.data === true) showMainMenu(); else { $('#perr').textContent = 'Wrong password.'; $('#bUnlock').disabled = false; } });
    }
    $('#bUnlock').onclick = go; $('#pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    $('#bOut').onclick = signOut;
  }
  function signOut() { leaveRoom(); var done = function () { userId = null; askLogin(); }; if (sb) sb.auth.signOut().then(done, done); else done(); }

  var PWS = 'width:100%;min-height:44px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--line);background:#100e0b;color:var(--fg);font:inherit;user-select:text';
  function openCodeModal(from) {
    var prev = mode; mode = 'modal'; var canExp = from === 'pause', canImp = mp.role !== 'client', code = '';
    screen('<div class="card"><h2>Save Code &amp; Load</h2>' +
      (canExp ? '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Your Current World Save Code (password protected)</div><input type="password" id="inpSavePw" maxlength="40" autocomplete="off" placeholder="Choose a security password (min. 4 characters)" style="' + PWS + '"><div class="row"><button class="btn primary sm" id="bMakeCode">Generate Code</button><button class="btn sm" id="bCopySave" disabled>Copy Code</button><button class="btn sm" id="bDlSave" disabled>Download .txt</button><button class="btn sm" id="bCloudSave">Save to Cloud</button><span class="okmsg" id="copyMsg"></span></div><textarea id="txSave" readonly placeholder="Your secured code appears here. Remember the password: it is needed to load the code, and the code only works on this account."></textarea></div>' : '') +
      '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Load a World from a Save Code</div>' +
      (canImp ? '<textarea id="txLoad" placeholder="Paste the WZL2:... code here"></textarea><input type="password" id="inpLoadPw" maxlength="40" autocomplete="off" placeholder="Security password of this code" style="' + PWS + '"><div class="row"><button class="btn primary sm" id="bDoLoadSolo">Load &amp; Play Solo</button><button class="btn sm" id="bDoLoadHost">Load &amp; Create Room (Max 4)</button><button class="btn sm" id="bCloudLoad">Load from Cloud</button><label class="btn sm" style="cursor:pointer">Choose .txt File<input type="file" id="fLoad" accept=".txt" hidden></label></div><div class="err" id="loadErr"></div>' : '<p style="font-size:.85rem;color:#ff8b8f">Only the Host or Solo mode can load a save code.</p>') +
      '</div><div class="row"><button class="btn" id="bCloseCode">Back</button></div></div>');
    if (canExp) {
      $('#bMakeCode').onclick = function () {
        var pw = $('#inpSavePw').value; if (!pw || pw.length < 4) { $('#copyMsg').textContent = 'Password must be at least 4 characters.'; return; }
        $('#copyMsg').textContent = 'Encrypting...';
        encodeSaveCode(pw).then(function (c) { code = c; $('#txSave').value = c; $('#bCopySave').disabled = false; $('#bDlSave').disabled = false; $('#copyMsg').textContent = 'Code ready!'; }, function (e) { $('#copyMsg').textContent = 'Failed: ' + (e && e.message ? e.message : 'error'); });
      };
      $('#bCopySave').onclick = function () {
        var tx = $('#txSave'); tx.select();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { $('#copyMsg').textContent = 'Code copied!'; }, function () { try { document.execCommand('copy'); $('#copyMsg').textContent = 'Code copied!'; } catch (e) {} });
        else { try { document.execCommand('copy'); $('#copyMsg').textContent = 'Code copied!'; } catch (e) {} }
      };
      $('#bDlSave').onclick = function () { var b = new Blob([code], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'webzombite-save.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); };
      $('#bCloudSave').onclick = function () {
        if (!sb) return; $('#copyMsg').textContent = 'Saving...';
        sb.rpc('save_game', { p_game: 'webzombite', p_data: snapshot(false) }).then(function (r) { $('#copyMsg').textContent = r.error ? 'Cloud save failed: ' + r.error.message : 'Saved to the cloud!'; }, function () { $('#copyMsg').textContent = 'Cloud save failed.'; });
      };
    }
    if (canImp) {
      $('#fLoad').onchange = function (ev) { var f = ev.target.files && ev.target.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { $('#txLoad').value = String(fr.result || '').trim(); }; fr.readAsText(f); };
      function finishImp(asHost, data) {
        if (!asHost && mp.role === 'host') leaveRoom();
        applySave(data, false); clearZombies(); if (T >= 30) { for (var i = 0; i < 4; i++) spawnZombie(); }
        if (asHost) { if (mp.role === 'host') { Net.send({ t: 'worldsync', snap: snapshot(true) }); enterGame(); } else hostRoom(true); say('Save loaded into the room!'); }
        else { enterGame(); say('Save loaded successfully!'); }
      }
      function runImp(asHost, data) {
        if (data) { if (data.v !== 3) { $('#loadErr').textContent = 'This cloud save is from the old 500 m map and cannot be loaded.'; return; } finishImp(asHost, data); return; }
        $('#loadErr').textContent = 'Decrypting...';
        decodeSaveCode($('#txLoad').value, $('#inpLoadPw').value).then(function (res) { if (res.err) { $('#loadErr').textContent = res.err; return; } finishImp(asHost, res.data); });
      }
      $('#bDoLoadSolo').onclick = function () { runImp(false); }; $('#bDoLoadHost').onclick = function () { runImp(true); };
      $('#bCloudLoad').onclick = function () {
        if (!sb) return; $('#loadErr').textContent = 'Loading...';
        sb.rpc('load_game', { p_game: 'webzombite' }).then(function (r) { if (r.error || !r.data || !r.data.v) { $('#loadErr').textContent = r.error ? r.error.message : 'No cloud save found.'; return; } runImp(false, r.data); }, function () { $('#loadErr').textContent = 'Could not reach the cloud.'; });
      };
    }
    $('#bCloseCode').onclick = function () { mode = prev; if (from === 'pause') showPause(); else showMainMenu(); };
  }

  /* ---------------- Graphics settings ---------------- */
  function applyGfx() {
    if (!renderer || !W) return;
    var unl = gfx.rd >= 9999; camera.far = unl ? 3200 : Math.max(300, (gfx.rd + 1) * 20 + 80); camera.updateProjectionMatrix();
    fogObj = scene.fog;
    if (gfx.fog) { fogObj.far = unl ? 800 : Math.max(60, gfx.rd * 20 * 0.96); fogObj.near = fogObj.far * 0.3; } else { fogObj.near = 1e6; fogObj.far = 2e6; }
    zombies.forEach(function (z) { if (z.sh) z.sh.visible = gfx.shadow; });
    for (var pid in mp.peers) { var pm = mp.peers[pid].mesh; if (pm && pm.sh) pm.sh.visible = gfx.shadow; }
    var m = W.waterMat; if (m) {
      if (gfx.water) { if (!cubeCam) { cubeCam = new THREE.CubeCamera(0.3, 420, new THREE.WebGLCubeRenderTarget(64)); scene.add(cubeCam); } m.envMap = cubeCam.renderTarget.texture; m.reflectivity = 0.5; m.combine = THREE.MixOperation; waterT = 0; }
      else m.envMap = null;
      m.needsUpdate = true;
    }
    renderer.shadowMap.enabled = !!gfx.smap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.type = THREE.PCFShadowMap; W.shadowsOn = !!gfx.smap; W.sun.castShadow = !!gfx.smap; setShadowFlags(!!gfx.smap); smT = 0;
    chunkT = 0; if (W.updateChunks) W.updateChunks(P.x, P.z, -Math.sin(P.yaw), -Math.cos(P.yaw), gfx.rd, gfx.cull);
  }
  /* Shadow map: the static world casts/receives; mobs use blob shadows. The map is re-rendered every 10 seconds. */
  var smT = 0, grRT = null, grScene = null, grCam = null, grMat = null;
  function setShadowFlags(on) {
    var mats = [];
    scene.children.forEach(function (ch) {
      if (ch.userData && ch.userData.mob) return;
      ch.traverse(function (o) {
        if (!o.isMesh || !o.material || !o.material.isMeshLambertMaterial || o.material === W.waterMat) return;
        o.castShadow = on; o.receiveShadow = on; if (mats.indexOf(o.material) < 0) mats.push(o.material);
      });
    });
    mats.forEach(function (m) { m.needsUpdate = true; });
  }
  function ensureGR() {
    var sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (grRT && (grRT.width !== sz.x || grRT.height !== sz.y)) { grRT.dispose(); grRT = null; }
    if (!grRT) grRT = new THREE.WebGLRenderTarget(sz.x, sz.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    if (!grMat) {
      grMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tex: { value: null }, sun: { value: new THREE.Vector2(0.5, 0.5) }, k: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D tex; uniform vec2 sun; uniform float k; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; vec2 d = (sun - vUv) / 28.0 * 0.95; vec2 uv = vUv; float acc = 0.0, w = 1.0; for (int i = 0; i < 28; i++) { uv += d; vec3 s = texture2D(tex, uv).rgb; float l = pow(dot(s, vec3(0.3, 0.59, 0.11)), 0.4545); acc += smoothstep(0.66, 0.92, l) * w; w *= 0.955; } vec3 col = c + vec3(1.0, 0.88, 0.62) * acc * k * 0.045; gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0); }' });
      grMat.uniforms.tex.value = grRT.texture; grCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); grScene = new THREE.Scene(); grScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), grMat));
    }
    grMat.uniforms.tex.value = grRT.texture;
  }
  /* God rays: screen-space light shafts toward the sun (only when the sun is in front of you and above the horizon) */
  function renderFrame() {
    var sv = W.sunVec, k = 0, u = null;
    if (gfx.godray && !ugOn && sv && sv.y > 4) {
      camera.updateMatrixWorld(); var v = new THREE.Vector3(P.x + sv.x, sv.y, P.z + sv.z).project(camera);
      if (v.z < 1) { u = [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5]; k = clamp(1.7 - Math.max(Math.abs(u[0] - 0.5), Math.abs(u[1] - 0.5)) * 2, 0, 1) * clamp(sv.y / 60, 0, 1) * (bloodOn ? 0.3 : 1); }
    }
    if (k > 0.02) { ensureGR(); renderer.setRenderTarget(grRT); renderer.render(scene, camera); renderer.setRenderTarget(null); grMat.uniforms.sun.value.set(u[0], u[1]); grMat.uniforms.k.value = k; renderer.render(grScene, grCam); }
    else renderer.render(scene, camera);
  }
  function updateWater(dt) {
    if (!gfx.water || !cubeCam) return; waterT -= dt; if (waterT > 0) return; waterT = 1.3;
    var best = null, bd = 140; W.waterMeshes.forEach(function (m) {
      var pr = m.geometry.parameters, qx = clamp(P.x, m.position.x - pr.width / 2, m.position.x + pr.width / 2), qz = clamp(P.z, m.position.z - pr.height / 2, m.position.z + pr.height / 2), d = Math.hypot(qx - P.x, qz - P.z);
      if (d < bd) { bd = d; best = { x: qx, z: qz }; }
    });
    if (!best) return;
    cubeCam.position.set(best.x, 1.4, best.z); W.waterMeshes.forEach(function (m) { m.visible = false; }); cubeCam.update(renderer, scene); W.waterMeshes.forEach(function (m) { m.visible = true; });
  }
  function openGfxModal(from) {
    var prev = mode; mode = 'modal';
    function dist(id, label, val, note) {
      var un = val >= 9999;
      return '<div class="box-sub"><div class="row" style="justify-content:space-between"><b style="font-size:.9rem">' + label + '</b><span id="' + id + 'Val" style="color:var(--gold);font-size:.85rem"></span></div><input type="range" id="' + id + '" min="2" max="100" step="1" value="' + (un ? 100 : val) + '"' + (un ? ' disabled' : '') + ' style="width:100%"><label style="font-size:.8rem;color:var(--muted)"><input type="checkbox" id="' + id + 'U"' + (un ? ' checked' : '') + '> Unlimited (only if your device can handle it)</label><div style="font-size:.78rem;color:var(--muted)">' + note + '</div></div>';
    }
    function chk(id, label, note, on) { return '<label class="box-sub" style="cursor:pointer;flex-direction:row;align-items:center;gap:10px"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b style="font-size:.9rem">' + label + '</b><br><span style="font-size:.78rem;color:var(--muted)">' + note + '</span></span></label>'; }
    screen('<div class="card"><span class="tag">Graphics Settings</span><h2>Graphics &amp; Performance</h2><p>The world is cut into 20 &times; 20 m chunks. Lower distances save memory, CPU and GPU. Changes apply instantly and are remembered on this device.</p>' +
      dist('gRd', 'Render Distance', gfx.rd, 'How far chunks are drawn (2 – 100 chunks).') + dist('gEd', 'Entity Distance (Simulation)', gfx.ed, 'Zombies farther than this keep running as tiny 256-bit records instead of full 3D mobs.') +
      '<div style="font-size:.88rem;font-weight:700">Shader Settings</div>' +
      chk('gFog', 'Fog (light)', 'Soft distance fog that hides chunk edges.', gfx.fog) + chk('gSh', 'Shadows (simple)', 'Cheap blob shadows under mobs and players.', gfx.shadow) + chk('gSm', 'Shadow Map', 'Real sun shadows from buildings, trees and rocks. The map refreshes every 10 seconds.', gfx.smap) + chk('gGr', 'God Rays', 'Light shafts toward the sun (costs extra GPU).', gfx.godray) + chk('gWa', 'Reflective Water', 'Lakes and rivers reflect the sky and nearby scenery.', gfx.water) +
      chk('gCu', 'Culling (hide the 180° behind you)', 'Chunks and mobs behind the player are not rendered.', gfx.cull) +
      '<div class="row"><button class="btn" id="bGfxBack">Back</button><button class="btn sm" id="bGfxReset">Defaults</button></div></div>');
    function lab() { $('#gRdVal').textContent = gfx.rd >= 9999 ? 'Unlimited' : gfx.rd + ' chunks (' + gfx.rd * 20 + ' m)'; $('#gEdVal').textContent = gfx.ed >= 9999 ? 'Unlimited' : gfx.ed + ' chunks (' + gfx.ed * 20 + ' m)'; }
    function bind(id, key) {
      $('#' + id).oninput = function () { gfx[key] = parseInt(this.value, 10); lab(); saveGfx(); applyGfx(); };
      $('#' + id + 'U').onchange = function () { var on = this.checked; $('#' + id).disabled = on; gfx[key] = on ? 9999 : parseInt($('#' + id).value, 10); lab(); saveGfx(); applyGfx(); };
    }
    bind('gRd', 'rd'); bind('gEd', 'ed'); lab();
    [['gFog', 'fog'], ['gSh', 'shadow'], ['gSm', 'smap'], ['gGr', 'godray'], ['gWa', 'water'], ['gCu', 'cull']].forEach(function (a) { $('#' + a[0]).onchange = function () { gfx[a[1]] = this.checked; saveGfx(); applyGfx(); }; });
    $('#bGfxReset').onclick = function () { var gd = GFXD(); for (var k in gd) gfx[k] = gd[k]; saveGfx(); applyGfx(); openGfxModal(from); };
    $('#bGfxBack').onclick = function () { mode = prev; if (from === 'pause') showPause(); else showMainMenu(); };
  }

  function showPause() {
    mode = 'pause'; keys = {}; lmb = false; eatT = 0; queue.length = 0; $('#eat').style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var mpHtml = mp.role !== 'solo' ? '<div class="box-sub"><div class="row" style="justify-content:space-between"><div>Room Code: <span class="code-pill">' + esc(mp.room) + '</span></div><button class="btn sm" id="bCopyRoom">Copy Code</button></div><div style="font-size:.82rem;color:var(--muted)">Players (' + totalPlayers() + '/' + MAX_PLAYERS + ') &middot; ' + (mp.online ? 'Connected Online' : 'Connecting / Local') + ' &middot; Not case sensitive</div>' + playerListHtml() + '</div>' : '';
    screen('<div class="card"><span class="tag">Webzombite &middot; Paused</span><h1>Game Paused</h1>' +
      '<p>Survived: <b>' + fmtTime(T) + '</b> &middot; Kills: <b>' + kills + '</b>. Don\'t forget to save your world code before leaving!</p>' + mpHtml +
      '<div class="row"><button class="btn primary" id="bResume">Resume</button><button class="btn" id="bInv">Bag, Gear &amp; Crafting</button><button class="btn" id="bSaveCode">Save / Load Code</button><button class="btn" id="bGfx">Graphics Settings</button></div>' +
      controlsHtml() + '<div class="row"><button class="btn" id="bMenu">Main Menu</button>' +
      (mp.role !== 'client' ? '<button class="btn danger" id="bReset">Reset World</button>' : '') +
      '<a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    if ($('#bCopyRoom')) $('#bCopyRoom').onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(mp.room).then(function () { $('#bCopyRoom').textContent = 'Copied!'; }); };
    $('#bResume').onclick = function () { SFX.play('click'); enterGame(); };
    $('#bInv').onclick = function () { SFX.play('click'); $('#screen').hidden = true; openInv(); };
    $('#bSaveCode').onclick = function () { SFX.play('click'); openCodeModal('pause'); };
    $('#bGfx').onclick = function () { SFX.play('click'); openGfxModal('pause'); };
    $('#bMenu').onclick = function () { SFX.play('click'); leaveRoom(); showMainMenu(); };
    if ($('#bReset')) $('#bReset').onclick = function () {
      if (confirm('Reset the world with new random tree & rock positions?')) {
        newWorld(); newPlayerState(mp.slot); coins = 0; kc = {}; T = 0; spawnT = 3; clearZombies();
        if (mp.role === 'host') Net.send({ t: 'worldsync', snap: snapshot(true) }); enterGame(); say('A new random world was created! 30 seconds of safe time have started.');
      }
    };
  }
/* === BATAS BAGIAN 1 (TEMPEL BAGIAN 2 TEPAT DI BAWAH BARIS INI) === *//* === AWAL BAGIAN 2 === */
  /* ---------------- HUD & minimap ---------------- */
  function renderHotbar() {
    var h = '';
    for (var i = 0; i < 8; i++) {
      var id = hot[i] || (i === 0 ? 'fists' : null), it = id ? ITEMS[id] : null;
      h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + (it ? it.ic : '') + (it && it.type !== 'tool' && id !== 'fists' ? '<em>' + count(id) + '</em>' : '') + '</div>';
    }
    if ($('#hotbar')) $('#hotbar').innerHTML = h;
    if ($('#held')) $('#held').textContent = ITEMS[hot[sel] || 'fists'].ic;
  }
  function renderStats() {
    var ast = armorStats(), as = accStats();
    var defs = [['hp', 'Health', 'b-hp', ast.hpMax], ['hunger', 'Hunger', 'b-hu', 100], ['thirst', 'Thirst', 'b-th', 100], ['energy', 'Energy', 'b-en', 100], ['comfort', 'Comfort', 'b-co', 100]];
    $('#stats').innerHTML = defs.map(function (d) {
      var v = Math.round(P[d[0]]), mx = d[3], pct = clamp(P[d[0]] / mx * 100, 0, 100);
      return '<div class="bar ' + d[2] + '"><i style="width:' + pct + '%"></i><span><b>' + d[1] + '</b><b>' + v + (mx > 100 ? '/' + mx : '') + '</b></span></div>';
    }).join('');
    var s = [];
    if (status.poison > 0) s.push('Poisoned'); if (status.stomach > 0) s.push('Stomachache'); if (status.wpoison > 0) s.push('Water Poison'); if (status.keylock > 0) s.push('Keybind Error ' + Math.ceil(status.keylock) + 's'); if (status.acid > 0) s.push('Acidic Poison x' + Math.pow(3, Math.max(0, status.acidN - 1))); if (cooking.length) s.push('Cooking ' + Math.ceil(cooking[0].t) + 's');
    if (P.comfort <= 30) s.push('Uncomfortable'); if (rest) s.push(rest.k === 'sleep' ? 'Sleeping' : 'Resting');
    $('#status').innerHTML = s.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    var clk = clockInfo(T), safeTxt = T < 30 ? ' · Safe time <b>' + Math.ceil(30 - T) + 's</b>' : '', hh = Math.floor(clk.hour);
    var timeTxt = as.watch === 0 ? '<b>Time unknown</b> (equip a watch)' : 'Day <b>' + clk.day + '</b> · <b>' + (as.watch === 1 ? (hh < 10 ? '0' : '') + hh + ':00' : clk.str) + '</b> (' + clk.fase + ')';
    var zc = 0; if (as.radar) { for (var zi = 0; zi < zombies.length; zi++) if (Math.hypot(zombies[zi].x - P.x, zombies[zi].z - P.z) < 70) zc++; zc += dormNear(70); }
    var roomTxt = mp.role !== 'solo' ? '<br>Room <b>' + esc(mp.room) + '</b> (' + totalPlayers() + '/' + MAX_PLAYERS + ')' + (mp.online ? ' · Online' : ' · Local') : '';
    $('#info').innerHTML = timeTxt + safeTxt +
      '<br>DEF <b>' + ast.def + '</b> · Kills <b>' + kills + '</b> · Zombies nearby <b>' + (as.radar ? zc : '?') + '</b>' + (as.radar ? '' : ' (equip a Radar)') +
      '<br>Tier <b>T' + worldTier(clk.day) + '</b> · Coins <b>' + coins + '</b> · Biome <b>' + ({ city: 'City', desert: 'Desert City', jungle: 'Jungle Village', snow: 'Snow City' }[W.biomeOf(P.x, P.z)]) + '</b>' + (bloodOn ? '<br><b style="color:#ff5a5a">BLOOD MOON · double zombies!</b>' : '') +
      '<br>[F] Flashlight: <b>' + (torchOn ? 'On' : 'Off') + '</b> · [M] Sound: <b>' + (SFX.isMuted() ? 'Muted' : 'On') + '</b>' + roomTxt;
  }
  var mini, mctx;
  function drawMini() {
    if (!mctx) return; var as = accStats(); mini.style.display = as.gps ? 'block' : 'none'; if (!as.gps) return;
    var S = 170, k = S / 220, g = mctx, cx = P.x, cz = P.z, H = W.half;
    function X(x) { return S / 2 + (x - cx) * k; } function Y(z) { return S / 2 + (z - cz) * k; }
    function R(x0, z0, x1, z1, c) { g.fillStyle = c; g.fillRect(X(x0), Y(z0), (x1 - x0) * k, (z1 - z0) * k); }
    g.fillStyle = '#14120f'; g.fillRect(0, 0, S, S);
    R(-H, -H, H, H, '#2d2a22'); R(-H, -H, H, -500, '#8d9aa0'); R(500, -500, H, H, '#7a6638'); R(-H, -500, -500, H, '#2c4a2a');
    g.fillStyle = '#4a4c50'; W.roads.forEach(function (r) { if (Math.abs(r - cx) < 120) g.fillRect(X(r - 5), Y(-H), 10 * k, 2 * H * k); if (Math.abs(r - cz) < 120) g.fillRect(X(-H), Y(r - 5), 2 * H * k, 10 * k); });
    W.rects.forEach(function (r) { if (r.x1 < cx - 115 || r.x0 > cx + 115 || r.z1 < cz - 115 || r.z0 > cz + 115) return; g.fillStyle = r.c; g.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k); });
    g.fillStyle = '#2f7fa8'; W.waterMeshes.forEach(function (m) { var pr = m.geometry.parameters, wx = m.position.x, wz = m.position.z; if (Math.abs(wx - cx) < 115 + pr.width / 2 && Math.abs(wz - cz) < 115 + pr.height / 2) g.fillRect(X(wx - pr.width / 2), Y(wz - pr.height / 2), pr.width * k, pr.height * k); });
    g.strokeStyle = '#b33a2a'; g.lineWidth = 2; g.strokeRect(X(-H), Y(-H), 2 * H * k, 2 * H * k);
    g.fillStyle = '#ff4b4b'; if (as.radar) zombies.forEach(function (z) { if (Math.abs(z.x - cx) < 110 && Math.abs(z.z - cz) < 110) g.fillRect(X(z.x) - 2, Y(z.z) - 2, 4, 4); });
    for (var pid in mp.peers) { var pr = mp.peers[pid]; if (Math.abs(pr.x - cx) < 110 && Math.abs(pr.z - cz) < 110) { g.fillStyle = SLOT_HEX[pr.slot % 4]; g.beginPath(); g.arc(X(pr.x), Y(pr.z), 4, 0, Math.PI * 2); g.fill(); } }
    g.save(); g.translate(S / 2, S / 2); g.rotate(-P.yaw); g.fillStyle = SLOT_HEX[mp.slot % 4];
    g.beginPath(); g.moveTo(0, -7); g.lineTo(-5, 6); g.lineTo(5, 6); g.closePath(); g.fill(); g.restore();
  }

  /* ---------------- Physics, actions & zombies ---------------- */
  function moveBody(b, dx, dy, dz, r, h, canStep) {
    var i, top;
    if (dx) { b.x += dx; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r); if (i) { top = i.top; if (canStep && top - b.y <= 0.62 && !W.hit(b.x - r, b.x + r, top + 0.001, top + h, b.z - r, b.z + r)) b.y = top + 0.001; else { b.x -= dx; if (b.vx !== undefined) b.vx = 0; } } }
    if (dz) { b.z += dz; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r); if (i) { top = i.top; if (canStep && top - b.y <= 0.62 && !W.hit(b.x - r, b.x + r, top + 0.001, top + h, b.z - r, b.z + r)) b.y = top + 0.001; else { b.z -= dz; if (b.vz !== undefined) b.vz = 0; } } }
    if (dy) { b.y += dy; b.onGround = false; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r); if (i) { if (dy < 0) { b.y = i.top; b.onGround = true; } else b.y = i.bottom - h; b.vy = 0; } if (b.y <= 0) { b.y = 0; b.vy = 0; if (dy < 0) b.onGround = true; } }
  }
  function stepPlayer(dt) {
    if (fallbackLook) {
      var tr = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0), ly = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
      if (tr) P.yaw += tr * 2.2 * dt; if (ly) P.pitch = clamp(P.pitch + ly * 1.6 * dt, -1.5, 1.5);
    }
    var fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    var wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str, len = Math.hypot(wx, wz);
    if (rest && (fwd || str || keys.Space)) endRest();
    if (rest) { wx = wz = 0; len = 0; } if (len > 0) { wx /= len; wz /= len; }
    var sprint = keys.ShiftLeft && fwd > 0 && P.energy > 0 && !rest, sp = (sprint ? 6.4 : 4.2) * speedMult() * (P.energy <= 0 ? 0.92 : 1);
    var f = Math.min(1, (P.onGround ? 14 : 3) * dt); P.vx += (wx * sp - P.vx) * f; P.vz += (wz * sp - P.vz) * f;
    if (sprint && len > 0) P.energy = Math.max(0, P.energy - 3 * armorStats().energyDrain * dt);
    if (keys.Space && P.onGround && !rest) { P.vy = 6.4; P.onGround = false; SFX.play('step'); }
    if (P.onGround && Math.hypot(P.vx, P.vz) > 1.2) { stepT -= dt; if (stepT <= 0) { stepT = sprint ? 0.28 : 0.42; SFX.play('step'); } } else stepT = 0.08;
    var n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
    for (var i = 0; i < n; i++) { P.vy -= 17 * h; if (P.vy < -40) P.vy = -40; moveBody(P, P.vx * h, 0, 0, 0.3, 1.8, P.onGround); moveBody(P, 0, 0, P.vz * h, 0.3, 1.8, P.onGround); moveBody(P, 0, P.vy * h, 0, 0.3, 1.8, false); }
    if (inUG(P.x)) { P.x = clamp(P.x, W.ug.x0 + 6.4, W.ug.x1 - 6.4); P.z = clamp(P.z, W.ug.z0 + 6.4, W.ug.z1 - 6.4); } else { P.x = clamp(P.x, -W.half + 0.4, W.half - 0.4); P.z = clamp(P.z, -W.half + 0.4, W.half - 0.4); }
  }

  var DIR = new THREE.Vector3(), tmpE = [];
  function aim(reach) {
    camera.getWorldDirection(DIR);
    var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, last = null, i;
    W.entsNear(P.x, P.z, reach + 1.5, tmpE);
    for (var t = 0.15; t <= reach; t += 0.07) {
      var x = ox + DIR.x * t, y = oy + DIR.y * t, z = oz + DIR.z * t;
      for (i = 0; i < zombies.length; i++) { var zb = zombies[i], ex = zb.x - x, ez = zb.z - z; if (ex * ex + ez * ez < zb.r2 && y > zb.y - 0.05 && y < zb.y + zb.h) return { kind: 'zombie', z: zb, t: t }; }
      for (i = 0; i < tmpE.length; i++) { var e = tmpE[i], fx = e.x - x, fz = e.z - z; if (fx * fx + fz * fz < e.r * e.r && y >= e.y - 0.05 && y <= e.y + e.h) return { kind: 'ent', e: e, t: t }; }
      var s = W.solidAt(x, y, z); if (s) return { kind: s === 'static' ? 'static' : 'vox', key: s, prev: last, t: t };
      if (y < 0) return { kind: 'ground', prev: last, t: t };
      last = [Math.floor(x), Math.floor(y), Math.floor(z)];
    }
    return null;
  }
  function unkey(k) { var y = k % 64, r = Math.floor(k / 64), z = (r % 4096) - 1100, x = Math.floor(r / 4096) - 1100; return [x, y, z]; }
  var VNAME = { 10: 'Wood Plank Block', 11: 'Sawmill', 12: 'Turret Workbench', 13: 'Handmade Cannon', 14: 'Cannon', 15: 'Manual Cannon', 1: 'Wood Log Block', 2: 'Stone Block', 3: 'Smelting Furnace', 4: 'Cozy Bed', 5: 'Cozy Couch', 6: 'Sink', 7: 'Campfire', 8: 'Iron Anvil', 9: 'Computer Bench' };
  var VITEM = { 10: 'wood_plank_block', 11: 'sawmill', 12: 'turret_bench', 13: 'handmade_cannon', 14: 'cannon_turret', 15: 'manual_cannon', 1: 'wood_block', 2: 'stone_block', 3: 'furnace', 4: 'bed_block', 5: 'couch_block', 6: 'sink_block', 7: 'campfire', 8: 'anvil_block', 9: 'computer_bench' };

  function turretAt(x, y, z) { for (var i = 0; i < W.turrets.length; i++) { var e = W.turrets[i]; if (e.alive && e.vx === x && e.vy === y && e.vz === z) return e; } return null; }
  function tcfg(e) { return ITEMS[WZ.TURRET_VOX[e.vt]].turret; }
  function dropScraps(vt, x, z) {
    var id = VITEM[vt], r = WZ.RECIPES.filter(function (q) { return q.out[0] === id; })[0]; if (!r) return;
    var loot = {}, any = false; Object.keys(r.cost).forEach(function (k) { var n = Math.round(r.cost[k] * 0.2); if (n > 0) { loot[k] = n; any = true; } });
    say(VNAME[vt] + ' was destroyed by zombies!', true); if (any) addCorpse(x, z, { inv: loot, eq: [], ac: [] }, true, 'Turret Scraps');
  }
  function damageVoxLocal(cx, cy, cz, dmg, giveToPid) {
    var v = W.getVox(cx, cy, cz); if (!v) return null; v.hp -= dmg;
    if (v.hp <= 0) {
      var vt = v.t, te0 = vt >= 13 ? turretAt(cx, cy, cz) : null; W.delVox(cx, cy, cz); voxVer++;
      if (te0) { if (manning === te0) manning = null; if (!giveToPid) dropScraps(vt, cx + 0.5, cz + 0.5); else if (giveToPid === 'self' && te0.ammo > 0) give('cannon_ball', te0.ammo); }
      if (mp.role === 'host') { Net.send({ t: 'vox', op: 0, x: cx, y: cy, z: cz }); if (giveToPid && giveToPid !== Net.info().pid) Net.send({ t: 'give', to: giveToPid, id: VITEM[vt], n: 1 }); else if (giveToPid === 'self') give(VITEM[vt], 1); }
      else if (mp.role === 'solo' && giveToPid === 'self') give(VITEM[vt], 1);
      return { broken: true, vt: vt, hp: 0 };
    } else { if (mp.role === 'host') Net.send({ t: 'vox', op: 2, x: cx, y: cy, z: cz, hp: Math.round(v.hp) }); return { broken: false, vt: v.t, hp: v.hp }; }
  }
  function applyEntHit(e, bd, targetPid) {
    e.hp -= bd;
    var goal = e.hp <= 0 ? e.yield : Math.floor(e.yield * (1 - Math.max(0, e.hp) / e.max)), gain = goal - e.given, item = e.k === 'tree' ? 'wood' : (e.ore ? 'iron_nugget' : e.gold ? 'golden_nugget' : e.copper ? 'broken_copper_wire' : e.coal ? 'coal' : 'stone');
    if (gain > 0) { e.given = goal; if (targetPid === 'self') { give(item, gain); say('+' + gain + ' ' + ITEMS[item].name); } else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: item, n: gain, msg: '+' + gain + ' ' + ITEMS[item].name }); }
    if (e.hp <= 0) {
      e.respawn = T + (e.k === 'tree' ? 600 : 720); if (e.k === 'tree') W.setTree(e, false); else W.setRock(e, false);
      var msg = e.k === 'tree' ? 'The tree fell.' : (e.ore ? 'The iron ore is mined out.' : e.gold ? 'The gold ore is mined out.' : e.copper ? 'The copper ore is mined out.' : e.coal ? 'The coal is mined out.' : 'The rock is destroyed.');
      if (targetPid === 'self') say(msg); else if (mp.role === 'host') Net.send({ t: 'say', to: targetPid, msg: msg });
    }
    if (mp.role === 'host') Net.send({ t: 'ent', k: e.k, idx: e.idx, hp: Math.round(e.hp), given: e.given, alive: e.alive });
  }
  function hitVoxAt(cx, cy, cz, bd) {
    SFX.play('block');
    if (mp.role === 'client') Net.send({ t: 'dmgVox', x: cx, y: cy, z: cz, dmg: bd * 2 });
    else { var res = damageVoxLocal(cx, cy, cz, bd * 2, 'self'); if (res) say(VNAME[res.vt] + (res.broken ? ' taken back' : ' ' + Math.max(0, Math.round(res.hp)))); }
  }
  function swing() {
    var it = curItem(); if (it.type === 'food' || it.type === 'drink' || it.type === 'block' || it.type === 'med') return;
    if (it.tool === 'bow') { shootBow(); return; }
    if (it.tool === 'rod') { swingCd = 0.6; lmb = false; startFish(); return; }
    swingCd = (it.tool === 'club' ? 0.55 : it.tool === 'sword' ? 0.42 : 0.48) * (P.energy <= 0 ? 1.4 : 1); mp.swingPulse = 0.25;
    var held = $('#held'); held.classList.add('swing'); setTimeout(function () { held.classList.remove('swing'); }, 110);
    var h = aim(3.0); if (!h) { SFX.play('swing'); return; }
    if (h.kind === 'zombie') {
      var meleeDmg = Math.round(it.dmg * armorStats().dmgMult);
      SFX.play('hit');
      if (mp.role === 'client') { h.z.flash = 0.14; Net.send({ t: 'hitZ', id: h.z.id, dmg: meleeDmg }); } else hitZombie(h.z, meleeDmg, 'self');
      return;
    }
    if (h.kind === 'vox') { var c = unkey(h.key); hitVoxAt(c[0], c[1], c[2], it.bd); return; }
    if (h.kind !== 'ent') { SFX.play('swing'); return; }
    var e = h.e;
    if (e.vx != null) { hitVoxAt(e.vx, e.vy, e.vz, it.bd); return; }
    if (e.k === 'car') { SFX.play('block'); if (mp.role === 'client') Net.send({ t: 'hitEnt', k: 'car', idx: e.idx, bd: it.bd || 1 }); else applyCarHit(e, it.bd || 1, 'self'); return; }
    if (e.k === 'tree' || e.k === 'rock') {
      var need = e.k === 'tree' ? 'axe' : 'pick';
      if (it.tool !== need) { say(e.k === 'tree' ? 'You need an axe to chop trees.' : 'You need a pickaxe to mine rocks.', true); return; }
      SFX.play(e.k === 'tree' ? 'wood' : 'stone');
      if (mp.role === 'client') Net.send({ t: 'hitEnt', k: e.k, idx: e.idx, bd: it.bd }); else applyEntHit(e, it.bd, 'self');
    }
  }
  function hitZombie(z, dmg, attacker) {
    z.hp -= Math.max(1, dmg - z.def.def); z.flash = 0.14;
    if (attacker !== 'turret') { var dx = z.x - P.x, dz = z.z - P.z, l = Math.hypot(dx, dz) || 1; moveBody(z, dx / l * 0.35, 0, dz / l * 0.35, z.rad, 1.7, false); }
    if (z.hp <= 0) killZombie(z, attacker);
  }
  function awardKill(type) {
    var d = ZDEF[type]; if (!d || !d.coin) return; kc[type] = (kc[type] || 0) + 1;
    if (kc[type] >= d.coin[0]) { kc[type] = 0; coins += d.coin[1]; say('+' + d.coin[1] + ' Coin' + (d.coin[1] > 1 ? 's' : '') + ' (' + d.name + ')'); }
  }
  function killZombie(z, attacker) {
    scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); delete zMap[z.id];
    var dropId = null, zt = z.type;
    if (z.def.boss && mp.role !== 'client') { var bi = zt === 'gigantus' ? 0 : 1; bf[bi] = 2; }
    if (zt === 'spider') dropId = rnd() < 1 / 3 ? 'string' : null; else if (zt === 'programmer') dropId = rnd() < 0.10 ? 'signal_chip' : null; else if (zt !== 'miner' && zt !== 'zfish') dropId = rnd() < 0.15 ? WZ.rollLoot('trash1', rnd) : null;
    if (attacker === 'self' || !attacker) { kills++; awardKill(zt); if (dropId) { give(dropId, 1); say('+1 ' + ITEMS[dropId].name); } }
    else if (attacker !== 'turret' && mp.role === 'host') Net.send({ t: 'zkill', to: attacker, drop: dropId, ty: z.ti });
  }
  function eatTick(dt) {
    var id = hot[sel], it = id ? ITEMS[id] : null;
    if (!(lmb && it && it.eat && count(id) > 0)) { eatT = 0; $('#eat').style.display = 'none'; return; }
    var mxHp = armorStats().hpMax;
    if (it.type === 'med' && P.hp >= mxHp) { eatT = 0; $('#eat').style.display = 'none'; if (lmb) { lmb = false; say('Health is already full.'); } return; }
    eatT += dt; var e = it.eat; $('#eat').style.display = 'block'; $('#eat i').style.width = clamp(eatT / e.t * 100, 0, 100) + '%';
    $('#eat span').textContent = (it.type === 'med' ? 'Using ' : it.type === 'drink' ? 'Drinking ' : 'Eating ') + it.name;
    if (eatT >= e.t) {
      eatT = 0; take(id, 1);
      if (it.type === 'med') {
        P.hp = clamp(P.hp + (e.heal || 30), 0, mxHp);
        say(it.name + ': +' + (e.heal || 30) + ' Health'); SFX.play('heal');
      } else {
        P.hunger = clamp(P.hunger + (e.h || 0), 0, 100); P.thirst = clamp(P.thirst + (e.th || 0), 0, 100);
        if (e.comfort) P.comfort = clamp(P.comfort + e.comfort, 0, 100); if (e.energy) P.energy = clamp(P.energy + e.energy, 0, 100);
        var msg = it.name + ': ' + (e.h ? '+' + e.h + ' Hunger ' : '') + (e.th ? (e.th > 0 ? '+' : '') + e.th + ' Thirst ' : '') + (e.energy ? '+' + e.energy + ' Energy ' : '') + (e.comfort ? '+' + e.comfort + ' Comfort' : '');
        if (e.poison && rnd() < e.poison) { status.poison = 15; msg += ' - Poisoned'; }
        if (e.wpoison && rnd() < e.wpoison * armorStats().wpResist) { status.wpoison = 15; msg += ' - Water Poison'; }
        if (e.stomach && rnd() < e.stomach) { status.stomach = 30; msg += ' - Stomachache'; }
        say(msg, /Poison|Stomach/.test(msg)); SFX.play(it.type === 'drink' ? 'drink' : 'eat');
      }
      renderHotbar();
    }
  }
  function placeBlock() {
    var id = hot[sel], it = id ? ITEMS[id] : null; if (!it || it.type !== 'block' || count(id) < 1) return;
    var h = aim(5); if (!h || !h.prev) return; var c = h.prev;
    if (W.voxCount() >= W.MAX_VOX) { say('Block limit reached.', true); return; }
    if (c[0] + 1 > P.x - 0.3 && c[0] < P.x + 0.3 && c[1] + 1 > P.y && c[1] < P.y + 1.8 && c[2] + 1 > P.z - 0.3 && c[2] < P.z + 0.3) { say('You are in the way.', true); return; }
    for (var i = 0; i < zombies.length; i++) { var z = zombies[i]; if (Math.abs(z.x - c[0] - 0.5) < 0.85 && Math.abs(z.z - c[2] - 0.5) < 0.85 && z.y < c[1] + 1 && z.y + z.h > c[1]) { say('A zombie is in the way.', true); return; } }
    if (W.hit(c[0] + 0.02, c[0] + 0.98, c[1] + 0.02, c[1] + 0.98, c[2] + 0.02, c[2] + 0.98)) { say('Something is in the way.', true); return; }
    if (mp.role === 'client') { if (W.getVox(c[0], c[1], c[2])) return; take(id, 1); SFX.play('block'); Net.send({ t: 'place', x: c[0], y: c[1], z: c[2], vt: it.vox, hp: it.hp, item: id }); }
    else {
      if (!W.setVox(c[0], c[1], c[2], it.vox, it.hp)) { say('You cannot build there.', true); return; }
      voxVer++; take(id, 1); SFX.play('block');
      if (mp.role === 'host') Net.send({ t: 'vox', op: 1, x: c[0], y: c[1], z: c[2], vt: it.vox, hp: it.hp });
    }
  }
  function applySearchEnt(e, targetPid) {
    if (e.searched) { if (targetPid === 'self') say('Already searched.'); else if (mp.role === 'host') Net.send({ t: 'say', to: targetPid, msg: 'Already searched.' }); return; }
    var key = e.k === 'pile' ? (e.tier === 4 ? 'table4' : e.tier === 2 && WZ.LOOT.trash2.enabled ? 'trash2' : 'trash1') : ('crate' + Math.max(1, Math.min(e.tier || 1, worldTier(clockInfo(T).day), 5)));
    var rolls = WZ.LOOT[key].rolls || 1, got = {};
    for (var i = 0; i < rolls; i++) { var id = WZ.rollLoot(key, rnd); got[id] = (got[id] || 0) + 1; }
    Object.keys(got).forEach(function (id) {
      if (targetPid === 'self') { give(id, got[id]); say('+' + got[id] + ' ' + ITEMS[id].name); }
      else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: id, n: got[id], msg: '+' + got[id] + ' ' + ITEMS[id].name });
    });
    if (e.k === 'pile') { W.setPile(e, false); e.respawn = T + 300; } else { W.setCrate(e, false); e.respawn = T + 480; }
    if (mp.role === 'host') Net.send({ t: 'ent', k: e.k, idx: e.idx, searched: true });
  }
  function endRest() { rest = null; $('#dark').style.opacity = 0; }
  function interact() {
    var cpx = nearCorpse(2.6); if (cpx) { lootCorpse(cpx); return; }
    var h = aim(3.6); if (!h || h.kind !== 'ent') return; var e = h.e;
    if (e.k === 'pile' || e.k === 'crate') { SFX.play('loot'); if (mp.role === 'client') { if (e.searched) { say('Already searched.'); return; } Net.send({ t: 'search', k: e.k, idx: e.idx }); } else applySearchEnt(e, 'self'); }
    else if (e.k === 'bed') { rest = { k: 'sleep', clean: !!e.clean }; P.vx = P.vz = 0; $('#dark').style.opacity = 0.75; say(e.clean ? 'Sleeping in a clean bed: time passes 3x faster. Comfort & Energy recover.' : 'Sleeping in a shabby bed: time passes 2x faster. Energy recovers, but Comfort does not.'); }
    else if (e.k === 'couch') { if (!e.clean) say('The couch is dirty. It does not restore Comfort.', true); else { rest = { k: 'sit', clean: true }; P.vx = P.vz = 0; say('Sitting on a clean couch. Comfort is recovering.'); } }
    else if (e.k === 'furnace' || e.k === 'campfire' || e.k === 'anvil' || e.k === 'computer' || e.k === 'sawmill' || e.k === 'tbench') { SFX.play('click'); openInv(); }
    else if (e.k === 'turret') { if (e.vt === 15) toggleManning(e); else loadTurret(e); }
    else if (e.k === 'sink') {
      var hid = hot[sel];
      if ((hid === 'dirty_veg' || hid === 'dirty_fruits') && count(hid) > 0) {
        var outId = hid === 'dirty_veg' ? 'fresh_veg' : 'fresh_fruits';
        take(hid, 1); give(outId, 1); SFX.play('wash'); say('Washed clean into +1 ' + ITEMS[outId].name + '!');
      } else { SFX.play('click'); openInv(); }
    }
  }

  /* ---------------- Corpse ---------------- */
  function addCorpse(x, z, loot, mine, name, id) {
    var g = new THREE.Group(), cloth = new THREE.MeshLambertMaterial({ color: 0x6b2f2f }), skin = new THREE.MeshLambertMaterial({ color: 0xd9b38c });
    function bx(w, h, d, m, px, py, pz) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(px, py, pz); g.add(o); }
    bx(0.5, 0.2, 0.7, cloth, 0, 0.12, 0); bx(0.3, 0.3, 0.3, skin, 0, 0.17, -0.55); bx(0.2, 0.18, 0.7, new THREE.MeshLambertMaterial({ color: 0x2d333b }), 0, 0.1, 0.65);
    g.position.set(x, 0, z); g.rotation.y = rnd() * 6; scene.add(g);
    var c = { id: id || ('c' + Math.random().toString(36).slice(2, 8)), x: x, z: z, g: g, mine: mine, loot: loot, name: name || 'Survivor' };
    corpses.push(c); return c;
  }
  function removeCorpse(c) { scene.remove(c.g); var i = corpses.indexOf(c); if (i >= 0) corpses.splice(i, 1); }
  function clearCorpses() { corpses.slice().forEach(removeCorpse); }
  function nearCorpse(r) { for (var i = 0; i < corpses.length; i++) if (Math.hypot(corpses[i].x - P.x, corpses[i].z - P.z) < r) return corpses[i]; return null; }
  function lootCorpse(c) {
    var bag = c.name === 'Dropped Items' || c.name === 'Turret Scraps';
    if (!c.mine) { say(c.name + '\'s corpse. Only they can loot it.', true); return; }
    var L = c.loot || { inv: {}, eq: [], ac: [] };
    removeCorpse(c); if (mp.role !== 'solo') Net.send({ t: 'corpseGone', id: c.id });
    Object.keys(L.inv || {}).forEach(function (id) { give(id, L.inv[id]); });
    (L.eq || []).concat(L.ac || []).forEach(function (id) { give(id, 1); });
    SFX.play('loot'); say(bag ? 'You picked up the items.' : 'You looted your corpse. All items recovered!');
  }

  function hurt(n) {
    if (dead) return;
    var def = armorStats().def, dmg = n - def;
    if (dmg <= 0) dmg = 1;
    P.hp -= dmg; P.comfort = Math.max(0, P.comfort - 3); if (rest) endRest(); if (fish) { endFish(); say('Fishing canceled.', true); }
    var v = $('#vig'); v.style.opacity = 1; setTimeout(function () { v.style.opacity = 0; }, 180); SFX.play('hurt');
    if (P.hp <= 0) die();
  }
  function applyWaterPoison() { if (rnd() < armorStats().wpResist) { status.wpoison = 15; say('You got Water Poison!', true); } }
  function infectKeys(sec) { status.keylock = sec; keys = {}; lmb = false; queue.length = 0; say('Keybind Error Virus! All keys are disabled (only Pause works).', true); SFX.play('hurt'); }
  function die() {
    if (dead) return; dead = true; mode = 'dead'; keys = {}; lmb = false; eatT = 0; endFish(); $('#eat').style.display = 'none'; $('#dark').style.opacity = 0;
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var loot = { inv: JSON.parse(JSON.stringify(inv)), eq: ['head', 'chest', 'legs', 'boots'].map(function (k) { return equip[k]; }).filter(Boolean), ac: acc.filter(Boolean) };
    if (Object.keys(loot.inv).length || loot.eq.length || loot.ac.length) {
      var cp = addCorpse(P.x, P.z, loot, true, playerName);
      if (mp.role !== 'solo') Net.send({ t: 'corpse', id: cp.id, x: r2(P.x), z: r2(P.z), n: playerName });
    }
    screen('<div class="card"><span class="tag">You Died</span><h1>The city swallowed you.</h1><p>Survived: <b>' + fmtTime(T) + '</b> &middot; Kills: <b>' + kills + '</b>. Nothing is lost: all your items are in your <b>corpse</b>. Go back and press [E] on it to recover everything.</p>' +
      '<div class="row"><button class="btn primary" id="bResp">Respawn</button><button class="btn" id="bDeadMenu">Main Menu</button><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    $('#bResp').onclick = respawn; $('#bDeadMenu').onclick = function () { leaveRoom(); showMainMenu(); };
  }
  function respawn() {
    inv = { rusty_axe: 1, rusty_pickaxe: 1 }; hot = [null, 'rusty_axe', 'rusty_pickaxe', null, null, null, null, null]; sel = 1;
    equip = { head: null, chest: null, legs: null, boots: null }; acc = [null, null, null, null]; cooking = [];
    P.hp = armorStats().hpMax; P.hunger = P.thirst = P.energy = P.comfort = 100; status = freshStatus(); dead = false; rest = null; $('#dark').style.opacity = 0;
    if (mp.role === 'solo') { clearZombies(); spawnT = 6; } placeAtSpawn(mp.slot); renderHotbar(); enterGame();
  }
  function stats(dt) {
    var ast = armorStats(), hm = status.stomach > 0 ? 3 : 1, sl = rest && rest.k === 'sleep';
    P.hunger = Math.max(0, P.hunger - 0.12 * hm * dt); P.thirst = Math.max(0, P.thirst - 0.17 * hm * dt);
    P.comfort = Math.max(0, P.comfort - 0.05 * ast.comfortDrain * dt); P.energy = Math.max(0, P.energy - 0.07 * dt);
    if (rest) { if (rest.clean) P.comfort = Math.min(100, P.comfort + (sl ? 4 : 2.5) * dt); P.energy = Math.min(100, P.energy + (sl ? 6 : 1.5) * dt); }
    else if (Math.hypot(P.vx, P.vz) < 0.2) P.energy = Math.min(100, P.energy + 0.3 * dt);
    if (status.poison > 0) { status.poison -= dt; P.hp -= 1.2 * dt; } if (status.stomach > 0) status.stomach -= dt;
    if (status.wpoison > 0) { status.wpoison -= dt; P.hp -= 2.4 * dt; } if (status.keylock > 0) status.keylock -= dt;
    if (status.acid > 0) { status.acid -= dt; P.hp -= Math.pow(3, Math.max(0, status.acidN - 1)) * dt; if (status.acid <= 0) status.acidN = 0; }
    if (P.hunger <= 0) P.hp -= 0.8 * dt; if (P.thirst <= 0) P.hp -= 0.8 * dt;
    if (P.hp <= 0 && !dead) { die(); return; }
    if (P.hunger > 40 && P.thirst > 40 && status.poison <= 0 && status.wpoison <= 0 && P.hp < ast.hpMax) P.hp = Math.min(ast.hpMax, P.hp + 0.4 * dt);
  }

  /* ---------------- Fishing, bow, virus, mineshaft ---------------- */
  function aimWater(maxD) {
    camera.getWorldDirection(DIR); var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    for (var t = 0.4; t <= maxD; t += 0.25) { var y = oy + DIR.y * t; if (y <= 0.12) { var x = ox + DIR.x * t, z = oz + DIR.z * t, w = W.waterAt(x, z); return w ? { x: x, z: z, type: w } : null; } }
    return null;
  }
  function startFish() {
    if (fish) { endFish(); say('You reeled in the line.'); return; }
    var w = aimWater(15); if (!w) { say('Aim at a lake and left click to cast.', true); return; }
    if (w.type === 'river') { say('River fishing is coming soon.', true); return; }
    var tb = WZ.FISH[w.type], r = rnd() * 100, a = 0, pk = tb[0];
    for (var i = 0; i < tb.length; i++) { a += tb[i].pct; if (r < a) { pk = tb[i]; break; } }
    fish = { fp: pk.fp, fp0: pk.fp, id: pk.id, x: w.x, z: w.z, px: P.x, pz: P.z };
    if (!bobber) { bobber = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); scene.add(bobber); }
    bobber.position.set(w.x, 0.16, w.z); bobber.visible = true; SFX.play('swing'); say('Line cast... wait for a bite.');
  }
  function endFish() { fish = null; if (bobber) bobber.visible = false; var e = $('#eat'); if (e) e.style.display = 'none'; }
  function fishTick(dt) {
    if (!fish) return; var it = curItem();
    if (it.tool !== 'rod' || Math.hypot(P.x - fish.px, P.z - fish.pz) > 3) { endFish(); say('Fishing canceled.', true); return; }
    fish.fp -= (it.power || 5) * dt; if (bobber) bobber.position.y = 0.16 + Math.sin(T * 5) * 0.03;
    $('#eat').style.display = 'block'; $('#eat i').style.width = clamp((1 - fish.fp / fish.fp0) * 100, 0, 100) + '%'; $('#eat span').textContent = 'Fishing...';
    if (fish.fp <= 0) catchFish();
  }
  function catchFish() {
    var id = fish.id, fx = fish.x, fz = fish.z; endFish(); SFX.play('loot');
    if (id === 'zombie_fish') {
      var ang = Math.atan2(fz - P.z, fx - P.x), sx = P.x - Math.cos(ang) * 1.6, sz = P.z - Math.sin(ang) * 1.6; say('It is a Zombie Fish!', true);
      if (mp.role === 'client') Net.send({ t: 'spz', x: r2(sx), z: r2(sz) }); else zombies.push(makeZombie('zfish', sx, sz)); return;
    }
    if (id === 'crate_t1') {
      say('You pulled up a Floating Wooden Crate!'); var got = {};
      for (var i = 0; i < WZ.LOOT.crate1.rolls; i++) { var lid = WZ.rollLoot('crate1', rnd); got[lid] = (got[lid] || 0) + 1; }
      Object.keys(got).forEach(function (k) { give(k, got[k]); say('+' + got[k] + ' ' + ITEMS[k].name); }); return;
    }
    give(id, 1); say('Caught: ' + ITEMS[id].name + '!');
  }
  function addTracer(len) {
    var o = new THREE.Vector3(camera.position.x, camera.position.y - 0.15, camera.position.z), tg = o.clone().add(DIR.clone().multiplyScalar(len)), m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    m.position.copy(o).add(tg).multiplyScalar(0.5); m.lookAt(tg); m.scale.set(0.03, 0.03, len); scene.add(m); tracers.push({ m: m, t: 0.12 });
  }
  function shootBow() {
    if (count('arrow') < 1) { say('No arrows! Craft Arrows first.', true); swingCd = 0.4; return; }
    take('arrow', 1); swingCd = 0.9; mp.swingPulse = 0.25; SFX.play('swing'); var it = curItem(), h = aim(48);
    camera.getWorldDirection(DIR); addTracer(h ? h.t : 48);
    if (h && h.kind === 'zombie') { SFX.play('hit'); if (mp.role === 'client') { h.z.flash = 0.14; Net.send({ t: 'hitZ', id: h.z.id, dmg: it.dmg }); } else hitZombie(h.z, it.dmg, 'self'); }
  }
  function spawnVirus(x, z, dx, dz, vis, kind) {
    var acid = kind === 'acid', m = new THREE.Mesh(new THREE.SphereGeometry(acid ? 0.3 : 0.22, 8, 6), new THREE.MeshBasicMaterial({ color: acid ? 0xb6ff00 : 0x39ff88 })); m.position.set(x, 1.3, z); scene.add(m);
    virus.push({ m: m, x: x, z: z, dx: dx, dz: dz, life: 1.6, vis: vis, kind: kind || 'virus' });
  }
  function fireVirus(z, tgt) {
    var dx = tgt.x - z.x, dz = tgt.z - z.z, l = Math.hypot(dx, dz) || 1, kind = z.def.ranged === 'acid' ? 'acid' : 'virus'; spawnVirus(z.x, z.z, dx / l, dz / l, mp.role === 'client', kind);
    if (mp.role === 'host') Net.send({ t: 'vp', x: r2(z.x), z: r2(z.z), dx: r2(dx / l), dz: r2(dz / l), k: kind });
  }
  /* Acidic Poison: every hit stacks (max 3) and makes the poison 3x deadlier: 1, 3, 9 damage per second for 10 s (ignores armor) */
  function applyAcid() { status.acidN = Math.min(3, status.acidN + 1); status.acid = 10; say('Acidic Poison! x' + Math.pow(3, status.acidN - 1) + ' deadlier', true); SFX.play('hurt'); }
  function stepVirus(dt) {
    for (var i = virus.length - 1; i >= 0; i--) {
      var v = virus[i], gone = false; v.x += v.dx * 9 * dt; v.z += v.dz * 9 * dt; v.m.position.x = v.x; v.m.position.z = v.z; v.life -= dt;
      if (v.life <= 0 || W.hit(v.x - 0.1, v.x + 0.1, 1.2, 1.4, v.z - 0.1, v.z + 0.1)) gone = true;
      else if (!v.vis) {
        if (!dead && Math.hypot(P.x - v.x, P.z - v.z) < 0.8 && P.y < 2) { if (v.kind === 'acid') applyAcid(); else infectKeys(8); gone = true; }
        else if (mp.role === 'host') for (var pid in mp.peers) { var pr = mp.peers[pid]; if (!pr.dead && Math.hypot(pr.x - v.x, pr.z - v.z) < 0.8) { Net.send({ t: 'virus', to: pid, k: v.kind }); gone = true; break; } }
      }
      if (gone) { scene.remove(v.m); virus.splice(i, 1); }
    }
  }
  /* Underground miners: Miner Zombie Walkers spawn only underground, near players who are underground (max 10). They vanish when nobody is underground. */
  function mineLogic(dt) {
    mineT -= dt; if (mineT > 0 || !W.ug) return; mineT = 5;
    var ugp = []; if (!dead && inUG(P.x)) ugp.push(P); for (var pid in mp.peers) if (!mp.peers[pid].dead && inUG(mp.peers[pid].x)) ugp.push(mp.peers[pid]);
    var n = 0, i; zombies.forEach(function (z) { if (z.type === 'miner') n++; });
    if (!ugp.length) { if (n) for (i = zombies.length - 1; i >= 0; i--) if (zombies[i].type === 'miner') { scene.remove(zombies[i].g); delete zMap[zombies[i].id]; zombies.splice(i, 1); } return; }
    if (n >= 10) return; var pl = ugp[(rnd() * ugp.length) | 0];
    for (var tr = 0; tr < 30; tr++) { var c = W.ug.open[(rnd() * W.ug.open.length) | 0], d = Math.hypot(c[0] - pl.x, c[1] - pl.z); if (d > 20 && d < 75) { zombies.push(makeZombie('miner', c[0], c[1])); return; } }
  }
  /* Loot cars: every car has 10-25 Break Points; breaking it opens the trunk. Loot tier is random 2..world tier (max 5); world tier 1 gives crate tier 1. */
  function applyCarHit(e, bd, pid) {
    if (!e.alive) return; e.hp -= Math.max(1, Math.round(bd / 2));
    if (e.hp <= 0) {
      var wt = worldTier(clockInfo(T).day), tier = wt < 2 ? 1 : 2 + ((rnd() * (Math.min(5, wt) - 1)) | 0), key = e.truck ? (wt >= 3 ? 'truck3' : 'truck') : 'crate' + tier, lname = e.truck ? 'Iron Crate (Tier ' + Math.min(5, wt) + ')' : WZ.LOOT[key].name, rolls = WZ.LOOT[key].rolls || 3, got = {};
      for (var i = 0; i < rolls; i++) { var id = WZ.rollLoot(key, rnd); got[id] = (got[id] || 0) + 1; }
      if (pid === 'self') say((e.truck ? 'Truck opened! (' : 'Trunk opened! (') + lname + ')'); else if (mp.role === 'host') Net.send({ t: 'say', to: pid, msg: (e.truck ? 'Truck opened! (' : 'Trunk opened! (') + lname + ')' });
      Object.keys(got).forEach(function (id) {
        if (pid === 'self') { give(id, got[id]); say('+' + got[id] + ' ' + ITEMS[id].name); }
        else if (mp.role === 'host') Net.send({ t: 'give', to: pid, id: id, n: got[id], msg: '+' + got[id] + ' ' + ITEMS[id].name });
      });
      W.setCar(e, false);
    }
    if (mp.role === 'host') Net.send({ t: 'ent', k: 'car', idx: e.idx, hp: Math.round(e.hp), alive: e.alive });
  }
  /* Underground doors */
  function enterUG() {
    ugCd = 2; P.x = W.ug.spawn.x; P.z = W.ug.spawn.z; P.y = 0; P.vx = P.vz = P.vy = 0; ugOn = true; W.setUnderground(true); torchOn = true; chunkT = 0;
    say('You went underground. Find the glowing yellow marker to return to the surface.');
  }
  function exitUG() {
    ugCd = 2; P.x = W.mine.entrance.x; P.z = W.mine.entrance.z; P.y = 0; P.vx = P.vz = P.vy = 0; ugOn = false; W.setUnderground(false); applyGfx(); say('Back on the surface.');
  }
  function cookTick(dt) {
    if (!cooking.length || !nearArr(W.camps)) return; cooking[0].t -= dt;
    if (cooking[0].t <= 0) { var c = cooking.shift(); give(c.out, 1); say('+1 ' + ITEMS[c.out].name + ' (cooked)'); SFX.play('craft'); }
  }
  function toggleDebug() { dbgOn = !dbgOn; var d = $('#dbg'); if (d) d.style.display = dbgOn ? 'block' : 'none'; if (dbgOn) renderDebug(); }
  function renderDebug() {
    var d = $('#dbg'); if (!d || !renderer) return; var ri = renderer.info || { render: {}, memory: {} };
    d.textContent = 'FPS ' + fpsVal + '\nZombies active ' + zombies.length + ' / dormant ' + dorm.n + ' (' + dorm.n * 16 + ' B)\nChunks ' + (W && W.chunks ? W.shownChunks + '/' + W.chunks.size : 0) + ' · RD ' + (gfx.rd >= 9999 ? 'inf' : gfx.rd) + ' ED ' + (gfx.ed >= 9999 ? 'inf' : gfx.ed) + '\nChunk ' + (W ? W.chunkOf(P.x, P.y, P.z).join(',') : '') + '\nBlocks ' + (W ? W.voxCount() : 0) + '/' + (W ? W.MAX_VOX : 0) + '\nDraw calls ' + (ri.render.calls || 0) + '\nTriangles ' + (ri.render.triangles || 0) + '\nPos ' + r2(P.x) + ', ' + r2(P.y) + ', ' + r2(P.z) + '\nRoom ' + (mp.role === 'solo' ? 'solo' : mp.room + ' (' + totalPlayers() + ')') + '\nT ' + Math.round(T) + 's';
  }

  /* ---------------- Zombies ---------------- */
  var BOX = new THREE.BoxGeometry(1, 1, 1), EYE = new THREE.MeshBasicMaterial({ color: 0xff3030 }), FLASH_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xaa2222 }), Z_MATS = Object.create(null), MAT_YEL = new THREE.MeshLambertMaterial({ color: 0xe3b02a }), MAT_GLASS = new THREE.MeshBasicMaterial({ color: 0x66ccff }), MAT_ACID = new THREE.MeshBasicMaterial({ color: 0xb6ff00 }), MAT_STEEL = new THREE.MeshLambertMaterial({ color: 0x8b9096 }), SHADOW_GEO = new THREE.CircleGeometry(0.5, 12), SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
  function tint(c, k) { var col = new THREE.Color(c); col.multiplyScalar(1 + k); return col; }
  function getZMats(type) {
    if (Z_MATS[type]) return Z_MATS[type]; var d = ZDEF[type];
    return (Z_MATS[type] = { skin: new THREE.MeshLambertMaterial({ color: d.color }), cloth: new THREE.MeshLambertMaterial({ color: tint(d.color, -0.4) }), pants: new THREE.MeshLambertMaterial({ color: tint(d.color, -0.6) }), helmet: type === 'soldier' ? new THREE.MeshLambertMaterial({ color: 0x2f4a2c }) : null, bombGlow: type === 'bomber' ? new THREE.MeshBasicMaterial({ color: 0xff7a1a }) : null, pack: type === 'bomber' ? new THREE.MeshLambertMaterial({ color: 0x3a2a1e }) : null });
  }
  function makeZombie(type, x, z, forcedId) {
    var d = ZDEF[type], m = getZMats(type), g = new THREE.Group(), sw = [], mobTag = (g.userData.mob = true), wide = type === 'big' || type === 'brute' ? 1.25 : type === 'bomber' ? 1.3 : type === 'spider' ? 1.5 : type === 'gigantus' ? 1.5 : type === 'armored' ? 1.3 : 1;
    function bx(w, h, dd, mat, px, py, pz, p, fl) { var o = new THREE.Mesh(BOX, mat); o.scale.set(w, h, dd); o.position.set(px, py, pz); (p || g).add(o); if (fl) sw.push({ mesh: o, orig: mat }); }
    bx(0.52 * wide, 0.7, 0.3 * wide, m.cloth, 0, 1.05, 0, null, true); bx(0.32, 0.32, 0.32, m.skin, 0, 1.55, 0, null, true);
    bx(0.07, 0.05, 0.02, EYE, -0.08, 1.58, -0.17); bx(0.07, 0.05, 0.02, EYE, 0.08, 1.58, -0.17);
    var lL = new THREE.Group(), lR = new THREE.Group(), aL = new THREE.Group(), aR = new THREE.Group();
    lL.position.set(-0.14 * wide, 0.7, 0); lR.position.set(0.14 * wide, 0.7, 0); aL.position.set(-0.36 * wide, 1.38, 0); aR.position.set(0.36 * wide, 1.38, 0);
    [lL, lR, aL, aR].forEach(function (p) { g.add(p); });
    bx(0.2, 0.7, 0.22, m.pants, 0, -0.35, 0, lL); bx(0.2, 0.7, 0.22, m.pants, 0, -0.35, 0, lR);
    bx(0.15, 0.62, 0.15, m.skin, 0, -0.3, 0, aL, true); bx(0.15, 0.62, 0.15, m.skin, 0, -0.3, 0, aR, true);
    aL.rotation.x = aR.rotation.x = -1.35;
    if (type === 'soldier') bx(0.38, 0.17, 0.38, m.helmet, 0, 1.74, 0);
    if (type === 'bomber') { bx(0.34, 0.3, 0.05, m.bombGlow, 0, 1.1, -0.18 * wide); bx(0.3, 0.4, 0.14, m.pack, 0, 1.1, 0.2); }
    if (type === 'miner') { bx(0.38, 0.17, 0.38, MAT_YEL, 0, 1.74, 0); bx(0.1, 0.1, 0.06, EYE, 0, 1.78, -0.2); }
    if (type === 'programmer') bx(0.36, 0.14, 0.05, MAT_GLASS, 0, 1.58, -0.19);
    if (type === 'spider') for (var sl = 0; sl < 4; sl++) { bx(0.9, 0.05, 0.05, m.skin, 0, 0.55, -0.25 + sl * 0.17); bx(0.05, 0.05, 0.05, EYE, 0.1 * (sl % 2 ? 1 : -1), 1.45, -0.19); }
    if (type === 'zfish') { bx(0.2, 0.12, 0.3, MAT_GLASS, 0, 0.6, 0.35); }
    if (type === 'antlion') { bx(0.04, 0.4, 0.04, MAT_YEL, -0.1, 1.85, -0.1); bx(0.04, 0.4, 0.04, MAT_YEL, 0.1, 1.85, -0.1); for (var al = 0; al < 3; al++) { bx(0.95, 0.05, 0.05, MAT_YEL, 0, 0.75, -0.2 + al * 0.2); } bx(0.5, 0.35, 0.6, m.cloth, 0, 0.95, 0.4); }
    if (type === 'zcorpion') { bx(0.12, 0.12, 0.3, m.skin, 0, 0.95, 0.3); bx(0.12, 0.3, 0.12, m.skin, 0, 1.15, 0.5); bx(0.12, 0.12, 0.3, m.skin, 0, 1.35, 0.35); bx(0.08, 0.08, 0.2, MAT_ACID, 0, 1.4, 0.15); bx(0.28, 0.12, 0.22, m.skin, -0.55, 1.05, -0.35); bx(0.28, 0.12, 0.22, m.skin, 0.55, 1.05, -0.35); }
    if (type === 'gigantus') { bx(0.2, 0.3, 0.2, m.cloth, -0.5, 1.5, 0); bx(0.2, 0.3, 0.2, m.cloth, 0.5, 1.5, 0); bx(0.06, 0.06, 0.02, EYE, 0, 1.64, -0.17); }
    if (type === 'armored') { bx(0.66, 0.6, 0.4, MAT_STEEL, 0, 1.08, 0); bx(0.38, 0.38, 0.38, MAT_STEEL, 0, 1.58, 0); bx(0.3, 0.05, 0.02, EYE, 0, 1.58, -0.2); bx(0.22, 0.5, 0.26, MAT_STEEL, -0.18 * wide, 0.35, 0); bx(0.22, 0.5, 0.26, MAT_STEEL, 0.18 * wide, 0.35, 0); }
    var sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.07; sh.scale.set(0.95 * wide, 0.95 * wide, 1); sh.visible = gfx.shadow; g.add(sh);
    g.scale.setScalar(d.scale); g.position.set(x, 0, z); scene.add(g);
    var id = forcedId != null ? forcedId : nextZid++, zb = { id: id, type: type, ti: ZTYPES.indexOf(type), def: d, g: g, x: x, y: 0, z: z, tx: x, tz: z, try: 0, hp: d.hp, rad: 0.32 * Math.sqrt(d.scale) * wide * 0.9, r2: Math.pow(0.52 * d.scale * wide, 2), h: 1.9 * d.scale, cd: 0.4, anim: rnd() * 6, legs: [lL, lR], arms: [aL, aR], swaps: sw, flash: 0, flashing: false };
    zb.sh = sh; zMap[id] = zb; return zb;
  }
  /* ---- Dormant zombies: 256 bits (8 x 32-bit words) per zombie. Max 150 zombies in total. ----
     word0: type(5 bits) | hp 0..4095 (12 bits)    word1: x (float32)   word2: z (float32)   word3: heading (float32)
     word4: age in 0.1 s     word5: personal random seed     word6: zombie id     word7: checksum of words 0-6 (bad records are dropped) */
  var DMAX = 192, ZCAP = 150, DBUF = new ArrayBuffer(4 * 8 * DMAX), DU = new Uint32Array(DBUF), DF = new Float32Array(DBUF);
  function dSum(o) { var h = 2166136261; for (var k = 0; k < 7; k++) { h ^= DU[o + k]; h = Math.imul(h, 16777619); } return h >>> 0; }
  function dAdd(ti, x, z, hpf, rot, id) {
    if (dorm.n >= DMAX) return false; var o = dorm.n * 8;
    DU[o] = ((ti & 31) | (Math.round(clamp(hpf, 0, 1) * 4095) << 5)) >>> 0; DF[o + 1] = x; DF[o + 2] = z; DF[o + 3] = rot; DU[o + 4] = Math.round(T * 10) >>> 0; DU[o + 5] = (Math.random() * 4294967296) >>> 0; DU[o + 6] = id >>> 0; DU[o + 7] = dSum(o); dorm.n++; return true;
  }
  function dDel(i) { var last = dorm.n - 1, k; if (i !== last) for (k = 0; k < 8; k++) DU[i * 8 + k] = DU[last * 8 + k]; dorm.n--; }
  function dormNear(r) { var c = 0; for (var i = 0; i < dorm.n; i++) if (Math.hypot(DF[i * 8 + 1] - P.x, DF[i * 8 + 2] - P.z) < r) c++; return c; }
  function dormCount(excludeBoss) { var c = 0; for (var i = 0; i < dorm.n; i++) { var d = ZDEF[ZTYPES[DU[i * 8] & 31]]; if (d && !(excludeBoss && d.boss)) c++; } return c; }
  function onSurface(x) { return x <= W.half + 50; }
  function inUG(x) { return x > W.half + 50; }
  function targets() { var a = []; if (!dead && onSurface(P.x)) a.push({ x: P.x, z: P.z }); for (var pid in mp.peers) { var pr = mp.peers[pid]; if (!pr.dead && pr.hp > 0 && onSurface(pr.x)) a.push({ x: pr.x, z: pr.z }); } return a; }
  function nearestT(tg, x, z) { var bd = 1e9, b = null; for (var i = 0; i < tg.length; i++) { var d = Math.hypot(tg[i].x - x, tg[i].z - z); if (d < bd) { bd = d; b = tg[i]; } } return { d: bd, t: b }; }
  function hydrate(i) {
    var o = i * 8, ti = DU[o] & 31, hpf = ((DU[o] >>> 5) & 4095) / 4095, x = DF[o + 1], z = DF[o + 2], rot = DF[o + 3], id = DU[o + 6]; dDel(i);
    var zb = makeZombie(ZTYPES[ti], x, z, id); zb.hp = Math.max(1, Math.round(hpf * zb.def.hp)); zb.g.rotation.y = rot; zb.try = rot; zombies.push(zb);
  }
  function dormTick(dt) {
    dorm.t += dt; if (dorm.t < 0.5) return; var st = dorm.t; dorm.t = 0; var tg = targets(); if (!tg.length) return; var E = edMeters(), i;
    for (i = dorm.n - 1; i >= 0; i--) {
      var o = i * 8; if (dSum(o) !== DU[o + 7]) { dDel(i); continue; }
      var ti = DU[o] & 31, type = ZTYPES[ti], d = ZDEF[type]; if (!d) { dDel(i); continue; }
      var x = DF[o + 1], z = DF[o + 2], nt = nearestT(tg, x, z); if (nt.d < E) { hydrate(i); continue; }
      var hpf = ((DU[o] >>> 5) & 4095) / 4095, sp = d.spd * 2.2 * (d.rage && hpf < 0.2 ? 2 : 1), mv = Math.min(nt.d - E + 1, sp * st), dx = nt.t.x - x, dz = nt.t.z - z;
      x += dx / nt.d * mv; z += dz / nt.d * mv; DF[o + 1] = x; DF[o + 2] = z; DF[o + 3] = Math.atan2(-dx, -dz); DU[o + 7] = dSum(o);
    }
    if (E < 1e8) for (i = zombies.length - 1; i >= 0; i--) {
      var zb = zombies[i]; if (zb.type === 'miner' || zb.type === 'zfish' || dorm.n >= DMAX) continue;
      if (nearestT(tg, zb.x, zb.z).d > E + 30) { dAdd(zb.ti, zb.x, zb.z, zb.hp / zb.def.hp, zb.g.rotation.y, zb.id); scene.remove(zb.g); zombies.splice(i, 1); delete zMap[zb.id]; }
    }
  }
  function placeZombie(type, x, z) {
    var tg = targets(), bd = nearestT(tg, x, z).d;
    if (tg.length && bd > edMeters() && type !== 'miner' && type !== 'zfish' && dorm.n < DMAX) { dAdd(ZTYPES.indexOf(type), x, z, 1, 0, nextZid++); return; }
    zombies.push(makeZombie(type, x, z));
  }
  function ringPoint(ref) {
    var H = WZ.SPAWN_HALF, best = null;
    for (var j = 0; j < 3; j++) { var side = (rnd() * 4) | 0, t = (rnd() * 2 - 1) * H, x = side < 2 ? t : (side === 2 ? -H : H), z = side < 2 ? (side === 0 ? -H : H) : t, d = Math.hypot(x - ref.x, z - ref.z); if (!best || d < best.d) best = { x: x, z: z, d: d }; }
    return best;
  }
  /* spawn rule: weight = base weight x rarity factor (rare 1/4, epic 1/10, legendary 1/25, mythical 1/100); tier gate by world day; desert-only mobs need a desert spawn point; bosses/mini-bosses never use this */
  function spawnZombie() {
    var tg = targets(); if (!tg.length) return; var ref = tg[(rnd() * tg.length) | 0], best = null;
    if (W.graves && W.graves.length && rnd() < 0.4) { /* graveyards: 40% of spawns come from a graveyard 50-450 m from a player */
      var cand = W.graves.filter(function (g) { var dd = Math.hypot(g.x - ref.x, g.z - ref.z); return dd > 50 && dd < 450; });
      if (cand.length) { var gv = cand[(rnd() * cand.length) | 0]; best = { x: gv.x + (rnd() - 0.5) * gv.r, z: gv.z + (rnd() - 0.5) * gv.r }; }
    }
    if (!best) best = ringPoint(ref); var biome = W.biomeOf(best.x, best.z), tier = worldTier(clockInfo(T).day);
    var pool = [], sum = 0; for (var k in ZDEF) { var d = ZDEF[k]; if (d.nospawn || d.boss) continue; if (d.tier > tier) continue; if (d.biome && d.biome !== biome) continue; var wgt = d.w * (WZ.RARITY[d.rarity] || 0); if (wgt <= 0) continue; pool.push([k, wgt]); sum += wgt; }
    if (!pool.length) return; var r = rnd() * sum, type = pool[0][0]; for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) { type = pool[i][0]; break; } }
    placeZombie(type, best.x, best.z);
  }
  function ann(msg) { say(msg, true); if (mp.role === 'host') Net.send({ t: 'ann', msg: msg }); }
  function bossAlive(type) { var ti = ZTYPES.indexOf(type), i; for (i = 0; i < zombies.length; i++) if (zombies[i].type === type) return true; for (i = 0; i < dorm.n; i++) if ((DU[i * 8] & 31) === ti) return true; return false; }
  /* boss rule: Gigantus Zombie appears ONCE when day 10 starts (tier 1->2); Armored-Full Zombie Mk-1 ONCE at day 30 (tier 2->3). bf[i]: 0 not spawned, 1 alive, 2 dead */
  function bossLogic(dt) {
    bossT -= dt; if (bossT > 0) return; bossT = 3; var day = clockInfo(T).day, tg = targets(); if (!tg.length) return;
    [['gigantus', 10, 'GIGANTUS ZOMBIE has appeared! The world is entering Tier 2...'], ['armored', 30, 'ARMORED-FULL ZOMBIE Mk-1 has appeared! The world is entering Tier 3...']].forEach(function (b, bi) {
      if (day >= b[1] && bf[bi] !== 2 && !bossAlive(b[0])) { var pt = ringPoint(tg[0]); placeZombie(b[0], pt.x, pt.z); if (bf[bi] === 0) ann(b[2]); bf[bi] = 1; }
    });
  }
  function explode(z) {
    var s = z.def.splash || 4; if (mp.role === 'host') Net.send({ t: 'boom', x: r2(z.x), y: r2(z.y), z: r2(z.z), dmg: z.def.dmg, splash: s, zid: z.id });
    var d = Math.hypot(P.x - z.x, P.y + 0.9 - z.y - 0.9, P.z - z.z); if (d < s) hurt(Math.round(z.def.dmg * (1 - Math.max(0, d - 1.5) / (s - 1.5 + 0.001))));
    if (mp.role !== 'client') { var cx = Math.floor(z.x), cz = Math.floor(z.z), R = Math.ceil(s - 1); for (var x = cx - R; x <= cx + R; x++) for (var y = 0; y <= 4; y++) for (var q = cz - R; q <= cz + R; q++) if (W.getVox(x, y, q) && Math.hypot(x + 0.5 - z.x, y + 0.5 - 1, q + 0.5 - z.z) < s) damageVoxLocal(x, y, q, z.def.dmg, null); }
    SFX.play('boom'); scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); delete zMap[z.id];
  }
  function updateZombieVisuals(z, dt) {
    var sw = Math.sin(z.anim) * 0.7; z.legs[0].rotation.x = sw; z.legs[1].rotation.x = -sw;
    z.arms[0].rotation.x = -1.35 + Math.sin(z.anim * 0.5) * 0.15; z.arms[1].rotation.x = -1.35 - Math.sin(z.anim * 0.5) * 0.15;
    if (z.flash > 0) { z.flash -= dt; if (!z.flashing) { z.flashing = true; z.swaps.forEach(function (s) { s.mesh.material = FLASH_MAT; }); } }
    else if (z.flashing) { z.flashing = false; z.swaps.forEach(function (s) { s.mesh.material = s.orig; }); }
  }
  var ANG = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
  function zombieHit(z, tgt) {
    var d = z.def, reach = (1.15 + d.scale * 0.35) * (d.rng || 1);
    function one(isSelf, pid) { if (isSelf) { hurt(d.dmg); if (d.wpoison) applyWaterPoison(); } else if (mp.role === 'host') Net.send({ t: 'hurt', to: pid, dmg: d.dmg, wp: d.wpoison ? 1 : 0 }); }
    one(tgt.isSelf, tgt.pid);
    if (d.splash && z.type !== 'bomber') { /* SPLASH: other players next to the zombie get hit too */
      if (!tgt.isSelf && !dead && onSurface(P.x) && Math.hypot(P.x - z.x, P.z - z.z) < reach + d.splash) one(true);
      for (var pid in mp.peers) { var pr = mp.peers[pid]; if ((tgt.isSelf || pid !== tgt.pid) && !pr.dead && pr.hp > 0 && Math.hypot(pr.x - z.x, pr.z - z.z) < reach + d.splash) one(false, pid); }
    }
  }
  function stepZombie(z, dt) {
    var tgt = null, bd = 1e9;
    if (!dead && (z.type === 'miner' ? inUG(P.x) : onSurface(P.x))) { bd = Math.hypot(P.x - z.x, P.z - z.z); tgt = { isSelf: true, x: P.x, y: P.y, z: P.z, d: bd }; }
    for (var pid in mp.peers) { var pr = mp.peers[pid]; if (pr.dead || pr.hp <= 0 || (z.type === 'miner' ? !inUG(pr.x) : !onSurface(pr.x))) continue; var pd = Math.hypot(pr.x - z.x, pr.z - z.z); if (pd < bd) { bd = pd; tgt = { isSelf: false, pid: pid, x: pr.x, y: pr.y, z: pr.z, d: pd }; } }
    if (!tgt) return;
    var dx = tgt.x - z.x, dz = tgt.z - z.z, dist = tgt.d, base = Math.atan2(dz, dx), sp = z.def.spd * 2.2 * (z.def.rage && z.hp < z.def.hp * 0.2 ? 2 : 1), reach = (1.15 + z.def.scale * 0.35) * (z.def.rng || 1);
    if (z.type === 'miner' && dist > 22) { updateZombieVisuals(z, dt); return; }
    if (z.def.ranged) { z.vcd = (z.vcd == null ? 2 : z.vcd) - dt; if (dist > 3 && dist < 14 && z.vcd <= 0) { z.vcd = z.def.ranged === 'acid' ? 3 : 4; fireVirus(z, tgt); } }
    z.cd -= dt; z.anim += dt * sp * 2.2;
    if (dist > 0.01 && Math.abs(tgt.y - z.y) < 2.2 && dist < reach) {
      if (z.type === 'bomber') { explode(z); return; }
      if (z.cd <= 0) { z.cd = z.def.cd; zombieHit(z, tgt); }
    }
    if (z.type === 'bomber' && dist < 2.1 && Math.abs(tgt.y - z.y) < 2.2) { explode(z); return; }
    var moved = false, hitInfo = null;
    for (var a = 0; a < ANG.length && !moved; a++) { var ang = base + ANG[a], mx = Math.cos(ang) * sp * dt, mz = Math.sin(ang) * sp * dt, i = W.hit(z.x + mx - z.rad, z.x + mx + z.rad, 0.05, 1.7, z.z + mz - z.rad, z.z + mz + z.rad); if (!i) { z.x += mx; z.z += mz; moved = true; } else if (a === 0) hitInfo = { vox: i.vox }; }
    if (!moved && hitInfo && hitInfo.vox != null && z.cd <= 0) { if (z.type === 'bomber') { explode(z); return; } z.cd = z.def.cd || 1; var c = unkey(hitInfo.vox); damageVoxLocal(c[0], c[1], c[2], z.def.dmg * 3, null); SFX.play('wood'); }
    for (var k = 0; k < zombies.length; k++) { var o = zombies[k]; if (o === z) continue; var ex = z.x - o.x, ez = z.z - o.z, d2 = ex * ex + ez * ez; if (d2 < 0.5 && d2 > 0.0001) { var d = Math.sqrt(d2), pp = (0.7 - d) * 0.5; z.x += ex / d * pp * dt * 6; z.z += ez / d * pp * dt * 6; } }
    z.g.position.set(z.x, 0, z.z); if (dist > 0.01) z.g.rotation.y = Math.atan2(-dx, -dz); updateZombieVisuals(z, dt);
  }
  function zombieCap() { return Math.min(ZCAP, Math.round((16 + Math.floor(T / 60) * 3 + (mp.role === 'host' ? (totalPlayers() - 1) * 4 : 0)) * 0.9 * (bloodOn ? 2 : 1))); }
  function zombieLogic(dt, isNight) {
    groanT -= dt;
    if (groanT <= 0) {
      groanT = 4 + rnd() * 5;
      for (var g = 0; g < zombies.length; g++) if (Math.hypot(zombies[g].x - P.x, zombies[g].z - P.z) < 18) { SFX.play('groan'); break; }
    }
    if (mp.role === 'client') {
      var f = Math.min(1, dt * 12);
      for (var i = 0; i < zombies.length; i++) { var z = zombies[i], dx = z.tx - z.x, dz = z.tz - z.z, mv = Math.hypot(dx, dz); z.x += dx * f; z.z += dz * f; z.g.visible = entVisible(z.x, z.z); if (!z.g.visible) continue; z.g.position.set(z.x, 0, z.z); z.g.rotation.y = z.try; z.anim += dt * (mv > 0.02 ? z.def.spd * 4.5 : 1.5); updateZombieVisuals(z, dt); }
      return;
    }
    if (T < 30) return; /* first 30 seconds of a new world: no zombies spawn */
    spawnT -= dt;
    var cap = zombieCap(), interval = (Math.max(1.2, 6 - T / 120) / 0.9) * (isNight ? 0.8 : 1) / (bloodOn ? 2 : 1);
    mineLogic(dt); bossLogic(dt); dormTick(dt);
    var hostile = dormCount(true); for (var hz = 0; hz < zombies.length; hz++) { var zt = zombies[hz]; if (zt.type !== 'miner' && zt.type !== 'zfish' && !zt.def.boss) hostile++; }
    if (spawnT <= 0 && hostile < cap) { spawnZombie(); spawnT = interval; }
    for (var j = zombies.length - 1; j >= 0; j--) { var zz = zombies[j]; zz.g.visible = entVisible(zz.x, zz.z); stepZombie(zz, dt); }
  }

  /* ---------------- Multiplayer avatars & sync ---------------- */
  function makeNameSprite(name, slot) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; var ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(15,12,10,0.75)'; ctx.fillRect(16, 10, 224, 44); ctx.strokeStyle = SLOT_HEX[slot % 4]; ctx.lineWidth = 4; ctx.strokeRect(16, 10, 224, 44);
    ctx.fillStyle = '#f1ece2'; ctx.font = 'bold 26px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 128, 33);
    var tex = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(1.6, 0.4, 1); sp.position.set(0, 2.2, 0); return { sprite: sp, tex: tex };
  }
  function makeRemotePlayerMesh(slot, name) {
    var g = new THREE.Group(); g.userData.mob = true; var shirt = new THREE.MeshLambertMaterial({ color: SLOT_COLS[slot % 4] }), skin = new THREE.MeshLambertMaterial({ color: 0xd9b38c }), pants = new THREE.MeshLambertMaterial({ color: 0x2d333b });
    function bx(w, h, d, m, x, y, z, p) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); (p || g).add(o); }
    bx(0.5, 0.68, 0.28, shirt, 0, 1.05, 0); bx(0.32, 0.32, 0.32, skin, 0, 1.55, 0);
    var lL = new THREE.Group(), lR = new THREE.Group(), aR = new THREE.Group(); lL.position.set(-0.13, 0.7, 0); lR.position.set(0.13, 0.7, 0); aR.position.set(0.35, 1.35, 0); g.add(lL); g.add(lR); g.add(aR);
    bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lL); bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lR); bx(0.14, 0.6, 0.14, skin, -0.35, 1.05, 0); bx(0.14, 0.6, 0.14, skin, 0, -0.3, 0, aR);
    var tag = makeNameSprite(name, slot); g.add(tag.sprite); var psh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); psh.rotation.x = -Math.PI / 2; psh.position.y = 0.07; psh.scale.set(0.9, 0.9, 1); psh.visible = gfx.shadow; g.add(psh); scene.add(g); return { g: g, lL: lL, lR: lR, aR: aR, anim: 0, tag: tag, sh: psh };
  }
  function removePeer(pid) { var pr = mp.peers[pid]; if (!pr) return; if (pr.mesh) { scene.remove(pr.mesh.g); if (pr.mesh.tag && pr.mesh.tag.tex) pr.mesh.tag.tex.dispose(); } delete mp.peers[pid]; }
  function stepPeers(dt) {
    var now = performance.now(), f = Math.min(1, dt * 14);
    for (var pid in mp.peers) {
      var pr = mp.peers[pid]; if (now - pr.lastSeen > 9000) { say(pr.name + ' left the room.'); removePeer(pid); continue; }
      var dx = pr.tx - pr.x, dz = pr.tz - pr.z, spd = Math.hypot(dx, dz); pr.x += dx * f; pr.y += (pr.ty - pr.y) * f; pr.z += dz * f;
      pr.mesh.g.visible = !pr.dead && entVisible(pr.x, pr.z); pr.mesh.g.position.set(pr.x, pr.y, pr.z); pr.mesh.g.rotation.y = pr.tyaw;
      if (spd > 0.02) { pr.mesh.anim += dt * 10; var sw = Math.sin(pr.mesh.anim) * 0.65; pr.mesh.lL.rotation.x = sw; pr.mesh.lR.rotation.x = -sw; }
      else { pr.mesh.lL.rotation.x *= 0.8; pr.mesh.lR.rotation.x *= 0.8; }
      if (pr.sw > 0) { pr.sw -= dt; pr.mesh.aR.rotation.x = -1.4; } else pr.mesh.aR.rotation.x *= 0.8;
    }
    if (mp.role === 'client' && mp.lastHostSeen && now - mp.lastHostSeen > 9500) { say('Host disconnected. Continuing solo.', true); leaveRoom(); }
  }
  function leaveRoom() { Net.disconnect(); if (mp.joinTimer) { clearTimeout(mp.joinTimer); mp.joinTimer = null; } Object.keys(mp.peers).forEach(removePeer); mp.role = 'solo'; mp.room = ''; mp.slot = 0; mp.online = false; }
  function hostRoom(keep) {
    leaveRoom(); var code = Net.genCode(); mp.role = 'host'; mp.room = code; mp.slot = 0;
    if (!keep) { newWorld(); newPlayerState(0); coins = 0; kc = {}; T = 0; spawnT = 3; clearZombies(); }
    Net.start('host', code, onNetMessage, function (st) { mp.online = st.online; }); enterGame(); say('Room created! Code: ' + code + (T < 30 ? ' (30 seconds of safe time)' : ''));
  }
  function joinRoom(code) {
    leaveRoom(); var norm = Net.normalizeCode(code); mp.role = 'client'; mp.room = norm; mp.lastHostSeen = 0;
    screen('<div class="card"><span class="tag">Multiplayer</span><h1>Connecting...</h1><p>Looking for room <span class="code-pill">' + esc(norm) + '</span> ...</p><div class="row"><button class="btn" id="bCancelJoin">Cancel</button></div></div>');
    $('#bCancelJoin').onclick = function () { leaveRoom(); showMainMenu(); };
    var joined = false, switched = false;
    Net.start('client', norm, function (msg) {
      if (!joined && msg.t === 'welcome' && msg.to === Net.info().pid) {
        joined = true; clearTimeout(mp.joinTimer); mp.slot = msg.slot; mp.lastHostSeen = performance.now(); applySave(msg.snap, true); newPlayerState(mp.slot); clearZombies();
        (msg.zs || []).forEach(function (a) { var z = makeZombie(ZTYPES[a[1]] || 'walker', a[2], a[3], a[0]); z.hp = a[5]; z.try = a[4]; z.g.rotation.y = a[4]; zombies.push(z); });
        upsertPeer({ pid: msg.f, slot: 0, name: msg.hostName || 'Host', x: msg.hx, y: msg.hy, z: msg.hz, yaw: 0, hp: 100, dead: false });
        enterGame(); say('Joined room ' + norm + '!'); return;
      }
      if (!joined && msg.t === 'reject' && msg.to === Net.info().pid) { joined = true; leaveRoom(); showMainMenu(msg.reason || 'The room is full.'); return; }
      onNetMessage(msg);
    }, function (st) { mp.online = st.online; if (st.online && !joined) Net.send({ t: 'join', name: playerName }); });
    setTimeout(function () { if (!joined && mp.role === 'client') Net.send({ t: 'join', name: playerName }); }, 120);
    var rj = setInterval(function () { if (joined || mp.role !== 'client') { clearInterval(rj); return; } Net.send({ t: 'join', name: playerName }); }, 1100);
    mp.joinTimer = setTimeout(function () {
      if (!joined && mp.role === 'client' && !switched) { switched = true; Net.switchBroker(); mp.joinTimer = setTimeout(function () { clearInterval(rj); if (!joined && mp.role === 'client') { leaveRoom(); showMainMenu('Room "' + norm + '" was not found.'); } }, 4200); }
    }, 3800);
  }
  function upsertPeer(d) {
    var pr = mp.peers[d.pid];
    if (!pr) { pr = { pid: d.pid, slot: d.slot || 0, name: (d.name || 'Player').slice(0, 16), x: d.x || 0, y: d.y || 0, z: d.z || 0, tx: d.x || 0, ty: d.y || 0, tz: d.z || 0, tyaw: d.yaw || 0, hp: d.hp != null ? d.hp : 100, dead: !!d.dead, sw: 0, lastSeen: performance.now(), mesh: null }; pr.mesh = makeRemotePlayerMesh(pr.slot, pr.name); mp.peers[d.pid] = pr; }
    else { pr.tx = d.x; pr.ty = d.y; pr.tz = d.z; pr.tyaw = d.yaw || 0; pr.hp = d.hp != null ? d.hp : pr.hp; pr.dead = !!d.dead; if (d.sw) pr.sw = 0.22; pr.lastSeen = performance.now(); }
  }
  function packZombies() { var a = []; for (var i = 0; i < zombies.length; i++) { var z = zombies[i]; a.push([z.id, z.ti, r2(z.x), r2(z.z), r2(z.g.rotation.y), Math.round(z.hp)]); } return a; }
  function onNetMessage(msg) {
    if (mp.role === 'solo') return; var myPid = Net.info().pid;
    if (msg.t === 'bye') { if (mp.role === 'client' && mp.peers[msg.f] && mp.peers[msg.f].slot === 0) { say('The host closed the room. Continuing solo.', true); leaveRoom(); } else { if (mp.peers[msg.f]) say(mp.peers[msg.f].name + ' left.'); removePeer(msg.f); } return; }
    if (msg.t === 'mv') { if (mp.role === 'client' && msg.slot === 0) mp.lastHostSeen = performance.now(); upsertPeer({ pid: msg.f, slot: msg.slot, name: msg.n, x: msg.x, y: msg.y, z: msg.z, yaw: msg.yw, hp: msg.hp, dead: msg.d, sw: msg.sw }); return; }
    if (msg.t === 'corpse') { if (!corpses.some(function (c) { return c.id === msg.id; })) addCorpse(msg.x, msg.z, null, false, msg.n, msg.id); return; }
    if (msg.t === 'corpseGone') { var cg = corpses.filter(function (c) { return c.id === msg.id; })[0]; if (cg) removeCorpse(cg); return; }
    if (msg.t === 'vp') { spawnVirus(msg.x, msg.z, msg.dx, msg.dz, true, msg.k); return; }
    if (msg.t === 'ann') { say(msg.msg, true); return; }
    if (mp.role === 'host') {
      if (msg.t === 'spz') { zombies.push(makeZombie('zfish', msg.x, msg.z)); }
      else if (msg.t === 'join') {
        if (mp.peers[msg.f]) { Net.send({ t: 'welcome', to: msg.f, slot: mp.peers[msg.f].slot, hostName: playerName, hx: r2(P.x), hy: r2(P.y), hz: r2(P.z), snap: snapshot(true), zs: packZombies() }); return; }
        var used = [true, false, false, false]; for (var p in mp.peers) used[mp.peers[p].slot] = true; var slot = -1; for (var s = 1; s < MAX_PLAYERS; s++) if (!used[s]) { slot = s; break; }
        if (slot < 0) { Net.send({ t: 'reject', to: msg.f, reason: 'The room is full (maximum ' + MAX_PLAYERS + ' players).' }); return; }
        var nm = (msg.name || ('Player ' + (slot + 1))).slice(0, 16);
        upsertPeer({ pid: msg.f, slot: slot, name: nm, x: W.spawn.x + (slot % 2) * 1.4, y: 0, z: W.spawn.z + Math.floor(slot / 2) * 1.4, yaw: 0, hp: 100, dead: false });
        say(nm + ' joined! (' + totalPlayers() + '/' + MAX_PLAYERS + ')');
        Net.send({ t: 'welcome', to: msg.f, slot: slot, hostName: playerName, hx: r2(P.x), hy: r2(P.y), hz: r2(P.z), snap: snapshot(true), zs: packZombies() });
      } else if (msg.t === 'hitZ') { var z = zMap[msg.id]; if (z) hitZombie(z, msg.dmg || 4, msg.f); }
      else if (msg.t === 'tload') { var tl = turretAt(msg.x, msg.y, msg.z); if (tl) { tl.ammo = Math.min(tcfg(tl).cap, tl.ammo + Math.max(0, msg.n | 0)); Net.send({ t: 'tam', x: msg.x, y: msg.y, z: msg.z, a: tl.ammo }); } }
      else if (msg.t === 'dmgVox') damageVoxLocal(msg.x, msg.y, msg.z, msg.dmg || 2, msg.f);
      else if (msg.t === 'hitEnt') { var e = (msg.k === 'tree' ? W.trees : msg.k === 'car' ? W.cars : W.rocks)[msg.idx]; if (e && e.alive) { if (msg.k === 'car') applyCarHit(e, msg.bd || 1, msg.f); else applyEntHit(e, msg.bd || 1, msg.f); } }
      else if (msg.t === 'search') { var se = (msg.k === 'pile' ? W.piles : W.crates)[msg.idx]; if (se) applySearchEnt(se, msg.f); }
      else if (msg.t === 'place') {
        if (!W.getVox(msg.x, msg.y, msg.z) && !W.hit(msg.x + 0.02, msg.x + 0.98, msg.y + 0.02, msg.y + 0.98, msg.z + 0.02, msg.z + 0.98) && W.setVox(msg.x, msg.y, msg.z, msg.vt, msg.hp)) {
          voxVer++; Net.send({ t: 'vox', op: 1, x: msg.x, y: msg.y, z: msg.z, vt: msg.vt, hp: msg.hp });
        } else if (msg.item) Net.send({ t: 'give', to: msg.f, id: msg.item, n: 1 });
      }
      return;
    }
    if (mp.role === 'client') {
      mp.lastHostSeen = performance.now();
      if (msg.t === 'worldsync') { applySave(msg.snap, true); say('The host updated the world.'); }
      else if (msg.t === 'zs') {
        T = msg.T != null ? msg.T : T; var sz = Object.create(null);
        (msg.a || []).forEach(function (a) { var id = a[0], z = zMap[id]; sz[id] = true; if (!z) { z = makeZombie(ZTYPES[a[1]] || 'walker', a[2], a[3], id); z.hp = a[5]; z.try = a[4]; z.g.rotation.y = a[4]; zombies.push(z); } else { if (a[5] < z.hp) z.flash = 0.14; z.tx = a[2]; z.tz = a[3]; z.try = a[4]; z.hp = a[5]; } });
        for (var i = zombies.length - 1; i >= 0; i--) if (!sz[zombies[i].id]) { scene.remove(zombies[i].g); delete zMap[zombies[i].id]; zombies.splice(i, 1); }
      } else if (msg.t === 'tam') { var ta = turretAt(msg.x, msg.y, msg.z); if (ta) ta.ammo = msg.a; }
      else if (msg.t === 'shot') { addShot(msg.x1, msg.y1, msg.z1, msg.x2, msg.y2, msg.z2); var ts = turretAt(msg.tx, msg.ty, msg.tz); if (ts) ts.ammo = msg.a; }
      else if (msg.t === 'vox') {
        if (msg.op === 1) { if (!W.getVox(msg.x, msg.y, msg.z) && W.setVox(msg.x, msg.y, msg.z, msg.vt, msg.hp)) voxVer++; }
        else if (msg.op === 0) { if (W.getVox(msg.x, msg.y, msg.z)) { W.delVox(msg.x, msg.y, msg.z); voxVer++; } }
        else if (msg.op === 2) { var hv = W.getVox(msg.x, msg.y, msg.z); if (hv) hv.hp = msg.hp; }
      } else if (msg.t === 'ent') {
        if (msg.k === 'tree') { var tr = W.trees[msg.idx]; if (tr) { tr.hp = msg.hp; tr.given = msg.given; if (tr.alive !== msg.alive) W.setTree(tr, msg.alive); } }
        else if (msg.k === 'rock') { var rk = W.rocks[msg.idx]; if (rk) { rk.hp = msg.hp; rk.given = msg.given; if (rk.alive !== msg.alive) W.setRock(rk, msg.alive); } }
        else if (msg.k === 'pile') { var pl = W.piles[msg.idx]; if (pl) W.setPile(pl, !msg.searched); }
        else if (msg.k === 'crate') { var cr = W.crates[msg.idx]; if (cr) W.setCrate(cr, !msg.searched); }
        else if (msg.k === 'car') { var cc = W.cars[msg.idx]; if (cc) { cc.hp = msg.hp; if (cc.alive !== msg.alive) W.setCar(cc, msg.alive); } }
      } else if (msg.t === 'give' && msg.to === myPid) { give(msg.id, msg.n); if (msg.msg) say(msg.msg); }
      else if (msg.t === 'say' && msg.to === myPid) say(msg.msg);
      else if (msg.t === 'hurt' && msg.to === myPid) { hurt(msg.dmg || 5); if (msg.wp) applyWaterPoison(); }
      else if (msg.t === 'virus' && msg.to === myPid) { if (msg.k === 'acid') applyAcid(); else infectKeys(8); }
      else if (msg.t === 'refresh') { epoch = msg.ep; W.resetWorld(msg.seed, true); say('10 days passed: loot, ore, trees, rocks and cars respawned in new places!', true); }
      else if (msg.t === 'zkill' && msg.to === myPid) { kills++; if (msg.ty != null) awardKill(ZTYPES[msg.ty]); if (msg.drop) { give(msg.drop, 1); say('+1 ' + ITEMS[msg.drop].name); } }
      else if (msg.t === 'boom') {
        var dist = Math.hypot(P.x - msg.x, P.y + 0.9 - msg.y - 0.9, P.z - msg.z); if (dist < msg.splash) hurt(Math.round(msg.dmg * (1 - Math.max(0, dist - 1.5) / (msg.splash - 1.5 + 0.001))));
        SFX.play('boom'); var bz = zMap[msg.zid]; if (bz) { scene.remove(bz.g); var bi = zombies.indexOf(bz); if (bi >= 0) zombies.splice(bi, 1); delete zMap[msg.zid]; }
      }
    }
  }
  function networkTick(now) {
    if (mp.role === 'solo') return;
    if (now - mp.lastPoseSent >= 90) { mp.lastPoseSent = now; Net.send({ t: 'mv', slot: mp.slot, n: playerName, x: r2(P.x), y: r2(P.y), z: r2(P.z), yw: r2(P.yaw), hp: Math.round(P.hp), d: dead ? 1 : 0, sw: mp.swingPulse > 0 ? 1 : 0 }); mp.swingPulse = 0; }
    if (mp.role === 'host' && now - mp.lastZSent >= 115) { mp.lastZSent = now; Net.send({ t: 'zs', T: Math.round(T * 10) / 10, a: packZombies() }); }
  }

  /* ---------------- Bag, gear & crafting ---------------- */
  function nearArr(arr) { for (var i = 0; i < arr.length; i++) { var f = arr[i]; if (f.alive && Math.hypot(f.x - P.x, f.z - P.z) < 5.5) return true; } return false; }
  function openInv() { mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; mg = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} } $('#screen').hidden = true; $('#inv').hidden = false; renderInv(); }
  function closeInv() { $('#inv').hidden = true; wire = null; mg = null; enterGame(); }
  function costHtml(r) { return Object.keys(r.cost).map(function (id) { var have = count(id); return '<span class="' + (have >= r.cost[id] ? 'ok' : 'no') + '">' + ITEMS[id].ic + ' ' + have + '/' + r.cost[id] + ' ' + ITEMS[id].name + '</span>'; }).join(' &middot; '); }
  var STN0 = [['hand', 'Handmade', null], ['sawmill', 'Sawmill', 'saws'], ['furnace', 'Furnace', 'furn'], ['campfire', 'Campfire', 'camps'], ['anvil', 'Iron Anvil', 'anvils'], ['sink', 'Sink', 'sinks'], ['turret', 'Turret Workbench', 'tbench'], ['computer', 'Computer Bench', 'comps']];
  function stnList() { return STN0.map(function (a) { return [a[0], a[1], a[2] ? W[a[2]] : null]; }); }
  var STBTN = { hand: 'Craft', sawmill: 'Cut', furnace: 'Smelt', campfire: 'Cook', anvil: 'Forge', sink: 'Wash', turret: 'Build', computer: 'Build' };
  function stationOk(r) { var S = stnList(); for (var i = 0; i < S.length; i++) if (S[i][0] === r.st) return !S[i][2] || nearArr(S[i][2]); return true; }
  /* Recipe reveal rule: a recipe is only listed when you are at its station AND you already own the ingredients (WZ.REVEAL: 'all' = every ingredient type, 'any' = at least one) */
  function revealed(r) { var ks = Object.keys(r.cost); return stationOk(r) && (WZ.REVEAL === 'any' ? ks.some(function (k) { return count(k) > 0; }) : ks.every(function (k) { return count(k) > 0; })); }
  function hasAll(r) { return Object.keys(r.cost).every(function (id) { return count(id) >= r.cost[id]; }); }
  function fuelHtml() { return Object.keys(WZ.FUEL).map(function (f) { return ITEMS[f].ic + ' ' + ITEMS[f].name + ' x' + count(f) + ' (' + WZ.FUEL[f].t + ' s, power ' + WZ.FUEL[f].p + ')'; }).join(' &middot; '); }
  function recipesHtml() {
    var out = '', shown = 0;
    stnList().forEach(function (sn) {
      var rs = WZ.RECIPES.filter(function (r) { return r.st === sn[0] && revealed(r); }); if (!rs.length) return; shown += rs.length;
      out += '<h2 style="margin-top:12px">' + (sn[0] === 'hand' ? '✋ Handmade' : '📍 ' + sn[1] + ' (nearby)') + '</h2>';
      if (sn[0] === 'furnace' || sn[0] === 'campfire') out += '<div class="m" style="color:var(--muted);font-size:.78rem;margin-bottom:6px">Fuel in your bag: ' + fuelHtml() + (heatQ.length ? '<br>🔥 Jobs queued: ' + heatQ.length + ' &middot; progress ' + Math.round(heatGot / heatQ[0].r.heat * 100) + '%' : '') + '</div>';
      out += rs.map(function (r) {
        var o = ITEMS[r.out[0]], can = hasAll(r), note = '';
        if (r.heat) note += '<br>🔥 Needs ' + r.heat + ' heat power (burn fuel)';
        if (r.puz && r.puz.k === 'img') note += '<br>🧩 Picture puzzle &middot; Tier ' + r.tier + ' (' + r.puz.n + '×' + r.puz.n + ')';
        else if (r.puz && r.puz.k === 'mask') note += '<br>🧩 Shape puzzle';
        else if (r.puz && r.puz.k === 'saw') note += '<br>📏 Sawing minigame (a failed cut gives Failed Craft Wood)';
        else if (r.puz && r.puz.k === 'wire') note += '<br>🔌 Wire minigame';
        return '<div class="rec"><div><b>' + o.ic + ' ' + esc(r.label || o.name) + (r.out[1] > 1 ? ' x' + r.out[1] : '') + '</b><div class="cost">' + costHtml(r) + note + '</div></div><button class="btn' + (can ? ' primary' : '') + '" data-craft="' + r.id + '"' + (can ? '' : ' disabled') + '>' + STBTN[r.st] + '</button></div>';
      }).join('');
    });
    if (!shown) out += '<p class="m" style="color:var(--muted)">No recipes available. Recipes only appear when you are standing at the right crafting station and already carry every ingredient. Explore, gather materials and check the wiki.</p>';
    return out;
  }
  /* ---- Heat jobs (furnace / campfire) ---- */
  var heatQ = [], heatGot = 0, burn = { left: 0, rate: 0 }, heatWarn = false;
  function queueHeat(r) { Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); heatQ.push({ r: r }); say('Started: ' + (r.label || ITEMS[r.out[0]].name) + '. Stay near the ' + (r.st === 'furnace' ? 'furnace' : 'campfire') + ' with fuel in your bag.'); SFX.play('click'); }
  function pickFuel() { var o = ['charcoal', 'coal', 'wood']; for (var i = 0; i < o.length; i++) if (count(o[i]) > 0) return o[i]; return null; }
  function setBar(txt, f) { var e = $('#eat'); if (!e || eatT > 0) return; e.style.display = 'block'; $('#eat i').style.width = clamp(f * 100, 0, 100) + '%'; $('#eat span').textContent = txt; }
  function heatTick(dt) {
    if (!heatQ.length) { heatGot = 0; return; }
    var j = heatQ[0], at = nearArr(j.r.st === 'furnace' ? W.furn : W.camps), need = j.r.heat;
    if (!at) { setBar('Too far from the ' + (j.r.st === 'furnace' ? 'furnace' : 'campfire') + ' - heating paused', heatGot / need); return; }
    var guard = 0;
    while (heatGot < need && dt > 1e-6 && guard++ < 6) {
      if (burn.left <= 0) {
        var f = pickFuel(); if (!f) { if (!heatWarn) { heatWarn = true; say('Out of fuel! Carry Coal, Charcoal or Wood Logs.', true); } setBar('Out of fuel!', heatGot / need); return; }
        heatWarn = false; take(f, 1); burn.left = WZ.FUEL[f].t; burn.rate = WZ.FUEL[f].p / WZ.FUEL[f].t;
      }
      var use = Math.min(dt, burn.left); heatGot += burn.rate * use; burn.left -= use; dt -= use;
    }
    if (heatGot >= need) { heatGot -= need; heatQ.shift(); give(j.r.out[0], j.r.out[1]); say('+' + j.r.out[1] + ' ' + ITEMS[j.r.out[0]].name); SFX.play('craft'); }
    else setBar((j.r.label || ITEMS[j.r.out[0]].name) + ' ' + Math.round(heatGot / need * 100) + '% (queue ' + heatQ.length + ')', heatGot / need);
  }
  /* ---- Turrets ---- */
  var shots = [], manning = null;
  function addShot(x1, y1, z1, x2, y2, z2) {
    var m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0x111111 })); m.scale.set(0.22, 0.22, 0.22); m.position.set(x1, y1, z1); scene.add(m);
    shots.push({ m: m, a: [x1, y1, z1], b: [x2, y2, z2], t: 0, d: 0.22 }); SFX.play('stone');
  }
  function stepShots(dt) { for (var i = shots.length - 1; i >= 0; i--) { var q = shots[i]; q.t += dt; var k = Math.min(1, q.t / q.d); q.m.position.set(q.a[0] + (q.b[0] - q.a[0]) * k, q.a[1] + (q.b[1] - q.a[1]) * k, q.a[2] + (q.b[2] - q.a[2]) * k); if (k >= 1) { scene.remove(q.m); shots.splice(i, 1); } } }
  function loadTurret(e) {
    var c = tcfg(e), room = c.cap - e.ammo, n = Math.min(room, count('cannon_ball'));
    if (room <= 0) { say(VNAME[e.vt] + ' is full (' + e.ammo + '/' + c.cap + ').'); return; }
    if (n <= 0) { say('You need Cannon Balls (craft them from Stone).', true); return; }
    take('cannon_ball', n); e.ammo += n; SFX.play('click');
    if (mp.role === 'client') Net.send({ t: 'tload', x: e.vx, y: e.vy, z: e.vz, n: n }); else if (mp.role === 'host') Net.send({ t: 'tam', x: e.vx, y: e.vy, z: e.vz, a: e.ammo });
    say(VNAME[e.vt] + ' loaded: ' + e.ammo + '/' + c.cap + ' balls.');
  }
  function toggleManning(e) { if (manning === e) { manning = null; say('You left the cannon.'); return; } manning = e; e.rl = 0; say('You are manning the Manual Cannon. Hold a Cannon Ball in your bag, aim and Left Click to fire.'); }
  function turretTick(dt) {
    if (!W.turrets.length) return;
    for (var i = 0; i < W.turrets.length; i++) {
      var e = W.turrets[i]; if (!e.alive) continue; e.cd = Math.max(0, (e.cd || 0) - dt);
      if (e.vt !== 15 && e.ammo > 0 && e.cd <= 0) {
        var c = tcfg(e), best = null, bd = c.rng;
        for (var k = 0; k < zombies.length; k++) { var z = zombies[k], d = Math.hypot(z.x - e.x, z.z - e.z); if (d <= bd && Math.abs(z.y - e.y) < 5) { bd = d; best = z; } }
        if (best) {
          e.ammo--; e.cd = c.dly; addShot(e.x, e.y + 0.9, e.z, best.x, best.y + 1, best.z);
          if (mp.role === 'host') Net.send({ t: 'shot', x1: r2(e.x), y1: r2(e.y + 0.9), z1: r2(e.z), x2: r2(best.x), y2: r2(best.y + 1), z2: r2(best.z), tx: e.vx, ty: e.vy, tz: e.vz, a: e.ammo });
          hitZombie(best, c.dmg, 'turret');
        }
      }
      for (var q = zombies.length - 1; q >= 0; q--) { var zz = zombies[q]; if (zz.tcd > 0) { zz.tcd -= dt; continue; } if (Math.abs(zz.x - e.x) < 1.6 && Math.abs(zz.z - e.z) < 1.6 && Math.abs(zz.y - e.y) < 2) { zz.tcd = zz.def.cd || 1; damageVoxLocal(e.vx, e.vy, e.vz, zz.def.dmg * 3, null); if (!e.alive) break; } }
    }
  }
  function manualTick(dt) {
    var e = manning; if (!e) return;
    if (!e.alive || Math.hypot(e.x - P.x, e.z - P.z) > 4) { manning = null; say('You left the cannon.'); return; }
    var c = tcfg(e); e.cd = Math.max(0, (e.cd || 0) - dt);
    if (e.ammo < 1) { if (count('cannon_ball') > 0) { e.rl = (e.rl || 0) + dt; setBar('Reloading cannon...', e.rl / c.reload); if (e.rl >= c.reload) { e.rl = 0; take('cannon_ball', 1); e.ammo = 1; say('Manual Cannon loaded.'); } } else { e.rl = 0; setBar('No cannon balls!', 0); } }
    else if (e.cd > 0) setBar('Cannon cooling down', 1 - e.cd / c.dly); else setBar('Cannon READY - Left Click to fire', 1);
    if (lmb && e.ammo >= 1 && e.cd <= 0) {
      e.ammo = 0; e.cd = c.dly; camera.getWorldDirection(DIR); var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, hit = null, tEnd = c.rng, t, i;
      for (t = 0.5; t <= c.rng && !hit; t += 0.4) {
        var x = ox + DIR.x * t, y = oy + DIR.y * t, zz = oz + DIR.z * t;
        for (i = 0; i < zombies.length; i++) { var zb = zombies[i], ex = zb.x - x, ez = zb.z - zz; if (ex * ex + ez * ez < (zb.rad + 0.55) * (zb.rad + 0.55) && y > zb.y - 0.3 && y < zb.y + zb.h + 0.3) { hit = zb; tEnd = t; break; } }
        if (!hit && (W.solidAt(x, y, zz) || y < 0)) { tEnd = t; break; }
      }
      addShot(e.x, e.y + 1, e.z, ox + DIR.x * tEnd, oy + DIR.y * tEnd, oz + DIR.z * tEnd); lmb = false;
      if (hit) { if (mp.role === 'client') Net.send({ t: 'hitZ', id: hit.id, dmg: c.dmg }); else hitZombie(hit, c.dmg, 'self'); }
    }
  }
  function craftNow(r) {
    Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); give(r.out[0], r.out[1]);
    say((r.st === 'sink' ? 'Washed: ' : 'Crafted ') + ITEMS[r.out[0]].name + (r.out[1] > 1 ? ' x' + r.out[1] : '')); SFX.play(r.st === 'sink' ? 'wash' : 'craft');
  }
  /* ---- Minigames: sliding picture puzzle (turret / computer shapes) and sawmill line ---- */
  var mg = null;
  var MASKS = { plus: function (r, c) { return Math.abs(r - 2) <= 1 || Math.abs(c - 2) <= 1; }, ring: function (r, c) { return !(r === 2 && c === 2); }, diamond: function (r, c) { return Math.abs(r - 2) + Math.abs(c - 2) <= 2; } };
  function mkPic(r) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 360; var g = cv.getContext('2d'), tur = r.puz.k === 'img', sd = r.id.length * 977 + 5, rn = function () { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    var gr = g.createLinearGradient(0, 0, 360, 360); if (tur) { gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#e8d49a'); } else { gr.addColorStop(0, '#0f3d2e'); gr.addColorStop(1, '#16584a'); }
    g.fillStyle = gr; g.fillRect(0, 0, 360, 360);
    if (tur) {
      g.fillStyle = '#5c8a3a'; g.fillRect(0, 280, 360, 80);
      g.save(); g.translate(150, 230); g.rotate(-0.35); g.fillStyle = r.out[0] === 'manual_cannon' ? '#2f4a3a' : '#4b535c'; g.fillRect(-20, -34, 190, 62); g.fillStyle = '#15181c'; g.fillRect(150, -28, 28, 50); g.restore();
      g.fillStyle = '#6b4a2a'; g.fillRect(90, 232, 150, 36); g.fillStyle = '#222'; g.beginPath(); g.arc(120, 282, 46, 0, 6.3); g.fill(); g.fillStyle = '#c28a3a'; g.beginPath(); g.arc(120, 282, 20, 0, 6.3); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(300, 120, 22, 0, 6.3); g.fill(); g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(60, 60, 30, 0, 6.3); g.fill();
    } else {
      g.strokeStyle = '#3ad0a0'; g.lineWidth = 4; for (var i = 0; i < 26; i++) { g.beginPath(); var x = rn() * 360, y = rn() * 360; g.moveTo(x, y); g.lineTo(x + (rn() - 0.5) * 200, y); g.lineTo(x + (rn() - 0.5) * 200, y + (rn() - 0.5) * 200); g.stroke(); }
      for (var j = 0; j < 14; j++) { g.fillStyle = ['#e5484d', '#e3b02a', '#3b82f6', '#c9c9c9', '#ec4899'][j % 5]; g.fillRect(rn() * 320, rn() * 320, 20 + rn() * 34, 14 + rn() * 26); }
    }
    for (var k = 0; k < 40; k++) { g.fillStyle = 'rgba(' + (rn() * 255 | 0) + ',' + (rn() * 255 | 0) + ',' + (rn() * 255 | 0) + ',.35)'; g.beginPath(); g.arc(rn() * 360, rn() * 360, 4 + rn() * 12, 0, 6.3); g.fill(); }
    return cv;
  }
  function startMg(r) {
    var k = r.puz.k;
    if (k === 'wire') { wire = { r: r, order: [0, 1, 2, 3, 4].sort(function () { return Math.random() - 0.5; }), sel: -1, done: {} }; SFX.play('click'); renderWireGame(); return; }
    if (k === 'saw') { mg = { r: r, k: 'saw', ph: Math.random() * 6, pts: [], down: false, msg: '' }; }
    else {
      var n = k === 'img' ? r.puz.n : 5, mask = k === 'img' ? function () { return true; } : MASKS[r.puz.shape], cells = [];
      for (var rr = 0; rr < n; rr++) for (var cc = 0; cc < n; cc++) if (mask(rr, cc)) cells.push([rr, cc]);
      var tiles = cells.map(function (_, i) { return i; }), bl = cells.length - 1; tiles[bl] = -1;
      function nb(i) { var o = []; for (var q = 0; q < cells.length; q++) if (Math.abs(cells[q][0] - cells[i][0]) + Math.abs(cells[q][1] - cells[i][1]) === 1) o.push(q); return o; }
      var steps = (k === 'img' ? (r.tier >= 2 ? 170 : 80) : 130), prev = -1;
      for (var m = 0; m < steps; m++) { var o = nb(bl).filter(function (q) { return q !== prev; }); if (!o.length) o = nb(bl); var q2 = o[Math.floor(Math.random() * o.length)]; tiles[bl] = tiles[q2]; tiles[q2] = -1; prev = bl; bl = q2; }
      mg = { r: r, k: 'tile', n: n, cells: cells, tiles: tiles, pic: mkPic(r), moves: 0, nb: nb };
    }
    SFX.play('click'); renderInv();
  }
  function mgSolved() { return mg.tiles.every(function (t, i) { return t === i || (t === -1 && i === mg.cells.length - 1); }); }
  function drawMg() {
    var cv = $('#mgc'); if (!cv || !mg || mg.k !== 'tile') return; var g = cv.getContext('2d'), cs = 360 / mg.n; g.fillStyle = '#10151a'; g.fillRect(0, 0, 360, 360);
    mg.cells.forEach(function (c, i) {
      var t = mg.tiles[i]; if (t < 0) { g.strokeStyle = '#556'; g.setLineDash([5, 4]); g.strokeRect(c[1] * cs + 3, c[0] * cs + 3, cs - 6, cs - 6); g.setLineDash([]); return; }
      var h = mg.cells[t]; g.drawImage(mg.pic, h[1] * cs, h[0] * cs, cs, cs, c[1] * cs, c[0] * cs, cs, cs); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.strokeRect(c[1] * cs + 1, c[0] * cs + 1, cs - 2, cs - 2);
    });
    var pv = $('#mgp'); if (pv) { var pg = pv.getContext('2d'); pg.clearRect(0, 0, 120, 120); var ps = 120 / mg.n; mg.cells.forEach(function (c) { pg.drawImage(mg.pic, c[1] * 360 / mg.n, c[0] * 360 / mg.n, 360 / mg.n, 360 / mg.n, c[1] * ps, c[0] * ps, ps, ps); }); }
  }
  function sawY(x) { var d = mg.r.puz.d; return 90 + Math.sin(x / (95 - d * 14) + mg.ph) * (12 + d * 9); }
  function drawSaw() {
    var cv = $('#mgc'); if (!cv || !mg || mg.k !== 'saw') return; var g = cv.getContext('2d'); g.fillStyle = '#b98b55'; g.fillRect(0, 0, 520, 180);
    for (var y = 12; y < 180; y += 22) { g.fillStyle = 'rgba(90,55,20,.18)'; g.fillRect(0, y, 520, 3); }
    g.fillStyle = '#d33'; g.fillRect(24, 60, 6, 60); g.fillRect(490, 60, 6, 60);
    g.strokeStyle = '#3a2410'; g.lineWidth = 3; g.setLineDash([9, 7]); g.beginPath(); for (var x = 30; x <= 490; x += 4) { var yy = sawY(x); if (x === 30) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); g.setLineDash([]);
    if (mg.pts.length > 1) { g.strokeStyle = '#1b1b1b'; g.lineWidth = 4; g.beginPath(); mg.pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }
  }
  function sawEval() {
    var pts = mg.pts, d = mg.r.puz.d, loose = [34, 28, 22][d - 1], inr = pts.filter(function (p) { return p[0] >= 30 && p[0] <= 490; }), minX = 999, maxX = 0;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); });
    if (minX > 70 || maxX < 450 || inr.length < 10) { mg.msg = 'Draw the line from the left red mark all the way to the right one.'; mg.pts = []; return; }
    var bad = 0, worst = 0; inr.forEach(function (p) { var dv = Math.abs(p[1] - sawY(p[0])); worst = Math.max(worst, dv); if (dv > loose) bad++; });
    var fail = bad / inr.length > 0.12 || worst > loose * 2.2, r = mg.r; mg = null;
    if (fail) { Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); give('failed_craft_wood', 1); say('The cut went wrong! You got Failed Craft Wood.', true); SFX.play('hit'); }
    else { if (hasAll(r)) craftNow(r); else say('Missing materials.', true); }
    renderInv();
  }
  function renderMg() {
    var r = mg.r, o = ITEMS[r.out[0]], h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">' + o.ic + ' ' + esc(o.name) + (r.tier ? ' &middot; Tier ' + r.tier : '') + '</h2><button class="btn" data-mcancel="1">Give up</button></div><div class="box" style="grid-column:1/-1"><p class="m" style="color:var(--muted)">' + (mp.role === 'solo' ? 'Solo: world time runs at half speed while you work. ' : 'Multiplayer: the world keeps running at full speed! ') + (mg.k === 'saw' ? 'Hold the mouse and draw along the dotted line, from the left red mark to the right one. Small slips are fine; big mistakes ruin the wood.' : 'Slide the pieces into the empty gap to rebuild the picture. Click a piece next to the gap. Giving up costs nothing.') + '</p>';
    if (mg.k === 'saw') h += '<canvas id="mgc" width="520" height="180" style="max-width:100%;border-radius:8px;cursor:crosshair;touch-action:none"></canvas><p class="m" style="color:#e3b02a">' + esc(mg.msg || '') + '</p>';
    else h += '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start"><canvas id="mgc" width="360" height="360" style="max-width:100%;border-radius:8px;cursor:pointer"></canvas><div><div class="m" style="color:var(--muted)">Target picture</div><canvas id="mgp" width="120" height="120" style="border-radius:6px"></canvas></div></div>';
    $('#inv').innerHTML = h + '</div></div>';
    var cv = $('#mgc'); if (mg.k === 'saw') {
      drawSaw(); var pos = function (ev) { var b = cv.getBoundingClientRect(); return [(ev.clientX - b.left) * 520 / b.width, (ev.clientY - b.top) * 180 / b.height]; };
      cv.onmousedown = function (ev) { mg.down = true; mg.pts = [pos(ev)]; drawSaw(); };
      cv.onmousemove = function (ev) { if (mg.down) { mg.pts.push(pos(ev)); drawSaw(); } };
      var fin = function () { if (mg && mg.down) { mg.down = false; sawEval(); if (mg) renderMg(); } };
      cv.onmouseup = fin; cv.onmouseleave = fin;
    } else {
      drawMg(); cv.onclick = function (ev) {
        var b = cv.getBoundingClientRect(), cs = b.width / mg.n, c = Math.floor((ev.clientX - b.left) / cs), rr = Math.floor((ev.clientY - b.top) / cs), i = -1;
        mg.cells.forEach(function (q, ix) { if (q[0] === rr && q[1] === c) i = ix; }); if (i < 0 || mg.tiles[i] < 0) return;
        var bl = mg.tiles.indexOf(-1); if (mg.nb(bl).indexOf(i) < 0) return;
        mg.tiles[bl] = mg.tiles[i]; mg.tiles[i] = -1; mg.moves++; SFX.play('click'); drawMg();
        if (mgSolved()) { var r0 = mg.r; mg = null; say('Puzzle solved!'); if (hasAll(r0) && stationOk(r0)) craftNow(r0); renderInv(); }
      };
    }
  }
  function detailHtml(id) {
    if (!id || !ITEMS[id]) return '<span class="m">Click an item to see its stats. Click armor or accessories to equip them right away.</span>';
    var it = ITEMS[id], s = '<h3>' + it.ic + ' ' + esc(it.name) + '</h3><div>' + esc(it.desc) + '</div>';
    if (it.eat) {
      var e = it.eat;
      s += '<div class="m">Duration: ' + e.t + ' s' + (e.heal ? ' &middot; Restores Health: +' + e.heal : '') + (e.h ? ' &middot; Hunger: +' + e.h : '') + (e.th ? ' &middot; Thirst: ' + (e.th > 0 ? '+' : '') + e.th : '') + (e.energy ? ' &middot; Energy: +' + e.energy : '') + (e.comfort ? ' &middot; Comfort: +' + e.comfort : '') + (e.poison ? ' &middot; ' + Math.round(e.poison * 100) + '% Poison' : '') + (e.wpoison ? ' &middot; ' + Math.round(e.wpoison * 100) + '% Water Poison' : '') + (e.stomach ? ' &middot; ' + Math.round(e.stomach * 100) + '% Stomachache' : '') + '</div>';
    }
    if (it.type === 'armor') s += '<div class="m">Defense: +' + it.def + ' &middot; Click the item to equip/unequip in the ' + esc(it.slot) + ' slot</div>';
    if (it.type === 'acc') s += '<div class="m">Click the item to equip it in an accessory slot</div>';
    if (it.tool) s += '<div class="m">' + (it.tool === 'rod' ? 'Fishing Power: ' + it.power + '%' : 'Break Power: ' + it.bd + ' &middot; Damage: ' + it.dmg) + '</div>';
    if (it.note) s += '<div class="m">' + esc(it.note) + '</div>';
    return s;
  }
  var wire = null, WCOL = ['#e5484d', '#3b82f6', '#22c55e', '#e3b02a', '#ec4899'];
  function renderWireGame() {
    var h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">Assemble: ' + esc(ITEMS[wire.r.out[0]].name) + '</h2><button class="btn" data-wcancel="1">Cancel</button></div><div class="box" style="grid-column:1/-1"><p class="m" style="color:var(--muted)">Connect each coloured wire on the left to the matching colour on the right. Click a wire, then click its match.</p><div style="display:flex;justify-content:space-around;gap:24px;margin-top:16px"><div style="display:flex;flex-direction:column;gap:10px">';
    for (var i = 0; i < 5; i++) h += '<button class="btn" data-wl="' + i + '" style="background:' + WCOL[i] + ';min-width:110px;' + (wire.sel === i ? 'outline:3px solid #fff;' : '') + (wire.done[i] ? 'opacity:.35;' : '') + '">' + (wire.done[i] ? '✔' : '●') + '</button>';
    h += '</div><div style="display:flex;flex-direction:column;gap:10px">';
    for (var j = 0; j < 5; j++) { var ci = wire.order[j]; h += '<button class="btn" data-wr="' + j + '" style="background:' + WCOL[ci] + ';min-width:110px;' + (wire.done[ci] ? 'opacity:.35;' : '') + '">' + (wire.done[ci] ? '✔' : '●') + '</button>'; }
    $('#inv').innerHTML = h + '</div></div></div></div>';
  }
  function craftNow(r) {
    Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); give(r.out[0], r.out[1]);
    say((r.sink ? 'Washed: ' : 'Crafted ') + ITEMS[r.out[0]].name + (r.out[1] > 1 ? ' x' + r.out[1] : '')); SFX.play(r.sink ? 'wash' : 'craft');
  }
  function renderInv() {
    if (wire) { renderWireGame(); return; }
    if (mg) { renderMg(); return; }
    var ids = Object.keys(inv).filter(function (id) { return inv[id] > 0 && ITEMS[id]; });
    var ast = armorStats(), slots = [['head', 'Head'], ['chest', 'Chest'], ['legs', 'Legs'], ['boots', 'Boots']];
    var buffs = ['DEF: ' + ast.def];
    if (ast.woodN > 0) buffs.push('Wood (' + ast.woodN + '/4): Speed +' + (ast.woodN * 3) + '%, Energy & Comfort saving ' + (ast.woodN * 6) + '%');
    if (ast.ironN > 0) buffs.push('Iron (' + ast.ironN + '/4): Max HP ' + ast.hpMax + ', Melee +' + (ast.ironN * 6) + '%');
    if (ast.bucket) buffs.push('Iron Bucket: Water Poison chance halved');

    var h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">Bag, Gear &amp; Crafting</h2><div class="row" style="display:flex;gap:8px"><button class="btn primary" id="bBack">Back (Tab)</button></div></div><div class="box"><h2>Worn Armor (Click to remove)</h2><div class="eq-row">';
    slots.forEach(function (sl) { var id = equip[sl[0]], it = id ? ITEMS[id] : null; h += '<button class="eq-slot' + (it ? ' on' : '') + '" data-eq="' + sl[0] + '"><b>' + (it ? it.ic : '▫') + '</b><span>' + (it ? esc(it.name) : sl[1]) + '</span><small>' + (it ? 'DEF +' + it.def : 'Empty') + '</small></button>'; });
    h += '</div><h2>Accessories (Click to remove)</h2><div class="eq-row">';
    for (var ai = 0; ai < 4; ai++) { var aid = acc[ai], ait = aid ? ITEMS[aid] : null; h += '<button class="eq-slot' + (ait ? ' on' : '') + '" data-acc="' + ai + '"><b>' + (ait ? ait.ic : '▫') + '</b><span>' + (ait ? esc(ait.name) : 'Accessory ' + (ai + 1)) + '</span><small>' + (ait ? 'Equipped' : 'Empty') + '</small></button>'; }
    h += '</div><div class="eq-buff">' + esc(buffs.join(' · ')) + '</div><h2>Hotbar</h2><div class="hb">';
    for (var i = 0; i < 8; i++) { var hid = hot[i] || (i === 0 ? 'fists' : null); h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-slot="' + i + '"><small>' + (i + 1) + '</small>' + (hid ? ITEMS[hid].ic : '') + '</div>'; }
    h += '</div><p class="m" style="color:var(--muted);font-size:.8rem;margin:0 0 10px">Click a hotbar slot, then click an item to assign it (armor and accessories equip directly).</p><h2>Items (' + slotsUsed() + '/' + slotCap() + ' slots)</h2>';
    h += ids.length ? '<div class="items">' + ids.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-item="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') + '</div>' : '<p class="m" style="color:var(--muted)">Your bag is empty.</p>';
    h += '<div class="detail" id="detail">' + detailHtml(selItem) + '</div></div><div class="box"><h2>Crafting &amp; Stations</h2>' + recipesHtml() + '<h2 style="margin-top:14px">Schematics (Coming Soon)</h2>' + WZ.SCHEMATICS.map(function (n) { return '<div class="rec" style="opacity:.55"><div><b>🔒 ' + esc(n) + '</b><div class="cost">Coming soon</div></div></div>'; }).join('') + '</div></div>';
    $('#inv').innerHTML = h; $('#bBack').onclick = closeInv;
  }
  document.addEventListener('click', function (ev) {
    if (mode !== 'inv') return; var t = ev.target.closest('[data-item],[data-slot],[data-craft],[data-eq],[data-acc],[data-wl],[data-wr],[data-wcancel],[data-mcancel]'); if (!t) return;
    if (t.dataset.mcancel) { mg = null; renderInv(); return; }
    if (t.dataset.wcancel) { wire = null; renderInv(); return; }
    if (t.dataset.wl != null) { if (wire && !wire.done[+t.dataset.wl]) { wire.sel = +t.dataset.wl; SFX.play('click'); renderWireGame(); } return; }
    if (t.dataset.wr != null) {
      if (!wire || wire.sel < 0) return; var ci = wire.order[+t.dataset.wr];
      if (ci === wire.sel) { wire.done[ci] = true; wire.sel = -1; SFX.play('click'); if (Object.keys(wire.done).length >= 5) { var r0 = wire.r; wire = null; if (Object.keys(r0.cost).every(function (k) { return count(k) >= r0.cost[k]; })) craftNow(r0); renderInv(); return; } }
      else { wire.sel = -1; say('Wrong match! Try again.', true); }
      renderWireGame(); return;
    }
    if (t.dataset.eq) {
      var sl = t.dataset.eq, cur = equip[sl]; if (!cur) return;
      equip[sl] = null; give(cur, 1); P.hp = Math.min(P.hp, armorStats().hpMax); SFX.play('click'); renderStats(); renderInv(); return;
    }
    if (t.dataset.acc != null) { var ai = +t.dataset.acc, ac = acc[ai]; if (!ac) return; acc[ai] = null; give(ac, 1); SFX.play('click'); renderStats(); renderInv(); return; }
    if (t.dataset.slot != null) { sel = +t.dataset.slot; SFX.play('click'); renderHotbar(); renderInv(); return; }
    if (t.dataset.item) {
      var id = t.dataset.item, it = ITEMS[id]; selItem = id; SFX.play('click');
      if (it.type === 'armor') {
        var prevEq = equip[it.slot]; take(id, 1); if (prevEq) give(prevEq, 1); equip[it.slot] = id;
        say('Equipped ' + it.name + ' (DEF ' + armorStats().def + ')'); renderStats();
      } else if (it.type === 'acc') {
        var free = acc.indexOf(null);
        if (acc.indexOf(id) >= 0) say('Already equipped.', true);
        else if (free < 0) say('All 4 accessory slots are full. Click one to remove it first.', true);
        else { take(id, 1); acc[free] = id; say('Equipped ' + it.name + '.'); renderStats(); }
      } else if (it.type !== 'material') {
        var s = sel === 0 ? 1 : sel; for (var i = 0; i < 8; i++) if (hot[i] === id) hot[i] = null; hot[s] = id; if (sel === 0) sel = 1; renderHotbar();
      }
      renderInv(); return;
    }
    if (t.dataset.craft) {
      var r = WZ.RECIPES.filter(function (x) { return x.id === t.dataset.craft; })[0];
      if (!r || !hasAll(r) || !stationOk(r)) return;
      if (r.puz) { startMg(r); return; }
      if (r.heat) { queueHeat(r); renderInv(); return; }
      craftNow(r); renderInv();
    }
  });

  /* ---------------- Main loop & render ---------------- */
  var clock = { last: 0 }, BM_COL = new THREE.Color(0x5a0c0c), bmEl = null;
  function respawnWorld() {
    if (mp.role === 'client') return;
    W.trees.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setTree(t, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'tree', idx: t.idx, hp: t.hp, given: 0, alive: true }); } });
    W.rocks.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setRock(t, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'rock', idx: t.idx, hp: t.hp, given: 0, alive: true }); } });
    W.piles.forEach(function (p) { if (p.searched && T >= p.respawn) { W.setPile(p, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'pile', idx: p.idx, searched: false }); } });
    W.crates.forEach(function (p) { if (p.searched && T >= p.respawn) { W.setCrate(p, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'crate', idx: p.idx, searched: false }); } });
  }
  function update(dt, nowMs, clk) {
    drain(); T += dt * (rest && rest.k === 'sleep' ? (rest.clean ? 3 : 2) : 1); /* sleeping: clean bed = time x3, shabby bed = time x2 */ swingCd -= dt; stepPlayer(dt); stats(dt); if (dead) return;
    if (lmb && !manning) { var it = curItem(); if (it.type === 'tool' && swingCd <= 0) swing(); }
    ugCd -= dt; if (W.ug) { if (!inUG(P.x)) { if (ugCd <= 0 && Math.hypot(P.x - W.mine.door.x, P.z - W.mine.door.z) < 1.5 && P.y < 1.5) enterUG(); } else if (ugCd <= 0 && Math.hypot(P.x - W.ug.exit.x, P.z - W.ug.exit.z) < 1.8) exitUG(); }
    var nd = clk.hour < 5.5 ? clk.day - 1 : clk.day, bo = clk.night && bloodFlag(nd);
    if (bo && !bloodOn && bmAnn !== nd) { bmAnn = nd; say('The BLOOD MOON rises! Zombies spawn twice as fast.', true); } bloodOn = !!bo;
    if (mp.role !== 'client') { var ep = epochOf(T); if (ep !== epoch) { epoch = ep; var sd = curSeed(baseSeed, ep); W.resetWorld(sd, true); while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1; if (mp.role === 'host') Net.send({ t: 'refresh', seed: sd, ep: ep }); say('10 days passed: loot, ore, trees, rocks and cars respawned in new places!', true); } }
    eatTick(dt); fishTick(dt); heatTick(dt); manualTick(dt); if (mp.role !== 'client') turretTick(dt); zombieLogic(dt, clk.night); stepPeers(dt); networkTick(nowMs);
    if (T - respawnCheck > 1) { respawnCheck = T; respawnWorld(); }
  }
  function hud() {
    renderStats(); drawMini();
    var h = mode === 'play' ? aim(3.6) : null, txt = '', cross = $('#cross'); cross.className = '';
    var cp = mode === 'play' ? nearCorpse(2.6) : null;
    if (cp) txt = cp.mine ? '[E] Loot your corpse' : cp.name + '\'s corpse';
    else if (h) {
      if (h.kind === 'zombie') { cross.className = 'on-zombie'; txt = h.z.def.name + '  HP ' + Math.max(0, Math.round(h.z.hp)) + '/' + h.z.def.hp + (h.z.def.def ? '  DEF ' + h.z.def.def : ''); }
      else if (h.kind === 'vox') { var c = unkey(h.key), v = W.getVox(c[0], c[1], c[2]); if (v) txt = VNAME[v.t] + '  Durability ' + Math.max(0, Math.round(v.hp)); }
      else if (h.kind === 'ent') {
        var e = h.e;
        if (e.vx != null) {
          var bv = W.getVox(e.vx, e.vy, e.vz), hpTxt = bv ? ' (' + Math.max(0, Math.round(bv.hp)) + ')' : '';
          if (e.k === 'furnace') txt = 'Furnace' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'bed') txt = 'Bed' + hpTxt + ' · [E] Sleep · Left Click: Dismantle';
          else if (e.k === 'couch') txt = 'Couch' + hpTxt + ' · [E] Sit · Left Click: Dismantle';
          else if (e.k === 'campfire') txt = 'Campfire' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'anvil') txt = 'Iron Anvil' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'computer') txt = 'Computer Bench' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'sawmill') txt = 'Sawmill' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'tbench') txt = 'Turret Workbench' + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'turret') { var tc = tcfg(e); txt = VNAME[e.vt] + hpTxt + ' · Ammo ' + e.ammo + '/' + tc.cap + (e.vt === 15 ? (manning === e ? ' · [E] Leave · Left Click: Fire' : ' · [E] Man the cannon') : ' · [E] Load cannon balls') + ' · Left Click: Dismantle'; }
          else if (e.k === 'sink') { var hid = hot[sel]; txt = (hid === 'dirty_veg' || hid === 'dirty_fruits') ? 'Sink' + hpTxt + ' · [E] Wash Now · Left Click: Dismantle' : 'Sink' + hpTxt + ' · [E] Open Sink · Left Click: Dismantle'; }
        }
        else if (e.k === 'pile') txt = e.searched ? (e.tier === 4 ? 'Table already searched' : 'Trash already searched') : (e.tier === 4 ? '[E] Search Above Table (Tier 4)' : '[E] Search trash (Tier ' + e.tier + ')');
        else if (e.k === 'crate') txt = e.searched ? 'Empty crate' : '[E] Open wooden crate (Tier ' + (e.tier || 1) + ')';
        else if (e.k === 'bed') txt = e.clean ? '[E] Sleep in the clean bed' : '[E] Sleep in the shabby bed';
        else if (e.k === 'couch') txt = e.clean ? '[E] Sit on the clean couch' : 'Dirty couch (does not restore Comfort)';
        else if (e.k === 'car') txt = e.alive ? (e.truck ? 'Abandoned Truck · Break Points ' : 'Abandoned Car · Break Points ') + Math.max(0, Math.round(e.hp)) + '/' + e.max + (e.truck ? ' · Left Click: Break open the cargo' : ' · Left Click: Break open the trunk') : '';
        else if (e.k === 'tree') txt = 'Tree  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'axe' ? '' : '  (needs an axe)');
        else if (e.k === 'rock') txt = (e.ore ? 'Iron Ore' : e.gold ? 'Gold Ore' : e.copper ? 'Copper Ore' : e.coal ? 'Coal' : 'Stone') + '  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'pick' ? '' : '  (needs a pickaxe)');
      }
    }
    if (!txt && mode === 'play' && curItem().tool === 'rod' && !fish) { var wq = aimWater(15); if (wq) txt = wq.type === 'river' ? 'River (fishing coming soon)' : 'Lake · Left Click: Cast line'; }
    $('#prompt').textContent = txt;
  }
  function frame(ms) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ms - clock.last) / 1000); clock.last = ms; if (dt <= 0) return;
    fpsAcc += dt; fpsN++; if (fpsAcc >= 0.5) { fpsVal = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; var fe = $('#fps'); if (fe) fe.textContent = fpsVal + ' FPS'; if (dbgOn) renderDebug(); }
    for (var ti = tracers.length - 1; ti >= 0; ti--) { tracers[ti].t -= dt; if (tracers[ti].t <= 0) { scene.remove(tracers[ti].m); tracers.splice(ti, 1); } }
    if (virus.length) stepVirus(dt); if (shots.length) stepShots(dt);
    var clk = clockInfo(T);
    SFX.setNight(clk.night);
    if (clk.night && !autoTorchDone && mode === 'play') { autoTorchDone = true; if (!torchOn) { torchOn = true; say('It is night — the flashlight turned on automatically [F].'); } }
    else if (!clk.night) autoTorchDone = false;

    if (mode === 'play') { update(dt, ms, clk); if (ms - lastHud > 100) { lastHud = ms; hud(); } }
    else if (mode === 'menu') { P.yaw += dt * 0.08; networkTick(ms); }
    else if (mode === 'inv' && mg && mp.role === 'solo') { update(dt * 0.5, ms, clk); }
    else if (mp.role !== 'solo') { stepPeers(dt); networkTick(ms); }

    if (gfx.smap && !ugOn) { smT -= dt; if (smT <= 0) { smT = 10; W.sunDirty = true; renderer.shadowMap.needsUpdate = true; } }
    W.updateSky(clk.hour, P.x, P.z);
    if (bloodOn && !ugOn) { scene.background.lerp(BM_COL, 0.5); scene.fog.color.lerp(BM_COL, 0.5); }
    if (ugOn) { scene.fog.near = 2; scene.fog.far = 44; }
    if (bmEl) bmEl.style.opacity = bloodOn ? 1 : 0;
    chunkT -= dt; if (chunkT <= 0) { chunkT = 0.1; W.updateChunks(P.x, P.z, -Math.sin(P.yaw), -Math.cos(P.yaw), gfx.rd, gfx.cull); }
    updateWater(dt);
    var eye = P.y + (rest ? (rest.k === 'sleep' ? 0.55 : 1.0) : 1.62);
    camera.position.set(P.x, eye, P.z); camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    if (torch) { camera.getWorldDirection(DIR); torch.position.set(P.x + DIR.x * 0.6, eye, P.z + DIR.z * 0.6); torch.intensity = torchOn ? 1.55 : 0; }
    renderFrame();
  }

  function createSafeRenderer(canvas) {
    var tries = [{ canvas: canvas, antialias: false, powerPreference: 'default', alpha: false }, { canvas: canvas, antialias: false, failIfMajorPerformanceCaveat: false }];
    for (var i = 0; i < tries.length; i++) { try { var r = new THREE.WebGLRenderer(tries[i]); if (r && r.getContext()) return r; } catch (e) {} }
    return null;
  }
  function initThree() {
    var canvas = $('#gl'); renderer = createSafeRenderer(canvas);
    if (!renderer) throw new Error('Your browser or graphics card does not support WebGL.');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
    if ('SRGBColorSpace' in THREE && 'outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('sRGBEncoding' in THREE && 'outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = true;
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); if (mode === 'play') showPause(); say('Graphics lost, recovering...', true); });
    canvas.addEventListener('webglcontextrestored', function () { say('Graphics restored!'); });

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 300);
    var maxAniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
    W = WZ.createWorld(THREE, scene, maxAniso);
    torch = new THREE.PointLight(0xffeec2, 0, 26, 1.3);
    scene.add(torch); baseSeed = W.seed;
    bmEl = document.createElement('div'); bmEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.5s;background:radial-gradient(ellipse at center,rgba(120,0,0,0) 38%,rgba(150,10,10,.55) 100%)'; $('#hud').appendChild(bmEl);
    applyGfx();

    window.addEventListener('resize', function () { var w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    mini = $('#mini'); mctx = mini ? mini.getContext('2d') : null;
    $('#bTryLock').onclick = function () { lock(false); };
    window.addEventListener('beforeunload', function () { leaveRoom(); });
  }
  function boot() {
    try {
      if (!window.THREE) throw new Error('Three.js has not loaded.');
      initThree(); newPlayerState(0); renderHotbar(); renderStats();
      clock.last = performance.now(); requestAnimationFrame(frame); mode = 'menu'; authGate();
    } catch (e) {
      screen('<div class="card"><h1><b>Webzombite</b></h1><p>Could not start the 3D view.</p><pre style="white-space:pre-wrap;font-size:12px;opacity:.85">' + esc(e && e.message ? e.message : e) + '</pre><div class="row"><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    }
  }
  window.WZ.debug = function () { return { openInv: openInv, closeInv: closeInv, renderInv: renderInv, recipesHtml: recipesHtml, revealed: revealed, startMg: startMg, mgs: function () { return mg; }, mgSolved: mgSolved, drawMg: drawMg, heatQ: function () { return heatQ; }, queueHeat: queueHeat, heatTick: heatTick, loadTurret: loadTurret, turretTick: turretTick, turretAt: turretAt, toggleManning: toggleManning, manualTick: manualTick, damageVoxLocal: damageVoxLocal, slotsUsed: slotsUsed, slotCap: slotCap, corpses: corpses, sawEval: sawEval, craftNow: craftNow, interact: interact, setLmb: function (v) { lmb = v; }, snapshot: snapshot, showPause: showPause, gfx: gfx, applyGfx: applyGfx, dorm: dorm, DU: DU, DF: DF, dAdd: dAdd, dormTick: dormTick, hydrate: hydrate, placeZombie: placeZombie, spawnZombie: spawnZombie, enterUG: enterUG, exitUG: exitUG, awardKill: awardKill, coins: function () { return coins; }, bf: bf, tier: function () { return worldTier(clockInfo(T).day); }, bloodFlag: bloodFlag, applyCarHit: applyCarHit, killZombie: killZombie, stepZombie: stepZombie, scene: scene, renderer: renderer, camera: camera, P: P, zombies: zombies, inv: inv, equip: equip, acc: acc, W: W, mp: mp, status: status, give: give, makeZombie: makeZombie, curItem: curItem, setSel: function (i) { sel = i; renderHotbar(); }, setT: function (v) { T = v; }, hot: hot, T: function () { return T; }, mode: function () { return mode; }, die: die, startFish: startFish, aimWater: aimWater }; };
  window.WZ.started = true;
  boot();
})();
/* end game.js */
