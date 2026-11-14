/* API layer: endpoint discovery, RPC calls, session. */
(function () {
  var C = N.config;
  var api = N.api = { host: null, key: C.apiKeys[0], keyIndex: 0 };
  N.session = N.store.get('session', null); // {token, user}

  function timeout(p, ms, label) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout ' + (label || ''))); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function enc(params) {
    var out = [];
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k) && params[k] !== undefined && params[k] !== null)
      out.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return out.join('&');
  }
  api.raw = function (host, key, name, params, token, language, deadline) {
    // dev/test hook: tools-video/eps-test.js injects window.__mock = {action: fn(params) -> envelope}
    if (window.__mock && window.__mock[name]) return Promise.resolve(window.__mock[name](params || {}));
    var headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'c-api-key': key,
      'c-token': token || '',
      'c-version-number': C.version,
      'c-language': language || N.lang
    };
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var options = { method: 'POST', headers: headers, body: enc(params || {}) };
    if (controller) options.signal = controller.signal;
    var request = fetch(N.proxied(host + '/action/' + name), options).then(function (r) {
      var ra = parseFloat(r.headers && r.headers.get && r.headers.get('retry-after'));
      return r.text().then(function (txt) {
        // JSON error responses and proxy error pages follow the same HTTP backoff.
        if (r.status === 429 || r.status >= 500) {
          var error = new Error(r.status === 429 ? '429 rate limited' : '5xx from ' + name);
          error.status = r.status;
          error.retryAfter = isNaN(ra) ? 0 : Math.max(0, Math.min(ra, 10) * 1000);
          throw error;
        }
        // Observer acknowledges receipt with an empty response. The account history updates separately.
        if (name === 'observer' && (r.status === 200 || r.status === 204) && !txt.trim()) {
          return { success: true, result: null };
        }
        try { return JSON.parse(txt); }
        catch (e) { var er = new Error('bad json from ' + name);
          er.rateLimited = /error code:\s*1015/i.test(txt);
          throw er; }
      });
    });
    return timeout(request, deadline || 20000, name).catch(function (e) {
      if (controller) controller.abort();
      e.retry = true;
      throw e;
    });
  };

  /* ---------- global request scheduler ----------
     30nama sits behind Cloudflare rate limiting (HTTP 429 / HTML "error code: 1015"). All 30nama calls go through one queue: max 2 in flight,
     small spacing, core screen calls before background (TMDB resolution) calls, and transient failures (non-JSON, 429, 5xx, timeout) are retried with backoff. */
  var Q = { core: [], bg: [] }, inflight = 0, backgroundInflight = 0, MAXF = 2, GAPMS = 100, lastStart = 0, pausedUntil = 0, pumpT = null, BACKOFF = [1000, 3000];
  var NO_RETRY = { observer: 1, logout: 1, qrlogin_login: 1 };
  function pump() {
    if (pumpT || inflight >= MAXF || !(Q.core.length || Q.bg.length)) return;
    // Background matching may use one slot; keep the other free for navigation.
    if (!Q.core.length && backgroundInflight >= 1) return;
    var now = Date.now(), wait = Math.max(pausedUntil - now, lastStart + GAPMS - now, 0);
    if (wait > 0) { pumpT = setTimeout(function () { pumpT = null; pump(); }, wait); return; }
    var background = !Q.core.length;
    var j = background ? Q.bg.shift() : Q.core.shift();
    if (background) backgroundInflight++;
    inflight++; lastStart = now;
    function release() { inflight--; if (background) backgroundInflight--; }
    Promise.resolve().then(j.run).then(function (v) {
      release(); j.res(v); pump();
    }, function (e) {
      if (e && (e.status === 429 || e.rateLimited)) {
        pausedUntil = Math.max(pausedUntil, Date.now() + Math.max(BACKOFF[0], e.retryAfter || 0));
      }
      release(); j.rej(e); pump();
    });
    pump();
  }
  function schedule(bg, run) { return new Promise(function (res, rej) { (bg ? Q.bg : Q.core).push({ run: run, res: res, rej: rej }); pump(); }); }
  api.sched = function (name, params, opts) {
    var bg = !!(opts && opts.bg), tries = NO_RETRY[name] ? 0 : BACKOFF.length;
    var session = N.session, language = N.lang;
    function attempt(n) {
      return schedule(bg, function () {
        if (name === 'observer' && (!session || session !== N.session)) return null;
        if (name !== 'logout' && (session !== N.session || (name !== 'observer' && language !== N.lang))) throw new Error('Request context changed');
        return api.raw(api.host, api.key, name, params, session && session.token, language);
      }).catch(function (e) {
        if (n < tries && e && e.retry) {
          var d = Math.max(BACKOFF[n], e.retryAfter || 0);
          return new Promise(function (r) { setTimeout(r, d); }).then(function () { return attempt(n + 1); });
        }
        throw e;
      });
    }
    return attempt(0);
  };

  // Probe built-in and last-known endpoints while discovery is still running.
  api.init = function () {
    var cached = N.store.get('host', null), probes = Object.create(null);
    function probe(list) {
      var hosts = list.map(function (entry) { return entry && entry.host; }).filter(function (host, index, all) {
        return typeof host === 'string' && /^https:\/\//i.test(host) && all.indexOf(host) === index;
      });
      function firstKey(ki) {
        if (!hosts.length || ki >= C.apiKeys.length) return Promise.reject(new Error('no endpoint reachable'));
        var key = C.apiKeys[ki];
        return new Promise(function (resolve, reject) {
          var remaining = hosts.length;
          function miss() { if (--remaining === 0) reject(new Error('no endpoint accepted the key')); }
          hosts.forEach(function (host) {
            var id = ki + '|' + host;
            var request = probes[id] || (probes[id] = api.raw(host, key, 'test', {}, '', N.lang, 8000));
            request.then(function (j) {
              if (j && j.success) resolve({ host: host, key: key, ki: ki });
              else miss();
            }, miss);
          });
        }).catch(function () { return firstKey(ki + 1); });
      }
      return firstKey(0);
    }
    var known = cached ? [{ host: cached }].concat(C.fallbackHosts) : C.fallbackHosts;
    return new Promise(function (resolve, reject) {
      var remaining = C.discoveryUrls.length + 1, settled = false;
      function accept(result) { if (!settled) { settled = true; resolve(result); } }
      function miss() { if (--remaining === 0 && !settled) reject(new Error('no endpoint reachable')); }
      probe(known).then(accept, miss);
      C.discoveryUrls.forEach(function (url) {
        var request = fetch(N.proxied(url + '?t=' + Date.now())).then(function (response) {
          if (response.ok === false) throw new Error('Endpoint discovery failed');
          return response.json();
        });
        timeout(request, 6000, 'discovery').then(function (list) {
          if (settled) return;
          if (!Array.isArray(list) || !list.length) { miss(); return; }
          probe(list).then(accept, miss);
        }, miss);
      });
    }).then(function (r) {
      api.host = r.host; api.key = r.key; api.keyIndex = r.ki; N.store.set('host', r.host);
      return r;
    });
  };

  // Generic action. Resolves with envelope; rejects on network errors.
  api.call = function (name, params, opts) {
    var session = N.session, language = N.lang;
    return api.sched(name, params, opts).then(function (j) {
      if (name !== 'logout' && (session !== N.session || (name !== 'observer' && language !== N.lang))) {
        throw new Error('Request context changed');
      }
      if (j && !j.success && /login required/i.test(j.msg || '') && session && N.session === session) {
        // session invalid/expired
        N.logout(true);
      }
      return j;
    });
  };
  // Resolves with result or rejects with Error(msg)
  api.get = function (name, params, opts) {
    return api.call(name, params, opts).then(function (j) {
      if (!j || !j.success) { var e = new Error((j && j.msg) || 'error'); e.msg = j && j.msg; throw e; }
      return j.result;
    });
  };

  N.isLoggedIn = function () { return !!(N.session && N.session.token); };
  N.setSession = function (user) {
    N.session = { token: user.user_session, user: user };
    N.store.set('session', N.session);
  };
  N.logout = function (silent) {
    var p = N.isLoggedIn() ? api.call('logout', {}).catch(function () {}) : Promise.resolve();
    N.session = null; N.store.del('session');
    if (!silent && N.onLogout) N.onLogout();
    return p;
  };

  // helpers over post objects
  N.img = function (p, size) {
    var po = p && p.image && p.image.poster;
    if (!po) return '';
    return (po.jpg && (po.jpg[size || 'medium'] || po.jpg.large)) || (po.webp && po.webp.medium) || '';
  };
  N.cover = function (p) { var c = p && p.image && p.image.cover; return c ? (c.jpg || c.webp || '') : ''; };
  N.title = function (p) {
    var t = p.title || {};
    return (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local || '');
  };
  N.plot = function (p) { var t = p.plot || {}; return (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local || ''); };
})();
