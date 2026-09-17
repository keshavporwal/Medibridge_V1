/* Login / Registration page behaviour */
(function () {
  'use strict';

  var ROLE_META = {
    patient: {
      img: 'img-patient', label: 'Patient', badge: 'Patient Health Portal',
      headline: 'Your care journey and health vault, in one place.',
      sub: 'Encrypted record access, appointment requests, and continuous care timelines coordinated with your care team.'
    },
    doctor: {
      img: 'img-doctor', label: 'Doctor', badge: 'Clinical Workspace',
      headline: 'Your daily roster, schedule, and patient records — focused.',
      sub: 'A distraction-free bento workspace for consultations, scheduling, and privacy-preserving document requests.'
    },
    receptionist: {
      img: 'img-receptionist', label: 'Front Desk', badge: 'Intake & Triage',
      headline: 'Smart triage and scheduling for a smoother front desk.',
      sub: 'Review appointment requests, match them to live doctor availability, and confirm visits in a single click.'
    },
    admin: {
      img: 'img-admin', label: 'Administrator', badge: 'Admin Operations',
      headline: 'Govern your clinical network with clarity and control.',
      sub: 'Oversee enrolled clinics, staff onboarding, and aggregate patient volume across your clinics.'
    }
  };

  var state = { role: 'patient', mode: 'signin' };

  var els = {
    roleSwitch: document.getElementById('role-switch'),
    signinForm: document.getElementById('signin-form'),
    registerForm: document.getElementById('register-form'),
    tabSignin: document.getElementById('tab-signin'),
    tabRegister: document.getElementById('tab-register'),
    visualBadge: document.getElementById('visual-badge'),
    visualHeadline: document.getElementById('visual-headline'),
    visualSub: document.getElementById('visual-sub'),
    siEmail: document.getElementById('si-email'),
    siPassword: document.getElementById('si-password'),
    adminPortal: document.getElementById('admin-portal'),
    adminBanner: document.getElementById('admin-banner'),
    roleField: document.getElementById('role-field'),
    loginCard: document.getElementById('login-card'),
    authTabs: document.getElementById('auth-tabs'),
    signinTitle: document.getElementById('signin-title')
  };

  function applyRole(role) {
    state.role = role;
    var meta = ROLE_META[role];
    // role buttons
    els.roleSwitch.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-role') === role);
    });
    // visual
    document.querySelectorAll('.auth-visual img').forEach(function (img) {
      img.classList.toggle('active', img.id === meta.img);
    });
    els.visualBadge.textContent = meta.badge;
    els.visualHeadline.textContent = meta.headline;
    els.visualSub.textContent = meta.sub;
    updateAdminMode(role === 'admin');
    // Doctors and staff link to a clinic via its code during registration.
    var cf = document.getElementById('rg-clinic-field');
    if (cf) cf.classList.toggle('hidden', !(role === 'doctor' || role === 'receptionist'));
  }

  // Distinct treatment for the Admin portal.
  function updateAdminMode(isAdmin) {
    els.loginCard.classList.toggle('admin-mode', isAdmin);
    els.adminBanner.classList.toggle('hidden', !isAdmin);
    els.roleField.classList.toggle('hidden', isAdmin);
    els.authTabs.classList.toggle('hidden', isAdmin); // admins cannot self-register — sign in only
    els.signinTitle.textContent = isAdmin ? 'Administrator sign-in' : 'Welcome back';
    els.adminPortal.innerHTML = isAdmin
      ? '\u2190 Back to staff & patient sign-in'
      : 'Admin? Sign in here \u2192';
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabSignin.classList.toggle('active', mode === 'signin');
    els.tabRegister.classList.toggle('active', mode === 'register');
    els.signinForm.classList.toggle('hidden', mode !== 'signin');
    els.registerForm.classList.toggle('hidden', mode !== 'register');
  }

  // Role selection
  els.roleSwitch.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-role]');
    if (btn) applyRole(btn.getAttribute('data-role'));
  });

  els.tabSignin.addEventListener('click', function () { setMode('signin'); });
  els.tabRegister.addEventListener('click', function () { setMode('register'); });

  els.adminPortal.addEventListener('click', function (e) {
    e.preventDefault();
    var goAdmin = state.role !== 'admin';
    applyRole(goAdmin ? 'admin' : 'patient');
    setMode('signin');
    // Default admin is seeded (not self-registered) — prefill its credentials.
    if (goAdmin) { els.siEmail.value = 'admin@medibridge.health'; els.siPassword.value = 'Admin@123'; UI.clearError(els.siEmail); UI.clearError(els.siPassword); }
    else { els.siEmail.value = ''; els.siPassword.value = ''; }
    els.siEmail.focus();
  });

  // Sign in
  UI.liveClear(els.signinForm);
  els.signinForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(els.signinForm)) return;
    var res = Auth.login(els.siEmail.value.trim(), els.siPassword.value, state.role);
    if (!res.ok) {
      UI.setError(res.error.toLowerCase().indexOf('password') > -1 ? els.siPassword : els.siEmail, res.error);
      UI.toast(res.error, 'error', 'Sign-in failed');
      return;
    }
    Auth.setSession(res.user, document.getElementById('si-remember').checked);
    UI.toast('Welcome back, ' + res.user.name.split(' ')[0] + '.', 'success', 'Signed in');
    setTimeout(function () { location.href = Auth.homeFor(res.user.role); }, 350);
  });

  // Register: password strength
  var rgPw = document.getElementById('rg-password');
  var strength = document.getElementById('rg-strength');
  var strengthLabel = document.getElementById('rg-strength-label');
  rgPw.addEventListener('input', function () {
    var s = UI.passwordStrength(rgPw.value);
    strength.className = 'strength ' + (rgPw.value ? s.className : '');
    strengthLabel.textContent = rgPw.value ? s.label + ' password' : 'Use 8+ chars with an uppercase letter, a number, and a symbol.';
  });

  UI.liveClear(els.registerForm);
  els.registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(els.registerForm)) return;
    var email = document.getElementById('rg-email').value.trim();
    var pw = rgPw.value;
    if (!UI.meetsPasswordPolicy(pw)) {
      UI.setError(rgPw, 'Use 8+ chars incl. uppercase, number, and symbol.');
      return;
    }
    if (Store.all('users').some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
      UI.setError(document.getElementById('rg-email'), 'An account with this email already exists.');
      return;
    }
    // Stash pending registration for the security-questions step.
    var pending = {
      name: document.getElementById('rg-name').value.trim(),
      email: email, password: pw,
      role: state.role
    };
    // Doctors and staff must supply a valid clinic code to be mapped to a clinic.
    if (state.role === 'doctor' || state.role === 'receptionist') {
      var codeEl = document.getElementById('rg-clinic');
      var code = codeEl.value.trim();
      if (!code) { UI.setError(codeEl, 'Clinic code is required.'); return; }
      var clinic = Store.all('clinics').find(function (c) { return (c.code || '').toUpperCase() === code.toUpperCase(); });
      if (!clinic) { UI.setError(codeEl, 'No clinic found for that code. Check with your administrator.'); return; }
      pending.clinicId = clinic.id;
    }
    sessionStorage.setItem('medibridge.pendingReg', JSON.stringify(pending));
    location.href = 'register-security-questions.html';
  });

  applyRole('patient');
  setMode('signin');
})();
