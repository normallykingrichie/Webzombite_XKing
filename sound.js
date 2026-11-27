/* sound.js - Webzombite Procedural Web Audio Engine */
(function (WZ) {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, muted = false;
  var masterGain = null, sfxGain = null, ambGain = null, compNode = null, reverbNode = null, reverbReturn = null;
  var noisePink = null, noiseBrown = null, noiseWhite = null;
  var ambStarted = false, ambOscA = null, ambOscB = null, ambWindGain = null, ambWindFilt = null, ambNightGain = null, ambSrc = null;
  var lastTimeOfDay = 12, lastUnderwater = false;

  var STORE_KEY = 'wz_audio_v1';
  var cfg = { master: 0.85, sfx: 0.9, ambient: 0.55, spatial: true, reverb: true, muted: false };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.master === 'number') cfg.master = Math.max(0, Math.min(1, saved.master));
      if (typeof saved.sfx === 'number') cfg.sfx = Math.max(0, Math.min(1, saved.sfx));
      if (typeof saved.ambient === 'number') cfg.ambient = Math.max(0, Math.min(1, saved.ambient));
      if (typeof saved.spatial === 'boolean') cfg.spatial = saved.spatial;
      if (typeof saved.reverb === 'boolean') cfg.reverb = saved.reverb;
      if (typeof saved.muted === 'boolean') cfg.muted = saved.muted;
      muted = !!cfg.muted;
    }
  } catch (e) {}

  function saveCfg() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function applyGains() {
    if (!ctx || !masterGain) return;
    var now = ctx.currentTime;
    var m = muted ? 0 : cfg.master;
    masterGain.gain.setTargetAtTime(m, now, 0.03);
    if (sfxGain) sfxGain.gain.setTargetAtTime(cfg.sfx, now, 0.03);
    if (ambGain) ambGain.gain.setTargetAtTime(cfg.ambient, now, 0.06);
    if (reverbReturn) reverbReturn.gain.setTargetAtTime(cfg.reverb ? 0.22 : 0, now, 0.04);
  }

  function buildNoiseBuffers(c) {
    var len = c.sampleRate * 3;
    noiseWhite = c.createBuffer(1, len, c.sampleRate);
    noisePink = c.createBuffer(1, len, c.sampleRate);
    noiseBrown = c.createBuffer(1, len, c.sampleRate);
    var dw = noiseWhite.getChannelData(0);
    var dp = noisePink.getChannelData(0);
    var db = noiseBrown.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, lastOut = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      dw[i] = white;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      dp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      db[i] = lastOut * 3.2;
    }
  }

  function buildImpulse(c) {
    var rate = c.sampleRate;
    var length = Math.floor(rate * 1.15);
    var ir = c.createBuffer(2, length, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        var env = Math.pow(1 - i / length, 2.8);
        d[i] = (Math.random() * 2 - 1) * env * 0.5;
      }
    }
    return ir;
  }

  function ensure() {
    if (!ctx && AC) {
      try {
        ctx = new AC();
        compNode = ctx.createDynamicsCompressor();
        compNode.threshold.value = -16;
        compNode.knee.value = 18;
        compNode.ratio.value = 4;
        compNode.attack.value = 0.004;
        compNode.release.value = 0.18;

        masterGain = ctx.createGain();
        sfxGain = ctx.createGain();
        ambGain = ctx.createGain();

        sfxGain.connect(compNode);
        ambGain.connect(compNode);

        if (ctx.createConvolver) {
          reverbNode = ctx.createConvolver();
          reverbNode.buffer = buildImpulse(ctx);
          reverbReturn = ctx.createGain();
          reverbNode.connect(reverbReturn);
          reverbReturn.connect(compNode);
        }

        compNode.connect(masterGain);
        masterGain.connect(ctx.destination);
        buildNoiseBuffers(ctx);
        applyGains();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  function makeDest(pan, wetAmount) {
    if (!cfg.spatial || typeof ctx.createStereoPanner !== 'function' || pan == null || Math.abs(pan) < 0.01) {
      if (reverbNode && cfg.reverb && wetAmount) {
        var split = ctx.createGain();
        var wet = ctx.createGain();
        wet.gain.value = wetAmount;
        split.connect(sfxGain);
        split.connect(wet);
        wet.connect(reverbNode);
        return split;
      }
      return sfxGain;
    }
    var panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.92, Math.min(0.92, pan));
    panner.connect(sfxGain);
    if (reverbNode && cfg.reverb && wetAmount) {
      var w = ctx.createGain();
      w.gain.value = wetAmount;
      panner.connect(w);
      w.connect(reverbNode);
    }
    return panner;
  }

  function tone(f0, f1, dur, type, vol, tOff, pan, wet) {
    var c = ensure(); if (!c || muted || cfg.sfx <= 0) return;
    var t = c.currentTime + (tOff || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.2, t + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(makeDest(pan, wet));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, filtType, f0, f1, q, vol, kind, tOff, pan, wet) {
    var c = ensure(); if (!c || muted || cfg.sfx <= 0 || !noiseWhite) return;
    var buf = kind === 'brown' ? noiseBrown : kind === 'pink' ? noisePink : noiseWhite;
    var t = c.currentTime + (tOff || 0);
    var src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var filt = c.createBiquadFilter();
    filt.type = filtType || 'lowpass';
    filt.frequency.setValueAtTime(Math.max(30, f0 || 900), t);
    if (f1 && f1 !== f0) filt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    if (q) filt.Q.value = q;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.2, t + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(makeDest(pan, wet));
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  function formantGroan(pan, distAtten) {
    var c = ensure(); if (!c || muted || cfg.sfx <= 0) return;
    var t = c.currentTime;
    var dur = 0.42 + Math.random() * 0.34;
    var baseF = 72 + Math.random() * 34;
    var atten = distAtten != null ? distAtten : 1;

    var srcOsc = c.createOscillator();
    srcOsc.type = 'sawtooth';
    srcOsc.frequency.setValueAtTime(baseF, t);
    srcOsc.frequency.linearRampToValueAtTime(baseF * (0.76 + Math.random() * 0.14), t + dur);

    var lfo = c.createOscillator();
    var lfoG = c.createGain();
    lfo.frequency.value = 5.5 + Math.random() * 3.5;
    lfoG.gain.value = 4.5;
    lfo.connect(lfoG);
    lfoG.connect(srcOsc.frequency);

    var f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(340, t);
    f1.frequency.exponentialRampToValueAtTime(210, t + dur);
    f1.Q.value = 4.2;

    var f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(840, t);
    f2.frequency.exponentialRampToValueAtTime(590, t + dur);
    f2.Q.value = 5.0;

    var env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.22 * atten, t + 0.08);
    env.gain.linearRampToValueAtTime(0.16 * atten, t + dur * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    var dest = makeDest(pan, 0.25);
    srcOsc.connect(f1);
    srcOsc.connect(f2);
    f1.connect(env);
    f2.connect(env);
    env.connect(dest);

    lfo.start(t); srcOsc.start(t);
    lfo.stop(t + dur + 0.02); srcOsc.stop(t + dur + 0.02);
    noise(dur * 0.85, 'bandpass', 650, 380, 2.2, 0.07 * atten, 'pink', 0.03, pan, 0.15);
  }

  function startAmbientLoop() {
    if (ambStarted) return;
    var c = ensure();
    if (!c || !noiseBrown || !noisePink) return;
    ambStarted = true;
    try {
      ambSrc = c.createBufferSource();
      ambSrc.buffer = noiseBrown;
      ambSrc.loop = true;

      ambWindFilt = c.createBiquadFilter();
      ambWindFilt.type = 'bandpass';
      ambWindFilt.frequency.value = 260;
      ambWindFilt.Q.value = 1.4;

      ambWindGain = c.createGain();
      ambWindGain.gain.value = 0.055;

      var gustLfo = c.createOscillator();
      var gustDepth = c.createGain();
      gustLfo.frequency.value = 0.11;
      gustDepth.gain.value = 95;
      gustLfo.connect(gustDepth);
      gustDepth.connect(ambWindFilt.frequency);

      ambSrc.connect(ambWindFilt);
      ambWindFilt.connect(ambWindGain);
      ambWindGain.connect(ambGain);
      ambSrc.start();
      gustLfo.start();

      /* Subtle nocturnal harmonic air shimmer */
      ambOscA = c.createOscillator();
      ambOscB = c.createOscillator();
      ambOscA.type = 'sine';
      ambOscB.type = 'triangle';
      ambOscA.frequency.value = 110;
      ambOscB.frequency.value = 164.81;

      var droneFilt = c.createBiquadFilter();
      droneFilt.type = 'lowpass';
      droneFilt.frequency.value = 320;

      ambNightGain = c.createGain();
      ambNightGain.gain.value = 0.008;

      ambOscA.connect(droneFilt);
      ambOscB.connect(droneFilt);
      droneFilt.connect(ambNightGain);
      ambNightGain.connect(ambGain);
      ambOscA.start();
      ambOscB.start();
    } catch (e) {}
  }

  function updateAmbient(hour, underwater) {
    lastTimeOfDay = hour != null ? hour : lastTimeOfDay;
    lastUnderwater = !!underwater;
    if (!ctx || !ambStarted || !ambWindFilt || !ambWindGain || !ambNightGain) return;
    var t = ctx.currentTime;
    var h = ((lastTimeOfDay % 24) + 24) % 24;
    var isNight = h < 5.5 || h > 19.0;
    if (lastUnderwater) {
      ambWindFilt.frequency.setTargetAtTime(120, t, 0.2);
      ambWindGain.gain.setTargetAtTime(0.09, t, 0.2);
      ambNightGain.gain.setTargetAtTime(0.025, t, 0.2);
    } else {
      ambWindFilt.frequency.setTargetAtTime(isNight ? 210 : 320, t, 0.4);
      ambWindGain.gain.setTargetAtTime(isNight ? 0.07 : 0.045, t, 0.4);
      ambNightGain.gain.setTargetAtTime(isNight ? 0.022 : 0.005, t, 0.5);
    }
  }

  var stepSurface = 'city';
  WZ.SND = {
    vehOnce: vOnce, vehEngine: vEngine, vehPreload: vLoad,
    unlock: function () {
      var c = ensure();
      if (c && !ambStarted) startAmbientLoop();
      applyGains();
    },
    setMute: function (m) {
      muted = !!m;
      cfg.muted = muted;
      saveCfg();
      applyGains();
    },
    isMuted: function () { return muted; },
    setConfig: function (patch) {
      if (!patch) return;
      if (typeof patch.master === 'number') cfg.master = Math.max(0, Math.min(1, patch.master));
      if (typeof patch.sfx === 'number') cfg.sfx = Math.max(0, Math.min(1, patch.sfx));
      if (typeof patch.ambient === 'number') cfg.ambient = Math.max(0, Math.min(1, patch.ambient));
      if (typeof patch.spatial === 'boolean') cfg.spatial = patch.spatial;
      if (typeof patch.reverb === 'boolean') cfg.reverb = patch.reverb;
      if (typeof patch.muted === 'boolean') { cfg.muted = patch.muted; muted = cfg.muted; }
      saveCfg();
      applyGains();
    },
    getConfig: function () {
      return { master: cfg.master, sfx: cfg.sfx, ambient: cfg.ambient, spatial: cfg.spatial, reverb: cfg.reverb, muted: muted };
    },
    ambient: function (isNight, underwater) {
      if (!ambStarted) return;
      if (typeof isNight === 'number') updateAmbient(isNight, underwater);
      else updateAmbient(isNight ? 23 : 12, underwater);
    },
    setSurface: function (biome) { stepSurface = biome || 'city'; },
    play: function (k, opt) {
      if (muted) return;
      var c = ensure(); if (!c) return;
      if (!ambStarted) startAmbientLoop();
      var pan = opt && typeof opt.pan === 'number' ? opt.pan : 0;
      var atten = opt && typeof opt.atten === 'number' ? opt.atten : 1;

      if (k === 'swing') {
        noise(0.14, 'bandpass', 1400, 380, 1.6, 0.16, 'pink', 0, pan, 0.08);
        tone(220, 110, 0.09, 'triangle', 0.06, 0, pan, 0.05);
      } else if (k === 'hit') {
        tone(145, 52, 0.12, 'triangle', 0.24 * atten, 0, pan, 0.1);
        noise(0.08, 'bandpass', 1200, 340, 1.4, 0.18 * atten, 'pink', 0, pan, 0.1);
      } else if (k === 'hurt') {
        tone(175, 62, 0.22, 'sawtooth', 0.22, 0, 0, 0.15);
        noise(0.16, 'lowpass', 950, 220, 1.0, 0.22, 'brown', 0, 0, 0.12);
      } else if (k === 'wood') {
        tone(240, 145, 0.08, 'triangle', 0.18, 0, pan, 0.12);
        noise(0.07, 'bandpass', 580, 320, 4.5, 0.2, 'pink', 0, pan, 0.14);
      } else if (k === 'stone') {
        tone(1680, 920, 0.07, 'sine', 0.12, 0, pan, 0.18);
        tone(2450, 1300, 0.05, 'triangle', 0.07, 0.01, pan, 0.18);
        noise(0.06, 'highpass', 1900, 1100, 2.0, 0.14, 'white', 0, pan, 0.14);
      } else if (k === 'block') {
        tone(130, 68, 0.08, 'triangle', 0.18, 0, pan, 0.12);
        noise(0.045, 'lowpass', 720, 260, 1.2, 0.12, 'pink', 0, pan, 0.08);
      } else if (k === 'loot') {
        tone(523.25, 523.25, 0.09, 'triangle', 0.14, 0, pan, 0.2);
        tone(659.25, 659.25, 0.12, 'triangle', 0.14, 0.055, pan, 0.24);
        tone(783.99, 783.99, 0.18, 'sine', 0.12, 0.11, pan, 0.28);
        noise(0.05, 'bandpass', 2200, 1400, 2.0, 0.08, 'white', 0, pan, 0.1);
      } else if (k === 'craft') {
        tone(420, 620, 0.06, 'square', 0.08, 0, pan, 0.16);
        tone(740, 980, 0.1, 'triangle', 0.14, 0.065, pan, 0.22);
        noise(0.06, 'bandpass', 1600, 900, 3.0, 0.09, 'white', 0.02, pan, 0.12);
      } else if (k === 'eat') {
        for (var i = 0; i < 3; i++) {
          noise(0.055, 'bandpass', 1500 + i * 240, 750, 2.4, 0.14, 'pink', i * 0.09, 0, 0.05);
          tone(190, 130, 0.04, 'triangle', 0.05, i * 0.09, 0, 0);
        }
      } else if (k === 'drink') {
        tone(340, 640, 0.08, 'sine', 0.11, 0, 0, 0.1);
        tone(430, 760, 0.09, 'sine', 0.1, 0.075, 0, 0.12);
        noise(0.12, 'bandpass', 900, 420, 3.2, 0.07, 'pink', 0.02, 0, 0.1);
      } else if (k === 'wash') {
        noise(0.28, 'bandpass', 1400, 620, 1.8, 0.18, 'pink', 0, 0, 0.25);
        tone(380, 560, 0.12, 'sine', 0.06, 0.04, 0, 0.2);
      } else if (k === 'heal') {
        tone(440, 440, 0.14, 'sine', 0.12, 0, 0, 0.25);
        tone(554.37, 554.37, 0.16, 'sine', 0.12, 0.08, 0, 0.28);
        tone(659.25, 659.25, 0.24, 'sine', 0.13, 0.16, 0, 0.34);
      } else if (k === 'click') {
        tone(760, 520, 0.032, 'triangle', 0.08, 0, 0, 0.04);
      } else if (k === 'step') {
        if (stepSurface === 'sea' || stepSurface === 'water') {
          noise(0.11, 'bandpass', 950, 400, 1.5, 0.12, 'pink', 0, 0, 0.16);
          tone(210, 140, 0.06, 'sine', 0.05, 0, 0, 0.1);
        } else if (stepSurface === 'snow' || stepSurface === 'desert') {
          noise(0.065, 'bandpass', stepSurface === 'snow' ? 2400 : 1200, 700, 2.2, 0.075, 'pink', 0, 0, 0.04);
        } else {
          tone(95, 54, 0.045, 'sine', 0.07, 0, 0, 0.04);
          noise(0.04, 'lowpass', 680, 280, 1.2, 0.06, 'brown', 0, 0, 0.04);
        }
      } else if (k === 'groan') {
        formantGroan(pan, atten);
      } else if (k === 'boom') {
        tone(110, 26, 0.72, 'sine', 0.38 * atten, 0, pan, 0.35);
        tone(75, 22, 0.55, 'sawtooth', 0.18 * atten, 0, pan, 0.3);
        noise(0.85, 'lowpass', 980, 95, 0.8, 0.36 * atten, 'brown', 0, pan, 0.32);
      } else if (k === 'gun') {
        tone(160, 45, 0.11, 'triangle', 0.28 * atten, 0, pan, 0.22);
        noise(0.19, 'lowpass', 3800, 280, 0.9, 0.32 * atten, 'white', 0, pan, 0.28);
        noise(0.04, 'bandpass', 2600, 1400, 2.0, 0.22 * atten, 'white', 0, pan, 0.15);
      } else if (k === 'reload') {
        tone(950, 1300, 0.035, 'square', 0.07, 0, 0, 0.1);
        tone(1280, 820, 0.045, 'triangle', 0.09, 0.075, 0, 0.1);
        noise(0.035, 'highpass', 1800, 1200, 2.0, 0.07, 'white', 0.075, 0, 0.08);
      } else if (k === 'glass') {
        tone(3400, 2200, 0.09, 'sine', 0.11 * atten, 0, pan, 0.24);
        tone(4900, 3100, 0.11, 'sine', 0.09 * atten, 0.02, pan, 0.26);
        tone(6100, 3900, 0.08, 'triangle', 0.07 * atten, 0.04, pan, 0.24);
        noise(0.12, 'highpass', 3000, 2200, 2.5, 0.12 * atten, 'white', 0, pan, 0.2);
      } else if (k === 'car') {
        tone(135, 92, 0.14, 'sawtooth', 0.15, 0, pan, 0.15);
        noise(0.12, 'lowpass', 620, 190, 1.4, 0.14, 'brown', 0, pan, 0.12);
      }
    }
  };
  /* ---------- Vehicle audio: ONE long mp3 per vehicle + a JSON cue sheet (audio/veh/vehicles.json) ---------- */
  var vCues = null, vCuesP = null, vbuf = {}, vvoice = {}, VV = '?v=36';
  function vCuesLoad() { if (vCuesP || !window.fetch) return; vCuesP = fetch('audio/veh/vehicles.json' + VV).then(function (r) { return r.json(); }).then(function (j) { vCues = j; }).catch(function () { vCues = {}; }); }
  function vFile(file) {
    var c = ensure(); if (!c || !window.fetch || vbuf[file] !== undefined) return; vbuf[file] = null;
    fetch('audio/veh/' + file + '.mp3' + VV).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, no) { var p = c.decodeAudioData(b, ok, no); if (p && p.catch) p.catch(no); }); })
      .then(function (buf) { vbuf[file] = buf; }).catch(function () {});
  }
  function vLoad(kind) { vCuesLoad(); if (!vCues) return; var cu = vCues[kind]; if (cu) vFile(cu.file); if (vCues.universal) vFile(vCues.universal.file); }
  function vCue(kind, name) {
    if (!vCues) return null; var c = vCues[kind], u = vCues.universal, src = c && c[name] ? [c.file, c[name]] : (u && u[name] ? [u.file, u[name]] : null);
    if (!src) return null; vFile(src[0]); var b = vbuf[src[0]]; return b ? { buf: b, s: src[1][0], e: src[1][1] } : null;
  }
  function vOnce(kind, name, opt) {
    if (muted) return false; var c = ensure(); if (!c) return false; vLoad(kind);
    var q = vCue(kind, name); if (!q) return false;
    var src = c.createBufferSource(), g = c.createGain(); src.buffer = q.buf; g.gain.value = (opt && opt.vol != null ? opt.vol : 1) * (name === 'start' ? 0.9 : name === 'overheat' ? 0.8 : 0.85);
    src.connect(g); g.connect(sfxGain); src.start(0, q.s, Math.max(0.05, q.e - q.s)); return true;
  }
  function vVoice(key, kind) {
    var v = vvoice[key]; if (v && v.kind === kind) return v; if (v) vStop(key, true);
    var cu = vCues && vCues[kind]; if (!cu || !vbuf[cu.file]) return null; var c = ctx, buf = vbuf[cu.file];
    v = { kind: kind, out: c.createGain(), L: {} }; v.out.gain.value = 0; v.out.connect(sfxGain);
    ['int', 'ext'].forEach(function (p) {
      var set = cu[p] || cu.int || cu.ext; if (!set) return;
      ['idle', 'low', 'high'].forEach(function (lv) {
        var seg = set[lv]; if (!seg) return; var s = c.createBufferSource(), g = c.createGain();
        s.buffer = buf; s.loop = true; s.loopStart = seg[0]; s.loopEnd = seg[1]; g.gain.value = 0; s.connect(g); g.connect(v.out);
        s.start(0, seg[0] + Math.random() * (seg[1] - seg[0]) * 0.9); v.L[p + lv] = { s: s, g: g };
      });
    });
    vvoice[key] = v; return v;
  }
  function vStop(key, now) {
    var v = vvoice[key]; if (!v) return; delete vvoice[key]; var t = ctx.currentTime;
    try { v.out.gain.cancelScheduledValues(t); v.out.gain.setTargetAtTime(0, t, now ? 0.01 : 0.12); } catch (e) {}
    setTimeout(function () { for (var n in v.L) { try { v.L[n].s.stop(); } catch (e) {} } try { v.out.disconnect(); } catch (e) {} }, now ? 60 : 700);
  }
  function vEngine(key, o) {
    var c = ctx; if (!c) { if (!o.on) return; c = ensure(); if (!c) return; }
    if (!o.on || muted || !(o.vol > 0.01)) { vStop(key); return; }
    vLoad(o.kind); var v = vVoice(key, o.kind); if (!v) return;
    var t = c.currentTime, r = Math.max(0, Math.min(1, o.rpm)), inn = Math.max(0, Math.min(1, +o.inside || 0));
    /* RPM layers: idle plateau -> low plateau -> high plateau, crossfaded; ramps are never looped */
    var wi = Math.max(0, 1 - r / 0.32), wh = Math.max(0, Math.min(1, (r - 0.3) / 0.35)), wl = Math.max(0, 1 - wi - wh);
    var rate = { idle: 0.9 + 0.35 * r, low: 0.85 + 0.45 * r, high: 0.8 + 0.4 * r };
    ['int', 'ext'].forEach(function (p) {
      var pg = p === 'int' ? inn : 1 - inn, I = v.L[p + 'idle'], L = v.L[p + 'low'], H = v.L[p + 'high'], a = wi, b = wl, d = wh;
      if (!H) { b += d; d = 0; } if (!L) { a += b; b = 0; }
      [[I, a, 'idle'], [L, b, 'low'], [H, d, 'high']].forEach(function (z) { if (!z[0]) return; z[0].g.gain.setTargetAtTime(Math.sqrt(z[1]) * pg, t, 0.08); z[0].s.playbackRate.setTargetAtTime(rate[z[2]], t, 0.1); });
    });
    v.out.gain.setTargetAtTime(Math.min(1, o.vol) * 0.9, t, 0.1);
  }
})(window.WZ);
