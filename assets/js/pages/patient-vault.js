/* Patient Document Vault — upload, consent, revoke */
(function () {
  'use strict';
  var session = Auth.requireAuth('patient');
  if (!session) return;
  UI.mountChrome(session);
  var patientId = session.patientId;

  function fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  function guessType(name) {
    var n = name.toLowerCase();
    if (n.indexOf('ecg') > -1 || n.indexOf('echo') > -1 || n.indexOf('cardio') > -1) return 'Cardiology';
    if (n.indexOf('lipid') > -1 || n.indexOf('lab') > -1 || n.indexOf('panel') > -1 || n.indexOf('blood') > -1) return 'Lab Report';
    if (n.indexOf('discharge') > -1 || n.indexOf('summary') > -1) return 'Summary';
    if (/\.(png|jpg|jpeg|gif|webp)$/.test(n)) return 'Image';
    return 'Document';
  }

  // Files above this size still upload (metadata only) but skip storing preview content,
  // to avoid exhausting the browser's localStorage quota with large base64 payloads.
  var MAX_PREVIEW_BYTES = 4 * 1024 * 1024;
  function readAsDataUrl(file) {
    return new Promise(function (resolve) {
      if (file.size > MAX_PREVIEW_BYTES) { resolve(null); return; }
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Documents -------------------------------------------------- */
  function renderDocs() {
    var docs = Store.where('documents', function (d) { return d.patientId === patientId; });
    document.getElementById('doc-count').textContent = docs.length + ' file' + (docs.length === 1 ? '' : 's');
    var body = document.getElementById('docs-body');
    if (!docs.length) { body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined">folder_open</span><p>Your vault is empty. Upload a record to get started.</p></div></td></tr>'; return; }
    body.innerHTML = docs.map(function (d) {
      return '<tr>' +
        '<td><div class="cell-user"><span class="material-symbols-outlined text-primary">description</span><span class="cell-title">' + UI.esc(d.name) + '</span></div></td>' +
        '<td><span class="badge badge-neutral">' + UI.esc(d.type) + '</span></td>' +
        '<td class="num">' + UI.esc(d.size) + '</td>' +
        '<td>' + UI.fmtDate(d.uploadedAt) + '</td>' +
        '<td class="num"><div class="row gap-xs" style="justify-content:flex-end">' +
          '<button class="btn btn-ghost btn-sm" data-preview="' + d.id + '" title="Preview"><span class="material-symbols-outlined">visibility</span></button>' +
          '<button class="btn btn-ghost btn-sm" data-del="' + d.id + '" title="Delete"><span class="material-symbols-outlined" style="color:var(--danger)">delete</span></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Store.get('documents', b.getAttribute('data-preview'));
        if (d) DocPreview.open(d);
      });
    });
    body.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.remove('documents', b.getAttribute('data-del'));
        UI.toast('Document removed from your vault.', 'info', 'Deleted');
        renderDocs();
      });
    });
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    if (!files.length) return;
    Promise.all(files.map(function (f) {
      return readAsDataUrl(f).then(function (dataUrl) {
        Store.insert('documents', {
          patientId: patientId, name: f.name, type: guessType(f.name),
          size: fmtSize(f.size), uploadedAt: Store.todayISO(0),
          mimeType: f.type || '', dataUrl: dataUrl
        });
        return !!dataUrl;
      });
    })).then(function (results) {
      var added = results.length;
      var skipped = results.filter(function (ok) { return !ok; }).length;
      var msg = added + ' file' + (added > 1 ? 's' : '') + ' uploaded to your vault.' +
        (skipped ? ' ' + skipped + ' file' + (skipped > 1 ? 's' : '') + ' too large to preview (still saved).' : '');
      UI.toast(msg, 'success', 'Upload complete');
      renderDocs();
    });
  }

  var drop = document.getElementById('drop-zone');
  var input = document.getElementById('file-input');
  drop.addEventListener('click', function () { input.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
  });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

  /* ---------- Pending requests + Grant modal ---------------------------- */
  var grantForm = document.getElementById('grant-form');
  var activeRequestId = null;

  function renderPending() {
    var pending = Store.where('documentRequests', function (d) { return d.patientId === patientId && d.status === 'Pending'; });
    var host = document.getElementById('pending-list');
    if (!pending.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No pending requests.</p></div>'; return; }
    host.innerHTML = pending.map(function (d) {
      return '<div class="list-row"><div class="list-main"><div class="list-title body-sm">' + UI.esc(d.doctorName) + '</div>' +
        '<div class="list-sub">' + UI.esc(d.message) + '</div></div>' +
        '<button class="btn btn-primary btn-sm" data-grant="' + d.id + '">Grant</button></div>';
    }).join('');
    host.querySelectorAll('[data-grant]').forEach(function (b) {
      b.addEventListener('click', function () { openGrant(b.getAttribute('data-grant')); });
    });
  }

  function renderGrants() {
    var grants = Store.where('accessGrants', function (g) { return g.patientId === patientId; });
    var host = document.getElementById('grants-list');
    if (!grants.length) { host.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">lock</span><p>No active shares.</p></div>'; return; }
    host.innerHTML = grants.map(function (g) {
      var files = g.documentIds.map(function (id) { var d = Store.get('documents', id); return d ? d.name : id; });
      return '<div class="list-row"><div class="list-main"><div class="list-title body-sm">' + UI.esc(g.doctorName) + '</div>' +
        '<div class="list-sub">' + files.map(UI.esc).join(', ') + '</div>' +
        '<div class="list-sub">Access: ' + UI.esc(g.duration) + '</div></div>' +
        '<button class="btn btn-outline-danger btn-sm" data-revoke="' + g.id + '">Revoke</button></div>';
    }).join('');
    host.querySelectorAll('[data-revoke]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.remove('accessGrants', b.getAttribute('data-revoke'));
        UI.toast('Access revoked.', 'info', 'Consent updated');
        renderGrants();
      });
    });
  }

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
    UI.toast('Access granted to ' + req.doctorName + '.', 'success', 'Consent recorded');
    renderPending(); renderGrants();
  });

  renderDocs(); renderPending(); renderGrants();
})();
