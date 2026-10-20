// Optional: auto-logs in the localhost dev app so you can skip the QR flow.
// Copy this file to dev-session.js (git-ignored) and paste your session JSON
// (the {token, user} object stored under localStorage 'n30.session').
// No-op off localhost, and never overwrites an existing session.
(function () {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  try {
    if (localStorage.getItem('n30.session')) return;
    // localStorage.setItem('n30.session', JSON.stringify({ token: '...', user: { /* ... */ } }));
  } catch (e) {}
})();
