/* ==========================================================================
   MediBridge — Authentication & Session
   Validates mock credentials, keeps a session, and guards role pages.
   ========================================================================== */
(function (global) {
  'use strict';

  var SKEY = 'medibridge.session.v1';

  var HOME = {
    admin: 'admin-dashboard.html',
    doctor: 'doctor-dashboard.html',
    receptionist: 'receptionist-dashboard.html',
    patient: 'patient-hub.html'
  };

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY)); }
    catch (e) { return null; }
  }
  function setSession(user, remember) {
    var payload = JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, title: user.title, doctorId: user.doctorId, patientId: user.patientId, clinicId: user.clinicId });
    sessionStorage.setItem(SKEY, payload);
    if (remember) localStorage.setItem(SKEY, payload); else localStorage.removeItem(SKEY);
  }
  function clearSession() {
    sessionStorage.removeItem(SKEY);
    localStorage.removeItem(SKEY);
  }

  // Returns { ok, user } or { ok:false, error }
  function login(email, password, expectedRole) {
    var user = Store.all('users').find(function (u) {
      return u.email.toLowerCase() === String(email).toLowerCase();
    });
    if (!user) return { ok: false, error: 'No account found for that email.' };
    if (user.password !== password) return { ok: false, error: 'Incorrect password. Please try again.' };

    if (expectedRole) {
      if (expectedRole === 'admin' && user.role !== 'admin') {
        return { ok: false, error: 'This portal is for admins only.' };
      }
      if (expectedRole !== 'admin' && user.role === 'admin') {
        return { ok: false, error: 'Use the administrator portal to sign in.' };
      }
      if (user.role !== expectedRole) {
        return { ok: false, error: 'Invalid credentials for ' + expectedRole + ' role.' };
      }
    }

    // Check if account or staff member is revoked/inactive
    if (user.status === 'Inactive' || user.status === 'Revoked' || user.status === 'Deboarded') {
      return { ok: false, error: 'Your account access has been revoked by an administrator.' };
    }
    var staffRecord = Store.all('staff').find(function (s) {
      return s.email.toLowerCase() === user.email.toLowerCase();
    });
    if (staffRecord && (staffRecord.status === 'Inactive' || staffRecord.status === 'Revoked' || staffRecord.status === 'Deboarded')) {
      return { ok: false, error: 'Your account access has been revoked by an administrator.' };
    }

    return { ok: true, user: user };
  }

  function homeFor(role) { return HOME[role] || 'login.html'; }

  // Redirect unauthenticated users; enforce role if provided.
  function requireAuth(role) {
    var s = getSession();
    if (!s) { location.replace('login.html'); return null; }
    if (role && s.role !== role) { location.replace(homeFor(s.role)); return null; }
    return s;
  }

  function logout() {
    clearSession();
    location.href = 'login.html';
  }

  // SHA-256 (salted, case-insensitive) hash of a security answer — native Web Crypto.
  var SALT = 'medibridge::recovery::v1';
  function hashAnswer(text) {
    var data = new TextEncoder().encode(SALT + '::' + String(text).trim().toLowerCase());
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('00' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  global.Auth = {
    login: login,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    homeFor: homeFor,
    logout: logout,
    hashAnswer: hashAnswer
  };
})(window);
