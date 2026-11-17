/* Webzombite (beta) - first-person survival in the ruins of XKing Supreme Large City.
   Rendering uses WebGL through Three.js, so the graphics card does the heavy lifting. */
(function () {
  'use strict';
  var WZ = window.WZ, ITEMS = WZ.ITEMS, ZDEF = WZ.ZOMBIES, C = window.WZ_CONFIG || {};
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd() { return Math.random(); }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  /* ---------------- tiny synthesized sounds ---------------- */
  var AC = null;
  function beep(f, d, type, vol) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      var o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
    } catch (e) {}
  }

  /* ---------------- state ---------------- */
  var sb = null, userId = null, THREE = window.THREE;
  var scene, camera, renderer, W;
  var P = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, onGround: false, hp: 100, hunger: 100, thirst: 100, energy: 100, comfort: 100 };
  var inv = {}, hot = [null, null, null, null, null, null, null, null], sel = 0;
  var T = 0, kills = 0, dead = false, rest = null, status = { poison: 0, stomach: 0 };
  var zombies = [], keys = {}, lmb = false, swingCd = 0, eatT = 0, eatId = null, spawnT = 3, voxVer = 0, cache = { ver: -1, list: [] };
  var mode = 'boot';   /* boot | gate | ready | play | pause | inv | dead */
  var invFurn = false, selItem = null, lastHud = 0, lastSave = 0, lastCloud = 0, cloudOK = true, savedFlash = 0, respawnCheck = 0;

  /* ---------------- save / load ---------------- */
  function localKey() { return 'wz.save.v1.' + (userId || 'guest'); }
  function snapshot() {
    if (cache.ver !== voxVer) { cache.list = W.voxList(); cache.ver = voxVer; }
    var o = { v: 1, savedAt: Date.now(), T: T, kills: kills, pos: [P.x, P.y, P.z], yaw: P.yaw, pitch: P.pitch,
      st: { hp: P.hp, hunger: P.hunger, thirst: P.thirst, energy: P.energy, comfort: P.comfort }, status: status, inv: inv, hot: hot, sel: sel,
      blocks: cache.list, trees: [], rocks: [], piles: [], crates: [] };
    W.trees.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.trees.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.rocks.forEach(function (t, i) { if (!t.alive || t.hp < t.max) o.rocks.push([i, Math.round(t.hp), t.given, Math.round(t.respawn)]); });
    W.piles.forEach(function (p, i) { if (p.searched) o.piles.push([i, Math.round(p.respawn)]); });
    W.crates.forEach(function (p, i) { if (p.searched) o.crates.push([i, Math.round(p.respawn)]); });
    return o;
  }
  function saveLocal() { try { localStorage.setItem(localKey(), JSON.stringify(snapshot())); flashSaved('Saved'); } catch (e) {} }
  function saveCloud() {
    if (!sb || !userId) return;
    sb.rpc('save_game', { p_game: 'webzombite', p_data: snapshot() }).then(function (r) { cloudOK = !r.error; if (r.error) flashSaved('Cloud save failed. Saved on this device.'); }, function () { cloudOK = false; });
  }
  function flashSaved(t) { var e = $('#saved'); if (!e) return; e.textContent = t; e.classList.add('on'); savedFlash = 1.6; }
  function applySave(s) {
    if (!s || s.v !== 1) return false;
    T = s.T || 0; kills = s.kills || 0;
    P.x = s.pos[0]; P.y = s.pos[1]; P.z = s.pos[2]; P.yaw = s.yaw || 0; P.pitch = s.pitch || 0;
    ['hp', 'hunger', 'thirst', 'energy', 'comfort'].forEach(function (k) { if (s.st && typeof s.st[k] === 'number') P[k] = s.st[k]; });
    status = s.status || { poison: 0, stomach: 0 }; inv = s.inv || {}; hot = (s.hot || []).concat([null, null, null, null, null, null, null, null]).slice(0, 8); sel = s.sel || 0;
    W.voxLoad(s.blocks || []); voxVer++;
    (s.trees || []).forEach(function (a) { var t = W.trees[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setTree(t, false); });
    (s.rocks || []).forEach(function (a) { var t = W.rocks[a[0]]; if (!t) return; t.hp = a[1]; t.given = a[2]; t.respawn = a[3]; if (t.hp <= 0) W.setRock(t, false); });
    (s.piles || []).forEach(function (a) { var p = W.piles[a[0]]; if (p) { W.setPile(p, false); p.respawn = a[1]; } });
    (s.crates || []).forEach(function (a) { var p = W.crates[a[0]]; if (p) { W.setCrate(p, false); p.respawn = a[1]; } });
    return true;
  }
  function newGame() {
    inv = { rusty_axe: 1, rusty_pickaxe: 1, plastic_bottled_water: 1 }; hot = [null, 'rusty_axe', 'rusty_pickaxe', 'plastic_bottled_water', null, null, null, null]; sel = 1;
    P.hp = P.hunger = P.thirst = P.energy = P.comfort = 100; status = { poison: 0, stomach: 0 }; T = 0; kills = 0;
    placeAtSpawn();
  }
  function placeAtSpawn() {
    P.x = W.spawn.x; P.z = W.spawn.z; P.y = 0; P.vx = P.vz = P.vy = 0; P.yaw = 0; P.pitch = 0;
    while (W.hit(P.x - 0.3, P.x + 0.3, P.y, P.y + 1.8, P.z - 0.3, P.z + 0.3) && P.y < 30) P.y += 1;
  }

  /* ---------------- inventory helpers ---------------- */
  function count(id) { return inv[id] || 0; }
  function give(id, n) {
    inv[id] = (inv[id] || 0) + n;
    var it = ITEMS[id];
    if (it && it.type !== 'material' && hot.indexOf(id) < 0) { for (var i = 1; i < 8; i++) if (!hot[i]) { hot[i] = id; break; } }
    renderHotbar();
  }
  function take(id, n) { inv[id] = (inv[id] || 0) - n; if (inv[id] <= 0) { delete inv[id]; for (var i = 1; i < 8; i++) if (hot[i] === id) hot[i] = null; } renderHotbar(); }
  function curItem() { return ITEMS[hot[sel] || 'fists']; }
  function say(t, bad) {
    var f = $('#feed'); if (!f) return; var d = document.createElement('div'); d.textContent = t; if (bad) d.className = 'bad'; f.appendChild(d);
    while (f.children.length > 5) f.removeChild(f.firstChild); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4200);
  }

  /* ---------------- input (with the Comfort delay) ---------------- */
  function inputDelay() { return P.comfort <= 0 ? 0.1 : P.comfort <= 30 ? 0.05 : 0; }
  function speedMult() { return P.comfort <= 0 ? 0.98 : P.comfort <= 30 ? 0.99 : 1; }
  var queue = [];
  function push(ev) { var d = inputDelay(); if (d <= 0 && !queue.length) applyEv(ev); else { ev.t = performance.now() + d * 1000; queue.push(ev); } }
  function drain() { var n = performance.now(); while (queue.length && queue[0].t <= n) applyEv(queue.shift()); }
  function applyEv(e) {
    if (mode !== 'play') { if (e.type === 'key' && !e.down) keys[e.code] = false; if (e.type === 'btn' && !e.down) lmb = false; return; }
    if (e.type === 'key') {
      keys[e.code] = e.down;
      if (e.down) {
        if (/^Digit[1-8]$/.test(e.code)) { sel = +e.code.slice(5) - 1; eatT = 0; renderHotbar(); }
        else if (e.code === 'KeyE') interact();
      }
    } else if (e.type === 'mouse') { P.yaw -= e.dx * 0.0022; P.pitch = clamp(P.pitch - e.dy * 0.0022, -1.5, 1.5); }
    else if (e.type === 'btn') { if (e.b === 0) { lmb = e.down; if (!e.down) { eatT = 0; } } else if (e.b === 2 && e.down) placeBlock(); }
    else if (e.type === 'wheel') { sel = (sel + (e.d > 0 ? 1 : 7)) % 8; eatT = 0; renderHotbar(); }
  }
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Tab' || e.code === 'KeyI') {
      e.preventDefault(); if (e.repeat) return;
      if (mode === 'play') openInv(false); else if (mode === 'inv') closeInv();
      return;
    }
    if (mode !== 'play') return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    push({ type: 'key', code: e.code, down: true });
  });
  window.addEventListener('keyup', function (e) { if (mode === 'play') push({ type: 'key', code: e.code, down: false }); else keys[e.code] = false; });
  document.addEventListener('mousemove', function (e) { if (mode === 'play' && document.pointerLockElement) push({ type: 'mouse', dx: e.movementX || 0, dy: e.movementY || 0 }); });
  document.addEventListener('mousedown', function (e) { if (mode === 'play' && document.pointerLockElement) { e.preventDefault(); push({ type: 'btn', b: e.button, down: true }); } });
  document.addEventListener('mouseup', function (e) { if (mode === 'play') push({ type: 'btn', b: e.button, down: false }); else lmb = false; });
  document.addEventListener('wheel', function (e) { if (mode === 'play') push({ type: 'wheel', d: e.deltaY }); }, { passive: true });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------------- pointer lock and screens ---------------- */
  function lock() { var c = $('#gl'); try { var p = c.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement) { if (mode === 'pause' || mode === 'ready') { mode = 'play'; $('#screen').hidden = true; $('#inv').hidden = true; } return; }
    if (mode === 'play') showPause();
  });
  document.addEventListener('pointerlockerror', function () { if (mode === 'pause') say('Click Resume again.'); });
  function screen(html) { var s = $('#screen'); s.innerHTML = html; s.hidden = false; }
  function showPause() {
    mode = 'pause'; keys = {}; lmb = false; eatT = 0; queue.length = 0; saveLocal(); saveCloud();
    screen('<div class="card"><span class="tag">Beta</span><h1>Paused</h1><p>Your progress is saved automatically.</p><div class="row"><button class="btn primary" id="bResume">Resume</button><button class="btn" id="bInv">Inventory &amp; Crafting</button><a class="btn" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div>' + controlsHtml() +
      '<div class="row"><button class="btn danger" id="bReset">Delete my save and start over</button></div></div>');
    $('#bResume').onclick = lock; $('#bInv').onclick = function () { $('#screen').hidden = true; openInv(false); };
    $('#bReset').onclick = function () { if (confirm('Delete your Webzombite save (cloud and this device) and start over?')) resetSave(); };
  }
  function controlsHtml() {
    return '<div class="keys"><b>W A S D</b><span>Move</span><b>Shift</b><span>Sprint (uses Energy)</span><b>Space</b><span>Jump</span><b>Left click</b><span>Hit / chop / mine / hold to eat</span><b>Right click</b><span>Place the selected block</span><b>E</b><span>Search, open, sit, sleep, use furnace</span><b>1-8 / wheel</b><span>Hotbar</span><b>Tab / I</b><span>Inventory and crafting</span></div>';
  }
  function resetSave() {
    try { localStorage.removeItem(localKey()); } catch (e) {}
    var done = function () { location.reload(); };
    if (sb && userId) sb.rpc('reset_game', { p_game: 'webzombite' }).then(done, done); else done();
  }

  /* ---------------- hotbar, stats, hud ---------------- */
  function renderHotbar() {
    var h = '';
    for (var i = 0; i < 8; i++) {
      var id = hot[i] || (i === 0 ? 'fists' : null), it = id ? ITEMS[id] : null;
      h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + (it ? it.ic : '') + (it && it.type !== 'tool' && id !== 'fists' ? '<em>' + count(id) + '</em>' : '') + '</div>';
    }
    var hb = $('#hotbar'); if (hb) hb.innerHTML = h;
    var held = $('#held'); if (held) held.textContent = ITEMS[hot[sel] || 'fists'].ic;
  }
  function renderStats() {
    var defs = [['hp', 'HP', 'b-hp'], ['hunger', 'Hunger', 'b-hu'], ['thirst', 'Thirst', 'b-th'], ['energy', 'Energy', 'b-en'], ['comfort', 'Comfort', 'b-co']];
    $('#stats').innerHTML = defs.map(function (d) { var v = Math.round(P[d[0]]); return '<div class="bar ' + d[2] + '"><i style="width:' + clamp(v, 0, 100) + '%"></i><span><b>' + d[1] + '</b><b>' + v + '</b></span></div>'; }).join('');
    var s = []; if (status.poison > 0) s.push('Poisoned'); if (status.stomach > 0) s.push('Stomachache'); if (P.comfort <= 30) s.push('Uncomfortable'); if (rest) s.push(rest.k === 'sleep' ? 'Sleeping' : 'Resting');
    $('#status').innerHTML = s.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    $('#info').innerHTML = 'Survived <b>' + fmtTime(T) + '</b> &nbsp; Kills <b>' + kills + '</b><br>Zombies nearby <b>' + zombies.length + '</b>';
  }

  /* ---------------- minimap ---------------- */
  var mini, mctx;
  function drawMini() {
    var S = 170, k = S / 220, g = mctx, cx = P.x, cz = P.z;
    function X(x) { return S / 2 + (x - cx) * k; } function Y(z) { return S / 2 + (z - cz) * k; }
    g.fillStyle = '#14120f'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#2d2a22'; g.fillRect(X(-250), Y(-250), 500 * k, 500 * k);
    g.fillStyle = '#4a4c50'; W.roads.forEach(function (r) { g.fillRect(X(r - 5), Y(-250), 10 * k, 500 * k); g.fillRect(X(-250), Y(r - 5), 500 * k, 10 * k); });
    W.rects.forEach(function (r) { if (r.x1 < cx - 115 || r.x0 > cx + 115 || r.z1 < cz - 115 || r.z0 > cz + 115) return; g.fillStyle = r.c; g.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k); });
    g.strokeStyle = '#b33a2a'; g.lineWidth = 2; g.strokeRect(X(-250), Y(-250), 500 * k, 500 * k);
    g.fillStyle = '#ff4b4b'; zombies.forEach(function (z) { if (Math.abs(z.x - cx) < 110 && Math.abs(z.z - cz) < 110) g.fillRect(X(z.x) - 2, Y(z.z) - 2, 4, 4); });
    g.save(); g.translate(S / 2, S / 2); g.rotate(-P.yaw); g.fillStyle = '#e3b02a'; g.beginPath(); g.moveTo(0, -7); g.lineTo(-5, 6); g.lineTo(5, 6); g.closePath(); g.fill(); g.restore();
  }

  /* ---------------- physics ---------------- */
  function moveBody(b, dx, dy, dz, r, h, canStep) {
    var i, top;
    if (dx) {
      b.x += dx; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r);
      if (i) { top = i.top; if (canStep && top - b.y <= 0.62 && !W.hit(b.x - r, b.x + r, top + 0.001, top + h, b.z - r, b.z + r)) b.y = top + 0.001; else { b.x -= dx; if (b.vx !== undefined) b.vx = 0; } }
    }
    if (dz) {
      b.z += dz; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r);
      if (i) { top = i.top; if (canStep && top - b.y <= 0.62 && !W.hit(b.x - r, b.x + r, top + 0.001, top + h, b.z - r, b.z + r)) b.y = top + 0.001; else { b.z -= dz; if (b.vz !== undefined) b.vz = 0; } }
    }
    if (dy) {
      b.y += dy; b.onGround = false; i = W.hit(b.x - r, b.x + r, b.y, b.y + h, b.z - r, b.z + r);
      if (i) { if (dy < 0) { b.y = i.top; b.onGround = true; } else b.y = i.bottom - h; b.vy = 0; }
      if (b.y <= 0) { b.y = 0; b.vy = 0; if (dy < 0) b.onGround = true; }
    }
  }
  function stepPlayer(dt) {
    var fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    var wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str, len = Math.hypot(wx, wz);
    if (rest && (fwd || str || keys.Space)) endRest();
    if (rest) { wx = wz = 0; len = 0; }
    if (len > 0) { wx /= len; wz /= len; }
    var sprint = keys.ShiftLeft && fwd > 0 && P.energy > 0 && !rest;
    var sp = (sprint ? 6.4 : 4.2) * speedMult() * (P.energy <= 0 ? 0.92 : 1);
    var a = P.onGround ? 14 : 3, f = Math.min(1, a * dt);
    P.vx += (wx * sp - P.vx) * f; P.vz += (wz * sp - P.vz) * f;
    if (sprint && len > 0) P.energy = Math.max(0, P.energy - 3 * dt);
    if (keys.Space && P.onGround && !rest) { P.vy = 6.4; P.onGround = false; }
    var n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
    for (var i = 0; i < n; i++) {
      P.vy -= 17 * h; if (P.vy < -40) P.vy = -40;
      moveBody(P, P.vx * h, 0, 0, 0.3, 1.8, P.onGround); moveBody(P, 0, 0, P.vz * h, 0.3, 1.8, P.onGround); moveBody(P, 0, P.vy * h, 0, 0.3, 1.8, false);
    }
    P.x = clamp(P.x, -249.6, 249.6); P.z = clamp(P.z, -249.6, 249.6);
  }

  /* ---------------- ray picking ---------------- */
  var DIR = new THREE.Vector3(), tmpE = [];
  function aim(reach) {
    camera.getWorldDirection(DIR);
    var ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, last = null, i;
    W.entsNear(P.x, P.z, reach + 1.5, tmpE);
    for (var t = 0.15; t <= reach; t += 0.07) {
      var x = ox + DIR.x * t, y = oy + DIR.y * t, z = oz + DIR.z * t;
      for (i = 0; i < zombies.length; i++) { var zb = zombies[i], ex = zb.x - x, ez = zb.z - z; if (ex * ex + ez * ez < zb.r2 && y > zb.y - 0.05 && y < zb.y + zb.h) return { kind: 'zombie', z: zb, t: t }; }
      for (i = 0; i < tmpE.length; i++) { var e = tmpE[i], fx = e.x - x, fz = e.z - z; if (fx * fx + fz * fz < e.r * e.r && y >= e.y - 0.05 && y <= e.y + e.h) return { kind: 'ent', e: e, t: t }; }
      var s = W.solidAt(x, y, z);
      if (s) return { kind: s === 'static' ? 'static' : 'vox', key: s, prev: last, t: t };
      if (y < 0) return { kind: 'ground', prev: last, t: t };
      last = [Math.floor(x), Math.floor(y), Math.floor(z)];
    }
    return null;
  }
  function unkey(k) { var y = k % 64, r = Math.floor(k / 64), z = (r % 1024) - 300, x = Math.floor(r / 1024) - 300; return [x, y, z]; }

  /* ---------------- actions: swing, chop, mine, eat, place, interact ---------------- */
  var VNAME = { 1: 'Wood Block', 2: 'Stone Block', 3: 'Melter Furnace' }, VITEM = { 1: 'wood_block', 2: 'stone_block', 3: 'furnace' };
  function damageVox(key, dmg, byPlayer) {
    var c = unkey(key), v = W.getVox(c[0], c[1], c[2]); if (!v) return;
    v.hp -= dmg;
    if (v.hp <= 0) {
      W.delVox(c[0], c[1], c[2]); voxVer++;
      if (v.t === 3) W.furn.forEach(function (f) { if (f.alive && f.vx === c[0] && f.vy === c[1] && f.vz === c[2]) f.alive = false; });
      if (byPlayer) give(VITEM[v.t], 1);
    }
  }
  function swing() {
    var it = curItem(); if (it.type === 'food' || it.type === 'drink' || it.type === 'block') return;
    var cd = it.tool === 'club' ? 0.55 : 0.48; if (P.energy <= 0) cd *= 1.4; swingCd = cd;
    var held = $('#held'); held.classList.add('swing'); setTimeout(function () { held.classList.remove('swing'); }, 110);
    var h = aim(3.0); if (!h) { beep(120, 0.05, 'triangle', 0.03); return; }
    if (h.kind === 'zombie') { hitZombie(h.z, it.dmg); return; }
    if (h.kind === 'vox') { var c = unkey(h.key), v = W.getVox(c[0], c[1], c[2]); damageVox(h.key, it.bd * 2, true); beep(160, 0.06, 'square', 0.05); if (v) say(VNAME[v.t] + (v.hp > 0 ? ' ' + Math.max(0, Math.round(v.hp)) : ' removed')); return; }
    if (h.kind !== 'ent') return;
    var e = h.e;
    if (e.k === 'tree' || e.k === 'rock') {
      var need = e.k === 'tree' ? 'axe' : 'pick';
      if (it.tool !== need) { say(e.k === 'tree' ? 'You need an axe to chop trees.' : 'You need a pickaxe to mine rocks.', true); return; }
      e.hp -= it.bd; beep(e.k === 'tree' ? 200 : 300, 0.07, 'square', 0.05);
      var frac = 1 - Math.max(0, e.hp) / e.max, goal = e.hp <= 0 ? e.yield : Math.floor(e.yield * frac), gain = goal - e.given;
      if (gain > 0) { e.given = goal; var item = e.k === 'tree' ? 'wood' : (e.ore ? 'iron_nugget' : 'stone'); give(item, gain); say('+' + gain + ' ' + ITEMS[item].name); }
      if (e.hp <= 0) {
        e.respawn = T + (e.k === 'tree' ? 600 : 720); if (e.k === 'tree') W.setTree(e, false); else W.setRock(e, false);
        say(e.k === 'tree' ? 'Tree felled.' : (e.ore ? 'Iron ore mined out.' : 'Rock broken.'));
      }
    }
  }
  function hitZombie(z, dmg) {
    var d = Math.max(1, dmg - z.def.def); z.hp -= d; z.flash = 0.14; beep(90, 0.07, 'sawtooth', 0.05);
    var dx = z.x - P.x, dz = z.z - P.z, l = Math.hypot(dx, dz) || 1; moveBody(z, dx / l * 0.35, 0, dz / l * 0.35, z.rad, 1.7, false);
    if (z.hp <= 0) killZombie(z);
  }
  function killZombie(z) {
    scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1); kills++;
    if (rnd() < 0.15) { var id = WZ.rollLoot('trash1', rnd); give(id, 1); say('+1 ' + ITEMS[id].name); }
  }
  function eatTick(dt) {
    var id = hot[sel], it = id ? ITEMS[id] : null;
    if (!(lmb && it && it.eat && count(id) > 0)) { eatT = 0; $('#eat').style.display = 'none'; return; }
    eatT += dt; var e = it.eat; $('#eat').style.display = 'block'; $('#eat i').style.width = clamp(eatT / e.t * 100, 0, 100) + '%'; $('#eat span').textContent = (it.type === 'drink' ? 'Drinking ' : 'Eating ') + it.name;
    if (eatT >= e.t) {
      eatT = 0; take(id, 1); P.hunger = clamp(P.hunger + e.h, 0, 100); P.thirst = clamp(P.thirst + e.th, 0, 100);
      var msg = it.name + ': ' + (e.h ? '+' + e.h + ' Hunger ' : '') + (e.th ? (e.th > 0 ? '+' : '') + e.th + ' Thirst' : '');
      if (e.poison && rnd() < e.poison) { status.poison = 15; msg += ' - You feel sick (Poisoned)'; }
      if (e.stomach && rnd() < e.stomach) { status.stomach = 30; msg += ' - Stomachache'; }
      say(msg, /sick|Stomach/.test(msg)); beep(260, 0.1, 'sine', 0.05); renderHotbar();
    }
  }
  function overlapsPlayer(x, y, z) { return x + 1 > P.x - 0.3 && x < P.x + 0.3 && y + 1 > P.y && y < P.y + 1.8 && z + 1 > P.z - 0.3 && z < P.z + 0.3; }
  function placeBlock() {
    var id = hot[sel], it = id ? ITEMS[id] : null; if (!it || it.type !== 'block' || count(id) < 1) return;
    var h = aim(5); if (!h || !h.prev) return; var c = h.prev;
    if (W.voxCount() >= 5800) { say('Block limit reached for this world.', true); return; }
    if (overlapsPlayer(c[0], c[1], c[2])) { say('Not enough room: you are in the way.', true); return; }
    for (var i = 0; i < zombies.length; i++) { var z = zombies[i]; if (Math.abs(z.x - c[0] - 0.5) < 0.85 && Math.abs(z.z - c[2] - 0.5) < 0.85 && z.y < c[1] + 1 && z.y + z.h > c[1]) { say('A zombie is in the way.', true); return; } }
    if (W.hit(c[0] + 0.02, c[0] + 0.98, c[1] + 0.02, c[1] + 0.98, c[2] + 0.02, c[2] + 0.98)) { say('Something is in the way.', true); return; }
    if (!W.setVox(c[0], c[1], c[2], it.vox, it.hp)) { say('You cannot build there.', true); return; }
    if (it.vox === 3) W.addFurnaceEnt(c[0], c[1], c[2]);
    voxVer++; take(id, 1); beep(220, 0.05, 'square', 0.04);
  }
  function searchEnt(e) {
    if (e.searched) { say('Already searched. Check back later.'); return; }
    var got = {}, rolls = 1, key;
    if (e.k === 'pile') { key = e.tier === 2 && WZ.LOOT.trash2.enabled ? 'trash2' : 'trash1'; }
    else { key = 'crate1'; rolls = WZ.LOOT.crate1.rolls; }
    for (var i = 0; i < rolls; i++) { var id = WZ.rollLoot(key, rnd); got[id] = (got[id] || 0) + 1; }
    Object.keys(got).forEach(function (id) { give(id, got[id]); say('+' + got[id] + ' ' + ITEMS[id].name); });
    if (e.k === 'pile') { W.setPile(e, false); e.respawn = T + 300; } else { W.setCrate(e, false); e.respawn = T + 480; }
    beep(330, 0.08, 'triangle', 0.05);
  }
  function endRest() { rest = null; $('#dark').style.opacity = 0; }
  function interact() {
    var h = aim(3.6); if (!h || h.kind !== 'ent') return; var e = h.e;
    if (e.k === 'pile' || e.k === 'crate') searchEnt(e);
    else if (e.k === 'bed') { rest = { k: 'sleep' }; P.vx = P.vz = 0; $('#dark').style.opacity = 0.75; say('Sleeping on the bed. Move or press a key to get up.'); }
    else if (e.k === 'couch') { if (!e.clean) say('This couch is too dirty. It will not restore Comfort.', true); else { rest = { k: 'sit' }; P.vx = P.vz = 0; say('Sitting on a clean couch. Comfort is recovering.'); } }
    else if (e.k === 'furnace') openInv(true);
  }

  /* ---------------- stats ---------------- */
  function hurt(n) {
    if (dead) return; P.hp -= n; P.comfort = Math.max(0, P.comfort - 3); if (rest) endRest();
    var v = $('#vig'); v.style.opacity = 1; setTimeout(function () { v.style.opacity = 0; }, 180); beep(70, 0.15, 'sawtooth', 0.07);
    if (P.hp <= 0) die();
  }
  function die() {
    dead = true; mode = 'dead'; keys = {}; lmb = false; if (document.pointerLockElement) document.exitPointerLock();
    screen('<div class="card"><span class="tag">You died</span><h1>The city got you.</h1><p>You survived <b>' + fmtTime(T) + '</b> and took down <b>' + kills + '</b> zombies. Your base is still standing. You keep your tools and blocks but lose everything you looted.</p><div class="row"><button class="btn primary" id="bResp">Respawn</button><a class="btn" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a></div></div>');
    $('#bResp').onclick = respawn;
  }
  function respawn() {
    Object.keys(inv).forEach(function (id) { var t = ITEMS[id].type; if (t !== 'tool' && t !== 'block') delete inv[id]; });
    if (!count('rusty_axe') && !count('crude_axe') && !count('iron_axe')) inv.rusty_axe = 1;
    if (!count('rusty_pickaxe') && !count('crude_pickaxe') && !count('iron_pickaxe')) inv.rusty_pickaxe = 1;
    for (var i = 1; i < 8; i++) if (hot[i] && !inv[hot[i]]) hot[i] = null;
    P.hp = P.hunger = P.thirst = P.energy = P.comfort = 100; status = { poison: 0, stomach: 0 }; dead = false; rest = null; zombies.forEach(function (z) { scene.remove(z.g); }); zombies.length = 0; spawnT = 6;
    placeAtSpawn(); give('wood_sticks', 0); renderHotbar(); saveLocal(); saveCloud(); mode = 'pause'; $('#screen').hidden = true; lock(); if (!document.pointerLockElement) showPause();
  }
  function stats(dt) {
    var hm = status.stomach > 0 ? 3 : 1, sl = rest && rest.k === 'sleep';
    P.hunger = Math.max(0, P.hunger - 0.12 * hm * dt); P.thirst = Math.max(0, P.thirst - 0.17 * hm * dt);
    P.comfort = Math.max(0, P.comfort - 0.05 * dt); P.energy = Math.max(0, P.energy - 0.07 * dt);
    if (rest) { if (sl) { P.comfort = Math.min(100, P.comfort + 4 * dt); P.energy = Math.min(100, P.energy + 6 * dt); } else { P.comfort = Math.min(100, P.comfort + 2.5 * dt); P.energy = Math.min(100, P.energy + 1.5 * dt); } }
    else if (Math.hypot(P.vx, P.vz) < 0.2) P.energy = Math.min(100, P.energy + 0.3 * dt);
    if (status.poison > 0) { status.poison -= dt; P.hp -= 1.2 * dt; if (P.hp <= 0) die(); }
    if (status.stomach > 0) status.stomach -= dt;
    if (P.hunger <= 0) { P.hp -= 0.8 * dt; } if (P.thirst <= 0) { P.hp -= 0.8 * dt; }
    if (P.hp <= 0 && !dead) die();
    if (P.hunger > 40 && P.thirst > 40 && status.poison <= 0 && P.hp < 100) P.hp = Math.min(100, P.hp + 0.4 * dt);
  }

  /* ---------------- zombies ---------------- */
  var BOX = new THREE.BoxGeometry(1, 1, 1), EYE = new THREE.MeshBasicMaterial({ color: 0xff3030 });
  function tint(c, k) { var col = new THREE.Color(c); col.multiplyScalar(1 + k); return col; }
  function makeZombie(type, x, z) {
    var d = ZDEF[type], g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: d.color }), cloth = new THREE.MeshLambertMaterial({ color: tint(d.color, -0.4) }), pants = new THREE.MeshLambertMaterial({ color: tint(d.color, -0.6) });
    function bx(w, h, dd, m, px, py, pz, parent) { var o = new THREE.Mesh(BOX, m); o.scale.set(w, h, dd); o.position.set(px, py, pz); (parent || g).add(o); return o; }
    var wide = type === 'big' || type === 'brute' ? 1.25 : type === 'bomber' ? 1.3 : 1;
    bx(0.52 * wide, 0.7, 0.3 * wide, cloth, 0, 1.05, 0); bx(0.32, 0.32, 0.32, skin, 0, 1.55, 0);
    bx(0.07, 0.05, 0.02, EYE, -0.08, 1.58, -0.17); bx(0.07, 0.05, 0.02, EYE, 0.08, 1.58, -0.17);
    var lL = new THREE.Group(), lR = new THREE.Group(), aL = new THREE.Group(), aR = new THREE.Group();
    lL.position.set(-0.14 * wide, 0.7, 0); lR.position.set(0.14 * wide, 0.7, 0); aL.position.set(-0.36 * wide, 1.38, 0); aR.position.set(0.36 * wide, 1.38, 0);
    [lL, lR, aL, aR].forEach(function (p) { g.add(p); });
    bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lL); bx(0.2, 0.7, 0.22, pants, 0, -0.35, 0, lR); bx(0.15, 0.62, 0.15, skin, 0, -0.3, 0, aL); bx(0.15, 0.62, 0.15, skin, 0, -0.3, 0, aR);
    aL.rotation.x = aR.rotation.x = -1.35;
    if (type === 'soldier') { bx(0.38, 0.17, 0.38, new THREE.MeshLambertMaterial({ color: 0x2f4a2c }), 0, 1.74, 0); }
    if (type === 'bomber') { bx(0.34, 0.3, 0.05, new THREE.MeshBasicMaterial({ color: 0xff7a1a }), 0, 1.1, -0.18 * wide); bx(0.3, 0.4, 0.14, new THREE.MeshLambertMaterial({ color: 0x3a2a1e }), 0, 1.1, 0.2); }
    g.scale.setScalar(d.scale); g.position.set(x, 0, z); scene.add(g);
    var rad = 0.32 * Math.sqrt(d.scale) * wide * 0.9;
    return { type: type, def: d, g: g, x: x, y: 0, z: z, hp: d.hp, vy: 0, onGround: true, rad: rad, r2: Math.pow(0.52 * d.scale * wide, 2), h: 1.9 * d.scale, cd: 0.4, anim: rnd() * 6, legs: [lL, lR], arms: [aL, aR], mats: [skin, cloth], flash: 0, sx: 0, sz: 0, stuck: 0 };
  }
  function spawnZombie(near) {
    var pool = [], sum = 0, tier2 = T > 300; for (var k in ZDEF) if (ZDEF[k].tier === 1 || tier2) { pool.push(k); sum += ZDEF[k].w; }
    var r = rnd() * sum, type = pool[0]; for (var i = 0; i < pool.length; i++) { r -= ZDEF[pool[i]].w; if (r <= 0) { type = pool[i]; break; } }
    var H = WZ.SPAWN_HALF, best = null;
    for (var j = 0; j < (near ? 1 : 3); j++) {
      var side = (rnd() * 4) | 0, t = (rnd() * 2 - 1) * H, x = side < 2 ? t : (side === 2 ? -H : H), z = side < 2 ? (side === 0 ? -H : H) : t, d = Math.hypot(x - P.x, z - P.z);
      if (!best || d < best.d) best = { x: x, z: z, d: d };
    }
    zombies.push(makeZombie(type, best.x, best.z));
  }
  function explode(z) {
    var s = z.def.splash || 4, d = Math.hypot(P.x - z.x, P.y + 0.9 - z.y - 0.9, P.z - z.z);
    if (d < s) hurt(Math.round(z.def.dmg * (1 - Math.max(0, d - 1.5) / (s - 1.5 + 0.001))));
    var cx = Math.floor(z.x), cz = Math.floor(z.z), R = Math.ceil(s - 1);
    for (var x = cx - R; x <= cx + R; x++) for (var y = 0; y <= 4; y++) for (var q = cz - R; q <= cz + R; q++) { if (W.getVox(x, y, q) && Math.hypot(x + 0.5 - z.x, y + 0.5 - 1, q + 0.5 - z.z) < s) damageVox(W.vkey(x, y, q), z.def.dmg, false); }
    beep(55, 0.4, 'sawtooth', 0.09); scene.remove(z.g); var i = zombies.indexOf(z); if (i >= 0) zombies.splice(i, 1);
  }
  var ANG = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
  function stepZombie(z, dt) {
    var dx = P.x - z.x, dz = P.z - z.z, dist = Math.hypot(dx, dz), base = Math.atan2(dz, dx), sp = z.def.spd * 2.2;
    z.cd -= dt; z.anim += dt * sp * 2.2;
    if (dist > 0.01 && Math.abs(P.y - z.y) < 2.2 && dist < 1.15 + z.def.scale * 0.35) {
      if (z.type === 'bomber') { explode(z); return; }
      if (z.cd <= 0) { z.cd = z.def.cd; hurt(z.def.dmg); }
    }
    if (z.type === 'bomber' && dist < 1.9 + 0.2) { explode(z); return; }
    /* steering: go straight; if a wall is in the way try other angles. A player block in the way gets attacked. */
    var moved = false, hitInfo = null;
    for (var a = 0; a < ANG.length && !moved; a++) {
      var ang = base + ANG[a], mx = Math.cos(ang) * sp * dt, mz = Math.sin(ang) * sp * dt, ox = z.x, oz = z.z;
      var i = W.hit(z.x + mx - z.rad, z.x + mx + z.rad, 0.05, 1.7, z.z + mz - z.rad, z.z + mz + z.rad);
      if (!i) { z.x += mx; z.z += mz; moved = true; }
      else if (a === 0) hitInfo = { vox: i.vox };
    }
    if (!moved && hitInfo && hitInfo.vox != null && z.cd <= 0) {
      if (z.type === 'bomber') { explode(z); return; }
      z.cd = z.def.cd || 1; var c = unkey(hitInfo.vox); damageVox(hitInfo.vox, z.def.dmg * 3, false); beep(100, 0.05, 'square', 0.03);
    }
    for (var k = 0; k < zombies.length; k += 1) { var o = zombies[k]; if (o === z) continue; var ex = z.x - o.x, ez = z.z - o.z, d2 = ex * ex + ez * ez; if (d2 < 0.5 && d2 > 0.0001) { var d = Math.sqrt(d2), p = (0.7 - d) * 0.5; z.x += ex / d * p * dt * 6; z.z += ez / d * p * dt * 6; } }
    z.g.position.set(z.x, 0, z.z); z.g.rotation.y = Math.atan2(-Math.cos(base), -Math.sin(base) * 0 - Math.sin(base) * 0) * 0 + Math.atan2(-dx, -dz);
    var sw = Math.sin(z.anim) * 0.7; z.legs[0].rotation.x = sw; z.legs[1].rotation.x = -sw; z.arms[0].rotation.x = -1.35 + Math.sin(z.anim * 0.5) * 0.15; z.arms[1].rotation.x = -1.35 - Math.sin(z.anim * 0.5) * 0.15;
    if (z.flash > 0) { z.flash -= dt; var on = z.flash > 0; z.mats.forEach(function (m) { m.emissive.setHex(on ? 0x992222 : 0x000000); }); }
  }
  function zombieLogic(dt) {
    spawnT -= dt;
    var cap = Math.min(60, 16 + Math.floor(T / 60) * 3), interval = Math.max(1.2, 6 - T / 120);
    if (spawnT <= 0 && zombies.length < cap) { spawnZombie(false); spawnT = interval; }
    for (var i = zombies.length - 1; i >= 0; i--) { var z = zombies[i]; if (!z.dead) stepZombie(z, dt); }
  }

  /* ---------------- inventory and crafting panel ---------------- */
  function nearFurnace() { for (var i = 0; i < W.furn.length; i++) { var f = W.furn[i]; if (f.alive && Math.hypot(f.x - P.x, f.z - P.z) < 5.5) return true; } return false; }
  function openInv(fromFurnace) {
    mode = 'inv'; keys = {}; lmb = false; eatT = 0; queue.length = 0; invFurn = !!fromFurnace; if (document.pointerLockElement) document.exitPointerLock(); $('#screen').hidden = true; $('#inv').hidden = false; renderInv();
  }
  function closeInv() { $('#inv').hidden = true; mode = 'pause'; lock(); setTimeout(function () { if (mode === 'pause' && !document.pointerLockElement) showPause(); }, 250); }
  function costHtml(r) { return Object.keys(r.cost).map(function (id) { var have = count(id), ok = have >= r.cost[id]; return '<span class="' + (ok ? 'ok' : 'no') + '">' + ITEMS[id].ic + ' ' + have + '/' + r.cost[id] + ' ' + ITEMS[id].name + '</span>'; }).join(' &middot; '); }
  function renderInv() {
    var ids = Object.keys(inv).filter(function (id) { return inv[id] > 0 && ITEMS[id]; });
    var h = '<div class="inv-wrap"><div class="top"><h2 style="margin:0">Inventory &amp; Crafting</h2><div class="row" style="display:flex;gap:8px"><button class="btn primary" id="bBack">Back to game (Tab)</button></div></div>';
    h += '<div class="box"><h2>Hotbar</h2><div class="hb">';
    for (var i = 0; i < 8; i++) { var hid = hot[i] || (i === 0 ? 'fists' : null); h += '<div class="slot' + (i === sel ? ' sel' : '') + '" data-slot="' + i + '"><small>' + (i + 1) + '</small>' + (hid ? ITEMS[hid].ic : '') + '</div>'; }
    h += '</div><p class="m" style="color:var(--muted);font-size:.8rem;margin:0 0 10px">Click a slot to select it, then click an item to put it in that slot (tools, blocks, food and drinks).</p><h2>Items</h2>';
    h += ids.length ? '<div class="items">' + ids.map(function (id) { var it = ITEMS[id]; return '<button class="it" data-item="' + id + '"><b>' + it.ic + '</b>' + esc(it.name) + '<em>' + inv[id] + '</em></button>'; }).join('') + '</div>' : '<p class="m" style="color:var(--muted)">Nothing yet. Search trash piles and crates, chop trees and mine rocks.</p>';
    h += '<div class="detail" id="detail">' + detailHtml(selItem) + '</div></div>';
    h += '<div class="box"><h2>Crafting</h2>' + WZ.RECIPES.map(function (r) {
      var out = ITEMS[r.out[0]], can = Object.keys(r.cost).every(function (id) { return count(id) >= r.cost[id]; }) && (!r.furnace || nearFurnace());
      return '<div class="rec"><div><b>' + out.ic + ' ' + esc(r.label || out.name) + (r.out[1] > 1 ? ' x' + r.out[1] : '') + '</b><div class="cost">' + costHtml(r) + (r.furnace ? '<br>' + (nearFurnace() ? 'Melter Furnace nearby' : 'Needs a Melter Furnace nearby') : '') + '</div></div><button class="btn' + (can ? ' primary' : '') + '" data-craft="' + r.id + '"' + (can ? '' : ' disabled') + '>' + (r.furnace ? 'Melt' : 'Craft') + '</button></div>';
    }).join('') + '<p class="m" style="color:var(--muted);font-size:.8rem">Tier 3 trash and the Computering Bench are coming soon.</p></div></div>';
    var p = $('#inv'); p.innerHTML = h;
    $('#bBack').onclick = closeInv;
  }
  function detailHtml(id) {
    if (!id || !ITEMS[id]) return '<span class="m">Click an item to see what it does.</span>';
    var it = ITEMS[id], s = '<h3>' + it.ic + ' ' + esc(it.name) + '</h3><div>' + esc(it.desc) + '</div>';
    if (it.eat) { var e = it.eat; s += '<div class="m">' + (it.type === 'drink' ? 'Drinking' : 'Eating') + ' Duration: ' + e.t + ' seconds &middot; Hunger Recover: ' + e.h + ' &middot; Thirst Recover: ' + e.th + (e.poison ? ' &middot; ' + Math.round(e.poison * 100) + '% chance to get Poisoned' : '') + (e.stomach ? ' &middot; ' + Math.round(e.stomach * 100) + '% chance to get Stomachache' : '') + '</div>'; }
    if (it.tool) s += '<div class="m">Break Damage: ' + it.bd + ' &middot; Weapon damage: ' + it.dmg + '</div>';
    if (it.note) s += '<div class="m">' + esc(it.note) + '</div>';
    return s;
  }
  document.addEventListener('click', function (ev) {
    if (mode !== 'inv') return;
    var t = ev.target.closest('[data-item],[data-slot],[data-craft]'); if (!t) return;
    if (t.dataset.slot != null) { sel = +t.dataset.slot; renderHotbar(); renderInv(); return; }
    if (t.dataset.item) {
      var id = t.dataset.item, it = ITEMS[id]; selItem = id;
      if (it.type !== 'material') { var s = sel === 0 ? 1 : sel; for (var i = 0; i < 8; i++) if (hot[i] === id) hot[i] = null; hot[s] = id; if (sel === 0) sel = 1; renderHotbar(); }
      renderInv(); return;
    }
    if (t.dataset.craft) {
      var r = WZ.RECIPES.filter(function (x) { return x.id === t.dataset.craft; })[0]; if (!r) return;
      if (!Object.keys(r.cost).every(function (k) { return count(k) >= r.cost[k]; }) || (r.furnace && !nearFurnace())) return;
      Object.keys(r.cost).forEach(function (k) { take(k, r.cost[k]); }); give(r.out[0], r.out[1]); say('Crafted ' + ITEMS[r.out[0]].name + (r.out[1] > 1 ? ' x' + r.out[1] : '')); beep(400, 0.08, 'triangle', 0.05); renderInv();
    }
  });

  /* ---------------- main loop ---------------- */
  var clock = { last: 0 };
  function update(dt) {
    drain();
    T += dt; swingCd -= dt;
    if (rest) { var tgt = rest.k === 'sleep' ? 0.5 : 1.1; P.y = P.y; }
    stepPlayer(dt); stats(dt); if (dead) return;
    if (lmb) { var it = curItem(); if (it.type === 'tool' && swingCd <= 0) swing(); }
    eatTick(dt); zombieLogic(dt);
    if (T - respawnCheck > 1) { respawnCheck = T; respawn_world(); }
  }
  function respawn_world() {
    W.trees.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setTree(t, true); } });
    W.rocks.forEach(function (t) { if (!t.alive && T >= t.respawn) { t.hp = t.max; t.given = 0; W.setRock(t, true); } });
    W.piles.forEach(function (p) { if (p.searched && T >= p.respawn) W.setPile(p, true); });
    W.crates.forEach(function (p) { if (p.searched && T >= p.respawn) W.setCrate(p, true); });
  }
  function hud(now) {
    renderStats(); drawMini();
    var h = mode === 'play' ? aim(3.6) : null, txt = '', cross = $('#cross'); cross.className = '';
    if (h) {
      if (h.kind === 'zombie') { cross.className = 'on-zombie'; txt = h.z.def.name + '  HP ' + Math.max(0, Math.round(h.z.hp)) + '/' + h.z.def.hp + (h.z.def.def ? '  DEF ' + h.z.def.def : ''); }
      else if (h.kind === 'vox') { var c = unkey(h.key), v = W.getVox(c[0], c[1], c[2]); if (v) txt = VNAME[v.t] + '  CH ' + Math.max(0, Math.round(v.hp)); }
      else if (h.kind === 'ent') {
        var e = h.e;
        if (e.k === 'pile') txt = e.searched ? 'Searched trash' : '[E] Search trash (Tier ' + e.tier + ')';
        else if (e.k === 'crate') txt = e.searched ? 'Empty crate' : '[E] Open wooden crate';
        else if (e.k === 'bed') txt = '[E] Sleep on the bed';
        else if (e.k === 'couch') txt = e.clean ? '[E] Sit on the clean couch' : 'Dirty couch (no Comfort)';
        else if (e.k === 'furnace') txt = '[E] Use Melter Furnace';
        else if (e.k === 'tree') txt = 'Tree  Construction Health ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'axe' ? '' : '  (needs an axe)');
        else if (e.k === 'rock') txt = (e.ore ? 'Iron ore' : 'Rock') + '  Construction Health ' + Math.max(0, Math.round(e.hp)) + '/' + e.max + (curItem().tool === 'pick' ? '' : '  (needs a pickaxe)');
      }
    }
    $('#prompt').textContent = txt;
  }
  function frame(ms) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ms - clock.last) / 1000); clock.last = ms; if (dt <= 0) return;
    if (mode === 'play') {
      update(dt);
      if (ms - lastHud > 100) { lastHud = ms; hud(ms); }
      if (ms - lastSave > 1000) { lastSave = ms; saveLocal(); }
      if (ms - lastCloud > 10000) { lastCloud = ms; saveCloud(); }
    }
    if (savedFlash > 0) { savedFlash -= dt; if (savedFlash <= 0) $('#saved').classList.remove('on'); }
    var eye = P.y + (rest ? (rest.k === 'sleep' ? 0.55 : 1.0) : 1.62);
    camera.position.set(P.x, eye, P.z); camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    renderer.render(scene, camera);
  }

  /* ---------------- start up ---------------- */
  function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x8a8078, 1); renderer.autoClear = true;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 420);
    W = WZ.createWorld(THREE, scene);
    window.addEventListener('resize', function () { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
    mini = $('#mini'); mctx = mini.getContext('2d');
    window.addEventListener('beforeunload', function () { if (mode !== 'boot' && mode !== 'gate') { saveLocal(); saveCloud(); } });
    document.addEventListener('click', function (e) { var s = e.target.closest('.slot[data-i]'); });
  }
  function authStore() {
    return {
      getItem: function (k) { var v = null; try { v = localStorage.getItem(k); } catch (e) {} if (v == null) { try { v = sessionStorage.getItem(k); } catch (e) {} } return v; },
      setItem: function (k, v) { try { if (sessionStorage.getItem(k) != null && localStorage.getItem(k) == null) sessionStorage.setItem(k, v); else localStorage.setItem(k, v); } catch (e) {} },
      removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) {} try { sessionStorage.removeItem(k); } catch (e) {} }
    };
  }
  function backLink() { return '<a class="btn" href="' + esc(C.coreUrl || '../index.html') + '">Back to XKing Core</a>'; }
  function gateScreen(html) { mode = 'gate'; screen('<div class="card"><span class="tag">Under Development &middot; Beta</span><h1><b>Webzombite</b></h1>' + html + '</div>'); }
  function boot() {
    screen('<div class="card"><h1><b>Webzombite</b></h1><p>Loading...</p></div>');
    if (!window.THREE) { gateScreen('<p>The 3D engine did not load. Check that vendor/three.min.js is uploaded.</p><div class="row">' + backLink() + '</div>'); return; }
    if (!window.supabase || !C.supabaseUrl) { gateScreen('<p>The connection library did not load.</p><div class="row">' + backLink() + '</div>'); return; }
    if (('ontouchstart' in window) && !window.matchMedia('(pointer:fine)').matches) { gateScreen('<p>The Webzombite beta needs a computer with a keyboard and mouse.</p><div class="row">' + backLink() + '</div>'); return; }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { storage: authStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session; if (!s) { gateScreen('<p>Sign in on XKing Core first, then come back through the ACT Games tab.</p><div class="row">' + backLink() + '</div>'); return; }
      userId = s.user.id;
      sb.rpc('beta_check').then(function (c) { if (c.data === true) loadAndReady(); else askPassword(); }, function () { askPassword(); });
    }, function () { gateScreen('<p>Could not reach the server. Try again in a moment.</p><div class="row">' + backLink() + '</div>'); });
  }
  function askPassword() {
    gateScreen('<p>This game is Under Development. Enter the beta password to play.</p><input type="password" id="pw" placeholder="Beta password" autocomplete="off"><div class="err" id="perr"></div><div class="row"><button class="btn primary" id="bUnlock">Unlock</button>' + backLink() + '</div>');
    function go() {
      var v = $('#pw').value.trim(); if (!v) return; $('#bUnlock').disabled = true;
      sb.rpc('beta_unlock', { p_password: v }).then(function (r) { if (r.error) { $('#perr').textContent = r.error.message; $('#bUnlock').disabled = false; } else if (r.data === true) loadAndReady(); else { $('#perr').textContent = 'Wrong password.'; $('#bUnlock').disabled = false; } });
    }
    $('#bUnlock').onclick = go; $('#pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }
  function loadAndReady() {
    initThree(); renderHotbar();
    var local = null; try { local = JSON.parse(localStorage.getItem(localKey()) || 'null'); } catch (e) {}
    sb.rpc('load_game', { p_game: 'webzombite' }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }).then(function (cloud) {
      var s = cloud && local ? (cloud.savedAt >= local.savedAt ? cloud : local) : (cloud || local);
      if (!(s && applySave(s))) newGame(); else if (P.hp <= 0) { P.hp = 100; }
      renderHotbar(); renderStats();
      for (var i = 0; i < 6; i++) spawnZombie(false);
      mode = 'ready'; var has = !!s;
      screen('<div class="card"><span class="tag">Under Development &middot; Beta</span><h1><b>Webzombite</b></h1><p>The apocalypse hit XKing Supreme Large City. Chop, mine, loot and build a base inside a 500 m x 500 m map. Zombies come from every side. Your progress saves automatically.</p>' + controlsHtml() +
        '<div class="row"><button class="btn primary" id="bPlay">' + (has ? 'Continue' : 'Start') + '</button>' + backLink() + '</div></div>');
      $('#bPlay').onclick = function () { $('#hud').hidden = false; mode = 'ready'; lock(); setTimeout(function () { if (!document.pointerLockElement && mode === 'ready') { mode = 'pause'; showPause(); $('#hud').hidden = false; } }, 600); };
      clock.last = performance.now(); requestAnimationFrame(frame);
    });
  }
  window.WZ.debug = function () { return { scene: scene, renderer: renderer, camera: camera, P: P, zombies: zombies, inv: inv, W: W, T: function () { return T; }, mode: function () { return mode; }, setMode: function (m) { mode = m; } }; };
  boot();
})();
