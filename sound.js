/* sound.js - Webzombite */
(function (WZ) {
  'use strict';

  var AC = null, master = null, noiseBuf = null;
  var muted = false, loadingDone = false, isNight = false;
  var buffers = Object.create(null);
  var BASE = 'https://cdn.jsdelivr.net/gh/receptron/jinglescript@main/samples/sfx/';
  var MAP = {
    hit: 'punch-hit.wav',
    wood: 'punch-soft.wav',
    stone: 'metal-clang.wav',
    block: 'door-close-1.wav',
    loot: 'book-place.wav',
    craft: 'bell-ding.wav',
    glass: 'glass-clink.wav'
  };

  function ensureNoise() {
    if (noiseBuf || !AC) return;
    var len = Math.floor(AC.sampleRate * 1.2);
    noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function preload() {
    if (loadingDone || !AC || !window.fetch) return;
    loadingDone = true;
    Object.keys(MAP).forEach(function (k) {
      fetch(BASE + MAP[k], { mode: 'cors' })
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (ab) { if (ab && AC) return AC.decodeAudioData(ab); })
        .then(function (buf) { if (buf) buffers[k] = buf; })
        .catch(function () {});
    });
  }

  function unlock() {
    try {
      if (!AC) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        AC = new Ctx();
        master = AC.createGain();
        master.gain.value = muted ? 0 : 0.78;
        master.connect(AC.destination);
        ensureNoise();
        preload();
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) {}
  }

  function sample(key, vol, rate) {
    if (!AC || muted || !buffers[key]) return false;
    try {
      var src = AC.createBufferSource(), g = AC.createGain();
      src.buffer = buffers[key];
      src.playbackRate.value = (rate || 1) * (0.93 + Math.random() * 0.14);
      g.gain.value = vol || 0.55;
      src.connect(g); g.connect(master);
      src.start();
      return true;
    } catch (e) { return false; }
  }

  function noise(dur, freq, type, vol, q) {
    if (!AC || muted || !noiseBuf) return;
    var t = AC.currentTime, src = AC.createBufferSource();
    src.buffer = noiseBuf;
    var flt = AC.createBiquadFilter(), g = AC.createGain();
    flt.type = type || 'bandpass';
    flt.frequency.setValueAtTime(freq || 800, t);
    if (q) flt.Q.value = q;
    g.gain.setValueAtTime(Math.max(0.001, vol || 0.2), t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.4, dur);
  }

  function tone(f0, f1, dur, wave, vol, lpFreq) {
    if (!AC || muted) return;
    var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = wave || 'triangle';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol || 0.25, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    if (lpFreq) {
      var flt = AC.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = lpFreq;
      o.connect(flt); flt.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function play(name) {
    unlock();
    if (!AC || muted) return;
    if (name === 'swing') {
      noise(0.11, 950, 'bandpass', 0.16, 1.4);
      tone(250, 105, 0.1, 'triangle', 0.1);
    } else if (name === 'wood') {
      sample('wood', 0.6, 1.0);
      noise(0.09, 650, 'bandpass', 0.24, 1.8);
      tone(175, 68, 0.11, 'triangle', 0.32);
    } else if (name === 'stone') {
      sample('stone', 0.45, 1.15);
      noise(0.08, 2200, 'highpass', 0.22, 1);
      tone(980, 420, 0.12, 'triangle', 0.24);
    } else if (name === 'hit') {
      sample('hit', 0.68, 1.0);
      tone(150, 48, 0.14, 'sawtooth', 0.34, 600);
      noise(0.08, 420, 'lowpass', 0.25, 1);
    } else if (name === 'boom') {
      tone(95, 26, 0.65, 'sawtooth', 0.65, 380);
      noise(0.75, 480, 'lowpass', 0.75, 0.8);
    } else if (name === 'block') {
      sample('block', 0.52, 1.1);
      tone(195, 82, 0.09, 'triangle', 0.26);
    } else if (name === 'loot') {
      sample('loot', 0.55, 1.05);
      tone(520, 780, 0.12, 'triangle', 0.22);
    } else if (name === 'craft') {
      sample('craft', 0.5, 1.1);
      tone(440, 880, 0.16, 'triangle', 0.24);
    } else if (name === 'wash') {
      noise(0.22, 1650, 'bandpass', 0.28, 1.4);
      tone(420, 760, 0.14, 'sine', 0.18);
    } else if (name === 'heal') {
      tone(520, 780, 0.16, 'sine', 0.24);
      setTimeout(function () { tone(780, 1040, 0.22, 'sine', 0.22); }, 90);
    } else if (name === 'eat') {
      noise(0.11, 1450, 'bandpass', 0.22, 2.2);
      tone(210, 130, 0.09, 'triangle', 0.14);
    } else if (name === 'drink') {
      tone(290, 560, 0.14, 'sine', 0.22);
      noise(0.11, 820, 'bandpass', 0.14, 3);
    } else if (name === 'hurt') {
      tone(175, 55, 0.24, 'sawtooth', 0.42, 700);
      noise(0.14, 580, 'lowpass', 0.28, 1);
    } else if (name === 'step') {
      noise(0.055, 340, 'lowpass', 0.1, 1);
    } else if (name === 'groan') {
      var f = 105 + Math.random() * 35;
      tone(f, f * 0.68, 0.42, 'sawtooth', 0.14, 340);
    } else if (name === 'click') {
      tone(640, 440, 0.045, 'sine', 0.14);
    }
  }

  setInterval(function () {
    if (!AC || muted || AC.state !== 'running') return;
    if (isNight) {
      if (Math.random() < 0.65) {
        tone(3950, 4100, 0.05, 'sine', 0.025);
        setTimeout(function () { tone(3950, 4100, 0.05, 'sine', 0.025); }, 95);
      }
    } else {
      if (Math.random() < 0.45) noise(0.9, 420, 'bandpass', 0.035, 1.2);
    }
  }, 2600);

  WZ.Sound = {
    unlock: unlock,
    play: play,
    setNight: function (n) { isNight = !!n; },
    toggleMute: function () {
      muted = !muted;
      if (master && AC) master.gain.value = muted ? 0 : 0.78;
      return muted;
    },
    isMuted: function () { return muted; }
  };
})(window.WZ);
/* AKHIR sound.js */