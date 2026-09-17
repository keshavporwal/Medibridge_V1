/* Receptionist — Patient Directory */
(function () {
  'use strict';
  var session = Auth.requireAuth('receptionist');
  if (!session) return;
  UI.mountChrome(session);

  var input = document.getElementById('search');

  function nextVisit(patientId) {
    var today = Store.todayISO(0);
    return Store.where('appointments', function (a) { return a.patientId === patientId && a.date >= today && a.status !== 'Cancelled'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0] || null;
  }

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
      var next = nextVisit(p.id);
      var total = Store.where('appointments', function (a) { return a.patientId === p.id; }).length;
      var nextCell = next
        ? UI.fmtDate(next.date) + ' ' + UI.fmtTime(next.time) + '<div class="cell-sub">' + UI.esc(next.doctorName) + '</div>'
        : '<span class="badge badge-neutral">None scheduled</span>';
      return '<tr>' +
        '<td><div class="cell-user"><span class="avatar">' + UI.initials(p.name) + '</span>' +
          '<div><div class="cell-title">' + UI.esc(p.name) + '</div></div></div></td>' +
        '<td>' + UI.esc(p.mrn || '—') + '</td>' +
        '<td>' + UI.esc(p.phone || '—') + '</td>' +
        '<td>' + nextCell + '</td>' +
        '<td class="num">' + total + '</td>' +
      '</tr>';
    }).join('');
  }

  input.addEventListener('input', function () { render(input.value); });
  render('');
})();
