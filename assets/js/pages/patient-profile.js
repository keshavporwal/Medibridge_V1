/* Patient Profile — digital ID pass */
(function () {
  'use strict';
  var session = Auth.requireAuth('patient');
  if (!session) return;
  UI.mountChrome(session);
  var patientId = session.patientId;
  var patient = Store.get('patients', patientId) || { name: session.name, mrn: '', dob: '', phone: '', allergies: '', alerts: '' };

  document.getElementById('id-mrn').textContent = patient.mrn || '—';
  document.getElementById('id-dob').textContent = patient.dob ? UI.fmtDate(patient.dob) : '—';
  document.getElementById('pf-phone').value = patient.phone || '';
  document.getElementById('pf-allergies').value = patient.allergies || '';
  document.getElementById('pf-alerts').value = patient.alerts || '';

  // Assigned clinician = doctor from the patient's most recent appointment.
  (function () {
    var appts = Store.where('appointments', function (a) { return a.patientId === patientId; })
      .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    document.getElementById('id-clinician').textContent = appts.length ? appts[0].doctorName : 'Not yet assigned';
  })();

  // The QR encodes a shareable URL to a public, read-only pass page (not raw text) —
  // scanning it opens a webpage showing the patient's current details, live from Store.
  function shareUrl() {
    return new URL('patient-share.html?pid=' + encodeURIComponent(patientId), location.href).href;
  }
  function renderQR() {
    document.getElementById('qr').innerHTML = QR.svg(shareUrl(), {
      px: 128, margin: 4, style: 'rounded',
      gradient: { from: '#0b1c30', to: '#004ac6' }   // ICQR-style branded fill
    });
    var link = document.getElementById('share-link');
    link.textContent = shareUrl();
    link.href = shareUrl();
  }
  renderQR();

  document.getElementById('checkin').addEventListener('click', function () {
    var btn = this;
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">sync</span>Transmitting pass...';
    setTimeout(function () {
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>Ready for reader';
      UI.toast('Check-in pass transmitted to the front desk.', 'success', 'Checked in');
      setTimeout(function () { btn.innerHTML = original; btn.disabled = false; }, 2500);
    }, 700);
  });

  var form = document.getElementById('profile-form');
  UI.liveClear(form);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(form)) return;
    Store.update('patients', patientId, {
      phone: document.getElementById('pf-phone').value.trim(),
      allergies: document.getElementById('pf-allergies').value.trim(),
      alerts: document.getElementById('pf-alerts').value.trim()
    });
    renderQR();
    UI.toast('Your profile was updated.', 'success', 'Saved');
  });
})();
