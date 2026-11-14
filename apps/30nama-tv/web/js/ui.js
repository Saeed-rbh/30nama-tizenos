/* Shared UI helpers: icons, cards, meta line, track/scroll layout. */
(function () {
  var el = N.el, ui = N.ui = {};
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';

  ui.icon = function (name, cls) {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var u = document.createElementNS(NS, 'use'); u.setAttributeNS(XL, 'xlink:href', '#i-' + name); u.setAttribute('href', '#i-' + name);
    s.appendChild(u); return s;
  };
  ui.setIcon = function (svg, name) {
    var u = svg.firstChild; u.setAttributeNS(XL, 'xlink:href', '#i-' + name); u.setAttribute('href', '#i-' + name);
  };
  // Commit one title presentation per render; slow artwork must never replace visible text.
  ui.titleArtwork = function (target, text, source) {
    if (target._cancelTitle) target._cancelTitle();
    target.textContent = '';
    var label = el('span', 'tt', text), finished = false, timer;
    target.appendChild(label); target.setAttribute('aria-label', text);
    target.classList.remove('has-logo');
    target.classList.toggle('title-pending', !!source);
    target.classList.toggle('title-art', !!source);
    function finish(image) {
      if (finished) return; finished = true; clearTimeout(timer);
      target.classList.remove('title-pending');
      if (image) { target.appendChild(image); target.classList.add('has-logo'); image.classList.add('in'); }
    }
    target._cancelTitle = function () { finished = true; clearTimeout(timer); };
    if (!source) { finish(null); return; }
    timer = setTimeout(function () { finish(null); }, 900);
    Promise.resolve(source).then(function (url) {
      if (finished) return;
      if (!url) { finish(null); return; }
      var image = el('img', 'logo'); image.alt = ''; image.decoding = 'async';
      image.onerror = function () { finish(null); };
      image.onload = function () {
        if (image.decode) image.decode().then(function () { finish(image); }, function () { finish(null); });
        else finish(image);
      };
      image.src = url;
    }, function () { finish(null); });
  };
  ui.btn = function (text, fn, cls, icon) {
    var b = el('button', 'btn f fl' + (cls ? ' ' + cls : ''));
    if (icon) b.appendChild(ui.icon(icon));
    b.appendChild(el('span', '', text)); b.onclick = fn; return b;
  };
  ui.pill = function (text, fn, cur) {
    var b = el('button', 'pill f fl' + (cur ? ' cur' : ''), text); b.onclick = fn; return b;
  };
  ui.clock = function () {
    var c = el('div', 'clock tab'), time = el('div', 'clock-time'), date = el('div', 'clock-date');
    var hours = el('span'), colon = el('span', 'clock-colon', ':'), minutes = el('span');
    var dateFormat = new Intl.DateTimeFormat(N.isRtl() ? 'fa-IR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    var lastDay = '';
    time.dir = 'ltr';
    time.appendChild(hours); time.appendChild(colon); time.appendChild(minutes);
    c.appendChild(time); c.appendChild(date);
    function tick() {
      var d = new Date(), h = ('0' + d.getHours()).slice(-2), m = ('0' + d.getMinutes()).slice(-2);
      if (hours.textContent !== h) hours.textContent = h;
      if (minutes.textContent !== m) minutes.textContent = m;
      var day = d.toDateString();
      if (day !== lastDay) {
        date.textContent = dateFormat.format(d);
        lastDay = day;
      }
      c._t = setTimeout(tick, 1000 - d.getMilliseconds());
    }
    tick();
    return c;
  };

  /* ---------- images ---------- */
  /* Prefer medium for row/grid cards — large over-fetches on 2018 SoCs. */
  ui.posterUrl = function (p) {
    var po = p && p.image && p.image.poster; if (!po) return '';
    return (po.webp && (po.webp.medium || po.webp.large)) || (po.jpg && (po.jpg.medium || po.jpg.large)) || '';
  };
  ui.coverUrl = function (p) { var c = p && p.image && p.image.cover; return c ? (c.webp || c.jpg || '') : ''; };
  ui.titleCredits = function (post) {
    function photo(image) {
      if (typeof image === 'string') return /^https?:\/\//i.test(image) ? image : '';
      if (!image || typeof image !== 'object') return '';
      return photo(image.webp) || photo(image.jpg) || photo(image.medium) ||
        photo(image.large) || photo(image.small) || photo(image.url) ||
        photo(image.profile) || photo(image.poster);
    }
    function people(value, job) {
      var list = Array.isArray(value) ? value : (value ? [value] : []);
      return list.filter(function (p) { return p && typeof p.name === 'string' && p.name.trim(); })
        .map(function (p) {
          return { name: p.name.trim(), role: job || (typeof p.as === 'string' ? p.as.trim() : ''), photo: photo(p.image) };
        });
    }
    var crew = post.crew || {};
    return {
      cast: people(post.cast),
      crew: people(crew.director, 'Director').concat(people(crew.creator, 'Creator'), people(crew.writer, 'Writer'))
    };
  };
  // Bounded decoded artwork cache; HTMLImage keeps cross-origin TV artwork working.
  var artwork = {}, artworkQueue = [], artworkBytes = 0, artworkActive = 0, artworkClock = 0;
  var ART_LIMIT = 24 * 1024 * 1024, ART_COUNT = 48;
  function trimArtwork() {
    var ready = Object.keys(artwork).filter(function (k) { return artwork[k].ready; });
    ready.sort(function (a,b) { return artwork[a].used-artwork[b].used; });
    while (ready.length && (ready.length > ART_COUNT || artworkBytes > ART_LIMIT)) {
      var key=ready.shift(), entry=artwork[key]; artworkBytes-=entry.bytes; delete artwork[key];
    }
  }
  function pumpArtwork() {
    artworkQueue.sort(function(a,b){return a.priority-b.priority;});
    while (artworkActive < 4 && artworkQueue.length) {
      (function(entry){
        if (!entry.waiters.length) { delete artwork[entry.src]; return; }
        artworkActive++; var im=entry.image=new Image(), settled=false;
        var timeout=setTimeout(function(){finish(false);im.removeAttribute('src');},15000);
        im.decoding='async';
        function finish(ok) {
          if(settled)return;settled=true;clearTimeout(timeout);
          im.onload=im.onerror=null; artworkActive--; entry.ready=ok;
          entry.bytes=ok ? im.naturalWidth*im.naturalHeight*4 : 0; artworkBytes+=entry.bytes;
          var callbacks=entry.waiters; entry.waiters=[];
          if(!ok)delete artwork[entry.src];
          callbacks.forEach(function(w){if(!w.cancelled)w.done(ok);});trimArtwork();pumpArtwork();
        }
        im.onload=function(){if(im.decode)im.decode().then(function(){finish(true);},function(){finish(true);});else finish(true);};
        im.onerror=function(){finish(false);}; im.src=entry.src;
      })(artworkQueue.shift());
    }
  }
  ui.artwork = function(src,priority,done) {
    var entry=artwork[src], waiter={done:done,cancelled:false};
    if(entry&&entry.ready){entry.used=++artworkClock;done(true);return function(){};}
    if(!entry){entry=artwork[src]={src:src,priority:priority,waiters:[],used:++artworkClock};artworkQueue.push(entry);}
    entry.priority=Math.min(entry.priority,priority);entry.waiters.push(waiter);pumpArtwork();
    return function(){waiter.cancelled=true;var at=entry.waiters.indexOf(waiter);if(at>=0)entry.waiters.splice(at,1);};
  };
  ui.artworkStats=function(){return{entries:Object.keys(artwork).length,bytes:artworkBytes,active:artworkActive,queued:artworkQueue.length};};
  ui.load = function (c, priority) {
    if (c._on || !c._src || !c._im) return; c._on = true;
    var im=c._im;
    c._cancelImage=ui.artwork(c._src,priority||0,function(ok){
      c._cancelImage=null;if(!c._on)return;
      if(!ok)return;
      im.onload=function(){im.classList.add('in');};im.src=c._src;
      if(im.complete&&im.naturalWidth)im.classList.add('in');
    });
  };
  ui.unload = function (c) {
    c._on=false;if(c._cancelImage)c._cancelImage();c._cancelImage=null;
    var im=c._im;if(im){im.onload=im.onerror=null;im.classList.remove('in');im.removeAttribute('src');}
  };

  // Fixed design coordinates avoid repeated layout reads. Only visible rows and
  // one surrounding row are mounted; follow the actual scroll during animation.
  ui.windowGrid=function(container,scroller,o){
    var count=0,mounted={},frame=0,dead=false,focused=0,until=0;
    var layer=el('div','window-grid');layer.style.cssText='position:relative;width:100%;flex:0 0 100%';container.appendChild(layer);
    function mount(i){
      if(i<0||i>=count)return null;
      if(!mounted[i]){var cell=o.create(i);cell.style.position='absolute';cell.style.top=Math.floor(i/o.cols)*o.pitch+'px';cell.style[N.isRtl()?'right':'left']=(i%o.cols)*o.column+'px';cell.card._gridIndex=i;mounted[i]=cell;layer.appendChild(cell);}
      return mounted[i].card;
    }
    function paint(y){
      var first=Math.max(0,Math.floor((y-o.top)/o.pitch)-1),last=Math.min(Math.ceil(count/o.cols)-1,Math.ceil((y+o.height-o.top)/o.pitch));
      for(var r=first;r<=last;r++)for(var c=0;c<o.cols;c++){var i=r*o.cols+c,card=mount(i);if(card)ui.load(card,Math.abs(r-Math.floor(focused/o.cols))>1?1:0);}
      Object.keys(mounted).forEach(function(k){var i=Number(k),row=Math.floor(i/o.cols);if((row<first||row>last)&&i!==focused){var cell=mounted[k];ui.unload(cell.card);layer.removeChild(cell);delete mounted[k];}});
    }
    function follow(){
      frame=0;if(dead)return;
      var value=getComputedStyle(scroller).transform,parts=value&&value!=='none'?value.match(/matrix(3d)?\((.+)\)/):null;
      var y=parts?-(Number(parts[2].split(',')[parts[1]?13:5])||0):0;paint(y);
      if(Date.now()<until)frame=requestAnimationFrame(follow);
    }
    return{
      setCount:function(n){count=n;layer.style.height=Math.ceil(n/o.cols)*o.pitch+'px';paint(-(scroller._ty||0));},
      at:mount,
      focus:function(i){focused=i;until=Date.now()+600;if(!frame)frame=requestAnimationFrame(follow);},
      clear:function(){Object.keys(mounted).forEach(function(k){ui.unload(mounted[k].card);});mounted={};layer.innerHTML='';count=0;layer.style.height='0px';},
      destroy:function(){dead=true;cancelAnimationFrame(frame);this.clear();}
    };
  };

  /* ---------- cards ---------- */
  function openTitleActions(post, card, listChanged) {
    var actions = [
      { label: N.t('play'), icon: 'play', run: function () { N.go('details', { id: post.id, autoplay: true }); } }
    ];
    if (post.options && post.options.is_series) {
      actions.push({
        label: N.t('episodes'), icon: 'series',
        run: function () { N.go('details', { id: post.id, showEpisodes: true }); }
      });
    }
    actions.push({
      label: N.t(N.library.has(post.id) ? 'removeTitle' : 'saveTitle'), icon: 'list',
      run: function () {
        var saved = N.library.has(post.id);
        if (N.library.toggle(post) !== saved && listChanged) listChanged();
      }
    });
    N.confirm({ anchor: card, title: N.title(post), actions: actions });
  }

  // kind: poster | land | top | grid | tile ; returns the focusable .card element
  ui.card = function (post, kind, o) {
    o = o || {}; var c = el('div', 'card f k-' + (kind === 'poster' ? 'p' : kind)), po = post.options || {};
    var url = kind === 'land' ? (ui.coverUrl(post) || ui.posterUrl(post)) : ui.posterUrl(post);
    if (kind === 'tile') url = o.image || '';
    c._post = post; c._src = url;
    if (kind !== 'tile' && post.id != null && !po.coming_soon) {
      c.onhold = function () { openTitleActions(post, c, o.listChanged); };
    }
    var holder = c;
    if (kind === 'top') {
      c.appendChild(el('div', 'rank', String(o.rank)));
      c.appendChild(el('div', 'rank hi', String(o.rank)));
      holder = el('div', 'pbox'); c.appendChild(holder);
      if (o.rank >= 10) c.classList.add('wide');
    }
    var ph = el('div', 'ph'); ph.appendChild(el('span', '', kind === 'tile' ? '' : N.title(post))); holder.appendChild(ph);
    if (url) { var im = el('img', 'im'); im.alt = ''; im.decoding = 'async'; holder.appendChild(im); c._im = im; }
    if (kind === 'tile') {
      c.appendChild(el('div', 'shade')); c.appendChild(el('div', 'tn', o.name)); c.appendChild(el('div', 'tc tab', o.count !== undefined ? String(o.count) : ''));
    } else if (kind !== 'land') {
      ui.badge(holder, po);
    }
    return c;
  };
  ui.badge = function (c, po) {
    var b = null;
    if (po.coming_soon) { b = el('div', 'bdg soon', N.t('soon')); }
    if (b) c.appendChild(b);
  };
  // grid cell: poster + title under it. Returns the cell; cell.card is the focusable.
  ui.cell = function (post) {
    var cell = el('div', 'gcell'), c = ui.card(post, 'grid');
    cell.appendChild(c); cell.appendChild(el('div', 'gt', N.title(post))); cell.card = c; c._cell = cell; return cell;
  };
  // episode tiles (typographic; the API has no stills)
  ui.epName = function (it) {
    var i = (it && it.info) || {}, t = i.title || i.name || (it && it.title);
    if (t && typeof t === 'object') t = (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local);
    return t ? String(t) : '';
  };
  // episode numbers may be combined ("11,12"): order by the leading number, show "11–12"
  ui.epNum = function (v) { var n = parseInt(String(v === undefined || v === null ? '' : v), 10); return isNaN(n) ? 0 : n; };
  ui.epLabel = function (v, fallback) {
    var s = (v === undefined || v === null || v === '') ? String(fallback === undefined ? '' : fallback) : String(v);
    return s.replace(/\s*[,&+\-–]\s*/g, '–');
  };
  ui.epCmp = function (a, b) {
    var ai = (a && a.info) || {}, bi = (b && b.info) || {};
    return (ui.epNum(ai.season) - ui.epNum(bi.season)) || (ui.epNum(ai.episode) - ui.epNum(bi.episode));
  };
  ui.epTile = function (it, idx, o) {
    o = o || {}; var i = it.info || {}, n = ui.epLabel(i.episode, idx + 1), e = el('div', 'ep f');
    if (o.post) {
      e.classList.add('episode-card');
      var fallbackArt = ui.coverUrl(o.post) || ui.posterUrl(o.post);
      var art = ui.coverUrl(it) || ui.posterUrl(it) || fallbackArt;
      if (art) {
        var image = el('img', 'episode-art'); image.alt = ''; image.decoding = 'async'; image.src = art;
        image.onerror = function () { if (fallbackArt && this.getAttribute('src') !== fallbackArt) this.src = fallbackArt; else this.style.display = 'none'; };
        e.appendChild(image);
      }
    }
    e.appendChild(el('div', 'en tab' + (n.length > 3 ? ' sm' : ''), 'E' + (/^\d$/.test(n) ? '0' + n : n)));
    e.appendChild(el('div', 'et', ui.epName(it) || (N.t('episode') + ' ' + n)));
    var dur = Number(i.duration || i.time || 0);
    if (o.watched) { var ck = ui.icon('check', 'chk'); e.appendChild(ck); }
    else if (dur) { if (dur > 600) dur = dur / 60; e.appendChild(el('div', 'ed tab', Math.round(dur) + ' ' + N.t('min'))); }
    if (o.progress > 0) { var pb = el('div', 'ep-p'), pi = el('i'); pi.style.transform = 'scaleX(' + Math.min(1, o.progress) + ')'; pb.appendChild(pi); e.appendChild(pb); }
    return e;
  };
  ui.skelCard = function (kind) { var c = el('div', 'card skel k-' + (kind || 'p')); return c; };

  /* ---------- text bits ---------- */
  ui.typeLabel = function (post, withSeasons) {
    var po = post.options || {}, pi = post.info || {}, s;
    if (po.title_type === 'anime') s = N.t('anime'); else if (po.is_series) s = N.t('series'); else s = N.t('movie');
    if (withSeasons && po.is_series && pi.seasons) s += ' · ' + pi.seasons + ' ' + N.t('seasons');
    return s;
  };
  ui.duration = function (min) {
    min = Number(min); if (!min) return '';
    var h = Math.floor(min / 60), m = min % 60;
    if (N.lang === 'fa') return (h ? h + ' ساعت ' : '') + (m ? m + ' دقیقه' : '');
    return (h ? h + 'h ' : '') + (m ? m + 'm' : '');
  };
  // Rating badges are grouped before the year, duration, and genres.
  ui.meta = function (post, nGenres, options) {
    var m = el('div', 'meta'), pi = post.info || {}, sc = post.score || {};
    if (options && options.details) m.classList.add('meta-details');
    function rating(label, value, cls) {
      if (!value) return;
      var badge = el('span', 'rating-badge ' + cls);
      badge.dir = cls === 'rating-age' && N.lang === 'fa' ? 'rtl' : 'ltr';
      var score = el('b', 'rating-value tab', String(value));
      score.dir = 'auto';
      badge.appendChild(el('span', 'rating-source', label));
      badge.appendChild(score);
      m.appendChild(badge);
    }
    rating('IMDb', sc.imdb && sc.imdb.score, 'rating-imdb');
    rating('30nama', sc['30nama'] && sc['30nama'].score, 'rating-nama');
    rating(N.t('ageRating'), pi.age, 'rating-age');

    var units = 0;
    function unit(value, cls) {
      if (!value) return;
      var part = el('span', 'meta-unit ' + cls);
      if (units++) part.appendChild(el('i', 'meta-separator'));
      part.appendChild(el('span', 'tab', String(value)));
      m.appendChild(part);
    }
    var year = pi.year;
    if (year && pi.year_end && pi.year_end !== year && (post.options || {}).is_series) year += '–' + pi.year_end;
    unit(year, 'meta-year');
    unit(ui.duration(pi.time && pi.time.default), 'meta-runtime');
    if (post.genre && post.genre.length) {
      unit(post.genre.slice(0, nGenres || 2).map(function (g) { return g.name; }).join(', '), 'meta-genres');
    }
    return m;
  };

  /* ---------- layout: start-anchored tracks, vertical scroll ---------- */
  var START = 184;
  // cards: array of elements with known widths; sets card._x (logical start) and track._total
  ui.layoutTrack = function (track, cards, widths, gap) {
    var x = START; gap = gap === undefined ? 24 : gap;
    for (var i = 0; i < cards.length; i++) { cards[i]._x = x; x += widths[i] + gap; }
    track._total = x - gap; track._s = null;
  };
  ui.slideTo = function (track, x) {
    // Reserve 28px for focus enlargement and its ring at the far safe edge.
    var s = Math.max(0, x - START), max = Math.max(0, (track._total || 0) - 1796);
    if (s > max) s = max;
    if (track._s === s) return; track._s = s;
    track.style.transform = 'translateX(' + (N.isRtl() ? s : -s) + 'px)';
  };
  function topIn(e, box) { var t = 0; while (e && e !== box) { t += e.offsetTop; e = e.offsetParent; } return t; }
  ui.topIn = topIn;
  // keep `target` row at (at most) `anchor` px from the top of the screen
  ui.vscroll = function (box, target, anchor) {
    var ty = -Math.max(0, topIn(target, box) - anchor);
    if (box._ty === ty) return ty; box._ty = ty;
    box.style.transform = 'translateY(' + ty + 'px)'; return ty;
  };
  // is `dir` ('left'|'right') towards the end edge in the current direction?
  ui.step = function (dir) { var r = N.isRtl(); return (dir === 'right') !== r ? 1 : -1; };

  // Index-based grids remain predictable while their parent is animating.
  // Spatial rectangles alone can skip rows or jump back to a distant control.
  ui.gridNav = function (cards, index, cols, dir, edge) {
    var next = index;
    if (dir === 'left' || dir === 'right') {
      var step = ui.step(dir);
      if ((step < 0 && index % cols === 0) ||
          (step > 0 && (index % cols === cols - 1 || index === cards.length - 1))) {
        return edge ? edge(dir) : true;
      }
      next += step;
    } else if (dir === 'up') {
      if (index < cols) return edge ? edge(dir) : true;
      next -= cols;
    } else if (dir === 'down') {
      if (Math.floor(index / cols) === Math.floor((cards.length - 1) / cols)) return true;
      next = Math.min(cards.length - 1, index + cols);
    }
    return (cards._at ? cards._at(next) : cards[next]) || true;
  };
})();
