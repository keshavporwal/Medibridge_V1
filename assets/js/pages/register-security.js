/* Registration Step 2 — Security Questions */
(function () {
  'use strict';
  var pending;
  try { pending = JSON.parse(sessionStorage.getItem('medibridge.pendingReg')); } catch (e) { pending = null; }
  if (!pending) { location.replace('login.html'); return; }

  document.getElementById('acct-initials').textContent = UI.initials(pending.name);
  document.getElementById('acct-email').textContent = pending.email;
  document.getElementById('acct-role').textContent = UI.cap(pending.role);

  var form = document.getElementById('sec-form');
  UI.liveClear(form);

  function selectedText(id) {
    var sel = document.getElementById(id);
    return sel.options[sel.selectedIndex].text;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(form)) return;

    var q1 = document.getElementById('q1').value, q2 = document.getElementById('q2').value, q3 = document.getElementById('q3').value;
    var a1 = document.getElementById('a1').value, a2 = document.getElementById('a2').value, a3 = document.getElementById('a3').value;

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    Promise.all([Auth.hashAnswer(a1), Auth.hashAnswer(a2), Auth.hashAnswer(a3)]).then(function (hashes) {
      var user = {
        name: pending.name, email: pending.email, password: pending.password, role: pending.role,
        title: UI.cap(pending.role),
        securityQuestions: [
          { q: selectedText('q1'), hash: hashes[0] },
          { q: selectedText('q2'), hash: hashes[1] },
          { q: selectedText('q3'), hash: hashes[2] }
        ]
      };
      // Create the real linked record each role needs so their workspace works.
      if (pending.role === 'patient') {
        var p = Store.insert('patients', { name: pending.name, mrn: 'MRN-' + Math.floor(10000 + Math.random() * 89999), dob: '', phone: '', allergies: 'None', alerts: '' });
        user.patientId = p.id;
      } else if (pending.role === 'doctor') {
        var clinic = pending.clinicId ? Store.get('clinics', pending.clinicId) : null;
        var d = Store.insert('doctors', { name: pending.name, specialty: clinic ? clinic.specialty : 'General Medicine', clinicId: pending.clinicId || null, status: 'On Duty', nextSlot: '—' });
        user.doctorId = d.id;
        user.clinicId = pending.clinicId || null;
        if (clinic) {
          Store.insert('staff', { name: pending.name, email: pending.email, clinicId: clinic.id, role: 'Doctor', specialty: clinic.specialty, onboardDate: Store.todayISO(0), status: 'Active' });
          Store.update('clinics', clinic.id, { staffCount: (clinic.staffCount || 0) + 1 });
        }
      } else if (pending.role === 'receptionist') {
        var clinicR = pending.clinicId ? Store.get('clinics', pending.clinicId) : null;
        user.clinicId = pending.clinicId || null;
        if (clinicR) {
          Store.insert('staff', { name: pending.name, email: pending.email, clinicId: clinicR.id, role: 'Receptionist', specialty: 'Front Desk', onboardDate: Store.todayISO(0), status: 'Active' });
          Store.update('clinics', clinicR.id, { staffCount: (clinicR.staffCount || 0) + 1 });
        }
      }
      var created = Store.insert('users', user);
      sessionStorage.removeItem('medibridge.pendingReg');
      Auth.setSession(created, false);
      UI.toast('Account setup complete. Welcome to MediBridge!', 'success', 'Enrolled');
      setTimeout(function () { location.href = Auth.homeFor(created.role); }, 500);
    });
  });
})();
