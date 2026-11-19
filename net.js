/* Webzombite - Online multiplayer module (max 4 players).
   Uses MQTT 3.1.1 over WebSocket (WSS) + BroadcastChannel (for tabs on the same device).
   A room code is 6 random letters/numbers and is not case sensitive. */
(function (WZ) {
  'use strict';

  var C = window.WZ_CONFIG || {};
  var BROKERS = C.mqttBrokers || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var te = new TextEncoder(), td = new TextDecoder();

  function randId(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += ALPHA[(Math.random() * ALPHA.length) | 0];
    return s;
  }

  function normalizeCode(code) {
    return String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  }

  /* ---------------- Enkoder & Dekoder Paket MQTT 3.1.1 ---------------- */
  function putStr(arr, str) {
    var b = te.encode(str);
    arr.push((b.length >> 8) & 255, b.length & 255);
    for (var i = 0; i < b.length; i++) arr.push(b[i]);
  }
  function encodeRemLen(len, out) {
    do {
      var d = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) d |= 128;
      out.push(d);
    } while (len > 0);
  }
  function pktConnect(cid) {
    var body = [];
    putStr(body, 'MQTT');
    body.push(4, 2, 0, 30); /* MQTT 3.1.1, CleanSession=1, KeepAlive=30s */
    putStr(body, cid);
    var hdr = [0x10];
    encodeRemLen(body.length, hdr);
    return new Uint8Array(hdr.concat(body));
  }
  function pktSubscribe(pid, topic) {
    var body = [(pid >> 8) & 255, pid & 255];
    putStr(body, topic);
    body.push(0);
    var hdr = [0x82];
    encodeRemLen(body.length, hdr);
    return new Uint8Array(hdr.concat(body));
  }
  function pktPublish(topic, payloadStr) {
    var tb = te.encode(topic), pb = te.encode(payloadStr);
    var rem = 2 + tb.length + pb.length;
    var hdr = [0x30];
    encodeRemLen(rem, hdr);
    var out = new Uint8Array(hdr.length + rem);
    out.set(hdr, 0);
    var p = hdr.length;
    out[p++] = (tb.length >> 8) & 255;
    out[p++] = tb.length & 255;
    out.set(tb, p); p += tb.length;
    out.set(pb, p);
    return out;
  }

  /* ---------------- Sesi Jaringan ---------------- */
  var state = {
    active: false,
    role: 'solo',   /* solo | host | client */
    room: '',
    pid: '',
    topic: '',
    ws: null,
    bc: null,
    brokerIdx: 0,
    online: false,
    seq: 0,
    token: 0,
    pingTimer: null,
    rxBuf: new Uint8Array(0),
    seen: [],
    seenMap: Object.create(null),
    onMsg: null,
    onState: null
  };

  function markSeen(id) {
    if (state.seenMap[id]) return false;
    state.seenMap[id] = true;
    state.seen.push(id);
    if (state.seen.length > 400) {
      var old = state.seen.shift();
      delete state.seenMap[old];
    }
    return true;
  }

  function handleJson(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || !msg.f || msg.f === state.pid) return;
    if (msg.q != null && !markSeen(msg.f + ':' + msg.q)) return;
    if (state.onMsg) state.onMsg(msg);
  }

  function appendRx(chunk) {
    var a = new Uint8Array(chunk);
    var merged = new Uint8Array(state.rxBuf.length + a.length);
    merged.set(state.rxBuf, 0);
    merged.set(a, state.rxBuf.length);
    state.rxBuf = merged;

    while (state.rxBuf.length >= 2) {
      var b0 = state.rxBuf[0];
      var mult = 1, rem = 0, pos = 1, ok = false;
      while (pos < state.rxBuf.length && pos <= 4) {
        var d = state.rxBuf[pos++];
        rem += (d & 127) * mult;
        if ((d & 128) === 0) { ok = true; break; }
        mult *= 128;
      }
      if (!ok) {
        if (pos > 4) state.rxBuf = new Uint8Array(0);
        break;
      }
      if (state.rxBuf.length < pos + rem) break;

      var body = state.rxBuf.subarray(pos, pos + rem);
      state.rxBuf = state.rxBuf.slice(pos + rem);
      var type = b0 >> 4;

      if (type === 2) {
        if (body[1] === 0 && state.ws && state.ws.readyState === 1) {
          state.ws.send(pktSubscribe(1, state.topic));
        }
      } else if (type === 9) {
        state.online = true;
        if (state.onState) state.onState({ online: true, broker: state.brokerIdx });
      } else if (type === 3) {
        if (body.length < 2) continue;
        var qos = (b0 >> 1) & 3;
        var tLen = (body[0] << 8) | body[1];
        var payOff = 2 + tLen + (qos > 0 ? 2 : 0);
        if (payOff <= body.length) handleJson(td.decode(body.subarray(payOff)));
      }
    }
  }

  function closeWs() {
    if (state.pingTimer) { clearInterval(state.pingTimer); state.pingTimer = null; }
    if (state.ws) {
      try { state.ws.onopen = state.ws.onmessage = state.ws.onerror = state.ws.onclose = null; state.ws.close(); } catch (e) {}
      state.ws = null;
    }
    state.online = false;
    state.rxBuf = new Uint8Array(0);
  }

  function connectBroker(idx, tok) {
    if (!state.active || tok !== state.token) return;
    closeWs();
    state.brokerIdx = idx % BROKERS.length;
    var url = BROKERS[state.brokerIdx], ws;
    try {
      ws = new WebSocket(url, 'mqtt');
      ws.binaryType = 'arraybuffer';
    } catch (e) {
      setTimeout(function () { connectBroker(idx + 1, tok); }, 800);
      return;
    }
    state.ws = ws;
    var gotConn = false, scheduled = false;
    function retryNext(ms) {
      if (scheduled || tok !== state.token || !state.active) return;
      scheduled = true;
      setTimeout(function () { connectBroker(idx + 1, tok); }, ms);
    }

    var fallbackTimer = setTimeout(function () {
      if (!gotConn) retryNext(50);
    }, 3600);

    ws.onopen = function () {
      if (tok !== state.token || !state.active) return;
      ws.send(pktConnect('wzl_' + state.pid + '_' + randId(4)));
      state.pingTimer = setInterval(function () {
        if (ws.readyState === 1) {
          try { ws.send(new Uint8Array([0xC0, 0x00])); } catch (e) {}
        }
      }, 20000);
    };
    ws.onmessage = function (ev) {
      if (tok !== state.token || !state.active) return;
      if (!gotConn) { gotConn = true; clearTimeout(fallbackTimer); }
      if (ev.data instanceof ArrayBuffer) appendRx(ev.data);
    };
    ws.onerror = function () {
      clearTimeout(fallbackTimer);
      retryNext(1000);
    };
    ws.onclose = function () {
      clearTimeout(fallbackTimer);
      if (tok !== state.token || !state.active) return;
      state.online = false;
      if (state.onState) state.onState({ online: false, broker: state.brokerIdx });
      retryNext(1500);
    };
  }

  function start(role, roomCode, onMsg, onState) {
    disconnect();
    state.active = true;
    state.role = role;
    state.room = normalizeCode(roomCode);
    state.pid = randId(8);
    state.topic = 'wzlite/v1/r/' + state.room;
    state.seq = 0;
    state.token++;
    state.seen.length = 0;
    state.seenMap = Object.create(null);
    state.onMsg = onMsg;
    state.onState = onState;

    try {
      state.bc = new BroadcastChannel('wzlite_room_' + state.room);
      state.bc.onmessage = function (ev) { handleJson(ev.data); };
    } catch (e) { state.bc = null; }

    connectBroker(0, state.token);
    return state;
  }

  function send(obj) {
    if (!state.active) return;
    obj.f = state.pid;
    obj.q = ++state.seq;
    var str = JSON.stringify(obj);
    if (state.bc) { try { state.bc.postMessage(str); } catch (e) {} }
    if (state.online && state.ws && state.ws.readyState === 1) {
      try { state.ws.send(pktPublish(state.topic, str)); } catch (e) {}
    }
  }

  function switchBroker() {
    if (!state.active) return;
    connectBroker(state.brokerIdx + 1, state.token);
  }

  function disconnect() {
    if (state.active) {
      try { send({ t: 'bye' }); } catch (e) {}
    }
    state.active = false;
    state.role = 'solo';
    state.token++;
    closeWs();
    if (state.bc) { try { state.bc.close(); } catch (e) {} state.bc = null; }
  }

  WZ.Net = {
    genCode: function () { return randId(6); },
    normalizeCode: normalizeCode,
    start: start,
    send: send,
    switchBroker: switchBroker,
    disconnect: disconnect,
    info: function () { return state; }
  };
})(window.WZ);