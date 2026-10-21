/* Client for the background takeover service (service/takeover.js) on 127.0.0.1:8097. */
(function () {
  var BASE = 'http://127.0.0.1:8097';
  var PKG = 'Nama30TvAp';
  var tk = N.takeover = {};

  function unsupported() {
    var p = location.pathname || '';
    return !window.tizen || p.indexOf('/module/') === 0 || String(location.port) === '8081';
  }

  function req(method, path, body, cb) {
    var done = false, x = new XMLHttpRequest();
    function fin(err, data) { if (done) return; done = true; if (cb) cb(err, data); }
    try {
      x.open(method, BASE + path, true);
      x.timeout = 2500;
      x.onload = function () {
        if (x.status >= 200 && x.status < 300) {
          try { fin(null, JSON.parse(x.responseText)); } catch (e) { fin(e); }
        } else fin(new Error('http ' + x.status));
      };
      x.onerror = function () { fin(new Error('network')); };
      x.ontimeout = function () { fin(new Error('timeout')); };
      if (body) x.setRequestHeader('Content-Type', 'application/json');
      x.send(body ? JSON.stringify(body) : null);
    } catch (e) { fin(e); }
  }

  tk.state = function (cb) { req('GET', '/state', null, cb); };
  tk.setConfig = function (partial, cb) { req('POST', '/config', partial || {}, cb); };

  function packageId() {
    try { return tizen.application.getCurrentApplication().appInfo.packageId || PKG; } catch (e) { return PKG; }
  }

  tk.ensureService = function (cb) {
    cb = cb || function () {};
    if (unsupported()) return cb(new Error('unsupported'));
    tk.state(function (err, st) {
      if (!err) return cb(null, st);
      try {
        tizen.application.launchAppControl(
          new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/service'),
          packageId() + '.TakeoverService',
          function () {}, function () {});
      } catch (e) { return cb(e); }
      var tries = 0;
      (function retry() {
        setTimeout(function () {
          tk.state(function (e2, s2) {
            if (!e2) return cb(null, s2);
            if (++tries >= 5) return cb(e2);
            retry();
          });
        }, 500);
      })();
    });
  };
})();
