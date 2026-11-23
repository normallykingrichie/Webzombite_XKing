/* world.js - Webzombite */
(function (WZ) {
  'use strict';
  WZ.HALF = 2500; WZ.SPAWN_HALF = 2525; /* map 5000 m x 5000 m, mob spawn ring 5050 m x 5050 m */
  /* ================= TERRAIN (map 5000 x 5000). Core 2000 x 2000 stays flat (roads, city). The 1500 m ring around it has hills, dunes, mountains, beach and sea. ================= */
  var TR = WZ.TERRAIN = {}, CORE = 1000, STEP = 20, NG = Math.round(WZ.HALF * 2 / STEP), TH = null;
  function th2(ix, iz) { var h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + 1013904223) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnz(x, z) { var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz); var a = th2(ix, iz), b = th2(ix + 1, iz), c = th2(ix, iz + 1), d = th2(ix + 1, iz + 1); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
  function fbm(x, z, o) { var s = 0, a = 0.5, n = 0; for (var i = 0; i < (o || 3); i++) { s += a * vnz(x, z); n += a; x *= 2.03; z *= 2.03; a *= 0.5; } return s / n; }
  function sst(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  TR.sst = sst; TR.CORE = CORE;
  function dOf(x, z) { return Math.max(Math.abs(x), Math.abs(z)); }
  function seaD(x, z) { return 2150 + 130 * (vnz(x / 300 + 11, z / 300 + 7) - 0.5); }
  function mtField(x, z) { return fbm(x / 650 + 31, z / 650 + 17, 3); }
  function regionW(x, z) { /* smooth base-biome weights from the core's quadrant rules */
    var wS = 1 - sst(-540, -460, z), r = 1 - wS, wD = r * sst(460, 540, x), wJ = r * (1 - sst(-540, -460, x)) * (1 - sst(460, 540, x)) * 0 + r * (1 - sst(-540, -460, x)) * (1 - wD / Math.max(r, 1e-6)), wC = Math.max(0, r - wD - wJ);
    return [wJ, wD, wS, wC];
  }
  /* height without pads */
  function hBare(x, z) {
    var d = dOf(x, z); if (d < CORE - 40) return 0;
    var ring = sst(CORE - 20, CORE + 80, d), rw = regionW(x, z);
    var hill = (fbm(x / 110, z / 110, 3) - 0.5);
    var hC = hill * 8 + 3, hS = hill * 8 + 3, hJ = (fbm(x / 160, z / 160, 3) - 0.35) * 34, dn = fbm(x / 70 + 5, z / 120 + 9, 3), hD = Math.pow(dn, 1.6) * 30;
    var hb = rw[0] * hJ + rw[1] * hD + rw[2] * hS + rw[3] * hC; hb = Math.max(0, hb);
    var mf = mtField(x, z), M = sst(0.54, 0.64, mf) * sst(CORE + 120, CORE + 320, d), K = sst(0.70, 0.78, mf) * M;
    var mh = 100 + fbm(x / 140, z / 140, 4) * 125, ph = 225 + fbm(x / 90 + 3, z / 90 + 3, 3) * 125;
    var hM = mh + (ph - mh) * K;
    var sd = seaD(x, z), fl = sst(sd - 330, sd - 120, d), h = hb * (1 - M) + hM * M; h = h * (1 - fl) + 0.2 * fl; M = M * (1 - fl);
    if (d > sd - 20) h = 0.2 - (d - (sd - 20)) * 0.32;
    return Math.max(-30, h) * ring;
  }
  /* flat pads for big buildings in the Downtown Mountain areas */
  TR.pads = []; (function () {
    var G = 260; for (var gx = -2200; gx <= 2200; gx += G) for (var gz = -2200; gz <= 2200; gz += G) {
      var jx = gx + (th2(gx, gz) - 0.5) * 120, jz = gz + (th2(gz + 7, gx + 3) - 0.5) * 120, d = dOf(jx, jz); if (d < CORE + 200 || d > 2000) continue;
      var mf = mtField(jx, jz); if (mf < 0.58 || mf > 0.76) continue; if (th2(gx + 99, gz + 55) > 0.32) continue;
      TR.pads.push({ x: jx, z: jz, r: 40, h: Math.round(hBare(jx, jz)) });
    }
  })();
  function hFull(x, z) { var h = hBare(x, z); for (var i = 0; i < TR.pads.length; i++) { var p = TR.pads[i], dd = Math.hypot(x - p.x, z - p.z); if (dd < p.r + 36) { var t = sst(p.r, p.r + 36, dd); h = p.h * (1 - t) + h * t; } } return h; }
  TH = new Float32Array((NG + 1) * (NG + 1)); (function () { for (var j = 0; j <= NG; j++) for (var i = 0; i <= NG; i++) TH[j * (NG + 1) + i] = hFull(-WZ.HALF + i * STEP, -WZ.HALF + j * STEP); })();
  TR.grid = TH; TR.NG = NG; TR.STEP = STEP;
  TR.gh = function (x, z) {
    if (x <= -WZ.HALF || x >= WZ.HALF || z <= -WZ.HALF || z >= WZ.HALF || (Math.abs(x) < CORE - 40 && Math.abs(z) < CORE - 40)) return 0;
    var gx = (x + WZ.HALF) / STEP, gz = (z + WZ.HALF) / STEP, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, W1 = NG + 1;
    var a = TH[j * W1 + i], b = TH[j * W1 + i + 1], c = TH[(j + 1) * W1 + i], d = TH[(j + 1) * W1 + i + 1];
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (b - d) * (1 - fz) + (c - d) * (1 - fx);
  };
  TR.biome = function (x, z) {
    var d = dOf(x, z);
    if (d >= CORE) {
      var sd = seaD(x, z); if (d > sd) return 'sea'; if (d > sd - 110) return 'beach';
      var mf = mtField(x, z), M = sst(0.54, 0.64, mf) * sst(CORE + 120, CORE + 320, d);
      if (M > 0.5) return sst(0.70, 0.78, mf) > 0.5 ? 'peak' : 'mountain';
    }
    if (z < -500) return 'snow'; if (x > 500) return 'desert'; if (x < -500) return 'jungle'; return 'city';
  };
  /* vertex colour for the terrain mesh */
  TR.color = function (x, z, h) {
    var d = dOf(x, z), sd = seaD(x, z), rw = regionW(x, z), mf = mtField(x, z), M = sst(0.54, 0.64, mf) * sst(CORE + 120, CORE + 320, d), K = sst(0.70, 0.78, mf);
    var cJ = [0.18, 0.35, 0.16], cD = [0.84, 0.71, 0.46], cS = [0.9, 0.94, 0.96], cC = [0.36, 0.42, 0.26], base = [0, 0, 0];
    for (var i = 0; i < 3; i++) base[i] = rw[0] * cJ[i] + rw[1] * cD[i] + rw[2] * cS[i] + rw[3] * cC[i];
    var st = [0.46, 0.46, 0.45], snw = [0.95, 0.97, 1.0], mc = [0, 0, 0], low = sst(100, 160, h), hi = sst(215, 245, h);
    var sp = Math.min(1, rw[2] * 1.4) * sst(0.42, 0.62, vnz(x / 55 + 7, z / 55 - 3) * 0.8 + 0.2 + h / 500) * 0.97;
    for (var k = 0; k < 3; k++) { mc[k] = (0.3 + (st[k] - 0.3) * low) * (1 - hi) + snw[k] * hi; mc[k] = mc[k] * (1 - sp) + snw[k] * sp; }
    var out = [0, 0, 0], sand = [0.89, 0.82, 0.6], seab = [0.76, 0.68, 0.46], fl = sst(sd - 120, sd - 20, d), sb = sst(sd - 10, sd + 60, d);
    for (var q = 0; q < 3; q++) { var v = base[q] * (1 - M) + mc[q] * M; v = v * (1 - fl) + sand[q] * fl; v = v * (1 - sb) + seab[q] * sb; out[q] = v * (0.94 + 0.12 * vnz(x / 9, z / 9)); }
    return out;
  };
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rndSeed() { return ((Math.random() * 0x7fffffff) | 0) || 123456; }

  WZ.createWorld = function (THREE, scene, maxAniso, initSeed) {
    var R = mulberry(20261116), ANISO = Math.min(4, maxAniso || 4);
    function rr(a, b, rng) { return a + (rng || R)() * (b - a); }
    function pick(a, rng) { var fn = rng || R; return a[(fn() * a.length) | 0]; }
    var W = { half: WZ.HALF, ents: [], trees: [], rocks: [], piles: [], crates: [], furn: [], sinks: [], camps: [], anvils: [], comps: [], saws: [], tbench: [], turrets: [], mills: [], bombs: [], kilns: [], crafts: [], works: [], presses: [], blasts: [], liqs: [], sews: [], gods: [], seats: [], tables: [], lamps: [], cuttables: [], casings: [], trapbs: [], masons: [], chests: [], waters: [], bents: [], rects: [], roads: [], spawn: { x: -32, y: 0, z: 32 }, seed: 0 };
    var HALF = 1000 /* core extent */, MAPH = WZ.HALF, ROADS = [], RW = 10; for (var rk = -15; rk <= 14; rk++) ROADS.push(32 + 64 * rk); W.roads = ROADS; W.half = MAPH; W.gh = WZ.TERRAIN.gh;

    var CELL = 8, sgrid = new Map();
    var GYO = 0;
    function ck(cx, cz) { return (cx + 400) * 1024 + (cz + 400); }
    function addBox(x0, x1, y0, y1, z0, z1, isDyn) {
      var b = { x0: x0, x1: x1, y0: y0 + GYO, y1: y1 + GYO, z0: z0, z1: z1, on: true, dyn: !!isDyn };
      for (var cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (var cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        var k = ck(cx, cz), l = sgrid.get(k); if (!l) { l = []; sgrid.set(k, l); } l.push(b);
      }
      return b;
    }
    W.addBox = addBox;

    var vox = new Map(), VMAX = 40, info = { top: 0, bottom: 0, vox: null, box: null };
    function vk(x, y, z) { return ((x + 2600) * 8192 + (z + 2600)) * 64 + y; }
    W.vkey = vk;
    W.hit = function (x0, x1, y0, y1, z0, z1) {
      var found = false; info.top = -1e9; info.bottom = 1e9; info.vox = null; info.box = null;
      var cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cz0 = Math.floor(z0 / CELL), cz1 = Math.floor(z1 / CELL), cx, cz, i, l, b;
      for (cx = cx0; cx <= cx1; cx++) for (cz = cz0; cz <= cz1; cz++) {
        l = sgrid.get(ck(cx, cz)); if (!l) continue;
        for (i = 0; i < l.length; i++) { b = l[i]; if (b.on && x1 > b.x0 && x0 < b.x1 && y1 > b.y0 && y0 < b.y1 && z1 > b.z0 && z0 < b.z1) { found = true; if (b.y1 > info.top) info.top = b.y1; if (b.y0 < info.bottom) info.bottom = b.y0; info.box = b; } }
      }
      if (vox.size) {
        var ix0 = Math.floor(x0), ix1 = Math.ceil(x1) - 1, iy0 = Math.max(0, Math.floor(y0)), iy1 = Math.ceil(y1) - 1, iz0 = Math.floor(z0), iz1 = Math.ceil(z1) - 1, ix, iy, iz, key;
        for (ix = ix0; ix <= ix1; ix++) for (iz = iz0; iz <= iz1; iz++) for (iy = iy0; iy <= iy1; iy++) {
          key = vk(ix, iy, iz); var rv0 = vox.get(key); if (rv0 && !(rv0.t >= 44 && rv0.t <= 48)) { found = true; if (iy + 1 > info.top) info.top = iy + 1; if (iy < info.bottom) info.bottom = iy; info.vox = key; }
        }
      }
      return found ? info : null;
    };
    W.solidAt = function (x, y, z) {
      var cx = Math.floor(x / CELL), cz = Math.floor(z / CELL), l = sgrid.get(ck(cx, cz)), i, b;
      if (l) for (i = 0; i < l.length; i++) { b = l[i]; if (b.on && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && z > b.z0 && z < b.z1) return 'static'; }
      if (y >= 0 && vox.size) { var key = vk(Math.floor(x), Math.floor(y), Math.floor(z)); if (vox.has(key)) return key; }
      return null;
    };

    var Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
    function inst(geo, mat, cap, isDyn, useCol) {
      var m = new THREE.InstancedMesh(geo, mat, cap);
      var u = isDyn ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage;
      if (m.instanceMatrix && m.instanceMatrix.setUsage) m.instanceMatrix.setUsage(u);
      if (useCol) {
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
        if (m.instanceColor.setUsage) m.instanceColor.setUsage(u);
      }
      m.count = 0; m.frustumCulled = false; scene.add(m); return m;
    }
    function put(m, x, y, z, sx, sy, sz, ry, col, at) {
      var cap = m.instanceMatrix.count, i = at == null ? m.count : at;
      if (i >= cap) return cap - 1; if (at == null) m.count++;
      P.set(x, y + GYO, z); S.set(sx, sy, sz); Q.setFromAxisAngle(UP, ry || 0); Mx.compose(P, Q, S);
      m.setMatrixAt(i, Mx);
      if (col != null && m.instanceColor) { C.setHex(col); C.toArray(m.instanceColor.array, i * 3); m.instanceColor.needsUpdate = true; }
      m.instanceMatrix.needsUpdate = true; return i;
    }
    W.put = put;
    var box1 = new THREE.BoxGeometry(1, 1, 1), boxB = new THREE.BoxGeometry(1, 1, 1); boxB.translate(0, 0.5, 0); var boxLow = new THREE.BoxGeometry(1, 0.22, 1); boxLow.translate(0, -0.39, 0);
    function lam(c, o) { var p = { color: c }; for (var k in (o || {})) p[k] = o[k]; return new THREE.MeshLambertMaterial(p); }

    /* ---------------- Textures ---------------- */
    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
      if ('SRGBColorSpace' in THREE) t.colorSpace = THREE.SRGBColorSpace; else if ('sRGBEncoding' in THREE) t.encoding = THREE.sRGBEncoding;
      return t;
    }
    function facadeTex(base, seed) {
      var r = mulberry(seed);
      return canvasTex(128, 128, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, w, 1); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 1, w, 1); }
        for (var i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)'; g.fillRect(r() * w, r() * h, 2 + r() * 8, 1 + r() * 4); }
        for (var fy = 0; fy < 2; fy++) for (var fx = 0; fx < 2; fx++) {
          var x = fx * 64 + 13, wy = fy * 64 + 9, k = r();
          g.fillStyle = '#33302c'; g.fillRect(x - 2, wy - 2, 40, 48);
          g.fillStyle = k < 0.18 ? '#694e37' : k < 0.32 ? '#23303a' : '#375469'; g.fillRect(x, wy, 36, 44);
          if (k < 0.18) { g.strokeStyle = '#362416'; g.lineWidth = 3; for (var j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x, wy + j * 11 + 4); g.lineTo(x + 36, wy + j * 11 + 9); g.stroke(); } }
          else { g.fillStyle = 'rgba(195,230,255,.25)'; g.fillRect(x + 3, wy + 3, 12, 34); g.fillStyle = '#25282b'; g.fillRect(x + 17, wy, 2, 44); g.fillRect(x, wy + 21, 36, 2); }
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x - 2, wy + 44, 40, 3);
        }
      });
    }
    var FACADE_MATS = [['#a8a49b', 11], ['#b3a89a', 12], ['#929aa3', 13], ['#ab9687', 14], ['#899399', 15], ['#bdb29f', 16], ['#d8bb85', 21], ['#c9a46a', 22], ['#e4cf9f', 23], ['#dfe6ec', 31], ['#b9c7d6', 32], ['#cfd8e0', 33], ['#7d8f5e', 41], ['#6e7d52', 42], ['#8a7a58', 43]].map(function (a) { return lam(0xffffff, { map: facadeTex(a[0], a[1]) }); });
    function groundTexMake(base, c1, c2, seed, rep) {
      var t = canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 2200; i++) { g.fillStyle = r() < 0.3 ? c1 : c2; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 5); }
      }); t.repeat.set(rep, rep); return t;
    }
    var roadTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(6); g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 1600; i++) { var v = (r() * 42) | 0; g.fillStyle = 'rgba(' + (44 + v) + ',' + (47 + v) + ',' + (52 + v) + ',.75)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      g.strokeStyle = 'rgba(12,12,14,.8)'; g.lineWidth = 1.2; for (var k = 0; k < 5; k++) { g.beginPath(); var sx = r() * w; g.moveTo(sx, 0); g.lineTo(sx + (r() - 0.5) * 18, h * 0.5); g.lineTo(sx + (r() - 0.5) * 24, h); g.stroke(); }
    });
    var junTex = canvasTex(64, 64, function (g, w, h) { var r = mulberry(61); g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); for (var i = 0; i < 700; i++) { var v = (r() * 42) | 0; g.fillStyle = 'rgba(' + (44 + v) + ',' + (47 + v) + ',' + (52 + v) + ',.75)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } });
    (function () { var jm = inst(boxB, lam(0xffffff, { map: junTex }), 1000, false, false); ROADS.forEach(function (cx) { ROADS.forEach(function (cz) { if (Math.hypot(cx - RBX, cz - RBZ) < 16) return; put(jm, cx, 0.0205, cz, RW + 0.04, 0.0045, RW + 0.04, 0, null); }); }); })();
    var plankTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(7); g.fillStyle = '#9c6e3b'; g.fillRect(0, 0, w, h);
      for (var p = 0; p < 4; p++) {
        var py = p * 32; g.fillStyle = p % 2 ? '#946736' : '#a37542'; g.fillRect(0, py + 2, w, 28);
        g.fillStyle = 'rgba(255,220,175,.18)'; g.fillRect(0, py + 2, w, 2);
        for (var i = 0; i < 18; i++) { g.fillStyle = 'rgba(55,32,12,' + (0.1 + r() * 0.2) + ')'; g.fillRect(r() * w, py + 4 + r() * 24, 14 + r() * 40, 1 + r() * 2); }
        g.fillStyle = '#472d14'; g.fillRect(0, py, w, 2); g.fillRect(0, py + 30, w, 2);
      }
      g.fillStyle = '#472d14'; g.fillRect(62, 0, 2, 64); g.fillRect(18, 64, 2, 64);
    });
    var stoneTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(8); g.fillStyle = '#62666d'; g.fillRect(0, 0, w, h);
      for (var row = 0; row < 4; row++) {
        var y = row * 32, off = (row % 2) * 32;
        for (var col = -1; col < 3; col++) {
          var x = col * 64 + off, sh = 128 + ((r() * 34) | 0);
          g.fillStyle = 'rgb(' + sh + ',' + (sh + 2) + ',' + (sh + 6) + ')'; g.fillRect(x + 2, y + 2, 60, 28);
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 2, y + 2, 60, 3); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 2, y + 27, 60, 3);
        }
      }
      for (var i = 0; i < 350; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.18)'; g.fillRect(r() * w, r() * h, 2, 2); }
    });
    var furnTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#4a4642'; g.fillRect(0, 0, w, h); g.strokeStyle = '#24211e'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#262320'; g.fillRect(28, 52, 72, 58); g.fillStyle = '#ff6a14'; g.fillRect(36, 62, 56, 40); g.fillStyle = '#ffe078'; g.fillRect(48, 76, 32, 22);
      g.fillStyle = '#736d68'; for (var rx = 14; rx <= 114; rx += 20) { g.fillRect(rx, 14, 4, 4); g.fillRect(rx, 110, 4, 4); }
    });
    var bedTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#855832'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ece6d8'; g.fillRect(8, 8, w - 16, 42);
      g.fillStyle = '#4a7a5c'; g.fillRect(8, 52, w - 16, 68);
      g.fillStyle = '#6b9e7e'; g.fillRect(14, 58, w - 28, 12);
      g.strokeStyle = '#4f3219'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    });
    var couchTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#5a7852'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#76996c'; g.fillRect(10, 12, w - 20, 52); g.fillRect(10, 68, w - 20, 48);
      g.strokeStyle = '#3a5234'; g.lineWidth = 4; g.strokeRect(10, 12, w - 20, 52); g.strokeRect(10, 68, w - 20, 48);
      g.fillStyle = '#6b4928'; g.fillRect(0, 114, w, 14);
    });
    var sinkTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#c4cbd1'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#6c757d'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#7c868e'; g.fillRect(18, 22, w - 36, 70);
      g.fillStyle = '#49a6e8'; g.fillRect(24, 30, w - 48, 54);
      g.fillStyle = '#e2e8ed'; g.fillRect(58, 10, 12, 26); g.fillStyle = '#49a6e8'; g.fillRect(61, 36, 6, 12);
    });
    var campTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#3b2a1a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6b4a2a'; g.fillRect(8, 78, 112, 18); g.fillRect(14, 100, 100, 18);
      g.fillStyle = '#ff6a14'; g.beginPath(); g.moveTo(64, 8); g.lineTo(98, 78); g.lineTo(30, 78); g.closePath(); g.fill();
      g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(64, 34); g.lineTo(84, 78); g.lineTo(44, 78); g.closePath(); g.fill();
    });
    var anvilTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#2f3237'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5b6068'; g.fillRect(10, 24, 108, 34); g.fillRect(40, 58, 48, 30); g.fillRect(24, 88, 80, 26);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(10, 24, 108, 5);
    });
    var compTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#6d5532'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#14202b'; g.fillRect(16, 14, 96, 58); g.fillStyle = '#3ad0a0'; g.fillRect(24, 22, 80, 42);
      g.fillStyle = '#c9c9c9'; g.fillRect(24, 82, 80, 16); g.fillStyle = '#333'; for (var kx = 28; kx < 100; kx += 10) g.fillRect(kx, 86, 7, 8);
    });
    var sawTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#a9794a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a532f'; g.fillRect(0, 88, w, 40);
      g.fillStyle = '#d8dde2'; g.beginPath(); g.arc(64, 50, 34, 0, 6.3); g.fill(); g.fillStyle = '#7a532f'; g.beginPath(); g.arc(64, 50, 8, 0, 6.3); g.fill();
      g.strokeStyle = '#8a9096'; g.lineWidth = 3; for (var a = 0; a < 12; a++) { g.beginPath(); g.moveTo(64 + Math.cos(a / 12 * 6.28) * 34, 50 + Math.sin(a / 12 * 6.28) * 34); g.lineTo(64 + Math.cos(a / 12 * 6.28) * 42, 50 + Math.sin(a / 12 * 6.28) * 42); g.stroke(); }
    });
    var tbenchTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#4b5560'; g.fillRect(0, 0, w, h); g.fillStyle = '#d28a2a'; g.fillRect(10, 10, 108, 20);
      g.fillStyle = '#222'; g.beginPath(); g.arc(64, 74, 30, 0, 6.3); g.fill(); g.fillStyle = '#9aa3ab'; g.fillRect(58, 36, 12, 38); g.fillRect(40, 62, 48, 10);
    });
    var planksTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#d9b27a'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 32) { g.fillStyle = '#9c7240'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(120,80,40,.25)'; g.fillRect(0, y + 10, w, 2); g.fillRect(0, y + 21, w, 1); }
      g.fillStyle = '#8a6236'; g.fillRect(40, 0, 3, 32); g.fillRect(90, 32, 3, 32); g.fillRect(24, 64, 3, 32); g.fillRect(70, 96, 3, 32);
    });
    function cannonTex(base, accent) {
      return canvasTex(128, 128, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = '#15181c'; g.beginPath(); g.arc(64, 60, 30, 0, 6.3); g.fill();
        g.fillStyle = accent; g.fillRect(0, 100, w, 28); g.fillStyle = '#000'; g.beginPath(); g.arc(64, 60, 14, 0, 6.3); g.fill();
      });
    }
    function glyphTex(base, glyph, txt) {
      return canvasTex(128, 128, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
        g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, w / 2, h / 2 - (txt ? 8 : 0));
        if (txt) { g.font = 'bold 22px sans-serif'; g.fillStyle = '#fff'; g.fillText(txt, w / 2, h - 18); }
      });
    }
    var glassTex = canvasTex(64, 64, function (g, w, h) { g.fillStyle = 'rgba(150,200,255,0.25)'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f7ff0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(10, 10, 8, 20); });
    var cactBlockTex = canvasTex(64, 64, function (g, w, h) { var r = mulberry(77); g.fillStyle = '#4f9a46'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f6a2c'; for (var x = 4; x < w; x += 12) g.fillRect(x, 0, 3, h); g.fillStyle = '#f2f2c0'; for (var i = 0; i < 40; i++) g.fillRect(r() * w, r() * h, 2, 2); });
    var houseWallTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(9); g.fillStyle = '#f2eee6'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y + 2, w, 2); }
      for (var i = 0; i < 360; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.12)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 3); }
    });
    var winTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#e5dfd2'; g.fillRect(0, 0, w, h); g.clearRect(7, 7, w - 14, h - 14);
      g.fillStyle = 'rgba(150,200,235,0.30)'; g.fillRect(7, 7, w - 14, h - 14);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(10, 10); g.lineTo(26, 10); g.lineTo(10, 34); g.closePath(); g.fill();
      g.fillStyle = '#e5dfd2'; g.fillRect(w / 2 - 2, 5, 4, h - 10); g.fillRect(5, h / 2 - 2, w - 10, 4);
    });
    var barkTex = canvasTex(64, 64, function (g, w, h) {
      var r = mulberry(10); g.fillStyle = '#6b4d30'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(30,18,8,.42)' : 'rgba(150,115,75,.28)'; g.fillRect(r() * w, r() * h, 2 + r() * 2, 8 + r() * 22); }
    });
    var leafTex = canvasTex(64, 64, function (g, w, h) {
      var r = mulberry(12); g.fillStyle = '#b9c2b2'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 240; i++) { g.fillStyle = r() < 0.45 ? 'rgba(30,55,25,.38)' : 'rgba(220,240,200,.3)'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 5); }
    });
    var rockTex = canvasTex(64, 64, function (g, w, h) {
      var r = mulberry(13); g.fillStyle = '#b8bcc2'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(30,35,40,.35)' : 'rgba(245,248,255,.32)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    });
    var crateTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#b58852'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4e3418'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, h - 4); g.stroke();
      for (var y = 16; y < h; y += 16) { g.fillStyle = 'rgba(55,34,14,.4)'; g.fillRect(4, y, w - 8, 2); }
    });

    /* ground planes per biome: city (centre + south), desert (east), jungle (west), snow (north) */
    function biomeOf(x, z) { return WZ.TERRAIN.biome(x, z); }
    W.biomeOf = biomeOf; W.onRoad = function (x, z, m) { return onRoad(x, z, m); };
    (function () {
      var E = HALF, defs = [
        ['city', -500, 500, -500, E, groundTexMake('#5c6142', 'rgba(65,55,38,.45)', 'rgba(110,125,70,.7)', 5, 1)],
        ['desert', 500, E, -500, E, groundTexMake('#d6b676', 'rgba(170,130,70,.5)', 'rgba(235,205,140,.7)', 6, 1)],
        ['jungle', -E, -500, -500, E, groundTexMake('#2f5a2a', 'rgba(20,50,20,.5)', 'rgba(70,120,50,.7)', 7, 1)],
        ['snow', -E, E, -E, -500, groundTexMake('#e6eef3', 'rgba(170,190,205,.5)', 'rgba(255,255,255,.8)', 8, 1)]];
      defs.forEach(function (d) {
        var w = d[2] - d[1], h = d[4] - d[3], m = d[5]; m.repeat.set(w / 8.5, h / 8.5);
        var pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(0xffffff, { map: m })); pm.rotation.x = -Math.PI / 2; pm.position.set((d[1] + d[2]) / 2, 0, (d[3] + d[4]) / 2); scene.add(pm);
      });
    })();
    /* ---- terrain mesh (ring around the flat core) + sea ---- */
    (function () {
      var CORE0, TRN = WZ.TERRAIN, NG = TRN.NG, ST = TRN.STEP, H0 = MAPH, pos = [], col = [], idx = [], vid = {}, W1 = NG + 1;
      function vert(i, j) { var key = j * W1 + i, v = vid[key]; if (v != null) return v; var x = -H0 + i * ST, z = -H0 + j * ST, h = TRN.grid[key], c = TRN.color(x, z, h); v = pos.length / 3; pos.push(x, h, z); col.push(c[0], c[1], c[2]); vid[key] = v; return v; }
      var cl = (CORE0 = TRN.CORE) / ST;
      for (var j = 0; j < NG; j++) for (var i = 0; i < NG; i++) {
        var x0 = -H0 + i * ST, z0 = -H0 + j * ST; if (x0 >= -CORE0 + 0 && x0 + ST <= CORE0 && z0 >= -CORE0 && z0 + ST <= CORE0) continue;
        var a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), d = vert(i + 1, j + 1); idx.push(a, c, b, b, c, d);
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      var tm = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); tm.frustumCulled = false; scene.add(tm); W.terrainMesh = tm;
      var sea = new THREE.Mesh(new THREE.PlaneGeometry(H0 * 2 + 400, H0 * 2 + 400), new THREE.MeshLambertMaterial({ color: 0x2f7fc0, transparent: true, opacity: 0.66, depthWrite: false })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.3, 0); sea.renderOrder = 2; scene.add(sea); W.seaMesh = sea;
    })();
    /* ---- mountain roads: 2 winding roads per mountain, ribbon meshes following the terrain ---- */
    (function () {
      var TRN = WZ.TERRAIN, rm = mulberry(777), H0 = MAPH, cand = [], peaks = [], keys = {}, pos = [], uv = [], idx = [], RWd = 3.2;
      for (var gx = -H0 + 120; gx < H0 - 120; gx += 50) for (var gz = -H0 + 120; gz < H0 - 120; gz += 50) {
        var b = TRN.biome(gx, gz); if ((b === 'mountain' || b === 'peak') && Math.max(Math.abs(gx), Math.abs(gz)) > HALF + 60) cand.push([gx, gz, TRN.gh(gx, gz)]);
      }
      cand.sort(function (a, b) { return b[2] - a[2]; });
      cand.forEach(function (c) { if (peaks.length < 12 && peaks.every(function (p) { return Math.hypot(p[0] - c[0], p[1] - c[1]) > 300; })) peaks.push(c); });
      function mk(x, z) { return Math.floor(x / 5) + ',' + Math.floor(z / 5); }
      peaks.forEach(function (pk) {
        for (var r = 0; r < 2; r++) {
          var x = pk[0], z = pk[1], a = rm() * 6.283 + r * 3.1416, pts = [[x, z]], steps = 0;
          while (steps++ < 260) {
            var best = null, bs = 1e9;
            for (var k = -2; k <= 2; k++) { var aa = a + k * 0.28 + (rm() - 0.5) * 0.1, nx = x + Math.cos(aa) * 5, nz = z + Math.sin(aa) * 5; var sl = Math.abs(TRN.gh(nx, nz) - TRN.gh(x, z)) + Math.abs(k) * 0.25; if (sl < bs) { bs = sl; best = [nx, nz, aa]; } }
            x = best[0]; z = best[1]; a = best[2]; var bb = TRN.biome(x, z);
            if (bb === 'sea' || bb === 'beach' || Math.max(Math.abs(x), Math.abs(z)) <= HALF + 40 || Math.max(Math.abs(x), Math.abs(z)) > H0 - 60) break;
            pts.push([x, z]); if (bb !== 'mountain' && bb !== 'peak' && steps > 40) break;
          }
          if (pts.length < 8) continue;
          var v0 = pos.length / 3, len = 0;
          for (var i = 0; i < pts.length; i++) {
            var p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)], dx = q[0] - o[0], dz = q[1] - o[1], dl = Math.hypot(dx, dz) || 1, nx2 = -dz / dl, nz2 = dx / dl;
            if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
            var lx = p[0] + nx2 * RWd, lz = p[1] + nz2 * RWd, rx = p[0] - nx2 * RWd, rz = p[1] - nz2 * RWd, hc = TRN.gh(p[0], p[1]);
            pos.push(lx, Math.max(TRN.gh(lx, lz), hc - 0.4) + 0.14, lz, rx, Math.max(TRN.gh(rx, rz), hc - 0.4) + 0.14, rz); uv.push(0, len / 6, 1, len / 6);
            for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) keys[mk(p[0] + ox * 4, p[1] + oz * 4)] = 1;
            if (i) { var s = v0 + i * 2; idx.push(s - 2, s, s - 1, s - 1, s, s + 1); }
          }
        }
      });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var rt = roadTex.clone(); rt.needsUpdate = true; rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
      var mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: rt, side: THREE.DoubleSide })); mesh.frustumCulled = false; scene.add(mesh); W.mtRoadMesh = mesh;
      W.mtPeaks = peaks; W.onMtRoad = function (x, z) { return !!keys[mk(x, z)]; };
    })();
    (function () {
      /* gradient strips: 5 m fading out of biome A + 5 m fading into biome B; sandy beach along the map edge */
      var E = HALF, COL = { city: '#5c6142', desert: '#d6b676', jungle: '#2f5a2a', snow: '#e6eef3', beach: '#e3d29a' };
      function strip(c1, c2, x0, x1, z0, z1, alongX, alpha) {
        var cv = document.createElement('canvas'); cv.width = alongX ? 64 : 4; cv.height = alongX ? 4 : 64; var g = cv.getContext('2d'), gr = alongX ? g.createLinearGradient(0, 0, 64, 0) : g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
        var tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
        var m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map: tx, transparent: !!alpha, depthWrite: !alpha })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, alpha ? 0.013 : 0.012, (z0 + z1) / 2); scene.add(m);
      }
      /* vertical strips (gradient runs along x) */
      strip(COL.city, COL.desert, 495, 505, -500, E, true); strip(COL.jungle, COL.city, -505, -495, -500, E, true);
      /* snow border (gradient runs along z: south = other biome, north = snow). rotation.z swaps direction, so give colours north->south */
      strip(COL.snow, COL.jungle, -E, -500, -505, -495, false); strip(COL.snow, COL.city, -500, 500, -505, -495, false); strip(COL.snow, COL.desert, 500, E, -505, -495, false);
    })();
    (function () {
      var pos = [], norm = [], uv = [], idx = [];
      function pq(v0, v1, v2, v3, sw) {
        var b = pos.length / 3; pos.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
        for (var i = 0; i < 4; i++) norm.push(0, 1, 0);
        if (sw) uv.push(0, 0, 214, 0, 214, 1, 0, 1); else uv.push(0, 0, 1, 0, 1, 214, 0, 214);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
      ROADS.forEach(function (c) {
        pq([c - RW / 2, 0.02, HALF + 20], [c + RW / 2, 0.02, HALF + 20], [c + RW / 2, 0.02, -HALF - 20], [c - RW / 2, 0.02, -HALF - 20], false);
        pq([-HALF - 20, 0.022, c + RW / 2], [HALF + 20, 0.022, c + RW / 2], [HALF + 20, 0.022, c - RW / 2], [-HALF - 20, 0.022, c - RW / 2], true);
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
      scene.add(new THREE.Mesh(g, lam(0xffffff, { map: roadTex })));
    })();
    var dashes = inst(boxB, lam(0xe8c448), 18500, false, false);
    var RBX = -32, RBZ = 32; /* spawn roundabout (replaces the crossroad) */
    function nearRoad(t) { for (var q = 0; q < ROADS.length; q++) if (Math.abs(t - ROADS[q]) < RW / 2 + 1.6) return true; return false; }
    ROADS.forEach(function (c) { for (var t = -HALF - 5; t < HALF + 5; t += 7) { if (Math.hypot(c - RBX, t - RBZ) > 15 && !nearRoad(t)) put(dashes, c, 0.03, t, 0.18, 0.01, 3.2, 0, null); if (Math.hypot(t - RBX, c - RBZ) > 15 && !nearRoad(t)) put(dashes, t, 0.032, c, 3.2, 0.01, 0.18, 0, null); } });
    var rbBuild = function () {
      var rbTex = roadTex.clone(); rbTex.needsUpdate = true; rbTex.wrapS = rbTex.wrapT = THREE.RepeatWrapping; rbTex.repeat.set(1.6, 1.6); var asph = new THREE.Mesh(new THREE.RingGeometry(6.6, 13.2, 64), lam(0xffffff, { map: rbTex })); asph.rotation.x = -Math.PI / 2; asph.position.set(RBX, 0.026, RBZ); scene.add(asph);
      var edge = new THREE.Mesh(new THREE.RingGeometry(12.7, 12.95, 64), new THREE.MeshBasicMaterial({ color: 0xe8e8e0 })); edge.rotation.x = -Math.PI / 2; edge.position.set(RBX, 0.03, RBZ); scene.add(edge);
      var curb = new THREE.Mesh(new THREE.RingGeometry(6.6, 7.0, 48), new THREE.MeshBasicMaterial({ color: 0xb8b4aa })); curb.rotation.x = -Math.PI / 2; curb.position.set(RBX, 0.04, RBZ); scene.add(curb);
      var isl = new THREE.Mesh(new THREE.CircleGeometry(6.6, 40), lam(0x4d7a3a)); isl.rotation.x = -Math.PI / 2; isl.position.set(RBX, 0.05, RBZ); scene.add(isl);
      for (var a = 0; a < 24; a++) { var an = a / 24 * Math.PI * 2; put(dashes, RBX + Math.cos(an) * 9.9, 0.034, RBZ + Math.sin(an) * 9.9, 1.6, 0.01, 0.16, -an + Math.PI / 2, null); }
      put(walls, RBX, 0.3, RBZ, 3.2, 0.6, 3.2, 0, 0x8a8a84); put(walls, RBX, 1.3, RBZ, 1.4, 1.6, 1.4, 0, 0x9a9a94); put(walls, RBX, 2.4, RBZ, 2.2, 0.35, 2.2, 0, 0x7a7a74); put(walls, RBX, 3.0, RBZ, 0.5, 0.9, 0.5, 0, 0xc9a24a);
      addBox(RBX - 1.6, RBX + 1.6, 0, 3.4, RBZ - 1.6, RBZ + 1.6, false);
      for (var ti = 0; ti < 6; ti++) { var ta = ti / 6 * Math.PI * 2 + 0.3; put(walls, RBX + Math.cos(ta) * 4.8, 0.25, RBZ + Math.sin(ta) * 4.8, 0.9, 0.5, 0.9, 0, 0x3f6a2e); }
    };

    var occGrid = new Map(), OC = 16;
    var occupied = { push: function (o) { for (var cx = Math.floor(o[0] / OC); cx <= Math.floor(o[1] / OC); cx++) for (var cz = Math.floor(o[2] / OC); cz <= Math.floor(o[3] / OC); cz++) { var k = ck(cx, cz), l = occGrid.get(k); if (!l) { l = []; occGrid.set(k, l); } l.push(o); } } };
    function onRoad(x, z, m) { for (var i = 0; i < ROADS.length; i++) if (Math.abs(x - ROADS[i]) < RW / 2 + m || Math.abs(z - ROADS[i]) < RW / 2 + m) return true; return false; }
    function inOcc(x, z, m) {
      var l = occGrid.get(ck(Math.floor(x / OC), Math.floor(z / OC))); if (!l) return false;
      for (var i = 0; i < l.length; i++) { var o = l[i]; if (x > o[0] - m && x < o[1] + m && z > o[2] - m && z < o[3] + m) return true; }
      return false;
    }
    var curBiome = 'city';
    function zoneOf(x, z) {
      var b = biomeOf(x, z), d;
      if (b === 'jungle') return Math.hypot(x + 750, z - 250) < 260 ? 'mid' : 'out';
      d = b === 'desert' ? Math.hypot(x - 750, z - 250) : b === 'snow' ? Math.hypot(x, z + 750) : Math.hypot(x, z);
      var k = b === 'city' ? 1 : 0.8; return d < 160 * k ? 'down' : d < 340 * k ? 'mid' : 'out';
    }

    var walls = inst(box1, lam(0xffffff, { map: houseWallTex }), 130000, false, true), winM = inst(box1, (W.winMat = new THREE.MeshLambertMaterial({ map: winTex, transparent: true, depthWrite: false })), 20000, false, false), roofCols = [0x5c5751, 0x69625a, 0x51575e];
    rbBuild();
    var CH = 20; W.CH = CH; W.chunks = new Map();
    W.chunkOf = function (x, y, z) { return [Math.floor(x / CH), Math.floor(y / CH), Math.floor(z / CH)]; };
    function chunkAt(cx, cz) { var k = ck(cx, cz), c = W.chunks.get(k); if (!c) { c = { cx: cx, cz: cz, g: new THREE.Group(), vis: true }; c.g.userData.c = c; scene.add(c.g); W.chunks.set(k, c); } return c; }
    var fbMap = new Map(), rbMap = new Map();
    function getFB(fi, x, z) { var k = fi + ':' + ck(Math.floor(x / CH), Math.floor(z / CH)), b = fbMap.get(k); if (!b) { b = { fi: fi, cx: Math.floor(x / CH), cz: Math.floor(z / CH), pos: [], norm: [], uv: [], idx: [] }; fbMap.set(k, b); } return b; }
    var roofBucket = { pos: [], norm: [], col: [], idx: [] };
    function getRB(x, z) { var k = ck(Math.floor(x / CH), Math.floor(z / CH)), b = rbMap.get(k); if (!b) { b = { cx: Math.floor(x / CH), cz: Math.floor(z / CH), pos: [], norm: [], col: [], idx: [] }; rbMap.set(k, b); } return b; }
    function pushSide(bk, p0, p1, p2, p3, nx, ny, nz, ur, vr) {
      var b = bk.pos.length / 3; bk.pos.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
      for (var i = 0; i < 4; i++) bk.norm.push(nx, ny, nz); bk.uv.push(0, 0, ur, 0, ur, vr, 0, vr); bk.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    function tallSolid(x0, x1, z0, z1, h) {
      var w = x1 - x0, d = z1 - z0, bk = getFB(curBiome === 'desert' ? 6 + ((R() * 3) | 0) : curBiome === 'snow' ? 9 + ((R() * 3) | 0) : curBiome === 'jungle' ? 12 + ((R() * 3) | 0) : ((R() * 6) | 0), (x0 + x1) / 2, (z0 + z1) / 2), uw = w / 8, ud = d / 8, vh = h / 8;
      pushSide(bk, [x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], 0, 0, 1, uw, vh);
      pushSide(bk, [x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], 0, 0, -1, uw, vh);
      pushSide(bk, [x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], 1, 0, 0, ud, vh);
      pushSide(bk, [x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], -1, 0, 0, ud, vh);
      var rc = new THREE.Color(pick(roofCols)), rbk = getRB((x0 + x1) / 2, (z0 + z1) / 2), rb = rbk.pos.length / 3;
      rbk.pos.push(x0, h, z1, x1, h, z1, x1, h, z0, x0, h, z0);
      for (var i = 0; i < 4; i++) { rbk.norm.push(0, 1, 0); rbk.col.push(rc.r, rc.g, rc.b); }
      rbk.idx.push(rb, rb + 1, rb + 2, rb, rb + 2, rb + 3);
      addBox(x0, x1, 0, h, z0, z1, false); occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]); W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#555' });
      if (R() < 0.6) put(walls, rr(x0 + 2, x1 - 2), h + 1, rr(z0 + 2, z1 - 2), 3, 2, 3, 0, 0x6b7075);
    }
    /* [BUILDINGS] Enterable towers: door on the south wall, a floor slab + staircase per level (flights alternate between the two long walls), one furniture per floor, loot spawned per floor in spawnNature. */
    W.floors = []; W.indoor = [];
    function tallBuilding(x0, x1, z0, z1, h) {
      var w = x1 - x0, d = z1 - z0; if (w < 12 || d < 10) { tallSolid(x0, x1, z0, z1, h); return; }
      var FH = 3.6, t = 0.4, fl = Math.max(3, Math.min(12, Math.round(h / FH))); h = fl * FH;
      var bk = getFB(curBiome === 'desert' ? 6 + ((R() * 3) | 0) : curBiome === 'snow' ? 9 + ((R() * 3) | 0) : curBiome === 'jungle' ? 12 + ((R() * 3) | 0) : ((R() * 6) | 0), (x0 + x1) / 2, (z0 + z1) / 2), cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2, zn = zoneOf(cxm, czm);
      function fZ(zp, xa, xb, ya, yb, nz) { if (xb - xa < 0.05 || yb - ya < 0.05) return; var u = (xb - xa) / 8, v = (yb - ya) / 8; if (nz > 0) pushSide(bk, [xa, ya, zp], [xb, ya, zp], [xb, yb, zp], [xa, yb, zp], 0, 0, 1, u, v); else pushSide(bk, [xb, ya, zp], [xa, ya, zp], [xa, yb, zp], [xb, yb, zp], 0, 0, -1, u, v); }
      function fX(xp, za, zb, ya, yb, nx) { var u = (zb - za) / 8, v = (yb - ya) / 8; if (nx > 0) pushSide(bk, [xp, ya, zb], [xp, ya, za], [xp, yb, za], [xp, yb, zb], 1, 0, 0, u, v); else pushSide(bk, [xp, ya, za], [xp, ya, zb], [xp, yb, zb], [xp, yb, za], -1, 0, 0, u, v); }
      var g = 1.2, dxc = rr(x0 + 4, x1 - 4), DH = 2.7;
      fZ(z0, x0, x1, 0, h, -1); fZ(z0 + t, x0, x1, 0, h, 1); fX(x0, z0, z1, 0, h, -1); fX(x0 + t, z0 + t, z1 - t, 0, h, 1); fX(x1, z0, z1, 0, h, 1); fX(x1 - t, z0 + t, z1 - t, 0, h, -1);
      [[z1, 1], [z1 - t, -1]].forEach(function (q) { fZ(q[0], x0, dxc - g, 0, h, q[1]); fZ(q[0], dxc + g, x1, 0, h, q[1]); fZ(q[0], dxc - g, dxc + g, DH, h, q[1]); });
      var rc = new THREE.Color(pick(roofCols)), rbk = getRB(cxm, czm), rb = rbk.pos.length / 3;
      rbk.pos.push(x0, h, z1, x1, h, z1, x1, h, z0, x0, h, z0);
      for (var i = 0; i < 4; i++) { rbk.norm.push(0, 1, 0); rbk.col.push(rc.r, rc.g, rc.b); }
      rbk.idx.push(rb, rb + 1, rb + 2, rb, rb + 2, rb + 3);
      addBox(x0, x1, 0, h, z0, z0 + t, false); addBox(x0, x0 + t, 0, h, z0, z1, false); addBox(x1 - t, x1, 0, h, z0, z1, false);
      addBox(x0, dxc - g, 0, h, z1 - t, z1, false); addBox(dxc + g, x1, 0, h, z1 - t, z1, false); addBox(dxc - g, dxc + g, DH, h, z1 - t, z1, false);
      occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]); W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#555' });
      var SC = 0x9a968c, RUN = 0.85, NST = 8, RISE = FH / NST, SW = 2.2, flights = [];
      for (var k = 0; k < fl - 1; k++) {
        var up = k % 2 === 0, fx0 = up ? x0 + t : x1 - t - RUN * NST, fz0 = up ? z0 + t : z1 - t - SW;
        flights.push({ x0: fx0, x1: fx0 + RUN * NST, z0: fz0, z1: fz0 + SW, up: up });
        for (var si = 0; si < NST; si++) { var sx = up ? fx0 + si * RUN : fx0 + (NST - 1 - si) * RUN; wallSeg(sx, sx + RUN, fz0, fz0 + SW, k * FH, k * FH + RISE * (si + 1), 0x8c857a); }
      }
      wallSeg(x0 + t, x1 - t, z0 + t, z1 - t, 0, 0.06, 0x8a857a);
      for (var k2 = 1; k2 <= fl; k2++) {
        var y = k2 * FH, fh = flights[k2 - 1];
        if (k2 === fl || !fh) { wallSeg(x0 + t, x1 - t, z0 + t, z1 - t, y - 0.3, y, SC); continue; }
        var hx0 = fh.x0 - 0.05, hx1 = fh.x1, hz0 = fh.z0 - 0.05, hz1 = fh.z1 + 0.05;
        wallSeg(x0 + t, x1 - t, z0 + t, Math.max(z0 + t, hz0), y - 0.3, y, SC); wallSeg(x0 + t, x1 - t, Math.min(z1 - t, hz1), z1 - t, y - 0.3, y, SC);
        wallSeg(x0 + t, Math.max(x0 + t, hx0), hz0, hz1, y - 0.3, y, SC); wallSeg(Math.min(x1 - t, hx1), x1 - t, hz0, hz1, y - 0.3, y, SC);
      }
      for (var k3 = 0; k3 < fl; k3++) {
        var yb = k3 * FH, av = []; if (flights[k3]) av.push([flights[k3].x0, flights[k3].x1, flights[k3].z0, flights[k3].z1]); if (flights[k3 - 1]) av.push([flights[k3 - 1].x0, flights[k3 - 1].x1, flights[k3 - 1].z0, flights[k3 - 1].z1]);
        if (k3 === 0) av.push([dxc - 3, dxc + 3, z1 - 3, z1]);
        W.floors.push({ x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t, y: yb, k: k3, fl: fl, zone: zn, av: av });
        for (var ta = 0; ta < 14; ta++) {
          var fx = rr(x0 + 2.2, x1 - 2.2), fz = rr(z0 + 1.5, z1 - 1.5), bad = false; av.forEach(function (r) { if (fx > r[0] - 2.2 && fx < r[1] + 2.2 && fz > r[2] - 1.6 && fz < r[3] + 1.6) bad = true; }); if (bad) continue;
          if (R() < 0.5) addBed(fx, fz, R() < 0.5, yb); else addCouch(fx, fz, R() < 0.5, yb); break;
        }
      }
    }
    function wallSeg(x0, x1, z0, z1, y0, y1, col) { put(walls, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, col); addBox(x0, x1, y0, y1, z0, z1, false); }

    var bedM = inst(box1, lam(0xffffff, { map: houseWallTex }), 6000, false, true), couchM = inst(box1, lam(0xffffff, { map: houseWallTex }), 6000, false, true);
    function addBed(x, z, clean, yb) {
      yb = yb || 0; put(bedM, x, yb + 0.3, z, 2.0, 0.6, 1.0, 0, clean ? 0xe5dfd0 : 0x6e5b4d); put(bedM, x - 0.9, yb + 0.65, z, 0.18, 0.5, 1.0, 0, clean ? 0xc89562 : 0x4a3d33);
      addBox(x - 1.0, x + 1.0, yb, yb + 0.6, z - 0.5, z + 0.5, false); addEnt({ k: 'bed', x: x, z: z, y: yb, r: 1.3, h: 0.8, clean: clean, alive: true, dyn: false });
    }
    function addCouch(x, z, clean, yb) {
      yb = yb || 0; put(couchM, x, yb + 0.3, z, 1.9, 0.6, 0.9, 0, clean ? 0x7b996d : 0x5c4f43); put(couchM, x, yb + 0.75, z - 0.38, 1.9, 0.6, 0.2, 0, clean ? 0x5f7d52 : 0x453b31);
      addBox(x - 0.95, x + 0.95, yb, yb + 0.6, z - 0.45, z + 0.45, false); addEnt({ k: 'couch', x: x, z: z, y: yb, r: 1.15, h: 0.9, clean: clean, alive: true, dyn: false });
    }

    /* wall with real glass window openings (the pane is a see-through glass instance, the wall has real holes) */
    function wallWin(alongX, a0, a1, c0, c1, centers, col, H) {
      var cur = a0, cm = (c0 + c1) / 2, WH = 0.75;
      function seg(u0, u1, y0, y1, cl) { if (u1 - u0 < 0.01) return; if (alongX) wallSeg(u0, u1, c0, c1, y0, y1, cl); else wallSeg(c0, c1, u0, u1, y0, y1, cl); }
      centers.forEach(function (c) {
        seg(cur, c - WH, 0, H, col); seg(c - WH, c + WH, 0, 1.1, col); seg(c - WH, c + WH, 2.2, H, col);
        if (alongX) { put(winM, c, 1.65, cm, 1.5, 1.1, 0.1, 0, null); addBox(c - WH, c + WH, 1.1, 2.2, cm - 0.05, cm + 0.05, false); }
        else { put(winM, cm, 1.65, c, 0.1, 1.1, 1.5, 0, null); addBox(cm - 0.05, cm + 0.05, 1.1, 2.2, c - WH, c + WH, false); }
        cur = c + WH;
      });
      seg(cur, a1, 0, H, col);
    }
    var HOUSE_COLS = [0xe8dcc4, 0xd47a66, 0x88b394, 0x7da4c4, 0xdeb664, 0xd19464, 0xcfd4d9, 0xba8b5e];
    var HOUSE_ROOFS = [0x8a4b3e, 0x526575, 0x6b6358, 0x546b4d, 0x7a5b40];
    function house(px, pz, face, zn) {
      var hw = rr(12, 15), hd = rr(10, 12), x0 = px - hw / 2, x1 = px + hw / 2, z0 = pz - hd / 2, z1 = pz + hd / 2, t = 0.4, H = 3.2;
      var col = pick(curBiome === 'desert' ? [0xd9b779, 0xc99a5b, 0xe6cf9a] : curBiome === 'snow' ? [0xe8eef5, 0x9fb4c8, 0xc9d6e2] : curBiome === 'jungle' ? [0x7a5a3a, 0x8a6b45, 0x5f7a4a] : HOUSE_COLS), roofCol = pick(curBiome === 'desert' ? [0x9a6b3e, 0x7a5b40] : curBiome === 'snow' ? [0xf4f8fb, 0x7d8fa3] : curBiome === 'jungle' ? [0x3f5a2e, 0x546b4d] : HOUSE_ROOFS);
      occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]); W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#' + ('000000' + col.toString(16)).slice(-6) });
      var dx = (x0 + x1) / 2 + rr(-hw / 4, hw / 4), dz = (z0 + z1) / 2 + rr(-hd / 4, hd / 4), gap = 1.0;
      [[z0, 'n'], [z1, 's']].forEach(function (s) {
        if (face === s[1]) { wallSeg(x0, dx - gap, s[0] - t / 2, s[0] + t / 2, 0, H, col); wallSeg(dx + gap, x1, s[0] - t / 2, s[0] + t / 2, 0, H, col); wallSeg(dx - gap, dx + gap, s[0] - t / 2, s[0] + t / 2, 2.4, H, roofCol); }
        else wallWin(true, x0, x1, s[0] - t / 2, s[0] + t / 2, [(x0 + x1) / 2 - hw * 0.25, (x0 + x1) / 2 + hw * 0.25], col, H);
      });
      [[x0, 'w'], [x1, 'e']].forEach(function (s) {
        if (face === s[1]) { wallSeg(s[0] - t / 2, s[0] + t / 2, z0 + t / 2, dz - gap, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz + gap, z1 - t / 2, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz - gap, dz + gap, 2.4, H, roofCol); }
        else wallWin(false, z0 + t / 2, z1 - t / 2, s[0] - t / 2, s[0] + t / 2, [(z0 + z1) / 2], col, H);
      });
      wallSeg(x0 - 0.15, x1 + 0.15, z0 - 0.15, z1 + 0.15, H, H + 0.42, roofCol);
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, back = face === 'n' ? 1 : face === 's' ? -1 : 0, backx = face === 'w' ? 1 : face === 'e' ? -1 : 0;
      var bx = cx + (backx ? backx * (hw / 2 - 1.6) : -hw / 4), bz = cz + (back ? back * (hd / 2 - 1.2) : -hd / 4); addBed(bx, bz, R() < 0.5);
      var kx = cx + (backx ? backx * (hw / 2 - 1.2) : hw / 4), kz = cz + (back ? back * (hd / 2 - 1.2) : hd / 4) + (backx ? 3 : 0);
      if (backx || back) addCouch(kx + (backx ? 0 : 1), kz, R() < 0.5);
      for (var ci = 0; ci < 2; ci++) { if (ci === 1 && R() < 0.6) continue; for (var ta = 0; ta < 10; ta++) { var crx = cx + rr(-hw / 2 + 1.5, hw / 2 - 1.5), crz = cz + rr(-hd / 2 + 1.5, hd / 2 - 1.5); if (Math.hypot(crx - bx, crz - bz) > 2.2 && Math.hypot(crx - kx, crz - kz) > 2 && Math.hypot(crx - dx, crz - (face === 's' ? z1 : face === 'n' ? z0 : dz)) > 2.2 && !W.hit(crx - 0.7, crx + 0.7, 0.1, 1.0, crz - 0.7, crz + 0.7)) { addCrate(crx, crz, false, null, zn === 'mid' && R() < 0.5 ? 2 : 1); break; } } }
      for (var ia = 0; ia < 1; ia++) { var ix2 = cx + rr(-hw / 2 + 1.8, hw / 2 - 1.8), iz2 = cz + rr(-hd / 2 + 1.8, hd / 2 - 1.8); if (Math.hypot(ix2 - bx, iz2 - bz) > 2.5 && Math.hypot(ix2 - kx, iz2 - kz) > 2.5) W.indoor.push({ x: ix2, z: iz2, y: 0, zone: zn }); }
    }

    var egrid = new Map();
    function addEnt(e) { W.ents.push(e); var k = ck(Math.floor(e.x / CELL), Math.floor(e.z / CELL)), l = egrid.get(k); if (!l) { l = []; egrid.set(k, l); } l.push(e); }
    W.entsNear = function (x, z, rad, out) {
      out.length = 0;
      for (var cx = Math.floor((x - rad) / CELL); cx <= Math.floor((x + rad) / CELL); cx++) for (var cz = Math.floor((z - rad) / CELL); cz <= Math.floor((z + rad) / CELL); cz++) {
        var l = egrid.get(ck(cx, cz)); if (!l) continue;
        for (var i = 0; i < l.length; i++) { var e = l[i]; if (e.alive && Math.hypot(e.x - x, e.z - z) < rad + e.r) out.push(e); }
      }
      return out;
    };

    var trunkG = new THREE.CylinderGeometry(0.22, 0.34, 1, 7); trunkG.translate(0, 0.5, 0);
    var crownG = new THREE.ConeGeometry(1, 1, 8); crownG.translate(0, 0.5, 0);
    var cactG = new THREE.CylinderGeometry(0.26, 0.3, 1, 8); cactG.translate(0, 0.5, 0);
    var TCAP = 8000;
    var trunkM = inst(trunkG, lam(0xffffff, { map: barkTex }), TCAP, true, false), crownM = inst(crownG, lam(0xffffff, { map: leafTex }), TCAP, true, true);
    var crown2M = inst(crownG, lam(0xffffff, { map: leafTex }), TCAP, true, true), cactM = inst(cactG, lam(0x4f9a46), 3000, true, false), armM = inst(boxB, lam(0x4f9a46), 6000, true, false);
    var vineM = inst(boxB, lam(0x2f7a2a), 24000, true, false), frondM = inst(box1, lam(0x4a8a30), 6000, true, false);
    /* 2D leaf cards around the crown (oval green leaf with a dark midrib). Extra Leaves = a second set at diagonal angles. Dynamic Leaves = sway in the vertex shader. */
    var LN = 40, LN2 = 20, leafTex2 = canvasTex(64, 64, function (g, w, h) {
      g.clearRect(0, 0, w, h); g.fillStyle = '#58a845'; g.beginPath(); g.ellipse(32, 32, 14, 28, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#2b6b2a'; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(32, 5); g.lineTo(32, 59); g.stroke(); g.lineWidth = 1.5;
      for (var i = 0; i < 4; i++) { var yy = 16 + i * 10; g.beginPath(); g.moveTo(32, yy + 8); g.lineTo(21, yy); g.moveTo(32, yy + 8); g.lineTo(43, yy); g.stroke(); }
    });
    W.leafU = { uTime: { value: 0 }, uAmp: { value: 0 } };
    function leafMat() {
      var m = new THREE.MeshLambertMaterial({ map: leafTex2, alphaTest: 0.5, side: THREE.DoubleSide });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = W.leafU.uTime; sh.uniforms.uAmp = W.leafU.uAmp;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = uTime * 2.2 + instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.6;\ntransformed.x += sin(ph) * uAmp * (position.y + 0.5);\ntransformed.z += cos(ph * 0.8) * uAmp * (position.y + 0.5);\n#endif');
      };
      return m;
    }
    var leafM = inst(new THREE.PlaneGeometry(1, 1), leafMat(), TCAP * LN, true, true), leaf2M = inst(new THREE.PlaneGeometry(1, 1), leafMat(), TCAP * LN2, true, true);
    leafM.userData.n = LN; leaf2M.userData.n = LN2; leaf2M.visible = false; W.leaf2M = leaf2M; W.leafTex = leafTex2;
    [leafM, leaf2M].forEach(function (m) { m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex2, alphaTest: 0.5, side: THREE.DoubleSide }); }); /* shadows follow the leaf shape -> holes between leaves */
    var _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _le = new THREE.Euler(), _lp = new THREE.Vector3(), _ls = new THREE.Vector3(), _lc = new THREE.Color();
    function leafCards(mesh, i, cx, cz, by, hgt, rad, sz, col, seed, diag) {
      var r = mulberry(seed * 31 + (diag ? 7 : 3));
      var LN = mesh.userData.n;
      for (var j = 0; j < LN; j++) {
        var a = r() * 6.2832, f = r() * 0.9, rr2 = rad * (1 - f) * (diag ? 0.55 + r() * 0.35 : 0.98);
        _lp.set(cx + Math.cos(a) * rr2, by + f * hgt, cz + Math.sin(a) * rr2);
        _le.set(diag ? (r() - 0.5) * 1.6 : 0.35 + r() * 0.5, -a + 1.5708, diag ? (r() - 0.5) * 1.8 : 0, 'YXZ'); _le.set(diag ? (r() - 0.5) * 1.6 : -0.9 - r() * 0.4, -a + 1.5708 + (diag ? 0.9 : 0), diag ? (r() - 0.5) * 1.8 : 0, 'YXZ');
        _lq.setFromEuler(_le); _ls.set(sz * (0.8 + r() * 0.5), sz * (1.3 + r() * 0.6), 1);
        _lm.compose(_lp, _lq, _ls); mesh.setMatrixAt(i * LN + j, _lm); _lc.setHex(col); _lc.offsetHSL(0, 0, (r() - 0.5) * 0.12); mesh.setColorAt(i * LN + j, _lc);
      }
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.count = Math.max(mesh.count, (i + 1) * LN);
    }
    function hideLeaves(i) { _lm.makeScale(0.0001, 0.0001, 0.0001); var j; for (j = 0; j < LN; j++) leafM.setMatrixAt(i * LN + j, _lm); for (j = 0; j < LN2; j++) leaf2M.setMatrixAt(i * LN2 + j, _lm); leafM.instanceMatrix.needsUpdate = true; leaf2M.instanceMatrix.needsUpdate = true; }
    function treeLeaves(t) {
      var i = t.ix, s = t.s, th = t.th, gy = t.y || 0, k = t.kind, col = k === 'snow' ? 0x9fd09a : k === 'jungle' ? 0xb8f0a8 : 0xffffff;
      if (k === 'cactus' || k === 'palm') return;
      var by = k === 'snow' ? th * 0.35 : k === 'jungle' ? th * 0.5 : th * 0.62, hh = k === 'snow' ? 3.6 * s : k === 'jungle' ? 3.8 * s : 3.4 * s, rad = k === 'snow' ? 1.5 * s : k === 'jungle' ? 1.95 * s : 1.3 * s, sz = (k === 'jungle' ? 0.62 : 0.52) * Math.max(0.8, s);
      leafCards(leafM, i, t.x, t.z, gy + by, hh, rad * 1.1, sz, col, i, false); leafCards(leaf2M, i, t.x, t.z, gy + by, hh, rad * 1.1, sz, col, i, true);
    }
    var TMESH = [trunkM, crownM, crown2M, cactM, armM, vineM, frondM];
    function treeMat(t, on) {
      var i = t.ix, s = t.s, th = t.th, x = t.x, z = t.z, gy = t.y || 0, k, j;
      if (!on) { hideLeaves(i); put(trunkM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(crownM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(crown2M, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(cactM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i);
        for (j = 0; j < 2; j++) put(armM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 2 * i + j); for (j = 0; j < 3; j++) put(vineM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 3 * i + j); for (j = 0; j < 5; j++) put(frondM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 5 * i + j); return; }
      k = t.kind; treeLeaves(t);
      if (k === 'cactus') {
        put(cactM, x, gy, z, 1.1 * s, th, 1.1 * s, 0, null, i);
        put(armM, x + 0.5 * s, gy + th * 0.38, z, 0.2 * s, th * 0.42, 0.2 * s, 0, null, 2 * i); put(armM, x - 0.45 * s, gy + th * 0.5, z, 0.2 * s, th * 0.34, 0.2 * s, 0, null, 2 * i + 1); return;
      }
      if (k === 'palm') {
        put(trunkM, x, gy, z, 0.9 * s, th * 1.25, 0.9 * s, t.ry, null, i);
        for (j = 0; j < 5; j++) put(frondM, x, gy + th * 1.25, z, 3.0 * s, 0.07, 0.55 * s, t.ry + j * 1.2566, null, 5 * i + j); return;
      }
      if (k === 'snow') {
        put(trunkM, x, gy, z, 1.2 * s, th, 1.2 * s, t.ry, null, i);
        put(crownM, x, gy + th * 0.35, z, 2.4 * s, 2.6 * s, 2.4 * s, t.ry, t.cc, i); put(crown2M, x, gy + th * 0.35 + 1.7 * s, z, 1.6 * s, 2.3 * s, 1.6 * s, t.ry, t.cc, i); return;
      }
      if (k === 'jungle') {
        put(trunkM, x, gy, z, 1.5 * s, th, 1.5 * s, t.ry, null, i); put(crownM, x, gy + th * 0.5, z, 2.0 * s, 3.6 * s, 2.0 * s, t.ry, t.cc, i);
        for (j = 0; j < 3; j++) { var an = t.ry + j * 2.1; put(vineM, x + Math.cos(an) * 1.5 * s, gy + th * 0.12, z + Math.sin(an) * 1.5 * s, 0.1, th * 0.45, 0.1, 0, null, 3 * i + j); } return;
      }
      put(trunkM, x, gy, z, 1.2 * s, th, 1.2 * s, t.ry, null, i); put(crownM, x, gy + th * 0.62, z, 1.3 * s, 3.0 * s, 1.3 * s, t.ry, t.cc, i);
    }
    W.setTree = function (t, on) { treeMat(t, on); t.box.on = on; t.alive = on; };
    /* [TREE TAG] plain: normal. jungle: lush, hanging vines, more logs, 1.1-1.5x tougher. desert: cactus (0.5-0.8x HP, drops Cactus). snow: dark 2-tier pine (1.2-1.4x HP, Pine Log). beach (map edge): palm (Palm Log). */
    function addTree(x, z, rng, bm, kindIn, gy0) {
      var kind = kindIn || 'plain', s = Math.pow(rng(), 1.6) * 1.5 + 0.7, th = 3.0 * s, hpm = 1, ym = 1, drop = 'wood', leafM = 0.5;
      if (kind === 'jungle') { hpm = rr(1.1, 1.5, rng); ym = 1.5; leafM = 0.8; s = s * 1.1; th = 3.0 * s; }
      else if (kind === 'cactus') { hpm = rr(0.5, 0.8, rng); ym = 0.8; drop = 'cactus'; leafM = 0; s = 0.7 + rng() * 0.6; th = 1.6 + rng() * 1.3; }
      else if (kind === 'snow') { hpm = rr(1.2, 1.4, rng); ym = 1.1; drop = 'pine_log'; }
      else if (kind === 'palm') { hpm = 1.1; ym = 1.1; drop = 'palm_log'; th = 3.2 * s; }
      var cols = kind === 'snow' ? [0x1f4d2e, 0x255a33, 0x1b4429] : kind === 'jungle' ? [0x2f6b30, 0x3a7d35, 0x25602a, 0x1f5a28] : [0x4c6e3d, 0x577c43, 0x426137, 0x677a43, 0x736d43];
      var t = { k: 'tree', kind: kind, drop: drop, leaf: leafM, idx: W.trees.length, x: x, z: z, y: gy0 || 0, s: s, th: th, ry: rng() * 6.28, r: (kind === 'cactus' ? 0.4 : 0.55 * s + 0.15), h: kind === 'cactus' ? th : th * 0.62 + 3.4 * s, alive: true, dyn: true, max: Math.round(34 * s * s * hpm), hp: 0, yield: Math.round((3 + 5.2 * s * s) * ym), given: 0, respawn: 0, cc: pick(cols, rng) };
      t.hp = t.max; t.ix = trunkM.count; TMESH.forEach(function (m) { if (m === trunkM || m === crownM || m === crown2M || m === cactM) m.count = Math.max(m.count, t.ix + 1); else if (m === armM) m.count = Math.max(m.count, 2 * t.ix + 2); else if (m === vineM) m.count = Math.max(m.count, 3 * t.ix + 3); else if (m === frondM) m.count = Math.max(m.count, 5 * t.ix + 5); });
      var hw = kind === 'cactus' ? 0.35 : 0.3 * s; t.box = addBox(x - hw, x + hw, gy0 || 0, (gy0 || 0) + th, z - hw, z + hw, true);
      treeMat(t, true); addEnt(t); W.trees.push(t);
    }

    var rockG = new THREE.DodecahedronGeometry(1, 0), rockM = inst(rockG, lam(0xffffff, { map: rockTex, flatShading: true }), 2300, true, true);
    W.setRock = function (t, on) {
      if (!on) put(rockM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix);
      else put(rockM, t.x, (t.y || 0) + 0.55 * t.s, t.z, 1.15 * t.s, 0.8 * t.s, 1.0 * t.s, t.ry, t.cc, t.ix);
      t.box.on = on; t.alive = on;
    };
    /* [ORE TAG] kinds: stone | coal | copper | iron | gold.  Surface: 90% stone / 9% coal / 1% copper. Underground: 40 stone / 30 coal / 15 copper / 10 iron / 5 gold. */
    var ORE_COL = { sand: 0xe6d28f, stone: 0x8d9198, coal: 0x33343a, copper: 0xd2733a, iron: 0xb59a8c, gold: 0xe0b83a, zinc: 0x9fb6c4, titanium: 0x7aa7d6, permafrost: 0xaee4f4, diamond: 0x66e6ff, ruby: 0xd0213a, emerald: 0x2ecc71, amethyst: 0x9b59d6, sapphire: 0x2d5bd6, granite: 0xb98a6a, andesite: 0xa9adb0, diorite: 0xd0d0cc, calcite: 0xf4f4ee, clay: 0xb86f50 };
    function addRock(x, z, kindIn, rng, gy0) {
      var kind = kindIn || 'stone', plain = kind === 'stone' || kind === 'sand', s = rr(0.8, 2.1, rng);
      var t = { k: 'rock', idx: W.rocks.length, kind: kind, ore: kind === 'iron', coal: kind === 'coal', gold: kind === 'gold', copper: kind === 'copper', zinc: kind === 'zinc', sand: kind === 'sand', x: x, z: z, y: gy0 || 0, s: s, ry: rng() * 6.28, r: 0.95 * s, h: 1.5 * s, alive: true, dyn: true,
        max: Math.round((plain ? 60 : kind === 'sand' ? 30 : kind === 'coal' ? 70 : 100) * s * s), yield: plain ? Math.round(4 + 6 * s * s) : kind === 'coal' ? Math.round(2 + 3 * s * s) : kind === 'copper' ? Math.round(4 + 6 * s * s) : Math.round(2 + 4 * s * s), given: 0, respawn: 0, cc: ORE_COL[kind] };
      t.hp = t.max; t.ix = rockM.count++; t.box = addBox(x - 0.8 * s, x + 0.8 * s, gy0 || 0, (gy0 || 0) + 1.2 * s, z - 0.8 * s, z + 0.8 * s, true);
      W.setRock(t, true); addEnt(t); W.rocks.push(t);
    }
    function rollSurfaceOre(rng) { var r = rng(); return r < 0.90 ? 'stone' : r < 0.99 ? 'coal' : 'copper'; }
    function rollUgOre(rng) { var r = rng() * 100; return r < 18 ? 'stone' : r < 23 ? 'granite' : r < 28 ? 'andesite' : r < 33 ? 'diorite' : r < 38 ? 'calcite' : r < 66 ? 'coal' : r < 81 ? 'copper' : r < 90 ? 'iron' : r < 95 ? 'zinc' : 'gold'; }

    var pileM = inst(box1, lam(0xffffff, { map: houseWallTex }), 60000, true, true), shineM = inst(box1, lam(0xffffff), 16000, true, true), tableM = inst(box1, lam(0xffffff, { map: plankTex }), 4000, true, true), tlegM = inst(box1, lam(0x3a2a1a), 16000, true, true);
    W.zoneOf = zoneOf;
    W.setPile = function (p, full) {
      var yb = p.yb || 0;
      if (p.tier === 4) { p.parts.forEach(function (q) { put(q.m, p.x + q.dx, (q.item && !full) ? -5 : q.y + yb, p.z + q.dz, q.sx, q.sy, q.sz, q.ry, q.col, q.i); }); p.searched = !full; return; }
      var k = full ? 1 : 0.3; p.parts.forEach(function (q) { put(q.m, p.x + q.dx, q.y * k + yb, p.z + q.dz, q.sx, q.sy * k, q.sz, q.ry, q.col, q.i); }); p.searched = !full; };
    function addPile(x, z, tier, rng, yb) {
      var p = { k: 'pile', idx: W.piles.length, tier: tier, x: x, z: z, y: yb || 0, yb: yb || 0, r: 0.9, h: 0.9, alive: true, dyn: true, searched: false, respawn: 0, parts: [] };
      if (tier === 4) {
        var ry4 = rng() * 3.14, tq = { m: tableM, dx: 0, dz: 0, sx: 1.7, sy: 0.12, sz: 0.95, ry: ry4, col: 0xffffff, y: 0.86 }; tq.i = tableM.count++; p.parts.push(tq);
        var cs = Math.cos(ry4), sn = Math.sin(ry4);
        [[-0.72, -0.38], [0.72, -0.38], [-0.72, 0.38], [0.72, 0.38]].forEach(function (o) { var lq = { m: tlegM, dx: o[0] * cs + o[1] * sn, dz: -o[0] * sn + o[1] * cs, sx: 0.1, sy: 0.8, sz: 0.1, ry: ry4, col: 0xffffff, y: 0.4 }; lq.i = tlegM.count++; p.parts.push(lq); });
        var iq = { m: shineM, dx: 0.1, dz: 0, sx: 0.4, sy: 0.12, sz: 0.28, ry: ry4, col: pick([0x3ad06b, 0x4aa0ff, 0xe8e8f0], rng), y: 0.98, item: true }; iq.i = shineM.count++; p.parts.push(iq);
        p.r = 1.1; p.h = 1.0; W.setPile(p, true); addEnt(p); W.piles.push(p); return;
      }
      var cols = tier === 0 ? [0x3f7d34, 0x4f9140, 0x2f6a2c, 0x5aa04a] : tier === 1 ? [0x6d695f, 0x7a6d5c, 0x5c5a54, 0x827868] : [0x7a7871, 0x676a6e, 0x8a7d69, 0x5e5d59];
      for (var i = 0; i < 5; i++) { var q = { m: pileM, dx: rr(-0.5, 0.5, rng), dz: rr(-0.5, 0.5, rng), sx: rr(0.25, 0.7, rng), sy: rr(0.25, 0.6, rng), sz: rr(0.25, 0.7, rng), ry: rng() * 3, col: pick(cols, rng) }; q.y = q.sy / 2; q.i = pileM.count++; p.parts.push(q); }
      if (tier === 2) for (var j = 0; j < 2; j++) { var q2 = { m: shineM, dx: rr(-0.4, 0.4, rng), dz: rr(-0.4, 0.4, rng), sx: 0.18, sy: 0.12, sz: 0.3, ry: rng() * 3, col: pick([0xdde2e8, 0xe8c468, 0xc4d0d9], rng) }; q2.y = rr(0.4, 0.7, rng); q2.i = shineM.count++; p.parts.push(q2); }
      W.setPile(p, true); addEnt(p); W.piles.push(p);
    }

    var crateM = inst(box1, lam(0xffffff, { map: crateTex }), 6000, true, true), lidM = inst(box1, lam(0xffffff), 6000, true, true);
    W.setCrate = function (c, full) {
      var bodyCol = c.tier === 2 ? (full ? 0xffdf9e : 0x99845a) : (full ? 0xffffff : 0x8a7558);
      var lidCol = c.tier === 2 ? 0x3b4859 : 0x4f361c;
      var yb = c.yb || 0; put(crateM, c.x, yb + (full ? 0.45 : 0.3), c.z, 0.9, full ? 0.9 : 0.6, 0.9, c.ry, bodyCol, c.ix);
      put(lidM, c.x, full ? yb + 0.92 : -5, c.z, 0.98, 0.1, 0.98, c.ry, lidCol, c.ix);
      c.searched = !full;
    };
    function addCrate(x, z, isDyn, rng, tier, yb) {
      var fn = rng || R, c = { k: 'crate', idx: W.crates.length, tier: tier || 1, x: x, z: z, y: yb || 0, yb: yb || 0, r: 0.75, h: 0.9, alive: true, dyn: !!isDyn, searched: false, respawn: 0, ry: fn() * 3 };
      c.ix = crateM.count++; lidM.count++; addBox(x - 0.45, x + 0.45, yb || 0, (yb || 0) + 0.9, z - 0.45, z + 0.45, !!isDyn);
      W.setCrate(c, true); addEnt(c); W.crates.push(c);
    }

    function addBlockEnt(x, y, z, t, sz) {
      var kind = t === 3 ? 'furnace' : t === 4 ? 'bed' : t === 5 ? 'couch' : t === 6 ? 'sink' : t === 7 ? 'campfire' : t === 8 ? 'anvil' : t === 9 ? 'computer' : t === 11 ? 'sawmill' : t === 12 ? 'tbench' : (t >= 13 && t <= 15) ? 'turret' : t === 16 ? 'milling' : t === 17 ? 'bomb' : t === 18 ? 'kiln' : t === 19 ? 'craft' : t === 20 ? 'work' : t === 49 ? 'liquiders' : t === 50 ? 'sewing' : t === 51 ? 'godstatue' : t >= 70 ? 'bed' : t >= 67 || (t >= 64 && t <= 66) ? 'lamp' : t >= 61 ? 'sofa' : t >= 58 ? 'sofa' : t >= 55 ? 'table' : t >= 52 ? 'seat' : t === 43 ? 'blast' : t === 29 ? 'press' : t === 30 ? 'casing' : t === 31 ? 'trapb' : t === 32 ? 'mason' : (t >= 21 && t <= 25) ? 'chest' : null;
      if (!kind) return null;
      var w = sz ? sz.w : 1, d = sz ? sz.d : 1, h = sz ? sz.h : 1;
      var e = { k: kind, x: x + w / 2, z: z + d / 2, y: y, r: Math.max(w, d) / 2 + 0.4, h: h, clean: true, alive: true, dyn: true, vx: x, vy: y, vz: z, sw: w, sd: d };
      addEnt(e); W.bents.push(e);
      if (t === 3) W.furn.push(e);
      else if (t === 6) W.sinks.push(e);
      else if (t === 7) W.camps.push(e);
      else if (t === 8) W.anvils.push(e);
      else if (t === 9) W.comps.push(e);
      else if (t === 11) W.saws.push(e);
      else if (t === 12) W.tbench.push(e);
      else if (t >= 13 && t <= 15) { e.vt = t; e.ammo = 0; e.cd = 0; e.r = 0.75; W.turrets.push(e); }
      else if (t === 16) W.mills.push(e);
      else if (t === 17) W.bombs.push(e);
      else if (t === 18) W.kilns.push(e);
      else if (t === 19) W.crafts.push(e);
      else if (t === 20) W.works.push(e);
      else if (t === 29) W.presses.push(e);
      else if (t === 43) W.blasts.push(e);
      else if (t === 49) W.liqs.push(e);
      else if (t === 50) W.sews.push(e);
      else if (t === 51) W.gods.push(e);
      else if (t >= 52 && t <= 54) { e.seat = 5; W.seats.push(e); } else if (t >= 58 && t <= 63) { e.seat = 16; e.comfy = true; W.seats.push(e); } else if (t >= 55 && t <= 57) { e.on = null; W.tables.push(e); } else if (t >= 64 && t <= 69) { e.lamp = true; W.lamps.push(e); }
      else if (t === 30) W.casings.push(e);
      else if (t === 31) W.trapbs.push(e);
      else if (t === 32) W.masons.push(e);
      else if (t >= 21 && t <= 25) { e.vt = t; e.box = {}; W.chests.push(e); }
      return e;
    }

    /* Loot cars: each car has 10-25 Break Points, loot is in the trunk */
    /* Car model: painted lower body, trapezoid glass cabin, 4 wheels, front/rear textured plates with lights. Truck keeps the simple box. */
    var cabG = new THREE.CylinderGeometry(0.7071 * 0.7, 0.7071, 1, 4, 1, true); cabG.rotateY(Math.PI / 4); cabG.translate(0, 0.5, 0);
    var whG = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); whG.rotateZ(Math.PI / 2); whG.translate(0, 0.34, 0);
    var glassTex = canvasTex(128, 64, function (g, w, h) {
      g.fillStyle = '#34383d'; g.fillRect(0, 0, w, h); var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16222e'); gr.addColorStop(0.5, '#3c5a76'); gr.addColorStop(1, '#1a2733');
      g.fillStyle = gr; g.fillRect(7, 8, w - 14, h - 14); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(14, h - 8); g.lineTo(48, 8); g.lineTo(66, 8); g.lineTo(32, h - 8); g.fill();
      g.fillStyle = 'rgba(60,50,35,0.28)'; g.fillRect(7, h - 20, w - 14, 12); g.strokeStyle = '#1b1d20'; g.lineWidth = 2; g.strokeRect(7, 8, w - 14, h - 14); g.fillStyle = '#2a2d31'; g.fillRect(w / 2 - 2, 8, 4, h - 14);
    });
    function plateTex(front) {
      var cv = document.createElement('canvas'); cv.width = 256; cv.height = 101; var g = cv.getContext('2d'), em = document.createElement('canvas'); em.width = 256; em.height = 101; var e = em.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, 256, 101);
      function rr(c, x, y, w, h, r, f) { c.fillStyle = f; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.fill(); }
      rr(g, 0, 74, 256, 27, 6, '#4b4e53'); rr(g, 98, 80, 60, 17, 2, '#e9e6d6'); g.fillStyle = '#222'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText(front ? 'ZB 4471' : 'ZB 9082', 128, 93);
      if (front) {
        rr(g, 74, 34, 108, 34, 4, '#15161a'); g.strokeStyle = '#9aa0a8'; g.lineWidth = 2; for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(80, 42 + k * 7); g.lineTo(176, 42 + k * 7); g.stroke(); }
        [[10, 60], [186, 60]].forEach(function (o) { rr(g, o[0], 26, 58, 32, 8, '#777c84'); rr(g, o[0] + 4, 30, 50, 24, 6, '#f2f6ff'); rr(e, o[0] + 4, 30, 50, 24, 6, '#ffffff'); rr(g, o[0] + 6, 61, 46, 8, 3, '#d98a1a'); });
      } else {
        [[8, 0], [190, 0]].forEach(function (o) { rr(g, o[0], 22, 58, 32, 8, '#5a1010'); rr(g, o[0] + 4, 26, 50, 24, 6, '#d11a1a'); rr(e, o[0] + 4, 26, 50, 24, 6, '#aa1111'); rr(g, o[0] + 6, 57, 46, 7, 3, '#bba030'); });
        rr(g, 74, 36, 108, 5, 2, '#1d1e22'); rr(g, 74, 50, 108, 3, 1, '#2c2d31');
      }
      var t1 = new THREE.CanvasTexture(cv), t2 = new THREE.CanvasTexture(em); [t1, t2].forEach(function (t) { if ('SRGBColorSpace' in THREE) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; }); return [t1, t2];
    }
    var ft = plateTex(true), rt = plateTex(false);
    var carBody = inst(boxB, lam(0xffffff), 1300, true, true), carTop = inst(boxB, lam(0x373b40), 1300, true, false), carCab = inst(cabG, lam(0xffffff, { map: glassTex, side: THREE.DoubleSide }), 1300, true, false), carRoof = inst(boxB, lam(0xffffff), 1300, true, true);
    var carWh = inst(whG, lam(0x1b1b1d), 5200, true, false);
    var carFr = inst(new THREE.PlaneGeometry(1, 1), lam(0xffffff, { map: ft[0], emissive: 0xffffff, emissiveMap: ft[1], emissiveIntensity: 0.85, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), 1300, true, false);
    var carRr = inst(new THREE.PlaneGeometry(1, 1), lam(0xffffff, { map: rt[0], emissive: 0xffffff, emissiveMap: rt[1], emissiveIntensity: 0.6, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), 1300, true, false);
    var CARM = [carBody, carTop, carCab, carRoof, carFr, carRr];
    W.cars = [];
    function carHide(c) { var j; [carBody, carTop, carCab, carRoof, carFr, carRr].forEach(function (m) { put(m, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix); }); for (j = 0; j < 4; j++) put(carWh, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 4 * c.ix + j); }
    W.setCar = function (c, on) {
      var y0 = c.y || 0;
      if (!on) carHide(c);
      else if (c.truck) { carHide(c); put(carBody, c.x, y0 + 0.5, c.z, c.lx, 1.4, c.lz, 0, c.col, c.ix); put(carTop, c.x + (c.horiz ? 1.2 : 0), y0 + 2.1, c.z + (c.horiz ? 0 : 1.2), c.horiz ? 5.0 : 2.4, 1.8, c.horiz ? 2.4 : 5.0, 0, null, c.ix); }
      else {
        var ry = (c.horiz ? Math.PI / 2 : 0) + (c.dir < 0 ? Math.PI : 0), sn = Math.sin(ry), cs = Math.cos(ry), j, wx, wz;
        function at(lx, lz) { return [c.x + sn * lz + cs * lx, c.z + cs * lz - sn * lx]; }
        put(carBody, c.x, y0 + 0.3, c.z, 1.9, 0.72, 4.4, ry, c.col, c.ix);
        var cb = at(0, -0.2); put(carCab, cb[0], y0 + 1.02, cb[1], 1.7, 0.62, 2.3, ry, null, c.ix); put(carRoof, cb[0], y0 + 1.64, cb[1], 1.18, 0.05, 1.62, ry, c.col, c.ix);
        var f = at(0, 2.205), r = at(0, -2.205); put(carFr, f[0], y0 + 0.62, f[1], 1.9, 0.75, 1, ry, null, c.ix); put(carRr, r[0], y0 + 0.62, r[1], 1.9, 0.75, 1, ry + Math.PI, null, c.ix);
        for (j = 0; j < 4; j++) { var w = at(j < 2 ? -0.93 : 0.93, j % 2 ? 1.4 : -1.4); put(carWh, w[0], y0, w[1], 1, 1, 1, ry, null, 4 * c.ix + j); }
      }
      c.box.on = on; c.alive = on;
    };
    function addCar(x, z, horiz, rng, truck) {
      var c = { k: 'car', truck: !!truck, idx: W.cars.length, x: x, z: z, y: 0, dir: rng() < 0.5 ? -1 : 1, r: truck ? 3.4 : 1.9, h: truck ? 3.0 : 1.75, horiz: horiz, lx: truck ? (horiz ? 7.6 : 2.7) : (horiz ? 4.4 : 1.9), lz: truck ? (horiz ? 2.7 : 7.6) : (horiz ? 1.9 : 4.4), alive: true, dyn: true, respawn: 0, col: truck ? pick([0xb5b0a4, 0xa34f3a, 0x3b5f8a, 0xc9a23a], rng) : pick([0x943636, 0x386191, 0x808036, 0x676d73, 0x9c9c94, 0x4b704b], rng) };
      c.max = c.hp = truck ? 30 + Math.floor(rng() * 21) : 10 + Math.floor(rng() * 16); c.ix = carBody.count; CARM.forEach(function (m) { m.count = Math.max(m.count, c.ix + 1); }); carWh.count = Math.max(carWh.count, 4 * c.ix + 4);
      c.box = addBox(x - c.lx / 2, x + c.lx / 2, 0, c.truck ? 3.0 : 1.75, z - c.lz / 2, z + c.lz / 2, true); W.setCar(c, true); addEnt(c); W.cars.push(c);
    }
    var lakeList = [];
    /* Graveyards: fixed spots (about 2% of the blocks outside the city centre). Zombies also spawn from them. */
    W.graves = [];
    function addGraveyard(cx, cz, x0, x1, z0, z1) {
      var gr = mulberry(((Math.floor(cx) * 73856093) ^ (Math.floor(cz) * 19349663)) >>> 0), hw = Math.min(x1 - x0, 44) / 2, hd = Math.min(z1 - z0, 44) / 2, gx, gz;
      put(walls, cx, 0.02, cz, hw * 2, 0.06, hd * 2, 0, 0x3b3a30);
      for (gx = -hw + 3; gx <= hw - 3; gx += 4.5) for (gz = -hd + 5; gz <= hd - 3; gz += 5) {
        if (gr() < 0.2) continue; var px = cx + gx + (gr() - 0.5) * 1.2, pz = cz + gz + (gr() - 0.5) * 1.2;
        put(walls, px, 0.6, pz, 0.8, 1.2, 0.28, 0, 0x8d9096); put(walls, px, 0.1, pz + 0.9, 0.9, 0.2, 1.7, 0, 0x4a3a2c); addBox(px - 0.4, px + 0.4, 0, 1.2, pz - 0.15, pz + 0.15, false);
      }
      for (var f = -hw; f <= hw; f += 3) { if (Math.abs(f) > 3) put(walls, cx + f, 0.8, cz + hd, 0.25, 1.6, 0.25, 0, 0x2a2a2e); put(walls, cx + f, 0.8, cz - hd, 0.25, 1.6, 0.25, 0, 0x2a2a2e); }
      for (var h2 = -hd; h2 <= hd; h2 += 3) { put(walls, cx - hw, 0.8, cz + h2, 0.25, 1.6, 0.25, 0, 0x2a2a2e); put(walls, cx + hw, 0.8, cz + h2, 0.25, 1.6, 0.25, 0, 0x2a2a2e); }
      wallSeg(cx - 3.5, cx + 3.5, cz - hd + 1, cz - hd + 6, 0, 3.6, 0x6f7378); put(walls, cx, 4.1, cz - hd + 3.5, 8, 0.8, 7, 0, 0x55585c);
      occupied.push([cx - hw - 1, cx + hw + 1, cz - hd - 1, cz + hd + 1]); W.rects.push({ x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, c: '#3d3b34' }); W.graves.push({ x: cx, z: cz, r: Math.min(hw, hd) });
    }
    /* Fixed city layout */
    for (var a = 0; a <= ROADS.length; a++) for (var b = 0; b <= ROADS.length; b++) {
      var lx0 = a === 0 ? -HALF : ROADS[a - 1] + RW / 2, lx1 = a === ROADS.length ? HALF : ROADS[a] - RW / 2;
      var lz0 = b === 0 ? -HALF : ROADS[b - 1] + RW / 2, lz1 = b === ROADS.length ? HALF : ROADS[b] - RW / 2;
      var cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, zone = zoneOf(cx, cz), rim = a === 0 || b === 0 || a === ROADS.length || b === ROADS.length;
      if (rim) continue;
      if (lx1 > -935 && lx0 < -875 && lz1 > -933 && lz0 < -877) continue; /* space reserved for the mineshaft mountain */
      curBiome = biomeOf(cx, cz);
      var ins = 5, bx0 = lx0 + ins, bx1 = lx1 - ins, bz0 = lz0 + ins, bz1 = lz1 - ins;
      if (zone !== 'down' && R() < 0.02) { addGraveyard(cx, cz, bx0, bx1, bz0, bz1); continue; }
      if (zone === 'out' && R() < 0.04) { var lk = 12 + R() * 4; lakeList.push([cx - lk, cx + lk, cz - lk, cz + lk]); continue; }
      if (zone === 'down') {
        if (R() < 0.55) tallBuilding(bx0, bx1, bz0, bz1, rr(26, 72));
        else { var mxm = (bx0 + bx1) / 2, mzm = (bz0 + bz1) / 2, g = 2; [[bx0, mxm - g, bz0, mzm - g], [mxm + g, bx1, bz0, mzm - g], [bx0, mxm - g, mzm + g, bz1], [mxm + g, bx1, mzm + g, bz1]].forEach(function (q) { tallBuilding(q[0], q[1], q[2], q[3], rr(12, 44)); }); }
      } else if (zone === 'mid') {
        var roll = R();
        if (roll < 0.3 && curBiome !== 'jungle') tallBuilding(bx0 + 2, bx1 - 2, bz0 + 2, bz1 - 2, rr(10, 24));
        else if (roll < 0.9) { var mx2 = (bx0 + bx1) / 2, mz2 = (bz0 + bz1) / 2; [[mx2 - 12, mz2 - 12], [mx2 + 12, mz2 - 12], [mx2 - 12, mz2 + 12], [mx2 + 12, mz2 + 12]].forEach(function (q, qi) { if (R() < 0.85) house(q[0] + rr(-1.5, 1.5), q[1] + rr(-1.5, 1.5), qi < 2 ? 's' : 'n', 'mid'); }); }
      } else {
        var mx3 = (bx0 + bx1) / 2, mz3 = (bz0 + bz1) / 2;
        [[mx3 - 12, mz3 - 12], [mx3 + 12, mz3 - 12], [mx3 - 12, mz3 + 12], [mx3 + 12, mz3 + 12]].forEach(function (q) { if (R() < (curBiome === 'jungle' ? 0.5 : 0.4)) house(q[0] + rr(-2, 2), q[1] + rr(-2, 2), pick(['n', 's', 'e', 'w']), 'out'); });
      }
    }
    /* ---------------- Lakes, river and the mineshaft ---------------- */
    W.waterMeshes = []; var waterMat = new THREE.MeshLambertMaterial({ color: 0x2f7fa8, transparent: true, opacity: 0.82 }); W.waterMat = waterMat; var shoreMat = new THREE.MeshLambertMaterial({ color: 0x8a8460 });
    function addWater(x0, x1, z0, z1, type) {
      var sh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 3, z1 - z0 + 3), shoreMat); sh.rotation.x = -Math.PI / 2; sh.position.set((x0 + x1) / 2, 0.035, (z0 + z1) / 2); scene.add(sh);
      var wm = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), waterMat); W.waterMeshes.push(wm); wm.rotation.x = -Math.PI / 2; wm.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2); scene.add(wm);
      if (type !== 'river') addBox(x0, x1, 0, 1.2, z0, z1, false); /* the river is walkable (the current pushes you) */ occupied.push([x0 - 2.5, x1 + 2.5, z0 - 2.5, z1 + 2.5]);
      W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#2f7fa8' }); W.waters.push({ x0: x0, x1: x1, z0: z0, z1: z1, type: type });
    }
    lakeList.forEach(function (l) { addWater(l[0], l[1], l[2], l[3], 'lake'); });
    addWater(-975, -965, -300, 300, 'river');
    W.seaAt = function (x, z) { return WZ.TERRAIN.gh(x, z) < -0.3; };
    W.waterAt = function (x, z) { if (W.seaAt(x, z)) return 'sea'; for (var i = 0; i < W.waters.length; i++) { var w = W.waters[i]; if (x > w.x0 - 0.3 && x < w.x1 + 0.3 && z > w.z0 - 0.3 && z < w.z1 + 0.3) return w.type; } return null; };
    (function () {
      /* ---- Surface mineshaft: an irregular rocky mini-mountain (snow biome, NW). The entrance leads down to the Underground. ---- */
      var MR = mulberry(4242), MCX = -905, MCZ = -905;
      function mr(a, b) { return a + (b - a) * MR(); }
      var notch = { x0: MCX - 3, x1: MCX + 3, z0: MCZ + 1, z1: MCZ + 18 };
      function hitsNotch(x0, x1, z0, z1) { return x0 < notch.x1 && x1 > notch.x0 && z0 < notch.z1 && z1 > notch.z0; }
      var LC = [0x6b6560, 0x77716b, 0x5c5953, 0x807a73];
      wallSeg(MCX - 13, MCX + 13, MCZ - 14, MCZ + 1, 0, 6.4, 0x5f5a55);
      for (var L = 0; L < 5; L++) {
        var y0 = L < 2 ? 0 : 6.4 + (L - 2) * 3.4, y1 = L < 2 ? 6.4 : y0 + 3.4, rad = 24 * (1 - L * 0.17), nb = 15 - L * 2;
        if (L === 1) continue;
        for (var q = 0; q < nb; q++) {
          var w = mr(7, 15) * (1 - L * 0.1), d = mr(7, 15) * (1 - L * 0.1), ang = MR() * 6.283, rr2 = Math.sqrt(MR()) * rad, bx = MCX + Math.cos(ang) * rr2, bz = MCZ - 2 + Math.sin(ang) * rr2 * 0.8;
          var x0 = bx - w / 2, x1 = bx + w / 2, z0 = bz - d / 2, z1 = bz + d / 2;
          if (L < 2 && hitsNotch(x0 - 0.4, x1 + 0.4, z0 - 0.4, z1 + 0.4)) continue;
          if (L >= 2 && L < 4 && Math.hypot(bx - MCX, bz - MCZ) > rad) continue;
          wallSeg(x0, x1, z0, z1, L === 0 ? 0 : y0, L === 0 ? 6.4 : y1, L >= 3 ? (L === 4 ? 0xe9eff2 : 0xb7c0c6) : LC[(MR() * 4) | 0]);
        }
      }
      wallSeg(MCX - 5, MCX + 5, MCZ - 6, MCZ + 1, 6.4, 12.5, 0x74706a);
      put(walls, MCX, 1.6, MCZ + 1.05, 3.6, 3.2, 0.25, 0, 0x120f0c); put(walls, MCX - 2.1, 1.6, MCZ + 2.2, 0.4, 3.2, 0.4, 0, 0x6b4d30); put(walls, MCX + 2.1, 1.6, MCZ + 2.2, 0.4, 3.2, 0.4, 0, 0x6b4d30); put(walls, MCX, 3.3, MCZ + 2.2, 4.6, 0.4, 0.4, 0, 0x6b4d30);
      occupied.push([MCX - 28, MCX + 28, MCZ - 26, MCZ + 24]);
      W.rects.push({ x0: MCX - 24, x1: MCX + 24, z0: MCZ - 22, z1: MCZ + 16, c: '#7d8388' });
      put(walls, MCX + 9, 1.0, MCZ + 9, 1.1, 2.0, 1.1, 0, 0x7d7f80); put(walls, MCX + 9, 2.3, MCZ + 9, 0.7, 0.7, 0.7, 0, 0x6f7273); put(walls, MCX + 9, 2.65, MCZ + 8.78, 0.5, 0.12, 0.1, 0, 0xcc2222); addBox(MCX + 8.45, MCX + 9.55, 0, 2.7, MCZ + 8.45, MCZ + 9.55, false); W.statue = { x: MCX + 9, z: MCZ + 9 };
      W.mine = { x0: MCX - 26, x1: MCX + 26, z0: MCZ - 24, z1: MCZ + 18, door: { x: MCX, z: MCZ + 2.6 }, entrance: { x: MCX, z: MCZ + 8 } };
      /* Hill Caves (1-5, on hills) and Mountain Cave (exactly 1, on a mountain): surface shortcuts into the underground, no need to find the mineshaft. */
      (function () {
        var CR = mulberry(9091), caves = [], g = TR.gh, k, tr, bx, bz, h, best;
        function ringPt(lo, hi, wantMtn) { var b = null, bs = -1; for (var q = 0; q < 2500; q++) { var x = (CR() * 2 - 1) * (WZ.HALF - 320), z = (CR() * 2 - 1) * (WZ.HALF - 320); if (Math.max(Math.abs(x), Math.abs(z)) < CORE + 60) continue; var hh = g(x, z), bm = TR.biome(x, z); if (bm === 'sea' || bm === 'beach') continue; if (wantMtn && bm !== 'mountain' && bm !== 'peak') continue; var sc = hh >= lo && hh <= hi ? 1000 + CR() * 100 : -Math.abs(hh - (lo + hi) / 2); if (wantMtn) sc = hh + (hh >= lo ? 500 : 0); if (sc > bs) { bs = sc; b = [x, z, hh]; } } return b; }
        var nHill = 1 + Math.floor(CR() * 5);
        for (k = 0; k < nHill + 1; k++) { var isM = k === nHill; var pt = isM ? ringPt(100, 400, true) : ringPt(8, 70, false); if (!pt) continue; caves.push({ kind: isM ? 'mountain' : 'hill', x: pt[0], z: pt[1], y: pt[2], maxLayer: isM ? 6 : 3, minLayer: isM ? 2 : 1 }); }
        caves.forEach(function (c, ci) {
          var gy = c.y, col = c.kind === 'mountain' ? 0x6a6e78 : 0x77706a;
          put(walls, c.x - 2.2, gy + 1.8, c.z, 1.3, 3.8, 2.2, 0, col); put(walls, c.x + 2.2, gy + 1.8, c.z, 1.3, 3.8, 2.2, 0, col); put(walls, c.x, gy + 3.9, c.z, 5.8, 1.2, 2.4, 0, col - 0x080808);
          put(walls, c.x, gy + 1.6, c.z - 0.9, 3.2, 3.2, 0.2, 0, 0x050403); put(walls, c.x, gy + 0.55, c.z - 0.1, 3.4, 0.12, 1.8, 0, 0x2b2622);
          put(walls, c.x, gy + 5.0, c.z - 0.6, 7.5, 2.2, 3.0, 0, col - 0x101010); put(walls, c.x - 3.9, gy + 1.2, c.z - 0.4, 2.0, 2.4, 2.6, 0.3, col - 0x080808); put(walls, c.x + 3.9, gy + 1.2, c.z - 0.4, 2.0, 2.4, 2.6, -0.3, col - 0x080808);
          c.door = { x: c.x, z: c.z + 0.6 }; c.entrance = { x: c.x, z: c.z + 4 }; c.id = ci;
        });
        W.caves = caves;
      })();
      /* Beach Village (few houses on flat shore) and Downtown Mountain (house clusters on the flat mountain pads) */
      (function () {
        var BR = mulberry(5150), TRn = TR;
        function flat(x, z, r) { var h0 = TRn.gh(x, z), mx = 0; for (var a = 0; a < 8; a++) mx = Math.max(mx, Math.abs(TRn.gh(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r) - h0)); return mx; }
        function place(x, z, gy, bio) {
          var e0 = W.ents.length, i0 = W.indoor.length, f0 = W.floors.length, j; curBiome = bio; GYO = gy;
          wallSeg(x - 9, x + 9, z - 8, z + 8, -2.6, 0.04, 0x8a857a); house(x, z, ['n', 's', 'e', 'w'][(BR() * 4) | 0], 'out'); GYO = 0; curBiome = 'city';
          for (j = e0; j < W.ents.length; j++) W.ents[j].y = (W.ents[j].y || 0) + gy; for (j = i0; j < W.indoor.length; j++) W.indoor[j].y = (W.indoor[j].y || 0) + gy; for (j = f0; j < W.floors.length; j++) W.floors[j].y += gy;
        }
        var sites = [], tries = 0;
        while (sites.length < 12 && tries++ < 60000) {
          var x = (BR() * 2 - 1) * (WZ.HALF - 120), z = (BR() * 2 - 1) * (WZ.HALF - 120);
          if (Math.max(Math.abs(x), Math.abs(z)) < CORE + 80 || TRn.biome(x, z) !== 'beach') continue; var g = TRn.gh(x, z); if (g < 0.1 || flat(x, z, 11) > 0.6) continue;
          if (TRn.gh(x + 10, z + 9) < 0.05 || TRn.gh(x - 10, z + 9) < 0.05 || TRn.gh(x + 10, z - 9) < 0.05 || TRn.gh(x - 10, z - 9) < 0.05) continue;
          if (sites.some(function (s) { return Math.hypot(s[0] - x, s[1] - z) < 30; })) continue;
          
          sites.push([x, z, g]);
        }
        sites.forEach(function (s) { place(s[0], s[1], s[2], 'city'); });
        W.beachVillage = sites.map(function (s) { return { x: s[0], z: s[1] }; });
        TRn.pads.forEach(function (pd) { [[0, 0], [-24, -18], [24, -18], [-24, 18], [24, 18]].forEach(function (o) { place(pd.x + o[0], pd.z + o[1], pd.h, 'snow'); }); });
      })();
      /* Shipwrecks on the sea floor: broken hulls with sunken chests (loot table "wreck", Sapphire 3%) */
      (function () {
        var WR = mulberry(8123), n = 0, tries = 0, wr = [];
        while (n < 18 && tries++ < 40000) {
          var x = (WR() * 2 - 1) * (WZ.HALF - 150), z = (WR() * 2 - 1) * (WZ.HALF - 150); if (TR.biome(x, z) !== 'sea') continue;
          var g = TR.gh(x, z); if (g > -3 || g < -10) continue; if (TR.gh(x + 8, z) > -2.5 || TR.gh(x - 8, z) > -2.5 || TR.gh(x, z + 8) > -2.5 || TR.gh(x, z - 8) > -2.5) continue;
          if (wr.some(function (q) { return Math.hypot(q[0] - x, q[1] - z) < 120; })) continue;
          var wood = 0x5b3f27, wood2 = 0x6d4c30, a = WR() * 3; wr.push([x, z]); GYO = g - 0.3;
          wallSeg(x - 2.6, x + 2.6, z - 7, z + 7, 0, 0.5, wood); wallSeg(x - 2.6, x - 2.2, z - 7, z + 1, 0, 2.2, wood2); wallSeg(x + 2.2, x + 2.6, z - 7, z + 4, 0, 1.6, wood2); wallSeg(x - 2.6, x + 2.6, z - 7, z - 6.6, 0, 2.4, wood2);
          wallSeg(x - 0.2, x + 0.2, z - 1, z + 0.4, 0, 5.5, wood); put(walls, x + 0.4, 5.0, z + 0.5, 0.18, 0.18, 3.2, 0.3, 0x4a3320); put(walls, x - 1.4, 0.9, z + 4.5, 0.4, 1.2, 0.4, 0, wood2);
          GYO = 0; addCrate(x - 1.2, z - 3, true, WR, 1, g); W.crates[W.crates.length - 1].wreck = true; addCrate(x + 1.2, z + 2.5, true, WR, 1, g); W.crates[W.crates.length - 1].wreck = true; n++;
        }
        W.wrecks = wr;
      })();

      /* ---- Underground: a separate cave level far outside the map. Reached only through the mineshaft door. ---- */
      var dirtTex = canvasTex(128, 128, function (g, w, h) {
        var r = mulberry(31); g.fillStyle = '#6a4a2c'; g.fillRect(0, 0, w, h);
        var cols = ['#523720', '#7d5a36', '#3f2a17', '#8c6840', '#5f4126'];
        for (var q = 0; q < 900; q++) { g.fillStyle = cols[(r() * 5) | 0]; g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 6); }
        for (q = 0; q < 260; q++) { g.fillStyle = r() < 0.5 ? '#2c1d10' : '#a07a4c'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      });
      var ugWalls = inst(box1, lam(0xffffff, { map: dirtTex }), 12000, false, true); W.ugWalls = ugWalls;
      function uw(x0, x1, z0, z1, y0, y1, col) { put(ugWalls, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, col); addBox(x0, x1, y0, y1, z0, z1, false); }
      var N = 61, CS = 6, UH = 5, UX = 2700, UZ = -183, grid = [], i, j;
      for (i = 0; i < N; i++) grid.push(new Uint8Array(N));
      function op(a, b) { if (a > 0 && b > 0 && a < N - 1 && b < N - 1) grid[a][b] = 1; }
      var stack = [[1, 1]]; op(1, 1);
      while (stack.length) {
        var cur = stack[stack.length - 1], nbs = [];
        [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(function (dd) { var ni = cur[0] + dd[0], nj = cur[1] + dd[1]; if (ni > 0 && nj > 0 && ni < N - 1 && nj < N - 1 && !grid[ni][nj]) nbs.push(dd); });
        if (!nbs.length) { stack.pop(); continue; }
        var dd2 = nbs[(MR() * nbs.length) | 0]; op(cur[0] + dd2[0] / 2, cur[1] + dd2[1] / 2); op(cur[0] + dd2[0], cur[1] + dd2[1]); stack.push([cur[0] + dd2[0], cur[1] + dd2[1]]);
      }
      for (var br = 0; br < 160; br++) { var bi = 1 + ((MR() * 59) | 0), bj = 1 + ((MR() * 59) | 0); if ((bi + bj) % 2 === 1) op(bi, bj); }               /* loops */
      for (var rm = 0; rm < 34; rm++) { var ri = 3 + 2 * ((MR() * 28) | 0), rj = 3 + 2 * ((MR() * 28) | 0), rw = MR() < 0.5 ? 1 : 2; for (i = -rw; i <= rw; i++) for (j = -rw; j <= rw; j++) if (Math.abs(i) + Math.abs(j) < rw * 2 + 1) op(ri + i, rj + j); } /* irregular chambers */
      for (i = 1; i <= 3; i++) for (j = 1; j <= 3; j++) op(i, j);
      function cx(i) { return UX + (i + 0.5) * CS; } function cz(j) { return UZ + (j + 0.5) * CS; }
      var open = [];
      for (i = 1; i < N - 1; i++) for (j = 1; j < N - 1; j++) if (grid[i][j] && (i > 5 || j > 5)) open.push([cx(i), cz(j)]);
      var UC = [0xffffff, 0xe6d2bb, 0xcdb298, 0xf2dcc2];
      function bound(a, b) { if (grid[a][b]) return false; for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) { var na = a + u, nb2 = b + v; if (na >= 0 && nb2 >= 0 && na < N && nb2 < N && grid[na][nb2]) return true; } return false; }
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) if (bound(i, j)) uw(UX + i * CS, UX + (i + 1) * CS, UZ + j * CS, UZ + (j + 1) * CS, 0, UH, UC[(MR() * 4) | 0]);
      for (var tx = 0; tx < 37; tx++) for (var tz = 0; tz < 37; tz++) put(ugWalls, UX + tx * 10 + 5, UH + 0.5, UZ + tz * 10 + 5, 10, 1, 10, 0, UC[(MR() * 4) | 0]);
      var ugFloor = new THREE.Mesh(new THREE.PlaneGeometry(N * CS + 8, N * CS + 8), new THREE.MeshLambertMaterial({ color: 0xcdb8a0, map: (function () { var t = dirtTex.clone(); t.needsUpdate = true; t.repeat.set(60, 60); return t; })() })); ugFloor.rotation.x = -Math.PI / 2; ugFloor.position.set(UX + N * CS / 2, 0.03, UZ + N * CS / 2); ugFloor.visible = false; scene.add(ugFloor);
      put(walls, cx(1), 1.2, cz(1), 1.4, 2.4, 0.5, 0, 0xc9a23a); /* exit marker */
      W.ug = { x0: UX, z0: UZ, x1: UX + N * CS, z1: UZ + N * CS, spawn: { x: cx(3), z: cz(3) }, exit: { x: cx(1), z: cz(1) }, open: open, floor: ugFloor };
    })();
    var roofMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    fbMap.forEach(function (bk) {
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bk.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(bk.norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(bk.uv, 2)); g.setIndex(bk.idx); var m = new THREE.Mesh(g, FACADE_MATS[bk.fi]); m.frustumCulled = false; chunkAt(bk.cx, bk.cz).g.add(m);
    });
    rbMap.forEach(function (bk) {
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bk.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(bk.norm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(bk.col, 3)); g.setIndex(bk.idx); var m = new THREE.Mesh(g, roofMat); m.frustumCulled = false; chunkAt(bk.cx, bk.cz).g.add(m);
    });


    /* Bake static instanced meshes into 20 m chunks so the renderer can skip whole chunks */
    function bake(m) {
      var n = m.count, a = m.instanceMatrix.array, ca = m.instanceColor ? m.instanceColor.array : null, bs = new Map(), i;
      for (i = 0; i < n; i++) { var cx = Math.floor(a[i * 16 + 12] / CH), cz = Math.floor(a[i * 16 + 14] / CH), k = ck(cx, cz), l = bs.get(k); if (!l) { l = { cx: cx, cz: cz, ids: [] }; bs.set(k, l); } l.ids.push(i); }
      bs.forEach(function (l) {
        var im = new THREE.InstancedMesh(m.geometry, m.material, l.ids.length); im.frustumCulled = false;
        if (ca) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(l.ids.length * 3), 3);
        for (var j = 0; j < l.ids.length; j++) { var s0 = l.ids[j] * 16; for (var q = 0; q < 16; q++) im.instanceMatrix.array[j * 16 + q] = a[s0 + q]; if (ca) for (var u = 0; u < 3; u++) im.instanceColor.array[j * 3 + u] = ca[l.ids[j] * 3 + u]; }
        chunkAt(l.cx, l.cz).g.add(im);
      });
      scene.remove(m); m.visible = false;
    }
    [walls, winM, dashes, W.ugWalls].forEach(bake);
    /* chunk visibility: render distance (in chunks), optional 180-degree back culling */
    var cvT = 0;
    W.updateChunks = function (px, pz, fx, fz, rd, cull) {
      var lim = rd >= 9999 ? 1e9 : (rd + 0.9) * CH, fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl; var shown = 0;
      W.chunks.forEach(function (c) {
        var dx = (c.cx + 0.5) * CH - px, dz = (c.cz + 0.5) * CH - pz, d = Math.hypot(dx, dz), v = d < lim;
        if (v && cull && (dx * fx + dz * fz) < -CH) v = false; /* 180-degree back culling with 1 chunk of slack */
        if (v !== c.vis) { c.vis = v; c.g.visible = v; }
        if (v) shown++;
      });
      W.shownChunks = shown;
    };
    var staticCrateCount = W.crates.length;
    function spawnNature(seed, keep) {
      W.seed = seed; var Rn = mulberry(seed), tries = 0, n = 0;
      function free(x, z, m) { return !(keep && W.hit(x - m, x + m, 0, 3, z - m, z + m)); }
      var cactN = 0;
      while (n < 3200 && tries++ < 260000) {
        var tx = rr(-HALF + 4, HALF - 4, Rn), tz = rr(-HALF + 4, HALF - 4, Rn), edge = Math.max(Math.abs(tx), Math.abs(tz)), bm = biomeOf(tx, tz), z0n = zoneOf(tx, tz), beach = false;
        var pr = beach ? 0.3 : bm === 'jungle' ? 0.6 : bm === 'snow' ? 0.22 : bm === 'desert' ? 0.07 : (z0n === 'out' ? 0.3 : z0n === 'mid' ? 0.1 : 0.03);
        if (Rn() > pr || onRoad(tx, tz, 1.5) || inOcc(tx, tz, 2) || !free(tx, tz, 1)) continue;
        var kd = beach ? 'palm' : bm === 'jungle' ? 'jungle' : bm === 'snow' ? 'snow' : bm === 'desert' ? 'cactus' : 'plain';
        if (kd === 'cactus') cactN++;
        addTree(tx, tz, Rn, bm, kd); n++;
      }
      /* sand mounds in the desert: same count as cactus */
      var sn = 0; tries = 0;
      while (sn < cactN && tries++ < 80000) {
        var sx = rr(500 + 6, HALF - 70, Rn), sz2 = rr(-500 + 6, HALF - 70, Rn);
        if (onRoad(sx, sz2, 2) || inOcc(sx, sz2, 2.5) || !free(sx, sz2, 1.5)) continue; addRock(sx, sz2, 'sand', Rn); sn++;
      }
      /* bushes: plain (city biome, outside buildings) and jungle */
      var bu = 0; tries = 0;
      while (bu < 700 && tries++ < 90000) {
        var bx = rr(-HALF + 8, HALF - 8, Rn), bz = rr(-HALF + 8, HALF - 8, Rn), bb = biomeOf(bx, bz), bzn = zoneOf(bx, bz);
        if (bb !== 'city' && bb !== 'jungle') continue; if (bb === 'city' && (bzn === 'down' || Rn() < 0.35)) continue;
        if (Math.max(Math.abs(bx), Math.abs(bz)) > HALF - 60 || onRoad(bx, bz, 1) || inOcc(bx, bz, 1.5) || !free(bx, bz, 1)) continue;
        addPile(bx, bz, 0, Rn); W.piles[W.piles.length - 1].bush = bb; W.piles[W.piles.length - 1].tier = 1; bu++;
      }
      /* ---- ring (outside the 2000x2000 core): biome trees, mountain resources, rocks, bushes, beach clay, all placed on the terrain height ---- */
      (function () {
        var TRn = WZ.TERRAIN, M = MAPH - 40, rn = 0, rt = 0, cactR = 0, bm, gy;
        function ok(x, z, m) { return Math.max(Math.abs(x), Math.abs(z)) > HALF + 30 && !W.onMtRoad(x, z) && !inOcc(x, z, 2.5) && free(x, z, m || 1.2); }
        while (rn < 2500 && rt++ < 500000) {
          var x = rr(-M, M, Rn), z = rr(-M, M, Rn); if (Math.max(Math.abs(x), Math.abs(z)) <= HALF + 30) continue;
          bm = TRn.biome(x, z); if (bm === 'sea' || bm === 'mountain' || bm === 'peak') continue;
          var pr = bm === 'jungle' ? 0.5 : bm === 'snow' ? 0.28 : bm === 'desert' ? 0.06 : bm === 'beach' ? 0.1 : 0.2; if (Rn() > pr || !ok(x, z, 1)) continue;
          gy = TRn.gh(x, z); if (gy < 0.2) continue;
          var kd = bm === 'jungle' ? 'jungle' : bm === 'snow' ? 'snow' : bm === 'desert' ? 'cactus' : bm === 'beach' ? 'palm' : 'plain'; if (kd === 'cactus') cactR++;
          addTree(x, z, Rn, bm, kd, gy); rn++;
        }
        /* mountains / high peaks: Pine 50, Stone 35, Copper 5, Iron 3, Permafrost 2, Diamond/Ruby/Emerald/Amethyst/Sapphire 1 each */
        var mn = 0; rt = 0;
        while (mn < 3200 && rt++ < 600000) {
          var mx = rr(-M, M, Rn), mz = rr(-M, M, Rn); bm = TRn.biome(mx, mz); if ((bm !== 'mountain' && bm !== 'peak') || !ok(mx, mz, 1.2)) continue;
          gy = TRn.gh(mx, mz); var q = Rn() * 100;
          if (q < 50) addTree(mx, mz, Rn, 'snow', 'snow', gy);
          else { var kk = q < 85 ? 'stone' : q < 90 ? 'copper' : q < 93 ? 'iron' : q < 95 ? 'permafrost' : q < 96 ? 'diamond' : q < 97 ? 'ruby' : q < 98 ? 'emerald' : q < 99 ? 'amethyst' : 'sapphire'; addRock(mx, mz, kk, Rn, gy); }
          mn++;
        }
        /* sand mounds (as many as ring cacti), surface rocks, bushes, clay on the shore */
        var sm = 0; rt = 0;
        while (sm < cactR && rt++ < 80000) { var sx = rr(-M, M, Rn), sz = rr(-M, M, Rn); if (TRn.biome(sx, sz) !== 'desert' || !ok(sx, sz, 1.5)) continue; addRock(sx, sz, 'sand', Rn, TRn.gh(sx, sz)); sm++; }
        var rk = 0; rt = 0;
        while (rk < 900 && rt++ < 80000) { var rx = rr(-M, M, Rn), rz = rr(-M, M, Rn); bm = TRn.biome(rx, rz); if (bm === 'sea' || bm === 'mountain' || bm === 'peak' || !ok(rx, rz, 1.5)) continue; addRock(rx, rz, rollSurfaceOre(Rn), Rn, TRn.gh(rx, rz)); rk++; }
        var bs = 0; rt = 0;
        while (bs < 500 && rt++ < 90000) { var bx = rr(-M, M, Rn), bz = rr(-M, M, Rn); bm = TRn.biome(bx, bz); if ((bm !== 'city' && bm !== 'jungle') || !ok(bx, bz, 1)) continue; addPile(bx, bz, 0, Rn, TRn.gh(bx, bz)); var bp = W.piles[W.piles.length - 1]; bp.bush = bm === 'jungle' ? 'jungle' : 'city'; bp.tier = 1; bs++; }
        var cl = 0; rt = 0;
        while (cl < 70 && rt++ < 60000) { var cx = rr(-M, M, Rn), cz = rr(-M, M, Rn); if (TRn.biome(cx, cz) !== 'beach' || !ok(cx, cz, 1.5)) continue; var cg = TRn.gh(cx, cz); if (cg < 0 || cg > 1.2) continue; addRock(cx, cz, 'clay', Rn, cg); cl++; }
      })();
      var rocks = 0; tries = 0;
      while (rocks < 1500 && tries++ < 60000) {
        var rx = rr(-HALF + 6, HALF - 6, Rn), rz = rr(-HALF + 6, HALF - 6, Rn), rz0 = zoneOf(rx, rz);
        if ((rz0 === 'down' && Rn() < 0.8) || onRoad(rx, rz, 2) || inOcc(rx, rz, 2.5) || !free(rx, rz, 1.5)) continue;
        addRock(rx, rz, rollSurfaceOre(Rn), Rn); rocks++;
      }
      W.waters.forEach(function (w) { for (var ci = 0, ct = 0; ci < 6 && ct++ < 40;) { var side = (Rn() * 4) | 0, cx = side < 2 ? rr(w.x0, w.x1, Rn) : (side === 2 ? w.x0 - 2.2 : w.x1 + 2.2), cz = side < 2 ? (side === 0 ? w.z0 - 2.2 : w.z1 + 2.2) : rr(w.z0, w.z1, Rn); if (Math.abs(cx) > HALF - 8 || Math.abs(cz) > HALF - 8 || !free(cx, cz, 1.2)) continue; addRock(cx, cz, 'clay', Rn); ci++; } });
      /* underground ore field: 260 spots on the cave floor */
      var ugn = 0, ugt = 0, uo = W.ug.open;
      while (ugn < 260 && ugt++ < 4000) { var oc = uo[(Rn() * uo.length) | 0], ox = oc[0] + rr(-1.4, 1.4, Rn), oz = oc[1] + rr(-1.4, 1.4, Rn); if (W.hit(ox - 1.8, ox + 1.8, 0.1, 1.8, oz - 1.8, oz + 1.8)) continue; addRock(ox, oz, rollUgOre(Rn), Rn); ugn++; }
      var piles = 0; tries = 0;
      while (piles < 3600 && tries++ < 120000) {
        var side = Rn() < 0.5, line = pick(ROADS, Rn), off = (Rn() < 0.5 ? -1 : 1) * rr(RW / 2 + 0.8, RW / 2 + 3.2, Rn), along = rr(-HALF + 6, HALF - 6, Rn);
        if (Rn() < 0.18) off = rr(-RW / 2 + 1, RW / 2 - 1, Rn);
        var px = side ? line + off : along, pz = side ? along : line + off;
        if (inOcc(px, pz, 0.5) || Math.max(Math.abs(px), Math.abs(pz)) > HALF - 4 || !free(px, pz, 1)) continue;
        var zn = zoneOf(px, pz); addPile(px, pz, zn === 'down' ? 2 : zn === 'mid' ? (Rn() < 0.45 ? 2 : 1) : 1, Rn); piles++;
      }
      /* indoor loot: tables only inside buildings; crates inside buildings and near them; trash anywhere */
      W.floors.forEach(function (f) {
        function spot() { for (var a2 = 0; a2 < 16; a2++) { var x = rr(f.x0 + 1, f.x1 - 1, Rn), z = rr(f.z0 + 1, f.z1 - 1, Rn); if (!f.av.some(function (r) { return x > r[0] - 1 && x < r[1] + 1 && z > r[2] - 1 && z < r[3] + 1; })) return [x, z]; } return null; }
        var ct = f.zone === 'down' ? (f.k >= 4 ? 3 : 2) : (f.zone === 'mid' && Rn() < 0.5 ? 2 : 1), s1 = spot(), s2 = spot(), s3 = spot();
        if (s1 && Rn() < 0.75) addCrate(s1[0], s1[1], true, Rn, ct, f.y);
        if (s2 && Rn() < 0.8) addPile(s2[0], s2[1], f.zone === 'down' ? 2 : 1, Rn, f.y);
        if (s3 && Rn() < 0.22) addPile(s3[0], s3[1], 4, Rn, f.y);
      });
      W.indoor.forEach(function (q, qi) { if (Rn() < 0.6) addPile(q.x, q.z, q.zone === 'down' ? 2 : 1, Rn, q.y); else if (Rn() < 0.45) addPile(q.x, q.z, 4, Rn, q.y); });
      var cr = 0; tries = 0;
      while (cr < 600 && tries++ < 40000) {
        var qx = rr(-HALF + 10, HALF - 10, Rn), qz = rr(-HALF + 10, HALF - 10, Rn), czn = zoneOf(qx, qz);
        if (onRoad(qx, qz, 1) || inOcc(qx, qz, 1) || !inOcc(qx, qz, 16) || (czn === 'down' && Rn() < 0.65) || !free(qx, qz, 1)) continue;
        addCrate(qx, qz, true, Rn, czn === 'down' ? 2 : (czn === 'mid' && Rn() < 0.5 ? 2 : 1)); cr++;
      }
      var cn = 0; tries = 0;
      while (cn < 800 && tries++ < 20000) {
        var vl = pick(ROADS, Rn), alongV = rr(-HALF + 10, HALF - 10, Rn), lane = (Rn() < 0.5 ? -1 : 1) * rr(1.2, 3, Rn), horiz = Rn() < 0.5;
        var cxx = horiz ? alongV : vl + lane, czz = horiz ? vl + lane : alongV, lenX = horiz ? 4.4 : 1.9, lenZ = horiz ? 1.9 : 4.4;
        if (W.hit(cxx - lenX / 2 - 0.5, cxx + lenX / 2 + 0.5, 0.1, 1.8, czz - lenZ / 2 - 0.5, czz + lenZ / 2 + 0.5)) continue;
        addCar(cxx, czz, horiz, Rn); cn++;
      }
      var tk = 0; tries = 0; /* trucks: bigger loot vehicles */
      while (tk < 120 && tries++ < 20000) {
        var tvl = pick(ROADS, Rn), talV = rr(-HALF + 12, HALF - 12, Rn), tlane = (Rn() < 0.5 ? -1 : 1) * rr(1.8, 2.6, Rn), thz = Rn() < 0.5;
        var txx = thz ? talV : tvl + tlane, tzz = thz ? tvl + tlane : talV, tlx = thz ? 7.6 : 2.7, tlz = thz ? 2.7 : 7.6;
        if (W.hit(txx - tlx / 2 - 0.5, txx + tlx / 2 + 0.5, 0.1, 3.2, tzz - tlz / 2 - 0.5, tzz + tlz / 2 + 0.5)) continue;
        addCar(txx, tzz, thz, Rn, true); tk++;
      }
    }
    spawnNature(initSeed != null ? initSeed : rndSeed(), false);
    function stoneBT(base, seed) { return canvasTex(64, 64, function (g, w, h) { var r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, w, h); for (var i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.1)'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4); } }); }
    function brickBT(base, mortar, seed) { return canvasTex(64, 64, function (g, w, h) { var r = mulberry(seed); g.fillStyle = mortar; g.fillRect(0, 0, w, h); for (var y = 0; y < 4; y++) for (var x = -1; x < 3; x++) { var ox = (y % 2) * 16; g.fillStyle = base; g.fillRect(x * 32 + ox + 1, y * 16 + 1, 30, 14); for (var k = 0; k < 6; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.1)'; g.fillRect(x * 32 + ox + 2 + r() * 24, y * 16 + 2 + r() * 10, 3, 2); } } }); }
    var BLKTEX = { 33: stoneBT('#b98a6a', 1), 34: stoneBT('#a2a6a9', 2), 35: stoneBT('#cfcfca', 3), 36: stoneBT('#f1f1ec', 4), 37: brickBT('#8d9198', '#5c5f64', 5), 38: brickBT('#a8452f', '#cfc7bb', 6), 39: brickBT('#b98a6a', '#6a5040', 7), 40: brickBT('#a2a6a9', '#5f6264', 8), 41: brickBT('#cfcfca', '#7d7d7a', 9), 42: brickBT('#f1f1ec', '#a8a8a2', 10) };

    var VM = {
      1: inst(box1, lam(0xffffff, { map: plankTex }), 2600, true, false),
      2: inst(box1, lam(0xffffff, { map: stoneTex }), 2600, true, false),
      3: inst(box1, lam(0xffffff, { map: furnTex }), 150, true, false),
      4: inst(box1, lam(0xffffff, { map: bedTex }), 200, true, false),
      5: inst(box1, lam(0xffffff, { map: couchTex }), 200, true, false),
      6: inst(box1, lam(0xffffff, { map: sinkTex }), 120, true, false),
      7: inst(box1, lam(0xffffff, { map: campTex }), 120, true, false),
      8: inst(box1, lam(0xffffff, { map: anvilTex }), 80, true, false),
      9: inst(box1, lam(0xffffff, { map: compTex }), 80, true, false),
      10: inst(box1, lam(0xffffff, { map: planksTex }), 2600, true, false),
      11: inst(box1, lam(0xffffff, { map: sawTex }), 80, true, false),
      12: inst(box1, lam(0xffffff, { map: tbenchTex }), 80, true, false),
      13: inst(box1, lam(0xffffff, { map: cannonTex('#6b5a3a', '#4a3a22') }), 120, true, false),
      14: inst(box1, lam(0xffffff, { map: cannonTex('#4b535c', '#2a3036') }), 120, true, false),
      15: inst(box1, lam(0xffffff, { map: cannonTex('#2f4a3a', '#d28a2a') }), 60, true, false),
      16: inst(box1, lam(0xffffff, { map: glyphTex('#6e6a60', '⚙️', 'MILLING') }), 300, true, false),
      17: inst(box1, lam(0xffffff, { map: glyphTex('#7a3b2a', '💣', 'BOMB') }), 200, true, false),
      18: inst(box1, lam(0xffffff, { map: glyphTex('#8a5a3a', '🏺', 'KILN') }), 300, true, false),
      19: inst(box1, lam(0xffffff, { map: glyphTex('#7a6040', '🛠️', 'CRAFT') }), 300, true, false),
      20: inst(box1, lam(0xffffff, { map: glyphTex('#5a4a70', '💍', 'WORK') }), 200, true, false),
      21: inst(box1, lam(0xffffff, { map: glyphTex('#a87a44', '📦', '') }), 200, true, false),
      22: inst(box1, lam(0xffffff, { map: glyphTex('#7c8088', '📦', 'IRON') }), 200, true, false),
      23: inst(box1, lam(0xffffff, { map: glyphTex('#585d66', '🗄️', 'IRON') }), 200, true, false),
      24: inst(box1, lam(0xffffff, { map: glyphTex('#b0693a', '📦', 'COPPER') }), 200, true, false),
      25: inst(box1, lam(0xffffff, { map: glyphTex('#c4763a', '🗃️', 'COPPER') }), 200, true, false),
      26: inst(box1, (W.glassMat = new THREE.MeshLambertMaterial({ map: glassTex, transparent: true, opacity: 0.55, depthWrite: false })), 600, true, false),
      27: inst(box1, lam(0xffffff, { map: cactBlockTex }), 600, true, false),
      28: inst(box1, lam(0xffffff, { map: glyphTex('#b02a2a', '🧨', 'TNT') }), 200, true, false),
      29: inst(box1, lam(0xffffff, { map: glyphTex('#5d6168', '🗜️', 'PRESS') }), 200, true, false),
      30: inst(box1, lam(0xffffff, { map: glyphTex('#4c5a6a', '🚗', 'CASING') }), 200, true, false),
      31: inst(box1, lam(0xffffff, { map: glyphTex('#6a4a2a', '🪤', 'TRAP') }), 200, true, false),
      32: inst(box1, lam(0xffffff, { map: glyphTex('#8a8a82', '🧱', 'MASON') }), 200, true, false),
      33: inst(box1, lam(0xffffff, { map: BLKTEX[33] }), 1500, true, false),
      34: inst(box1, lam(0xffffff, { map: BLKTEX[34] }), 1500, true, false),
      35: inst(box1, lam(0xffffff, { map: BLKTEX[35] }), 1500, true, false),
      36: inst(box1, lam(0xffffff, { map: BLKTEX[36] }), 1500, true, false),
      37: inst(box1, lam(0xffffff, { map: BLKTEX[37] }), 1500, true, false),
      38: inst(box1, lam(0xffffff, { map: BLKTEX[38] }), 1500, true, false),
      39: inst(box1, lam(0xffffff, { map: BLKTEX[39] }), 1500, true, false),
      40: inst(box1, lam(0xffffff, { map: BLKTEX[40] }), 1500, true, false),
      41: inst(box1, lam(0xffffff, { map: BLKTEX[41] }), 1500, true, false),
      49: inst(box1, lam(0xffffff, { map: glyphTex('#3a5a6a', '🧪', 'LIQUID') }), 200, true, false),
      50: inst(box1, lam(0xffffff, { map: glyphTex('#7a4a6a', '🧵', 'SEWING') }), 200, true, false),
      51: inst(box1, lam(0xffffff, { map: glyphTex('#8d8f92', '🗿', 'GOD') }), 200, true, false),
      44: inst(boxLow, lam(0xffffff, { map: glyphTex('#8a6a3a', '🌵', '') }), 600, true, false),
      45: inst(boxLow, lam(0xffffff, { map: glyphTex('#6a8a3a', '🌴', '') }), 600, true, false),
      46: inst(boxLow, lam(0xffffff, { map: glyphTex('#7a7f86', '➰', '') }), 600, true, false),
      47: inst(boxLow, lam(0xffffff, { map: glyphTex('#3f8a3a', '🌿', '') }), 600, true, false),
      48: inst(boxLow, lam(0xffffff, { map: glyphTex('#5a8ac0', '➰', '') }), 600, true, false),
      43: inst(box1, lam(0xffffff, { map: glyphTex('#4a3a3a', '🔥', 'BLAST') }), 200, true, false),
      42: inst(box1, lam(0xffffff, { map: BLKTEX[42] }), 1500, true, false)
    };
    var VTYPES = []; function mergeBoxes(parts) {
      var pos = [], nor = [], col = [], idx = [], off = 0;
      parts.forEach(function (p) { var g = new THREE.BoxGeometry(p[0], p[1], p[2]); g.translate(p[3], p[4], p[5]); var c = new THREE.Color(p[6]), pa = g.attributes.position, na = g.attributes.normal, ia = g.index.array, i;
        for (i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); col.push(c.r, c.g, c.b); } for (i = 0; i < ia.length; i++) idx.push(ia[i] + off); off += pa.count; });
      var G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); G.setIndex(idx); return G;
    }
    var FWC = [[0x8a5a30, 0x5e3b1c, 0xa84c3c], [0xd9bf85, 0xa88b52, 0x4f9b7a], [0x9a6b3f, 0x6a4624, 0x4a6fa5]], BULB = 0xfff4b8, PAPER = 0xf4e6b4;
    function furnParts(kind, w, d, f) {
      var o = [], sx, sz;
      if (kind === 'chair') { o.push([0.8, 0.1, 0.8, 0, -0.05, 0, w], [0.8, 0.5, 0.08, 0, 0.25, -0.36, w]); for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) o.push([0.1, 0.45, 0.1, sx * 0.35, -0.275, sz * 0.35, d]); }
      else if (kind === 'table') { o.push([1, 0.1, 0.9, 0, 0.4, 0, w]); for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) o.push([0.1, 0.9, 0.1, sx * 0.42, -0.05, sz * 0.38, d]); }
      else if (kind === 'sofa' || kind === 'couch') { o.push([1, 0.35, 0.9, 0, -0.325, 0, d], [0.96, 0.18, 0.8, 0, -0.06, 0.03, f], [1, 0.55, 0.2, 0, 0.1, -0.36, f]); if (kind === 'couch') o.push([0.14, 0.42, 0.9, -0.43, -0.1, 0, f], [0.14, 0.42, 0.9, 0.43, -0.1, 0, f]); }
      else if (kind === 'standlamp') o.push([0.5, 0.06, 0.5, 0, -0.47, 0, d], [0.06, 0.8, 0.06, 0, -0.04, 0, w], [0.36, 0.24, 0.36, 0, 0.36, 0, PAPER], [0.12, 0.12, 0.12, 0, 0.26, 0, BULB]);
      else if (kind === 'hanglamp') o.push([0.03, 0.5, 0.03, 0, 0.25, 0, d], [0.5, 0.18, 0.5, 0, -0.04, 0, f], [0.2, 0.2, 0.2, 0, -0.2, 0, BULB]);
      else if (kind === 'bed') o.push([1, 0.3, 1, 0, -0.35, 0, w], [0.94, 0.18, 0.94, 0, -0.1, 0, 0xeadfce], [0.4, 0.1, 0.25, 0, 0.0, -0.3, 0xffffff], [0.94, 0.05, 0.5, 0, 0.0, 0.2, f]);
      return o;
    }
    var FKIND = ['chair', 'table', 'sofa', 'couch', 'standlamp', 'hanglamp'];
    for (var vt0 = 1; vt0 <= 71; vt0++) VTYPES.push(vt0);
    for (var fi = 52; fi <= 71; fi++) { var fk = fi >= 70 ? 'bed' : FKIND[Math.floor((fi - 52) / 3)], fw = FWC[fi >= 70 ? fi - 69 : (fi - 52) % 3]; VM[fi] = inst(mergeBoxes(furnParts(fk, fw[0], fw[1], fw[2])), lam(0xffffff, { vertexColors: true }), 200, true, false); }
    W.VSIZE = { 70: [2, 1, 1], 71: [2, 1, 1], 55: [2, 1, 1], 56: [2, 1, 1], 57: [2, 1, 1], 58: [2, 1, 1], 59: [2, 1, 1], 60: [2, 1, 1], 51: [1, 3, 1], 49: [3, 1, 2], 50: [3, 2, 2], 43: [1, 1, 2], 29: [2, 1, 2], 30: [3, 1, 2], 31: [2, 1, 2], 32: [3, 1, 2], 3: [1, 1, 2], 4: [2, 1, 1], 5: [2, 1, 1], 6: [1, 1, 2], 7: [2, 2, 2], 9: [3, 1, 2], 11: [3, 1, 2], 16: [3, 2, 2], 17: [2, 1, 2], 18: [2, 2, 3], 19: [3, 1, 2], 20: [2, 1, 2], 21: [2, 1, 1], 22: [2, 1, 1], 23: [2, 1, 1], 24: [2, 1, 1], 25: [2, 1, 1] };
    W.HPT = { 52: 50, 53: 50, 54: 50, 55: 50, 56: 50, 57: 50, 58: 50, 59: 50, 60: 50, 61: 50, 62: 50, 63: 50, 64: 50, 65: 50, 66: 50, 67: 50, 68: 50, 69: 50, 70: 55, 71: 55, 1: 30, 2: 90, 3: 80, 4: 50, 5: 45, 6: 60, 7: 40, 8: 120, 9: 70, 10: 36, 11: 90, 12: 80, 13: 150, 14: 275, 15: 500, 16: 90, 17: 90, 18: 100, 19: 90, 20: 90, 21: 80, 22: 150, 23: 285, 24: 120, 25: 185, 26: 20, 27: 24, 28: 20, 29: 90, 30: 100, 31: 90, 32: 100, 33: 75, 34: 75, 35: 75, 36: 75, 37: 100, 38: 100, 39: 90, 40: 90, 41: 90, 42: 90, 43: 120, 44: 40, 45: 60, 46: 200, 47: 25, 48: 400, 49: 100, 50: 90 };
    var vkeys = {}, vcount = 0; VTYPES.forEach(function (t) { vkeys[t] = []; }); W.MAX_VOX = 2600;
    W.voxCount = function () { return vcount; };
    W.getVox = function (x, y, z) { return vox.get(vk(x, y, z)) || null; };
    W.setVox = function (x, y, z, t, hp, part, sz) {
      if (y < 0 || y >= VMAX || Math.abs(x) > MAPH + 2 || Math.abs(z) > MAPH + 2) return false;
      var k = vk(x, y, z); if (vox.has(k)) return false;
      var arr = vkeys[t]; if (!arr || arr.length >= VM[t].instanceMatrix.count) return false;
      var idx = arr.length, rec = { t: t, hp: hp, idx: idx }; arr.push([x, y, z]); vox.set(k, rec); if (part != null) rec.anc = part;
      put(VM[t], x + 0.5, y + 0.5, z + 0.5, 1, 1, 1, 0, null, idx); VM[t].count = arr.length; vcount++;
      if (t >= 3 && t !== 10 && part == null) rec.ent = addBlockEnt(x, y, z, t, sz);
      return true;
    };
    /* multi-cell blocks: all cells share the anchor's hp; rot swaps footprint */
    W.canPlaceBig = function (x, y, z, t, rot) {
      var sz = W.VSIZE[t] || [1, 1, 1], w = rot ? sz[1] : sz[0], d = rot ? sz[0] : sz[1], h = sz[2], out = [];
      for (var dx = 0; dx < w; dx++) for (var dz = 0; dz < d; dz++) for (var dy = 0; dy < h; dy++) {
        var cx = x + dx, cy = y + dy, cz = z + dz; if (cy >= VMAX || vox.has(vk(cx, cy, cz)) || Math.abs(cx) > MAPH + 2 || Math.abs(cz) > MAPH + 2) return null;
        if (!(dx === 0 && dy === 0 && dz === 0) && W.hit(cx + 0.02, cx + 0.98, cy + 0.02, cy + 0.98, cz + 0.02, cz + 0.98)) return null;
        out.push([cx, cy, cz]);
      }
      return out;
    };
    W.setBig = function (x, y, z, t, hp, rot) {
      var sz = W.VSIZE[t]; if (!sz) return W.setVox(x, y, z, t, hp);
      var cells = W.canPlaceBig(x, y, z, t, rot); if (!cells) return false;
      var w = rot ? sz[1] : sz[0], d = rot ? sz[0] : sz[1], h = sz[2], ak = vk(x, y, z);
      if (!W.setVox(x, y, z, t, hp, null, { w: w, d: d, h: h })) return false;
      var rec = vox.get(ak); rec.cells = [ak]; rec.rot = rot ? 1 : 0;
      for (var i = 1; i < cells.length; i++) { var c = cells[i]; if (W.setVox(c[0], c[1], c[2], t, hp, ak)) rec.cells.push(vk(c[0], c[1], c[2])); }
      return true;
    };
    W.getVox = function (x, y, z) { var r = vox.get(vk(x, y, z)); if (r && r.anc != null) return vox.get(r.anc) || null; return r || null; };
    function rmCell(k) {
      var v = vox.get(k); if (!v) return; var arr = vkeys[v.t], last = arr.pop(), m = VM[v.t];
      if (v.idx !== arr.length) { arr[v.idx] = last; vox.get(vk(last[0], last[1], last[2])).idx = v.idx; put(m, last[0] + 0.5, last[1] + 0.5, last[2] + 0.5, 1, 1, 1, 0, null, v.idx); }
      m.count = arr.length; m.instanceMatrix.needsUpdate = true; vox.delete(k); vcount--;
    }
    W.delVox = function (x, y, z) {
      var k = vk(x, y, z), v = vox.get(k); if (!v) return null;
      if (v.anc != null) { k = v.anc; v = vox.get(k); if (!v) return null; }
      var ent = v.ent, cells = v.cells || [k]; cells.slice().forEach(rmCell);
      if (v.t >= 3 && v.t !== 10 && ent) ent.alive = false;
      return v;
    };
    W.voxList = function () {
      var out = [];
      vox.forEach(function (v) {
        if (v.anc != null) return;
        var a = vkeys[v.t][v.idx], p = (((a[0] + 4096) * 8192 + (a[2] + 4096)) * 64 + a[1]) * 128 + (v.t - 1);
        if (v.cells) out.push([p, Math.max(1, Math.round(v.hp)), v.rot || 0]);
        else out.push(Math.round(v.hp) < W.HPT[v.t] ? [p, Math.max(1, Math.round(v.hp))] : p);
      });
      return out;
    };
    W.voxLoad = function (list, ver) {
      if (!Array.isArray(list)) return; var v5 = (ver || 1) >= 5, v4 = (ver || 1) >= 4, v2 = (ver || 1) >= 3;
      list.forEach(function (en) {
        var n = Array.isArray(en) ? en[0] : en, hp = Array.isArray(en) ? en[1] : null, rot = Array.isArray(en) && en.length > 2 ? en[2] : null, t, y, r, z, x;
        if (!v2) return;
        if (v5) { t = (n % 128) + 1; r = Math.floor(n / 128); y = r % 64; r = Math.floor(r / 64); z = (r % 8192) - 4096; x = Math.floor(r / 8192) - 4096; }
        else if (v4) { t = (n % 32) + 1; y = Math.floor(n / 32) % 64; r = Math.floor(n / 2048); z = (r % 2048) - 1024; x = Math.floor(r / 2048) - 1024; }
        else { t = (n % 16) + 1; y = Math.floor(n / 16) % 64; r = Math.floor(n / 1024); z = (r % 2048) - 1024; x = Math.floor(r / 2048) - 1024; }
        if (t >= 1 && t <= 127 && VM[t]) { if (rot != null) W.setBig(x, y, z, t, hp != null ? hp : W.HPT[t], rot); else W.setVox(x, y, z, t, hp != null ? hp : W.HPT[t]); }
      });
    };
    W.resetWorld = function (newSeed, keepBuild) {
      if (!keepBuild) {
        vox.clear(); VTYPES.forEach(function (t) { vkeys[t].length = 0; VM[t].count = 0; VM[t].instanceMatrix.needsUpdate = true; });
        vcount = 0; W.bents.forEach(function (e) { e.alive = false; }); W.bents.length = 0; W.furn.length = 0; W.sinks.length = 0; W.camps.length = 0; W.anvils.length = 0; W.comps.length = 0; W.saws.length = 0; W.tbench.length = 0; W.turrets.length = 0; W.mills.length = W.bombs.length = W.kilns.length = W.crafts.length = W.works.length = W.seats.length = W.tables.length = W.lamps.length = 0; W.gods.length = W.liqs.length = W.sews.length = W.blasts.length = W.presses.length = W.casings.length = W.trapbs.length = W.masons.length = W.chests.length = 0;
      }
      sgrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn) l.splice(i, 1); });
      egrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn && l[i].vx == null) l.splice(i, 1); });
      W.ents = W.ents.filter(function (e) { return !e.dyn || e.vx != null; });
      W.trees.length = 0; W.rocks.length = 0; W.piles.length = 0; W.cars.length = 0; W.crates.length = staticCrateCount;
      for (var ci = 0; ci < staticCrateCount; ci++) { W.crates[ci].respawn = 0; W.setCrate(W.crates[ci], true); }
      TMESH.forEach(function (m) { m.count = 0; }); leafM.count = 0; leaf2M.count = 0; rockM.count = pileM.count = shineM.count = tableM.count = tlegM.count = carBody.count = carTop.count = carCab.count = carRoof.count = carFr.count = carRr.count = carWh.count = 0;
      crateM.count = lidM.count = staticCrateCount;
      spawnNature(newSeed != null ? newSeed : rndSeed(), !!keepBuild);
    };

    var skyColor = new THREE.Color(0x88b8de), fogColor = new THREE.Color(0x9bc4e6);
    scene.background = skyColor; scene.fog = new THREE.Fog(fogColor, 34, 220);
    var hemi = new THREE.HemisphereLight(0xf2f7ff, 0x625a48, 1.3); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff5e0, 1.25); sun.position.set(80, 90, 60); scene.add(sun); scene.add(sun.target); W.sun = sun; W.shadowsOn = false; W.sunDirty = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; var shc = sun.shadow.camera; shc.left = -95; shc.right = 95; shc.top = 95; shc.bottom = -95; shc.near = 20; shc.far = 520; shc.updateProjectionMatrix();

    var skyGrp = new THREE.Group(); scene.add(skyGrp);
    var sunMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff0b3, fog: false }));
    var moonMesh = new THREE.Mesh(new THREE.SphereGeometry(6.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xdce8ff, fog: false }));
    skyGrp.add(sunMesh); skyGrp.add(moonMesh);

    var starPos = [];
    for (var si = 0; si < 220; si++) { var th = R() * 6.283, ph = R() * 1.35 + 0.1; starPos.push(Math.cos(th) * Math.cos(ph) * 232, Math.sin(ph) * 232, Math.sin(th) * Math.cos(ph) * 232); }
    var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
    skyGrp.add(new THREE.Points(starGeo, starMat));

    var KEYS = [
      [0.0,  0x0c1324, 0x0f182c, 0x455b8a, 0x19202d, 0.62, 0x8fb4f0, 0.45],
      [5.2,  0x2b3454, 0x424463, 0x8084b0, 0x262834, 0.78, 0xffad75, 0.50],
      [6.8,  0x8ab8de, 0xd4ac8c, 0xffe4c4, 0x5c5343, 1.18, 0xffd094, 1.12],
      [12.0, 0x7cb6eb, 0x9ec6e8, 0xf2f7ff, 0x6a614e, 1.35, 0xfff6e4, 1.28],
      [16.2, 0x9ab3d6, 0xcca488, 0xffe3c0, 0x5d5143, 1.18, 0xffbe75, 1.10],
      [17.9, 0xd47148, 0xc77554, 0xffad7a, 0x4d3730, 0.96, 0xff7c3d, 0.95],
      [19.3, 0x161f38, 0x18213a, 0x495f8d, 0x1c222e, 0.65, 0x8fb4f0, 0.45],
      [24.0, 0x0c1324, 0x0f182c, 0x455b8a, 0x19202d, 0.62, 0x8fb4f0, 0.45]
    ];
    var cA = new THREE.Color(), cB = new THREE.Color();
    function lerpCol(out, hexA, hexB, f) { cA.setHex(hexA); cB.setHex(hexB); out.copy(cA).lerp(cB, f); }

    var ugMode = false;
    W.setUnderground = function (on) { ugMode = !!on; if (W.ug) W.ug.floor.visible = ugMode; skyGrp.visible = !ugMode; };
    W.updateSky = function (hour, px, pz) {
      if (ugMode) { skyColor.setHex(0x080706); fogColor.setHex(0x080706); scene.fog.color.copy(fogColor); hemi.color.setHex(0x9a8c78); hemi.groundColor.setHex(0x2a2520); hemi.intensity = 0.8; sun.intensity = 0; return; }
      var h = ((hour % 24) + 24) % 24, i = 0;
      while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
      var k0 = KEYS[i], k1 = KEYS[i + 1], f = (h - k0[0]) / (k1[0] - k0[0] || 1);
      lerpCol(skyColor, k0[1], k1[1], f); lerpCol(fogColor, k0[2], k1[2], f); scene.fog.color.copy(fogColor);
      lerpCol(hemi.color, k0[3], k1[3], f); lerpCol(hemi.groundColor, k0[4], k1[4], f); hemi.intensity = k0[5] + (k1[5] - k0[5]) * f;
      lerpCol(sun.color, k0[6], k1[6], f); sun.intensity = k0[7] + (k1[7] - k0[7]) * f;
      var ang = ((h - 6) / 24) * Math.PI * 2, sy = Math.sin(ang) * 215, sx = Math.cos(ang) * 215, sz = 45;
      skyGrp.position.set(px || 0, 0, pz || 0);
      sunMesh.position.set(sx, sy, sz); sunMesh.visible = sy > -20;
      moonMesh.position.set(-sx, -sy, -sz); moonMesh.visible = -sy > -20;
      var ox, oy, oz; if (sy >= -8) { ox = sx; oy = Math.max(15, sy); oz = sz; } else { ox = -sx; oy = Math.max(25, -sy); oz = -sz; }
      W.sunVec = { x: sx, y: sy, z: sz };
      if (!W.shadowsOn || W.sunDirty) { sun.position.set((px || 0) + ox, oy, (pz || 0) + oz); sun.target.position.set(px || 0, 0, pz || 0); sun.target.updateMatrixWorld(); W.sunDirty = false; } /* with the shadow map on, the light only moves when the map is refreshed (every 10 s) */
      starMat.opacity = h < 5.2 || h > 19.2 ? 0.9 : h < 6.4 ? (6.4 - h) / 1.2 * 0.9 : h > 18.0 ? (h - 18.0) / 1.2 * 0.9 : 0;
    };
    W.updateSky(7.0, -32, 32);
    return W;
  };
})(window.WZ);
/* AKHIR world.js */