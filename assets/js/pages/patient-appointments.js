/* Patient Appointments — month calendar + request */
(function () {
  'use strict';
  var session = Auth.requireAuth('patient');
  if (!session) return;
  UI.mountChrome(session);
  var patientId = session.patientId;
  var patient = Store.get('patients', patientId) || { name: session.name, mrn: '' };

  var view = new Date(); view.setDate(1);
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function myAppointments() {
    return Store.where('appointments', function (a) { return a.patientId === patientId; });
  }

  /* ---------- Calendar --------------------------------------------------- */
  function renderCalendar() {
    document.getElementById('cal-title').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    var year = view.getFullYear(), month = view.getMonth();
    var first = new Date(year, month, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayISO = Store.todayISO(0);

    var byDate = {};
    myAppointments().forEach(function (a) { (byDate[a.date] = byDate[a.date] || []).push(a); });

    var cells = DOW.map(function (d) { return '<div class="cal-head">' + d + '</div>'; });
    for (var i = 0; i < startDow; i++) cells.push('<div class="cal-cell dim"></div>');
    for (var day = 1; day <= daysInMonth; day++) {
      var iso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var events = (byDate[iso] || []).sort(function (a, b) { return a.time.localeCompare(b.time); });
      var evHtml = events.map(function (e) {
        return '<span class="cal-event" title="' + UI.esc(e.doctorName + ' • ' + e.reason) + '">' + UI.fmtTime(e.time) + ' ' + UI.esc(e.doctorName.split(' ').slice(-1)[0]) + '</span>';
      }).join('');
      cells.push('<div class="cal-cell' + (iso === todayISO ? ' today' : '') + '"><span class="cal-date">' + day + '</span>' + evHtml + '</div>');
    }
    document.getElementById('calendar').innerHTML = cells.join('');
  }

  /* ---------- Side lists ------------------------------------------------- */
  function renderUpcoming() {
    var today = Store.todayISO(0);
    var items = myAppointments().filter(function (a) { return a.date >= today && a.status !== 'Cancelled'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var host = document.getElementById('upcoming-list');
    if (!items.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">event_available</span><p>No upcoming visits.</p></div>'; return; }
    host.innerHTML = items.map(function (a) {
      return '<div class="list-row"><div class="list-main"><div class="list-title body-sm">' + UI.esc(a.reason) + '</div>' +
        '<div class="list-sub">' + UI.esc(a.doctorName) + ' • ' + UI.fmtDate(a.date) + ' ' + UI.fmtTime(a.time) + '</div></div>' +
        '<span class="badge ' + (a.type === 'Telehealth' ? 'badge-info' : 'badge-primary') + '">' + UI.esc(a.type) + '</span></div>';
    }).join('');
  }

  function renderRequests() {
    var reqs = Store.where('appointmentRequests', function (r) { return r.patientId === patientId; });
    var host = document.getElementById('requests-list');
    if (!reqs.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No pending requests.</p></div>'; return; }
    host.innerHTML = reqs.map(function (r) {
      var badge = r.status === 'Pending' ? 'badge-warning' : (r.status === 'Scheduled' ? 'badge-success' : 'badge-neutral');
      return '<div class="list-row"><div class="list-main"><div class="list-title body-sm">' + UI.esc(r.reason) + '</div>' +
        '<div class="list-sub">' + UI.fmtDate(r.preferredDate) + ' • ' + UI.esc(r.window) + '</div></div>' +
        '<span class="badge ' + badge + '">' + UI.esc(r.status) + '</span></div>';
    }).join('');
  }

  document.getElementById('cal-prev').addEventListener('click', function () { view.setMonth(view.getMonth() - 1); renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click', function () { view.setMonth(view.getMonth() + 1); renderCalendar(); });
  document.getElementById('cal-today').addEventListener('click', function () { view = new Date(); view.setDate(1); renderCalendar(); });

  /* ---------- Request modal ---------------------------------------------- */
  var reqForm = document.getElementById('request-form');
  document.getElementById('btn-request').addEventListener('click', function () {
    if (!Store.all('doctors').length) { UI.toast('No clinicians are available yet. Please check back soon.', 'info', 'No clinicians'); return; }
    document.getElementById('req-doctor').innerHTML = Store.all('doctors').map(function (d, i) {
      return '<option value="' + d.id + '"' + (i === 0 ? ' selected' : '') + '>' + UI.esc(d.name) + ' — ' + UI.esc(d.specialty) + '</option>';
    }).join('');
    document.getElementById('req-date').min = Store.todayISO(0);
    document.getElementById('req-date').value = Store.todayISO(1);
    document.getElementById('req-window').value = 'Morning';
    document.getElementById('req-reason').value = '';
    document.getElementById('req-notes').value = '';
    UI.clearErrors(reqForm);
    UI.openModal('request-modal');
  });

  UI.liveClear(reqForm);
  reqForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(reqForm)) return;
    var doctor = Store.get('doctors', document.getElementById('req-doctor').value);
    Store.insert('appointmentRequests', {
      patientId: patientId, patientName: patient.name, mrn: patient.mrn,
      doctorId: doctor.id, doctorName: doctor.name,
      preferredDate: document.getElementById('req-date').value,
      window: document.getElementById('req-window').value,
      reason: document.getElementById('req-reason').value.trim(),
      notes: document.getElementById('req-notes').value.trim(),
      status: 'Pending', createdAt: Date.now()
    });
    UI.closeModal('request-modal');
    UI.toast('Your appointment request was sent to the intake desk.', 'success', 'Request submitted');
    renderRequests();
  });

  renderCalendar(); renderUpcoming(); renderRequests();
})();
