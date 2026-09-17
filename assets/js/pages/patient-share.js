/* Shared Patient Pass — public, read-only page opened via a scanned QR URL */
(function () {
  'use strict';

  function specialtyClinician(patientId) {
    var appts = Store.where('appointments', function (a) { return a.patientId === patientId; })
      .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    return appts.length ? appts[0].doctorName : 'Not yet assigned';
  }

  var pid = new URLSearchParams(location.search).get('pid');
  var patient = pid ? Store.get('patients', pid) : null;

  if (!patient) {
    document.getElementById('pass-notfound').classList.remove('hidden');
    return;
  }

  document.getElementById('pass-found').classList.remove('hidden');
  document.getElementById('pass-initials').textContent = UI.initials(patient.name);
  document.getElementById('pass-name').textContent = patient.name;
  document.getElementById('pass-mrn').textContent = patient.mrn || '—';
  document.getElementById('pass-dob').textContent = patient.dob ? UI.fmtDate(patient.dob) : '—';
  document.getElementById('pass-phone').textContent = patient.phone || '—';
  document.getElementById('pass-allergies').textContent = (patient.allergies && patient.allergies !== 'None') ? patient.allergies : 'None recorded';
  document.getElementById('pass-alerts').textContent = patient.alerts || 'None';
  document.getElementById('pass-clinician').textContent = specialtyClinician(patient.id);
  document.getElementById('pass-timestamp').textContent = new Date().toLocaleString();
})();
