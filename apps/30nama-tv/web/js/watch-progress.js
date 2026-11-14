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
  function timestamp(data) {
    if (!data || !data.updated_at) return 0;
    var numeric = Number(data.updated_at);
    if (isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
    return Date.parse(data.updated_at) || 0;
  }
  function remoteWins(local, remote, items) {
    if (!remote || !id(remote.file_id)) return false;
    var localData = local.data || local.completed;
    if (!localData) return true;
    if (local.data && same(remote.file_id, localData.file_id) && Number(remote.time) === Number(localData.time)) {
      local.synced = true;
      return false;
    }
    var remoteTime = timestamp(remote);
    if (remoteTime && local.updatedAt && remoteTime !== local.updatedAt) return remoteTime > local.updatedAt;
    if (same(remote.file_id, localData.file_id)) {
      return !!local.data && (local.synced || Number(remote.time) >= Number(localData.time));
    }
    if (local.synced) return true;
    if (items) {
      var serverIndex = -1, localIndex = -1;
      items.forEach(function (item, index) {
        if (!item.info) return;
        if (same(item.info.file_id, remote.file_id)) serverIndex = index;
        if (same(item.info.file_id, localData.file_id)) localIndex = index;
      });
      if (serverIndex >= 0 && localIndex >= 0) return serverIndex > localIndex;
    }
    if (Number(remote.season) && Number(localData.season) && Number(remote.season) !== Number(localData.season)) {
      return Number(remote.season) > Number(localData.season);
    }
    if (Number(remote.episode) && Number(localData.episode)) {
      return Number(remote.episode) > Number(localData.episode);
    }
    // Without ordering metadata, trust a different server file over the cached file.
    return true;
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
      var completed = finished ? { file_id: info.file_id, season: label(info.season), episode: label(info.episode), time: time } : null;
      entries.unshift({ post: snapshot(post), data: data, completed: completed, updatedAt: Date.now() });
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
      var owner = account(), entries = read(owner), changed = false, suppressed = [];
      var serverRows = remote || [], retained = [];
      var localRows = [];
      entries.forEach(function (local) {
        var match = serverRows.filter(function (row) { return row && same((row.post || row).id, local.post.id); })[0];
        if (remote && !match && local.synced && !local.dismissed) {
          changed = true;
          return;
        }
        retained.push(local);
        if (local.dismissed) {
          if (remote && !match && !local.serverCleared) { local.serverCleared = true; changed = true; }
        } else if (match) {
          var wasSynced = local.synced, data = match.data || match.continue_watching || match;
          if (remoteWins(local, data)) {
            local.post = snapshot(match.post || match);
            local.data = { file_id: data.file_id, time: data.time, duration: data.duration, season: label(data.season), episode: label(data.episode) };
            local.updatedAt = timestamp(data);
            local.completed = null;
            local.synced = true;
            changed = true;
            return;
          }
          if (wasSynced !== local.synced) changed = true;
        }
        if (local.data && !local.dismissed) localRows.push(local);
        if (!local.serverCleared) suppressed.push(local.post.id);
      });
      if (changed) N.store.set(key, { owner: String(owner), entries: retained });
      return localRows.concat(serverRows.filter(function (row) {
        var post = row && (row.post || row);
        return post && !suppressed.some(function (postId) { return same(postId, post.id); });
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
      if (local && playable(remote) && remoteWins(local, remote, items)) return remote;
      if (local && (!local.data || playable(local.data))) return local.data;
      return playable(remote) ? remote : null;
    }
  };
})();
