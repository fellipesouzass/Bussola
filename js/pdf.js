/*
 * Bússola — gerador de PDF mínimo (sem dependências).
 * Texto (Helvetica / Helvetica-Bold, acentos do português), retângulos (com cantos arredondados), linhas, círculos e polígonos.
 * Coordenadas em milímetros, origem no canto SUPERIOR esquerdo da página (y cresce para baixo), página A4.
 * Funciona no navegador (window.BussolaPDF) e no Node (testes).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BussolaPDF = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PT = 72 / 25.4;                 // pontos por milímetro
  const PAGE_W = 210, PAGE_H = 297;     // A4 em mm

  /* Larguras (em 1/1000 do corpo) dos caracteres ASCII 32–126 das fontes padrão Helvetica e Helvetica-Bold. */
  const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

  /* Unicode → código WinAnsi (cp1252). O que não existe vira "?". */
  const CP1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
  function toWin(str) {
    let out = '';
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13) out += ' ';
      else if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255)) out += String.fromCharCode(c);
      else out += String.fromCharCode(CP1252[ch] || 63);
    }
    return out;
  }

  function charWidth(code, bold) {
    const t = bold ? W_BOLD : W_REG;
    if (code >= 32 && code <= 126) return t[code - 32];
    if (code === 160) return 278;
    if (code === 0xb7) return 278;                  // ·
    if (code === 0xd7 || code === 0xf7) return 584; // × ÷
    if (code === 0xb0) return 400;                  // °
    if (code === 0xaa) return 370;
    if (code === 0xba) return 365;
    if (code === 0x95) return 350;                  // •
    if (code === 0x96) return 556;                  // –
    if (code === 0x97) return 1000;                 // —
    if (code === 0x92 || code === 0x91) return bold ? 278 : 222;
    if (code === 0x93 || code === 0x94) return bold ? 500 : 333;
    if (code >= 0xc0) { // letras acentuadas: largura da letra base
      const base = String.fromCharCode(code).normalize('NFD')[0].charCodeAt(0);
      if (base >= 32 && base <= 126) return t[base - 32];
    }
    return 556;
  }

  /** Largura do texto em milímetros. */
  function textWidth(str, size, bold) {
    let w = 0;
    const s = toWin(str);
    for (let i = 0; i < s.length; i++) w += charWidth(s.charCodeAt(i), bold);
    return (w / 1000) * size / PT;
  }

  /** Quebra o texto em linhas que caibam em `maxW` mm. */
  function wrap(str, maxW, size, bold) {
    const lines = [];
    for (const par of String(str).split(/\r?\n/)) {
      let cur = '';
      for (const word of par.split(/\s+/).filter(Boolean)) {
        const test = cur ? cur + ' ' + word : word;
        if (textWidth(test, size, bold) <= maxW || !cur) {
          if (!cur && textWidth(word, size, bold) > maxW) { // palavra maior que a linha: corta
            let piece = '';
            for (const ch of word) { if (textWidth(piece + ch, size, bold) > maxW && piece) { lines.push(piece); piece = ''; } piece += ch; }
            cur = piece;
          } else cur = test;
        } else { lines.push(cur); cur = word; }
      }
      lines.push(cur);
    }
    while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  const num = (n) => (Math.round(n * 1000) / 1000).toString();
  function rgb(hex) {
    const h = String(hex || '#000000').replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => num(parseInt(f.slice(i, i + 2), 16) / 255)).join(' ');
  }
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  function create(meta) {
    meta = meta || {};
    const pages = [];
    let cur = null;

    const X = (x) => num(x * PT);
    const Y = (y) => num((PAGE_H - y) * PT);
    const add = (op) => { cur.push(op); };

    function addPage() { cur = []; pages.push(cur); return pages.length; }
    function setPage(i) { cur = pages[i - 1]; }

    function path(d) { return d; }
    function roundedPath(x, y, w, h, r) {
      r = Math.min(r || 0, w / 2, h / 2);
      if (r <= 0) return X(x) + ' ' + Y(y + h) + ' ' + num(w * PT) + ' ' + num(h * PT) + ' re';
      const k = 0.5523 * r;
      const p = (px, py) => X(px) + ' ' + Y(py);
      return [
        p(x + r, y) + ' m', p(x + w - r, y) + ' l',
        p(x + w - r + k, y) + ' ' + p(x + w, y + r - k) + ' ' + p(x + w, y + r) + ' c',
        p(x + w, y + h - r) + ' l',
        p(x + w, y + h - r + k) + ' ' + p(x + w - r + k, y + h) + ' ' + p(x + w - r, y + h) + ' c',
        p(x + r, y + h) + ' l',
        p(x + r - k, y + h) + ' ' + p(x, y + h - r + k) + ' ' + p(x, y + h - r) + ' c',
        p(x, y + r) + ' l',
        p(x, y + r - k) + ' ' + p(x + r - k, y) + ' ' + p(x + r, y) + ' c', 'h',
      ].join('\n');
    }
    function paint(shape, o) {
      o = o || {};
      let s = 'q\n';
      if (o.fill) s += rgb(o.fill) + ' rg\n';
      if (o.stroke) s += rgb(o.stroke) + ' RG\n' + num((o.lineWidth || 0.25) * PT) + ' w\n';
      s += shape + '\n' + (o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S') + '\nQ';
      add(s);
    }

    function rect(x, y, w, h, o) { paint(roundedPath(x, y, w, h, (o || {}).radius), o); }
    function line(x1, y1, x2, y2, o) {
      o = o || {};
      add('q\n' + rgb(o.color || '#000000') + ' RG\n' + num((o.width || 0.25) * PT) + ' w\n' + X(x1) + ' ' + Y(y1) + ' m ' + X(x2) + ' ' + Y(y2) + ' l S\nQ');
    }
    function circle(cx, cy, r, o) {
      const k = 0.5523 * r, p = (px, py) => X(px) + ' ' + Y(py);
      paint([p(cx + r, cy) + ' m',
        p(cx + r, cy + k) + ' ' + p(cx + k, cy + r) + ' ' + p(cx, cy + r) + ' c',
        p(cx - k, cy + r) + ' ' + p(cx - r, cy + k) + ' ' + p(cx - r, cy) + ' c',
        p(cx - r, cy - k) + ' ' + p(cx - k, cy - r) + ' ' + p(cx, cy - r) + ' c',
        p(cx + k, cy - r) + ' ' + p(cx + r, cy - k) + ' ' + p(cx + r, cy) + ' c', 'h'].join('\n'), o);
    }
    function polygon(points, o) {
      paint(points.map((pt, i) => X(pt[0]) + ' ' + Y(pt[1]) + (i ? ' l' : ' m')).join('\n') + '\nh', o);
    }
    /** y = linha de base do texto. align: 'left' | 'right' | 'center'. */
    function text(str, x, y, o) {
      o = o || {};
      const size = o.size || 10, bold = !!o.bold;
      let px = x;
      if (o.align === 'right') px = x - textWidth(str, size, bold);
      else if (o.align === 'center') px = x - textWidth(str, size, bold) / 2;
      add('BT\n/' + (bold ? 'F2' : 'F1') + ' ' + num(size) + ' Tf\n' + rgb(o.color || '#000000') + ' rg\n' + X(px) + ' ' + Y(y) + ' Td\n(' + esc(toWin(str)) + ') Tj\nET');
    }

    /** Monta o arquivo. Devolve Uint8Array. */
    function output() {
      const chunks = [];
      let offset = 0;
      const put = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; chunks.push(b); offset += b.length; };
      const xref = [];
      const obj = (n, body) => { xref[n] = offset; put(n + ' 0 obj\n' + body + '\nendobj\n'); };

      const nPages = pages.length;
      const firstPageObj = 6;                      // 1 catálogo, 2 páginas, 3 e 4 fontes, 5 info
      const kids = pages.map((_, i) => (firstPageObj + i * 2) + ' 0 R').join(' ');
      put('%PDF-1.4\n%âãÏÓ\n');
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
      obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + nPages + ' >>');
      obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      obj(5, '<< /Title (' + esc(toWin(meta.title || 'Documento')) + ') /Creator (' + esc(toWin(meta.creator || 'Bússola')) + ') /Producer (Bússola) >>');
      pages.forEach((ops, i) => {
        const pn = firstPageObj + i * 2, cn = pn + 1;
        const content = ops.join('\n');
        obj(pn, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(PAGE_W * PT) + ' ' + num(PAGE_H * PT) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cn + ' 0 R >>');
        obj(cn, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      });
      const total = firstPageObj + nPages * 2;
      const xrefPos = offset;
      let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
      for (let n = 1; n < total; n++) x += String(xref[n]).padStart(10, '0') + ' 00000 n \n';
      put(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n');
      const out = new Uint8Array(offset);
      let p = 0;
      for (const c of chunks) { out.set(c, p); p += c.length; }
      return out;
    }

    addPage();
    return { addPage, setPage, pageCount: () => pages.length, rect, line, circle, polygon, text, textWidth, wrap, output, W: PAGE_W, H: PAGE_H };
  }

  return { create, textWidth, wrap, toWin, PAGE_W, PAGE_H };
});
