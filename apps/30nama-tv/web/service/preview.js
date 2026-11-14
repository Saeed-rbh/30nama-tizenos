/* Samsung periodically runs this short-lived service, including while the UI is closed.
   Fetch public catalogue metadata only. Never load account sessions or stream URLs. */
var config = require('../js/config.js');
var data = require('../js/preview-data.js');
var https = require('https');
var running = false;
function exit() { tizen.application.getCurrentApplication().exit(); }
function request(host, key, slug, lang) {
  return new Promise(function (resolve, reject) {
    var body = 'slugs=' + slug + '&streamonly=1&page=1&orderby=update&order=desc';
    var options = require('url').parse(host + '/action/archive');
    options.method = 'POST'; options.headers = {
      'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body),
      'c-api-key': key, 'c-token': '', 'c-version-number': config.version, 'c-language': lang
    };
    var req = https.request(options, function (res) {
      var text = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) { text += chunk; if (text.length > 2000000) req.destroy(new Error('Preview response too large')); });
      res.on('error', reject);
      res.on('end', function () {
        try {
          var j = JSON.parse(text);
          if (res.statusCode !== 200 || !j.success || !j.result || !Array.isArray(j.result.posts)) throw new Error('Catalogue unavailable');
          resolve(j.result.posts);
        } catch (e) { reject(e); }
      });
    });
    req.setTimeout(12000, function () { req.destroy(new Error('Preview timeout')); });
    req.on('error', reject); req.end(body);
  });
}
function run() {
  if (running) return; running = true;
  var watchdog = setTimeout(exit, 55000), lang = 'en', supplied = null;
  try {
    var control = tizen.application.getCurrentApplication().getRequestedAppControl();
    var fields = control && control.appControl && control.appControl.data || [];
    fields.forEach(function (field) {
      if (field.key === 'language' && field.value[0] === 'fa') lang = 'fa';
      if (control.callerAppId === 'Nama30Q82B.Nama30TV' && field.key === 'preview' && field.value[0].length < 100000) {
        var candidate = JSON.parse(field.value[0]);
        if (candidate && Array.isArray(candidate.sections) && candidate.sections.length && candidate.sections.every(function (s) {
          return Array.isArray(s.tiles) && s.tiles.length && s.tiles.length <= 12 && s.tiles.every(function (t) {
            return /^https:\/\//i.test(t.image_url) && !!data.parse(t.action_data);
          });
        })) supplied = candidate;
      }
    });
  } catch (e) {}
  function done() { clearTimeout(watchdog); exit(); }
  // Sequential requests and host failover keep background traffic small.
  function load(index) {
    if (index >= config.fallbackHosts.length) return Promise.reject(new Error('No catalogue host'));
    var host = config.fallbackHosts[index].host, key = config.apiKeys[0];
    return request(host, key, 'movies', lang).then(function (movies) {
      return request(host, key, 'series', lang).then(function (series) { return data.build(movies, series, lang); });
    }).catch(function () { return load(index + 1); });
  }
  (supplied ? Promise.resolve(supplied) : load(0)).then(function (preview) {
    if (!preview.sections.length) { done(); return; } // Preserve last good native preview on empty results.
    try { webapis.preview.setPreviewData(JSON.stringify(preview), done, done); } catch (e) { done(); }
  }, done);
}
module.exports.onStart = function () {};
module.exports.onRequest = run;
module.exports.onExit = function () {};
