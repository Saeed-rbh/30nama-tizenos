/* Screens: login(QR), home, details, search, archive, settings. Each returns {destroy, back?, focusState?}. */
(function () {
  var S = N.screens = {};
  var el = N.el, ui = N.ui;

  function isListed(post) { return post && !(post.options && post.options.coming_soon); }
  function listed(posts) { return (posts || []).filter(isListed); }

  function watchEntries(r) {
    var a = r && (r.posts || r.items || r.list || r);
    return N.watchProgress.merge(Array.isArray(a) ? a : null).filter(function (x) {
      var p = x && (x.post || x);
      return p && p.id != null && isListed(p);
    });
  }
  function userObj(r) { return (r && r.user_session) ? r : (r && r.user && r.user.user_session ? r.user : null); }
  function errorView(root, e, retry) {
    root.innerHTML = '';
    var w = el('div', 'center-msg'); w.appendChild(ui.icon('warn'));
    try { console.warn('screen error', e && e.message); } catch (x) {}
    w.appendChild(el('div', 'm', N.t('error') + '. ' + N.t('tryAgain')));
    var b = ui.btn(N.t('retry'), retry, 'primary'); w.appendChild(b); root.appendChild(w); N.nav.focus(b, true);
  }
  function instant(root, fn) { root.classList.add('noanim'); fn(); void root.offsetWidth; root.classList.remove('noanim'); }
  function skeletonHome(root) {
    var w = el('div', 'skel-wrap'), b = el('div', 'sk-bb');
    [[600, 64, 0], [420, 28, 20], [760, 28, 20], [760, 28, 12]].forEach(function (s) { var x = el('div', 'bar'); x.style.width = s[0] + 'px'; x.style.height = s[1] + 'px'; x.style.marginTop = s[2] + 'px'; b.appendChild(x); });
    w.appendChild(b);
    var r = el('div', 'sk-rows'); r.style.top = '640px';
    for (var i = 0; i < 7; i++) r.appendChild(ui.skelCard());
    w.appendChild(r); root.appendChild(w); return w;
  }

  /* ================= QR login ================= */
  S.login = function (root) {
    var dead = false, pollT = null, startT = 0, code = null;
    root.classList.add('login');
    N.stage.dim(0.55);
    var col = el('div', 'col'); root.appendChild(col);
    col.appendChild(el('div', 'eyebrow', N.t('signIn')));
    col.appendChild(el('div', 'h-xl', N.t('scanTitle')));
    var steps = el('div', 'steps');
    ['step1', 'step2', 'step3'].forEach(function (k, i) { var s = el('div', 'step'); s.appendChild(el('b', '', String(i + 1))); s.appendChild(el('span', '', N.t(k))); steps.appendChild(s); });
    col.appendChild(steps);
    var alt = el('div', 'alt'), codeEl = el('span', 'code', '');
    (function () { var parts = N.t('orVisit').split('30nama.com/auth'); alt.appendChild(document.createTextNode(parts[0])); alt.appendChild(el('span', 'latin', '30nama.com/auth')); alt.appendChild(document.createTextNode(parts[1] || '')); })();
    alt.appendChild(codeEl); col.appendChild(alt);
    var acts = el('div', 'acts'), guestB = ui.btn(N.t('guest'), function () { cleanup(); N.go('home', {}, { reset: true }); N.preview.ready(); }, 'primary');
    var newB = ui.btn(N.t('refresh'), function () { cleanup(); dead = false; begin(); }, '');
    acts.appendChild(guestB); acts.appendChild(newB); col.appendChild(acts);
    var tile = el('div', 'qr-tile'), qrBox = el('div', 'qr'), okBox = el('div', 'ok'), exp = el('div', 'exp', N.t('expired'));
    okBox.appendChild(ui.icon('check')); tile.appendChild(qrBox); tile.appendChild(exp); tile.appendChild(okBox); root.appendChild(tile);
    var status = el('div', 'qr-status'); status.appendChild(el('i')); var stTxt = el('span', '', N.t('waiting')); status.appendChild(stTxt); root.appendChild(status);
    N.nav.focus(guestB, true);

    // backdrop: first hero cover (guest payload)
    N.getHome().then(function (h) {
      if (dead) return;
      var ps = listed(h.hero_header && h.hero_header.posts), p = null;
      for (var i = 0; i < ps.length; i++) if (ui.coverUrl(ps[i])) { p = ps[i]; break; }
      if (p) N.stage.show(p, { immediate: true, done: function () { N.splashReady(); } }); else N.splashReady();
    }).catch(function () { N.splashReady(); });

    function cleanup() { dead = true; clearInterval(pollT); }
    function begin() {
      tile.classList.remove('dim', 'done'); qrBox.innerHTML = ''; codeEl.textContent = ''; status.style.visibility = 'visible';
      N.api.get('qrlogin_code').then(function (r) {
        if (dead) return;
        code = r.code; var link = r.url || (N.config.qrBase + code);
        var qr = qrcode(0, 'M'); qr.addData(link); qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
        codeEl.textContent = code;
        startT = Date.now(); clearInterval(pollT);
        pollT = setInterval(function () {
          if (dead) return;
          if (Date.now() - startT > N.config.qrTimeoutMs) { // expired
            clearInterval(pollT); tile.classList.add('dim'); status.style.visibility = 'hidden'; N.nav.focus(newB, true); return;
          }
          N.api.call('qrlogin_login', { auth_code: code }).then(function (j) {
            if (dead || !j || !j.success) return; // CODE_NOT_USED -> keep polling
            var u = userObj(j.result);
            var token = u ? u.user_session : (j.result && (j.result.token || j.result.user_session));
            if (!token) return;
            cleanup();
            N.setSession(u || { user_session: token });
            // qrlogin_login returns only {token}; fetch the profile with it
            N.api.call('user', {}).then(function (uj) {
              var rr = uj && uj.success && uj.result;
              var full = rr && (rr.user_session ? rr : (rr.user || rr));
              if (full) { if (!full.user_session) full.user_session = token; N.setSession(full); }
            }).catch(function () {}).then(function () {
              tile.classList.add('done'); status.style.visibility = 'hidden'; N.dropHome();
              N.toast(N.t('welcome') + ' ' + ((N.session.user && N.session.user.user_name) || ''));
              setTimeout(function () { N.go('home', {}, { reset: true }); N.preview.ready(); }, 400);
            });
          }).catch(function () {});
        }, N.config.qrPollMs);
      }).catch(function (e) {
        if (dead) return; tile.classList.add('dim'); exp.textContent = N.t('error'); status.style.visibility = 'hidden'; N.nav.focus(newB, true);
      });
    }
    begin();
    return { destroy: cleanup };
  };

  /* ================= Home ================= */
  S.home = function (root, params, restore) {
    var dead = false, st = { mode: 'hero', row: 0 };
    var heroes = [], defs = [], rowEls = [], tracks = [], cards = [], mem = [], tops = [], cwIds = {}, rowObjs = [], shownHero = null;
    var resumeQueue = [], resumeActive = 0;
    var bb, bbE, dotsEl, playBtn, detBtn, heroUi, rowsEl, noteBtn = null, noteEl = null;
    var curPost = null, curEb = '', curImm = false, shownKey = '', fT = null, bbT = null, outgoingBillboard = null, lastAct = Date.now(), advT = null, rowsTy = null, heroIdx = 0, heroNav = 0, chPrev = null, chNext = null;
    root.classList.add('home');
    var sk = skeletonHome(root);
    function act() { lastAct = Date.now(); }
    document.addEventListener('keydown', act);

    function load() {
      var cw = N.isLoggedIn() ? N.api.get('continue_watching').catch(function () { return null; }) : Promise.resolve(null);
      var tmOn = N.tmdb.enabled(), tmH = Promise.resolve([]);
      if (tmOn) { root.classList.add('tm'); N.tmdb.startHome(); tmH = N.tmdb.heroes(6, 3200).catch(function () { return []; }); }
      Promise.all([N.getHome(), cw, tmH]).then(function (res) { if (!dead) build(res[0], watchEntries(res[1]), res[2]); })
        .catch(function (e) { if (dead) return; N.splashReady(); errorView(root, e, function () { root.innerHTML = ''; sk = skeletonHome(root); load(); }); });
    }

    function cwNorm(x0) {
      x0 = x0 || {};
      var c = x0.data || x0.continue_watching || x0;
      var t = Number(c.time || c.position || 0), d = Number(c.duration || 0);
      var supplied = c.progress !== undefined && c.progress !== null && c.progress !== '' && isFinite(Number(c.progress));
      var known = supplied || (isFinite(d) && d > 0 && isFinite(t));
      var fraction = supplied ? Number(c.progress) / 100 : (known ? t / d : 0);
      fraction = Math.max(0, Math.min(1, fraction));
      var season = c.season || (c.info && c.info.season), ep = c.episode || (c.info && c.info.episode);
      var label = season && ep ? 'S' + season + ' · E' + N.ui.epLabel(ep) : '';
      return { prog: fraction, known: known, label: label, queued: c.file_id != null && c.time === 0 && c.duration === 0 };
    }


    function build(h, cwList, tmHeroes) {
      root.removeChild(sk);
      heroes = listed(h.hero_header && h.hero_header.posts).slice(0, 8);
      tmHeroes = listed(tmHeroes);
      if (tmHeroes.length >= 3) heroes = tmHeroes;
      var cwPosts = cwList.map(function (x) { return x.post || x; });
      cwPosts.forEach(function (p) { cwIds[p.id] = true; });
      if (cwPosts.length) defs.push({ key: 'cw', title: N.t('continueWatching'), kind: 'land', posts: cwPosts, raw: cwList });
      ['new_releases', 'suggested', 'top_10', 'movies', 'series', 'anime'].forEach(function (k) {
        var ps = listed(h[k] && h[k].posts); if (ps.length) defs.push({ key: k, title: N.t(k), kind: k === 'top_10' ? 'top' : 'poster', posts: k === 'top_10' ? ps.slice(0, 10) : ps });
      });
      root.appendChild(ui.clock());
      // billboard
      bb = el('div', 'bb'); bbE = {};
      ['title:bb-title', 'meta:bb-meta', 'plot:bb-plot', 'eb:bb-eyebrow'].forEach(function (s) {
        var p = s.split(':'), e = el('div', 'bb-i ' + p[1]); bbE[p[0]] = e; bb.appendChild(e);
      });
      root.appendChild(bb);
      // hero buttons + dots
      heroUi = el('div', 'hero-ui');
      playBtn = ui.btn(N.t('play'), function () { goDetails(shownHero || heroes[heroIdx], true); }, 'primary', 'play');
      detBtn = ui.btn(N.t('details'), function () { goDetails(shownHero || heroes[heroIdx], false); }, '', 'info');
      var br = el('div', 'br'); br.appendChild(playBtn); br.appendChild(detBtn); heroUi.appendChild(br);
      heroes.forEach(function (p) { if (p._logo) ui.artwork(p._logo, -1, function () {}); });
      dotsEl = el('div', 'dots'); heroes.forEach(function () { dotsEl.appendChild(el('i')); }); heroUi.appendChild(dotsEl);
      root.appendChild(heroUi);
      if (heroes.length > 1) {
        chPrev = el('button', 'chev prev f'); chNext = el('button', 'chev next f');
        chPrev.onclick = function () { heroStep(-1); }; chNext.onclick = function () { heroStep(1); };
        chPrev.onfocus2 = chNext.onfocus2 = function () { if (st.mode !== 'hero') exitBrowse(); heroNav = lastAct = Date.now(); };
        root.appendChild(chPrev); root.appendChild(chNext);
      }
      playBtn.onfocus2 = detBtn.onfocus2 = function () { if (st.mode !== 'hero') exitBrowse(); else { curPost = heroes[heroIdx]; } };
      // rows
      rowsEl = el('div', 'rows'); root.appendChild(rowsEl);
      defs.forEach(function (d) { var r = makeRow(d); pushRow(r); });
      if (!N.isLoggedIn()) {
        noteEl = el('div', 'guest-note'); noteEl.appendChild(el('div', 'gn-t', N.t('loginRequired')));
        noteBtn = ui.btn(N.t('signIn'), function () { N.go('login', {}, { reset: true }); }, '');
        noteBtn.onfocus2 = function () { if (st.mode !== 'browse') { st.mode = 'browse'; root.classList.add('browse'); } setRow(defs.length); curPost = null; };
        noteEl.appendChild(noteBtn); rowsEl.appendChild(noteEl);
      }
      recalcTops();
      root.onnav = onnav;
      N.nav.onSettle(follow);
      // initial state
      var start = 0, br = null;
      if (restore && restore.mode === 'browse') {
        var rr = defs.map(function (d) { return d.key; }).indexOf(restore.rowKey);
        if (rr < 0) rr = restore.row;
        var cs = cards[rr] || [];
        br = cs.filter(function (c) { return String(c._post.id) === String(restore.postId); })[0] || cs[Math.min(restore.idx, cs.length - 1)];
      }
      if (restore && typeof restore.hero === 'number' && heroes[restore.hero]) start = restore.hero;
      instant(root, function () { setRowsRest(); });
      if (heroes.length) setHero(start, true, !!br);
      else if (!br) N.splashReady();
      if (br) instant(root, function () { N.nav.focus(br, true); });
      else if (heroes.length) N.nav.focus(playBtn, true);
      else if (cards[0]) N.nav.focus(cards[0][0], true);
      advT = setInterval(autoAdvance, 1000);
      tmSetup();
    }

    function confirmDismiss(post, card) {
      N.confirm({
        anchor: card, title: N.t('dismissWatchTitle'), body: N.title(post), ok: N.t('dismissWatch'), danger: true,
        onOk: function () {
          var session = N.session;
          N.api.call('continue_watching_dismiss', { id: post.id }).then(function (result) {
            if (!session || N.session !== session) return;
            if (!result || (!result.success && result.msg !== 'DISMISS_FAILED')) throw new Error('dismiss failed');
            N.watchProgress.dismiss(post);
            N.toast(N.t('dismissedWatch'));
            if (!dead) N.rerender();
          }).catch(function () {
            if (!dead) N.toast(N.t('dismissWatchError'));
          });
        }
      });
    }

    // one row = {d, row, tr, cs, ws}; d.posts are cards in order. Closures resolve the row index lazily (rows can be inserted above).
    function addCard(r, p, i) {
      var d = r.d, c = ui.card(p, d.kind, { rank: i + 1 });
      if (d.kind === 'land') {
        c.onhold = function () { confirmDismiss(p, c); };
        var caption = el('div', 'cw-caption'), title = el('div', 'cw-title', N.title(p)), detail = el('div', 'cw-info');
        caption.appendChild(title); caption.appendChild(detail); c.appendChild(caption);
        var pb = el('div', 'prog'), pi = el('i'); pb.appendChild(pi); c.appendChild(pb);
        function updateResume(data) {
          var n = cwNorm(data || {});
          detail.textContent = n.label;
          pb.classList.toggle('hidden', !n.known);
          caption.classList.toggle('has-progress', n.known);
          pi.style.transform = 'scaleX(' + n.prog.toFixed(3) + ')';
        }
        updateResume(d.raw[i] || p);
        // Only older catalogue responses need the playback-details fallback.
        var state = cwNorm(d.raw[i] || p);
        if (!state.known && !state.queued) resumeQueue.push(function () {
          return N.api.call('stream', { post_id: p.id, free_stream: 0 }).then(function (response) {
            if (dead || !response || !response.success || !response.result) return;
            var result = response.result, resume = result.continue_watching;
            if (!resume) return;
            var items = result.hls || [], match = null;
            for (var j = 0; j < items.length; j++) {
              if (resume.file_id != null && String((items[j].info || {}).file_id) === String(resume.file_id)) { match = items[j]; break; }
            }
            var data = Object.assign({}, resume, { info: match ? match.info : resume.info });
            updateResume(data);
          });
        });
        pumpResume();
      }
      c.onfocus2 = function () { onCardFocus(defs.indexOf(d), i); };
      c.onclick = function () { goDetails(p, false); };
      r.tr.appendChild(c); r.cs.push(c); r.ws.push(d.kind === 'land' ? 400 : d.kind === 'top' ? (i + 1 >= 10 ? 420 : 300) : 200);
      if (i < 10) ui.load(c);
    }
    function pumpResume() {
      while (!dead && resumeActive < 2 && resumeQueue.length) {
        var task = resumeQueue.shift(); resumeActive++;
        task().catch(function () {}).then(function () { resumeActive--; pumpResume(); });
      }
    }
    function makeRow(d) {
      var row = el('div', 'hrow' + (d.key === 'cw' ? ' cw-row' : '')), hd = el('div', 'hrow-h', d.title), tr = el('div', 'track'), r = { d: d, row: row, tr: tr, cs: [], ws: [] };
      if (d.key === 'cw') hd.appendChild(el('span', 'cw-hold-hint', N.t('dismissWatchHint')));
      var viewport = el('div', 'home-track-window'); viewport.appendChild(tr);
      row.appendChild(hd); row.appendChild(viewport);
      d.posts.forEach(function (p, i) { addCard(r, p, i); });
      ui.layoutTrack(tr, r.cs, r.ws, 24);
      return r;
    }
    function pushRow(r) { rowEls.push(r.row); tracks.push(r.tr); cards.push(r.cs); mem.push(0); rowsEl.appendChild(r.row); rowObjs.push(r); }
    function recalcTops() { tops.length = 0; for (var k = 0; k < rowEls.length; k++) tops.push(rowEls[k].offsetTop); if (noteEl) tops.push(noteEl.offsetTop); }
    // insert a TMDB row at index `at`, keeping the current view stable
    function insertRowAt(r, at) {
      var curD = st.mode === 'browse' && defs[st.row] ? defs[st.row] : null;
      defs.splice(at, 0, r.d); rowEls.splice(at, 0, r.row); tracks.splice(at, 0, r.tr); cards.splice(at, 0, r.cs); mem.splice(at, 0, 0); rowObjs.splice(at, 0, r);
      rowsEl.insertBefore(r.row, rowEls[at + 1] || noteEl || null);
      recalcTops();
      instant(root, function () {
        if (curD) { st.row = -1; rowsTy = null; setRow(defs.indexOf(curD)); } else if (st.mode === 'hero') setRowsRest();
      });
      for (var k = 0; k < r.cs.length && k < 10; k++) ui.load(r.cs[k]);
    }
    var tmRows = {}, tmFeeds = [];
    function tmSetup() {
      if (!N.tmdb.enabled()) return;
      var TD = [['trend', 'trendingWeek', 5], ['fresh', 'newSeries', 5], ['pop', 'popularMovies', 5]];
      TD.forEach(function (x) {
        var f = N.tmdb.feed(x[0]); tmFeeds.push(f);
        function cb() {
          if (dead) return;
          var items = f.items.filter(function (it) { return isListed(it.post); }).sort(function (a, b) { return a.i - b.i; }), r = tmRows[x[0]];
          if (!r) {
            if (items.length < x[2]) return;
            var d = { key: 'tm_' + x[0], title: N.t(x[1]), kind: 'poster', posts: items.map(function (it) { return it.post; }) };
            r = tmRows[x[0]] = makeRow(d); r.n = items.length;
            var at = 0; while (at < defs.length && (defs[at].key === 'cw' || defs[at].key.indexOf('tm_') === 0)) at++;
            // keep trend < fresh < pop order
            var order = { tm_trend: 0, tm_fresh: 1, tm_pop: 2 };
            at = 0; while (at < defs.length && (defs[at].key === 'cw' || (order[defs[at].key] !== undefined && order[defs[at].key] < order[d.key]))) at++;
            insertRowAt(r, at);
          } else {
            var seen = {}; r.d.posts.forEach(function (p) { seen[p.id] = 1; });
            items.forEach(function (it) { if (!seen[it.post.id]) { seen[it.post.id] = 1; r.d.posts.push(it.post); addCard(r, it.post, r.d.posts.length - 1); } });
            ui.layoutTrack(r.tr, r.cs, r.ws, 24);
          }
          if (f.done) f.unsubscribe(cb);
        }
        f.subscribe(cb);
      });
    }

    function goDetails(p, play) { if (p) N.go('details', { id: p.id, autoplay: play ? 1 : 0 }); }

    /* ---- billboard + stage follow ---- */
    function eyebrowFor(p, key, rank) {
      if (key === 'hero') return (p._hero ? N.t('trendingNow') : N.t('featured')) + ' · ' + ui.typeLabel(p, true);
      if (key === 'top_10') return N.t('top10') + ' · #' + rank;
      if (key === 'cw') return N.t('continueWatching');
      return ui.typeLabel(p, true);
    }
    function fill(p, eb) {
      bbE.eb.textContent = eb; bbE.title.textContent = N.title(p);
      bbE.meta.innerHTML = ''; bbE.meta.appendChild(ui.meta(p, 2)); bbE.plot.textContent = N.plot(p);
      shownHero = p;
      ui.titleArtwork(bbE.title, N.title(p), p._logo || null);
    }
    function swapBB(p, eb, first) {
      clearTimeout(bbT);
      if (outgoingBillboard) { outgoingBillboard.remove(); outgoingBillboard = null; }
      var animate = !first && !document.body.classList.contains('calm');
      bb.classList.remove('hero-enter');
      if (animate) {
        outgoingBillboard = bb.cloneNode(true);
        outgoingBillboard.classList.add('hero-exit');
        outgoingBillboard.setAttribute('aria-hidden', 'true');
        bb.parentNode.insertBefore(outgoingBillboard, bb.nextSibling);
      }
      fill(p, eb);
      if (animate) {
        void bb.offsetWidth;
        bb.classList.add('hero-enter');
        bbT = setTimeout(function () {
          outgoingBillboard.remove(); outgoingBillboard = null;
          bb.classList.remove('hero-enter');
        }, 360);
      }
    }
    function follow() { clearTimeout(fT); if (dead || !curPost) return; if (N.nav.isFast()) return; fT = setTimeout(function () { apply(false); }, 260); }
    function apply(first) {
      if (dead || !curPost) return;
      var post = curPost, eyebrow = curEb, key = post.id + '|' + eyebrow;
      function commitBillboard() {
        if (dead || post !== curPost || eyebrow !== curEb || key === shownKey) return;
        var initial = !shownKey;
        shownKey = key;
        swapBB(post, eyebrow, initial);
        if (st.mode === 'hero') playBtn.lastChild.textContent = cwIds[post.id] ? N.t('resume') : N.t('play');
      }
      if (first || st.mode !== 'hero') commitBillboard();
      N.stage.show(post, {
        immediate: curImm || first,
        done: function () {
          if (st.mode === 'hero') commitBillboard();
          if (first) N.splashReady();
        }
      });
      curImm = false;
    }

    /* ---- hero mode ---- */
    function setHero(i, first, uiOnly) {
      heroIdx = i; var p = heroes[i]; if (!p) return;
      var kids = dotsEl.children; for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k === i);
      playBtn.lastChild.textContent = cwIds[p.id] ? N.t('resume') : N.t('play');
      if (uiOnly || st.mode !== 'hero') return;
      curPost = p; curEb = eyebrowFor(p, 'hero'); curImm = true; clearTimeout(fT); apply(!!first);
    }
    function heroStep(d) {
      if (heroes.length < 2) return;
      heroNav = lastAct = Date.now();
      setHero((heroIdx + d + heroes.length) % heroes.length, false);
    }
    function autoAdvance() {
      if (dead || st.mode !== 'hero' || heroes.length < 2 || document.body.classList.contains('calm') || N.player.open || N.nav.cur === chPrev || N.nav.cur === chNext || rail_open() || document.querySelector('.modal')) return;
      if (Date.now() - lastAct < 9000 || Date.now() - heroNav < 12000) return;
      lastAct = Date.now(); setHero((heroIdx + 1) % heroes.length, false);
    }
    function rail_open() { return N.rail.open; }
    function setRowsRest() {
      rowsTy = 680 - (tops[0] || 0); rowsEl.style.transform = 'translateY(' + rowsTy + 'px)';
      for (var k = 0; k < rowEls.length; k++) { rowEls[k].classList.remove('past'); rowEls[k].classList.remove('cur'); }
      st.row = 0;
    }
    function exitBrowse() {
      st.mode = 'hero'; root.classList.remove('browse'); setRowsRest();
      var p = heroes[heroIdx]; curPost = p; curEb = eyebrowFor(p, 'hero'); curImm = true; lastAct = Date.now();
      clearTimeout(fT); apply(false);
    }

    /* ---- browse mode ---- */
    function windowRow(k, center) {
      var cs = cards[k], from = Math.max(0, center - 2), to = Math.min(cs.length - 1, center + 9);
      for (var i = from; i <= to; i++) ui.load(cs[i]);
    }
    function windowRows(ri) {
      for (var k = 0; k < cards.length; k++) {
        var d = Math.abs(k - ri);
        if (d <= 2) windowRow(k, mem[k] || 0);
        else if (d > 4) for (var i = 0; i < cards[k].length; i++) ui.unload(cards[k][i]);
      }
    }
    function setRow(ri) {
      var ty = 600 - tops[ri];
      if (rowsTy !== ty) { rowsTy = ty; rowsEl.style.transform = 'translateY(' + ty + 'px)'; }
      if (st.row !== ri || !rowEls[ri] || !rowEls[ri].classList.contains('cur')) {
        for (var k = 0; k < rowEls.length; k++) { rowEls[k].classList.toggle('past', k < ri); rowEls[k].classList.toggle('cur', k === ri); }
        st.row = ri; windowRows(ri);
      }
    }
    function onCardFocus(ri, i) {
      if (st.mode !== 'browse') { st.mode = 'browse'; root.classList.add('browse'); }
      mem[ri] = i; setRow(ri);
      for (var j = 0; j < cards[ri].length; j++) {
        cards[ri][j].style.setProperty('--home-nudge', ((j < i ? -24 : j > i ? 24 : 0) * (N.isRtl() ? -1 : 1)) + 'px');
      }
      // Keep one selection anchor: the incoming and outgoing cards travel together.
      ui.slideTo(tracks[ri], cards[ri][i]._x);
      windowRow(ri, i);
      var p = cards[ri][i]._post; curPost = p; curEb = eyebrowFor(p, defs[ri].key, i + 1);
      follow();
    }
    function onnav(dir, cur) {
      var s = (dir === 'left' || dir === 'right') ? ui.step(dir) : 0;
      if (cur === playBtn || cur === detBtn) {
        if (dir === 'down') { if (cards.length) return cards[0][mem[0] || 0]; return true; }
        if (dir === 'up') return chPrev || true;
        if (cur === playBtn) { if (s > 0) return detBtn; N.rail.enter(); return true; }
        if (s < 0) return playBtn; return true;
      }
      if (cur === chPrev || cur === chNext) {
        if (dir === 'down') return playBtn;
        if (dir === 'up') return true;
        if (cur === chPrev) { if (s > 0) return chNext; N.rail.enter(); return true; }
        if (s < 0) return chPrev; return true;
      }
      if (cur === noteBtn) {
        if (dir === 'up') return cards[cards.length - 1][mem[cards.length - 1] || 0];
        if (s < 0) { N.rail.enter(); } return true;
      }
      var ri = -1, i = -1;
      for (var r = 0; r < cards.length && ri < 0; r++) { var ix = cards[r].indexOf(cur); if (ix >= 0) { ri = r; i = ix; } }
      if (ri < 0) return false;
      if (s) {
        var ni = i + s;
        if (ni < 0) { N.rail.enter(); return true; }
        if (ni >= cards[ri].length) return true;
        return cards[ri][ni];
      }
      if (dir === 'down') {
        if (ri + 1 < cards.length) return cards[ri + 1][Math.min(mem[ri + 1] || 0, cards[ri + 1].length - 1)];
        return noteBtn || true;
      }
      if (dir === 'up') {
        if (ri === 0) return heroes.length ? playBtn : true;
        return cards[ri - 1][Math.min(mem[ri - 1] || 0, cards[ri - 1].length - 1)];
      }
      return true;
    }

    load();
    return {
      destroy: function () {
        dead = true; clearTimeout(fT); clearTimeout(bbT); clearInterval(advT); document.removeEventListener('keydown', act);
        N.nav.offSettle(follow); N.stage.cancel();
        var c = root.querySelector('.clock'); if (c) clearTimeout(c._t);
      },
      focusState: function () {
        if (st.mode === 'browse' && N.nav.cur) { for (var r = 0; r < cards.length; r++) { var ix = cards[r].indexOf(N.nav.cur); if (ix >= 0) return { mode: 'browse', row: r, rowKey: defs[r].key, idx: ix, postId: N.nav.cur._post.id, hero: heroIdx }; } }
        return { mode: 'hero', hero: heroIdx };
      }
    };
  };

  /* ================= Details ================= */
  S.details = function (root, params) {
    var dead = false, epsOpen = false, lastFocus = null, swT = null, curS = null, sheetScope = null;
    root.classList.add('det');
    N.stage.details(true); N.stage.dim(0);
    var sk = el('div', 'skel-wrap'), skb = el('div', 'sk-bb'); skb.style.top = '240px';
    [[640, 64, 0], [420, 28, 20], [760, 28, 20]].forEach(function (s) { var x = el('div', 'bar'); x.style.width = s[0] + 'px'; x.style.height = s[1] + 'px'; x.style.marginTop = s[2] + 'px'; skb.appendChild(x); });
    sk.appendChild(skb); root.appendChild(sk);

    function load() {
      var wantStream = N.isLoggedIn();
      N.api.get('single', { post_id: params.id }).then(function (post) {
        if (dead) return;
        N.stage.show(post, { immediate: true });
        var detailMetadata = N.tmdb.enabled() ? N.tmdb.details(post).catch(function () { return null; }) : Promise.resolve(null);
        var free = post.options && post.options.free_stream;
        var sp = (wantStream || free) ? N.api.call('stream', { post_id: post.id, free_stream: wantStream ? 0 : 1 }).then(function (j) {
          return (j && j.success) ? j.result : null;
        }).catch(function () { return null; }) : Promise.resolve(null);
        return sp.then(function (st) { if (!dead) render(post, st, detailMetadata); });
      }).catch(function (e) { if (!dead) errorView(root, e, function () { root.innerHTML = ''; root.appendChild(sk); load(); }); });
    }
    function render(post, st, detailMetadata) {
      root.removeChild(sk);
      var items = (st && st.hls ? st.hls.slice() : []);
      items.sort(ui.epCmp);
      var remoteResume = st && st.continue_watching, resume, startIdx;
      var po = post.options || {}, isSeries = !!po.is_series;
      var tmOn = N.tmdb.enabled(), dpage = el('div', 'd-page'), col = el('div', 'det-col');
      if (tmOn) root.classList.add('tm');
      var eb = el('div', 'd-eyebrow d-fade', ui.typeLabel(post, true));
      col.appendChild(eb);
      var titleEl = el('div', 'd-title', N.title(post)); col.appendChild(titleEl);
      if (tmOn) ui.titleArtwork(titleEl, N.title(post), detailMetadata.then(function (d) { return d && d.logo ? N.tmdb.img(d.logo, 'w500') : ''; }));
      var tagEl = null; if (tmOn) { tagEl = el('div', 'd-tag'); tagEl.dir = 'auto'; col.appendChild(tagEl); }
      var meta = ui.meta(post, 3, {details:true}); meta.classList.add('d-meta'); col.appendChild(meta);
      var plot = el('div', 'd-plot d-fade', N.plot(post)); col.appendChild(plot);
      var facts = el('div', 'd-facts d-fade'); col.appendChild(facts);
      var btns = el('div', 'd-btns d-fade'); col.appendChild(btns);
      var streamFacts = [];
      function paintFacts(extra) {
        facts.innerHTML = '';
        streamFacts.concat(extra || []).forEach(function (f) { var bit = el('div', 'd-fact'); bit.appendChild(el('span', 'd-fact-label', f[0])); bit.appendChild(el('span', 'd-fact-value', f[1])); facts.appendChild(bit); });
      }
      dpage.appendChild(col); root.appendChild(dpage);

      function refreshResume() {
        resume = N.watchProgress.resume(post.id, items, remoteResume);
        startIdx = 0;
        if (resume) items.forEach(function (it, i) { if (it.info && String(it.info.file_id) === String(resume.file_id)) startIdx = i; });
        var info = items[startIdx] && items[startIdx].info || {};
        return resume ? N.t('resume') + (isSeries ? ' S' + (info.season || 1) + '·E' + ui.epLabel(info.episode, startIdx + 1) : '') : N.t('play');
      }
      function play(i, withResume) {
        // leaving for the player: remember where we were, and fully hide the episodes sheet (it would otherwise be drawn over the video)
        backToSheet = epsOpen; lastFocus = epsOpen ? null : N.nav.cur; if (epsOpen) { epMem[curS] = i; clearTimeout(swT); swT = null; hideEps(); }
        N.player.start(post, items, i, withResume ? resume : null);
      }
      var playLabel = refreshResume();
      var selectedFile = items[startIdx] && items[startIdx].file || {};
      if (selectedFile.m3u8 instanceof Array) {
        var qualities = selectedFile.m3u8.map(function (q) { return String(q.label || ''); }).filter(function (q) { return /\d/.test(q); });
        qualities.sort(function (a,b) { return (parseInt(b.replace(/\D/g,''),10)||0) - (parseInt(a.replace(/\D/g,''),10)||0); });
        if (qualities.length) streamFacts.push([N.t('quality'), qualities[0]]);
      }
      var subLanguages = selectedFile.subtitle && Object.keys(selectedFile.subtitle).filter(function (k) { return (k === 'en' || k === 'fa') && selectedFile.subtitle[k]; });
      if (subLanguages && subLanguages.length) streamFacts.push([N.t('subtitles'), subLanguages.map(function (k) { return N.t(k === 'en' ? 'english' : 'persian'); }).join(', ')]);
      paintFacts();
      var playB;
      if (items.length) playB = ui.btn(playLabel, function () { play(startIdx, true); }, 'primary', 'play');
      else playB = ui.btn(N.t('play'), function () { N.toast(N.isLoggedIn() ? N.t('noStream') : N.t('playLogin'), 3500); }, 'primary', 'play');
      btns.appendChild(playB);
      var epB = null;
      if (isSeries && items.length) { epB = ui.btn(N.t('episodes'), function () { openEps(); }, '', 'list'); btns.appendChild(epB); }

      var saveB = ui.btn('', function () { N.library.toggle(post); paintSave(); }, '', 'bookmark');
      function paintSave() {
        var saved = N.library.has(post.id); saveB.textContent = ''; saveB.appendChild(ui.icon(saved ? 'check' : 'bookmark'));
        saveB.appendChild(document.createTextNode(N.t(saved ? 'removeTitle' : 'saveTitle'))); saveB.setAttribute('aria-pressed', String(saved));
      }
      paintSave(); btns.appendChild(saveB);

      /* episodes sheet */
      var sheet = null, tabs = null, wrap = null, track = null, tmeta = null, seasons = [], map = {}, epMem = {}, tileBy = {}, backToSheet = false;
      if (epB) {
        sheet = el('div', 'sheet-eps'); tabs = el('div', 'tabs'); wrap = el('div', 'eptrack-w'); track = el('div', 'eptrack'); wrap.appendChild(track);
        tmeta = el('div', 'tabs-meta tab'); sheet.appendChild(tabs); sheet.appendChild(tmeta); sheet.appendChild(wrap); root.appendChild(sheet);
        items.forEach(function (it, i) { var s = (it.info && it.info.season) || 1; if (!map[s]) { map[s] = []; seasons.push(s); } map[s].push(i); });
        seasons.forEach(function (s, si) {
          var t = ui.pill(N.t('season') + ' ' + s, function () { focusEp(); }, false); t._s = s;
          t.onfocus2 = function () { showSeason(s); };
          t.onnav = function (dir) {
            if (dir === 'down') { flush(); return epTarget(curS) || true; }
            if (dir === 'up') return true;
            var d = ui.step(dir), n = tabs.children[si + d]; return n || true;
          };
          tabs.appendChild(t);
        });
      }
      // tile to focus when entering season s: the remembered episode (an index, never a node: tiles are rebuilt on every season switch), else the first
      function epTarget(s) { var i = epMem[s]; return (i !== undefined && tileBy[i]) || track.firstChild; }
      function buildSeason(s) {
        track.innerHTML = ''; tileBy = {}; var tiles = [];
        map[s].forEach(function (idx) {
          var it = items[idx], prog = 0;
          if (resume && it.info && String(it.info.file_id) === String(resume.file_id) && Number(resume.duration) > 0) prog = Number(resume.time) / Number(resume.duration);
          var t = ui.epTile(it, idx, { progress: prog, post: post });
          t.onclick = function () { play(idx, true); };
          t.onfocus2 = function () { ui.slideTo(track, t._x); epMem[s] = idx; };
          t.onnav = function (dir) {
            if (dir === 'up') { for (var q = 0; q < tabs.children.length; q++) if (tabs.children[q]._s === curS) return tabs.children[q]; return true; }
            if (dir === 'down') return true;
            var d = ui.step(dir), i = tiles.indexOf(t); return tiles[i + d] || true;
          };
          t._idx = idx; tileBy[idx] = t; track.appendChild(t); tiles.push(t);
        });
        ui.layoutTrack(track, tiles, tiles.map(function () { return 360; }));
        // position the track for the remembered tile (no animation, nothing carried over from another season)
        var tg = epTarget(s);
        track.style.transition = 'none'; track._s = null; track.style.transform = ''; ui.slideTo(track, tg ? tg._x : 184); void track.offsetWidth; track.style.transition = '';
        tmeta.textContent = tiles.length + ' ' + N.t('episodes');
      }
      function showSeason(s, now) {
        if (s === curS) return; curS = s;
        for (var q = 0; q < tabs.children.length; q++) tabs.children[q].classList.toggle('cur', tabs.children[q]._s === s);
        clearTimeout(swT); swT = null;
        if (now || document.body.classList.contains('calm')) { buildSeason(s); wrap.classList.remove('sw'); return; }
        wrap.classList.add('sw'); swT = setTimeout(function () { swT = null; buildSeason(s); wrap.classList.remove('sw'); }, 110);
      }
      function flush() { if (swT) { clearTimeout(swT); swT = null; buildSeason(curS); wrap.classList.remove('sw'); } }
      function focusEp() { flush(); var t = epTarget(curS); if (t) N.nav.focus(t, true); }
      // open the sheet on episode index idx (default: resume/start episode); inst = no slide animation (restoring after playback)
      function openEps(idx, inst) {
        if (epsOpen || !sheet) return; epsOpen = true;
        if (idx === undefined || idx === null || !items[idx]) idx = startIdx;
        var s0 = (items[idx].info && items[idx].info.season) || seasons[0];
        epMem[s0] = idx; curS = null; showSeason(s0, true);
        if (inst) { root.classList.add('inst'); }
        root.classList.add('eps'); sheetScope = sheet; N.nav.pushScope(sheet);
        if (inst) { void root.offsetWidth; setTimeout(function () { root.classList.remove('inst'); }, 60); }
        N.nav.focus(epTarget(s0), true);
      }
      // hide the sheet completely (leave it for playback): visibility is hidden as soon as .eps goes away
      function hideEps() {
        if (!epsOpen) return; epsOpen = false; root.classList.remove('eps'); N.nav.popScope(); sheetScope = null;
      }
      function closeEps() {
        if (!epsOpen) return; epsOpen = false; root.classList.remove('eps'); N.nav.popScope(); sheetScope = null;
        N.nav.focus(epB, true);
      }
      btns.onnav = function (dir, cur) {
        if (dir === 'down') { var fx = xFirst(); if (fx) return fx; if (epB) { openEps(); return true; } return true; }
        if (dir === 'up') return true;
        return false;
      };
      function heroFocus() { setX(false); }
      playB.onfocus2 = heroFocus; if (epB) epB.onfocus2 = heroFocus;
      current.back = function () {
        if (epsOpen) { closeEps(); return true; }
        if (xOn) { N.nav.focus(playB, true); heroFocus(); return true; }
        return false;
      };

      /* ---------- Credits and optional TMDB extras ---------- */
      var xEl = null, xRows = [], xOn = false;
      function setX(on) {
        if (on === xOn) return; xOn = on; root.classList.toggle('xs', on); N.stage.dim(on ? 0.55 : 0);
        if (!on) { dpage._ty = 0; dpage.style.transform = ''; for (var k = 0; k < xRows.length; k++) { xRows[k].tr.style.transition = 'none'; xRows[k].tr._s = null; ui.slideTo(xRows[k].tr, 0); xRows[k].mem = 0; xRows[k].el.classList.remove('cur'); void xRows[k].tr.offsetWidth; xRows[k].tr.style.transition = ''; } }
      }
      function xFirst() { var r = xRows[0]; return r ? r.cs[Math.min(r.mem, r.cs.length - 1)] : null; }
      function positionExtras() {
        if (xEl) xEl.style.top = (col.offsetTop + col.offsetHeight + 40) + 'px';
      }
      function fmtDate(iso) {
        try { var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(N.lang === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; }
      }
      function statusText(s) {
        if (N.lang !== 'fa') return s;
        var m = { 'Returning Series': 'در حال پخش', 'Ended': 'پایان‌یافته', 'Canceled': 'لغو شده', 'In Production': 'در حال تولید', 'Planned': 'برنامه‌ریزی‌شده', 'Pilot': 'پایلوت' };
        return m[s] || s;
      }
      function xRowAdd(key, title, height) {
        if (!xEl) {
          xEl = el('div', 'd-x'); xEl.appendChild(el('div', 'd-x-bg')); xEl.onnav = xNav; dpage.appendChild(xEl);
        }
        var row = el('div', 'hrow'), hd = el('div', 'hrow-h', title), tr = el('div', 'track'), r = { key: key, el: row, tr: tr, cs: [], ws: [], mem: 0 };
        var cue = ui.icon('down', 'd-more-cue'); cue.setAttribute('aria-hidden', 'true'); hd.appendChild(cue);
        row.style.height = height + 'px'; row.appendChild(hd); row.appendChild(tr);
        if (key === 'cast' && xRows.length) {
          xEl.insertBefore(row, xRows[0].el);
          xRows.unshift(r);
          if (xOn && xEl.contains(N.nav.cur)) N.nav.cur.onfocus2();
        } else {
          xRows.push(r); xEl.appendChild(row);
        }
        return r;
      }
      function xCard(r, c, w) {
        c.onfocus2 = function () { r.mem = r.cs.indexOf(c); ui.slideTo(r.tr, c._x); setX(true); ui.vscroll(dpage, r.el, 250); for (var k = 0; k < xRows.length; k++) xRows[k].el.classList.toggle('cur', xRows[k] === r); };
        r.tr.appendChild(c); r.cs.push(c); r.ws.push(w); ui.layoutTrack(r.tr, r.cs, r.ws, 24);
      }
      function initials(n) { var p = String(n || '').split(/\s+/); return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
      function creditPhoto(c, url) {
        var im = el('img', 'im'); im.alt = ''; im.decoding = 'async';
        im.onload = function () { im.classList.add('in'); };
        im.src = url;
        c.querySelector('.fph').appendChild(im);
      }
      function faceCard(p, role) {
        var c = el('div', 'card f k-face'), ph = el('div', 'fph');
        ph.appendChild(el('span', '', initials(p.name)));
        c.appendChild(ph); c.appendChild(el('div', 'fnm', p.name)); c.appendChild(el('div', 'frl', role || ''));
        if (p.photo) creditPhoto(c, p.photo);
        return c;
      }
      var creditsByType = {};
      function paintCredits(key, people) {
        if (!people.length) return;
        var row = creditsByType[key];
        if (!row) {
          row = creditsByType[key] = xRowAdd(key, N.t(key), 344);
          row.people = [];
        }
        var list = row.people;
        people.forEach(function (person) {
          if (!person.name) return;
          var known = list.filter(function (known) {
            return known.name.toLowerCase() === person.name.toLowerCase() &&
              (key === 'cast' || known.role === person.role);
          })[0];
          var role = key === 'crew' ? N.t(person.role) : person.role;
          if (!known) {
            var card = faceCard(person, role);
            list.push({ name: person.name, role: person.role, photo: person.photo, card: card });
            xCard(row, card, 180);
            return;
          }
          if (!known.role && person.role) { known.role = person.role; known.card.querySelector('.frl').textContent = role; }
          if (!known.photo && person.photo) { known.photo = person.photo; creditPhoto(known.card, person.photo); }
        });
      }
      function xNav(dir, cur) {
        var ri = -1, i = -1, k;
        for (k = 0; k < xRows.length && ri < 0; k++) { var ix = xRows[k].cs.indexOf(cur); if (ix >= 0) { ri = k; i = ix; } }
        if (ri < 0) return false;
        var s2 = (dir === 'left' || dir === 'right') ? ui.step(dir) : 0;
        if (s2) { var ni = i + s2; if (ni < 0) { N.rail.enter(); return true; } return xRows[ri].cs[ni] || true; }
        if (dir === 'down') { var nr = xRows[ri + 1]; return nr ? nr.cs[Math.min(nr.mem, nr.cs.length - 1)] : true; }
        if (dir === 'up') { if (ri === 0) return playB; var pr = xRows[ri - 1]; return pr.cs[Math.min(pr.mem, pr.cs.length - 1)]; }
        return true;
      }
      function paintTmdb(d) {
        if (tagEl && d.tagline) { tagEl.textContent = d.tagline; tagEl.classList.add('in'); }
        if (isSeries && (d.next || d.nextSeason)) {
          var schedule = el('div', 'd-schedule d-fade');
          // Suppress expired dates even if the screen's metadata came from cache.
          var now = new Date(), today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
          if (d.next && d.next.d >= today && !(d.next.e === 1 && d.nextSeason && d.nextSeason.s === d.next.s)) {
            schedule.appendChild(el('span', 'd-next fadein', N.t('nextEp') + ' · ⁦S' + d.next.s + 'E' + d.next.e + '⁩ · ' + fmtDate(d.next.d)));
          }
          if (d.nextSeason && d.nextSeason.d >= today) schedule.appendChild(el('span', 'd-next fadein', N.t('nextSeason') + ' ' + d.nextSeason.s + ' · ' + fmtDate(d.nextSeason.d)));
          if (schedule.firstChild) col.insertBefore(schedule, plot);
        }
        var bits = [];
        if (isSeries && d.status) bits.push([N.t('titleStatus'), statusText(d.status)]);
        if (!(post.info && post.info.time && post.info.time.default) && d.runtime) bits.push([N.t('runtime'), ui.duration(d.runtime)]);
        if (d.nets.length) bits.push([N.t('network'), d.nets.join(', ')]);
        paintFacts(bits);
        if (d.bd) {
          var tb = N.tmdb.img(d.bd, 'w1280'), cv = ui.coverUrl(post);
          if (!cv) { post._bd = tb; N.stage.show(post, { immediate: true }); }
          else {
            var ci = new Image();
            ci.onload = function () { if (dead) return; if (ci.naturalWidth && ci.naturalWidth < 1280) { post._bd = tb; post._bdPref = true; N.stage.show(post, { immediate: true }); } };
            ci.src = cv;
          }
        }
        paintCredits('cast', d.cast.map(function (p) { return { name: p.n, role: p.c, photo: N.tmdb.img(p.p, 'w185') }; }));
        paintCredits('crew', d.crew.map(function (p) { return { name: p.n, role: p.j, photo: N.tmdb.img(p.p, 'w185') }; }));
        positionExtras();
        if (d.recs.length) {
          var recRow = null, got = {}, n = 0, queued = [];
          var addRec = function (p) {
            var c = ui.card(p, 'poster'); c.onclick = function () { N.go('details', { id: p.id }); }; xCard(recRow, c, 200); ui.load(c);
          };
          d.recs.slice(0, 20).forEach(function (it) {
            N.tmdb.resolve(it, function () { return !dead && n < 12; }).then(function (p) {
              if (dead || !isListed(p) || p.id === post.id || got[p.id] || n >= 12) return;
              got[p.id] = 1; n++;
              if (!recRow) {
                queued.push(p); if (queued.length < 3) return;
                recRow = xRowAdd('rec', N.t('moreLikeThis'), 396); queued.forEach(addRec); positionExtras(); return;
              }
              addRec(p);
            });
          });
        }
      }
      var credits = ui.titleCredits(post);
      paintCredits('cast', credits.cast);
      paintCredits('crew', credits.crew);
      positionExtras();
      if (tmOn) detailMetadata.then(function (d) { if (!dead && d) paintTmdb(d); }).catch(function () {});
      current.onPlayerClosed = function () {
        playB.lastChild.textContent = refreshResume();
        if (backToSheet && sheet) { backToSheet = false; openEps(N.player.index, true); return; } // same season, on the episode just played (or the one autoplay moved to)
        var t = lastFocus && document.body.contains(lastFocus) && lastFocus.offsetWidth > 0 ? lastFocus : playB; N.nav.focus(t, true);
      };
      N.nav.focus(playB, true);
      if (params.autoplay) {
        if (items.length) play(startIdx, true); else N.toast(N.isLoggedIn() ? N.t('noStream') : N.t('playLogin'), 3500);
      } else if (params.showEpisodes) {
        if (epB) openEps();
        else N.toast(N.isLoggedIn() ? N.t('noStream') : N.t('playLogin'), 3500);
      }
    }
    var current = { destroy: function () { dead = true; clearTimeout(swT); if (sheetScope) { N.nav.popScope(); sheetScope = null; } } };
    load();
    return current;
  };

  /* ================= Search ================= */
  var KB = {
    en: { cols: 7, keys: 'abcdefghijklmnopqrstuvwxyz0123456789'.split('') },
    fa: { cols: 8, keys: 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی۰۱۲۳۴۵۶۷۸۹'.split('') }
  };
  S.search = function (root, params, restore) {
    restore = restore || {};
    var dead = false, seq = 0, timer = null, q = restore.query || '', swT = null;
    var kbLang = KB[restore.kbLang] ? restore.kbLang : (N.lang === 'fa' ? 'fa' : 'en');
    var restoreId = restore.resultId, resultCols = 4;
    root.classList.add('search');
    N.stage.dim(0.72);
    var panel = el('div', 'panel'); root.appendChild(panel);
    var field = el('div', 'qfield'), qt = el('span', 'qt'), ph = el('span', 'ph-t', N.t('searchPh')), caret = el('i', 'caret');
    var searchLabel = el('div', 'search-label', N.t('search')); panel.appendChild(searchLabel);
    var queryIcon = ui.icon('search'); queryIcon.classList.add('query-icon'); field.appendChild(queryIcon);
    field.appendChild(qt); field.appendChild(ph); field.appendChild(caret); panel.appendChild(field);
    field.setAttribute('role', 'status'); field.setAttribute('aria-label', N.t('search')); field.setAttribute('aria-live', 'polite');
    var kb = el('div', 'kb ' + kbLang), grid = el('div', 'grid'), fn = el('div', 'fn');
    kb.appendChild(grid); kb.appendChild(fn); panel.appendChild(kb);
    var backspace = deleteKey('search-input-key');
    field.appendChild(backspace);

    var res = el('div', 'results'), rh = el('div', 'rh'), rw = el('div', 'rgrid-w'), rg = el('div', 'rgrid');
    var viewport = el('div', 'rgrid-viewport'), resultCards = [], keyboardMem = null;
    rw.appendChild(rg); viewport.appendChild(rw); res.appendChild(rh); res.appendChild(viewport); root.appendChild(res);
    rw.reveal = function (e) { ui.vscroll(rw, e._cell || e, 20); };

    function key(label, cls, fn2) {
      var k = el('button', 'key f fl' + (cls ? ' ' + cls : ''));
      if (typeof label === 'string') k.textContent = label; else k.appendChild(label);
      k.onclick = fn2; return k;
    }
    function deleteKey(cls) {
      var button = key(ui.icon('backspace'), cls, function () {
        if (!q) return;
        q = Array.from(q).slice(0, -1).join('');
        changed();
      });
      button.setAttribute('aria-label', N.t('searchDelete'));
      return button;
    }
    function layout() {
      grid.innerHTML = ''; fn.innerHTML = ''; kb.className = 'kb ' + kbLang;
      var L = KB[kbLang]; grid.style.gridTemplateColumns = 'repeat(' + L.cols + ', minmax(0, 1fr))'; grid.dir = kbLang === 'fa' ? 'rtl' : 'ltr';
      L.keys.forEach(function (c) { grid.appendChild(key(c, '', function () { type(c); })); });
      Array.prototype.forEach.call(grid.children, function (k, i) {
        k.onnav = function (dir) {
          // Keyboard order follows its own language, independently of the UI language.
          var mapped = dir;
          if ((kbLang === 'fa') !== N.isRtl() && (dir === 'left' || dir === 'right')) mapped = dir === 'left' ? 'right' : 'left';
          if (dir === 'up' && i < L.cols) return backspace;
          if (dir === 'down' && Math.floor(i / L.cols) === Math.floor((L.keys.length - 1) / L.cols)) return fn.firstChild;
          return ui.gridNav(Array.prototype.slice.call(grid.children), i, L.cols, mapped, function () { return panelEdge(dir, k); });
        };
      });
      var sp = key(N.t('space'), 'sp', function () { type(' '); });
      fn.appendChild(sp);
      fn.appendChild(deleteKey(''));
      fn.appendChild(key(N.t('clearK'), '', function () { q = ''; changed(); }));
      var lk = key(kbLang === 'en' ? 'فا' : 'EN', '', function () { kbLang = kbLang === 'en' ? 'fa' : 'en'; layout(); keyboardMem = fn.children[3]; N.nav.focus(keyboardMem, true); });
      fn.appendChild(lk);
      Array.prototype.forEach.call(fn.children, function (k, i) {
        k.onnav = function (dir) {
          if (dir === 'up') return grid.children[Math.max(0, L.keys.length - L.cols + i)];
          if (dir === 'down') return true;
          return fn.children[i + ui.step(dir)] || panelEdge(dir, k);
        };
      });
      keyboardMem = panel.querySelectorAll('.key')[restore.keyboardIndex] || grid.firstChild;
    }
    function returnKey() { return keyboardMem && root.contains(keyboardMem) ? keyboardMem : grid.firstChild; }
    function panelEdge(dir, cur) {
      if (dir === 'left' || dir === 'right') {
        if (ui.step(dir) > 0) { keyboardMem = cur; return resultCards[0] || true; }
        N.rail.enter();
      }
      return true;
    }
    backspace.onnav = function (dir) { return dir === 'down' ? grid.firstChild : panelEdge(dir, backspace); };
    panel.onnav = function (dir, cur) {
      if (dir === 'down') return true;
      return panelEdge(dir, cur);
    };
    function paintQuery() { qt.textContent = q; ph.style.display = q ? 'none' : ''; }
    function type(c) { if (q.length < 60) { q += c; changed(); } }
    function changed() {
      seq++; clearTimeout(swT); rg.classList.remove('sw');
      paintQuery();
      clearTimeout(timer); timer = setTimeout(run, 500);
    }
    // physical keyboard (desktop testing / USB keyboards)
    function onKeyDown(e) {
      if (e.ctrlKey || e.altKey || e.metaKey || !e.key || e.key.length !== 1) return;
      if (N.player.open || N.rail.open || document.querySelector('.modal')) return;
      type(e.key.toLowerCase());
    }
    document.addEventListener('keydown', onKeyDown);

    function show(posts, header, msg) {
      posts = listed(posts);
      clearTimeout(swT);
      if (document.body.classList.contains('calm')) { paintResults(); return; }
      rg.classList.add('sw');
      swT = setTimeout(paintResults, 110);
      function paintResults() {
        if (dead) return;
        var restoreIndex = resultCards.indexOf(N.nav.cur);
        rg.innerHTML = ''; resultCards = []; rh.textContent = header;
        if (msg) { var m = el('div', 'nores', msg); m.style.flexBasis = '100%'; m.style.position = 'relative'; m.style.top = '0'; m.style.marginBottom = '24px'; rg.appendChild(m); }
        posts.forEach(function (p, i) {
          var cell = ui.cell(p);
          var year = p.info && p.info.year;
          cell.appendChild(el('div', 'search-result-meta', (year ? year + ' · ' : '') + ui.typeLabel(p, false)));
          cell.card.onclick = function () { N.go('details', { id: p.id }); };
          resultCards.push(cell.card);
          cell.card.onnav = function (dir) {
            return ui.gridNav(resultCards, i, resultCols, dir, function (edge) {
              if (edge === 'left' || edge === 'right') {
                if (ui.step(edge) < 0) return returnKey();
              }
              return true;
            });
          };
          cell.card.onfocus2 = function () {
            var lo = Math.max(0, i - 4), hi = Math.min(rg.children.length, i + 12);
            for (var k = lo; k < hi; k++) { var cc = rg.children[k].card; if (cc) ui.load(cc); }
          };
          rg.appendChild(cell);
        });
        for (var k = 0; k < rg.children.length && k < 12; k++) if (rg.children[k].card) ui.load(rg.children[k].card);
        rw.style.transition = 'none'; rw._ty = null; rw.style.transform = ''; void rw.offsetWidth; rw.style.transition = '';
        rg.classList.remove('sw');
        if (restoreId != null) {
          var previous = resultCards.filter(function (card) { return String(card._post.id) === String(restoreId); })[0];
          restoreId = null;
          if (previous && panel.contains(N.nav.cur)) N.nav.focus(previous);
        } else if (restoreIndex >= 0) N.nav.focus(resultCards[Math.min(restoreIndex, resultCards.length - 1)] || grid.firstChild);
      }
    }
    function popular(msg, generation) {
      var my = generation === undefined ? seq : generation;
      N.getHome().then(function (h) {
        if (dead || my !== seq) return;
        var ps = listed((h.suggested && h.suggested.posts) || (h.movies && h.movies.posts));
        show(ps.slice(0, 15), N.t('popularNow'), msg);
      }).catch(function () {
        if (!dead && my === seq) show([], N.t('topResults'), msg || N.t('error'));
      });
    }
    function run() {
      var qq = q.trim(); var my = ++seq;
      if (!qq) { popular('', my); return; }
      N.api.get('search', { query: qq, streamonly: 0, page: 1 }).then(function (r) {
        if (dead || my !== seq) return;
        var posts = listed(r.posts), query = qq.toLowerCase();
        if (!posts.length) { popular(N.t('nothingFor') + ' “' + qq + '”', my); return; }
        function exact(post) {
          var title = post.title || {};
          return [title.english, title.local].some(function (name) { return typeof name === 'string' && name.trim().toLowerCase() === query; });
        }
        posts = posts.filter(exact).concat(posts.filter(function (post) { return !exact(post); }));
        show(posts, N.t('topResults'), '');
      }).catch(function (e) { if (!dead && my === seq) popular(N.t('error') + '. ' + N.t('tryAgain'), my); });
    }
    layout(); paintQuery(); run();
    N.nav.focus(grid.firstChild, true);
    return {
      focusState: function () { return { query: q, kbLang: kbLang, keyboardIndex: Array.prototype.indexOf.call(panel.querySelectorAll('.key'), returnKey()), resultId: N.nav.cur && N.nav.cur._post && N.nav.cur._post.id }; },
      destroy: function () { dead = true; clearTimeout(timer); clearTimeout(swT); document.removeEventListener('keydown', onKeyDown); }
    };
  };

  /* ================= Archive ================= */
  var menuCache = null;
  S.archive = function (root, params, restore) {
    if (params && params.slug) return archiveList(root, params, restore);
    var dead = false, entries = [];
    root.classList.add('archive'); N.stage.dim(0.72);
    var box = el('div', 'arch'); root.appendChild(box);
    box.reveal = function (e) { var ty = ui.vscroll(box, e, 260); box.classList.toggle('scrolled', ty < 0); };
    var sk = el('div', 'msg', N.t('loading')); sk.style.cssText = 'position:absolute;top:300px;left:184px'; root.appendChild(sk);
    function show(m) {
      if (dead) return; root.removeChild(sk);
      box.appendChild(el('div', 'ah head', N.t('archive')));
      box.appendChild(el('div', 'arch-sub head', N.lang === 'fa' ? 'داستان بعدی‌تان را پیدا کنید.' : 'Find your next great story.'));
      var cats = el('div', 'cats'); box.appendChild(cats);
      (m.categories || []).forEach(function (c) {
        var button = ui.pill(c.name, function () { N.go('archive', { slug: c.slug, name: c.name }); }, false);
        var icon = ui.icon(/series|tv/.test(c.slug) ? 'series' : /anime/.test(c.slug) ? 'anime' : 'movies');
        icon.setAttribute('aria-hidden', 'true'); button.insertBefore(icon, button.firstChild); cats.appendChild(button); entries.push(button);
      });
      [['movies', 'movie', 'trendingMovies'], ['series', 'tv', 'trendingSeries']].forEach(function (section) {
        var button = ui.pill(N.t(section[2]), function () {
          N.go('archive', { slug: section[0], trending: section[1], name: N.t(section[2]) });
        }, false);
        var icon = ui.icon('anime'); icon.setAttribute('aria-hidden', 'true');
        button.insertBefore(icon, button.firstChild); cats.appendChild(button); entries.push(button);
      });
      box.appendChild(el('div', 'sec-h', N.t('genres')));
      var tiles = el('div', 'tiles'); box.appendChild(tiles);
      var all = [];
      (m.genres || []).forEach(function (g, i) {
        var im = g.image || {}, u = (im.webp && (im.webp.full || im.webp.thumb)) || (im.jpg && (im.jpg.full || im.jpg.thumb)) || '';
        var c = ui.card({ id: g.id, title: { english: g.name } }, 'tile', { image: u, name: g.name, count: g.count });
        c.style.setProperty('--genre-tint', ['#604756','#3a5964','#655743','#454f72','#3b605a','#575074','#59664a','#644852'][i % 8]);
        var count = c.querySelector('.tc'); if (count && g.count !== undefined) count.textContent = g.count + ' ' + (N.lang === 'fa' ? 'عنوان' : (Number(g.count) === 1 ? 'title' : 'titles'));
        var more = el('span', 'tile-open'); more.setAttribute('aria-hidden','true'); more.appendChild(ui.icon('back')); c.appendChild(more);
        c.onclick = function () { N.go('archive', { slug: g.slug, name: g.name }); };
        c.onfocus2 = function () { for (var k = Math.max(0, i - 4); k < Math.min(all.length, i + 12); k++) ui.load(all[k]); };
        tiles.appendChild(c); all.push(c); entries.push(c); if (i < 8) ui.load(c);
      });
      N.nav.focus(entries[restore && restore.entry] || entries[0], true);
    }
    if (menuCache) show(menuCache);
    else N.api.get('menu').then(function (m) { menuCache = m; show(m); }).catch(function (e) { if (!dead) errorView(root, e, function () { N.go('archive', {}, { replace: true }); }); });
    return { destroy: function () { dead = true; }, focusState: function () { return { entry: entries.indexOf(N.nav.cur) }; } };
  };

  // Brief, bounded in-memory catalogue cache, isolated by session and filters.
  var archivePages = {}, archivePageKeys = [], ARCHIVE_TTL = 90000;
  function rememberArchive(key, source, result) {
    archivePages[key] = {time:Date.now(),session:N.session,source:source,result:result};
    var i = archivePageKeys.indexOf(key); if (i >= 0) archivePageKeys.splice(i, 1);
    archivePageKeys.push(key);
    while (archivePageKeys.length > 24) delete archivePages[archivePageKeys.shift()];
  }
  var SORTS = [['update', 'updated'], ['favorite', 'popular']];
  function archiveList(root, params, restore) {
    var trending = params.trending, weeklyPosts = null;
    var availableSorts = trending ? [] : SORTS;
    var sortKey = 'archiveSort.' + params.slug, yearKey = 'archiveYear.' + (trending ? 'trending.' : '') + params.slug;
    var year = String((restore && restore.year) || N.store.get(yearKey, '')), yearMenu = null;
    if (!/^\d{4}$/.test(year)) year = '';
    var dead = false, page = 1, pages = 1, loading = false, failedPage = 0, cells = [], seen = {}, skels = [], sort = (restore && restore.sort) || N.store.get(sortKey, 'update'), wantIdx = restore && restore.idx || 0, restoring = !!(restore && restore.idx > 0), gen = 0, COLS = 7;
    if (sort === 'year' || sort === 'date' || sort === 'digital') { sort = 'update'; N.store.set(sortKey, sort); }
    if (trending) sort = 'favorite';
    else if (!availableSorts.some(function (s) { return s[0] === sort; })) sort = 'update';
    root.classList.add('archive', 'gridpage'); N.stage.dim(0.72);
    var box = el('div', 'arch'); root.appendChild(box);
    var head = el('div', 'head ah'); head.textContent = params.name || params.slug; box.appendChild(head);
    var subtitle = el('div', 'arch-sub head', trending ? N.t('tmdbWeekly') : (N.lang === 'fa' ? 'مجموعه را کشف کنید.' : 'Explore the collection.'));
    box.appendChild(subtitle);
    var sorts = el('div', 'sorts head'); box.appendChild(sorts);
    var filters = el('div', 'archive-filters head'); box.appendChild(filters);
    var yearButton = ui.pill('', openYears, false); yearButton.classList.add('year-filter'); sorts.appendChild(yearButton);
    yearButton.setAttribute('aria-haspopup', 'listbox');
    if (trending) yearButton.disabled = true;
    yearButton.onnav = function (dir) { if (dir === 'down') return cells[0] ? cells[0].card : true; if (dir === 'up') return true; return false; };
    function closeYears(focus) {
      if (!yearMenu) return false; N.nav.popScope(); root.removeChild(yearMenu); yearMenu = null; yearButton.setAttribute('aria-expanded', 'false');
      if (focus) N.nav.focus(yearButton, true); return true;
    }
    function openYears() {
      if (yearMenu) return;
      yearMenu = el('div', 'year-menu');
      yearMenu.style.left = Math.max(96, Math.min(1524, sorts.offsetLeft + yearButton.offsetLeft)) + 'px';
      yearMenu.style.right = 'auto'; yearMenu.setAttribute('role', 'listbox'); root.appendChild(yearMenu);
      var values = [''];
      if (trending) {
        weeklyPosts.forEach(function (post) {
          var value = releaseYear(post);
          if (/^\d{4}$/.test(value) && values.indexOf(value) < 0) values.push(value);
        });
        values = [''].concat(values.slice(1).sort(function (a, b) { return Number(b) - Number(a); }));
      } else for (var y = new Date().getFullYear(); y >= 1888; y--) values.push(String(y));
      var buttons = values.map(function (v, i) {
        var b = ui.pill(v || N.t('allYears'), function () {
          closeYears(true); if (year === v) return; year = v; N.store.set(yearKey, year); paint(); reset();
        }, year === v);
        b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(year === v));
        b.onnav = function (dir) { if (dir === 'up') return buttons[Math.max(0, i - 1)]; if (dir === 'down') return buttons[Math.min(buttons.length - 1, i + 1)]; return true; };
        yearMenu.appendChild(b); return b;
      });
      yearMenu.reveal = function (e) { var top = e.offsetTop, bottom = top + e.offsetHeight; if (top < yearMenu.scrollTop) yearMenu.scrollTop = top; else if (bottom > yearMenu.scrollTop + yearMenu.clientHeight) yearMenu.scrollTop = bottom - yearMenu.clientHeight; };
      yearButton.setAttribute('aria-expanded', 'true'); N.nav.pushScope(yearMenu); N.nav.focus(buttons[Math.max(0, values.indexOf(year))]);
    }
    var grid = el('div', 'ggrid'); box.appendChild(grid);
    box.reveal = function (e) {
      var idx=e._gridIndex,ty;
      if(idx!==undefined){ty=-Math.max(0,250+Math.floor(idx/COLS)*386-260);if(box._ty!==ty){box._ty=ty;box.style.transform='translateY('+ty+'px)';}}
      else ty=ui.vscroll(box,e._cell||e,260);
      box.classList.toggle('scrolled',ty<0);
    };
    var viewport=ui.windowGrid(grid,box,{cols:COLS,pitch:386,column:232,top:250,height:1080,create:function(idx){
      var p=cells[idx].post,cell=ui.cell(p),c=cell.card;
      var release = releaseYear(p);
      cell.appendChild(el('div', 'archive-meta', (release ? release + ' · ' : '') + ui.typeLabel(p, false)));
      c.onclick=function(){N.go('details',{id:p.id});};
      c.onnav=function(dir){
        if(dir==='down'&&older.style.display!=='none'&&Math.floor(idx/COLS)===Math.floor((cells.length-1)/COLS))return older;
        return ui.gridNav({length:cells.length,_at:viewport.at},idx,COLS,dir,function(edge){if(edge==='up')return sorts.firstChild;if((edge==='left'||edge==='right')&&ui.step(edge)<0)N.rail.enter();return true;});
      };
      c.onfocus2=function(){viewport.focus(idx);if(Math.floor(idx/COLS)>=Math.ceil(cells.length/COLS)-2&&page<pages&&!loading&&!failedPage){page++;load();}};
      return cell;
    }});
    availableSorts.forEach(function (s) {
      var p = ui.pill(N.t(s[1]), function () { if (sort === s[0]) return; sort = s[0]; N.store.set(sortKey, sort); paint(); reset(); }, sort === s[0]); p._k = s[0]; sorts.appendChild(p);
      p.onnav = function (dir) { if (dir === 'down') return cells[0] ? cells[0].card : true; if (dir === 'up') return true; return false; };
    });
    var older = ui.pill(N.t('olderReleases'), function () { if (loading || (!failedPage && page >= pages)) return; page = failedPage || page + 1; failedPage = 0; load(); }, false);
    older.classList.add('archive-more'); older.style.display = 'none'; filters.appendChild(older);
    older.onnav = function (dir) { if (dir === 'down') return cells.length ? cells[cells.length - 1].card : true; if (dir === 'up') return true; return false; };
    function paint() {
      yearButton.textContent = N.t('year') + ': ' + (year || N.t('allYears')) + ' ▾';
      older.textContent = N.t('loadMore');
      for (var i = 0; i < sorts.children.length; i++) sorts.children[i].classList.toggle('cur', sorts.children[i]._k === sort);
    }
    paint();
    function addSkels(n) { for (var i = 0; i < n; i++) { var c = el('div', 'gcell'); c.appendChild(ui.skelCard('grid')); skels.push(c); grid.appendChild(c); } }
    function clearSkels() { skels.forEach(function (s) { if (s.parentNode) s.parentNode.removeChild(s); }); skels = []; }
    function reset() {
      gen++; loading = false; failedPage = 0; page = 1; pages = 1; older.style.display = 'none'; viewport.clear(); clearSkels(); var messages=grid.querySelectorAll('.msg'); for(var m=0;m<messages.length;m++)messages[m].remove(); cells = []; seen = {}; skels = []; box.style.transition = 'none'; box._ty = null; box.style.transform = ''; void box.offsetWidth; box.style.transition = ''; box.classList.remove('scrolled');
      wantIdx = 0; restoring = false; load();
    }
    function releaseYear(post) { return String(post._trendYear || (post.info && post.info.year) || ''); }
    function appendPosts(posts) {
      var first=cells.length===0, previousCount=cells.length, fromMore=N.nav.cur===older;
      posts.forEach(function(p){
        var key=String(p.id);if(seen[key])return;seen[key]=true;var idx=cells.length,model={post:p};
        Object.defineProperty(model,'card',{get:function(){return viewport.at(idx);}});cells.push(model);
      });
      viewport.setCount(cells.length);
      if(fromMore && cells.length > previousCount) N.nav.focus(cells[previousCount].card);
      if(first&&cells.length&&!restoring&&!yearMenu && !(trending && N.nav.cur === yearButton)) N.nav.focus(cells[0].card,true);
    }
    function load(scanned) {
      scanned = scanned || 0;
      if (loading) return; loading = true; var my = gen; addSkels(page === 1 ? 14 : 7);
      older.disabled = true; older.textContent = N.t('loading');
      var cacheKey = [N.lang, params.slug, sort, year, page].join('|');
      var source = N.api.get, requestSession = N.session;
      var cached = archivePages[cacheKey];
      var hit = cached && cached.session === N.session && cached.source === source && Date.now() - cached.time < ARCHIVE_TTL;
      function catalogRequest() {
        return hit ? Promise.resolve(cached.result) :
          N.api.get('archive', { slugs: params.slug, streamonly: 1, page: page, orderby: sort, order: 'desc' });
      }
      var request;
      if (!trending) request = catalogRequest();
      else if (weeklyPosts) request = Promise.resolve({ posts: weeklyPosts, pages: 1 });
      else if (!N.tmdb.enabled()) request = Promise.reject(new Error('TMDB disabled'));
      else request = N.tmdb.weeklyTrending(trending, function () { return !dead && my === gen; });
      request.then(function (r) {
        if (dead || my !== gen) return;
        if (trending) {
          weeklyPosts = listed(r.posts);
          yearButton.disabled = !weeklyPosts.length;
          if (year && !weeklyPosts.some(function (post) { return releaseYear(post) === year; })) {
            year = ''; N.store.del(yearKey); paint();
          }
        } else if (!hit && N.session === requestSession && r && r.posts) rememberArchive(cacheKey, source, r);
        loading = false; clearSkels(); older.disabled = false; older.textContent = N.t('loadMore');
        var posts = listed(r.posts).filter(function (p) { return !year || releaseYear(p) === year; });
        older.style.display = !posts.length && page < r.pages ? '' : 'none';
        var empty = grid.querySelector('.digital-empty'); if (empty) grid.removeChild(empty);
        var first = cells.length === 0;
        pages = r.pages || 1;
        if (!posts.length && page < pages && scanned < 2) { page++; load(scanned + 1); return; }
        appendPosts(posts);
        if (!posts.length) {
          var message = el('div', 'digital-empty msg', N.t(trending ? 'tmdbNoMatches' : 'noMatches')); grid.appendChild(message);
          if (page < pages) N.nav.focus(older, true);
        }

        if (first && !cells.length && !restoring && !yearMenu) N.nav.focus(cells[0] ? cells[0].card : (older.style.display !== 'none' ? older : sorts.firstChild), true);
        if (restoring) {
          if (wantIdx < cells.length) { restoring = false; instant(root, function () { N.nav.focus(cells[wantIdx].card); }); }
          else if (page < pages) { page++; load(); } else { restoring = false; N.nav.focus(cells[0] ? cells[0].card : sorts.firstChild, true); }
        }
        if (!restoring && !loading && page < pages && N.nav.cur && grid.contains(N.nav.cur)) {
          var at = N.nav.cur._gridIndex;
          if (at >= 0 && Math.floor(at / COLS) >= Math.ceil(cells.length / COLS) - 2) { page++; load(); }
        }
      }).catch(function (e) { if (!dead && my === gen) { loading = false; clearSkels(); older.disabled = false; if (!cells.length) { var notice = el('div', 'archive-error msg', trending ? N.t(N.tmdb.enabled() ? 'tmdbTrendError' : 'tmdbTrendSetup') : N.t('error') + '. ' + N.t('tryAgain')); grid.appendChild(notice); var retry = ui.pill(N.t('retry'), function () { if (notice.parentNode) grid.removeChild(notice); reset(); }, false); notice.appendChild(retry); N.nav.focus(retry, true); } else { failedPage = page; older.textContent = N.t('retry'); older.style.display = ''; N.toast(N.t('error') + '. ' + N.t('tryAgain')); } } });
    }
    load();
    return {
      destroy: function () { dead = true; closeYears(false); viewport.destroy(); },
      back: function () { return closeYears(true); },
      focusState: function () { if (N.nav.cur && N.nav.cur._gridIndex !== undefined) return { idx: N.nav.cur._gridIndex, sort: sort, year: year }; return { sort: sort, year: year }; }
    };
  }

  /* ================= Settings ================= */
  S.settings = function (root, params, restore) {
    var dead = false, sec = (restore && restore.sec) || (params && params.section) || 'account', swT = null, secs = ['account', 'language', 'playback', 'display', 'about'];
    root.classList.add('set'); N.stage.dim(0.72);
    root.appendChild(el('div', 'h-xl t', N.t('account')));
    var list = el('div', 'slist'), pane = el('div', 'spane'); root.appendChild(list); root.appendChild(pane);
    var rows = {};
    function fmtExpire(value) {
      function format(v, depth) {
        if (v === undefined || v === null || v === '' || depth > 4) return null;
        if (typeof v === 'object') {
          var keys = ['expires_at', 'expire_at', 'expiry_date', 'expire_date', 'expiration_date', 'date', 'timestamp', 'unix', 'gregorian', 'value', 'raw'];
          for (var i = 0; i < keys.length; i++) {
            if (v[keys[i]] !== undefined) { var found = format(v[keys[i]], depth + 1); if (found) return found; }
          }
          // Some API versions wrap the date under a localized or nested key.
          var names = Object.keys(v);
          for (var j = 0; j < names.length; j++) {
            var x = v[names[j]];
            if (x && (typeof x === 'object' || (typeof x === 'string' && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(x)))) {
              var date = format(x, depth + 1); if (date) return date;
            }
          }
          return null;
        }
        if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) {
          var n = Number(v); if (!isFinite(n)) return null; if (n < 1e11) n *= 1000;
          var d = new Date(n); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        }
        if (typeof v !== 'string') return null;
        var m = /^(\d{4}[-/]\d{2}[-/]\d{2})/.exec(v);
        return m ? m[1] : v;
      }
      return format(value, 0) || N.t('unknown');
    }
    // option row. opts: values [{v,label}], get(), set(v)
    function opt(label, values, get, set) {
      var r = el('div', 'orow f fl'), v = el('div', 'v'), val = el('span', ''), hint = el('span', 'hint', '‹ ›');
      r.appendChild(el('span', '', label)); v.appendChild(hint); v.appendChild(val); r.appendChild(v);
      function paintV() { var cur = get(); for (var i = 0; i < values.length; i++) if (values[i].v === cur) { val.textContent = values[i].label; return i; } val.textContent = values[0].label; return 0; }
      function cycle(d) { var i = paintV(); i = (i + d + values.length) % values.length; set(values[i].v); paintV(); }
      paintV(); r.onenter = r.onclick = function () { cycle(1); };
      r.onnav = function (dir) { if (dir === 'left' || dir === 'right') { cycle(ui.step(dir)); return true; } return false; };
      return r;
    }
    function info(label, value) { var r = el('div', 'orow nof'); r.appendChild(el('span', '', label)); r.appendChild(el('div', 'v', value)); return r; }
    function action(label, fn, danger) { var r = el('div', 'orow f fl' + (danger ? ' danger' : '')); r.appendChild(el('span', '', label)); r.onclick = r.onenter = fn; return r; }
    var onOff = [{ v: true, label: N.t('on') }, { v: false, label: N.t('off') }];
    var builders = {
      account: function (p) {
        var u = N.session && N.session.user;
        p.appendChild(info(N.t('account'), u ? (u.user_name || u.user_email || 'user') : N.t('guestAcc')));
        if (u) {
          p.appendChild(info(N.t('userType'), u.user_type !== undefined ? String(u.user_type) : '-'));
          p.appendChild(info(N.t('expires'), fmtExpire(u.user_expire)));
          p.appendChild(action(N.t('logout'), function () {
            N.confirm({ title: N.t('logoutTitle'), body: N.t('logoutBody'), ok: N.t('logout'), danger: true, onOk: function () { N.logout(); } });
          }, true));
        } else p.appendChild(action(N.t('login'), function () { N.go('login', {}, { reset: true }); }));
      },
      language: function (p) {
        p.appendChild(opt(N.t('language'), [{ v: 'en', label: 'English' }, { v: 'fa', label: 'فارسی' }], function () { return N.lang; }, function (v) {
          N.setLang(v); N.dropHome(); N.rail.build();
          var idx = 0; for (var i = 0; i < pane.children.length; i++) if (pane.children[i] === N.nav.cur) idx = i;
          N.rerender();
        }));
      },
      playback: function (p) {
        p.appendChild(opt(N.t('defSubs'), [{ v: 'off', label: N.t('off') }, { v: 'fa', label: N.t('persian') }, { v: 'en', label: N.t('english') }],
          function () { return N.store.get('sub', 'off'); }, function (v) { N.store.set('sub', v); }));
        var sample = el('div', 'subsample', N.t('sample')); sample.style.fontSize = N.store.get('subSize', 46) + 'px';
        p.appendChild(opt(N.t('subSize'), [{ v: 38, label: N.t('small') }, { v: 46, label: N.t('medium') }, { v: 54, label: N.t('large') }],
          function () { return N.store.get('subSize', 46); }, function (v) { N.store.set('subSize', v); sample.style.fontSize = v + 'px'; }));
        p.appendChild(sample);
        p.appendChild(opt(N.t('autoplay'), onOff, function () { return N.store.get('autoplay', true); }, function (v) { N.store.set('autoplay', v); }));
      },
      display: function (p) {
        p.appendChild(opt(N.t('reduce'), onOff.slice().reverse().map(function (x) { return x; }), function () { return N.store.get('calm', false); }, function (v) {
          N.store.set('calm', v); document.body.classList.toggle('calm', v || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        }));
      },
      about: function (p) {
        p.appendChild(info('30nama TV', ''));
        p.appendChild(info(N.t('version'), N.config.version));
        p.appendChild(info(N.t('unofficial'), ''));
        p.appendChild(info(N.t('apiHost'), (N.api.host || '').replace(/^https?:\/\//, '').replace(/\/api.*$/, '')));
        p.appendChild(info(N.t('tmdb'), N.tmdb.mock() ? N.t('tmdbMock') : (N.tmdb.token() ? N.t('tmdbOn') : N.t('tmdbOff'))));
        if (N.tmdb.enabled()) {
          p.appendChild(action(N.t('clearCache'), function () { N.tmdb.clearCache(); N.toast(N.t('cleared')); }));
          p.appendChild(el('div', 'note', N.t('tmdbCredit')));
        }
      }
    };
    function showPane(s, now) {
      if (s === sec && pane.firstChild) return; sec = s;
      for (var k in rows) rows[k].classList.toggle('cur', k === s);
      clearTimeout(swT);
      function paintP() { pane.innerHTML = ''; builders[s](pane); pane.classList.remove('sw'); }
      if (now || document.body.classList.contains('calm')) paintP();
      else { pane.classList.add('sw'); swT = setTimeout(function () { if (!dead) paintP(); }, 110); }
    }
    secs.forEach(function (s) {
      var r = el('button', 'srow f fl' + (s === sec ? ' cur' : ''), N.t(s === 'account' ? 'account' : s)); rows[s] = r;
      r.onfocus2 = function () { showPane(s); };
      r.onnav = function (dir) { if (dir === 'right' || dir === 'left') { if (ui.step(dir) > 0) { if (swT) { clearTimeout(swT); swT = null; pane.innerHTML = ''; builders[sec](pane); pane.classList.remove('sw'); } var f = pane.querySelector('.f'); return f || true; } return false; } return false; };
      list.appendChild(r);
    });
    showPane(sec, true);
    var restoreIdx = restore && restore.idx;
    if (restoreIdx !== undefined && restoreIdx !== null && pane.children[restoreIdx] && pane.children[restoreIdx].classList.contains('f')) N.nav.focus(pane.children[restoreIdx], true);
    else N.nav.focus(rows[sec], true);
    return {
      destroy: function () { dead = true; clearTimeout(swT); },
      back: function () {
        if (N.nav.cur && pane.contains(N.nav.cur)) { N.nav.focus(rows[sec], true); return true; }
        return false;
      },
      focusState: function () {
        var idx = null; if (N.nav.cur && pane.contains(N.nav.cur)) for (var i = 0; i < pane.children.length; i++) if (pane.children[i] === N.nav.cur) idx = i;
        return { sec: sec, idx: idx };
      }
    };
  };
})();
