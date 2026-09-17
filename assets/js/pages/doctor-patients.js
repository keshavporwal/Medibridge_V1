/* Doctor — Patient Directory */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);

  var input = document.getElementById('search');
  var allergyFilter = document.getElementById('allergy-filter');
  var pageInfo = document.getElementById('page-info');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');

  var currentPage = 1;
  var pageSize = 5;

  function render() {
    var term = (input.value || '').trim().toLowerCase();
    var filter = allergyFilter.value;

    var patients = Store.all('patients').filter(function (p) {
      var matchesSearch = !term || p.name.toLowerCase().indexOf(term) > -1 || (p.mrn || '').toLowerCase().indexOf(term) > -1;
      var hasAllergy = p.allergies && p.allergies !== 'None';
      var matchesFilter = true;
      if (filter === 'has_allergies') matchesFilter = hasAllergy;
      if (filter === 'no_allergies') matchesFilter = !hasAllergy;
      return matchesSearch && matchesFilter;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    var totalItems = patients.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * pageSize;
    var pagedPatients = patients.slice(start, start + pageSize);

    pageInfo.textContent = totalItems ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, totalItems) + ' of ' + totalItems : 'Showing 0 of 0';
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;

    var body = document.getElementById('patients-body');
    if (!pagedPatients.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">group_off</span><p>' +
        (term || filter !== 'all' ? 'No patients match your search/filter.' : 'No patients yet. Patients appear here once they register.') + '</p></div></td></tr>';
      return;
    }
    body.innerHTML = pagedPatients.map(function (p) {
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

  input.addEventListener('input', function () { currentPage = 1; render(); });
  allergyFilter.addEventListener('change', function () { currentPage = 1; render(); });
  btnPrev.addEventListener('click', function () { if (currentPage > 1) { currentPage--; render(); } });
  btnNext.addEventListener('click', function () { currentPage++; render(); });

  render();
})();
