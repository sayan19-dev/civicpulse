// Connects the website to Supabase. Used by both index.html (login) and app.html (the app).
// "Remember me" works through the storage adapter below:
//   remember ticked   -> the login is kept in localStorage   (survives closing the browser)
//   not ticked        -> kept in sessionStorage              (ends when the tab is closed)
(function () {
  var cfg = window.CIVIC_CONFIG || {};
  window.civicSupabase = null;
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  var PERSIST_FLAG = 'civicai_persist';
  function persistent() {
    try { return localStorage.getItem(PERSIST_FLAG) === '1'; } catch (e) { return false; }
  }
  var adapter = {
    getItem: function (k) {
      var v = localStorage.getItem(k);
      return v !== null ? v : sessionStorage.getItem(k);
    },
    setItem: function (k, v) {
      var keep = persistent() ? localStorage : sessionStorage;
      var drop = persistent() ? sessionStorage : localStorage;
      keep.setItem(k, v);
      drop.removeItem(k);
    },
    removeItem: function (k) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
  };

  window.civicSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { storage: adapter, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
})();
