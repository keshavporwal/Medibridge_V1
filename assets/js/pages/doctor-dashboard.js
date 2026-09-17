/* Doctor Clinical Workspace */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);

  var doctorId = session.doctorId;
  var doctorName = session.name;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function myAppts(dateFilter) {
    return Store.where('appointments', function (a) {
      return a.doctorId === doctorId && (!dateFilter || a.date === dateFilter);
    }).sort(function (a, b) { return a.time.localeCompare(b.time); });
  }

  /* ---------- KPIs ------------------------------------------------------- */
  function renderKPIs() {
    var today = Store.todayISO(0);
    var todays = myAppts(today);
    document.getElementById('kpi-patients').textContent = todays.length;
    var pending = Store.where('documentRequests', function (d) { return d.doctorId === doctorId && d.status === 'Pending'; }).length;
    document.getElementById('kpi-docpending').textContent = pending;
    document.getElementById('kpi-shared').textContent = Store.where('accessGrants', function (g) { return g.doctorId === doctorId; }).length;
    // "Next appointment" looks across all upcoming dates, not just today, so a visit
    // booked for tomorrow (the default) still shows here instead of appearing empty.
    var next = Store.where('appointments', function (a) { return a.doctorId === doctorId && a.date >= today && a.status !== 'Cancelled'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0];
    document.getElementById('kpi-next').textContent = next ? (next.date === today ? UI.fmtTime(next.time) : UI.fmtDateShort(next.date) + ', ' + UI.fmtTime(next.time)) : '—';
    document.getElementById('today-label').textContent = "Today's roster and schedule • " + UI.fmtDate(today);
    var count = pending;
    var badge = document.getElementById('notif-count');
    badge.textContent = count; badge.classList.toggle('hidden', count === 0);
  }

  /* ---------- Roster ----------------------------------------------------- */
  function nextUpcoming() {
    var today = Store.todayISO(0);
    return Store.where('appointments', function (a) { return a.doctorId === doctorId && a.date > today && a.status !== 'Cancelled'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0] || null;
  }
  function emptyRosterHint() {
    var next = nextUpcoming();
    if (!next) return '<p>No patients scheduled today.</p>';
    return '<p>No patients scheduled today.</p>' +
      '<p class="body-sm">Next up: <span class="strong">' + UI.esc(next.patientName) + '</span> — ' +
      UI.fmtDateShort(next.date) + ' at ' + UI.fmtTime(next.time) + '. <a href="doctor-schedule-weekly.html">View weekly schedule</a></p>';
  }
  function renderRoster() {
    var today = Store.todayISO(0);
    var appts = myAppts(today);
    document.getElementById('roster-count').textContent = appts.length + ' scheduled';
    var body = document.getElementById('roster-body');
    if (!appts.length) { body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">event_busy</span>' + emptyRosterHint() + '</div></td></tr>'; return; }
    body.innerHTML = appts.map(function (a) {
      return '<tr><td class="strong">' + UI.fmtTime(a.time) + '</td>' +
        '<td><div class="cell-user"><span class="avatar">' + UI.initials(a.patientName) + '</span>' +
          '<div><div class="cell-title">' + UI.esc(a.patientName) + '</div><div class="cell-sub">' + UI.esc(a.mrn || '') + '</div></div></div></td>' +
        '<td><span class="badge ' + (a.type === 'Telehealth' ? 'badge-info' : 'badge-neutral') + '">' + UI.esc(a.type) + '</span></td>' +
        '<td>' + UI.esc(a.reason) + '</td>' +
        '<td class="num"><div class="row gap-xs" style="justify-content:flex-end">' +
          '<button class="btn btn-ghost btn-sm" data-req="' + a.patientId + '" title="Request document"><span class="material-symbols-outlined">post_add</span></button>' +
          '<a class="btn btn-secondary btn-sm" href="doctor-patient-chart.html?patient=' + a.patientId + '">Open record</a>' +
        '</div></td></tr>';
    }).join('');
    body.querySelectorAll('[data-req]').forEach(function (b) {
      b.addEventListener('click', function () { openDocRequest(b.getAttribute('data-req')); });
    });
  }

  /* ---------- Gantt ------------------------------------------------------ */
  function renderGantt() {
    var today = Store.todayISO(0);
    var appts = myAppts(today);
    var host = document.getElementById('gantt');
    if (!appts.length) {
      var next = nextUpcoming();
      host.innerHTML = next
        ? '<p class="muted body-sm">No visits today. Next: ' + UI.esc(next.patientName) + ' — ' + UI.fmtDateShort(next.date) + ' ' + UI.fmtTime(next.time) + '. <a href="doctor-schedule-weekly.html">View weekly schedule</a></p>'
        : '<p class="muted body-sm">No visits scheduled.</p>';
      return;
    }
    var startHour = 8, span = 10; // 8:00–18:00
    host.innerHTML = appts.map(function (a) {
      var h = parseInt(a.time.split(':')[0], 10) + parseInt(a.time.split(':')[1], 10) / 60;
      var left = Math.max(0, (h - startHour) / span * 100);
      var width = (0.5 / span) * 100;
      var cls = a.type === 'Telehealth' ? 'tele' : '';
      return '<div class="gantt-row"><span class="label-md muted">' + UI.fmtTime(a.time) + '</span>' +
        '<div class="gantt-track"><div class="gantt-bar ' + cls + '" style="left:' + left.toFixed(1) + '%;width:' + Math.max(width, 12).toFixed(1) + '%">' + UI.esc(a.patientName.split(' ')[0]) + '</div></div></div>';
    }).join('');
  }

  /* ---------- KPI insight popovers ---------------------------------------- */
  function bindKPIInsights() {
    document.getElementById('kpi-card-patients').addEventListener('click', function (e) {
      var today = Store.todayISO(0);
      var appts = myAppts(today);
      var inPerson = appts.filter(function (a) { return a.type !== 'Telehealth'; }).length;
      var tele = appts.length - inPerson;
      var html = '<div class="insight-row"><span class="k">In-person</span><span class="v">' + inPerson + '</span></div>' +
        '<div class="insight-row"><span class="k">Telehealth</span><span class="v">' + tele + '</span></div>';
      html += appts.length
        ? '<div class="insight-divider"></div>' + appts.map(function (a) {
            return '<div class="insight-row"><span class="k">' + UI.fmtTime(a.time) + ' \u2014 ' + UI.esc(a.patientName) + '</span><span class="v muted">' + UI.esc(a.reason) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No patients scheduled today.</div>';
      UI.showInsight(e.currentTarget, { icon: 'groups', title: "Today's Patients", html: html });
    });

    document.getElementById('kpi-card-docpending').addEventListener('click', function (e) {
      var reqs = Store.where('documentRequests', function (d) { return d.doctorId === doctorId && d.status === 'Pending'; });
      var html = reqs.length
        ? reqs.map(function (d) {
            return '<div class="insight-row"><span class="k">' + UI.esc(d.patientName) + '</span><span class="v muted">' + UI.timeAgo(d.createdAt) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No document requests pending.</div>';
      UI.showInsight(e.currentTarget, { icon: 'pending_actions', title: 'Pending Document Requests', html: html });
    });

    document.getElementById('kpi-card-shared').addEventListener('click', function (e) {
      var grants = Store.where('accessGrants', function (g) { return g.doctorId === doctorId; });
      var html = grants.length
        ? grants.map(function (g) {
            var patient = Store.get('patients', g.patientId) || { name: 'Patient' };
            return '<div class="insight-row"><span class="k">' + UI.esc(patient.name) + '</span><span class="v muted">' + g.documentIds.length + ' file' + (g.documentIds.length === 1 ? '' : 's') + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No records shared with you yet.</div>';
      UI.showInsight(e.currentTarget, { icon: 'folder_shared', title: 'Records Shared With You', html: html });
    });

    document.getElementById('kpi-card-next').addEventListener('click', function (e) {
      var today = Store.todayISO(0);
      var next = Store.where('appointments', function (a) { return a.doctorId === doctorId && a.date >= today && a.status !== 'Cancelled'; })
        .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })[0];
      var html = next
        ? '<div class="insight-row"><span class="k">Patient</span><span class="v">' + UI.esc(next.patientName) + '</span></div>' +
          '<div class="insight-row"><span class="k">When</span><span class="v">' + UI.fmtDateShort(next.date) + ', ' + UI.fmtTime(next.time) + '</span></div>' +
          '<div class="insight-row"><span class="k">Type</span><span class="v">' + UI.esc(next.type) + '</span></div>' +
          '<div class="insight-row"><span class="k">Reason</span><span class="v">' + UI.esc(next.reason) + '</span></div>'
        : '<div class="insight-empty">No upcoming appointments.</div>';
      UI.showInsight(e.currentTarget, { icon: 'timer', title: 'Next Appointment', html: html });
    });
  }

  /* ---------- Trackers --------------------------------------------------- */
  function renderDocReqs() {
    var reqs = Store.where('documentRequests', function (d) { return d.doctorId === doctorId; });
    var host = document.getElementById('docreq-list');
    if (!reqs.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">description</span><p>No document requests yet.</p></div>'; return; }
    host.innerHTML = reqs.map(function (d) {
      var badge = d.status === 'Pending' ? 'badge-warning' : (d.status === 'Granted' ? 'badge-success' : 'badge-neutral');
      return '<div class="list-row"><div class="list-main">' +
        '<div class="list-title">' + UI.esc(d.patientName) + '</div>' +
        '<div class="list-sub">' + UI.esc(d.message) + '</div>' +
        '<div class="list-sub">' + UI.timeAgo(d.createdAt) + '</div></div>' +
        '<span class="badge ' + badge + '">' + UI.esc(d.status) + '</span></div>';
    }).join('');
  }

  function renderGrants() {
    var grants = Store.where('accessGrants', function (g) { return g.doctorId === doctorId; });
    var host = document.getElementById('grants-list');
    var rows = [];
    grants.forEach(function (g) {
      var patient = Store.get('patients', g.patientId) || { name: 'Patient' };
      g.documentIds.forEach(function (id) {
        var d = Store.get('documents', id);
        if (d) rows.push({ patientName: patient.name, doc: d, duration: g.duration });
      });
    });
    if (!rows.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">lock</span><p>No records shared with you yet.</p></div>'; return; }
    host.innerHTML = rows.map(function (r) {
      return '<div class="list-row"><div class="list-main">' +
        '<div class="list-title body-sm">' + UI.esc(r.patientName) + ' \u2014 ' + UI.esc(r.doc.name) + '</div>' +
        '<div class="list-sub">Access: ' + UI.esc(r.duration) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-preview="' + r.doc.id + '" title="Preview"><span class="material-symbols-outlined">visibility</span></button></div>';
    }).join('');
    host.querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Store.get('documents', b.getAttribute('data-preview'));
        if (d) DocPreview.open(d);
      });
    });
  }

  /* ---------- Document Request modal ------------------------------------- */
  var drForm = document.getElementById('docreq-form');
  function patientOptions(selectedId) {
    return Store.all('patients').map(function (p, i) {
      var sel = selectedId ? p.id === selectedId : i === 0;
      return '<option value="' + p.id + '"' + (sel ? ' selected' : '') + '>' + UI.esc(p.name) + ' — ' + UI.esc(p.mrn) + '</option>';
    }).join('');
  }
  function openDocRequest(patientId) {
    document.getElementById('dr-patient').innerHTML = patientOptions(patientId);
    document.getElementById('dr-message').value = '';
    UI.clearErrors(drForm);
    UI.openModal('docreq-modal');
  }
  document.getElementById('btn-docrequest').addEventListener('click', function () { openDocRequest(null); });

  UI.liveClear(drForm);
  drForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(drForm)) return;
    var patient = Store.get('patients', document.getElementById('dr-patient').value);
    Store.insert('documentRequests', {
      doctorId: doctorId, doctorName: doctorName,
      patientId: patient.id, patientName: patient.name,
      message: document.getElementById('dr-message').value.trim(),
      status: 'Pending', createdAt: Date.now()
    });
    UI.closeModal('docreq-modal');
    UI.toast('Document request sent to ' + patient.name + '.', 'success', 'Request sent');
    renderKPIs(); renderDocReqs();
  });

  /* ---------- Set Availability modal ------------------------------------- */
  var avForm = document.getElementById('avail-form');
  function openAvailability() {
    var week = Store.getAvailability(doctorId);
    document.getElementById('avail-body').innerHTML = DAYS.map(function (d) {
      var s = week[d] || { start: '', end: '', lunch: '', active: false };
      return '<tr data-day="' + d + '">' +
        '<td class="strong">' + d + '</td>' +
        '<td><input type="checkbox" class="av-active" ' + (s.active ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--primary)"></td>' +
        '<td><input class="input av-start" type="time" value="' + (s.start || '') + '" style="height:36px"></td>' +
        '<td><input class="input av-end" type="time" value="' + (s.end || '') + '" style="height:36px"></td>' +
        '<td><input class="input av-lunch" type="text" placeholder="12:30-13:30" value="' + UI.esc(s.lunch || '') + '" style="height:36px"></td>' +
      '</tr>';
    }).join('');
    document.getElementById('avail-error').style.display = 'none';
    UI.openModal('avail-modal');
  }
  document.getElementById('btn-availability').addEventListener('click', openAvailability);

  avForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var week = {}; var invalid = false;
    document.querySelectorAll('#avail-body tr').forEach(function (tr) {
      var day = tr.getAttribute('data-day');
      var active = tr.querySelector('.av-active').checked;
      var start = tr.querySelector('.av-start').value;
      var end = tr.querySelector('.av-end').value;
      var lunch = tr.querySelector('.av-lunch').value.trim();
      if (active && (!start || !end || start >= end)) invalid = true;
      week[day] = { start: start, end: end, lunch: lunch, active: active };
    });
    var err = document.getElementById('avail-error');
    if (invalid) { err.textContent = 'Active days need a valid start and end time (start before end).'; err.style.display = 'block'; return; }
    err.style.display = 'none';
    Store.setAvailability(doctorId, week);
    UI.closeModal('avail-modal');
    UI.toast('Weekly availability updated.', 'success', 'Saved');
  });

  document.getElementById('notif-btn').addEventListener('click', function () {
    document.getElementById('docreq-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  renderKPIs(); renderRoster(); renderGantt(); renderDocReqs(); renderGrants(); bindKPIInsights();
})();
