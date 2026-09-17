/* ==========================================================================
   MediBridge — Minimal QR Code generator (pure vanilla JS, no dependencies)
   Byte mode, error-correction level M, versions 1–6 (up to 106 bytes).
   Produces a real, scannable QR rendered as crisp SVG.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---- Galois field GF(256), primitive polynomial 0x11d ----------------- */
  var EXP = new Array(256), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (var j = 255; j < 256; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[(LOG[a] + LOG[b]) % 255]; }

  // Monic Reed–Solomon generator polynomial of degree n.
  function rsGenPoly(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1);
      for (var k = 0; k < ng.length; k++) ng[k] = 0;
      for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  function rsEncode(data, ecLen) {
    var gen = rsGenPoly(ecLen), res = new Array(ecLen), i;
    for (i = 0; i < ecLen; i++) res[i] = 0;
    for (i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (factor !== 0) for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
    return res;
  }

  /* ---- Version tables (EC level M): [numBlocks, ecPerBlock, dataPerBlock] */
  var RSBLOCK = { 1: [1, 7, 19], 2: [1, 10, 34], 3: [1, 15, 55], 4: [1, 20, 80], 5: [1, 26, 108], 6: [2, 18, 68] }; // EC level L
  var PATTERN_POS = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

  /* ---- BCH format information (15-bit) ---------------------------------- */
  var G15 = 0x537, G15_MASK = 0x5412;
  function bchDigit(d) { var n = 0; while (d !== 0) { n++; d >>>= 1; } return n; }
  function bchTypeInfo(data) {
    var d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0) d ^= (G15 << (bchDigit(d) - bchDigit(G15)));
    return ((data << 10) | d) ^ G15_MASK;
  }

  /* ---- Data mask functions ---------------------------------------------- */
  function maskFn(p) {
    switch (p) {
      case 0: return function (i, j) { return (i + j) % 2 === 0; };
      case 1: return function (i) { return i % 2 === 0; };
      case 2: return function (i, j) { return j % 3 === 0; };
      case 3: return function (i, j) { return (i + j) % 3 === 0; };
      case 4: return function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; };
      case 5: return function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; };
      case 6: return function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; };
      default: return function (i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 === 0; };
    }
  }

  /* ---- Bit buffer ------------------------------------------------------- */
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (num, len) { for (var i = len - 1; i >= 0; i--) this.bits.push(((num >>> i) & 1) === 1); };
  BitBuffer.prototype.toBytes = function () {
    var out = [];
    for (var i = 0; i < this.bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ? 1 : 0);
      out.push(b);
    }
    return out;
  };

  /* ---- UTF-8 encode (native TextEncoder, with fallback) ----------------- */
  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(str));
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  /* ---- Encode payload into interleaved codewords ------------------------ */
  function encodeData(bytes, version) {
    var rs = RSBLOCK[version], numBlocks = rs[0], ecLen = rs[1], dataPerBlock = rs[2];
    var totalDataCw = numBlocks * dataPerBlock, capacityBits = totalDataCw * 8;
    var buf = new BitBuffer();
    buf.put(4, 4);                 // byte mode
    buf.put(bytes.length, 8);      // char count (versions 1–9)
    for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);
    for (var t = 0; t < 4 && buf.bits.length < capacityBits; t++) buf.bits.push(false); // terminator
    while (buf.bits.length % 8 !== 0) buf.bits.push(false);
    var pads = [0xec, 0x11], pi = 0;
    while (buf.bits.length + 8 <= capacityBits) { buf.put(pads[pi], 8); pi ^= 1; }
    var dataCw = buf.toBytes();

    var blocks = [];
    for (var b = 0; b < numBlocks; b++) {
      var blk = dataCw.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
      blocks.push({ data: blk, ec: rsEncode(blk, ecLen) });
    }
    var result = [], k;
    for (k = 0; k < dataPerBlock; k++) for (b = 0; b < numBlocks; b++) result.push(blocks[b].data[k]);
    for (k = 0; k < ecLen; k++) for (b = 0; b < numBlocks; b++) result.push(blocks[b].ec[k]);
    return result;
  }

  /* ---- Matrix construction ---------------------------------------------- */
  function probe(m, n, row, col) {
    for (var r = -1; r <= 7; r++) {
      if (row + r <= -1 || n <= row + r) continue;
      for (var c = -1; c <= 7; c++) {
        if (col + c <= -1 || n <= col + c) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m[row + r][col + c] = on;
      }
    }
  }
  function timing(m, n) {
    for (var r = 8; r < n - 8; r++) if (m[r][6] === null) m[r][6] = (r % 2 === 0);
    for (var c = 8; c < n - 8; c++) if (m[6][c] === null) m[6][c] = (c % 2 === 0);
  }
  function align(m, n, version) {
    var pos = PATTERN_POS[version];
    for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
      var row = pos[i], col = pos[j];
      if (m[row][col] !== null) continue;
      for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++)
        m[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
    }
  }
  function typeInfo(m, n, test, mask) {
    var bits = bchTypeInfo((1 << 3) | mask), i, mod; // EC level L = 1
    for (i = 0; i < 15; i++) {
      mod = (!test && ((bits >> i) & 1) === 1);
      if (i < 6) m[i][8] = mod; else if (i < 8) m[i + 1][8] = mod; else m[n - 15 + i][8] = mod;
    }
    for (i = 0; i < 15; i++) {
      mod = (!test && ((bits >> i) & 1) === 1);
      if (i < 8) m[8][n - i - 1] = mod; else if (i < 9) m[8][15 - i - 1 + 1] = mod; else m[8][15 - i - 1] = mod;
    }
    m[n - 8][8] = !test; // dark module
  }
  function mapData(m, n, data, mask) {
    var mf = maskFn(mask), inc = -1, row = n - 1, bitIndex = 7, byteIndex = 0;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (var c = 0; c < 2; c++) {
          if (m[row][col - c] === null) {
            var dark = false;
            if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
            if (mf(row, col - c)) dark = !dark;
            m[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || n <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }
  function build(data, version, mask, test) {
    var n = 17 + 4 * version, m = [], r;
    for (r = 0; r < n; r++) { m.push(new Array(n)); for (var c = 0; c < n; c++) m[r][c] = null; }
    probe(m, n, 0, 0); probe(m, n, n - 7, 0); probe(m, n, 0, n - 7);
    align(m, n, version); timing(m, n); typeInfo(m, n, test, mask); mapData(m, n, data, mask);
    return m;
  }

  // Penalty scoring to pick the least-noisy mask.
  function lostPoint(m) {
    var n = m.length, lost = 0, row, col, r, c;
    for (row = 0; row < n; row++) for (col = 0; col < n; col++) {
      var same = 0, dark = m[row][col];
      for (r = -1; r <= 1; r++) { if (row + r < 0 || n <= row + r) continue;
        for (c = -1; c <= 1; c++) { if (col + c < 0 || n <= col + c || (r === 0 && c === 0)) continue; if (dark === m[row + r][col + c]) same++; } }
      if (same > 5) lost += 3 + same - 5;
    }
    for (row = 0; row < n - 1; row++) for (col = 0; col < n - 1; col++) {
      var cnt = 0;
      if (m[row][col]) cnt++; if (m[row + 1][col]) cnt++; if (m[row][col + 1]) cnt++; if (m[row + 1][col + 1]) cnt++;
      if (cnt === 0 || cnt === 4) lost += 3;
    }
    for (row = 0; row < n; row++) for (col = 0; col < n - 6; col++)
      if (m[row][col] && !m[row][col + 1] && m[row][col + 2] && m[row][col + 3] && m[row][col + 4] && !m[row][col + 5] && m[row][col + 6]) lost += 40;
    for (col = 0; col < n; col++) for (row = 0; row < n - 6; row++)
      if (m[row][col] && !m[row + 1][col] && m[row + 2][col] && m[row + 3][col] && m[row + 4][col] && !m[row + 5][col] && m[row + 6][col]) lost += 40;
    var darkCount = 0;
    for (col = 0; col < n; col++) for (row = 0; row < n; row++) if (m[row][col]) darkCount++;
    lost += Math.abs(100 * darkCount / (n * n) - 50) / 5 * 10;
    return lost;
  }

  function generate(text) {
    var bytes = utf8(String(text)), version = 0, v;
    for (v = 1; v <= 6; v++) { if (bytes.length <= RSBLOCK[v][0] * RSBLOCK[v][2] - 2) { version = v; break; } }
    if (version === 0) { bytes = bytes.slice(0, RSBLOCK[6][0] * RSBLOCK[6][2] - 2); version = 6; }
    var data = encodeData(bytes, version), best = 0, min = Infinity;
    for (var mask = 0; mask < 8; mask++) { var lp = lostPoint(build(data, version, mask, true)); if (lp < min) { min = lp; best = mask; } }
    return build(data, version, best, false);
  }

  /* ---- Styled SVG renderer ----------------------------------------------
     Backward compatible: called as svg(text, { px, margin, fg, bg }) it still
     emits crisp black squares. Pass opts.style ('rounded' | 'dots') and/or
     opts.gradient to get the branded, ICQR-inspired look — a gradient fill,
     rounded/dot data modules, and softened finder "eyes". This encodes the
     SAME URL you pass in; only the appearance changes, so the code stays a
     real, scannable QR generated entirely offline (no third-party service).  */

  // A module belongs to a finder "eye" if it sits in one of the three 7x7
  // corner blocks. Those are drawn as styled shapes, not individual modules.
  function eyeOrigins(n) { return [[0, 0], [0, n - 7], [n - 7, 0]]; }
  function inEye(r, c, n) {
    var e = eyeOrigins(n);
    for (var i = 0; i < e.length; i++) {
      var or = e[i][0], oc = e[i][1];
      if (r >= or && r <= or + 6 && c >= oc && c <= oc + 6) return true;
    }
    return false;
  }

  // One styled finder eye: rounded outer ring + rounded inner pupil.
  function eyeShapes(or, oc, margin, color) {
    var x = oc + margin, y = or + margin;
    return (
      '<rect x="' + x + '" y="' + y + '" width="7" height="7" rx="2.1" fill="' + color + '"/>' +
      '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" rx="1.5" fill="var(--qr-bg)"/>' +
      '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" rx="1" fill="' + color + '"/>'
    );
  }

  function svg(text, opts) {
    opts = opts || {};
    var margin = opts.margin != null ? opts.margin : 4;
    var fg = opts.fg || '#0b1c30', bg = opts.bg || '#ffffff';
    var style = opts.style || 'square';                 // 'square' | 'rounded' | 'dots'
    var eyeColor = opts.eyeColor || fg;
    var grad = opts.gradient;                           // e.g. { from:'#0b1c30', to:'#004ac6' }
    var uid = 'qrg' + Math.random().toString(36).slice(2, 8);
    var m = generate(text), n = m.length, total = n + margin * 2;

    // Fill for data modules + eyes: a gradient (branded look) or a flat colour.
    var dataFill = grad ? 'url(#' + uid + ')' : fg;
    if (grad) eyeColor = opts.eyeColor || 'url(#' + uid + ')';

    var mods = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!m[r][c] || inEye(r, c, n)) continue;
      var x = c + margin, y = r + margin;
      if (style === 'dots') {
        mods += '<circle cx="' + (x + 0.5) + '" cy="' + (y + 0.5) + '" r="0.46"/>';
      } else if (style === 'rounded') {
        mods += '<rect x="' + (x + 0.06) + '" y="' + (y + 0.06) + '" width="0.88" height="0.88" rx="0.34"/>';
      } else {
        mods += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
    }

    var eyes = '';
    var eo = eyeOrigins(n);
    for (var i = 0; i < eo.length; i++) eyes += eyeShapes(eo[i][0], eo[i][1], margin, eyeColor);

    var defs = grad
      ? '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + (grad.from || fg) + '"/>' +
        '<stop offset="1" stop-color="' + (grad.to || fg) + '"/></linearGradient></defs>'
      : '';

    var dim = opts.px ? ' width="' + opts.px + '" height="' + opts.px + '"' : '';
    var render = style === 'square' ? ' shape-rendering="crispEdges"' : '';
    // --qr-bg lets the eye "pupil" gaps match the code background exactly.
    return '<svg xmlns="http://www.w3.org/2000/svg" style="--qr-bg:' + bg + '"' + dim +
      ' viewBox="0 0 ' + total + ' ' + total + '"' + render +
      ' role="img" aria-label="Scannable patient QR code">' +
      defs +
      '<rect width="' + total + '" height="' + total + '" fill="' + bg + '"/>' +
      '<g fill="' + dataFill + '">' + mods + '</g>' +
      eyes + '</svg>';
  }

  global.QR = { generate: generate, svg: svg };
})(window);
