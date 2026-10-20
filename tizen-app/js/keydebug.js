/* Hidden remote-key inspector. Open: press the Red button 3x within 2s (or load with #keys).
   Lists tizen.tvinputdevice.getSupportedKeys() and shows keyCode / key / code of every press.
   Close: press Back twice within 1s. */
(function () {
  var box = null, reg = [], redAt = [], backAt = 0, lastEl, histEl;

  function el(tag, css, txt) { var d = document.createElement(tag); d.style.cssText = css || ''; if (txt != null) d.textContent = txt; return d; }

  function supported() {
    try { if (window.tizen && tizen.tvinputdevice) return tizen.tvinputdevice.getSupportedKeys() || []; } catch (e) {}
    return [];
  }

  function open() {
    if (box) return;
    box = el('div', 'position:fixed;left:0;top:0;width:1920px;height:1080px;z-index:9999;background:#0b0b10;color:#eee;font:28px/1.4 monospace;padding:40px 60px;box-sizing:border-box;overflow:hidden');
    box.appendChild(el('div', 'font-size:40px;color:#ffb347', 'Key inspector - press any remote button. Back twice quickly to close.'));
    lastEl = el('div', 'margin:24px 0;padding:20px;background:#1c1c28;font-size:44px;min-height:70px', '(waiting for a key)');
    box.appendChild(lastEl);
    histEl = el('div', 'height:200px;overflow:hidden;color:#9ad;font-size:24px');
    box.appendChild(histEl);
    var keys = supported(), list = el('div', 'margin-top:16px;font-size:22px;color:#aaa;column-count:4;column-gap:30px');
    box.appendChild(el('div', 'margin-top:12px;font-size:26px;color:#ffb347', 'getSupportedKeys(): ' + keys.length + (window.tizen ? '' : '  (tizen API unavailable)')));
    keys.forEach(function (k) {
      list.appendChild(el('div', '', k.name + '  ' + k.code));
      try { tizen.tvinputdevice.registerKey(k.name); reg.push(k.name); } catch (e) {}
    });
    box.appendChild(list);
    document.body.appendChild(box);
  }

  function close() {
    if (!box) return;
    reg.forEach(function (n) { try { tizen.tvinputdevice.unregisterKey(n); } catch (e) {} });
    // keep the keys the app itself relies on
    try { N.nav.registerKeys(); } catch (e) {}
    reg = []; box.parentNode.removeChild(box); box = null;
  }

  function show(e) {
    var s = 'keyCode=' + e.keyCode + '  key=' + e.key + '  code=' + e.code;
    lastEl.textContent = s;
    var line = el('div', '', new Date().toLocaleTimeString() + '  ' + s);
    histEl.insertBefore(line, histEl.firstChild);
    while (histEl.childNodes.length > 6) histEl.removeChild(histEl.lastChild);
  }

  document.addEventListener('keydown', function (e) {
    if (box) {
      e.preventDefault(); e.stopImmediatePropagation();
      show(e);
      if (e.keyCode === 10009 || e.keyCode === 27 || e.keyCode === 8) {
        var now = Date.now();
        if (now - backAt < 1000) close();
        backAt = now;
      }
      return;
    }
    if (e.keyCode === 403) {
      var t = Date.now();
      redAt.push(t); redAt = redAt.filter(function (x) { return t - x < 2000; });
      if (redAt.length >= 3) { redAt = []; open(); }
    }
  }, true);

  if (/#keys\b/.test(location.hash)) document.addEventListener('DOMContentLoaded', open);
})();
