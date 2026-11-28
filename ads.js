/* XKing shared ads engine (Webzombite, Webzombite Wiki, XKing Core, Ads Bath, XKing Linktree).
   ONE file: edit only the XK_ADS block below, then re-upload it with the rest of the site.
   - A slot with nothing pasted stays hidden. Nothing is loaded before the visitor accepts cookies.
   - Each ad slot loads at most once per 20 seconds (per slot, also across page navigation in the same tab).
   - If an ad blocker is detected, configured slots show a highlighted border and a short message behind them.
   Paste YOUR keys/snippets only. Never paste anything you do not trust: ad code runs in a sandboxed iframe. */
(function () {
  'use strict';

  /* =====================================================================
     PASTE YOUR AD SETTINGS HERE
     banner slots (Adsterra style): put the "key" from the atOptions snippet, e.g. key: '0123456789abcdef0123456789abcdef'
        - or put the whole invoke.js address in invokeUrl, e.g. invokeUrl: 'https://www.highperformanceformat.com/KEY/invoke.js'
        - or paste any other network's full HTML snippet into html: '<script ...></script>' (this overrides key/invokeUrl)
     native: either html: '...snippet...' or src: 'https://....../invoke.js' + containerId: 'container-KEY'; height = pixels
     smartlink: the Direct/Smart link used by the "Visit Sponsor" button (opens in a new tab only when the visitor clicks).
     popunder: optional popunder script URL (loaded on the Ads Bath page only, after the cookie choice).
     donateUrl: where "donate to us" should go (leave '' to show the text only).
     ===================================================================== */
  var USER = window.XK_ADS || {};
  /* Adsterra keys are separate per site: tree = XKing Link Tree, core = XKing Core (+ Ads Bath), wz = Webzombite (+ its wiki, no native banner). */
  var SITE_KEYS = {
    tree: { b160: '0073ccb911da1eb2494e21c750818dfc', b300: '038868eef264297bc29a60307e318e26', b320: '42d13ab9a9b8c068d8dd20c7ecd3260c', b728: '738fa0aa756710615a83b9a05dc9d56c', nat: '185557d95ea551f13abf82df54122d2b' },
    core: { b160: 'ced25a2dbff9d85328d810404e9cafe8', b300: '73b5c73e6bb0dbed7859151f4b18a507', b320: '1f7ea4128643edc0520b54009685231e', b728: '262901fcaf126c3d968ec9f355f0021e', nat: '8533a323eb98df19dd75e210d8932ceb' },
    wz:   { b160: '38dfb3d9becf31393b5de5b4de6fb466', b300: 'a1af82653b739ff38440ab7ed6cee2e7', b320: '6701efc8fc4438b1496a6eb5e308ba75', b728: '727ca4a423191b1791bbd2055568e038', nat: '' }
  };
  var SITE = ({ tree: 'tree', wz: 'wz', wiki: 'wz' })[window.XK_ADS_PAGE] || 'core', SK = SITE_KEYS[SITE];
  function bn(k) { return { key: k, invokeUrl: 'https://bauval.org/22/' + k, html: '' }; }
  var DEFAULT_CFG = {
    slots: {
      banner160x600: bn(SK.b160),
      banner300x250: bn(SK.b300),
      banner728x90:  bn(SK.b728),
      banner320x50:  bn(SK.b320),
      native:        SK.nat ? { src: 'https://bauval.org/21/' + SK.nat, containerId: 'container-' + SK.nat, html: '', height: 140 } : { src: '', containerId: '', html: '', height: 140 }
    },
    bannerHost: 'https://bauval.org/22/',
    smartlink: '',
    popunder: '',
    donateUrl: '',
    minReloadMs: SITE === 'wz' ? 30000 : 20000,
    blockedText: 'Consider support us by deactive your adblocker or donate to us!'
  };

  /* ---------------- config merge ---------------- */
  var CFG = window.XK_ADS = (function () {
    var c = JSON.parse(JSON.stringify(DEFAULT_CFG)), k, s;
    for (k in USER) { if (k !== 'slots') c[k] = USER[k]; }
    if (USER.slots) { for (s in USER.slots) { c.slots[s] = Object.assign(c.slots[s] || {}, USER.slots[s]); } }
    return c;
  })();

  var SIZES = { banner160x600: [160, 600], banner300x250: [300, 250], banner728x90: [728, 90], banner320x50: [320, 50], native: [0, 0] };
  var BAIT_ID = 'xk-bait';
  var KEY_CONSENT = 'xk.adsConsent', COOKIE = 'xk_ads_consent';

  /* ---------------- tiny helpers ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var mem = {};
  function ssGet(k) { try { var v = sessionStorage.getItem(k); return v == null ? (mem[k] == null ? null : mem[k]) : v; } catch (e) { return mem[k] == null ? null : mem[k]; } }
  function ssSet(k, v) { mem[k] = String(v); try { sessionStorage.setItem(k, String(v)); } catch (e) {} }
  function getCookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function setCookie(n, v) { try { document.cookie = n + '=' + encodeURIComponent(v) + '; max-age=31536000; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (e) {} }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    return /^https:\/\/[^\s"'<>\\]+$/.test(u) ? u : '';
  }
  function safeKey(k) { return String(k || '').replace(/[^A-Za-z0-9_-]/g, ''); }
  function safeId(k) { return String(k || '').replace(/[^A-Za-z0-9_-]/g, ''); }

  /* ---------------- clock (debug hook can shift it) ---------------- */
  var offset = 0;
  function now() { return Date.now() + offset; }

  /* ---------------- events ---------------- */
  var handlers = {};
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function emit(ev, a) { (handlers[ev] || []).forEach(function (f) { try { f(a); } catch (e) {} }); }

  /* ---------------- consent ---------------- */
  /* 'granted' = we may keep a cookie/setting so we remember you. 'denied' = "no cookies, thanks": we store NOTHING (only a per-tab session note) and the ads still show. */
  var memConsent = null;
  function consent() {
    var v = memConsent; try { v = v || sessionStorage.getItem(KEY_CONSENT); } catch (e) {}
    v = v || lsGet(KEY_CONSENT) || getCookie(COOKIE);
    return v === 'granted' || v === 'denied' ? v : null;
  }
  function adsOk() { return true; }
  function setConsent(v) {
    memConsent = v;
    if (v === 'granted') { lsSet(KEY_CONSENT, v); setCookie(COOKIE, v); try { sessionStorage.removeItem(KEY_CONSENT); } catch (e) {} }
    else { try { localStorage.removeItem(KEY_CONSENT); } catch (e) {} try { document.cookie = COOKIE + '=; Max-Age=0; path=/'; } catch (e) {} try { sessionStorage.setItem(KEY_CONSENT, v); } catch (e) {} }
    var b = $('#xk-consent'); if (b) b.remove();
    emit('consent', v);
    boot2();
  }

  /* ---------------- slot configuration ---------------- */
  function slotCfg(name) { return CFG.slots[name] || {}; }
  function configured(name) {
    var s = slotCfg(name);
    if (!s) return false;
    if (s.html && String(s.html).trim()) return true;
    if (name === 'native') return !!(safeUrl(s.src) && safeId(s.containerId));
    return !!(safeKey(s.key) || safeUrl(s.invokeUrl));
  }
  function invokeUrlOf(name) {
    var s = slotCfg(name);
    if (name === 'native') return safeUrl(s.src);
    var u = safeUrl(s.invokeUrl);
    if (u) return u;
    var key = safeKey(s.key), host = safeUrl(CFG.bannerHost) || DEFAULT_CFG.bannerHost;
    return key ? host.replace(/\/?$/, '/') + key + '/invoke.js' : '';
  }
  function firstNetworkUrl() {
    var names = Object.keys(SIZES), i, u, m;
    for (i = 0; i < names.length; i++) {
      if (!configured(names[i])) continue;
      u = invokeUrlOf(names[i]);
      if (u && !slotCfg(names[i]).html) return u;
      m = String(slotCfg(names[i]).html || '').match(/src=["'](?:https:)?(\/\/[^"'\s>]+|https:\/\/[^"'\s>]+)/i);
      if (m) return safeUrl(m[1]);
    }
    return '';
  }
  function anyConfigured() { return Object.keys(SIZES).some(configured); }
  function srcdocFor(name) {
    var s = slotCfg(name), size = SIZES[name], body;
    if (s.html && String(s.html).trim()) {
      body = String(s.html);
    } else if (name === 'native') {
      body = '<script async data-cfasync="false" src="' + safeUrl(s.src) + '"><\/script><div id="' + safeId(s.containerId) + '"></div>';
    } else {
      body = '<script>atOptions={"key":"' + safeKey(s.key) + '","format":"iframe","height":' + size[1] + ',"width":' + size[0] + ',"params":{}};<\/script>' +
        '<script src="' + invokeUrlOf(name) + '"><\/script>';
    }
    return '<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>' + body + '</body></html>';
  }

  /* ---------------- page profiles ---------------- */
  function wzRunning() {
    var hud = document.getElementById('hud'), scr = document.getElementById('screen'), inv = document.getElementById('inv');
    if (document.pointerLockElement) return true;
    if (hud && !hud.hidden) return true;
    if (inv && !inv.hidden) return true;
    if (!scr || scr.hidden) return true;
    return false;
  }
  var PROFILES = {
    wz:   { content: '#screen .card', scroll: false, hide: wzRunning, sides: true,  popunder: false },
    wiki: { content: 'main',          scroll: true,  sides: true },
    core: { content: '.wrap',         scroll: true,  sides: true },
    bath: { content: '.wrap',         scroll: true,  sides: true, popunder: true, alwaysConsent: true },
    tree: { content: '.links',        scroll: true,  sides: false },
    generic: { content: null, scroll: true, sides: false }
  };
  var PAGE = window.XK_ADS_PAGE || 'generic';
  var P = PROFILES[PAGE] || PROFILES.generic;

  /* ---------------- styles ---------------- */
  function injectCss() {
    if ($('#xk-ads-css')) return;
    var st = document.createElement('style'); st.id = 'xk-ads-css';
    st.textContent =
      '#xk-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:20}' +
      '.xk-sp{position:absolute;box-sizing:border-box;max-width:100vw;overflow:hidden;border-radius:8px;background:transparent;border:2px solid transparent}' +
      '.xk-sp.xk-fixed{position:fixed;z-index:45}' +
      '.xk-sp iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:light;z-index:2}' +
      '.xk-sp.xk-blocked iframe{visibility:hidden}' +
      '.xk-sp-bg{position:absolute;inset:0;z-index:1;display:none;align-items:center;justify-content:center;text-align:center;padding:6px;font:600 12px/1.3 system-ui,Segoe UI,Roboto,sans-serif;color:#f2efe6;background:#14161a;text-decoration:none;overflow:hidden}' +
      '.xk-sp-bg u{display:block;margin-top:4px;color:#e3b02a}' +
      '.xk-sp.xk-blocked{border:2px dashed #e3b02a;animation:xkpulse 1.8s ease-in-out infinite}' +
      '.xk-sp.xk-blocked .xk-sp-bg{display:flex;flex-direction:column}' +
      '.xk-sp.xk-w50 .xk-sp-bg{font-size:11px;padding:2px 6px}.xk-sp.xk-w50 .xk-sp-bg u{display:none}' +
      '@keyframes xkpulse{0%,100%{box-shadow:0 0 0 0 rgba(227,176,42,.0)}50%{box-shadow:0 0 12px 2px rgba(227,176,42,.55)}}' +
      '.xk-tag{position:absolute;z-index:3;font:600 9px/1 system-ui,sans-serif;color:#9aa0a8;pointer-events:none}' +
      '.xk-ph{display:block;width:100%;height:0;margin:0}' +
      '#xk-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#14161a;color:#f2efe6;border:1px solid #e3b02a;border-radius:14px;padding:14px 16px;box-shadow:0 18px 44px rgba(0,0,0,.55);font:500 13px/1.45 system-ui,Segoe UI,Roboto,sans-serif}' +
      '#xk-consent b{color:#e3b02a}#xk-consent p{margin:0 0 10px}#xk-consent .xk-cb{display:flex;gap:8px;flex-wrap:wrap}' +
      '#xk-consent button{font:700 13px system-ui,sans-serif;border-radius:999px;padding:8px 16px;cursor:pointer;border:1px solid #e3b02a;background:transparent;color:#f2efe6}' +
      '#xk-consent button.xk-ok{background:#e3b02a;color:#201a08}';
    document.head.appendChild(st);
  }

  /* ---------------- slot objects ---------------- */
  var slots = {};            /* key -> slot */
  var layer = null;
  function getLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div'); layer.id = 'xk-layer'; layer.setAttribute('aria-label', 'Advertisements');
    document.body.appendChild(layer);
    return layer;
  }
  function createSlot(key, name, fixed) {
    var sl = slots[key];
    if (sl) return sl;
    var box = document.createElement('div');
    box.className = 'xk-sp' + (fixed ? ' xk-fixed' : '') + (name === 'banner320x50' ? ' xk-w50' : '');
    box.hidden = true; box.setAttribute('role', 'complementary'); box.setAttribute('aria-label', 'Advertisement');
    var bg = document.createElement(CFG.donateUrl && safeUrl(CFG.donateUrl) ? 'a' : 'div');
    bg.className = 'xk-sp-bg';
    if (bg.tagName === 'A') { bg.href = safeUrl(CFG.donateUrl); bg.target = '_blank'; bg.rel = 'noopener noreferrer'; }
    bg.textContent = CFG.blockedText;
    if (bg.tagName === 'A') { var u = document.createElement('u'); u.textContent = 'Donate'; bg.appendChild(u); }
    box.appendChild(bg);
    sl = slots[key] = { key: key, name: name, box: box, iframe: null, loaded: false, fixed: !!fixed, wantShow: false, host: null, lastLoadAt: 0 };
    (fixed ? document.body : getLayer()).appendChild(box);
    return sl;
  }
  function gateKey(sl) { return 'xk.ads.t.' + sl.key; }
  function remaining(sl) {
    var last = parseInt(ssGet(gateKey(sl)) || '0', 10) || 0;
    return Math.max(0, last + (CFG.minReloadMs | 0) - now());
  }
  function tryLoad(sl) {
    if (sl.loaded || !adsOk() || !configured(sl.name)) return;
    if (remaining(sl) > 0) return;               /* 20 s gate: sync()/pump() will retry */
    sl.iframe = document.createElement('iframe');
    sl.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
    sl.iframe.setAttribute('referrerpolicy', 'no-referrer');
    sl.iframe.setAttribute('title', 'Advertisement');
    sl.iframe.setAttribute('scrolling', 'no');
    sl.iframe.srcdoc = srcdocFor(sl.name);
    sl.box.appendChild(sl.iframe);
    sl.loaded = true; sl.lastLoadAt = now();
    ssSet(gateKey(sl), sl.lastLoadAt);
  }

  /* ---------------- adblock detection ---------------- */
  var blocked = false, netChecked = 0, netBlocked = false;
  function baitBlocked() {
    var b = document.getElementById(BAIT_ID);
    if (!b) {
      b = document.createElement('div'); b.id = BAIT_ID;
      b.className = 'adsbox ad-banner textads banner-ads pub_300x250';
      b.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:10px;height:10px;pointer-events:none';
      b.innerHTML = '&nbsp;';
      document.body.appendChild(b);
      return false;
    }
    var cs = window.getComputedStyle(b);
    return !b.parentNode || b.offsetHeight === 0 || b.clientHeight === 0 || cs.display === 'none' || cs.visibility === 'hidden';
  }
  function netCheck() {
    var u = firstNetworkUrl();
    if (!u || !adsOk() || !window.fetch || navigator.onLine === false) return;
    if (now() - netChecked < 60000) return;
    netChecked = now();
    var done = false;
    /* two tries before we call it blocked, so a single network hiccup is never reported as an adblocker */
    var probe = function (n) { fetch(u, { method: 'GET', mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).then(function () { netBlocked = false; done = true; refreshBlocked(); }, function () { if (n < 1) { setTimeout(function () { probe(n + 1); }, 2500); } else { netBlocked = true; done = true; refreshBlocked(); } }); };
    probe(0);
  }
  function refreshBlocked() {
    var bb = baitBlocked(), nb = !!(bb || netBlocked);
    if (nb !== blocked) { try { console.info('[XKAds] adblock ' + (nb ? 'detected' : 'cleared') + ' (bait hidden: ' + bb + ', network probe failed: ' + netBlocked + ')'); } catch (e) {} }
    if (nb !== blocked) {
      blocked = nb;
      document.documentElement.classList.toggle('xk-adblock', blocked);
      emit('adblock', blocked);
    }
    sync();
  }
  function detect() { baitBlocked(); setTimeout(function () { refreshBlocked(); netCheck(); }, 150); }

  /* ---------------- placement ---------------- */
  function rectOf(el) { return el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; }
  function hit(a, b, gap) { return !(a.right + gap <= b.left || b.right + gap <= a.left || a.bottom + gap <= b.top || b.bottom + gap <= a.top); }
  var GAP = 8, PAD = 12;
  var bodyPadSet = 0, lastBar = '';

  function liveFor(sl) { return configured(sl.name) && (sl.loaded || blocked); }

  function placeFixed(sl, x, y, w, h) {
    var s = sl.box.style;
    s.left = Math.round(x) + 'px'; s.top = Math.round(y) + 'px'; s.width = w + 'px'; s.height = h + 'px'; s.right = 'auto'; s.bottom = 'auto';
  }
  function setShown(sl, show) {
    var want = !!show && adsOk() && configured(sl.name);
    if (want) tryLoad(sl);
    var vis = want && liveFor(sl);
    sl.box.hidden = !vis;
    sl.box.classList.toggle('xk-blocked', vis && blocked);
    sl.shownNow = vis;
    return vis;
  }

  function syncEdges() {
    var keys = ['bottom728', 'bottom320', 'left160', 'right160', 'right300'], k;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var off = !adsOk() || (P.hide && P.hide());
    var want = {}, accepted = [];
    var cr = P.content ? rectOf($(P.content)) : null;
    if (cr && (cr.width === 0 || cr.height === 0)) cr = null;
    var cLeft = cr ? cr.left : (vw - 960) / 2, cRight = cr ? cr.right : (vw + 960) / 2;
    var barH = 0;
    if (!off) {
      /* bottom bar */
      var bn = null;
      if (vw >= 760 && configured('banner728x90')) bn = 'banner728x90';
      else if (vw >= 360 && configured('banner320x50')) bn = 'banner320x50';
      if (bn) {
        var w = SIZES[bn][0], h = SIZES[bn][1], bx = (vw - w) / 2, by = vh - h - GAP - 2;
        var box = { left: bx, right: bx + w, top: by, bottom: by + h };
        var okB = P.scroll || !cr || !hit(box, cr, GAP);
        if (okB) { want[bn === 'banner728x90' ? 'bottom728' : 'bottom320'] = [bx, by, w, h, bn]; accepted.push(box); barH = h + GAP * 2; }
      }
      /* side slots */
      if (P.sides && vh >= 640) {
        var sky = SIZES.banner160x600, big = SIZES.banner300x250, top = Math.max(16, Math.round((vh - 600) / 2));
        var leftRoom = cLeft - PAD - 8, rightRoom = vw - cRight - PAD - 8;
        if (configured('banner160x600') && leftRoom >= sky[0]) {
          want.left160 = [cLeft - PAD - sky[0], top, sky[0], sky[1], 'banner160x600'];
        }
        if (vw >= 1500 && configured('banner300x250') && rightRoom >= big[0]) {
          want.right300 = [cRight + PAD, Math.max(16, Math.round((vh - 250) / 2)), big[0], big[1], 'banner300x250'];
        } else if (configured('banner160x600') && rightRoom >= sky[0]) {
          want.right160 = [cRight + PAD, top, sky[0], sky[1], 'banner160x600'];
        }
      }
    }
    /* resolve overlaps (never overlap content or each other) */
    keys.forEach(function (key) {
      var d = want[key], sl;
      if (d) {
        var r = { left: d[0], top: d[1], right: d[0] + d[2], bottom: d[1] + d[3] };
        var bad = key.indexOf('bottom') === 0 ? false : (cr && hit(r, cr, GAP - 1)) || accepted.some(function (a) { return hit(r, a, GAP); });
        if (bad) d = null; else if (key.indexOf('bottom') !== 0) accepted.push(r);
      }
      if (!d) { if (slots['e-' + key]) setShown(slots['e-' + key], false); return; }
      sl = createSlot('e-' + key, d[4], true);
      placeFixed(sl, d[0], d[1], d[2], d[3]);
      setShown(sl, true);
    });
    /* page padding / classes so nothing hides under the bottom bar */
    var barNow = 0;
    ['bottom728', 'bottom320'].forEach(function (key) { var sl = slots['e-' + key]; if (sl && sl.shownNow) barNow = slots['e-' + key].name === 'banner728x90' ? 90 : 50; });
    var cls = barNow ? 'xk-bar-' + barNow : '';
    if (cls !== lastBar) {
      document.body.classList.remove('xk-bar-90', 'xk-bar-50'); if (cls) document.body.classList.add(cls);
      if (P.scroll) { document.body.style.paddingBottom = barNow ? 'max(' + (barNow + 28) + 'px, ' + (parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + 'px)' : ''; }
      lastBar = cls;
    }
  }

  var seen = 0;
  function syncInline() {
    var els = document.querySelectorAll('[data-xk-slot]'), i, vw = document.documentElement.clientWidth;
    var activeKeys = {};
    for (i = 0; i < els.length; i++) {
      var el = els[i], want = el.getAttribute('data-xk-slot');
      if (!SIZES[want]) continue;
      var id = safeId(el.getAttribute('data-xk-id')) || (el._xkId = el._xkId || ('i' + (++seen)));
      var avail = el.parentElement ? el.parentElement.clientWidth : vw;
      var name = want;
      if (want === 'banner728x90' && (avail < 728 + 2)) name = 'banner320x50';
      if (SIZES[name][0] && avail < SIZES[name][0]) name = 'banner320x50';
      if (!configured(name)) { if (want !== name) { name = want; } }
      if (!configured(name)) { el.style.height = '0'; el.style.margin = '0'; continue; }
      var key = 'i-' + id + '-' + name, sl = createSlot(key, name, false);
      activeKeys[key] = 1;
      el.classList.add('xk-ph');
      sl.host = el;
      var w = name === 'native' ? Math.min(el.clientWidth || avail, 760) : SIZES[name][0];
      var h = name === 'native' ? (parseInt(slotCfg('native').height, 10) || 140) : SIZES[name][1];
      var vis = setShown(sl, adsOk());
      if (vis) {
        el.style.height = (h + 4) + 'px'; el.style.margin = '12px 0';
        var r = el.getBoundingClientRect();
        var left = r.left + window.pageXOffset + Math.max(0, (el.clientWidth - w) / 2), top = r.top + window.pageYOffset + 2;
        var s = sl.box.style; s.left = Math.round(left) + 'px'; s.top = Math.round(top) + 'px'; s.width = w + 'px'; s.height = h + 'px';
      } else { el.style.height = '0'; el.style.margin = '0'; }
    }
    Object.keys(slots).forEach(function (k) {
      if (k.indexOf('i-') === 0 && !activeKeys[k]) { slots[k].box.hidden = true; slots[k].shownNow = false; }
    });
  }

  var syncing = false;
  function sync() {
    if (syncing || !document.body) return; syncing = true;
    try { syncEdges(); syncInline(); } catch (e) { try { console.warn('[ads]', e); } catch (e2) {} }
    syncing = false;
  }

  /* ---------------- consent banner ---------------- */
  function showConsent() {
    if ($('#xk-consent')) return;
    var d = document.createElement('div'); d.id = 'xk-consent'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookie consent');
    d.innerHTML = '<p><b>Cookies (optional).</b> XKing is free because of ads. Accept lets us keep a small cookie to remember your choice. Prefer none? Just pick <b>No cookies</b>: we will not store any cookies or settings, and everything still works, ads included (our ad partners may still use their own).</p>' +
      '<div class="xk-cb"><button type="button" class="xk-ok" data-xk-c="granted">Accept cookies</button><button type="button" data-xk-c="denied">Ahh, no cookies please</button></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-xk-c]'); if (b) setConsent(b.getAttribute('data-xk-c')); });
    var bar = document.body.classList.contains('xk-bar-90') ? 98 : document.body.classList.contains('xk-bar-50') ? 58 : 0;
    d.style.bottom = (12 + bar) + 'px';
  }

  /* ---------------- popunder (opt-in, Ads Bath only) ---------------- */
  var popDone = false;
  function popunder() {
    var u = safeUrl(CFG.popunder);
    if (popDone || !u || !P.popunder || consent() === null || blocked) return;
    popDone = true;
    var s = document.createElement('script'); s.src = u; s.async = true; s.setAttribute('data-cfasync', 'false'); document.head.appendChild(s);
  }

  /* ---------------- sponsor button ---------------- */
  function sponsorUrl() { return safeUrl(CFG.smartlink); }
  function openSponsor() {
    var u = sponsorUrl();
    if (!u) return false;
    var w = window.open(u, '_blank', 'noopener,noreferrer');
    return !!w || true;
  }

  /* ---------------- start ---------------- */
  var started = false, timerId = 0;
  function boot2() {
    detect();
    popunder();
    sync();
  }
  function start() {
    if (started || !document.body) return; started = true;
    injectCss();
    var c = consent();
    if (c === null && (anyConfigured() || P.alwaysConsent)) showConsent();
    boot2();
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(sync, 120); });
    window.addEventListener('scroll', function () { /* inline slots live in document coordinates: nothing to do */ }, { passive: true });
    document.addEventListener('visibilitychange', function () { emit('visibility', document.visibilityState === 'visible'); });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-xk-ads-settings]')) { e.preventDefault(); showConsent(); } });
    var mt = 0;
    try { new MutationObserver(function () { clearTimeout(mt); mt = setTimeout(sync, 250); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    timerId = setInterval(function () { baitBlocked(); refreshBlocked(); netCheck(); }, 2000);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-xk-sponsor]')) { e.preventDefault(); openSponsor(); } });
  }

  /* ---------------- public API ---------------- */
  window.XKAds = {
    config: CFG, page: PAGE,
    consent: consent, setConsent: setConsent, openConsent: showConsent,
    isBlocked: function () { return blocked; },
    canCount: function () { return !blocked && document.visibilityState === 'visible'; },
    hasSponsor: function () { return !!sponsorUrl(); },
    openSponsor: openSponsor,
    on: on, sync: sync, configured: configured,
    _debug: {
      advance: function (ms) { offset += ms; sync(); },
      now: now,
      slots: function () {
        return Object.keys(slots).map(function (k) { var s = slots[k]; return { key: k, name: s.name, loaded: s.loaded, shown: !s.box.hidden, blocked: s.box.classList.contains('xk-blocked'), remaining: remaining(s), text: (s.box.querySelector('.xk-sp-bg') || {}).textContent }; });
      },
      forceBlocked: function (v) { netBlocked = !!v; refreshBlocked(); }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
