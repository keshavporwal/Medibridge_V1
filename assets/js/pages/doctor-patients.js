/* Doctor — Patient Directory */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);

  var input = document.getElementById('search');

  function render(term) {
    term = (term || '').trim().toLowerCase();
    var patients = Store.all('patients').filter(function (p) {
      return !term || p.name.toLowerCase().indexOf(term) > -1 || (p.mrn || '').toLowerCase().indexOf(term) > -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var body = document.getElementById('patients-body');
    if (!patients.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">group_off</span><p>' +
        (term ? 'No patients match your search.' : 'No patients yet. Patients appear here once they register.') + '</p></div></td></tr>';
      return;
    }
    body.innerHTML = patients.map(function (p) {
      var allergy = p.allergies && p.allergies !== 'None'
        ? '<span class="badge badge-danger"><span class="dot"></span>' + UI.esc(p.allergies) + '</span>'
        : '<span class="muted body-sm">None recorded</span>';
      return '<tr>' +
        '<td><div class="cell-user"><span class="avatar">' + UI.initials(p.name) + '</span>' +
          '<div><div class="cell-title">' + UI.esc(p.name) + '</div></div></div></td>' +
        '<td>' + UI.esc(p.mrn || '—') + '</td>' +
        '<td>' + (p.dob ? UI.fmtDate(p.dob) : '—') + '</td>' +
        '<td>' + allergy + '</td>' +
        '<td class="num"><a class="btn btn-secondary btn-sm" href="doctor-patient-chart.html?patient=' + p.id + '">Open record</a></td>' +
      '</tr>';
    }).join('');
  }

  input.addEventListener('input', function () { render(input.value); });
  render('');
})();
