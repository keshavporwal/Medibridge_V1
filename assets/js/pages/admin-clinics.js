/* Admin — Clinics Directory */
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

  var searchInput = document.getElementById('search-clinics');
  var statusFilter = document.getElementById('status-filter');
  var pageInfo = document.getElementById('page-info');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');

  var currentPage = 1;
  var pageSize = 5;

  function renderClinics() {
    var host = document.getElementById('clinics-body');
    var term = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var filter = statusFilter ? statusFilter.value : 'all';

    var clinics = Store.all('clinics').filter(function (c) {
      var matchesSearch = !term || c.name.toLowerCase().indexOf(term) > -1 || (c.code || '').toLowerCase().indexOf(term) > -1;
      var matchesFilter = filter === 'all' || c.status === filter;
      return matchesSearch && matchesFilter;
    });

    var totalItems = clinics.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * pageSize;
    var pagedClinics = clinics.slice(start, start + pageSize);

    if (pageInfo) {
      pageInfo.textContent = totalItems ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, totalItems) + ' of ' + totalItems : 'Showing 0 of 0';
    }
    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages;

    if (!pagedClinics.length) {
      host.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">domain</span><p>' +
        (term || filter !== 'all' ? 'No clinics match your filter.' : 'No clinics yet. Enroll one to generate its clinic code.') + '</p></div></td></tr>';
      return;
    }
    host.innerHTML = pagedClinics.map(function (c) {
      return '<tr>' +
        '<td class="cell-title">' + UI.esc(c.name) + '</td>' +
        '<td>' + UI.esc(c.specialty) + '</td>' +
        '<td><button class="chip selectable" data-code="' + UI.esc(c.code) + '" title="Copy clinic code" style="font-family:monospace"><span class="material-symbols-outlined">content_copy</span>' + UI.esc(c.code) + '</button></td>' +
        '<td>' + UI.esc(c.address || '\u2014') + '</td>' +
        '<td class="num">' + (c.staffCount || 0) + '</td>' +
        '<td><span class="badge ' + (STATUS_BADGE[c.status] || 'badge-neutral') + '"><span class="dot"></span>' + UI.esc(c.status) + '</span></td>' +
        '<td class="num"><button class="btn btn-ghost btn-sm text-danger" data-offboard="' + c.id + '" title="Offboard clinic"><span class="material-symbols-outlined">domain_disabled</span></button></td>' +
      '</tr>';
    }).join('');
    host.querySelectorAll('[data-code]').forEach(function (b) {
      b.addEventListener('click', function () { copyCode(b.getAttribute('data-code')); });
    });
    host.querySelectorAll('[data-offboard]').forEach(function (b) {
      b.addEventListener('click', function () { openOffboard(b.getAttribute('data-offboard')); });
    });
  }

  if (searchInput) searchInput.addEventListener('input', function () { currentPage = 1; renderClinics(); });
  if (statusFilter) statusFilter.addEventListener('change', function () { currentPage = 1; renderClinics(); });
  if (btnPrev) btnPrev.addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderClinics(); } });
  if (btnNext) btnNext.addEventListener('click', function () { currentPage++; renderClinics(); });

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

  var offboardForm = document.getElementById('offboard-form');
  var activeOffboardClinicId = null;

  function openOffboard(clinicId) {
    var c = Store.get('clinics', clinicId);
    if (!c) return;
    activeOffboardClinicId = clinicId;
    document.getElementById('off-clinic-name').textContent = c.name;
    document.getElementById('off-confirm').checked = false;
    document.getElementById('off-error').style.display = 'none';
    UI.openModal('offboard-modal');
  }

  if (offboardForm) {
    offboardForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = document.getElementById('off-error');
      if (!document.getElementById('off-confirm').checked) {
        err.textContent = 'Please confirm facility offboarding to proceed.';
        err.style.display = 'block';
        return;
      }
      err.style.display = 'none';
      var c = Store.get('clinics', activeOffboardClinicId);
      if (c) {
        Store.remove('clinics', activeOffboardClinicId);
        UI.closeModal('offboard-modal');
        UI.toast(c.name + ' has been offboarded and removed.', 'success', 'Clinic Offboarded');
        renderClinics();
      }
    });
  }

  renderClinics();
})();
