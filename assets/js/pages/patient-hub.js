/* Patient Health Hub */
(function () {
  'use strict';
  var session = Auth.requireAuth('patient');
  if (!session) return;
  UI.mountChrome(session);

  var patientId = session.patientId;
  var patient = Store.get('patients', patientId) || { name: session.name, mrn: '' };

  /* ---------- Shared helpers ---------------------------------------------- */
  function myAppointments() {
    return Store.where('appointments', function (a) { return a.patientId === patientId; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  }
  function specialtyOf(doctorId) { var d = Store.get('doctors', doctorId); return d ? d.specialty : ''; }
  function nextAppointment() {
    var today = Store.todayISO(0);
    return myAppointments().filter(function (a) { return a.date >= today && a.status !== 'Cancelled'; })[0] || null;
  }

  /* ---------- Digital Patient ID (QR) ------------------------------------- */
  function renderId() {
    document.getElementById('id-name').textContent = patient.name;
    document.getElementById('id-mrn').textContent = 'MRN ' + (patient.mrn || '—');
    var shareUrl = new URL('patient-share.html?pid=' + encodeURIComponent(patientId), location.href).href;
    document.getElementById('qr').innerHTML = QR.svg(shareUrl, {
      px: 112, margin: 4, style: 'rounded',
      gradient: { from: '#0b1c30', to: '#004ac6' }   // ICQR-style branded fill
    });
  }

  /* ---------- Welcome mini-stats ------------------------------------------ */
  function renderMiniStats() {
    var docs = Store.where('documents', function (d) { return d.patientId === patientId; });
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var recent = docs.filter(function (d) { return new Date(d.uploadedAt).getTime() >= weekAgo; }).length;
    document.getElementById('mstat-files').textContent = docs.length;
    document.getElementById('mstat-files-accent').textContent = docs.length ? 'Stored' : '';
    document.getElementById('mstat-files-sub').textContent = recent ? recent + ' uploaded this week' : (docs.length ? 'No new uploads this week' : 'No documents yet');

    var grants = Store.where('accessGrants', function (g) { return g.patientId === patientId; });
    var pendingReqs = Store.where('documentRequests', function (d) { return d.patientId === patientId && d.status === 'Pending'; });
    document.getElementById('mstat-consents').textContent = grants.length;
    document.getElementById('mstat-consents-accent').textContent = grants.length ? 'Clinicians' : '';
    document.getElementById('mstat-consents-sub').textContent = pendingReqs.length
      ? pendingReqs.length + ' request' + (pendingReqs.length > 1 ? 's' : '') + ' pending review'
      : (grants.length ? 'No pending requests' : 'No active access');

    var next = nextAppointment();
    var nextEl = document.getElementById('mstat-next');
    if (!next) {
      nextEl.textContent = 'Not scheduled';
      document.getElementById('mstat-next-sub').textContent = 'Request a visit to get started';
    } else {
      var today = Store.todayISO(0);
      var days = Math.round((new Date(next.date) - new Date(today)) / 86400000);
      nextEl.textContent = days <= 0 ? 'Today' : (days === 1 ? 'In 1 Day' : 'In ' + days + ' Days');
      document.getElementById('mstat-next-sub').textContent = UI.fmtDateShort(next.date) + ' • ' + UI.fmtTime(next.time);
    }
  }

  /* ---------- Upcoming visit ------------------------------------------------ */
  function renderUpcoming() {
    var next = nextAppointment();
    var body = document.getElementById('upcoming-body');
    if (!next) {
      body.innerHTML = '<div class="col gap-sm"><span class="headline-sm text-primary">Pending booking</span>' +
        '<p class="body-sm muted">You have no upcoming visits. Request one to get started.</p>' +
        '<button class="btn btn-primary btn-sm" id="upcoming-request"><span class="material-symbols-outlined">calendar_add_on</span>Request appointment</button></div>';
      var b = document.getElementById('upcoming-request');
      if (b) b.addEventListener('click', openRequest);
      return;
    }
    body.innerHTML =
      '<div class="col gap-md">' +
        '<div class="row gap-sm">' +
          '<div class="avatar" style="width:44px;height:44px">' + UI.initials(next.doctorName) + '</div>' +
          '<div class="col" style="flex:1"><span class="strong">' + UI.esc(next.doctorName) + '</span>' +
          '<span class="body-sm muted">' + UI.esc(specialtyOf(next.doctorId) || 'Clinician') + '</span></div>' +
          '<span class="badge ' + (next.type === 'Telehealth' ? 'badge-info' : 'badge-primary') + '">' + UI.esc(next.type) + '</span>' +
        '</div>' +
        '<div class="row gap-sm muted body-sm"><span class="material-symbols-outlined" style="font-size:18px">event</span>' +
          UI.fmtDate(next.date) + ' • ' + UI.fmtTime(next.time) + '</div>' +
        '<div class="row gap-sm muted body-sm"><span class="material-symbols-outlined" style="font-size:18px">clinical_notes</span>' + UI.esc(next.reason) + '</div>' +
        '<div class="row gap-sm" style="margin-top:var(--space-xs)">' +
          '<a class="btn btn-primary btn-sm" href="patient-appointments.html"><span class="material-symbols-outlined">calendar_month</span>View calendar</a>' +
          '<button class="btn btn-secondary btn-sm" id="upcoming-new-request"><span class="material-symbols-outlined">add</span>New request</button>' +
        '</div>' +
      '</div>';
    var nb = document.getElementById('upcoming-new-request');
    if (nb) nb.addEventListener('click', openRequest);
  }

  /* ---------- Consent & Permissions --------------------------------------- */
  function renderConsent() {
    var pending = Store.where('documentRequests', function (d) { return d.patientId === patientId && d.status === 'Pending'; });
    var pendingHost = document.getElementById('consent-pending');
    if (!pending.length) {
      pendingHost.innerHTML = '<p class="body-sm muted">No pending document requests.</p>';
    } else {
      pendingHost.innerHTML = pending.map(function (d) {
        return '<div class="consent-pending" style="margin-bottom:var(--space-sm)">' +
          '<div class="label-sm text-primary">Pending approval</div>' +
          '<div class="strong body-sm" style="margin-top:2px">' + UI.esc(d.doctorName) + '</div>' +
          '<p class="body-sm muted" style="margin:var(--space-xs) 0">' + UI.esc(d.message) + '</p>' +
          '<div class="row gap-sm"><button class="btn btn-primary btn-sm" data-grant="' + d.id + '"><span class="material-symbols-outlined">verified_user</span>Grant access</button>' +
          '<button class="btn btn-ghost btn-sm" data-decline="' + d.id + '">Decline</button></div></div>';
      }).join('');
      pendingHost.querySelectorAll('[data-grant]').forEach(function (b) {
        b.addEventListener('click', function () { openGrant(b.getAttribute('data-grant')); });
      });
      pendingHost.querySelectorAll('[data-decline]').forEach(function (b) {
        b.addEventListener('click', function () {
          var req = Store.get('documentRequests', b.getAttribute('data-decline'));
          Store.update('documentRequests', b.getAttribute('data-decline'), { status: 'Declined' });
          UI.toast('Declined the request from ' + req.doctorName + '.', 'info', 'Request declined');
          renderConsent(); renderMiniStats();
        });
      });
    }

    var grants = Store.where('accessGrants', function (g) { return g.patientId === patientId; });
    document.getElementById('consent-count').textContent = grants.length + ' Active';
    var activeHost = document.getElementById('consent-active');
    if (!grants.length) {
      activeHost.innerHTML = '<p class="body-sm muted">No clinicians currently have access.</p>';
      return;
    }
    activeHost.innerHTML = grants.map(function (g) {
      return '<div class="consent-row"><div class="col"><span class="body-sm strong">' + UI.esc(g.doctorName) + '</span>' +
        '<span class="label-sm muted">' + g.documentIds.length + ' file' + (g.documentIds.length === 1 ? '' : 's') + ' • ' + UI.esc(g.duration) + '</span></div>' +
        '<button class="btn btn-outline-danger btn-sm" data-revoke="' + g.id + '">Revoke</button></div>';
    }).join('');
    activeHost.querySelectorAll('[data-revoke]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.remove('accessGrants', b.getAttribute('data-revoke'));
        UI.toast('Access revoked.', 'info', 'Consent updated');
        renderConsent(); renderMiniStats();
      });
    });
  }

  /* ---------- Document vault preview -------------------------------------- */
  function renderVault() {
    var docs = Store.where('documents', function (d) { return d.patientId === patientId; });
    document.getElementById('vault-count-link').textContent = 'Full vault (' + docs.length + ')';
    var host = document.getElementById('vault-preview');
    if (!docs.length) { host.innerHTML = '<p class="body-sm muted">No documents uploaded.</p>'; return; }
    host.innerHTML = docs.slice(0, 4).map(function (d) {
      return '<div class="list-row"><span class="material-symbols-outlined text-primary">description</span>' +
        '<div class="list-main"><div class="list-title body-sm">' + UI.esc(d.name) + '</div>' +
        '<div class="list-sub">' + UI.esc(d.type) + ' • ' + UI.esc(d.size) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-preview="' + d.id + '" title="Preview"><span class="material-symbols-outlined">visibility</span></button></div>';
    }).join('');
    host.querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Store.get('documents', b.getAttribute('data-preview'));
        if (d) DocPreview.open(d);
      });
    });
  }

  /* ---------- My appointment requests ------------------------------------- */
  function renderMyRequests() {
    var reqs = Store.where('appointmentRequests', function (r) { return r.patientId === patientId; });
    var host = document.getElementById('my-requests');
    if (!reqs.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">event_available</span><p>No pending requests.</p></div>'; return; }
    host.innerHTML = reqs.map(function (r) {
      var badge = r.status === 'Pending' ? 'badge-warning' : (r.status === 'Scheduled' ? 'badge-success' : 'badge-neutral');
      return '<div class="list-row"><div class="list-main">' +
        '<div class="list-title">' + UI.esc(r.reason) + '</div>' +
        '<div class="list-sub">' + UI.esc(r.doctorName) + ' • ' + UI.fmtDate(r.preferredDate) + ' • ' + UI.esc(r.window) + '</div></div>' +
        '<span class="badge ' + badge + '">' + UI.esc(r.status) + '</span></div>';
    }).join('');
  }

  /* ---------- Care & consultation timeline (month swimlane) --------------- */
  function renderSwimlane() {
    var host = document.getElementById('care-swimlane');
    var now = new Date();
    var months = [];
    for (var i = -2; i <= 2; i++) months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
    var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function keyOf(d) { return d.getFullYear() + '-' + d.getMonth(); }
    var todayISO = Store.todayISO(0);

    var appts = myAppointments();
    var notes = Store.where('visitNotes', function (n) { return n.patientId === patientId; });
    function bucketKey(iso) { var p = iso.split('-'); return p[0] + '-' + (parseInt(p[1], 10) - 1); }

    if (!appts.length && !notes.length) {
      host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">timeline</span><p>No consultations or visit notes recorded yet.</p></div>';
      return;
    }

    function headRow() {
      var cells = months.map(function (m, i) {
        var isCurrent = i === 2;
        return '<div class="swimlane-cell' + (isCurrent ? ' current' : '') + '">' + MONTH_NAMES[m.getMonth()] + (isCurrent ? ' (Current)' : '') + '</div>';
      }).join('');
      return '<div class="swimlane-row head"><div class="swimlane-label"></div>' + cells + '</div>';
    }
    function dataRow(label, sub, icon, itemsByMonth) {
      var cells = months.map(function (m, i) {
        var key = keyOf(m);
        var items = itemsByMonth[key] || [];
        var isCurrent = i === 2;
        var chips = items.map(function (it) { return it; }).join('');
        return '<div class="swimlane-cell' + (isCurrent ? ' current' : '') + '">' + chips + '</div>';
      }).join('');
      return '<div class="swimlane-row"><div class="swimlane-label"><span class="row gap-xs strong"><span class="material-symbols-outlined" style="font-size:18px;color:var(--primary)">' + icon + '</span>' + label + '</span><span class="sub">' + sub + '</span></div>' + cells + '</div>';
    }

    var apptByMonth = {};
    appts.forEach(function (a) {
      var key = bucketKey(a.date);
      var cls = a.status === 'Completed' || a.date < todayISO ? 'done' : 'upcoming';
      var chip = '<div class="swimlane-chip ' + cls + '"><span class="chip-title">' + UI.esc(a.reason) + '</span>' +
        '<span class="chip-sub">' + UI.fmtDateShort(a.date) + '</span><span class="chip-sub">' + UI.esc(a.doctorName) + '</span></div>';
      (apptByMonth[key] = apptByMonth[key] || []).push(chip);
    });
    var noteByMonth = {};
    notes.forEach(function (n) {
      var key = bucketKey(n.date);
      var chip = '<div class="swimlane-chip note"><span class="chip-title">Visit note</span>' +
        '<span class="chip-sub">' + UI.fmtDateShort(n.date) + '</span><span class="chip-sub">' + UI.esc(n.author) + '</span></div>';
      (noteByMonth[key] = noteByMonth[key] || []).push(chip);
    });

    host.innerHTML = '<div class="swimlane">' +
      headRow() +
      dataRow('Consultations &amp; Visits', 'Doctor appointments', 'stethoscope', apptByMonth) +
      dataRow('Visit Notes &amp; Records', 'Clinical documentation', 'description', noteByMonth) +
      '</div>';
  }

  /* ---------- Notification bell (pending document requests) --------------- */
  function updateNotifBadge() {
    var count = Store.where('documentRequests', function (d) { return d.patientId === patientId && d.status === 'Pending'; }).length;
    var badge = document.getElementById('notif-count');
    badge.textContent = count; badge.classList.toggle('hidden', count === 0);
  }

  function renderAll() {
    renderMiniStats(); renderUpcoming(); renderConsent(); renderVault(); renderMyRequests(); renderSwimlane(); updateNotifBadge();
  }

  /* ---------- Request Appointment modal ---------------------------------- */
  var reqForm = document.getElementById('request-form');
  function openRequest() {
    if (!Store.all('doctors').length) { UI.toast('No clinicians are available yet. Please check back soon.', 'info', 'No clinicians'); return; }
    var sel = document.getElementById('req-doctor');
    sel.innerHTML = Store.all('doctors').map(function (d, i) {
      return '<option value="' + d.id + '"' + (i === 0 ? ' selected' : '') + '>' + UI.esc(d.name) + ' — ' + UI.esc(d.specialty) + '</option>';
    }).join('');
    document.getElementById('req-date').min = Store.todayISO(0);
    document.getElementById('req-date').value = Store.todayISO(1);
    document.getElementById('req-reason').value = '';

    var renderSlotGrid = function () {
      var doctorId = document.getElementById('req-doctor').value;
      var dateISO = document.getElementById('req-date').value;
      var grid = document.getElementById('req-slot-grid');
      var hiddenInput = document.getElementById('req-time');
      hiddenInput.value = '';

      var slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
      var d = dateISO ? new Date(dateISO + 'T00:00:00') : new Date();
      var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var dayName = dayNames[d.getDay()];
      var week = Store.getAvailability(doctorId);
      var dayAvail = week[dayName];

      var start = '08:00', end = '17:00', lunchStart = '12:30', lunchEnd = '13:30';
      var active = true;
      if (dayAvail) {
        if (dayAvail.active === false) active = false;
        if (dayAvail.start) start = dayAvail.start;
        if (dayAvail.end) end = dayAvail.end;
        if (dayAvail.lunch && dayAvail.lunch.indexOf('-') > -1) {
          var lp = dayAvail.lunch.split('-');
          lunchStart = lp[0].trim(); lunchEnd = lp[1].trim();
        }
      }

      var existingAppts = Store.where('appointments', function (a) { return a.doctorId === doctorId && a.date === dateISO && a.status !== 'Cancelled'; });
      var bookedTimes = existingAppts.map(function (a) { return a.time; });

      grid.innerHTML = slots.map(function (s) {
        var isAvailable = active && (s >= start && s < end) && !(s >= lunchStart && s < lunchEnd) && (bookedTimes.indexOf(s) === -1);
        return '<button type="button" class="btn btn-sm slot-btn ' + (isAvailable ? 'btn-ghost' : 'disabled') + '" data-slot="' + s + '" ' + (isAvailable ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"') + '>' + UI.fmtTime(s) + '</button>';
      }).join('');

      grid.querySelectorAll('[data-slot]:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
          grid.querySelectorAll('.slot-btn').forEach(function (b) { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); });
          btn.classList.remove('btn-ghost');
          btn.classList.add('btn-primary');
          hiddenInput.value = btn.getAttribute('data-slot');
          UI.clearError(hiddenInput);
        });
      });
    };

    document.getElementById('req-doctor').onchange = renderSlotGrid;
    document.getElementById('req-date').onchange = renderSlotGrid;
    renderSlotGrid();
    document.getElementById('req-notes').value = '';
    UI.clearErrors(reqForm);
    UI.openModal('request-modal');
  }
  document.getElementById('btn-request').addEventListener('click', openRequest);

  UI.liveClear(reqForm);
  reqForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!UI.validate(reqForm)) return;
    var reqTime = document.getElementById('req-time').value;
    if (!reqTime) {
      UI.setError(document.getElementById('req-time'), 'Please click to select an available time slot.');
      return;
    }
    var doctor = Store.get('doctors', document.getElementById('req-doctor').value);
    Store.insert('appointmentRequests', {
      patientId: patientId, patientName: patient.name, mrn: patient.mrn,
      doctorId: doctor.id, doctorName: doctor.name,
      preferredDate: document.getElementById('req-date').value,
      window: UI.fmtTime(reqTime),
      preferredTime: reqTime,
      reason: document.getElementById('req-reason').value.trim(),
      notes: document.getElementById('req-notes').value.trim(),
      status: 'Pending', createdAt: Date.now()
    });
    UI.closeModal('request-modal');
    UI.toast('Your appointment request was sent to the intake desk.', 'success', 'Request submitted');
    renderMyRequests();
  });

  /* ---------- Grant Access modal ----------------------------------------- */
  var grantForm = document.getElementById('grant-form');
  var activeRequestId = null;
  function openGrant(requestId) {
    activeRequestId = requestId;
    var req = Store.get('documentRequests', requestId);
    document.getElementById('grant-doctor').textContent = req.doctorName + ' — record request';
    document.getElementById('grant-message').textContent = req.message;
    var docs = Store.where('documents', function (d) { return d.patientId === patientId; });
    document.getElementById('grant-docs').innerHTML = docs.length ? docs.map(function (d) {
      return '<label class="check-row"><input type="checkbox" value="' + d.id + '" />' +
        '<span><span class="strong body-sm">' + UI.esc(d.name) + '</span><br><span class="list-sub">' + UI.esc(d.type) + ' • ' + UI.esc(d.size) + '</span></span></label>';
    }).join('') : '<p class="muted body-sm">Upload a document first to share it.</p>';
    document.getElementById('grant-docs-error').style.display = 'none';
    document.getElementById('grant-duration').value = '30 Days';
    UI.openModal('grant-modal');
  }

  grantForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var checked = Array.prototype.slice.call(grantForm.querySelectorAll('#grant-docs input:checked')).map(function (c) { return c.value; });
    var err = document.getElementById('grant-docs-error');
    if (!checked.length) { err.textContent = 'Select at least one record to share.'; err.style.display = 'block'; return; }
    err.style.display = 'none';
    var req = Store.get('documentRequests', activeRequestId);
    Store.insert('accessGrants', {
      patientId: patientId, doctorId: req.doctorId, doctorName: req.doctorName,
      documentIds: checked, duration: document.getElementById('grant-duration').value, createdAt: Date.now()
    });
    Store.update('documentRequests', activeRequestId, { status: 'Granted' });
    UI.closeModal('grant-modal');
    UI.toast('Access granted to ' + req.doctorName + ' (' + checked.length + ' record' + (checked.length > 1 ? 's' : '') + ').', 'success', 'Consent recorded');
    renderConsent(); renderMiniStats();
  });

  document.getElementById('notif-btn').addEventListener('click', function () {
    document.getElementById('consent-pending').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  renderAll();
  renderId();
})();
