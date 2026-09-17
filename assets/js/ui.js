/* ==========================================================================
   MediBridge — UI helpers (modals, toasts, validation, formatting)
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---- Modals ----------------------------------------------------------- */
  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    var first = el.querySelector('input, select, textarea, button');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeModal(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
    var form = el.querySelector('form');
    if (form) clearErrors(form);
  }
  // Wire overlay click + [data-close] buttons + Escape globally.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('modal-overlay')) closeModal(t);
    var closer = t.closest ? t.closest('[data-close]') : null;
    if (closer) {
      var overlay = closer.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.modal-overlay.open');
      if (open) closeModal(open);
    }
  });

  /* ---- Insight popover (click a KPI/grid cell for a quick detail view) --- */
  var insightAnchor = null;
  function insightHost() {
    var host = document.getElementById('insight-popover');
    if (!host) {
      host = document.createElement('div');
      host.id = 'insight-popover';
      host.className = 'insight-popover';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'false');
      document.body.appendChild(host);
    }
    return host;
  }
  function positionInsight(host, anchor) {
    var r = anchor.getBoundingClientRect();
    var margin = 10, width = host.offsetWidth || 320, height = host.offsetHeight || 120;
    var left = Math.min(Math.max(r.left, margin), window.innerWidth - width - margin);
    var top = r.bottom + margin, above = false;
    if (top + height > window.innerHeight - margin) {
      var fitsAbove = r.top - height - margin;
      if (fitsAbove >= margin) { top = fitsAbove; above = true; }
      else { top = Math.max(margin, window.innerHeight - height - margin); }
    }
    host.style.top = top + 'px';
    host.style.left = left + 'px';
    host.classList.toggle('arrow-top', !above);
    host.classList.toggle('arrow-bottom', above);
    var arrowX = Math.min(Math.max(r.left + r.width / 2 - left, 18), width - 18);
    host.style.setProperty('--arrow-x', arrowX + 'px');
  }
  // Opens a small popover of extra detail anchored to a clicked grid cell / KPI card.
  // opts: { icon, title, html }. Calling again on the same open anchor toggles it closed.
  function showInsight(anchor, opts) {
    var host = insightHost();
    if (insightAnchor === anchor && host.classList.contains('open')) { closeInsight(); return; }
    host.innerHTML =
      '<div class="insight-header"><span class="material-symbols-outlined">' + esc(opts.icon || 'insights') + '</span>' +
      '<span class="insight-title">' + esc(opts.title || '') + '</span>' +
      '<button type="button" class="insight-close" aria-label="Close"><span class="material-symbols-outlined">close</span></button></div>' +
      '<div class="insight-body">' + (opts.html || '') + '</div>';
    if (insightAnchor) insightAnchor.setAttribute('aria-expanded', 'false');
    insightAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    host.classList.add('open');
    host.querySelector('.insight-close').addEventListener('click', closeInsight);
    positionInsight(host, anchor);
    requestAnimationFrame(function () { positionInsight(host, anchor); });
  }
  function closeInsight() {
    var host = document.getElementById('insight-popover');
    if (!host) return;
    host.classList.remove('open');
    if (insightAnchor) insightAnchor.setAttribute('aria-expanded', 'false');
    insightAnchor = null;
  }
  document.addEventListener('click', function (e) {
    var host = document.getElementById('insight-popover');
    if (!host || !host.classList.contains('open')) return;
    if (host.contains(e.target)) return;
    if (insightAnchor && (e.target === insightAnchor || insightAnchor.contains(e.target))) return;
    closeInsight();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeInsight(); });
  window.addEventListener('resize', function () { if (insightAnchor) positionInsight(document.getElementById('insight-popover'), insightAnchor); });
  window.addEventListener('scroll', function () { if (insightAnchor) positionInsight(document.getElementById('insight-popover'), insightAnchor); }, true);

  // Delegated show/hide password toggle for any [data-toggle-pw="inputId"].
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-toggle-pw]') : null;
    if (!btn) return;
    var input = document.getElementById(btn.getAttribute('data-toggle-pw'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    var icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = show ? 'visibility_off' : 'visibility';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* ---- Toasts ----------------------------------------------------------- */
  function ensureToastHost() {
    var host = document.querySelector('.toast-container');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-container';
      document.body.appendChild(host);
    }
    return host;
  }
  var ICONS = { success: 'check_circle', error: 'error', info: 'info' };
  function toast(message, type, title) {
    type = type || 'info';
    var host = ensureToastHost();
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML =
      '<span class="material-symbols-outlined">' + (ICONS[type] || 'info') + '</span>' +
      '<div><div class="toast-title">' + (title || cap(type)) + '</div>' +
      '<div class="toast-msg"></div></div>';
    el.querySelector('.toast-msg').textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 200);
    }, 3200);
  }

  /* ---- Validation ------------------------------------------------------- */
  function fieldOf(input) { return input.closest('.field') || input.parentElement; }
  function setError(input, msg) {
    var f = fieldOf(input);
    f.classList.add('invalid');
    var err = f.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      f.appendChild(err);
    }
    err.textContent = msg;
  }
  function clearError(input) {
    var f = fieldOf(input);
    if (f) f.classList.remove('invalid');
  }
  function clearErrors(form) {
    form.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Accepts common phone formats: digits with optional +, spaces, dashes, dots, parentheses.
  var PHONE_CHARS_RE = /^[+]?[\d\s().-]+$/;
  // Names: start with a letter; letters, spaces, apostrophes, hyphens, periods.
  var NAME_RE = /^[A-Za-z][A-Za-z\s.'-]*$/;

  // Validate a form using data-* attributes on fields.
  // Supported: required, data-type="email|phone|tel|name", data-match="#id",
  //            data-min="n" (min length), data-maxlen="n", data-pattern="regex" (+ data-pattern-msg)
  function validate(form) {
    clearErrors(form);
    var ok = true, firstBad = null;
    var fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(function (el) {
      if (el.disabled || el.type === 'button' || el.type === 'submit') return;
      var val = (el.value || '').trim();
      var type = el.getAttribute('data-type');

      if ((el.required || el.hasAttribute('data-required'))) {
        if (el.type === 'checkbox' && !el.checked) { setError(el, 'This is required.'); ok = false; firstBad = firstBad || el; return; }
        if (el.type !== 'checkbox' && !val) { setError(el, 'This field is required.'); ok = false; firstBad = firstBad || el; return; }
      }
      if (val && type === 'email' && !EMAIL_RE.test(val)) {
        setError(el, 'Enter a valid email address.'); ok = false; firstBad = firstBad || el; return;
      }
      if (val && (type === 'phone' || type === 'tel')) {
        var digits = val.replace(/\D/g, '');
        if (!PHONE_CHARS_RE.test(val) || digits.length < 10 || digits.length > 15) {
          setError(el, 'Enter a valid phone number (10-15 digits).'); ok = false; firstBad = firstBad || el; return;
        }
      }
      if (val && type === 'name' && (val.length < 2 || !NAME_RE.test(val))) {
        setError(el, "Enter a valid name (letters, spaces, . ' - only)."); ok = false; firstBad = firstBad || el; return;
      }
      var min = el.getAttribute('data-min');
      if (val && min && val.length < parseInt(min, 10)) {
        setError(el, 'Must be at least ' + min + ' characters.'); ok = false; firstBad = firstBad || el; return;
      }
      var maxlen = el.getAttribute('data-maxlen');
      if (val && maxlen && val.length > parseInt(maxlen, 10)) {
        setError(el, 'Must be at most ' + maxlen + ' characters.'); ok = false; firstBad = firstBad || el; return;
      }
      var pattern = el.getAttribute('data-pattern');
      if (val && pattern) {
        var re; try { re = new RegExp(pattern, el.getAttribute('data-pattern-flags') || ''); } catch (err) { re = null; }
        if (re && !re.test(val)) {
          setError(el, el.getAttribute('data-pattern-msg') || 'Invalid format.'); ok = false; firstBad = firstBad || el; return;
        }
      }
      var match = el.getAttribute('data-match');
      if (match) {
        var other = form.querySelector(match);
        if (other && val !== (other.value || '').trim()) {
          setError(el, 'Values do not match.'); ok = false; firstBad = firstBad || el; return;
        }
      }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  // Clear a field's error as the user edits it.
  function liveClear(form) {
    form.addEventListener('input', function (e) { clearError(e.target); });
    form.addEventListener('change', function (e) { clearError(e.target); });
  }

  /* ---- Password strength ------------------------------------------------ */
  // Returns { score:0-4, label, className }
  function passwordStrength(pw) {
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    var map = [
      { label: 'Too weak', cls: 'weak' },
      { label: 'Weak', cls: 'weak' },
      { label: 'Fair', cls: 'fair' },
      { label: 'Good', cls: 'good' },
      { label: 'Strong', cls: 'strong' }
    ];
    return { score: score, label: map[score].label, className: map[score].cls };
  }
  function meetsPasswordPolicy(pw) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  }

  /* ---- Formatting ------------------------------------------------------- */
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function initials(name) {
    return (name || '').split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateShort(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtTime(hhmm) {
    if (!hhmm) return '';
    var parts = hhmm.split(':'), h = parseInt(parts[0], 10), m = parts[1];
    var ap = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ap;
  }
  function timeAgo(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- Shared page chrome (topbar profile, logout, active nav) ---------- */
  function mountChrome(session) {
    if (!session) return;
    document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = session.name; });
    document.querySelectorAll('[data-user-title]').forEach(function (el) { el.textContent = session.title || cap(session.role); });
    document.querySelectorAll('[data-avatar]').forEach(function (el) { el.textContent = initials(session.name); });
    document.querySelectorAll('[data-logout]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); if (global.Auth) global.Auth.logout(); });
    });
    // Staff profile chip opens Account & Security (patients use their own profile-link anchor).
    var prof = document.querySelector('.profile');
    if (prof && !prof.querySelector('a.profile-link')) {
      prof.querySelectorAll('.profile-meta, .avatar').forEach(function (el) {
        el.style.cursor = 'pointer';
        el.title = 'Account & security';
        el.addEventListener('click', function () { location.href = 'account.html'; });
      });
    }
    var here = location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href === here) a.classList.add('active');
    });
  }

  global.UI = {
    openModal: openModal, closeModal: closeModal,
    toast: toast,
    showInsight: showInsight, closeInsight: closeInsight,
    validate: validate, liveClear: liveClear, setError: setError, clearError: clearError, clearErrors: clearErrors,
    passwordStrength: passwordStrength, meetsPasswordPolicy: meetsPasswordPolicy,
    mountChrome: mountChrome,
    initials: initials, fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtTime: fmtTime, timeAgo: timeAgo, esc: esc, cap: cap
  };
})(window);
