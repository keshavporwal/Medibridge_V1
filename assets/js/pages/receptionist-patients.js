/* Receptionist — Patient Directory */
(function () {
  'use strict';
  var session = Auth.requireAuth('receptionist');
  if (!session) return;
  UI.mountChrome(session);

  var input = document.getElementById('search');
  var pageInfo = document.getElementById('page-info');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');

  var currentPage = 1;
  var pageSize = 5;

  function nextVisit(patientId) {
    var today = Store.todayISO(0);
    return Store.where('appointments', function (a) { return a.patientId === patientId && a.date >= today && a.status !== 'Cancelled'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0] || null;
  }

  function render() {
    var term = (input.value || '').trim().toLowerCase();
    var patients = Store.all('patients').filter(function (p) {
      return !term || p.name.toLowerCase().indexOf(term) > -1 || (p.mrn || '').toLowerCase().indexOf(term) > -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    var totalItems = patients.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * pageSize;
    var pagedPatients = patients.slice(start, start + pageSize);

    if (pageInfo) {
      pageInfo.textContent = totalItems ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, totalItems) + ' of ' + totalItems : 'Showing 0 of 0';
    }
    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages;

    var body = document.getElementById('patients-body');
    if (!pagedPatients.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">group_off</span><p>' +
        (term ? 'No patients match your search.' : 'No patients yet. Patients appear here once they register.') + '</p></div></td></tr>';
      return;
    }
    body.innerHTML = pagedPatients.map(function (p) {
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

  input.addEventListener('input', function () { currentPage = 1; render(); });
  if (btnPrev) btnPrev.addEventListener('click', function () { if (currentPage > 1) { currentPage--; render(); } });
  if (btnNext) btnNext.addEventListener('click', function () { currentPage++; render(); });

  render();
})();
