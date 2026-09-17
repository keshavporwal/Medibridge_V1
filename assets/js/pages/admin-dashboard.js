/* Admin — Operations Command Center */
(function () {
  'use strict';
  var session = Auth.requireAuth('admin');
  if (!session) return;
  UI.mountChrome(session);

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Monthly patient volume (visits) derived from real appointment data — last 8 months.
  function monthlyVolume() {
    var now = new Date(), labels = [], data = [];
    for (var i = 7; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      labels.push(MONTHS[d.getMonth()]);
      data.push(Store.where('appointments', function (a) { return (a.date || '').slice(0, 7) === key; }).length);
    }
    return { labels: labels, data: data };
  }
  var STATUS_CYCLE = { 'Active': 'On Leave', 'On Leave': 'Inactive', 'Inactive': 'Active' };
  var STATUS_BADGE = { 'Active': 'badge-success', 'On Leave': 'badge-warning', 'Inactive': 'badge-neutral' };

  function clinicName(id) { var c = Store.get('clinics', id); return c ? c.name : '—'; }

  /* ---------- KPIs ------------------------------------------------------- */
  function renderKPIs() {
    var clinics = Store.all('clinics');
    document.getElementById('kpi-clinics').textContent = clinics.length;
    document.getElementById('kpi-active').textContent = clinics.filter(function (c) { return c.status === 'Active'; }).length;
    document.getElementById('kpi-staff').textContent = Store.all('staff').length;
    document.getElementById('kpi-volume').textContent = Store.all('appointments').length.toLocaleString();
  }

  /* ---------- Volume chart (inline SVG) ---------------------------------- */
  function renderChart() {
    var mv = monthlyVolume(), values = mv.data, labs = mv.labels;
    var w = 640, h = 200, pad = 28;
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var range = (max - min) || 1;
    var stepX = (w - pad * 2) / (values.length - 1);
    var pts = values.map(function (v, i) {
      var x = pad + i * stepX;
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = 'M' + pad + ' ' + (h - pad) + ' ' + pts.map(function (p) { return 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + ' L' + (w - pad) + ' ' + (h - pad) + ' Z';
    var dots = pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="var(--primary)"/>'; }).join('');
    var labels = labs.map(function (m, i) { return '<text x="' + (pad + i * stepX).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + m + '</text>'; }).join('');
    document.getElementById('volume-chart').innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="Patient volume trend">' +
      '<defs><linearGradient id="vg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity="0.18"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#vg)"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';

    var n = values.length, badge = document.getElementById('volume-trend');
    if (badge) {
      var prev = values[n - 2] || 0, curr = values[n - 1] || 0;
      if (!prev && !curr) { badge.className = 'badge badge-neutral'; badge.innerHTML = '<span class="dot"></span>No data yet'; }
      else {
        var pct = prev ? Math.round(((curr - prev) / prev) * 100) : 100, up = pct >= 0;
        badge.className = 'badge ' + (up ? 'badge-success' : 'badge-danger');
        badge.innerHTML = '<span class="dot"></span>' + (up ? '+' : '') + pct + '% MoM';
      }
    }
  }

  /* ---------- KPI insight popovers ---------------------------------------- */
  function bindKPIInsights() {
    document.getElementById('kpi-card-clinics').addEventListener('click', function (e) {
      var clinics = Store.all('clinics');
      var counts = { Active: 0, 'On Leave': 0, Inactive: 0 };
      clinics.forEach(function (c) { counts[c.status] = (counts[c.status] || 0) + 1; });
      var html = '<div class="insight-row"><span class="k">Active</span><span class="v text-success">' + counts.Active + '</span></div>' +
        '<div class="insight-row"><span class="k">On leave</span><span class="v">' + counts['On Leave'] + '</span></div>' +
        '<div class="insight-row"><span class="k">Inactive</span><span class="v">' + counts.Inactive + '</span></div>';
      html += clinics.length
        ? '<div class="insight-divider"></div>' + clinics.slice(0, 5).map(function (c) {
            return '<div class="insight-row"><span class="k">' + UI.esc(c.name) + '</span><span class="v muted">' + UI.esc(c.code) + '</span></div>';
          }).join('')
        : '<div class="insight-empty">No clinics enrolled yet.</div>';
      UI.showInsight(e.currentTarget, { icon: 'apartment', title: 'Enrolled Clinics', html: html });
    });

    document.getElementById('kpi-card-active').addEventListener('click', function (e) {
      var active = Store.all('clinics').filter(function (c) { return c.status === 'Active'; });
      var html = active.length
        ? active.map(function (c) { return '<div class="insight-row"><span class="k">' + UI.esc(c.name) + '</span><span class="v muted">' + UI.esc(c.specialty) + '</span></div>'; }).join('')
        : '<div class="insight-empty">No active facilities yet.</div>';
      UI.showInsight(e.currentTarget, { icon: 'verified', title: 'Active Facilities', html: html });
    });

    document.getElementById('kpi-card-staff').addEventListener('click', function (e) {
      var byRole = {};
      Store.all('staff').forEach(function (s) { byRole[s.role] = (byRole[s.role] || 0) + 1; });
      var roles = Object.keys(byRole).sort();
      var html = roles.length
        ? roles.map(function (r) { return '<div class="insight-row"><span class="k">' + UI.esc(r) + '</span><span class="v">' + byRole[r] + '</span></div>'; }).join('')
        : '<div class="insight-empty">No staff onboarded yet.</div>';
      UI.showInsight(e.currentTarget, { icon: 'badge', title: 'Total Staff Roster', html: html });
    });

    document.getElementById('kpi-card-volume').addEventListener('click', function (e) {
      var mv = monthlyVolume();
      var html = mv.labels.map(function (m, i) {
        return '<div class="insight-row"><span class="k">' + m + '</span><span class="v">' + mv.data[i] + '</span></div>';
      }).join('') + '<div class="insight-divider"></div><div class="insight-row"><span class="k">Total appointments</span><span class="v strong">' + Store.all('appointments').length + '</span></div>';
      UI.showInsight(e.currentTarget, { icon: 'monitoring', title: 'Aggregate Patient Volume', html: html });
    });
  }

  /* ---------- Clinics quick directory ----------------------------------- */
  function renderClinicsQuick() {
    var host = document.getElementById('clinics-quick');
    var clinics = Store.all('clinics');
    if (!clinics.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">domain</span><p>No clinics enrolled yet.</p></div>'; return; }
    host.innerHTML = clinics.slice(0, 5).map(function (c) {
      return '<div class="list-row"><div class="list-main">' +
        '<div class="list-title body-sm">' + UI.esc(c.name) + '</div>' +
        '<div class="list-sub">' + UI.esc(c.specialty) + ' \u2022 ' + UI.esc(c.code || '\u2014') + ' \u2022 ' + (c.staffCount || 0) + ' staff</div></div>' +
        '<span class="badge ' + (STATUS_BADGE[c.status] || 'badge-neutral') + '"><span class="dot"></span>' + UI.esc(c.status) + '</span></div>';
    }).join('');
  }

  /* ---------- Staff governance ------------------------------------------ */
  function renderStaff() {
    var host = document.getElementById('staff-body');
    host.innerHTML = Store.all('staff').map(function (s) {
      return '<tr>' +
        '<td><div class="cell-user"><span class="avatar">' + UI.initials(s.name) + '</span>' +
          '<div><div class="cell-title">' + UI.esc(s.name) + '</div><div class="cell-sub">' + UI.esc(s.email) + '</div></div></div></td>' +
        '<td>' + UI.esc(clinicName(s.clinicId)) + '</td>' +
        '<td>' + UI.esc(s.role) + '<div class="cell-sub">' + UI.esc(s.specialty || '') + '</div></td>' +
        '<td>' + UI.fmtDate(s.onboardDate) + '</td>' +
        '<td><button class="badge ' + (STATUS_BADGE[s.status] || 'badge-neutral') + '" data-toggle-status="' + s.id + '" style="cursor:pointer;border-style:solid"><span class="dot"></span>' + UI.esc(s.status) + '</button></td>' +
        '<td class="num"><button class="btn btn-ghost btn-sm" data-deboard="' + s.id + '" title="Deboard"><span class="material-symbols-outlined" style="color:var(--danger)">person_remove</span></button></td>' +
      '</tr>';
    }).join('');
    host.querySelectorAll('[data-toggle-status]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = Store.get('staff', b.getAttribute('data-toggle-status'));
        Store.update('staff', s.id, { status: STATUS_CYCLE[s.status] || 'Active' });
        renderStaff(); renderKPIs();
      });
    });
    host.querySelectorAll('[data-deboard]').forEach(function (b) {
      b.addEventListener('click', function () { openDeboard(b.getAttribute('data-deboard')); });
    });
  }

  function clinicOptions() {
    return Store.all('clinics').map(function (c, i) {
      return '<option value="' + c.id + '"' + (i === 0 ? ' selected' : '') + '>' + UI.esc(c.name) + '</option>';
    }).join('');
  }


  /* ---------- Deboard modal --------------------------------------------- */
  var dbForm = document.getElementById('deboard-form');
  var deboardId = null;
  function openDeboard(staffId) {
    var s = Store.get('staff', staffId);
    if (!s) return;
    deboardId = staffId;
    document.getElementById('db-name').textContent = s.name;
    var others = Store.all('staff').filter(function (o) { return o.id !== staffId && o.role === 'Doctor' && o.status === 'Active'; });
    var opts = others.map(function (o, i) { return '<option value="' + o.id + '"' + (i === 0 ? ' selected' : '') + '>' + UI.esc(o.name) + '</option>'; }).join('');
    document.getElementById('db-reassign').innerHTML = opts || '<option value="">No other active clinician available</option>';
    document.getElementById('db-confirm').checked = false;
    document.getElementById('db-error').style.display = 'none';
    UI.openModal('deboard-modal');
  }
  dbForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('db-error');
    if (!document.getElementById('db-confirm').checked) {
      err.textContent = 'Please confirm credential revocation to proceed.'; err.style.display = 'block'; return;
    }
    err.style.display = 'none';
    var s = Store.get('staff', deboardId);
    Store.update('staff', deboardId, { status: 'Inactive' });
    UI.closeModal('deboard-modal');
    UI.toast(s.name + ' has been deboarded and credentials revoked.', 'success', 'Staff offboarded');
    renderStaff(); renderKPIs();
  });

  renderKPIs(); renderChart(); renderClinicsQuick(); renderStaff(); bindKPIInsights();
})();
