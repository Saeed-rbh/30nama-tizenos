/* Shared by the Samsung service and its contract tests. Catalogue order is preserved. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.N.previewData = factory();
})(this, function () {
  function id(value) { return /^[1-9][0-9]{0,14}$/.test(String(value)) ? String(value) : null; }
  function section(posts, title, lang) {
    var seen = {}, tiles = [];
    (Array.isArray(posts) ? posts : []).forEach(function (p) {
      if (!p || !id(p.id) || seen[p.id] || (p.options && p.options.coming_soon) || tiles.length >= 12) return;
      var poster = p.image && p.image.poster, jpg = poster && poster.jpg;
      var url = typeof jpg === 'string' ? jpg : jpg && (jpg.medium || jpg.large || jpg.small);
      var name = p.title && (lang === 'fa' ? p.title.local || p.title.english : p.title.english || p.title.local);
      if (!name || !/^https:\/\//i.test(url || '')) return;
      seen[p.id] = true;
      tiles.push({ title: String(name), subtitle: String(p.info && p.info.year || ''),
        image_url: url, image_ratio: '2by3', is_playable: false,
        action_data: JSON.stringify({ postId: id(p.id) }), position: tiles.length });
    });
    return { title: title, tiles: tiles };
  }
  return { id: id, build: function (movies, series, lang) {
    return { sections: [section(movies, lang === 'fa' ? 'فیلم‌های تازه' : 'Recent movies', lang),
      section(series, lang === 'fa' ? 'سریال‌های به‌روز' : 'Recently updated series', lang)]
      .filter(function (s) { return s.tiles.length; }) };
  }, parse: function (payload) {
    try {
      var data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (data && data.values !== undefined) data = typeof data.values === 'string' ? JSON.parse(data.values) : data.values;
      return data && id(data.postId);
    } catch (e) { return null; }
  } };
});
