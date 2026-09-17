/* Doctor — Monthly Calendar */
(function () {
  'use strict';
  var session = Auth.requireAuth('doctor');
  if (!session) return;
  UI.mountChrome(session);
  var doctorId = session.doctorId;

  var view = new Date(); view.setDate(1);
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function render() {
    document.getElementById('cal-title').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    var year = view.getFullYear(), month = view.getMonth();
    var startDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayISO = Store.todayISO(0);

    var byDate = {};
    Store.where('appointments', function (a) { return a.doctorId === doctorId; })
      .forEach(function (a) { (byDate[a.date] = byDate[a.date] || []).push(a); });

    var cells = DOW.map(function (d) { return '<div class="cal-head">' + d + '</div>'; });
    for (var i = 0; i < startDow; i++) cells.push('<div class="cal-cell dim"></div>');
    for (var day = 1; day <= daysInMonth; day++) {
      var dISO = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var events = (byDate[dISO] || []).sort(function (a, b) { return a.time.localeCompare(b.time); });
      var shown = events.slice(0, 3).map(function (e) {
        return '<a class="cal-event" href="doctor-patient-chart.html?patient=' + e.patientId + '" title="' + UI.esc(e.patientName + ' • ' + e.reason) + '">' + UI.fmtTime(e.time) + ' ' + UI.esc(e.patientName.split(' ')[0]) + '</a>';
      }).join('');
      var more = events.length > 3 ? '<span class="list-sub">+' + (events.length - 3) + ' more</span>' : '';
      cells.push('<div class="cal-cell' + (dISO === todayISO ? ' today' : '') + '"><span class="cal-date">' + day + '</span>' + shown + more + '</div>');
    }
    document.getElementById('calendar').innerHTML = cells.join('');
  }

  document.getElementById('cal-prev').addEventListener('click', function () { view.setMonth(view.getMonth() - 1); render(); });
  document.getElementById('cal-next').addEventListener('click', function () { view.setMonth(view.getMonth() + 1); render(); });
  document.getElementById('cal-today').addEventListener('click', function () { view = new Date(); view.setDate(1); render(); });

  render();
})();
