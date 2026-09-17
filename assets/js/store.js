/* ==========================================================================
   MediBridge — Data Store (localStorage-backed)
   Single source of truth shared across all screens.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'medibridge.db.v3';

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  }

  function todayISO(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  }

  /* ---- Seed: only a default admin. All other data is created
     through real usage; admins cannot self-register. ---------------------- */
  function seed() {
    return {
      users: [
        { id: 'u_admin', name: 'Admin', email: 'admin@medibridge.health', password: 'Admin@123', role: 'admin', title: 'Admin' }
      ],
      clinics: [], staff: [], doctors: [], patients: [],
      appointments: [], appointmentRequests: [], documentRequests: [],
      documents: [], accessGrants: [], availability: {}
    };
  }

  /* ---- Persistence ------------------------------------------------------ */
  var state;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    var s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  function persist() { localStorage.setItem(KEY, JSON.stringify(state)); }

  state = load();

  /* ---- Generic collection API ------------------------------------------ */
  function all(coll) { return (state[coll] || []).slice(); }
  function get(coll, id) { return (state[coll] || []).find(function (r) { return r.id === id; }) || null; }
  function where(coll, pred) { return (state[coll] || []).filter(pred); }

  function insert(coll, obj) {
    if (!state[coll]) state[coll] = [];
    if (!obj.id) obj.id = uid(coll.slice(0, 3));
    state[coll].unshift(obj);
    persist();
    return obj;
  }
  function update(coll, id, patch) {
    var row = get(coll, id);
    if (!row) return null;
    Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    persist();
    return row;
  }
  function remove(coll, id) {
    state[coll] = (state[coll] || []).filter(function (r) { return r.id !== id; });
    persist();
  }

  /* ---- Domain helpers --------------------------------------------------- */
  var Store = {
    uid: uid,
    todayISO: todayISO,
    all: all, get: get, where: where,
    insert: insert, update: update, remove: remove,
    raw: function () { return state; },
    setAvailability: function (doctorId, week) { state.availability[doctorId] = week; persist(); },
    getAvailability: function (doctorId) { return state.availability[doctorId] || {}; },
    reset: function () { localStorage.removeItem(KEY); state = load(); }
  };

  global.Store = Store;
})(window);
