/* Forgot Password — Step 2: set new password */
(function () {
  'use strict';
  var email = sessionStorage.getItem('medibridge.recoverEmail');
  if (!email) { location.replace('forgot-password-questions.html'); return; }
  document.getElementById('acct-email').textContent = email;

  var form = document.getElementById('reset-form');
  var pw = document.getElementById('new-pw');
  var strength = document.getElementById('pw-strength');
  var label = document.getElementById('pw-strength-label');

  pw.addEventListener('input', function () {
    var s = UI.passwordStrength(pw.value);
    strength.className = 'strength ' + (pw.value ? s.className : '');
    label.textContent = pw.value ? s.label + ' password' : 'Use 8+ chars with an uppercase letter, a number, and a symbol.';
  });

  UI.liveClear(form);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(form)) return;
    if (!UI.meetsPasswordPolicy(pw.value)) {
      UI.setError(pw, 'Use 8+ chars incl. uppercase, number, and symbol.');
      return;
    }
    var user = Store.all('users').find(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
    if (user) Store.update('users', user.id, { password: pw.value });
    // "Terminate other sessions" — clear any persisted session.
    if (document.getElementById('terminate').checked) Auth.clearSession();
    sessionStorage.removeItem('medibridge.recoverEmail');
    UI.toast('Password updated. Please sign in with your new password.', 'success', 'Password reset');
    setTimeout(function () { location.href = 'login.html'; }, 600);
  });
})();
