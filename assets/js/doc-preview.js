/* ==========================================================================
   MediBridge — Document Preview (inline PDF/image viewer, vanilla JS)
   Renders a document's stored data URL in a modal: native PDF/image preview
   where possible, with a download fallback for everything else.
   ========================================================================== */
(function (global) {
  'use strict';

  var MODAL_ID = 'doc-preview-modal';

  function ensureModal() {
    var el = document.getElementById(MODAL_ID);
    if (el) return el;
    el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = MODAL_ID;
    el.innerHTML =
      '<div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="doc-preview-title">' +
        '<div class="modal-header">' +
          '<div class="row gap-sm">' +
            '<span class="stat-icon"><span class="material-symbols-outlined" id="doc-preview-icon">description</span></span>' +
            '<div><h2 class="modal-title" id="doc-preview-title">Document</h2><p class="modal-desc" id="doc-preview-meta"></p></div>' +
          '</div>' +
          '<button class="modal-close" data-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="modal-body" id="doc-preview-body"></div>' +
        '<div class="modal-footer between">' +
          '<span class="row gap-xs muted body-sm"><span class="material-symbols-outlined" style="font-size:16px">lock</span>Preview stays in your browser</span>' +
          '<div class="row gap-md">' +
            '<button class="btn btn-secondary" type="button" data-close>Close</button>' +
            '<a class="btn btn-primary" id="doc-preview-download"><span class="material-symbols-outlined">download</span><span>Download</span></a>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function guessMime(doc) {
    if (doc.mimeType) return doc.mimeType;
    var n = (doc.name || '').toLowerCase();
    if (n.slice(-4) === '.pdf') return 'application/pdf';
    if (/\.(png|jpe?g|gif|webp)$/.test(n)) return 'image/*';
    return '';
  }

  // doc: a 'documents' Store record — { name, type, size, mimeType, dataUrl }
  function open(doc) {
    ensureModal();
    document.getElementById('doc-preview-title').textContent = doc.name || 'Document';
    document.getElementById('doc-preview-meta').textContent = (doc.type ? doc.type + ' • ' : '') + (doc.size || '');
    var icon = document.getElementById('doc-preview-icon');
    var body = document.getElementById('doc-preview-body');
    var dl = document.getElementById('doc-preview-download');
    var mime = guessMime(doc);

    if (!doc.dataUrl) {
      icon.textContent = 'description';
      body.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">visibility_off</span>' +
        '<p>No stored preview available for this file.</p>' +
        '<p class="body-sm muted">This record was added before preview support was enabled.</p></div>';
      dl.classList.add('hidden');
    } else if (mime === 'application/pdf') {
      icon.textContent = 'picture_as_pdf';
      body.innerHTML = '<iframe src="' + doc.dataUrl + '" title="' + UI.esc(doc.name) +
        '" style="width:100%;height:70vh;border:0;border-radius:var(--radius-md);background:var(--surface-container-low)"></iframe>';
      dl.classList.remove('hidden');
      dl.setAttribute('href', doc.dataUrl);
      dl.setAttribute('download', doc.name || 'document.pdf');
    } else if (mime.indexOf('image/') === 0) {
      icon.textContent = 'image';
      body.innerHTML = '<div style="text-align:center"><img src="' + doc.dataUrl + '" alt="' + UI.esc(doc.name) +
        '" style="max-width:100%;max-height:70vh;border-radius:var(--radius-md)" /></div>';
      dl.classList.remove('hidden');
      dl.setAttribute('href', doc.dataUrl);
      dl.setAttribute('download', doc.name || 'image');
    } else {
      icon.textContent = 'draft';
      body.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">visibility_off</span>' +
        '<p>Preview isn\u2019t available for this file type.</p>' +
        '<p class="body-sm muted">You can still download the original file.</p></div>';
      dl.classList.remove('hidden');
      dl.setAttribute('href', doc.dataUrl);
      dl.setAttribute('download', doc.name || 'document');
    }
    UI.openModal(MODAL_ID);
  }

  global.DocPreview = { open: open };
})(window);
