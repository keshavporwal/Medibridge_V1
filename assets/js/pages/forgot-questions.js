/* Forgot Password — Step 1: verify 3 security questions */
(function () {
  'use strict';

  // Demo accounts (seeded) have no stored questions — use this known set so recovery is testable.
  var DEMO = [
    { q: 'What was the name of your first elementary school?', a: 'Lincoln' },
    { q: 'What was your first job title?', a: 'Resident' },
    { q: 'What was the full name of your favorite teacher?', a: 'Mrs. Bennett' }
  ];

  var emailForm = document.getElementById('email-form');
  var qForm = document.getElementById('questions-form');
  var target = null;      // { email, questions:[{q, hash?, a?}], isDemo }
  var attempts = 0;

  UI.liveClear(emailForm);
  emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(emailForm)) return;
    var email = document.getElementById('rec-email').value.trim();
    var user = Store.all('users').find(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
    if (!user) { UI.setError(document.getElementById('rec-email'), 'No account found for that email.'); return; }

    var isDemo = !(user.securityQuestions && user.securityQuestions.length === 3);
    target = { email: user.email, isDemo: isDemo, questions: isDemo ? DEMO : user.securityQuestions };

    document.getElementById('rec-initials').textContent = UI.initials(user.name);
    document.getElementById('rec-name').textContent = user.name;
    document.getElementById('rec-email-label').textContent = user.email;

    if (isDemo) {
      document.getElementById('demo-hint').classList.remove('hidden');
      document.getElementById('demo-hint-text').textContent = DEMO.map(function (d) { return d.a; }).join(' · ');
    }

    document.getElementById('questions-list').innerHTML = target.questions.map(function (item, i) {
      return '<div class="field"><label class="field-label required" for="ans-' + i + '">' + UI.esc(item.q) + '</label>' +
        '<input class="input rec-answer" id="ans-' + i + '" type="text" required autocomplete="off" placeholder="Your answer" /><span class="field-error"></span></div>';
    }).join('');

    emailForm.classList.add('hidden');
    qForm.classList.remove('hidden');
    UI.liveClear(qForm);
    document.getElementById('ans-0').focus();
  });

  qForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(qForm)) return;
    var inputs = Array.prototype.slice.call(qForm.querySelectorAll('.rec-answer'));
    var btn = document.getElementById('verify-btn');
    btn.disabled = true;

    // Hash each input and each expected answer, then compare (case-insensitive via hashAnswer).
    var checks = inputs.map(function (input, i) {
      var item = target.questions[i];
      var expected = target.isDemo ? Auth.hashAnswer(item.a) : Promise.resolve(item.hash);
      return Promise.all([Auth.hashAnswer(input.value), expected]).then(function (r) { return r[0] === r[1]; });
    });

    Promise.all(checks).then(function (results) {
      btn.disabled = false;
      if (results.every(Boolean)) {
        sessionStorage.setItem('medibridge.recoverEmail', target.email);
        UI.toast('Identity verified.', 'success', 'Verified');
        setTimeout(function () { location.href = 'forgot-password-reset.html'; }, 350);
        return;
      }
      attempts++;
      var remaining = 3 - attempts;
      if (remaining <= 0) {
        qForm.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
        document.getElementById('attempts-note').innerHTML = '<span class="text-danger strong">Account locked after 3 failed attempts. Contact your administrator.</span>';
        UI.toast('Too many failed attempts. Account locked.', 'error', 'Locked');
      } else {
        document.getElementById('attempts-note').innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;color:var(--danger)">error</span><span class="text-danger">Incorrect answers. ' + remaining + ' attempt' + (remaining > 1 ? 's' : '') + ' remaining.</span>';
        UI.toast('One or more answers were incorrect.', 'error', 'Try again');
      }
    });
  });
})();
