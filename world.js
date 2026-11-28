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
    var CSD = (function () { try { return parseInt(sessionStorage.getItem('wz_cs'), 10) || 0; } catch (e) { return 0; } })(), TS = CSD ? (Math.abs(CSD) % 9973) + 1 : 0;
    var R = mulberry(CSD ? (20261116 ^ Math.imul(CSD, 0x9e3779b1)) | 0 : 20261116), ANISO = Math.min(16, maxAniso || 8);
    function rr(a, b, rng) { return a + (rng || R)() * (b - a); }
    function pick(a, rng) { var fn = rng || R; return a[(fn() * a.length) | 0]; }
    var W = { half: WZ.HALF, ents: [], trees: [], rocks: [], piles: [], crates: [], furn: [], sinks: [], camps: [], anvils: [], comps: [], saws: [], tbench: [], turrets: [], mills: [], bombs: [], kilns: [], crafts: [], works: [], presses: [], blasts: [], liqs: [], farms: [], wfilters: [], gunbs: [], cpots: [], shapers: [], tankers: [], odists: [], iforges: [], craft3s: [], cmolds: [], seatbs: [], asmbs: [], craft2s: [], bfurns: [], tanvils: [], tanks: [], pumps: [], ocars: [], distills: [], cworks: [], sengs: [], engs: [], drives: [], vbenchs: [], pools: [], sews: [], gods: [], seats: [], tables: [], lamps: [], cuttables: [], casings: [], trapbs: [], masons: [], chests: [], waters: [], bents: [], rects: [], roads: [], spawn: { x: -32, y: 0, z: 32 }, seed: 0 };
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

    W.isSh = function (t) { return (t >= 87 && t <= 125) || (t >= 141 && t <= 179); }; W.isNew = function (t) { return t >= 141 && t <= 179; };
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
        for (ix = ix0; ix <= ix1; ix++) for (iz = iz0; iz <= iz1; iz++) for (iy = iy0 - 1; iy <= iy1; iy++) {
          if (iy < 0) continue; key = vk(ix, iy, iz); var rv0 = vox.get(key); if (iy < iy0 && !(rv0 && W.isNew(rv0.t))) continue;
          if (rv0 && (W.isSh(rv0.t))) { var rvA = (rv0.anc != null && W.isNew(rv0.t)) ? (vox.get(rv0.anc) || rv0) : rv0, sb = W.shapeBoxes(rv0.t, rvA.rot, ix, (rv0.anc != null && W.isNew(rv0.t)) ? iy - 1 : iy, iz), sj, q; for (sj = 0; sj < sb.length; sj++) { q = sb[sj]; if (x1 > q[0] && x0 < q[3] && y1 > q[1] && y0 < q[4] && z1 > q[2] && z0 < q[5]) { found = true; if (q[4] > info.top) info.top = q[4]; if (q[1] < info.bottom) info.bottom = q[1]; info.vox = key; } } continue; }
          if (rv0 && !(rv0.t >= 44 && rv0.t <= 48)) { found = true; if (iy + 1 > info.top) info.top = iy + 1; if (iy < info.bottom) info.bottom = iy; info.vox = key; }
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
      if (m._map && at != null) {
        var ent = m._map[at];
        if (!ent) return at;
        P.set(x, y + GYO, z); S.set(sx, sy, sz); Q.setFromAxisAngle(UP, ry || 0); Mx.compose(P, Q, S);
        ent.im.setMatrixAt(ent.idx, Mx);
        if (col != null && ent.im.instanceColor) { C.setHex(col); C.toArray(ent.im.instanceColor.array, ent.idx * 3); ent.im.instanceColor.needsUpdate = true; }
        ent.im.instanceMatrix.needsUpdate = true;
        return at;
      }
      var cap = m.instanceMatrix.count, i = at == null ? m.count : at;
      if (i >= cap) return cap - 1; if (at == null) m.count++;
      P.set(x, y + GYO, z); S.set(sx, sy, sz); Q.setFromAxisAngle(UP, ry || 0); Mx.compose(P, Q, S);
      m.setMatrixAt(i, Mx);
      if (col != null && m.instanceColor) { C.setHex(col); C.toArray(m.instanceColor.array, i * 3); m.instanceColor.needsUpdate = true; }
      m.instanceMatrix.needsUpdate = true; return i;
    }
    W.put = put;
    var box1 = new THREE.BoxGeometry(1, 1, 1), boxB = new THREE.BoxGeometry(1, 1, 1); boxB.translate(0, 0.5, 0);
    function setTexCol(t, isSRGB) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = ANISO;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      if (isSRGB) {
        if ('sRGBEncoding' in THREE) t.encoding = THREE.sRGBEncoding;
        else if ('SRGBColorSpace' in THREE) t.colorSpace = THREE.SRGBColorSpace;
      } else {
        if ('LinearEncoding' in THREE) t.encoding = THREE.LinearEncoding;
        else if ('NoColorSpace' in THREE) t.colorSpace = THREE.NoColorSpace;
      }
      return t;
    }
    function canvasTex(w, h, draw, noSRGB) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = setTexCol(new THREE.CanvasTexture(c), !noSRGB);
      return t;
    }
    /* Compressed seamless procedural Texture Pack engine (128-256px pooled, never touches /icons/) */
    var TEX_PACKS = {
      realism:    { name: 'Enhanced Realism PBR', sat: 1.0, contrast: 1.08, grime: 0.22, crack: 0.28, bump: 1.0 },
      urban:      { name: 'Clean Modern Urban',   sat: 0.94, contrast: 0.92, grime: 0.06, crack: 0.08, bump: 0.65 },
      stylized:   { name: 'Crisp Stylized',       sat: 1.24, contrast: 1.18, grime: 0.10, crack: 0.12, bump: 0.85 },
      apocalypse: { name: 'Gritty Apocalypse',    sat: 0.78, contrast: 1.24, grime: 0.45, crack: 0.55, bump: 1.35 }
    };
    var curTexPack = 'realism', packMats = [], sharedBump = null;
    function getPackSpec() { return TEX_PACKS[curTexPack] || TEX_PACKS.realism; }
    function lam(c, o) {
      var p = { color: c, roughness: 0.86, metalness: 0.04, envMapIntensity: 0.65 };
      for (var k in (o || {})) p[k] = o[k];
      if (p.transparent && p.depthWrite === false && !p.roughness) p.roughness = 0.25;
      return new THREE.MeshStandardMaterial(p);
    }
    function pbr(c, o) { return lam(c, o); }
    function tintHex(hex, satMul, briMul) {
      var col = new THREE.Color(hex), hsl = {};
      if (col.getHSL) col.getHSL(hsl);
      col.setHSL(hsl.h || 0, Math.min(1, (hsl.s || 0) * satMul), Math.min(1, Math.max(0, (hsl.l || 0) * briMul)));
      return '#' + col.getHexString();
    }
    function fbmTile(x, y, period, seed) {
      function h2(ix, iy) {
        var px = ((ix % period) + period) % period, py = ((iy % period) + period) % period;
        var v = Math.imul(px * 374761393 + py * 668265263 + seed, 1274126177);
        return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
      }
      var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    function buildMicroNoise(seed, size, hiContrast) {
      return canvasTex(size, size, function (g, w, h) {
        var img = g.createImageData(w, h), d = img.data, inv = 1 / w;
        for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
          var n = fbmTile(px * inv * 8, py * inv * 8, 8, seed) * 0.5 +
                  fbmTile(px * inv * 16, py * inv * 16, 16, seed + 19) * 0.3 +
                  fbmTile(px * inv * 32, py * inv * 32, 32, seed + 47) * 0.2;
          var v = Math.max(0, Math.min(255, Math.round((0.5 + (n - 0.5) * (hiContrast || 1.4)) * 255)));
          var i = (py * w + px) * 4;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }, true);
    }
    sharedBump = buildMicroNoise(901 + TS, 128, 1.5);

    function paintNoiseOverlay(g, w, h, seed, alpha, count, minS, maxS) {
      var r = mulberry(seed);
      for (var i = 0; i < count; i++) {
        var v = r() < 0.5 ? 0 : 255;
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (alpha * (0.4 + r() * 0.6)) + ')';
        g.fillRect(r() * w, r() * h, minS + r() * maxS, minS + r() * maxS);
      }
    }
    function facadeStyleTex(styleIdx, seed) {
      var sp = getPackSpec(), r = mulberry(seed);
      return canvasTex(256, 256, function (g, w, h) {
        g.fillStyle = '#dad8d4'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 16) {
          g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, y, w, 1);
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y + 1, w, 1);
        }
        paintNoiseOverlay(g, w, h, seed + 5, 0.08 + sp.grime * 0.14, 700, 2, 7);
        for (var fy = 0; fy < 2; fy++) for (var fx = 0; fx < 2; fx++) {
          var x = fx * 128 + 24, wy = fy * 128 + 17, k = r();
          g.fillStyle = '#2c2924'; g.fillRect(x - 3, wy - 3, 80, 98);
          var boarded = styleIdx === 3 ? k < 0.28 : k < 0.14;
          var darkWin = k < 0.34;
          g.fillStyle = boarded ? '#634832' : darkWin ? '#1e2b38' : '#355c78';
          g.fillRect(x, wy, 74, 92);
          if (boarded) {
            g.strokeStyle = '#362314'; g.lineWidth = 4;
            for (var j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x, wy + j * 22 + 8); g.lineTo(x + 74, wy + j * 22 + 17); g.stroke(); }
          } else {
            var gr = g.createLinearGradient(x, wy, x + 74, wy + 92);
            gr.addColorStop(0, 'rgba(185,225,255,0.36)'); gr.addColorStop(0.55, 'rgba(70,120,165,0.14)'); gr.addColorStop(1, 'rgba(25,40,55,0.35)');
            g.fillStyle = gr; g.fillRect(x + 3, wy + 3, 68, 86);
            g.fillStyle = '#23262a'; g.fillRect(x + 35, wy, 4, 92); g.fillRect(x, wy + 44, 74, 4);
          }
          g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x - 4, wy + 92, 82, 5);
        }
      });
    }
    var FACADE_STYLES = [
      facadeStyleTex(0, 11 + TS),
      facadeStyleTex(1, 21 + TS),
      facadeStyleTex(2, 31 + TS),
      facadeStyleTex(3, 41 + TS)
    ];
    var FACADE_DEFS = [['#a8a49b', 0], ['#b3a89a', 0], ['#929aa3', 0], ['#ab9687', 0], ['#899399', 0], ['#bdb29f', 0], ['#d8bb85', 1], ['#c9a46a', 1], ['#e4cf9f', 1], ['#dfe6ec', 2], ['#b9c7d6', 2], ['#cfd8e0', 2], ['#7d8f5e', 3], ['#6e7d52', 3], ['#8a7a58', 3]];
    var FACADE_MATS = FACADE_DEFS.map(function (a) {
      return lam(a[0], { map: FACADE_STYLES[a[1]], bumpMap: sharedBump, bumpScale: 0.028, roughness: 0.84 });
    });
    FACADE_STYLES.forEach(function (tex, si) {
      var groupMats = FACADE_MATS.filter(function (_, fi) { return FACADE_DEFS[fi][1] === si; });
      packMats.push({
        mats: groupMats,
        gen: function () { return facadeStyleTex(si, 11 + si * 10); }
      });
    });
    function groundTexMake(base, c1, c2, seed, rep) {
      var sp = getPackSpec();
      var t = canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed);
        var baseC = new THREE.Color(tintHex(base, sp.sat, 1.0));
        var darkC = new THREE.Color(tintHex(base, sp.sat, 0.72));
        var liteC = new THREE.Color(tintHex(base, sp.sat * 1.05, 1.18));
        var img = g.createImageData(w, h), d = img.data, inv = 1 / w, tmp = new THREE.Color();
        for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
          var n = fbmTile(px * inv * 6, py * inv * 6, 6, seed + 3) * 0.55 +
                  fbmTile(px * inv * 14, py * inv * 14, 14, seed + 17) * 0.30 +
                  fbmTile(px * inv * 32, py * inv * 32, 32, seed + 41) * 0.15;
          var k = Math.max(-1, Math.min(1, (n - 0.5) * 2.2 * sp.contrast));
          tmp.copy(baseC);
          if (k > 0) tmp.lerp(liteC, k * 0.52);
          else tmp.lerp(darkC, -k * 0.55);
          var idx = (py * w + px) * 4;
          d[idx] = Math.round(tmp.r * 255);
          d[idx + 1] = Math.round(tmp.g * 255);
          d[idx + 2] = Math.round(tmp.b * 255);
          d[idx + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        for (var i = 0; i < 2200; i++) {
          g.fillStyle = r() < 0.42 ? c1 : c2;
          g.globalAlpha = 0.25 + r() * 0.32;
          g.fillRect(r() * w, r() * h, 1 + r() * 1.2, 1.5 + r() * 3.0);
        }
        g.globalAlpha = 1;
      });
      t.repeat.set(rep, rep); return t;
    }
    function buildRoadTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#3b3e43', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        paintNoiseOverlay(g, w, h, seed + 17, 0.14 * sp.contrast, 2200, 1, 2);
        g.fillStyle = 'rgba(20,22,25,' + (0.14 + sp.grime * 0.25) + ')';
        g.fillRect(34, 0, 28, h); g.fillRect(w - 62, 0, 28, h);
        g.strokeStyle = 'rgba(12,13,16,' + (0.45 + sp.crack * 0.45) + ')'; g.lineWidth = 1.6;
        var crCount = Math.round(4 + sp.crack * 12);
        for (var k = 0; k < crCount; k++) {
          g.beginPath(); var sx = r() * w, sy = r() * h; g.moveTo(sx, sy);
          for (var s = 0; s < 5; s++) { sx += (r() - 0.5) * 30; sy += 12 + r() * 20; g.lineTo(sx, sy); }
          g.stroke();
        }
      });
    }
    var roadTex = buildRoadTex(6 + TS);
    var junMaskM = null;
    (function () {
      var jm = inst(boxB, lam(0xffffff, { map: roadTex, bumpMap: sharedBump, bumpScale: 0.025, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 1000, false, false);
      jm.userData.noCast = true;
      ROADS.forEach(function (cx) { ROADS.forEach(function (cz) { if (Math.hypot(cx - RBX, cz - RBZ) < 16) return; put(jm, cx, 0.046, cz, RW + 0.04, 0.008, RW + 0.04, 0, null); }); });
      junMaskM = jm;
    })();
    function buildPlankTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#9c6e3b', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var p = 0; p < 8; p++) {
          var py = p * 32;
          g.fillStyle = tintHex(p % 2 ? '#916332' : '#a47541', sp.sat, 1.0);
          g.fillRect(0, py + 2, w, 29);
          g.fillStyle = 'rgba(255,222,178,0.16)'; g.fillRect(0, py + 2, w, 2);
          for (var i = 0; i < 32; i++) {
            g.fillStyle = 'rgba(52,30,12,' + (0.08 + r() * 0.16 * sp.contrast) + ')';
            g.fillRect(r() * w, py + 3 + r() * 25, 16 + r() * 58, 1 + r() * 1.6);
          }
          g.fillStyle = '#3d2610'; g.fillRect(0, py, w, 2); g.fillRect(0, py + 30, w, 2);
        }
        g.fillStyle = '#3d2610';
        for (var j = 0; j < 8; j++) g.fillRect(((j * 89 + 45) % (w - 8)) + 4, j * 32, 2, 32);
      });
    }
    var plankTex = buildPlankTex(7 + TS);
    function buildStoneTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#595d64', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var row = 0; row < 8; row++) {
          var y = row * 32, off = (row % 2) * 32;
          for (var col = -1; col < 5; col++) {
            var x = col * 64 + off, sh = 122 + ((r() * 38) | 0);
            g.fillStyle = 'rgb(' + sh + ',' + (sh + 2) + ',' + (sh + 6) + ')';
            g.fillRect(x + 2, y + 2, 60, 28);
            g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x + 2, y + 2, 60, 2);
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 28, 60, 2);
          }
        }
        paintNoiseOverlay(g, w, h, seed + 22, 0.12 * sp.contrast, 900, 1, 4);
      });
    }
    var stoneTex = buildStoneTex(8 + TS);
    var glassTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = 'rgba(150,205,255,0.22)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a86e8'; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = 'rgba(255,255,255,0.42)'; g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 14); g.lineTo(14, 60); g.closePath(); g.fill();
    });
    var cactBlockTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(77); g.fillStyle = '#4f9a46'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f6a2c'; for (var x = 6; x < w; x += 16) g.fillRect(x, 0, 4, h);
      g.fillStyle = '#f2f2c0'; for (var i = 0; i < 80; i++) g.fillRect(r() * w, r() * h, 2, 2);
    });
    function buildHouseWallTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        g.fillStyle = tintHex('#efeae0', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 16) {
          g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, y, w, 2);
          g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, y + 2, w, 2);
        }
        paintNoiseOverlay(g, w, h, seed, 0.08 + sp.grime * 0.1, 900, 1, 5);
      });
    }
    var houseWallTex = buildHouseWallTex(9 + TS);
    var winTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#ded7c9'; g.fillRect(0, 0, w, h); g.clearRect(12, 12, w - 24, h - 24);
      g.fillStyle = 'rgba(145,205,245,0.34)'; g.fillRect(12, 12, w - 24, h - 24);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(16, 16); g.lineTo(50, 16); g.lineTo(16, 64); g.closePath(); g.fill();
      g.fillStyle = '#ded7c9'; g.fillRect(w / 2 - 3, 9, 6, h - 18); g.fillRect(9, h / 2 - 3, w - 18, 6);
    });
    function buildBarkTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#694b2f', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var i = 0; i < 320; i++) {
          g.fillStyle = r() < 0.52 ? 'rgba(24,14,6,0.44)' : 'rgba(165,126,82,0.28)';
          g.fillRect(r() * w, r() * h, 2 + r() * 4, 12 + r() * 48);
        }
      });
    }
    var barkTex = buildBarkTex(10);
    function buildLeafTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#b8c3af', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var i = 0; i < 650; i++) {
          g.fillStyle = r() < 0.45 ? 'rgba(26,52,22,0.36)' : 'rgba(225,244,205,0.3)';
          g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 5, 4 + r() * 7, r() * 3.14, 0, 6.283); g.fill();
        }
      });
    }
    var leafTex = buildLeafTex(12);
    function buildRockTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        g.fillStyle = tintHex('#b4b9c0', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        paintNoiseOverlay(g, w, h, seed, 0.16 * sp.contrast, 1100, 1, 6);
      });
    }
    var rockTex = buildRockTex(13);
    function buildCrateTex(seed) {
      var sp = getPackSpec();
      return canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(seed); g.fillStyle = tintHex('#b58852', sp.sat, 1.0); g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 32) { g.fillStyle = 'rgba(55,34,14,0.32)'; g.fillRect(0, y, w, 3); }
        for (var i = 0; i < 80; i++) { g.fillStyle = 'rgba(65,38,16,0.16)'; g.fillRect(r() * w, r() * h, 14 + r() * 44, 1.5); }
        g.strokeStyle = '#472f16'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
        g.beginPath(); g.moveTo(12, 12); g.lineTo(w - 12, h - 12); g.stroke();
      });
    }
    var crateTex = buildCrateTex(14);
    W.TEXTURE_PACKS = Object.keys(TEX_PACKS).map(function (id) { return { id: id, name: TEX_PACKS[id].name }; });
    function applyAnisoTex(t) {
      if (!t) return;
      if (t.anisotropy !== ANISO) { t.anisotropy = ANISO; t.needsUpdate = true; }
    }
    W.setAnisotropy = function (newAniso) {
      if (newAniso == null) return;
      ANISO = Math.max(1, Math.min(maxAniso || 16, newAniso));
      applyAnisoTex(sharedBump);
      packMats.forEach(function (entry) {
        if (!entry) return;
        var list = entry.mats || (entry.mat ? [entry.mat] : []);
        list.forEach(function (m) { if (m && m.map) applyAnisoTex(m.map); });
      });
    };
    W.setTexturePack = function (packId, newAniso) {
      if (packId && TEX_PACKS[packId]) curTexPack = packId;
      if (newAniso != null) ANISO = Math.max(1, Math.min(maxAniso || 16, newAniso));
      var sp = getPackSpec();
      packMats.forEach(function (entry) {
        if (!entry) return;
        var list = entry.mats || (entry.mat ? [entry.mat] : []);
        if (!list.length) return;
        var nt = entry.gen();
        if (entry.rep) nt.repeat.set(entry.rep[0], entry.rep[1]);
        var oldMap = list[0].map;
        list.forEach(function (m) {
          m.map = nt;
          if (m.bumpScale != null) m.bumpScale = 0.03 * sp.bump;
          m.needsUpdate = true;
        });
        if (oldMap && oldMap !== nt && oldMap.dispose) oldMap.dispose();
      });
    };

    /* ground planes per biome: city (centre + south), desert (east), jungle (west), snow (north) */
    function biomeOf(x, z) { return WZ.TERRAIN.biome(x, z); }
    W.biomeOf = biomeOf; W.onRoad = function (x, z, m) { return onRoad(x, z, m); };
    (function () {
      var E = HALF, defs = [
        ['city', -500, 500, -500, E, ['#5c6142', 'rgba(65,55,38,.45)', 'rgba(110,125,70,.7)', 5]],
        ['desert', 500, E, -500, E, ['#d6b676', 'rgba(170,130,70,.5)', 'rgba(235,205,140,.7)', 6]],
        ['jungle', -E, -500, -500, E, ['#2f5a2a', 'rgba(20,50,20,.5)', 'rgba(70,120,50,.7)', 7]],
        ['snow', -E, E, -E, -500, ['#e6eef3', 'rgba(170,190,205,.5)', 'rgba(255,255,255,.8)', 8]]
      ];
      defs.forEach(function (d) {
        var w = d[2] - d[1], h = d[4] - d[3], sp = d[5], rx = w / 5.5, ry = h / 5.5;
        var m = groundTexMake(sp[0], sp[1], sp[2], sp[3], 1); m.repeat.set(rx, ry);
        var mat = lam(0xffffff, { map: m, bumpMap: sharedBump, bumpScale: 0.02, roughness: 0.94 });
        packMats.push({ mat: mat, rep: [rx, ry], gen: function () { return groundTexMake(sp[0], sp[1], sp[2], sp[3], 1); } });
        var pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); pm.rotation.x = -Math.PI / 2; pm.position.set((d[1] + d[2]) / 2, 0, (d[3] + d[4]) / 2); scene.add(pm);
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
      var tm = new THREE.Mesh(g, lam(0xffffff, { vertexColors: true, roughness: 0.92, metalness: 0.02 })); tm.frustumCulled = false; scene.add(tm); W.terrainMesh = tm;
      var sea = new THREE.Mesh(new THREE.PlaneGeometry(H0 * 2 + 400, H0 * 2 + 400), lam(0x2878ba, { transparent: true, opacity: 0.72, roughness: 0.16, metalness: 0.15, depthWrite: false })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.3, 0); sea.renderOrder = 2; scene.add(sea); W.seaMesh = sea;
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
      var mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide })); mesh.frustumCulled = false; scene.add(mesh); W.mtRoadMesh = mesh;
      W.mtPeaks = peaks; W.onMtRoad = function (x, z) { return !!keys[mk(x, z)]; };
    })();
    (function () {
      /* gradient strips: 5 m fading out of biome A + 5 m fading into biome B; sandy beach along the map edge */
      var E = HALF, COL = { city: '#5c6142', desert: '#d6b676', jungle: '#2f5a2a', snow: '#e6eef3', beach: '#e3d29a' };
      function strip(c1, c2, x0, x1, z0, z1, alongX, alpha) {
        var cv = document.createElement('canvas'); cv.width = alongX ? 64 : 4; cv.height = alongX ? 4 : 64; var g = cv.getContext('2d'), gr = alongX ? g.createLinearGradient(0, 0, 64, 0) : g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
        var tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
        var m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), lam(0xffffff, { map: tx, transparent: !!alpha, depthWrite: !alpha, roughness: 0.94, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, alpha ? 0.015 : 0.012, (z0 + z1) / 2); scene.add(m);
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
        pq([c - RW / 2, 0.026, HALF + 20], [c + RW / 2, 0.026, HALF + 20], [c + RW / 2, 0.026, -HALF - 20], [c - RW / 2, 0.026, -HALF - 20], false);
        pq([-HALF - 20, 0.042, c + RW / 2], [HALF + 20, 0.042, c + RW / 2], [HALF + 20, 0.042, c - RW / 2], [-HALF - 20, 0.042, c - RW / 2], true);
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
      var roadMat = lam(0xffffff, { map: roadTex, bumpMap: sharedBump, bumpScale: 0.025, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      packMats.push({ mats: [roadMat, junMaskM.material, W.mtRoadMesh.material], gen: function () { return buildRoadTex(6); } });
      scene.add(new THREE.Mesh(g, roadMat));
    })();
    var dashes = inst(boxB, lam(0xe8c448, { roughness: 0.65, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 18500, false, false);
    dashes.userData.noCast = true;
    var RBX = -32, RBZ = 32; /* spawn roundabout (replaces the crossroad) */
    function nearRoad(t) { for (var q = 0; q < ROADS.length; q++) if (Math.abs(t - ROADS[q]) < RW / 2 + 1.6) return true; return false; }
    ROADS.forEach(function (c) { for (var t = -HALF - 5; t < HALF + 5; t += 7) { if (Math.hypot(c - RBX, t - RBZ) > 15 && !nearRoad(t)) put(dashes, c, 0.056, t, 0.18, 0.012, 3.2, 0, null); if (Math.hypot(t - RBX, c - RBZ) > 15 && !nearRoad(t)) put(dashes, t, 0.058, c, 3.2, 0.012, 0.18, 0, null); } });
    var rbBuild = function () {
      var rbTex = buildRoadTex(62); rbTex.repeat.set(1.6, 1.6);
      var rbMat = lam(0xffffff, { map: rbTex, bumpMap: sharedBump, bumpScale: 0.025, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      packMats.push({ mat: rbMat, rep: [1.6, 1.6], gen: function () { return buildRoadTex(62); } });
      var asph = new THREE.Mesh(new THREE.RingGeometry(6.6, 13.2, 64), rbMat); asph.rotation.x = -Math.PI / 2; asph.position.set(RBX, 0.052, RBZ); scene.add(asph);
      var edge = new THREE.Mesh(new THREE.RingGeometry(12.7, 12.95, 64), lam(0xe8e8e0, { roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); edge.rotation.x = -Math.PI / 2; edge.position.set(RBX, 0.068, RBZ); scene.add(edge);
      var curb = new THREE.Mesh(new THREE.RingGeometry(6.6, 7.0, 48), lam(0xb8b4aa, { roughness: 0.85 })); curb.rotation.x = -Math.PI / 2; curb.position.set(RBX, 0.08, RBZ); scene.add(curb);
      var isl = new THREE.Mesh(new THREE.CircleGeometry(6.6, 40), lam(0x4d7a3a, { roughness: 0.92 })); isl.rotation.x = -Math.PI / 2; isl.position.set(RBX, 0.095, RBZ); scene.add(isl);
      for (var a = 0; a < 24; a++) { var an = a / 24 * Math.PI * 2; put(dashes, RBX + Math.cos(an) * 9.9, 0.065, RBZ + Math.sin(an) * 9.9, 1.6, 0.012, 0.16, -an + Math.PI / 2, null); }
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

    var wallMat = lam(0xffffff, { map: houseWallTex, bumpMap: sharedBump, bumpScale: 0.028, roughness: 0.86 });
    packMats.push({ mat: wallMat, gen: function () { return buildHouseWallTex(9); } });
    var walls = inst(box1, wallMat, 130000, false, true), winM = inst(box1, (W.winMat = lam(0xffffff, { map: winTex, transparent: true, depthWrite: false, roughness: 0.14, metalness: 0.25 })), 20000, false, false), roofCols = [0x5c5751, 0x69625a, 0x51575e];
    winM.userData.noCast = true;
    rbBuild();
    var CH = 20; W.CH = CH; W.chunks = new Map();
    W.chunkOf = function (x, y, z) { return [Math.floor(x / CH), Math.floor(y / CH), Math.floor(z / CH)]; };
    function chunkAt(cx, cz) { var k = ck(cx, cz), c = W.chunks.get(k); if (!c) { c = { cx: cx, cz: cz, g: new THREE.Group(), vis: true, shVis: null }; c.g.userData.c = c; scene.add(c.g); W.chunks.set(k, c); } return c; }
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
      addBox(x0, x1, 0, h, z0, z1, false); occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]); W.noGrass.push([x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5]); W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#555' });
      if (R() < 0.6) put(walls, rr(x0 + 2, x1 - 2), h + 1, rr(z0 + 2, z1 - 2), 3, 2, 3, 0, 0x6b7075);
    }
    /* [BUILDINGS] Enterable towers: door on the south wall, a floor slab + staircase per level (flights alternate between the two long walls), one furniture per floor, loot spawned per floor in spawnNature. */
    W.floors = []; W.indoor = []; W.noGrass = []; W.citySeed = CSD;
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
      wallSeg(x0 + t, x1 - t, z0 + t, z1 - t, 0, 0.14, 0x8a857a);
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

    function mergeGeos(list) {
      var pos = [], nor = [], col = [], idx = [], off = 0;
      list.forEach(function (p) {
        var g = p[0], c = new THREE.Color(p[1]), pa = g.attributes.position, na = g.attributes.normal, ia = g.index ? g.index.array : null, i;
        if (!na) { g.computeVertexNormals(); na = g.attributes.normal; }
        for (i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); col.push(c.r, c.g, c.b); }
        if (ia) for (i = 0; i < ia.length; i++) idx.push(ia[i] + off);
        else for (i = 0; i < pa.count; i++) idx.push(i + off);
        off += pa.count;
      });
      var G = new THREE.BufferGeometry();
      G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      G.setIndex(idx);
      return G;
    }
    function bx(w, h, d, x, y, z, c) { var g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return [g, c]; }
    function cyl(r, len, x, y, z, c, seg) { var g = new THREE.CylinderGeometry(r, r, len, seg || 12); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return [g, c]; }
    function cylY(rTop, rBot, len, x, y, z, c, seg) { var g = new THREE.CylinderGeometry(rTop, rBot, len, seg || 12); g.translate(x, y, z); return [g, c]; }
    function sph(r, x, y, z, sx, sy, sz, c, seg) { var g = new THREE.SphereGeometry(r, seg || 10, seg || 8); g.scale(sx || 1, sy || 1, sz || 1); g.translate(x, y, z); return [g, c]; }

    var bedM = inst(box1, lam(0xffffff, { map: houseWallTex, roughness: 0.85 }), 8000, false, true);
    var couchM = inst(box1, lam(0xffffff, { map: houseWallTex, roughness: 0.85 }), 8000, false, true);
    function addBed(x, z, clean, yb) {
      yb = yb || 0;
      put(bedM, x, yb + 0.16, z, 2.02, 0.32, 1.04, 0, clean ? 0x6f4a2a : 0x42352b);
      put(bedM, x, yb + 0.42, z, 1.94, 0.24, 0.96, 0, clean ? 0xebe5d5 : 0x6b5b4e);
      put(bedM, x + 0.28, yb + 0.54, z, 1.26, 0.08, 0.98, 0, clean ? 0x487659 : 0x4c4036);
      put(bedM, x - 0.65, yb + 0.59, z - 0.22, 0.38, 0.12, 0.36, 0, clean ? 0xf7f5ef : 0x7e7266);
      put(bedM, x - 0.65, yb + 0.59, z + 0.22, 0.38, 0.12, 0.36, 0, clean ? 0xf7f5ef : 0x7e7266);
      put(bedM, x - 0.94, yb + 0.56, z, 0.14, 0.96, 1.04, 0, clean ? 0x9c6d3e : 0x4a3d33);
      addBox(x - 1.0, x + 1.0, yb, yb + 0.65, z - 0.5, z + 0.5, false);
      addEnt({ k: 'bed', x: x, z: z, y: yb, r: 1.3, h: 0.8, clean: clean, alive: true, dyn: false });
    }
    function addCouch(x, z, clean, yb) {
      yb = yb || 0;
      put(couchM, x, yb + 0.14, z, 1.92, 0.28, 0.9, 0, clean ? 0x4b331d : 0x352b23);
      put(couchM, x, yb + 0.36, z + 0.05, 1.66, 0.22, 0.76, 0, clean ? 0x7b996d : 0x5c4f43);
      put(couchM, x, yb + 0.7, z - 0.35, 1.88, 0.62, 0.22, 0, clean ? 0x5f7d52 : 0x453b31);
      put(couchM, x - 0.86, yb + 0.45, z, 0.18, 0.54, 0.88, 0, clean ? 0x5f7d52 : 0x453b31);
      put(couchM, x + 0.86, yb + 0.45, z, 0.18, 0.54, 0.88, 0, clean ? 0x5f7d52 : 0x453b31);
      addBox(x - 0.95, x + 0.95, yb, yb + 0.65, z - 0.45, z + 0.45, false);
      addEnt({ k: 'couch', x: x, z: z, y: yb, r: 1.15, h: 0.9, clean: clean, alive: true, dyn: false });
    }

    /* wall with real glass window openings and protruding stone window sills */
    function wallWin(alongX, a0, a1, c0, c1, centers, col, H) {
      var cur = a0, cm = (c0 + c1) / 2, WH = 0.75;
      function seg(u0, u1, y0, y1, cl) { if (u1 - u0 < 0.01) return; if (alongX) wallSeg(u0, u1, c0, c1, y0, y1, cl); else wallSeg(c0, c1, u0, u1, y0, y1, cl); }
      centers.forEach(function (c) {
        seg(cur, c - WH, 0, H, col); seg(c - WH, c + WH, 0, 1.1, col); seg(c - WH, c + WH, 2.2, H, col);
        if (alongX) {
          put(winM, c, 1.65, cm, 1.5, 1.1, 0.1, 0, null);
          put(walls, c, 1.08, cm, 1.66, 0.08, 0.52, 0, 0xb8b2a6);
          addBox(c - WH, c + WH, 1.1, 2.2, cm - 0.05, cm + 0.05, false);
        } else {
          put(winM, cm, 1.65, c, 0.1, 1.1, 1.5, 0, null);
          put(walls, cm, 1.08, c, 0.52, 0.08, 1.66, 0, 0xb8b2a6);
          addBox(cm - 0.05, cm + 0.05, 1.1, 2.2, c - WH, c + WH, false);
        }
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
      wallSeg(x0 - 0.18, x1 + 0.18, z0 - 0.18, z1 + 0.18, H, H + 0.44, roofCol);
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

    /* Detailed Multi-Tiered Tree & Cactus Geometries (r128-safe Lathe/Cylinder/Sphere, roots sink -0.15m on slopes) */
    var trunkG = new THREE.LatheGeometry([
      new THREE.Vector2(0.46, -0.18), new THREE.Vector2(0.38, 0.04),
      new THREE.Vector2(0.28, 0.35), new THREE.Vector2(0.22, 0.78), new THREE.Vector2(0.16, 1.04)
    ], 10);
    var crownG = new THREE.ConeGeometry(1.02, 1.0, 12); crownG.translate(0, 0.48, 0);
    var cactG = mergeGeos([
      cylY(0.27, 0.31, 1.0, 0, 0.45, 0, 0x4f9a46, 12),
      sph(0.27, 0, 0.95, 0, 1, 0.85, 1, 0x56a64c, 10)
    ]);
    var frondG = mergeGeos([
      bx(0.95, 0.06, 0.56, 0.45, 0.04, 0, 0x4f9434),
      bx(0.85, 0.05, 0.48, 1.2, -0.05, 0, 0x44842c),
      bx(0.75, 0.04, 0.34, 1.85, -0.22, 0, 0x3b7424)
    ]);
    var TCAP = 8000;
    var barkMat = lam(0xffffff, { map: barkTex, bumpMap: sharedBump, bumpScale: 0.04, roughness: 0.92 });
    var leafCanMat = lam(0xffffff, { map: leafTex, bumpMap: sharedBump, bumpScale: 0.02, roughness: 0.85 });
    packMats.push({ mat: barkMat, gen: function () { return buildBarkTex(10); } });
    packMats.push({ mat: leafCanMat, gen: function () { return buildLeafTex(12); } });
    var trunkM = inst(trunkG, barkMat, TCAP, true, false), crownM = inst(crownG, leafCanMat, TCAP, true, true);
    var crown2M = inst(crownG, leafCanMat, TCAP, true, true), cactM = inst(cactG, lam(0xffffff, { vertexColors: true, roughness: 0.86 }), 3000, true, false), armM = inst(cactG, lam(0xffffff, { vertexColors: true, roughness: 0.86 }), 6000, true, false);
    var vineM = inst(boxB, lam(0x2f7a2a, { roughness: 0.88 }), 24000, true, false), frondM = inst(frondG, lam(0xffffff, { vertexColors: true, roughness: 0.82 }), 6000, true, false);
    var LN = 40, LN2 = 20, leafTex2 = canvasTex(128, 128, function (g, w, h) {
      g.clearRect(0, 0, w, h); g.fillStyle = '#58a845'; g.beginPath(); g.ellipse(64, 64, 28, 56, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#2b6b2a'; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 118); g.stroke(); g.lineWidth = 2.5;
      for (var i = 0; i < 4; i++) { var yy = 32 + i * 20; g.beginPath(); g.moveTo(64, yy + 16); g.lineTo(42, yy); g.moveTo(64, yy + 16); g.lineTo(86, yy); g.stroke(); }
    });
    W.leafU = { uTime: { value: 0 }, uAmp: { value: 0 } };
    function leafMat() {
      var m = lam(0xffffff, { map: leafTex2, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.82 });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = W.leafU.uTime; sh.uniforms.uAmp = W.leafU.uAmp;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = uTime * 2.2 + instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.6;\ntransformed.x += sin(ph) * uAmp * (position.y + 0.5);\ntransformed.z += cos(ph * 0.8) * uAmp * (position.y + 0.5);\n#endif');
      };
      return m;
    }
    var leafM = inst(new THREE.PlaneGeometry(1, 1), leafMat(), TCAP * LN, true, true), leaf2M = inst(new THREE.PlaneGeometry(1, 1), leafMat(), TCAP * LN2, true, true);
    leafM.userData.n = LN; leaf2M.userData.n = LN2; leaf2M.visible = false; W.leaf2M = leaf2M; W.leafTex = leafTex2;
    [leafM, leaf2M].forEach(function (m) { m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex2, alphaTest: 0.5, side: THREE.DoubleSide }); });
    var _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _le = new THREE.Euler(), _lp = new THREE.Vector3(), _ls = new THREE.Vector3(), _lc = new THREE.Color();
    function leafCards(mesh, i, cx, cz, by, hgt, rad, sz, col, seed, diag) {
      var r = mulberry(seed * 31 + (diag ? 7 : 3));
      var LN = mesh.userData.n, map = mesh._map;
      for (var j = 0; j < LN; j++) {
        var a = r() * 6.2832, f = r() * 0.9, rr2 = rad * (1 - f) * (diag ? 0.55 + r() * 0.35 : 0.98);
        _lp.set(cx + Math.cos(a) * rr2, by + f * hgt, cz + Math.sin(a) * rr2);
        _le.set(diag ? (r() - 0.5) * 1.6 : -0.9 - r() * 0.4, -a + 1.5708 + (diag ? 0.9 : 0), diag ? (r() - 0.5) * 1.8 : 0, 'YXZ');
        _lq.setFromEuler(_le); _ls.set(sz * (0.8 + r() * 0.5), sz * (1.3 + r() * 0.6), 1);
        _lm.compose(_lp, _lq, _ls);
        _lc.setHex(col); _lc.offsetHSL(0, 0, (r() - 0.5) * 0.12);
        if (map) {
          var ent = map[i * LN + j];
          if (ent) {
            ent.im.setMatrixAt(ent.idx, _lm); ent.im.setColorAt(ent.idx, _lc);
            ent.im.instanceMatrix.needsUpdate = true; if (ent.im.instanceColor) ent.im.instanceColor.needsUpdate = true;
          }
        } else {
          mesh.setMatrixAt(i * LN + j, _lm); mesh.setColorAt(i * LN + j, _lc);
        }
      }
      if (!map) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.count = Math.max(mesh.count, (i + 1) * LN); }
    }
    function hideLeaves(i) {
      _lm.makeScale(0.0001, 0.0001, 0.0001);
      var j, ent;
      if (leafM._map) {
        for (j = 0; j < LN; j++) { ent = leafM._map[i * LN + j]; if (ent) { ent.im.setMatrixAt(ent.idx, _lm); ent.im.instanceMatrix.needsUpdate = true; } }
      } else {
        for (j = 0; j < LN; j++) leafM.setMatrixAt(i * LN + j, _lm);
        leafM.instanceMatrix.needsUpdate = true;
      }
      if (leaf2M._map) {
        for (j = 0; j < LN2; j++) { ent = leaf2M._map[i * LN2 + j]; if (ent) { ent.im.setMatrixAt(ent.idx, _lm); ent.im.instanceMatrix.needsUpdate = true; } }
      } else {
        for (j = 0; j < LN2; j++) leaf2M.setMatrixAt(i * LN2 + j, _lm);
        leaf2M.instanceMatrix.needsUpdate = true;
      }
    }
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
      put(trunkM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(crownM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(crown2M, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i); put(cactM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, i);
      for (j = 0; j < 2; j++) put(armM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 2 * i + j); for (j = 0; j < 3; j++) put(vineM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 3 * i + j); for (j = 0; j < 5; j++) put(frondM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 5 * i + j);
      k = t.kind; treeLeaves(t);
      if (k === 'cactus') {
        put(cactM, x, gy - 0.08, z, 1.05 * s, th, 1.05 * s, t.ry, null, i);
        put(armM, x + 0.38 * s, gy + th * 0.36, z, 0.72 * s, th * 0.44, 0.72 * s, 0, null, 2 * i);
        put(armM, x - 0.36 * s, gy + th * 0.48, z, 0.68 * s, th * 0.36, 0.68 * s, 0, null, 2 * i + 1); return;
      }
      if (k === 'palm') {
        put(trunkM, x, gy, z, 0.9 * s, th * 1.22, 0.9 * s, t.ry, null, i);
        for (j = 0; j < 5; j++) put(frondM, x, gy + th * 1.22, z, 1.45 * s, 1.2 * s, 1.15 * s, t.ry + j * 1.2566, null, 5 * i + j); return;
      }
      if (k === 'snow') {
        put(trunkM, x, gy, z, 1.15 * s, th, 1.15 * s, t.ry, null, i);
        put(crownM, x, gy + th * 0.34, z, 2.35 * s, 2.6 * s, 2.35 * s, t.ry, t.cc, i); put(crown2M, x, gy + th * 0.34 + 1.65 * s, z, 1.55 * s, 2.3 * s, 1.55 * s, t.ry, t.cc, i); return;
      }
      if (k === 'jungle') {
        put(trunkM, x, gy, z, 1.4 * s, th, 1.4 * s, t.ry, null, i); put(crownM, x, gy + th * 0.48, z, 2.0 * s, 3.6 * s, 2.0 * s, t.ry, t.cc, i);
        put(crown2M, x, gy + th * 0.85, z, 1.3 * s, 2.1 * s, 1.3 * s, t.ry + 0.5, t.cc, i);
        for (j = 0; j < 3; j++) { var an = t.ry + j * 2.1; put(vineM, x + Math.cos(an) * 1.35 * s, gy + th * 0.14, z + Math.sin(an) * 1.35 * s, 0.08, th * 0.48, 0.08, 0, null, 3 * i + j); } return;
      }
      put(trunkM, x, gy, z, 1.15 * s, th, 1.15 * s, t.ry, null, i); put(crownM, x, gy + th * 0.58, z, 1.35 * s, 2.8 * s, 1.35 * s, t.ry, t.cc, i);
      put(crown2M, x, gy + th * 0.92, z, 0.95 * s, 1.9 * s, 0.95 * s, t.ry + 0.4, t.cc, i);
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

    /* Sculpted natural faceted boulders with flattened base seated firmly into terrain (no floating on slopes) */
    var rockG = (function () {
      var g = new THREE.IcosahedronGeometry(1, 1);
      var pa = g.attributes.position, rrRock = mulberry(404);
      for (var i = 0; i < pa.count; i++) {
        var vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i);
        var j = 0.84 + Math.abs(Math.sin(vx * 3.1 + vz * 2.7)) * 0.24 + rrRock() * 0.06;
        vx *= j; vz *= j;
        vy = vy < -0.15 ? -0.18 + vy * 0.15 : (vy * 0.85 + 0.2);
        pa.setXYZ(i, vx, vy, vz);
      }
      g.computeVertexNormals();
      return g;
    })();
    var rockMat = lam(0xffffff, { map: rockTex, bumpMap: sharedBump, bumpScale: 0.04, roughness: 0.9, flatShading: true });
    packMats.push({ mat: rockMat, gen: function () { return buildRockTex(13); } });
    var rockM = inst(rockG, rockMat, 2300, true, true);
    W.setRock = function (t, on) {
      if (!on) put(rockM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix);
      else put(rockM, t.x, (t.y || 0) + 0.08 * t.s, t.z, 1.15 * t.s, 0.82 * t.s, 1.02 * t.s, t.ry, t.cc, t.ix);
      t.box.on = on; t.alive = on;
    };
    /* [ORE TAG] kinds: stone | coal | copper | iron | gold.  Surface: 90% stone / 9% coal / 1% copper. Underground: 40 stone / 30 coal / 15 copper / 10 iron / 5 gold. */
    var ORE_COL = { sand: 0xe6d28f, stone: 0x8d9198, coal: 0x33343a, copper: 0xd2733a, iron: 0xb59a8c, gold: 0xe0b83a, zinc: 0x9fb6c4, titanium: 0x7aa7d6, permafrost: 0xaee4f4, diamond: 0x66e6ff, ruby: 0xd0213a, emerald: 0x2ecc71, amethyst: 0x9b59d6, sapphire: 0x2d5bd6, topaz: 0xf2b632, amber: 0xe08a1e, granite: 0xb98a6a, andesite: 0xa9adb0, diorite: 0xd0d0cc, calcite: 0xf4f4ee, clay: 0xb86f50 };
    function addRock(x, z, kindIn, rng, gy0) {
      var kind = kindIn || 'stone', plain = kind === 'stone' || kind === 'sand', s = rr(0.8, 2.1, rng);
      var t = { k: 'rock', idx: W.rocks.length, kind: kind, ore: kind === 'iron', coal: kind === 'coal', gold: kind === 'gold', copper: kind === 'copper', zinc: kind === 'zinc', sand: kind === 'sand', x: x, z: z, y: gy0 || 0, s: s, ry: rng() * 6.28, r: 0.95 * s, h: 1.5 * s, alive: true, dyn: true,
        max: Math.round((plain ? 60 : kind === 'sand' ? 30 : kind === 'coal' ? 70 : 100) * s * s), yield: plain ? Math.round(4 + 6 * s * s) : kind === 'coal' ? Math.round(2 + 3 * s * s) : kind === 'copper' ? Math.round(4 + 6 * s * s) : Math.round(2 + 4 * s * s), given: 0, respawn: 0, cc: ORE_COL[kind] };
      t.hp = t.max; t.ix = rockM.count++; t.box = addBox(x - 0.8 * s, x + 0.8 * s, gy0 || 0, (gy0 || 0) + 1.2 * s, z - 0.8 * s, z + 0.8 * s, true);
      W.setRock(t, true); addEnt(t); W.rocks.push(t);
    }
    function rollSurfaceOre(rng) { var r = rng(); return r < 0.90 ? 'stone' : r < 0.99 ? 'coal' : 'copper'; }
    function rollUgOre(rng, ly) { if (ly === 1) { var q = rng() * 100; return q < 12 ? 'stone' : q < 18 ? 'granite' : q < 38 ? 'coal' : q < 46 ? 'copper' : q < 68 ? 'iron' : q < 78 ? 'zinc' : q < 88 ? 'gold' : q < 98 ? 'titanium' : q < 99 ? 'diamond' : 'emerald'; } if (ly === 2) { var u = rng() * 100; return u < 10 ? 'stone' : u < 20 ? 'coal' : u < 32 ? 'iron' : u < 42 ? 'gold' : u < 48 ? 'zinc' : u < 66 ? 'titanium' : u < 70 ? 'permafrost' : u < 76 ? 'diamond' : u < 82 ? 'ruby' : u < 87 ? 'emerald' : u < 91 ? 'sapphire' : u < 94 ? 'amethyst' : u < 97 ? 'topaz' : 'amber'; } var r = rng() * 100; return r < 18 ? 'stone' : r < 23 ? 'granite' : r < 28 ? 'andesite' : r < 33 ? 'diorite' : r < 38 ? 'calcite' : r < 66 ? 'coal' : r < 81 ? 'copper' : r < 90 ? 'iron' : r < 95 ? 'zinc' : 'gold'; }

    /* Multi-part grounded Loot Piles, Tables (with 3D medkit/ration props), and Supply Crates */
    var bushG = mergeGeos([sph(0.42, 0, 0.34, 0, 1.15, 0.92, 1.15, 0xffffff, 8), sph(0.32, 0.3, 0.25, 0.18, 1.0, 0.85, 1.0, 0xe8f4e2, 7), sph(0.3, -0.28, 0.24, -0.16, 1.0, 0.85, 1.0, 0xd8e8d2, 7)]);
    var lootPropG = mergeGeos([bx(0.36, 0.14, 0.26, 0, 0.07, 0, 0xf2f4f7), bx(0.18, 0.03, 0.06, 0, 0.15, 0, 0xd93038), bx(0.06, 0.03, 0.18, 0, 0.15, 0, 0xd93038), cylY(0.06, 0.06, 0.18, 0.26, 0.09, 0.04, 0x3b82d6, 10)]);
    var pileM = inst(box1, wallMat, 60000, true, true), bushPileM = inst(bushG, leafCanMat, 10000, true, true);
    var shineM = inst(lootPropG, lam(0xffffff, { vertexColors: true, roughness: 0.42, metalness: 0.25 }), 16000, true, true);
    var plankMat = lam(0xffffff, { map: plankTex, bumpMap: sharedBump, bumpScale: 0.025, roughness: 0.84 });
    packMats.push({ mat: plankMat, gen: function () { return buildPlankTex(7); } });
    var tableM = inst(box1, plankMat, 4000, true, true), tlegM = inst(box1, lam(0x3a2a1a, { roughness: 0.82 }), 16000, true, true);
    W.zoneOf = zoneOf;
    W.setPile = function (p, full) {
      var yb = p.yb || 0;
      if (p.tier === 4) {
        p.parts.forEach(function (q) { put(q.m, p.x + q.dx, (q.item && !full) ? -50 : q.y + yb, p.z + q.dz, q.sx, q.sy, q.sz, q.ry, q.col, q.i); });
        p.searched = !full; return;
      }
      var k = full ? 1 : 0.35;
      p.parts.forEach(function (q) {
        if (q.item) { put(q.m, p.x + q.dx, full ? q.y + yb : -50, p.z + q.dz, q.sx, q.sy, q.sz, q.ry, q.col, q.i); return; }
        put(q.m, p.x + q.dx, q.y * k + yb, p.z + q.dz, q.sx, q.sy * k, q.sz, q.ry, q.col, q.i);
      });
      p.searched = !full;
    };
    function addPile(x, z, tier, rng, yb) {
      var p = { k: 'pile', idx: W.piles.length, tier: tier, x: x, z: z, y: yb || 0, yb: yb || 0, r: 0.9, h: 0.9, alive: true, dyn: true, searched: false, respawn: 0, parts: [] };
      if (tier === 4) {
        var ry4 = rng() * 3.14, tq = { m: tableM, dx: 0, dz: 0, sx: 1.72, sy: 0.1, sz: 0.96, ry: ry4, col: 0xffffff, y: 0.87 }; tq.i = tableM.count++; p.parts.push(tq);
        var cs = Math.cos(ry4), sn = Math.sin(ry4);
        [[-0.74, -0.38], [0.74, -0.38], [-0.74, 0.38], [0.74, 0.38]].forEach(function (o) { var lq = { m: tlegM, dx: o[0] * cs + o[1] * sn, dz: -o[0] * sn + o[1] * cs, sx: 0.09, sy: 0.82, sz: 0.09, ry: ry4, col: 0xffffff, y: 0.41 }; lq.i = tlegM.count++; p.parts.push(lq); });
        var iq = { m: shineM, dx: 0.08, dz: 0, sx: 1.05, sy: 1.05, sz: 1.05, ry: ry4, col: 0xffffff, y: 0.92, item: true }; iq.i = shineM.count++; p.parts.push(iq);
        p.r = 1.1; p.h = 1.0; W.setPile(p, true); addEnt(p); W.piles.push(p); return;
      }
      if (tier === 0) {
        var bcols = [0x3f7d34, 0x4f9140, 0x2f6a2c, 0x5aa04a];
        for (var bi = 0; bi < 2; bi++) {
          var bq = { m: bushPileM, dx: rr(-0.22, 0.22, rng), dz: rr(-0.22, 0.22, rng), sx: rr(0.75, 1.15, rng), sy: rr(0.75, 1.1, rng), sz: rr(0.75, 1.15, rng), ry: rng() * 6.28, col: pick(bcols, rng), y: 0 };
          bq.i = bushPileM.count++; p.parts.push(bq);
        }
        W.setPile(p, true); addEnt(p); W.piles.push(p); return;
      }
      var cols = tier === 1 ? [0x6d695f, 0x7a6d5c, 0x5c5a54, 0x827868] : [0x7a7871, 0x676a6e, 0x8a7d69, 0x5e5d59];
      for (var i = 0; i < 4; i++) { var q = { m: pileM, dx: rr(-0.42, 0.42, rng), dz: rr(-0.42, 0.42, rng), sx: rr(0.28, 0.62, rng), sy: rr(0.22, 0.48, rng), sz: rr(0.28, 0.62, rng), ry: rng() * 3, col: pick(cols, rng) }; q.y = q.sy / 2; q.i = pileM.count++; p.parts.push(q); }
      if (tier === 2) { var q2 = { m: shineM, dx: rr(-0.2, 0.2, rng), dz: rr(-0.2, 0.2, rng), sx: 1, sy: 1, sz: 1, ry: rng() * 3, col: 0xffffff, item: true }; q2.y = 0.02; q2.i = shineM.count++; p.parts.push(q2); }
      W.setPile(p, true); addEnt(p); W.piles.push(p);
    }

    var crateBodyG = mergeGeos([
      bx(0.88, 0.84, 0.88, 0, 0.42, 0, 0xffffff),
      bx(0.94, 0.1, 0.94, 0, 0.05, 0, 0xcab08a),
      bx(0.94, 0.1, 0.94, 0, 0.79, 0, 0xcab08a)
    ]);
    var crateLidG = mergeGeos([
      bx(0.96, 0.09, 0.96, 0, 0.045, 0, 0xffffff),
      bx(0.2, 0.05, 0.12, 0, 0.02, 0.46, 0x9aa3ad)
    ]);
    var crateMat = lam(0xffffff, { map: crateTex, bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.82 });
    packMats.push({ mat: crateMat, gen: function () { return buildCrateTex(14); } });
    var crateM = inst(crateBodyG, crateMat, 6000, true, true), lidM = inst(crateLidG, lam(0xffffff, { vertexColors: true, roughness: 0.72, metalness: 0.15 }), 6000, true, true);
    W.setCrate = function (c, full) {
      var bodyCol = c.tier === 2 ? (full ? 0xffdf9e : 0x99845a) : (full ? 0xffffff : 0x8a7558);
      var lidCol = c.tier === 2 ? 0x3b4859 : 0x4f361c;
      var yb = c.yb || 0; put(crateM, c.x, yb, c.z, 1, full ? 1 : 0.68, 1, c.ry, bodyCol, c.ix);
      put(lidM, c.x, full ? yb + 0.84 : -50, c.z, 1, 1, 1, c.ry, lidCol, c.ix);
      c.searched = !full;
    };
    function addCrate(x, z, isDyn, rng, tier, yb) {
      var fn = rng || R, c = { k: 'crate', idx: W.crates.length, tier: tier || 1, x: x, z: z, y: yb || 0, yb: yb || 0, r: 0.75, h: 0.9, alive: true, dyn: !!isDyn, searched: false, respawn: 0, ry: fn() * 3 };
      c.ix = crateM.count++; lidM.count++; addBox(x - 0.45, x + 0.45, yb || 0, (yb || 0) + 0.9, z - 0.45, z + 0.45, !!isDyn);
      W.setCrate(c, true); addEnt(c); W.crates.push(c);
    }

    function addBlockEnt(x, y, z, t, sz) {
      var kind = W.isNew(t) ? (WZ.VARIANT[t][1] !== 4 ? 'door' : null) : W.isSh(t) ? null : WZ.TANK && WZ.TANK[t] ? 'tank' : t >= 79 && t <= 84 ? 'farm' : WZ.GST[t] ? 'gstation' : t === 3 ? 'furnace' : t === 4 ? 'bed' : t === 5 ? 'couch' : t === 6 ? 'sink' : t === 7 ? 'campfire' : t === 8 ? 'anvil' : t === 9 ? 'computer' : t === 11 ? 'sawmill' : t === 12 ? 'tbench' : (t >= 13 && t <= 15) ? 'turret' : t === 16 ? 'milling' : t === 17 ? 'bomb' : t === 18 ? 'kiln' : t === 19 ? 'craft' : t === 20 ? 'work' : t === 49 ? 'liquiders' : t === 50 ? 'sewing' : t === 51 ? 'godstatue' : t >= 70 ? 'bed' : t >= 67 || (t >= 64 && t <= 66) ? 'lamp' : t >= 61 ? 'sofa' : t >= 58 ? 'sofa' : t >= 55 ? 'table' : t >= 52 ? 'seat' : t === 43 ? 'blast' : t === 29 ? 'press' : t === 30 ? 'casing' : t === 31 ? 'trapb' : t === 32 ? 'mason' : (t >= 21 && t <= 25) ? 'chest' : null;
      if (!kind) return null;
      var w = sz ? sz.w : 1, d = sz ? sz.d : 1, h = sz ? sz.h : 1; if (kind === 'door' && WZ.VARIANT[t][1] === 3) h = 2;
      var e = { k: kind, x: x + w / 2, z: z + d / 2, y: y, r: kind === 'door' ? 0.62 : Math.max(w, d) / 2 + 0.4, h: h, clean: true, alive: true, dyn: true, vx: x, vy: y, vz: z, sw: w, sd: d };
      addEnt(e); W.bents.push(e);
      if (t >= 79 && t <= 84) { e.farm = WZ.FARM[t]; e.fn = e.farm[2]; e.fm = { tilled: !!e.farm[3], hoe: 0, wet: 0, crops: [] }; W.farms.push(e); }
      else if (WZ.GST[t]) { e.stk = WZ.GST[t][0]; W[WZ.GST[t][2]].push(e); }
      else if (WZ.TANK && WZ.TANK[t]) { e.tk = WZ.TANK[t]; e.tkL = 0; e.tkLiq = null; e.r = Math.max(w, d) / 2 + 0.5; W.tanks.push(e); }
      else if (t === 3) W.furn.push(e);
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

    /* Loot vehicles: detailed multi-part grounded Sedan, Scout II SUV, and 6-wheel Cargo Truck */
    var wheelTireG = (function () {
      var pts = [
        new THREE.Vector2(0.01, -0.13), new THREE.Vector2(0.24, -0.13),
        new THREE.Vector2(0.33, -0.11), new THREE.Vector2(0.35, -0.06),
        new THREE.Vector2(0.35,  0.06), new THREE.Vector2(0.33,  0.11),
        new THREE.Vector2(0.24,  0.13), new THREE.Vector2(0.01,  0.13)
      ];
      var g = new THREE.LatheGeometry(pts, 18);
      g.rotateZ(Math.PI / 2);
      g.translate(0, 0.35, 0);
      return g;
    })();
    var whRimG = mergeGeos([
      cyl(0.22, 0.27, 0, 0.35, 0, 0x868c95, 12),
      cyl(0.15, 0.285, 0, 0.35, 0, 0x7d838c, 8),
      cyl(0.07, 0.3, 0, 0.35, 0, 0x4a4f57, 8)
    ]);
    /* side-profile prism: pts = [[z,y],...] extruded across X (width w, centred at x) */
    function prism(pts, w, x, c) {
      var sh = new THREE.Shape(); pts.forEach(function (p, i) { if (i) sh.lineTo(p[0], p[1]); else sh.moveTo(p[0], p[1]); });
      var g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x + w / 2, 0, 0); g.computeVertexNormals(); return [g, c];
    }
    function strut(z1, y1, z2, y2, t, w, x, c) { var dz = z2 - z1, dy = y2 - y1, L = Math.sqrt(dz * dz + dy * dy), nz = -dy / L * t / 2, ny = dz / L * t / 2; return prism([[z1 + nz, y1 + ny], [z2 + nz, y2 + ny], [z2 - nz, y2 - ny], [z1 - nz, y1 - ny]], w, x, c); }
    var whFullG = mergeGeos([
      [wheelTireG, 0x1a1c1f],
      [whRimG, 0xffffff]
    ]);
    var carWh = inst(whFullG, lam(0xffffff, { vertexColors: true, roughness: 0.65, metalness: 0.25 }), 9000, true, false);

    /* Sedan (+Z forward, bottom y=0, 1.9 x 4.4 footprint) */
    /* ---- Hollow vehicle shells: thin paint panels + pillars (frame), furnished interior, separate translucent glass ---- */
    var CARX = (function () {
      var PI = Math.PI, TAN = 0xc9976a, TAN2 = 0xb07d52, BLK = 0x15171a, DK = 0x24262b, WOOD = 0xa8561f, RED = 0xa01818, GRY = 0x3a3d42;
      function ring(cx, cy, cz, R, t, col, hub, tilt) {
        var out = [], i, g, a, L = 2 * R * Math.tan(PI / 8) + t;
        for (i = 0; i < 8; i++) { a = i * PI / 4; g = new THREE.BoxGeometry(L, t, t); g.rotateZ(a + PI / 2); g.translate(R * Math.cos(a), R * Math.sin(a), 0); g.rotateX(tilt); g.translate(cx, cy, cz); out.push([g, col]); }
        g = new THREE.BoxGeometry(2 * R, t * 0.7, t * 0.7); g.rotateX(tilt); g.translate(cx, cy, cz); out.push([g, hub]);
        g = new THREE.BoxGeometry(t * 0.7, R * 1.0, t * 0.7); g.rotateX(tilt); g.translate(cx, cy - R * 0.5, cz); out.push([g, hub]);
        g = new THREE.BoxGeometry(R * 0.5, R * 0.5, t * 1.6); g.rotateX(tilt); g.translate(cx, cy, cz); out.push([g, DK]);
        return out;
      }
      function seat(x, z, y, w, back) { return [bx(w, 0.16, 0.6, x, y, z, TAN), bx(w, 0.5, 0.14, x, y + 0.33, z - 0.34, TAN2), bx(w * 0.6, 0.14, 0.1, x, y + 0.66, z - 0.34, TAN)]; }
      /* sides: two thin paint walls */
      function sides(h, y, len, z, X) { return [bx(0.07, h, len, -X, y, z, 0xffffff), bx(0.07, h, len, X, y, z, 0xffffff)]; }
      var S = {}, B, D, G;
      /* ---------- Sedan / Mustang (Mercedes 230CE-style coupe) ---------- */
      B = sides(0.63, 0.585, 4.28, 0, 0.89).concat([
        bx(1.82, 0.07, 1.14, 0, 0.9, 1.6, 0xffffff), bx(1.82, 0.07, 0.98, 0, 0.9, -1.67, 0xffffff),
        bx(1.82, 0.62, 0.07, 0, 0.58, 2.14, 0xffffff), bx(1.82, 0.62, 0.07, 0, 0.58, -2.14, 0xffffff),
        bx(1.76, 0.06, 0.96, 0, 1.52, -0.14, 0xffffff)]);
      [-0.86, 0.86].forEach(function (X) { B.push(strut(1.02, 0.9, 0.34, 1.52, 0.09, 0.09, X, 0xffffff), strut(-1.18, 0.9, -0.62, 1.52, 0.1, 0.09, X, 0xffffff), bx(0.09, 0.62, 0.1, X, 1.21, -0.12, 0xffffff)); });
      D = [bx(1.8, 0.06, 4.28, 0, 0.28, 0, 0x191b1e), bx(1.72, 0.03, 2.4, 0, 0.32, 0.0, RED),
        bx(1.74, 0.62, 0.06, 0, 0.58, 1.0, BLK), bx(1.74, 0.62, 0.06, 0, 0.58, -1.18, BLK),
        bx(1.72, 0.22, 0.34, 0, 0.8, 0.8, BLK), bx(1.2, 0.05, 0.05, 0, 0.9, 0.64, WOOD), bx(0.4, 0.12, 0.05, 0.42, 0.88, 0.62, DK),
        bx(0.3, 0.2, 1.0, 0, 0.42, 0.05, DK), bx(0.05, 0.3, 0.05, 0, 0.7, 0.2, 0x9aa2ab), bx(0.09, 0.09, 0.09, 0, 0.88, 0.2, BLK),
        bx(0.04, 0.4, 1.5, -0.86, 0.66, 0.05, DK), bx(0.04, 0.4, 1.5, 0.86, 0.66, 0.05, DK), bx(0.05, 0.06, 0.9, -0.85, 0.74, 0.1, WOOD), bx(0.05, 0.06, 0.9, 0.85, 0.74, 0.1, WOOD),
        bx(1.74, 0.04, 0.9, 0, 1.47, -0.14, 0x8c8678)];
      D = D.concat(seat(0.42, -0.1, 0.48, 0.58), seat(-0.42, -0.1, 0.48, 0.58), seat(0, -0.88, 0.48, 1.5), ring(0.42, 1.04, 0.5, 0.22, 0.045, WOOD, 0xd7d9dd, -0.5));
      G = [strut(1.02, 0.9, 0.34, 1.52, 0.025, 1.62, 0, 0xffffff), strut(-1.18, 0.9, -0.62, 1.52, 0.025, 1.62, 0, 0xffffff)];
      [-0.915, 0.915].forEach(function (X) { G.push(prism([[-1.1, 0.92], [-0.66, 1.5], [-0.2, 1.5], [-0.2, 0.92]], 0.03, X, 0xffffff), prism([[-0.05, 0.92], [-0.05, 1.5], [0.3, 1.5], [0.96, 0.92]], 0.03, X, 0xffffff)); });
      S.sedan = { b: B, d: D, g: G };
      /* ---------- Scout II SUV ---------- */
      B = sides(0.65, 0.6, 4.2, 0, 0.89).concat([
        bx(1.82, 0.07, 1.3, 0, 0.95, 1.45, 0xffffff), bx(1.84, 0.65, 0.07, 0, 0.6, 2.1, 0xffffff), bx(1.84, 0.4, 0.07, 0, 0.7, -2.1, 0xffffff),
        bx(1.82, 0.07, 1.9, 0, 1.74, -1.0, 0xffffff), bx(1.82, 0.32, 0.07, 0, 1.08, -1.97, 0xffffff), bx(1.82, 0.4, 0.07, 0, 1.2, -2.1, 0xffffff)]);
      [-0.89, 0.89].forEach(function (X) { B.push(strut(0.78, 0.92, -0.1, 1.72, 0.1, 0.1, X, 0xffffff), bx(0.1, 0.8, 0.14, X, 1.32, -0.9, 0xffffff), bx(0.1, 0.8, 0.12, X, 1.32, -1.93, 0xffffff)); });
      D = [bx(1.8, 0.06, 4.2, 0, 0.28, 0, 0x191b1e), bx(1.7, 0.03, 3.4, 0, 0.32, -0.3, 0x2b2c30),
        bx(1.74, 0.65, 0.06, 0, 0.6, 0.78, BLK), bx(1.72, 0.24, 0.34, 0, 0.82, 0.6, BLK), bx(0.9, 0.05, 0.05, -0.25, 0.94, 0.45, 0xb9bdc2),
        bx(0.3, 0.22, 1.0, 0, 0.42, -0.1, GRY), bx(0.05, 0.3, 0.05, 0, 0.7, 0.05, 0x9aa2ab), bx(0.09, 0.09, 0.09, 0, 0.88, 0.05, BLK),
        bx(0.04, 0.5, 1.6, -0.85, 0.7, -0.2, GRY), bx(0.04, 0.5, 1.6, 0.85, 0.7, -0.2, GRY), bx(0.05, 0.1, 0.8, -0.84, 0.8, -0.1, WOOD), bx(0.05, 0.1, 0.8, 0.84, 0.8, -0.1, WOOD)];
      D = D.concat(seat(0.42, 0.1, 0.48, 0.58), seat(-0.42, 0.1, 0.48, 0.58), seat(0, -0.95, 0.48, 1.5), ring(0.42, 1.06, 0.4, 0.23, 0.05, BLK, 0x9aa2ab, -0.5));
      G = [strut(0.78, 0.92, -0.1, 1.72, 0.025, 1.64, 0, 0xffffff), bx(1.5, 0.42, 0.03, 0, 1.52, -1.97, 0xffffff)];
      [-0.915, 0.915].forEach(function (X) { G.push(prism([[-0.82, 0.94], [-0.82, 1.7], [-0.16, 1.7], [0.7, 0.94]], 0.03, X, 0xffffff), prism([[-1.88, 0.94], [-1.88, 1.7], [-1.0, 1.7], [-1.0, 0.94]], 0.03, X, 0xffffff)); });
      S.suv = { b: B, d: D, g: G };
      /* ---------- GMC Brigadier cargo truck ---------- */
      B = sides(1.15, 1.12, 2.25, 2.55, 1.2).concat([
        bx(2.44, 1.15, 0.07, 0, 1.12, 3.66, 0xffffff), bx(2.44, 0.07, 0.5, 0, 1.69, 3.44, 0xffffff), bx(2.3, 0.07, 1.8, 0, 2.46, 2.32, 0xffffff), bx(2.3, 0.9, 0.06, 0, 1.95, 1.42, 0xffffff),
        bx(0.07, 2.1, 4.95, -1.3, 2.08, -1.18, 0xdedbd2), bx(0.07, 2.1, 4.95, 1.3, 2.08, -1.18, 0xdedbd2), bx(2.6, 2.1, 0.07, 0, 2.08, -3.65, 0xdedbd2), bx(2.6, 2.1, 0.07, 0, 2.08, 1.3, 0xdedbd2),
        bx(2.62, 0.07, 4.95, 0, 3.15, -1.18, 0xdedbd2), bx(2.6, 0.07, 4.95, 0, 1.0, -1.18, 0xdedbd2)]);
      [-1.13, 1.13].forEach(function (X) { B.push(bx(0.12, 0.8, 0.13, X, 2.07, 3.18, 0xffffff), bx(0.12, 0.8, 0.13, X, 2.07, 1.5, 0xffffff), bx(0.1, 0.8, 0.12, X, 2.07, 2.3, 0xffffff)); });
      D = [bx(2.3, 0.06, 2.25, 0, 0.98, 2.55, 0x191b1e), bx(2.2, 0.03, 2.1, 0, 1.02, 2.5, RED),
        bx(2.2, 0.4, 0.36, 0, 1.5, 3.0, BLK), bx(1.5, 0.05, 0.05, 0, 1.72, 2.82, WOOD), bx(0.5, 0.3, 0.7, 0, 1.2, 2.4, DK), bx(0.06, 0.5, 0.06, 0, 1.6, 2.5, 0x9aa2ab), bx(0.1, 0.1, 0.1, 0, 1.88, 2.5, BLK),
        bx(0.05, 0.6, 1.6, -1.1, 1.35, 2.3, GRY), bx(0.05, 0.6, 1.6, 1.1, 1.35, 2.3, GRY), bx(0.06, 0.1, 1.0, -1.08, 1.5, 2.3, WOOD), bx(0.06, 0.1, 1.0, 1.08, 1.5, 2.3, WOOD)];
      D = D.concat(seat(0.55, 2.45, 1.15, 0.7), seat(-0.55, 2.45, 1.15, 0.7), ring(0.55, 1.86, 2.78, 0.27, 0.06, TAN2, 0xd7d9dd, -0.35));
      G = [bx(2.0, 0.72, 0.03, 0, 2.07, 3.2, 0xffffff), bx(0.03, 0.72, 1.45, -1.14, 2.07, 2.35, 0xffffff), bx(0.03, 0.72, 1.45, 1.14, 2.07, 2.35, 0xffffff), bx(0.03, 0.36, 1.4, -1.22, 1.38, 2.3, 0xffffff), bx(0.03, 0.36, 1.4, 1.22, 1.38, 2.3, 0xffffff)];
      S.truck = { b: B, d: D, g: G };
      function ng(list) { return list.filter(function (it) { return it[1] !== 0x263e52 && it[1] !== 0x38525e && it[1] !== 0x293f52; }); }
      return { s: S, ng: ng };
    })();
    var SEDAN_BODY = [
      bx(1.86, 0.56, 4.32, 0, 0.52, 0, 0xffffff),
      bx(1.74, 0.14, 1.48, 0, 0.85, 1.24, 0xffffff),
      bx(1.74, 0.14, 0.94, 0, 0.85, -1.58, 0xffffff)
    ];
    var SEDAN_DET = [
      prism([[-1.18, 0.9], [-0.62, 1.52], [0.34, 1.52], [1.02, 0.9]], 1.5, 0, 0x263e52),
      bx(1.94, 0.16, 0.22, 0, 0.28, 2.15, 0x2a2d32), bx(1.94, 0.16, 0.22, 0, 0.28, -2.15, 0x2a2d32),
      bx(1.88, 0.08, 2.40, 0, 0.22, 0, 0x191b1e),
      bx(0.92, 0.22, 0.06, 0, 0.54, 2.17, 0x141619),
      bx(0.36, 0.18, 0.06, -0.68, 0.58, 2.17, 0xf2f6ff), bx(0.36, 0.18, 0.06, 0.68, 0.58, 2.17, 0xf2f6ff),
      bx(0.16, 0.08, 0.06, -0.74, 0.44, 2.18, 0xe08420), bx(0.16, 0.08, 0.06, 0.74, 0.44, 2.18, 0xe08420),
      bx(0.36, 0.18, 0.06, -0.68, 0.60, -2.17, 0xc81e1e), bx(0.36, 0.18, 0.06, 0.68, 0.60, -2.17, 0xc81e1e),
      bx(0.46, 0.16, 0.04, 0, 0.30, 2.26, 0xece8d6), bx(0.46, 0.16, 0.04, 0, 0.30, -2.26, 0xece8d6),
      bx(0.12, 0.14, 0.20, -0.98, 0.96, 0.46, 0x202226), bx(0.12, 0.14, 0.20, 0.98, 0.96, 0.46, 0x202226),
      bx(0.06, 0.32, 0.84, -0.94, 0.36, 1.38, 0x141619), bx(0.06, 0.32, 0.84, 0.94, 0.36, 1.38, 0x141619),
      bx(0.06, 0.32, 0.84, -0.94, 0.36, -1.38, 0x141619), bx(0.06, 0.32, 0.84, 0.94, 0.36, -1.38, 0x141619)
    ];
    (function () { var P = [[-1.18, 0.9], [-0.62, 1.52], [0.34, 1.52], [1.02, 0.9]];
      SEDAN_BODY.push(prism([[-0.66, 1.46], [-0.62, 1.52], [0.34, 1.52], [0.38, 1.46]], 1.62, 0, 0xffffff));
      [-0.76, 0.76].forEach(function (X) { SEDAN_BODY.push(strut(P[0][0], P[0][1], P[1][0], P[1][1], 0.1, 0.1, X - 0.05, 0xffffff), strut(P[2][0], P[2][1], P[3][0], P[3][1], 0.1, 0.1, X - 0.05, 0xffffff), strut(-0.12, 0.9, -0.12, 1.5, 0.1, 0.1, X - 0.05, 0xffffff)); });
      SEDAN_BODY.push(prism([[-1.3, 0.88], [-1.18, 0.9], [-0.7, 1.46], [-0.6, 1.46], [-1.1, 0.88]], 1.62, 0, 0xffffff)); })();
    for (var sgi = 0; sgi < 5; sgi++) SEDAN_DET.push(bx(0.84, 0.025, 0.03, 0, 0.46 + sgi * 0.04, 2.19, 0x9aa2ab));
    var sedanBody = inst(mergeGeos(CARX.s.sedan.b), lam(0xffffff, { vertexColors: true, roughness: 0.34, metalness: 0.35 }), 1300, true, true);
    var sedanDet  = inst(mergeGeos(CARX.ng(SEDAN_DET).concat(CARX.s.sedan.d)),  lam(0xffffff, { vertexColors: true, roughness: 0.42, metalness: 0.28 }), 1300, true, false);

    /* Scout II SUV (+Z forward, bottom y=0, 1.9 x 4.4 footprint) */
    var SUV_BODY = [bx(1.85, 0.68, 4.2, 0, 0.56, 0, 0xffffff), bx(1.8, 0.12, 1.35, 0, 0.98, 1.4, 0xffffff), bx(1.9, 0.08, 0.9, 0, 0.93, 1.42, 0xffffff)], SUV_DET = [];
    /* right-trapezoid cabin: vertical rear (right angle at the rear), roof flat, windshield slopes down toward the hood */
    (function () { var T = [[-1.95, 0.92], [-1.95, 1.72], [-0.1, 1.72], [0.78, 0.92]];
      SUV_BODY.push(prism([[-1.95, 1.66], [-1.95, 1.74], [-0.08, 1.74], [-0.04, 1.66]], 1.86, 0, 0xffffff));
      [-0.9, 0.9].forEach(function (X) { SUV_BODY.push(strut(T[1][0] + 0.05, T[1][1], T[1][0] + 0.05, T[0][1], 0.1, 0.1, X - 0.05, 0xffffff), strut(T[2][0], T[2][1], T[3][0], T[3][1], 0.11, 0.1, X - 0.05, 0xffffff), strut(-0.9, 0.92, -0.9, 1.72, 0.1, 0.1, X - 0.05, 0xffffff)); }); })();
    SUV_DET.push(prism([[-1.93, 0.92], [-1.93, 1.7], [-0.1, 1.7], [0.74, 0.92]], 1.76, 0, 0x38525e), bx(1.0, 0.34, 0.06, 0, 0.7, 2.12, 0x1a1b1e), bx(0.34, 0.3, 0.06, -0.78, 0.74, 2.12, 0xf4ead0), bx(0.34, 0.3, 0.06, 0.78, 0.74, 2.12, 0xf4ead0), bx(0.16, 0.1, 0.06, -0.78, 0.5, 2.13, 0xe8892a), bx(0.16, 0.1, 0.06, 0.78, 0.5, 2.13, 0xe8892a),
      bx(1.95, 0.18, 0.22, 0, 0.32, 2.14, 0x8a8d92), bx(1.95, 0.18, 0.22, 0, 0.32, -2.14, 0x8a8d92), bx(0.42, 0.2, 0.04, 0, 0.32, 2.26, 0xe9e6d6), bx(0.2, 0.3, 0.05, -0.78, 0.8, -2.12, 0xc41a1a), bx(0.2, 0.3, 0.05, 0.78, 0.8, -2.12, 0xc41a1a),
      bx(0.1, 0.16, 0.22, -1.0, 1.22, 0.5, 0x222226), bx(0.1, 0.16, 0.22, 1.0, 1.22, 0.5, 0x222226), bx(0.04, 0.04, 2.3, -0.7, 1.72, -0.75, 0x2a2a2e), bx(0.04, 0.04, 2.3, 0.7, 1.72, -0.75, 0x2a2a2e), bx(1.45, 0.04, 0.04, 0, 1.72, -1.6, 0x2a2a2e), bx(1.45, 0.04, 0.04, 0, 1.72, -0.75, 0x2a2a2e), bx(1.45, 0.04, 0.04, 0, 1.72, 0.1, 0x2a2a2e),
      bx(0.06, 0.4, 1.2, -0.93, 0.45, 1.35, 0x15151a), bx(0.06, 0.4, 1.2, 0.93, 0.45, 1.35, 0x15151a), bx(0.06, 0.4, 1.2, -0.93, 0.45, -1.35, 0x15151a), bx(0.06, 0.4, 1.2, 0.93, 0.45, -1.35, 0x15151a));
    /* extra Scout II details: framed headlights, silver grille frame, fender flares, hood ridge, side steps, handles, windshield frame */
    SUV_BODY.push(bx(0.5, 0.06, 1.15, 0, 1.06, 1.45, 0xffffff), bx(0.16, 0.1, 1.3, -0.93, 0.92, 1.35, 0xffffff), bx(0.16, 0.1, 1.3, 0.93, 0.92, 1.35, 0xffffff), bx(0.16, 0.1, 1.3, -0.93, 0.92, -1.35, 0xffffff), bx(0.16, 0.1, 1.3, 0.93, 0.92, -1.35, 0xffffff), bx(0.44, 0.4, 0.05, -0.78, 0.74, 2.09, 0xffffff), bx(0.44, 0.4, 0.05, 0.78, 0.74, 2.09, 0xffffff));
    SUV_DET.push(bx(1.16, 0.44, 0.04, 0, 0.7, 2.1, 0x9ea3ab), bx(0.05, 0.08, 2.0, -0.94, 0.26, -0.7, 0x8a8d92), bx(0.05, 0.08, 2.0, 0.94, 0.26, -0.7, 0x8a8d92), bx(0.04, 0.05, 0.2, -0.93, 1.02, -0.2, 0xb9bdc2), bx(0.04, 0.05, 0.2, 0.93, 1.02, -0.2, 0xb9bdc2), bx(0.04, 0.05, 0.2, -0.93, 1.02, -1.4, 0xb9bdc2), bx(0.04, 0.05, 0.2, 0.93, 1.02, -1.4, 0xb9bdc2), bx(0.12, 0.1, 0.06, -0.78, 0.38, 2.14, 0xf4ead0), bx(0.12, 0.1, 0.06, 0.78, 0.38, 2.14, 0xf4ead0), bx(0.4, 0.2, 0.04, 0, 0.5, -2.26, 0xe9e6d6));
    for (var gi = 0; gi < 7; gi++) SUV_DET.push(bx(0.03, 0.3, 0.02, -0.42 + gi * 0.14, 0.7, 2.16, 0xcfd3d8));
    var suvBody = inst(mergeGeos(CARX.s.suv.b), lam(0xffffff, { vertexColors: true, roughness: 0.38, metalness: 0.3 }), 1300, true, true);
    var suvDet  = inst(mergeGeos(CARX.ng(SUV_DET).concat(CARX.s.suv.d)),  lam(0xffffff, { vertexColors: true, roughness: 0.46, metalness: 0.25 }), 1300, true, false);

    /* Heavy Cargo Truck (+Z forward, bottom y=0, 2.7 x 7.6 footprint) */
    var TRUCK_BODY = [
      bx(2.38, 1.15, 2.25, 0, 1.12, 2.55, 0xffffff),
      bx(2.26, 0.85, 1.75, 0, 2.02, 2.32, 0xffffff),
      bx(2.58, 2.12, 4.95, 0, 2.08, -1.18, 0xdedbd2)
    ];
    var TRUCK_DET = [
      bx(2.20, 0.28, 7.20, 0, 0.56, 0, 0x202328),
      bx(2.50, 0.24, 0.24, 0, 0.48, 3.72, 0x727880), bx(2.58, 0.22, 0.22, 0, 0.48, -3.72, 0x727880),
      bx(2.06, 0.68, 1.62, 0, 2.02, 2.38, 0x293f52),
      bx(1.36, 0.48, 0.06, 0, 1.05, 3.68, 0x16181c),
      bx(0.38, 0.24, 0.06, -0.88, 0.92, 3.68, 0xf6f8ff), bx(0.38, 0.24, 0.06, 0.88, 0.92, 3.68, 0xf6f8ff),
      bx(0.32, 0.22, 0.06, -1.04, 0.82, -3.66, 0xc81e1e), bx(0.32, 0.22, 0.06, 1.04, 0.82, -3.66, 0xc81e1e),
      bx(0.12, 0.42, 0.14, -1.26, 1.85, 2.88, 0x222529), bx(0.12, 0.42, 0.14, 1.26, 1.85, 2.88, 0x222529),
      bx(2.62, 0.10, 5.02, 0, 3.16, -1.18, 0xc8c3b8),
      bx(0.08, 1.98, 0.06, 0, 2.08, -3.67, 0x454950),
      bx(0.46, 0.54, 0.96, -1.18, 0.65, 0.55, 0x626870), bx(0.46, 0.54, 0.96, 1.18, 0.65, 0.55, 0x626870)
    ];
    for (var tgi = 0; tgi < 5; tgi++) TRUCK_DET.push(bx(1.24, 0.03, 0.03, 0, 0.88 + tgi * 0.08, 3.70, 0xa8aeb6));
    var truckBody = inst(mergeGeos(CARX.s.truck.b), lam(0xffffff, { vertexColors: true, roughness: 0.44, metalness: 0.3 }), 1400, true, true);
    var truckDet  = inst(mergeGeos(CARX.ng(TRUCK_DET).concat(CARX.s.truck.d)),  lam(0xffffff, { vertexColors: true, roughness: 0.5, metalness: 0.28 }), 1400, true, false);
    var carCrateM = inst(new THREE.BoxGeometry(1, 1, 1), lam(0xffffff, { roughness: 0.85, metalness: 0.02 }), 128, true, true);
    var CRATEP = { suv: [-1.0, 1.72], sedan: [-0.7, 1.45], mustang: [-0.7, 1.4], truck: [-2.5, 1.7] };
    var carDoorM = inst(new THREE.BoxGeometry(1, 1, 1), lam(0xffffff, { roughness: 0.38, metalness: 0.3 }), 128, true, true);
    var GLM = new THREE.MeshStandardMaterial({ color: 0x7db4e0, transparent: true, opacity: 0.3, roughness: 0.08, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide });
    var sedanGl = inst(mergeGeos(CARX.s.sedan.g), GLM, 1300, true, false), suvGl = inst(mergeGeos(CARX.s.suv.g), GLM, 1300, true, false), truckGl = inst(mergeGeos(CARX.s.truck.g), GLM, 1400, true, false);
    [sedanGl, suvGl, truckGl].forEach(function (m) { m.renderOrder = 3; m.castShadow = false; m.receiveShadow = false; });
    var CARM = [sedanBody, sedanDet, suvBody, suvDet, truckBody, truckDet, sedanGl, suvGl, truckGl]; W.CARM = CARM;
    W.cars = [];
    /* Owned (whole) vehicles use their own instanced meshes that are never baked into static chunks, so they move freely and stay visible */
    function ownMesh(m, cap) { var o = inst(m.geometry, m.material, cap, true, !!m.instanceColor); o.castShadow = m.castShadow; o.receiveShadow = m.receiveShadow; if (m.customDepthMaterial) o.customDepthMaterial = m.customDepthMaterial; return o; }
    var OCARM = CARM.map(function (m) { return ownMesh(m, 128); }), oWh = ownMesh(carWh, 128 * 6); W.OCARM = OCARM;
    var _eu = new THREE.Euler();
    function putWh(m, x, y, z, sx, sy, sz, ry, c, j, idx) {
      var st = 0, roll = 0; if (c.own && c.vs) { st = j < 2 ? c.vs.st * 0.5 : 0; roll = c.vs.roll || 0; }
      P.set(x, y + GYO, z); S.set(sx, sy, sz); Q.setFromEuler(_eu.set(roll, ry + st, 0, 'YXZ')); Mx.compose(P, Q, S); m.setMatrixAt(idx, Mx); m.instanceMatrix.needsUpdate = true;
    }
    function carHide(c) {
      var j;
      if (c.own) { OCARM.forEach(function (m) { put(m, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); }); for (j = 0; j < 6; j++) put(oWh, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 6 * (c.ix - 1000) + j); put(carDoorM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); put(carCrateM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); return; }
      CARM.forEach(function (m) { put(m, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix); });
      for (j = 0; j < 6; j++) put(carWh, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 6 * c.ix + j);
    }
    function carHideOLD(c) {
      var j;
      CARM.forEach(function (m) { put(m, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix); });
      for (j = 0; j < 6; j++) put(carWh, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, 6 * c.ix + j);
      if (c.own) { put(carDoorM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); put(carCrateM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); }
    }
    W.setCar = function (c, on) {
      var y0 = c.y || 0, j, O = !!c.own, ci = O ? c.ix - 1000 : c.ix, MS = O ? OCARM : CARM, mW = O ? oWh : carWh;
      carHide(c);
      if (!on) { c.box.on = false; c.alive = false; return; }
      var bcol = c.burnt ? 0x2a231f : c.col;
      var ry = c.ang != null ? c.ang : (c.horiz ? Math.PI / 2 : 0) + (c.dir < 0 ? Math.PI : 0), sn = Math.sin(ry), cs = Math.cos(ry);
      function at(lx, lz) { return [c.x + sn * lz + cs * lx, c.z + cs * lz - sn * lx]; }
      if (c.truck) {
        put(MS[4], c.x, y0, c.z, 1, 1, 1, ry, bcol, ci);
        put(MS[8], c.x, y0, c.z, 1, 1, 1, ry, null, ci); if (!c.burnt) put(MS[5], c.x, y0, c.z, 1, 1, 1, ry, null, ci);
        var twPos = [[-1.18, 2.45], [1.18, 2.45], [-1.18, -0.95], [1.18, -0.95], [-1.18, -2.55], [1.18, -2.55]];
        for (j = 0; j < 6; j++) { var tw = at(twPos[j][0], twPos[j][1]); if (O) putWh(mW, tw[0], y0, tw[1], 1.28, 1.32, 1.32, ry, c, j, 6 * ci + j); else put(mW, tw[0], y0, tw[1], 1.28, 1.32, 1.32, ry, null, 6 * ci + j); }
      } else if (c.suv) {
        put(MS[2], c.x, y0, c.z, 1, 1, 1, ry, bcol, ci);
        put(MS[7], c.x, y0, c.z, 1, 1, 1, ry, null, ci); if (!c.burnt) put(MS[3], c.x, y0, c.z, 1, 1, 1, ry, null, ci);
        var swPos = [[-0.93, 1.35], [0.93, 1.35], [-0.93, -1.35], [0.93, -1.35]];
        for (j = 0; j < 4; j++) { var sw = at(swPos[j][0], swPos[j][1]); if (O) putWh(mW, sw[0], y0, sw[1], 1.08, 1.26, 1.26, ry, c, j, 6 * ci + j); else put(mW, sw[0], y0, sw[1], 1.08, 1.26, 1.26, ry, null, 6 * ci + j); }
      } else {
        put(MS[0], c.x, y0, c.z, 1, 1, 1, ry, bcol, ci);
        put(MS[6], c.x, y0, c.z, 1, 1, 1, ry, null, ci); if (!c.burnt) put(MS[1], c.x, y0, c.z, 1, 1, 1, ry, null, ci);
        var cwPos = [[-0.90, 1.38], [0.90, 1.38], [-0.90, -1.38], [0.90, -1.38]];
        for (j = 0; j < 4; j++) { var cw = at(cwPos[j][0], cwPos[j][1]); if (O) putWh(mW, cw[0], y0, cw[1], 0.96, 1.02, 1.02, ry, c, j, 6 * ci + j); else put(mW, cw[0], y0, cw[1], 0.96, 1.02, 1.02, ry, null, 6 * ci + j); }
      }
      if (c.own && c.vs && c.vs.doorA > 0.02 && !c.burnt) {
        var th = c.vs.doorA * 1.15, hl = c.truck ? 3.0 : c.suv ? 0.92 : 0.78, hx = c.truck ? 1.28 : 0.97, dl = c.truck ? 1.5 : 1.12, dc = at(hx + dl / 2 * Math.sin(th), hl - dl / 2 * Math.cos(th));
        put(carDoorM, dc[0], y0 + (c.truck ? 1.9 : 0.75), dc[1], 0.06, c.truck ? 1.2 : 0.8, dl, ry - th, c.col, c.ix - 1000);
      } else if (c.own) put(carDoorM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000);
      if (c.own) { if (c.crate && !c.burnt) { var cp = CRATEP[c.kind] || CRATEP.suv, cc2 = at(0, cp[0]); put(carCrateM, cc2[0], y0 + cp[1] + 0.27, cc2[1], 1.05, 0.54, 1.05, ry, 0x9a7348, c.ix - 1000); } else put(carCrateM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix - 1000); }
      c.box.on = c.ang == null; c.alive = true;
    };
    /* re-register a car's collision box after it was driven (snapped to an axis) */
    W.relocCar = function (c) {
      var b = c.box, cx, cz; sgrid.forEach(function (l) { var i = l.indexOf(b); if (i >= 0) l.splice(i, 1); });
      b.x0 = c.x - c.lx / 2; b.x1 = c.x + c.lx / 2; b.z0 = c.z - c.lz / 2; b.z1 = c.z + c.lz / 2; b.y0 = (c.y || 0) + GYO; b.y1 = (c.y || 0) + (c.truck ? 3.2 : 1.75) + GYO;
      for (cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) for (cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) { var k = ck(cx, cz), l = sgrid.get(k); if (!l) { l = []; sgrid.set(k, l); } l.push(b); }
      b.on = true;
    };

    /* ---- Whole (owned) vehicles: placed by the player, drivable, own fuel/engine state ---- */
    var OSPEC = { suv: { lx: 1.9, lz: 4.4, h: 1.75 }, sedan: { lx: 1.9, lz: 4.4, h: 1.5 }, mustang: { lx: 1.9, lz: 4.4, h: 1.45 }, truck: { lx: 2.7, lz: 7.6, h: 3.2 } };
    W.newVS = function (kind) { return { cond: 100, hb: false, blown: false, ag: 1, door: false, doorA: 0, seated: false, key: false, eng: false, crank: 0, rpm: 0, gear: 1, fuel: 0, fuelT: kind === 'truck' ? 'diesel' : 'gasoline', heat: 0, odo: 0, v: 0, st: 0, stall: 0, bump: 0 }; };
    W.reattachCar = function (c) {
      var ix, j; if (W.ocars.indexOf(c) < 0) W.ocars.push(c); ix = 1000 + W.ocars.indexOf(c); c.ix = ix;
      OCARM.forEach(function (m) { m.count = Math.max(m.count, ix - 999); }); oWh.count = Math.max(oWh.count, 6 * (ix - 999)); carDoorM.count = Math.max(carDoorM.count, ix - 999); carCrateM.count = Math.max(carCrateM.count, ix - 999); 
      c.box = addBox(c.x - c.lx / 2, c.x + c.lx / 2, c.y || 0, (c.y || 0) + c.h, c.z - c.lz / 2, c.z + c.lz / 2, true);
      W.setCar(c, true); addEnt(c);
    };
    W.addOwnedCar = function (kind, x, z, ang, col, hp) {
      var k = ((Math.round(ang / (Math.PI / 2)) % 4) + 4) % 4, horiz = k === 1 || k === 3, sp = OSPEC[kind] || OSPEC.suv, c;
      c = { k: 'car', own: true, kind: kind, truck: kind === 'truck', suv: kind === 'suv', idx: -1, x: x, z: z, y: W.gh ? Math.max(0, W.gh(x, z)) : 0, dir: (k === 0 || k === 1) ? 1 : -1, horiz: horiz, r: kind === 'truck' ? 3.4 : 1.9, h: sp.h, lx: horiz ? sp.lz : sp.lx, lz: horiz ? sp.lx : sp.lz, alive: true, dyn: true, respawn: 0, col: col || 0x4f6b52, max: 60, hp: hp != null ? hp : 60, vs: W.newVS(kind) };
      W.reattachCar(c); return c;
    };
    W.ownedCarFree = function (x, z, ang, kind) { var sp = OSPEC[kind] || OSPEC.suv, k = Math.round(ang / (Math.PI / 2)), h = k % 2 !== 0, hx = (h ? sp.lz : sp.lx) / 2, hz = (h ? sp.lx : sp.lz) / 2, y = W.gh ? W.gh(x, z) : 0; return !W.hit(x - hx, x + hx, y + 1.05, y + 1.6, z - hz, z + hz); };
    function addCar(x, z, horiz, rng, truck) {
      var c = { k: 'car', truck: !!truck, idx: W.cars.length, x: x, z: z, y: 0, dir: rng() < 0.5 ? -1 : 1, r: truck ? 3.4 : 1.9, h: truck ? 3.2 : 1.75, horiz: horiz, lx: truck ? (horiz ? 7.6 : 2.7) : (horiz ? 4.4 : 1.9), lz: truck ? (horiz ? 2.7 : 7.6) : (horiz ? 1.9 : 4.4), alive: true, dyn: true, respawn: 0, col: truck ? pick([0xb5b0a4, 0xa34f3a, 0x3b5f8a, 0xc9a23a], rng) : pick([0x943636, 0x386191, 0x808036, 0x676d73, 0x9c9c94, 0x4b704b], rng) };
      c.suv = !truck && ((Math.floor(x * 7) + Math.floor(z * 13)) % 10 + 10) % 10 < 3; if (c.suv) c.col = [0xe6d5c0, 0xd9c7b0, 0xc9b5a8, 0x9aa7b0, 0xb8452f, 0x4f6b52][((Math.floor(x) * 31 + Math.floor(z)) % 6 + 6) % 6];
      c.max = c.hp = truck ? 30 + Math.floor(rng() * 21) : 10 + Math.floor(rng() * 16);
      c.ix = W.cars.length;
      CARM.forEach(function (m) { m.count = Math.max(m.count, c.ix + 1); });
      carWh.count = Math.max(carWh.count, 6 * c.ix + 6);
      c.box = addBox(x - c.lx / 2, x + c.lx / 2, 0, c.truck ? 3.2 : 1.75, z - c.lz / 2, z + c.lz / 2, true);
      W.setCar(c, true); addEnt(c); W.cars.push(c);
    }

    /* ---- Gas Station: canopy, shop and 4 Fuel Pump Stations (1x1x2) holding 1-10 L of Gasoline or Diesel ---- */
    function addGasStation(cx, cz) {
      var gr = mulberry(((Math.floor(cx) * 83492791) ^ (Math.floor(cz) * 2654435761) ^ CSD) >>> 0), pxs = [-5.4, -1.8, 1.8, 5.4];
      put(walls, cx, -0.1, cz, 36, 0.5, 30, 0, 0x4a4d52); W.noGrass.push([cx - 18, cx + 18, cz - 15, cz + 15]);
      put(walls, cx, 5.2, cz - 5, 17, 0.5, 9.5, 0, 0xc23b2e); put(walls, cx, 4.9, cz - 5, 17.2, 0.12, 9.7, 0, 0xf2f2f2);
      [[-8, -9], [8, -9], [-8, -1], [8, -1]].forEach(function (p) { put(walls, cx + p[0], 2.5, cz + p[1], 0.5, 5, 0.5, 0, 0xd9d9d9); addBox(cx + p[0] - 0.25, cx + p[0] + 0.25, 0, 5, cz + p[1] - 0.25, cz + p[1] + 0.25, false); });
      [-3.6, 3.6].forEach(function (ix) { put(walls, cx + ix, 0.1, cz - 4, 1.6, 0.2, 7, 0, 0x8d9096); });
      wallSeg(cx - 9, cx + 9, cz + 6, cz + 12, 0, 3.6, 0xe4dccb); put(walls, cx, 3.9, cz + 9, 19, 0.5, 7, 0, 0xc23b2e);
      put(walls, cx, 2.2, cz + 5.9, 6, 1.2, 0.1, 0, 0x2a3c4a);
      put(walls, cx - 15, 4.2, cz - 10, 0.35, 8.4, 0.35, 0, 0x6f7378); put(walls, cx - 15, 8.3, cz - 10, 3, 1.8, 0.35, 0, 0xf2f2f2); put(walls, cx - 15, 8.3, cz - 10, 2.6, 1.4, 0.4, 0, 0xc23b2e);
      addBox(cx - 15.2, cx - 14.8, 0, 8, cz - 10.2, cz - 9.8, false);
      occupied.push([cx - 18, cx + 18, cz - 15, cz + 15]); W.rects.push({ x0: cx - 18, x1: cx + 18, z0: cz - 15, z1: cz + 15, c: '#4a4d52' });
      pxs.forEach(function (px) {
        var fuel = gr() < 0.65 ? 'gasoline' : 'diesel', L = Math.round((1 + gr() * 9) * 10) / 10, x = cx + px, z = cz - 4, top = fuel === 'gasoline' ? 0x3fae56 : 0xd9b21f;
        put(walls, x, 0.8, z, 0.7, 1.6, 0.5, 0, 0xd8d4c8); put(walls, x, 1.62, z, 0.74, 0.18, 0.54, 0, top); put(walls, x, 1.05, z + 0.26, 0.4, 0.3, 0.04, 0, 0x1c2a22); put(walls, x + 0.3, 0.9, z + 0.3, 0.06, 0.5, 0.06, 0, 0x2b2e33);
        var e = { k: 'pump', x: x, z: z, y: 0, r: 0.95, h: 2, alive: true, clean: true, fuel: fuel, L: L, max: L, pi: W.pumps.length };
        e.box = addBox(x - 0.36, x + 0.36, 0, 2, z - 0.28, z + 0.28, false); addEnt(e); W.pumps.push(e);
      });
      W.gasStations.push({ x: cx, z: cz });
    }
    W.gasStations = [];
    var lakeList = [];
    /* Graveyards: fixed spots (about 2% of the blocks outside the city centre). Zombies also spawn from them. */
    W.graves = [];
    function addGraveyard(cx, cz, x0, x1, z0, z1) {
      var gr = mulberry(((Math.floor(cx) * 73856093) ^ (Math.floor(cz) * 19349663) ^ CSD) >>> 0), hw = Math.min(x1 - x0, 44) / 2, hd = Math.min(z1 - z0, 44) / 2, gx, gz;
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
        else if (roll >= 0.9 && mulberry(((Math.floor(cx) * 668265263) ^ (Math.floor(cz) * 374761393) ^ CSD) >>> 0)() < 0.7) addGasStation(cx, cz);
        else if (roll < 0.9) { var mx2 = (bx0 + bx1) / 2, mz2 = (bz0 + bz1) / 2; [[mx2 - 12, mz2 - 12], [mx2 + 12, mz2 - 12], [mx2 - 12, mz2 + 12], [mx2 + 12, mz2 + 12]].forEach(function (q, qi) { if (R() < 0.85) house(q[0] + rr(-1.5, 1.5), q[1] + rr(-1.5, 1.5), qi < 2 ? 's' : 'n', 'mid'); }); }
      } else {
        var mx3 = (bx0 + bx1) / 2, mz3 = (bz0 + bz1) / 2;
        [[mx3 - 12, mz3 - 12], [mx3 + 12, mz3 - 12], [mx3 - 12, mz3 + 12], [mx3 + 12, mz3 + 12]].forEach(function (q) { if (R() < (curBiome === 'jungle' ? 0.5 : 0.4)) house(q[0] + rr(-2, 2), q[1] + rr(-2, 2), pick(['n', 's', 'e', 'w']), 'out'); });
      }
    }
    /* ---------------- Lakes, river and the mineshaft ---------------- */
    W.waterMeshes = [];
    var waterMat = lam(0x2d7da6, { transparent: true, opacity: 0.84, roughness: 0.14, metalness: 0.18, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    W.waterMat = waterMat;
    var shoreMat = lam(0x8a8460, { bumpMap: sharedBump, bumpScale: 0.02, roughness: 0.94, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    function addWater(x0, x1, z0, z1, type) {
      var sh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 3, z1 - z0 + 3), shoreMat); sh.rotation.x = -Math.PI / 2; sh.position.set((x0 + x1) / 2, 0.042, (z0 + z1) / 2); scene.add(sh);
      var wm = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), waterMat); W.waterMeshes.push(wm); wm.rotation.x = -Math.PI / 2; wm.position.set((x0 + x1) / 2, 0.075, (z0 + z1) / 2); scene.add(wm);
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
      W.mine = { maxLayer: 6, x0: MCX - 26, x1: MCX + 26, z0: MCZ - 24, z1: MCZ + 18, door: { x: MCX, z: MCZ + 2.6 }, entrance: { x: MCX, z: MCZ + 8 } };
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
          wallSeg(x - 9, x + 9, z - 8, z + 8, -3.4, 0.06, 0x827d73); house(x, z, ['n', 's', 'e', 'w'][(BR() * 4) | 0], 'out'); GYO = 0; curBiome = 'city';
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
      var dirtTex = canvasTex(256, 256, function (g, w, h) {
        var r = mulberry(31); g.fillStyle = '#6a4a2c'; g.fillRect(0, 0, w, h);
        var cols = ['#523720', '#7d5a36', '#3f2a17', '#8c6840', '#5f4126'];
        for (var q = 0; q < 1800; q++) { g.fillStyle = cols[(r() * 5) | 0]; g.fillRect(r() * w, r() * h, 2 + r() * 10, 2 + r() * 8); }
        for (q = 0; q < 520; q++) { g.fillStyle = r() < 0.5 ? '#2c1d10' : '#a07a4c'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
      });
      var ugWalls = inst(box1, lam(0xffffff, { map: dirtTex, bumpMap: sharedBump, bumpScale: 0.04, roughness: 0.94 }), 40000, false, true); W.ugL = []; W.traps = []; W.ugWalls = ugWalls;
      function uw(x0, x1, z0, z1, y0, y1, col) { put(ugWalls, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, col); addBox(x0, x1, y0, y1, z0, z1, false); }
      for (var LY = 0; LY < 3; LY++) {
      var N = 61, CS = 6, UH = 5, UX = 2700 + LY * 420, UZ = -183, grid = [], i, j;
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
      var ugFloor = new THREE.Mesh(new THREE.PlaneGeometry(N * CS + 8, N * CS + 8), lam(0xcdb8a0, { bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.95, map: (function () { var t = dirtTex.clone(); t.needsUpdate = true; t.repeat.set(60, 60); return t; })() })); ugFloor.rotation.x = -Math.PI / 2; ugFloor.position.set(UX + N * CS / 2, 0.03, UZ + N * CS / 2); ugFloor.visible = false; scene.add(ugFloor);
      put(walls, cx(1), 1.2, cz(1), 1.4, 2.4, 0.5, 0, 0xc9a23a); /* up / exit marker */
      var far = open[0], fd = -1; open.forEach(function (c) { var dd = Math.hypot(c[0] - cx(3), c[1] - cz(3)); if (dd > fd) { fd = dd; far = c; } });
      var L = { x0: UX, z0: UZ, x1: UX + N * CS, z1: UZ + N * CS, spawn: { x: cx(3), z: cz(3) }, exit: { x: cx(1), z: cz(1) }, open: open, floor: ugFloor, idx: LY, name: ['Underground', 'Deeper Underground', 'Undershaft'][LY] };
      if (LY < 2) { L.down = { x: far[0], z: far[1] }; put(walls, far[0], 1.2, far[1], 1.4, 2.4, 0.5, 0, 0x2f9bff); put(walls, far[0], 0.05, far[1], 2.6, 0.1, 2.6, 0, 0x1b5fa8); }
      var ntr = [14, 34, 56][LY], tt = 0;
      while (tt < ntr) { var tc = open[(MR() * open.length) | 0], tx2 = tc[0] + (MR() - 0.5) * 3, tz2 = tc[1] + (MR() - 0.5) * 3; if (Math.hypot(tx2 - cx(3), tz2 - cz(3)) < 14) continue; put(walls, tx2, 0.045, tz2, 1.7, 0.05, 1.7, 0, 0x4a3f33); put(walls, tx2, 0.05, tz2, 0.12, 0.06, 1.5, 0.7, 0x16110c); W.traps.push({ x: tx2, z: tz2, layer: LY, st: 0, t: 0 }); tt++; }
      W.ugL.push(L); if (LY === 0) W.ug = L;
      }
      W.ug.all = { x1: W.ugL[2].x1 };
    })();
    var roofMat = lam(0xffffff, { vertexColors: true, bumpMap: sharedBump, bumpScale: 0.02, roughness: 0.9 });
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
        if (m.userData && m.userData.noCast) im.userData.noCast = true;
        if (ca) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(l.ids.length * 3), 3);
        for (var j = 0; j < l.ids.length; j++) { var s0 = l.ids[j] * 16; for (var q = 0; q < 16; q++) im.instanceMatrix.array[j * 16 + q] = a[s0 + q]; if (ca) for (var u = 0; u < 3; u++) im.instanceColor.array[j * 3 + u] = ca[l.ids[j] * 3 + u]; }
        chunkAt(l.cx, l.cz).g.add(im);
      });
      scene.remove(m); m.visible = false;
    }
    [walls, winM, dashes, W.ugWalls, bedM, couchM, junMaskM].forEach(function (m) { if (m) bake(m); });
    /* Chunk visibility + range-based shader/shadow culling: Render Distance (rd) & Shader Render Range (sr) */
    W.updateChunks = function (px, pz, fx, fz, rd, cull, sr, smOn) {
      var lim = rd >= 9999 ? 1e9 : (rd + 0.9) * CH, fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl; var shown = 0;
      var srLim = smOn ? ((sr || 5) + 0.6) * CH : -1;
      W.chunks.forEach(function (c) {
        var dx = (c.cx + 0.5) * CH - px, dz = (c.cz + 0.5) * CH - pz, d = Math.hypot(dx, dz), v = d < lim;
        if (v && cull && (dx * fx + dz * fz) < -CH) v = false; /* 180-degree back culling with 1 chunk of slack */
        if (v !== c.vis) { c.vis = v; c.g.visible = v; }
        var sh = v && smOn && d < srLim;
        if (sh !== c.shVis) {
          c.shVis = sh;
          var kids = c.g.children;
          for (var i = 0; i < kids.length; i++) {
            var o = kids[i];
            if (o.userData && o.userData.noCast) { o.castShadow = false; o.receiveShadow = sh; }
            else { o.castShadow = sh; o.receiveShadow = sh; }
          }
        }
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
          else { var kk = q < 83 ? 'stone' : q < 88 ? 'copper' : q < 91 ? 'iron' : q < 93 ? 'permafrost' : q < 94 ? 'diamond' : q < 95 ? 'ruby' : q < 96 ? 'emerald' : q < 97 ? 'amethyst' : q < 98 ? 'sapphire' : q < 99 ? 'topaz' : 'amber'; addRock(mx, mz, kk, Rn, gy); }
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
      W.ugL.forEach(function (Ly, li) { var ugn = 0, ugt = 0, uo = Ly.open, cap = [260, 300, 340][li]; while (ugn < cap && ugt++ < 6000) { var oc = uo[(Rn() * uo.length) | 0], ox = oc[0] + rr(-1.4, 1.4, Rn), oz = oc[1] + rr(-1.4, 1.4, Rn); if (W.hit(ox - 1.8, ox + 1.8, 0.1, 1.8, oz - 1.8, oz + 1.8)) continue; addRock(ox, oz, rollUgOre(Rn, li), Rn); ugn++; } });
      /* liquid pools: lava (Undershaft), acid + crude oil (Deeper Underground), crude oil (desert), honey (jungle) */
      (function () {
        var PC = { lava: [0xff5a10, 0xff4500, 0.9], acid: [0x9cff1a, 0x62cc12, 0.6], oil: [0x15110d, 0x000000, 0], honey: [0xe8a317, 0x452b02, 0.15] };
        function pool(x, z, r, type, y) {
          var sp = PC[type], mat = lam(sp[0], { emissive: sp[1], emissiveIntensity: sp[2], roughness: type === 'oil' ? 0.12 : 0.25, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
          var m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.075, z); scene.add(m);
          W.pools.push({ x: x, z: z, r: r, type: type, y: y, m: m });
        }
        function ug(li, type, n, r) { var Ly = W.ugL[li], k = 0, t = 0; while (k < n && t++ < 3000) { var c = Ly.open[(Rn() * Ly.open.length) | 0], x = c[0] + rr(-1.2, 1.2, Rn), z = c[1] + rr(-1.2, 1.2, Rn); if (Math.hypot(x - Ly.spawn.x, z - Ly.spawn.z) < 18 || W.hit(x - r, x + r, 0.1, 1.5, z - r, z + r)) continue; pool(x, z, r, type, 0); k++; } }
        ug(2, 'lava', 14, 2.4); ug(1, 'acid', 12, 2); ug(1, 'oil', 8, 2.2);
        function surf(biome, type, n, r) { var k = 0, t = 0; while (k < n && t++ < 6000) { var x = rr(-HALF + 60, HALF - 60, Rn), z = rr(-HALF + 60, HALF - 60, Rn); if (WZ.TERRAIN.biome(x, z) !== biome || Math.max(Math.abs(x), Math.abs(z)) < 700 || (W.onRoad && W.onRoad(x, z, r + 2)) || !free(x, z, r + 1)) continue; pool(x, z, r, type, WZ.TERRAIN.gh(x, z)); k++; } }
        surf('desert', 'oil', 10, 2.2); surf('jungle', 'honey', 10, 1.5);
      })();
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
      bakeAllDynPools();
    }
    var DYN_INSTS = [trunkM, crownM, crown2M, cactM, armM, vineM, frondM, leafM, leaf2M, rockM, pileM, bushPileM, shineM, tableM, tlegM, crateM, lidM, carWh, sedanBody, sedanDet, suvBody, suvDet, truckBody, truckDet];
    var dynBakedMeshes = [], leaf2Chunks = [];
    function bakeDynPool(m) {
      var n = m.count, a = m.instanceMatrix.array, ca = m.instanceColor ? m.instanceColor.array : null;
      var bs = new Map(), map = new Array(n), i;
      for (i = 0; i < n; i++) {
        if (a[i * 16 + 13] < -40) continue;
        var cx = Math.floor(a[i * 16 + 12] / CH), cz = Math.floor(a[i * 16 + 14] / CH);
        var k = ck(cx, cz), l = bs.get(k);
        if (!l) { l = { cx: cx, cz: cz, ids: [] }; bs.set(k, l); }
        l.ids.push(i);
      }
      bs.forEach(function (l) {
        var im = new THREE.InstancedMesh(m.geometry, m.material, l.ids.length);
        im.frustumCulled = false;
        im.castShadow = !!m.castShadow;
        im.receiveShadow = !!m.receiveShadow;
        if (m.customDepthMaterial) im.customDepthMaterial = m.customDepthMaterial;
        if (ca) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(l.ids.length * 3), 3);
        for (var j = 0; j < l.ids.length; j++) {
          var gi = l.ids[j], s0 = gi * 16;
          for (var q = 0; q < 16; q++) im.instanceMatrix.array[j * 16 + q] = a[s0 + q];
          if (ca) for (var u = 0; u < 3; u++) im.instanceColor.array[j * 3 + u] = ca[gi * 3 + u];
          map[gi] = { im: im, idx: j };
        }
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        if (m === leaf2M) { im.visible = leaf2M.visible; leaf2Chunks.push(im); }
        chunkAt(l.cx, l.cz).g.add(im);
        dynBakedMeshes.push(im);
      });
      m._map = map;
      scene.remove(m);
      m.visible = false;
    }
    function bakeAllDynPools() {
      DYN_INSTS.forEach(bakeDynPool);
    }
    W.setExtraLeaves = function (on) {
      leaf2M.visible = !!on;
      leaf2Chunks.forEach(function (im) { im.visible = !!on; });
    };
    spawnNature(initSeed != null ? initSeed : rndSeed(), false);
    function stoneBT(base, seed) { return canvasTex(64, 64, function (g, w, h) { var r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, w, h); for (var i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.1)'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4); } }); }
    function brickBT(base, mortar, seed) { return canvasTex(64, 64, function (g, w, h) { var r = mulberry(seed); g.fillStyle = mortar; g.fillRect(0, 0, w, h); for (var y = 0; y < 4; y++) for (var x = -1; x < 3; x++) { var ox = (y % 2) * 16; g.fillStyle = base; g.fillRect(x * 32 + ox + 1, y * 16 + 1, 30, 14); for (var k = 0; k < 6; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.1)'; g.fillRect(x * 32 + ox + 2 + r() * 24, y * 16 + 2 + r() * 10, 3, 2); } } }); }
    var BLKTEX = { 33: stoneBT('#b98a6a', 1), 34: stoneBT('#a2a6a9', 2), 35: stoneBT('#cfcfca', 3), 36: stoneBT('#f1f1ec', 4), 37: brickBT('#8d9198', '#5c5f64', 5), 38: brickBT('#a8452f', '#cfc7bb', 6), 39: brickBT('#b98a6a', '#6a5040', 7), 40: brickBT('#a2a6a9', '#5f6264', 8), 41: brickBT('#cfcfca', '#7d7d7a', 9), 42: brickBT('#f1f1ec', '#a8a8a2', 10) };

    /* Multi-part grounded PBR geometries for Craft Stations, Traps, Turrets, Storage Chests & Props (cell-centered, min.y = -0.5) */
    function vPart(rough, metal) { return lam(0xffffff, { vertexColors: true, roughness: rough == null ? 0.72 : rough, metalness: metal == null ? 0.15 : metal }); }
    function rotGeoX(g, a) { g.rotateX(a); return g; }
    function rotGeoZ(g, a) { g.rotateZ(a); return g; }
    function rotGeoY(g, a) { g.rotateY(a); return g; }
    function spikeC(rTop, rBot, h, px, py, pz, rx, rz, c) {
      var g = new THREE.CylinderGeometry(rTop, rBot, h, 7);
      if (rx) g.rotateX(rx);
      if (rz) g.rotateZ(rz);
      g.translate(px, py, pz);
      return [g, c];
    }
    function ringTorus(r, tube, px, py, pz, rx, ry, c) {
      var g = new THREE.TorusGeometry(r, tube, 6, 12);
      if (rx) g.rotateX(rx);
      if (ry) g.rotateY(ry);
      g.translate(px, py, pz);
      return [g, c];
    }
    var gFurn = mergeGeos([bx(0.94, 0.94, 0.94, 0, -0.03, 0, 0x56524e), bx(0.56, 0.42, 0.08, 0, -0.22, 0.47, 0x1e1a17), bx(0.42, 0.28, 0.05, 0, -0.22, 0.49, 0xff6a14), bx(0.32, 0.18, 0.32, 0, 0.48, -0.15, 0x3b3835)]);
    var gCamp = mergeGeos([cyl(0.08, 0.72, 0, -0.42, 0, 0x6b4728, 8), bx(0.72, 0.14, 0.16, 0, -0.42, 0, 0x5c3c20), bx(0.16, 0.14, 0.72, 0, -0.42, 0, 0x5c3c20), cylY(0.02, 0.24, 0.56, 0, -0.12, 0, 0xff6a14, 8), cylY(0.01, 0.14, 0.36, 0, -0.16, 0, 0xffd24a, 6)]);
    var gAnvil = mergeGeos([bx(0.72, 0.2, 0.52, 0, -0.4, 0, 0x26292e), bx(0.36, 0.38, 0.32, 0, -0.12, 0, 0x32363d), bx(0.88, 0.24, 0.4, 0.04, 0.18, 0, 0x454a52), bx(0.34, 0.14, 0.2, 0.52, 0.22, 0, 0x545a64)]);
    var gComp = mergeGeos([bx(0.92, 0.1, 0.72, 0, -0.02, 0, 0x705032), bx(0.1, 0.46, 0.1, -0.38, -0.27, -0.28, 0x45301e), bx(0.1, 0.46, 0.1, 0.38, -0.27, -0.28, 0x45301e), bx(0.1, 0.46, 0.1, -0.38, -0.27, 0.28, 0x45301e), bx(0.1, 0.46, 0.1, 0.38, -0.27, 0.28, 0x45301e), bx(0.62, 0.42, 0.08, 0, 0.24, -0.14, 0x1b2026), bx(0.52, 0.32, 0.04, 0, 0.24, -0.11, 0x3ad0a0), bx(0.48, 0.04, 0.2, 0, 0.05, 0.14, 0x2a2f36)]);
    var gSink = mergeGeos([bx(0.9, 0.88, 0.78, 0, -0.06, 0, 0xc8cfd6), bx(0.68, 0.08, 0.52, 0, 0.36, 0.04, 0x49a6e8), bx(0.1, 0.22, 0.1, 0, 0.46, -0.26, 0x8d959e), bx(0.08, 0.06, 0.2, 0, 0.54, -0.18, 0x8d959e)]);
    var gSaw = mergeGeos([bx(0.96, 0.12, 0.82, 0, 0.02, 0, 0x8c5e35), bx(0.12, 0.52, 0.12, -0.38, -0.24, -0.3, 0x5c3c20), bx(0.12, 0.52, 0.12, 0.38, -0.24, -0.3, 0x5c3c20), bx(0.12, 0.52, 0.12, -0.38, -0.24, 0.3, 0x5c3c20), bx(0.12, 0.52, 0.12, 0.38, -0.24, 0.3, 0x5c3c20), cyl(0.24, 0.04, 0, 0.16, 0, 0xc2c8d0, 14)]);
    var gTbench = mergeGeos([bx(0.96, 0.12, 0.82, 0, 0.04, 0, 0x4e5864), bx(0.12, 0.54, 0.12, -0.38, -0.23, -0.3, 0x2f353d), bx(0.12, 0.54, 0.12, 0.38, -0.23, -0.3, 0x2f353d), bx(0.12, 0.54, 0.12, -0.38, -0.23, 0.3, 0x2f353d), bx(0.12, 0.54, 0.12, 0.38, -0.23, 0.3, 0x2f353d), bx(0.32, 0.14, 0.22, -0.24, 0.17, 0.18, 0xd28a2a), bx(0.28, 0.08, 0.36, 0.24, 0.14, -0.1, 0xa2abb5)]);
    var gTnt = (function () {
      var pts = [
        bx(0.88, 0.12, 0.88, 0, -0.44, 0, 0x8f6234),
        bx(0.88, 0.12, 0.88, 0, 0.38, 0, 0x8f6234),
        bx(0.92, 0.08, 0.92, 0, -0.24, 0, 0x26292e),
        bx(0.92, 0.08, 0.92, 0, 0.18, 0, 0x26292e)
      ];
      for (var ix = -1; ix <= 1; ix++) for (var iz = -1; iz <= 1; iz++) {
        pts.push(cylY(0.12, 0.12, 0.72, ix * 0.25, -0.03, iz * 0.25, (ix + iz) % 2 ? 0xb82424 : 0xd42c2c, 8));
      }
      pts.push(cylY(0.03, 0.03, 0.14, 0, 0.46, 0, 0xe8dcc2, 6), sph(0.045, 0, 0.50, 0, 1, 1, 1, 0xff922a, 6));
      return mergeGeos(pts);
    })();
    var gWoodSpike = (function () {
      var pts = [bx(0.92, 0.06, 0.16, 0, -0.47, -0.28, 0x5a3b1e), bx(0.92, 0.06, 0.16, 0, -0.47, 0.28, 0x5a3b1e), bx(0.16, 0.06, 0.92, -0.28, -0.47, 0, 0x5a3b1e), bx(0.16, 0.06, 0.92, 0.28, -0.47, 0, 0x5a3b1e)];
      [[-0.28, -0.28, 0.16, 0.16], [0, -0.28, 0.18, 0], [0.28, -0.28, 0.16, -0.16], [-0.28, 0, 0, 0.18], [0, 0, 0, 0], [0.28, 0, 0, -0.18], [-0.28, 0.28, -0.16, 0.16], [0, 0.28, -0.18, 0], [0.28, 0.28, -0.16, -0.16]].forEach(function (s) {
        pts.push(spikeC(0.012, 0.065, 0.42, s[0], -0.28, s[1], s[2], s[3], 0x8c5e34));
      });
      return mergeGeos(pts);
    })();
    var gPalmRoot = (function () {
      var pts = [bx(0.94, 0.05, 0.94, 0, -0.475, 0, 0x453520)];
      for (var i = 0; i < 8; i++) {
        var an = i * 0.785, cx = Math.cos(an) * 0.22, cz = Math.sin(an) * 0.22;
        pts.push(spikeC(0.014, 0.065, 0.36, cx, -0.30, cz, Math.sin(an) * 0.32, -Math.cos(an) * 0.32, i % 2 ? 0x6b5628 : 0x52692c));
      }
      pts.push(spikeC(0.016, 0.08, 0.44, 0, -0.27, 0, 0.06, -0.05, 0x5d4a22));
      return mergeGeos(pts);
    })();
    function gBarbedWire(postC, wireC) {
      var pts = [bx(0.92, 0.06, 0.12, 0, -0.47, -0.34, postC), bx(0.92, 0.06, 0.12, 0, -0.47, 0.34, postC)];
      [-0.36, 0.36].forEach(function (ox) {
        pts.push(spikeC(0.035, 0.04, 0.44, ox, -0.27, -0.24, 0.28, 0, postC));
        pts.push(spikeC(0.035, 0.04, 0.44, ox, -0.27, 0.24, -0.28, 0, postC));
      });
      for (var k = -2; k <= 2; k++) pts.push(ringTorus(0.22, 0.022, k * 0.16, -0.26, 0, 0.15, 1.32, wireC));
      return mergeGeos(pts);
    }
    var gIvyGrass = (function () {
      var pts = [bx(0.94, 0.06, 0.94, 0, -0.47, 0, 0x2d5a27)];
      for (var i = 0; i < 7; i++) {
        var x = ((i % 3) - 1) * 0.28, z = (Math.floor(i / 3) - 1) * 0.28;
        pts.push(spikeC(0.015, 0.075, 0.26, x, -0.35, z, 0.24 * (i % 2 ? 1 : -1), 0.2 * ((i % 3) - 1), i % 2 ? 0x3f8838 : 0x2b6826));
      }
      return mergeGeos(pts);
    })();
    var gStatueGod = mergeGeos([
      bx(0.92, 0.12, 0.92, 0, -0.44, 0, 0x5c6066),
      bx(0.74, 0.10, 0.74, 0, -0.33, 0, 0x6c7076),
      bx(0.56, 0.34, 0.46, 0, -0.11, 0, 0x7e838a),
      bx(0.68, 0.16, 0.42, 0, 0.14, 0, 0x898f96),
      bx(0.46, 0.24, 0.44, 0, 0.34, 0.02, 0x949aa2),
      bx(0.50, 0.06, 0.12, 0, 0.42, 0.22, 0x6f747b),
      bx(0.12, 0.04, 0.06, -0.12, 0.37, 0.23, 0xe3b02a),
      bx(0.12, 0.04, 0.06, 0.12, 0.37, 0.23, 0xe3b02a),
      bx(0.28, 0.05, 0.28, 0, 0.475, 0, 0xd4a432)
    ]);
    var gWFilter = mergeGeos([
      bx(0.94, 0.10, 0.86, 0, -0.45, 0, 0x3b424a),
      cylY(0.18, 0.20, 0.72, -0.24, -0.04, -0.10, 0x4b7ea2, 12),
      cylY(0.18, 0.20, 0.72, 0.24, -0.04, -0.10, 0x3c454e, 12),
      bx(0.60, 0.07, 0.08, 0, 0.36, -0.10, 0xc89a3a),
      bx(0.62, 0.26, 0.32, 0, -0.27, 0.24, 0x2f88c8),
      cylY(0.035, 0.035, 0.18, 0, 0.06, 0.22, 0xc89a3a, 8)
    ]);
    var gDistill = mergeGeos([
      bx(0.48, 0.32, 0.74, -0.22, -0.34, 0, 0x423d3a),
      cylY(0.21, 0.23, 0.56, -0.22, 0.10, 0, 0xb86834, 12),
      bx(0.32, 0.08, 0.08, 0.02, 0.40, 0, 0xd28a46),
      cylY(0.15, 0.15, 0.46, 0.24, 0.06, 0, 0x5c6874, 12),
      bx(0.36, 0.22, 0.44, 0.24, -0.39, 0, 0x2b3036),
      cylY(0.11, 0.13, 0.24, 0.24, -0.16, 0.18, 0x6ec6ff, 10)
    ]);
    var gCWork = mergeGeos([
      bx(0.94, 0.07, 0.84, 0, -0.04, 0, 0x4b535e),
      bx(0.08, 0.42, 0.08, -0.40, -0.29, -0.34, 0x2b3038), bx(0.08, 0.42, 0.08, 0.40, -0.29, -0.34, 0x2b3038),
      bx(0.08, 0.42, 0.08, -0.40, -0.29, 0.34, 0x2b3038), bx(0.08, 0.42, 0.08, 0.40, -0.29, 0.34, 0x2b3038),
      bx(0.36, 0.24, 0.05, -0.20, 0.14, -0.20, 0x161b20), bx(0.30, 0.18, 0.03, -0.20, 0.14, -0.17, 0x2ee6a8),
      bx(0.32, 0.22, 0.05, 0.18, 0.13, -0.18, 0x161b20), bx(0.26, 0.16, 0.03, 0.18, 0.13, -0.15, 0x3bb8ff),
      bx(0.16, 0.28, 0.36, 0.38, 0.13, 0.04, 0x22262c),
      bx(0.42, 0.03, 0.16, -0.06, 0.01, 0.18, 0x20242a),
      bx(0.05, 0.44, 0.05, -0.42, 0.22, -0.34, 0x2b3038), bx(0.05, 0.44, 0.05, 0.42, 0.22, -0.34, 0x2b3038),
      bx(0.88, 0.05, 0.12, 0, 0.46, -0.30, 0xe8c448)
    ]);
    var gSEng = mergeGeos([
      bx(0.94, 0.08, 0.84, 0, -0.05, 0, 0x8a6034),
      bx(0.09, 0.41, 0.09, -0.38, -0.295, -0.32, 0x56391c), bx(0.09, 0.41, 0.09, 0.38, -0.295, -0.32, 0x56391c),
      bx(0.09, 0.41, 0.09, -0.38, -0.295, 0.32, 0x56391c), bx(0.09, 0.41, 0.09, 0.38, -0.295, 0.32, 0x56391c),
      bx(0.86, 0.42, 0.06, 0, 0.20, -0.36, 0x6e4b26),
      bx(0.46, 0.025, 0.38, -0.14, 0.005, 0.04, 0x326ec2),
      bx(0.18, 0.12, 0.16, 0.26, 0.05, 0.20, 0x3b424a),
      bx(0.14, 0.14, 0.04, -0.20, 0.24, -0.31, 0xb8bec6),
      bx(0.28, 0.06, 0.04, 0.16, 0.24, -0.31, 0xd8a034)
    ]);
    var gEng = mergeGeos([
      bx(0.94, 0.08, 0.86, 0, -0.04, 0, 0x3b5876),
      bx(0.10, 0.42, 0.10, -0.38, -0.29, -0.34, 0x243648), bx(0.10, 0.42, 0.10, 0.38, -0.29, -0.34, 0x243648),
      bx(0.10, 0.42, 0.10, -0.38, -0.29, 0.34, 0x243648), bx(0.10, 0.42, 0.10, 0.38, -0.29, 0.34, 0x243648),
      bx(0.48, 0.05, 0.44, 0, 0.025, 0.08, 0x626b75),
      cylY(0.07, 0.08, 0.44, -0.24, 0.22, -0.18, 0x2c3238, 10),
      bx(0.26, 0.14, 0.22, -0.24, 0.38, -0.08, 0xd28a2a),
      bx(0.32, 0.22, 0.18, 0.22, 0.11, -0.18, 0x2a323a),
      bx(0.22, 0.12, 0.04, 0.22, 0.12, -0.07, 0x4fd08a)
    ]);
    var gDrive = mergeGeos([
      bx(0.94, 0.08, 0.84, 0, -0.05, 0, 0x454a52),
      bx(0.08, 0.41, 0.08, -0.40, -0.295, -0.34, 0x282c32), bx(0.08, 0.41, 0.08, 0.40, -0.295, -0.34, 0x282c32),
      bx(0.08, 0.41, 0.08, -0.40, -0.295, 0.34, 0x282c32), bx(0.08, 0.41, 0.08, 0.40, -0.295, 0.34, 0x282c32),
      bx(0.07, 0.54, 0.09, -0.40, 0.18, 0, 0xc86428), bx(0.07, 0.54, 0.09, 0.40, 0.18, 0, 0xc86428),
      bx(0.88, 0.07, 0.10, 0, 0.46, 0, 0xc86428),
      bx(0.04, 0.18, 0.04, 0, 0.35, 0, 0x8d959e),
      bx(0.34, 0.24, 0.34, 0, 0.14, 0, 0x767e88),
      cyl(0.14, 0.08, -0.21, 0.12, 0, 0xa8b0b8, 12),
      cyl(0.10, 0.16, 0.22, 0.12, 0, 0x525860, 10)
    ]);
    var gVBench = mergeGeos([
      bx(0.94, 0.08, 0.84, 0, -0.05, 0, 0x7c2e2e),
      bx(0.08, 0.41, 0.08, -0.40, -0.295, -0.34, 0x3b1818), bx(0.08, 0.41, 0.08, 0.40, -0.295, -0.34, 0x3b1818),
      bx(0.08, 0.41, 0.08, -0.40, -0.295, 0.34, 0x3b1818), bx(0.08, 0.41, 0.08, 0.40, -0.295, 0.34, 0x3b1818),
      bx(0.08, 0.54, 0.08, -0.40, 0.18, -0.32, 0x983636), bx(0.08, 0.54, 0.08, 0.40, 0.18, -0.32, 0x983636),
      bx(0.88, 0.06, 0.08, 0, 0.46, -0.32, 0x983636),
      bx(0.56, 0.06, 0.44, -0.10, 0.02, 0.04, 0x565c64),
      cyl(0.16, 0.14, 0.28, 0.16, 0.06, 0x1c1e22, 12),
      cyl(0.09, 0.15, 0.28, 0.16, 0.06, 0xb8bec6, 10)
    ]);
    var gGunB = mergeGeos([
      bx(0.94, 0.08, 0.82, 0, -0.05, 0, 0x363b42),
      bx(0.09, 0.41, 0.09, -0.38, -0.295, -0.32, 0x1e2228), bx(0.09, 0.41, 0.09, 0.38, -0.295, -0.32, 0x1e2228),
      bx(0.09, 0.41, 0.09, -0.38, -0.295, 0.32, 0x1e2228), bx(0.09, 0.41, 0.09, 0.38, -0.295, 0.32, 0x1e2228),
      bx(0.86, 0.46, 0.06, 0, 0.22, -0.34, 0x262b30),
      bx(0.64, 0.06, 0.05, 0, 0.30, -0.29, 0x5d442a),
      bx(0.46, 0.04, 0.04, 0.06, 0.32, -0.29, 0x8a929c),
      bx(0.24, 0.05, 0.04, -0.18, 0.14, -0.29, 0x767e88),
      bx(0.28, 0.16, 0.22, 0.24, 0.07, 0.10, 0x455638),
      bx(0.16, 0.10, 0.16, -0.24, 0.04, 0.18, 0x626a74)
    ]);
    var gCpot = mergeGeos([
      cylY(0.46, 0.48, 0.10, 0, -0.45, 0, 0x6c7076, 12),
      bx(0.56, 0.07, 0.10, 0, -0.38, 0, 0x4a2f18), bx(0.10, 0.07, 0.56, 0, -0.38, 0, 0x4a2f18),
      cylY(0.04, 0.18, 0.22, 0, -0.28, 0, 0xff6a14, 8),
      spikeC(0.025, 0.035, 0.96, -0.22, -0.02, -0.22, 0.24, -0.24, 0x2b2e33),
      spikeC(0.025, 0.035, 0.96, 0.22, -0.02, -0.22, 0.24, 0.24, 0x2b2e33),
      spikeC(0.025, 0.035, 0.96, 0, -0.02, 0.26, -0.28, 0, 0x2b2e33),
      cylY(0.02, 0.02, 0.22, 0, 0.34, 0, 0x7a8088, 6),
      cylY(0.26, 0.21, 0.34, 0, 0.06, 0, 0x24262b, 12),
      cylY(0.22, 0.22, 0.04, 0, 0.22, 0, 0xc87a2a, 10),
      bx(0.04, 0.16, 0.04, 0.08, 0.28, 0.04, 0x9c6e3b)
    ]);
    function gFarmBed(water) {
      var rimC = water ? 0x767a80 : 0x6f4b28, fillC = water ? 0x3488b8 : 0x4f361e;
      return mergeGeos([
        bx(0.98, 0.98, 0.98, 0, -0.01, 0, fillC),
        bx(1.00, 1.00, 0.06, 0, 0, -0.47, rimC), bx(1.00, 1.00, 0.06, 0, 0, 0.47, rimC),
        bx(0.06, 1.00, 1.00, -0.47, 0, 0, rimC), bx(0.06, 1.00, 1.00, 0.47, 0, 0, rimC)
      ]);
    }
    /* Cannons: real wheeled cannons (carriage + wheels + angled barrel). Barrel points to local +z; the instance is yawed toward the target. */
    function cannonGeo(o) {
      var pts = [bx(0.62, 0.14, 0.9, 0, -0.3, -0.02, o.wood), bx(0.7, 0.06, 0.16, 0, -0.2, 0.2, o.wood), bx(0.07, 0.22, 0.86, -0.28, -0.16, -0.02, o.wood), bx(0.07, 0.22, 0.86, 0.28, -0.16, -0.02, o.wood)];
      var ax = new THREE.CylinderGeometry(0.05, 0.05, 1.04, 8); ax.rotateZ(Math.PI / 2); ax.translate(0, -0.5 + o.wr, 0.02); pts.push([ax, o.iron]);
      [-0.46, 0.46].forEach(function (wx) { var w = new THREE.CylinderGeometry(o.wr, o.wr, 0.11, 12); w.rotateZ(Math.PI / 2); w.translate(wx, -0.5 + o.wr, 0.02); pts.push([w, o.wheel]); var hub = new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8); hub.rotateZ(Math.PI / 2); hub.translate(wx, -0.5 + o.wr, 0.02); pts.push([hub, o.iron]); });
      var br = new THREE.CylinderGeometry(o.r * 0.82, o.r, o.len, 12); br.rotateX(Math.PI / 2); br.rotateX(-0.2); br.translate(0, 0.0, o.len * 0.5 - 0.3); pts.push([br, o.barrel]);
      var ring = new THREE.CylinderGeometry(o.r * 0.95, o.r * 0.95, 0.09, 12); ring.rotateX(Math.PI / 2); ring.rotateX(-0.2); ring.translate(0, 0.07, o.len - 0.34); pts.push([ring, o.iron]);
      var rb = new THREE.CylinderGeometry(o.r * 1.12, o.r * 1.12, 0.08, 12); rb.rotateX(Math.PI / 2); rb.rotateX(-0.2); rb.translate(0, -0.02, o.len * 0.2 - 0.3); pts.push([rb, o.iron]);
      var kn = new THREE.SphereGeometry(o.r * 0.6, 8, 6); kn.translate(0, -0.1, -0.33); pts.push([kn, o.barrel]);
      (o.extra || []).forEach(function (p) { pts.push(p); });
      return mergeGeos(pts);
    }
    var turretG1 = cannonGeo({ wood: 0x6b4a28, wheel: 0x5a3c1f, iron: 0x3a3a3a, barrel: 0x4a4540, wr: 0.28, len: 0.92, r: 0.13 });
    var turretG2 = cannonGeo({ wood: 0x3b3f46, wheel: 0x2a2d33, iron: 0x8a8d92, barrel: 0x23262b, wr: 0.3, len: 1.16, r: 0.15 });
    var turretG3 = cannonGeo({ wood: 0x2f4a3a, wheel: 0x1f3026, iron: 0xd28a2a, barrel: 0x1c2a22, wr: 0.32, len: 1.36, r: 0.16, extra: [bx(0.5, 0.05, 0.05, 0, 0.18, -0.4, 0xd28a2a), bx(0.05, 0.3, 0.05, -0.25, 0.04, -0.4, 0xd28a2a), bx(0.05, 0.3, 0.05, 0.25, 0.04, -0.4, 0xd28a2a)] });
    function gChest(bodyC, trimC, latchC) {
      return mergeGeos([
        bx(0.92, 0.62, 0.84, 0, -0.19, 0, bodyC),
        bx(0.96, 0.18, 0.88, 0, 0.21, 0, trimC),
        bx(0.96, 0.08, 0.88, 0, -0.46, 0, trimC),
        bx(0.18, 0.16, 0.08, 0, 0.08, 0.44, latchC)
      ]);
    }
    function gBench(topC, legC, accC) {
      return mergeGeos([
        bx(0.96, 0.12, 0.86, 0, 0.06, 0, topC),
        bx(0.12, 0.56, 0.12, -0.38, -0.22, -0.32, legC), bx(0.12, 0.56, 0.12, 0.38, -0.22, -0.32, legC),
        bx(0.12, 0.56, 0.12, -0.38, -0.22, 0.32, legC), bx(0.12, 0.56, 0.12, 0.38, -0.22, 0.32, legC),
        bx(0.44, 0.22, 0.28, 0, 0.23, -0.16, accC)
      ]);
    }
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
    var plankVoxMat = lam(0xffffff, { map: plankTex, bumpMap: sharedBump, bumpScale: 0.025, roughness: 0.85 });
    var stoneVoxMat = lam(0xffffff, { map: stoneTex, bumpMap: sharedBump, bumpScale: 0.035, roughness: 0.9 });
    packMats.push({ mat: plankVoxMat, gen: function () { return buildPlankTex(7); } });
    packMats.push({ mat: stoneVoxMat, gen: function () { return buildStoneTex(8); } });

    var VM = {
      1: inst(box1, plankVoxMat, 2600, true, false),
      2: inst(box1, stoneVoxMat, 2600, true, false),
      3: inst(gFurn, vPart(0.84, 0.2), 150, true, false),
      4: inst(mergeBoxes(furnParts('bed', 0x855832, 0x5c3a1d, 0x4a7a5c)), vPart(0.84, 0.06), 200, true, false),
      5: inst(mergeBoxes(furnParts('couch', 0x4b331d, 0x3a2614, 0x5a7852)), vPart(0.84, 0.06), 200, true, false),
      6: inst(gSink, vPart(0.35, 0.45), 120, true, false),
      7: inst(gCamp, vPart(0.85, 0.05), 120, true, false),
      8: inst(gAnvil, vPart(0.32, 0.85), 80, true, false),
      9: inst(gComp, vPart(0.45, 0.35), 80, true, false),
      10: inst(box1, plankVoxMat, 2600, true, false),
      11: inst(gSaw, vPart(0.65, 0.35), 80, true, false),
      12: inst(gTbench, vPart(0.55, 0.45), 80, true, false),
      13: inst(turretG1, vPart(0.55, 0.55), 120, true, false),
      14: inst(turretG2, vPart(0.4, 0.72), 120, true, false),
      15: inst(turretG3, vPart(0.32, 0.82), 60, true, false),
      16: inst(gBench(0x6e6a60, 0x45413a, 0xa8aeb5), vPart(0.68, 0.32), 300, true, false),
      17: inst(gBench(0x7a3b2a, 0x452218, 0xe84838), vPart(0.62, 0.3), 200, true, false),
      18: inst(gFurn, vPart(0.86, 0.12), 300, true, false),
      19: inst(gBench(0x8a6842, 0x52391f, 0xc99c5a), vPart(0.76, 0.16), 300, true, false),
      20: inst(gBench(0x5a4a70, 0x372c46, 0xd8b24c), vPart(0.6, 0.38), 200, true, false),
      21: inst(gChest(0x9a6d3e, 0x624220, 0xd8b24c), vPart(0.76, 0.18), 200, true, false),
      22: inst(gChest(0x7c828a, 0x4c525a, 0xd8dde4), vPart(0.42, 0.75), 200, true, false),
      23: inst(gChest(0x585d66, 0x353940, 0xe6c35a), vPart(0.35, 0.82), 200, true, false),
      24: inst(gChest(0xb86f3e, 0x764222, 0xf0be7a), vPart(0.4, 0.72), 200, true, false),
      25: inst(gChest(0xc8783e, 0x82491e, 0xffe09e), vPart(0.34, 0.8), 200, true, false),
      26: inst(box1, (W.glassMat = lam(0xffffff, { map: glassTex, transparent: true, opacity: 0.52, depthWrite: false, roughness: 0.12, metalness: 0.2 })), 600, true, false),
      27: inst(box1, lam(0xffffff, { map: cactBlockTex, roughness: 0.88 }), 600, true, false),
      28: inst(gTnt, vPart(0.68, 0.15), 200, true, false),
      29: inst(gBench(0x5d6168, 0x383c42, 0xc2c8d0), vPart(0.44, 0.7), 200, true, false),
      30: inst(gBench(0x4c5a6a, 0x2c3642, 0xd8a840), vPart(0.48, 0.6), 200, true, false),
      31: inst(gBench(0x6a4a2a, 0x422c16, 0x9aa2ab), vPart(0.75, 0.25), 200, true, false),
      32: inst(gBench(0x8a8a82, 0x5a5a54, 0xbab4a8), vPart(0.86, 0.12), 200, true, false),
      33: inst(box1, lam(0xffffff, { map: BLKTEX[33], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      34: inst(box1, lam(0xffffff, { map: BLKTEX[34], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      35: inst(box1, lam(0xffffff, { map: BLKTEX[35], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      36: inst(box1, lam(0xffffff, { map: BLKTEX[36], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      37: inst(box1, lam(0xffffff, { map: BLKTEX[37], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      38: inst(box1, lam(0xffffff, { map: BLKTEX[38], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      39: inst(box1, lam(0xffffff, { map: BLKTEX[39], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      40: inst(box1, lam(0xffffff, { map: BLKTEX[40], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      41: inst(box1, lam(0xffffff, { map: BLKTEX[41], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      49: inst(gBench(0x3a5a6a, 0x243a46, 0x52d6e8), vPart(0.42, 0.45), 200, true, false),
      50: inst(gBench(0x7a4a6a, 0x4d2c42, 0xe8d8c0), vPart(0.72, 0.2), 200, true, false),
      51: inst(gStatueGod, vPart(0.82, 0.15), 200, true, false),
      44: inst(gWoodSpike, vPart(0.84, 0.04), 600, true, false),
      45: inst(gPalmRoot, vPart(0.86, 0.04), 600, true, false),
      46: inst(gBarbedWire(0x363a40, 0x8e959e), vPart(0.42, 0.78), 600, true, false),
      47: inst(gIvyGrass, vPart(0.86, 0.02), 600, true, false),
      48: inst(gBarbedWire(0x384b62, 0x9fc2e6), vPart(0.32, 0.85), 600, true, false),
      43: inst(gFurn, vPart(0.55, 0.6), 200, true, false),
      42: inst(box1, lam(0xffffff, { map: BLKTEX[42], bumpMap: sharedBump, bumpScale: 0.03, roughness: 0.88 }), 1500, true, false),
      72: inst(gWFilter, vPart(0.44, 0.55), 200, true, false),
      73: inst(gDistill, vPart(0.38, 0.68), 200, true, false),
      74: inst(gCWork, vPart(0.46, 0.35), 200, true, false),
      75: inst(gSEng, vPart(0.72, 0.20), 200, true, false),
      76: inst(gEng, vPart(0.42, 0.62), 200, true, false),
      77: inst(gDrive, vPart(0.40, 0.68), 200, true, false),
      78: inst(gVBench, vPart(0.46, 0.56), 200, true, false),
      85: inst(gGunB, vPart(0.48, 0.58), 200, true, false),
      86: inst(gCpot, vPart(0.66, 0.40), 200, true, false)
    };
    var gFarmDry = gFarmBed(false), gFarmWet = gFarmBed(true);

    /* [VEHICLE TAG] Manual Iron Shaper Table, Tanker Bench and the fluid tanks (geometry is normalised to one block, then stretched to the block size) */
    var gShaper = mergeGeos([
      bx(0.96, 0.10, 0.84, 0, 0.15, 0, 0x6e4a28),
      bx(0.08, 0.64, 0.08, -0.44, -0.2, -0.36, 0x4a3018), bx(0.08, 0.64, 0.08, 0.44, -0.2, -0.36, 0x4a3018), bx(0.08, 0.64, 0.08, -0.44, -0.2, 0.36, 0x4a3018), bx(0.08, 0.64, 0.08, 0.44, -0.2, 0.36, 0x4a3018),
      bx(0.9, 0.05, 0.05, 0, -0.38, 0, 0x4a3018),
      bx(0.30, 0.16, 0.30, -0.22, 0.28, 0.02, 0x4b5057), bx(0.40, 0.06, 0.26, -0.22, 0.38, 0.02, 0x7d858e), bx(0.10, 0.06, 0.16, -0.50, 0.36, 0.02, 0x7d858e),
      bx(0.12, 0.14, 0.18, 0.36, 0.27, -0.2, 0x2b2e33), bx(0.04, 0.10, 0.04, 0.36, 0.39, -0.2, 0x8a929c),
      bx(0.06, 0.04, 0.34, 0.14, 0.23, 0.18, 0x5d442a), bx(0.14, 0.08, 0.08, 0.14, 0.27, 0.34, 0x6d737b),
      bx(0.34, 0.03, 0.06, 0.2, 0.22, -0.2, 0x9c6a3a), bx(0.30, 0.04, 0.04, 0.12, 0.22, 0.02, 0xb58a58)
    ]);
    var gTanker = mergeGeos([
      bx(0.98, 0.10, 0.86, 0, 0.12, 0, 0x5a5f66),
      bx(0.08, 0.60, 0.08, -0.45, -0.2, -0.38, 0x2b2e33), bx(0.08, 0.60, 0.08, 0.45, -0.2, -0.38, 0x2b2e33), bx(0.08, 0.60, 0.08, -0.45, -0.2, 0.38, 0x2b2e33), bx(0.08, 0.60, 0.08, 0.45, -0.2, 0.38, 0x2b2e33),
      bx(0.9, 0.05, 0.05, 0, -0.4, 0, 0x2b2e33),
      cylY(0.20, 0.20, 0.34, -0.26, 0.34, 0, 0x7d838c, 12), cylY(0.12, 0.2, 0.08, -0.26, 0.55, 0, 0x4a4f57, 12),
      bx(0.06, 0.06, 0.50, 0.04, 0.26, 0.02, 0xc9a23a), bx(0.30, 0.06, 0.06, 0.2, 0.26, 0.26, 0xc9a23a),
      cylY(0.10, 0.04, 0.12, 0.40, 0.23, 0.26, 0x8a929c, 8), bx(0.16, 0.16, 0.16, 0.30, 0.30, -0.22, 0x3b5f8a), bx(0.10, 0.06, 0.10, 0.30, 0.41, -0.22, 0xd9d9d9)
    ]);
    function tankGeo(wood) {
      var P = wood ? [bx(0.92, 0.86, 0.92, 0, 0.02, 0, 0x8a5a30), bx(0.96, 0.07, 0.96, 0, -0.30, 0, 0x2c3036), bx(0.96, 0.07, 0.96, 0, 0.02, 0, 0x2c3036), bx(0.96, 0.07, 0.96, 0, 0.30, 0, 0x2c3036), bx(0.98, 0.07, 0.98, 0, 0.47, 0, 0x6a4524), bx(0.30, 0.06, 0.30, 0, 0.51, 0, 0x4a3018), bx(0.05, 0.05, 0.05, 0.1, 0.55, 0.1, 0xb9b9b9), bx(0.10, 0.10, 0.12, 0, -0.34, 0.5, 0x7d838c), bx(0.04, 0.22, 0.04, 0.40, 0.05, 0.47, 0xc9d8e8)]
        : [cylY(0.46, 0.46, 0.84, 0, 0.02, 0, 0x7a838d, 16), cylY(0.48, 0.48, 0.06, 0, -0.30, 0, 0x4a4f57, 16), cylY(0.48, 0.48, 0.06, 0, 0.02, 0, 0x4a4f57, 16), cylY(0.48, 0.48, 0.06, 0, 0.32, 0, 0x4a4f57, 16), cylY(0.30, 0.46, 0.08, 0, 0.47, 0, 0x6b737c, 16), cylY(0.12, 0.12, 0.10, 0, 0.53, 0, 0x2b2e33, 10), bx(0.14, 0.10, 0.14, 0, -0.38, 0.46, 0x9aa2ab), bx(0.05, 0.30, 0.05, 0.28, 0.05, 0.43, 0xd9e6f2), bx(0.08, 0.32, 0.03, 0.28, 0.05, 0.455, 0x3b5f8a)];
      return mergeGeos(P);
    }
    function bxr(wd, h, d, x, y, z, ry, c) { var g = new THREE.BoxGeometry(wd, h, d); g.rotateY(ry); g.translate(x, y, z); return [g, c]; }
    var gSeatB = mergeGeos([
      bx(1.0, 0.10, 0.88, 0, 0.12, 0, 0x8a9099),
      bx(0.09, 0.62, 0.09, -0.46, -0.2, -0.39, 0x17181b), bx(0.09, 0.62, 0.09, 0.46, -0.2, -0.39, 0x17181b), bx(0.09, 0.62, 0.09, -0.46, -0.2, 0.39, 0x17181b), bx(0.09, 0.62, 0.09, 0.46, -0.2, 0.39, 0x17181b),
      bx(0.94, 0.05, 0.05, 0, -0.38, -0.39, 0x17181b), bx(0.94, 0.05, 0.05, 0, -0.38, 0.39, 0x17181b),
      bx(0.30, 0.10, 0.22, 0, 0.22, 0, 0x3b3f46), cyl(0.2, 0.025, 0, 0.36, 0, 0xc9d0d8, 20), cyl(0.04, 0.07, 0, 0.36, 0, 0x2b2e33, 8), bx(0.05, 0.18, 0.05, 0.06, 0.28, -0.1, 0x2b2e33),
      bxr(0.62, 0.04, 0.14, -0.28, 0.2, 0.28, 0.15, 0xb58a58), bxr(0.58, 0.04, 0.13, -0.22, 0.24, 0.3, -0.12, 0xc29a63), bxr(0.6, 0.04, 0.14, -0.3, 0.28, 0.27, 0.32, 0xa87c4b),
      bxr(0.56, 0.012, 0.06, 0.2, 0.185, -0.3, 0.05, 0xe6cf6a), bx(0.012, 0.014, 0.03, 0.05, 0.19, -0.3, 0x333), bx(0.012, 0.014, 0.03, 0.15, 0.19, -0.3, 0x333), bx(0.012, 0.014, 0.03, 0.25, 0.19, -0.3, 0x333)
    ]);
    var gAsmB = mergeGeos([
      bx(0.99, 0.42, 0.99, 0, -0.29, 0, 0x4a4f57), bx(0.99, 0.06, 0.99, 0, 0.0, 0, 0x6d737b),
      bx(0.99, 0.02, 0.05, 0, 0.035, -0.47, 0xd8b021), bx(0.99, 0.02, 0.05, 0, 0.035, 0.47, 0xd8b021), bx(0.05, 0.02, 0.99, -0.47, 0.035, 0, 0xd8b021), bx(0.05, 0.02, 0.99, 0.47, 0.035, 0, 0xd8b021),
      bx(0.90, 0.05, 0.04, 0, 0.07, -0.22, 0x9aa1aa), bx(0.90, 0.05, 0.04, 0, 0.07, 0.22, 0x9aa1aa),
      bx(0.05, 0.3, 0.2, -0.3, 0.17, 0, 0x2b2e33), bx(0.05, 0.3, 0.2, 0.3, 0.17, 0, 0x2b2e33)
    ]);
    var gCraft2 = mergeGeos([
      bx(0.98, 0.10, 0.86, 0, 0.14, 0, 0xb87333),
      bx(0.98, 0.14, 0.86, 0, 0.02, 0, 0x7d838c),
      bx(0.09, 0.6, 0.09, -0.45, -0.28, -0.37, 0x6d737b), bx(0.09, 0.6, 0.09, 0.45, -0.28, -0.37, 0x6d737b), bx(0.09, 0.6, 0.09, -0.45, -0.28, 0.37, 0x6d737b), bx(0.09, 0.6, 0.09, 0.45, -0.28, 0.37, 0x6d737b),
      bx(0.9, 0.05, 0.05, 0, -0.44, 0, 0x6d737b), bx(0.9, 0.2, 0.04, 0, -0.1, -0.4, 0x6d737b),
      bx(0.72, 0.2, 0.03, 0, -0.06, 0.45, 0x585d65), bx(0.03, 0.12, 0.06, -0.22, 0.04, 0.47, 0x2b2e33), bx(0.03, 0.12, 0.06, 0.18, 0.04, 0.47, 0x2b2e33),
      bx(0.04, 0.2, 0.04, -0.22, -0.08, 0.5, 0x7a4a24), bx(0.14, 0.07, 0.07, -0.22, 0.04, 0.5, 0x9aa1aa),
      bx(0.04, 0.2, 0.03, 0.18, -0.08, 0.5, 0xc6ccd3), bx(0.10, 0.06, 0.03, 0.18, 0.04, 0.5, 0xc6ccd3), bx(0.03, 0.06, 0.05, 0.14, 0.03, 0.5, 0xc6ccd3)
    ]);
    var bfz = [];
    for (var bi = 0; bi < 10; bi++) bfz.push(bx(0.99, 0.065, 0.99, 0, -0.46 + bi * 0.1 * 1.0, 0, bi % 2 ? 0x7d838c : 0xa8442f));
    var gBFurn = mergeGeos(bfz.concat([
      bx(0.7, 0.9, 0.04, 0, -0.1, 0.5, 0x2b2e33), bx(0.5, 0.45, 0.02, 0, -0.18, 0.52, 0xff7a1a),
      bx(0.34, 0.5, 0.34, 0.15, 0.62, -0.1, 0x7d838c), bx(0.4, 0.06, 0.4, 0.15, 0.9, -0.1, 0x4a4f57),
      bx(0.2, 0.08, 0.04, -0.3, 0.36, 0.52, 0x4a4f57)
    ]));
    var gTiAnvil = mergeGeos([
      bx(0.9, 0.16, 0.7, 0, -0.42, 0, 0x4f6f86), bx(0.5, 0.4, 0.4, 0, -0.16, 0, 0x5f86a3), bx(0.98, 0.2, 0.5, 0, 0.14, 0, 0x7fb0d0), bx(0.3, 0.14, 0.3, 0.55, 0.12, 0, 0x7fb0d0), bx(0.9, 0.03, 0.4, 0, 0.26, 0, 0xcfe6f5)
    ]);

    var gODist = mergeGeos([
      bx(0.98, 0.1, 0.98, 0, -0.45, 0, 0x4a4f57), bx(0.9, 0.04, 0.9, 0, -0.38, 0, 0x2b2e33),
      cylY(0.2, 0.2, 0.95, -0.22, 0.05, -0.18, 0x8a9099, 14), cylY(0.15, 0.15, 0.7, 0.24, -0.05, -0.18, 0x7d838c, 14), cylY(0.12, 0.12, 0.45, 0.0, -0.16, 0.26, 0xb07a3a, 12),
      bx(0.08, 0.08, 0.5, 0.0, 0.2, -0.18, 0x3a3e44), bx(0.5, 0.05, 0.05, 0.0, 0.0, -0.18, 0x3a3e44), bx(0.05, 0.4, 0.05, 0.0, -0.1, 0.0, 0x3a3e44),
      bx(0.12, 0.12, 0.06, -0.22, 0.5, -0.18, 0xc44a2a), bx(0.1, 0.06, 0.1, 0.35, -0.35, 0.3, 0x2f6fb0), bx(0.1, 0.06, 0.1, 0.1, -0.35, 0.4, 0xd8c030), bx(0.1, 0.06, 0.1, -0.15, -0.35, 0.4, 0x3aa05a)
    ]);
    var gIForge = mergeGeos([
      bx(0.98, 0.5, 0.9, 0, -0.25, 0, 0x4a4f57), bx(0.7, 0.3, 0.04, 0, -0.2, 0.46, 0xff6a10), bx(0.8, 0.12, 0.6, 0, 0.05, 0, 0x2b2e33),
      bx(0.3, 0.6, 0.3, 0.3, 0.3, -0.2, 0x6d737b), bx(0.34, 0.06, 0.34, 0.3, 0.62, -0.2, 0x2b2e33), bx(0.6, 0.18, 0.3, -0.15, 0.2, 0.15, 0x9aa1aa), bx(0.2, 0.1, 0.3, -0.55, 0.2, 0.15, 0x9aa1aa)
    ]);
    var gCraft3 = mergeGeos([
      bx(0.96, 0.06, 0.8, 0, 0.02, 0, 0x6d747c), bx(0.98, 0.05, 0.82, 0, 0.08, 0, 0x2f343a), bx(0.06, 0.5, 0.06, -0.45, -0.25, -0.35, 0x2b2e33), bx(0.06, 0.5, 0.06, 0.45, -0.25, -0.35, 0x2b2e33), bx(0.06, 0.5, 0.06, -0.45, -0.25, 0.35, 0x2b2e33), bx(0.06, 0.5, 0.06, 0.45, -0.25, 0.35, 0x2b2e33),
      bx(0.9, 0.04, 0.7, 0, -0.3, 0, 0x4a4f57), bx(0.9, 0.5, 0.03, 0, 0.3, -0.42, 0x8a9099), bx(0.1, 0.1, 0.04, -0.3, 0.45, -0.4, 0xc6ccd3), bx(0.14, 0.1, 0.04, 0.0, 0.45, -0.4, 0xe0a030), bx(0.04, 0.3, 0.04, 0.3, 0.3, -0.4, 0xd8d8d8), bx(0.25, 0.06, 0.12, -0.1, 0.12, 0.05, 0x3aa0d0)
    ]);
    var gCMold = mergeGeos([
      bx(0.98, 0.3, 0.98, 0, -0.35, 0, 0x4a4f57), bx(0.8, 0.12, 0.8, 0, -0.14, 0, 0x2b2e33), bx(0.5, 0.1, 0.5, 0, -0.06, 0, 0xff6a10), bx(0.1, 0.5, 0.1, -0.42, 0.1, -0.42, 0x6d737b), bx(0.1, 0.5, 0.1, 0.42, 0.1, -0.42, 0x6d737b),
      bx(0.98, 0.1, 0.12, 0, 0.35, -0.42, 0x6d737b), bx(0.3, 0.18, 0.3, 0.2, 0.15, 0.2, 0x8a9099), bx(0.4, 0.06, 0.1, 0.0, 0.0, 0.46, 0x3a3e44)
    ]);
    VM[140] = inst(gCMold, vPart(0.55, 0.35), 200, true, false); VM[137] = inst(gODist, vPart(0.55, 0.35), 200, true, false); VM[138] = inst(gIForge, vPart(0.55, 0.35), 200, true, false); VM[139] = inst(gCraft3, vPart(0.55, 0.35), 200, true, false);
    VM[132] = inst(gSeatB, vPart(0.55, 0.35), 200, true, false);
    VM[133] = inst(gAsmB, vPart(0.55, 0.35), 200, true, false); VM[134] = inst(gCraft2, vPart(0.55, 0.35), 200, true, false); VM[135] = inst(gBFurn, vPart(0.55, 0.35), 200, true, false); VM[136] = inst(gTiAnvil, vPart(0.55, 0.35), 200, true, false);
    VM[126] = inst(gShaper, vPart(0.62, 0.30), 200, true, false); VM[127] = inst(gTanker, vPart(0.55, 0.35), 200, true, false);
    VM[128] = inst(tankGeo(true), vPart(0.8, 0.08), 200, true, false); VM[130] = inst(tankGeo(true), vPart(0.8, 0.08), 100, true, false);
    VM[129] = inst(tankGeo(false), vPart(0.45, 0.5), 200, true, false); VM[131] = inst(tankGeo(false), vPart(0.45, 0.5), 100, true, false);
    Object.keys(WZ.FARM).forEach(function (t) {
      var f = WZ.FARM[t];
      VM[t] = inst(f[3] ? gFarmWet : gFarmDry, vPart(f[3] ? 0.25 : 0.88, f[3] ? 0.12 : 0.02), 200, true, false);
    });
    var FKIND = ['chair', 'table', 'sofa', 'couch', 'standlamp', 'hanglamp'];
    /* shaped variants (vox 87+): geometry in cell-local coords, UVs world-aligned so textures stay continuous */
    function shapeGeo(boxes) {
      var pos = [], nor = [], uv = [], idx = [], off = 0;
      boxes.forEach(function (b) { var w = b[3] - b[0], h = b[4] - b[1], d = b[5] - b[2], g = new THREE.BoxGeometry(w, h, d); g.translate((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
        var pa = g.attributes.position, na = g.attributes.normal, ia = g.index.array, i, nx, ny, u, v;
        for (i = 0; i < pa.count; i++) { var x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); nx = Math.abs(na.getX(i)); ny = Math.abs(na.getY(i));
          if (nx > 0.5) { u = z + 0.5; v = y + 0.5; } else if (ny > 0.5) { u = x + 0.5; v = z + 0.5; } else { u = x + 0.5; v = y + 0.5; }
          pos.push(x, y, z); nor.push(na.getX(i), na.getY(i), na.getZ(i)); uv.push(u, v); }
        for (i = 0; i < ia.length; i++) idx.push(ia[i] + off); off += pa.count; });
      var G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); G.setIndex(idx); return G;
    }
    /* local boxes [x0,y0,z0,x1,y1,z1] (cell centre = 0,0,0) for shape si (0 stair, 1 slab, 2 layer); stair rises toward +z before rotation */
    var SHB = [[[-0.5, -0.5, -0.5, 0.5, 0, 0.5], [-0.5, 0, 0, 0.5, 0.5, 0.5]], [[-0.5, -0.5, -0.5, 0.5, 0, 0.5]], [[-0.5, -0.5, -0.5, 0.5, -0.25, 0.5]],
      [[-0.5, -0.5, -0.07, 0.5, 1.5, 0.07], [0.3, 0.3, 0.07, 0.42, 0.5, 0.17], [0.3, 0.3, -0.17, 0.42, 0.5, -0.07]],
      [[-0.5, -0.5, -0.1, -0.3, 0.8, 0.1], [0.3, -0.5, -0.1, 0.5, 0.8, 0.1], [-0.3, -0.2, -0.04, 0.3, -0.06, 0.04], [-0.3, 0.2, -0.04, 0.3, 0.34, 0.04]],
      [[-0.5, -0.5, -0.1, -0.35, 0.8, 0.1], [0.35, -0.5, -0.1, 0.5, 0.8, 0.1], [-0.35, -0.38, -0.04, 0.35, -0.24, 0.04], [-0.35, 0.05, -0.04, 0.35, 0.19, 0.04], [-0.35, 0.5, -0.04, 0.35, 0.64, 0.04], [-0.2, -0.5, -0.03, -0.14, 0.6, 0.03], [0.14, -0.5, -0.03, 0.2, 0.6, 0.03], [-0.03, -0.5, -0.03, 0.03, 0.6, 0.03]]];
    /* door/gate transform: opened ones swing 90 deg around the hinge edge (local x = -0.5); bit 2 of rot = open */
    function shXf(t, x, y, z, rot) {
      var a = (rot & 3) * Math.PI / 2, vr = WZ.VARIANT[t];
      if ((rot & 4) && vr && vr[1] !== 4) { var a2 = a - Math.PI / 2, hx = x + 0.5 - 0.5 * Math.cos(a), hz = z + 0.5 + 0.5 * Math.sin(a); return [hx + 0.5 * Math.cos(a2), y + 0.5, hz - 0.5 * Math.sin(a2), a2]; }
      return [x + 0.5, y + 0.5, z + 0.5, a];
    }
    W.shXf = shXf;
    W.shapeBoxes = function (t, rot, ix, iy, iz) {
      var vr = WZ.VARIANT[t], bx = SHB[vr[1]], out = [], r = rot || 0, i, b, x0, z0, x1, z1;
      if (vr[1] >= 3) {
        var open = (r & 4) !== 0;
        if (vr[1] === 4 || !open) return [[ix, iy, iz, ix + 1, iy + (vr[1] === 3 ? 2 : 1.3), iz + 1]];
        if (vr[1] === 5) return [];
        var xf = shXf(t, ix, iy, iz, r), hxs = Math.abs(Math.sin(xf[3])) > 0.5 ? [0.07, 0.5] : [0.5, 0.07];
        return [[xf[0] - hxs[0], iy, xf[2] - hxs[1], xf[0] + hxs[0], iy + 2, xf[2] + hxs[1]]];
      }
      for (i = 0; i < bx.length; i++) { b = bx[i]; x0 = b[0]; x1 = b[3]; z0 = b[2]; z1 = b[5];
        if (vr[1] === 0 && i === 1) { if (r === 1) { x0 = 0; x1 = 0.5; z0 = -0.5; z1 = 0.5; } else if (r === 2) { z0 = -0.5; z1 = 0; } else if (r === 3) { x0 = -0.5; x1 = 0; z0 = -0.5; z1 = 0.5; } }
        out.push([ix + 0.5 + x0, iy + 0.5 + b[1], iz + 0.5 + z0, ix + 0.5 + x1, iy + 0.5 + b[4], iz + 0.5 + z1]); }
      return out;
    };
    Object.keys(WZ.VARIANT).forEach(function (t) { var vr = WZ.VARIANT[t]; if (VM[vr[0]]) VM[t] = inst(shapeGeo(SHB[vr[1]]), VM[vr[0]].material, 400, true, false); });
    for (var vt0 = 1; vt0 <= 179; vt0++) if (VM[vt0]) VTYPES.push(vt0);
    for (var fi = 52; fi <= 71; fi++) { var fk = fi >= 70 ? 'bed' : FKIND[Math.floor((fi - 52) / 3)], fw = FWC[fi >= 70 ? fi - 69 : (fi - 52) % 3]; VM[fi] = inst(mergeBoxes(furnParts(fk, fw[0], fw[1], fw[2])), lam(0xffffff, { vertexColors: true }), 200, true, false); }
    W.VSIZE = { 140: [2, 2, 1], 137: [3, 2, 4], 138: [3, 2, 3], 139: [3, 2, 2], 133: [5, 3, 1], 134: [3, 1, 2], 135: [2, 2, 3], 136: [2, 1, 1], 132: [3, 1, 2], 126: [3, 1, 2], 127: [3, 1, 2], 128: [2, 2, 2], 129: [2, 2, 2], 130: [4, 4, 2], 131: [4, 4, 2], 86: [2, 2, 3], 85: [2, 1, 2], 79: [1, 1, 1], 80: [2, 2, 1], 81: [3, 3, 1], 82: [1, 1, 1], 83: [2, 2, 1], 84: [3, 3, 1], 72: [2, 1, 1], 73: [2, 1, 1], 74: [2, 1, 2], 75: [2, 1, 2], 76: [2, 1, 2], 77: [3, 1, 2], 78: [3, 1, 2], 70: [2, 1, 1], 71: [2, 1, 1], 55: [2, 1, 1], 56: [2, 1, 1], 57: [2, 1, 1], 58: [2, 1, 1], 59: [2, 1, 1], 60: [2, 1, 1], 51: [1, 1, 3], 49: [3, 1, 2], 50: [3, 2, 2], 43: [1, 1, 2], 29: [2, 1, 2], 30: [3, 1, 2], 31: [2, 1, 2], 32: [3, 1, 2], 3: [1, 1, 2], 4: [2, 1, 1], 5: [2, 1, 1], 6: [1, 1, 2], 7: [2, 2, 2], 9: [3, 1, 2], 11: [3, 1, 2], 16: [3, 2, 2], 17: [2, 1, 2], 18: [2, 2, 3], 19: [3, 1, 2], 20: [2, 1, 2], 21: [2, 1, 1], 22: [2, 1, 1], 23: [2, 1, 1], 24: [2, 1, 1], 25: [2, 1, 1] };
    W.HPT = { 140: 120, 137: 160, 138: 170, 139: 130, 133: 150, 134: 110, 135: 140, 136: 130, 132: 90, 126: 90, 127: 90, 128: 70, 129: 120, 130: 160, 131: 260, 86: 90, 85: 90, 79: 40, 80: 40, 81: 40, 82: 40, 83: 40, 84: 40, 72: 90, 73: 90, 74: 90, 75: 90, 76: 90, 77: 90, 78: 90, 52: 50, 53: 50, 54: 50, 55: 50, 56: 50, 57: 50, 58: 50, 59: 50, 60: 50, 61: 50, 62: 50, 63: 50, 64: 50, 65: 50, 66: 50, 67: 50, 68: 50, 69: 50, 70: 55, 71: 55, 1: 30, 2: 90, 3: 80, 4: 50, 5: 45, 6: 60, 7: 40, 8: 120, 9: 70, 10: 36, 11: 90, 12: 80, 13: 150, 14: 275, 15: 500, 16: 90, 17: 90, 18: 100, 19: 90, 20: 90, 21: 80, 22: 150, 23: 285, 24: 120, 25: 185, 26: 20, 27: 24, 28: 20, 29: 90, 30: 100, 31: 90, 32: 100, 33: 75, 34: 75, 35: 75, 36: 75, 37: 100, 38: 100, 39: 90, 40: 90, 41: 90, 42: 90, 43: 120, 44: 40, 45: 60, 46: 200, 47: 25, 48: 400, 49: 100, 50: 90 };
    Object.keys(WZ.VARIANT).forEach(function (t) { W.HPT[t] = WZ.ITEMS[WZ.VARIANT[t][3]].hp; });
    W.VM = VM;
    var vkeys = {}, vcount = 0; VTYPES.forEach(function (t) { vkeys[t] = []; }); W.MAX_VOX = 2600;
    W.voxCount = function () { return vcount; };
    W.setVox = function (x, y, z, t, hp, part, sz, rot) {
      if (y < 0 || y >= VMAX || Math.abs(x) > MAPH + 2 || Math.abs(z) > MAPH + 2) return false;
      var k = vk(x, y, z); if (vox.has(k)) return false;
      var arr = vkeys[t]; if (!arr || !VM[t]) return false;
      if (part != null) {
        vox.set(k, { t: t, hp: hp, idx: -1, anc: part });
        vcount++;
        return true;
      }
      if (arr.length >= VM[t].instanceMatrix.count) return false;
      var vsz = W.VSIZE[t], bx = vsz ? vsz[0] : 1, bz = vsz ? vsz[1] : 1, by = vsz ? vsz[2] : 1;
      var r0 = (W.isSh(t)) ? (rot || 0) : (rot ? 1 : 0);
      var w = sz ? sz.w : (r0 ? bz : bx), d = sz ? sz.d : (r0 ? bx : bz), h = sz ? sz.h : by;
      var idx = arr.length, rec = { t: t, hp: hp, idx: idx, rot: r0 };
      arr.push([x, y, z, r0]); vox.set(k, rec);
      if (W.isNew(t)) { var xf0 = shXf(t, x, y, z, r0); put(VM[t], xf0[0], xf0[1], xf0[2], 1, 1, 1, xf0[3], null, idx); } else put(VM[t], x + w / 2, y + h / 2, z + d / 2, bx, by, bz, r0 * Math.PI / 2, null, idx);
      VM[t].count = arr.length; vcount++;
      if (t >= 3 && t !== 10) rec.ent = addBlockEnt(x, y, z, t, { w: w, d: d, h: h });
      return true;
    };
    W.blockMesh = function (t) { var m = VM[t]; if (!m) return null; var o = new THREE.Mesh(m.geometry, m.material); o.castShadow = false; return o; };
    W.setTurretYaw = function (e, ang) { var r = vox.get(vk(e.vx, e.vy, e.vz)); if (!r || !VM[e.vt]) return; r.yawA = ang; e.yaw = ang; put(VM[e.vt], e.vx + 0.5, e.vy + 0.5, e.vz + 0.5, 1, 1, 1, ang, null, r.idx); };
    W.setShaped = function (x, y, z, t, hp, rot) { return W.setVox(x, y, z, t, hp, null, null, rot || 0); };
    /* multi-cell blocks: all cells share the anchor's single full-footprint mesh; rot swaps X/Z footprint */
    W.canPlaceBig = function (x, y, z, t, rot) {
      var sz = W.VSIZE[t] || [1, 1, 1], w = rot ? sz[1] : sz[0], d = rot ? sz[0] : sz[1], h = sz[2], out = []; if (W.isNew(t)) { sz = [1, 1, WZ.VARIANT[t][1] === 3 ? 2 : 1]; w = 1; d = 1; h = sz[2]; }
      for (var dx = 0; dx < w; dx++) for (var dz = 0; dz < d; dz++) for (var dy = 0; dy < h; dy++) {
        var cx = x + dx, cy = y + dy, cz = z + dz; if (cy >= VMAX || vox.has(vk(cx, cy, cz)) || Math.abs(cx) > MAPH + 2 || Math.abs(cz) > MAPH + 2) return null;
        if (!(dx === 0 && dy === 0 && dz === 0) && W.hit(cx + 0.02, cx + 0.98, cy + 0.02, cy + 0.98, cz + 0.02, cz + 0.98)) return null;
        out.push([cx, cy, cz]);
      }
      return out;
    };
    W.setBig = function (x, y, z, t, hp, rot) {
      if (W.isNew(t) && WZ.VARIANT[t][1] === 3) { var dc = W.canPlaceBig(x, y, z, t, rot); if (!dc) return false; if (!W.setShaped(x, y, z, t, hp, rot)) return false; var ak0 = vk(x, y, z), rec0 = vox.get(ak0), uk = vk(x, y + 1, z); vox.set(uk, { t: t, hp: hp, idx: -1, anc: ak0 }); vcount++; rec0.cells = [ak0, uk]; return true; }
      if (W.isSh(t)) return W.setShaped(x, y, z, t, hp, rot); var sz = W.VSIZE[t]; if (!sz) return W.setVox(x, y, z, t, hp);
      var cells = W.canPlaceBig(x, y, z, t, rot); if (!cells) return false;
      var r0 = rot ? 1 : 0, w = r0 ? sz[1] : sz[0], d = r0 ? sz[0] : sz[1], h = sz[2], ak = vk(x, y, z);
      if (!W.setVox(x, y, z, t, hp, null, { w: w, d: d, h: h }, r0)) return false;
      var rec = vox.get(ak); rec.cells = [ak]; rec.rot = r0;
      for (var i = 1; i < cells.length; i++) { var c = cells[i]; if (W.setVox(c[0], c[1], c[2], t, hp, ak)) rec.cells.push(vk(c[0], c[1], c[2])); }
      return true;
    };
    W.toggleDoor = function (x, y, z) {
      var rec = W.getVox(x, y, z); if (!rec || !W.isNew(rec.t) || WZ.VARIANT[rec.t][1] === 4) return null;
      var a = vkeys[rec.t][rec.idx]; if (!a) return null; var nr = (rec.rot || 0) ^ 4; rec.rot = nr; a[3] = nr;
      var xf = shXf(rec.t, a[0], a[1], a[2], nr); put(VM[rec.t], xf[0], xf[1], xf[2], 1, 1, 1, xf[3], null, rec.idx); VM[rec.t].instanceMatrix.needsUpdate = true;
      if (rec.cells && rec.cells[1] != null) { var up = vox.get(rec.cells[1]); if (up) up.rot = nr; }
      return (nr & 4) !== 0;
    };
    W.getVox = function (x, y, z) { var r = vox.get(vk(x, y, z)); if (r && r.anc != null) return vox.get(r.anc) || null; return r || null; };
    function rmCell(k) {
      var v = vox.get(k); if (!v) return;
      if (v.idx < 0) { vox.delete(k); vcount--; return; }
      var arr = vkeys[v.t], last = arr.pop(), m = VM[v.t];
      if (v.idx !== arr.length) {
        arr[v.idx] = last;
        var lr = vox.get(vk(last[0], last[1], last[2]));
        if (lr) lr.idx = v.idx;
        var vsz = W.VSIZE[v.t], lbx = vsz ? vsz[0] : 1, lbz = vsz ? vsz[1] : 1, lby = vsz ? vsz[2] : 1;
        var lrot = last[3] != null ? last[3] : (lr && lr.rot ? lr.rot : 0);
        var lw = (W.isSh(v.t)) ? 1 : (lrot ? lbz : lbx), ld = (W.isSh(v.t)) ? 1 : (lrot ? lbx : lbz), lh = lby;
        if (W.isNew(v.t)) { var xf1 = shXf(v.t, last[0], last[1], last[2], lrot); put(m, xf1[0], xf1[1], xf1[2], 1, 1, 1, xf1[3], null, v.idx); } else
        put(m, last[0] + lw / 2, last[1] + lh / 2, last[2] + ld / 2, lbx, lby, lbz, lr && lr.yawA != null ? lr.yawA : lrot * Math.PI / 2, null, v.idx);
      }
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
        var a = vkeys[v.t][v.idx], p = (((a[0] + 4096) * 8192 + (a[2] + 4096)) * 64 + a[1]) * 512 + (v.t - 1);
        if (v.cells || (W.isSh(v.t))) out.push([p, Math.max(1, Math.round(v.hp)), v.rot || 0]);
        else out.push(Math.round(v.hp) < W.HPT[v.t] ? [p, Math.max(1, Math.round(v.hp))] : p);
      });
      return out;
    };
    W.voxLoad = function (list, ver) {
      if (!Array.isArray(list)) return; var v5 = (ver || 1) >= 5, v4 = (ver || 1) >= 4, v2 = (ver || 1) >= 3;
      list.forEach(function (en) {
        var n = Array.isArray(en) ? en[0] : en, hp = Array.isArray(en) ? en[1] : null, rot = Array.isArray(en) && en.length > 2 ? en[2] : null, t, y, r, z, x;
        if (!v2) return;
        if (ver >= 6) { t = (n % 512) + 1; r = Math.floor(n / 512); y = r % 64; r = Math.floor(r / 64); z = (r % 8192) - 4096; x = Math.floor(r / 8192) - 4096; }
        else if (v5) { t = (n % 128) + 1; r = Math.floor(n / 128); y = r % 64; r = Math.floor(r / 64); z = (r % 8192) - 4096; x = Math.floor(r / 8192) - 4096; }
        else if (v4) { t = (n % 32) + 1; y = Math.floor(n / 32) % 64; r = Math.floor(n / 2048); z = (r % 2048) - 1024; x = Math.floor(r / 2048) - 1024; }
        else { t = (n % 16) + 1; y = Math.floor(n / 16) % 64; r = Math.floor(n / 1024); z = (r % 2048) - 1024; x = Math.floor(r / 2048) - 1024; }
        if (t >= 1 && t <= 255 && VM[t]) { if (rot != null || W.VSIZE[t]) W.setBig(x, y, z, t, hp != null ? hp : W.HPT[t], rot || 0); else W.setVox(x, y, z, t, hp != null ? hp : W.HPT[t]); }
      });
    };
    W.resetWorld = function (newSeed, keepBuild) {
      var keepOwned = W.ocars.slice();
      if (!keepBuild) {
        vox.clear(); VTYPES.forEach(function (t) { vkeys[t].length = 0; VM[t].count = 0; VM[t].instanceMatrix.needsUpdate = true; });
        vcount = 0; W.bents.forEach(function (e) { e.alive = false; }); W.bents.length = 0; W.furn.length = 0; W.sinks.length = 0; W.camps.length = 0; W.anvils.length = 0; W.comps.length = 0; W.saws.length = 0; W.tbench.length = 0; W.turrets.length = 0; W.mills.length = W.bombs.length = W.kilns.length = W.crafts.length = W.works.length = W.seats.length = W.tables.length = W.lamps.length = 0; Object.keys(WZ.GST).forEach(function (t) { W[WZ.GST[t][2]].length = 0; }); W.tanks.length = 0; W.farms.forEach(function (f) { if (f.fmG && f.fmG.parent) f.fmG.parent.remove(f.fmG); }); W.farms.length = 0; W.gods.length = W.liqs.length = W.sews.length = W.blasts.length = W.presses.length = W.casings.length = W.trapbs.length = W.masons.length = W.chests.length = 0;
      }
      sgrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn) l.splice(i, 1); });
      egrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn && l[i].vx == null) l.splice(i, 1); });
      W.ents = W.ents.filter(function (e) { return !e.dyn || e.vx != null; });
      W.trees.length = 0; W.rocks.length = 0; W.piles.length = 0; W.cars.length = 0; W.crates.length = staticCrateCount;
      dynBakedMeshes.forEach(function (im) { if (im.parent) im.parent.remove(im); if (im.dispose) im.dispose(); });
      dynBakedMeshes.length = 0; leaf2Chunks.length = 0;
      DYN_INSTS.forEach(function (m) { m._map = null; m.visible = true; scene.add(m); });
      for (var ci = 0; ci < staticCrateCount; ci++) { W.crates[ci].respawn = 0; W.setCrate(W.crates[ci], true); }
      TMESH.forEach(function (m) { m.count = 0; }); leafM.count = 0; leaf2M.count = 0; rockM.count = pileM.count = bushPileM.count = shineM.count = tableM.count = tlegM.count = carWh.count = 0;
      CARM.forEach(function (m) { m.count = 0; });
      crateM.count = lidM.count = staticCrateCount;
      W.pools.forEach(function (p) { scene.remove(p.m); }); W.pools.length = 0;
      spawnNature(newSeed != null ? newSeed : rndSeed(), !!keepBuild);
      W.ocars.length = 0; if (keepBuild) keepOwned.forEach(function (c) { W.reattachCar(c); });
    };

    var skyColor = new THREE.Color(0x88b8de), fogColor = new THREE.Color(0x9bc4e6);
    scene.background = skyColor; scene.fog = new THREE.Fog(fogColor, 34, 220);
    var hemi = new THREE.HemisphereLight(0xf2f7ff, 0x625a48, 1.3); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff5e0, 1.25); sun.position.set(80, 90, 60); scene.add(sun); scene.add(sun.target); W.sun = sun; W.hemi = hemi; W.shadowsOn = false; W.sunDirty = true;
    var lastShadowRad = 75;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; var shc = sun.shadow.camera; shc.left = -75; shc.right = 75; shc.top = 75; shc.bottom = -75; shc.near = 20; shc.far = 420; shc.updateProjectionMatrix();
    /* Render Shader Distance (metres): shadow frustum radius around the player */
    W.setShadowDist = function (m) { var rad = Math.min(160, Math.max(24, Math.round(m || 70))); if (rad === lastShadowRad) return; lastShadowRad = rad; shc.left = -rad; shc.right = rad; shc.top = rad; shc.bottom = -rad; shc.updateProjectionMatrix(); W.sunDirty = true; };
    W.setShadowRange = function (sr) {
      var rad = Math.min(90, Math.max(24, Math.round((sr || 5) * CH * 0.85)));
      if (rad !== lastShadowRad) {
        lastShadowRad = rad;
        shc.left = -rad; shc.right = rad; shc.top = rad; shc.bottom = -rad;
        shc.updateProjectionMatrix();
      }
    };

    var skyGrp = new THREE.Group(); scene.add(skyGrp);
    var sunMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff0b3, fog: false }));
    var moonMesh = new THREE.Mesh(new THREE.SphereGeometry(6.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0xdce8ff, fog: false }));
    skyGrp.add(sunMesh); skyGrp.add(moonMesh);

    var starPos = [];
    for (var si = 0; si < 260; si++) { var th = R() * 6.283, ph = R() * 1.35 + 0.1; starPos.push(Math.cos(th) * Math.cos(ph) * 232, Math.sin(ph) * 232, Math.sin(th) * Math.cos(ph) * 232); }
    var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
    skyGrp.add(new THREE.Points(starGeo, starMat));

    var SHADER_LIGHT = {
      cinematic: { name: 'Cinematic PBR',       sunMul: 1.05, hemiMul: 1.00, fogTint: null,     fogMul: 1.00 },
      warm_apoc: { name: 'Warm Sunset Survival', sunMul: 1.12, hemiMul: 0.94, fogTint: 0xe6b892, fogMul: 0.18 },
      daylight:  { name: 'Crisp Daylight Clear', sunMul: 1.18, hemiMul: 1.08, fogTint: 0xd9eeff, fogMul: 0.12 },
      noir:      { name: 'Overcast Tactical',    sunMul: 0.90, hemiMul: 1.12, fogTint: 0x9aa4b0, fogMul: 0.34 }
    };
    var curShaderPack = 'cinematic', lastSkyH = 7.0, lastSkyX = -32, lastSkyZ = 32;
    W.SHADER_PACKS = Object.keys(SHADER_LIGHT).map(function (id) { return { id: id, name: SHADER_LIGHT[id].name }; });

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
    var cA = new THREE.Color(), cB = new THREE.Color(), cT = new THREE.Color();
    function lerpCol(out, hexA, hexB, f) { cA.setHex(hexA); cB.setHex(hexB); out.copy(cA).lerp(cB, f); }

    var ugMode = false;
    W.setUnderground = function (on) { ugMode = !!on; if (W.ugL) W.ugL.forEach(function (l) { l.floor.visible = ugMode; }); skyGrp.visible = !ugMode; };
    W.updateSky = function (hour, px, pz) {
      lastSkyH = hour; lastSkyX = px || 0; lastSkyZ = pz || 0;
      if (ugMode) { skyColor.setHex(0x080706); fogColor.setHex(0x080706); scene.fog.color.copy(fogColor); hemi.color.setHex(0x9a8c78); hemi.groundColor.setHex(0x2a2520); hemi.intensity = 0.8; sun.intensity = 0; return; }
      var h = ((hour % 24) + 24) % 24, i = 0;
      while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
      var k0 = KEYS[i], k1 = KEYS[i + 1], f = (h - k0[0]) / (k1[0] - k0[0] || 1);
      var sl = SHADER_LIGHT[curShaderPack] || SHADER_LIGHT.cinematic;
      lerpCol(skyColor, k0[1], k1[1], f); lerpCol(fogColor, k0[2], k1[2], f);
      if (sl.fogTint) { cT.setHex(sl.fogTint); skyColor.lerp(cT, sl.fogMul * 0.5); fogColor.lerp(cT, sl.fogMul); }
      scene.fog.color.copy(fogColor);
      lerpCol(hemi.color, k0[3], k1[3], f); lerpCol(hemi.groundColor, k0[4], k1[4], f); hemi.intensity = (k0[5] + (k1[5] - k0[5]) * f) * sl.hemiMul;
      lerpCol(sun.color, k0[6], k1[6], f); sun.intensity = (k0[7] + (k1[7] - k0[7]) * f) * sl.sunMul;
      var ang = ((h - 6) / 24) * Math.PI * 2, sy = Math.sin(ang) * 215, sx = Math.cos(ang) * 215, sz = 45;
      skyGrp.position.set(px || 0, 0, pz || 0);
      sunMesh.position.set(sx, sy, sz); sunMesh.visible = sy > -20;
      moonMesh.position.set(-sx, -sy, -sz); moonMesh.visible = -sy > -20;
      var ox, oy, oz; if (sy >= -8) { ox = sx; oy = Math.max(15, sy); oz = sz; } else { ox = -sx; oy = Math.max(25, -sy); oz = -sz; }
      W.sunVec = { x: sx, y: sy, z: sz };
      if (!W.shadowsOn || W.sunDirty) { sun.position.set((px || 0) + ox, oy, (pz || 0) + oz); sun.target.position.set(px || 0, 0, pz || 0); sun.target.updateMatrixWorld(); W.sunDirty = false; } /* with the shadow map on, the light only moves when the map is refreshed (every 10 s) */
      starMat.opacity = h < 5.2 || h > 19.2 ? 0.9 : h < 6.4 ? (6.4 - h) / 1.2 * 0.9 : h > 18.0 ? (h - 18.0) / 1.2 * 0.9 : 0;
    };
    W.setShaderPack = function (id) {
      if (id && SHADER_LIGHT[id]) curShaderPack = id;
      W.updateSky(lastSkyH, lastSkyX, lastSkyZ);
    };
    W.updateSky(7.0, -32, 32);
    return W;
  };
})(window.WZ);
/* End of world.js */