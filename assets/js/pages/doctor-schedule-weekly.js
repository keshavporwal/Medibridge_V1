/* Doctor — Weekly Schedule (gantt + queue + availability) */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);
  var doctorId = session.doctorId;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  var weekStart = mondayOf(new Date());
  function mondayOf(d) {
    var x = new Date(d); var day = (x.getDay() + 6) % 7; // 0 = Mon
    x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
  }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function myAppts(dateISO) {
    return Store.where('appointments', function (a) { return a.doctorId === doctorId && a.date === dateISO; })
      .sort(function (a, b) { return a.time.localeCompare(b.time); });
  }
  function timeToPct(hhmm) {
    var h = parseInt(hhmm.split(':')[0], 10) + parseInt(hhmm.split(':')[1], 10) / 60;
    return Math.max(0, Math.min(100, (h - 8) / 10 * 100));
  }

  /* ---------- Weekly gantt ---------------------------------------------- */
  function renderWeek() {
    var end = addDays(weekStart, 4);
    document.getElementById('week-label').textContent = UI.fmtDateShort(iso(weekStart)) + ' – ' + UI.fmtDateShort(iso(end));
    var week = Store.getAvailability(doctorId);
    var todayISO = Store.todayISO(0);
    var rows = '';
    for (var i = 0; i < 5; i++) {
      var d = addDays(weekStart, i);
      var dISO = iso(d);
      var dayName = DAYS[i];
      var avail = week[dayName];
      var bars = '';
      // Day-off background indicator — drawn first so real appointment bars always render on top.
      if (!avail || !avail.active) {
        bars += '<div class="gantt-bar break" style="left:0;width:100%;opacity:.35">Off</div>';
      } else if (avail.lunch && avail.lunch.indexOf('-') > -1) {
        var lp = avail.lunch.split('-');
        var l = timeToPct(lp[0]), lw = timeToPct(lp[1]) - l;
        bars += '<div class="gantt-bar break" style="left:' + l + '%;width:' + Math.max(lw, 4) + '%">Lunch</div>';
      }
      myAppts(dISO).forEach(function (a) {
        var left = timeToPct(a.time);
        bars += '<div class="gantt-bar ' + (a.type === 'Telehealth' ? 'tele' : '') + '" style="left:' + left + '%;width:6%" title="' + UI.esc(a.patientName + ' • ' + a.reason) + '">' + UI.esc(a.patientName.split(' ')[0]) + '</div>';
      });
      rows += '<div class="gantt-row"><span class="label-md ' + (dISO === todayISO ? 'text-primary strong' : 'muted') + '">' + dayName + ' ' + d.getDate() + '</span>' +
        '<div class="gantt-track">' + bars + '</div></div>';
    }
    document.getElementById('week-gantt').innerHTML = rows;
  }

  /* ---------- Next-up queue --------------------------------------------- */
  function renderQueue() {
    var todayISO = Store.todayISO(0);
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var upcoming = Store.where('appointments', function (a) {
      if (a.doctorId !== doctorId) return false;
      if (a.date > todayISO) return true;
      if (a.date < todayISO) return false;
      var m = parseInt(a.time.split(':')[0], 10) * 60 + parseInt(a.time.split(':')[1], 10);
      return m >= nowMin;
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).slice(0, 6);
    var host = document.getElementById('queue');
    if (!upcoming.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">event_available</span><p>No upcoming visits this week.</p></div>'; return; }
    host.innerHTML = upcoming.map(function (a) {
      return '<div class="list-row"><div class="list-main"><div class="list-title body-sm">' + UI.esc(a.patientName) + '</div>' +
        '<div class="list-sub">' + UI.fmtDateShort(a.date) + ' • ' + UI.fmtTime(a.time) + ' • ' + UI.esc(a.type) + '</div></div>' +
        '<a class="btn btn-ghost btn-sm" href="doctor-patient-chart.html?patient=' + a.patientId + '">Open</a></div>';
    }).join('');
  }

  document.getElementById('week-prev').addEventListener('click', function () { weekStart = addDays(weekStart, -7); renderWeek(); });
  document.getElementById('week-next').addEventListener('click', function () { weekStart = addDays(weekStart, 7); renderWeek(); });
  document.getElementById('week-today').addEventListener('click', function () { weekStart = mondayOf(new Date()); renderWeek(); });

  /* ---------- Set availability modal ------------------------------------ */
  var avForm = document.getElementById('avail-form');
  document.getElementById('btn-availability').addEventListener('click', function () {
    var week = Store.getAvailability(doctorId);
    document.getElementById('avail-body').innerHTML = DAYS.map(function (d) {
      var s = week[d] || { start: '', end: '', lunch: '', active: false };
      return '<tr data-day="' + d + '"><td class="strong">' + d + '</td>' +
        '<td><input type="checkbox" class="av-active" ' + (s.active ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:var(--primary)"></td>' +
        '<td><input class="input av-start" type="time" value="' + (s.start || '') + '" style="height:36px"></td>' +
        '<td><input class="input av-end" type="time" value="' + (s.end || '') + '" style="height:36px"></td>' +
        '<td><input class="input av-lunch" type="text" placeholder="12:30-13:30" value="' + UI.esc(s.lunch || '') + '" style="height:36px"></td></tr>';
    }).join('');
    document.getElementById('avail-error').style.display = 'none';
    UI.openModal('avail-modal');
  });
  avForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var week = {}; var invalid = false;
    document.querySelectorAll('#avail-body tr').forEach(function (tr) {
      var active = tr.querySelector('.av-active').checked;
      var start = tr.querySelector('.av-start').value, end = tr.querySelector('.av-end').value;
      if (active && (!start || !end || start >= end)) invalid = true;
      week[tr.getAttribute('data-day')] = { start: start, end: end, lunch: tr.querySelector('.av-lunch').value.trim(), active: active };
    });
    var err = document.getElementById('avail-error');
    if (invalid) { err.textContent = 'Active days need a valid start and end time (start before end).'; err.style.display = 'block'; return; }
    Store.setAvailability(doctorId, week);
    UI.closeModal('avail-modal');
    UI.toast('Weekly availability updated.', 'success', 'Saved');
    renderWeek();
  });

  renderWeek(); renderQueue();
})();
