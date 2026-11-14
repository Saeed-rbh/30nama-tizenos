/* Native Samsung launcher integration; unavailable in browser/TizenBrew module mode. */
(function () {
  var pending = null, ready = false, lastPayload = null, refreshTimer = null;
  function receive() {
    try {
      var request = tizen.application.getCurrentApplication().getRequestedAppControl();
      var data = request && request.appControl && request.appControl.data || [];
      for (var i = 0; i < data.length; i++) {
        if (data[i].key !== 'PAYLOAD' || !data[i].value || !data[i].value.length) continue;
        var raw = data[i].value[0], id = N.previewData.parse(raw);
        if (!id || raw === lastPayload) continue;
        lastPayload = raw; pending = id; open();
      }
    } catch (e) {} // No Samsung application control in desktop browsers.
  }
  function open() {
    if (!ready || !pending) return;
    var id = pending; pending = null;
    if (N.player.open) N.player.close();
    N.closeModal();
    N.go('home', {}, { reset: true });
    N.go('details', { id: id });
  }
  N.preview = {
    ready: function () { ready = true; open(); },
    signedOut: function () { ready = false; },
    refresh: function () {
      if (N.config && N.config.previewMode === 'public') return;
      try {
        if (tizen.application.getCurrentApplication().appInfo.id !== 'Nama30Q82B.Nama30TV' ||
            !tizen.systeminfo.getCapability('http://tizen.org/feature/web.service')) return;
        if (!refreshTimer && window.setInterval) refreshTimer = window.setInterval(N.preview.refresh, 600000);
        if (Date.now() - N.store.get('previewLaunch', 0) < 600000) return;
        // Use the app's existing discovery, browser networking and rate-limit queue.
        // The service can also try refreshing while the foreground app is closed.
        N.api.get('archive', { slugs: 'movies', streamonly: 1, page: 1, orderby: 'update', order: 'desc' }, { bg: true }).then(function (movies) {
          return N.api.get('archive', { slugs: 'series', streamonly: 1, page: 1, orderby: 'update', order: 'desc' }, { bg: true }).then(function (series) {
            return N.previewData.build(movies.posts, series.posts, N.lang);
          });
        }).then(function (preview) {
          if (!preview.sections.length) return;
          tizen.application.launchAppControl(new tizen.ApplicationControl(
            'http://tizen.org/appcontrol/operation/pick', null, null, null,
            [new tizen.ApplicationControlData('language', [N.lang]),
             new tizen.ApplicationControlData('preview', [JSON.stringify(preview)])]), 'Nama30Q82B.Preview',
            function () { N.store.set('previewLaunch', Date.now()); }, function (e) { console.warn('Preview service unavailable', e.name); });
        }).catch(function () { console.warn('Preview catalogue refresh unavailable'); });
      } catch (e) {}
    }
  };
  window.addEventListener('appcontrol', function () { lastPayload = null; receive(); });
  receive();
})();
