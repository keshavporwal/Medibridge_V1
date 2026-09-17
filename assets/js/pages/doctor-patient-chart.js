/* Doctor — Patient Clinical Chart */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);

  var params = new URLSearchParams(location.search);
  var patientId = params.get('patient');
  var patient = patientId ? Store.get('patients', patientId) : null;
  if (!patient) { UI.toast('Patient not found.', 'error', 'Error'); setTimeout(function () { location.href = 'doctor-dashboard.html'; }, 1000); return; }

  /* ---------- Header + summary ------------------------------------------ */
  document.getElementById('pt-initials').textContent = UI.initials(patient.name);
  document.getElementById('pt-name').textContent = patient.name;
  document.getElementById('pt-mrn').textContent = patient.mrn || '—';
  document.getElementById('pt-dob').textContent = patient.dob ? UI.fmtDate(patient.dob) : 'DOB —';
  var allergyEl = document.getElementById('pt-allergy');
  if (patient.allergies && patient.allergies !== 'None') allergyEl.innerHTML = '<span class="dot"></span>' + UI.esc(patient.allergies);
  else allergyEl.classList.add('hidden');
  var alertEl = document.getElementById('pt-alert');
  if (patient.alerts) alertEl.innerHTML = '<span class="dot"></span>' + UI.esc(patient.alerts);
  else alertEl.classList.add('hidden');

  document.getElementById('summary').innerHTML = [
    ['Allergies', patient.allergies || 'None recorded'],
    ['Care alerts', patient.alerts || 'None'],
    ['Phone', patient.phone || '—'],
    ['MRN', patient.mrn || '—']
  ].map(function (r) {
    return '<div class="list-row"><div class="list-main"><div class="list-sub">' + r[0] + '</div><div class="list-title body-sm">' + UI.esc(r[1]) + '</div></div></div>';
  }).join('');

  /* ---------- Shared documents ------------------------------------------ */
  function renderShared() {
    var grants = Store.where('accessGrants', function (g) { return g.doctorId === session.doctorId && g.patientId === patientId; });
    var host = document.getElementById('shared-docs');
    if (!grants.length) {
      host.innerHTML = '<div class="notice"><span class="material-symbols-outlined">lock</span><p class="body-sm muted">No records shared yet. Send a document request; the patient controls what you can see.</p></div>';
      return;
    }
    var html = '';
    grants.forEach(function (g) {
      g.documentIds.forEach(function (id) {
        var d = Store.get('documents', id);
        if (!d) return;
        html += '<div class="list-row"><span class="material-symbols-outlined text-primary">description</span>' +
          '<div class="list-main"><div class="list-title body-sm">' + UI.esc(d.name) + '</div>' +
          '<div class="list-sub">' + UI.esc(d.type) + ' • access ' + UI.esc(g.duration) + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-preview="' + d.id + '" title="Preview"><span class="material-symbols-outlined">visibility</span></button></div>';
      });
    });
    host.innerHTML = html;
    host.querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Store.get('documents', b.getAttribute('data-preview'));
        if (d) DocPreview.open(d);
      });
    });
  }

  /* ---------- History ---------------------------------------------------- */
  function renderHistory() {
    var today = Store.todayISO(0);
    var appts = Store.where('appointments', function (a) { return a.patientId === patientId; })
      .sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    var notes = Store.where('visitNotes', function (n) { return n.patientId === patientId; });
    var host = document.getElementById('history');
    var items = [];
    appts.forEach(function (a) {
      items.push({ date: a.date, time: a.time, title: a.reason, sub: a.doctorName + ' • ' + a.type + ' • ' + UI.fmtTime(a.time), done: a.date < today });
    });
    notes.forEach(function (n) {
      items.push({ date: n.date, time: '23:59', title: 'Consultation note', sub: n.author + ' — ' + n.text, done: true, note: true });
    });
    items.sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    if (!items.length) { host.innerHTML = '<p class="muted body-sm">No consultation history.</p>'; return; }
    host.innerHTML = items.map(function (it) {
      return '<div class="timeline-item ' + (it.done ? 'done' : 'upcoming') + '">' +
        '<div class="row-between"><span class="strong">' + UI.esc(it.title) + '</span><span class="label-md muted">' + UI.fmtDate(it.date) + '</span></div>' +
        '<div class="body-sm muted">' + UI.esc(it.sub) + '</div></div>';
    }).join('');
  }

  /* ---------- Document request modal ------------------------------------ */
  var drForm = document.getElementById('docreq-form');
  document.getElementById('dr-patient-label').value = patient.name + ' — ' + (patient.mrn || '');
  document.getElementById('btn-docrequest').addEventListener('click', function () {
    document.getElementById('dr-message').value = '';
    UI.clearErrors(drForm);
    UI.openModal('docreq-modal');
  });
  UI.liveClear(drForm);
  drForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(drForm)) return;
    Store.insert('documentRequests', {
      doctorId: session.doctorId, doctorName: session.name,
      patientId: patientId, patientName: patient.name,
      message: document.getElementById('dr-message').value.trim(),
      status: 'Pending', createdAt: Date.now()
    });
    UI.closeModal('docreq-modal');
    UI.toast('Document request sent to ' + patient.name + '.', 'success', 'Request sent');
  });

  /* ---------- Log note --------------------------------------------------- */
  var noteForm = document.getElementById('note-form');
  document.getElementById('btn-note').addEventListener('click', function () {
    document.getElementById('note-text').focus();
  });
  UI.liveClear(noteForm);
  noteForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(noteForm)) return;
    Store.insert('visitNotes', {
      patientId: patientId, author: session.name,
      text: document.getElementById('note-text').value.trim(), date: Store.todayISO(0)
    });
    document.getElementById('note-text').value = '';
    UI.toast('Consultation note saved to the record.', 'success', 'Note logged');
    renderHistory();
  });

  renderShared(); renderHistory();
})();
