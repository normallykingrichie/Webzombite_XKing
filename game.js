/* game.js - Webzombite */
(function () {
  'use strict';
  var WZ = window.WZ, ITEMS = WZ.ITEMS, ZDEF = WZ.ZOMBIES, ZTYPES = WZ.ZTYPE_LIST, C = window.WZ_CONFIG || {};
  var Net = WZ.Net, THREE = window.THREE, MAX_PLAYERS = C.maxPlayers || 4;
  var SFX = (function () {
    var api = WZ.SND || WZ.Sound;
    var lastNight = false;
    return {
      unlock: function () { if (api && api.unlock) api.unlock(); },
      play: function (k, opt) { if (api && api.play) api.play(k, opt); },
      setNight: function (n, uw) {
        lastNight = !!n;
        if (!api) return;
        if (api.ambient) api.ambient(n, uw);
        else if (api.setNight) api.setNight(n);
      },
      setSurface: function (bm) { if (api && api.setSurface) api.setSurface(bm); },
      toggleMute: function () {
        if (!api) return false;
        if (api.toggleMute) return api.toggleMute();
        var next = !(api.isMuted && api.isMuted());
        if (api.setMute) api.setMute(next);
        return next;
      },
      isMuted: function () { return !!(api && api.isMuted && api.isMuted()); },
      getConfig: function () { return api && api.getConfig ? api.getConfig() : { master: 0.85, sfx: 0.9, ambient: 0.55, spatial: true, reverb: true, muted: false }; },
      setConfig: function (p) { if (api && api.setConfig) api.setConfig(p); }
    };
  })();
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
    var phase = h >= 5.5 && h < 10.5 ? 'Morning' : h >= 10.5 && h < 15.5 ? 'Noon' : h >= 15.5 && h < 18.8 ? 'Afternoon' : 'Night';
    return { day: day, hour: h, str: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, phase: phase, night: phase === 'Night' };
  }

  var scene, camera, renderer, W, torch = null, torchOn = false, autoTorchDone = false;
  var P = { x: -32, y: 0, z: 32, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, onGround: false, hp: 100, hunger: 100, thirst: 100, energy: 100, comfort: 100 };
  var inv = {}, hot = [null, null, null, null, null, null, null, null], sel = 0;
  var equip = { head: null, chest: null, legs: null, boots: null };
  var T = 0, kills = 0, dead = false, rest = null, status = freshStatus();
  var coins = 0, kc = {}, bf = [0, 0, 0], baseSeed = 20261116, epoch = 0, bloodOn = false, bmAnn = -1, bossT = 2, dorm = { n: 0, t: 0 }, ugCd = 0, ugOn = false;
  var gfx = loadGfx(), chunkT = 0, waterT = 0, cubeCam = null, fogObj = null, lastBiome = 'city';
  var zombies = [], zMap = Object.create(null), nextZid = 1;
  var keys = {}, lmb = false, swingCd = 0, eatT = 0, spawnT = 3, stepT = 0, groanT = 4, voxVer = 0, cache = { ver: -1, list: [] };
  var mode = 'boot', selItem = null, lastHud = 0, respawnCheck = 0, fallbackLook = false, playerName = 'Survivor';

  function freshStatus() { return { gold: 0, poison: 0, stomach: 0, wpoison: 0, keylock: 0, acid: 0, acidN: 0, corr: 0 }; }
  var acc = [null, null, null, null], corpses = [], cooking = [], fish = null, bobber = null, tracers = [], virus = [], mineT = 5, sb = null, userId = null, userName = '', fpsAcc = 0, fpsN = 0, fpsVal = 0, dbgOn = false;
  var mp = { role: 'solo', room: '', slot: 0, online: false, peers: Object.create(null), lastHostSeen: 0, lastPoseSent: 0, lastZSent: 0, swingPulse: 0, joinTimer: null };
  var SLOT_COLS = [0xe3b02a, 0x3b82f6, 0x22c55e, 0xec4899], SLOT_HEX = ['#e3b02a', '#3b82f6', '#22c55e', '#ec4899'];

  function armorStats() {
    var def = 0, woodN = 0, ironN = 0, copN = 0, goldN = 0, tiN = 0, cacN = 0, pfN = 0, bucket = false, slots = ['head', 'chest', 'legs', 'boots'];
    for (var i = 0; i < slots.length; i++) {
      var it = ITEMS[equip[slots[i]]];
      if (!it || it.type !== 'armor') continue;
      def += it.def || 0;
      if (it.tier === 'wood') woodN++; else if (it.tier === 'iron') ironN++; else if (it.tier === 'copper') copN++; else if (it.tier === 'golden') goldN++; else if (it.tier === 'titanium') tiN++; else if (it.tier === 'cactus') cacN++; else if (it.tier === 'permafrost') pfN++; else if (it.tier === 'bucket') bucket = true;
    }
    if (status.gold > 0) def += 4;
    return { def: def, woodN: woodN, ironN: ironN, bucket: bucket, spdBonus: 1 + woodN * 0.03 + goldN * 0.03, energyDrain: 1 - woodN * 0.06, comfortDrain: 1 - woodN * 0.06, hpMax: 100 + ironN * 5 + copN * 3 + tiN * 8, dmgMult: (1 + ironN * 0.06 + copN * 0.03 + goldN * 0.04 + tiN * 0.09) * (status.gold > 0 ? 1.1 : 1), frostRes: pfN * 0.075, fireRes: pfN * 0.05, poisonResist: 1, wpResist: bucket ? 0.5 : 1 };
  }
  function accStats() {
    var o = { watch: 0, radar: false, gps: false, cool: 0, spd: 1, dly: 1, reach: 1 };
    for (var i = 0; i < acc.length; i++) { var id = acc[i]; if (id === 'iron_watch') o.watch = Math.max(o.watch, 1); else if (id === 'golden_watch') o.watch = 2; else if (id === 'radar') o.radar = true; else if (id === 'gps') o.gps = true; else if (id === 'nature_cooler') o.cool = 7; else if (id === 'berserkers_boots') { o.spd *= 1.1; o.dly *= 0.98; } else if (id === 'toughs_string') { o.reach *= 1.5; o.dly *= 2; } }
    return o;
  }

  /* ---------------- Save & load code ---------------- */
  /* ---- helpers: tiers, blood moon, seeds, graphics ---- */
  /* World options: difficulty (0 Normal, 1 Hard, 2 Harder, 3 Hardcore) and time mode (0 Default, 1 Slow) */
  var wDiff = 0, wTime = 0, DIFF = [[1, 1], [1.2, 1.1], [1.5, 1.2], [2, 1.5]], DIFF_NAME = ['Normal', 'Hard', 'Harder', 'Hardcore'], TIER_SLOW = [1, 20, 60, 120, 200, 300, 420, 560, 720, 900];
  function worldTier(day) { var D = wTime ? TIER_SLOW : WZ.TIER_DAYS, t = 1; for (var i = 0; i < D.length; i++) if (day >= D[i]) t = i + 1; return t; }
  function hash32(a) { a = Math.imul(a ^ (a >>> 16), 0x85ebca6b); a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35); return (a ^ (a >>> 16)) >>> 0; }
  function bloodFlag(night) { if (night < 1) return false; var pc = WZ.BLOOD[Math.min(worldTier(night), 10) - 1]; if (!pc) return false; return (hash32((baseSeed | 0) ^ Math.imul(night, 0x9e3779b1)) % 10000) / 100 < pc; }
  function curSeed(base, ep) { return ep <= 0 ? base : (hash32((base | 0) ^ Math.imul(ep, 0x7f4a7c15)) || 1); }
  function epochOf(t) { return Math.floor((clockInfo(t).day - 1) / 10); }
  var pendSeed = null;
  function seedFrom(txt) { txt = (txt || '').trim(); if (!txt) return null; if (/^-?\d{1,10}$/.test(txt)) return (parseInt(txt, 10) | 0) || 1; var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return (h | 0) || 1; }
  function newWorld(seed) { if (seed == null && pendSeed != null) seed = pendSeed; pendSeed = null; W.resetWorld(seed); baseSeed = W.seed; epoch = 0; bf = [0, 0, 0]; }
  function GFXD() {
    return {
      preset: 'high', shaderPack: 'cinematic', texPack: 'realism',
      rd: 14, ed: 10, sd: 70, renderScale: 1.0, aniso: 8, shadowRes: 2048, exposure: 1.05,
      fog: true, shadow: true, smap: true, bloom: true, godray: false, vignette: true,
      water: true, cull: true, dynLeaves: false, extraLeaves: false, fallLeaves: false,
      illum: true, ripples: true, flow: true, skyCloud: true, volCloud: false,
      aurora: true, stars: true, discs: true, haze: true, dirty: false, uwDist: true, wet: true, blurFx: true, grass: true
    };
  }
  var GFX_BOOLS = ['fog', 'shadow', 'smap', 'bloom', 'godray', 'vignette', 'water', 'cull', 'dynLeaves', 'extraLeaves', 'fallLeaves', 'illum', 'ripples', 'flow', 'skyCloud', 'volCloud', 'aurora', 'stars', 'discs', 'haze', 'dirty', 'uwDist', 'wet', 'blurFx', 'grass'];
  function loadGfx() {
    var g = GFXD();
    try {
      var q = JSON.parse(localStorage.getItem('wz_gfx') || 'null');
      if (q && typeof q === 'object') {
        ['rd', 'ed'].forEach(function (k) { if (typeof q[k] === 'number' && q[k] >= 2) g[k] = q[k] >= 9999 ? 9999 : Math.min(100, Math.round(q[k])); });
        if (typeof q.renderScale === 'number') g.renderScale = clamp(q.renderScale, 0.5, 1.5);
        if (typeof q.aniso === 'number') g.aniso = clamp(Math.round(q.aniso), 1, 16);
        if (typeof q.shadowRes === 'number' && [1024, 2048, 3072, 4096].indexOf(q.shadowRes) >= 0) g.shadowRes = q.shadowRes;
        if (typeof q.sd === 'number') g.sd = clamp(Math.round(q.sd), 24, 160);
        if (typeof q.exposure === 'number') g.exposure = clamp(q.exposure, 0.65, 1.55);
        if (typeof q.preset === 'string') g.preset = q.preset;
        if (typeof q.shaderPack === 'string') g.shaderPack = q.shaderPack;
        if (typeof q.texPack === 'string') g.texPack = q.texPack;
        GFX_BOOLS.forEach(function (k) { if (typeof q[k] === 'boolean') g[k] = q[k]; });
      }
    } catch (e) {}
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
    var o = { v: 6, tb: W.tables.filter(function (e) { return e.alive && e.on; }).map(function (e) { return [e.vx, e.vy, e.vz, e.on]; }), df: wDiff, tm: wTime, sd: baseSeed, t: Math.round(T * 10) / 10, b: cache.list, tr: [], rk: [], pl: [], cr: [], cs: [], bf: bf.slice(), tu: [] };
    W.turrets.forEach(function (e) { if (e.alive && e.ammo > 0) o.tu.push([e.vx, e.vy, e.vz, e.ammo]); });
    o.ch = []; W.chests.forEach(function (e) { if (e.alive && Object.keys(e.box).length) o.ch.push([e.vx, e.vy, e.vz, e.box]); });
    W.trees.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.tr.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.rocks.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.rk.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.piles.forEach(function (p, i) { if (p.searched) o.pl.push([i, Math.round(p.respawn)]); });
    W.crates.forEach(function (p, i) { if (p.searched) o.cr.push([i, Math.round(p.respawn)]); });
    W.cars.forEach(function (c, i) { if (!c.alive || c.hp < c.max || c.burnt) o.cs.push([i, Math.round(c.hp), c.burnt ? 1 : 0]); });
    o.ov = vehSave(); o.pm = (W.pumps || []).map(function (p) { return Math.round(p.L * 10) / 10; }); o.tk = []; (W.tanks || []).forEach(function (e) { if (e.alive && e.tkL > 0) o.tk.push([e.vx, e.vy, e.vz, e.tkL, e.tkLiq]); }); o.jb = jobs.map(function (j) { return [j.id, Math.round(j.left), j.half ? 1 : 0]; });
    if (!worldOnly) {
      o.k = kills; o.cn = coins; o.kc = kc; o.fm = farmSave(); o.p = [r2(P.x), r2(P.y), r2(P.z), Math.round(P.yaw * 1000) / 1000, Math.round(P.pitch * 1000) / 1000];
      o.s = [Math.round(P.hp), Math.round(P.hunger), Math.round(P.thirst), Math.round(P.energy), Math.round(P.comfort), Math.round(status.poison * 10) / 10, Math.round(status.stomach * 10) / 10, Math.round(status.wpoison * 10) / 10];
      o.bx = P.bx || 0; o.i = inv; o.h = hot; o.l = sel; o.eq = equip; o.ac = acc; o.co = corpses.filter(function (c) { return c.mine; }).map(function (c) { return [r2(c.x), r2(c.z), c.loot]; });
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
    if (!s || (s.v !== 3 && s.v !== 4)) return false;
    wDiff = s.df | 0; wTime = s.tm | 0; baseSeed = s.sd != null ? s.sd : 20261116; T = s.t || 0; epoch = epochOf(T); W.resetWorld(curSeed(baseSeed, epoch)); W.voxLoad(s.b || [], s.v); farmLoad(s.fm); voxVer++; vehLoad(s.ov); (s.pm || []).forEach(function (L, i) { if (W.pumps[i]) W.pumps[i].L = L; }); (s.tk || []).forEach(function (a) { for (var i = 0; i < W.tanks.length; i++) { var e = W.tanks[i]; if (e.alive && e.vx === a[0] && e.vy === a[1] && e.vz === a[2]) { e.tkL = a[3]; e.tkLiq = a[4]; } } }); jobs = (s.jb || []).map(function (a) { return { id: a[0], left: a[1], half: !!a[2] }; }); (s.tb || []).forEach(function (a) { for (var ti = 0; ti < W.tables.length; ti++) { var te = W.tables[ti]; if (te.alive && te.vx === a[0] && te.vy === a[1] && te.vz === a[2] && ITEMS[a[3]]) setTableOn(te, a[3]); } }); (s.ch || []).forEach(function (a) { for (var i = 0; i < W.chests.length; i++) { var e = W.chests[i]; if (e.alive && e.vx === a[0] && e.vy === a[1] && e.vz === a[2]) e.box = a[3] || {}; } }); (s.tu || []).forEach(function (a) { var te = turretAt(a[0], a[1], a[2]); if (te) te.ammo = a[3] | 0; });
    bf = Array.isArray(s.bf) ? [s.bf[0] | 0, s.bf[1] | 0, s.bf[2] | 0] : [0, 0, 0];
    (s.tr || []).forEach(function (a) { var t = W.trees[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setTree(t, false); });
    (s.rk || []).forEach(function (a) { var t = W.rocks[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setRock(t, false); });
    (s.pl || []).forEach(function (a) { var p = W.piles[a[0]]; if (p) { W.setPile(p, false); p.respawn = a[1]; } });
    (s.cr || []).forEach(function (a) { var p = W.crates[a[0]]; if (p) { W.setCrate(p, false); p.respawn = a[1]; } });
    (s.cs || []).forEach(function (a) { var c = W.cars[a[0]]; if (!c) return; c.hp = a[1]; if (a[2]) { c.burnt = true; c.hp = 0; W.setCar(c, true); } else if (c.hp <= 0) W.setCar(c, false); });
    if (!worldOnly) {
      kills = s.k || 0; coins = s.cn || 0; kc = s.kc && typeof s.kc === 'object' ? s.kc : {};
      P.x = clamp(s.p[0] || -32, -W.half + 1, W.ug.all.x1 - 7); P.y = Math.max(0, s.p[1] || 0); P.z = clamp(s.p[2] || 32, -W.half + 1, W.half - 1); if (inUG(P.x)) { P.z = clamp(s.p[2], W.ug.z0 + 7, W.ug.z1 - 7); ugOn = true; ugMax = 6; W.setUnderground(true); torchOn = true; } else { ugOn = false; W.setUnderground(false); }
      P.vx = P.vz = P.vy = 0; P.yaw = s.p[3] || 0; P.pitch = clamp(s.p[4] || 0, -1.5, 1.5);
      equip = { head: null, chest: null, legs: null, boots: null };
      if (s.eq) { ['head', 'chest', 'legs', 'boots'].forEach(function (sl) { var id = s.eq[sl]; if (id && ITEMS[id] && ITEMS[id].slot === sl) equip[sl] = id; }); }
      var mxHp = armorStats().hpMax;
      if (Array.isArray(s.s)) {
        P.bx = s.bx || 0;
        P.hp = s.s[0] > 0 ? clamp(s.s[0], 1, mxHp) : mxHp; P.hunger = clamp(s.s[1] != null ? s.s[1] : 100, 0, 100);
        P.thirst = clamp(s.s[2] != null ? s.s[2] : 100, 0, 100); P.energy = clamp(s.s[3] != null ? s.s[3] : 100, 0, 100);
        P.comfort = clamp(s.s[4] != null ? s.s[4] : 100, 0, 100); status = freshStatus(); status.poison = s.s[5] || 0; status.stomach = s.s[6] || 0; status.wpoison = s.s[7] || 0;
      }
      inv = {}; var MIG = { broken_copper_wire: 'copper_ore', dirty_veg: 'dirty_cabbage', dirty_fruits: 'dirty_apple', contaminated_veg: 'contaminated_cabbage', contaminated_fruits: 'contaminated_apple', fresh_veg: 'cabbage', fresh_fruits: 'apple' }; for (var k0 in (s.i || {})) { var k = MIG[k0] || k0; if (ITEMS[k] && s.i[k0] > 0) inv[k] = (inv[k] || 0) + s.i[k0]; }
      acc = [null, null, null, null]; (s.ac || []).slice(0, 4).forEach(function (id, i) { if (id && ITEMS[id] && ITEMS[id].type === 'acc') acc[i] = id; });
      clearCorpses(); (s.co || []).forEach(function (c) { if (c && c[2]) addCorpse(c[0], c[1], c[2], true, playerName); });
      hot = (s.h || []).concat([null, null, null, null, null, null, null, null]).slice(0, 8);
      sel = clamp(s.l || 0, 0, 7); dead = false; rest = null; $('#dark').style.opacity = 0;
    }
    return true;
  }

  function placeAtSpawn(slotIdx) {
    var off = slotIdx || 0, h1 = (hash32((baseSeed | 0) ^ 0x5bd1e995) >>> 0) / 4294967296, h2 = (hash32((baseSeed | 0) ^ 0x2545f491) >>> 0) / 4294967296, sa = h1 * 6.2832 + off * 0.5, sr = 7.6 + h2 * 4.4;
    P.x = -32 + Math.cos(sa) * sr; P.z = 32 + Math.sin(sa) * sr; if (W.seaAt && W.seaAt(P.x, P.z)) { P.x = W.spawn.x; P.z = W.spawn.z; }
    P.y = 0; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.pitch = 0; ugOn = false; if (W.setUnderground) { W.setUnderground(false); }
    while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1;
  }
  function newPlayerState(slotIdx) {
    inv = { rusty_axe: 1, rusty_pickaxe: 1, plastic_bottled_water: 1 };
    hot = [null, 'rusty_axe', 'rusty_pickaxe', 'plastic_bottled_water', null, null, null, null]; sel = 1;
    equip = { head: null, chest: null, legs: null, boots: null }; acc = [null, null, null, null]; clearCorpses(); cooking = []; heatQ = []; burn.left = 0; fuelSl = { id: null, n: 0 }; seenRec = {}; heatGot = 0; manning = null; if (seat) { seat.vs.seated = false; seat = null; if (driveEl) driveEl.style.display = 'none'; if (dashOpen) closeDash(); } mg = null; endFish();
    P.hp = P.hunger = P.thirst = P.energy = P.comfort = 100; status = freshStatus(); kills = 0; dead = false; rest = null;
    $('#dark').style.opacity = 0; placeAtSpawn(slotIdx || 0);
  }
  function clearZombies() { zombies.forEach(function (z) { scene.remove(z.g); }); zombies.length = 0; dorm.n = 0; zMap = Object.create(null); }

  function count(id) { if (id === 'any_water') { var aw = 0; WZ.WATER_BUCKETS.forEach(function (b) { aw += inv[b[0]] || 0; }); return aw; } if (id === 'wood') return (inv.wood || 0) + (inv.pine_log || 0) + (inv.palm_log || 0); return inv[id] || 0; }
  function roomFor(id) { var it = ITEMS[id]; if (!it) return 0; if (it.pack) return 99; var cur = inv[id] || 0, st = WZ.maxStack(id), cs = Math.ceil(cur / st), free = slotCap() - slotsUsed(); return Math.max(0, (cs + free) * st - cur); }
  function slotCap() { return WZ.BAG_SLOTS + (count('wood_plank_basket') > 0 ? 6 : 0); }
  function slotsUsed() { var n = 0; Object.keys(inv).forEach(function (id) { if (inv[id] > 0 && ITEMS[id] && !ITEMS[id].pack) n += Math.ceil(inv[id] / WZ.maxStack(id)); }); return n; }
  function dropBag(id, n, name) {
    var near = null; corpses.forEach(function (c) { if (c.name === (name || 'Dropped Items') && Math.hypot(c.x - P.x, c.z - P.z) < 1.5) near = c; });
    if (near) { near.loot.inv[id] = (near.loot.inv[id] || 0) + n; bagVisual(near); return; }
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
    if (id === 'any_water') { WZ.WATER_BUCKETS.forEach(function (b) { while (n > 0 && (inv[b[0]] || 0) > 0) { takeRaw(b[0], 1); give(b[1], 1); n--; } }); return; }
    if (id === 'wood') { ['wood', 'pine_log', 'palm_log'].forEach(function (w) { if (n <= 0) return; var u = Math.min(inv[w] || 0, n); if (u > 0) { takeRaw(w, u); n -= u; } }); return; }
    takeRaw(id, n);
  }
  function takeRaw(id, n) {
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
  /* ---- Grass tufts around the player (Jungle dense, Plain medium, Snow sparse) ---- */
  var GR = { m: null, lx: 1e9, lz: 1e9, t: 0 };
  function grassTick(dt) {
    if (!GR.m) {
      var geo = new THREE.ConeGeometry(0.032, 0.34, 4); geo.translate(0, 0.16, 0);
      GR.m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.45 }), 2600);
      GR.m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2600 * 3).fill(1), 3);
      GR.m.frustumCulled = false; GR.m.count = 0; scene.add(GR.m);
    }
    GR.m.visible = !ugOn && gfx.grass !== false; if (!GR.m.visible) return;
    GR.t -= dt; if (GR.t > 0 && Math.hypot(P.x - GR.lx, P.z - GR.lz) < 3) return; GR.t = 1.5; GR.lx = P.x; GR.lz = P.z;
    var CS = 1.9, R = 30, ci0 = Math.floor((P.x - R) / CS), ci1 = Math.floor((P.x + R) / CS), cj0 = Math.floor((P.z - R) / CS), cj1 = Math.floor((P.z + R) / CS), n = 0, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3(1, 1, 1), C = new THREE.Color();
    var CT = { jungle: [[0x2f7a2a, 0x3f9a34, 0x57b040], 0.62], city: [[0x5f8a3a, 0x739a40, 0x4c7a30], 0.3], snow: [[0x9ab88a, 0xb6cfa8, 0x86a878], 0.07], mountain: [[0x5a7a4a, 0x6a8a52, 0x4a6a40], 0.2] };
    for (var i = ci0; i <= ci1 && n < 2500; i++) for (var j = cj0; j <= cj1 && n < 2500; j++) {
      var h = hash32(Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 0x51ed), px = (i + ((h & 255) / 255)) * CS, pz = (j + (((h >> 8) & 255) / 255)) * CS;
      if (Math.hypot(px - P.x, pz - P.z) > R) continue; var bm = W.biomeOf(px, pz), cfg = CT[bm]; if (!cfg || ((h >> 16) & 255) / 255 > cfg[1]) continue;
      if (W.onRoad && W.onRoad(px, pz, 0.6)) continue; var ng = false; if (W.noGrass) for (var q = 0; q < W.noGrass.length; q++) { var nr = W.noGrass[q]; if (px > nr[0] && px < nr[1] && pz > nr[2] && pz < nr[3]) { ng = true; break; } } if (ng) continue; if (W.waterAt && W.waterAt(px, pz)) continue;
      var gy = W.gh ? W.gh(px, pz) : 0; if (gy < -0.15) continue;
      if (W.hit && W.hit(px - 0.25, px + 0.25, gy + 0.02, gy + 1.2, pz - 0.25, pz + 0.25)) continue;
      var sc = 0.7 + ((h >> 24) & 15) / 15 * 0.85;
      for (var b = 0; b < 3 && n < 2600; b++) {
        var ang = ((h >> (b * 3)) & 7) / 7 * 6.28, off = 0.07 + b * 0.02;
        var gx = px + Math.cos(ang) * off, gz = pz + Math.sin(ang) * off, gyb = W.gh ? W.gh(gx, gz) : gy;
        Vp.set(gx, gyb - 0.02, gz); E.set((b - 1) * 0.28, ang, (1 - b) * 0.22); Q.setFromEuler(E); Vs.set(1, sc * (0.8 + b * 0.2), 1); M.compose(Vp, Q, Vs); GR.m.setMatrixAt(n, M); C.setHex(cfg[0][(h + b) % 3]); GR.m.setColorAt(n, C); n++;
      }
    }
    GR.m.count = n; GR.m.instanceMatrix.needsUpdate = true; if (GR.m.instanceColor) GR.m.instanceColor.needsUpdate = true;
  }
  /* ---- Temperature: safe 20-30 C. Cold (<20): speed -10%, hunger drains 10% faster. Hot (>30): speed -10%, thirst drains 10% faster. Never lethal on its own (10-40 C range). ---- */
  var BIOME_TEMP = { city: 25, jungle: 22, desert: 33, snow: 18, mountain: 15, peak: 10, beach: 30, sea: 30 };
  function envTemp() { if (ugOn) return 22; var b = W.biomeOf(P.x, P.z), t = BIOME_TEMP[b] != null ? BIOME_TEMP[b] : 25; if (W.seaAt && W.seaAt(P.x, P.z) && P.y < 0.5) t = 20; return t; }
  function tempState() { var t = P.temp == null ? 25 : P.temp; return t < 20 ? -1 : t > 30 ? 1 : 0; }
  function tempTick(dt) { var tgt = Math.max(10, Math.min(40, envTemp() - accStats().cool * (envTemp() > 20 ? 1 : 0))); if (P.temp == null) P.temp = tgt; P.temp += (tgt - P.temp) * Math.min(1, dt * 0.15); }
  function speedMult() { return (P.comfort <= 0 ? 0.98 : P.comfort <= 30 ? 0.99 : 1) * armorStats().spdBonus * accStats().spd * (tempState() !== 0 ? 0.9 : 1); }
  var queue = [];
  function push(ev) { var d = inputDelay(); if (d <= 0 && !queue.length) applyEv(ev); else { ev.t = performance.now() + d * 1000; queue.push(ev); } }
  function drain() { var n = performance.now(); while (queue.length && queue[0].t <= n) applyEv(queue.shift()); }
  function applyEv(e) {
    if (e.type === 'key' && status.keylock > 0 && e.down) { keys[e.code] = false; return; }
    if (mode !== 'play') { if (e.type === 'key' && !e.down) keys[e.code] = false; if (e.type === 'btn' && !e.down) lmb = false; return; }
    if (e.type === 'key') {
      keys[e.code] = e.down;
      if (e.down) {
        if (seat && carKey(e.code)) return;
        if (/^Digit[1-8]$/.test(e.code)) { sel = +e.code.slice(5) - 1; eatT = 0; SFX.play('click'); renderHotbar(); }
        else if (e.code === 'KeyE') interact();
        else if (e.code === 'KeyR') reloadGun();
        else if (e.code === 'KeyG' && creative) { fly = !fly; P.vy = 0; say(fly ? 'Fly ON (Space up, C down)' : 'Fly OFF'); }
        else if (e.code === 'KeyB' && creative) crOpen();
        else if (e.code === 'KeyF') { if (!hasFlash() && !ugOn) { say('You need a Flashlight accessory to use [F].', true); return; } torchOn = !torchOn; SFX.play('click'); say(torchOn ? 'Flashlight on.' : 'Flashlight off.'); }
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
  /* ---- Mobile / tablet on-screen controls: only when the device has NO fine pointer (mouse / trackpad) ---- */
  var IS_TOUCH = false; try { IS_TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) || (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && !matchMedia('(any-pointer: fine)').matches); } catch (e) {}
  WZ.isTouch = function () { return IS_TOUCH; };
  function buildTouch() {
    if (!IS_TOUCH || $('#tc')) return; document.body.classList.add('touch');
    var tc = document.createElement('div'); tc.id = 'tc';
    tc.innerHTML = '<div id="tcJoy"><i id="tcKnob"></i></div><div id="tcLook"></div><div class="tcb" data-k="Space" style="right:96px;bottom:150px">Jump</div><div class="tcb" data-tg="ShiftLeft" style="right:18px;bottom:210px">Run</div><div class="tcb big" data-b="0" style="right:18px;bottom:78px">Hit</div><div class="tcb" data-b="2" style="right:104px;bottom:60px">Place</div><div class="tcb" data-k="KeyE" style="right:18px;bottom:158px">E</div><div class="tcb" data-k="KeyF" style="right:188px;bottom:60px">Light</div><div class="tcb sm" data-a="bag" style="right:12px;top:54px">Bag</div><div class="tcb sm" data-a="drop" style="right:70px;top:54px">Drop</div><div class="tcb sm" data-a="pause" style="right:128px;top:54px">Menu</div>';
    document.body.appendChild(tc);
    var joy = $('#tcJoy'), knob = $('#tcKnob'), jid = null, jc = null, dirs = { KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0 };
    function setDir(k, v) { if (dirs[k] === v) return; dirs[k] = v; if (mode === 'play') push({ type: 'key', code: k, down: !!v }); else keys[k] = !!v; }
    function joyMove(x, y) { var dx = x - jc.x, dy = y - jc.y, l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; setDir('KeyW', dy < -14 ? 1 : 0); setDir('KeyS', dy > 14 ? 1 : 0); setDir('KeyA', dx < -14 ? 1 : 0); setDir('KeyD', dx > 14 ? 1 : 0); }
    function joyEnd() { jid = null; knob.style.transform = ''; ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(function (k) { setDir(k, 0); }); }
    joy.addEventListener('pointerdown', function (e) { e.preventDefault(); SFX.unlock(); jid = e.pointerId; var r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; try { joy.setPointerCapture(jid); } catch (x) {} joyMove(e.clientX, e.clientY); });
    joy.addEventListener('pointermove', function (e) { if (e.pointerId === jid) joyMove(e.clientX, e.clientY); });
    joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
    var look = $('#tcLook'), lid = null, lx = 0, ly = 0;
    look.addEventListener('pointerdown', function (e) { e.preventDefault(); SFX.unlock(); lid = e.pointerId; lx = e.clientX; ly = e.clientY; try { look.setPointerCapture(lid); } catch (x) {} });
    look.addEventListener('pointermove', function (e) { if (e.pointerId !== lid) return; if (mode === 'play') push({ type: 'mouse', dx: (e.clientX - lx) * 1.6, dy: (e.clientY - ly) * 1.6 }); lx = e.clientX; ly = e.clientY; });
    look.addEventListener('pointerup', function () { lid = null; }); look.addEventListener('pointercancel', function () { lid = null; });
    var sprintOn = false;
    tc.querySelectorAll('.tcb').forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation(); SFX.unlock(); b.classList.add('on');
        if (b.dataset.k) push({ type: 'key', code: b.dataset.k, down: true });
        else if (b.dataset.tg) { sprintOn = !sprintOn; b.classList.toggle('lit', sprintOn); push({ type: 'key', code: b.dataset.tg, down: sprintOn }); }
        else if (b.dataset.b != null) push({ type: 'btn', b: +b.dataset.b, down: true });
        else if (b.dataset.a === 'bag') { if (mode === 'play') openInv(); else if (mode === 'inv') closeInv(); }
        else if (b.dataset.a === 'drop') { if (mode === 'play') dropSelected(false); }
        else if (b.dataset.a === 'pause') { if (mode === 'play') showPause(); }
      });
      var up = function () { b.classList.remove('on'); if (b.dataset.k) push({ type: 'key', code: b.dataset.k, down: false }); else if (b.dataset.b != null) push({ type: 'btn', b: +b.dataset.b, down: false }); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    $('#hotbar').addEventListener('pointerdown', function (e) { var s = e.target.closest('.slot'); if (!s || mode !== 'play') return; e.preventDefault(); sel = +s.dataset.i; eatT = 0; SFX.play('click'); renderHotbar(); });
  }
  function syncTouch() { var tc = $('#tc'); if (tc) tc.style.display = (mode === 'play' || mode === 'inv') ? 'block' : 'none'; if (tc) tc.classList.toggle('invm', mode === 'inv'); }
  setInterval(function () { if (IS_TOUCH) { buildTouch(); syncTouch(); } }, 300);
  var hovId = null;
  document.addEventListener('mouseover', function (e) { var t = e.target && e.target.closest ? e.target.closest('#inv [data-item]') : null; hovId = t ? t.dataset.item : null; });
  function dropSelected(all) {
    var id = mode === 'inv' ? hovId : hot[sel]; if (!id || id === 'fists' || !ITEMS[id] || count(id) <= 0) { if (mode === 'play') say('Nothing selected to drop.', true); return; }
    var it = ITEMS[id], n = all ? count(id) : 1; if (it.pack) n = 1;
    if (id === 'band_aid_box' && P.bx > 0 && count(id) === 1) P.bx = 0;
    take(id, n); dropBag(id, n); say('Dropped ' + it.name + (n > 1 ? ' x' + n : '') + ' (Backspace)'); SFX.play('click'); hovId = null; renderHotbar(); if (mode === 'inv') renderInv();
  }
  window.addEventListener('keydown', function (e) {
    SFX.unlock();
    if (e.code === 'Backquote') { e.preventDefault(); if (!e.repeat) toggleDebug(); return; }
    if (status.keylock > 0 && e.code !== 'KeyP') { e.preventDefault(); return; }
    if (e.code === 'Tab' || e.code === 'KeyI') {
      if (mode === 'play' || mode === 'inv') { e.preventDefault(); if (!e.repeat) { if (mode === 'play') openInv(); else closeInv(); } }
      return;
    }
    if (e.code === 'Escape' && mode === 'inv' && !e.repeat) { e.preventDefault(); closeInv(); return; }
    if (e.code === 'Backspace' && (mode === 'play' || mode === 'inv') && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); if (!e.repeat) dropSelected(e.shiftKey); return; }
    if ((e.code === 'KeyP' || e.code === 'Escape') && mode === 'play' && !e.repeat) { showPause(); return; }
    if (mode !== 'play') return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (!e.repeat) push({ type: 'key', code: e.code, down: true });
  });
  window.addEventListener('keyup', function (e) { if (mode === 'play') push({ type: 'key', code: e.code, down: false }); else keys[e.code] = false; });
  document.addEventListener('mousemove', function (e) { if (mode === 'play' && (document.pointerLockElement || (fallbackLook && e.buttons === 4))) push({ type: 'mouse', dx: e.movementX || 0, dy: e.movementY || 0 }); });
  document.addEventListener('mousedown', function (e) {
    SFX.unlock(); if (IS_TOUCH) return;
    if (mode !== 'play' || (e.target && e.target.closest && e.target.closest('#altHint'))) return;
    if ((document.pointerLockElement || fallbackLook) && (e.button === 0 || e.button === 2)) { e.preventDefault(); push({ type: 'btn', b: e.button, down: true }); }
  });
  document.addEventListener('mouseup', function (e) { if (IS_TOUCH) return; if (mode === 'play') push({ type: 'btn', b: e.button, down: false }); else lmb = false; });
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
  function crestSvg() {
    return '<svg class="brand-crest" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
      '<rect x="4" y="4" width="56" height="56" rx="14" fill="#18140e" stroke="#e3b02a" stroke-width="2.5"/>' +
      '<path d="M16 20 L32 12 L48 20 V35 C48 44 40 50 32 53 C24 50 16 44 16 35 Z" fill="#2a2318" stroke="#e3b02a" stroke-width="2"/>' +
      '<path d="M23 26 L41 42 M41 26 L23 42" stroke="#e5484d" stroke-width="3.2" stroke-linecap="round"/></svg>';
  }
  function setBodyState(st) { if (document.body) document.body.dataset.state = st; }
  function controlsHtml(twoCol) {
    if (!twoCol) {
      return '<div class="keys"><b>W A S D</b><span>Move &middot; Shift Sprint &middot; Space Jump</span>' +
        '<b>Left / Right Click</b><span>Attack / Harvest / Shoot &middot; Place Block</span>' +
        '<b>E / R / F / M</b><span>Interact &middot; Reload &middot; Flashlight &middot; Mute</span>' +
        '<b>Tab / I / P</b><span>Inventory &amp; Crafting &middot; Pause &amp; Settings</span></div>';
    }
    return '<div class="keys-2col"><div class="keys"><b>W A S D</b><span>Move</span><b>Shift</b><span>Sprint</span><b>Space</b><span>Jump</span>' +
      '<b>Left Click</b><span>Attack, chop, mine, shoot, cast, or use medical item</span><b>Right Click</b><span>Place blocks &amp; furniture</span>' +
      '<b>E</b><span>Loot containers, sleep, sit, open stations &amp; shops</span></div>' +
      '<div class="keys"><b>R</b><span>Reload active firearm</span><b>F / M</b><span>Toggle flashlight / Mute all audio</span>' +
      '<b>1-8 / Scroll</b><span>Select hotbar slot</span><b>Backspace</b><span>Drop hovered/selected item (+Shift = stack)</span>' +
      '<b>Tab / I</b><span>Inventory, Equipment &amp; Crafting</span><b>Esc / P / `</b><span>Pause menu / Debug telemetry</span></div></div>';
  }

  /* ---------------- Main menu & multiplayer ---------------- */
  function totalPlayers() { return 1 + Object.keys(mp.peers).length; }
  function playerListHtml() {
    var arr = ['<span style="border-color:' + SLOT_HEX[mp.slot] + '">● ' + esc(playerName) + (mp.role === 'host' ? ' (Host)' : '') + '</span>'];
    for (var pid in mp.peers) { var pr = mp.peers[pid]; arr.push('<span style="border-color:' + SLOT_HEX[pr.slot % 4] + '">● ' + esc(pr.name) + (pr.slot === 0 ? ' (Host)' : '') + '</span>'); }
    return '<div class="plist">' + arr.join('') + '</div>';
  }
  function showMainMenu(errMsg) {
    mode = 'menu'; setBodyState('title'); keys = {}; lmb = false; eatT = 0; queue.length = 0; $('#hud').hidden = true; $('#inv').hidden = true; $('#eat').style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var acStatus = userId ? esc(userName || 'Signed in') + ' &middot; <a href="#" id="bSignOut" style="color:var(--gold)">Sign out</a>' : 'Guest &middot; <a href="#" id="bSignOut" style="color:var(--gold)">Sign in</a>';
    screen('<div class="card card-wide"><div class="land-grid">' +
      '<div class="land-col brand-panel">' +
        '<div><div class="brand-head">' + crestSvg() + '<div><span class="tag">Widescreen Survival Beta</span><h1><b>Webzombite</b></h1></div></div>' +
        '<p style="margin-top:12px">Survive across a 5,000 m &times; 5,000 m open world featuring City, Desert, Jungle, Snow, Mountain, and Ocean zones. Gather resources, craft gear, defend bases, and squad up for 4-player co-op.</p></div>' +
        '<div class="warn-note">Session progress resets when the tab closes unless saved. Use <b>Save / Load Code</b> or Cloud Save to preserve your world.</div>' +
        '<div class="box-sub"><div style="font-size:.82rem;font-weight:700;color:var(--fg)">Quick Controls</div>' + controlsHtml(false) + '</div>' +
        '<div class="row" style="justify-content:space-between"><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a><button class="btn sm" id="bWiki">Survival Wiki</button></div>' +
      '</div>' +
      '<div class="land-col">' +
        '<div class="box-sub">' +
          '<div class="row" style="justify-content:space-between"><label style="font-size:.84rem;color:var(--muted)">Survivor Callsign</label><span style="font-size:.78rem;color:var(--muted)">' + acStatus + '</span></div>' +
          '<input type="text" id="inpName" maxlength="16" value="' + esc(playerName) + '" placeholder="Enter your survivor name...">' +
          '<div class="mode-grid">' +
            '<label style="font-size:.78rem;color:var(--muted)">Difficulty<select id="selDiff"><option value="0">Normal</option><option value="1">Hard (1.2x HP)</option><option value="2">Harder (1.5x HP)</option><option value="3">Hardcore (2x HP)</option></select></label>' +
            '<label style="font-size:.78rem;color:var(--muted)">World Seed<input type="text" id="inpSeed" maxlength="24" placeholder="Random"></label>' +
            '<label style="font-size:.78rem;color:var(--muted)">Progression<select id="selTime"><option value="0">Standard</option><option value="1">Slow Tiers</option></select></label>' +
          '</div>' +
          '<div class="row" style="margin-top:4px">' +
            '<button class="btn primary" id="bSolo" style="flex:1 1 140px">Play Solo</button>' +
            '<button class="btn" id="bHost" style="flex:1 1 140px">Host Co-op (4P)</button>' +
          '</div>' +
          '<div class="row">' +
            '<button class="btn sm" id="bOpenLoad" style="flex:1">Load Save / Cloud</button>' +
            '<button class="btn sm" id="bGfx" style="flex:1">Settings &amp; Shaders</button>' +
            '<button class="btn sm" id="bCreative">Creative Mode</button>' +
          '</div>' +
        '</div>' +
        '<div class="box-sub">' +
          '<div style="font-size:.86rem;font-weight:700">Join Multiplayer Room (6-Character Code)</div>' +
          '<div class="row" style="flex-wrap:nowrap"><input type="text" id="inpRoom" maxlength="6" placeholder="e.g. k4m9p2" style="text-transform:lowercase;letter-spacing:.12em"><button class="btn primary" id="bJoin" style="white-space:nowrap">Join Room</button></div>' +
          '<div class="err" id="menuErr">' + esc(errMsg || '') + '</div>' +
        '</div>' +
      '</div>' +
    '</div></div>');

    function syncOpts() { pendSeed = seedFrom($('#inpSeed') && $('#inpSeed').value); wDiff = +($('#selDiff').value) || 0; wTime = +($('#selTime').value) || 0; }
    function syncName() { playerName = ($('#inpName').value || '').trim().slice(0, 16) || 'Survivor'; }
    $('#bSignOut').onclick = function (ev) { ev.preventDefault(); if (userId) signOut(); else askLogin(); };
    $('#bCreative').onclick = creativeToggle;
    $('#bSolo').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); syncOpts(); leaveRoom(); newWorld(); newPlayerState(0); coins = 0; kc = {}; T = 0; spawnT = 3; clearZombies(); enterGame(); say('World seed: ' + baseSeed + '. 30 seconds of safe time have started! Gather materials quickly.'); };
    $('#bHost').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); syncOpts(); hostRoom(false); };
    $('#bJoin').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); var c = Net.normalizeCode($('#inpRoom').value); if (c.length !== 6) { $('#menuErr').textContent = 'Enter exactly 6 letters/numbers for the room code.'; return; } joinRoom(c); };
    $('#inpRoom').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') $('#bJoin').click(); });
    $('#bOpenLoad').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); openCodeModal('menu'); };
    $('#bWiki').onclick = function () { location.href = 'wiki.html'; };
    $('#bGfx').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); openGfxModal('menu'); };
  }
  function enterGame() {
    setBodyState('playing');
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
  function backLink() { return '<a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a>'; }
  function gateScreen(leftHtml, rightHtml) {
    mode = 'menu'; setBodyState('title');
    screen('<div class="card card-wide"><div class="land-grid"><div class="land-col brand-panel"><div><div class="brand-head">' + crestSvg() + '<div><span class="tag">XKing Account</span><h1><b>Webzombite</b></h1></div></div>' + leftHtml + '</div>' + backLink() + '</div><div class="land-col box-sub" style="justify-content:center">' + rightHtml + '</div></div></div>');
  }
  function bootStartIfRequested() {
    try {
      if (new URLSearchParams(window.location.search).get('autostart') === '1') {
        var btn = $('#bSolo');
        if (btn) { btn.click(); return true; }
      }
    } catch (e) {}
    return false;
  }
  function authGate() {
    if (!window.supabase || !C.supabaseUrl) { showMainMenu(); bootStartIfRequested(); return; }
    try {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { storage: authStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
      sb.auth.getSession().then(function (r) {
        var se = r.data && r.data.session; if (!se) { showMainMenu(); bootStartIfRequested(); return; }
        afterLogin(se);
      }, function () { showMainMenu(); bootStartIfRequested(); });
    } catch (e) { showMainMenu(); bootStartIfRequested(); }
  }
  function askLogin(msg) {
    if (!sb && window.supabase && C.supabaseUrl) {
      try { sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { storage: authStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }); } catch (e) {}
    }
    gateScreen(
      '<p style="margin-top:14px">Sign in with your XKing account to sync cloud saves across devices, or play offline as a Guest with encrypted Save Codes.</p>',
      '<h2>Sign In</h2><input type="text" id="le" placeholder="Email" autocomplete="username"><input type="password" id="lp" placeholder="Password" autocomplete="current-password"><div class="err" id="lerr">' + esc(msg || '') + '</div><div class="row"><button class="btn primary" id="bLogin">Sign In</button><button class="btn" id="bDisc">Discord OAuth</button><button class="btn" id="bGuest">Play as Guest</button></div>'
    );
    function go() {
      if (!sb) { $('#lerr').textContent = 'Sign-in service unavailable.'; return; }
      var e = $('#le').value.trim(), pw = $('#lp').value; if (!e || !pw) return; $('#bLogin').disabled = true;
      sb.auth.signInWithPassword({ email: e, password: pw }).then(function (r) { if (r.error || !r.data.session) askLogin(r.error ? (/Invalid/i.test(r.error.message) ? 'Incorrect email or password.' : r.error.message) : 'Could not sign in.'); else afterLogin(r.data.session); });
    }
    $('#bLogin').onclick = go; $('#lp').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(); });
    $('#bDisc').onclick = function () { if (sb) sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: location.origin + location.pathname, scopes: 'identify email' } }); };
    $('#bGuest').onclick = function () { userId = null; userName = ''; showMainMenu(); };
  }
  function afterLogin(se) {
    userId = se.user.id; var md = se.user.user_metadata || {};
    userName = md.username || md.full_name || md.name || (se.user.email || '').split('@')[0] || 'Survivor';
    if (playerName === 'Survivor') playerName = String(userName).slice(0, 16);
    sb.rpc('beta_check').then(function (c) { if (c.data === true) showMainMenu(); else askPassword(); }, function () { showMainMenu(); });
  }
  function askPassword() {
    gateScreen(
      '<p style="margin-top:14px">This beta build supports authorized XKing beta accounts as well as Guest play.</p>',
      '<h2>Beta Verification</h2><input type="password" id="pw" placeholder="Beta password" autocomplete="off"><div class="err" id="perr"></div><div class="row"><button class="btn primary" id="bUnlock">Unlock</button><button class="btn" id="bGuestPw">Play as Guest</button><button class="btn" id="bOut">Sign Out</button></div>'
    );
    function go() {
      var v = $('#pw').value.trim(); if (!v) return; $('#bUnlock').disabled = true;
      sb.rpc('beta_unlock', { p_password: v }).then(function (r) { if (r.error) { $('#perr').textContent = r.error.message; $('#bUnlock').disabled = false; } else if (r.data === true) showMainMenu(); else { $('#perr').textContent = 'Wrong password.'; $('#bUnlock').disabled = false; } });
    }
    $('#bUnlock').onclick = go; $('#pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    $('#bGuestPw').onclick = function () { userId = null; userName = ''; showMainMenu(); };
    $('#bOut').onclick = signOut;
  }
  function signOut() { leaveRoom(); var done = function () { userId = null; userName = ''; showMainMenu(); }; if (sb) sb.auth.signOut().then(done, done); else done(); }

  function openCodeModal(from) {
    var prev = mode; mode = 'modal'; var canExp = from === 'pause', canImp = mp.role !== 'client', code = '';
    screen('<div class="card card-wide">' +
      '<div class="row" style="justify-content:space-between"><div><span class="tag">Encrypted Save Data</span><h2>Save Code &amp; World Loader</h2></div><button class="btn sm" id="bCloseCode">Back</button></div>' +
      '<div class="land-grid">' +
      (canExp ? '<div class="land-col box-sub"><div style="font-size:.9rem;font-weight:700">Export Current World (AES-GCM Protected)</div><input type="password" id="inpSavePw" maxlength="40" autocomplete="off" placeholder="Security password (min. 4 characters)"><div class="row"><button class="btn primary sm" id="bMakeCode">Generate Code</button><button class="btn sm" id="bCopySave" disabled>Copy Code</button><button class="btn sm" id="bDlSave" disabled>Download .txt</button><button class="btn sm" id="bCloudSave">Save to Cloud</button></div><span class="okmsg" id="copyMsg"></span><textarea id="txSave" readonly placeholder="Your encrypted WZL2 save code appears here. Keep your password safe."></textarea></div>' : '<div class="land-col brand-panel"><div><h2>Portable Save Codes</h2><p style="margin-top:8px">Paste a WZL2 save code or upload a .txt save file on the right, or pull your latest Cloud Save if signed in.</p></div><p style="font-size:.82rem">Codes are encrypted client-side using PBKDF2 + AES-GCM.</p></div>') +
      '<div class="land-col box-sub"><div style="font-size:.9rem;font-weight:700">Load World from Code or Cloud</div>' +
      (canImp ? '<textarea id="txLoad" placeholder="Paste WZL2:... code here"></textarea><input type="password" id="inpLoadPw" maxlength="40" autocomplete="off" placeholder="Security password of this code"><div class="row"><button class="btn primary sm" id="bDoLoadSolo">Load &amp; Play Solo</button><button class="btn sm" id="bDoLoadHost">Load &amp; Host (4P)</button><button class="btn sm" id="bCloudLoad">Load Cloud</button><label class="btn sm" style="cursor:pointer">Import .txt<input type="file" id="fLoad" accept=".txt" hidden></label></div><div class="err" id="loadErr"></div>' : '<p style="font-size:.85rem;color:#ff8b8f">Only the room Host or Solo player can load a save code.</p>') +
      '</div></div></div>');
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
        if (!sb || !userId) { $('#copyMsg').textContent = 'Sign in to use Cloud Save, or use Generate Code below.'; return; } $('#copyMsg').textContent = 'Saving...';
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
        if (!sb || !userId) { $('#loadErr').textContent = 'Sign in to use Cloud Load, or paste a Save Code above.'; return; } $('#loadErr').textContent = 'Loading...';
        sb.rpc('load_game', { p_game: 'webzombite' }).then(function (r) { if (r.error || !r.data || !r.data.v) { $('#loadErr').textContent = r.error ? r.error.message : 'No cloud save found.'; return; } runImp(false, r.data); }, function () { $('#loadErr').textContent = 'Could not reach the cloud.'; });
      };
    }
    $('#bCloseCode').onclick = function () { mode = prev; if (from === 'pause') showPause(); else showMainMenu(); };
  }

  /* ---------------- Graphics settings ---------------- */
  var PRESETS = {
    low:    { sd: 36, rd: 8,  ed: 6,  renderScale: 0.75, aniso: 2,  shadowRes: 1024, shadow: true, smap: false, bloom: false, godray: false, vignette: false, water: false, skyCloud: true, volCloud: false, aurora: false, stars: true, discs: true, haze: false, dirty: false, uwDist: false, wet: false, blurFx: false, dynLeaves: false, extraLeaves: false, fallLeaves: false, illum: false, ripples: false, flow: false, grass: true },
    medium: { sd: 56, rd: 12, ed: 8,  renderScale: 1.0,  aniso: 4,  shadowRes: 2048, shadow: true, smap: true,  bloom: true,  godray: false, vignette: true,  water: true,  skyCloud: true, volCloud: false, aurora: true,  stars: true, discs: true, haze: false, dirty: false, uwDist: true,  wet: true,  blurFx: true,  dynLeaves: false, extraLeaves: false, fallLeaves: false, illum: false, ripples: true,  flow: true, grass: true },
    high:   { sd: 80, rd: 16, ed: 10, renderScale: 1.0,  aniso: 8,  shadowRes: 2048, shadow: true, smap: true,  bloom: true,  godray: false, vignette: true,  water: true,  skyCloud: true, volCloud: false, aurora: true,  stars: true, discs: true, haze: true,  dirty: false, uwDist: true,  wet: true,  blurFx: true,  dynLeaves: true,  extraLeaves: false, fallLeaves: true,  illum: true,  ripples: true,  flow: true, grass: true },
    ultra:  { sd: 120, rd: 24, ed: 14, renderScale: 1.2,  aniso: 16, shadowRes: 3072, shadow: true, smap: true,  bloom: true,  godray: true,  vignette: true,  water: true,  skyCloud: true, volCloud: true,  aurora: true,  stars: true, discs: true, haze: true,  dirty: true,  uwDist: true,  wet: true,  blurFx: true,  dynLeaves: true,  extraLeaves: true,  fallLeaves: true,  illum: true,  ripples: true,  flow: true, grass: true }
  };
  function applyPreset(name) {
    var p = PRESETS[name]; if (!p) return;
    gfx.preset = name;
    for (var k in p) gfx[k] = p[k];
    saveGfx(); applyGfx();
  }
  function applyGfx() {
    if (!renderer || !W) return;
    var soft = !!window.__wzSoftwareGl;
    var scale = soft ? Math.min(1.0, gfx.renderScale || 1.0) : (gfx.renderScale || 1.0);
    renderer.setPixelRatio(soft ? 1 : Math.min(window.devicePixelRatio || 1, 1.5) * scale);
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
    if ('toneMappingExposure' in renderer) renderer.toneMappingExposure = gfx.exposure || 1.05;
    var unl = gfx.rd >= 9999; camera.far = unl ? 3200 : Math.max(300, (gfx.rd + 1) * 20 + 80); camera.updateProjectionMatrix();
    fogObj = scene.fog;
    if (W.setExtraLeaves) W.setExtraLeaves(!!gfx.extraLeaves); else if (W.leaf2M) W.leaf2M.visible = !!gfx.extraLeaves;
    if (W.leafU) W.leafU.uAmp.value = gfx.dynLeaves ? 0.09 : 0;
    if (gfx.fog) { fogObj.far = unl ? 800 : Math.max(60, gfx.rd * 20 * 0.96); fogObj.near = fogObj.far * 0.3; } else { fogObj.near = 1e6; fogObj.far = 2e6; }
    if (W.setShaderPack) W.setShaderPack(gfx.shaderPack || 'cinematic');
    if (W.setTexturePack) W.setTexturePack(gfx.texPack || 'realism', gfx.aniso || 8);
    zombies.forEach(function (z) { if (z.sh) z.sh.visible = gfx.shadow; });
    for (var pid in mp.peers) { var pm = mp.peers[pid].mesh; if (pm && pm.sh) pm.sh.visible = gfx.shadow; }
    var m = W.waterMat; if (m) {
      if (gfx.water && !soft) { if (!cubeCam) { cubeCam = new THREE.CubeCamera(0.3, 420, new THREE.WebGLCubeRenderTarget(64)); scene.add(cubeCam); } m.envMap = cubeCam.renderTarget.texture; m.envMapIntensity = 1.05; waterT = 0; }
      else m.envMap = null;
      m.needsUpdate = true;
    }
    var smOn = !!gfx.smap && !soft;
    if (W.sun && W.sun.shadow && W.sun.shadow.mapSize.width !== (gfx.shadowRes || 2048)) {
      var res = clamp(gfx.shadowRes || 2048, 1024, 4096);
      W.sun.shadow.mapSize.set(res, res);
      if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; }
    }
    renderer.shadowMap.enabled = smOn; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (W.setShadowDist) W.setShadowDist(gfx.sd || 70);
    W.shadowsOn = smOn; W.sun.castShadow = smOn; setShadowFlags(smOn); smT = 0;
    chunkT = 0; if (W.updateChunks) W.updateChunks(P.x, P.z, -Math.sin(P.yaw), -Math.cos(P.yaw), gfx.rd, gfx.cull);
  }
  /* Shadow map & custom Three.js r128 PostFX Pipeline (HDR Bloom, God Rays, Shader Color Grading, Vignette, Distortion) */
  var smT = 0, pfxRT = null, blmA = null, blmB = null, pfxScene = null, pfxCam = null, blmMat = null, compMat = null, pfxQuad = null;
  function setShadowFlags(on) {
    var mats = [];
    scene.children.forEach(function (ch) {
      if (ch.userData && ch.userData.mob) return;
      ch.traverse(function (o) {
        if (!o.isMesh || !o.material) return;
        var mat = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!mat || (!mat.isMeshLambertMaterial && !mat.isMeshStandardMaterial) || mat === W.waterMat) return;
        o.castShadow = on; o.receiveShadow = on;
        if (mats.indexOf(mat) < 0) mats.push(mat);
      });
    });
    mats.forEach(function (m) { m.needsUpdate = true; });
  }
  function ensurePostFX() {
    var sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    var w = Math.max(2, sz.x), h = Math.max(2, sz.y), bw = Math.max(2, w >> 1), bh = Math.max(2, h >> 1);
    if (pfxRT && (pfxRT.width !== w || pfxRT.height !== h)) { pfxRT.dispose(); pfxRT = null; if (blmA) { blmA.dispose(); blmA = null; } if (blmB) { blmB.dispose(); blmB = null; } }
    if (!pfxRT) {
      pfxRT = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
      blmA = new THREE.WebGLRenderTarget(bw, bh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
      blmB = new THREE.WebGLRenderTarget(bw, bh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    }
    if (!compMat) {
      var qV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      blmMat = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uStep: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / bw, 1 / bh) } },
        vertexShader: qV,
        fragmentShader:
          'uniform sampler2D tSrc; uniform vec2 uDir, uTexel; uniform float uStep; varying vec2 vUv;' +
          'void main(){' +
          '  if (uStep < 0.5) {' +
          '    vec3 c = texture2D(tSrc, vUv).rgb;' +
          '    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));' +
          '    float br = smoothstep(0.66, 1.12, l);' +
          '    gl_FragColor = vec4(c * br, 1.0);' +
          '  } else {' +
          '    vec2 o1 = uDir * uTexel * 1.3846; vec2 o2 = uDir * uTexel * 3.2307;' +
          '    vec3 sum = texture2D(tSrc, vUv).rgb * 0.2270;' +
          '    sum += (texture2D(tSrc, vUv + o1).rgb + texture2D(tSrc, vUv - o1).rgb) * 0.3162;' +
          '    sum += (texture2D(tSrc, vUv + o2).rgb + texture2D(tSrc, vUv - o2).rgb) * 0.0703;' +
          '    gl_FragColor = vec4(sum, 1.0);' +
          '  }' +
          '}'
      });
      compMat = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: {
          tScene: { value: null }, tBloom: { value: null },
          uTime: { value: 0 }, uSun: { value: new THREE.Vector2(0.5, 0.5) },
          uGrK: { value: 0 }, uBloomK: { value: 0 }, uVigK: { value: 0 },
          uGrade: { value: 0 }, uHazeK: { value: 0 }, uBlurK: { value: 0 },
          uUwK: { value: 0 }, uBloodK: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }
        },
        vertexShader: qV,
        fragmentShader:
          'uniform sampler2D tScene, tBloom; uniform float uTime, uGrK, uBloomK, uVigK, uGrade, uHazeK, uBlurK, uUwK, uBloodK; uniform vec2 uSun, uTexel; varying vec2 vUv;' +
          'void main(){' +
          '  vec2 uv = vUv;' +
          '  if (uHazeK > 0.001) {' +
          '    uv.x += sin(uv.y * 42.0 + uTime * 3.8) * 0.0016 * uHazeK;' +
          '    uv.y += cos(uv.x * 34.0 + uTime * 3.1) * 0.0012 * uHazeK;' +
          '  }' +
          '  if (uUwK > 0.001) {' +
          '    uv.x += sin(uv.y * 18.0 + uTime * 2.5) * 0.004 * uUwK;' +
          '    uv.y += cos(uv.x * 22.0 + uTime * 2.0) * 0.003 * uUwK;' +
          '  }' +
          '  vec3 c = texture2D(tScene, clamp(uv, 0.001, 0.999)).rgb;' +
          '  if (uBlurK > 0.01) {' +
          '    vec2 b = uTexel * (1.2 + uBlurK * 2.6);' +
          '    vec3 bl = (texture2D(tScene, clamp(uv + vec2(b.x, 0.0), 0.001, 0.999)).rgb +' +
          '               texture2D(tScene, clamp(uv - vec2(b.x, 0.0), 0.001, 0.999)).rgb +' +
          '               texture2D(tScene, clamp(uv + vec2(0.0, b.y), 0.001, 0.999)).rgb +' +
          '               texture2D(tScene, clamp(uv - vec2(0.0, b.y), 0.001, 0.999)).rgb) * 0.25;' +
          '    c = mix(c, bl, clamp(uBlurK * 0.65, 0.0, 0.72));' +
          '  }' +
          '  if (uBloomK > 0.001) {' +
          '    c += texture2D(tBloom, clamp(uv, 0.001, 0.999)).rgb * (0.34 * uBloomK);' +
          '  }' +
          '  if (uGrK > 0.01) {' +
          '    vec2 d = (uSun - uv) / 20.0 * 0.92; vec2 p = uv; float acc = 0.0, w = 1.0;' +
          '    for (int i = 0; i < 20; i++) { p += d; vec3 s = texture2D(tScene, clamp(p, 0.001, 0.999)).rgb; float l = dot(s, vec3(0.299, 0.587, 0.114)); acc += smoothstep(0.62, 0.95, l) * w; w *= 0.945; }' +
          '    c += vec3(1.0, 0.88, 0.60) * acc * uGrK * 0.075;' +
          '  }' +
          '  if (uUwK > 0.001) { c = mix(c, c * vec3(0.55, 0.86, 0.98) + vec3(0.01, 0.06, 0.09), 0.45 * uUwK); }' +
          '  /* Hue-preserving shader pack grading (never shifts pure red/green/blue paint hues) */' +
          '  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));' +
          '  if (uGrade > 0.5 && uGrade < 1.5) {' +
          '    c = mix(vec3(lum), c, 1.06);' +
          '    c *= mix(vec3(1.01, 0.99, 0.97), vec3(1.05, 1.00, 0.92), smoothstep(0.2, 0.9, lum));' +
          '  } else if (uGrade >= 1.5 && uGrade < 2.5) {' +
          '    c = mix(vec3(lum), c, 1.08) * 1.02;' +
          '  } else if (uGrade >= 2.5) {' +
          '    c = mix(vec3(lum), c, 0.72) * vec3(0.95, 0.98, 1.04);' +
          '  } else {' +
          '    c = mix(vec3(lum), c, 1.04);' +
          '  }' +
          '  c = pow(max(c, vec3(0.0)), vec3(0.4545));' +
          '  if (uVigK > 0.001) {' +
          '    vec2 dv = vUv - 0.5; float v = smoothstep(0.24, 0.86, dot(dv, dv) * 1.45);' +
          '    c *= 1.0 - v * (0.28 * uVigK);' +
          '  }' +
          '  if (uBloodK > 0.001) {' +
          '    vec2 dv2 = vUv - 0.5; float bv = smoothstep(0.25, 0.8, dot(dv2, dv2) * 1.4);' +
          '    c = mix(c, vec3(0.65, 0.06, 0.06), bv * 0.25 * uBloodK);' +
          '  }' +
          '  gl_FragColor = vec4(c, 1.0);' +
          '}'
      });
      pfxCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      pfxScene = new THREE.Scene();
      pfxQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat);
      pfxScene.add(pfxQuad);
    }
    blmMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    compMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    compMat.uniforms.tScene.value = pfxRT.texture;
    compMat.uniforms.tBloom.value = blmA.texture;
  }
  /* ================= FX: sky, weather, post effects (all optional, see Graphics Settings) ================= */
  var FX = { grp: null, ready: false, wind: 0, rain: 0, tex: null, arr: null, clouds: null, aur: null, mw: null, stars: null, sunH: null, moonH: null, sunD: null, rainL: null, rainP: null, puddles: [], ripples: [], rt: 0, lens: null, svg: null, lastF: '', wetK: 0, mirCam: null, mirT: 0, flowTex: null, falls: null, fallArr: [], fallT: 0, pvy: 0, pg: true, ripT: 0, hb: 0 };
  function fxBuildNoise() {
    var N = 128, a = new Float32Array(N * N), L = 16, lat = new Float32Array(L * L), i, j, o;
    function rs(sd) { var s = sd; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    var r = rs(777); for (i = 0; i < L * L; i++) lat[i] = r();
    function vn(x, y, per) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); function g(a2, b2) { return lat[((b2 % per + per) % per) * L + ((a2 % per + per) % per)]; } return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy; }
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var v = 0, amp = 0.5, tot = 0, per = 4; for (o = 0; o < 4; o++) { v += vn(i / N * per, j / N * per, per) * amp; tot += amp; amp *= 0.5; per *= 2; if (per > L) per = L; } a[j * N + i] = v / tot; }
    var px = new Uint8Array(N * N * 4); for (i = 0; i < N * N; i++) { var c = clamp((a[i] - 0.25) * 1.9, 0, 1); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = Math.round(c * 255); px[i * 4 + 3] = 255; a[i] = c; }
    var t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; FX.tex = t; FX.arr = a; FX.N = N;
  }
  function fxSample(u, v) { var N = FX.N, x = (u - Math.floor(u)) * N, y = (v - Math.floor(v)) * N, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = FX.arr; function g(i, j) { return a[(j % N) * N + (i % N)]; } return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy; }
  function glowTex(inner, outer) { var cv = document.createElement('canvas'); cv.width = cv.height = 128; var g2 = cv.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.18, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); }
  var FX_V = 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  function fxBuild() {
    if (FX.ready) return; FX.ready = true; fxBuildNoise();
    var grp = FX.grp = new THREE.Group(); scene.add(grp); var sph = new THREE.SphereGeometry(205, 32, 16);
    FX.cU = { tex: { value: FX.tex }, cam: { value: new THREE.Vector3() }, wind: { value: 0 }, cover: { value: 0.5 }, tint: { value: new THREE.Vector3(1, 1, 1) }, vol: { value: 0 }, sunD: { value: new THREE.Vector3(0, 1, 0) }, op: { value: 1 } };
    FX.clouds = new THREE.Mesh(sph, new THREE.ShaderMaterial({ uniforms: FX.cU, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, vertexShader: FX_V,
      fragmentShader: 'uniform sampler2D tex; uniform vec3 cam; uniform float wind, cover, vol, op; uniform vec3 tint, sunD; varying vec3 vD;' +
      'float dens(vec2 p, float h){ float d = texture2D(tex, p * 0.0011 + vec2(wind, wind * 0.3)).r; d = d * 0.75 + texture2D(tex, p * 0.0031 + vec2(wind * 1.6, 0.2)).r * 0.25; return d; }' +
      'void main(){ vec3 dir = normalize(vD); if (dir.y < 0.035) discard; float fade = smoothstep(0.035, 0.2, dir.y); float a = 0.0, lit = 1.0;' +
      'if (vol < 0.5) { for (int L = 0; L < 2; L++) { float h = L == 0 ? 300.0 : 500.0; float t = (h - cam.y) / dir.y; vec2 p = cam.xz + dir.xz * t; float d = dens(p + float(L) * 3100.0, h); a = max(a, smoothstep(1.0 - cover, 1.0 - cover + 0.22, d) * (L == 0 ? 0.95 : 0.7)); } lit = 1.0 - a * 0.18; }' +
      'else { float t0 = (300.0 - cam.y) / dir.y, t1 = (500.0 - cam.y) / dir.y, acc = 0.0, sh = 0.0; float jt = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); for (int i = 0; i < 12; i++) { float f = (float(i) + jt) / 12.0, t = mix(t0, t1, f); vec3 p = cam + dir * t; float prof = smoothstep(0.0, 0.25, f) * smoothstep(1.0, 0.55, f); float d = dens(p.xz + p.y * 0.35, p.y); float c = smoothstep(1.0 - cover, 1.0 - cover + 0.2, d * (0.55 + 0.9 * prof)) * prof; float s = dens(p.xz + sunD.xz * 60.0 / max(0.2, sunD.y) , p.y); sh += c * smoothstep(1.0 - cover, 1.0 - cover + 0.2, s) * 0.35; acc += c * 0.13; } a = clamp(acc, 0.0, 0.9); lit = 1.0 - clamp(sh / max(acc, 0.05), 0.0, 0.65) * 0.32; }' +
      'gl_FragColor = vec4(tint * lit, a * fade * op); }' }));
    FX.clouds.renderOrder = -3; grp.add(FX.clouds);
    var au = { tex: { value: FX.tex }, time: { value: 0 }, k: { value: 0 } }; FX.aU = au;
    FX.aur = new THREE.Mesh(sph, new THREE.ShaderMaterial({ uniforms: au, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, blending: THREE.AdditiveBlending, vertexShader: FX_V,
      fragmentShader: 'uniform sampler2D tex; uniform float time, k; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = d.y; if (h < 0.08) discard; float a = atan(d.x, d.z); float n = texture2D(tex, vec2(a * 0.35 + time * 0.004, h * 0.6)).r; float rays = texture2D(tex, vec2(a * 3.0, time * 0.01)).r; float band = smoothstep(0.08, 0.28, h) * smoothstep(0.8, 0.4, h); float wave = sin(a * 3.0 + time * 0.25 + n * 6.0) * 0.5 + 0.5; float I = band * pow(wave, 2.0) * (0.35 + 0.8 * rays) * k; vec3 col = mix(vec3(0.1, 1.0, 0.5), vec3(0.65, 0.3, 1.0), smoothstep(0.25, 0.65, h + n * 0.15)); gl_FragColor = vec4(col * I * 1.5, I); }' }));
    FX.aur.visible = false; grp.add(FX.aur);
    var mu = { tex: { value: FX.tex }, k: { value: 0 } }; FX.mU = mu;
    FX.mw = new THREE.Mesh(sph, new THREE.ShaderMaterial({ uniforms: mu, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, blending: THREE.AdditiveBlending, vertexShader: FX_V,
      fragmentShader: 'uniform sampler2D tex; uniform float k; varying vec3 vD; void main(){ vec3 d = normalize(vD); if (d.y < 0.0) discard; vec3 n = normalize(vec3(0.35, 0.62, -0.7)); float v = dot(d, n); float band = exp(-pow(v / 0.17, 2.0)); float dust = texture2D(tex, vec2(atan(d.x, d.z) * 0.9, d.y * 1.4)).r; float core = exp(-pow(v / 0.06, 2.0)); float I = (band * (0.25 + 0.55 * dust) + core * 0.25) * k * smoothstep(0.0, 0.2, d.y); gl_FragColor = vec4(vec3(0.62, 0.68, 1.0) * I, I); }' }));
    FX.mw.visible = false; grp.add(FX.mw);
    var sp = [], ph = [], r = function () { return Math.random(); }, i; for (i = 0; i < 1500; i++) { var th = r() * 6.283, p2 = Math.asin(r() * 0.98 + 0.02); sp.push(Math.cos(th) * Math.cos(p2) * 200, Math.sin(p2) * 200, Math.sin(th) * Math.cos(p2) * 200); ph.push(r() * 6.28, 0.6 + r() * 1.6); }
    var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('ph', new THREE.Float32BufferAttribute(ph, 2)); FX.sU = { time: { value: 0 }, k: { value: 0 } };
    FX.stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: FX.sU, transparent: true, depthWrite: false, fog: false, vertexShader: 'attribute vec2 ph; uniform float time; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(time * (1.5 + ph.y) + ph.x); gl_PointSize = 1.2 + ph.y * 0.9; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform float k; varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.97, 0.92), vA * k); }' }));
    FX.stars.visible = false; grp.add(FX.stars);
    function spr(tex, sz) { var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.set(sz, sz, 1); s.visible = false; grp.add(s); return s; }
    FX.sunH = spr(glowTex('rgba(255,244,200,1)', 'rgba(255,190,90,0.35)'), 120); FX.sunD = spr(glowTex('rgba(255,255,235,1)', 'rgba(255,255,235,0.9)'), 22);
    FX.moonH = spr(glowTex('rgba(210,225,255,0.95)', 'rgba(150,180,255,0.28)'), 80); FX.moonD = spr(glowTex('rgba(240,245,255,1)', 'rgba(235,240,255,0.9)'), 15);
    /* rain */
    var rp = new Float32Array(600 * 6); for (i = 0; i < 600; i++) { var rx = (r() - 0.5) * 36, ry = r() * 20, rz = (r() - 0.5) * 36; rp.set([rx, ry, rz, rx, ry - 0.7, rz], i * 6); } var rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    FX.rainL = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xb8c8dc, transparent: true, opacity: 0, depthWrite: false, fog: false })); FX.rainL.frustumCulled = false; FX.rainL.visible = false; scene.add(FX.rainL);
    /* puddles & ripples */
    for (i = 0; i < 26; i++) { var pd = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: 0x24343f, transparent: true, opacity: 0, depthWrite: false })); pd.rotation.x = -Math.PI / 2; pd.position.y = 0.045; pd.visible = false; scene.add(pd); FX.puddles.push(pd); }
    for (i = 0; i < 24; i++) { var rm = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); rm.rotation.x = -Math.PI / 2; rm.position.y = 0.075; rm.visible = false; scene.add(rm); FX.ripples.push({ m: rm, t: 99, life: 1, mx: 1 }); }
    /* falling leaves */
    var fg = new THREE.PlaneGeometry(0.2, 0.28); FX.falls = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ map: W.leafTex, alphaTest: 0.5, side: THREE.DoubleSide }), 120); FX.falls.frustumCulled = false; FX.falls.count = 0; scene.add(FX.falls);
    /* lens overlay */
    var lc = document.createElement('canvas'); lc.id = 'fxLens'; lc.width = 640; lc.height = 360; lc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;opacity:0;mix-blend-mode:screen'; document.body.appendChild(lc); FX.lens = lc;
    var lg = lc.getContext('2d'), rr = function (a, b) { return a + Math.random() * (b - a); }; for (i = 0; i < 90; i++) { var x = rr(0, 640), y = rr(0, 360), s = rr(2, 14), gr = lg.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); lg.fillStyle = gr; lg.fillRect(x - s, y - s, s * 2, s * 2); }
    for (i = 0; i < 26; i++) { var x2 = rr(0, 640), y2 = rr(0, 360), s2 = rr(5, 17); lg.strokeStyle = 'rgba(210,235,255,0.55)'; lg.lineWidth = 1.6; lg.beginPath(); lg.arc(x2, y2, s2, 0, 6.3); lg.stroke(); lg.fillStyle = 'rgba(255,255,255,0.12)'; lg.fill(); lg.fillStyle = 'rgba(255,255,255,0.8)'; lg.beginPath(); lg.arc(x2 - s2 * 0.3, y2 - s2 * 0.3, s2 * 0.18, 0, 6.3); lg.fill(); }
    /* svg displacement filter (heat haze / underwater) */
    var sv = document.createElement('div'); sv.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; sv.innerHTML = '<svg width="0" height="0"><filter id="wzfx" x="0" y="0" width="100%" height="100%"><feTurbulence id="wzT" type="fractalNoise" baseFrequency="0.01 0.035" numOctaves="2" result="n"/><feDisplacementMap id="wzD" in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>'; document.body.appendChild(sv); FX.svg = sv;
    /* river flow texture */
    var fc = document.createElement('canvas'); fc.width = 64; fc.height = 128; var fg2 = fc.getContext('2d'); fg2.fillStyle = '#2f7fa8'; fg2.fillRect(0, 0, 64, 128); for (i = 0; i < 40; i++) { fg2.strokeStyle = 'rgba(220,240,255,' + rr(0.15, 0.5) + ')'; fg2.lineWidth = rr(1, 2.5); var fx0 = rr(0, 64), fy0 = rr(0, 128); fg2.beginPath(); fg2.moveTo(fx0, fy0); fg2.lineTo(fx0 + rr(-3, 3), fy0 + rr(10, 26)); fg2.stroke(); }
    FX.flowTex = new THREE.CanvasTexture(fc); FX.flowTex.wrapS = FX.flowTex.wrapT = THREE.RepeatWrapping; FX.flowTex.repeat.set(2, 60);
    FX.riverMat = new THREE.MeshLambertMaterial({ map: FX.flowTex, transparent: true, opacity: 0.85 });
  }
  function fxRipple(x, z, k) { if (!gfx.ripples || !FX.ready) return; var best = FX.ripples[0], i; for (i = 0; i < FX.ripples.length; i++) if (FX.ripples[i].t >= FX.ripples[i].life) { best = FX.ripples[i]; break; } best.t = 0; best.life = 0.9 + k * 0.5; best.mx = 0.5 + k * 1.6; best.m.position.x = x; best.m.position.z = z; best.m.visible = true; }
  function fxRainAt(T2) { var n = 0.5 + 0.28 * Math.sin(T2 / 330) + 0.22 * Math.sin(T2 / 91 + 1.3); return clamp((n - 0.74) / 0.08, 0, 1); }
  function fxTick(dt, clk) {
    if (!W || !W.leafU) return; var sv = W.sunVec || { x: 0, y: 100, z: 0 }, day = clamp(sv.y / 90 + 0.2, 0.08, 1), night = sv.y < -10 ? 1 : sv.y < 15 ? clamp((15 - sv.y) / 25, 0, 1) : 0, biome = W.biomeOf(P.x, P.z), eyeY = camera.position.y;
    /* option-driven visibility */
    if (gfx.volCloud) gfx.skyCloud = true;
    var need = gfx.skyCloud || gfx.stars || gfx.aurora || gfx.discs || gfx.dirty || gfx.haze || gfx.uwDist || gfx.wet || gfx.blurFx || gfx.ripples || gfx.flow || gfx.fallLeaves; if (!need && !FX.ready) { return; } fxBuild();
    var tt = performance.now() / 1000; FX.wind += dt * 0.004; FX.grp.position.copy(camera.position); FX.grp.visible = !ugOn;
    var rainT = gfx.skyCloud ? fxRainAt(T) : 0; FX.rain += (rainT - FX.rain) * Math.min(1, dt * 0.4);
    /* clouds */
    FX.clouds.visible = !!gfx.skyCloud && !ugOn; var u = FX.cU; u.cam.value.copy(camera.position); u.wind.value = FX.wind; u.cover.value = 0.42 + FX.rain * 0.35 + (bloodOn ? 0.1 : 0); u.vol.value = gfx.volCloud ? 1 : 0; u.sunD.value.set(sv.x, sv.y, sv.z).normalize();
    var warm = clamp(1 - Math.abs(sv.y - 25) / 45, 0, 1) * (sv.y > -5 ? 1 : 0), gray = 1 - FX.rain * 0.55; u.tint.value.set((0.2 + 0.8 * day + warm * 0.35) * gray * (bloodOn ? 1.25 : 1), (0.22 + 0.78 * day + warm * 0.1) * gray * (bloodOn ? 0.7 : 1), (0.3 + 0.7 * day - warm * 0.1) * gray * (bloodOn ? 0.7 : 1));
    /* sun dimming from clouds (cloud shadows) and rain */
    if (W.sun && gfx.skyCloud && !ugOn) { var sd = 1 - FX.rain * 0.45; if (gfx.volCloud && sv.y > 5) { var tl = 400 / Math.max(0.2, sv.y / 215), cv = fxSample((P.x + sv.x / 215 * tl) * 0.0011 + FX.wind, (P.z + sv.z / 215 * tl) * 0.0011 + FX.wind * 0.3), cc = clamp((cv - (1 - u.cover.value)) / 0.22, 0, 1); sd *= 1 - cc * 0.5; } W.sun.intensity *= sd; }
    /* rain streaks */
    var rk = gfx.skyCloud && !ugOn ? FX.rain : 0; FX.rainL.visible = rk > 0.05; if (FX.rainL.visible) { FX.rainL.material.opacity = 0.5 * rk; FX.rainL.position.set(P.x, camera.position.y - 6, P.z); var pa = FX.rainL.geometry.attributes.position, ar = pa.array; for (var ri = 0; ri < 600; ri++) { var yy = ar[ri * 6 + 1] - 26 * dt; if (yy < 0) yy += 20; ar[ri * 6 + 1] = yy; ar[ri * 6 + 4] = yy - 0.7; } pa.needsUpdate = true; }
    /* stars & milky way */
    var sk = night * (gfx.stars ? 1 : 0) * (1 - FX.rain * 0.8); FX.stars.visible = FX.mw.visible = sk > 0.02 && !ugOn; FX.sU.time.value = tt; FX.sU.k.value = sk; FX.mU.k.value = sk * 0.75;
    /* sun & moon discs + halo */
    var dv = gfx.discs && !ugOn; FX.sunH.visible = FX.sunD.visible = dv && sv.y > -8; FX.moonH.visible = FX.moonD.visible = dv && sv.y < 8; if (dv) { var sk2 = 0.98; FX.sunH.position.set(sv.x * sk2, sv.y * sk2, sv.z * sk2); FX.sunD.position.copy(FX.sunH.position); FX.moonH.position.set(-sv.x * sk2, -sv.y * sk2, -sv.z * sk2); FX.moonD.position.copy(FX.moonH.position); FX.sunH.material.opacity = clamp((sv.y + 8) / 40, 0, 1) * (1 - FX.rain * 0.6); FX.sunD.material.opacity = FX.sunH.material.opacity; FX.moonH.material.opacity = clamp((8 - sv.y) / 40, 0, 1) * (1 - FX.rain * 0.7); FX.moonD.material.opacity = FX.moonH.material.opacity; }
    /* aurora (cold biome only) */
    var ak = gfx.aurora && biome === 'snow' && !ugOn ? night : 0; FX.aU.k.value += (ak - FX.aU.k.value) * Math.min(1, dt * 0.8); FX.aur.visible = FX.aU.k.value > 0.01; FX.aU.time.value = tt;
    /* dirty lens */
    var lk = 0; if (gfx.dirty && sv.y > 5 && !ugOn) { camera.getWorldDirection(DIR); var sl = Math.sqrt(sv.x * sv.x + sv.y * sv.y + sv.z * sv.z), dd = (DIR.x * sv.x + DIR.y * sv.y + DIR.z * sv.z) / sl; lk = Math.pow(Math.max(0, dd), 5) * clamp(sv.y / 40, 0, 1) * (1 - FX.rain * 0.6); } FX.lens.style.opacity = lk.toFixed(3);
    /* puddles & ripples */
    var pdY = 0;
    var wk = gfx.wet && !ugOn ? FX.rain : 0; FX.wetK += (wk - FX.wetK) * Math.min(1, dt * 0.5); for (var pi = 0; pi < FX.puddles.length; pi++) { var pd = FX.puddles[pi]; if (FX.wetK > 0.05) { var dx = pd.position.x - P.x, dz = pd.position.z - P.z; if (!pd.visible || dx * dx + dz * dz > 900) { var an = Math.random() * 6.283, rd = 4 + Math.random() * 24; pd.position.x = P.x + Math.cos(an) * rd; pd.position.z = P.z + Math.sin(an) * rd; pdY = W.gh ? W.gh(pd.position.x, pd.position.z) : 0; pd.position.y = pdY + 0.045; var sc = 0.6 + Math.random() * 1.6; pd.scale.set(sc * 1.4, sc, 1); pd.rotation.z = Math.random() * 3; pd.visible = !(W.waterAt && W.waterAt(pd.position.x, pd.position.z)) && !W.hit(pd.position.x - 0.4, pd.position.x + 0.4, pdY + 0.05, pdY + 0.5, pd.position.z - 0.4, pd.position.z + 0.4); } pd.material.opacity = 0.55 * FX.wetK; } else pd.visible = false; }
    if (FX.wetK > 0.05 && W.sun) W.sun.intensity *= 1 - 0.15 * FX.wetK;
    /* ripples: player / zombies in water + landing */
    var inW = W.waterAt && W.waterAt(P.x, P.z); if (gfx.ripples && inW && P.y < 0.5) { FX.ripT -= dt; var sp = Math.hypot(P.vx, P.vz); if (sp > 0.6 && FX.ripT <= 0) { FX.ripT = 0.3; fxRipple(P.x, P.z, clamp(sp / 5, 0.2, 1.2)); } if (P.onGround && !FX.pg && FX.pvy < -2) fxRipple(P.x, P.z, clamp(-FX.pvy / 7, 0.5, 2.5)); }
    FX.pg = P.onGround; FX.pvy = P.vy; if (gfx.ripples) { FX.rt -= dt; if (FX.rt <= 0) { FX.rt = 0.5; for (var zi = 0; zi < zombies.length; zi++) { var zz = zombies[zi]; if (Math.abs(zz.x - P.x) < 60 && Math.abs(zz.z - P.z) < 60 && W.waterAt(zz.x, zz.z)) fxRipple(zz.x, zz.z, 0.5 + zz.def.scale * 0.5); } } }
    for (var ei = 0; ei < FX.ripples.length; ei++) { var rp = FX.ripples[ei]; if (rp.t >= rp.life) { rp.m.visible = false; continue; } rp.t += dt; var f = rp.t / rp.life; rp.m.scale.setScalar(0.2 + f * rp.mx); rp.m.material.opacity = (1 - f) * 0.6; }
    /* flowing river texture (the current itself always pushes the player, see stepPlayer) */
    if (W.waterMeshes) W.waterMeshes.forEach(function (m) { var pr = m.geometry.parameters; if (pr.width < 20 && pr.height > 200) { if (gfx.flow) { if (m.material !== FX.riverMat) m.material = FX.riverMat; } else if (m.material === FX.riverMat) m.material = W.waterMat; } });
    if (gfx.flow) FX.flowTex.offset.y += dt * 0.35;
    /* falling leaves (each lands cleanly on local terrain height, waits 3 s, then disappears) */
    if (gfx.fallLeaves && !ugOn && W.trees) { FX.fallT -= dt; if (FX.fallT <= 0 && FX.fallArr.length < 110) { FX.fallT = 0.12 + Math.random() * 0.3; for (var tr = 0; tr < 10; tr++) { var t = W.trees[(Math.random() * W.trees.length) | 0]; if (!t || !t.alive || t.kind === 'cactus' || t.kind === 'palm' || Math.abs(t.x - P.x) > 45 || Math.abs(t.z - P.z) > 45) continue; var an2 = Math.random() * 6.283, rd2 = Math.random() * 1.6 * t.s, lx2 = t.x + Math.cos(an2) * rd2, lz2 = t.z + Math.sin(an2) * rd2, landY = (W.gh ? W.gh(lx2, lz2) : 0) + 0.05; FX.fallArr.push({ x: lx2, y: (t.y || 0) + t.th * (0.55 + Math.random() * 0.45) + 1, z: lz2, landY: landY, ph: Math.random() * 6.28, rot: Math.random() * 6.28, land: -1, col: t.kind === 'snow' ? 0x3c7a46 : Math.random() < 0.3 ? 0xb6a53a : 0x58a845 }); break; } } }
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc2 = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3(), cl = new THREE.Color(), n = 0;
    for (var fi = FX.fallArr.length - 1; fi >= 0; fi--) { var L = FX.fallArr[fi]; if (L.land < 0) { L.y -= 0.55 * dt; L.ph += dt * 1.6; L.x += Math.sin(L.ph) * 0.35 * dt; L.z += Math.cos(L.ph * 0.8) * 0.3 * dt; L.rot += dt * 1.2; var gyL = L.landY != null ? L.landY : 0.05; if (L.y <= gyL) { L.y = gyL; L.land = 0; } } else { L.land += dt; if (L.land >= 3) { FX.fallArr.splice(fi, 1); continue; } } }
    FX.fallArr.forEach(function (L2, i2) { if (L2.land < 0) e.set(Math.sin(L2.ph) * 0.9, L2.rot, Math.cos(L2.ph) * 0.9); else e.set(-Math.PI / 2, L2.rot, 0); q.setFromEuler(e); p3.set(L2.x, L2.y, L2.z); m4.compose(p3, q, sc2); FX.falls.setMatrixAt(i2, m4); cl.setHex(L2.col); FX.falls.setColorAt(i2, cl); n++; });
    FX.falls.count = n; FX.falls.visible = n > 0; FX.falls.instanceMatrix.needsUpdate = true; if (FX.falls.instanceColor) FX.falls.instanceColor.needsUpdate = true;
    /* illuminant mirroring on glass blocks: darker surroundings -> clearer reflection */
    if (W.glassMat) { if (gfx.illum && !ugOn && !window.__wzSoftwareGl) { FX.mirT -= dt; if (!FX.mirCam) { FX.mirCam = new THREE.CubeCamera(0.3, 300, new THREE.WebGLCubeRenderTarget(64)); scene.add(FX.mirCam); } if (FX.mirT <= 0) { FX.mirT = 2; FX.mirCam.position.copy(camera.position); W.glassMat.visible = false; FX.mirCam.update(renderer, scene); W.glassMat.visible = true; W.glassMat.envMap = FX.mirCam.renderTarget.texture; W.glassMat.needsUpdate = true; } var dk = clamp(1 - (W.sun ? W.sun.intensity : 1) / 1.3, 0, 1); W.glassMat.reflectivity = 0.1 + 0.8 * dk * dk; W.glassMat.combine = THREE.MixOperation; } else if (W.glassMat.envMap) { W.glassMat.envMap = null; W.glassMat.needsUpdate = true; }
      if (W.winMat) { if (W.winMat.envMap !== W.glassMat.envMap) { W.winMat.envMap = W.glassMat.envMap; W.winMat.needsUpdate = true; } W.winMat.reflectivity = W.glassMat.reflectivity; W.winMat.combine = THREE.MixOperation; } }
    /* GPU post-process uniforms (heat haze, underwater distortion, thirst/low-HP blur) */
    var dist = 0, blur = 0, wv = 0; if (gfx.haze && !ugOn) { if (biome === 'desert' && sv.y > 25) dist = Math.max(dist, clamp(sv.y / 120, 0.3, 1) * (1 - FX.rain)); var fireOn = heatQ.length > 0 || cooking.length > 0; if (fireOn) { var fl = (W.camps || []).concat(W.furn || []); for (var fi2 = 0; fi2 < fl.length; fi2++) { var fe = fl[fi2]; if (fe.alive && fe.x != null) { var fd = Math.hypot(fe.x - P.x, fe.z - P.z); if (fd < 6) dist = Math.max(dist, 1.3 * (1 - fd / 6)); } } } }
    if (gfx.uwDist && eyeY < -0.05 && W.waterAt(P.x, P.z)) wv = 1;
    if (gfx.blurFx && mode === 'play') { var thr = P.thirst < 30 ? (30 - P.thirst) / 30 : 0; blur = thr * 0.65; var mxh = armorStats().hpMax, hf = P.hp / mxh; if (hf < 0.3 && P.hp > 0) { var sev = 1 - hf / 0.3, per = 1.15 - 0.7 * sev; FX.hb += dt / per; var ph2 = FX.hb % 1, env = Math.exp(-Math.pow((ph2 - 0.05) * 13, 2)) + 0.65 * Math.exp(-Math.pow((ph2 - 0.24) * 13, 2)); blur = Math.max(blur, (0.2 + 0.8 * env) * (0.4 + 0.6 * sev)); } }
    FX.hazeK = dist; FX.blurK = blur; FX.uwK = wv;
    if (FX.lastF !== 'none') { FX.lastF = 'none'; $('#gl').style.filter = 'none'; }
  }

  /* Multi-pass r128 WebGL Render Pipeline: Main World -> Clear Depth Viewmodel -> Optional Bloom + God Rays + Grading Composite */
  function renderWorldAndVM() {
    renderer.clear();
    renderer.render(scene, camera);
    if (vmScene && vmCam && vm && vm.visible) {
      renderer.clearDepth();
      renderer.render(vmScene, vmCam);
    }
  }
  function renderFrame() {
    var soft = !!window.__wzSoftwareGl;
    var sv = W.sunVec, grK = 0, grU = [0.5, 0.5];
    if (gfx.godray && !ugOn && !soft && sv && sv.y > 4) {
      camera.updateMatrixWorld(); var v = new THREE.Vector3(P.x + sv.x, sv.y, P.z + sv.z).project(camera);
      if (v.z < 1) { grU = [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5]; grK = clamp(1.7 - Math.max(Math.abs(grU[0] - 0.5), Math.abs(grU[1] - 0.5)) * 2, 0, 1) * clamp(sv.y / 60, 0, 1) * (bloodOn ? 0.3 : 1); }
    }
    var spId = gfx.shaderPack || 'cinematic';
    var gradeIdx = spId === 'warm_apoc' ? 1 : spId === 'daylight' ? 2 : spId === 'noir' ? 3 : 0;
    var blmK = (gfx.bloom !== false && !soft) ? 1.0 : 0.0;
    var vigK = (gfx.vignette !== false) ? 1.0 : 0.0;
    var hazeK = FX.hazeK || 0, blurK = FX.blurK || 0, uwK = FX.uwK || 0;
    var needPost = !soft && (blmK > 0 || grK > 0.02 || vigK > 0 || gradeIdx !== 0 || hazeK > 0.01 || blurK > 0.01 || uwK > 0.01);
    if (!needPost) {
      renderer.setRenderTarget(null);
      renderWorldAndVM();
      return;
    }
    ensurePostFX();
    renderer.setRenderTarget(pfxRT);
    renderWorldAndVM();
    if (blmK > 0.001) {
      pfxQuad.material = blmMat;
      blmMat.uniforms.tSrc.value = pfxRT.texture; blmMat.uniforms.uStep.value = 0; renderer.setRenderTarget(blmA); renderer.render(pfxScene, pfxCam);
      blmMat.uniforms.tSrc.value = blmA.texture; blmMat.uniforms.uStep.value = 1; blmMat.uniforms.uDir.value.set(1, 0); renderer.setRenderTarget(blmB); renderer.render(pfxScene, pfxCam);
      blmMat.uniforms.tSrc.value = blmB.texture; blmMat.uniforms.uDir.value.set(0, 1); renderer.setRenderTarget(blmA); renderer.render(pfxScene, pfxCam);
    }
    pfxQuad.material = compMat;
    compMat.uniforms.uTime.value = performance.now() * 0.001;
    compMat.uniforms.uSun.value.set(grU[0], grU[1]);
    compMat.uniforms.uGrK.value = grK;
    compMat.uniforms.uBloomK.value = blmK;
    compMat.uniforms.uVigK.value = vigK;
    compMat.uniforms.uGrade.value = gradeIdx;
    compMat.uniforms.uHazeK.value = hazeK;
    compMat.uniforms.uBlurK.value = blurK;
    compMat.uniforms.uUwK.value = uwK;
    compMat.uniforms.uBloodK.value = bloodOn ? 1.0 : 0.0;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(pfxScene, pfxCam);
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
  function openGfxModal(from, activeTab) {
    var prev = mode; mode = 'modal';
    var tab = activeTab || 'presets';
    var ac = SFX.getConfig();
    var TABS = [
      { id: 'presets', label: 'Presets & Display' },
      { id: 'shaders', label: 'Shaders & Lighting' },
      { id: 'world',   label: 'Texture Packs & World' },
      { id: 'audio',   label: 'Audio & Spatial' },
      { id: 'controls',label: 'Controls & Tips' }
    ];
    function chk(id, label, note, on, cls) {
      return '<div class="set-card ' + (cls || '') + '"><label class="chk"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><span class="set-title">' + label + '</span><div class="set-desc">' + note + '</div></span></label></div>';
    }
    function dist(id, label, val, note) {
      var un = val >= 9999;
      return '<div class="set-card"><div class="set-row"><span class="set-title">' + label + '</span><span class="set-val" id="' + id + 'Val"></span></div><input type="range" class="rng" id="' + id + '" min="2" max="100" step="1" value="' + (un ? 100 : val) + '"' + (un ? ' disabled' : '') + '><label class="chk"><input type="checkbox" id="' + id + 'U"' + (un ? ' checked' : '') + '><span class="set-desc">Unlimited draw range (high GPU load)</span></label><div class="set-desc">' + note + '</div></div>';
    }
    function rng(id, label, val, min, max, step, fmt, note) {
      return '<div class="set-card"><div class="set-row"><span class="set-title">' + label + '</span><span class="set-val" id="' + id + 'Val">' + fmt(val) + '</span></div><input type="range" class="rng" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><div class="set-desc">' + note + '</div></div>';
    }
    var spPacks = (W && W.SHADER_PACKS) || [
      { id: 'cinematic', name: 'Cinematic PBR' },
      { id: 'warm_apoc', name: 'Warm Sunset Survival' },
      { id: 'daylight',  name: 'Crisp Daylight Clear' },
      { id: 'noir',      name: 'Overcast Tactical' }
    ];
    var tpPacks = (W && W.TEXTURE_PACKS) || [
      { id: 'realism',    name: 'Enhanced Realism PBR' },
      { id: 'urban',      name: 'Clean Modern Urban' },
      { id: 'stylized',   name: 'Crisp Stylized' },
      { id: 'apocalypse', name: 'Gritty Apocalypse' }
    ];

    var bodyHtml = '';
    if (tab === 'presets') {
      bodyHtml =
        '<div class="set-card full"><div class="set-row"><span class="set-title">Quick Quality Presets</span><span class="set-val">Active: ' + esc((gfx.preset || 'custom').toUpperCase()) + '</span></div>' +
        '<div class="preset-bar">' +
          ['low', 'medium', 'high', 'ultra'].map(function (p) { return '<button type="button" class="preset-btn' + (gfx.preset === p ? ' on' : '') + '" data-preset="' + p + '">' + p.charAt(0).toUpperCase() + p.slice(1) + '</button>'; }).join('') +
        '</div><div class="set-desc">Apply a balanced profile or customize individual sliders and shaders across tabs.</div></div>' +
        '<div class="set-grid">' +
          dist('gRd', 'Render Distance', gfx.rd, 'Chunks visible around the survivor (1 chunk = 20 m).') +
          dist('gEd', 'Entity Simulation Distance', gfx.ed, 'Zombies beyond this switch to lightweight simulation records.') +
          rng('gSd', 'Render Shader Distance', gfx.sd || 70, 24, 160, 4, function (v) { return v + ' m'; }, 'How far around you shadows and shader detail are drawn. Lower = smoother and uses far less GPU memory; shaders beyond it fall back to plain shading.') +
          rng('gScale', 'Internal Render Scale', gfx.renderScale || 1.0, 0.5, 1.5, 0.05, function (v) { return Math.round(v * 100) + '%'; }, 'Adjusts WebGL resolution scaling without blurring HUD text.') +
          rng('gExp', 'Exposure / Tone Mapping', gfx.exposure || 1.05, 0.65, 1.55, 0.05, function (v) { return Number(v).toFixed(2) + ' EV'; }, 'ACES Filmic exposure calibration preserving true base material hues.') +
          '<div class="set-card"><div class="set-row"><span class="set-title">Texture Filtering (Anisotropy)</span><span class="set-val" id="gAnisoVal">' + (gfx.aniso || 8) + 'x</span></div>' +
            '<select id="gAniso">' + [1, 2, 4, 8, 16].map(function (a) { return '<option value="' + a + '"' + ((gfx.aniso || 8) === a ? ' selected' : '') + '>' + a + 'x Anisotropic</option>'; }).join('') + '</select>' +
            '<div class="set-desc">Sharpens road markings, asphalt, and facades viewed at grazing angles.</div></div>' +
          chk('gCu', 'Frustum Back-Culling', 'Skips rendering terrain chunks behind the camera view.', gfx.cull) +
        '</div>';
    } else if (tab === 'shaders') {
      bodyHtml =
        '<div class="set-card full"><div class="set-row"><span class="set-title">Shader &amp; Color Grading Pack</span><span class="set-val">' + esc((spPacks.filter(function (x) { return x.id === (gfx.shaderPack || 'cinematic'); })[0] || spPacks[0]).name) + '</span></div>' +
        '<div class="preset-bar">' +
          spPacks.map(function (p) { return '<button type="button" class="preset-btn' + ((gfx.shaderPack || 'cinematic') === p.id ? ' on' : '') + '" data-spack="' + p.id + '">' + esc(p.name) + '</button>'; }).join('') +
        '</div><div class="set-desc">Tuned ACES Filmic lighting &amp; sky curve that preserves accurate painted car &amp; structure hues.</div></div>' +
        '<div class="set-grid">' +
          chk('gSm', 'Directional Sun Shadow Map', 'Real soft shadows cast by buildings, vehicles, and foliage.', gfx.smap) +
          '<div class="set-card"><div class="set-row"><span class="set-title">Shadow Map Resolution</span><span class="set-val">' + (gfx.shadowRes || 2048) + ' px</span></div>' +
            '<select id="gShRes">' + [1024, 2048, 3072, 4096].map(function (r) { return '<option value="' + r + '"' + ((gfx.shadowRes || 2048) === r ? ' selected' : '') + '>' + r + ' &times; ' + r + ' px</option>'; }).join('') + '</select>' +
            '<div class="set-desc">Higher resolution tightens building and car shadow edges.</div></div>' +
          chk('gSh', 'Mob Contact Shadows', 'Lightweight ground contact shadows under zombies &amp; players.', gfx.shadow) +
          chk('gFog', 'Atmospheric Distance Fog', 'Blends distant terrain chunks cleanly into the horizon sky.', gfx.fog) +
          chk('gBlm', 'HDR Bloom Glow', 'Soft highlight bloom on sunlight, muzzle flashes, and lamps.', gfx.bloom !== false) +
          chk('gGr', 'Sun God Rays', 'Volumetric screen-space light shafts toward the sun.', gfx.godray) +
          chk('gVig', 'Cinematic Lens Vignette', 'Subtle edge framing around the viewport.', gfx.vignette !== false) +
          chk('gSc', 'Parallax Sky Clouds', 'Multi-layer drifting sky clouds at 300-500 m altitude.', gfx.skyCloud) +
          chk('gVc', 'Volumetric 3D Cloud Fog', 'Raymarched self-shadowed cloud volume with cloud shadows.', gfx.volCloud) +
          chk('gSt', 'Starfield &amp; Milky Way', 'Twinkling night stars and galactic dust band.', gfx.stars) +
          chk('gAu', 'Aurora Borealis', 'Animated polar aurora ribbon in Snow biomes at night.', gfx.aurora) +
          chk('gSd', 'Sun &amp; Moon Atmospheric Halos', 'Solar &amp; lunar discs with soft atmospheric scatter.', gfx.discs) +
          chk('gHz', 'Thermal Heat Haze', 'Refractive air shimmer in sunny deserts and near campfires.', gfx.haze) +
          chk('gDi', 'Dirty Camera Lens Flare', 'Subtle rain spots and dust glare when facing bright sun.', gfx.dirty) +
          chk('gBl', 'Low-Health &amp; Thirst Blur', 'Subtle pulse blur when critically dehydrated or injured.', gfx.blurFx) +
        '</div>';
    } else if (tab === 'world') {
      bodyHtml =
        '<div class="set-card full"><div class="set-row"><span class="set-title">High-Resolution Procedural Texture Pack</span><span class="set-val">' + esc((tpPacks.filter(function (x) { return x.id === (gfx.texPack || 'realism'); })[0] || tpPacks[0]).name) + '</span></div>' +
        '<div class="preset-bar">' +
          tpPacks.map(function (p) { return '<button type="button" class="preset-btn' + ((gfx.texPack || 'realism') === p.id ? ' on' : '') + '" data-tpack="' + p.id + '">' + esc(p.name) + '</button>'; }).join('') +
        '</div><div class="set-desc">Switches 512px procedural albedo, bump, and roughness maps live. Never alters 2D item icons.</div></div>' +
        '<div class="set-grid">' +
          chk('gWa', 'Reflective Water Surface', 'Lakes and rivers reflect surrounding buildings and sky.', gfx.water) +
          chk('gRp', 'Interactive Water Ripples', 'Dynamic expanding rings when walking or landing in water.', gfx.ripples) +
          chk('gFl', 'Flowing River Current Texture', 'Animated directional river flow streaks.', gfx.flow) +
          chk('gWe', 'Rain Wetness &amp; Ground Puddles', 'Glossy reflective rain puddles form during storms.', gfx.wet) +
          chk('gUw', 'Underwater Refraction &amp; Tint', 'Distorted blue-green optics when diving beneath waves.', gfx.uwDist) +
          chk('gIl', 'Glass &amp; Window Mirroring', 'Dynamic environment reflections on glass blocks and windows.', gfx.illum) +
          chk('gDl', 'Wind-Swaying Foliage', 'Animated vertex wind sway on tree canopies.', gfx.dynLeaves) +
          chk('gXl', 'Dense Extra Canopy Leaves', 'Adds secondary cross-angled leaf cards to trees.', gfx.extraLeaves) +
          chk('gFw', 'Drifting Falling Leaves', 'Leaves occasionally detach and settle onto terrain height.', gfx.fallLeaves) +
          chk('gGrs', '3D Biome Ground Grass', 'Instanced grass blades contoured to terrain elevation.', gfx.grass !== false) +
        '</div>';
    } else if (tab === 'audio') {
      bodyHtml =
        '<div class="set-card full"><div class="set-row"><span class="set-title">100% Original Procedural Web Audio Engine</span><button type="button" class="btn sm" id="bTestSnd">Test Audio Cue</button></div><div class="set-desc">All impacts, gunfire, footsteps, zombie formants, wind gusts, and nocturnal drones are synthesized cleanly in real time with zero external audio files.</div></div>' +
        '<div class="set-grid">' +
          chk('aMute', 'Mute All Game Audio', 'Immediately silences sound effects and ambient layers (Shortcut: M).', SFX.isMuted(), 'full') +
          rng('aMaster', 'Master Volume', ac.master, 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }, 'Overall output level into master compressor.') +
          rng('aSfx', 'Sound Effects Volume', ac.sfx, 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }, 'Weapons, harvesting, zombie groans, footsteps, and UI clicks.') +
          rng('aAmb', 'Ambient World Volume', ac.ambient, 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }, 'Daytime breeze, nocturnal eerie wind, and underwater hum.') +
          chk('aSpat', '3D Stereo Spatial Panning', 'Pans distant impacts, explosions, and zombie groans left/right.', ac.spatial !== false) +
          chk('aRev', 'Environmental Convolution Reverb', 'Adds subtle outdoor/indoor acoustic depth to gunfire &amp; hits.', ac.reverb !== false) +
        '</div>';
    } else {
      bodyHtml =
        '<div class="set-card full"><span class="set-title">Keyboard, Mouse &amp; Survival Guide</span>' + controlsHtml(true) + '</div>' +
        '<div class="set-grid">' +
          '<div class="set-card"><span class="set-title">Base Defense &amp; Stations</span><div class="set-desc">Place furnaces, anvils, workbenches, and turrets flat on solid ground or base floors. Use [E] to load cannon turrets or sleep in clean beds to accelerate night recovery.</div></div>' +
          '<div class="set-card"><span class="set-title">Performance Tip</span><div class="set-desc">If frame rate dips on integrated graphics, choose the Low or Medium preset, lower Render Scale to 85%, or toggle Volumetric Clouds off while keeping Enhanced Realism textures on.</div></div>' +
        '</div>';
    }

    screen('<div class="card card-dash">' +
      '<div class="dash-hdr"><div><span class="tag">Widescreen Settings</span><h2>Graphics, Shaders, Textures &amp; Audio</h2></div><button class="btn primary sm" id="bGfxBack">Done</button></div>' +
      '<div class="dash-body">' +
        '<div class="dash-nav">' +
          TABS.map(function (t) { return '<button type="button" class="dash-tab' + (tab === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>'; }).join('') +
        '</div>' +
        '<div class="dash-content">' + bodyHtml + '</div>' +
      '</div>' +
      '<div class="dash-ftr"><span style="font-size:.8rem;color:var(--muted)">All changes apply live and persist automatically on this device.</span><div class="row"><button class="btn sm" id="bGfxReset">Reset Defaults</button><button class="btn primary sm" id="bGfxDone">Save &amp; Back</button></div></div>' +
    '</div>');

    document.querySelectorAll('.dash-tab').forEach(function (el) {
      el.onclick = function () { SFX.play('click'); openGfxModal(from, el.dataset.tab); };
    });
    document.querySelectorAll('[data-preset]').forEach(function (el) {
      el.onclick = function () { SFX.play('click'); applyPreset(el.dataset.preset); openGfxModal(from, 'presets'); };
    });
    document.querySelectorAll('[data-spack]').forEach(function (el) {
      el.onclick = function () { SFX.play('click'); gfx.shaderPack = el.dataset.spack; gfx.preset = 'custom'; saveGfx(); applyGfx(); openGfxModal(from, 'shaders'); };
    });
    document.querySelectorAll('[data-tpack]').forEach(function (el) {
      el.onclick = function () { SFX.play('click'); gfx.texPack = el.dataset.tpack; gfx.preset = 'custom'; saveGfx(); applyGfx(); openGfxModal(from, 'world'); };
    });

    function labDist() {
      if ($('#gRdVal')) $('#gRdVal').textContent = gfx.rd >= 9999 ? 'Unlimited' : gfx.rd + ' chunks (' + gfx.rd * 20 + ' m)';
      if ($('#gEdVal')) $('#gEdVal').textContent = gfx.ed >= 9999 ? 'Unlimited' : gfx.ed + ' chunks (' + gfx.ed * 20 + ' m)';
    }
    function bindDist(id, key) {
      if (!$('#' + id)) return;
      $('#' + id).oninput = function () { gfx[key] = parseInt(this.value, 10); gfx.preset = 'custom'; labDist(); saveGfx(); applyGfx(); };
      $('#' + id + 'U').onchange = function () { var on = this.checked; $('#' + id).disabled = on; gfx[key] = on ? 9999 : parseInt($('#' + id).value, 10); gfx.preset = 'custom'; labDist(); saveGfx(); applyGfx(); };
    }
    bindDist('gRd', 'rd'); bindDist('gEd', 'ed'); labDist();

    if ($('#gSd')) $('#gSd').oninput = function () { gfx.sd = parseInt(this.value, 10); gfx.preset = 'custom'; $('#gSdVal').textContent = gfx.sd + ' m'; saveGfx(); applyGfx(); };
    if ($('#gScale')) $('#gScale').oninput = function () { gfx.renderScale = parseFloat(this.value); gfx.preset = 'custom'; $('#gScaleVal').textContent = Math.round(gfx.renderScale * 100) + '%'; saveGfx(); applyGfx(); };
    if ($('#gExp')) $('#gExp').oninput = function () { gfx.exposure = parseFloat(this.value); $('#gExpVal').textContent = gfx.exposure.toFixed(2) + ' EV'; saveGfx(); applyGfx(); };
    if ($('#gAniso')) $('#gAniso').onchange = function () { gfx.aniso = parseInt(this.value, 10); $('#gAnisoVal').textContent = gfx.aniso + 'x'; gfx.preset = 'custom'; saveGfx(); applyGfx(); };
    if ($('#gShRes')) $('#gShRes').onchange = function () { gfx.shadowRes = parseInt(this.value, 10); gfx.preset = 'custom'; saveGfx(); applyGfx(); openGfxModal(from, 'shaders'); };

    [
      ['gIl', 'illum'], ['gRp', 'ripples'], ['gFl', 'flow'], ['gSc', 'skyCloud'], ['gVc', 'volCloud'],
      ['gAu', 'aurora'], ['gSt', 'stars'], ['gSd', 'discs'], ['gHz', 'haze'], ['gDi', 'dirty'],
      ['gUw', 'uwDist'], ['gWe', 'wet'], ['gBl', 'blurFx'], ['gFw', 'fallLeaves'], ['gFog', 'fog'],
      ['gSh', 'shadow'], ['gSm', 'smap'], ['gBlm', 'bloom'], ['gGr', 'godray'], ['gVig', 'vignette'],
      ['gWa', 'water'], ['gCu', 'cull'], ['gDl', 'dynLeaves'], ['gXl', 'extraLeaves'], ['gGrs', 'grass']
    ].forEach(function (a) {
      var el = $('#' + a[0]); if (!el) return;
      el.onchange = function () { gfx[a[1]] = this.checked; gfx.preset = 'custom'; if (gfx.volCloud) gfx.skyCloud = true; saveGfx(); applyGfx(); lockSky(); };
    });
    function lockSky() { var sc = $('#gSc'); if (sc) { sc.checked = !!gfx.skyCloud; sc.disabled = !!gfx.volCloud; } } lockSky();

    if ($('#aMute')) $('#aMute').onchange = function () { SFX.setConfig({ muted: this.checked }); };
    if ($('#aMaster')) $('#aMaster').oninput = function () { var v = parseFloat(this.value); $('#aMasterVal').textContent = Math.round(v * 100) + '%'; SFX.setConfig({ master: v }); };
    if ($('#aSfx')) $('#aSfx').oninput = function () { var v = parseFloat(this.value); $('#aSfxVal').textContent = Math.round(v * 100) + '%'; SFX.setConfig({ sfx: v }); };
    if ($('#aAmb')) $('#aAmb').oninput = function () { var v = parseFloat(this.value); $('#aAmbVal').textContent = Math.round(v * 100) + '%'; SFX.setConfig({ ambient: v }); };
    if ($('#aSpat')) $('#aSpat').onchange = function () { SFX.setConfig({ spatial: this.checked }); };
    if ($('#aRev')) $('#aRev').onchange = function () { SFX.setConfig({ reverb: this.checked }); };
    if ($('#bTestSnd')) $('#bTestSnd').onclick = function () { SFX.unlock(); SFX.play('craft', { pan: -0.35 }); setTimeout(function () { SFX.play('loot', { pan: 0.35 }); }, 160); };

    $('#bGfxReset').onclick = function () {
      var gd = GFXD(); for (var k in gd) gfx[k] = gd[k]; saveGfx(); applyGfx();
      SFX.setConfig({ master: 0.85, sfx: 0.9, ambient: 0.55, spatial: true, reverb: true, muted: false });
      openGfxModal(from, tab);
    };
    var goBack = function () { SFX.play('click'); mode = prev; if (from === 'pause') showPause(); else showMainMenu(); };
    $('#bGfxBack').onclick = goBack;
    $('#bGfxDone').onclick = goBack;
  }

  function showPause() {
    mode = 'pause'; setBodyState('paused'); keys = {}; lmb = false; eatT = 0; queue.length = 0; $('#eat').style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var mpHtml = mp.role !== 'solo' ? '<div class="box-sub"><div class="row" style="justify-content:space-between"><div>Room Code: <span class="code-pill">' + esc(mp.room) + '</span></div><button class="btn sm" id="bCopyRoom">Copy Code</button></div><div style="font-size:.82rem;color:var(--muted)">Players (' + totalPlayers() + '/' + MAX_PLAYERS + ') &middot; ' + (mp.online ? 'Connected Online' : 'Connecting / Local') + '</div>' + playerListHtml() + '</div>' : '';
    screen('<div class="card card-wide"><div class="land-grid">' +
      '<div class="land-col brand-panel"><div><span class="tag">Webzombite &middot; Paused</span><h1 style="margin-top:6px">Game Paused</h1>' +
      '<p style="margin-top:8px">Time Survived: <b>' + fmtTime(T) + '</b> &middot; Zombies Eliminated: <b>' + kills + '</b> &middot; Coins: <b>' + coins + '</b></p></div>' +
      mpHtml +
      '<div class="box-sub"><div style="font-size:.82rem;font-weight:700">Controls Reference</div>' + controlsHtml(false) + '</div>' +
      '</div>' +
      '<div class="land-col" style="justify-content:center">' +
        '<button class="btn primary full" id="bResume">Resume Game</button>' +
        '<button class="btn full" id="bInv">Inventory, Gear &amp; Crafting</button>' +
        '<div class="row"><button class="btn" id="bGfx" style="flex:1">Graphics &amp; Shaders</button><button class="btn" id="bAud" style="flex:1">Audio Settings</button></div>' +
        '<button class="btn full" id="bSaveCode">Save / Load World Code</button>' +
        '<div class="row"><button class="btn" id="bMenu" style="flex:1">Main Menu</button>' +
        (mp.role !== 'client' ? '<button class="btn danger" id="bReset" style="flex:1">Reset World</button>' : '') +
        '</div>' +
        '<a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a>' +
      '</div></div></div>');
    if ($('#bCopyRoom')) $('#bCopyRoom').onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(mp.room).then(function () { $('#bCopyRoom').textContent = 'Copied!'; }); };
    $('#bResume').onclick = function () { SFX.play('click'); enterGame(); };
    $('#bInv').onclick = function () { SFX.play('click'); $('#screen').hidden = true; openInv(); };
    $('#bSaveCode').onclick = function () { SFX.play('click'); openCodeModal('pause'); };
    $('#bGfx').onclick = function () { SFX.play('click'); openGfxModal('pause', 'presets'); };
    $('#bAud').onclick = function () { SFX.play('click'); openGfxModal('pause', 'audio'); };
    $('#bMenu').onclick = function () { SFX.play('click'); leaveRoom(); showMainMenu(); };
    if ($('#bReset')) $('#bReset').onclick = function () {
      if (confirm('Reset the world with new random tree & rock positions?')) {
        newWorld(); newPlayerState(mp.slot); coins = 0; kc = {}; T = 0; spawnT = 3; clearZombies();
        if (mp.role === 'host') Net.send({ t: 'worldsync', snap: snapshot(true) }); enterGame(); say('A new random world was created! 30 seconds of safe time have started.');
      }
    };
  }
  /* ---------------- HUD & Minimap ---------------- */
  /* ---------------- First-person viewmodel (hands + held item) and visible own body ---------------- */
  var gunRel = 0, gunRelMax = 1, gunKick = 0, gunClip = {}, gunPend = null, vm = null, vmItem = null, vmL = null, vmR = null, vmSwing = 0, vmT = 0, vmId = '', body = null, bodyLegs = [], emoTex = {};
  var vmScene = null, vmCam = null, vmSun = null, vmHemi = null;
  function emojiTex(ic) {
    if (emoTex[ic]) return emoTex[ic]; var cv = document.createElement('canvas'); cv.width = cv.height = 128; var g2 = cv.getContext('2d');
    g2.font = '96px serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(ic, 64, 70); var t = new THREE.CanvasTexture(cv); return (emoTex[ic] = t);
  }
  function vmMat(col, opts) {
    opts = opts || {};
    var m = new THREE.MeshStandardMaterial({
      color: col,
      roughness: opts.roughness != null ? opts.roughness : 0.48,
      metalness: opts.metalness != null ? opts.metalness : 0.18
    });
    return m;
  }
  function vmBox(w, h, d, mat, x, y, z, par, worldSpace) {
    var o = new THREE.Mesh(BOX, mat);
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    if (worldSpace) { o.castShadow = true; o.receiveShadow = true; }
    par.add(o);
    return o;
  }
  function buildVM() {
    vmScene = new THREE.Scene();
    vmCam = new THREE.PerspectiveCamera(62, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.04, 8);
    vmHemi = new THREE.HemisphereLight(0xdfe8f5, 0x3b352c, 0.95);
    vmSun = new THREE.DirectionalLight(0xfff4de, 1.15);
    vmSun.position.set(1.5, 2.5, 1.8);
    vmScene.add(vmHemi); vmScene.add(vmSun);
    if (scene.environment) vmScene.environment = scene.environment;

    vm = new THREE.Group(); vmScene.add(vm);
    var sleeveM = vmMat(0x26415e, { roughness: 0.88, metalness: 0.03, envMapIntensity: 0.3 });
    var cuffM = vmMat(0x1b2e44, { roughness: 0.86, metalness: 0.04, envMapIntensity: 0.3 });
    var gloveM = vmMat(0x23252a, { roughness: 0.72, metalness: 0.08, envMapIntensity: 0.35 });
    var skinM = vmMat(0xd49e7e, { roughness: 0.8, metalness: 0.02, envMapIntensity: 0.32 });
    function arm() {
      var a = new THREE.Group();
      vmBox(0.088, 0.088, 0.44, sleeveM, 0, 0, 0.04, a);
      vmBox(0.094, 0.094, 0.07, cuffM, 0, 0, -0.17, a);
      vmBox(0.082, 0.084, 0.09, gloveM, 0, 0, -0.24, a);
      vmBox(0.08, 0.08, 0.07, skinM, 0, 0, -0.31, a);
      vm.add(a); return a;
    }
    vmL = arm(); vmR = arm();
    vmItem = new THREE.Group(); vm.add(vmItem);
    /* own articulated body (shown when looking down) */
    body = new THREE.Group();
    var shirt = vmMat(0x365578, { roughness: 0.85, metalness: 0.04 }), pant = vmMat(0x282d37, { roughness: 0.86, metalness: 0.04 }), boot = vmMat(0x1b1a18, { roughness: 0.65, metalness: 0.12 }), pack = vmMat(0x4c4334, { roughness: 0.88, metalness: 0.05 }), belt = vmMat(0x241d15, { roughness: 0.6, metalness: 0.25 }), skin = skinM;
    function bb(w, h, d, m, x, y, z, p) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; }
    bb(0.48, 0.68, 0.27, shirt, 0, 1.05, 0, body);
    bb(0.5, 0.08, 0.29, belt, 0, 0.73, 0, body);
    bb(0.36, 0.44, 0.16, pack, 0, 1.06, -0.2, body);
    bb(0.14, 0.56, 0.14, shirt, -0.33, 1.08, 0, body); bb(0.14, 0.56, 0.14, shirt, 0.33, 1.08, 0, body);
    bb(0.13, 0.13, 0.13, skin, -0.33, 0.72, 0, body); bb(0.13, 0.13, 0.13, skin, 0.33, 0.72, 0, body);
    [-0.13, 0.13].forEach(function (x) {
      var lg = new THREE.Group(); lg.position.set(x, 0.72, 0);
      bb(0.21, 0.56, 0.22, pant, 0, -0.28, 0, lg);
      bb(0.22, 0.16, 0.26, boot, 0, -0.64, 0.02, lg);
      body.add(lg); bodyLegs.push(lg);
    });
    scene.add(body);
  }
  /* ---- 3D held-item & table-prop PBR models (multi-part, no emoji) ---- */
  function vmColor(id) {
    var K = [['titanium', 0x8fb4de], ['golden', 0xe3b02a], ['gold', 0xe3b02a], ['copper', 0xd2733a], ['iron', 0xa9adb3], ['coated', 0x7f8c99], ['zinc', 0xa7b8c4], ['brass', 0xc9a24a], ['stone', 0x8d9198], ['granite', 0xb98a6a], ['andesite', 0xa2a6a9], ['diorite', 0xcfcfca], ['calcite', 0xf1f1ec], ['brick', 0xa8452f], ['clay', 0xb86f50], ['cactus', 0x4f9a46], ['wood', 0x9c6f3a], ['plank', 0xb98b55], ['stick', 0x8a5a2b], ['palm', 0x9a7a3a], ['pine', 0x7a5a3a], ['leaf', 0x4a9a3a], ['coal', 0x2c2d31], ['sand', 0xe6d28f], ['glass', 0x9fd8ff], ['rope', 0xcdb88a], ['string', 0xf0f0f0], ['water', 0x4aa3e8], ['apple', 0xd23a3a], ['cabbage', 0x6aba4a], ['meat', 0xc2554a], ['bread', 0xc99a5b], ['bomb', 0x222222], ['tnt', 0xb02a2a], ['battery', 0x3a3a44], ['chip', 0x2f7a4a], ['band', 0xf0d9c0], ['medical', 0xf0f0f0], ['carton', 0xb98b55]];
    for (var i = 0; i < K.length; i++) if (id.indexOf(K[i][0]) >= 0) return K[i][1];
    var h = 0; for (var j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) >>> 0; return new THREE.Color().setHSL((h % 360) / 360, 0.45, 0.55).getHex();
  }
  function vmModel(it, kind, worldSpace) {
    var g = new THREE.Group(), col = vmColor(it.id), id = it.id, ty = it.type, tl = it.tool;
    var isMetal = /iron|gold|titanium|copper|zinc|brass|steel|gun|rifle|pistol|sword|axe|pick|shovel|hammer|ingot|plate/.test(id + '_' + (tl || ''));
    function shade(k, met, rgh) {
      return vmMat(new THREE.Color(col).multiplyScalar(k).getHex(), {
        metalness: met != null ? met : (isMetal ? 0.68 : 0.08),
        roughness: rgh != null ? rgh : (isMetal ? 0.34 : 0.65)
      });
    }
    function B(w, h, d, m, x, y, z) { return vmBox(w, h, d, m, x, y, z, g, worldSpace); }
    var wood = vmMat(0x7a4f25, { roughness: 0.78, metalness: 0.04 }), grip = vmMat(0x2d241c, { roughness: 0.68, metalness: 0.08 });
    var steelDark = vmMat(0x2f333a, { roughness: 0.36, metalness: 0.78 }), steelMid = vmMat(0x565c66, { roughness: 0.32, metalness: 0.82 });
    if (tl === 'axe') {
      B(0.044, 0.46, 0.046, wood, 0, 0.09, 0); B(0.054, 0.13, 0.054, grip, 0, -0.08, 0);
      B(0.064, 0.085, 0.068, steelDark, 0, 0.27, 0.02);
      B(0.042, 0.13, 0.14, shade(0.95), 0, 0.27, -0.065);
      B(0.028, 0.17, 0.055, shade(1.12), 0, 0.27, -0.145);
      B(0.014, 0.19, 0.024, shade(1.32), 0, 0.27, -0.18);
    } else if (tl === 'hoe') {
      B(0.045, 0.44, 0.045, wood, 0, 0.1, 0); B(0.06, 0.06, 0.22, shade(1), 0, 0.32, -0.08); B(0.05, 0.13, 0.03, shade(1.18), 0, 0.26, -0.18);
    } else if (tl === 'shovel') {
      B(0.045, 0.42, 0.045, wood, 0, 0.1, 0); B(0.08, 0.04, 0.05, grip, 0, -0.12, 0);
      B(0.18, 0.19, 0.025, shade(1), 0, 0.36, 0); B(0.12, 0.07, 0.022, shade(1.2), 0, 0.49, 0);
    } else if (tl === 'pick') {
      B(0.048, 0.44, 0.048, wood, 0, 0.1, 0); B(0.07, 0.08, 0.07, steelDark, 0, 0.3, 0);
      B(0.055, 0.055, 0.32, shade(1), 0, 0.3, 0); B(0.04, 0.11, 0.06, shade(1.18), 0, 0.26, -0.17); B(0.04, 0.11, 0.06, shade(1.18), 0, 0.26, 0.17);
    } else if (it.wtype === 'spear') {
      B(0.035, 0.78, 0.035, wood, 0, 0.24, 0); B(0.05, 0.1, 0.05, grip, 0, 0.56, 0);
      B(0.07, 0.22, 0.02, shade(1.15), 0, 0.74, 0); B(0.11, 0.04, 0.04, shade(0.7), 0, 0.61, 0);
    } else if (it.wtype === 'great') {
      B(0.095, 0.56, 0.024, shade(1), 0, 0.42, 0); B(0.045, 0.52, 0.03, shade(1.3), 0, 0.42, 0);
      B(0.3, 0.055, 0.06, shade(0.75), 0, 0.12, 0); B(0.055, 0.2, 0.055, grip, 0, 0.0, 0); B(0.08, 0.05, 0.08, shade(0.85), 0, -0.12, 0);
    } else if (tl === 'gun' || id.indexOf('gun') >= 0 || id.indexOf('rifle') >= 0 || id.indexOf('pistol') >= 0) {
      var longG = id.indexOf('rifle') >= 0 || id.indexOf('shot') >= 0 || id.indexOf('smg') >= 0;
      B(0.068, 0.085, longG ? 0.32 : 0.22, steelMid, 0, 0.05, -0.02);
      B(0.036, 0.036, longG ? 0.34 : 0.18, steelDark, 0, 0.07, longG ? -0.32 : -0.2);
      B(0.045, 0.13, 0.06, grip, 0, -0.05, 0.06);
      B(0.038, 0.11, 0.048, steelDark, 0, -0.06, -0.05);
      if (longG) B(0.055, 0.09, 0.18, wood, 0, 0.03, 0.2);
      B(0.018, 0.025, 0.02, steelDark, 0, 0.105, longG ? -0.45 : -0.27);
      B(0.026, 0.025, 0.035, steelDark, 0, 0.105, 0.06);
    } else if (tl === 'sword') {
      B(0.058, 0.38, 0.018, shade(1), 0, 0.31, 0); B(0.028, 0.34, 0.024, shade(1.3), 0, 0.31, 0);
      B(0.21, 0.04, 0.05, shade(0.75), 0, 0.1, 0); B(0.048, 0.12, 0.048, grip, 0, 0.02, 0); B(0.07, 0.04, 0.07, shade(0.85), 0, -0.06, 0);
    } else if (tl === 'rod') {
      B(0.03, 0.56, 0.03, wood, 0, 0.2, 0); B(0.06, 0.06, 0.06, steelMid, 0, 0.06, 0.04); B(0.016, 0.24, 0.016, vmMat(0xeeeeee), 0.06, 0.5, 0);
    } else if (tl === 'hammer' || id.indexOf('hammer') >= 0) {
      B(0.05, 0.42, 0.05, wood, 0, 0.1, 0); B(0.13, 0.13, 0.23, shade(1), 0, 0.31, 0);
    } else if (tl) {
      B(0.05, 0.42, 0.05, wood, 0, 0.1, 0); B(0.14, 0.14, 0.14, shade(1), 0, 0.3, 0);
    } else if (id.indexOf('bow') >= 0) {
      B(0.03, 0.46, 0.03, shade(1), 0, 0.15, 0); B(0.14, 0.03, 0.03, shade(1), 0.07, 0.38, 0); B(0.14, 0.03, 0.03, shade(1), 0.07, -0.08, 0); B(0.012, 0.46, 0.012, vmMat(0xf4f0e8), 0.13, 0.15, 0);
    } else if (id.indexOf('staff') >= 0) {
      B(0.04, 0.62, 0.04, wood, 0, 0.2, 0); B(0.12, 0.12, 0.12, shade(1.2, 0.2, 0.2), 0, 0.56, 0);
    } else if (ty === 'block' && it.vox && W.blockMesh && W.blockMesh(it.vox)) {
      var bm = W.blockMesh(it.vox), bs = W.VSIZE[it.vox] || [1, 1, 1], mx = Math.max(bs[0], bs[1], bs[2]), sc = 0.7 / mx; bm.scale.set(bs[0] * sc, bs[2] * sc, bs[1] * sc); bm.position.set(0, 0.55, 0); if (it.vox >= 87) bm.scale.setScalar(0.6); g.add(bm);
    } else if (ty === 'block') {
      B(0.3, 0.3, 0.3, shade(1), 0, 0.15, 0); B(0.28, 0.04, 0.28, shade(1.18), 0, 0.31, 0);
    } else if (ty === 'armor') {
      if (it.slot === 'head') { B(0.3, 0.2, 0.3, shade(1), 0, 0.15, 0); B(0.32, 0.05, 0.32, shade(1.2), 0, 0.27, 0); B(0.2, 0.07, 0.05, steelDark, 0, 0.12, 0.15); }
      else if (it.slot === 'chest') { B(0.34, 0.36, 0.14, shade(1), 0, 0.2, 0); B(0.1, 0.12, 0.14, shade(1.15), -0.2, 0.34, 0); B(0.1, 0.12, 0.14, shade(1.15), 0.2, 0.34, 0); }
      else if (it.slot === 'legs') { B(0.34, 0.1, 0.14, shade(1.15), 0, 0.38, 0); B(0.14, 0.36, 0.14, shade(1), -0.1, 0.18, 0); B(0.14, 0.36, 0.14, shade(1), 0.1, 0.18, 0); }
      else { B(0.12, 0.18, 0.2, shade(1), -0.09, 0.1, 0.03); B(0.12, 0.18, 0.2, shade(1), 0.09, 0.1, 0.03); B(0.12, 0.06, 0.24, grip, -0.09, 0.0, 0.05); B(0.12, 0.06, 0.24, grip, 0.09, 0.0, 0.05); }
    } else if (ty === 'acc') {
      B(0.26, 0.06, 0.26, shade(1), 0, 0.08, 0); B(0.16, 0.07, 0.16, shade(1.25), 0, 0.14, 0);
    } else if (id.indexOf('ingot') >= 0) {
      B(0.32, 0.09, 0.15, shade(1, 0.85, 0.28), 0, 0.06, 0); B(0.26, 0.04, 0.11, shade(1.2, 0.85, 0.25), 0, 0.12, 0);
    } else if (id.indexOf('plate') >= 0 || id.indexOf('sheet') >= 0) {
      B(0.32, 0.03, 0.32, shade(1, 0.85, 0.3), 0, 0.04, 0);
    } else if (id.indexOf('stick') >= 0 || id.indexOf('wire') >= 0 || id.indexOf('chain') >= 0) {
      B(0.045, 0.36, 0.045, shade(1), 0, 0.18, 0);
    } else if (it.eat && it.eat.th) {
      B(0.14, 0.24, 0.14, shade(0.95, 0.05, 0.25), 0, 0.12, 0); B(0.07, 0.05, 0.07, vmMat(0xdddddd), 0, 0.26, 0);
    } else if (it.eat) {
      B(0.2, 0.18, 0.2, shade(1, 0.02, 0.72), 0, 0.1, 0); B(0.13, 0.08, 0.13, shade(1.18, 0.02, 0.72), 0, 0.2, 0.02); B(0.03, 0.06, 0.03, vmMat(0x3a6a2a), 0, 0.27, 0);
    } else if (id.indexOf('ore') >= 0 || id.indexOf('nugget') >= 0 || id.indexOf('stone') >= 0) {
      B(0.19, 0.16, 0.19, shade(0.9), 0, 0.08, 0); B(0.12, 0.11, 0.12, shade(1.2), 0.05, 0.16, 0.04); B(0.08, 0.08, 0.08, shade(1.35), -0.06, 0.05, 0.09);
    } else {
      B(0.22, 0.2, 0.22, shade(1), 0, 0.1, 0); B(0.2, 0.05, 0.2, shade(1.22), 0, 0.21, 0);
    }
    var big = ty === 'block' || ty === 'armor' || ty === 'acc';
    g.scale.setScalar(worldSpace ? (big ? 0.55 : 0.75) : (kind === 'weapon' ? (it.wtype === 'spear' ? 0.75 : 0.72) : big ? 0.38 : 0.55));
    if (!worldSpace) g.rotation.x = tl === 'sword' ? -0.75 : 0.2;
    return g;
  }
  function updateVM() {
    if (!vm) return; var id = hot[sel] || 'fists', it = ITEMS[id]; if (!it) return; vmId = id;
    while (vmItem.children.length) vmItem.remove(vmItem.children[0]);
    var kind = it.tool === 'gun' ? 'gun' : it.type === 'tool' ? 'weapon' : (it.type === 'block' || it.type === 'acc' || it.type === 'armor') ? 'two' : 'one';
    vmR.visible = true; vmL.visible = kind === 'two'; vm.userData.kind = kind;
    if (id !== 'fists') {
      vmItem.add(vmModel(it, kind, false));
    }
  }
  function tickVM(dt, rest) {
    if (!vm) return; var show = mode === 'play' && !rest; vm.visible = show; var kind = vm.userData.kind || 'weapon';
    var spd = Math.hypot(P.vx, P.vz); vmT += dt * (2 + spd * 1.4); var bob = Math.sin(vmT) * 0.012 * Math.min(1, spd / 3), sw = vmSwing > 0 ? Math.sin((1 - vmSwing / 0.22) * Math.PI) : 0; if (vmSwing > 0) vmSwing -= dt;
    var eat = eatT > 0 ? Math.sin(eatT * 9) * 0.02 + 0.06 : 0;
    if (kind === 'one') { vmR.position.set(0.38, -0.27 + bob + eat, -0.44 + sw * -0.1); vmR.rotation.set(-0.32 - sw * 0.9, 0.06, 0); vmItem.position.set(0.37, -0.25 + bob + eat, -0.68 + sw * -0.1); vmItem.rotation.set(0, -0.25, 0); }
    else if (kind === 'two') { vmR.position.set(0.2, -0.27 + bob, -0.42); vmR.rotation.set(-0.3, 0.45, 0); vmL.position.set(-0.2, -0.27 + bob, -0.42); vmL.rotation.set(-0.3, -0.45, 0); vmItem.position.set(0, -0.4 + bob, -0.66); vmItem.rotation.set(0, 0, 0); }
    else if (kind === 'gun') { var rl = gunRel > 0 ? Math.sin((1 - gunRel / gunRelMax) * Math.PI) : 0, kick = gunKick; vmR.position.set(0.3, -0.3 + bob - rl * 0.22, -0.42 + kick * 0.08); vmR.rotation.set(-0.15 + kick * 0.5 + rl * 0.5, 0.05, 0); vmItem.position.set(0.3, -0.27 + bob - rl * 0.2, -0.5 + kick * 0.08); vmItem.rotation.set(kick * 0.6 + rl * 0.9, 0.05 - rl * 0.3, -rl * 0.5); }
    else { vmR.position.set(0.36, -0.28 + bob - sw * 0.05, -0.42 - sw * 0.12); vmR.rotation.set(-0.28 - sw * 1.1, 0.14, 0); vmItem.position.set(0.34, -0.26 + bob - sw * 0.1, -0.64 - sw * 0.1); vmItem.rotation.set(-0.14 - sw * 1.0, 0.08, -0.26 + sw * 0.5); }
    vmL.visible = kind === 'two';
    if (body) { body.visible = show; body.position.set(P.x + Math.sin(P.yaw) * 0.3, P.y, P.z + Math.cos(P.yaw) * 0.3); body.rotation.y = P.yaw; var ph = Math.sin(vmT * 1.5) * 0.7 * Math.min(1, spd / 3); bodyLegs[0].rotation.x = ph; bodyLegs[1].rotation.x = -ph; }
  }
  function renderHotbar() {
    var h = '';
    for (var i = 0; i < 8; i++) {
      var id = hot[i] || (i === 0 ? 'fists' : null), it = id ? ITEMS[id] : null;
      h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + (it ? it.ic : '') + (it && it.type !== 'tool' && id !== 'fists' ? '<em>' + count(id) + '</em>' : '') + '</div>';
    }
    if ($('#hotbar')) $('#hotbar').innerHTML = h;
    if ($('#held')) $('#held').style.display = 'none'; updateVM();
  }
  function renderStats() {
    var ast = armorStats(), as = accStats();
    var defs = [['hp', 'Health', 'b-hp', ast.hpMax], ['hunger', 'Hunger', 'b-hu', 100], ['thirst', 'Thirst', 'b-th', 100], ['energy', 'Energy', 'b-en', 100], ['comfort', 'Comfort', 'b-co', 100]];
    $('#stats').innerHTML = defs.map(function (d) {
      var v = Math.round(P[d[0]]), mx = d[3], pct = clamp(P[d[0]] / mx * 100, 0, 100);
      return '<div class="bar ' + d[2] + '"><i style="width:' + pct + '%"></i><span><b>' + d[1] + '</b><b>' + v + (mx > 100 ? '/' + mx : '') + '</b></span></div>';
    }).join('');
    var s = [];
    if (status.poison > 0) s.push('Poisoned'); if (status.stomach > 0) s.push('Stomachache'); if (status.wpoison > 0) s.push('Water Poison'); if (status.corr > 0) s.push('Corrosive'); if (status.keylock > 0) s.push('Keybind Error ' + Math.ceil(status.keylock) + 's'); if (status.acid > 0) s.push('Acidic Poison x' + Math.pow(3, Math.max(0, status.acidN - 1))); if (cooking.length) s.push('Cooking ' + Math.ceil(cooking[0].t) + 's');
    if (P.comfort <= 30) s.push('Uncomfortable'); if (tempState() < 0) s.push('Cold'); else if (tempState() > 0) s.push('Hot'); s.push(Math.round(P.temp == null ? 25 : P.temp) + '°C'); if (rest) s.push(rest.k === 'sleep' ? 'Sleeping' : 'Resting');
    $('#status').innerHTML = s.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    var clk = clockInfo(T), safeTxt = T < 30 ? ' · Safe time <b>' + Math.ceil(30 - T) + 's</b>' : '', hh = Math.floor(clk.hour);
    var timeTxt = as.watch === 0 ? '<b>Time unknown</b> (equip a watch)' : 'Day <b>' + clk.day + '</b> · <b>' + (as.watch === 1 ? (hh < 10 ? '0' : '') + hh + ':00' : clk.str) + '</b> (' + clk.phase + ')';
    var zc = 0; if (as.radar) { for (var zi = 0; zi < zombies.length; zi++) if (Math.hypot(zombies[zi].x - P.x, zombies[zi].z - P.z) < 70) zc++; zc += dormNear(70); }
    var roomTxt = mp.role !== 'solo' ? '<br>Room <b>' + esc(mp.room) + '</b> (' + totalPlayers() + '/' + MAX_PLAYERS + ')' + (mp.online ? ' · Online' : ' · Local') : '';
    $('#info').innerHTML = timeTxt + safeTxt +
      '<br>DEF <b>' + ast.def + '</b> · Kills <b>' + kills + '</b> · Zombies nearby <b>' + (as.radar ? zc : '?') + '</b>' + (as.radar ? '' : ' (equip a Radar)') +
      '<br>Tier <b>T' + worldTier(clk.day) + '</b> · Coins <b>' + coins + '</b> · Biome <b>' + (inUG(P.x) ? W.ugL[ugLayer(P.x)].name : ({ city: 'City', desert: 'Desert City', jungle: 'Jungle Village', snow: 'Snow City', mountain: 'Mountain', peak: 'High Peak', beach: 'Beach', sea: 'Sea' }[W.biomeOf(P.x, P.z)] || 'City')) + '</b>' + (bloodOn ? '<br><b style="color:#ff5a5a">BLOOD MOON · double zombies!</b>' : '') +
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
    var gy = onSurfaceB(b) ? W.gh(b.x, b.z) : 0; if (dx || dz) { if (b.y < gy && gy - b.y <= 1.4) b.y = gy; }
    if (dy) { b.y += dy; b.onGround = false; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r); if (i) { if (dy < 0) { b.y = i.top; b.onGround = true; } else b.y = i.bottom - h; b.vy = 0; } if (b.y <= gy) { b.y = gy; b.vy = 0; if (dy < 0) b.onGround = true; } }
  }
  function onSurfaceB(b) { return b.x <= W.half + 50 && W.gh; }
  function stepPlayer(dt) {
    if (fallbackLook) {
      var tr = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0), ly = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
      if (tr) P.yaw += tr * 2.2 * dt; if (ly) P.pitch = clamp(P.pitch + ly * 1.6 * dt, -1.5, 1.5);
    }
    var fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    var wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str, len = Math.hypot(wx, wz);
    if (rest && (fwd || str || keys.Space)) endRest();
    if (rest) { wx = wz = 0; len = 0; } if (len > 0) { wx /= len; wz /= len; }
    var sprint = keys.ShiftLeft && fwd > 0 && P.energy > 0 && !rest, sp = (sprint ? 6.4 : 4.2) * speedMult() * (creative ? CM.speed : 1) * (P.energy <= 0 ? 0.92 : 1);
    var f = Math.min(1, (P.onGround ? 14 : 3) * dt); P.vx += (wx * sp - P.vx) * f; P.vz += (wz * sp - P.vz) * f;
    if (sprint && len > 0) P.energy = Math.max(0, P.energy - 3 * armorStats().energyDrain * dt);
    if (keys.Space && P.onGround && !rest && !(creative && fly)) { P.vy = 6.4; P.onGround = false; SFX.play('step'); }
    if (P.onGround && Math.hypot(P.vx, P.vz) > 1.2) { stepT -= dt; if (stepT <= 0) { stepT = sprint ? 0.28 : 0.42; SFX.play('step'); } } else stepT = 0.08;
    var n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
    var rfl = !rest && W.waterAt && W.waterAt(P.x, P.z) === 'river' && P.y < 0.5 ? 2.2 : 0;
    for (var i = 0; i < n; i++) { if (creative && fly) { P.vy = (keys.Space ? 9 : 0) - (keys.KeyC ? 9 : 0); } else { P.vy -= 17 * h; if (P.vy < -40) P.vy = -40; } if (rfl) moveBody(P, 0, 0, rfl * h, 0.3, 1.8, P.onGround); moveBody(P, P.vx * h, 0, 0, 0.3, 1.8, P.onGround); moveBody(P, 0, 0, P.vz * h, 0.3, 1.8, P.onGround); moveBody(P, 0, P.vy * h, 0, 0.3, 1.8, false); }
    if (inUG(P.x)) { var uL = W.ugL[ugLayer(P.x)]; P.x = clamp(P.x, uL.x0 + 6.4, uL.x1 - 6.4); P.z = clamp(P.z, uL.z0 + 6.4, uL.z1 - 6.4); } else { P.x = clamp(P.x, -W.half + 0.4, W.half - 0.4); P.z = clamp(P.z, -W.half + 0.4, W.half - 0.4); }
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
  function unkey(k) { var y = k % 64, r = Math.floor(k / 64), z = (r % 8192) - 2600, x = Math.floor(r / 8192) - 2600; return [x, y, z]; }
  var ROCKITEM = { granite: 'granite_ore', andesite: 'andesite_ore', diorite: 'diorite_ore', calcite: 'calcite_ore', clay: 'clay_ore', zinc: 'zinc_ore', titanium: 'titanium_ore', permafrost: 'permafrost_ore', diamond: 'diamond', ruby: 'ruby', emerald: 'emerald', amethyst: 'amethyst', sapphire: 'sapphire' }, ROCKNAME = { granite: 'Granite Ore', andesite: 'Andesite Ore', diorite: 'Diorite Ore', calcite: 'Calcite Ore', clay: 'Clay Ore', titanium: 'Titanium Ore', permafrost: 'Permafrost Ore', diamond: 'Diamond Ore', ruby: 'Ruby Ore', emerald: 'Emerald Ore', amethyst: 'Amethyst Ore', sapphire: 'Sapphire Ore' };
  var VNAME = { 51: 'Statue of God', 49: 'Liquiders Workbench', 50: 'Sewing Table', 44: 'Wooden Spike', 45: 'Sharp Palm Fibrous Root', 46: 'Iron Circular Barbed Wire', 47: 'Ivy Grass', 48: 'Titanium Barbed Wire', 43: 'Blast Smelter', 33: 'Smooth Granite Block', 34: 'Smooth Andesite Block', 35: 'Smooth Diorite Block', 36: 'Smooth Calcite Block', 37: 'Stone Bricks Block', 38: 'Red Bricks Block', 39: 'Granite Bricks Block', 40: 'Andesite Bricks Block', 41: 'Diorite Bricks Block', 42: 'Calcite Bricks Block', 29: 'Manual Pressing', 30: 'Manual Casing & Frame Crafter', 31: 'Trap Bench', 32: 'Mason Workbench', 16: 'Manual Milling', 17: 'Bomb Workbench', 18: 'Glass Kiln', 19: 'Crafting Workbench', 20: 'Working Workbench', 21: 'Wooden Chest', 22: 'Iron-Cased Chest', 23: 'Iron Chest', 24: 'Copper-Cased Chest', 25: 'Copper Chest', 26: 'Glass Block', 27: 'Cactus Block', 28: 'TNT Block', 10: 'Wood Plank Block', 11: 'Sawmill', 12: 'Turret Workbench', 13: 'Handmade Cannon', 14: 'Cannon', 15: 'Manual Cannon', 1: 'Wood Log Block', 2: 'Stone Block', 3: 'Smelting Furnace', 4: 'Cozy Bed', 5: 'Cozy Couch', 6: 'Sink', 7: 'Campfire', 8: 'Iron Anvil', 9: 'Computer Bench' };
  var VITEM = { 51: 'statue_god', 49: 'liquiders_workbench', 50: 'sewing_table', 44: 'wooden_spike', 45: 'sharp_palm_root', 46: 'iron_barbed_wire', 47: 'ivy_grass', 48: 'titanium_barbed_wire', 43: 'blast_smelter', 33: 'smooth_granite_block', 34: 'smooth_andesite_block', 35: 'smooth_diorite_block', 36: 'smooth_calcite_block', 37: 'stone_bricks_block', 38: 'red_bricks_block', 39: 'granite_bricks_block', 40: 'andesite_bricks_block', 41: 'diorite_bricks_block', 42: 'calcite_bricks_block', 29: 'manual_press', 30: 'casing_crafter', 31: 'trap_bench', 32: 'mason_bench', 16: 'manual_milling', 17: 'bomb_bench', 18: 'glass_kiln', 19: 'craft_bench', 20: 'work_bench', 21: 'wooden_chest', 22: 'ironcased_chest', 23: 'iron_chest', 24: 'coppercased_chest', 25: 'copper_chest', 26: 'glass_block', 27: 'cactus_block', 28: 'tnt_block', 10: 'wood_plank_block', 11: 'sawmill', 12: 'turret_bench', 13: 'handmade_cannon', 14: 'cannon_turret', 15: 'manual_cannon', 1: 'wood_block', 2: 'stone_block', 3: 'furnace', 4: 'bed_block', 5: 'couch_block', 6: 'sink_block', 7: 'campfire', 8: 'anvil_block', 9: 'computer_bench' };

  Object.keys(ITEMS).forEach(function (id) { var it = ITEMS[id]; if (it.vox >= 52) { VITEM[it.vox] = id; VNAME[it.vox] = it.name; } });
  function turretAt(x, y, z) { for (var i = 0; i < W.turrets.length; i++) { var e = W.turrets[i]; if (e.alive && e.vx === x && e.vy === y && e.vz === z) return e; } return null; }
  function tcfg(e) { return ITEMS[WZ.TURRET_VOX[e.vt]].turret; }
  function dropScraps(vt, x, z) {
    var id = VITEM[vt], r = WZ.RECIPES.filter(function (q) { return q.out[0] === id; })[0]; if (!r) return;
    var loot = {}, any = false; Object.keys(r.cost).forEach(function (k) { var n = Math.round(r.cost[k] * 0.2); if (n > 0) { loot[k] = n; any = true; } });
    say(VNAME[vt] + ' was destroyed by zombies!', true); if (any) addCorpse(x, z, { inv: loot, eq: [], ac: [] }, true, 'Turret Scraps');
  }
  function damageVoxLocal(cx, cy, cz, dmg, giveToPid) {
    var v = W.getVox(cx, cy, cz); if (!v) return null; var bdf = ITEMS[VITEM[v.t]] && ITEMS[VITEM[v.t]].bdef; if (bdf) dmg = Math.max(1, dmg - bdf); v.hp -= dmg;
    if (v.hp <= 0) {
      var vt = v.t, te0 = (vt >= 13 && vt <= 15) ? turretAt(cx, cy, cz) : null, ch0 = (vt >= 21 && vt <= 25) ? chestAt(cx, cy, cz) : null; W.delVox(cx, cy, cz); voxVer++;
      if (ch0) { Object.keys(ch0.box).forEach(function (id) { if (ch0.box[id] > 0) addCorpse(ch0.x, ch0.z, { inv: (function () { var o = {}; o[id] = ch0.box[id]; return o; })(), eq: [], ac: [] }, true, 'Dropped Items'); }); ch0.box = {}; if (chestE === ch0) chestE = null; }
      if (te0) { if (manning === te0) manning = null; if (!giveToPid) dropScraps(vt, cx + 0.5, cz + 0.5); else if (giveToPid === 'self' && te0.ammo > 0) give('cannon_ball', te0.ammo); }
      if (mp.role === 'host') { Net.send({ t: 'vox', op: 0, x: cx, y: cy, z: cz }); if (giveToPid && giveToPid !== Net.info().pid) Net.send({ t: 'give', to: giveToPid, id: VITEM[vt], n: 1 }); else if (giveToPid === 'self') give(VITEM[vt], 1); }
      else if (mp.role === 'solo' && giveToPid === 'self') give(VITEM[vt], 1);
      return { broken: true, vt: vt, hp: 0 };
    } else { if (mp.role === 'host') Net.send({ t: 'vox', op: 2, x: cx, y: cy, z: cz, hp: Math.round(v.hp) }); return { broken: false, vt: v.t, hp: v.hp }; }
  }
  function applyEntHit(e, bd, targetPid) {
    e.hp -= bd;
    var goal = e.hp <= 0 ? e.yield : Math.floor(e.yield * (1 - Math.max(0, e.hp) / e.max)), gain = goal - e.given, item = e.k === 'tree' ? (e.drop || 'wood') : (ROCKITEM[e.kind] || (e.sand ? 'sand' : e.ore ? 'iron_nugget' : e.gold ? 'golden_nugget' : e.zinc ? 'zinc_ore' : e.copper ? 'copper_ore' : e.coal ? 'coal' : 'stone')), lg = (e.k === 'tree' && e.leaf > 0 && gain > 0) ? Math.round(gain * e.leaf) : 0;
    if (lg > 0) { if (targetPid === 'self') { give('leaf', lg); say('+' + lg + ' Leaf'); } else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: 'leaf', n: lg, msg: '+' + lg + ' Leaf' }); }
    if (gain > 0) { e.given = goal; if (targetPid === 'self') { give(item, gain); say('+' + gain + ' ' + ITEMS[item].name); } else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: item, n: gain, msg: '+' + gain + ' ' + ITEMS[item].name }); }
    if (e.hp <= 0) {
      e.respawn = T + (e.k === 'tree' ? 600 : 720); if (e.k === 'tree') W.setTree(e, false); else W.setRock(e, false);
      var msg = e.k === 'tree' ? 'The tree fell.' : (e.sand ? 'The sand mound is gone.' : e.ore ? 'The iron ore is mined out.' : e.gold ? 'The gold ore is mined out.' : e.zinc ? 'The zinc ore is mined out.' : e.copper ? 'The copper ore is mined out.' : e.coal ? 'The coal is mined out.' : 'The rock is destroyed.');
      if (targetPid === 'self') say(msg); else if (mp.role === 'host') Net.send({ t: 'say', to: targetPid, msg: msg });
    }
    if (mp.role === 'host') Net.send({ t: 'ent', k: e.k, idx: e.idx, hp: Math.round(e.hp), given: e.given, alive: e.alive });
  }
  function hitVoxAt(cx, cy, cz, bd) {
    var tv = W.getVox(cx, cy, cz); if (tv && tv.t === 28) { igniteTnt(cx, cy, cz); return; }
    SFX.play('block');
    if (mp.role === 'client') Net.send({ t: 'dmgVox', x: cx, y: cy, z: cz, dmg: bd * 2 });
    else { var res = damageVoxLocal(cx, cy, cz, bd * 2, 'self'); if (res) say(VNAME[res.vt] + (res.broken ? ' taken back' : ' ' + Math.max(0, Math.round(res.hp)))); }
  }
  function swing() {
    var it = curItem(); if (it.type === 'food' || it.type === 'drink' || it.type === 'block' || it.type === 'med') return;
    if (it.tool === 'bow') { shootBow(); return; }
    if (it.tool === 'gun') { shootGun(it); return; }
    if (it.tool === 'bomb') { throwBomb(it); return; }
    if (it.tool === 'dart') { shootDart(it); return; }
    if (it.tool === 'rod') { swingCd = 0.6; lmb = false; startFish(); return; }
    var as0 = accStats(); swingCd = (it.cd ? it.cd : it.tool === 'club' ? 0.55 : it.tool === 'sword' ? 0.42 : 0.48) * (P.energy <= 0 ? 1.4 : 1) * (it.dly || 1) * as0.dly; mp.swingPulse = 0.25;
    vmSwing = 0.22;
    var h = aim(3.0 * (it.reach || 1) * (it.tool === 'sword' || it.tool === 'club' ? as0.reach : 1)); if (!h) { SFX.play('swing'); return; }
    if (h.kind === 'zombie') {
      var meleeDmg = Math.round(it.dmg * armorStats().dmgMult);
      SFX.play('hit');
      if (mp.role === 'client') { h.z.flash = 0.14; Net.send({ t: 'hitZ', id: h.z.id, dmg: meleeDmg, it: (it.bleed || it.splash) ? it.id : null }); } else { hitZombie(h.z, meleeDmg, 'self'); weaponFx(h.z, it, meleeDmg, 'self'); }
      return;
    }
    if (h.kind === 'vox') { var c = unkey(h.key); hitVoxAt(c[0], c[1], c[2], it.bd); return; }
    if (h.kind !== 'ent') { SFX.play('swing'); return; }
    var e = h.e;
    if (it.tool === 'hoe' && e.k === 'farm') return;
    if (e.vx != null) { hitVoxAt(e.vx, e.vy, e.vz, it.bd); return; }
    if (e.k === 'car') { if (e.own) { closeDoorOut(e); return; } if (e.burnt) { say('This burnt wreck has nothing left to loot.', true); return; } SFX.play('block'); if (mp.role === 'client') Net.send({ t: 'hitEnt', k: 'car', idx: e.idx, bd: it.bd || 1 }); else applyCarHit(e, it.bd || 1, 'self'); return; }
    if (e.k === 'tree' || e.k === 'rock') {
      var need = e.k === 'tree' ? 'axe' : 'pick';
      if (!e.sand && it.tool !== need) { say(e.k === 'tree' ? 'You need an axe to chop trees.' : 'You need a pickaxe to mine rocks.', true); return; }
      SFX.play(e.k === 'tree' ? 'wood' : 'stone');
      var hbd = it.bd || 1; if (e.k === 'rock' && e.sand && it.tool === 'shovel') hbd = Math.ceil(hbd * 1.6);
      if (mp.role === 'client') Net.send({ t: 'hitEnt', k: e.k, idx: e.idx, bd: hbd }); else applyEntHit(e, hbd, 'self');
    }
  }
  function hitZombie(z, dmg, attacker) {
    if (creative && attacker !== 'turret') dmg = Math.max(1, Math.round(dmg * CM.dmg));
    if (W.gods.length && aura(z.x, z.z).weak) dmg = Math.round(dmg * 1.1 + 0.4);
    if (z.def.mutant) z.guard = 2.5; if (z.def.wingguard && !(z.gcd > 0) && !(z.guard > 0)) { z.guard = 2.5; z.gcd = 6; } z.hp -= Math.max(1, dmg - (z.def.wingguard ? (z.guard > 0 ? 10 : 0) : z.def.def) - (z.def.mutant && z.guard > 0 ? 4 : 0)); z.flash = 0.14;
    if (attacker !== 'turret') { var dx = z.x - P.x, dz = z.z - P.z, l = Math.hypot(dx, dz) || 1; moveBody(z, dx / l * 0.35, 0, dz / l * 0.35, z.rad, 1.7, false); }
    if (z.hp <= 0) killZombie(z, attacker);
  }
  function awardKill(type) {
    if (type === 'floater') type = 'walker';
    var d = ZDEF[type]; if (!d || !d.coin) return; kc[type] = (kc[type] || 0) + 1;
    if (kc[type] >= d.coin[0]) { kc[type] = 0; coins += d.coin[1]; say('+' + d.coin[1] + ' Coin' + (d.coin[1] > 1 ? 's' : '') + ' (' + d.name + ')'); }
  }
  function killZombie(z, attacker) {
    scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); delete zMap[z.id];
    var dropId = null, zt = z.type;
    if (z.def.boss && mp.role !== 'client') { var bi = zt === 'gigantus' ? 0 : zt === 'mutanoider' ? 2 : 1; bf[bi] = 2; }
    if (zt === 'spider') dropId = rnd() < 1 / 3 ? 'string' : null; else if (zt === 'programmer') dropId = rnd() < 0.10 ? 'signal_chip' : null; else if (zt !== 'miner' && zt !== 'zfish' && zt !== 'drowned' && zt !== 'floater') dropId = rnd() < 0.15 ? WZ.rollLoot('trash1', rnd) : null;
    if (zt === 'spider' && rnd() < 0.6) dropId = 'cobweb'; if (zt === 'pfwalker' && rnd() < 0.10) dropId = 'permafrost_ore'; if (zt === 'berserk' && rnd() < 0.05) dropId = 'berserkers_boots'; if (zt === 'bomber' && rnd() < 0.05) dropId = 'gunpowder'; else if (zt === 'miner' && rnd() < 0.15) dropId = 'dynamite';
    if (attacker === 'self' || !attacker) { kills++; awardKill(zt); if (dropId) { give(dropId, 1); say('+1 ' + ITEMS[dropId].name); } }
    else if (attacker !== 'turret' && mp.role === 'host') Net.send({ t: 'zkill', to: attacker, drop: dropId, ty: z.ti });
  }
  function eatTick(dt) {
    var id = hot[sel], it = id ? ITEMS[id] : null;
    if (lmb && it && it.soon && count(id) > 0) { lmb = false; say(it.name + ' is coming soon. It cannot be used yet.', true); return; }
    if (!(lmb && it && it.eat && count(id) > 0)) { eatT = 0; $('#eat').style.display = 'none'; return; }
    var mxHp = armorStats().hpMax;
    if (it.type === 'med' && P.hp >= mxHp) { eatT = 0; $('#eat').style.display = 'none'; if (lmb) { lmb = false; say('Health is already full.'); } return; }
    eatT += dt; var e = it.eat; $('#eat').style.display = 'block'; $('#eat i').style.width = clamp(eatT / e.t * 100, 0, 100) + '%';
    $('#eat span').textContent = (it.type === 'med' ? 'Using ' : it.type === 'drink' ? 'Drinking ' : 'Eating ') + it.name;
    if (eatT >= e.t) {
      eatT = 0;
      if (e.uses) { if (!(P.bx > 0)) P.bx = e.uses; P.bx--; if (P.bx <= 0) { P.bx = 0; take(id, 1); say('The Band Aid Box is empty.'); } } else take(id, 1);
      if (e.ret) give(e.ret, 1);
      if (e.heal && it.type !== 'med') P.hp = clamp(P.hp + e.heal, 0, mxHp);
      if (e.burn) { hurt(e.burn, 'fire'); say('The lava burns you!', true); }
      if (e.corr) { status.corr = 20; say('Corrosive! 1 HP every 0.2 s for 20 s.', true); }
      if (e.wp && rnd() < e.wp * armorStats().wpResist) { status.wpoison = 15; say('You got Water Poison!', true); }
      if (it.type === 'med') {
        P.hp = clamp(P.hp + (e.heal || 30), 0, mxHp);
        say(it.name + ': +' + (e.heal || 30) + ' Health'); SFX.play('heal');
      } else {
        if (e.box) { openMysteryBox(); renderHotbar(); return; }
        if (e.golden) { status.gold = 120; say('Goldy Skin, Resistance, Regeneration and Strike for 2 minutes!'); }
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
    var id = hot[sel], it = id ? ITEMS[id] : null; if (it && it.veh && count(id) > 0) { placeVehicle(id, it); return; } if (!it || it.type !== 'block' || count(id) < 1) return;
    var h = aim(5); if (!h || !h.prev) return; var c = h.prev; camera.getWorldDirection(DIR); var rot = Math.abs(DIR.x) > Math.abs(DIR.z) ? 1 : 0; if (it.vox >= 87 && it.vox <= 125) rot = it.shape === 'stair' ? (Math.abs(DIR.x) > Math.abs(DIR.z) ? (DIR.x > 0 ? 1 : 3) : (DIR.z > 0 ? 0 : 2)) : 0;
    var cells = W.canPlaceBig(c[0], c[1], c[2], it.vox, rot); if (!cells) { say('Not enough room for this block here.', true); return; }
    if (W.voxCount() + cells.length >= W.MAX_VOX) { say('Block limit reached.', true); return; }
    for (var ci = 0; ci < cells.length; ci++) {
      var q = cells[ci];
      if (q[0] + 1 > P.x - 0.3 && q[0] < P.x + 0.3 && q[1] + 1 > P.y && q[1] < P.y + 1.8 && q[2] + 1 > P.z - 0.3 && q[2] < P.z + 0.3) { say('You are in the way.', true); return; }
      for (var i = 0; i < zombies.length; i++) { var z = zombies[i]; if (Math.abs(z.x - q[0] - 0.5) < 0.85 && Math.abs(z.z - q[2] - 0.5) < 0.85 && z.y < q[1] + 1 && z.y + z.h > q[1]) { say('A zombie is in the way.', true); return; } }
      if (W.hit(q[0] + 0.02, q[0] + 0.98, q[1] + 0.02, q[1] + 0.98, q[2] + 0.02, q[2] + 0.98)) { say('Something is in the way.', true); return; }
    }
    if (mp.role === 'client') { if (W.getVox(c[0], c[1], c[2])) return; take(id, 1); SFX.play('block'); Net.send({ t: 'place', x: c[0], y: c[1], z: c[2], vt: it.vox, hp: it.hp, item: id, rot: rot }); }
    else {
      if (!W.setBig(c[0], c[1], c[2], it.vox, it.hp, rot)) { say('You cannot build there.', true); return; }
      voxVer++; take(id, 1); SFX.play('block');
      if (mp.role === 'host') Net.send({ t: 'vox', op: 1, x: c[0], y: c[1], z: c[2], vt: it.vox, hp: it.hp, rot: rot });
    }
  }
  function applySearchEnt(e, targetPid) {
    if (e.searched) { if (targetPid === 'self') say('Already searched.'); else if (mp.role === 'host') Net.send({ t: 'say', to: targetPid, msg: 'Already searched.' }); return; }
    var wtier = worldTier(clockInfo(T).day), ctx = { village: W.biomeOf(e.x, e.z) !== 'city' || W.zoneOf(e.x, e.z) === 'out' };
    var key = e.k === 'pile' ? (e.bush ? 'bush_' + (e.bush === 'jungle' ? 'jungle' : 'plain') : e.tier === 4 ? (wtier >= 4 ? 'table4' : wtier >= 2 ? 'trash2' : 'trash1') : e.tier === 2 && wtier >= 2 && WZ.LOOT.trash2.enabled ? 'trash2' : 'trash1') : ('crate' + Math.max(1, Math.min(e.tier || 1, wtier, 5)));
    var rolls = WZ.LOOT[key].rolls || 1, got = {};
    for (var i = 0; i < rolls; i++) { var id = e.bush ? WZ.rollBush(key, rnd) : WZ.rollLoot(key, rnd, ctx); got[id] = (got[id] || 0) + 1; }
    Object.keys(got).forEach(function (id) {
      if (targetPid === 'self') { give(id, got[id]); say('+' + got[id] + ' ' + ITEMS[id].name); }
      else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: id, n: got[id], msg: '+' + got[id] + ' ' + ITEMS[id].name });
    });
    if (e.k === 'pile') { W.setPile(e, false); e.respawn = T + 300; } else { W.setCrate(e, false); e.respawn = T + 480; }
    if (mp.role === 'host') Net.send({ t: 'ent', k: e.k, idx: e.idx, searched: true });
  }
  function endRest() { rest = null; $('#dark').style.opacity = 0; }
  /* ---- Statue of God blessings ---- */
  var unl = { armed: false, imm: 0 }, godE = null;
  function aura(x, z) { var o = { weak: false, foot: false }; for (var i = 0; i < W.gods.length; i++) { var g = W.gods[i]; if (!g.alive || !(g.weakT > 0 || g.footT > 0)) continue; if (Math.hypot(x - (g.vx + 0.5), z - (g.vz + 0.5)) < 25) { if (g.weakT > 0) o.weak = true; if (g.footT > 0) o.foot = true; } } return o; }
  function godTick(dt) { unl.imm = Math.max(0, unl.imm - dt); for (var i = 0; i < W.gods.length; i++) { var g = W.gods[i]; g.weakT = Math.max(0, (g.weakT || 0) - dt); g.footT = Math.max(0, (g.footT || 0) - dt); g.cdU = Math.max(0, (g.cdU || 0) - dt); g.cdW = Math.max(0, (g.cdW || 0) - dt); g.cdF = Math.max(0, (g.cdF || 0) - dt); } }
  function openGod(e) {
    godE = e; SFX.play('click'); mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; mg = null; chestE = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (er) {} } $('#hud').hidden = true; $('#screen').hidden = true; $('#inv').hidden = false; renderGod();
  }
  function renderGod() {
    var e = godE; if (!e || !e.alive) { godE = null; renderInv(); return; }
    function row(k, name, desc, cd, left, extra) { return '<div class="rec"><div><b>🗿 ' + name + '</b><div class="cost">' + desc + '<br>Cooldown ' + cd + ' s' + (extra || '') + '</div></div><button class="btn' + (left > 0 ? '' : ' primary') + '" data-bless="' + k + '"' + (left > 0 ? ' disabled' : '') + '>' + (left > 0 ? Math.ceil(left) + ' s' : 'Pray') + '</button></div>'; }
    $('#inv').innerHTML = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">🗿 Statue of God &middot; Blessing</h2><button class="btn primary" data-gclose="1">Close</button></div><div class="box">' +
      row('unl', 'Unlethal', 'When you would die at 0 HP you survive with 1 HP and are immortal for 1 second, then the effect ends.', 600, e.cdU || 0, unl.armed ? '<br><span style="color:var(--gold)">Active: waiting for a deadly blow</span>' : '') +
      row('weak', 'Zombie Weaks', 'Zombies within 50 m (diameter) of this statue deal 10 less damage and take 10% more damage for 2 minutes.', 300, e.cdW || 0, e.weakT > 0 ? '<br><span style="color:var(--gold)">Active: ' + Math.ceil(e.weakT) + ' s left</span>' : '') +
      row('foot', 'Zombie Weak Foot', 'Zombies within 50 m (diameter) of this statue move 20% slower for 2 minutes.', 240, e.cdF || 0, e.footT > 0 ? '<br><span style="color:var(--gold)">Active: ' + Math.ceil(e.footT) + ' s left</span>' : '') + '</div></div>';
  }
  /* ---- Sea: oxygen (-1 per 0.1 s underwater) + Drowned Zombies ---- */
  var o2 = 100, drownT = 0.5, seaT = 4;
  function seaTick(dt) {
    var under = !ugOn && W.seaAt && W.seaAt(P.x, P.z) && P.y + (typeof crouch !== 'undefined' && crouch ? 1.2 : 1.62) < -0.3, bar = $('#o2');
    if (!bar) { bar = document.createElement('div'); bar.id = 'o2'; bar.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);width:260px;height:14px;border:2px solid #0b2a3a;border-radius:8px;background:#0a1a22cc;display:none;z-index:6;overflow:hidden'; bar.innerHTML = '<i style="display:block;height:100%;width:100%;background:linear-gradient(#7fd7ff,#2a8fd6)"></i><span style="position:absolute;inset:0;text-align:center;font:700 10px/14px system-ui;color:#fff">OXYGEN</span>'; document.body.appendChild(bar); }
    if (under) { o2 -= dt * (acc.indexOf('scuba_tank') >= 0 ? 2 : 10); if (o2 <= 0) { o2 = 0; drownT -= dt; if (drownT <= 0) { drownT = 0.5; hurt(2, 'drown'); } } } else o2 = Math.min(100, o2 + dt * 40);
    bar.style.display = o2 < 100 && !dead ? 'block' : 'none'; bar.firstChild.style.width = o2 + '%';
    if (mp.role === 'client') return;
    var nd = 0, i; for (i = zombies.length - 1; i >= 0; i--) { var zz = zombies[i]; if (zz.type !== 'drowned') continue; nd++; if (Math.hypot(zz.x - P.x, zz.z - P.z) > 48 || !under && Math.hypot(zz.x - P.x, zz.z - P.z) > 20) { scene.remove(zz.g); delete zMap[zz.id]; zombies.splice(i, 1); nd--; } }
    var nf = 0; for (i = zombies.length - 1; i >= 0; i--) { var zf = zombies[i]; if (zf.type !== 'floater') continue; nf++; if (Math.hypot(zf.x - P.x, zf.z - P.z) > 48) { scene.remove(zf.g); delete zMap[zf.id]; zombies.splice(i, 1); nf--; } }
    if (!under && W.seaAt && W.seaAt(P.x, P.z) && nf < 3) { floatT -= dt; if (floatT <= 0) { floatT = 6; for (var fa2 = 0; fa2 < 8; fa2++) { var fan = rnd() * 6.28, fd = 14 + rnd() * 8, fx = P.x + Math.cos(fan) * fd, fz = P.z + Math.sin(fan) * fd; if (W.seaAt(fx, fz)) { var fz0 = makeZombie('floater', fx, fz); fz0.px = fx; fz0.pz = fz; zombies.push(fz0); break; } } } }
    if (under || (W.seaAt && W.seaAt(P.x, P.z))) { seaT -= dt; if (seaT <= 0) { seaT = 7; if (nd < 3) { for (var a = 0; a < 8; a++) { var an = rnd() * 6.28, d = 14 + rnd() * 8, sx = P.x + Math.cos(an) * d, sz = P.z + Math.sin(an) * d; if (W.seaAt(sx, sz) && W.gh(sx, sz) < -1) { zombies.push(makeZombie('drowned', sx, sz)); break; } } } } }
  }
  /* ---- Furniture: lamps, tables (object on top, cutting station), seats ---- */
  var lampL = [], tMeshes = [];
  function lampTick() {
    var arr = [], i; for (i = 0; i < W.lamps.length; i++) { var l = W.lamps[i]; if (!l.alive) continue; var d = Math.hypot(l.x - P.x, l.z - P.z); if (d < 45) arr.push([d, l]); }
    arr.sort(function (a, b) { return a[0] - b[0]; });
    for (i = 0; i < lampL.length; i++) { var li = lampL[i], a = arr[i]; if (a) { li.position.set(a[1].x, (a[1].y || 0) + (a[1].k === 'lamp' && a[1].vy != null ? a[1].vy : 0) + 1.0, a[1].z); li.intensity = 1.15; } else li.intensity = 0; }
  }
  function setTableOn(e, id) {
    e.on = id; if (e.mesh) { scene.remove(e.mesh); e.mesh = null; }
    if (!id) return;
    var m, baseY = (e.vy != null ? e.vy : 0) + 0.95;
    if (id === 'cutting_board') {
      m = new THREE.Group();
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.42), new THREE.MeshStandardMaterial({ color: 0xc89b5c, roughness: 0.72, metalness: 0.04 }));
      b.position.y = 0.025; b.castShadow = true; b.receiveShadow = true; m.add(b);
      var kn = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0xd0d6de, roughness: 0.28, metalness: 0.85 }));
      kn.position.set(0.05, 0.06, 0.1); kn.rotation.y = 0.5; kn.castShadow = true; m.add(kn);
      var hdl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.048), new THREE.MeshStandardMaterial({ color: 0x3b2614, roughness: 0.75, metalness: 0.05 }));
      hdl.position.set(-0.07, 0.06, 0.17); hdl.rotation.y = 0.5; m.add(hdl);
      m.position.set(e.x, baseY, e.z);
    } else {
      m = ITEMS[id] ? vmModel(ITEMS[id], 'one', true) : new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.28), new THREE.MeshStandardMaterial({ color: 0x9b7a4b, roughness: 0.7, metalness: 0.08 }));
      m.position.set(e.x, baseY, e.z);
    }
    scene.add(m); e.mesh = m;
  }
  function tableTick() {
    var cut = W.cuttables; cut.length = 0;
    for (var i = 0; i < W.tables.length; i++) { var e = W.tables[i]; if (!e.alive) { if (e.on) { give(e.on, 1); e.on = null; } if (e.mesh) { scene.remove(e.mesh); e.mesh = null; } continue; } if (e.on === 'cutting_board') cut.push(e); }
  }
  function tableUse(e) {
    if (e.on) {
      if (e.on === 'cutting_board' && !keys.ShiftLeft) { SFX.play('click'); openInv(); return; }
      give(e.on, 1); say('You picked up the ' + ITEMS[e.on].name + '.'); setTableOn(e, null); SFX.play('click'); return;
    }
    var id = hot[sel]; if (!id || id === 'fists') { SFX.play('click'); openInv(); say('Furniture Table crafting. Hold an item and press [E] to put it on the table instead.'); return; }
    if (!ITEMS[id] || ITEMS[id].type === 'block' || count(id) < 1) { say('Hold an item in your hand, then press [E] to put it on the table. Put a Cutting Board here to cut food.', true); return; }
    take(id, 1); setTableOn(e, id); SFX.play('click'); say(id === 'cutting_board' ? 'Cutting Board placed. Press [E] on the table to cut food. Shift+[E] takes it back.' : ITEMS[id].name + ' placed on the table.');
  }
  function sitOn(e) {
    if (!e.clean && e.clean !== undefined && false) return;
    rest = { k: 'sit', clean: !!e.comfy, en: e.seat }; P.vx = P.vz = 0; P.x = e.x; P.z = e.z; say(e.comfy ? 'Relaxing: Energy +8 every 0.5 s and Comfort recovers. Move or jump to stand up.' : 'Sitting: Energy +5 per second. Move or jump to stand up.');
  }
  function useStatue() {
    var HZ = 'wz_hz', last = 0; try { last = +localStorage.getItem(HZ) || 0; } catch (e) { }
    var left = last + 2 * 3600 * 1000 - Date.now(); if (left > 0) { say('The statue is cooling down: ' + Math.ceil(left / 60000) + ' min left (2 h real time).', true); return; }
    if (mp.role === 'client') { say('Only the room host can use the statue.', true); return; }
    if (bossAlive('hardzombie')) { say('The Hard Zombie is already out there!', true); return; }
    if (coins < 100) { say('The statue demands 100 Coins.', true); return; }
    coins -= 100; try { localStorage.setItem(HZ, String(Date.now())); } catch (e) { }
    var a = rnd() * 6.28; placeZombie('hardzombie', W.statue.x + Math.cos(a) * 5, W.statue.z + Math.sin(a) * 5); ann('The statue cracks... HARD ZOMBIE has been summoned!'); SFX.play('boom');
  }

  /* ================= Vehicles (complete cars only; abandoned wrecks cannot be driven) ================= */
  var seat = null, dashOpen = false, driveEl = null, dashEl = null, crankHold = false, pumpE = null, pumpBox = null, pumpJob = null, pumpAmt = 1;
  /* per-vehicle statistics. ratios[0]=Reverse, ratios[1]=Neutral (0 = no movement), then the forward gears. Higher ratio = stronger acceleration but lower top speed. auto = automatic gearbox ('Matic'): the shift lever has R / N / D only. */
  var VCFG = {
    suv: { name: 'Scout II SUV', hp: 150, def: 2, ratios: [-2.2, 0, 2.5, 1.3, 0.7], top: 25, maxRpm: 7100, safe: 3800, hot: 4750, accK: 2.6, tank: 15, fuelT: 'gasoline', engine: 'AMC i4 Engine', gearbox: 'AMC 3-Speed Gearbox' },
    truck: { name: 'GMC Brigadier', hp: 350, def: 7, ratios: [-3.0, 0, 4.2, 2.6, 1.7, 1.15, 0.8], top: 20, maxRpm: 3600, safe: 2400, hot: 3000, accK: 1.15, tank: 60, fuelT: 'diesel', engine: 'Detroit Diesel V6 Truck Engine', gearbox: 'Detroit 5-Speed Diesel' },
    sedan: { name: 'Mercedes 230CE', hp: 175, def: 2, ratios: [-2.8, 0, 3.0], auto: [3.0, 1.9, 1.25, 0.85], top: 31, maxRpm: 6500, safe: 4200, hot: 5200, accK: 2.1, tank: 20, fuelT: 'gasoline', engine: 'M102 i4 Mercedes Engine', gearbox: 'Mercedes 4-Speed Matic Gasoline' },
    mustang: { name: 'Ford Mustang GT', hp: 225, def: 3, ratios: [-2.6, 0, 3.2, 2.0, 1.35, 0.9], top: 42, maxRpm: 6800, safe: 4600, hot: 5600, accK: 3.0, tank: 18, fuelT: 'gasoline', engine: 'Ford FE 428 V8', gearbox: 'Ford FE 4-Speed Turbo Gas', loud: true }
  };
  function vcfg(c) { return VCFG[c.kind] || VCFG.suv; }
  function gearNames(cf) { var n = ['R', 'N']; if (cf.auto) n.push('D'); else for (var i = 2; i < cf.ratios.length; i++) n.push(String(i - 1)); return n; }
  function topRatio(cf) { return cf.auto ? cf.auto[cf.auto.length - 1] : cf.ratios[cf.ratios.length - 1]; }
  function rpmK(cf) { return cf.maxRpm / (cf.top * topRatio(cf)); }
  function curRatio(c) { var cf = vcfg(c), v = c.vs; return (cf.auto && v.gear === 2) ? cf.auto[(v.ag || 1) - 1] : cf.ratios[v.gear]; }
  function gearName(c) { var cf = vcfg(c), v = c.vs; return cf.auto && v.gear === 2 ? 'D' + (v.ag || 1) : gearNames(cf)[v.gear]; }
  /* universal stat: parts at 90-100% = 100%, every further 10% of the weakest part age removes 10% of the vehicle stats */
  function condMult(cond) { return Math.max(0.1, 1 - 0.1 * Math.floor((100 - clamp(cond, 0, 100) - 1e-4) / 10)); }
  var VSP = {
    suv: { seat: [0.42, 0.1], ey: -0.3, hit: [[0.9, 2.1], [-0.9, 2.1], [0.9, -2.1], [-0.9, -2.1], [0, 2.2], [0, -2.2]], tank: 15 },
    sedan: { seat: [0.42, -0.1], ey: -0.4, hit: [[0.9, 2.1], [-0.9, 2.1], [0.9, -2.1], [-0.9, -2.1], [0, 2.2], [0, -2.2]], tank: 15 },
    truck: { seat: [0.55, 2.5], ey: 0.75, hit: [[1.3, 3.7], [-1.3, 3.7], [1.3, -3.7], [-1.3, -3.7], [0, 3.8], [0, -3.8], [1.3, 0], [-1.3, 0]], tank: 30 }
  };
  function vsp(c) { var s = c.truck ? VSP.truck : c.suv ? VSP.suv : VSP.sedan; return { seat: s.seat, ey: s.ey, hit: s.hit, tank: vcfg(c).tank }; }
  function carAng(c) { return c.ang != null ? c.ang : (c.horiz ? Math.PI / 2 : 0) + (c.dir < 0 ? Math.PI : 0); }
  function nowT() { return performance.now() / 1000; }
  function carUse(e) {
    if (!e.own) { say(e.burnt ? 'A burnt wreck. A Smasher Machine (coming soon) can clear it away.' : 'An abandoned wreck cannot be driven. Break the trunk open with Left Click, or build a complete vehicle at a Vehicle Bench.', true); return; }
    if (mp.role === 'client') { say('Vehicles are only available for the host / solo play for now.', true); return; }
    if (e.burnt) { say('This vehicle is a burnt wreck now.', true); return; }
    var v = e.vs;
    if (!v.door) { v.door = true; SFX.play('click'); say('Door opened. Press [E] again to sit in the driver seat.'); return; }
    seatIn(e);
  }
  function seatIn(c) {
    if (seat) return; seat = c; c.vs.seated = true; c.vs.door = true; manning = null; P.vx = P.vz = P.vy = 0; keys = {}; lmb = false;
    var a = carAng(c); P.yaw = a + Math.PI; seatPose(c);
    if (!driveEl) { driveEl = document.createElement('div'); driveEl.style.cssText = 'position:fixed;right:18px;bottom:96px;z-index:30;background:rgba(10,12,16,.72);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 14px;font:600 15px system-ui,sans-serif;text-align:right;pointer-events:none'; document.body.appendChild(driveEl); }
    driveEl.style.display = 'block'; SFX.play('click');
    say('You sit in the driver seat. [E] close the door, then [U] open the dashboard to start the engine. [X] leave the seat (door must be open).');
  }
  function seatPose(c) {
    var a = carAng(c), sn = Math.sin(a), cs = Math.cos(a), sp = vsp(c);
    P.x = c.x + cs * sp.seat[0] + sn * sp.seat[1]; P.z = c.z - sn * sp.seat[0] + cs * sp.seat[1]; P.y = (c.y || 0) + sp.ey; P.vx = P.vz = P.vy = 0; P.onGround = true;
  }
  function seatOut(why) {
    if (!seat) return; var c = seat, v = c.vs;
    if (!why && !v.door) { say('Open the door first: press [E].', true); return; }
    if (dashOpen) closeDash();
    var k = ((Math.round(carAng(c) / (Math.PI / 2)) % 4) + 4) % 4; v.v = 0; v.seated = false;
    c.ang = undefined; c.horiz = k === 1 || k === 3; c.dir = (k === 0 || k === 1) ? 1 : -1;
    var sp = OSPECG[c.kind] || OSPECG.suv; c.lx = c.horiz ? sp[1] : sp[0]; c.lz = c.horiz ? sp[0] : sp[1];
    var ry = (c.horiz ? Math.PI / 2 : 0) + (c.dir < 0 ? Math.PI : 0), sn = Math.sin(ry), cs = Math.cos(ry), side = (c.truck ? 2.5 : 2.1);
    P.x = c.x + cs * side; P.z = c.z - sn * side; P.y = (c.y || 0) + 0.1; P.vx = P.vz = P.vy = 0;
    if (W.relocCar) W.relocCar(c); W.setCar(c, true); seat = null; if (driveEl) driveEl.style.display = 'none'; SFX.play('click'); if (why) say(why, true);
  }
  var OSPECG = { suv: [4.4, 1.9], sedan: [4.4, 1.9], truck: [7.6, 2.7] };
  function closeDoorOut(c) { if (c.vs && c.vs.door && !seat) { c.vs.door = false; SFX.play('click'); say('Door closed.'); } else if (c.vs && !c.vs.door) { c.vs.door = true; SFX.play('click'); say('Door opened.'); } }
  /* key presses while sitting: [U] dashboard, [X] leave, [R] gear up, [F] gear down */
  function carKey(code) {
    var c = seat; if (!c) return false; var v = c.vs, cf = vcfg(c);
    if (code === 'KeyU') { openDash(); return true; }
    if (code === 'KeyX') { seatOut(); return true; }
    if (code === 'Space') { v.hb = !v.hb; if (v.hb) v.v = 0; SFX.play('click'); say(v.hb ? 'Handbrake ON: the vehicle is locked in place. Press [Space] again to release.' : 'Handbrake released.'); return true; }
    if (code === 'KeyR' || code === 'KeyF') {
      var n = gearNames(cf).length, ng = clamp(v.gear + (code === 'KeyR' ? 1 : -1), 0, n - 1);
      if (ng === v.gear) { say(code === 'KeyR' ? 'Already in the highest gear.' : 'Already in Reverse.', true); return true; }
      var old = v.gear; v.gear = ng; var ratio = cf.auto && ng === 2 ? cf.auto[0] : cf.ratios[ng], k = rpmK(cf), rpmAfter = Math.abs(v.v) * Math.abs(ratio) * k;
      if (cf.auto && ng === 2) v.ag = 1;
      SFX.play('click');
      if (v.eng && ratio !== 0 && (rpmAfter > cf.maxRpm * 1.15 || (ratio < 0 && v.v > 3) || (ratio > 0 && old === 0 && v.v < -3))) { v.blown = true; v.eng = false; v.key = false; v.rpm = 0; c.hp = Math.max(1, c.hp - Math.round(c.max * 0.1)); SFX.play('hit'); say('WRONG GEAR at ' + Math.round(Math.abs(v.v) * 3.6) + ' km/h! The engine over-revved and is destroyed!', true); return true; }
      if (v.eng && ratio !== 0 && rpmAfter > cf.maxRpm) { v.heat = Math.min(1, v.heat + 0.5); SFX.play('hit'); say('Dangerous downshift! The engine is over-revving!', true); return true; }
      say('Gear: ' + gearName(c) + (ng === 0 ? ' (W = backwards)' : ng === 1 ? ' (neutral, no movement)' : '')); return true;
    }
    return false;
  }
  /* Dashboard panel [U]: gauges + the key slot (click = insert key, press & HOLD = starter, click when running = switch off) */
  function openDash() {
    if (!seat) return; dashOpen = true; mode = 'dash'; keys = {}; lmb = false; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (er) {} }
    if (!dashEl) {
      dashEl = document.createElement('div'); dashEl.id = 'dash';
      dashEl.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:60;background:rgba(14,16,20,.94);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:16px 20px;font:600 14px system-ui,sans-serif;min-width:340px;user-select:none';
      dashEl.innerHTML = '<div style="font-size:16px;margin-bottom:8px">🚗 Dashboard <span style="float:right;opacity:.6;font-weight:500">[U] close</span></div><div id="dgs"></div><div style="display:flex;align-items:center;gap:14px;margin-top:12px"><div id="dkey" style="width:74px;height:74px;border-radius:50%;border:4px solid #666;background:radial-gradient(circle,#222 30%,#111);display:flex;align-items:center;justify-content:center;font-size:30px;cursor:pointer">🔑</div><div id="dtxt" style="font-weight:500;font-size:13px;opacity:.9;max-width:230px"></div></div>';
      document.body.appendChild(dashEl);
      var dk = dashEl.querySelector('#dkey');
      dk.addEventListener('mousedown', function (e) { e.preventDefault(); if (!seat) return; var v = seat.vs; if (v.eng) { v.eng = false; v.key = false; v.rpm = 0; SFX.play('click'); say('Engine off.'); } else if (!v.key) { v.key = true; SFX.play('click'); say('Key inserted. Now press and HOLD the key to crank the starter.'); } else crankHold = true; });
      document.addEventListener('mouseup', function () { crankHold = false; });
      dk.addEventListener('touchstart', function (e) { e.preventDefault(); dk.dispatchEvent(new MouseEvent('mousedown')); }, { passive: false }); dk.addEventListener('touchend', function () { crankHold = false; });
      document.addEventListener('keydown', function (e) { if (dashOpen && (e.code === 'KeyU' || e.code === 'Escape')) { e.preventDefault(); e.stopPropagation(); closeDash(); } }, true);
    }
    dashEl.style.display = 'block'; if (driveEl) driveEl.style.display = 'none'; dashUpdate();
  }
  function closeDash() { dashOpen = false; crankHold = false; if (dashEl) dashEl.style.display = 'none'; if (driveEl && seat) driveEl.style.display = 'block'; if (mode === 'dash') enterGame(); }
  function bar(f, col) { return '<div style="height:9px;background:#2a2d33;border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(clamp(f, 0, 1) * 100) + '%;background:' + col + '"></i></div>'; }
  function dashUpdate() {
    if (!dashEl || !seat) return; var c = seat, v = c.vs, sp = vcfg(c), kmh = Math.round(Math.abs(v.v) * 3.6);
    var g = $('#dgs'); if (g) g.innerHTML = '<div style="display:flex;justify-content:space-between"><span>RPM ' + Math.round(v.rpm) + '</span><span>' + kmh + ' km/h</span><span>Gear ' + gearName(c) + (v.hb ? ' · HANDBRAKE' : '') + '</span></div>' + bar(v.rpm / sp.maxRpm, v.rpm > sp.hot ? '#e5533d' : v.rpm > sp.safe ? '#e5b83d' : '#4cc36b')
      + '<div style="display:flex;justify-content:space-between;margin-top:6px"><span>Fuel ' + v.fuel.toFixed(1) + ' / ' + sp.tank + ' L (' + (v.fuelT === 'diesel' ? 'Diesel' : 'Gasoline') + ')</span><span>ODO ' + (v.odo / 1000).toFixed(2) + ' km</span></div>' + bar(v.fuel / sp.tank, '#3d8fe5')
      + '<div style="margin-top:6px">Heat</div>' + bar(v.heat, v.heat > 0.7 ? '#e5533d' : '#e5a23d');
    var kb = $('#dkey'), tx = $('#dtxt'); var cfn = $('#dgs'); if (cfn) cfn.innerHTML += '<div style="opacity:.7;margin-top:6px;font-size:12px">' + sp.name + ' · ' + sp.engine + ' · ' + sp.gearbox + ' · Stats ' + Math.round(condMult(v.cond == null ? 100 : v.cond) * 100) + '%</div>'; if (kb) { kb.style.borderColor = v.eng ? '#4cc36b' : v.key ? '#e5b83d' : '#666'; kb.style.transform = crankHold && v.key && !v.eng ? 'rotate(' + (Math.sin(performance.now() / 40) * 6 + 25) + 'deg)' : v.key ? 'rotate(0deg)' : ''; kb.style.opacity = v.key ? 1 : 0.55; }
    if (tx) tx.textContent = v.blown ? 'The engine is destroyed. It needs a new ' + sp.engine + '.' : v.eng ? 'Engine running. Click the key to switch the engine off.' : v.key ? (crankHold ? 'Cranking… keep holding until the engine catches (' + Math.round(v.crank * 100) + '%).' : 'Key inserted. Press and HOLD the key to start the engine.') : 'Click the key slot to insert the key.';
  }
  function i2g(v, cf) { return v.gear - 1; }
  function carFail(c, msg) { c.vs.eng = false; c.vs.rpm = 0; say(msg, true); SFX.play('hit'); }
  /* one physics / engine step for every complete vehicle */
  function vehTick(dt) {
    var list = W.ocars || [], i, j;
    for (i = 0; i < list.length; i++) {
      var c = list[i], v = c.vs; if (!v || !c.alive) continue; var chg = false;
      var da = v.door ? 1 : 0; if (Math.abs(v.doorA - da) > 0.001) { v.doorA += clamp(da - v.doorA, -4 * dt, 4 * dt); chg = true; }
      var cf = vcfg(c), sp = vsp(c), me = c === seat && mode === 'play', thr = me && keys.KeyW && !v.hb ? 1 : 0, brk = me && keys.KeyS ? 1 : 0, ratio = curRatio(c), RK = rpmK(cf), top = ratio ? cf.top * Math.abs(topRatio(cf)) / Math.abs(ratio) : cf.top, dir = ratio < 0 ? -1 : 1;
      if (c.burnt) { v.eng = false; v.key = false; }
      if (cf.auto && v.eng && v.gear === 2 && c === seat) { var rw0 = Math.abs(v.v) * cf.auto[(v.ag || 1) - 1] * RK; if (rw0 > cf.maxRpm * 0.8 && (v.ag || 1) < cf.auto.length) v.ag = (v.ag || 1) + 1; else if (rw0 < cf.maxRpm * 0.32 && (v.ag || 1) > 1) v.ag = (v.ag || 1) - 1; ratio = cf.auto[(v.ag || 1) - 1]; top = cf.top * topRatio(cf) / ratio; }
      /* starter */
      if (c === seat && crankHold && v.key && !v.eng) {
        if (v.blown) { crankHold = false; say('The engine is destroyed. It needs a new ' + cf.engine + '.', true); }
        else { v.crank += dt / 1.5; v.rpm = v.crank * 850 * (0.9 + 0.2 * Math.random());
          if (v.crank >= 1) { crankHold = false; v.crank = 0; if (v.heat > 0.8) { v.rpm = 0; say('The engine is too hot to start. Let it cool down.', true); } else if (v.fuel <= 0.01) { v.rpm = 0; say('The engine cranks but there is no fuel. Fill the tank at a Fuel Pump Station.', true); } else { v.eng = true; v.rpm = 850; SFX.play('craft'); say('Engine started! The vehicle is still in ' + gearName(c) + '. Shift with [R]/[F], then hold [W].' + (cf.loud ? ' The roaring V8 attracts zombies!' : '')); } } }
      } else if (!v.eng && v.crank > 0) { v.crank = Math.max(0, v.crank - dt * 2); v.rpm = v.crank * 850; } else if (!v.eng) v.rpm = Math.max(0, v.rpm - 2000 * dt);
      if (v.eng) {
        var rpmW = Math.abs(v.v) * Math.abs(ratio) * RK;
        var want = ratio === 0 ? 850 + thr * (cf.hot - 850) : Math.max(850, rpmW) + (thr && rpmW < 850 ? 400 : 0);
        v.rpm += (want - v.rpm) * Math.min(1, dt * (ratio === 0 ? 3 : 8)); v.rpm = Math.min(v.rpm, cf.maxRpm);
        if (v.rpm > cf.hot) v.heat += dt * (v.rpm - cf.hot) / (cf.maxRpm - cf.hot) * 0.5; else v.heat -= dt * 0.08; v.heat = clamp(v.heat, 0, 1);
        if (v.heat >= 1) carFail(c, 'The engine overheated and shut down! Let it cool before restarting.');
        var burn = (thr ? 0.03 + 0.1 * (v.rpm - 850) / (cf.maxRpm - 850) : 0.012) * (cf.tank / 15 > 2 ? 1.6 : 1); v.fuel -= burn * dt; if (v.fuel <= 0) { v.fuel = 0; carFail(c, 'Out of fuel!'); }
        if (me && ratio && !cf.auto) {
          var needS = i2g(v, cf) >= 3 ? 2.2 : i2g(v, cf) === 2 ? 1.1 : 0;
          if (thr && Math.abs(v.v) < needS) { v.stall += dt; if (v.stall > 0.6) { v.stall = 0; carFail(c, 'The engine stalled! Start in 1st gear.'); } } else v.stall = 0;
        }
        if (cf.loud && !c.noiseT) c.noiseT = 0; if (cf.loud) { c.noiseT -= dt; if (c.noiseT <= 0) { c.noiseT = 2; for (j = 0; j < zombies.length; j++) { var zz = zombies[j]; if (zz && Math.hypot(zz.x - c.x, zz.z - c.z) < 160) zz.rush = true; } } }
      } else v.heat = Math.max(0, v.heat - dt * 0.05);
      if (c !== seat) { if (v.v) { v.v = 0; } continue; }
      if (v.hb) v.v = 0;
      if (!me) { v.v *= Math.max(0, 1 - 2.5 * dt); if (Math.abs(v.v) < 0.05) v.v = 0; }
      else {
        var run = v.eng && ratio !== 0 && !v.hb, aGear = cf.accK * Math.abs(ratio);
        if (run && thr) { var along = v.v * dir; if (along > top) v.v -= dir * 8 * dt, v.heat = Math.min(1, v.heat + dt * 0.2); else v.v += dir * aGear * (along < 0 ? 1 : (1 - along / top)) * dt; }
        else if (run) { var eb = (1.2 + Math.abs(ratio) * 0.5) * dt; v.v = Math.abs(v.v) <= eb ? 0 : v.v - Math.sign(v.v) * eb; }
        else { var rr = 0.7 * dt; v.v = Math.abs(v.v) <= rr ? 0 : v.v - Math.sign(v.v) * rr; }
        if (brk) { var bb = 18 * dt; v.v = Math.abs(v.v) <= bb ? 0 : v.v - Math.sign(v.v) * bb; }
      }
      var tgt = me ? (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0) : 0; v.st += (tgt - v.st) * Math.min(1, 5 * dt);
      var ang = carAng(c), dA = v.st * (c.truck ? 1.1 : 1.6) * clamp(v.v / 5, -1, 1) * dt;
      if (c.ang == null && (Math.abs(v.v) > 0.05)) { c.ang = ang; c.box.on = false; }
      if (c.ang != null) { ang += dA; c.ang = ang; P.yaw += dA; }
      var sn = Math.sin(ang), cs = Math.cos(ang), y0 = c.y || 0, nx = c.x + sn * v.v * dt, nz = c.z + cs * v.v * dt, blocked = false, p, qx, qz;
      if (Math.abs(v.v) > 0.05) {
        for (j = 0; j < sp.hit.length && !blocked; j++) { p = sp.hit[j]; qx = nx + cs * p[0] + sn * p[1]; qz = nz - sn * p[0] + cs * p[1]; var gq = W.gh ? W.gh(qx, qz) : 0; if (gq - y0 > 0.95 || Math.abs(qx) > W.half - 2 || Math.abs(qz) > W.half - 2 || W.hit(qx - 0.25, qx + 0.25, y0 + 0.6, y0 + 1.3, qz - 0.25, qz + 0.25)) blocked = true; if (!blocked && W.waterAt) { var wa = W.waterAt(qx, qz); if (wa === 'sea' || wa === 'lake') blocked = true; } }
      }
      if (blocked) {
        var imp = Math.abs(v.v); if (imp > 7 && v.bump <= 0) { v.bump = 0.6; c.hp -= Math.max(1, Math.round(imp * 0.9 - cf.def * 1.5)); SFX.play('block'); say('Crash! Break Points ' + Math.max(0, Math.round(c.hp)) + '/' + c.max, true); if (c.hp <= 0) { burnCar(c); seatOut('The vehicle is burnt out after the crash!'); continue; } }
        v.v = -v.v * 0.25; if (Math.abs(v.v) < 0.6) v.v = 0;
      } else { c.x = nx; c.z = nz; v.odo += Math.abs(v.v) * dt; }
      v.bump -= dt; if (W.gh) { var gh = W.gh(c.x, c.z); c.y = (c.y || 0) + (gh - (c.y || 0)) * Math.min(1, 8 * dt); }
      if (Math.abs(v.v) > 4) for (j = 0; j < zombies.length; j++) { var z = zombies[j]; if (!z || z.dead || z.hp <= 0 || (z.runT > 0 && z.runT > nowT())) continue; var rx = z.x - c.x, rz = z.z - c.z, fl = rx * sn + rz * cs, sd = rx * cs - rz * sn; if (Math.abs(fl) < (c.truck ? 3.8 : 2.4) && Math.abs(sd) < (c.truck ? 1.6 : 1.2) && Math.abs((z.y || 0) - (c.y || 0)) < 2.5) { z.runT = nowT() + 0.6; hitZombie(z, Math.round(Math.abs(v.v) * 2.5), 'car'); } }
      chg = chg || Math.abs(v.v) > 0.01;
      if (chg) W.setCar(c, true);
    }
    if (seat) { seatPose(seat); if (driveEl) { var s2 = seat.vs; driveEl.innerHTML = Math.round(Math.abs(s2.v) * 3.6) + ' km/h · Gear ' + gearName(seat) + (s2.hb ? ' · HANDBRAKE' : '') + ' · ' + Math.round(s2.rpm) + ' rpm' + (s2.eng ? '' : ' · ENGINE OFF') + '<br><span style="font-weight:500;font-size:12px;opacity:.8">W gas · S brake · A/D steer<br>R gear up · F gear down · Space handbrake · U dashboard · E door · X leave</span>'; } if (dashOpen) dashUpdate(); }
  }
  function burnCar(c) { c.hp = 0; c.burnt = true; if (c.vs) { c.vs.eng = false; c.vs.key = false; c.vs.rpm = 0; } W.setCar(c, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'car', idx: c.idx, hp: 0, alive: true, burnt: true }); }
  /* smoke from burnt wrecks */
  var smokePool = [], smokeT = 0, smokeCars = [], smokeScan = 0;
  function smokeTick(dt) {
    smokeScan -= dt; if (smokeScan <= 0) { smokeScan = 1; smokeCars = []; var L = (W.cars || []).concat(W.ocars || []); for (var i = 0; i < L.length; i++) { var c = L[i]; if (c.burnt && c.alive && Math.hypot(c.x - P.x, c.z - P.z) < 90) smokeCars.push(c); } }
    if (!smokePool.length) { var cv = document.createElement('canvas'); cv.width = cv.height = 64; var g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(70,66,62,.9)'); gr.addColorStop(1, 'rgba(70,66,62,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); var tx = new THREE.CanvasTexture(cv);
      for (var k = 0; k < 48; k++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; sp.userData = { life: 0 }; scene.add(sp); smokePool.push(sp); } }
    smokeT -= dt; if (smokeT <= 0 && smokeCars.length) { smokeT = 0.18 / smokeCars.length; var cc = smokeCars[Math.floor(Math.random() * smokeCars.length)]; for (var q = 0; q < smokePool.length; q++) { var s = smokePool[q]; if (s.userData.life <= 0) { s.userData.life = s.userData.max = 2.8 + Math.random(); s.position.set(cc.x + (Math.random() - 0.5) * 1.2, (cc.y || 0) + 1.5, cc.z + (Math.random() - 0.5) * 1.6); s.visible = true; break; } } }
    for (var m = 0; m < smokePool.length; m++) { var p = smokePool[m], u = p.userData; if (u.life <= 0) continue; u.life -= dt; if (u.life <= 0) { p.visible = false; p.material.opacity = 0; continue; } var f = 1 - u.life / u.max; p.position.y += dt * 1.3; p.position.x += dt * 0.25; p.scale.set(0.8 + f * 2.6, 0.8 + f * 2.6, 1); p.material.opacity = 0.55 * (1 - f); }
  }
  /* ---- Fluid tanks ---- */
  function tankUse(e) {
    var k = e.tk, hid = hot[sel], it = hid ? ITEMS[hid] : null, m;
    if (it && (m = /^(ib|wb)_(\w+)$/.exec(hid)) && WZ.LIQ[m[2]]) {
      var liq = m[2];
      if (k.allow.indexOf(liq) < 0) { say(k.name + ' cannot hold ' + WZ.LIQ[liq][0] + '.', true); return; }
      if (e.tkLiq && e.tkLiq !== liq && e.tkL > 0) { say('The tank already holds ' + WZ.LIQ[e.tkLiq][0] + '. Liquids cannot be mixed.', true); return; }
      if (e.tkL + 1 > k.cap + 1e-6) { say('The tank is full (' + k.cap + ' L).', true); return; }
      take(hid, 1); give(it.ret || (m[1] === 'ib' ? 'iron_bucket' : 'wooden_bucket'), 1); e.tkLiq = liq; e.tkL += 1; SFX.play('wash'); say('Poured 1 L of ' + WZ.LIQ[liq][0] + ' into the tank (' + e.tkL + '/' + k.cap + ' L).'); renderHotbar(); return;
    }
    if (hid === 'iron_bucket' || hid === 'wooden_bucket') {
      if (!e.tkL || !e.tkLiq) { say('The tank is empty.', true); return; }
      var pre = hid === 'iron_bucket' ? 'ib_' : 'wb_'; if (pre === 'wb_' && !(WZ.WOOD_WATER && WZ.WOOD_WATER[e.tkLiq])) { say('A Wooden Bucket cannot carry ' + WZ.LIQ[e.tkLiq][0] + '.', true); return; }
      take(hid, 1); give(pre + e.tkLiq, 1); e.tkL -= 1; var nm = WZ.LIQ[e.tkLiq][0]; if (e.tkL <= 1e-6) { e.tkL = 0; e.tkLiq = null; } SFX.play('wash'); say('Took 1 L of ' + nm + ' from the tank (' + e.tkL + '/' + k.cap + ' L).'); renderHotbar(); return;
    }
    say(k.name + ': ' + (e.tkL ? e.tkL + '/' + k.cap + ' L ' + WZ.LIQ[e.tkLiq][0] : 'empty (0/' + k.cap + ' L)') + '. Hold a filled bucket and press [E] to pour it in, or an empty bucket to take 1 L out.');
  }
  /* ---- Fuel Pump Station ---- */
  function nearOwned(x, z, r) { var b = null, bd = r; (W.ocars || []).forEach(function (c) { if (c.burnt) return; var d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; b = c; } }); return b; }
  function pumpUse(e) {
    pumpE = e; mode = 'dash'; keys = {}; lmb = false; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (er) {} }
    if (!pumpBox) { pumpBox = document.createElement('div'); pumpBox.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;background:rgba(14,16,20,.96);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:18px 22px;font:600 14px system-ui,sans-serif;min-width:320px;user-select:none'; document.body.appendChild(pumpBox);
      pumpBox.addEventListener('click', function (ev) { var t = ev.target.closest('[data-pa]'); if (!t) return; var a = t.dataset.pa; if (a === 'x') { closePump(); return; } if (a === 'fill') { startFill(); return; } pumpAmt = clamp(Math.round((pumpAmt + parseFloat(a)) * 10) / 10, 0.5, 30); renderPump(); }); }
    pumpBox.style.display = 'block'; renderPump();
  }
  function closePump() { if (pumpBox) pumpBox.style.display = 'none'; pumpE = null; if (mode === 'dash') enterGame(); }
  function renderPump() {
    if (!pumpE || !pumpBox) return; var e = pumpE, c = nearOwned(e.x, e.z, 9), sp = c ? vsp(c) : null, fn = e.fuel === 'diesel' ? 'Diesel' : 'Gasoline', room = c ? Math.max(0, sp.tank - c.vs.fuel) : 0, mx = c ? Math.min(e.L, room) : e.L;
    pumpAmt = Math.min(pumpAmt, Math.max(0.5, Math.round(mx * 10) / 10)); var bt = 'style="background:#2c3038;color:#fff;border:1px solid #555;border-radius:8px;padding:6px 12px;font:600 14px system-ui;cursor:pointer;margin:0 3px"';
    pumpBox.innerHTML = '<div style="font-size:17px;margin-bottom:6px">⛽ Fuel Pump Station</div><div>Fuel: <b>' + fn + '</b> &middot; Stock: <b>' + e.L.toFixed(1) + ' L</b></div>'
      + '<div style="margin:6px 0;opacity:.85">' + (c ? 'Vehicle: ' + vcfg(c).name + ' &middot; tank ' + c.vs.fuel.toFixed(1) + ' / ' + sp.tank + ' L (' + (c.vs.fuelT === 'diesel' ? 'Diesel' : 'Gasoline') + ')' + (c.vs.eng ? ' <span style="color:#e5533d">ENGINE ON – switch it off first</span>' : '') : '<span style="color:#e5b83d">No vehicle close enough. Park it next to the pump.</span>') + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:center;margin:10px 0"><span data-pa="-1" ' + bt + '>-1</span><span data-pa="-0.5" ' + bt + '>-0.5</span><b style="font-size:22px;min-width:90px;text-align:center">' + pumpAmt.toFixed(1) + ' L</b><span data-pa="0.5" ' + bt + '>+0.5</span><span data-pa="1" ' + bt + '>+1</span></div>'
      + '<div style="display:flex;gap:10px;justify-content:center"><span data-pa="fill" ' + bt.replace('#2c3038', '#2f7d46') + '>⛽ Fill</span><span data-pa="x" ' + bt + '>Close</span></div>';
  }
  function startFill() {
    var e = pumpE; if (!e) return; var c = nearOwned(e.x, e.z, 9);
    if (!c) { say('No vehicle close enough to the pump.', true); return; }
    if (c.vs.eng) { say('Switch the engine off before refuelling!', true); return; }
    if (c.vs.fuelT !== e.fuel) { say('This vehicle runs on ' + (c.vs.fuelT === 'diesel' ? 'Diesel' : 'Gasoline') + ', but this pump has ' + (e.fuel === 'diesel' ? 'Diesel' : 'Gasoline') + '.', true); return; }
    var amt = Math.min(pumpAmt, e.L, vsp(c).tank - c.vs.fuel); if (amt <= 0.01) { say(e.L <= 0.01 ? 'The pump is empty.' : 'The tank is already full.', true); return; }
    pumpJob = { e: e, c: c, left: amt, total: amt }; closePump(); say('Filling ' + amt.toFixed(1) + ' L…'); SFX.play('click');
  }
  function pumpTick(dt) {
    var j = pumpJob; if (!j) return;
    if (Math.hypot(P.x - j.e.x, P.z - j.e.z) > 14 || j.c.vs.eng) { say('Refuelling stopped (' + (j.total - j.left).toFixed(1) + ' L added).', true); pumpJob = null; return; }
    var d = Math.min(j.left, 0.5 * dt, j.e.L, vsp(j.c).tank - j.c.vs.fuel); j.left -= d; j.e.L -= d; j.c.vs.fuel += d; setBar('Filling ' + (j.total - j.left).toFixed(1) + ' / ' + j.total.toFixed(1) + ' L', (j.total - j.left) / j.total);
    if (j.left <= 0.001 || d <= 0.0001) { say('Refuelling done: +' + (j.total - j.left).toFixed(1) + ' L (tank ' + j.c.vs.fuel.toFixed(1) + ' L). Pump stock ' + j.e.L.toFixed(1) + ' L.'); SFX.play('craft'); pumpJob = null; var eb = $('#eat'); if (eb && eatT <= 0) eb.style.display = 'none'; }
  }
  /* placing a complete vehicle item with Right Click */
  function placeVehicle(id, it) {
    var h = aim(8); if (!h || (h.kind !== 'ground' && h.kind !== 'static' && h.kind !== 'vox')) { say('Aim at flat ground to place the vehicle.', true); return; }
    camera.getWorldDirection(DIR); var ang = Math.atan2(DIR.x, DIR.z), px = P.x + DIR.x * 6, pz = P.z + DIR.z * 6, k = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
    if (!W.ownedCarFree(px, pz, k, it.veh)) { say('Not enough free space here for the vehicle (needs a flat area about 2 x 5 blocks).', true); return; }
    if (mp.role === 'client') { say('Vehicles are only available for the host / solo play for now.', true); return; }
    take(id, 1); var cf = VCFG[it.veh] || VCFG.suv, c = W.addOwnedCar(it.veh, px, pz, k, it.vcol || 0x4f6b52); c.max = c.hp = cf.hp; c.vs.fuelT = cf.fuelT; SFX.play('craft'); say('Vehicle placed. Open the door with [E] and sit in. The tank is empty: fill it at a Fuel Pump Station!'); renderHotbar();
  }
  function vehSave() { return (W.ocars || []).map(function (c) { var v = c.vs; return [c.kind, Math.round(c.x * 100) / 100, Math.round(c.z * 100) / 100, ((Math.round(carAng(c) / (Math.PI / 2)) % 4) + 4) % 4, c.col, Math.round(c.hp), c.burnt ? 1 : 0, Math.round(v.fuel * 100) / 100, v.fuelT, Math.round(v.odo), v.gear, v.blown ? 1 : 0]; }); }
  function vehLoad(a) { (a || []).forEach(function (r) { var c = W.addOwnedCar(r[0], r[1], r[2], r[3] * Math.PI / 2, r[4], r[5]); var cf2 = VCFG[r[0]] || VCFG.suv; c.max = cf2.hp; c.burnt = !!r[6]; c.vs.fuel = r[7] || 0; c.vs.fuelT = r[8] || 'gasoline'; c.vs.odo = r[9] || 0; c.vs.blown = !!r[11]; if (c.burnt) W.setCar(c, true); }); }
  function interact() {
    if (seat) { var vv = seat.vs; vv.door = !vv.door; SFX.play('click'); say(vv.door ? 'Door opened. [X] leave the seat.' : 'Door closed. Press [U] for the dashboard.'); return; }
    var cpx = nearCorpse(2.6); if (cpx) { lootCorpse(cpx); return; }
    if (W.statue && !ugOn && Math.hypot(P.x - W.statue.x, P.z - W.statue.z) < 3.6) { useStatue(); return; }
    var ht0 = aim(3.6); if (ht0 && ht0.kind === 'ent' && ht0.e.k === 'tank') { tankUse(ht0.e); return; }
    var bid0 = hot[sel]; if (bid0 === 'wooden_bucket' && count(bid0) > 0) { var wsc = scoopTarget(); if (wsc && WZ.WOOD_WATER[wsc]) { take(bid0, 1); give('wb_' + wsc, 1); say('Filled the Wooden Bucket with ' + WZ.LIQ[wsc][0] + '.'); SFX.play('click'); return; } if (wsc) { say('A Wooden Bucket can only hold water.', true); return; } }
    var bid = hot[sel]; if ((bid === 'iron_bucket' || bid === 'titanium_bucket') && count(bid) > 0) { var sc = scoopTarget(); if (sc) { if (sc === 'lava' && bid === 'iron_bucket') { say('An Iron Bucket would melt! Only a Titanium Bucket can carry Lava.', true); return; } take(bid, 1); give('ib_' + sc, 1); say('Filled the bucket with ' + WZ.LIQ[sc][0] + '.'); SFX.play('click'); return; } }
    var h = aim(3.6); if (!h || h.kind !== 'ent') return; var e = h.e;
    if (e.k === 'farm') { farmUse(e); return; }
    if (e.k === 'car') { carUse(e); return; }
    if (e.k === 'pump') { pumpUse(e); return; }
    if (e.k === 'tank') { tankUse(e); return; }
    if (e.k === 'pile' || e.k === 'crate') { SFX.play('loot'); if (mp.role === 'client') { if (e.searched) { say('Already searched.'); return; } Net.send({ t: 'search', k: e.k, idx: e.idx }); } else applySearchEnt(e, 'self'); }
    else if (e.k === 'bed') { rest = { k: 'sleep', clean: !!e.clean }; P.vx = P.vz = 0; $('#dark').style.opacity = 0.75; say(e.clean ? 'Sleeping in a clean bed: time passes 3x faster. Comfort & Energy recover.' : 'Sleeping in a shabby bed: time passes 2x faster. Energy recovers, but Comfort does not.'); }
    else if (e.k === 'sofa') sitOn(e);
    else if (e.k === 'couch') { if (!e.clean) say('The couch is dirty. It does not restore Comfort.', true); else { rest = { k: 'sit', clean: true }; P.vx = P.vz = 0; say('Sitting on a clean couch. Comfort is recovering.'); } }
    else if (e.k === 'gstation' && e.stk === 'cpot') { if (mp.role === 'client') { say('The Cooking Pot is not available for guests yet.', true); return; } openPot(e); }
    else if (e.k === 'furnace' || e.k === 'campfire' || e.k === 'anvil' || e.k === 'computer' || e.k === 'sawmill' || e.k === 'tbench' || e.k === 'milling' || e.k === 'bomb' || e.k === 'kiln' || e.k === 'craft' || e.k === 'work' || e.k === 'press' || e.k === 'casing' || e.k === 'trapb' || e.k === 'mason' || e.k === 'blast' || e.k === 'liquiders' || e.k === 'sewing' || e.k === 'gstation') { SFX.play('click'); openInv(); }
    else if (e.k === 'godstatue') { openGod(e); }
    else if (e.k === 'table') tableUse(e);
    else if (e.k === 'seat') sitOn(e);
    else if (e.k === 'chest') openChest(e);
    else if (e.k === 'turret') { if (e.vt === 15) toggleManning(e); else loadTurret(e); }
    else if (e.k === 'sink') {
      var hid = hot[sel];
      var wr = hid && WZ.RECIPES.filter(function (q) { return q.st === 'sink' && q.cost[hid]; })[0];
      if (wr && count(hid) > 0) {
        var outId = wr.out[0];
        take(hid, 1); give(outId, 1); SFX.play('wash'); say('Washed clean into +1 ' + ITEMS[outId].name + '!');
      } else { SFX.play('click'); openInv(); }
    }
  }

  /* ---------------- Corpse ---------------- */
  function addCorpse(x, z, loot, mine, name, id) {
    var g = new THREE.Group();
    var cloth = vmMat(mine ? 0x365578 : 0x6b2f2f, { roughness: 0.85, metalness: 0.04 });
    var pant = vmMat(0x282d37, { roughness: 0.85, metalness: 0.04 });
    var boot = vmMat(0x1a1917, { roughness: 0.65, metalness: 0.12 });
    var pack = vmMat(0x4c4334, { roughness: 0.88, metalness: 0.05 });
    var skin = vmMat(0xd9b38c, { roughness: 0.78, metalness: 0.02 });
    function bx(w, h, d, m, px, py, pz) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); }
    bx(0.5, 0.22, 0.68, cloth, 0, 0.13, 0);
    bx(0.36, 0.14, 0.42, pack, 0, 0.27, 0.05);
    bx(0.3, 0.28, 0.3, skin, 0, 0.16, -0.5);
    bx(0.14, 0.14, 0.52, cloth, -0.34, 0.11, 0.06);
    bx(0.14, 0.14, 0.52, cloth, 0.34, 0.11, 0.06);
    bx(0.2, 0.18, 0.56, pant, -0.13, 0.11, 0.6);
    bx(0.2, 0.18, 0.56, pant, 0.13, 0.11, 0.6);
    bx(0.21, 0.18, 0.16, boot, -0.13, 0.11, 0.94);
    bx(0.21, 0.18, 0.16, boot, 0.13, 0.11, 0.94);
    var gy = (x <= W.half + 50 && W.gh) ? W.gh(x, z) : 0, isBag = name === 'Dropped Items' || name === 'Turret Scraps';
    if (isBag) { while (g.children.length) g.remove(g.children[0]); }
    g.position.set(x, gy, z); g.rotation.y = rnd() * 6; scene.add(g);
    var c = { id: id || ('c' + Math.random().toString(36).slice(2, 8)), x: x, z: z, g: g, mine: mine, loot: loot, name: name || 'Survivor' };
    corpses.push(c); if (isBag) bagVisual(c); return c;
  }
  /* Intentionally dropped items lie on the ground as the real items (up to 4 kinds), never as a corpse */
  function bagVisual(c) {
    var g = c.g; while (g.children.length) g.remove(g.children[0]);
    var ids = Object.keys((c.loot && c.loot.inv) || {}).filter(function (id) { return c.loot.inv[id] > 0 && ITEMS[id]; }).slice(0, 4), n = ids.length;
    ids.forEach(function (id, i) { var it = ITEMS[id], m = vmModel(it, 'one', true), a = n > 1 ? i / n * 6.283 : 0, r = n > 1 ? 0.28 : 0, tool = !!it.tool || it.wtype || /bow|staff/.test(id), big = it.type === 'block';
      m.scale.multiplyScalar(big ? 0.55 : 0.8); if (tool) { m.rotation.z = Math.PI / 2; m.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r); m.rotation.y = a; } else m.position.set(Math.cos(a) * r, 0.0, Math.sin(a) * r); g.add(m); });
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  }
  function addCorpseDummy() {}
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

  function hurt(n, elem) {
    if (creative && CM.god) return;
    if (dead || unl.imm > 0) return;
    var ast0 = armorStats(), def = elem ? 0 : ast0.def * (creative ? CM.buff : 1), dmg = n - def; if (creative) dmg = dmg / CM.def; if (elem === 'frost') dmg = Math.round(n * (1 - ast0.frostRes)); else if (elem === 'fire') dmg = Math.round(n * (1 - ast0.fireRes));
    if (dmg <= 0) dmg = 1; if (status.gold > 0) dmg = Math.max(1, Math.round(dmg * 0.9));
    P.hp -= dmg; if (P.hp <= 0 && unl.armed) { P.hp = 1; unl.armed = false; unl.imm = 1; say('UNLETHAL! You are immortal for 1 second.', true); }
    P.comfort = Math.max(0, P.comfort - 3); if (rest) endRest(); if (fish) { endFish(); say('Fishing canceled.', true); }
    var v = $('#vig'); v.style.opacity = 1; setTimeout(function () { v.style.opacity = 0; }, 180); SFX.play('hurt');
    if (P.hp <= 0) die();
  }
  function applyWaterPoison() { if (rnd() < armorStats().wpResist) { status.wpoison = 15; say('You got Water Poison!', true); } }
  function infectKeys(sec) { status.keylock = sec; keys = {}; lmb = false; queue.length = 0; say('Keybind Error Virus! All keys are disabled (only Pause works).', true); SFX.play('hurt'); }
  function die() {
    if (dead) return; dead = true; unl.armed = false; mode = 'dead'; setBodyState('dead'); keys = {}; lmb = false; eatT = 0; endFish(); $('#eat').style.display = 'none'; $('#dark').style.opacity = 0;
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var loot = { inv: JSON.parse(JSON.stringify(inv)), eq: ['head', 'chest', 'legs', 'boots'].map(function (k) { return equip[k]; }).filter(Boolean), ac: acc.filter(Boolean) };
    if (Object.keys(loot.inv).length || loot.eq.length || loot.ac.length) {
      var cp = addCorpse(P.x, P.z, loot, true, playerName);
      if (mp.role !== 'solo') Net.send({ t: 'corpse', id: cp.id, x: r2(P.x), z: r2(P.z), n: playerName });
    }
    screen('<div class="card card-wide"><div class="land-grid">' +
      '<div class="land-col brand-panel"><div><span class="tag">Fallen Survivor</span><h1 style="margin-top:8px">You Were Overwhelmed</h1>' +
      '<p style="margin-top:10px">Nothing is lost: all your carried gear remains safely in your <b>corpse</b> at the location where you fell. Return and press <b>[E]</b> to recover everything.</p></div>' +
      '<div class="box-sub"><div style="font-size:.86rem;color:var(--muted)">Time Survived: <b>' + fmtTime(T) + '</b> &middot; Zombies Eliminated: <b>' + kills + '</b> &middot; Coins: <b>' + coins + '</b></div></div></div>' +
      '<div class="land-col" style="justify-content:center">' +
        '<button class="btn primary full" id="bResp">Respawn at Safe Zone</button>' +
        '<button class="btn full" id="bDeadMenu">Return to Main Menu</button>' +
        '<a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a>' +
      '</div></div></div>');
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
    tempTick(dt); var tst = tempState(); P.hunger = Math.max(0, P.hunger - 0.12 * hm * (tst < 0 ? 1.1 : 1) * dt); P.thirst = Math.max(0, P.thirst - 0.17 * hm * (tst > 0 ? 1.1 : 1) * dt);
    P.comfort = Math.max(0, P.comfort - 0.05 * ast.comfortDrain * dt); P.energy = Math.max(0, P.energy - 0.07 * dt);
    if (rest && rest.en) { P.energy = Math.min(100, P.energy + rest.en * dt); if (rest.clean) P.comfort = Math.min(100, P.comfort + 2.5 * dt); } else if (rest) { if (rest.clean) P.comfort = Math.min(100, P.comfort + (sl ? 4 : 2.5) * dt); P.energy = Math.min(100, P.energy + (sl ? 6 : 1.5) * dt); }
    else if (Math.hypot(P.vx, P.vz) < 0.2) P.energy = Math.min(100, P.energy + 0.3 * dt);
    if (status.gold > 0) { status.gold -= dt; P.hp = Math.min(ast.hpMax, P.hp + 1 * dt); }
    if (status.poison > 0) { status.poison -= dt; P.hp -= 1.2 * dt; } if (status.stomach > 0) status.stomach -= dt;
    if (status.wpoison > 0) { status.wpoison -= dt; P.hp -= 2.4 * dt; } if (status.keylock > 0) status.keylock -= dt;
    if (status.corr > 0) { status.corr -= dt; P.hp -= 5 * dt; }
    if (status.acid > 0) { status.acid -= dt; P.hp -= Math.pow(3, Math.max(0, status.acidN - 1)) * dt; if (status.acid <= 0) status.acidN = 0; }
    if (P.hunger <= 0) P.hp -= 0.8 * dt; if (P.thirst <= 0) P.hp -= 0.8 * dt;
    if (creative && CM.god) { P.hp = armorStats().hpMax; P.hunger = P.thirst = P.energy = 100; status.poison = status.wpoison = status.stomach = status.corr = status.acid = 0; }
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
  /* Guns: clip per gun type, [R] to reload (animated), hold Left Click to fire at the weapon delay */
  function ammoHud() { var el = document.getElementById('ammoHud'), it = hot[sel] ? ITEMS[hot[sel]] : null; if (!el) { el = document.createElement('div'); el.id = 'ammoHud'; el.style.display = 'none'; document.body.appendChild(el); }
    if (it && it.tool === 'gun' && mode === 'play') { el.style.display = 'block'; el.textContent = (gunClip[hot[sel]] || 0) + ' / ' + it.clip + '  ·  ' + count(it.ammo) + ' in bag' + (gunRel > 0 ? '  (reloading...)' : ''); } else el.style.display = 'none'; }
  function reloadGun() { var id = hot[sel], it = id ? ITEMS[id] : null; if (!it || it.tool !== 'gun' || gunRel > 0) return; var have = gunClip[id] || 0, need = it.clip - have;
    if (need <= 0) { say('Clip is full.'); return; } if (count(it.ammo) < 1) { say('No ' + ITEMS[it.ammo].name + 's in your bag!', true); return; }
    gunRel = gunRelMax = it.reload; gunPend = id; SFX.play('click'); lmb = false; }
  function shootGun(it) {
    var id = hot[sel]; if (gunRel > 0) return; if ((gunClip[id] || 0) < 1) { if (count(it.ammo) < 1) { say('No ' + ITEMS[it.ammo].name + 's! Craft more at the Gun Bench.', true); swingCd = 0.4; } else reloadGun(); swingCd = Math.max(swingCd, 0.3); return; }
    gunClip[id]--; swingCd = it.dly; mp.swingPulse = 0.25; gunKick = 1; SFX.play('hit'); camera.getWorldDirection(DIR); var h = aim(it.rng); addTracer(h ? h.t : it.rng);
    if (h && h.kind === 'zombie') { SFX.play('hit'); if (mp.role === 'client') { h.z.flash = 0.14; Net.send({ t: 'hitZ', id: h.z.id, dmg: it.dmg }); } else hitZombie(h.z, it.dmg, 'self'); }
    else if (h && h.cx != null && h.kind !== 'zombie') { /* bullets do not break blocks */ }
    if ((gunClip[id] || 0) < 1 && count(it.ammo) > 0) say('Clip empty - press [R] to reload.');
  }
  function gunTick(dt) { if (gunKick > 0) gunKick = Math.max(0, gunKick - dt * 6); if (gunRel > 0) { gunRel -= dt; if (gunRel <= 0) { gunRel = 0; var it = ITEMS[gunPend]; if (it && hot[sel] === gunPend) { var need = it.clip - (gunClip[gunPend] || 0), got = Math.min(need, count(it.ammo)); if (got > 0) { take(it.ammo, got); gunClip[gunPend] = (gunClip[gunPend] || 0) + got; SFX.play('click'); say('Reloaded ' + got + '.'); } } gunPend = null; } else if (hot[sel] !== gunPend) { gunRel = 0; gunPend = null; } } ammoHud(); }
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
    for (var tr = 0; tr < 30; tr++) { var lo = W.ugL[ugLayer(pl.x)].open, c = lo[(rnd() * lo.length) | 0], d = Math.hypot(c[0] - pl.x, c[1] - pl.z); if (d > 20 && d < 75) { zombies.push(makeZombie('miner', c[0], c[1])); return; } }
  }
  /* Loot cars: every car has 10-25 Break Points; breaking it opens the trunk. Loot tier is random 2..world tier (max 5); world tier 1 gives crate tier 1. */
  function applyCarHit(e, bd, pid) {
    if (!e.alive || e.burnt || e.own) return; e.hp -= Math.max(1, Math.round(bd / 2));
    if (e.hp <= 0) {
      var wt = worldTier(clockInfo(T).day), tier = wt < 2 ? 1 : 2 + ((rnd() * (Math.min(5, wt) - 1)) | 0), key = e.wreck ? 'wreck' : e.truck ? (wt >= 3 ? 'truck3' : wt >= 2 ? 'truck' : 'crate1') : 'crate' + tier, lname = e.wreck ? 'Shipwreck Chest' : e.truck ? (wt < 2 ? 'Wooden Crate (Tier 1)' : 'Iron Crate (Tier ' + Math.min(5, wt) + ')') : WZ.LOOT[key].name, rolls = (WZ.LOOT[key].rolls || 3) * (e.truck ? 2 + (rnd() < 0.5 ? 0 : 1) : 1), got = {};
      for (var i = 0; i < rolls; i++) { var id = WZ.rollLoot(key, rnd); got[id] = (got[id] || 0) + 1; }
      if (pid === 'self') say((e.truck ? 'Truck opened! (' : 'Trunk opened! (') + lname + ')'); else if (mp.role === 'host') Net.send({ t: 'say', to: pid, msg: (e.truck ? 'Truck opened! (' : 'Trunk opened! (') + lname + ')' });
      Object.keys(got).forEach(function (id) {
        if (pid === 'self') { give(id, got[id]); say('+' + got[id] + ' ' + ITEMS[id].name); }
        else if (mp.role === 'host') Net.send({ t: 'give', to: pid, id: id, n: got[id], msg: '+' + got[id] + ' ' + ITEMS[id].name });
      });
      e.burnt = true; e.hp = 0; W.setCar(e, true); SFX.play('hit'); say('The car is burnt out: a rusty, smoking wreck now.', true);
    }
    if (mp.role === 'host') Net.send({ t: 'ent', k: 'car', idx: e.idx, hp: Math.round(e.hp), alive: e.alive, burnt: !!e.burnt });
  }
  /* ---- Liquids: scooping with an Iron Bucket, pool hazards ---- */
  function aimPool(maxD) {
    camera.getWorldDirection(DIR); var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    for (var t = 0.4; t <= maxD; t += 0.2) { var x = ox + DIR.x * t, y = oy + DIR.y * t, z = oz + DIR.z * t; for (var i = 0; i < W.pools.length; i++) { var p = W.pools[i]; if (Math.abs(x - p.x) < p.r + 0.3 && Math.abs(z - p.z) < p.r + 0.3 && Math.hypot(x - p.x, z - p.z) < p.r + 0.3 && y <= p.y + 0.4) return p.type; } }
    return null;
  }
  function scoopTarget() { var pt = aimPool(5); if (pt) return pt; var w = aimWater(5); if (!w) return null; return w.type === 'sea' ? 'contaminated' : w.type === 'river' ? 'slightly' : 'dirty'; }
  var poolMsgT = 0, floatT = 3;
  function poolTick(dt) {
    if (dead || !W.pools) return; poolMsgT -= dt;
    for (var i = 0; i < W.pools.length; i++) { var p = W.pools[i]; if (Math.abs(P.x - p.x) > p.r + 1 || Math.abs(P.z - p.z) > p.r + 1) continue; if (Math.hypot(P.x - p.x, P.z - p.z) > p.r || P.y > p.y + 1.2) continue;
      if (p.type === 'lava') { P.hp -= 30 * dt; if (poolMsgT <= 0) { poolMsgT = 1; say('LAVA! Get out!', true); SFX.play('hurt'); } }
      else if (p.type === 'acid') { if (status.corr < 19) { say('Acid! Corrosive: 1 HP every 0.2 s for 20 s.', true); } status.corr = 20; }
      else { var f = Math.max(0, 1 - (p.type === 'honey' ? 6 : 4) * dt); P.vx *= f; P.vz *= f; if (poolMsgT <= 0) { poolMsgT = 4; say(p.type === 'honey' ? 'Sticky honey slows you down.' : 'Crude oil slows you down.'); } } }
  }
  /* ---- Creative mode (testing): two passwords, god mode, fly (G), item picker (B) ---- */
  function sha256(s) {
    function R(n, x) { return (x >>> n) | (x << (32 - n)); } var K = [], i, j, p = [2], c = 3; while (p.length < 64) { var pr = true; for (j = 0; j < p.length; j++) if (c % p[j] === 0) { pr = false; break; } if (pr) p.push(c); c++; }
    for (i = 0; i < 64; i++) K.push(Math.floor((Math.pow(p[i], 1 / 3) % 1) * 4294967296) | 0); var H = []; for (i = 0; i < 8; i++) H.push(Math.floor((Math.pow(p[i], 0.5) % 1) * 4294967296) | 0);
    var b = unescape(encodeURIComponent(s)), L = b.length, w = []; for (i = 0; i < L; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8); w[L >> 2] |= 0x80 << (24 - (L % 4) * 8); w[(((L + 8) >> 6) << 4) + 15] = L * 8;
    for (var o = 0; o < w.length; o += 16) { var v = H.slice(), W2 = []; for (i = 0; i < 64; i++) { if (i < 16) W2[i] = w[o + i] | 0; else { var s0 = R(7, W2[i - 15]) ^ R(18, W2[i - 15]) ^ (W2[i - 15] >>> 3), s1 = R(17, W2[i - 2]) ^ R(19, W2[i - 2]) ^ (W2[i - 2] >>> 10); W2[i] = (W2[i - 16] + s0 + W2[i - 7] + s1) | 0; }
      var S1 = R(6, v[4]) ^ R(11, v[4]) ^ R(25, v[4]), ch = (v[4] & v[5]) ^ (~v[4] & v[6]), t1 = (v[7] + S1 + ch + K[i] + W2[i]) | 0, S0 = R(2, v[0]) ^ R(13, v[0]) ^ R(22, v[0]), mj = (v[0] & v[1]) ^ (v[0] & v[2]) ^ (v[1] & v[2]), t2 = (S0 + mj) | 0; v = [(t1 + t2) | 0, v[0], v[1], v[2], (v[3] + t1) | 0, v[4], v[5], v[6]]; }
      for (i = 0; i < 8; i++) H[i] = (H[i] + v[i]) | 0; }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  window.WZ.sha256 = sha256;
  var creative = false, fly = false;
  function creativeToggle() {
    if (creative) { creative = false; fly = false; $('#bCreative').textContent = 'Creative Mode (test)'; say('Creative mode OFF.'); return; }
    var cf = (window.WZ_CONFIG || {}).creative || {}; var a = prompt('Creative mode - password 1:'); if (a == null) return; var b = prompt('Creative mode - password 2:'); if (b == null) return;
    if (sha256(a) === cf.h1 && sha256(b) === cf.h2) { creative = true; $('#bCreative').textContent = 'Creative Mode: ON (click to turn off)'; alert('Creative mode ON.\nIn game: [G] fly (Space up / C down), [B] item picker. You cannot be hurt and need no food.'); }
    else alert('Wrong password.');
  }
  var CM = { speed: 1, dmg: 1, def: 1, buff: 1, god: true }, crTab = 'items';
  function crSpawnPt(d) { camera.getWorldDirection(DIR); return { x: P.x + DIR.x * d, z: P.z + DIR.z * d, ang: Math.atan2(DIR.x, DIR.z) }; }
  function crOpen() {
    var pn = $('#crPanel'); if (!pn) { pn = document.createElement('div'); pn.id = 'crPanel'; pn.style.cssText = 'position:fixed;inset:5% 7%;background:#14161af2;border:1px solid #e3b02a;border-radius:14px;z-index:60;padding:14px;overflow:auto;color:#eee'; document.body.appendChild(pn); }
    var tip = $('#crTip'); if (!tip) { tip = document.createElement('div'); tip.id = 'crTip'; document.body.appendChild(tip); }
    mode = 'cr'; keys = {}; lmb = false; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    pn.style.display = 'block';
    function nf(k, lab) { return '<label style="display:flex;justify-content:space-between;gap:10px;margin:6px 0">' + lab + '<input type="number" data-cm="' + k + '" value="' + CM[k] + '" min="0.1" max="20" step="0.1" style="width:80px;background:#262a32;color:#eee;border:1px solid #444;border-radius:6px;padding:4px"></label>'; }
    function draw() {
      var h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="color:#e3b02a">Creative</b><button class="tab' + (crTab === 'items' ? ' on' : '') + '" data-ct="items">Items</button><button class="tab' + (crTab === 'tools' ? ' on' : '') + '" data-ct="tools">Tools</button>' + (crTab === 'items' ? '<input id="crQ" placeholder="search item..." style="margin:0 8px;padding:6px 10px;border-radius:8px;background:#262a32;color:#eee;border:1px solid #444">' : '') + '<button id="crX" class="btn">Close [B]</button></div>';
      if (crTab === 'items') h += '<div id="crL" class="crgrid" style="margin-top:10px"></div>';
      else {
        var zs = Object.keys(ZDEF).map(function (k) { return '<option value="' + k + '">' + esc(ZDEF[k].name || k) + '</option>'; }).join(''), ls = Object.keys(WZ.LOOT).map(function (k) { return '<option value="' + k + '">' + esc(WZ.LOOT[k].name || k) + ' (' + k + ')</option>'; }).join(''), sel = 'background:#262a32;color:#eee;border:1px solid #444;border-radius:6px;padding:4px';
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:12px">' +
          '<div class="box"><h2>Multipliers</h2>' + nf('speed', 'Speed multiplier') + nf('dmg', 'Damage multiplier') + nf('def', 'Defense multiplier') + nf('buff', 'Buff multiplier (armor / accessory)') + '<label style="display:flex;gap:8px;margin-top:8px"><input type="checkbox" id="cmGod"' + (CM.god ? ' checked' : '') + '> Invincible (when off, Defense multiplier reduces damage)</label></div>' +
          '<div class="box"><h2>Spawn / Summon</h2><select id="spZ" style="' + sel + ';width:100%">' + zs + '</select><div style="display:flex;gap:8px;margin-top:8px"><input id="spN" type="number" value="1" min="1" max="30" style="width:70px;' + sel + '"><button class="btn primary" id="spGo">Summon in front of me</button></div><button class="btn" id="spKill" style="margin-top:8px">Remove all zombies</button></div>' +
          '<div class="box"><h2>Loot spawn</h2><select id="lpK" style="' + sel + ';width:100%">' + ls + '</select><div style="display:flex;gap:8px;margin-top:8px"><input id="lpN" type="number" value="3" min="1" max="50" style="width:70px;' + sel + '"><button class="btn primary" id="lpGo">Roll loot into bag</button></div><h2 style="margin-top:12px">Vehicles</h2><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-sv="suv">Scout II</button><button class="btn" data-sv="truck">GMC Brigadier</button><button class="btn" data-sv="sedan">Mercedes 230CE</button><button class="btn" data-sv="mustang">Ford Mustang GT</button></div><div style="display:flex;gap:6px;margin-top:8px"><button class="btn" id="spCar">Abandoned car + loot</button><button class="btn" id="spTruck">Abandoned truck + loot</button></div></div></div>';
      }
      pn.innerHTML = h; $('#crX').onclick = crClose;
      [].forEach.call(pn.querySelectorAll('[data-ct]'), function (b) { b.onclick = function () { crTab = b.dataset.ct; draw(); }; });
      if (crTab === 'items') {
        var fill = function () { var q = $('#crQ').value.toLowerCase(), h2 = ''; Object.keys(ITEMS).filter(function (id) { return !q || (ITEMS[id].name + ' ' + id).toLowerCase().indexOf(q) >= 0; }).forEach(function (id) { h2 += '<button class="crs" data-id="' + id + '">' + ITEMS[id].ic + '</button>'; }); $('#crL').innerHTML = h2; };
        fill(); $('#crQ').oninput = fill; $('#crQ').focus();
        var L = $('#crL');
        L.onclick = function (e) { var b = e.target.closest('[data-id]'); if (!b) return; var id = b.dataset.id, n = WZ.maxStack(id) > 1 ? 20 : 1; give(id, n); say('+' + n + ' ' + ITEMS[id].name + ' (creative)'); renderHotbar(); };
        L.onmouseover = function (e) { var b = e.target.closest('[data-id]'); if (!b) return; var it = ITEMS[b.dataset.id]; tip.innerHTML = '<b>' + it.ic + ' ' + esc(it.name) + '</b><br>' + esc(it.desc || ''); tip.style.display = 'block'; };
        L.onmousemove = function (e) { tip.style.left = Math.min(innerWidth - 290, e.clientX + 14) + 'px'; tip.style.top = Math.min(innerHeight - 120, e.clientY + 14) + 'px'; };
        L.onmouseleave = function () { tip.style.display = 'none'; };
      } else {
        [].forEach.call(pn.querySelectorAll('[data-cm]'), function (i) { i.onchange = function () { CM[i.dataset.cm] = clamp(+i.value || 1, 0.1, 20); i.value = CM[i.dataset.cm]; }; });
        $('#cmGod').onchange = function () { CM.god = this.checked; };
        $('#spGo').onclick = function () { var n = clamp(+$('#spN').value || 1, 1, 30), p = crSpawnPt(6); for (var i = 0; i < n; i++) placeZombie($('#spZ').value, p.x + (rnd() - 0.5) * 4, p.z + (rnd() - 0.5) * 4); say('Summoned ' + n + '.'); };
        $('#spKill').onclick = function () { zombies.slice().forEach(function (z) { z.hp = 0; killZombie(z, 'self'); }); say('Zombies removed.'); };
        $('#lpGo').onclick = function () { var k = $('#lpK').value, n = clamp(+$('#lpN').value || 1, 1, 50), got = {}; for (var i = 0; i < n; i++) { var id = WZ.rollLoot(k, rnd); got[id] = (got[id] || 0) + 1; } Object.keys(got).forEach(function (id) { give(id, got[id]); }); say('Loot rolled: ' + Object.keys(got).map(function (id) { return got[id] + '× ' + ITEMS[id].name; }).join(', ')); renderHotbar(); };
        [].forEach.call(pn.querySelectorAll('[data-sv]'), function (b) { b.onclick = function () { var p = crSpawnPt(7), k = b.dataset.sv, cf = VCFG[k] || VCFG.suv, c = W.addOwnedCar(k, p.x, p.z, Math.round(p.ang / (Math.PI / 2)) * (Math.PI / 2), 0x4f6b52); c.max = c.hp = cf.hp; c.vs.fuelT = cf.fuelT; c.vs.fuel = 10; say('Vehicle spawned with 10 L of fuel.'); }; });
        function wreck(truck) { var p = crSpawnPt(8); say('Use the loot roll: ' + (truck ? 'truck' : 'trunk') + ' loot added to the bag.'); var key = truck ? 'truck3' : 'crate1', got = {}; for (var i = 0; i < (WZ.LOOT[key].rolls || 3) * (truck ? 2 : 1); i++) { var id = WZ.rollLoot(key, rnd); got[id] = (got[id] || 0) + 1; } Object.keys(got).forEach(function (id) { give(id, got[id]); }); }
        $('#spCar').onclick = function () { wreck(false); }; $('#spTruck').onclick = function () { wreck(true); };
      }
    }
    draw();
  }
  function crClose() { var pn = $('#crPanel'); if (pn) pn.style.display = 'none'; var tp = $('#crTip'); if (tp) tp.style.display = 'none'; enterGame(); }
  /* ---- Farming: tilled farmland, wet soil, crops that grow in real time ---- */
  var hoeBar = null, hoeSnd = 0;
  function farmGroup(e) {
    if (!e.fmG) { e.fmG = new THREE.Group(); e.fmG.position.set(e.vx, e.vy + 1, e.vz); scene.add(e.fmG); var ov = new THREE.Mesh(new THREE.PlaneGeometry(e.fn, e.fn), new THREE.MeshLambertMaterial({ color: 0x5a3d20 })); ov.rotation.x = -Math.PI / 2; ov.position.set(e.fn / 2, 0.03, e.fn / 2); e.fmG.add(ov); e.fmOv = ov; }
    return e.fmG;
  }
  function plantVis(e, c) {
    var cr = WZ.CROPS[c.seed], gp = new THREE.Group(), i = c.cell % e.fn, j = Math.floor(c.cell / e.fn); gp.position.set(i + 0.5, 0, j + 0.5);
    var gm = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    if (cr.vis === 'stalk') { for (var k = 0; k < 5; k++) { var s = new THREE.Mesh(BOX, gm); s.userData.s = 1; s.position.set((k % 3 - 1) * 0.22, 0, (k < 3 ? -0.18 : 0.2)); gp.add(s); } }
    else { var v = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0x3f8f3a })); v.scale.set(0.5, 0.12, 0.5); v.position.y = 0.06; gp.add(v); var ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x6a9a4a })); ball.userData.ball = 1; gp.add(ball); }
    farmGroup(e).add(gp); c.m = gp; c.gm = gm; c.col = new THREE.Color(cr.col); c.pm = null; farmVis(c);
  }
  function farmVis(c) {
    if (!c.m) return; var cr = WZ.CROPS[c.seed], p = Math.min(1, c.g / cr.time), gcol = new THREE.Color(0x4caf50).lerp(c.col, p * p);
    c.m.children.forEach(function (o, idx) {
      if (o.userData.s) { o.material = c.gm; c.gm.color.copy(gcol); var h = 0.15 + 0.8 * p; o.scale.set(0.07, h, 0.07); o.position.y = h / 2; }
      else if (o.userData.ball) { var r = 0.06 + 0.22 * p; o.scale.set(r, r, r); o.position.set(0.22, r, 0.1); o.material.color.copy(new THREE.Color(0x6a9a4a).lerp(c.col, p)); }
    });
    if (c.pest && !c.pm) { c.pm = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0x111111 })); c.pm.scale.set(0.18, 0.1, 0.26); c.pm.position.set(0.1, 0.7, 0); c.m.add(c.pm); }
    if (!c.pest && c.pm) { c.m.remove(c.pm); c.pm = null; }
  }
  function farmDrop(e) { if (e.fmG && e.fmG.parent) e.fmG.parent.remove(e.fmG); e.fmG = null; }
  function farmTick(dt) {
    if (!W.farms) return;
    for (var i = W.farms.length - 1; i >= 0; i--) {
      var e = W.farms[i]; if (!e.alive) { farmDrop(e); W.farms.splice(i, 1); continue; }
      var f = e.fm, shallow = e.farm[3]; farmGroup(e); if (f.wet > 0) f.wet -= dt; var wet = shallow || f.wet > 0;
      e.fmOv.visible = f.tilled && !shallow; e.fmOv.material.color.setHex(wet ? 0x2c1d0e : 0x5a3d20);
      f.crops.forEach(function (c) {
        if (!c.m) plantVis(e, c); var cr = WZ.CROPS[c.seed];
        if (c.g < cr.time) { if (cr.water && !c.pest) { c.pt -= dt; if (c.pt <= 0) { c.pt = 20 + rnd() * 25; if (rnd() < 0.4) { c.pest = true; if (Math.hypot(P.x - e.x, P.z - e.z) < 30) say('Pests are eating the rice! Press [E] on the farm to remove them.', true); } } }
          if (!c.pest && wet) c.g += dt; }
        farmVis(c);
      });
    }
  }
  function farmStatus(e) { var f = e.fm, t = ''; if (!e.farm[3]) t += (f.tilled ? 'Tilled' : 'Needs a Hoe') + ' · ' + (f.wet > 0 ? 'Wet ' + Math.ceil(f.wet) + 's' : 'Dry'); else t += 'Shallow water'; if (f.crops.length) { var c = f.crops[0], cr = WZ.CROPS[c.seed], p = Math.min(100, Math.floor(c.g / cr.time * 100)); t += ' · ' + f.crops.length + ' crop(s): ' + (p >= 100 ? 'READY [E] harvest' : p + '%' + (c.pest ? ' (PESTS! [E])' : !(e.farm[3] || f.wet > 0) ? ' (paused: dry)' : '')); } return t; }
  function farmUse(e) {
    var id = hot[sel], f = e.fm, it = id && ITEMS[id], wb = WZ.WATER_BUCKETS.filter(function (b) { return b[0] === id; })[0];
    if (wb && count(id) > 0) { if (e.farm[3]) { say('Shallow water farmland is always wet.'); return; } if (!f.tilled) { say('Till the soil with a Hoe first.', true); return; } take(id, 1); give(wb[1], 1); f.wet = 120; say('Watered. The soil stays wet for 2 minutes.'); SFX.play('wash'); return; }
    if (id && WZ.CROPS[id] && count(id) > 0) {
      var cr = WZ.CROPS[id]; if (cr.water !== !!e.farm[3]) { say(cr.water ? 'Rice needs Shallow Water Farmland.' : 'Plant this on Farmland, not in water.', true); return; }
      if (!f.tilled) { say('Till the soil with a Hoe first.', true); return; } if (f.crops.length >= e.fn * e.fn) { say('This farmland is full.', true); return; }
      var used = {}; f.crops.forEach(function (c) { used[c.cell] = 1; }); var ci = 0; while (used[ci]) ci++;
      take(id, 1); var nc = { seed: id, cell: ci, g: 0, pt: 15 + rnd() * 20, pest: false }; f.crops.push(nc); plantVis(e, nc); say('Planted ' + it.name + '.'); SFX.play('block'); return;
    }
    var pc = f.crops.filter(function (c) { return c.pest; })[0]; if (pc) { f.crops.forEach(function (c) { c.pest = false; c.pt = 20 + rnd() * 20; farmVis(c); }); say('Removed the pests.'); SFX.play('hit'); return; }
    var ripe = f.crops.filter(function (c) { return c.g >= WZ.CROPS[c.seed].time; });
    if (ripe.length) { var got = {}; ripe.forEach(function (c) { var cr2 = WZ.CROPS[c.seed], n = cr2.y[0] + ((rnd() * (cr2.y[1] - cr2.y[0] + 1)) | 0); got[cr2.crop] = (got[cr2.crop] || 0) + n; if (cr2.y[1] > 1 || rnd() < 0.5) got[c.seed] = (got[c.seed] || 0) + 1; if (c.m && c.m.parent) c.m.parent.remove(c.m); f.crops.splice(f.crops.indexOf(c), 1); }); Object.keys(got).forEach(function (k) { give(k, got[k]); say('+' + got[k] + ' ' + ITEMS[k].name); }); SFX.play('pickup'); return; }
    say(farmStatus(e));
  }
  function hoeTick(dt) {
    var it = curItem(); if (!lmb || it.tool !== 'hoe' || mode !== 'play' || dead) { if (hoeBar) hoeBar.style.display = 'none'; return; }
    var h = aim(3.6); if (!h || h.kind !== 'ent' || h.e.k !== 'farm' || h.e.farm[3] || h.e.fm.tilled) { if (hoeBar) hoeBar.style.display = 'none'; return; }
    var f = h.e.fm; f.hoe += dt * (it.hoeP || 1) / 4; hoeSnd -= dt; if (hoeSnd <= 0) { hoeSnd = 0.45; SFX.play('stone'); vmSwing = 0.22; }
    if (!hoeBar) { hoeBar = document.createElement('div'); hoeBar.style.cssText = 'position:fixed;left:50%;top:58%;transform:translateX(-50%);width:180px;height:12px;border:2px solid #3b2a14;border-radius:8px;background:#1b130acc;z-index:6;overflow:hidden'; hoeBar.innerHTML = '<i style="display:block;height:100%;width:0;background:#c9a23a"></i>'; document.body.appendChild(hoeBar); }
    hoeBar.style.display = 'block'; hoeBar.firstChild.style.width = Math.min(100, f.hoe * 100) + '%';
    if (f.hoe >= 1) { f.tilled = true; hoeBar.style.display = 'none'; say('The soil is tilled! Water it, then plant seeds.'); SFX.play('craft'); }
  }
  function farmSave() { return (W.farms || []).filter(function (e) { return e.fm.tilled && !e.farm[3] || e.fm.crops.length; }).map(function (e) { return [e.vx, e.vy, e.vz, e.fm.tilled ? 1 : 0, Math.round(e.fm.wet), e.fm.crops.map(function (c) { return [c.seed, c.cell, Math.round(c.g)]; })]; }); }
  function farmLoad(list) { if (!Array.isArray(list)) return; list.forEach(function (a) { var e = (W.farms || []).filter(function (f) { return f.vx === a[0] && f.vy === a[1] && f.vz === a[2]; })[0]; if (!e) return; e.fm.tilled = !!a[3] || !!e.farm[3]; e.fm.wet = a[4] || 0; e.fm.crops = (a[5] || []).map(function (c) { return { seed: c[0], cell: c[1], g: c[2] || 0, pt: 20, pest: false }; }); }); }
  /* Underground doors */
  var ugFrom = null, ugMax = 3, boulder = null;
  function ugMove(li, atDown) {
    var L = W.ugL[li], src = atDown ? L.down : null; ugCd = 2; P.x = src ? src.x + 2.2 : L.spawn.x; P.z = src ? src.z : L.spawn.z; P.y = 0; P.vx = P.vz = P.vy = 0; chunkT = 0; say(L.name + (li ? ' - dangerous depths. Watch for cracked floor plates (Boulder Traps)!' : '.'));
  }
  var LAYER_NEED = [0, 4, 6];
  function trapTick(dt) {
    if (!W.traps || !inUG(P.x)) { if (boulder) boulder.m.visible = false; return; }
    var li = ugLayer(P.x);
    if (!boulder) { var bm = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshLambertMaterial({ color: 0x6b645c })); bm.visible = false; scene.add(bm); boulder = { m: bm }; }
    W.traps.forEach(function (t) {
      if (t.layer !== li) return;
      if (t.st === 0 && !dead && Math.hypot(P.x - t.x, P.z - t.z) < 1.1 && P.y < 1) { t.st = 1; t.t = 1; SFX.play('hit'); say('*CRACK* - Boulder Trap! Move away!'); }
      else if (t.st === 1) { t.t -= dt; if (t.t <= 0) { t.st = 2; t.t = 0.5; boulder.m.position.set(t.x, 8, t.z); boulder.m.visible = true; boulder.at = t; } }
      else if (t.st === 2) { t.t -= dt; if (boulder.at === t) boulder.m.position.y = Math.max(1.4, 8 - (0.5 - t.t) * 14); if (t.t <= 0) { if (!dead && Math.hypot(P.x - t.x, P.z - t.z) < 2.1 && P.y < 2) { hurt(70); say('A boulder crushed you! -70 HP'); } boulder.m.visible = false; t.st = 3; t.t = 90; } }
      else if (t.st === 3) { t.t -= dt; if (t.t <= 0) t.st = 0; }
    });
  }
  function enterUG(cave) {
    ugFrom = cave || null; ugMax = cave ? (cave.maxLayer || 3) : (W.mine.maxLayer || 6); ugCd = 2; P.x = W.ug.spawn.x; P.z = W.ug.spawn.z; P.y = 0; P.vx = P.vz = P.vy = 0; ugOn = true; W.setUnderground(true); torchOn = true; chunkT = 0;
    say(cave ? (cave.kind === 'mountain' ? 'Mountain Cave: you went underground.' : 'Hill Cave: you went underground.') + ' Find the glowing yellow marker to return.' : 'You went underground. Find the glowing yellow marker to return to the surface.');
  }
  function exitUG() {
    var ex = ugFrom || W.mine; ugFrom = null; ugCd = 2; P.x = ex.entrance.x; P.z = ex.entrance.z; P.y = ex.y != null ? ex.y : 0; P.vx = P.vz = P.vy = 0; ugOn = false; W.setUnderground(false); applyGfx(); say('Back on the surface.');
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

  /* ---------------- Zombies (PBR articulated rigs + terrain grounding) ---------------- */
  var BOX = new THREE.BoxGeometry(1, 1, 1);
  var EYE = new THREE.MeshStandardMaterial({ color: 0xe62b2b, emissive: 0xaa1111, emissiveIntensity: 0.75, roughness: 0.35 });
  var FLASH_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaa2222, emissiveIntensity: 0.65, roughness: 0.5 });
  var Z_MATS = Object.create(null);
  var MAT_YEL = new THREE.MeshStandardMaterial({ color: 0xe3b02a, roughness: 0.45, metalness: 0.15 });
  var MAT_GLASS = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x1c6699, emissiveIntensity: 0.45, roughness: 0.15, metalness: 0.5 });
  var MAT_ACID = new THREE.MeshStandardMaterial({ color: 0xb6ff00, emissive: 0x66aa00, emissiveIntensity: 0.65, roughness: 0.3 });
  var MAT_STEEL = new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.32, metalness: 0.82 });
  var MAT_BOOT = new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.68, metalness: 0.12 });
  var MAT_BELT = new THREE.MeshStandardMaterial({ color: 0x261e16, roughness: 0.6, metalness: 0.22 });
  var SHADOW_GEO = new THREE.CircleGeometry(0.5, 16);
  var SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  function tint(c, k) { var col = new THREE.Color(c); col.multiplyScalar(1 + k); return col; }
  function getZMats(type) {
    if (Z_MATS[type]) return Z_MATS[type]; var d = ZDEF[type];
    return (Z_MATS[type] = {
      skin: new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.84, metalness: 0.03 }),
      cloth: new THREE.MeshStandardMaterial({ color: tint(d.color, -0.22), roughness: 0.88, metalness: 0.04 }),
      pants: new THREE.MeshStandardMaterial({ color: tint(d.color, -0.45), roughness: 0.88, metalness: 0.04 }),
      tent: (type === 'mutant' || type === 'mutanoider') ? new THREE.MeshStandardMaterial({ color: 0x2a1f3a, roughness: 0.55, metalness: 0.08 }) : null,
      bomb: type === 'bomber' ? new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.42, metalness: 0.65 }) : null,
      helmet: type === 'soldier' ? new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: 0.42, metalness: 0.45 }) : null,
      bombGlow: type === 'bomber' ? new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 0.9, roughness: 0.3 }) : null,
      pack: type === 'bomber' ? new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.82 }) : null
    });
  }
  /* 128px procedural woven clothing textures for humanoid zombies */
  var SHIRT_POOL = null, PANT_POOL = null, CLOTH_TYPES = { jacket: 1, pfwalker: 1, berserk: 1, hardzombie: 1, walker: 1, runner: 1, big: 1, brute: 1, bomber: 1, tough: 1, mutant: 1, programmer: 1, miner: 1 };
  function clothTex(base, pat, dark) {
    var S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; var c = cv.getContext('2d'), col = new THREE.Color(base).multiplyScalar(dark);
    var hex = '#' + col.getHexString(), hx2 = '#' + col.clone().multiplyScalar(0.62).getHexString(), hx3 = '#' + col.clone().multiplyScalar(1.28).getHexString();
    c.fillStyle = hex; c.fillRect(0, 0, S, S);
    if (pat === 1) { c.fillStyle = hx2; for (var i = 0; i < S; i += 24) c.fillRect(0, i, S, 8); }
    else if (pat === 2) { c.fillStyle = hx2; for (var j = 0; j < S; j += 32) { c.fillRect(j, 0, 8, S); c.fillRect(0, j, S, 8); } }
    else if (pat === 3) { c.fillStyle = hx3; for (var a = 0; a < S; a += 24) for (var b = 0; b < S; b += 24) if (((a + b) / 24) % 2 === 0) c.fillRect(a, b, 12, 12); }
    c.fillStyle = 'rgba(0,0,0,0.08)'; for (var y = 0; y < S; y += 4) c.fillRect(0, y, S, 1);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (var x = 0; x < S; x += 4) c.fillRect(x, 0, 1, S);
    for (var n = 0; n < 180; n++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.06)'; c.fillRect(Math.random() * S, Math.random() * S, 3, 3); }
    var t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.anisotropy = Math.min(4, (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) ? renderer.capabilities.getMaxAnisotropy() : 4);
    if ('sRGBEncoding' in THREE) t.encoding = THREE.sRGBEncoding;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.88, metalness: 0.03 });
  }
  function clothPools() {
    if (SHIRT_POOL) return; SHIRT_POOL = []; PANT_POOL = [];
    var sc = [0xb03a3a, 0x3a5fb0, 0xc9c2a8, 0xd2b13a, 0x3f9a58, 0x8a4aa8, 0xd97a2b, 0x2f9aa0, 0xd77aa5, 0x7c7c80, 0x8a5a3a, 0x5a8a3a];
    for (var i = 0; i < sc.length; i++) SHIRT_POOL.push(clothTex(sc[i], i % 4, 0.62));
    var pc = [0x1f2a44, 0x1a1a1c, 0x2d2d33, 0x3a2a1e, 0x2a3320, 0x40303a];
    for (var k = 0; k < pc.length; k++) PANT_POOL.push(clothTex(pc[k], k % 2 ? 0 : 1, 0.5));
  }
  function makeZombie(type, x, z, forcedId) {
    var d = ZDEF[type], m0 = getZMats(type), m = m0, g = new THREE.Group(), sw = [], wide = type === 'big' || type === 'brute' ? 1.25 : type === 'bomber' ? 1.3 : type === 'spider' ? 1.5 : type === 'gigantus' ? 1.5 : type === 'armored' ? 1.3 : 1;
    g.userData.mob = true;
    if (CLOTH_TYPES[type]) { clothPools(); m = Object.create(m0); m.cloth = SHIRT_POOL[(rnd() * SHIRT_POOL.length) | 0]; m.pants = PANT_POOL[(rnd() * PANT_POOL.length) | 0]; }
    function bx(w, h, dd, mat, px, py, pz, p, fl) { var o = new THREE.Mesh(BOX, mat); o.scale.set(w, h, dd); o.position.set(px, py, pz); o.castShadow = true; (p || g).add(o); if (fl) sw.push({ mesh: o, orig: mat }); return o; }
    var spl = null, wings = null, SP = type === 'spider';
    var lL = new THREE.Group(), lR = new THREE.Group(), aL = new THREE.Group(), aR = new THREE.Group();
    if (SP) {
      var sdark = new THREE.MeshStandardMaterial({ color: 0x2c4a20, roughness: 0.72 }), sbody = new THREE.MeshStandardMaterial({ color: 0x3f6a2e, roughness: 0.68 });
      bx(0.6, 0.42, 0.78, sbody, 0, 0.55, 0.5, null, true); bx(0.38, 0.3, 0.4, m.skin, 0, 0.52, -0.08, null, true); bx(0.26, 0.22, 0.22, m.skin, 0, 0.5, -0.36, null, true);
      bx(0.2, 0.04, 0.3, sdark, 0, 0.78, 0.5); [[-0.07, 0.56], [0.07, 0.56], [-0.1, 0.5], [0.1, 0.5], [-0.03, 0.5], [0.03, 0.5]].forEach(function (e) { bx(0.045, 0.045, 0.02, EYE, e[0], e[1], -0.485); });
      bx(0.04, 0.12, 0.04, sdark, -0.06, 0.38, -0.44); bx(0.04, 0.12, 0.04, sdark, 0.06, 0.38, -0.44);
      spl = [];
      for (var side = -1; side <= 1; side += 2) for (var li = 0; li < 4; li++) {
        var pv = new THREE.Group(); pv.position.set(side * 0.18, 0.5, -0.2 + li * 0.17); var base = side * (0.55 - li * 0.38); pv.rotation.y = base; g.add(pv);
        var up = bx(0.5, 0.06, 0.06, sdark, side * 0.25, 0.08, 0, pv); up.rotation.z = side * 0.35;
        var kn = new THREE.Group(); kn.position.set(side * 0.48, 0.18, 0); pv.add(kn); bx(0.06, 0.74, 0.06, sdark, side * 0.04, -0.37, 0, kn).rotation.z = side * 0.12;
        spl.push({ g: pv, base: base, i: li + (side > 0 ? 0 : 4) });
      }
    } else {
      bx(0.52 * wide, 0.68, 0.3 * wide, m.cloth, 0, 1.05, 0, null, true);
      bx(0.54 * wide, 0.07, 0.32 * wide, MAT_BELT, 0, 0.73, 0);
      bx(0.18, 0.09, 0.18, m.skin, 0, 1.4, 0);
      if (type === 'hardzombie') bx(0.46, 0.18, 0.36, m.skin, 0, 1.5, 0, null, true); else bx(0.32, 0.32, 0.32, m.skin, 0, 1.56, 0, null, true);
      var ew = type === 'tough' ? 0.095 : 0.07; bx(ew * 0.6, (type === 'tough' ? 0.07 : 0.05) * 0.6, 0.018, EYE, -0.08, 1.59, -0.165); bx(ew * 0.6, (type === 'tough' ? 0.07 : 0.05) * 0.6, 0.018, EYE, 0.08, 1.59, -0.165);
      bx(0.14, 0.04, 0.02, MAT_BELT, 0, 1.46, -0.162);
      lL.position.set(-0.14 * wide, 0.7, 0); lR.position.set(0.14 * wide, 0.7, 0); aL.position.set(-0.36 * wide, 1.38, 0); aR.position.set(0.36 * wide, 1.38, 0);
      [lL, lR, aL, aR].forEach(function (p) { g.add(p); });
      bx(0.2, 0.56, 0.22, m.pants, 0, -0.28, 0, lL); bx(0.21, 0.15, 0.25, MAT_BOOT, 0, -0.625, -0.02, lL);
      bx(0.2, 0.56, 0.22, m.pants, 0, -0.28, 0, lR); bx(0.21, 0.15, 0.25, MAT_BOOT, 0, -0.625, -0.02, lR);
      bx(0.16, 0.22, 0.16, m.cloth, 0, -0.08, 0, aL, true); bx(0.15, 0.44, 0.15, m.skin, 0, -0.4, 0, aL, true);
      bx(0.16, 0.22, 0.16, m.cloth, 0, -0.08, 0, aR, true); bx(0.15, 0.44, 0.15, m.skin, 0, -0.4, 0, aR, true);
      aL.rotation.x = aR.rotation.x = 1.35;
      if (type === 'jacket') { var jm = new THREE.MeshStandardMaterial({ color: [0x3b4a5a, 0x5a3b2e, 0x2f4a38, 0x4a4a52][(rnd() * 4) | 0], roughness: 0.82 }); bx(0.58, 0.56, 0.34, jm, 0, 1.12, 0, null, true); bx(0.42, 0.08, 0.38, jm, 0, 1.42, 0); bx(0.19, 0.36, 0.19, jm, 0, -0.12, 0, aL, true); bx(0.19, 0.36, 0.19, jm, 0, -0.12, 0, aR, true); }
      if (type === 'pfwalker') { var ICE = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x336699, emissiveIntensity: 0.35, roughness: 0.2 }), ICE2 = new THREE.MeshStandardMaterial({ color: 0x7fb6ff, roughness: 0.25 }); [[0.28, 1.5, 0.02, 0.1, 0.3], [-0.26, 1.46, 0.04, 0.09, 0.26], [0.1, 1.3, 0.18, 0.12, 0.34], [-0.12, 1.1, 0.19, 0.1, 0.28], [0.2, 0.95, 0.17, 0.1, 0.22], [0, 1.72, 0, 0.08, 0.2]].forEach(function (c, ci) { var o = bx(c[3], c[4], c[3], ci % 2 ? ICE : ICE2, c[0], c[1], c[2]); o.rotation.z = (ci - 2.5) * 0.18; o.rotation.x = 0.2; }); }
      if (type === 'berserk') { var brm = new THREE.MeshStandardMaterial({ color: 0xaa1c1c, roughness: 0.7 }); bx(0.35, 0.07, 0.35, brm, 0, 1.66, 0); bx(0.06, 0.1, 0.05, brm, 0.18, 1.62, 0.17); }
      if (type === 'mutanoider') {
        var CLAW = new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.45 }), MEMB = new THREE.MeshStandardMaterial({ color: 0x4a5a3a, side: THREE.DoubleSide, roughness: 0.72 });
        [aL, aR].forEach(function (ar) { for (var cI = -1; cI <= 1; cI++) bx(0.03, 0.22, 0.03, CLAW, cI * 0.05, -0.74, 0.04, ar); });
        wings = []; [-1, 1].forEach(function (sd) { var pv = new THREE.Group(); pv.position.set(sd * 0.2, 1.4, 0.2); g.add(pv); bx(0.9, 0.06, 0.06, m.tent, sd * 0.45, 0.02, 0, pv); bx(0.8, 0.02, 0.7, MEMB, sd * 0.42, -0.3, 0, pv); bx(0.05, 0.05, 0.05, CLAW, sd * 0.9, 0, 0, pv); wings.push({ g: pv, sd: sd }); });
      }
    }
    if (type === 'soldier') {
      bx(0.36, 0.08, 0.2, m.helmet, 0, 1.76, -0.08); bx(0.38, 0.22, 0.17, m.helmet, 0, 1.66, 0.12); bx(0.06, 0.2, 0.3, m.helmet, -0.19, 1.67, 0.02); bx(0.06, 0.2, 0.3, m.helmet, 0.19, 1.67, 0.02);
      bx(0.03, 0.16, 0.03, m.pants, -0.17, 1.47, -0.08); bx(0.03, 0.16, 0.03, m.pants, 0.17, 1.47, -0.08);
    }
    if (type === 'bomber') { [aL, aR].forEach(function (ar) { bx(0.26, 0.26, 0.26, m.bomb, 0, -0.72, 0, ar); bx(0.05, 0.12, 0.05, m.bombGlow, 0, -0.9, 0, ar); }); }
    var tents = null;
    if (type === 'mutanoider') { tents = []; for (var tI = 0; tI < 10; tI++) { var pv2 = new THREE.Group(); pv2.position.set(-0.3 + tI * 0.0667, 1.0 + (tI % 2) * 0.3, 0.2); g.add(pv2); bx(0.08, 0.9, 0.08, m.tent, 0, -0.45, 0, pv2); bx(0.05, 0.4, 0.05, m.tent, 0, -1.05, 0, pv2); tents.push(pv2); } }
    if (type === 'mutant') { tents = []; [[-0.14, 1.35], [0.14, 1.35], [-0.28, 1.1], [0.28, 1.1]].forEach(function (p) { var pv = new THREE.Group(); pv.position.set(p[0], p[1], 0.2); g.add(pv); bx(0.08, 0.85, 0.08, m.tent, 0, -0.42, 0, pv); bx(0.05, 0.3, 0.05, m.tent, 0, -0.95, 0, pv); tents.push(pv); }); }
    if (type === 'miner') { bx(0.38, 0.17, 0.38, MAT_YEL, 0, 1.74, 0); bx(0.1, 0.1, 0.06, EYE, 0, 1.78, -0.2); }
    if (type === 'programmer') bx(0.36, 0.14, 0.05, MAT_GLASS, 0, 1.58, -0.19);
    if (type === 'zfish') { bx(0.2, 0.12, 0.3, MAT_GLASS, 0, 0.6, 0.35); }
    if (type === 'floater') { var rg = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.17, 8, 20), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.45 })); rg.rotation.x = Math.PI / 2; rg.position.set(0, 0.8, 0); g.add(rg); for (var fq = 0; fq < 4; fq++) { var fa = fq * Math.PI / 2; var rs = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xd42a2a, roughness: 0.48 })); rs.position.set(Math.cos(fa) * 0.58, 0.8, Math.sin(fa) * 0.58); g.add(rs); } }
    if (type === 'antlion') {
      g.traverse(function (o) { if (o.isMesh) o.visible = false; });
      var ORG = new THREE.MeshStandardMaterial({ color: 0xe8731a, roughness: 0.58 }), ORG2 = new THREE.MeshStandardMaterial({ color: 0xc95a0e, roughness: 0.62 }), YL = new THREE.MeshStandardMaterial({ color: 0xf2c81e, roughness: 0.5 }), BK = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.65 }), WH = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x555555, roughness: 0.3 });
      bx(0.72, 0.58, 0.85, ORG2, 0, 0.8, 0.82); bx(0.5, 0.46, 0.5, ORG, 0, 0.82, 0.1); bx(0.52, 0.44, 0.44, ORG, 0, 0.9, -0.42);
      bx(0.09, 0.07, 0.24, BK, -0.13, 0.7, -0.74); bx(0.09, 0.07, 0.24, BK, 0.13, 0.7, -0.74);
      [-1, 1].forEach(function (sd) { var pv = new THREE.Group(); pv.position.set(sd * 0.14, 1.1, -0.6); pv.rotation.x = 0.55; g.add(pv); bx(0.04, 0.04, 0.5, YL, 0, 0, -0.25, pv); bx(0.07, 0.07, 0.07, YL, 0, 0, -0.52, pv); });
      bx(0.1, 0.1, 0.03, EYE, 0.1, 0.99, -0.65); bx(0.1, 0.1, 0.03, EYE, 0.1, 0.84, -0.65); bx(0.1, 0.1, 0.03, EYE, -0.1, 0.84, -0.65); bx(0.1, 0.1, 0.03, WH, -0.1, 0.99, -0.65);
      [lL, lR].forEach(function (lg, li) { var sd = li ? 1 : -1; lg.position.set(sd * 0.26, 0.66, 0.1); [-0.3, 0.02, 0.36].forEach(function (zo) { bx(0.42, 0.05, 0.05, YL, sd * 0.21, 0, zo, lg); bx(0.05, 0.62, 0.05, YL, sd * 0.42, -0.31, zo, lg); [-0.12, -0.28, -0.44].forEach(function (yo) { bx(0.075, 0.035, 0.075, BK, sd * 0.42, yo, zo, lg); }); }); });
    }
    if (type === 'zcorpion') { bx(0.12, 0.12, 0.3, m.skin, 0, 0.95, 0.3); bx(0.12, 0.3, 0.12, m.skin, 0, 1.15, 0.5); bx(0.12, 0.12, 0.3, m.skin, 0, 1.35, 0.35); bx(0.08, 0.08, 0.2, MAT_ACID, 0, 1.4, 0.15); bx(0.28, 0.12, 0.22, m.skin, -0.55, 1.05, -0.35); bx(0.28, 0.12, 0.22, m.skin, 0.55, 1.05, -0.35); }
    if (type === 'gigantus') { bx(0.2, 0.3, 0.2, m.cloth, -0.5, 1.5, 0); bx(0.2, 0.3, 0.2, m.cloth, 0.5, 1.5, 0); bx(0.06, 0.06, 0.02, EYE, 0, 1.64, -0.17); }
    if (type === 'armored') { bx(0.66, 0.6, 0.4, MAT_STEEL, 0, 1.08, 0); bx(0.38, 0.38, 0.38, MAT_STEEL, 0, 1.58, 0); bx(0.3, 0.05, 0.02, EYE, 0, 1.58, -0.2); bx(0.22, 0.5, 0.26, MAT_STEEL, -0.18 * wide, 0.35, 0); bx(0.22, 0.5, 0.26, MAT_STEEL, 0.18 * wide, 0.35, 0); }
    var sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.05; sh.scale.set(0.95 * wide, 0.95 * wide, 1); sh.visible = gfx.shadow; g.add(sh);
    var zy0 = type === 'floater' ? -0.2 : (onSurface(x) && W && W.gh ? W.gh(x, z) : 0);
    g.scale.setScalar(d.scale); g.position.set(x, zy0, z); scene.add(g);
    var id = forcedId != null ? forcedId : nextZid++, zb = { id: id, type: type, ti: ZTYPES.indexOf(type), def: d, g: g, x: x, y: zy0, z: z, tx: x, tz: z, try: 0, hp: Math.round(d.hp * DIFF[wDiff][0]), mhp: Math.round(d.hp * DIFF[wDiff][0]), rad: 0.32 * Math.sqrt(d.scale) * wide * 0.9, r2: Math.pow(0.52 * d.scale * wide, 2), h: (SP ? 1.15 : 1.9) * d.scale, cd: 0.4, anim: rnd() * 6, legs: [lL, lR], arms: [aL, aR], swaps: sw, flash: 0, flashing: false, tents: tents, spl: spl, guard: 0, gcd: 0, rush: !!d.rush, wings: wings, buff: 0, growlT: 2 + rnd() * 4 };
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
  function ugLayer(x) { return Math.max(0, Math.min(2, Math.floor((x - 2700) / 420))); }
  function targets() { var a = []; if (!dead && onSurface(P.x)) a.push({ x: P.x, z: P.z }); for (var pid in mp.peers) { var pr = mp.peers[pid]; if (!pr.dead && pr.hp > 0 && onSurface(pr.x)) a.push({ x: pr.x, z: pr.z }); } return a; }
  function nearestT(tg, x, z) { var bd = 1e9, b = null; for (var i = 0; i < tg.length; i++) { var d = Math.hypot(tg[i].x - x, tg[i].z - z); if (d < bd) { bd = d; b = tg[i]; } } return { d: bd, t: b }; }
  function hydrate(i) {
    var o = i * 8, ti = DU[o] & 31, hpf = ((DU[o] >>> 5) & 4095) / 4095, x = DF[o + 1], z = DF[o + 2], rot = DF[o + 3], id = DU[o + 6]; dDel(i);
    var zb = makeZombie(ZTYPES[ti], x, z, id); zb.hp = Math.max(1, Math.round(hpf * zb.mhp)); zb.g.rotation.y = rot; zb.try = rot; zombies.push(zb);
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
      var zb = zombies[i]; if (zb.type === 'miner' || zb.type === 'zfish' || zb.type === 'drowned' || zb.type === 'floater' || dorm.n >= DMAX) continue;
      if (nearestT(tg, zb.x, zb.z).d > E + 30) { dAdd(zb.ti, zb.x, zb.z, zb.hp / zb.mhp, zb.g.rotation.y, zb.id); scene.remove(zb.g); zombies.splice(i, 1); delete zMap[zb.id]; }
    }
  }
  function placeZombie(type, x, z) {
    var tg = targets(), bd = nearestT(tg, x, z).d;
    if (tg.length && bd > edMeters() && type !== 'miner' && type !== 'zfish' && type !== 'drowned' && type !== 'floater' && dorm.n < DMAX) { dAdd(ZTYPES.indexOf(type), x, z, 1, 0, nextZid++); return; }
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
    if (!best) best = ringPoint(ref); if (W.seaAt && W.seaAt(best.x, best.z)) return; var biome = W.biomeOf(best.x, best.z), tier = worldTier(clockInfo(T).day);
    var pool = [], sum = 0; for (var k in ZDEF) { var d = ZDEF[k]; if (d.nospawn || d.boss) continue; if (d.tier > tier) continue; if (d.biome && d.biome !== biome) continue; var wgt = d.w * (WZ.RARITY[d.rarity] || 0); if (wgt <= 0) continue; pool.push([k, wgt]); sum += wgt; }
    if (!pool.length) return; var r = rnd() * sum, type = pool[0][0]; for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) { type = pool[i][0]; break; } }
    placeZombie(type, best.x, best.z);
  }
  function ann(msg) { say(msg, true); if (mp.role === 'host') Net.send({ t: 'ann', msg: msg }); }
  function bossAlive(type) { var ti = ZTYPES.indexOf(type), i; for (i = 0; i < zombies.length; i++) if (zombies[i].type === type) return true; for (i = 0; i < dorm.n; i++) if ((DU[i * 8] & 31) === ti) return true; return false; }
  /* boss rule: Gigantus Zombie appears ONCE when day 10 starts (tier 1->2); Armored-Full Zombie Mk-1 ONCE at tier 3 (day 30, tier 2->3); Mutanoiders Zombos ONCE at tier 4 (day 60, tier 3->4). bf[i]: 0 not spawned, 1 alive, 2 dead */
  function bossLogic(dt) {
    bossT -= dt; if (bossT > 0) return; bossT = 3; var day = clockInfo(T).day, tg = targets(); if (!tg.length) return;
    [['gigantus', 2, 'GIGANTUS ZOMBIE has appeared! The world is entering Tier 2...'], ['armored', 3, 'ARMORED-FULL ZOMBIE Mk-1 has appeared! The world is entering Tier 3...'], ['mutanoider', 4, 'MUTANOIDERS ZOMBOS has risen! A winged, tentacled horror walks the land. The world is entering Tier 4...']].slice(0, 3).forEach(function (b, bi) {
      if (worldTier(day) >= b[1] && bf[bi] !== 2 && !bossAlive(b[0])) { var pt = ringPoint(tg[0]); placeZombie(b[0], pt.x, pt.z); if (bf[bi] === 0) ann(b[2]); bf[bi] = 1; }
    });
  }
  function explode(z) {
    var s = z.def.splash || 4; if (mp.role === 'host') Net.send({ t: 'boom', x: r2(z.x), y: r2(z.y), z: r2(z.z), dmg: z.def.dmg, splash: s, zid: z.id });
    var d = Math.hypot(P.x - z.x, P.y + 0.9 - z.y - 0.9, P.z - z.z); if (d < s) hurt(Math.round(z.def.dmg * (1 - Math.max(0, d - 1.5) / (s - 1.5 + 0.001))));
    if (mp.role !== 'client') { var cx = Math.floor(z.x), cz = Math.floor(z.z), R = Math.ceil(s - 1); for (var x = cx - R; x <= cx + R; x++) for (var y = 0; y <= 4; y++) for (var q = cz - R; q <= cz + R; q++) if (W.getVox(x, y, q) && Math.hypot(x + 0.5 - z.x, y + 0.5 - 1, q + 0.5 - z.z) < s) damageVoxLocal(x, y, q, z.def.dmg, null); }
    SFX.play('boom'); scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); delete zMap[z.id];
  }
  function updateZombieVisuals(z, dt) {
    if (z.spl) { for (var si = 0; si < 8; si++) { var sl2 = z.spl[si]; sl2.g.rotation.y = sl2.base + Math.sin(z.anim * 1.4 + sl2.i * 1.7) * 0.28; } } else { var sw = Math.sin(z.anim) * 0.7; z.legs[0].rotation.x = sw; z.legs[1].rotation.x = -sw;
    z.arms[0].rotation.x = 1.35 + Math.sin(z.anim * 0.5) * 0.15; z.arms[1].rotation.x = 1.35 - Math.sin(z.anim * 0.5) * 0.15; }
    if (z.wings) z.wings.forEach(function (w) { var tgW = z.guard > 0 ? w.sd * 1.5 : -w.sd * (0.6 + Math.sin(z.anim * 0.7) * 0.2); w.g.rotation.y += (tgW - w.g.rotation.y) * Math.min(1, dt * 8); });
    if (z.tents) for (var ti2 = 0; ti2 < z.tents.length; ti2++) { var tt = z.tents[ti2], tg2 = z.guard > 0 ? 1.05 + Math.sin(z.anim * 0.8 + ti2) * 0.1 : -0.55 + Math.sin(z.anim * 0.6 + ti2 * 1.3) * 0.35; tt.rotation.x += (tg2 - tt.rotation.x) * Math.min(1, dt * 8); tt.rotation.z = (ti2 < 2 ? 1 : 1.6) * (ti2 % 2 ? 0.25 : -0.25); }
    if (z.flash > 0) { z.flash -= dt; if (!z.flashing) { z.flashing = true; z.swaps.forEach(function (s) { s.mesh.material = FLASH_MAT; }); } }
    else if (z.flashing) { z.flashing = false; z.swaps.forEach(function (s) { s.mesh.material = s.orig; }); }
  }
  var ANG = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
  function thornDmg() { var T2 = { cactus_helmet: 1, cactus_chest: 3, cactus_legs: 2, cactus_boots: 1 }, n = 0; ['head', 'chest', 'legs', 'boots'].forEach(function (sl) { n += T2[equip[sl]] || 0; }); return n; }
  function zombieHit(z, tgt) {
    var d = z.def, reach = (1.15 + d.scale * 0.35) * (d.rng || 1);
    var zd = d.dmg * DIFF[wDiff][1] * (z.buff > 0 ? 1.1 : 1); if (W.gods.length && aura(z.x, z.z).weak) zd = Math.max(1, zd - 10);
    function one(isSelf, pid) { z.rush = false; if (isSelf) { hurt(zd, d.elem); if (d.wpoison) applyWaterPoison(); var th = thornDmg(); if (th > 0 && zMap[z.id]) hitZombie(z, th, 'turret'); } else if (mp.role === 'host') Net.send({ t: 'hurt', to: pid, dmg: zd, wp: d.wpoison ? 1 : 0 }); }
    one(tgt.isSelf, tgt.pid);
    if (d.splash && z.type !== 'bomber') { /* SPLASH: other players next to the zombie get hit too */
      if (!tgt.isSelf && !dead && onSurface(P.x) && Math.hypot(P.x - z.x, P.z - z.z) < reach + d.splash) one(true);
      for (var pid in mp.peers) { var pr = mp.peers[pid]; if ((tgt.isSelf || pid !== tgt.pid) && !pr.dead && pr.hp > 0 && Math.hypot(pr.x - z.x, pr.z - z.z) < reach + d.splash) one(false, pid); }
    }
  }
  /* ---- Traps (vox 44-48): non-solid, hurt zombies that cross them ---- */
  var TRAPS = { 44: { dmg: 8, loss: 8 }, 45: { dmg: 16, loss: 12, miss: 0.4 }, 46: { dmg: 24, loss: 12, def: 2, bleed: 5 }, 47: { dmg: 4, loss: 1, bleed: 3, bleedP: 0.1 }, 48: { dmg: 48, loss: 16, def: 4, bleed: 5, over: true } };
  function trapCheck(z, dt) {
    if (z.bleed > 0) { z.bleed -= dt; z.bleedAcc = (z.bleedAcc || 0) + dt * (z.over ? 4 : 2); if (z.bleedAcc >= 1) { var bd = Math.floor(z.bleedAcc); z.bleedAcc -= bd; hitZombie(z, bd, 'turret'); if (!zMap[z.id]) return; } }
    z.trapCd = (z.trapCd || 0) - dt; if (z.trapCd > 0 || mp.role === 'client') return;
    var cx = Math.floor(z.x), cy = Math.max(0, Math.floor(z.y + 0.05)), cz = Math.floor(z.z), v = W.getVox(cx, cy, cz); if (!v || v.t < 44 || v.t > 48) return;
    var T0 = TRAPS[v.t]; z.trapCd = 0.8; hitZombie(z, T0.dmg, 'turret');
    if (T0.bleed && (!T0.bleedP || rnd() < T0.bleedP)) { z.bleed = T0.bleed; z.over = !!T0.over; }
    if (!(T0.miss && rnd() < T0.miss)) damageVoxLocal(cx, cy, cz, Math.max(1, T0.loss - (T0.def || 0)), null);
  }
  function stepZombie(z, dt) {
    trapCheck(z, dt); if (!zMap[z.id]) return;
    var tgt = null, bd = 1e9;
    if (!dead && (z.type === 'miner' ? inUG(P.x) : onSurface(P.x))) { bd = Math.hypot(P.x - z.x, P.z - z.z); tgt = { isSelf: true, x: P.x, y: P.y, z: P.z, d: bd }; }
    for (var pid in mp.peers) { var pr = mp.peers[pid]; if (pr.dead || pr.hp <= 0 || (z.type === 'miner' ? !inUG(pr.x) : !onSurface(pr.x))) continue; var pd = Math.hypot(pr.x - z.x, pr.z - z.z); if (pd < bd) { bd = pd; tgt = { isSelf: false, pid: pid, x: pr.x, y: pr.y, z: pr.z, d: pd }; } }
    if (!tgt) return;
    var dx = tgt.x - z.x, dz = tgt.z - z.z, dist = tgt.d, base = Math.atan2(dz, dx), sp = z.def.spd * 2.2 * (W.gods.length && aura(z.x, z.z).foot ? 0.8 : 1) * (z.def.rage && z.hp < z.mhp * 0.2 ? 2 : 1) * (z.guard > 0 ? (z.def.wingguard ? 0.17 : 0.5) : 1) * (z.rush ? 2 : 1), reach = (1.15 + z.def.scale * 0.35) * (z.def.rng || 1);
    if (z.type === 'miner' && dist > 22) { updateZombieVisuals(z, dt); return; }
    if (z.def.ranged) { z.vcd = (z.vcd == null ? 2 : z.vcd) - dt; if (dist > 3 && dist < 14 && z.vcd <= 0) { z.vcd = z.def.ranged === 'acid' ? 3 : 4; fireVirus(z, tgt); } }
    z.cd -= dt; z.anim += dt * sp * 2.2; if (z.gcd > 0) z.gcd -= dt; if (z.guard > 0) z.guard -= dt; if (z.buff > 0) z.buff -= dt;
    if (z.def.growl) { z.growlT -= dt; if (z.growlT <= 0 && dist < 40) { z.growlT = 10; for (var gk = 0; gk < zombies.length; gk++) { var go = zombies[gk]; if (Math.hypot(go.x - z.x, go.z - z.z) <= 5) go.buff = 5; } if (dist < 16) { SFX.play('groan'); say('Tough Zombie: gggrrrrr...', true); } } }
    if (dist > 0.01 && Math.abs(tgt.y - z.y) < 2.2 && dist < reach && !(z.type === 'floater' && tgt.y < -1.2)) {
      if (z.type === 'bomber') { explode(z); return; }
      if (z.cd <= 0 && !(z.def.wingguard && z.guard > 0)) { z.cd = z.def.cd; zombieHit(z, tgt); }
    }
    if (z.type === 'bomber' && dist < 2.1 && Math.abs(tgt.y - z.y) < 2.2) { explode(z); return; }
    var moved = false, hitInfo = null;
    for (var a = 0; a < ANG.length && !moved; a++) { var ang = base + ANG[a], mx = Math.cos(ang) * sp * dt, mz = Math.sin(ang) * sp * dt, gyT = (onSurface(z.x + mx) && W.gh) ? W.gh(z.x + mx, z.z + mz) : 0, i = W.hit(z.x + mx - z.rad, z.x + mx + z.rad, gyT + 0.05, gyT + 1.7, z.z + mz - z.rad, z.z + mz + z.rad); if (!i) { z.x += mx; z.z += mz; moved = true; } else if (a === 0) hitInfo = { vox: i.vox }; }
    if (!moved && hitInfo && hitInfo.vox != null && z.cd <= 0) { if (z.type === 'bomber') { explode(z); return; } z.cd = z.def.cd || 1; var c = unkey(hitInfo.vox), tv0 = W.getVox(c[0], c[1], c[2]); damageVoxLocal(c[0], c[1], c[2], z.def.dmg * 3, null); if (z.def.aoe) { damageVoxLocal(c[0] + 1, c[1], c[2], z.def.dmg * 3, null); damageVoxLocal(c[0], c[1], c[2] + 1, z.def.dmg * 3, null); damageVoxLocal(c[0], c[1] + 1, c[2], z.def.dmg * 3, null); } SFX.play('wood'); if (tv0 && tv0.t === 27) hitZombie(z, 4, 'turret'); }
    for (var k = 0; k < zombies.length; k++) { var o = zombies[k]; if (o === z) continue; var ex = z.x - o.x, ez = z.z - o.z, d2 = ex * ex + ez * ez; if (d2 < 0.5 && d2 > 0.0001) { var d = Math.sqrt(d2), pp = (0.7 - d) * 0.5; z.x += ex / d * pp * dt * 6; z.z += ez / d * pp * dt * 6; } }
    if (z.type === 'floater' && z.px != null && W.seaAt && !W.seaAt(z.x, z.z)) { z.x = z.px; z.z = z.pz; } z.px = z.x; z.pz = z.z;
    z.y = z.type === 'floater' ? -0.2 : (onSurface(z.x) && W.gh ? W.gh(z.x, z.z) : 0);
    z.g.position.set(z.x, z.y, z.z); if (dist > 0.01) z.g.rotation.y = Math.atan2(-dx, -dz); updateZombieVisuals(z, dt);
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
      for (var i = 0; i < zombies.length; i++) { var z = zombies[i], dx = z.tx - z.x, dz = z.tz - z.z, mv = Math.hypot(dx, dz); z.x += dx * f; z.z += dz * f; z.y = z.type === 'floater' ? -0.2 : (onSurface(z.x) && W.gh ? W.gh(z.x, z.z) : 0); z.g.visible = entVisible(z.x, z.z); if (!z.g.visible) continue; z.g.position.set(z.x, z.y, z.z); z.g.rotation.y = z.try; z.anim += dt * (mv > 0.02 ? z.def.spd * 4.5 : 1.5); updateZombieVisuals(z, dt); }
      return;
    }
    if (T < 30) return; /* first 30 seconds of a new world: no zombies spawn */
    spawnT -= dt;
    var cap = zombieCap(), interval = (Math.max(1.2, 6 - T / 120) / 0.9) * (isNight ? 0.8 : 1) / (bloodOn ? 2 : 1);
    mineLogic(dt); bossLogic(dt); dormTick(dt);
    var hostile = dormCount(true); for (var hz = 0; hz < zombies.length; hz++) { var zt = zombies[hz]; if (zt.type !== 'miner' && zt.type !== 'zfish' && zt.type !== 'drowned' && !zt.def.boss) hostile++; }
    if (spawnT <= 0 && hostile < cap) { spawnZombie(); spawnT = interval; }
    for (var j = zombies.length - 1; j >= 0; j--) { var zz = zombies[j]; zz.g.visible = entVisible(zz.x, zz.z); stepZombie(zz, dt); }
  }

  /* ---------------- Multiplayer avatars & sync ---------------- */
  function makeNameSprite(name, slot) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; var ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(15,12,10,0.75)'; ctx.fillRect(16, 10, 224, 44); ctx.strokeStyle = SLOT_HEX[slot % 4]; ctx.lineWidth = 4; ctx.strokeRect(16, 10, 224, 44);
    ctx.fillStyle = '#f1ece2'; ctx.font = 'bold 26px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 128, 33);
    var tex = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(1.6, 0.4, 1); sp.position.set(0, 2.25, 0); return { sprite: sp, tex: tex };
  }
  function makeRemotePlayerMesh(slot, name) {
    var g = new THREE.Group(); g.userData.mob = true;
    var shirt = vmMat(SLOT_COLS[slot % 4], { roughness: 0.85, metalness: 0.04 });
    var skin = vmMat(0xd9b38c, { roughness: 0.78, metalness: 0.02 });
    var pants = vmMat(0x282d37, { roughness: 0.86, metalness: 0.04 });
    var pack = vmMat(0x4c4334, { roughness: 0.88, metalness: 0.05 });
    function bx(w, h, d, m, x, y, z, p) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.castShadow = true; (p || g).add(o); }
    bx(0.5, 0.68, 0.28, shirt, 0, 1.05, 0);
    bx(0.52, 0.07, 0.3, MAT_BELT, 0, 0.73, 0);
    bx(0.36, 0.44, 0.16, pack, 0, 1.06, 0.2);
    bx(0.32, 0.32, 0.32, skin, 0, 1.56, 0);
    bx(0.24, 0.08, 0.03, MAT_GLASS, 0, 1.58, -0.165);
    var lL = new THREE.Group(), lR = new THREE.Group(), aR = new THREE.Group(); lL.position.set(-0.13, 0.7, 0); lR.position.set(0.13, 0.7, 0); aR.position.set(0.35, 1.35, 0); g.add(lL); g.add(lR); g.add(aR);
    bx(0.2, 0.56, 0.22, pants, 0, -0.28, 0, lL); bx(0.21, 0.15, 0.25, MAT_BOOT, 0, -0.625, -0.02, lL);
    bx(0.2, 0.56, 0.22, pants, 0, -0.28, 0, lR); bx(0.21, 0.15, 0.25, MAT_BOOT, 0, -0.625, -0.02, lR);
    bx(0.14, 0.22, 0.14, shirt, -0.35, 1.24, 0); bx(0.13, 0.38, 0.13, skin, -0.35, 0.94, 0);
    bx(0.14, 0.22, 0.14, shirt, 0, -0.1, 0, aR); bx(0.13, 0.38, 0.13, skin, 0, -0.4, 0, aR);
    var tag = makeNameSprite(name, slot); g.add(tag.sprite); var psh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); psh.rotation.x = -Math.PI / 2; psh.position.y = 0.05; psh.scale.set(0.9, 0.9, 1); psh.visible = gfx.shadow; g.add(psh); scene.add(g); return { g: g, lL: lL, lR: lR, aR: aR, anim: 0, tag: tag, sh: psh };
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
      } else if (msg.t === 'hitZ') { var z = zMap[msg.id]; if (z) { hitZombie(z, msg.dmg || 4, msg.f); if (msg.it && ITEMS[msg.it]) weaponFx(z, ITEMS[msg.it], msg.dmg || 4, msg.f); } }
      else if (msg.t === 'cboom') { var bit = ITEMS[msg.id]; if (bit && bit.tool === 'bomb') explodeAt(msg.x, msg.y, msg.z, bit, msg.f); }
      else if (msg.t === 'tnt') tntLocal(msg.x, msg.y, msg.z);
      else if (msg.t === 'tload') { var tl = turretAt(msg.x, msg.y, msg.z); if (tl) { tl.ammo = Math.min(tcfg(tl).cap, tl.ammo + Math.max(0, msg.n | 0)); Net.send({ t: 'tam', x: msg.x, y: msg.y, z: msg.z, a: tl.ammo }); } }
      else if (msg.t === 'dmgVox') damageVoxLocal(msg.x, msg.y, msg.z, msg.dmg || 2, msg.f);
      else if (msg.t === 'hitEnt') { var e = (msg.k === 'tree' ? W.trees : msg.k === 'car' ? W.cars : W.rocks)[msg.idx]; if (e && e.alive) { if (msg.k === 'car') applyCarHit(e, msg.bd || 1, msg.f); else applyEntHit(e, msg.bd || 1, msg.f); } }
      else if (msg.t === 'search') { var se = (msg.k === 'pile' ? W.piles : W.crates)[msg.idx]; if (se) applySearchEnt(se, msg.f); }
      else if (msg.t === 'place') {
        if (!W.getVox(msg.x, msg.y, msg.z) && !W.hit(msg.x + 0.02, msg.x + 0.98, msg.y + 0.02, msg.y + 0.98, msg.z + 0.02, msg.z + 0.98) && W.setBig(msg.x, msg.y, msg.z, msg.vt, msg.hp, msg.rot || 0)) {
          voxVer++; Net.send({ t: 'vox', op: 1, x: msg.x, y: msg.y, z: msg.z, vt: msg.vt, hp: msg.hp, rot: msg.rot || 0 });
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
      else if (msg.t === 'boomfx') boomVisual(msg.x, msg.y, msg.z, msg.r);
      else if (msg.t === 'vox') {
        if (msg.op === 1) { if (!W.getVox(msg.x, msg.y, msg.z) && W.setBig(msg.x, msg.y, msg.z, msg.vt, msg.hp, msg.rot || 0)) voxVer++; }
        else if (msg.op === 0) { if (W.getVox(msg.x, msg.y, msg.z)) { W.delVox(msg.x, msg.y, msg.z); voxVer++; } }
        else if (msg.op === 2) { var hv = W.getVox(msg.x, msg.y, msg.z); if (hv) hv.hp = msg.hp; }
      } else if (msg.t === 'ent') {
        if (msg.k === 'tree') { var tr = W.trees[msg.idx]; if (tr) { tr.hp = msg.hp; tr.given = msg.given; if (tr.alive !== msg.alive) W.setTree(tr, msg.alive); } }
        else if (msg.k === 'rock') { var rk = W.rocks[msg.idx]; if (rk) { rk.hp = msg.hp; rk.given = msg.given; if (rk.alive !== msg.alive) W.setRock(rk, msg.alive); } }
        else if (msg.k === 'pile') { var pl = W.piles[msg.idx]; if (pl) W.setPile(pl, !msg.searched); }
        else if (msg.k === 'crate') { var cr = W.crates[msg.idx]; if (cr) W.setCrate(cr, !msg.searched); }
        else if (msg.k === 'car') { var cc = W.cars[msg.idx]; if (cc) { cc.hp = msg.hp; if (msg.burnt && !cc.burnt) { cc.burnt = true; W.setCar(cc, true); } else if (cc.alive !== msg.alive) W.setCar(cc, msg.alive); } }
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
  function openInv() { mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; mg = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} } $('#hud').hidden = true; $('#screen').hidden = true; $('#inv').hidden = false; renderInv(); }
  function closeInv() { $('#inv').hidden = true; wire = null; mg = null; chestE = null; potE = null; godE = null; enterGame(); }
  function costHtml(r) { return Object.keys(r.cost).map(function (id) { var have = count(id); return '<span class="' + (have >= r.cost[id] ? 'ok' : 'no') + '">' + ITEMS[id].ic + ' ' + have + '/' + r.cost[id] + ' ' + ITEMS[id].name + '</span>'; }).join(' &middot; '); }
  var STN0 = [['hand', 'Handmade', null], ['sawmill', 'Sawmill', 'saws'], ['furnace', 'Furnace', 'furn'], ['campfire', 'Campfire', 'camps'], ['anvil', 'Iron Anvil', 'anvils'], ['sink', 'Sink', 'sinks'], ['turret', 'Turret Workbench', 'tbench'], ['computer', 'Computer Bench', 'comps'], ['milling', 'Manual Milling', 'mills'], ['bomb', 'Bomb Workbench', 'bombs'], ['kiln', 'Glass Kiln', 'kilns'], ['craft', 'Crafting Workbench', 'crafts'], ['work', 'Working Workbench', 'works'], ['press', 'Manual Pressing', 'presses'], ['casing', 'Casing & Frame Crafter', 'casings'], ['trapb', 'Trap Bench', 'trapbs'], ['mason', 'Mason Workbench', 'masons'], ['blast', 'Blast Smelter', 'blasts'], ['liquiders', 'Liquiders Workbench', 'liqs'], ['sewing', 'Sewing Table', 'sews'], ['cutting', 'Cutting Board (on a Table)', 'cuttables']];
  STN0.push(['tablecraft', 'Furniture Table', 'tables']); Object.keys(WZ.GST).forEach(function (t) { var G = WZ.GST[t]; STN0.push([G[0], G[1], G[2]]); });
  function stnList() { return STN0.map(function (a) { return [a[0], a[1], a[2] ? W[a[2]] : null]; }); }
  var STBTN = { shaper: 'Craft', tanker: 'Craft', cpot: 'Cook', gunb: 'Craft', tablecraft: 'Craft', wfilter: 'Filter', distill: 'Distill', cwork: 'Build', seng: 'Craft', eng: 'Craft', drive: 'Craft', vbench: 'Craft', hand: 'Craft', sawmill: 'Cut', furnace: 'Smelt', campfire: 'Cook', anvil: 'Forge', sink: 'Wash', turret: 'Build', computer: 'Build', milling: 'Mill', bomb: 'Build', kiln: 'Craft', craft: 'Craft', work: 'Craft', press: 'Press', casing: 'Craft', trapb: 'Build', mason: 'Cut', blast: 'Smelt', liquiders: 'Craft', sewing: 'Sew', cutting: 'Cut' };
  function stationOk(r) { if (r.st === 'furnace' && nearArr(W.blasts)) return true; var S = stnList(); for (var i = 0; i < S.length; i++) if (S[i][0] === r.st) return !S[i][2] || nearArr(S[i][2]); return true; }
  /* Recipe reveal rule: a recipe is only listed when you are at its station AND you already own the ingredients (WZ.REVEAL: 'all' = every ingredient type, 'any' = at least one) */
  function revealed(r) { var ks = Object.keys(r.cost); return stationOk(r) && (WZ.REVEAL === 'any' ? ks.some(function (k) { return count(k) > 0; }) : ks.every(function (k) { return count(k) > 0; })); }
  function hasAll(r) { return Object.keys(r.cost).every(function (id) { return count(id) >= r.cost[id]; }); }
  function fuelHtml() { return Object.keys(WZ.FUEL).map(function (f) { return ITEMS[f].ic + ' ' + ITEMS[f].name + ' x' + count(f) + ' (' + WZ.FUEL[f].t + ' s, power ' + WZ.FUEL[f].p + ')'; }).join(' &middot; '); }
  /* ---- Slow manual jobs (Manual Iron Shaper Table): run in the background, a solved puzzle halves the remaining time ---- */
  var jobs = [];
  function jobRec(j) { return WZ.RECIPES.filter(function (x) { return x.id === j.id; })[0]; }
  function startJob(r) { Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); jobs.push({ id: r.id, left: r.dur, half: false }); SFX.play('click'); say('Started: ' + (r.label || ITEMS[r.out[0]].name) + ' (' + r.dur + ' s). Solve the puzzle at the table to cut the remaining time by 50%.'); }
  function jobTick(dt) { for (var i = jobs.length - 1; i >= 0; i--) { var j = jobs[i], r = jobRec(j); if (!r) { jobs.splice(i, 1); continue; } j.left -= dt; if (j.left <= 0) { jobs.splice(i, 1); give(r.out[0], r.out[1]); say('Finished: ' + ITEMS[r.out[0]].name + '!'); SFX.play('craft'); } } }
  function jobsHtml() {
    if (!jobs.length) return ''; var out = '<h2 style="margin-top:12px">⏳ Manual jobs in progress</h2>';
    jobs.forEach(function (j, i) { var r = jobRec(j); if (!r) return; var m = Math.floor(j.left / 60), s = Math.floor(j.left % 60); out += '<div class="rec"><div><b>' + ITEMS[r.out[0]].ic + ' ' + esc(r.label || ITEMS[r.out[0]].name) + '</b><div class="cost">' + m + ':' + ('0' + s).slice(-2) + ' left' + (j.half ? ' · puzzle bonus used' : '') + '</div></div>' + (j.half ? '' : '<button class="btn primary" data-jpz="' + i + '"' + (stationOk(r) ? '' : ' disabled') + '>🧩 Puzzle −50%</button>') + '</div>'; });
    return out;
  }
  function recipesHtml() {
    var out = '', shown = 0;
    stnList().forEach(function (sn) {
      var rs = WZ.RECIPES.filter(function (r) { return r.st === sn[0] && !r.pot && revealed(r); }); if (!rs.length) return; shown += rs.length;
      out += '<h2 style="margin-top:12px">' + (sn[0] === 'hand' ? '✋ Handmade' : '📍 ' + sn[1] + ' (nearby)') + '</h2>';
      if (sn[0] === 'furnace' || sn[0] === 'campfire' || sn[0] === 'blast' || sn[0] === 'cpot') out += '<div class="m" style="color:var(--muted);font-size:.78rem;margin-bottom:6px">Fuel in your bag: ' + fuelHtml() + (heatQ.length ? '<br>🔥 Jobs queued: ' + heatQ.length + ' &middot; progress ' + Math.round(heatGot / heatQ[0].r.heat * 100) + '%' : '') + '</div>';
      out += rs.map(function (r) {
        var o = ITEMS[r.out[0]], can = hasAll(r), note = '';
        if (r.dur) note += '<br>⏳ Takes ' + r.dur + ' s in the background';
        if (r.heat) note += '<br>🔥 Needs ' + r.heat + ' heat power (burn fuel)';
        if (r.puz && r.puz.k === 'img') note += '<br>🧩 Picture puzzle &middot; Tier ' + r.tier + ' (' + r.puz.n + '×' + r.puz.n + ')';
        else if (r.puz && r.puz.k === 'mask') note += '<br>🧩 Shape puzzle';
        else if (r.puz && r.puz.k === 'saw') note += '<br>📏 Sawing minigame (a failed cut gives Failed Craft Wood)';
        else if (r.puz && r.puz.k === 'crank') note += '<br>🔧 Crank minigame: ' + r.puz.n + ' turns';
        else if (r.puz && r.puz.k === 'wire') note += '<br>🔌 Wire minigame';
        return '<div class="rec"><div><b>' + o.ic + ' ' + esc(r.label || o.name) + (r.out[1] > 1 ? ' x' + r.out[1] : '') + '</b><div class="cost">' + costHtml(r) + note + '</div></div><button class="btn' + (can ? ' primary' : '') + '" data-craft="' + r.id + '"' + (can ? '' : ' disabled') + '>' + STBTN[r.st] + '</button></div>';
      }).join('');
    });
    out += jobsHtml(); if (jobs.length) shown++;
    if (!shown) out += '<p class="m" style="color:var(--muted)">No recipes available. Recipes only appear when you are standing at the right crafting station and already carry every ingredient. Explore, gather materials and check the wiki.</p>';
    return out;
  }
  /* ---- Heat jobs (furnace / campfire) ---- */
  var heatQ = [], heatGot = 0, burn = { left: 0, rate: 0 }, heatWarn = false;
  function queueHeat(r) { Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); heatQ.push({ r: r }); say('Started: ' + (r.label || ITEMS[r.out[0]].name) + '. Stay near the ' + (r.st === 'furnace' ? 'furnace' : r.st === 'blast' ? 'blast smelter' : r.st === 'cpot' ? 'cooking pot' : 'campfire') + ' and keep fuel in its fuel slot.'); SFX.play('click'); }
  function pickBagFuel() { var o = ['charcoal', 'coal', 'wood']; for (var i = 0; i < o.length; i++) if (count(o[i]) > 0) return o[i]; return null; }
  function pickFuel() { if (fuelSl.id && fuelSl.n > 0) { fuelSl.n--; var f = fuelSl.id; if (fuelSl.n <= 0) fuelSl.id = null; return f; } return null; }
  function setBar(txt, f) { var e = $('#eat'); if (!e || eatT > 0) return; e.style.display = 'block'; $('#eat i').style.width = clamp(f * 100, 0, 100) + '%'; $('#eat span').textContent = txt; }
  function heatTick(dt) {
    if (!heatQ.length) { heatGot = 0; return; }
    var j = heatQ[0], isF = j.r.st === 'furnace' || j.r.st === 'blast', at = j.r.st === 'blast' ? nearArr(W.blasts) : (isF ? (nearArr(W.furn) || nearArr(W.blasts)) : j.r.st === 'cpot' ? nearArr(W.cpots) : nearArr(W.camps) || nearArr(W.cpots)), need = j.r.heat, hm = isF && nearArr(W.blasts) ? 2 : 1;
    if (!at) { setBar('Too far from the ' + (j.r.st === 'furnace' ? 'furnace' : 'campfire') + ' - heating paused', heatGot / need); return; }
    var guard = 0;
    while (heatGot < need && dt > 1e-6 && guard++ < 6) {
      if (burn.left <= 0) {
        var f = pickFuel(); if (!f) { if (!heatWarn) { heatWarn = true; say('Out of fuel! Put Coal, Charcoal or Wood into the fuel slot of the station.', true); } setBar('Out of fuel!', heatGot / need); return; }
        heatWarn = false; burn.left = WZ.FUEL[f].t; burn.rate = WZ.FUEL[f].p / WZ.FUEL[f].t;
      }
      var use = Math.min(dt, burn.left); heatGot += burn.rate * use * hm; burn.left -= use; dt -= use;
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
      if (e.vt !== 15) {
        var c = tcfg(e), best = null, bd = c.rng;
        for (var k = 0; k < zombies.length; k++) { var z = zombies[k], d = Math.hypot(z.x - e.x, z.z - e.z); if (d <= bd && Math.abs(z.y - e.y) < 5) { bd = d; best = z; } }
        var aligned = true;
        if (best) { var want = Math.atan2(best.x - e.x, best.z - e.z), cur = e.yaw || 0, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), stp = Math.min(Math.abs(df), dt * 7) * (df < 0 ? -1 : 1); if (Math.abs(df) > 0.01) W.setTurretYaw(e, cur + stp); aligned = Math.abs(df) < 0.3; }
        if (best && aligned && e.ammo > 0 && e.cd <= 0) {
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
    var c = tcfg(e); e.cd = Math.max(0, (e.cd || 0) - dt); camera.getWorldDirection(DIR); var myaw = Math.atan2(DIR.x, DIR.z); if (Math.abs(Math.atan2(Math.sin(myaw - (e.yaw || 0)), Math.cos(myaw - (e.yaw || 0)))) > 0.02) W.setTurretYaw(e, myaw);
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
  /* ---- Weapons: bleeding, splash, bombs, darts, TNT ---- */
  var fuses = [], boomFx = [];
  function setBleed(z, b, by) { z.bleed = { t: b.dur, tick: b.tick, dmg: b.dmg, acc: 0, by: by || 'self' }; }
  function weaponFx(z, it, dmg, att) {
    if (!it || zombies.indexOf(z) < 0) return;
    if (it.bleed) setBleed(z, it.bleed, att);
    if (it.splash) { var r = it.splash / 2; zombies.slice().forEach(function (o) { if (o !== z && Math.hypot(o.x - z.x, o.z - z.z) < r) hitZombie(o, dmg, att || 'self'); }); }
  }
  function bleedTick(dt) {
    for (var i = zombies.length - 1; i >= 0; i--) {
      var z = zombies[i], b = z.bleed; if (!b) continue; b.acc += dt; b.t -= dt;
      while (b.acc >= b.tick) { b.acc -= b.tick; z.hp -= b.dmg; z.flash = 0.06; if (z.hp <= 0) { killZombie(z, b.by); break; } }
      if (b.t <= 0) z.bleed = null;
    }
  }
  function rayZombie(range) {
    camera.getWorldDirection(DIR); var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, i;
    for (var t = 0.5; t <= range; t += 0.4) {
      var x = ox + DIR.x * t, y = oy + DIR.y * t, z = oz + DIR.z * t;
      for (i = 0; i < zombies.length; i++) { var zb = zombies[i], ex = zb.x - x, ez = zb.z - z; if (ex * ex + ez * ez < (zb.rad + 0.5) * (zb.rad + 0.5) && y > zb.y - 0.3 && y < zb.y + zb.h + 0.3) return { z: zb, t: t }; }
      if (W.solidAt(x, y, z) || y < 0) return { z: null, t: t };
    }
    return { z: null, t: range };
  }
  function shootDart(it) {
    var id = hot[sel]; if (count(id) < 1) return; take(id, 1); swingCd = it.cd; mp.swingPulse = 0.25; SFX.play('swing');
    var r = rayZombie(it.range || 30), dmg = Math.round(it.dmg * armorStats().dmgMult); addTracer(Math.max(1, r.t));
    if (r.z) { SFX.play('hit'); if (mp.role === 'client') { r.z.flash = 0.14; Net.send({ t: 'hitZ', id: r.z.id, dmg: dmg, it: id }); } else { hitZombie(r.z, dmg, 'self'); weaponFx(r.z, it, dmg, 'self'); } }
  }
  function throwBomb(it) {
    var id = hot[sel]; if (count(id) < 1) return; take(id, 1); swingCd = it.cd; mp.swingPulse = 0.25; SFX.play('swing');
    camera.getWorldDirection(DIR); var ox = camera.position.x, oy = camera.position.y - 0.15, oz = camera.position.z, ex = ox + DIR.x * 16, ey = oy + DIR.y * 16, ez = oz + DIR.z * 16;
    for (var t = 0.6; t <= 16; t += 0.3) { var x = ox + DIR.x * t, y = oy + DIR.y * t, z = oz + DIR.z * t; if (y <= 0.15 || W.solidAt(x, y, z)) { ex = ox + DIR.x * (t - 0.3); ey = Math.max(0.3, oy + DIR.y * (t - 0.3)); ez = oz + DIR.z * (t - 0.3); break; } }
    addShot(ox, oy, oz, ex, ey, ez); fuses.push({ x: ex, y: ey, z: ez, t: 0.5, id: id, spec: it, by: 'self' });
  }
  function igniteTnt(cx, cy, cz) {
    if (mp.role === 'client') { Net.send({ t: 'tnt', x: cx, y: cy, z: cz }); return; } tntLocal(cx, cy, cz);
  }
  function tntLocal(cx, cy, cz) {
    var v = W.getVox(cx, cy, cz); if (!v || v.t !== 28) return; W.delVox(cx, cy, cz); voxVer++; if (mp.role === 'host') Net.send({ t: 'vox', op: 0, x: cx, y: cy, z: cz });
    var m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xff3030 })); m.position.set(cx + 0.5, cy + 0.5, cz + 0.5); scene.add(m);
    fuses.push({ x: cx + 0.5, y: cy + 0.5, z: cz + 0.5, t: ITEMS.tnt_block.tnt.fuse, spec: { dmg: ITEMS.tnt_block.tnt.dmg, splash: ITEMS.tnt_block.tnt.splash, tool: 'bomb' }, mesh: m, by: 'self' }); say('TNT lit! 3 seconds... RUN!', true); SFX.play('click');
  }
  function fuseTick(dt) {
    for (var i = fuses.length - 1; i >= 0; i--) {
      var f = fuses[i]; f.t -= dt; if (f.mesh) { var k = 1 + Math.sin(f.t * 18) * 0.08; f.mesh.scale.set(k, k, k); f.mesh.material.color.setHex(Math.sin(f.t * 14) > 0 ? 0xff3030 : 0xffffff); }
      if (f.t > 0) continue; fuses.splice(i, 1); if (f.mesh) scene.remove(f.mesh);
      if (mp.role === 'client') { Net.send({ t: 'cboom', x: r2(f.x), y: r2(f.y), z: r2(f.z), id: f.id }); boomVisual(f.x, f.y, f.z, f.spec.splash / 2); var dd = Math.hypot(P.x - f.x, P.z - f.z); if (dd < f.spec.splash / 2) hurt(Math.round(f.spec.dmg * 0.5 * (1 - dd / (f.spec.splash / 2)))); }
      else explodeAt(f.x, f.y, f.z, f.spec, f.by);
    }
  }
  function boomVisual(x, y, z, r) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.7 })); m.position.set(x, y, z); scene.add(m); boomFx.push({ m: m, t: 0.35, r: r }); SFX.play('boom');
  }
  function stepBoomFx(dt) { for (var i = boomFx.length - 1; i >= 0; i--) { var b = boomFx[i]; b.t -= dt; var k = 1 - b.t / 0.35; b.m.scale.setScalar(Math.max(0.1, b.r * k)); b.m.material.opacity = 0.7 * (1 - k); if (b.t <= 0) { scene.remove(b.m); boomFx.splice(i, 1); } } }
  function explodeAt(x, y, z, spec, by) {
    var r = spec.splash / 2; boomVisual(x, y, z, r); if (mp.role === 'host') Net.send({ t: 'boomfx', x: r2(x), y: r2(y), z: r2(z), r: r });
    zombies.slice().forEach(function (zb) { if (Math.hypot(zb.x - x, zb.z - z) < r && Math.abs(zb.y - y) < r + 1.5) { hitZombie(zb, spec.dmg, by || 'self'); if (spec.bleed && zombies.indexOf(zb) >= 0) setBleed(zb, spec.bleed, by); } });
    var dd = Math.hypot(P.x - x, P.z - z); if (!dead && dd < r) hurt(Math.round(spec.dmg * 0.5 * (1 - dd / r)));
    if (spec.splash >= 8) { var R = Math.ceil(r); for (var cx = Math.floor(x) - R; cx <= Math.floor(x) + R; cx++) for (var cy = 0; cy <= Math.floor(y) + R && cy < 40; cy++) for (var cz = Math.floor(z) - R; cz <= Math.floor(z) + R; cz++) if (W.getVox(cx, cy, cz) && Math.hypot(cx + 0.5 - x, cy + 0.5 - y, cz + 0.5 - z) < r) damageVoxLocal(cx, cy, cz, spec.dmg * 1.5, null); }
  }
  /* ---- Mystery box, flashlight, luck ---- */
  function openMysteryBox() { var wt = Math.max(1, Math.min(5, worldTier(clockInfo(T).day))), key = 'crate' + wt; say('The Mysterious Box opened!'); for (var i = 0; i < 5; i++) { var id = WZ.rollLoot(key, rnd, { village: true }); give(id, 1); say('+1 ' + ITEMS[id].name); } SFX.play('loot'); }
  function hasFlash() { return acc.indexOf('flashlight') >= 0; }
  WZ.luck = function () { return acc.indexOf('lucky_ring') >= 0 ? 0.15 : 0; };
  WZ.getTier = function () { return worldTier(clockInfo(T).day); };
  /* ---- Chests ---- */
  var chestE = null;
  function chestAt(cx, cy, cz) { for (var i = 0; i < W.chests.length; i++) { var e = W.chests[i]; if (e.alive && cy === e.vy && cx >= e.vx && cx < e.vx + e.sw && cz >= e.vz && cz < e.vz + e.sd) return e; } return null; }
  function chestCap(e) { return ITEMS[VITEM[e.vt]].chest; }
  function chestSlots(e) { var n = 0; Object.keys(e.box).forEach(function (id) { n += Math.ceil(e.box[id] / WZ.maxStack(id)); }); return n; }
  function chestRoom(e, id) { var cur = e.box[id] || 0, st = WZ.maxStack(id), cs = Math.ceil(cur / st); return Math.max(0, (cs + chestCap(e) - chestSlots(e)) * st - cur); }
  /* ---- Cooking Pot: 6 ingredient slots + container slot + ready slot. Cooking burns 1 fuel from your bag and runs while you are within 14 m. ---- */
  var potE = null;
  function potOf(e) { return e.pot || (e.pot = { sl: [null, null, null, null, null, null], cont: null, out: null, run: null }); }
  function openPot(e) { potE = e; potOf(e); SFX.play('click'); mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; mg = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (er) {} } $('#hud').hidden = true; $('#screen').hidden = true; $('#inv').hidden = false; renderPot(); }
  function potMatch(p) { var have = {}, n = 0; p.sl.forEach(function (s) { if (s) { have[s.id] = (have[s.id] || 0) + s.n; n++; } }); if (!n) return null;
    for (var i = 0; i < WZ.POT.length; i++) { var r = WZ.POT[i], ok = true, k; for (k in r.ing) if ((have[k] || 0) < r.ing[k]) ok = false; for (k in have) if (!r.ing[k]) ok = false; if (ok && (!r.cont || (p.cont && p.cont.id === r.cont))) return r; } return null; }
  function renderPot() {
    var e = potE; if (!e || !e.alive) { potE = null; renderInv(); return; } var p = potOf(e), r = potMatch(p), h;
    h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">🍲 Cooking Pot</h2><button class="btn primary" data-pclose="1">Close</button></div>';
    h += '<div class="box"><h2>Ingredients (6 slots) — click one to take it back</h2><div class="items">' + p.sl.map(function (s, i) { return s ? '<button class="it" data-psl="' + i + '"><b>' + ITEMS[s.id].ic + '</b>' + esc(ITEMS[s.id].name) + '<em>' + s.n + '</em></button>' : '<button class="it" disabled style="opacity:.4"><b>▫️</b>Empty slot ' + (i + 1) + '</button>'; }).join('') + '</div>';
    h += '<h2 style="margin-top:10px">Container slot</h2><div class="items">' + (p.cont ? '<button class="it" data-pct="1"><b>' + ITEMS[p.cont.id].ic + '</b>' + esc(ITEMS[p.cont.id].name) + '<em>' + p.cont.n + '</em></button>' : '<button class="it" disabled style="opacity:.4"><b>🥣</b>Put a Wooden Bowl here</button>') + '</div>';
    h += '<h2 style="margin-top:10px">Ready slot</h2><div class="items">' + (p.out ? '<button class="it" data-pout="1"><b>' + ITEMS[p.out.id].ic + '</b>' + esc(ITEMS[p.out.id].name) + '<em>' + p.out.n + '</em></button>' : '<button class="it" disabled style="opacity:.4"><b>✨</b>Nothing ready</button>') + '</div>';
    h += '<div class="m" style="margin:10px 0">' + (p.run ? '🔥 Cooking ' + esc(p.run.r.label || 'meal') + ': ' + Math.round((1 - p.run.t / p.run.r.time) * 100) + '% (stay within 14 m)' : r ? 'Recipe found: <b>' + esc(ITEMS[r.out[0]].name) + '</b> · ' + r.time + ' s · needs 1 fuel (Coal, Charcoal or Wood) in your bag' : 'Add ingredients and a Wooden Bowl. No recipe matches yet.') + '</div>';
    h += '<button class="btn primary" data-pcook="1"' + (r && !p.run ? '' : ' disabled') + '>Cook</button></div>';
    h += '<div class="box"><h2>Your bag — click to add 1 to the pot (Wooden Bowl goes into the container slot)</h2><div class="items">' + (Object.keys(inv).filter(function (id) { return inv[id] > 0 && ITEMS[id]; }).map(function (id) { var it = ITEMS[id]; return '<button class="it" data-padd="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') || '<p class="m">Empty.</p>') + '</div></div></div>';
    $('#inv').innerHTML = h;
  }
  function potClick(t) {
    var e = potE; if (!e) return; var p = potOf(e);
    if (t.dataset.pclose) { potE = null; closeInv(); return; }
    if (t.dataset.psl != null) { var s = p.sl[+t.dataset.psl]; if (s) { give(s.id, s.n); p.sl[+t.dataset.psl] = null; } }
    else if (t.dataset.pct) { if (p.cont) { give(p.cont.id, p.cont.n); p.cont = null; } }
    else if (t.dataset.pout) { if (p.out) { give(p.out.id, p.out.n); say('+' + p.out.n + ' ' + ITEMS[p.out.id].name); p.out = null; } }
    else if (t.dataset.padd) { var id = t.dataset.padd; if (count(id) < 1) return; if (p.run) { say('The pot is busy cooking.', true); return; }
      if (id === 'wooden_bowl') { if (p.cont && p.cont.id !== id) return; take(id, 1); p.cont = { id: id, n: (p.cont ? p.cont.n : 0) + 1 }; }
      else { var sl = p.sl.filter(function (s) { return s && s.id === id; })[0]; if (sl) { take(id, 1); sl.n++; } else { var fi = p.sl.indexOf(null); if (fi < 0) { say('All 6 slots are full.', true); return; } take(id, 1); p.sl[fi] = { id: id, n: 1 }; } } SFX.play('click'); }
    else if (t.dataset.pcook) { var r = potMatch(p); if (!r || p.run) return; var f = pickBagFuel(); if (!f) { say('You need fuel (Coal, Charcoal or Wood) in your bag.', true); return; }
      if (p.out && p.out.id !== r.out[0]) { say('Take the finished meal out first.', true); return; }
      take(f, 1); Object.keys(r.ing).forEach(function (k) { var left = r.ing[k]; p.sl.forEach(function (s, i) { if (s && s.id === k && left > 0) { var d = Math.min(s.n, left); s.n -= d; left -= d; if (s.n <= 0) p.sl[i] = null; } }); });
      p.cont.n--; if (p.cont.n <= 0) p.cont = null; p.run = { r: r, t: r.time }; SFX.play('craft'); say('Cooking started.'); }
    renderPot();
  }
  function potTick(dt) { (W.cpots || []).forEach(function (e) { var p = e.pot; if (!p || !p.run || !e.alive) return; if (Math.hypot(P.x - e.x, P.z - e.z) > 14) return; p.run.t -= dt;
    if (p.run.t <= 0) { var o = p.run.r.out; p.out = { id: o[0], n: (p.out ? p.out.n : 0) + o[1] }; p.run = null; say('A meal is ready in the Cooking Pot!'); SFX.play('craft'); if (potE === e) renderPot(); } else if (potE === e && ((p.run.t * 4) | 0) % 4 === 0) renderPot(); }); }
  function openChest(e) {
    if (mp.role === 'client') { say('Chests are not available for guests yet.', true); return; }
    chestE = e; SFX.play('click'); mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; mg = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (er) {} } $('#hud').hidden = true; $('#screen').hidden = true; $('#inv').hidden = false; renderChest();
  }
  function renderChest() {
    var e = chestE; if (!e || !e.alive) { chestE = null; renderInv(); return; }
    var mine = Object.keys(inv).filter(function (id) { return inv[id] > 0 && ITEMS[id]; }), theirs = Object.keys(e.box).filter(function (id) { return e.box[id] > 0; });
    var h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">' + esc(VNAME[e.vt]) + ' (' + chestSlots(e) + '/' + chestCap(e) + ' slots)</h2><button class="btn primary" data-cclose="1">Close</button></div>';
    h += '<div class="box"><h2>Your bag (' + slotsUsed() + '/' + slotCap() + ') — click to store a stack</h2><div class="items">' + (mine.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-cb="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') || '<p class="m" style="color:var(--muted)">Empty.</p>') + '</div></div>';
    h += '<div class="box"><h2>In the chest — click to take a stack</h2><div class="items">' + (theirs.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-cw="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + e.box[id] + '</em></button>'; }).join('') || '<p class="m" style="color:var(--muted)">Empty.</p>') + '</div></div></div>';
    $('#inv').innerHTML = h;
  }
  function craftNow(r) {
    if (r.jobFlag) { var jf = r.jobFlag; if (jobs.indexOf(jf) >= 0 && !jf.half) { jf.left = Math.max(1, jf.left * 0.5); jf.half = true; say('Puzzle solved! The remaining time was cut by 50%.'); SFX.play('craft'); } return; }
    Object.keys(r.cost).forEach(function (k) { if (r.keep && r.keep.indexOf(k) >= 0) return; take(k, r.cost[k]); });
    if (r.chance != null && rnd() >= r.chance) { say('The gravel crumbled to dust. Try again!', true); SFX.play('hit'); return; }
    var oq = r.out[1] + (r.extra && rnd() < r.extra ? 1 : 0); give(r.out[0], oq);
    say((r.st === 'sink' ? 'Washed: ' : 'Crafted ') + ITEMS[r.out[0]].name + (oq > 1 ? ' x' + oq : '')); SFX.play(r.st === 'sink' ? 'wash' : 'craft');
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
    if (k === 'crank') { mg = { r: r, k: 'crank', n: r.puz.n, turns: 0, ang: 0, last: null, msg: '' }; }
    else if (k === 'saw') { mg = { r: r, k: 'saw', ph: Math.random() * 6, pts: [], down: false, msg: '' }; }
    else {
      var n = k === 'img' ? r.puz.n : 5, mask = k === 'img' ? function () { return true; } : MASKS[r.puz.shape], cells = [];
      for (var rr = 0; rr < n; rr++) for (var cc = 0; cc < n; cc++) if (mask(rr, cc)) cells.push([rr, cc]);
      var tiles = cells.map(function (_, i) { return i; }), bl = cells.length - 1; tiles[bl] = -1;
      function nb(i) { var o = []; for (var q = 0; q < cells.length; q++) if (Math.abs(cells[q][0] - cells[i][0]) + Math.abs(cells[q][1] - cells[i][1]) === 1) o.push(q); return o; }
      var steps = (k === 'img' ? (r.tier >= 2 ? 170 : 80) * (r.puz.mult || 1) : 130), prev = -1;
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
  function sawY(x) { if (mg.r.puz.flat) return 90; var d = mg.r.puz.d; return 90 + Math.sin(x / (95 - d * 14) + mg.ph) * (12 + d * 9); }
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
    var r = mg.r, o = ITEMS[r.out[0]], h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">' + o.ic + ' ' + esc(o.name) + (r.tier ? ' &middot; Tier ' + r.tier : '') + '</h2><button class="btn" data-mcancel="1">Give up</button></div><div class="box" style="grid-column:1/-1"><p class="m" style="color:var(--muted)">' + (mp.role === 'solo' ? 'Solo: world time runs at half speed while you work. ' : 'Multiplayer: the world keeps running at full speed! ') + (mg.k === 'crank' ? 'Drag the crank handle in circles (or press Turn crank). Each full circle counts as one turn.' : mg.k === 'saw' ? 'Hold the mouse and draw along the dotted line, from the left red mark to the right one. Small slips are fine; big mistakes ruin the wood.' : 'Slide the pieces into the empty gap to rebuild the picture. Click a piece next to the gap. Giving up costs nothing.') + '</p>';
    if (mg.k === 'crank') h += '<div style="text-align:center"><canvas id="mgc" width="300" height="300" style="max-width:100%;border-radius:50%;cursor:grab;touch-action:none;background:#2a2d33"></canvas><p class="m" style="color:#e3b02a" id="mgturn"></p><button class="btn" id="mgturnbtn">Turn crank</button></div>';
    else if (mg.k === 'saw') h += '<canvas id="mgc" width="520" height="180" style="max-width:100%;border-radius:8px;cursor:crosshair;touch-action:none"></canvas><p class="m" style="color:#e3b02a">' + esc(mg.msg || '') + '</p>';
    else h += '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start"><canvas id="mgc" width="360" height="360" style="max-width:100%;border-radius:8px;cursor:pointer"></canvas><div><div class="m" style="color:var(--muted)">Target picture</div><canvas id="mgp" width="120" height="120" style="border-radius:6px"></canvas></div></div>';
    $('#inv').innerHTML = h + '</div></div>';
    var cv = $('#mgc'); if (mg.k === 'crank') {
      var cg = cv.getContext('2d');
      var drawC = function () { cg.clearRect(0, 0, 300, 300); cg.save(); cg.translate(150, 150); cg.fillStyle = '#4a4f58'; cg.beginPath(); cg.arc(0, 0, 70, 0, 6.3); cg.fill(); cg.rotate(mg.ang); cg.fillStyle = '#9aa0a8'; cg.fillRect(-10, -120, 20, 120); cg.fillStyle = '#c28a3a'; cg.beginPath(); cg.arc(0, -120, 22, 0, 6.3); cg.fill(); cg.restore(); var t = $('#mgturn'); if (t) t.textContent = 'Crank turns: ' + Math.floor(mg.turns) + ' / ' + mg.n; };
      var finish = function () { var r0 = mg.r; mg = null; SFX.play('hit'); setTimeout(function () { SFX.play('craft'); }, 120); if (hasAll(r0) && stationOk(r0)) craftNow(r0); else say('Missing materials.', true); renderInv(); };
      var addAng = function (da) { mg.ang += da; mg.turns += Math.abs(da) / (Math.PI * 2); drawC(); if (mg.turns >= mg.n) finish(); };
      var pa = function (ev) { var b = cv.getBoundingClientRect(); return Math.atan2(ev.clientY - b.top - b.height / 2, ev.clientX - b.left - b.width / 2); };
      cv.onpointerdown = function (ev) { mg.last = pa(ev); try { cv.setPointerCapture(ev.pointerId); } catch (e) { } };
      cv.onpointermove = function (ev) { if (!mg || mg.last == null) return; var a = pa(ev), d = a - mg.last; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; mg.last = a; if (Math.abs(d) < 1) { SFX.play('click'); addAng(d); } };
      cv.onpointerup = function () { if (mg) mg.last = null; };
      $('#mgturnbtn').onclick = function () { SFX.play('click'); addAng(Math.PI / 2); };
      drawC();
    } else if (mg.k === 'saw') {
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

  /* ---- Station crafting UI: one themed screen per station (list + detail panel), fuel slot for heat stations ---- */
  var invTab = 'bag', crSel = null, crScroll = 0, seenRec = {}, fuelSl = { id: null, n: 0 };
  var STIC = { hand: '✋', sawmill: '🪚', furnace: '🔥', campfire: '🏕️', anvil: '🔨', sink: '🚿', turret: '🎯', computer: '💻', milling: '⚙️', bomb: '💣', kiln: '🏺', craft: '🛠️', work: '🧰', press: '🗜️', casing: '🔩', trapb: '🪤', mason: '🧱', blast: '🌋', liquiders: '🧪', shaper: '⚒️', tanker: '🛢️', vbench: '🚗', sewing: '🧵', cutting: '✂️', tablecraft: '🪑', distill: '⚗️', wfilter: '💧', cpot: '🍲' };
  var HEATST = { furnace: 1, campfire: 1, blast: 1, cpot: 1 };
  var FUELIC = ['charcoal', 'coal', 'wood'];
  function crRecs(sn) {
    return WZ.RECIPES.filter(function (r) { if (r.st !== sn || r.pot) return false; if (!stationOk(r)) return false; if (revealed(r)) seenRec[r.id] = 1; return seenRec[r.id]; });
  }
  function crTabs() { var out = []; stnList().forEach(function (sn) { if (crRecs(sn[0]).length || (sn[0] === 'shaper' && jobs.length && stationOk({ st: 'shaper' }))) out.push([sn[0], sn[1]]); }); return out; }
  function crDetail(r) {
    if (!r) return '<div class="cr-hint">Select an item from the list to see its details here.</div>';
    var o = ITEMS[r.out[0]], can = hasAll(r), note = [];
    if (r.dur) note.push('⏳ Takes ' + r.dur + ' s in the background (a solved puzzle cuts the remaining time by 50%)');
    if (r.heat) note.push('🔥 Needs ' + r.heat + ' heat power (burns fuel from the fuel slot)');
    if (r.puz && r.puz.k === 'img') note.push('🧩 Picture puzzle · Tier ' + r.tier + ' (' + r.puz.n + '×' + r.puz.n + ')');
    else if (r.puz && r.puz.k === 'mask') note.push('🧩 Shape puzzle');
    else if (r.puz && r.puz.k === 'saw') note.push('📏 Sawing minigame (a failed cut gives Failed Craft Wood)');
    else if (r.puz && r.puz.k === 'crank') note.push('🔧 Crank minigame: ' + r.puz.n + ' turns');
    else if (r.puz && r.puz.k === 'wire') note.push('🔌 Wire minigame');
    var mats = Object.keys(r.cost).map(function (id) { var have = count(id), need = r.cost[id]; return '<div class="mat ' + (have >= need ? 'ok' : 'no') + '"><b>' + ITEMS[id].ic + '</b><span>' + esc(ITEMS[id].name) + '</span><em>' + have + ' / ' + need + '</em></div>'; }).join('');
    return '<div class="cr-d-l"><div class="cr-big">' + o.ic + '</div><h3>' + esc(r.label || o.name) + (r.out[1] > 1 ? ' ×' + r.out[1] : '') + '</h3><div class="m">' + esc(o.desc || '') + '</div>' + (note.length ? '<div class="cr-note">' + note.join('<br>') + '</div>' : '') + '</div><div class="cr-d-r"><div class="cr-mt">Materials</div><div class="mats">' + mats + '</div><button class="btn cr-go' + (can ? ' primary' : ' lack') + '" data-craft="' + r.id + '">' + (can ? STBTN[r.st] || 'Craft' : 'Missing materials') + '</button></div>';
  }
  function crFuelHtml() {
    var f = fuelSl.id ? ITEMS[fuelSl.id] : null;
    var h = '<div class="cr-fuel"><div class="fs-t">Fuel slot</div><button class="fslot' + (f ? ' on' : '') + '" data-fslot="1" title="Click to take the fuel back">' + (f ? '<b>' + f.ic + '</b><em>' + fuelSl.n + '</em>' : '<span>Empty</span>') + '</button><div class="fs-p"><div class="fs-bar"><i style="width:' + (heatQ.length && heatQ[0].r.heat ? Math.round(heatGot / heatQ[0].r.heat * 100) : 0) + '%"></i></div><small>' + (heatQ.length ? '🔥 Queue: ' + heatQ.length + ' · ' + Math.round(heatGot / heatQ[0].r.heat * 100) + '%' : 'Idle') + (burn.left > 0 ? ' · burning' : '') + '</small></div><div class="fs-pick">';
    FUELIC.forEach(function (id) { if (!ITEMS[id]) return; var have = count(id); h += '<button class="fpick' + (have ? '' : ' no') + '" data-fput="' + id + '" title="' + esc(ITEMS[id].name) + ' · ' + WZ.FUEL[id].t + ' s · power ' + WZ.FUEL[id].p + '">' + ITEMS[id].ic + '<em>' + have + '</em></button>'; });
    return h + '</div></div>';
  }
  function crStationHtml(sn) {
    var nm = (STN0.filter(function (a) { return a[0] === sn; })[0] || [0, sn])[1], rs = crRecs(sn);
    if (crSel && (!rs.some(function (r) { return r.id === crSel; }))) crSel = null;
    var sr = rs.filter(function (r) { return r.id === crSel; })[0];
    var h = '<div class="cr-wrap st-' + sn + '"><div class="cr-head"><span class="cr-ic">' + (STIC[sn] || '⚙️') + '</span><div><b>' + esc(nm) + '</b><small>' + (HEATST[sn] ? 'Put fuel in the slot, pick a recipe and start smelting.' : 'Choose a recipe, check the materials, then craft.') + '</small></div></div>';
    if (HEATST[sn]) h += crFuelHtml();
    h += '<div class="cr-list' + (crSel ? ' half' : '') + '">';
    rs.forEach(function (r) { var o = ITEMS[r.out[0]], can = hasAll(r); h += '<button class="cr-row' + (can ? '' : ' lack') + (r.id === crSel ? ' sel' : '') + '" data-crsel="' + r.id + '"><b>' + o.ic + '</b><span>' + esc(r.label || o.name) + (r.out[1] > 1 ? ' ×' + r.out[1] : '') + '</span><small>' + Object.keys(r.cost).map(function (id) { return '<i class="' + (count(id) >= r.cost[id] ? 'ok' : 'no') + '">' + ITEMS[id].ic + r.cost[id] + '</i>'; }).join('') + '</small></button>'; });
    if (sn === 'shaper') h += jobsHtml();
    h += '</div>';
    h += '<div class="cr-det' + (crSel ? ' open' : '') + '" id="crDet">' + (crSel ? crDetail(sr) : '') + '</div></div>';
    return h;
  }
  var lastTab = '', scr0 = [], scrOuter = 0;
  function keepScroll() { var bs = document.querySelectorAll('#inv .box'); for (var i = 0; i < bs.length; i++) bs[i].scrollTop = scr0[i] || 0; $('#inv').scrollTop = scrOuter; lastTab = invTab; }
  function renderInv() {
    if (lastTab === invTab && !godE && !wire && !mg) { scr0 = [].map.call(document.querySelectorAll('#inv .box'), function (e) { return e.scrollTop; }); scrOuter = $('#inv').scrollTop; } else { scr0 = []; scrOuter = 0; }
    if (godE) { renderGod(); return; }
    if (wire) { renderWireGame(); return; }
    if (mg) { renderMg(); return; }
    var ids = Object.keys(inv).filter(function (id) { return inv[id] > 0 && ITEMS[id]; });
    var ast = armorStats(), slots = [['head', 'Head'], ['chest', 'Chest'], ['legs', 'Legs'], ['boots', 'Boots']];
    var buffs = ['DEF: ' + ast.def];
    if (ast.woodN > 0) buffs.push('Wood (' + ast.woodN + '/4): Speed +' + (ast.woodN * 3) + '%, Energy & Comfort saving ' + (ast.woodN * 6) + '%');
    if (ast.ironN > 0) buffs.push('Iron (' + ast.ironN + '/4): Max HP ' + ast.hpMax + ', Melee +' + (ast.ironN * 6) + '%');
    if (ast.bucket) buffs.push('Iron Bucket: Water Poison chance halved');

    var tabs = crTabs(); if (invTab !== 'bag' && !tabs.some(function (t) { return t[0] === invTab; })) invTab = 'bag';
    var h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">' + (invTab === 'bag' ? 'Bag &amp; Gear' : 'Crafting') + '</h2><div class="tabs"><button class="tab' + (invTab === 'bag' ? ' on' : '') + '" data-tab="bag">🎒 Bag</button>' + tabs.map(function (t) { return '<button class="tab' + (invTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + (STIC[t[0]] || '⚙️') + ' ' + esc(t[1]) + '</button>'; }).join('') + '</div><div class="row" style="display:flex;gap:8px"><button class="btn primary" id="bBack">Back (Tab)</button></div></div>';
    if (invTab !== 'bag') { h += crStationHtml(invTab) + '</div>'; $('#inv').innerHTML = h; $('#bBack').onclick = closeInv; var cl = $('#inv .cr-list'); if (cl) cl.scrollTop = crScroll; lastTab = invTab; return; }
    h += '<div class="bag-grid"><div class="box"><h2>Worn Armor (Click to remove)</h2><div class="eq-row">';
    slots.forEach(function (sl) { var id = equip[sl[0]], it = id ? ITEMS[id] : null; h += '<button class="eq-slot' + (it ? ' on' : '') + '" data-eq="' + sl[0] + '"><b>' + (it ? it.ic : '▫') + '</b><span>' + (it ? esc(it.name) : sl[1]) + '</span><small>' + (it ? 'DEF +' + it.def : 'Empty') + '</small></button>'; });
    h += '</div><h2>Accessories (Click to remove)</h2><div class="eq-row">';
    for (var ai = 0; ai < 4; ai++) { var aid = acc[ai], ait = aid ? ITEMS[aid] : null; h += '<button class="eq-slot' + (ait ? ' on' : '') + '" data-acc="' + ai + '"><b>' + (ait ? ait.ic : '▫') + '</b><span>' + (ait ? esc(ait.name) : 'Accessory ' + (ai + 1)) + '</span><small>' + (ait ? 'Equipped' : 'Empty') + '</small></button>'; }
    h += '</div><div class="eq-buff">' + esc(buffs.join(' · ')) + '</div><h2>Hotbar</h2><div class="hb">';
    for (var i = 0; i < 8; i++) { var hid = hot[i] || (i === 0 ? 'fists' : null); h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-slot="' + i + '"><small>' + (i + 1) + '</small>' + (hid ? ITEMS[hid].ic : '') + '</div>'; }
    h += '</div><p class="m" style="color:var(--muted);font-size:.8rem;margin:0 0 10px">Click a hotbar slot, then click an item to assign it (armor and accessories equip directly).</p></div><div class="box"><h2>Items (' + slotsUsed() + '/' + slotCap() + ' slots)</h2>';
    h += ids.length ? '<div class="items">' + ids.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-item="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') + '</div>' : '<p class="m" style="color:var(--muted)">Your bag is empty.</p>';
    h += '<div class="detail" id="detail">' + detailHtml(selItem) + '</div></div></div></div>';
    $('#inv').innerHTML = h; $('#bBack').onclick = closeInv; keepScroll();
  }
  document.addEventListener('click', function (ev) {
    if (mode !== 'inv') return; var t = ev.target.closest('[data-tab],[data-crsel],[data-fslot],[data-fput],[data-item],[data-slot],[data-craft],[data-jpz],[data-eq],[data-acc],[data-wl],[data-wr],[data-wcancel],[data-mcancel],[data-cb],[data-cw],[data-cclose],[data-pclose],[data-psl],[data-pct],[data-pout],[data-padd],[data-pcook],[data-bless],[data-gclose]'); if (!t) return;
    if (t.dataset.tab) { invTab = t.dataset.tab; crSel = null; crScroll = 0; SFX.play('click'); renderInv(); return; }
    if (t.dataset.crsel) { crSel = t.dataset.crsel; SFX.play('click'); var cl0 = $('#inv .cr-list'); if (cl0) crScroll = cl0.scrollTop; renderInv(); return; }
    if (t.dataset.fslot) { if (fuelSl.id) { give(fuelSl.id, fuelSl.n); fuelSl.id = null; fuelSl.n = 0; SFX.play('click'); renderInv(); } return; }
    if (t.dataset.fput) { var fid = t.dataset.fput, fn = count(fid); if (fn <= 0) { say('You have no ' + ITEMS[fid].name + '.', true); return; } if (fuelSl.id && fuelSl.id !== fid) { give(fuelSl.id, fuelSl.n); fuelSl.id = null; fuelSl.n = 0; } take(fid, fn); fuelSl.id = fid; fuelSl.n += fn; SFX.play('click'); renderInv(); return; }
    if (potE && (t.dataset.pclose || t.dataset.psl != null || t.dataset.pct || t.dataset.pout || t.dataset.padd || t.dataset.pcook)) { potClick(t); return; }
    if (t.dataset.gclose) { godE = null; closeInv(); return; }
    if (t.dataset.bless) { var ge = godE; if (!ge) return; var bk = t.dataset.bless; if (bk === 'unl' && !(ge.cdU > 0)) { unl.armed = true; ge.cdU = 600; say('Blessing of Unlethal received. It triggers once when a blow would kill you.'); } else if (bk === 'weak' && !(ge.cdW > 0)) { ge.weakT = 120; ge.cdW = 300; say('Zombie Weaks: zombies near the statue are weaker for 2 minutes.'); } else if (bk === 'foot' && !(ge.cdF > 0)) { ge.footT = 120; ge.cdF = 240; say('Zombie Weak Foot: zombies near the statue are slower for 2 minutes.'); } SFX.play('craft'); renderGod(); return; }
    if (t.dataset.cclose) { chestE = null; closeInv(); return; }
    if (t.dataset.cb) { var ci = t.dataset.cb, cn = Math.min(inv[ci] || 0, WZ.maxStack(ci), chestRoom(chestE, ci)); if (cn <= 0) { say('The chest is full.', true); return; } takeRaw(ci, cn); chestE.box[ci] = (chestE.box[ci] || 0) + cn; SFX.play('click'); renderChest(); return; }
    if (t.dataset.cw) { var wi = t.dataset.cw, wn = Math.min(chestE.box[wi] || 0, WZ.maxStack(wi), roomFor(wi)); if (wn <= 0) { say('Your bag is full.', true); return; } chestE.box[wi] -= wn; if (chestE.box[wi] <= 0) delete chestE.box[wi]; give(wi, wn); SFX.play('click'); renderChest(); return; }
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
    if (t.dataset.jpz != null) { var jj = jobs[+t.dataset.jpz], jr = jj && jobRec(jj); if (jr && !jj.half && stationOk(jr)) { var r2 = {}; for (var kk in jr) r2[kk] = jr[kk]; r2.cost = {}; r2.dur = null; r2.jobFlag = jj; startMg(r2); } return; }
    if (t.dataset.craft) {
      var r = WZ.RECIPES.filter(function (x) { return x.id === t.dataset.craft; })[0];
      if (!r || !stationOk(r)) return; if (!hasAll(r)) { say('Not enough materials (marked red).', true); return; }
      if (r.dur) { startJob(r); renderInv(); return; }
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
    drain(); T += dt * (rest && rest.k === 'sleep' ? (rest.clean ? 3 : 2) : 1); /* sleeping: clean bed = time x3, shabby bed = time x2 */ swingCd -= dt; gunTick(dt); potTick(dt); jobTick(dt); if (seat && dead) seatOut('You left the vehicle.'); vehTick(dt); pumpTick(dt); smokeTick(dt); if (seat) seatPose(seat); else stepPlayer(dt); stats(dt); if (dead) return;
    if (lmb && !manning) { var it = curItem(); if (it.type === 'tool' && swingCd <= 0) swing(); }
    godTick(dt); seaTick(dt); poolTick(dt); farmTick(dt); hoeTick(dt); tableTick(); lampTick(); ugCd -= dt; if (W.ug) { if (!inUG(P.x)) { if (ugCd <= 0 && Math.hypot(P.x - W.mine.door.x, P.z - W.mine.door.z) < 1.5 && P.y < 1.5) enterUG(); else if (ugCd <= 0 && W.caves) { for (var cvi = 0; cvi < W.caves.length; cvi++) { var cv = W.caves[cvi]; if (Math.hypot(P.x - cv.door.x, P.z - cv.door.z) < 1.6 && Math.abs(P.y - cv.y) < 2.5) { enterUG(cv); break; } } } } else if (ugCd <= 0) { var uli = ugLayer(P.x), UL = W.ugL[uli]; if (Math.hypot(P.x - UL.exit.x, P.z - UL.exit.z) < 1.8) { if (uli === 0) exitUG(); else ugMove(uli - 1, true); } else if (UL.down && Math.hypot(P.x - UL.down.x, P.z - UL.down.z) < 1.8) { if (ugMax >= LAYER_NEED[uli + 1]) ugMove(uli + 1, false); else { ugCd = 3; say('The shaft is blocked by rubble. Only the Mineshaft or Mountain Cave lead deeper.'); } } } trapTick(dt); }
    var nd = clk.hour < 5.5 ? clk.day - 1 : clk.day, bo = clk.night && bloodFlag(nd);
    if (bo && !bloodOn && bmAnn !== nd) { bmAnn = nd; say('The BLOOD MOON rises! Zombies spawn twice as fast.', true); } bloodOn = !!bo;
    if (mp.role !== 'client') { var ep = epochOf(T); if (ep !== epoch) { epoch = ep; var sd = curSeed(baseSeed, ep); W.resetWorld(sd, true); while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1; if (mp.role === 'host') Net.send({ t: 'refresh', seed: sd, ep: ep }); say('10 days passed: loot, ore, trees, rocks and cars respawned in new places!', true); } }
    eatTick(dt); fishTick(dt); heatTick(dt); manualTick(dt); fuseTick(dt); if (mp.role !== 'client') { turretTick(dt); bleedTick(dt); } if (torchOn && !hasFlash() && !ugOn) { torchOn = false; } zombieLogic(dt, clk.night); stepPeers(dt); networkTick(nowMs);
    if (T - respawnCheck > 1) { respawnCheck = T; respawnWorld(); }
  }
  function hud() {
    renderStats(); drawMini();
    var h = mode === 'play' && !seat ? aim(3.6) : null, txt = '', cross = $('#cross'); cross.className = '';
    var cp = mode === 'play' ? nearCorpse(2.6) : null;
    if (cp) txt = (cp.name === 'Dropped Items' || cp.name === 'Turret Scraps') ? '[E] Pick up ' + cp.name : cp.mine ? '[E] Loot your corpse' : cp.name + '\'s corpse';
    else if (h) {
      if (h.kind === 'zombie') { cross.className = 'on-zombie'; txt = h.z.def.name + '  HP ' + Math.max(0, Math.round(h.z.hp)) + '/' + h.z.mhp + (h.z.def.def ? '  DEF ' + h.z.def.def : ''); }
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
          else if (e.k === 'table') txt = 'Table' + hpTxt + (e.on ? (e.on === 'cutting_board' ? ' · [E] Cut food · Shift+[E] Take board' : ' · [E] Take ' + ITEMS[e.on].name) : ' · [E] Put held item on top') + ' · Left Click: Dismantle';
          else if (e.k === 'seat' || e.k === 'sofa') txt = (e.comfy ? 'Sofa' : 'Chair') + hpTxt + ' · [E] Sit · Left Click: Dismantle';
          else if (e.k === 'lamp') txt = 'Bulb Lamp' + hpTxt + ' · Left Click: Dismantle';
          else if (e.k === 'godstatue') txt = 'Statue of God' + hpTxt + ' · [E] Blessing · Left Click: Dismantle';
          else if (e.k === 'farm') txt = (e.farm[1]) + ': ' + farmStatus(e) + ' · [E]';
        else if (e.k === 'milling' || e.k === 'bomb' || e.k === 'kiln' || e.k === 'craft' || e.k === 'work' || e.k === 'press' || e.k === 'casing' || e.k === 'trapb' || e.k === 'mason' || e.k === 'blast' || e.k === 'liquiders' || e.k === 'sewing' || e.k === 'gstation') txt = VNAME[bv ? bv.t : 16] + hpTxt + ' · [E] Open · Left Click: Dismantle';
          else if (e.k === 'chest') txt = VNAME[e.vt] + hpTxt + ' · ' + chestSlots(e) + '/' + ITEMS[VITEM[e.vt]].chest + ' slots · [E] Open · Left Click: Dismantle';
          else if (e.k === 'turret') { var tc = tcfg(e); txt = VNAME[e.vt] + hpTxt + ' · Ammo ' + e.ammo + '/' + tc.cap + (e.vt === 15 ? (manning === e ? ' · [E] Leave · Left Click: Fire' : ' · [E] Man the cannon') : ' · [E] Load cannon balls') + ' · Left Click: Dismantle'; }
          else if (e.k === 'sink') { var hid = hot[sel]; txt = (hid && ITEMS[hid] && /^dirty_/.test(hid)) ? 'Sink' + hpTxt + ' · [E] Wash Now · Left Click: Dismantle' : 'Sink' + hpTxt + ' · [E] Open Sink · Left Click: Dismantle'; }
        }
        else if (e.k === 'pile') { var wtL = worldTier(clockInfo(T).day), effT = e.bush ? 1 : e.tier === 4 ? (wtL >= 4 ? 4 : wtL >= 2 ? 2 : 1) : (e.tier === 2 && wtL >= 2 ? 2 : 1); txt = e.searched ? (e.tier === 4 ? 'Table already searched' : e.bush ? 'Bush already searched' : 'Trash already searched') : (e.tier === 4 ? '[E] Search Above Table (Tier ' + effT + ')' : e.bush ? '[E] Search Bush (Tier 1)' : '[E] Search trash (Tier ' + effT + ')'); }
        else if (e.k === 'crate') { var effC = Math.max(1, Math.min(e.tier || 1, worldTier(clockInfo(T).day), 5)); txt = e.searched ? 'Empty crate' : '[E] Open ' + (effC < 2 ? 'wooden' : 'iron') + ' crate (Tier ' + effC + ')'; }
        else if (e.k === 'bed') txt = e.clean ? '[E] Sleep in the clean bed' : '[E] Sleep in the shabby bed';
        else if (e.k === 'couch') txt = e.clean ? '[E] Sit on the clean couch' : 'Dirty couch (does not restore Comfort)';
        else if (e.k === 'car') txt = !e.alive ? '' : e.burnt ? 'Burnt wreck · a Smasher Machine (coming soon) will clear it' : e.own ? vcfg(e).name + ' · Break Points ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + ' · Fuel ' + e.vs.fuel.toFixed(1) + ' L · ' + (e.vs.door ? '[E] Sit in the driver seat · Left Click: Close the door' : '[E] Open the door') : (e.truck ? 'Abandoned Truck · Break Points ' : 'Abandoned Car · Break Points ') + Math.max(0, Math.round(e.hp)) + '/' + e.max + ' · cannot be driven · ' + (e.truck ? 'Left Click: Break open the cargo' : 'Left Click: Break open the trunk');
        else if (e.k === 'pump') txt = 'Fuel Pump Station · ' + (e.fuel === 'diesel' ? 'Diesel' : 'Gasoline') + ' ' + e.L.toFixed(1) + ' L · [E] Refuel a vehicle';
        else if (e.k === 'tank') txt = e.tk.name + ' · ' + (e.tkL ? e.tkL + '/' + e.tk.cap + ' L ' + WZ.LIQ[e.tkLiq][0] : 'empty 0/' + e.tk.cap + ' L') + ' · [E] Pour in / take out with a bucket · Left Click: Dismantle';
        else if (e.k === 'tree') txt = 'Tree  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'axe' ? '' : '  (needs an axe)');
        else if (e.k === 'rock') txt = (ROCKNAME[e.kind] || (e.ore ? 'Iron Ore' : e.gold ? 'Gold Ore' : e.zinc ? 'Zinc Ore' : e.copper ? 'Copper Ore' : e.coal ? 'Coal' : 'Stone')) + '  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'pick' ? '' : '  (needs a pickaxe)');
      }
    }
    if (!txt && mode === 'play' && (hot[sel] === 'iron_bucket' || hot[sel] === 'titanium_bucket')) { var sct = scoopTarget(); if (sct) txt = sct === 'lava' && hot[sel] === 'iron_bucket' ? 'Iron Buckets melt in Lava (use a Titanium Bucket)' : '[E] Fill bucket: ' + WZ.LIQ[sct][0]; }
    if (!txt && mode === 'play' && curItem().tool === 'rod' && !fish) { var wq = aimWater(15); if (wq) txt = wq.type === 'river' ? 'River (fishing coming soon)' : 'Lake · Left Click: Cast line'; }
    $('#prompt').textContent = txt;
  }
  function afterSoftwareDraw(cb) {
    var gl = renderer && renderer.getContext ? renderer.getContext() : null;
    if (gl && typeof gl.fenceSync === 'function') {
      var sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      var poll = function () {
        var state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          setTimeout(function () { requestAnimationFrame(cb); }, 80);
        }
      };
      setTimeout(poll, 6);
    } else {
      if (gl && typeof gl.finish === 'function') gl.finish();
      setTimeout(function () { requestAnimationFrame(cb); }, 90);
    }
  }
  function scheduleNextFrame() {
    if (window.__wzSoftwareGl) {
      afterSoftwareDraw(frame);
    } else {
      requestAnimationFrame(frame);
    }
  }
  function frame(ms) {
    var dt = Math.min(0.05, (ms - clock.last) / 1000); clock.last = ms;
    if (dt > 0) {
      fpsAcc += dt; fpsN++; if (fpsAcc >= 0.5) { fpsVal = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; var fe = $('#fps'); if (fe) fe.textContent = fpsVal + ' FPS'; if (dbgOn) renderDebug(); }
      for (var ti = tracers.length - 1; ti >= 0; ti--) { tracers[ti].t -= dt; if (tracers[ti].t <= 0) { scene.remove(tracers[ti].m); tracers.splice(ti, 1); } }
      if (virus.length) stepVirus(dt); if (shots.length) stepShots(dt); if (boomFx.length) stepBoomFx(dt);
      var clk = clockInfo(T);
      var eye = P.y + (rest ? (rest.k === 'sleep' ? 0.55 : 1.0) : 1.62);
      var underwater = !ugOn && W.seaAt && W.seaAt(P.x, P.z) && eye < -0.15;
      SFX.setNight(clk.hour, underwater);
      SFX.setSurface(underwater ? 'sea' : (ugOn ? 'rock' : W.biomeOf(P.x, P.z)));
      if (clk.night && !autoTorchDone && mode === 'play') { autoTorchDone = true; if (!torchOn && hasFlash()) { torchOn = true; say('It is night — the flashlight turned on automatically [F].'); } }
      else if (!clk.night) autoTorchDone = false;

      if (mode === 'play') { update(dt, ms, clk); if (ms - lastHud > 100) { lastHud = ms; hud(); } }
      else if (mode === 'menu') { P.yaw += dt * 0.08; networkTick(ms); }
      else if (mode === 'dash') { update(dt, ms, clk); }
      else if (mode === 'inv' && mg && mp.role === 'solo') { update(dt * 0.5, ms, clk); }
      else if (mp.role !== 'solo') { stepPeers(dt); networkTick(ms); }

      if (gfx.smap && !ugOn && !window.__wzSoftwareGl) { smT -= dt; if (smT <= 0) { smT = 3; W.sunDirty = true; renderer.shadowMap.needsUpdate = true; } }
      W.updateSky(clk.hour, P.x, P.z); fxTick(dt, clk); grassTick(dt);
      if (bloodOn && !ugOn) { scene.background.lerp(BM_COL, 0.5); scene.fog.color.lerp(BM_COL, 0.5); }
      if (ugOn) { scene.fog.near = 2; scene.fog.far = 44; }
      if (bmEl) bmEl.style.opacity = bloodOn ? 1 : 0;
      if (W.leafU) W.leafU.uTime.value += dt;
      chunkT -= dt; if (chunkT <= 0) { chunkT = 0.1; W.updateChunks(P.x, P.z, -Math.sin(P.yaw), -Math.cos(P.yaw), gfx.rd, gfx.cull); }
      updateWater(dt);
      camera.position.set(P.x, eye, P.z); camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); tickVM(dt, rest);
      if (vmSun && W.sun) { vmSun.color.copy(W.sun.color); vmSun.intensity = Math.max(0.45, W.sun.intensity * 0.9); }
      if (vmHemi && W.hemi) { vmHemi.color.copy(W.hemi.color); vmHemi.groundColor.copy(W.hemi.groundColor); vmHemi.intensity = Math.max(0.55, W.hemi.intensity); }
      if (torch) { camera.getWorldDirection(DIR); torch.position.set(P.x + DIR.x * 0.6, eye, P.z + DIR.z * 0.6); torch.intensity = torchOn ? 1.55 : 0; }
      renderFrame();
    }
    scheduleNextFrame();
  }

  function createSafeRenderer(canvas) {
    var tries = [{ canvas: canvas, antialias: false, powerPreference: 'default', alpha: false }, { canvas: canvas, antialias: false, failIfMajorPerformanceCaveat: false }];
    for (var i = 0; i < tries.length; i++) { try { var r = new THREE.WebGLRenderer(tries[i]); if (r && r.getContext()) return r; } catch (e) {} }
    return null;
  }
  function buildEnvMap() {
    try {
      var cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
      var ctx = cv.getContext('2d');
      var gr = ctx.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0.0, '#78b4eb');
      gr.addColorStop(0.46, '#b8d7f0');
      gr.addColorStop(0.50, '#d8cfb8');
      gr.addColorStop(0.55, '#594e3f');
      gr.addColorStop(1.0, '#2a251e');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 128);
      var envTex = new THREE.CanvasTexture(cv);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      if ('sRGBEncoding' in THREE) envTex.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer);
      pm.compileEquirectangularShader();
      var rt = pm.fromEquirectangular(envTex);
      envTex.dispose(); pm.dispose();
      return rt.texture;
    } catch (e) { return null; }
  }
  function initThree() {
    var canvas = $('#gl'); renderer = createSafeRenderer(canvas);
    if (!renderer) throw new Error('Your browser or graphics card does not support WebGL.');
    var glCtx = renderer.getContext();
    try {
      var dbg = glCtx.getExtension('WEBGL_debug_renderer_info');
      var rName = dbg ? String(glCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      window.__wzSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rName);
    } catch (e) { window.__wzSoftwareGl = false; }
    renderer.setPixelRatio(window.__wzSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
    if ('sRGBEncoding' in THREE && 'outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    else if ('SRGBColorSpace' in THREE && 'outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if ('ACESFilmicToneMapping' in THREE) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = gfx.exposure || 1.05;
    }
    renderer.autoClear = false;
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); if (mode === 'play') showPause(); say('Graphics lost, recovering...', true); });
    canvas.addEventListener('webglcontextrestored', function () { say('Graphics restored!'); });

    scene = new THREE.Scene();
    var envMap = buildEnvMap();
    if (envMap) scene.environment = envMap;
    camera = new THREE.PerspectiveCamera(75, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 300);
    var maxAniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
    W = WZ.createWorld(THREE, scene, maxAniso);
    torch = new THREE.PointLight(0xffeec2, 0, 26, 1.3);
    scene.add(torch); scene.add(camera); buildVM(); baseSeed = W.seed;
    lampL = [0, 1, 2].map(function () { var l = new THREE.PointLight(0xffd79a, 0, 13, 1.6); scene.add(l); return l; });
    bmEl = document.createElement('div'); bmEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.5s;background:radial-gradient(ellipse at center,rgba(120,0,0,0) 38%,rgba(150,10,10,.55) 100%)'; $('#hud').appendChild(bmEl);
    applyGfx();

    window.addEventListener('resize', function () {
      var w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (vmCam) { vmCam.aspect = w / h; vmCam.updateProjectionMatrix(); }
    });
    mini = $('#mini'); mctx = mini ? mini.getContext('2d') : null;
    $('#bTryLock').onclick = function () { lock(false); };
    window.addEventListener('beforeunload', function () { leaveRoom(); });
  }
  function boot() {
    try {
      if (!window.THREE) throw new Error('Three.js has not loaded.');
      initThree(); newPlayerState(0); renderHotbar(); renderStats();
      clock.last = performance.now(); scheduleNextFrame(); mode = 'menu'; authGate();
    } catch (e) {
      screen('<div class="card"><h1><b>Webzombite</b></h1><p>Could not start the 3D view.</p><pre style="white-space:pre-wrap;font-size:12px;opacity:.85">' + esc(e && e.message ? e.message : e) + '</pre><div class="row"><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    }
  }
  window.WZ.debug = function () { return { placeVeh: function (k, x, z, a) { var c = W.addOwnedCar(k, x, z, a, 0x4f6b52); c.max = c.hp = vcfg(c).hp; c.vs.fuelT = vcfg(c).fuelT; c.vs.fuel = 10; return c; }, seatIn: seatIn, carUse: carUse, carKey: carKey, openDash: openDash, closeDash: closeDash, seatState: function () { return seat ? seat.vs : null; }, pumpUse: pumpUse, startFill: startFill, setCrank: function (b) { crankHold = b; }, tankUse: tankUse, jobs: function () { return jobs; }, startJob: startJob, openPot: openPot, potTick: potTick, gunState: function () { return [gunRel, gunRelMax, gunPend, gunClip, sel]; }, give: give, farmUse: farmUse, farmTick: farmTick, setHot: function (i, id) { hot[i] = id; sel = i; }, getInv: function () { return inv; }, creativeToggle: creativeToggle, makeZombie: makeZombie, zombiesList: function () { return zombies; }, eatTick: eatTick, explodeAt: explodeAt, setBleed: setBleed, bleedTick: bleedTick, throwBomb: throwBomb, tntLocal: tntLocal, fuseTick: fuseTick, openChest: openChest, chestE: function () { return chestE; }, renderChest: renderChest, applySearchEnt: applySearchEnt, openMysteryBox: openMysteryBox, status: status, roomFor: roomFor, count: count, takeRaw: takeRaw, openInv: openInv, closeInv: closeInv, renderInv: renderInv, recipesHtml: recipesHtml, revealed: revealed, startMg: startMg, mgs: function () { return mg; }, mgSolved: mgSolved, drawMg: drawMg, heatQ: function () { return heatQ; }, queueHeat: queueHeat, heatTick: heatTick, loadTurret: loadTurret, turretTick: turretTick, turretAt: turretAt, toggleManning: toggleManning, manualTick: manualTick, damageVoxLocal: damageVoxLocal, slotsUsed: slotsUsed, slotCap: slotCap, corpses: corpses, sawEval: sawEval, craftNow: craftNow, interact: interact, setLmb: function (v) { lmb = v; }, snapshot: snapshot, showPause: showPause, gfx: gfx, applyGfx: applyGfx, dorm: dorm, DU: DU, DF: DF, dAdd: dAdd, dormTick: dormTick, hydrate: hydrate, placeZombie: placeZombie, spawnZombie: spawnZombie, enterUG: enterUG, exitUG: exitUG, awardKill: awardKill, coins: function () { return coins; }, bf: bf, tier: function () { return worldTier(clockInfo(T).day); }, bloodFlag: bloodFlag, applyCarHit: applyCarHit, killZombie: killZombie, stepZombie: stepZombie, scene: scene, renderer: renderer, camera: camera, P: P, zombies: zombies, inv: inv, equip: equip, acc: acc, W: W, mp: mp, status: status, give: give, makeZombie: makeZombie, curItem: curItem, setSel: function (i) { sel = i; renderHotbar(); }, setT: function (v) { T = v; }, hot: hot, T: function () { return T; }, mode: function () { return mode; }, die: die, startFish: startFish, aimWater: aimWater }; };
  window.WZ.started = true;
  boot();
})();
/* end game.js */
