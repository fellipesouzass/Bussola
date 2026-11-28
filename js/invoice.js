/*
 * Bússola — fatura do mês em PDF, no layout do modelo "Invoice Template":
 * título + dados da fatura · logo · cartões "Emitido por" / "Cobrado de" · tabela com faixa colorida ·
 * resumo por categoria e observações · totais · rodapé.
 *
 * Para ajustar o visual, mexa em THEME (cores) e LAYOUT (medidas em mm) logo abaixo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./pdf.js'));
  else root.BussolaInvoice = factory(root.BussolaCore, root.BussolaPDF);
})(typeof self !== 'undefined' ? self : this, function (C, P) {
  'use strict';

  const THEME = {
    accent: '#3F8FD2',      // faixa da tabela e títulos dos cartões
    ink: '#1F2430',         // texto principal
    muted: '#6B7080',       // rótulos e texto secundário
    line: '#E6E6EE',        // separadores e bordas
    card: '#F8F8FC',        // fundo dos cartões
    cardBorder: '#ECECF4',
    footer: '#E5F0FB',      // faixa do rodapé
    white: '#FFFFFF',
  };

  const LAYOUT = {
    margin: 14,             // margem lateral
    contentW: 182,          // largura útil (A4 = 210)
    pageTop: 18,            // início do conteúdo nas páginas seguintes
    bottom: 272,            // limite inferior do conteúdo (acima do rodapé)
    cardH: 40,
    rowPad: 3.2,
    maxCategorias: 8,
  };

  /** Logo da Bússola desenhado em vetor (centro cx, cy; raio r em mm). */
  function drawCompass(doc, cx, cy, r) {
    const s = r / 47; // 1 unidade da logo (viewBox 100) em mm
    doc.circle(cx, cy, r, { fill: '#5B5B69' });
    doc.circle(cx, cy, 37 * s, { fill: '#EAF0FA' });
    doc.line(cx, cy - 23 * s, cx, cy + 23 * s, { color: '#A9BCD6', width: 5 * s });
    doc.line(cx - 23 * s, cy, cx + 23 * s, cy, { color: '#A9BCD6', width: 5 * s });
    const rot = (x, y) => { const a = Math.PI / 4; return [cx + (x * Math.cos(a) - y * Math.sin(a)) * s, cy + (x * Math.sin(a) + y * Math.cos(a)) * s]; };
    const poly = (pts, fill) => doc.polygon(pts.map((p) => rot(p[0], p[1])), { fill });
    poly([[0, -38], [9, 0], [-9, 0]], '#F0524F'); poly([[0, -38], [9, 0], [0, 0]], '#D9403F');
    poly([[0, 38], [-9, 0], [9, 0]], '#6DB6E8'); poly([[0, 38], [-9, 0], [0, 0]], '#4A9BD9');
    doc.circle(cx, cy, 7 * s, { fill: '#3A3A46' });
  }

  /**
   * Gera o PDF. model = C.invoiceModel(...). info = { by:{nome,endereco,email,telefone}, to:{...}, nota }.
   * Devolve Uint8Array.
   */
  function render(model, info) {
    info = info || {};
    const by = info.by || {}, to = info.to || {};
    const L = LAYOUT, T = THEME, M = L.margin, CW = L.contentW;
    const money = (c) => C.fmtBRL(c);
    const doc = P.create({ title: 'Fatura ' + model.numero + ' - ' + model.mesLabel, creator: 'Bússola' });

    /* ---------- cabeçalho ---------- */
    doc.text('Fatura', M, 25, { size: 22, bold: true, color: T.ink });
    [['Nº da fatura', '#' + model.numero], ['Período', model.mesLabel], ['Data de emissão', C.fmtDate(model.emissao)], ['Vencimento', C.fmtDate(model.vencimento)]]
      .forEach(([k, v], i) => {
        doc.text(k, M, 34 + i * 6, { size: 9, color: T.muted });
        doc.text(v, M + 34, 34 + i * 6, { size: 9.5, color: T.ink });
      });
    // logo
    doc.rect(150, 14, 46, 24, { stroke: T.line, lineWidth: 0.3, radius: 3 });
    drawCompass(doc, 160, 26, 7.5);
    doc.text('Bússola', 170, 28.2, { size: 13, bold: true, color: T.ink });

    /* ---------- cartões Emitido por / Cobrado de ---------- */
    const card = (x, titulo, d) => {
      const y = 62, w = 87;
      doc.rect(x, y, w, L.cardH, { fill: T.card, stroke: T.cardBorder, lineWidth: 0.3, radius: 3 });
      doc.text(titulo, x + 5, y + 8, { size: 10, color: T.accent, bold: true });
      doc.text(d.nome || '—', x + 5, y + 15, { size: 11.5, bold: true, color: T.ink });
      doc.wrap(d.endereco || '', w - 10, 9, false).slice(0, 2).forEach((ln, i) => doc.text(ln, x + 5, y + 20.5 + i * 4.3, { size: 9, color: T.ink }));
      if (d.email) { doc.text('E-mail', x + 5, y + L.cardH - 9, { size: 8.5, color: T.muted }); doc.text(d.email, x + 22, y + L.cardH - 9, { size: 8.5, color: T.ink }); }
      if (d.telefone) { doc.text('Telefone', x + 5, y + L.cardH - 4, { size: 8.5, color: T.muted }); doc.text(d.telefone, x + 22, y + L.cardH - 4, { size: 8.5, color: T.ink }); }
    };
    card(M, info.rotuloBy || 'Emitido por', by);
    card(M + 95, info.rotuloTo || 'Cobrado de', to);

    /* ---------- tabela ---------- */
    const dataR = 136, parcR = 160, valR = M + CW - 4;
    const descX = M + 4, descMax = dataR - 20 - descX - 2;
    let y = 62 + L.cardH + 10, segStart = y;

    const tableHeader = (top) => {
      doc.rect(M, top, CW, 9, { fill: T.accent, radius: 3 });
      doc.rect(M, top + 4.5, CW, 4.5, { fill: T.accent }); // cantos inferiores retos
      doc.text('Descrição', descX, top + 6, { size: 9, bold: true, color: T.white });
      doc.text('Data', dataR, top + 6, { size: 9, bold: true, color: T.white, align: 'right' });
      doc.text('Parcela', parcR, top + 6, { size: 9, bold: true, color: T.white, align: 'right' });
      doc.text('Valor', valR, top + 6, { size: 9, bold: true, color: T.white, align: 'right' });
      return top + 9;
    };
    const closeSegment = (end) => doc.rect(M, segStart, CW, end - segStart, { stroke: T.line, lineWidth: 0.3, radius: 3 });

    y = tableHeader(y);
    const linhas = model.linhas.length ? model.linhas : [{ titulo: 'Nenhum gasto neste mês', sub: [], data: '', parcela: '', valor: null, tipo: 'despesa', vazio: true }];
    linhas.forEach((l, idx) => {
      let titulo = doc.wrap(l.titulo, descMax, 10, true);
      if (titulo.length > 2) titulo = [titulo[0], titulo[1].replace(/.{1,2}$/, '') + '…'];
      let sub = l.sub && l.sub.length ? doc.wrap(l.sub.join(' · '), descMax, 8.5, false).slice(0, 3) : [];
      const h = L.rowPad + titulo.length * 4.4 + sub.length * 3.9 + L.rowPad;
      if (y + h > L.bottom) { // quebra de página: fecha o quadro, reabre com o cabeçalho da tabela
        closeSegment(y);
        doc.addPage();
        y = L.pageTop; segStart = y;
        y = tableHeader(y);
      }
      const base = y + L.rowPad + 3.4;
      titulo.forEach((t, i) => doc.text(t, descX, base + i * 4.4, { size: 10, bold: true, color: T.ink }));
      sub.forEach((s, i) => doc.text(s, descX, base + titulo.length * 4.4 - 0.4 + i * 3.9, { size: 8.5, color: T.muted }));
      if (!l.vazio) {
        doc.text(C.fmtDate(l.data), dataR, base, { size: 9.5, color: T.ink, align: 'right' });
        if (l.parcela) doc.text(l.parcela, parcR, base, { size: 9.5, color: T.ink, align: 'right' });
        doc.text((l.tipo === 'receita' ? '+' : '') + money(l.valor), valR, base, { size: 9.5, bold: true, color: l.tipo === 'receita' ? '#1C7F58' : T.ink, align: 'right' });
      }
      y += h;
      if (idx < linhas.length - 1) doc.line(M, y, M + CW, y, { color: T.line, width: 0.25 });
    });
    closeSegment(y);

    /* ---------- resumo por categoria, observações e totais ---------- */
    y += 9;
    const cats = model.porCategoria.slice();
    let outras = 0;
    if (cats.length > L.maxCategorias) cats.splice(L.maxCategorias).forEach((c) => { outras += c.valor; });
    const nCat = cats.length + (outras ? 1 : 0);
    const catH = 15 + Math.max(1, nCat) * 5.4 + 3;
    const nota = (info.nota || '').trim();
    const notaLines = nota ? doc.wrap(nota, 90, 9, false) : [];
    const notaH = notaLines.length ? 15 + notaLines.length * 4.4 + 2 : 0;
    const leftH = catH + (notaH ? 8 + notaH : 0);
    const rightH = 56;
    if (y + Math.max(leftH, rightH) > L.bottom) { doc.addPage(); y = L.pageTop; }

    // esquerda
    const lw = 100;
    doc.rect(M, y, lw, catH, { fill: T.card, stroke: T.cardBorder, lineWidth: 0.3, radius: 3 });
    doc.text('Resumo por categoria', M + 5, y + 8, { size: 10, bold: true, color: T.accent });
    const all = outras ? cats.concat([{ nome: 'Outras categorias', valor: outras, pct: Math.round((outras / (model.totais.total || 1)) * 100) }]) : cats;
    if (!all.length) doc.text('Sem gastos neste mês.', M + 5, y + 16, { size: 9, color: T.muted });
    all.forEach((c, i) => {
      const ry = y + 16 + i * 5.4;
      doc.text(c.nome, M + 5, ry, { size: 9, color: T.muted });
      doc.text(c.pct + '%', M + lw - 38, ry, { size: 9, color: T.muted, align: 'right' });
      doc.text(money(c.valor), M + lw - 5, ry, { size: 9, bold: true, color: T.ink, align: 'right' });
    });
    if (notaH) {
      const ny = y + catH + 8;
      doc.rect(M, ny, lw, notaH, { fill: T.card, stroke: T.cardBorder, lineWidth: 0.3, radius: 3 });
      doc.text('Observações', M + 5, ny + 8, { size: 10, bold: true, color: T.accent });
      notaLines.forEach((ln, i) => doc.text(ln, M + 5, ny + 15 + i * 4.4, { size: 9, color: T.ink }));
    }

    // direita (totais)
    const rx = M + CW - 70, rr = M + CW - 2;
    const t = model.totais;
    let ty = y + 8;
    const row = (k, v, o) => { doc.text(k, rx, ty, { size: 9, color: T.muted }); doc.text(v, rr, ty, { size: 9.5, bold: true, color: (o && o.color) || T.ink, align: 'right' }); ty += 7; };
    row('Lançado no mês', money(t.lancado));
    row('Contas fixas a pagar', money(t.fixasAPagar));
    ty += 1;
    doc.line(rx, ty - 3, rr, ty - 3, { color: T.ink, width: 0.5 });
    doc.text('Total do mês', rx, ty + 4, { size: 12, bold: true, color: T.ink });
    doc.text(money(t.total), rr, ty + 4, { size: 13, bold: true, color: T.ink, align: 'right' });
    doc.line(rx, ty + 8, rr, ty + 8, { color: T.ink, width: 0.5 });
    ty += 17;
    if (model.incluirReceitas) {
      row('Receitas do mês', '+' + money(t.receitas), { color: '#1C7F58' });
      row('Saldo do mês', money(t.saldo), { color: t.saldo < 0 ? '#C93A37' : '#1C7F58' });
    }
    doc.wrap('Compras no cartão de crédito aparecem no mês de vencimento da fatura.', 68, 7.5, false)
      .forEach((ln, i) => doc.text(ln, rx, ty + 1 + i * 3.4, { size: 7.5, color: T.muted }));

    /* ---------- rodapé em todas as páginas ---------- */
    const n = doc.pageCount();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.rect(0, 285, 210, 12, { fill: T.footer });
      doc.text('Gerado pela Bússola · Página ' + i + ' de ' + n, 105, 291.8, { size: 8.5, color: T.accent, align: 'center' });
    }
    return doc.output();
  }

  return { render, THEME, LAYOUT };
});
