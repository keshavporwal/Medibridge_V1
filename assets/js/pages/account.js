/* Account & Security — universal (all roles) */
(function () {
  'use strict';
  var session = Auth.requireAuth();
  if (!session) return;
  UI.mountChrome(session);

  var HOME_LABEL = { patient: 'Health Hub', doctor: 'Workspace', receptionist: 'Dashboard', admin: 'Operations' };
  var home = Auth.homeFor(session.role);
  document.getElementById('brand-home').setAttribute('href', home);
  var crumb = document.getElementById('crumb-home');
  crumb.setAttribute('href', home);
  document.getElementById('crumb-home-label').textContent = HOME_LABEL[session.role] || 'Home';

  var user = Store.get('users', session.id) || session;

  /* ---------- Account info ---------------------------------------------- */
  function clinicName(id) { var c = id && Store.get('clinics', id); return c ? c.name + ' (' + c.code + ')' : '—'; }
  var rows = [
    ['Full name', user.name],
    ['Email', user.email],
    ['Role', UI.cap(user.role)],
    ['Account title', user.title || UI.cap(user.role)]
  ];
  if (user.role === 'doctor' || user.role === 'receptionist') rows.push(['Clinic', clinicName(user.clinicId)]);
  if (user.role === 'patient') { var p = Store.get('patients', user.patientId); rows.push(['MRN', p ? p.mrn : '—']); }
  document.getElementById('account-info').innerHTML = rows.map(function (r) {
    return '<div class="list-row"><div class="list-main"><div class="list-sub">' + UI.esc(r[0]) + '</div>' +
      '<div class="list-title body-sm">' + UI.esc(r[1] || '—') + '</div></div></div>';
  }).join('');

  /* ---------- Change password ------------------------------------------- */
  var form = document.getElementById('password-form');
  var newPw = document.getElementById('new-pw');
  var strength = document.getElementById('pw-strength');
  var strengthLabel = document.getElementById('pw-strength-label');
  newPw.addEventListener('input', function () {
    var s = UI.passwordStrength(newPw.value);
    strength.className = 'strength ' + (newPw.value ? s.className : '');
    strengthLabel.textContent = newPw.value ? s.label + ' password' : 'Use 8+ chars with an uppercase letter, a number, and a symbol.';
  });

  UI.liveClear(form);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(form)) return;
    var cur = document.getElementById('cur-pw');
    if (cur.value !== user.password) { UI.setError(cur, 'Current password is incorrect.'); return; }
    if (!UI.meetsPasswordPolicy(newPw.value)) { UI.setError(newPw, 'Use 8+ chars incl. uppercase, number, and symbol.'); return; }
    if (newPw.value === user.password) { UI.setError(newPw, 'New password must differ from the current one.'); return; }
    Store.update('users', user.id, { password: newPw.value });
    user.password = newPw.value;
    form.reset();
    strength.className = 'strength';
    strengthLabel.textContent = 'Use 8+ chars with an uppercase letter, a number, and a symbol.';
    UI.toast('Your password has been updated.', 'success', 'Password changed');
  });
})();
