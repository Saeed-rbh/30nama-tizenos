/* Hidden direct-file playback probe. Open: type 2160 on the remote's number keys within 3s (or load with #direct).
   Plays a 30nama download link (mkv) through the normal player, then shows the TV's UHD/HDR support
   and the file's tracks as AVPlay sees them. Test link is IP-bound and expires; replace when stale. */
(function () {
  var TEST_URL = 'https://eu-download-storage-11.divyacamilla.info/download/2/11/488086/805607/368104/77.160.240.42/1794835629/30131c9229d0503aaf0f7244c0d7294a5122f19efb716cda100f470287/movies/t/Turning_Red_2022_10bit_HDR_2160p_x265_BluRay_UHD_Tigole_30NAMA.mkv';
  var CODE = '2160', CODE2 = '3030', typed = '', typedAt = 0, box = null;

  function caps() {
    var out = [];
    function q(name, fn) { try { out.push(name + ': ' + fn()); } catch (e) { out.push(name + ': n/a'); } }
    q('UHD panel', function () { return webapis.productinfo.isUdPanelSupported(); });
    q('8K panel', function () { return webapis.productinfo.is8KPanelSupported(); });
    q('Model', function () { return webapis.productinfo.getRealModel(); });
    q('HDR', function () { return webapis.avinfo.isHdrTvSupport(); });
    return out;
  }
  function tracks() {
    var out = [];
    try {
      var info = webapis.avplay.getTotalTrackInfo();
      for (var i = 0; i < info.length; i++) out.push(info[i].type + ' #' + info[i].index + ' ' + info[i].extra_info);
    } catch (e) { out.push('tracks: ' + (e && e.message || e)); }
    try { out.push('duration: ' + Math.round(webapis.avplay.getDuration() / 1000) + 's'); } catch (e) {}
    return out;
  }
  function show(lines, ms) {
    if (!box) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:40px;top:40px;max-width:1500px;z-index:9999;background:rgba(0,0,0,.8);color:#9f9;font:22px/1.4 monospace;padding:20px;white-space:pre-wrap;word-break:break-all';
      document.body.appendChild(box);
    }
    box.textContent = lines.join('\n');
    clearTimeout(box.t); box.t = setTimeout(function () { box.remove(); box = null; }, ms || 20000);
  }
  function dump() { // last raw `download` response + extracted entries (open a details page first)
    var raw = 'none (open a title first)';
    try { if (N.lastDownload !== undefined) raw = JSON.stringify(N.lastDownload); } catch (e) { raw = 'unserializable'; }
    var ents = (N.lastDownloadEntries || []).map(function (x) { return x.label + ' | ' + x.url; });
    show(['download raw (' + String(raw).length + ' chars):', String(raw).slice(0, 3000), '', 'entries: ' + ents.length].concat(ents), 40000);
  }
  function run() {
    show(['Direct probe: opening...'].concat(caps()));
    N.player.start({ title: 'Direct probe' }, [{ file: { m3u8: TEST_URL }, info: { file_id: 'probe' } }], 0);
    var tries = 0, iv = setInterval(function () {
      if (++tries > 60) { clearInterval(iv); return; }
      if (!N.player.loading) { clearInterval(iv); show(['Direct probe: playing'].concat(caps(), tracks())); }
    }, 500);
  }

  try { for (var d = 0; d <= 9; d++) tizen.tvinputdevice.registerKey(String(d)); } catch (e) {}
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode >= 96 && e.keyCode <= 105 ? e.keyCode - 48 : e.keyCode; // numpad on desktop
    if (k < 48 || k > 57) return;
    var now = Date.now();
    if (now - typedAt > 3000) typed = '';
    typedAt = now; typed = (typed + String.fromCharCode(k)).slice(-4);
    if (typed === CODE) { typed = ''; run(); }
    else if (typed === CODE2) { typed = ''; dump(); }
  }, true);
  if (location.hash === '#direct') setTimeout(run, 3000);
})();
