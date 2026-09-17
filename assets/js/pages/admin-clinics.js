/* Institute Admin — Clinics Directory */
(function () {
  'use strict';
  var session = Auth.requireAuth('admin');
  if (!session) return;
  UI.mountChrome(session);

  var STATUS_BADGE = { 'Active': 'badge-success', 'On Leave': 'badge-warning', 'Inactive': 'badge-neutral' };

  function genClinicCode() {
    var code;
    do { code = 'CLN-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
    while (Store.all('clinics').some(function (c) { return c.code === code; }));
    return code;
  }

  function copyCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(
        function () { UI.toast('Clinic code ' + code + ' copied to clipboard.', 'success', 'Copied'); },
        function () { UI.toast('Clinic code: ' + code, 'info', 'Clinic code'); }
      );
    } else { UI.toast('Clinic code: ' + code, 'info', 'Clinic code'); }
  }

  function renderClinics() {
    var host = document.getElementById('clinics-body');
    var clinics = Store.all('clinics');
    if (!clinics.length) {
      host.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">domain</span><p>No clinics yet. Enroll one to generate its clinic code.</p></div></td></tr>';
      return;
    }
    host.innerHTML = clinics.map(function (c) {
      return '<tr>' +
        '<td class="cell-title">' + UI.esc(c.name) + '</td>' +
        '<td>' + UI.esc(c.specialty) + '</td>' +
        '<td><button class="chip selectable" data-code="' + UI.esc(c.code) + '" title="Copy clinic code" style="font-family:monospace"><span class="material-symbols-outlined">content_copy</span>' + UI.esc(c.code) + '</button></td>' +
        '<td>' + UI.esc(c.address || '\u2014') + '</td>' +
        '<td class="num">' + (c.staffCount || 0) + '</td>' +
        '<td><span class="badge ' + (STATUS_BADGE[c.status] || 'badge-neutral') + '"><span class="dot"></span>' + UI.esc(c.status) + '</span></td>' +
      '</tr>';
    }).join('');
    host.querySelectorAll('[data-code]').forEach(function (b) {
      b.addEventListener('click', function () { copyCode(b.getAttribute('data-code')); });
    });
  }

  var form = document.getElementById('enroll-form');
  document.getElementById('btn-enroll').addEventListener('click', function () {
    form.reset();
    document.getElementById('en-specialty').value = 'Cardiology';
    UI.clearErrors(form);
    UI.openModal('enroll-modal');
  });

  UI.liveClear(form);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(form)) return;
    var name = document.getElementById('en-name').value.trim();
    var code = genClinicCode();
    Store.insert('clinics', {
      name: name,
      specialty: document.getElementById('en-specialty').value,
      address: document.getElementById('en-address').value.trim(),
      code: code,
      status: 'Active', staffCount: 0
    });
    UI.closeModal('enroll-modal');
    UI.toast(name + ' enrolled. Clinic code: ' + code + ' \u2014 share it with your doctors and staff.', 'success', 'Clinic added');
    renderClinics();
  });

  renderClinics();
})();
