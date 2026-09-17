/* Receptionist Dashboard — intake triage & scheduling */
(function () {
  'use strict';
  var session = Auth.requireAuth('receptionist');
  if (!session) return;
  UI.mountChrome(session);

  var SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  function slotOptions(selected) {
    return SLOTS.map(function (s) {
      return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + UI.fmtTime(s) + '</option>';
    }).join('');
  }
  function doctorOptions(selectedId) {
    return Store.all('doctors').map(function (d) {
      return '<option value="' + d.id + '"' + (d.id === selectedId ? ' selected' : '') + '>' + UI.esc(d.name) + ' — ' + UI.esc(d.specialty) + '</option>';
    }).join('');
  }

  /* ---------- KPIs & tables --------------------------------------------- */
  function renderKPIs() {
    var today = Store.todayISO(0);
    document.getElementById('kpi-today').textContent = Store.where('appointments', function (a) { return a.date === today && a.status !== 'Cancelled'; }).length;
    var pending = Store.where('appointmentRequests', function (r) { return r.status === 'Pending'; }).length;
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-oncall').textContent = Store.where('doctors', function (d) { return d.status === 'On Duty'; }).length;
    var badge = document.getElementById('notif-count');
    badge.textContent = pending; badge.classList.toggle('hidden', pending === 0);
  }

  function renderRequests() {
    var reqs = Store.where('appointmentRequests', function (r) { return r.status === 'Pending'; });
    var body = document.getElementById('requests-body');
    if (!reqs.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No pending requests. You are all caught up.</p></div></td></tr>';
      return;
    }
    body.innerHTML = reqs.map(function (r) {
      return '<tr>' +
        '<td><div class="cell-user"><span class="avatar">' + UI.esc(UI.initials(r.patientName)) + '</span>' +
          '<div><div class="cell-title">' + UI.esc(r.patientName) + '</div><div class="cell-sub">' + UI.esc(r.mrn || '') + '</div></div></div></td>' +
        '<td>' + UI.esc(r.doctorName) + '</td>' +
        '<td>' + UI.fmtDate(r.preferredDate) + '<div class="cell-sub">' + UI.esc(r.window) + ' • ' + UI.esc(r.type) + '</div></td>' +
        '<td>' + UI.esc(r.reason) + '</td>' +
        '<td class="num"><button class="btn btn-primary btn-sm" data-schedule="' + r.id + '">Review</button></td>' +
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-schedule]').forEach(function (b) {
      b.addEventListener('click', function () { openSchedule(b.getAttribute('data-schedule')); });
    });
  }

  function renderRoster() {
    var host = document.getElementById('doctor-roster');
    host.innerHTML = Store.all('doctors').map(function (d) {
      var on = d.status === 'On Duty';
      return '<div class="list-row"><div class="list-main">' +
        '<div class="list-title body-sm">' + UI.esc(d.name) + '</div>' +
        '<div class="list-sub">' + UI.esc(d.specialty) + ' • next ' + UI.esc(d.nextSlot) + '</div></div>' +
        '<div class="col gap-xs" style="align-items:flex-end">' +
        '<span class="badge ' + (on ? 'badge-success' : 'badge-neutral') + '"><span class="dot"></span>' + UI.esc(d.status) + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-docsched="' + d.id + '">Schedule</button></div></div>';
    }).join('');
    host.querySelectorAll('[data-docsched]').forEach(function (b) {
      b.addEventListener('click', function () { openDocSchedule(b.getAttribute('data-docsched')); });
    });
  }

  function renderToday() {
    var today = Store.todayISO(0);
    document.getElementById('today-label').textContent = UI.fmtDate(today);
    var appts = Store.where('appointments', function (a) { return a.date === today; })
      .sort(function (a, b) { return a.time.localeCompare(b.time); });
    var body = document.getElementById('today-body');
    if (!appts.length) { body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">event_busy</span><p>Nothing scheduled today yet.</p></div></td></tr>'; return; }
    body.innerHTML = appts.map(function (a) {
      return '<tr><td class="strong">' + UI.fmtTime(a.time) + '</td><td>' + UI.esc(a.patientName) + '</td>' +
        '<td>' + UI.esc(a.mrn || '') + '</td><td>' + UI.esc(a.doctorName) + '</td>' +
        '<td><span class="badge ' + (a.type === 'Telehealth' ? 'badge-info' : 'badge-neutral') + '">' + UI.esc(a.type) + '</span></td>' +
        '<td><span class="badge badge-success"><span class="dot"></span>' + UI.esc(a.status) + '</span></td></tr>';
    }).join('');
  }

  /* ---------- Review & Schedule modal ----------------------------------- */
  var schedForm = document.getElementById('schedule-form');
  var activeReq = null;
  function openSchedule(reqId) {
    var r = Store.get('appointmentRequests', reqId);
    if (!r) return;
    activeReq = r;
    document.getElementById('sched-avatar').textContent = UI.initials(r.patientName);
    document.getElementById('sched-patient').textContent = r.patientName;
    document.getElementById('sched-mrn').textContent = r.mrn || '';
    document.getElementById('sched-window').textContent = r.window;
    document.getElementById('sched-reason').textContent = r.reason;
    document.getElementById('sched-preferred').textContent = UI.fmtDate(r.preferredDate) + ' • ' + r.window + ' • ' + r.type;
    document.getElementById('sched-doctor').innerHTML = doctorOptions(r.doctorId);
    document.getElementById('sched-type').value = r.type || 'In-person';
    var dateEl = document.getElementById('sched-date');
    dateEl.min = Store.todayISO(0);
    dateEl.value = r.preferredDate;
    document.getElementById('sched-time').innerHTML = slotOptions(r.window === 'Afternoon' ? '13:00' : '09:00');
    UI.clearErrors(schedForm);
    UI.openModal('schedule-modal');
  }

  UI.liveClear(schedForm);
  schedForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(schedForm)) return;
    var doctor = Store.get('doctors', document.getElementById('sched-doctor').value);
    Store.insert('appointments', {
      patientId: activeReq.patientId, patientName: activeReq.patientName, mrn: activeReq.mrn,
      doctorId: doctor.id, doctorName: doctor.name,
      date: document.getElementById('sched-date').value,
      time: document.getElementById('sched-time').value,
      type: document.getElementById('sched-type').value,
      reason: activeReq.reason, status: 'Scheduled'
    });
    Store.update('appointmentRequests', activeReq.id, { status: 'Scheduled' });
    UI.closeModal('schedule-modal');
    UI.toast(activeReq.patientName + ' booked with ' + doctor.name + '.', 'success', 'Appointment scheduled');
    renderAll();
  });

  /* ---------- Doctor schedule (read-only) modal ------------------------- */
  function openDocSchedule(docId) {
    var doc = Store.get('doctors', docId);
    var week = Store.getAvailability(docId);
    document.getElementById('docsched-title').textContent = doc.name;
    document.getElementById('docsched-sub').textContent = doc.specialty + ' • weekly availability';
    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    document.getElementById('docsched-body').innerHTML = days.map(function (d) {
      var slot = week[d];
      if (!slot || !slot.active) return '<tr><td class="strong">' + d + '</td><td class="muted">—</td><td class="muted">—</td><td><span class="badge badge-neutral">Off</span></td></tr>';
      return '<tr><td class="strong">' + d + '</td>' +
        '<td>' + UI.fmtTime(slot.start) + ' – ' + UI.fmtTime(slot.end) + '</td>' +
        '<td>' + (slot.lunch ? UI.esc(slot.lunch) : '—') + '</td>' +
        '<td><span class="badge badge-success"><span class="dot"></span>On</span></td></tr>';
    }).join('');
    UI.openModal('docsched-modal');
  }

  document.getElementById('notif-btn').addEventListener('click', function () {
    document.getElementById('requests-body').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- KPI insight popovers ---------------------------------------- */
  function bindKPIInsights() {
    document.getElementById('kpi-card-today').addEventListener('click', function (e) {
      var today = Store.todayISO(0);
      var appts = Store.where('appointments', function (a) { return a.date === today && a.status !== 'Cancelled'; })
        .sort(function (a, b) { return a.time.localeCompare(b.time); });
      var html = appts.length
        ? appts.map(function (a) {
            return '<div class="insight-row"><span class="k">' + UI.fmtTime(a.time) + ' \u2014 ' + UI.esc(a.patientName) + '</span><span class="v muted">' + UI.esc(a.doctorName) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">Nothing scheduled today yet.</div>';
      UI.showInsight(e.currentTarget, { icon: 'event_available', title: 'Scheduled Today', html: html });
    });

    document.getElementById('kpi-card-pending').addEventListener('click', function (e) {
      var reqs = Store.where('appointmentRequests', function (r) { return r.status === 'Pending'; });
      var html = reqs.length
        ? reqs.map(function (r) {
            return '<div class="insight-row"><span class="k">' + UI.esc(r.patientName) + '</span><span class="v muted">' + UI.esc(r.doctorName) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No pending requests. You are all caught up.</div>';
      UI.showInsight(e.currentTarget, { icon: 'pending_actions', title: 'Pending Appointment Requests', html: html });
    });

    document.getElementById('kpi-card-oncall').addEventListener('click', function (e) {
      var doctors = Store.all('doctors');
      var onDuty = doctors.filter(function (d) { return d.status === 'On Duty'; });
      var html = onDuty.length
        ? onDuty.map(function (d) {
            return '<div class="insight-row"><span class="k">' + UI.esc(d.name) + '</span><span class="v muted">' + UI.esc(d.specialty) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No doctors currently on duty.</div>';
      UI.showInsight(e.currentTarget, { icon: 'stethoscope', title: 'Doctors On Duty', html: html });
    });
  }

  function renderAll() { renderKPIs(); renderRequests(); renderRoster(); renderToday(); }
  renderAll();
  bindKPIInsights();
})();
