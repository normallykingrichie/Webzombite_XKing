/* game.js - Webzombite */
(function () {
  'use strict';
  var WZ = window.WZ, ITEMS = WZ.ITEMS, ZDEF = WZ.ZOMBIES, ZTYPES = WZ.ZTYPE_LIST, C = window.WZ_CONFIG || {};
  var Net = WZ.Net, THREE = window.THREE, MAX_PLAYERS = C.maxPlayers || 4;
  var SFX = WZ.Sound || { unlock: function () {}, play: function () {}, setNight: function () {}, toggleMute: function () { return false; }, isMuted: function () { return false; } };
  var DAY_LEN = 480, START_HOUR = 7;

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
  var zombies = [], zMap = Object.create(null), nextZid = 1;
  var keys = {}, lmb = false, swingCd = 0, eatT = 0, spawnT = 3, stepT = 0, groanT = 4, voxVer = 0, cache = { ver: -1, list: [] };
  var mode = 'boot', selItem = null, lastHud = 0, respawnCheck = 0, fallbackLook = false, playerName = 'Survivor';

  function freshStatus() { return { poison: 0, stomach: 0, wpoison: 0, keylock: 0 }; }
  var acc = [null, null, null, null], corpses = [], cooking = [], fish = null, bobber = null, tracers = [], virus = [], mineT = 5, sb = null, userId = null, userName = '', fpsAcc = 0, fpsN = 0, fpsVal = 0, dbgOn = false;
  var mp = { role: 'solo', room: '', slot: 0, online: false, peers: Object.create(null), lastHostSeen: 0, lastPoseSent: 0, lastZSent: 0, swingPulse: 0, joinTimer: null };
  var SLOT_COLS = [0xe3b02a, 0x3b82f6, 0x22c55e, 0xec4899], SLOT_HEX = ['#e3b02a', '#3b82f6', '#22c55e', '#ec4899'];

  function armorStats() {
    var def = 0, woodN = 0, ironN = 0, bucket = false, slots = ['head', 'chest', 'legs', 'boots'];
    for (var i = 0; i < slots.length; i++) {
      var it = ITEMS[equip[slots[i]]];
      if (!it || it.type !== 'armor') continue;
      def += it.def || 0;
      if (it.tier === 'wood') woodN++; else if (it.tier === 'iron') ironN++; else if (it.tier === 'bucket') bucket = true;
    }
    return { def: def, woodN: woodN, ironN: ironN, bucket: bucket, spdBonus: 1 + woodN * 0.03, energyDrain: 1 - woodN * 0.06, comfortDrain: 1 - woodN * 0.06, hpMax: 100 + ironN * 5, dmgMult: 1 + ironN * 0.06, poisonResist: 1, wpResist: bucket ? 0.5 : 1 };
  }
  function accStats() {
    var o = { watch: 0, radar: false, gps: false };
    for (var i = 0; i < acc.length; i++) { var id = acc[i]; if (id === 'iron_watch') o.watch = Math.max(o.watch, 1); else if (id === 'golden_watch') o.watch = 2; else if (id === 'radar') o.radar = true; else if (id === 'gps') o.gps = true; }
    return o;
  }

  /* ---------------- Save & load code ---------------- */
  var te = new TextEncoder(), td = new TextDecoder();
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('000000' + (h >>> 0).toString(16)).slice(-6);
  }
  function b64e(bytes) {
    var bin = '', ch = 0x8000;
    for (var i = 0; i < bytes.length; i += ch) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + ch));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function snapshot(worldOnly) {
    if (cache.ver !== voxVer) { cache.list = W.voxList(); cache.ver = voxVer; }
    var o = { v: 2, sd: W.seed, t: Math.round(T * 10) / 10, b: cache.list, tr: [], rk: [], pl: [], cr: [] };
    W.trees.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.tr.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.rocks.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.rk.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.piles.forEach(function (p, i) { if (p.searched) o.pl.push([i, Math.round(p.respawn)]); });
    W.crates.forEach(function (p, i) { if (p.searched) o.cr.push([i, Math.round(p.respawn)]); });
    if (!worldOnly) {
      o.k = kills; o.p = [r2(P.x), r2(P.y), r2(P.z), Math.round(P.yaw * 1000) / 1000, Math.round(P.pitch * 1000) / 1000];
      o.s = [Math.round(P.hp), Math.round(P.hunger), Math.round(P.thirst), Math.round(P.energy), Math.round(P.comfort), Math.round(status.poison * 10) / 10, Math.round(status.stomach * 10) / 10, Math.round(status.wpoison * 10) / 10];
      o.i = inv; o.h = hot; o.l = sel; o.eq = equip; o.ac = acc; o.co = corpses.filter(function (c) { return c.mine; }).map(function (c) { return [r2(c.x), r2(c.z), c.loot]; });
    }
    return o;
  }
  function encodeSaveCode() { var b = b64e(te.encode(JSON.stringify(snapshot(false)))); return 'WZL1:' + b + '.' + fnv1a(b); }
  function decodeSaveCode(raw) {
    var s = String(raw || '').trim().replace(/\s+/g, '');
    if (s.indexOf('WZL1:') !== 0) return { err: 'Wrong format. A save code must start with "WZL1:".' };
    var restStr = s.slice(5), dot = restStr.lastIndexOf('.');
    if (dot <= 0) return { err: 'The save code is damaged or incomplete.' };
    var b64 = restStr.slice(0, dot), chk = restStr.slice(dot + 1).toLowerCase();
    if (fnv1a(b64) !== chk) return { err: 'The save code does not match (characters missing or changed).' };
    try {
      var obj = JSON.parse(td.decode(b64d(b64)));
      if (!obj || (obj.v !== 1 && obj.v !== 2) || !Array.isArray(obj.p) || typeof obj.i !== 'object') return { err: 'The save code structure is not recognized.' };
      return { data: obj };
    } catch (e) { return { err: 'Could not read the save code.' }; }
  }
  function applySave(s, worldOnly) {
    if (!s || (s.v !== 1 && s.v !== 2)) return false;
    W.resetWorld(s.sd != null ? s.sd : 20261116); T = s.t || 0; W.voxLoad(s.b || [], s.v || 1); voxVer++;
    (s.tr || []).forEach(function (a) { var t = W.trees[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setTree(t, false); });
    (s.rk || []).forEach(function (a) { var t = W.rocks[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setRock(t, false); });
    (s.pl || []).forEach(function (a) { var p = W.piles[a[0]]; if (p) { W.setPile(p, false); p.respawn = a[1]; } });
    (s.cr || []).forEach(function (a) { var p = W.crates[a[0]]; if (p) { W.setCrate(p, false); p.respawn = a[1]; } });
    if (!worldOnly) {
      kills = s.k || 0; P.x = clamp(s.p[0] || -32, -249, 249); P.y = Math.max(0, s.p[1] || 0); P.z = clamp(s.p[2] || 32, -249, 249);
      P.vx = P.vz = P.vy = 0; P.yaw = s.p[3] || 0; P.pitch = clamp(s.p[4] || 0, -1.5, 1.5);
      equip = { head: null, chest: null, legs: null, boots: null };
      if (s.eq) { ['head', 'chest', 'legs', 'boots'].forEach(function (sl) { var id = s.eq[sl]; if (id && ITEMS[id] && ITEMS[id].slot === sl) equip[sl] = id; }); }
      var mxHp = armorStats().hpMax;
      if (Array.isArray(s.s)) {
        P.hp = s.s[0] > 0 ? clamp(s.s[0], 1, mxHp) : mxHp; P.hunger = clamp(s.s[1] != null ? s.s[1] : 100, 0, 100);
        P.thirst = clamp(s.s[2] != null ? s.s[2] : 100, 0, 100); P.energy = clamp(s.s[3] != null ? s.s[3] : 100, 0, 100);
        P.comfort = clamp(s.s[4] != null ? s.s[4] : 100, 0, 100); status = { poison: s.s[5] || 0, stomach: s.s[6] || 0, wpoison: s.s[7] || 0, keylock: 0 };
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
    P.y = 0; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.pitch = 0;
    while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1;
  }
  function newPlayerState(slotIdx) {
    inv = { rusty_axe: 1, rusty_pickaxe: 1, plastic_bottled_water: 1 };
    hot = [null, 'rusty_axe', 'rusty_pickaxe', 'plastic_bottled_water', null, null, null, null]; sel = 1;
    equip = { head: null, chest: null, legs: null, boots: null }; acc = [null, null, null, null]; clearCorpses(); cooking = []; endFish();
    P.hp = P.hunger = P.thirst = P.energy = P.comfort = 100; status = freshStatus(); kills = 0; dead = false; rest = null;
    $('#dark').style.opacity = 0; placeAtSpawn(slotIdx || 0);
  }
  function clearZombies() { zombies.forEach(function (z) { scene.remove(z.g); }); zombies.length = 0; zMap = Object.create(null); }

  function count(id) { return inv[id] || 0; }
  function give(id, n) {
    if (!ITEMS[id] || !n) return; inv[id] = (inv[id] || 0) + n; var it = ITEMS[id];
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
      '<p>Survive in the ruins of XKing City, a 500 m &times; 500 m map with a Morning–Noon–Afternoon–Night cycle. Chop trees, mine rocks, fish, craft gear and build a base for up to 4 players.</p>' +
      '<div class="warn-note">Progress only lasts for this session and is <b>erased when the tab closes</b>. Use <b>Save Code &amp; Load</b> (or Cloud Save) to keep your world safe!</div>' +
      '<div class="box-sub"><div class="row" style="justify-content:space-between"><label style="font-size:.86rem;color:var(--muted)">Survivor name</label><span style="font-size:.78rem;color:var(--muted)">' + esc(userName || 'Signed in') + ' &middot; <a href="#" id="bSignOut" style="color:var(--gold)">Sign out</a></span></div>' +
      '<input type="text" id="inpName" maxlength="16" value="' + esc(playerName) + '" placeholder="Enter your name...">' +
      '<div class="row"><button class="btn primary" id="bSolo">Play Solo</button><button class="btn" id="bHost">Create Room (Max 4)</button><button class="btn" id="bOpenLoad">Load Save Code</button></div></div>' +
      '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Join a Friend\'s Room (6 random characters)</div>' +
      '<div class="row" style="flex-wrap:nowrap"><input type="text" id="inpRoom" maxlength="6" placeholder="Example: k4m9p2 (not case sensitive)" style="text-transform:lowercase;letter-spacing:.12em"><button class="btn primary" id="bJoin" style="white-space:nowrap">Join Room</button></div>' +
      '<div class="err" id="menuErr">' + esc(errMsg || '') + '</div></div>' +
      controlsHtml() + '<div class="row"><a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');

    function syncName() { playerName = ($('#inpName').value || '').trim().slice(0, 16) || 'Survivor'; }
    $('#bSignOut').onclick = function (ev) { ev.preventDefault(); signOut(); };
    $('#bSolo').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); leaveRoom(); W.resetWorld(); newPlayerState(0); T = 0; spawnT = 3; clearZombies(); enterGame(); say('30 seconds of safe time have started! Gather materials quickly.'); };
    $('#bHost').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); hostRoom(false); };
    $('#bJoin').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); var c = Net.normalizeCode($('#inpRoom').value); if (c.length !== 6) { $('#menuErr').textContent = 'Enter exactly 6 letters/numbers for the room code.'; return; } joinRoom(c); };
    $('#inpRoom').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') $('#bJoin').click(); });
    $('#bOpenLoad').onclick = function () { SFX.unlock(); SFX.play('click'); syncName(); openCodeModal('menu'); };
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

  function openCodeModal(from) {
    var prev = mode; mode = 'modal'; var canExp = from === 'pause', canImp = mp.role !== 'client', code = canExp ? encodeSaveCode() : '';
    screen('<div class="card"><h2>Save Code &amp; Load</h2>' +
      (canExp ? '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Your Current World Save Code</div><textarea id="txSave" readonly>' + esc(code) + '</textarea><div class="row"><button class="btn primary sm" id="bCopySave">Copy Code</button><button class="btn sm" id="bDlSave">Download .txt</button><button class="btn sm" id="bCloudSave">Save to Cloud</button><span class="okmsg" id="copyMsg"></span></div></div>' : '') +
      '<div class="box-sub"><div style="font-size:.88rem;font-weight:700">Load a World from a Save Code</div>' +
      (canImp ? '<textarea id="txLoad" placeholder="Paste the WZL1:... code here"></textarea><div class="row"><button class="btn primary sm" id="bDoLoadSolo">Load &amp; Play Solo</button><button class="btn sm" id="bDoLoadHost">Load &amp; Create Room (Max 4)</button><button class="btn sm" id="bCloudLoad">Load from Cloud</button><label class="btn sm" style="cursor:pointer">Choose .txt File<input type="file" id="fLoad" accept=".txt" hidden></label></div><div class="err" id="loadErr"></div>' : '<p style="font-size:.85rem;color:#ff8b8f">Only the Host or Solo mode can load a save code.</p>') +
      '</div><div class="row"><button class="btn" id="bCloseCode">Back</button></div></div>');
    if (canExp) {
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
      function runImp(asHost, data) {
        var res = data ? { data: data } : decodeSaveCode($('#txLoad').value); if (res.err) { $('#loadErr').textContent = res.err; return; }
        if (!asHost && mp.role === 'host') leaveRoom();
        applySave(res.data, false); clearZombies(); if (T >= 30) { for (var i = 0; i < 4; i++) spawnZombie(); }
        if (asHost) { if (mp.role === 'host') { Net.send({ t: 'worldsync', snap: snapshot(true) }); enterGame(); } else hostRoom(true); say('Save loaded into the room!'); }
        else { enterGame(); say('Save loaded successfully!'); }
      }
      $('#bDoLoadSolo').onclick = function () { runImp(false); }; $('#bDoLoadHost').onclick = function () { runImp(true); };
      $('#bCloudLoad').onclick = function () {
        if (!sb) return; $('#loadErr').textContent = 'Loading...';
        sb.rpc('load_game', { p_game: 'webzombite' }).then(function (r) { if (r.error || !r.data || !r.data.v) { $('#loadErr').textContent = r.error ? r.error.message : 'No cloud save found.'; return; } runImp(false, r.data); }, function () { $('#loadErr').textContent = 'Could not reach the cloud.'; });
      };
    }
    $('#bCloseCode').onclick = function () { mode = prev; if (from === 'pause') showPause(); else showMainMenu(); };
  }

  function showPause() {
    mode = 'pause'; keys = {}; lmb = false; eatT = 0; queue.length = 0; $('#eat').style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
    var mpHtml = mp.role !== 'solo' ? '<div class="box-sub"><div class="row" style="justify-content:space-between"><div>Room Code: <span class="code-pill">' + esc(mp.room) + '</span></div><button class="btn sm" id="bCopyRoom">Copy Code</button></div><div style="font-size:.82rem;color:var(--muted)">Players (' + totalPlayers() + '/' + MAX_PLAYERS + ') &middot; ' + (mp.online ? 'Connected Online' : 'Connecting / Local') + ' &middot; Not case sensitive</div>' + playerListHtml() + '</div>' : '';
    screen('<div class="card"><span class="tag">Webzombite &middot; Paused</span><h1>Game Paused</h1>' +
      '<p>Survived: <b>' + fmtTime(T) + '</b> &middot; Kills: <b>' + kills + '</b>. Don\'t forget to save your world code before leaving!</p>' + mpHtml +
      '<div class="row"><button class="btn primary" id="bResume">Resume</button><button class="btn" id="bInv">Bag, Gear &amp; Crafting</button><button class="btn" id="bSaveCode">Save / Load Code</button></div>' +
      controlsHtml() + '<div class="row"><button class="btn" id="bMenu">Main Menu</button>' +
      (mp.role !== 'client' ? '<button class="btn danger" id="bReset">Reset World</button>' : '') +
      '<a class="btn sm" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    if ($('#bCopyRoom')) $('#bCopyRoom').onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(mp.room).then(function () { $('#bCopyRoom').textContent = 'Copied!'; }); };
    $('#bResume').onclick = function () { SFX.play('click'); enterGame(); };
    $('#bInv').onclick = function () { SFX.play('click'); $('#screen').hidden = true; openInv(); };
    $('#bSaveCode').onclick = function () { SFX.play('click'); openCodeModal('pause'); };
    $('#bMenu').onclick = function () { SFX.play('click'); leaveRoom(); showMainMenu(); };
    if ($('#bReset')) $('#bReset').onclick = function () {
      if (confirm('Reset the world with new random tree & rock positions?')) {
        W.resetWorld(); newPlayerState(mp.slot); T = 0; spawnT = 3; clearZombies();
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
    if (status.poison > 0) s.push('Poisoned'); if (status.stomach > 0) s.push('Stomachache'); if (status.wpoison > 0) s.push('Water Poison'); if (status.keylock > 0) s.push('Keybind Error ' + Math.ceil(status.keylock) + 's'); if (cooking.length) s.push('Cooking ' + Math.ceil(cooking[0].t) + 's');
    if (P.comfort <= 30) s.push('Uncomfortable'); if (rest) s.push(rest.k === 'sleep' ? 'Sleeping' : 'Resting');
    $('#status').innerHTML = s.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    var clk = clockInfo(T), safeTxt = T < 30 ? ' · Safe time <b>' + Math.ceil(30 - T) + 's</b>' : '', hh = Math.floor(clk.hour);
    var timeTxt = as.watch === 0 ? '<b>Time unknown</b> (equip a watch)' : 'Day <b>' + clk.day + '</b> · <b>' + (as.watch === 1 ? (hh < 10 ? '0' : '') + hh + ':00' : clk.str) + '</b> (' + clk.fase + ')';
    var zc = 0; if (as.radar) for (var zi = 0; zi < zombies.length; zi++) if (Math.hypot(zombies[zi].x - P.x, zombies[zi].z - P.z) < 70) zc++;
    var roomTxt = mp.role !== 'solo' ? '<br>Room <b>' + esc(mp.room) + '</b> (' + totalPlayers() + '/' + MAX_PLAYERS + ')' + (mp.online ? ' · Online' : ' · Local') : '';
    $('#info').innerHTML = timeTxt + safeTxt +
      '<br>DEF <b>' + ast.def + '</b> · Kills <b>' + kills + '</b> · Zombies nearby <b>' + (as.radar ? zc : '?') + '</b>' + (as.radar ? '' : ' (equip a Radar)') +
      '<br>[F] Flashlight: <b>' + (torchOn ? 'On' : 'Off') + '</b> · [M] Sound: <b>' + (SFX.isMuted() ? 'Muted' : 'On') + '</b>' + roomTxt;
  }
  var mini, mctx;
  function drawMini() {
    if (!mctx) return; var as = accStats(); mini.style.display = as.gps ? 'block' : 'none'; if (!as.gps) return;
    var S = 170, k = S / 220, g = mctx, cx = P.x, cz = P.z;
    function X(x) { return S / 2 + (x - cx) * k; } function Y(z) { return S / 2 + (z - cz) * k; }
    g.fillStyle = '#14120f'; g.fillRect(0, 0, S, S); g.fillStyle = '#2d2a22'; g.fillRect(X(-250), Y(-250), 500 * k, 500 * k);
    g.fillStyle = '#4a4c50'; W.roads.forEach(function (r) { g.fillRect(X(r - 5), Y(-250), 10 * k, 500 * k); g.fillRect(X(-250), Y(r - 5), 500 * k, 10 * k); });
    W.rects.forEach(function (r) { if (r.x1 < cx - 115 || r.x0 > cx + 115 || r.z1 < cz - 115 || r.z0 > cz + 115) return; g.fillStyle = r.c; g.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k); });
    g.strokeStyle = '#b33a2a'; g.lineWidth = 2; g.strokeRect(X(-250), Y(-250), 500 * k, 500 * k);
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
    P.x = clamp(P.x, -249.6, 249.6); P.z = clamp(P.z, -249.6, 249.6);
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
  function unkey(k) { var y = k % 64, r = Math.floor(k / 64), z = (r % 1024) - 300, x = Math.floor(r / 1024) - 300; return [x, y, z]; }
  var VNAME = { 1: 'Wood Block', 2: 'Stone Block', 3: 'Smelting Furnace', 4: 'Cozy Bed', 5: 'Cozy Couch', 6: 'Sink', 7: 'Campfire', 8: 'Iron Anvil', 9: 'Computer Bench' };
  var VITEM = { 1: 'wood_block', 2: 'stone_block', 3: 'furnace', 4: 'bed_block', 5: 'couch_block', 6: 'sink_block', 7: 'campfire', 8: 'anvil_block', 9: 'computer_bench' };

  function damageVoxLocal(cx, cy, cz, dmg, giveToPid) {
    var v = W.getVox(cx, cy, cz); if (!v) return null; v.hp -= dmg;
    if (v.hp <= 0) {
      var vt = v.t; W.delVox(cx, cy, cz); voxVer++;
      if (mp.role === 'host') { Net.send({ t: 'vox', op: 0, x: cx, y: cy, z: cz }); if (giveToPid && giveToPid !== Net.info().pid) Net.send({ t: 'give', to: giveToPid, id: VITEM[vt], n: 1 }); else if (giveToPid === 'self') give(VITEM[vt], 1); }
      else if (mp.role === 'solo' && giveToPid === 'self') give(VITEM[vt], 1);
      return { broken: true, vt: vt, hp: 0 };
    } else { if (mp.role === 'host') Net.send({ t: 'vox', op: 2, x: cx, y: cy, z: cz, hp: Math.round(v.hp) }); return { broken: false, vt: v.t, hp: v.hp }; }
  }
  function applyEntHit(e, bd, targetPid) {
    e.hp -= bd;
    var goal = e.hp <= 0 ? e.yield : Math.floor(e.yield * (1 - Math.max(0, e.hp) / e.max)), gain = goal - e.given, item = e.k === 'tree' ? 'wood' : (e.ore ? 'iron_nugget' : e.gold ? 'golden_nugget' : e.coal ? 'coal' : 'stone');
    if (gain > 0) { e.given = goal; if (targetPid === 'self') { give(item, gain); say('+' + gain + ' ' + ITEMS[item].name); } else if (mp.role === 'host') Net.send({ t: 'give', to: targetPid, id: item, n: gain, msg: '+' + gain + ' ' + ITEMS[item].name }); }
    if (e.hp <= 0) {
      e.respawn = T + (e.k === 'tree' ? 600 : 720); if (e.k === 'tree') W.setTree(e, false); else W.setRock(e, false);
      var msg = e.k === 'tree' ? 'The tree fell.' : (e.ore ? 'The iron ore is mined out.' : e.gold ? 'The gold ore is mined out.' : e.coal ? 'The coal is mined out.' : 'The rock is destroyed.');
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
    if (e.k === 'tree' || e.k === 'rock') {
      var need = e.k === 'tree' ? 'axe' : 'pick';
      if (it.tool !== need) { say(e.k === 'tree' ? 'You need an axe to chop trees.' : 'You need a pickaxe to mine rocks.', true); return; }
      SFX.play(e.k === 'tree' ? 'wood' : 'stone');
      if (mp.role === 'client') Net.send({ t: 'hitEnt', k: e.k, idx: e.idx, bd: it.bd }); else applyEntHit(e, it.bd, 'self');
    }
  }
  function hitZombie(z, dmg, attacker) {
    z.hp -= Math.max(1, dmg - z.def.def); z.flash = 0.14;
    var dx = z.x - P.x, dz = z.z - P.z, l = Math.hypot(dx, dz) || 1; moveBody(z, dx / l * 0.35, 0, dz / l * 0.35, z.rad, 1.7, false);
    if (z.hp <= 0) killZombie(z, attacker);
  }
  function killZombie(z, attacker) {
    scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); delete zMap[z.id];
    var dropId = null, zt = z.type;
    if (zt === 'spider') dropId = rnd() < 1 / 3 ? 'string' : null; else if (zt === 'programmer') dropId = rnd() < 0.10 ? 'signal_chip' : null; else if (zt !== 'miner' && zt !== 'zfish') dropId = rnd() < 0.15 ? WZ.rollLoot('trash1', rnd) : null;
    if (attacker === 'self' || !attacker) { kills++; if (dropId) { give(dropId, 1); say('+1 ' + ITEMS[dropId].name); } }
    else if (mp.role === 'host') Net.send({ t: 'zkill', to: attacker, drop: dropId });
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
    var key = e.k === 'pile' ? (e.tier === 4 ? 'table4' : e.tier === 2 && WZ.LOOT.trash2.enabled ? 'trash2' : 'trash1') : (e.tier === 2 ? 'crate2' : 'crate1');
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
    else if (e.k === 'bed') { rest = { k: 'sleep', clean: !!e.clean }; P.vx = P.vz = 0; $('#dark').style.opacity = 0.75; say(e.clean ? 'Sleeping in a clean bed. Comfort & Energy recover.' : 'The bed is a bit dirty: Energy recovers, but Comfort does not.'); }
    else if (e.k === 'couch') { if (!e.clean) say('The couch is dirty. It does not restore Comfort.', true); else { rest = { k: 'sit', clean: true }; P.vx = P.vz = 0; say('Sitting on a clean couch. Comfort is recovering.'); } }
    else if (e.k === 'furnace' || e.k === 'campfire' || e.k === 'anvil' || e.k === 'computer') { SFX.play('click'); openInv(); }
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
    if (!c.mine) { say(c.name + '\'s corpse. Only they can loot it.', true); return; }
    var L = c.loot || { inv: {}, eq: [], ac: [] };
    Object.keys(L.inv || {}).forEach(function (id) { give(id, L.inv[id]); });
    (L.eq || []).concat(L.ac || []).forEach(function (id) { give(id, 1); });
    removeCorpse(c); if (mp.role !== 'solo') Net.send({ t: 'corpseGone', id: c.id }); SFX.play('loot'); say('You looted your corpse. All items recovered!');
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
  function spawnVirus(x, z, dx, dz, vis) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x39ff88 })); m.position.set(x, 1.3, z); scene.add(m);
    virus.push({ m: m, x: x, z: z, dx: dx, dz: dz, life: 1.6, vis: vis });
  }
  function fireVirus(z, tgt) {
    var dx = tgt.x - z.x, dz = tgt.z - z.z, l = Math.hypot(dx, dz) || 1; spawnVirus(z.x, z.z, dx / l, dz / l, mp.role === 'client');
    if (mp.role === 'host') Net.send({ t: 'vp', x: r2(z.x), z: r2(z.z), dx: r2(dx / l), dz: r2(dz / l) });
  }
  function stepVirus(dt) {
    for (var i = virus.length - 1; i >= 0; i--) {
      var v = virus[i], gone = false; v.x += v.dx * 9 * dt; v.z += v.dz * 9 * dt; v.m.position.x = v.x; v.m.position.z = v.z; v.life -= dt;
      if (v.life <= 0 || W.hit(v.x - 0.1, v.x + 0.1, 1.2, 1.4, v.z - 0.1, v.z + 0.1)) gone = true;
      else if (!v.vis) {
        if (!dead && Math.hypot(P.x - v.x, P.z - v.z) < 0.8 && P.y < 2) { infectKeys(8); gone = true; }
        else if (mp.role === 'host') for (var pid in mp.peers) { var pr = mp.peers[pid]; if (!pr.dead && Math.hypot(pr.x - v.x, pr.z - v.z) < 0.8) { Net.send({ t: 'virus', to: pid }); gone = true; break; } }
      }
      if (gone) { scene.remove(v.m); virus.splice(i, 1); }
    }
  }
  function mineLogic(dt) {
    mineT -= dt; if (mineT > 0 || !W.mine) return; mineT = 15;
    var n = 0, near = false, cx = (W.mine.x0 + W.mine.x1) / 2, cz = (W.mine.z0 + W.mine.z1) / 2;
    zombies.forEach(function (z) { if (z.type === 'miner') n++; }); if (n >= 4) return;
    if (!dead && Math.hypot(P.x - cx, P.z - cz) < 140) near = true; for (var pid in mp.peers) if (Math.hypot(mp.peers[pid].x - cx, mp.peers[pid].z - cz) < 140) near = true;
    if (!near) return; var sp = W.mine.spawns[(rnd() * W.mine.spawns.length) | 0]; zombies.push(makeZombie('miner', sp[0], sp[1]));
  }
  function cookTick(dt) {
    if (!cooking.length || !nearArr(W.camps)) return; cooking[0].t -= dt;
    if (cooking[0].t <= 0) { var c = cooking.shift(); give(c.out, 1); say('+1 ' + ITEMS[c.out].name + ' (cooked)'); SFX.play('craft'); }
  }
  function toggleDebug() { dbgOn = !dbgOn; var d = $('#dbg'); if (d) d.style.display = dbgOn ? 'block' : 'none'; if (dbgOn) renderDebug(); }
  function renderDebug() {
    var d = $('#dbg'); if (!d || !renderer) return; var ri = renderer.info || { render: {}, memory: {} };
    d.textContent = 'FPS ' + fpsVal + '\nZombies ' + zombies.length + '\nBlocks ' + (W ? W.voxCount() : 0) + '/' + (W ? W.MAX_VOX : 0) + '\nDraw calls ' + (ri.render.calls || 0) + '\nTriangles ' + (ri.render.triangles || 0) + '\nPos ' + r2(P.x) + ', ' + r2(P.y) + ', ' + r2(P.z) + '\nRoom ' + (mp.role === 'solo' ? 'solo' : mp.room + ' (' + totalPlayers() + ')') + '\nT ' + Math.round(T) + 's';
  }

  /* ---------------- Zombies ---------------- */
  var BOX = new THREE.BoxGeometry(1, 1, 1), EYE = new THREE.MeshBasicMaterial({ color: 0xff3030 }), FLASH_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xaa2222 }), Z_MATS = Object.create(null), MAT_YEL = new THREE.MeshLambertMaterial({ color: 0xe3b02a }), MAT_GLASS = new THREE.MeshBasicMaterial({ color: 0x66ccff });
  function tint(c, k) { var col = new THREE.Color(c); col.multiplyScalar(1 + k); return col; }
  function getZMats(type) {
    if (Z_MATS[type]) return Z_MATS[type]; var d = ZDEF[type];
    return (Z_MATS[type] = { skin: new THREE.MeshLambertMaterial({ color: d.color }), cloth: new THREE.MeshLambertMaterial({ color: tint(d.color, -0.4) }), pants: new THREE.MeshLambertMaterial({ color: tint(d.color, -0.6) }), helmet: type === 'soldier' ? new THREE.MeshLambertMaterial({ color: 0x2f4a2c }) : null, bombGlow: type === 'bomber' ? new THREE.MeshBasicMaterial({ color: 0xff7a1a }) : null, pack: type === 'bomber' ? new THREE.MeshLambertMaterial({ color: 0x3a2a1e }) : null });
  }
  function makeZombie(type, x, z, forcedId) {
    var d = ZDEF[type], m = getZMats(type), g = new THREE.Group(), sw = [], wide = type === 'big' || type === 'brute' ? 1.25 : type === 'bomber' ? 1.3 : type === 'spider' ? 1.5 : 1;
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
    g.scale.setScalar(d.scale); g.position.set(x, 0, z); scene.add(g);
    var id = forcedId != null ? forcedId : nextZid++, zb = { id: id, type: type, ti: ZTYPES.indexOf(type), def: d, g: g, x: x, y: 0, z: z, tx: x, tz: z, try: 0, hp: d.hp, rad: 0.32 * Math.sqrt(d.scale) * wide * 0.9, r2: Math.pow(0.52 * d.scale * wide, 2), h: 1.9 * d.scale, cd: 0.4, anim: rnd() * 6, legs: [lL, lR], arms: [aL, aR], swaps: sw, flash: 0, flashing: false };
    zMap[id] = zb; return zb;
  }
  function spawnZombie() {
    var pool = [], sum = 0, tier2 = T > 300; for (var k in ZDEF) if (!ZDEF[k].nospawn && (ZDEF[k].tier === 1 || (ZDEF[k].tier < 4 && tier2) || (ZDEF[k].tier === 4 && T > 900))) { pool.push(k); sum += ZDEF[k].w; }
    var r = rnd() * sum, type = pool[0]; for (var i = 0; i < pool.length; i++) { r -= ZDEF[pool[i]].w; if (r <= 0) { type = pool[i]; break; } }
    var tgts = []; if (!dead) tgts.push({ x: P.x, z: P.z }); for (var pid in mp.peers) { var pr = mp.peers[pid]; if (!pr.dead && pr.hp > 0) tgts.push({ x: pr.x, z: pr.z }); }
    var ref = tgts.length ? tgts[(rnd() * tgts.length) | 0] : { x: P.x, z: P.z }, H = WZ.SPAWN_HALF, best = null;
    for (var j = 0; j < 3; j++) { var side = (rnd() * 4) | 0, t = (rnd() * 2 - 1) * H, x = side < 2 ? t : (side === 2 ? -H : H), z = side < 2 ? (side === 0 ? -H : H) : t, d = Math.hypot(x - ref.x, z - ref.z); if (!best || d < best.d) best = { x: x, z: z, d: d }; }
    zombies.push(makeZombie(type, best.x, best.z));
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
  function stepZombie(z, dt) {
    var tgt = null, bd = 1e9;
    if (!dead) { bd = Math.hypot(P.x - z.x, P.z - z.z); tgt = { isSelf: true, x: P.x, y: P.y, z: P.z, d: bd }; }
    for (var pid in mp.peers) { var pr = mp.peers[pid]; if (pr.dead || pr.hp <= 0) continue; var pd = Math.hypot(pr.x - z.x, pr.z - z.z); if (pd < bd) { bd = pd; tgt = { isSelf: false, pid: pid, x: pr.x, y: pr.y, z: pr.z, d: pd }; } }
    if (!tgt) return;
    var dx = tgt.x - z.x, dz = tgt.z - z.z, dist = tgt.d, base = Math.atan2(dz, dx), sp = z.def.spd * 2.2;
    if (z.type === 'miner' && dist > 22) { updateZombieVisuals(z, dt); return; }
    if (z.def.ranged) { z.vcd = (z.vcd == null ? 2 : z.vcd) - dt; if (dist > 3 && dist < 14 && z.vcd <= 0) { z.vcd = 4; fireVirus(z, tgt); } }
    z.cd -= dt; z.anim += dt * sp * 2.2;
    if (dist > 0.01 && Math.abs(tgt.y - z.y) < 2.2 && dist < 1.15 + z.def.scale * 0.35) {
      if (z.type === 'bomber') { explode(z); return; }
      if (z.cd <= 0) { z.cd = z.def.cd; if (tgt.isSelf) { hurt(z.def.dmg); if (z.def.wpoison) applyWaterPoison(); } else if (mp.role === 'host') Net.send({ t: 'hurt', to: tgt.pid, dmg: z.def.dmg, wp: z.def.wpoison ? 1 : 0 }); }
    }
    if (z.type === 'bomber' && dist < 2.1 && Math.abs(tgt.y - z.y) < 2.2) { explode(z); return; }
    var moved = false, hitInfo = null;
    for (var a = 0; a < ANG.length && !moved; a++) { var ang = base + ANG[a], mx = Math.cos(ang) * sp * dt, mz = Math.sin(ang) * sp * dt, i = W.hit(z.x + mx - z.rad, z.x + mx + z.rad, 0.05, 1.7, z.z + mz - z.rad, z.z + mz + z.rad); if (!i) { z.x += mx; z.z += mz; moved = true; } else if (a === 0) hitInfo = { vox: i.vox }; }
    if (!moved && hitInfo && hitInfo.vox != null && z.cd <= 0) { if (z.type === 'bomber') { explode(z); return; } z.cd = z.def.cd || 1; var c = unkey(hitInfo.vox); damageVoxLocal(c[0], c[1], c[2], z.def.dmg * 3, null); SFX.play('wood'); }
    for (var k = 0; k < zombies.length; k++) { var o = zombies[k]; if (o === z) continue; var ex = z.x - o.x, ez = z.z - o.z, d2 = ex * ex + ez * ez; if (d2 < 0.5 && d2 > 0.0001) { var d = Math.sqrt(d2), p = (0.7 - d) * 0.5; z.x += ex / d * p * dt * 6; z.z += ez / d * p * dt * 6; } }
    z.g.position.set(z.x, 0, z.z); if (dist > 0.01) z.g.rotation.y = Math.atan2(-dx, -dz); updateZombieVisuals(z, dt);
  }
  function zombieLogic(dt, isNight) {
    groanT -= dt;
    if (groanT <= 0) {
      groanT = 4 + rnd() * 5;
      for (var g = 0; g < zombies.length; g++) if (Math.hypot(zombies[g].x - P.x, zombies[g].z - P.z) < 18) { SFX.play('groan'); break; }
    }
    if (mp.role === 'client') {
      var f = Math.min(1, dt * 12);
      for (var i = 0; i < zombies.length; i++) { var z = zombies[i], dx = z.tx - z.x, dz = z.tz - z.z, mv = Math.hypot(dx, dz); z.x += dx * f; z.z += dz * f; z.g.position.set(z.x, 0, z.z); z.g.rotation.y = z.try; z.anim += dt * (mv > 0.02 ? z.def.spd * 4.5 : 1.5); updateZombieVisuals(z, dt); }
      return;
    }
    if (T < 30) return; /* first 30 seconds of a new world: no zombies spawn */
    spawnT -= dt;
    var cap = Math.round(Math.min(48, 16 + Math.floor(T / 60) * 3 + (mp.role === 'host' ? (totalPlayers() - 1) * 4 : 0)) * 0.9);
    var interval = (Math.max(1.2, 6 - T / 120) / 0.9) * (isNight ? 0.8 : 1);
    mineLogic(dt);
    var hostile = 0; for (var hz = 0; hz < zombies.length; hz++) if (zombies[hz].type !== 'miner' && zombies[hz].type !== 'zfish') hostile++;
    if (spawnT <= 0 && hostile < cap) { spawnZombie(); spawnT = interval; }
    for (var j = zombies.length - 1; j >= 0; j--) stepZombie(zombies[j], dt);
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
    var g = new THREE.Group(), shirt = new THREE.MeshLambertMaterial({ color: SLOT_COLS[slot % 4] }), skin = new THREE.MeshLambertMaterial({ color: 0xd9b38c }), pants = new THREE.MeshLambertMaterial({ color: 0x2d333b });
    function bx(w, h, d, m, x, y, z, p) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); (p || g).add(o); }
    bx(0.5, 0.68, 0.28, shirt, 0, 1.05, 0); bx(0.32, 0.32, 0.32, skin, 0, 1.55, 0);
    var lL = new THREE.Group(), lR = new THREE.Group(), aR = new THREE.Group(); lL.position.set(-0.13, 0.7, 0); lR.position.set(0.13, 0.7, 0); aR.position.set(0.35, 1.35, 0); g.add(lL); g.add(lR); g.add(aR);
    bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lL); bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lR); bx(0.14, 0.6, 0.14, skin, -0.35, 1.05, 0); bx(0.14, 0.6, 0.14, skin, 0, -0.3, 0, aR);
    var tag = makeNameSprite(name, slot); g.add(tag.sprite); scene.add(g); return { g: g, lL: lL, lR: lR, aR: aR, anim: 0, tag: tag };
  }
  function removePeer(pid) { var pr = mp.peers[pid]; if (!pr) return; if (pr.mesh) { scene.remove(pr.mesh.g); if (pr.mesh.tag && pr.mesh.tag.tex) pr.mesh.tag.tex.dispose(); } delete mp.peers[pid]; }
  function stepPeers(dt) {
    var now = performance.now(), f = Math.min(1, dt * 14);
    for (var pid in mp.peers) {
      var pr = mp.peers[pid]; if (now - pr.lastSeen > 9000) { say(pr.name + ' left the room.'); removePeer(pid); continue; }
      var dx = pr.tx - pr.x, dz = pr.tz - pr.z, spd = Math.hypot(dx, dz); pr.x += dx * f; pr.y += (pr.ty - pr.y) * f; pr.z += dz * f;
      pr.mesh.g.visible = !pr.dead; pr.mesh.g.position.set(pr.x, pr.y, pr.z); pr.mesh.g.rotation.y = pr.tyaw;
      if (spd > 0.02) { pr.mesh.anim += dt * 10; var sw = Math.sin(pr.mesh.anim) * 0.65; pr.mesh.lL.rotation.x = sw; pr.mesh.lR.rotation.x = -sw; }
      else { pr.mesh.lL.rotation.x *= 0.8; pr.mesh.lR.rotation.x *= 0.8; }
      if (pr.sw > 0) { pr.sw -= dt; pr.mesh.aR.rotation.x = -1.4; } else pr.mesh.aR.rotation.x *= 0.8;
    }
    if (mp.role === 'client' && mp.lastHostSeen && now - mp.lastHostSeen > 9500) { say('Host disconnected. Continuing solo.', true); leaveRoom(); }
  }
  function leaveRoom() { Net.disconnect(); if (mp.joinTimer) { clearTimeout(mp.joinTimer); mp.joinTimer = null; } Object.keys(mp.peers).forEach(removePeer); mp.role = 'solo'; mp.room = ''; mp.slot = 0; mp.online = false; }
  function hostRoom(keep) {
    leaveRoom(); var code = Net.genCode(); mp.role = 'host'; mp.room = code; mp.slot = 0;
    if (!keep) { W.resetWorld(); newPlayerState(0); T = 0; spawnT = 3; clearZombies(); }
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
    if (msg.t === 'vp') { spawnVirus(msg.x, msg.z, msg.dx, msg.dz, true); return; }
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
      else if (msg.t === 'dmgVox') damageVoxLocal(msg.x, msg.y, msg.z, msg.dmg || 2, msg.f);
      else if (msg.t === 'hitEnt') { var e = (msg.k === 'tree' ? W.trees : W.rocks)[msg.idx]; if (e && e.alive) applyEntHit(e, msg.bd || 1, msg.f); }
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
      } else if (msg.t === 'vox') {
        if (msg.op === 1) { if (!W.getVox(msg.x, msg.y, msg.z) && W.setVox(msg.x, msg.y, msg.z, msg.vt, msg.hp)) voxVer++; }
        else if (msg.op === 0) { if (W.getVox(msg.x, msg.y, msg.z)) { W.delVox(msg.x, msg.y, msg.z); voxVer++; } }
        else if (msg.op === 2) { var hv = W.getVox(msg.x, msg.y, msg.z); if (hv) hv.hp = msg.hp; }
      } else if (msg.t === 'ent') {
        if (msg.k === 'tree') { var tr = W.trees[msg.idx]; if (tr) { tr.hp = msg.hp; tr.given = msg.given; if (tr.alive !== msg.alive) W.setTree(tr, msg.alive); } }
        else if (msg.k === 'rock') { var rk = W.rocks[msg.idx]; if (rk) { rk.hp = msg.hp; rk.given = msg.given; if (rk.alive !== msg.alive) W.setRock(rk, msg.alive); } }
        else if (msg.k === 'pile') { var pl = W.piles[msg.idx]; if (pl) W.setPile(pl, !msg.searched); }
        else if (msg.k === 'crate') { var cr = W.crates[msg.idx]; if (cr) W.setCrate(cr, !msg.searched); }
      } else if (msg.t === 'give' && msg.to === myPid) { give(msg.id, msg.n); if (msg.msg) say(msg.msg); }
      else if (msg.t === 'say' && msg.to === myPid) say(msg.msg);
      else if (msg.t === 'hurt' && msg.to === myPid) { hurt(msg.dmg || 5); if (msg.wp) applyWaterPoison(); }
      else if (msg.t === 'virus' && msg.to === myPid) infectKeys(8);
      else if (msg.t === 'zkill' && msg.to === myPid) { kills++; if (msg.drop) { give(msg.drop, 1); say('+1 ' + ITEMS[msg.drop].name); } }
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
  function openInv() { mode = 'inv'; keys = {}; lmb = false; eatT = 0; wire = null; queue.length = 0; $('#eat').style.display = 'none'; if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} } $('#screen').hidden = true; $('#inv').hidden = false; renderInv(); }
  function closeInv() { $('#inv').hidden = true; wire = null; enterGame(); }
  function costHtml(r) { return Object.keys(r.cost).map(function (id) { var have = count(id); return '<span class="' + (have >= r.cost[id] ? 'ok' : 'no') + '">' + ITEMS[id].ic + ' ' + have + '/' + r.cost[id] + ' ' + ITEMS[id].name + '</span>'; }).join(' &middot; '); }
  function stationOk(r) { return (!r.furnace || nearArr(W.furn)) && (!r.sink || nearArr(W.sinks)) && (!r.anvil || nearArr(W.anvils)) && (!r.campfire || nearArr(W.camps)) && (!r.computer || nearArr(W.comps)); }
  function stationNote(r) {
    if (r.furnace) return '<br>' + (nearArr(W.furn) ? 'Furnace nearby' : 'Needs a Smelting Furnace nearby');
    if (r.sink) return '<br>' + (nearArr(W.sinks) ? 'Sink nearby (Free!)' : 'Needs a Sink nearby');
    if (r.anvil) return '<br>' + (nearArr(W.anvils) ? 'Iron Anvil nearby' : 'Needs an Iron Anvil nearby');
    if (r.campfire) return '<br>' + (nearArr(W.camps) ? 'Campfire nearby (25 s per piece)' : 'Needs a Campfire nearby');
    if (r.computer) return '<br>' + (nearArr(W.comps) ? 'Computer Bench nearby' : 'Needs a Computer Bench nearby');
    return '';
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
    h += '</div><p class="m" style="color:var(--muted);font-size:.8rem;margin:0 0 10px">Click a hotbar slot, then click an item to assign it (armor and accessories equip directly).</p><h2>Items</h2>';
    h += ids.length ? '<div class="items">' + ids.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-item="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') + '</div>' : '<p class="m" style="color:var(--muted)">Your bag is empty.</p>';
    h += '<div class="detail" id="detail">' + detailHtml(selItem) + '</div></div><div class="box"><h2>Crafting &amp; Stations</h2>' + WZ.RECIPES.map(function (r) {
      var out = ITEMS[r.out[0]], can = Object.keys(r.cost).every(function (id) { return count(id) >= r.cost[id]; }) && stationOk(r);
      var btn = r.furnace ? 'Smelt' : r.sink ? 'Wash' : r.campfire ? 'Cook' : r.anvil ? 'Forge' : r.minigame ? 'Assemble' : r.computer ? 'Build' : 'Craft';
      return '<div class="rec"><div><b>' + out.ic + ' ' + esc(r.label || out.name) + (r.out[1] > 1 ? ' x' + r.out[1] : '') + '</b><div class="cost">' + costHtml(r) + stationNote(r) + '</div></div><button class="btn' + (can ? ' primary' : '') + '" data-craft="' + r.id + '"' + (can ? '' : ' disabled') + '>' + btn + '</button></div>';
    }).join('') + '<h2 style="margin-top:14px">Schematics (Coming Soon)</h2>' + WZ.SCHEMATICS.map(function (n) { return '<div class="rec" style="opacity:.55"><div><b>🔒 ' + esc(n) + '</b><div class="cost">Coming soon</div></div></div>'; }).join('') + '</div></div>';
    $('#inv').innerHTML = h; $('#bBack').onclick = closeInv;
  }
  document.addEventListener('click', function (ev) {
    if (mode !== 'inv') return; var t = ev.target.closest('[data-item],[data-slot],[data-craft],[data-eq],[data-acc],[data-wl],[data-wr],[data-wcancel]'); if (!t) return;
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
      if (!r || !Object.keys(r.cost).every(function (k) { return count(k) >= r.cost[k]; }) || !stationOk(r)) return;
      if (r.minigame) { wire = { r: r, order: [0, 1, 2, 3, 4].sort(function () { return Math.random() - 0.5; }), sel: -1, done: {} }; SFX.play('click'); renderWireGame(); return; }
      if (r.cook) { Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); cooking.push({ t: r.cook, out: r.out[0] }); say('Cooking started (' + r.cook + ' s). Stay near the campfire.'); SFX.play('click'); renderInv(); return; }
      craftNow(r); renderInv();
    }
  });

  /* ---------------- Main loop & render ---------------- */
  var clock = { last: 0 };
  function respawnWorld() {
    if (mp.role === 'client') return;
    W.trees.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setTree(t, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'tree', idx: t.idx, hp: t.hp, given: 0, alive: true }); } });
    W.rocks.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setRock(t, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'rock', idx: t.idx, hp: t.hp, given: 0, alive: true }); } });
    W.piles.forEach(function (p) { if (p.searched && T >= p.respawn) { W.setPile(p, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'pile', idx: p.idx, searched: false }); } });
    W.crates.forEach(function (p) { if (p.searched && T >= p.respawn) { W.setCrate(p, true); if (mp.role === 'host') Net.send({ t: 'ent', k: 'crate', idx: p.idx, searched: false }); } });
  }
  function update(dt, nowMs, clk) {
    drain(); T += dt; swingCd -= dt; stepPlayer(dt); stats(dt); if (dead) return;
    if (lmb) { var it = curItem(); if (it.type === 'tool' && swingCd <= 0) swing(); }
    eatTick(dt); fishTick(dt); cookTick(dt); zombieLogic(dt, clk.night); stepPeers(dt); networkTick(nowMs);
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
          else if (e.k === 'sink') { var hid = hot[sel]; txt = (hid === 'dirty_veg' || hid === 'dirty_fruits') ? 'Sink' + hpTxt + ' · [E] Wash Now · Left Click: Dismantle' : 'Sink' + hpTxt + ' · [E] Open Sink · Left Click: Dismantle'; }
        }
        else if (e.k === 'pile') txt = e.searched ? (e.tier === 4 ? 'Table already searched' : 'Trash already searched') : (e.tier === 4 ? '[E] Search Above Table (Tier 4)' : '[E] Search trash (Tier ' + e.tier + ')');
        else if (e.k === 'crate') txt = e.searched ? 'Empty crate' : '[E] Open wooden crate (Tier ' + (e.tier || 1) + ')';
        else if (e.k === 'bed') txt = e.clean ? '[E] Sleep in the clean bed' : '[E] Sleep in the shabby bed';
        else if (e.k === 'couch') txt = e.clean ? '[E] Sit on the clean couch' : 'Dirty couch (does not restore Comfort)';
        else if (e.k === 'tree') txt = 'Tree  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'axe' ? '' : '  (needs an axe)');
        else if (e.k === 'rock') txt = (e.ore ? 'Iron Ore' : e.gold ? 'Gold Ore' : e.coal ? 'Coal' : 'Stone') + '  Durability ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'pick' ? '' : '  (needs a pickaxe)');
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
    if (virus.length) stepVirus(dt);
    var clk = clockInfo(T);
    SFX.setNight(clk.night);
    if (clk.night && !autoTorchDone && mode === 'play') { autoTorchDone = true; if (!torchOn) { torchOn = true; say('It is night — the flashlight turned on automatically [F].'); } }
    else if (!clk.night) autoTorchDone = false;

    if (mode === 'play') { update(dt, ms, clk); if (ms - lastHud > 100) { lastHud = ms; hud(); } }
    else if (mode === 'menu') { P.yaw += dt * 0.08; networkTick(ms); }
    else if (mp.role !== 'solo') { stepPeers(dt); networkTick(ms); }

    W.updateSky(clk.hour, P.x, P.z);
    var eye = P.y + (rest ? (rest.k === 'sleep' ? 0.55 : 1.0) : 1.62);
    camera.position.set(P.x, eye, P.z); camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    if (torch) { camera.getWorldDirection(DIR); torch.position.set(P.x + DIR.x * 0.6, eye, P.z + DIR.z * 0.6); torch.intensity = torchOn ? 1.55 : 0; }
    renderer.render(scene, camera);
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
    camera = new THREE.PerspectiveCamera(75, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 265);
    var maxAniso = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
    W = WZ.createWorld(THREE, scene, maxAniso);
    torch = new THREE.PointLight(0xffeec2, 0, 26, 1.3);
    scene.add(torch);

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
  window.WZ.debug = function () { return { scene: scene, renderer: renderer, camera: camera, P: P, zombies: zombies, inv: inv, equip: equip, acc: acc, W: W, mp: mp, status: status, give: give, makeZombie: makeZombie, curItem: curItem, setSel: function (i) { sel = i; renderHotbar(); }, setT: function (v) { T = v; }, hot: hot, T: function () { return T; }, mode: function () { return mode; }, die: die, startFish: startFish, aimWater: aimWater }; };
  window.WZ.started = true;
  boot();
})();
/* end game.js */
