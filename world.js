/* world.js - Webzombite */
(function (WZ) {
  'use strict';
  WZ.HALF = 1000; WZ.SPAWN_HALF = 1025; /* map 2000 m x 2000 m, mob spawn ring 2050 m x 2050 m */
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
    var W = { half: WZ.HALF, ents: [], trees: [], rocks: [], piles: [], crates: [], furn: [], sinks: [], camps: [], anvils: [], comps: [], waters: [], bents: [], rects: [], roads: [], spawn: { x: -32, y: 0, z: 32 }, seed: 0 };
    var HALF = WZ.HALF, ROADS = [], RW = 10; for (var rk = -15; rk <= 14; rk++) ROADS.push(32 + 64 * rk); W.roads = ROADS; W.half = HALF;

    var CELL = 8, sgrid = new Map();
    function ck(cx, cz) { return (cx + 200) * 512 + (cz + 200); }
    function addBox(x0, x1, y0, y1, z0, z1, isDyn) {
      var b = { x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, on: true, dyn: !!isDyn };
      for (var cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (var cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        var k = ck(cx, cz), l = sgrid.get(k); if (!l) { l = []; sgrid.set(k, l); } l.push(b);
      }
      return b;
    }
    W.addBox = addBox;

    var vox = new Map(), VMAX = 40, info = { top: 0, bottom: 0, vox: null, box: null };
    function vk(x, y, z) { return ((x + 1100) * 4096 + (z + 1100)) * 64 + y; }
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
          key = vk(ix, iy, iz); if (vox.has(key)) { found = true; if (iy + 1 > info.top) info.top = iy + 1; if (iy < info.bottom) info.bottom = iy; info.vox = key; }
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
      P.set(x, y, z); S.set(sx, sy, sz); Q.setFromAxisAngle(UP, ry || 0); Mx.compose(P, Q, S);
      m.setMatrixAt(i, Mx);
      if (col != null && m.instanceColor) { C.setHex(col); C.toArray(m.instanceColor.array, i * 3); m.instanceColor.needsUpdate = true; }
      m.instanceMatrix.needsUpdate = true; return i;
    }
    W.put = put;
    var box1 = new THREE.BoxGeometry(1, 1, 1), boxB = new THREE.BoxGeometry(1, 1, 1); boxB.translate(0, 0.5, 0);
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
    var houseWallTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(9); g.fillStyle = '#f2eee6'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y + 2, w, 2); }
      for (var i = 0; i < 360; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.12)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 3); }
    });
    var winTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#f2ede2'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a6b82'; g.fillRect(7, 7, w - 14, h - 14);
      g.fillStyle = 'rgba(210,240,255,.32)'; g.fillRect(10, 10, 18, h - 22);
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
    function biomeOf(x, z) { if (z < -500) return 'snow'; if (x > 500) return 'desert'; if (x < -500) return 'jungle'; return 'city'; }
    W.biomeOf = biomeOf;
    (function () {
      var E = HALF + 100, defs = [
        ['city', -500, 500, -500, E, groundTexMake('#5c6142', 'rgba(65,55,38,.45)', 'rgba(110,125,70,.7)', 5, 1)],
        ['desert', 500, E, -500, E, groundTexMake('#d6b676', 'rgba(170,130,70,.5)', 'rgba(235,205,140,.7)', 6, 1)],
        ['jungle', -E, -500, -500, E, groundTexMake('#2f5a2a', 'rgba(20,50,20,.5)', 'rgba(70,120,50,.7)', 7, 1)],
        ['snow', -E, E, -E, -500, groundTexMake('#e6eef3', 'rgba(170,190,205,.5)', 'rgba(255,255,255,.8)', 8, 1)]];
      defs.forEach(function (d) {
        var w = d[2] - d[1], h = d[4] - d[3], m = d[5]; m.repeat.set(w / 8.5, h / 8.5);
        var pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(0xffffff, { map: m })); pm.rotation.x = -Math.PI / 2; pm.position.set((d[1] + d[2]) / 2, 0, (d[3] + d[4]) / 2); scene.add(pm);
      });
    })();
    (function () {
      var pos = [], norm = [], uv = [], idx = [];
      function pq(v0, v1, v2, v3, sw) {
        var b = pos.length / 3; pos.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
        for (var i = 0; i < 4; i++) norm.push(0, 1, 0);
        if (sw) uv.push(0, 0, 0, 1, 214, 1, 214, 0); else uv.push(0, 0, 1, 0, 1, 214, 0, 214);
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
    ROADS.forEach(function (c) { for (var t = -HALF - 5; t < HALF + 5; t += 7) { put(dashes, c, 0.03, t, 0.18, 0.01, 3.2, 0, null); put(dashes, t, 0.032, c, 3.2, 0.01, 0.18, 0, null); } });

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

    var walls = inst(box1, lam(0xffffff, { map: houseWallTex }), 56000, false, true), winM = inst(box1, lam(0xffffff, { map: winTex }), 20000, false, false), roofCols = [0x5c5751, 0x69625a, 0x51575e];
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
    function tallBuilding(x0, x1, z0, z1, h) {
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
    function wallSeg(x0, x1, z0, z1, y0, y1, col) { put(walls, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, col); addBox(x0, x1, y0, y1, z0, z1, false); }

    var bedM = inst(box1, lam(0xffffff, { map: houseWallTex }), 6000, false, true), couchM = inst(box1, lam(0xffffff, { map: houseWallTex }), 6000, false, true);
    function addBed(x, z, clean) {
      put(bedM, x, 0.3, z, 2.0, 0.6, 1.0, 0, clean ? 0xe5dfd0 : 0x6e5b4d); put(bedM, x - 0.9, 0.65, z, 0.18, 0.5, 1.0, 0, clean ? 0xc89562 : 0x4a3d33);
      addBox(x - 1.0, x + 1.0, 0, 0.6, z - 0.5, z + 0.5, false); addEnt({ k: 'bed', x: x, z: z, y: 0, r: 1.3, h: 0.8, clean: clean, alive: true, dyn: false });
    }
    function addCouch(x, z, clean) {
      put(couchM, x, 0.3, z, 1.9, 0.6, 0.9, 0, clean ? 0x7b996d : 0x5c4f43); put(couchM, x, 0.75, z - 0.38, 1.9, 0.6, 0.2, 0, clean ? 0x5f7d52 : 0x453b31);
      addBox(x - 0.95, x + 0.95, 0, 0.6, z - 0.45, z + 0.45, false); addEnt({ k: 'couch', x: x, z: z, y: 0, r: 1.15, h: 0.9, clean: clean, alive: true, dyn: false });
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
        else { wallSeg(x0, x1, s[0] - t / 2, s[0] + t / 2, 0, H, col); put(winM, (x0 + x1) / 2 - hw * 0.25, 1.65, s[0], 1.5, 1.1, t + 0.06, 0, null); put(winM, (x0 + x1) / 2 + hw * 0.25, 1.65, s[0], 1.5, 1.1, t + 0.06, 0, null); }
      });
      [[x0, 'w'], [x1, 'e']].forEach(function (s) {
        if (face === s[1]) { wallSeg(s[0] - t / 2, s[0] + t / 2, z0 + t / 2, dz - gap, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz + gap, z1 - t / 2, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz - gap, dz + gap, 2.4, H, roofCol); }
        else { wallSeg(s[0] - t / 2, s[0] + t / 2, z0 + t / 2, z1 - t / 2, 0, H, col); put(winM, s[0], 1.65, (z0 + z1) / 2, t + 0.06, 1.1, 1.5, 0, null); }
      });
      wallSeg(x0 - 0.15, x1 + 0.15, z0 - 0.15, z1 + 0.15, H, H + 0.42, roofCol);
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, back = face === 'n' ? 1 : face === 's' ? -1 : 0, backx = face === 'w' ? 1 : face === 'e' ? -1 : 0;
      var bx = cx + (backx ? backx * (hw / 2 - 1.6) : -hw / 4), bz = cz + (back ? back * (hd / 2 - 1.2) : -hd / 4); addBed(bx, bz, R() < 0.5);
      var kx = cx + (backx ? backx * (hw / 2 - 1.2) : hw / 4), kz = cz + (back ? back * (hd / 2 - 1.2) : hd / 4) + (backx ? 3 : 0);
      if (backx || back) addCouch(kx + (backx ? 0 : 1), kz, R() < 0.5);
      if (R() < 0.6) { var crx = cx + rr(-hw / 4, hw / 4), crz = cz + rr(-hd / 5, hd / 5); if (Math.hypot(crx - bx, crz - bz) > 1.8) addCrate(crx, crz, false, null, zn === 'mid' && R() < 0.5 ? 2 : 1); }
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
    var trunkM = inst(trunkG, lam(0xffffff, { map: barkTex }), 5200, true, false), crownM = inst(crownG, lam(0xffffff, { map: leafTex }), 5200, true, true);
    function treeMat(t, on) {
      if (!on) { put(trunkM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix); put(crownM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix); return; }
      put(trunkM, t.x, 0, t.z, 1.2 * t.s, t.th, 1.2 * t.s, t.ry, null, t.ix); put(crownM, t.x, t.th * 0.62, t.z, 2.6 * t.s, 3.4 * t.s, 2.6 * t.s, t.ry, t.cc, t.ix);
    }
    W.setTree = function (t, on) { treeMat(t, on); t.box.on = on; t.alive = on; };
    function addTree(x, z, rng, bm) {
      var s = Math.pow(rng(), 1.6) * 1.5 + 0.7, th = 3.0 * s;
      var t = { k: 'tree', idx: W.trees.length, x: x, z: z, y: 0, s: s, th: th, ry: rng() * 6.28, r: 0.55 * s + 0.15, h: th * 0.62 + 3.4 * s, alive: true, dyn: true, max: Math.round(34 * s * s), hp: 0, yield: Math.round(3 + 5.2 * s * s), given: 0, respawn: 0, cc: pick(bm === 'snow' ? [0xe8f0f5, 0xd5e2ea, 0xc6d8e0] : bm === 'jungle' ? [0x2f6b30, 0x3a7d35, 0x25602a, 0x4a8a3a] : bm === 'desert' ? [0x8a8a4a, 0x9a9055, 0x7d7d45] : [0x4c6e3d, 0x577c43, 0x426137, 0x677a43, 0x736d43], rng) };
      t.hp = t.max; t.ix = trunkM.count; trunkM.count++; crownM.count++; t.box = addBox(x - 0.3 * s, x + 0.3 * s, 0, th, z - 0.3 * s, z + 0.3 * s, true);
      treeMat(t, true); addEnt(t); W.trees.push(t);
    }

    var rockG = new THREE.DodecahedronGeometry(1, 0), rockM = inst(rockG, lam(0xffffff, { map: rockTex, flatShading: true }), 2300, true, true);
    W.setRock = function (t, on) {
      if (!on) put(rockM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix);
      else put(rockM, t.x, 0.55 * t.s, t.z, 1.15 * t.s, 0.8 * t.s, 1.0 * t.s, t.ry, t.cc, t.ix);
      t.box.on = on; t.alive = on;
    };
    /* [ORE TAG] kinds: stone | coal | copper | iron | gold.  Surface: 90% stone / 9% coal / 1% copper. Underground: 40 stone / 30 coal / 15 copper / 10 iron / 5 gold. */
    var ORE_COL = { stone: 0x8d9198, coal: 0x33343a, copper: 0xd2733a, iron: 0xb59a8c, gold: 0xe0b83a };
    function addRock(x, z, kindIn, rng) {
      var kind = kindIn || 'stone', plain = kind === 'stone', s = rr(0.8, 2.1, rng);
      var t = { k: 'rock', idx: W.rocks.length, kind: kind, ore: kind === 'iron', coal: kind === 'coal', gold: kind === 'gold', copper: kind === 'copper', x: x, z: z, y: 0, s: s, ry: rng() * 6.28, r: 0.95 * s, h: 1.5 * s, alive: true, dyn: true,
        max: Math.round((plain ? 60 : kind === 'coal' ? 70 : 100) * s * s), yield: plain ? Math.round(4 + 6 * s * s) : kind === 'coal' ? Math.round(2 + 3 * s * s) : kind === 'copper' ? Math.round(4 + 6 * s * s) : Math.round(2 + 4 * s * s), given: 0, respawn: 0, cc: ORE_COL[kind] };
      t.hp = t.max; t.ix = rockM.count++; t.box = addBox(x - 0.8 * s, x + 0.8 * s, 0, 1.2 * s, z - 0.8 * s, z + 0.8 * s, true);
      W.setRock(t, true); addEnt(t); W.rocks.push(t);
    }
    function rollSurfaceOre(rng) { var r = rng(); return r < 0.90 ? 'stone' : r < 0.99 ? 'coal' : 'copper'; }
    function rollUgOre(rng) { var r = rng() * 100; return r < 40 ? 'stone' : r < 70 ? 'coal' : r < 85 ? 'copper' : r < 95 ? 'iron' : 'gold'; }

    var pileM = inst(box1, lam(0xffffff, { map: houseWallTex }), 24000, true, true), shineM = inst(box1, lam(0xffffff), 6500, true, true), tableM = inst(box1, lam(0xffffff, { map: plankTex }), 400, true, true), tlegM = inst(box1, lam(0x3a2a1a), 1600, true, true);
    W.setPile = function (p, full) {
      if (p.tier === 4) { p.parts.forEach(function (q) { put(q.m, p.x + q.dx, (q.item && !full) ? -5 : q.y, p.z + q.dz, q.sx, q.sy, q.sz, q.ry, q.col, q.i); }); p.searched = !full; return; }
      var k = full ? 1 : 0.3; p.parts.forEach(function (q) { put(q.m, p.x + q.dx, q.y * k, p.z + q.dz, q.sx, q.sy * k, q.sz, q.ry, q.col, q.i); }); p.searched = !full; };
    function addPile(x, z, tier, rng) {
      var p = { k: 'pile', idx: W.piles.length, tier: tier, x: x, z: z, y: 0, r: 0.9, h: 0.9, alive: true, dyn: true, searched: false, respawn: 0, parts: [] };
      if (tier === 4) {
        var ry4 = rng() * 3.14, tq = { m: tableM, dx: 0, dz: 0, sx: 1.7, sy: 0.12, sz: 0.95, ry: ry4, col: 0xffffff, y: 0.86 }; tq.i = tableM.count++; p.parts.push(tq);
        var cs = Math.cos(ry4), sn = Math.sin(ry4);
        [[-0.72, -0.38], [0.72, -0.38], [-0.72, 0.38], [0.72, 0.38]].forEach(function (o) { var lq = { m: tlegM, dx: o[0] * cs + o[1] * sn, dz: -o[0] * sn + o[1] * cs, sx: 0.1, sy: 0.8, sz: 0.1, ry: ry4, col: 0xffffff, y: 0.4 }; lq.i = tlegM.count++; p.parts.push(lq); });
        var iq = { m: shineM, dx: 0.1, dz: 0, sx: 0.4, sy: 0.12, sz: 0.28, ry: ry4, col: pick([0x3ad06b, 0x4aa0ff, 0xe8e8f0], rng), y: 0.98, item: true }; iq.i = shineM.count++; p.parts.push(iq);
        p.r = 1.1; p.h = 1.0; W.setPile(p, true); addEnt(p); W.piles.push(p); return;
      }
      var cols = tier === 1 ? [0x6d695f, 0x7a6d5c, 0x5c5a54, 0x827868] : [0x7a7871, 0x676a6e, 0x8a7d69, 0x5e5d59];
      for (var i = 0; i < 5; i++) { var q = { m: pileM, dx: rr(-0.5, 0.5, rng), dz: rr(-0.5, 0.5, rng), sx: rr(0.25, 0.7, rng), sy: rr(0.25, 0.6, rng), sz: rr(0.25, 0.7, rng), ry: rng() * 3, col: pick(cols, rng) }; q.y = q.sy / 2; q.i = pileM.count++; p.parts.push(q); }
      if (tier === 2) for (var j = 0; j < 2; j++) { var q2 = { m: shineM, dx: rr(-0.4, 0.4, rng), dz: rr(-0.4, 0.4, rng), sx: 0.18, sy: 0.12, sz: 0.3, ry: rng() * 3, col: pick([0xdde2e8, 0xe8c468, 0xc4d0d9], rng) }; q2.y = rr(0.4, 0.7, rng); q2.i = shineM.count++; p.parts.push(q2); }
      W.setPile(p, true); addEnt(p); W.piles.push(p);
    }

    var crateM = inst(box1, lam(0xffffff, { map: crateTex }), 900, true, true), lidM = inst(box1, lam(0xffffff), 900, true, true);
    W.setCrate = function (c, full) {
      var bodyCol = c.tier === 2 ? (full ? 0xffdf9e : 0x99845a) : (full ? 0xffffff : 0x8a7558);
      var lidCol = c.tier === 2 ? 0x3b4859 : 0x4f361c;
      put(crateM, c.x, full ? 0.45 : 0.3, c.z, 0.9, full ? 0.9 : 0.6, 0.9, c.ry, bodyCol, c.ix);
      put(lidM, c.x, full ? 0.92 : -5, c.z, 0.98, 0.1, 0.98, c.ry, lidCol, c.ix);
      c.searched = !full;
    };
    function addCrate(x, z, isDyn, rng, tier) {
      var fn = rng || R, c = { k: 'crate', idx: W.crates.length, tier: tier || 1, x: x, z: z, y: 0, r: 0.75, h: 0.9, alive: true, dyn: !!isDyn, searched: false, respawn: 0, ry: fn() * 3 };
      c.ix = crateM.count++; lidM.count++; addBox(x - 0.45, x + 0.45, 0, 0.9, z - 0.45, z + 0.45, !!isDyn);
      W.setCrate(c, true); addEnt(c); W.crates.push(c);
    }

    function addBlockEnt(x, y, z, t) {
      var kind = t === 3 ? 'furnace' : t === 4 ? 'bed' : t === 5 ? 'couch' : t === 6 ? 'sink' : t === 7 ? 'campfire' : t === 8 ? 'anvil' : t === 9 ? 'computer' : null;
      if (!kind) return null;
      var e = { k: kind, x: x + 0.5, z: z + 0.5, y: y, r: 0.85, h: 1, clean: true, alive: true, dyn: true, vx: x, vy: y, vz: z };
      addEnt(e); W.bents.push(e);
      if (t === 3) W.furn.push(e);
      else if (t === 6) W.sinks.push(e);
      else if (t === 7) W.camps.push(e);
      else if (t === 8) W.anvils.push(e);
      else if (t === 9) W.comps.push(e);
      return e;
    }

    /* Loot cars: each car has 10-25 Break Points, loot is in the trunk */
    var carBody = inst(boxB, lam(0xffffff, { map: houseWallTex }), 1000, true, true), carTop = inst(boxB, lam(0x373b40), 1000, true, false);
    W.cars = [];
    W.setCar = function (c, on) {
      if (on) { put(carBody, c.x, 0.25, c.z, c.lx, 0.9, c.lz, 0, c.col, c.ix); put(carTop, c.x, 1.15, c.z, c.horiz ? 2.2 : 1.7, 0.6, c.horiz ? 1.7 : 2.2, 0, null, c.ix); }
      else { put(carBody, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix); put(carTop, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, c.ix); }
      c.box.on = on; c.alive = on;
    };
    function addCar(x, z, horiz, rng) {
      var c = { k: 'car', idx: W.cars.length, x: x, z: z, y: 0, r: 1.9, h: 1.75, horiz: horiz, lx: horiz ? 4.4 : 1.9, lz: horiz ? 1.9 : 4.4, alive: true, dyn: true, respawn: 0, col: pick([0x943636, 0x386191, 0x808036, 0x676d73, 0x9c9c94, 0x4b704b], rng) };
      c.max = c.hp = 10 + Math.floor(rng() * 16); c.ix = carBody.count++; carTop.count++;
      c.box = addBox(x - c.lx / 2, x + c.lx / 2, 0, 1.75, z - c.lz / 2, z + c.lz / 2, true); W.setCar(c, true); addEnt(c); W.cars.push(c);
    }
    var lakeList = [];
    /* Fixed city layout */
    for (var a = 0; a <= ROADS.length; a++) for (var b = 0; b <= ROADS.length; b++) {
      var lx0 = a === 0 ? -HALF : ROADS[a - 1] + RW / 2, lx1 = a === ROADS.length ? HALF : ROADS[a] - RW / 2;
      var lz0 = b === 0 ? -HALF : ROADS[b - 1] + RW / 2, lz1 = b === ROADS.length ? HALF : ROADS[b] - RW / 2;
      var cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, zone = zoneOf(cx, cz), rim = a === 0 || b === 0 || a === ROADS.length || b === ROADS.length;
      if (rim) continue;
      if (lx1 > -935 && lx0 < -875 && lz1 > -933 && lz0 < -877) continue; /* space reserved for the mineshaft mountain */
      curBiome = biomeOf(cx, cz);
      var ins = 5, bx0 = lx0 + ins, bx1 = lx1 - ins, bz0 = lz0 + ins, bz1 = lz1 - ins;
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
      addBox(x0, x1, 0, 1.2, z0, z1, false); occupied.push([x0 - 2.5, x1 + 2.5, z0 - 2.5, z1 + 2.5]);
      W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#2f7fa8' }); W.waters.push({ x0: x0, x1: x1, z0: z0, z1: z1, type: type });
    }
    lakeList.forEach(function (l) { addWater(l[0], l[1], l[2], l[3], 'lake'); });
    addWater(-975, -965, -300, 300, 'river');
    W.waterAt = function (x, z) { for (var i = 0; i < W.waters.length; i++) { var w = W.waters[i]; if (x > w.x0 - 0.3 && x < w.x1 + 0.3 && z > w.z0 - 0.3 && z < w.z1 + 0.3) return w.type; } return null; };
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
      W.mine = { x0: MCX - 26, x1: MCX + 26, z0: MCZ - 24, z1: MCZ + 18, door: { x: MCX, z: MCZ + 2.6 }, entrance: { x: MCX, z: MCZ + 8 } };

      /* ---- Underground: a separate cave level far outside the map. Reached only through the mineshaft door. ---- */
      var N = 61, CS = 6, UH = 5, UX = 1200, UZ = -183, grid = [], i, j;
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
      var UC = [0x4a4640, 0x55504a, 0x3e3b37, 0x5b4a3c];
      function bound(a, b) { if (grid[a][b]) return false; for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) { var na = a + u, nb2 = b + v; if (na >= 0 && nb2 >= 0 && na < N && nb2 < N && grid[na][nb2]) return true; } return false; }
      for (j = 0; j < N; j++) {
        var run = -1;
        for (i = 0; i <= N; i++) {
          var bd = i < N && bound(i, j);
          if (bd && run < 0) run = i;
          if (!bd && run >= 0) { wallSeg(UX + run * CS, UX + i * CS, UZ + j * CS, UZ + (j + 1) * CS, 0, UH, UC[(MR() * 4) | 0]); run = -1; }
        }
      }
      for (var tx = 0; tx < 19; tx++) for (var tz = 0; tz < 19; tz++) put(walls, UX + tx * 20 + 10, UH + 0.5, UZ + tz * 20 + 10, 20, 1, 20, 0, 0x2a2724);
      var ugFloor = new THREE.Mesh(new THREE.PlaneGeometry(N * CS + 8, N * CS + 8), new THREE.MeshLambertMaterial({ color: 0x24211d })); ugFloor.rotation.x = -Math.PI / 2; ugFloor.position.set(UX + N * CS / 2, 0.03, UZ + N * CS / 2); ugFloor.visible = false; scene.add(ugFloor);
      put(walls, cx(1), 1.2, cz(1), 1.4, 2.4, 0.5, 0, 0xc9a23a);
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
    var postM = inst(boxB, lam(0xc44230), 1400, false, false);
    for (var pt = -HALF; pt <= HALF; pt += 6) { put(postM, pt, 0, -HALF, 0.25, 1.6, 0.25, 0, null); put(postM, pt, 0, HALF, 0.25, 1.6, 0.25, 0, null); put(postM, -HALF, 0, pt, 0.25, 1.6, 0.25, 0, null); put(postM, HALF, 0, pt, 0.25, 1.6, 0.25, 0, null); }

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
    [walls, winM, dashes, postM].forEach(bake);
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
      while (n < 5000 && tries++ < 200000) {
        var tx = rr(-HALF + 4, HALF - 4, Rn), tz = rr(-HALF + 4, HALF - 4, Rn), edge = Math.max(Math.abs(tx), Math.abs(tz)), bm = biomeOf(tx, tz), z0n = zoneOf(tx, tz);
        var pr = bm === 'jungle' ? 0.8 : bm === 'snow' ? 0.22 : bm === 'desert' ? 0.02 : (z0n === 'out' ? 0.3 : z0n === 'mid' ? 0.1 : 0.03);
        if (edge > HALF - 21) pr = 0.95;
        if (Rn() > pr || onRoad(tx, tz, 1.5) || inOcc(tx, tz, 2) || !free(tx, tz, 1)) continue;
        addTree(tx, tz, Rn, bm); n++;
      }
      var rocks = 0; tries = 0;
      while (rocks < 1500 && tries++ < 60000) {
        var rx = rr(-HALF + 6, HALF - 6, Rn), rz = rr(-HALF + 6, HALF - 6, Rn), rz0 = zoneOf(rx, rz);
        if ((rz0 === 'down' && Rn() < 0.8) || onRoad(rx, rz, 2) || inOcc(rx, rz, 2.5) || !free(rx, rz, 1.5)) continue;
        addRock(rx, rz, rollSurfaceOre(Rn), Rn); rocks++;
      }
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
      var tb = 0; tries = 0;
      while (tb < 150 && tries++ < 60000) {
        var tl = pick(ROADS, Rn), toff = (Rn() < 0.5 ? -1 : 1) * rr(RW / 2 + 1.5, RW / 2 + 3.5, Rn), talong = rr(-HALF + 6, HALF - 6, Rn), tside = Rn() < 0.5, tpx = tside ? tl + toff : talong, tpz = tside ? talong : tl + toff;
        if (inOcc(tpx, tpz, 1.2) || zoneOf(tpx, tpz) !== 'down' || !free(tpx, tpz, 1.5)) continue; addPile(tpx, tpz, 4, Rn); tb++;
      }
      var cr = 0; tries = 0;
      while (cr < 600 && tries++ < 40000) {
        var qx = rr(-HALF + 10, HALF - 10, Rn), qz = rr(-HALF + 10, HALF - 10, Rn), czn = zoneOf(qx, qz);
        if (onRoad(qx, qz, 1) || inOcc(qx, qz, 1) || (czn === 'down' && Rn() < 0.65) || !free(qx, qz, 1)) continue;
        addCrate(qx, qz, true, Rn, czn === 'down' ? 2 : (czn === 'mid' && Rn() < 0.5 ? 2 : 1)); cr++;
      }
      var cn = 0; tries = 0;
      while (cn < 800 && tries++ < 20000) {
        var vl = pick(ROADS, Rn), alongV = rr(-HALF + 10, HALF - 10, Rn), lane = (Rn() < 0.5 ? -1 : 1) * rr(1.2, 3, Rn), horiz = Rn() < 0.5;
        var cxx = horiz ? alongV : vl + lane, czz = horiz ? vl + lane : alongV, lenX = horiz ? 4.4 : 1.9, lenZ = horiz ? 1.9 : 4.4;
        if (W.hit(cxx - lenX / 2 - 0.5, cxx + lenX / 2 + 0.5, 0.1, 1.8, czz - lenZ / 2 - 0.5, czz + lenZ / 2 + 0.5)) continue;
        addCar(cxx, czz, horiz, Rn); cn++;
      }
    }
    spawnNature(initSeed != null ? initSeed : rndSeed(), false);

    var VM = {
      1: inst(box1, lam(0xffffff, { map: plankTex }), 2600, true, false),
      2: inst(box1, lam(0xffffff, { map: stoneTex }), 2600, true, false),
      3: inst(box1, lam(0xffffff, { map: furnTex }), 150, true, false),
      4: inst(box1, lam(0xffffff, { map: bedTex }), 200, true, false),
      5: inst(box1, lam(0xffffff, { map: couchTex }), 200, true, false),
      6: inst(box1, lam(0xffffff, { map: sinkTex }), 120, true, false),
      7: inst(box1, lam(0xffffff, { map: campTex }), 120, true, false),
      8: inst(box1, lam(0xffffff, { map: anvilTex }), 80, true, false),
      9: inst(box1, lam(0xffffff, { map: compTex }), 80, true, false)
    };
    var vkeys = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] }, vcount = 0; W.MAX_VOX = 2600;
    W.voxCount = function () { return vcount; };
    W.getVox = function (x, y, z) { return vox.get(vk(x, y, z)) || null; };
    W.setVox = function (x, y, z, t, hp) {
      if (y < 0 || y >= VMAX || Math.abs(x) > HALF + 2 || Math.abs(z) > HALF + 2) return false;
      var k = vk(x, y, z); if (vox.has(k)) return false;
      var arr = vkeys[t]; if (!arr || arr.length >= VM[t].instanceMatrix.count) return false;
      var idx = arr.length; arr.push([x, y, z]); vox.set(k, { t: t, hp: hp, idx: idx });
      put(VM[t], x + 0.5, y + 0.5, z + 0.5, 1, 1, 1, 0, null, idx); VM[t].count = arr.length; vcount++;
      if (t >= 3) addBlockEnt(x, y, z, t);
      return true;
    };
    W.delVox = function (x, y, z) {
      var k = vk(x, y, z), v = vox.get(k); if (!v) return null;
      var arr = vkeys[v.t], last = arr.pop(), m = VM[v.t];
      if (v.idx !== arr.length) { arr[v.idx] = last; vox.get(vk(last[0], last[1], last[2])).idx = v.idx; put(m, last[0] + 0.5, last[1] + 0.5, last[2] + 0.5, 1, 1, 1, 0, null, v.idx); }
      m.count = arr.length; m.instanceMatrix.needsUpdate = true; vox.delete(k); vcount--;
      if (v.t >= 3) W.bents.forEach(function (e) { if (e.alive && e.vx === x && e.vy === y && e.vz === z) e.alive = false; });
      return v;
    };
    W.voxList = function () {
      var HP = { 1: 30, 2: 90, 3: 80, 4: 50, 5: 45, 6: 60, 7: 40, 8: 120, 9: 70 }, out = [];
      vox.forEach(function (v) {
        var a = vkeys[v.t][v.idx], p = ((a[0] + 1024) * 2048 + (a[2] + 1024)) * 1024 + a[1] * 16 + (v.t - 1);
        out.push(Math.round(v.hp) < HP[v.t] ? [p, Math.max(1, Math.round(v.hp))] : p);
      });
      return out;
    };
    W.voxLoad = function (list, ver) {
      if (!Array.isArray(list)) return;
      var HP = { 1: 30, 2: 90, 3: 80, 4: 50, 5: 45, 6: 60, 7: 40, 8: 120, 9: 70 }, v2 = (ver || 1) >= 3;
      list.forEach(function (en) {
        var n = Array.isArray(en) ? en[0] : en, hp = Array.isArray(en) ? en[1] : null, t, y, r, z, x;
        if (!v2) return;
        t = (n % 16) + 1; y = Math.floor(n / 16) % 64; r = Math.floor(n / 1024); z = (r % 2048) - 1024; x = Math.floor(r / 2048) - 1024;
        if (t >= 1 && t <= 9) W.setVox(x, y, z, t, hp != null ? hp : HP[t]);
      });
    };
    W.resetWorld = function (newSeed, keepBuild) {
      if (!keepBuild) {
        vox.clear(); [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (t) { vkeys[t].length = 0; VM[t].count = 0; VM[t].instanceMatrix.needsUpdate = true; });
        vcount = 0; W.bents.forEach(function (e) { e.alive = false; }); W.bents.length = 0; W.furn.length = 0; W.sinks.length = 0; W.camps.length = 0; W.anvils.length = 0; W.comps.length = 0;
      }
      sgrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn) l.splice(i, 1); });
      egrid.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].dyn && l[i].vx == null) l.splice(i, 1); });
      W.ents = W.ents.filter(function (e) { return !e.dyn || e.vx != null; });
      W.trees.length = 0; W.rocks.length = 0; W.piles.length = 0; W.cars.length = 0; W.crates.length = staticCrateCount;
      for (var ci = 0; ci < staticCrateCount; ci++) { W.crates[ci].respawn = 0; W.setCrate(W.crates[ci], true); }
      trunkM.count = crownM.count = rockM.count = pileM.count = shineM.count = tableM.count = tlegM.count = carBody.count = carTop.count = 0;
      crateM.count = lidM.count = staticCrateCount;
      spawnNature(newSeed != null ? newSeed : rndSeed(), !!keepBuild);
    };

    var skyColor = new THREE.Color(0x88b8de), fogColor = new THREE.Color(0x9bc4e6);
    scene.background = skyColor; scene.fog = new THREE.Fog(fogColor, 34, 220);
    var hemi = new THREE.HemisphereLight(0xf2f7ff, 0x625a48, 1.3); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff5e0, 1.25); sun.position.set(80, 90, 60); scene.add(sun);

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
      if (sy >= -8) sun.position.set(sx, Math.max(15, sy), sz); else sun.position.set(-sx, Math.max(25, -sy), -sz);
      starMat.opacity = h < 5.2 || h > 19.2 ? 0.9 : h < 6.4 ? (6.4 - h) / 1.2 * 0.9 : h > 18.0 ? (h - 18.0) / 1.2 * 0.9 : 0;
    };
    W.updateSky(7.0, -32, 32);
    return W;
  };
})(window.WZ);
/* AKHIR world.js */