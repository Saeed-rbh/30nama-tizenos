/* Boot, router, rail, modals, splash, back handling. */
(function () {
  var stack = [], current = null, rootEl = null, swapT = null, $ = N.$, el = N.el;
  var content = null;
  var RAIL = [
    ['search', 'search', function () { N.go('search', {}, { reset: true }); }],
    ['home', 'home', function () { N.go('home', {}, { reset: true }); }],
    ['movies', 'movies', function () { N.go('archive', { slug: 'movies', name: N.t('movies') }, { reset: true }); }],
    ['series', 'series', function () { N.go('archive', { slug: 'series', name: N.t('series') }, { reset: true }); }],
    ['anime', 'anime', function () { N.go('archive', { slug: 'anime', name: N.t('anime') }, { reset: true }); }],
    ['archive', 'archive', function () { N.go('archive', {}, { reset: true }); }],
    ['myList', 'list', function () { N.go('myList', {}, { reset: true }); }]
  ];
  var ACCT = ['account', 'user', function () { N.go('settings', { section: 'account' }, { reset: true }); }];

  /* ---------------- home cache ---------------- */
  var hc = null;
  N.getHome = function () {
    var session = N.session, lang = N.lang;
    var user = session && session.user;
    var owner = user && (user.user_id || user.id || user.user_name);
    var cacheKey = !session ? 'homeCache.' + lang + '.guest' : owner ? 'homeCache.' + lang + '.user.' + owner : null;
    if (hc && hc.session === session && hc.lang === lang && (!hc.time || Date.now() - hc.time < hc.ttl)) return hc.promise;
    var request = { session: session, lang: lang, time: 0, ttl: 90000 };
    hc = request;
    request.promise = N.api.get('home_stream').then(function (result) {
      request.time = Date.now();
      if (hc === request && N.session === session && N.lang === lang && cacheKey) N.store.set(cacheKey, result);
      return result;
    }).catch(function (error) {
      var saved = cacheKey && N.store.get(cacheKey, null);
      if (saved && hc === request && N.session === session && N.lang === lang) {
        request.time = Date.now();
        request.ttl = 15000;
        return saved;
      }
      if (hc === request) hc = null;
      throw error;
    });
    return request.promise;
  };
  N.dropHome = function () { hc = null; };

  /* ---------------- splash ---------------- */
  var splash = { t0: Date.now(), done: false, failT: null };
  function splashExit() {
    if (splash.done) return; splash.done = true; clearTimeout(splash.failT);
    var s = $('splash'); s.classList.add('out');
    setTimeout(function () { s.style.display = 'none'; }, 450);
  }
  N.splashReady = function () {
    if (splash.done) return;
    var wait = Math.max(0, 1200 - (Date.now() - splash.t0));
    setTimeout(splashExit, wait);
  };

  /* ---------------- rail ---------------- */
  var rail = N.rail = { items: [], open: false, mem: null, pill: null, root: null };
  var Y0 = 288, PITCH = 72, ACCT_Y = 966;
  function yOf(i) { return i < RAIL.length ? Y0 + i * PITCH : ACCT_Y; }
  rail.build = function () {
    var r = rail.root = $('rail'); r.innerHTML = ''; rail.items = [];
    r.appendChild(el('div', 'rail-base')); r.appendChild(el('div', 'rail-scrim'));
    r.appendChild(el('div', 'rail-panel')); var br = el('div', 'rail-brand'); br.appendChild(N.ui.logo()); r.appendChild(br);
    rail.pill = el('div', 'rail-pill'); r.appendChild(rail.pill);
    RAIL.concat([ACCT]).forEach(function (m, i) {
      var b = el('button', 'ri' + (m[0] === 'account' ? ' acct' : '')); b._key = m[0]; b._y = yOf(i); b.style.top = b._y + 'px';
      if (m[0] === 'account') { var av = el('div', 'av'); av.appendChild(N.ui.icon('user')); b.appendChild(av); }
      else b.appendChild(N.ui.icon(m[1]));
      var lb = el('span', 'lb', N.t(m[0])); lb.style.transitionDelay = (i * 20) + 'ms'; b.appendChild(lb);
      b.onenter = function () { rail.go(m); };
      b.onclick = function () { rail.go(m); };
      b.onfocus2 = function () { rail.pill.style.transform = 'translateY(' + b._y + 'px)'; };
      b.onnav = function (dir) {
        if (dir === 'up') return rail.items[i - 1] || true;
        if (dir === 'down') return rail.items[i + 1] || true;
        if (N.ui.step(dir) > 0) { rail.close(true); return true; } // towards content
        return true;
      };
      r.appendChild(b); rail.items.push(b);
    });
    rail.mark();
  };
  rail.curKey = function () {
    var i = stack.length - 1, e = stack[i];
    while (e && e.name === 'details' && i > 0) { i--; e = stack[i]; }
    if (!e) return '';
    if (e.name === 'archive' && e.params && !e.params.trending && (e.params.slug === 'movies' || e.params.slug === 'series' || e.params.slug === 'anime')) return e.params.slug;
    if (e.name === 'settings') return 'account';
    return e.name;
  };
  rail.mark = function () {
    var k = rail.curKey();
    rail.items.forEach(function (b) { b.classList.toggle('cur', b._key === k); });
  };
  rail.visible = function () { return !!rail.root && !rail.root.classList.contains('gone'); };
  rail.enter = function () {
    if (!rail.visible() || rail.open || N.nav.repeating) return;
    if (N.nav.cur && !rail.isRail(N.nav.cur)) rail.mem = N.nav.cur;
    rail.open = true; rail.root.classList.add('open');
    var k = rail.curKey(), t = rail.items[1];
    rail.items.forEach(function (b) { if (b._key === k) t = b; });
    rail.pill.style.transition = 'none'; rail.pill.style.transform = 'translateY(' + t._y + 'px)';
    void rail.pill.offsetWidth; rail.pill.style.transition = '';
    N.nav.focus(t, true); t.onfocus2();
  };
  rail.isRail = function (e) { return !!e && e.classList && e.classList.contains('ri'); };
  rail.close = function (restore) {
    if (!rail.open) return;
    rail.open = false; rail.root.classList.remove('open');
    var m = rail.mem; rail.mem = null;
    if (restore) {
      if (m && m.offsetWidth > 0 && rootEl && rootEl.contains(m)) N.nav.focus(m, true);
      else N.nav.focusFirst(rootEl || content);
    }
  };
  // The compact Samsung remote's Play/Pause key doubles as a browsing menu shortcut.
  N.nav.onMenuShortcut = function (e) {
    if (!splash.done || !rail.visible() || modal || N.nav.scopes.length || (N.player && N.player.open)) return false;
    if (!e.repeat) { if (rail.open) rail.close(true); else rail.enter(); }
    return true;
  };
  rail.go = function (m) {
    var same = rail.curKey() === m[0];
    rail.close(false);
    if (same && current && stack.length === 1) { rail.mem = null; if (N.nav.cur && rail.isRail(N.nav.cur)) N.nav.clear(); N.nav.focusFirst(rootEl); return; }
    m[2]();
  };
  // keep the expanded panel in sync with focus: leaving the rail by any route (pointer, modal return, screen change, player) collapses it
  N.nav.onFocusChange = function (e) {
    if (!rail.root) return;
    var inRail = rail.isRail(e);
    if (inRail && !rail.open && rail.visible()) { rail.open = true; rail.root.classList.add('open'); }
    else if (!inRail && rail.open && !modal) { rail.open = false; rail.root.classList.remove('open'); rail.mem = null; }
  };
  // start-edge press with nothing to the start side opens the rail
  N.nav.onEdge = function (dir) {
    if (rail.open || !rail.visible() || (dir !== 'left' && dir !== 'right')) return;
    if (N.ui.step(dir) < 0) rail.enter();
  };

  /* ---------------- modal (confirm sheet) ---------------- */
  var modal = null, dialogSerial = 0;
  function placeCardDialog(m, box, card, anchor) {
    var frame = m.getBoundingClientRect(), bounds = anchor.getBoundingClientRect();
    var scale = frame.width / m.offsetWidth || 1, inset = 48, gap = 22;
    var width = bounds.width / scale, height = bounds.height / scale;
    var anchorLeft = (bounds.left - frame.left) / scale;
    var anchorTop = (bounds.top - frame.top) / scale;
    if (m.classList.contains('card-actions')) {
      var cardLeft = Math.max(inset, Math.min(m.offsetWidth - inset - width, anchorLeft));
      var cardTop = Math.max(inset, Math.min(m.offsetHeight - inset - height, anchorTop));
      var menuLeft = Math.min(cardLeft, m.offsetWidth - inset - box.offsetWidth);
      var menuTop = cardTop - gap - box.offsetHeight;
      if (menuTop < inset) {
        menuTop = cardTop + height + gap;
        m.classList.add('actions-below');
      }
      card.style.left = cardLeft + 'px';
      card.style.top = cardTop + 'px';
      card.style.width = width + 'px';
      card.style.height = height + 'px';
      box.style.left = menuLeft + 'px';
      box.style.top = menuTop + 'px';
      return;
    }
    var rightLimit = m.offsetWidth - inset - Math.max(width, box.offsetWidth);
    var left = Math.max(inset, Math.min(rightLimit, anchorLeft));
    var top = Math.max(inset + box.offsetHeight + gap,
      Math.min(m.offsetHeight - inset - height, anchorTop));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.width = width + 'px';
    card.style.height = height + 'px';
    box.style.left = left + 'px';
    box.style.top = (top - gap - box.offsetHeight) + 'px';
    box.style.setProperty('--pointer-x', (Math.min(width, box.offsetWidth) / 2) + 'px');
  }
  N.confirm = function (o) {
    if (modal) return;
    var anchor = o.anchor, actions = o.actions;
    var variant = anchor ? ' card-confirm' : o.kind === 'exit' ? ' exit-confirm' : '';
    var m = el('div', 'modal' + variant + (actions ? ' card-actions' : ''));
    var box = el('div', 'box');
    var title = actions ? null : el('div', 'mt', o.title);
    if (title) box.appendChild(title);
    if (!anchor) box.appendChild(el('div', 'mb', o.body || ''));
    if (anchor || o.kind === 'exit') {
      m.setAttribute('role', actions ? 'dialog' : 'alertdialog');
      m.setAttribute('aria-modal', 'true');
      if (title) {
        title.id = 'confirm-title-' + (++dialogSerial);
        m.setAttribute('aria-labelledby', title.id);
      } else {
        m.setAttribute('aria-label', o.title);
      }
    }
    var row = el('div', 'acts');
    (actions || [
      { label: o.cancel || N.t('cancel') },
      { label: o.ok, run: o.onOk, style: o.danger ? 'danger' : 'primary' }
    ]).forEach(function (action) {
      row.appendChild(N.ui.btn(action.label, function () {
        N.closeModal();
        if (action.run) action.run();
      }, action.style, action.icon));
    });
    box.appendChild(row);
    var card;
    if (anchor) {
      card = anchor.cloneNode(true);
      card.classList.remove('f', 'focus', 'select-feedback');
      card.classList.add('confirm-card');
      card.setAttribute('aria-hidden', 'true');
      var cardTitle = card.querySelector('.cw-title');
      if (cardTitle && title) {
        cardTitle.id = title.id + '-card';
        m.setAttribute('aria-describedby', cardTitle.id);
      }
      m.appendChild(card);
    }
    m.appendChild(box); document.body.appendChild(m);
    modal = { el: m, prev: N.nav.cur };
    if (anchor) {
      placeCardDialog(m, box, card, anchor);
      // Keep the selected card visually stable beneath the overlay as focus moves to Cancel.
      anchor.classList.add('confirm-anchor');
      modal.anchor = anchor;
      m.onclick = function (event) { if (event.target === m) N.closeModal(); };
    }
    N.nav.pushScope(m); void m.offsetWidth; m.classList.add('show'); N.nav.focus(row.firstChild, true);
  };
  N.closeModal = function () {
    if (!modal) return; var m = modal; modal = null;
    N.nav.popScope(); m.el.classList.remove('show');
    if (m.anchor) m.anchor.classList.remove('confirm-anchor');
    if (document.body.classList.contains('calm')) m.el.remove();
    else setTimeout(function () { m.el.remove(); }, 160);
    if (m.prev && m.prev.offsetWidth > 0) N.nav.focus(m.prev, true); else N.nav.clear();
  };
  function exitApp() {
    try { tizen.application.getCurrentApplication().exit(); } catch (e) { N.toast('Exit (not on Tizen)'); }
  }
  N.confirmExit = function () {
    N.confirm({ kind: 'exit', title: N.t('exitTitle'), body: N.t('exitBody'), ok: N.t('exit'), danger: false, onOk: exitApp });
  };

  /* ---------------- router ---------------- */
  function setChrome(name) {
    rail.root.classList.toggle('gone', name === 'login');
    $('stage').classList.toggle('home-stage', name === 'home');
    N.stage.dim(0); N.stage.details(false);
  }
  function build(entry) {
    var oldCur = current, old = rootEl;
    if (oldCur && oldCur.destroy) { try { oldCur.destroy(); } catch (e) {} }
    if (old && old.parentNode) {
      Array.prototype.forEach.call(old.querySelectorAll('.card'), N.ui.unload);
      old.parentNode.removeChild(old);
    }
    N.nav.clear(); N.nav.locked = false;
    var r = el('div', 'screen enter ' + entry.name); content.appendChild(r); rootEl = r;
    setChrome(entry.name);
    rail.mark();
    current = N.screens[entry.name](r, entry.params || {}, entry.focus) || {};
  }
  function render(entry) {
    clearTimeout(swapT);
    N.stage.cancel();
    if (rail.open) { rail.open = false; rail.root.classList.remove('open'); rail.mem = null; }
    if (rootEl && current) {
      rootEl.classList.add('leave'); N.nav.clear(); N.nav.locked = true;
      if (entry.name === 'archive') {
        var request = N.screens.preloadArchive(entry.params, entry.focus);
        if (request) request.catch(function () {}); // The incoming screen handles failures.
      }
      swapT = setTimeout(function () { build(entry); }, document.body.classList.contains('calm') ? 0 : 110);
    } else build(entry);
  }
  // opts: reset (clear history), replace (swap top entry)
  N.go = function (name, params, opts) {
    opts = opts || {};
    var entry = { name: name, params: params || {} };
    if (opts.reset) stack = [entry];
    else if (opts.replace && stack.length) stack[stack.length - 1] = entry;
    else {
      if (stack.length && current && current.focusState) stack[stack.length - 1].focus = current.focusState();
      stack.push(entry);
    }
    render(entry);
  };
  N.onBack = function () {
    if (N.player.open) { N.player.close(); return; }
    if (modal) { N.closeModal(); return; }
    if (rail.open) { rail.close(true); return; } // Back on the menu: collapse it and return to the content
    if (current && current.back && current.back()) return;
    if (stack.length > 1) { stack.pop(); render(stack[stack.length - 1]); return; }
    var top = stack[stack.length - 1];
    if (top && top.name !== 'home' && top.name !== 'login' && rail.visible()) { N.go('home', {}, { reset: true }); return; } // other top-level screens go Home
    N.confirmExit(); // Home (or login): exit confirm
  };
  N.onLogout = function () { N.preview.signedOut(); N.dropHome(); N.go('login', {}, { reset: true }); };
  N.onPlayerClosed = function () {
    N.stage.restore();
    if (current && current.onPlayerClosed) current.onPlayerClosed();
    else if (N.nav.cur === null && rootEl) N.nav.focusFirst(rootEl);
  };
  N.rerender = function () { // re-render the current screen (language change etc.)
    var e = stack[stack.length - 1]; if (e) { if (current && current.focusState) e.focus = current.focusState(); build(e); }
  };

  function bootError(e) {
    N.splashReady(); rail.root.classList.add('gone'); rootEl && (rootEl.innerHTML = '');
    var r = el('div', 'screen enter'); content.innerHTML = ''; content.appendChild(r); rootEl = r; current = null;
    var w = el('div', 'center-msg'); w.appendChild(N.ui.icon('warn'));
    try { console.warn('boot error', e && e.message); } catch (x) {}
    w.appendChild(el('div', 'm', N.t('error') + '. ' + N.t('tryAgain')));
    var b = N.ui.btn(N.t('retry'), boot, 'primary'); w.appendChild(b); r.appendChild(w); N.nav.focus(b, true);
  }
  function boot() {
    N.api.init().then(function () {
      rail.build();
      var p = Promise.resolve();
      if (N.isLoggedIn()) {
        p = N.api.call('user', {}).then(function (j) {
          if (j && j.success && j.result) {
            var u = j.result.user_session ? j.result : (j.result.user || null);
            if (u && u.user_session) N.setSession(u); else { N.session.user = Object.assign({}, N.session.user, j.result); N.store.set('session', N.session); }
          }
        }).catch(function () {});
      }
      return p;
    }).then(function () {
      if (N.isLoggedIn() || N.store.get('guest', false) === true) { N.go('home', {}, { reset: true }); N.preview.ready(); }
      else N.go('login', {}, { reset: true });
      N.preview.refresh();
    }).catch(bootError);
  }

  // Scale the 1920x1080 stage down for desktop preview only. Never scale up
  // (UHD TVs that report 3840x2160 would otherwise get a blurry CSS 2x).
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1), r = document.documentElement;
    if (Math.abs(s - 1) < 0.01) { r.style.transform = ''; return; }
    r.style.transform = 'scale(' + s + ')'; r.style.transformOrigin = '0 0';
  }
  window.addEventListener('resize', fit);

  document.addEventListener('DOMContentLoaded', function () {
    fit();
    content = $('content');
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function syncMotion() { document.body.classList.toggle('calm', motionQuery.matches || N.store.get('calm', false)); }
    syncMotion();
    if (motionQuery.addListener) motionQuery.addListener(syncMotion);
    N.nav.registerKeys();
    splash.failT = setTimeout(splashExit, 10000);
    boot();
  });
})();
