/* Keep a TV checkpoint even when the server's playback report fails or arrives late. */
(function () {
  var key = 'watchProgress', limit = 40;
  function account() {
    var user = N.session && N.session.user;
    return N.isLoggedIn() && user && (user.user_id || user.id || user.user_name);
  }
  function read(owner) {
    var saved = N.store.get(key, null);
    return owner && saved && saved.owner === String(owner) && Array.isArray(saved.entries) ? saved.entries : [];
  }
  function same(a, b) { return String(a) === String(b); }
  function id(value) { return (typeof value === 'number' && isFinite(value)) || (typeof value === 'string' && value !== ''); }
  function label(value) { return id(value) ? value : ''; }
  function art(variants) {
    return { medium: label(variants && variants.medium), large: label(variants && variants.large) };
  }
  function snapshot(post) {
    var title = post.title || {}, image = post.image || {}, poster = image.poster || {}, cover = image.cover || {};
    return {
      id: post.id, title: { english: label(title.english), local: label(title.local) },
      image: { poster: { jpg: art(poster.jpg), webp: art(poster.webp) }, cover: { jpg: label(cover.jpg), webp: label(cover.webp) } },
      options: { is_series: !!(post.options && post.options.is_series) }
    };
  }
  function entry(postId) {
    return read(account()).filter(function (e) { return same(e.post.id, postId); })[0] || null;
  }
  N.watchProgress = {
    save: function (post, info, time, duration, finished, next) {
      var owner = account();
      if (!owner || !post || !id(post.id) || !id(info.file_id)) return;
      if (!finished && (!isFinite(time) || time <= 1 || !isFinite(duration) || duration <= 0)) return;
      var previous = entry(post.id);
      var data = finished
        ? (next && id(next.file_id) ? { file_id: next.file_id, season: label(next.season), episode: label(next.episode), time: 0, duration: 0 } : null)
        : { file_id: info.file_id, season: label(info.season), episode: label(info.episode), time: Math.min(time, duration), duration: duration };
      if (previous && !previous.dismissed && JSON.stringify(previous.data) === JSON.stringify(data)) return;
      var entries = read(owner).filter(function (e) { return !same(e.post.id, post.id); });
      entries.unshift({ post: snapshot(post), data: data });
      N.store.set(key, { owner: String(owner), entries: entries.slice(0, limit) });
    },
    dismiss: function (post) {
      var owner = account();
      if (!owner || !post || !id(post.id)) return;
      var entries = read(owner).filter(function (e) { return !same(e.post.id, post.id); });
      var previous = entry(post.id);
      entries.unshift({ post: snapshot(post), data: previous && previous.data, dismissed: true });
      N.store.set(key, { owner: String(owner), entries: entries.slice(0, limit) });
    },
    merge: function (remote) {
      var owner = account(), entries = read(owner);
      if (remote) {
        var changed = false;
        entries.forEach(function (local) {
          if (!local.dismissed || local.serverCleared) return;
          if (remote.some(function (e) { return e && same((e.post || e).id, local.post.id); })) return;
          local.serverCleared = true;
          changed = true;
        });
        if (changed) N.store.set(key, { owner: String(owner), entries: entries });
      }
      return entries.filter(function (e) { return e.data && !e.dismissed; }).concat((remote || []).filter(function (e) {
        var post = e && (e.post || e);
        return post && !entries.some(function (local) {
          return same(local.post.id, post.id) && !local.serverCleared;
        });
      }));
    },
    resume: function (postId, items, remote) {
      function playable(data) {
        return data && id(data.file_id) && items.some(function (item) {
          return item.info && same(item.info.file_id, data.file_id);
        });
      }
      var local = entry(postId);
      if (local && local.dismissed) return playable(remote) ? remote : (playable(local.data) ? local.data : null);
      if (local && (!local.data || playable(local.data))) return local.data;
      return playable(remote) ? remote : null;
    }
  };
})();
