/* Stage: one persistent full-bleed backdrop behind every screen. Two image layers crossfade. */
(function () {
  var S = N.stage = {};
  var layers = null, stageEl = null, dimEl = null, cur = -1, curSrc = null, curId = null;
  var dissolveUntil = 0;
  var cancelArt = null, timer = null, loadTimer = null, token = 0, cleanT = [null, null];

  function init() {
    if (layers) return;
    stageEl = N.$('stage'); dimEl = stageEl.querySelector('.stage-dim');
    layers = [stageEl.querySelector('.bd.a'), stageEl.querySelector('.bd.b')];
  }
  S.info = function (post) {
    var cover = post && post.image && post.image.cover;
    var c = cover && (cover.webp || cover.jpg);
    if (post && post._bd && (post._bdPref || !c)) return { src: post._bd, bleed: false, id: post.id };
    if (c) return { src: c, bleed: false, id: post.id };
    var po = post && post.image && post.image.poster, p = po && ((po.webp && (po.webp.medium || po.webp.large)) || (po.jpg && (po.jpg.medium || po.jpg.large)));
    if (p) return { src: p, bleed: true, id: post.id };
    return null;
  };
  S.currentId = function () { return curId; };

  function swap(info, done) {
    init();
    var my = ++token, next = cur === 0 ? 1 : 0, L = layers[next], old = cur >= 0 ? layers[cur] : null;
    clearTimeout(loadTimer);
    clearTimeout(cleanT[next]);
    L.classList.remove('on', 'out'); L.className = 'bd';
    // Commit the hidden state even when the next backdrop is already cached.
    void L.offsetWidth;
    var finished = false;
    function show() {
      if (finished || my !== token) return; finished = true;
      // Place the incoming full backdrop above the old one so the stage never dims
      // between two opaque images. Both stay beneath the scrims.
      var dissolve = old && stageEl.classList.contains('home-stage') && !info.bleed && !old.classList.contains('bleed');
      if (dissolve) {
        stageEl.insertBefore(L, old.nextSibling);
        dissolveUntil = Date.now() + 480;
      }
      L.className = 'bd' + (info.bleed ? ' bleed' : '') + ' kb' + (info.id % 4) + ' on';
      stageEl.classList.toggle('has-bleed', !!info.bleed);
      if (old) {
        if (dissolve) old.classList.add('underlay');
        else { old.classList.remove('on'); old.classList.add('out'); }
        (function (o, idx) { cleanT[idx] = setTimeout(function () { if (cur !== idx) { o.removeAttribute('src'); o.className = 'bd'; } }, 900); })(old, cur);
      }
      cur = next; curSrc = info.src; curId = info.id;
      if (done) done(true);
    }
    L.onload = L.onerror = null;
    if(cancelArt)cancelArt();
    L.src = info.src;
    if(N.ui&&N.ui.artwork)cancelArt=N.ui.artwork(info.src,-1,function(){});
    function fail() {
      if (finished || my !== token) return;
      finished = true; clearTimeout(loadTimer);
      if (done) done(false);
    }
    loadTimer = setTimeout(fail, 2500);
    var go = function () { if (my !== token) return; clearTimeout(loadTimer); show(); };
    L.onerror = fail;
    if (L.decode) L.decode().then(go, fail); else if (L.complete && L.naturalWidth) go(); else L.onload = go;
  }

  // opts: immediate (no debounce), done(ok)
  S.show = function (post, opts) {
    opts = opts || {}; init();
    var info = S.info(post); S.cancel();
    if (!info) { if (opts.done) opts.done(false); return; }
    if (info.src === curSrc) { token++; if (opts.done) opts.done(true); return; }
    if (opts.immediate) {
      // Reuse the old layer only after the current dissolve has settled.
      var wait = stageEl.classList.contains('home-stage') && !document.body.classList.contains('calm') ? dissolveUntil - Date.now() : 0;
      if (wait > 0) timer = setTimeout(function () { swap(info, opts.done); }, wait);
      else swap(info, opts.done);
      return;
    }
    function go() { if (N.nav.isFast()) { timer = setTimeout(go, 120); return; } swap(info, opts.done); }
    timer = setTimeout(go, 350);
  };
  S.cancel = function () {
    clearTimeout(timer); clearTimeout(loadTimer); token++;
    if (cancelArt) { cancelArt(); cancelArt = null; }
  };
  S.dim = function (level) { init(); dimEl.style.opacity = level; };
  S.details = function (on) { init(); stageEl.classList.toggle('details', !!on); };
  S.hide = function () { init(); stageEl.style.display = 'none'; };
  S.restore = function () { init(); stageEl.style.display = ''; };
})();
