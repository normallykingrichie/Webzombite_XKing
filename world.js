/* Webzombite - world: a 500 m x 500 m ruined XKing city. Everything is generated from a fixed seed,
   so every player sees the same map and saves only need to store what changed. */
(function (WZ) {
  'use strict';

  WZ.HALF = 250;           /* playable area: -250..250 on both axes = 500 m x 500 m */
  WZ.SPAWN_HALF = 262.5;   /* zombies appear on a 525 m x 525 m square, just outside the playable area */

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  WZ.createWorld = function (THREE, scene) {
    var R = mulberry(20261116);
    function rr(a, b) { return a + R() * (b - a); }
    function pick(a) { return a[(R() * a.length) | 0]; }

    var W = { half: WZ.HALF, ents: [], trees: [], rocks: [], piles: [], crates: [], furn: [], rects: [], roads: [], spawn: { x: -32, y: 0, z: 32 } };
    var ROADS = [-224, -160, -96, -32, 32, 96, 160, 224], RW = 10;
    W.roads = ROADS;

    /* ---------------- static colliders ---------------- */
    var CELL = 8, sgrid = new Map();
    function ck(cx, cz) { return (cx + 80) * 256 + (cz + 80); }
    function addBox(x0, x1, y0, y1, z0, z1) {
      var b = { x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, on: true };
      for (var cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (var cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        var k = ck(cx, cz), l = sgrid.get(k); if (!l) { l = []; sgrid.set(k, l); } l.push(b);
      }
      return b;
    }
    W.addBox = addBox;

    /* ---------------- voxels (player-built blocks) ---------------- */
    var vox = new Map();
    function vk(x, y, z) { return ((x + 300) * 1024 + (z + 300)) * 64 + y; }
    W.vkey = vk;
    var VMAX = 40;
    var info = { top: 0, bottom: 0, vox: null, box: null };
    W.hit = function (x0, x1, y0, y1, z0, z1) {
      var found = false; info.top = -1e9; info.bottom = 1e9; info.vox = null; info.box = null;
      var cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cz0 = Math.floor(z0 / CELL), cz1 = Math.floor(z1 / CELL), cx, cz, i, l, b;
      for (cx = cx0; cx <= cx1; cx++) for (cz = cz0; cz <= cz1; cz++) {
        l = sgrid.get(ck(cx, cz)); if (!l) continue;
        for (i = 0; i < l.length; i++) {
          b = l[i];
          if (b.on && x1 > b.x0 && x0 < b.x1 && y1 > b.y0 && y0 < b.y1 && z1 > b.z0 && z0 < b.z1) {
            found = true; if (b.y1 > info.top) info.top = b.y1; if (b.y0 < info.bottom) info.bottom = b.y0; info.box = b;
          }
        }
      }
      if (vox.size) {
        var ix0 = Math.floor(x0), ix1 = Math.ceil(x1) - 1, iy0 = Math.max(0, Math.floor(y0)), iy1 = Math.ceil(y1) - 1, iz0 = Math.floor(z0), iz1 = Math.ceil(z1) - 1, ix, iy, iz, key;
        for (ix = ix0; ix <= ix1; ix++) for (iz = iz0; iz <= iz1; iz++) for (iy = iy0; iy <= iy1; iy++) {
          key = vk(ix, iy, iz);
          if (vox.has(key)) { found = true; if (iy + 1 > info.top) info.top = iy + 1; if (iy < info.bottom) info.bottom = iy; info.vox = key; }
        }
      }
      return found ? info : null;
    };
    W.solidAt = function (x, y, z) { /* a single point, used by ray marching */
      var cx = Math.floor(x / CELL), cz = Math.floor(z / CELL), l = sgrid.get(ck(cx, cz)), i, b;
      if (l) for (i = 0; i < l.length; i++) { b = l[i]; if (b.on && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && z > b.z0 && z < b.z1) return 'static'; }
      if (y >= 0 && vox.size) { var key = vk(Math.floor(x), Math.floor(y), Math.floor(z)); if (vox.has(key)) return key; }
      return null;
    };

    /* ---------------- instanced mesh helper ---------------- */
    var Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
    function inst(geo, mat, cap) {
      var m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, C.set(0xffffff)); m.instanceColor.array.fill(1); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      scene.add(m); return m;
    }
    function put(m, x, y, z, sx, sy, sz, ry, col, at) {
      var i = at == null ? m.count++ : at;
      P.set(x, y, z); S.set(sx, sy, sz); Q.setFromAxisAngle(UP, ry || 0); Mx.compose(P, Q, S); m.setMatrixAt(i, Mx);
      if (col != null) m.setColorAt(i, C.set(col));
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      return i;
    }
    W.put = put;
    var box1 = new THREE.BoxGeometry(1, 1, 1);
    var boxB = new THREE.BoxGeometry(1, 1, 1); boxB.translate(0, 0.5, 0);   /* origin at the bottom */
    function lam(c, o) { var p = { color: c }; for (var k in (o || {})) p[k] = o[k]; return new THREE.MeshLambertMaterial(p); }

    /* ---------------- textures ---------------- */
    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace || undefined; return t;
    }
    function facadeTex(base, seed) {
      var r = mulberry(seed);
      return canvasTex(128, 128, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,' + (r() * 0.07) + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 14, 2 + r() * 10); }
        for (var fy = 0; fy < 2; fy++) for (var fx = 0; fx < 2; fx++) {
          var x = fx * 64 + 14, y = fy * 64 + 10, k = r();
          g.fillStyle = k < 0.18 ? '#4a3a2c' : k < 0.3 ? '#1d252b' : '#26323b';   /* boarded, empty, glass */
          g.fillRect(x, y, 36, 44);
          if (k < 0.18) { g.strokeStyle = '#2a1f17'; g.lineWidth = 3; for (var j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x, y + j * 12 + 4); g.lineTo(x + 36, y + j * 12 + 10); g.stroke(); } }
          else if (k > 0.65) { g.strokeStyle = 'rgba(210,225,235,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + 22, y + 24); g.lineTo(x + 36, y + 14); g.moveTo(x + 22, y + 24); g.lineTo(x + 12, y + 44); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + 40, 36, 4);
        }
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,22,10,.28)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
    }
    var FACADES = [['#8d8a82', 11], ['#9a9184', 12], ['#7b8187', 13], ['#8f7f72', 14], ['#6f7679', 15], ['#a39b8c', 16]].map(function (a) { return facadeTex(a[0], a[1]); });
    var groundTex = canvasTex(256, 256, function (g, w, h) {
      var r = mulberry(5); g.fillStyle = '#5b5a44'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) { var v = (r() * 40) | 0; g.fillStyle = 'rgba(' + (60 + v) + ',' + (62 + v) + ',' + (40 + v / 2) + ',.55)'; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4); }
    });
    groundTex.repeat.set(120, 120);
    var roadTex = canvasTex(128, 128, function (g, w, h) {
      var r = mulberry(6); g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 1400; i++) { var v = (r() * 30) | 0; g.fillStyle = 'rgba(' + (50 + v) + ',' + (52 + v) + ',' + (56 + v) + ',.6)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
      g.strokeStyle = 'rgba(15,15,15,.6)'; g.lineWidth = 1; for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(r() * w, 0); g.lineTo(r() * w, h); g.stroke(); }
    });
    var plankTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#8a6238'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5b3d1f'; g.lineWidth = 2;
      for (var y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.18)'; for (var i = 0; i < 24; i++) { g.beginPath(); var yy = Math.random() * h; g.moveTo(0, yy); g.lineTo(w, yy + 2); g.stroke(); }
    });
    var stoneTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#8b8f95'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5f6368'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      for (var i = 0; i < 140; i++) { var v = (Math.random() * 50) | 0; g.fillStyle = 'rgba(' + (110 + v) + ',' + (112 + v) + ',' + (118 + v) + ',.5)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    });
    var furnTex = canvasTex(64, 64, function (g, w, h) {
      g.fillStyle = '#3a3633'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a1a'; g.fillRect(18, 30, 28, 22); g.fillStyle = '#ffd36a'; g.fillRect(24, 38, 16, 10);
      g.strokeStyle = '#1b1917'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    });

    /* ---------------- ground and roads ---------------- */
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), lam(0xffffff, { map: groundTex }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    var roadMat = lam(0xffffff, { map: roadTex }); roadTex.repeat.set(1, 60);
    var roadTexX = roadTex.clone(); roadTexX.needsUpdate = true; roadTexX.repeat.set(60, 1);
    ROADS.forEach(function (c) {
      var a = new THREE.Mesh(new THREE.PlaneGeometry(RW, 540), roadMat); a.rotation.x = -Math.PI / 2; a.position.set(c, 0.02, 0); scene.add(a);
      var b = new THREE.Mesh(new THREE.PlaneGeometry(540, RW), lam(0xffffff, { map: roadTexX })); b.rotation.x = -Math.PI / 2; b.position.set(0, 0.021, c); scene.add(b);
    });
    var dashes = inst(boxB, lam(0xd9b640), 2400);
    ROADS.forEach(function (c) { for (var t = -255; t < 255; t += 7) { put(dashes, c, 0.03, t, 0.18, 0.01, 3.2, 0, null); put(dashes, t, 0.032, c, 3.2, 0.01, 0.18, 0, null); } });

    /* ---------------- placement helpers ---------------- */
    var occupied = [];     /* rectangles where nothing else may be placed */
    function onRoad(x, z, m) { for (var i = 0; i < ROADS.length; i++) if (Math.abs(x - ROADS[i]) < RW / 2 + m || Math.abs(z - ROADS[i]) < RW / 2 + m) return true; return false; }
    function inOcc(x, z, m) { for (var i = 0; i < occupied.length; i++) { var o = occupied[i]; if (x > o[0] - m && x < o[1] + m && z > o[2] - m && z < o[3] + m) return true; } return false; }
    function zoneOf(x, z) { var d = Math.hypot(x, z); return d < 105 ? 'down' : d < 190 ? 'mid' : 'out'; }

    /* ---------------- buildings ---------------- */
    var wallMat = lam(0xffffff), walls = inst(box1, wallMat, 5000);
    var roofCols = [0x4a4743, 0x55504a, 0x3f4349];
    function tallBuilding(x0, x1, z0, z1, h) {
      var w = x1 - x0, d = z1 - z0, tex = pick(FACADES), tx = tex.clone(), tz = tex.clone();
      tx.needsUpdate = true; tz.needsUpdate = true; tx.repeat.set(d / 8, h / 8); tz.repeat.set(w / 8, h / 8);
      var mx = lam(0xffffff, { map: tx }), mz = lam(0xffffff, { map: tz }), roof = lam(pick(roofCols));
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mx, mx, roof, roof, mz, mz]);
      m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); scene.add(m);
      addBox(x0, x1, 0, h, z0, z1); occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]);
      W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#555' });
      /* rooftop clutter */
      if (R() < 0.6) { var bx = rr(x0 + 2, x1 - 2), bz = rr(z0 + 2, z1 - 2); put(walls, bx, h + 1, bz, 3, 2, 3, 0, 0x3b3f44); }
    }
    function wallSeg(x0, x1, z0, z1, y0, y1, col) { /* a solid wall piece: visible and collidable */
      put(walls, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, col); addBox(x0, x1, y0, y1, z0, z1);
    }
    var bedM = inst(box1, lam(0xffffff), 200), couchM = inst(box1, lam(0xffffff), 400);
    function addBed(x, z, clean) {
      put(bedM, x, 0.3, z, 2.0, 0.6, 1.0, 0, clean ? 0xd9d3c4 : 0x4a3d33);
      put(bedM, x - 0.9, 0.65, z, 0.18, 0.5, 1.0, 0, clean ? 0xb98a5a : 0x2e2620);
      addBox(x - 1.0, x + 1.0, 0, 0.6, z - 0.5, z + 0.5);
      var e = { k: 'bed', x: x, z: z, y: 0, r: 1.3, h: 0.8, clean: clean, alive: true }; addEnt(e); return e;
    }
    function addCouch(x, z, clean) {
      put(couchM, x, 0.3, z, 1.9, 0.6, 0.9, 0, clean ? 0x6f8a62 : 0x3d342c);
      put(couchM, x, 0.75, z - 0.38, 1.9, 0.6, 0.2, 0, clean ? 0x55704a : 0x2a231d);
      addBox(x - 0.95, x + 0.95, 0, 0.6, z - 0.45, z + 0.45);
      var e = { k: 'couch', x: x, z: z, y: 0, r: 1.15, h: 0.9, clean: clean, alive: true }; addEnt(e); return e;
    }

    function house(px, pz, face) {
      var hw = rr(12, 15), hd = rr(10, 12), x0 = px - hw / 2, x1 = px + hw / 2, z0 = pz - hd / 2, z1 = pz + hd / 2, t = 0.4, H = 3.2;
      var col = pick([0xb7ab97, 0xa59a88, 0x9c8f86, 0xbdb4a2, 0x93897c]);
      occupied.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]);
      W.rects.push({ x0: x0, x1: x1, z0: z0, z1: z1, c: '#7a6f60' });
      var dx = (x0 + x1) / 2 + rr(-hw / 4, hw / 4), dz = (z0 + z1) / 2 + rr(-hd / 4, hd / 4), gap = 1.0;
      /* x-running walls: north (z0) and south (z1); z-running walls: west (x0) and east (x1). `face` picks which one has the door. */
      [[z0, 'n'], [z1, 's']].forEach(function (s) {
        if (face === s[1]) { wallSeg(x0, dx - gap, s[0] - t / 2, s[0] + t / 2, 0, H, col); wallSeg(dx + gap, x1, s[0] - t / 2, s[0] + t / 2, 0, H, col); wallSeg(dx - gap, dx + gap, s[0] - t / 2, s[0] + t / 2, 2.4, H, col); }
        else wallSeg(x0, x1, s[0] - t / 2, s[0] + t / 2, 0, H, col);
      });
      [[x0, 'w'], [x1, 'e']].forEach(function (s) {
        if (face === s[1]) { wallSeg(s[0] - t / 2, s[0] + t / 2, z0 + t / 2, dz - gap, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz + gap, z1 - t / 2, 0, H, col); wallSeg(s[0] - t / 2, s[0] + t / 2, dz - gap, dz + gap, 2.4, H, col); }
        else wallSeg(s[0] - t / 2, s[0] + t / 2, z0 + t / 2, z1 - t / 2, 0, H, col);
      });
      wallSeg(x0, x1, z0, z1, H, H + 0.4, 0x4a4540);
      /* furniture on the side away from the door */
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, back = face === 'n' ? 1 : face === 's' ? -1 : 0, backx = face === 'w' ? 1 : face === 'e' ? -1 : 0;
      var bx = cx + (backx ? backx * (hw / 2 - 1.6) : -hw / 4), bz = cz + (back ? back * (hd / 2 - 1.2) : -hd / 4);
      addBed(bx, bz, R() < 0.5);
      var kx = cx + (backx ? backx * (hw / 2 - 1.2) : hw / 4), kz = cz + (back ? back * (hd / 2 - 1.2) : hd / 4) + (backx ? 3 : 0);
      if (backx || back) addCouch(kx + (backx ? 0 : 1), kz, R() < 0.5);
      /* crates inside */
      if (R() < 0.6) addCrate(cx + rr(-hw / 3, hw / 3), cz + rr(-hd / 4, hd / 4));
    }

    /* ---------------- interactable entities ---------------- */
    var egrid = new Map();
    function addEnt(e) {
      W.ents.push(e);
      var k = ck(Math.floor(e.x / CELL), Math.floor(e.z / CELL)), l = egrid.get(k); if (!l) { l = []; egrid.set(k, l); } l.push(e);
    }
    W.entsNear = function (x, z, rad, out) {
      out.length = 0;
      for (var cx = Math.floor((x - rad) / CELL); cx <= Math.floor((x + rad) / CELL); cx++) for (var cz = Math.floor((z - rad) / CELL); cz <= Math.floor((z + rad) / CELL); cz++) {
        var l = egrid.get(ck(cx, cz)); if (!l) continue;
        for (var i = 0; i < l.length; i++) { var e = l[i]; if (e.alive && Math.hypot(e.x - x, e.z - z) < rad + e.r) out.push(e); }
      }
      return out;
    };

    /* trees */
    var trunkG = new THREE.CylinderGeometry(0.22, 0.34, 1, 7); trunkG.translate(0, 0.5, 0);
    var crownG = new THREE.ConeGeometry(1, 1, 8); crownG.translate(0, 0.5, 0);
    var trunkM = inst(trunkG, lam(0x5b4128), 1200), crownM = inst(crownG, lam(0xffffff), 1200);
    function treeMatrix(t, on) {
      if (!on) { put(trunkM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix); put(crownM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix); return; }
      put(trunkM, t.x, 0, t.z, 1.2 * t.s, t.th, 1.2 * t.s, t.ry, null, t.ix);
      put(crownM, t.x, t.th * 0.62, t.z, 2.6 * t.s, 3.4 * t.s, 2.6 * t.s, t.ry, t.cc, t.ix);
    }
    W.setTree = function (t, on) { treeMatrix(t, on); t.box.on = on; t.alive = on; };
    function addTree(x, z) {
      var s = Math.pow(R(), 1.6) * 1.5 + 0.7, th = 3.0 * s, t = { k: 'tree', x: x, z: z, y: 0, s: s, th: th, ry: R() * 6.28, r: 0.55 * s + 0.15, h: th * 0.62 + 3.4 * s, alive: true,
        max: Math.round(34 * s * s), hp: 0, yield: Math.round(3 + 5.2 * s * s), given: 0, respawn: 0,
        cc: pick([0x3f5b34, 0x4b6a3a, 0x37502f, 0x5a6b3a, 0x66603a]) };
      t.hp = t.max; t.ix = trunkM.count; trunkM.count++; crownM.count++; t.box = addBox(x - 0.3 * s, x + 0.3 * s, 0, th, z - 0.3 * s, z + 0.3 * s);
      treeMatrix(t, true); addEnt(t); W.trees.push(t); return t;
    }

    /* rocks and ore */
    var rockG = new THREE.DodecahedronGeometry(1, 0), rockM = inst(rockG, lam(0xffffff, { flatShading: true }), 400);
    function rockMatrix(t, on) {
      if (!on) { put(rockM, 0, -50, 0, 0.0001, 0.0001, 0.0001, 0, null, t.ix); return; }
      put(rockM, t.x, 0.55 * t.s, t.z, 1.15 * t.s, 0.8 * t.s, 1.0 * t.s, t.ry, t.cc, t.ix);
    }
    W.setRock = function (t, on) { rockMatrix(t, on); t.box.on = on; t.alive = on; };
    function addRock(x, z, ore) {
      var s = rr(0.8, 2.1), t = { k: 'rock', ore: ore, x: x, z: z, y: 0, s: s, ry: R() * 6.28, r: 0.95 * s, h: 1.5 * s, alive: true,
        max: Math.round((ore ? 100 : 60) * s * s), yield: ore ? Math.round(2 + 4 * s * s) : Math.round(4 + 6 * s * s), given: 0, respawn: 0, cc: ore ? 0x9a5f3a : 0x7a7d82 };
      t.hp = t.max; t.ix = rockM.count++; t.box = addBox(x - 0.8 * s, x + 0.8 * s, 0, 1.2 * s, z - 0.8 * s, z + 0.8 * s);
      rockMatrix(t, true); addEnt(t); W.rocks.push(t); return t;
    }

    /* trash piles */
    var pileM = inst(box1, lam(0xffffff), 4000), shineM = inst(box1, lam(0xffffff, { metalness: 0.7, roughness: 0.35 }), 1200);
    function pileParts(p, k) {
      var s = k; /* 1 = full, 0.35 = searched */
      p.parts.forEach(function (q) { put(q.m, p.x + q.dx, q.y * s, p.z + q.dz, q.sx, q.sy * s, q.sz, q.ry, q.col, q.i); });
    }
    W.setPile = function (p, full) { pileParts(p, full ? 1 : 0.3); p.searched = !full; };
    function addPile(x, z, tier) {
      var p = { k: 'pile', tier: tier, x: x, z: z, y: 0, r: 0.9, h: 0.9, alive: true, searched: false, respawn: 0, parts: [] };
      var cols = tier === 1 ? [0x5d5a52, 0x6b5f50, 0x4c4a45, 0x70685a] : [0x6c6a64, 0x57595c, 0x7a6e5c, 0x4f4e4b];
      for (var i = 0; i < 5; i++) {
        var q = { m: pileM, dx: rr(-0.5, 0.5), dz: rr(-0.5, 0.5), sx: rr(0.25, 0.7), sy: rr(0.25, 0.6), sz: rr(0.25, 0.7), ry: R() * 3, col: pick(cols) };
        q.y = q.sy / 2; q.i = pileM.count++; p.parts.push(q);
      }
      if (tier === 2) for (var j = 0; j < 2; j++) { var q2 = { m: shineM, dx: rr(-0.4, 0.4), dz: rr(-0.4, 0.4), sx: 0.18, sy: 0.12, sz: 0.3, ry: R() * 3, col: pick([0xcfd3d8, 0xd6b25a, 0xb5c0c9]) }; q2.y = rr(0.4, 0.7); q2.i = shineM.count++; p.parts.push(q2); }
      pileParts(p, 1); addEnt(p); W.piles.push(p); return p;
    }

    /* wooden crates */
    var crateM = inst(box1, lam(0xffffff), 400), lidM = inst(box1, lam(0x3e2a16), 400);
    W.setCrate = function (c, full) {
      put(crateM, c.x, full ? 0.45 : 0.3, c.z, 0.9, full ? 0.9 : 0.6, 0.9, c.ry, full ? 0x9a7240 : 0x5f4a30, c.ix);
      put(lidM, c.x, full ? 0.92 : -5, c.z, 0.98, 0.1, 0.98, c.ry, null, c.ix); c.searched = !full;
    };
    function addCrate(x, z) {
      var c = { k: 'crate', x: x, z: z, y: 0, r: 0.75, h: 0.9, alive: true, searched: false, respawn: 0, ry: R() * 3 };
      c.ix = crateM.count++; lidM.count++; addBox(x - 0.45, x + 0.45, 0, 0.9, z - 0.45, z + 0.45);
      W.setCrate(c, true); addEnt(c); W.crates.push(c); return c;
    }

    /* player-placed furnace entries are added by the game through addFurnaceEnt */
    W.addFurnaceEnt = function (x, y, z) { var e = { k: 'furnace', x: x + 0.5, z: z + 0.5, y: y, r: 0.9, h: 1, alive: true, vx: x, vy: y, vz: z }; addEnt(e); W.furn.push(e); return e; };

    /* ---------------- lay out the city ---------------- */
    var edges = [-250].concat(ROADS.map(function (c) { return c; }), [250]);
    for (var a = 0; a <= ROADS.length; a++) for (var b = 0; b <= ROADS.length; b++) {
      var lx0 = a === 0 ? -250 : ROADS[a - 1] + RW / 2, lx1 = a === ROADS.length ? 250 : ROADS[a] - RW / 2;
      var lz0 = b === 0 ? -250 : ROADS[b - 1] + RW / 2, lz1 = b === ROADS.length ? 250 : ROADS[b] - RW / 2;
      var cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, zone = zoneOf(cx, cz), rim = a === 0 || b === 0 || a === ROADS.length || b === ROADS.length;
      if (rim) continue;
      var ins = 5, bx0 = lx0 + ins, bx1 = lx1 - ins, bz0 = lz0 + ins, bz1 = lz1 - ins;
      if (zone === 'down') {
        if (R() < 0.55) tallBuilding(bx0, bx1, bz0, bz1, rr(26, 72));
        else { var mxm = (bx0 + bx1) / 2, mzm = (bz0 + bz1) / 2, g = 2;
          [[bx0, mxm - g, bz0, mzm - g], [mxm + g, bx1, bz0, mzm - g], [bx0, mxm - g, mzm + g, bz1], [mxm + g, bx1, mzm + g, bz1]].forEach(function (q) { tallBuilding(q[0], q[1], q[2], q[3], rr(12, 44)); }); }
      } else if (zone === 'mid') {
        var roll = R();
        if (roll < 0.3) tallBuilding(bx0 + 2, bx1 - 2, bz0 + 2, bz1 - 2, rr(10, 24));
        else if (roll < 0.9) {
          var mx2 = (bx0 + bx1) / 2, mz2 = (bz0 + bz1) / 2;
          [[mx2 - 12, mz2 - 12], [mx2 + 12, mz2 - 12], [mx2 - 12, mz2 + 12], [mx2 + 12, mz2 + 12]].forEach(function (q, qi) { if (R() < 0.85) house(q[0] + rr(-1.5, 1.5), q[1] + rr(-1.5, 1.5), qi < 2 ? 's' : 'n'); });
        }
      } else {
        var mx3 = (bx0 + bx1) / 2, mz3 = (bz0 + bz1) / 2;
        [[mx3 - 12, mz3 - 12], [mx3 + 12, mz3 - 12], [mx3 - 12, mz3 + 12], [mx3 + 12, mz3 + 12]].forEach(function (q, qi) { if (R() < 0.55) house(q[0] + rr(-2, 2), q[1] + rr(-2, 2), pick(['n', 's', 'e', 'w'])); });
      }
    }

    /* vegetation and rocks: thick at the edges, scattered inside */
    var tries = 0, want = 520;
    while (W.trees.length < want && tries++ < 20000) {
      var tx = rr(-248, 248), tz = rr(-248, 248), edge = Math.max(Math.abs(tx), Math.abs(tz)), z0n = zoneOf(tx, tz);
      var chance = edge > 229 ? 0.95 : z0n === 'out' ? 0.35 : z0n === 'mid' ? 0.12 : 0.03;
      if (R() > chance || onRoad(tx, tz, 1.5) || inOcc(tx, tz, 2)) continue;
      addTree(tx, tz);
    }
    var rocks = 0; tries = 0;
    while (rocks < 150 && tries++ < 12000) {
      var rx = rr(-246, 246), rz = rr(-246, 246);
      if (zoneOf(rx, rz) === 'down' && R() < 0.8) continue;
      if (onRoad(rx, rz, 2) || inOcc(rx, rz, 2.5)) continue;
      addRock(rx, rz, rocks % 4 === 0); rocks++;
    }

    /* loot: trash along the sidewalks, some on the roads, crates here and there */
    var piles = 0; tries = 0;
    while (piles < 430 && tries++ < 30000) {
      var side = R() < 0.5, line = pick(ROADS), off = (R() < 0.5 ? -1 : 1) * rr(RW / 2 + 0.8, RW / 2 + 3.2), along = rr(-244, 244);
      if (R() < 0.18) off = rr(-RW / 2 + 1, RW / 2 - 1);
      var px = side ? line + off : along, pz = side ? along : line + off;
      if (inOcc(px, pz, 0.5) || Math.max(Math.abs(px), Math.abs(pz)) > 246) continue;
      var zn = zoneOf(px, pz), tier = zn === 'down' ? 2 : zn === 'mid' ? (R() < 0.45 ? 2 : 1) : 1;
      addPile(px, pz, tier); piles++;
    }
    var cr = 0; tries = 0;
    while (cr < 90 && tries++ < 8000) {
      var qx = rr(-240, 240), qz = rr(-240, 240);
      if (onRoad(qx, qz, 1) || inOcc(qx, qz, 1) || zoneOf(qx, qz) === 'down') continue;
      addCrate(qx, qz); cr++;
    }

    /* wrecked cars: cover on the roads */
    var carBody = inst(boxB, lam(0xffffff), 120), carTop = inst(boxB, lam(0x2c2f33), 120), cars = 0; tries = 0;
    while (cars < 55 && tries++ < 600) {
      var vl = pick(ROADS), alongV = rr(-240, 240), lane = (R() < 0.5 ? -1 : 1) * rr(1.2, 3), horiz = R() < 0.5, cxx = horiz ? alongV : vl + lane, czz = horiz ? vl + lane : alongV;
      var lenX = horiz ? 4.4 : 1.9, lenZ = horiz ? 1.9 : 4.4;
      var clash = false; for (var ci = 0; ci < W.ents.length && !clash; ci++) { var ee = W.ents[ci]; if (ee.k === 'pile' && Math.abs(ee.x - cxx) < 3 && Math.abs(ee.z - czz) < 3) clash = true; }
      if (clash) continue;
      put(carBody, cxx, 0.25, czz, lenX, 0.9, lenZ, 0, pick([0x7a2b2b, 0x2b4f7a, 0x6b6b2b, 0x555a5e, 0x8a8a84, 0x3e5e3e]));
      put(carTop, cxx, 1.15, czz, horiz ? 2.2 : 1.7, 0.6, horiz ? 1.7 : 2.2, 0, null);
      addBox(cxx - lenX / 2, cxx + lenX / 2, 0, 1.75, czz - lenZ / 2, czz + lenZ / 2); cars++;
    }

    /* the edge of the playable map: red-topped posts, one every 6 m */
    var postM = inst(boxB, lam(0xb33a2a), 360);
    for (var pt = -250; pt <= 250; pt += 6) { put(postM, pt, 0, -250, 0.25, 1.6, 0.25, 0, null); put(postM, pt, 0, 250, 0.25, 1.6, 0.25, 0, null); put(postM, -250, 0, pt, 0.25, 1.6, 0.25, 0, null); put(postM, 250, 0, pt, 0.25, 1.6, 0.25, 0, null); }

    /* ---------------- player blocks ---------------- */
    var VM = {
      1: inst(box1, lam(0xffffff, { map: plankTex }), 6000),
      2: inst(box1, lam(0xffffff, { map: stoneTex }), 6000),
      3: inst(box1, lam(0xffffff, { map: furnTex }), 200)
    };
    var vkeys = { 1: [], 2: [], 3: [] }, vcount = 0;
    W.voxCount = function () { return vcount; };
    W.getVox = function (x, y, z) { return vox.get(vk(x, y, z)) || null; };
    W.setVox = function (x, y, z, t, hp) {
      if (y < 0 || y >= VMAX || Math.abs(x) > 252 || Math.abs(z) > 252) return false;
      var k = vk(x, y, z); if (vox.has(k)) return false;
      var arr = vkeys[t], idx = arr.length; arr.push([x, y, z]);
      var v = { t: t, hp: hp, idx: idx }; vox.set(k, v);
      put(VM[t], x + 0.5, y + 0.5, z + 0.5, 1, 1, 1, 0, null, idx); VM[t].count = arr.length; vcount++;
      return true;
    };
    W.delVox = function (x, y, z) {
      var k = vk(x, y, z), v = vox.get(k); if (!v) return null;
      var arr = vkeys[v.t], last = arr.pop(), m = VM[v.t];
      if (v.idx !== arr.length) { arr[v.idx] = last; vox.get(vk(last[0], last[1], last[2])).idx = v.idx; put(m, last[0] + 0.5, last[1] + 0.5, last[2] + 0.5, 1, 1, 1, 0, null, v.idx); }
      m.count = arr.length; m.instanceMatrix.needsUpdate = true; vox.delete(k); vcount--; return v;
    };
    W.voxList = function () { var out = []; vox.forEach(function (v, k) { var a = vkeys[v.t][v.idx]; out.push(((a[0] + 256) * 1024 + (a[2] + 256)) * 256 + a[1] * 4 + (v.t - 1)); }); return out; };
    W.voxLoad = function (list) {
      var HP = { 1: 30, 2: 90, 3: 80 };
      list.forEach(function (n) { var t = (n % 4) + 1, y = ((n / 4) | 0) % 64, r = Math.floor(n / 256), z = (r % 1024) - 256, x = Math.floor(r / 1024) - 256; if (W.setVox(x, y, z, t, HP[t]) && t === 3) W.addFurnaceEnt(x, y, z); });
    };

    /* ---------------- sky and light ---------------- */
    scene.background = new THREE.Color(0x8a8078); scene.fog = new THREE.Fog(0x8a8078, 35, 230);
    scene.add(new THREE.HemisphereLight(0xd8cdbd, 0x4a4338, 1.0));
    var sun = new THREE.DirectionalLight(0xffcf9a, 0.85); sun.position.set(-80, 70, 60); scene.add(sun);

    return W;
  };
})(window.WZ);
