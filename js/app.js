/* Bússola — interface. Navegação, telas, formulários e animações. */
(function () {
  'use strict';
  const C = window.BussolaCore, S = window.BussolaStore, U = window.BussolaUpdater, Cloud = window.BussolaCloud;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = (c, o) => C.fmtBRL(c, o);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#7a8599');
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  /* ------------------------------------------------------------------ ícones */
  const I = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
    wallet: '<rect x="3" y="6.5" width="18" height="13.5" rx="3.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="15" r="1.2"/><path d="M6 6.5 15 3.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>', upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4"/>',
    up: '<path d="M7 17 17 7M9 7h8v8"/>', down: '<path d="M7 7l10 10M17 9v8H9"/>', flat: '<path d="M5 12h14"/>',
    pix: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="M8.5 12 12 8.5l3.5 3.5-3.5 3.5z"/>',
    debito: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>',
    credito: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M15 15h3"/>',
    dinheiro: '<rect x="3" y="7" width="18" height="10" rx="2.5"/><circle cx="12" cy="12" r="2.4"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  };
  const ico = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>';
  const ACC = { pix: { n: 'Pix', c: '#27a3b5' }, debito: { n: 'Débito', c: '#3f8fd2' }, credito: { n: 'Crédito', c: '#8e6bd8' }, dinheiro: { n: 'Dinheiro', c: '#2aa876' } };

  /* ------------------------------------------------------------------ estado da UI */
  const PAGES = [
    { id: 'inicio', label: 'Início', icon: 'home' },
    { id: 'transacoes', label: 'Transações', icon: 'list' },
    { id: 'contas', label: 'Contas', icon: 'wallet' },
    { id: 'analise', label: 'Análise', icon: 'chart' },
    { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
  ];
  const ui = { page: null, month: C.monthKey(C.todayISO()), q: '', fConta: 'todas', txTipo: 'todos', contasTab: 'carteiras', ajTab: 'categorias', imp: null, upd: { status: 'idle' } };
  const view = $('#view'), dlg = $('#dlg');

  const cat = (id) => S.categoria(id) || { id: '', nome: 'Sem categoria', cor: '#7a8599', kind: 'despesa' };
  const conta = (id) => S.conta(id) || { id: '', nome: 'Sem conta', tipo: 'pix' };
  const D = () => S.data();
  const today = () => C.todayISO();
  const byDateDesc = (a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0);

  /* ---------------------------------------------------------- animações utilitárias */
  function place(el, thumb, vars) {
    if (!el || !thumb) return;
    for (const [k, v] of Object.entries(vars)) thumb.style.setProperty(k, v + 'px');
    if (!thumb.classList.contains('ready')) requestAnimationFrame(() => requestAnimationFrame(() => thumb.classList.add('ready')));
  }
  function moveThumb(seg) {
    const b = $('.seg-btn[aria-selected="true"]', seg), t = $('.seg-thumb', seg);
    if (b && t && b.offsetWidth) place(b, t, { '--x': b.offsetLeft, '--w': b.offsetWidth });
  }
  function moveNavIndicator() {
    const nav = $('#nav'), a = $('.nav-item[aria-current="page"]', nav), t = $('.nav-ind', nav);
    if (a && t && a.offsetWidth) place(a, t, { '--x': a.offsetLeft, '--y': a.offsetTop, '--w': a.offsetWidth, '--h': a.offsetHeight });
  }
  function positionThumbs(root) { $$('.seg', root || document).forEach(moveThumb); moveNavIndicator(); }

  function countUp(el) {
    const to = Number(el.dataset.v), sign = el.dataset.sign === '1';
    if (reduce || !Number.isFinite(to)) return;
    const t0 = performance.now(), dur = 900;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = R(Math.round(to * (1 - Math.pow(1 - p, 4))), { sign });
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = R(0, { sign });
    requestAnimationFrame(step);
  }

  /** Pós-render de um trecho: escalonamento, barras, medidor, rosca, contadores. */
  function finish(root, animate) {
    if (animate) $$('.st', root).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 9)));
    $$('.count', root).forEach((el) => { if (animate) countUp(el); });
    const go = () => {
      $$('.bar, .gauge', root).forEach((el) => el.classList.add('in'));
      $$('.seg-c', root).forEach((c) => { c.style.strokeDasharray = c.dataset.len + ' ' + (100 - c.dataset.len); });
    };
    if (animate) requestAnimationFrame(() => requestAnimationFrame(go)); else go();
    positionThumbs(root);
  }

  /* ------------------------------------------------------------------ diálogo */
  let dlgResolve = null;
  function openDialog(html, o) {
    o = o || {};
    if (dlgResolve) { const r = dlgResolve; dlgResolve = null; r(undefined); }
    return new Promise((resolve) => {
      dlgResolve = resolve;
      dlg.className = 'dlg' + (o.wide ? ' wide' : '');
      dlg.innerHTML = html;
      if (!dlg.open) dlg.showModal();
      void dlg.offsetWidth; // força o estilo inicial para a transição rodar
      dlg.classList.add('open');
      positionThumbs(dlg);
      if (o.mount) o.mount(dlg);
      const f = $('[autofocus]', dlg) || $('input:not([type=hidden]), select', dlg);
      if (f && !matchMedia('(pointer: coarse)').matches) setTimeout(() => f.focus({ preventScroll: true }), 60);
    });
  }
  function closeDialog(v) {
    const r = dlgResolve; dlgResolve = null;
    dlg.classList.remove('open');
    setTimeout(() => { if (!dlgResolve && dlg.open) dlg.close(); }, reduce ? 0 : 280);
    if (r) r(v);
  }
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(); });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) return closeDialog();
    const c = e.target.closest('[data-close]');
    if (c && dlg.contains(c)) closeDialog(c.dataset.close === '' ? true : c.dataset.close);
  });
  const sheet = (title, body) => '<div class="dlg-card"><div class="dlg-head"><h2>' + esc(title) + '</h2><button class="icon-btn" type="button" data-close="" aria-label="Fechar">' + ico('x') + '</button></div>' + body + '</div>';

  async function confirmDlg(title, text, okLabel, danger) {
    const v = await openDialog(sheet(title, '<p class="muted" style="margin-bottom:18px">' + text + '</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" data-close="no">Cancelar</button><button class="btn ' + (danger === false ? 'btn-primary' : 'btn-danger') + '" data-close="yes" autofocus>' + esc(okLabel || 'Excluir') + '</button></div>'));
    return v === 'yes';
  }
  /** Parcela: "só esta" ou "todo o grupo". Retorna 'one' | 'group' | undefined. */
  function scopeDlg(t, verbo) {
    return openDialog(sheet('Compra parcelada', '<p class="muted" style="margin-bottom:16px">Esta é a parcela ' + t.parcela_atual + ' de ' + t.total_parcelas + '. O que você quer ' + verbo + '?</p><div class="choice"><button class="btn" data-close="one" autofocus>Só esta parcela</button><button class="btn" data-close="group">Todas as ' + t.total_parcelas + ' parcelas</button><button class="btn" data-close="" style="justify-content:center;background:none">Cancelar</button></div>'));
  }

  /* -------------------------------------------------------------------- toasts */
  function toast(msg, o) {
    o = o || {};
    const box = $('#toasts');
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + (o.kind || '');
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (o.action ? '<button type="button">' + esc(o.action) + '</button>' : '');
    box.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 320); };
    if (o.action) $('button', el).addEventListener('click', () => { o.onAction && o.onAction(); kill(); });
    setTimeout(kill, o.ms || 5600);
  }
  function undoable(msg, snap) { toast(msg, { action: 'Desfazer', onAction: () => { S.restore(snap); toast('Desfeito.'); } }); }
  const fail = (e) => toast(e && e.message ? e.message : 'Algo deu errado.', { kind: 'error' });

  /* -------------------------------------------------------------------- campos */
  function moneyField(input, cents, onChange) {
    const show = (c) => { input.dataset.cents = c; input.value = c ? R(c, { symbol: false }) : ''; };
    input.addEventListener('input', () => {
      const c = parseInt(input.value.replace(/\D/g, '').slice(0, 11) || '0', 10);
      show(c);
      if (onChange) onChange(c);
    });
    show(cents || 0);
  }
  const centsOf = (input) => parseInt(input.dataset.cents || '0', 10);
  /** Editor de parcelas: uma linha com campo de valor por parcela (compras com juros). Altera `values` no lugar. */
  function rowsEditor(box, labels, values, onChange) {
    box.innerHTML = '<div class="prows">' + labels.map((l, i) => '<div class="prow"><span class="muted small">' + esc(l) + '</span><input class="input" inputmode="numeric" data-i="' + i + '" placeholder="0,00" aria-label="Valor da parcela ' + (i + 1) + '"></div>').join('') + '</div>';
    $$('input', box).forEach((inp) => { const i = Number(inp.dataset.i); moneyField(inp, values[i], (c) => { values[i] = c; onChange(values); }); });
  }
  function bindSeg(seg, onChange) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('.seg-btn');
      if (!b) return;
      $$('.seg-btn', seg).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      moveThumb(seg);
      if (onChange) onChange(b.dataset.v);
    });
  }
  /** Controle segmentado. Com `key`, vira navegação da página (ação "seg"); sem `key`, é tratado por bindSeg (formulários). */
  const segHTML = (cls, items, sel, key) => '<div class="seg ' + cls + '" role="tablist">' + '<span class="seg-thumb"></span>' + items.map(([v, l]) => '<button type="button" class="seg-btn" role="tab" data-v="' + v + '" ' + (key ? 'data-act="seg" data-key="' + key + '" data-val="' + v + '" ' : '') + 'aria-selected="' + (v === sel) + '">' + esc(l) + '</button>').join('') + '</div>';
  const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : '#');
  const switchHTML = (id, on, label) => '<button type="button" class="switch" role="switch" id="' + id + '" aria-checked="' + !!on + '" aria-label="' + esc(label) + '"></button>';
  const chipCat = (c, sel) => '<button type="button" class="chip" data-id="' + esc(c.id) + '" style="--c:' + safeColor(c.cor) + '" aria-pressed="' + sel + '"><span class="dot"></span>' + esc(c.nome) + '</button>';
  function bindChips(box, onPick) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      $$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onPick(b.dataset.id);
    });
  }

  /* ============================================================== TELAS ============ */

  /* ------------------------------------------------------------------- Início */
  function pageInicio() {
    const d = D(), mk = ui.month, hoje = today(), cur = C.monthKey(hoje);
    const sum = C.summary(d.transacoes, mk);
    const orc = C.budgetTotal(d.categorias);
    const p = C.projection(d.transacoes, d.contas_fixas, mk, hoje, orc);
    const rows = C.budgetRows(d.categorias, d.transacoes, mk).filter((r) => r.limite > 0 || r.gasto > 0).sort((a, b) => (b.limite > 0) - (a.limite > 0) || b.ratio - a.ratio || b.gasto - a.gasto);
    const occAll = C.fixedOccurrences(d.contas_fixas, mk, d.transacoes, hoje);
    const occ = occAll.filter((o) => !C.isIncome(o.cf)); // contas fixas (despesas)
    const incPend = occAll.filter((o) => C.isIncome(o.cf) && o.status !== 'paga'); // receitas recorrentes a receber
    const aReceber = incPend.reduce((s, o) => s + o.cf.valor, 0);
    const pend = occ.filter((o) => o.status !== 'paga');
    const vencidas = occ.filter((o) => o.status === 'vencida');
    const recent = C.inMonth(d.transacoes, mk).sort(byDateDesc).slice(0, 6);
    // faturas de cartão ainda pendentes (as vencidas já saíram sozinhas)
    const faturas = d.contas.filter((c) => c.tipo === 'credito')
      .flatMap((c) => C.invoiceList(c, d.transacoes, hoje).filter((i) => i.total > 0 && i.start <= C.addDays(hoje, 45)).map((i) => ({ c, i })))
      .sort((x, y) => (x.i.due < y.i.due ? -1 : 1)).slice(0, 4);

    let titulo;
    if (mk > cur) titulo = 'Já estão previstos <b class="money">' + R(p.projecao) + '</b> neste mês';
    else if (mk < cur) titulo = 'Este mês fechou em <b class="money">' + R(p.projecao) + '</b>';
    else titulo = 'No ritmo atual você fecha o mês em <b class="money">' + R(p.projecao) + '</b>';

    let verdict;
    if (orc > 0 && p.diferenca != null) {
      const abaixo = p.diferenca >= 0;
      verdict = '<div class="verdict ' + p.level + '">' + ico(abaixo ? (p.level === 'warn' ? 'alert' : 'check') : 'alert') + '<span>' +
        (abaixo ? R(p.diferenca) + ' abaixo do orçamento total de ' + R(orc) : R(-p.diferenca) + ' acima do orçamento total de ' + R(orc)) + '</span></div>';
    } else verdict = '<div class="verdict none">' + ico('info') + '<span>Defina o orçamento das categorias para comparar a projeção.</span></div>';

    const lines = (mk >= cur ? [
      ['Gastos avulsos no ritmo atual', p.ritmo], ['Contas fixas já pagas', p.fixasPagas], ['Contas fixas a pagar', p.fixasPendentes], ['Parcelas e lançamentos futuros', p.futuros],
    ] : [['Total gasto no mês', p.atual]]).map(([l, v]) => '<div><span>' + l + '</span><span class="money">' + R(v) + '</span></div>').join('');

    const ang = -90 + Math.min(1.25, p.ratio) / 1.25 * 180;
    const pt = (t) => { const a = Math.PI * (1 - t); return [(100 + 80 * Math.cos(a)).toFixed(1), (100 - 80 * Math.sin(a)).toFixed(1)]; };
    const arc = (a, b, col) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return '<path d="M' + x0 + ' ' + y0 + 'A80 80 0 0 1 ' + x1 + ' ' + y1 + '" stroke="' + col + '" stroke-width="14" fill="none"/>'; };
    const gauge = '<svg class="gauge" viewBox="0 0 200 122" style="--a:' + ang.toFixed(1) + 'deg" role="img" aria-label="Projeção em relação ao orçamento">' +
      arc(0.004, 0.636, 'var(--green)') + arc(0.644, 0.796, 'var(--amber)') + arc(0.804, 0.996, 'var(--red)') +
      '<g class="g-needle"><path d="M96 100 100 34 104 100Z" fill="var(--red)"/><path d="M96 100h8l-4 18Z" fill="var(--blue)"/><circle cx="100" cy="100" r="8" fill="#3a3a46"/><circle cx="98" cy="98" r="2.4" fill="#6a6a7c"/></g></svg>';

    const budget = rows.length ? rows.map((r, i) => budgetRow(r, i)).join('') :
      '<div class="empty">' + ico('wallet') + '<b>Nada por aqui ainda</b>Lance um gasto ou defina o orçamento das categorias.</div>';

    const fixasCard = pend.length ? pend.slice(0, 4).map((o) => fixRow(o, mk, true)).join('') :
      '<div class="empty small">' + ico('check') + '<b>Tudo em dia</b>' + (occ.length ? 'Todas as contas fixas do mês estão pagas.' : 'Cadastre suas contas fixas para acompanhar os vencimentos.') + '</div>';

    return '' +
      (vencidas.length ? '<div class="alert over st" style="margin-bottom:16px">' + ico('alert') + '<span>' + (vencidas.length === 1 ? '1 conta fixa vencida: ' : vencidas.length + ' contas fixas vencidas: ') + esc(vencidas.map((o) => o.cf.nome).join(', ')) + '. <button class="link" data-act="goto-fixas">Ver contas fixas</button></span></div>' : '') +
      '<div class="grid g-main">' +
      '<div class="stack">' +
        '<section class="card hero st"><div class="eyebrow">Saldo de ' + C.monthLabel(mk).toLowerCase() + '</div>' +
          '<div class="hero-value money ' + (sum.saldo < 0 ? 'neg' : '') + '"><span class="count" data-v="' + sum.saldo + '">' + R(sum.saldo) + '</span></div>' +
          '<div class="hero-row"><span class="chip-stat"><i></i>Receitas ' + R(sum.receitas) + '</span><span class="chip-stat out"><i></i>Despesas ' + R(sum.despesas) + '</span>' + (aReceber > 0 && mk >= cur ? '<span class="chip-stat wait"><i></i>A receber ' + R(aReceber) + '</span>' : '') + '</div></section>' +
        '<section class="card st"><div class="card-head"><h2>Projeção de fechamento</h2></div><div class="proj">' + gauge +
          '<div><div class="proj-title">' + titulo + '</div><div class="proj-lines">' + lines + '</div>' + verdict + '</div></div></section>' +
        '<section class="card st"><div class="card-head"><h2>Orçamento por categoria</h2><button class="link" data-act="goto-cats">Editar limites</button></div><div class="list">' + budget + '</div></section>' +
      '</div>' +
      '<div class="stack">' +
        (faturas.length ? '<section class="card st"><div class="card-head"><h2>Faturas dos cartões</h2><button class="link" data-act="goto-cartoes">Ver cartões</button></div><div class="list">' + faturas.map(({ c, i }) => {
          const dias = C.daysBetween(hoje, i.due);
          return '<div class="row" style="--c:#8e6bd8;cursor:default"><span class="row-ico">' + ico('credito') + '</span><div class="row-main"><div class="row-title">' + esc(c.nome) + ' · ' + (i.status === 'fechada' ? 'fechada' : 'aberta') + '</div><div class="row-meta">vence ' + C.fmtShort(i.due) + (dias === 0 ? ' (hoje)' : ' (em ' + dias + (dias === 1 ? ' dia' : ' dias') + ')') + '</div></div><span class="row-amt money">' + R(i.total) + '</span>' +
            (i.status === 'fechada' ? '<button class="btn btn-sm" data-act="inv-pay" data-conta="' + esc(c.id) + '" data-end="' + i.end + '">Já paguei</button>' : '') + '</div>';
        }).join('') + '</div></section>' : '') +
        (incPend.length ? '<section class="card st"><div class="card-head"><h2>Receitas a receber</h2><button class="link" data-act="goto-fixas">Ver todas</button></div><div class="list">' + incPend.slice(0, 3).map((o) => fixRow(o, mk, true)).join('') + '</div></section>' : '') +
        '<section class="card st"><div class="card-head"><h2>Contas fixas</h2><button class="link" data-act="goto-fixas">Ver todas</button></div><div class="list">' + fixasCard + '</div></section>' +
        '<section class="card st"><div class="card-head"><h2>Últimos lançamentos</h2><button class="link" data-act="goto-tx">Ver todos</button></div><div class="list">' +
          (recent.length ? recent.map(txRow).join('') : '<div class="empty small">' + ico('list') + '<b>Sem lançamentos</b>Toque no botão + para começar.</div>') + '</div></section>' +
      '</div></div>';
  }

  function budgetRow(r, i) {
    const c = r.cat;
    let badge = '';
    if (r.level === 'over') badge = '<span class="badge over">' + ico('alert') + 'Limite estourado · ' + r.pct + '%</span>';
    else if (r.level === 'warn') badge = '<span class="badge warn">' + ico('alert') + r.pct + '% · atenção</span>';
    else if (r.level === 'ok') badge = '<span class="badge ok">' + r.pct + '%</span>';
    return '<div class="cat-row" role="button" tabindex="0" data-act="cat-edit" data-id="' + esc(c.id) + '" style="--c:' + safeColor(c.cor) + '">' +
      '<div class="cat-top"><span class="dot"></span><span class="cat-name">' + esc(c.nome) + '</span>' + badge +
      '<span class="cat-amt money">' + R(r.gasto) + (r.limite ? ' / ' + R(r.limite) : '') + '</span></div>' +
      (r.limite ? '<div class="bar ' + r.level + '" style="--w:' + Math.min(100, r.ratio * 100).toFixed(1) + '%;--d:' + i + '"><i></i></div>' : '') + '</div>';
  }

  /* ---------------------------------------------------------------- Transações */
  function txRow(t) {
    const c = cat(t.categoria_id), a = conta(t.conta_id);
    const meta = [c.nome, a.nome, t.total_parcelas ? 'parcela ' + t.parcela_atual + '/' + t.total_parcelas : '', t.conta_fixa_id ? 'conta fixa' : '', t.data > today() ? 'agendada' : '', C.isPaidCharge(t, a, today()) ? 'fatura paga' : (a.tipo === 'credito' && t.tipo === 'despesa' ? 'fatura ' + C.monthShort(C.invoiceFor(a, t.data).dueMonth) : '')].filter(Boolean).join(' · ');
    return '<div class="row" role="button" tabindex="0" data-act="tx-edit" data-id="' + esc(t.id) + '" style="--c:' + safeColor(c.cor) + '">' +
      '<span class="row-ico"><b>' + esc((c.nome || '?').trim().charAt(0).toUpperCase()) + '</b></span>' +
      '<div class="row-main"><div class="row-title">' + esc(t.descricao || c.nome) + '</div><div class="row-meta">' + esc(meta) + '</div></div>' +
      '<span class="row-amt money ' + (t.tipo === 'receita' ? 'in' : '') + '">' + (t.tipo === 'receita' ? '+' : '-') + R(t.valor) + '</span>' +
      '<span class="row-act"><button class="icon-btn" type="button" data-act="tx-del" data-id="' + esc(t.id) + '" aria-label="Excluir lançamento">' + ico('trash') + '</button></span></div>';
  }

  function pageTransacoes() {
    const d = D();
    return '<div class="toolbar st"><div class="search">' + ico('search') + '<input class="input" id="q" type="search" placeholder="Buscar por descrição, categoria ou conta…" value="' + esc(ui.q) + '" aria-label="Buscar"></div>' +
      '<select class="select" id="fConta" style="width:auto;min-width:150px" aria-label="Filtrar por conta"><option value="todas">Todas as contas</option>' + d.contas.map((c) => '<option value="' + esc(c.id) + '"' + (ui.fConta === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select>' +
      segHTML('', [['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas']], ui.txTipo, 'txTipo') +
      '<button class="btn" data-act="export-view">' + ico('download') + 'Exportar CSV</button></div>' +
      '<div id="txFixas" class="st"></div>' +
      '<div id="txSum" class="st" style="margin-bottom:16px"></div>' +
      '<section class="card st"><div id="txList" class="list"></div></section>';
  }
  function filteredTx() {
    const d = D(), q = C.normText(ui.q);
    let list = d.transacoes;
    if (!q) list = C.inMonth(list, ui.month);
    if (ui.fConta !== 'todas') list = list.filter((t) => t.conta_id === ui.fConta);
    if (ui.txTipo !== 'todos') list = list.filter((t) => t.tipo === ui.txTipo);
    if (q) list = list.filter((t) => C.normText([t.descricao, cat(t.categoria_id).nome, conta(t.conta_id).nome, R(t.valor)].join(' ')).includes(q));
    return list.slice().sort(byDateDesc);
  }
  /** Contas fixas e receitas recorrentes do mês, no topo das transações (visão dos gastos fixos mensais). */
  function renderTxFixas() {
    const box = $('#txFixas');
    if (!box) return;
    const d = D(), mk = ui.month, hoje = today();
    const occ = C.fixedOccurrences(d.contas_fixas, mk, d.transacoes, hoje);
    if (ui.q || ui.fConta !== 'todas' || !occ.length) {
      box.innerHTML = ui.q || ui.fConta !== 'todas' ? '' : '<section class="card" style="margin-bottom:16px"><div class="card-head" style="margin:0"><h2>Gastos fixos de ' + esc(C.monthLabel(mk).toLowerCase()) + '</h2><button class="link" data-act="goto-fixas">Cadastrar</button></div><p class="hint" style="margin-top:8px">Nenhuma conta fixa neste mês. Cadastre aluguel, internet, assinaturas… e acompanhe aqui.</p></section>';
      return;
    }
    const desp = occ.filter((o) => !C.isIncome(o.cf)), inc = occ.filter((o) => C.isIncome(o.cf));
    const soma = (l, f) => l.filter(f).reduce((s, o) => s + o.cf.valor, 0);
    const total = soma(desp, () => true), pago = soma(desp, (o) => o.status === 'paga');
    const resumo = desp.length ? 'Gastos fixos: <b class="money">' + R(total) + '</b> no mês · pago ' + R(pago) + ' · falta ' + R(total - pago) : '';
    const rec = inc.length ? (resumo ? ' · ' : '') + 'receitas recorrentes: ' + R(soma(inc, () => true)) : '';
    box.innerHTML = '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2>Gastos fixos de ' + esc(C.monthLabel(mk).toLowerCase()) + '</h2><button class="link" data-act="goto-fixas">Gerenciar</button></div>' +
      '<p class="hint" style="margin-bottom:8px">' + resumo + rec + '</p><div class="list">' + occ.map((o) => fixRow(o, mk)).join('') + '</div></section>';
  }

  function renderTxList(animate, flashId) {
    renderTxFixas();
    const list = filteredTx(), hoje = today();
    let rec = 0, desp = 0;
    list.forEach((t) => { if (t.tipo === 'receita') rec += t.valor; else desp += t.valor; });
    $('#txSum').innerHTML = '<div class="grid g3">' +
      [['Receitas', rec, 'pos'], ['Despesas', desp, 'neg'], ['Saldo', rec - desp, rec - desp < 0 ? 'neg' : 'pos']].map(([l, v, k]) => '<div class="card stat" style="padding:14px 16px"><div class="eyebrow">' + l + '</div><div class="stat-value money ' + k + '" style="font-size:22px">' + R(v) + '</div></div>').join('') +
      '</div>' + (ui.q ? '<p class="hint" style="margin-top:10px">Buscando em todos os meses — ' + list.length + ' resultado' + (list.length === 1 ? '' : 's') + '.</p>' : '');
    let html = '', last = '';
    const dayTotals = {};
    list.forEach((t) => { dayTotals[t.data] = (dayTotals[t.data] || 0) + (t.tipo === 'receita' ? t.valor : -t.valor); });
    list.forEach((t) => {
      if (t.data !== last) { last = t.data; html += '<div class="day-head"><span>' + esc(C.dayHeading(t.data, hoje)) + ' · ' + C.fmtShort(t.data) + '</span><span class="money">' + R(dayTotals[t.data], { sign: true }) + '</span></div>'; }
      html += txRow(t);
    });
    const box = $('#txList');
    box.innerHTML = html || '<div class="empty">' + ico('search') + '<b>' + (ui.q ? 'Nenhum resultado' : 'Nenhum lançamento neste mês') + '</b>' + (ui.q ? 'Tente outra busca.' : 'Use o botão + para lançar uma receita ou despesa.') + '</div>';
    if (animate && !reduce) $$('.row', box).slice(0, 14).forEach((r, i) => { r.style.animation = 'rise .5s var(--ease) both'; r.style.animationDelay = i * 28 + 'ms'; });
    if (flashId) { const el = $('[data-id="' + flashId + '"]', box); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } }
  }

  /* -------------------------------------------------------------------- Contas */
  function pageContas() {
    return segHTML('st', [['carteiras', 'Carteiras e cartões'], ['fixas', 'Fixas e recorrentes']], ui.contasTab, 'contasTab') + '<div class="pane st" id="pane" style="margin-top:18px"></div>';
  }
  function paneContas() {
    return ui.contasTab === 'fixas' ? paneFixas() : paneCarteiras();
  }
  function paneCarteiras() {
    const d = D(), hoje = today();
    const cards = d.contas.map((a) => {
      const t = ACC[a.tipo] || ACC.pix;
      let body;
      if (a.tipo === 'credito') {
        const pend = C.invoiceList(a, d.transacoes, hoje); // só faturas ainda não vencidas/pagas
        const f = C.invoiceCycle(a, hoje);
        const atual = pend.find((i) => i.end === f.end);
        const prox = pend.find((i) => i.end > f.end);
        const used = C.creditCommitted(a, d.transacoes, hoje);
        const ratio = a.limite > 0 ? used / a.limite : 0;
        const fechadas = pend.filter((i) => i.status === 'fechada').map((i) => {
          const dias = C.daysBetween(hoje, i.due);
          return '<div class="alert info" style="flex-wrap:wrap;align-items:center;gap:8px 12px"><span style="flex:1;min-width:150px"><b>Fatura fechada: <span class="money">' + R(i.total) + '</span></b><br><span class="small">vence ' + C.fmtShort(i.due) + (dias === 0 ? ' (hoje)' : ' (em ' + dias + (dias === 1 ? ' dia' : ' dias') + ')') + ' · some sozinha depois do vencimento</span></span><button class="btn btn-sm" data-act="inv-pay" data-conta="' + esc(a.id) + '" data-end="' + i.end + '">Já paguei</button></div>';
        }).join('');
        body = fechadas + '<div><div class="eyebrow">Fatura atual (aberta)</div><div class="acc-big money">' + R(atual ? atual.total : 0) + '</div></div>' +
          '<div class="kv"><div><span>Ciclo</span><span>' + C.fmtShort(f.start) + ' a ' + C.fmtShort(f.end) + '</span></div><div><span>Vencimento</span><span>' + C.fmtDate(f.due) + '</span></div><div><span>Próxima fatura</span><span class="money">' + R(prox ? prox.total : 0) + '</span></div></div>' +
          (a.limite > 0 ? '<div><div class="bar ' + C.budgetLevel(used, a.limite) + '" style="--w:' + Math.min(100, ratio * 100).toFixed(1) + '%"><i></i></div><div class="hint" style="margin-top:6px">' + R(used) + ' de ' + R(a.limite) + ' do limite comprometido</div></div>' : '');
      } else {
        const bal = C.accountBalance(a, d.transacoes, hoje);
        const n = C.inMonth(d.transacoes, ui.month).filter((x) => x.conta_id === a.id).length;
        body = '<div><div class="eyebrow">Saldo movimentado</div><div class="acc-big money ' + (bal < 0 ? 'neg' : '') + '">' + R(bal) + '</div></div><div class="hint">' + n + ' lançamento' + (n === 1 ? '' : 's') + ' em ' + C.monthLabel(ui.month).toLowerCase() + '</div>';
      }
      return '<div class="card acc lift" role="button" tabindex="0" data-act="acc-edit" data-id="' + esc(a.id) + '" style="--c:' + t.c + '"><div class="acc-top"><span class="acc-ico">' + ico(a.tipo in I ? a.tipo : 'pix') + '</span><div><div class="acc-name">' + esc(a.nome) + '</div><div class="muted small">' + t.n + '</div></div></div>' + body + '</div>';
    }).join('');
    return '<div class="grid g3">' + cards + '<button class="add-card" data-act="acc-new">' + ico('plus') + 'Nova carteira ou cartão</button></div>';
  }
  function fixRow(o, mk, compact) {
    const c = cat(o.cf.categoria_id);
    const inc = C.isIncome(o.cf), pl = (n) => n + (n === 1 ? ' dia' : ' dias');
    const quando = inc
      ? (o.status === 'paga' ? 'recebida em ' + C.fmtShort(o.tx.data) : o.status === 'vencida' ? 'prevista há ' + pl(o.dias) : o.dias === 0 ? 'prevista para hoje' : 'prevista em ' + pl(o.dias))
      : (o.status === 'paga' ? 'paga em ' + C.fmtShort(o.tx.data) : o.status === 'vencida' ? 'venceu há ' + pl(o.dias) : o.dias === 0 ? 'vence hoje' : 'vence em ' + pl(o.dias));
    const label = (inc ? { paga: 'Recebida', vencida: 'Atrasada', a_vencer: 'A receber' } : { paga: 'Paga', vencida: 'Vencida', a_vencer: 'A vencer' })[o.status];
    const btn = o.status === 'paga'
      ? '<button class="btn btn-sm" data-act="fix-undo" data-id="' + esc(o.cf.id) + '" data-mk="' + mk + '">Desfazer</button>'
      : '<button class="btn btn-sm btn-primary" data-act="fix-pay" data-id="' + esc(o.cf.id) + '" data-mk="' + mk + '">' + ico('check') + (inc ? 'Recebi' : 'Pagar') + '</button>';
    return '<div class="row" role="button" tabindex="0" data-act="fix-edit" data-id="' + esc(o.cf.id) + '" style="--c:' + safeColor(c.cor) + '"><span class="row-ico"><b>' + esc(o.cf.dia_vencimento) + '</b></span>' +
      '<div class="row-main"><div class="row-title">' + esc(o.cf.nome) + (inc && o.cf.auto ? ' <span class="muted small">· automática</span>' : '') + (o.cf.meses && o.cf.meses.length ? ' <span class="muted small">· só em ' + o.cf.meses.map((m) => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m - 1]).join(', ') + '</span>' : '') + '</div><div class="row-meta">' + esc(c.nome) + ' · ' + esc(quando) + ' (' + C.fmtShort(o.due) + ')</div></div>' +
      (compact ? '' : '<span class="badge ' + o.status + '">' + label + '</span>') + '<span class="row-amt money ' + (inc ? 'in' : '') + '">' + (inc ? '+' : '') + R(o.cf.valor) + '</span>' + btn + '</div>';
  }
  function paneFixas() {
    const d = D(), mk = ui.month, hoje = today();
    const todas = C.fixedOccurrences(d.contas_fixas, mk, d.transacoes, hoje);
    const occ = todas.filter((o) => !C.isIncome(o.cf)), incs = todas.filter((o) => C.isIncome(o.cf));
    const total = occ.reduce((s, o) => s + o.cf.valor, 0), pago = occ.filter((o) => o.status === 'paga').reduce((s, o) => s + o.cf.valor, 0);
    const incTotal = incs.reduce((s, o) => s + o.cf.valor, 0), incRec = incs.filter((o) => o.status === 'paga').reduce((s, o) => s + o.cf.valor, 0);
    const pausadas = d.contas_fixas.filter((f) => f.ativa === false);
    const recorrentes = '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2>Receitas recorrentes</h2><button class="btn btn-sm btn-primary" data-act="fix-new" data-tipo="receita">' + ico('plus') + 'Nova receita recorrente</button></div>' +
      (incs.length ? '<p class="hint" style="margin-bottom:8px">Previsto ' + R(incTotal) + ' · recebido ' + R(incRec) + ' · a receber ' + R(incTotal - incRec) + '</p><div class="list">' + incs.map((o) => fixRow(o, mk)).join('') + '</div>'
        : '<div class="empty">' + ico('wallet') + '<b>Nenhuma receita recorrente</b>Cadastre seu salário (ou outra renda mensal) e ele é lançado sozinho no dia do recebimento.</div>') + '</section>';
    return recorrentes + '<div class="grid g3" style="margin-bottom:16px">' +
      [['Previsto no mês', total, ''], ['Já pago', pago, 'pos'], ['Falta pagar', total - pago, total - pago > 0 ? 'neg' : '']].map(([l, v, k]) => '<div class="card stat"><div class="eyebrow">' + l + '</div><div class="stat-value money ' + k + '">' + R(v) + '</div></div>').join('') + '</div>' +
      '<section class="card"><div class="card-head"><h2>Vencimentos de ' + C.monthLabel(mk).toLowerCase() + '</h2><button class="btn btn-sm btn-primary" data-act="fix-new">' + ico('plus') + 'Nova conta fixa</button></div><div class="list">' +
      (occ.length ? occ.map((o) => fixRow(o, mk)).join('') : '<div class="empty">' + ico('wallet') + '<b>Nenhuma conta fixa neste mês</b>Cadastre aluguel, internet, assinaturas… e acompanhe o status de cada uma.</div>') + '</div></section>' +
      (pausadas.length ? '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Pausadas</h2></div><div class="list">' + pausadas.map((f) => '<div class="row" role="button" tabindex="0" data-act="fix-edit" data-id="' + esc(f.id) + '" style="--c:#7a8599"><span class="row-ico"><b>' + esc(f.dia_vencimento) + '</b></span><div class="row-main"><div class="row-title">' + esc(f.nome) + '</div><div class="row-meta">Pausada · ' + (C.isIncome(f) ? 'receita · ' : '') + esc(cat(f.categoria_id).nome) + '</div></div><span class="row-amt money">' + R(f.valor) + '</span></div>').join('') + '</div></section>' : '');
  }

  /* ------------------------------------------------------------------- Análise */
  function pageAnalise() {
    const d = D(), mk = ui.month, hoje = today();
    const sum = C.summary(d.transacoes, mk);
    const orc = C.budgetTotal(d.categorias);
    const p = C.projection(d.transacoes, d.contas_fixas, mk, hoje, orc);
    const cmp = C.compareMonths(d.transacoes, d.categorias, mk);
    const rank = C.riskRanking(d.categorias, d.transacoes, mk);
    const stat = (l, v, cls, sub) => '<div class="card stat lift st"><div class="eyebrow">' + l + '</div><div class="stat-value money ' + (cls || '') + '"><span class="count" data-v="' + v + '">' + R(v) + '</span></div><div class="stat-sub">' + sub + '</div></div>';

    // rosca
    const cats = cmp.rows.filter((r) => r.atual > 0);
    const totalGasto = cats.reduce((s, r) => s + r.atual, 0);
    let off = 0;
    const segs = cats.map((r, i) => {
      const len = (r.atual / totalGasto) * 100, gap = cats.length > 1 ? 0.7 : 0;
      const s = '<circle class="seg-c" data-i="' + i + '" cx="21" cy="21" r="15.9155" pathLength="100" stroke="' + safeColor(r.cat.cor) + '" stroke-dashoffset="' + (-off).toFixed(3) + '" data-len="' + Math.max(0.1, len - gap).toFixed(3) + '" style="--d:' + i + ';stroke-dasharray:0 100"/>';
      off += len;
      return s;
    }).join('');
    const donut = cats.length ? '<div class="donut-wrap"><div class="donut" id="donut"><svg viewBox="0 0 42 42" role="img" aria-label="Gastos por categoria"><circle class="track" cx="21" cy="21" r="15.9155"/>' + segs + '</svg><div class="donut-center"><span class="muted small">Total gasto</span><b class="money">' + R(totalGasto) + '</b></div></div>' +
      '<div class="legend" id="legend">' + cats.map((r, i) => '<div class="legend-row" data-i="' + i + '" style="--c:' + safeColor(r.cat.cor) + '"><span class="dot"></span><span class="nm">' + esc(r.nome) + '</span><span class="muted small">' + Math.round((r.atual / totalGasto) * 100) + '%</span><span class="money" style="min-width:92px;text-align:right">' + R(r.atual) + '</span></div>').join('') + '</div></div>'
      : '<div class="empty">' + ico('chart') + '<b>Sem gastos neste mês</b>Os gráficos aparecem assim que houver despesas.</div>';

    const delta = (r) => {
      if (r.atual === 0 && r.anterior === 0) return '<span class="delta flat">—</span>';
      const k = r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : 'flat';
      return '<span class="delta ' + k + '">' + ico(k) + (r.pct == null ? 'novo' : Math.abs(r.pct) + '%') + '</span>';
    };
    const tbl = '<div class="tbl-wrap"><table class="cmp"><thead><tr><th>Categoria</th><th>' + esc(C.monthShort(cmp.prev)) + '</th><th>' + esc(C.monthShort(mk)) + '</th><th>Variação</th></tr></thead><tbody>' +
      cmp.rows.map((r) => '<tr><td><span class="dot" style="--c:' + safeColor(r.cat.cor) + ';display:inline-block;margin-right:8px"></span>' + esc(r.nome) + '</td><td class="money muted">' + R(r.anterior) + '</td><td class="money">' + R(r.atual) + '</td><td>' + delta(r) + '</td></tr>').join('') +
      '<tr class="total"><td>Total</td><td class="money">' + R(cmp.total.anterior) + '</td><td class="money">' + R(cmp.total.atual) + '</td><td>' + delta(cmp.total) + '</td></tr></tbody></table></div>';

    const risco = rank.length ? '<div class="rank">' + rank.slice(0, 6).map((r, i) => '<div class="cat-row" style="--c:' + safeColor(r.cat.cor) + ';cursor:default"><span class="rank-n">' + (i + 1) + '</span><div style="display:grid;gap:7px"><div class="cat-top"><span class="cat-name">' + esc(r.cat.nome) + '</span><span class="badge ' + (r.level === 'ok' ? 'ok' : r.level) + '">' + r.pct + '%</span></div><div class="bar ' + r.level + '" style="--w:' + Math.min(100, r.ratio * 100).toFixed(1) + '%;--d:' + i + '"><i></i></div></div></div>').join('') + '</div>'
      : '<div class="empty small">' + ico('wallet') + '<b>Sem orçamentos</b>Defina limites por categoria em Ajustes.</div>';

    return '<div class="grid g4" style="margin-bottom:16px">' +
      stat('Saldo do mês', sum.saldo, sum.saldo < 0 ? 'neg' : 'pos', 'receitas − despesas') +
      stat('Total gasto', sum.despesas, '', cmp.total.pct == null ? 'sem base de comparação' : (cmp.total.delta > 0 ? '▲ ' : cmp.total.delta < 0 ? '▼ ' : '') + Math.abs(cmp.total.pct) + '% vs. ' + C.monthShort(cmp.prev)) +
      stat('Total recebido', sum.receitas, '', 'em ' + C.monthLabel(mk).toLowerCase()) +
      stat('Projeção do mês', p.projecao, p.level === 'over' ? 'neg' : '', orc > 0 ? 'orçamento total ' + R(orc) : 'sem orçamento definido') + '</div>' +
      '<div class="grid g-main"><section class="card st"><div class="card-head"><h2>Gastos por categoria</h2></div>' + donut + '</section>' +
      '<section class="card st"><div class="card-head"><h2>Categorias em risco</h2></div>' + risco + '</section></div>' +
      '<section class="card st" style="margin-top:16px"><div class="card-head"><h2>Comparativo com o mês anterior</h2></div>' + (cmp.rows.length ? tbl : '<div class="empty small"><b>Sem dados para comparar</b></div>') + '</section>';
  }

  /* -------------------------------------------------------------------- Ajustes */
  function pageAjustes() {
    return segHTML('st', [['categorias', 'Categorias'], ['importar', 'Importar CSV'], ['dados', 'Dados e aparência'], ['atualizacoes', 'Atualizações']], ui.ajTab, 'ajTab') + '<div class="pane st" id="pane" style="margin-top:18px"></div>';
  }
  function paneAjustes() {
    return { categorias: paneCategorias, importar: paneImportar, dados: paneDados, atualizacoes: paneUpdates }[ui.ajTab]();
  }
  function paneCategorias() {
    const d = D();
    const row = (c) => '<div class="row" role="button" tabindex="0" data-act="cat-edit" data-id="' + esc(c.id) + '" style="--c:' + safeColor(c.cor) + '"><span class="row-ico"><span class="dot" style="width:14px;height:14px"></span></span><div class="row-main"><div class="row-title">' + esc(c.nome) + '</div><div class="row-meta">' + (c.kind === 'receita' ? 'Categoria de receita' : c.orcamento_mensal ? 'Orçamento ' + R(c.orcamento_mensal) + ' por mês' : 'Sem orçamento') + '</div></div><span class="row-act" style="opacity:1">' + ico('edit') + '</span></div>';
    return '<section class="card"><div class="card-head"><h2>Categorias de despesa e orçamento</h2><button class="btn btn-sm btn-primary" data-act="cat-new">' + ico('plus') + 'Nova categoria</button></div><div class="list">' + d.categorias.filter((c) => c.kind !== 'receita').map(row).join('') + '</div></section>' +
      '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Categorias de receita</h2></div><div class="list">' + (d.categorias.filter((c) => c.kind === 'receita').map(row).join('') || '<div class="empty small">Nenhuma.</div>') + '</div></section>';
  }

  /* ---- Importação de CSV */
  function paneImportar() {
    const im = ui.imp;
    if (!im) {
      return '<section class="card"><div class="card-head"><h2>Importar lançamentos de um CSV</h2></div>' +
        '<label class="drop" id="drop" tabindex="0">' + ico('upload') + '<span><b>Arraste o arquivo aqui</b> ou clique para escolher</span><span class="small">Aceita .csv com separador ; , ou tab. Você mapeia as colunas na próxima etapa.</span><input type="file" id="impFile" accept=".csv,.txt,text/csv" hidden></label>' +
        '<p class="hint" style="margin-top:12px">Linhas já importadas antes são reconhecidas (por data + valor + descrição) e ignoradas — importar o mesmo arquivo duas vezes não duplica nada.</p></section>';
    }
    const d = D();
    const head = im.hasHeader ? im.rows[0] : null;
    const ncol = Math.max(...im.rows.slice(0, 20).map((r) => r.length));
    const colOpts = (sel) => '<option value="-1">— não usar —</option>' + Array.from({ length: ncol }, (_, i) => '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + esc((head && head[i] ? head[i] : 'Coluna ' + (i + 1))) + '</option>').join('');
    const mp = (k, l) => '<div class="field"><label>' + l + '</label><select class="select" data-imp="map" data-k="' + k + '">' + colOpts(im.mapping[k]) + '</select></div>';
    const despCats = d.categorias.filter((c) => c.kind !== 'receita'), recCats = d.categorias.filter((c) => c.kind === 'receita');
    const sel = (list, id, key) => '<select class="select" data-imp="' + key + '">' + list.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.nome) + '</option>').join('') + '</select>';
    return '<section class="card"><div class="card-head"><h2>' + esc(im.file) + '</h2><button class="btn btn-sm" data-act="imp-cancel">Trocar arquivo</button></div>' +
      '<div class="opt" style="padding-top:0"><div><b>A primeira linha é o cabeçalho</b><div class="hint">' + im.rows.length + ' linhas lidas · separador “' + (im.delimiter === '\t' ? 'tab' : esc(im.delimiter)) + '”</div></div>' + switchHTML('impHdr', im.hasHeader, 'Primeira linha é cabeçalho') + '</div>' +
      '<div class="grid g3" style="margin:6px 0 14px">' + mp('data', 'Data *') + mp('valor', 'Valor *') + mp('descricao', 'Descrição') + mp('conta', 'Conta') + mp('categoria', 'Categoria') + mp('tipo', 'Tipo (débito/crédito)') + '</div>' +
      '<div class="grid g3"><div class="field"><label>Conta padrão</label>' + sel(d.contas, im.contaId, 'contaId') + '</div><div class="field"><label>Categoria padrão (despesa)</label>' + sel(despCats, im.catD, 'catD') + '</div><div class="field"><label>Categoria padrão (receita)</label>' + sel(recCats.length ? recCats : d.categorias, im.catR, 'catR') + '</div></div>' +
      '<div class="opt"><div><b>Valores positivos são despesas</b><div class="hint">Use em faturas de cartão, onde as compras vêm sem sinal de menos.</div></div>' + switchHTML('impInv', im.invert, 'Valores positivos são despesas') + '</div></section>' +
      '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Resumo antes de confirmar</h2></div><div id="impPreview"></div></section>';
  }
  function impCompute() {
    const im = ui.imp, d = D();
    const rows = im.hasHeader ? im.rows.slice(1) : im.rows;
    const existing = new Set(d.transacoes.map((t) => t.hash_importacao).filter(Boolean));
    im.result = C.buildImport(rows, im.mapping, { contas: d.contas, cats: d.categorias, existing, contaId: im.contaId, catDespesaId: im.catD, catReceitaId: im.catR, invert: im.invert });
    const r = im.result, box = $('#impPreview');
    if (!box) return;
    const needs = im.mapping.data < 0 || im.mapping.valor < 0;
    const badge = (i) => i.status === 'nova' ? '<span class="badge paga">Nova</span>' : i.status === 'duplicada' ? '<span class="badge warn">Ignorada · já existe</span>' : '<span class="badge over">Inválida · ' + esc(i.motivo) + '</span>';
    box.innerHTML = needs ? '<div class="alert info">' + ico('info') + '<span>Escolha as colunas de <b>Data</b> e <b>Valor</b> para ver o resumo.</span></div>' :
      '<div class="sumbar"><div class="sum new"><b>' + r.novas + '</b>serão importadas</div><div class="sum dup"><b>' + r.duplicadas + '</b>ignoradas (já existem)</div><div class="sum bad"><b>' + r.invalidas + '</b>inválidas</div></div>' +
      '<div class="tbl-wrap" style="margin-top:14px"><table class="prev"><thead><tr><th>#</th><th>Data</th><th>Descrição</th><th class="r">Valor</th><th>Situação</th></tr></thead><tbody>' +
      r.items.slice(0, 8).map((i) => '<tr><td>' + i.linha + '</td><td>' + (i.data ? C.fmtDate(i.data) : '—') + '</td><td>' + esc(i.descricao || '—') + '</td><td class="r money">' + (i.valor != null ? (i.tipo === 'receita' ? '+' : '-') + R(i.valor) : '—') + '</td><td>' + badge(i) + '</td></tr>').join('') +
      '</tbody></table></div>' + (r.items.length > 8 ? '<p class="hint" style="margin-top:8px">Mostrando 8 de ' + r.items.length + ' linhas.</p>' : '') +
      '<div class="btn-row" style="margin-top:16px;justify-content:flex-end"><button class="btn btn-primary" data-act="imp-confirm"' + (r.novas ? '' : ' disabled') + '>' + ico('check') + 'Importar ' + r.novas + ' lançamento' + (r.novas === 1 ? '' : 's') + '</button></div>';
  }
  async function readCsvFile(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('Arquivo muito grande (máx. 8 MB).', { kind: 'error' });
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf); // CSVs de banco costumam vir em ANSI
    const { rows, delimiter } = C.parseCSV(text);
    if (rows.length < 2) return toast('Não encontrei linhas de dados nesse arquivo.', { kind: 'error' });
    const d = D();
    const mapping = C.detectMapping(rows[0]);
    const hasHeader = mapping.data >= 0 || mapping.valor >= 0 || !C.parseDate(rows[0][0]);
    ui.imp = {
      file: file.name, rows, delimiter, hasHeader, mapping: hasHeader ? mapping : { data: 0, valor: 1, descricao: 2, conta: -1, categoria: -1, tipo: -1 },
      contaId: S.settings().lastConta && S.conta(S.settings().lastConta) ? S.settings().lastConta : d.contas[0].id,
      catD: (d.categorias.find((c) => c.kind !== 'receita' && c.nome === 'Outros') || d.categorias.find((c) => c.kind !== 'receita') || {}).id,
      catR: (d.categorias.find((c) => c.kind === 'receita') || d.categorias[0]).id, invert: false,
    };
    renderPane(true);
  }

  /* ---- Dados e aparência */
  function paneDados() {
    const s = S.settings();
    return accountCard() + '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Aparência e avisos</h2></div>' +
      '<div class="opt"><div><b>Tema</b><div class="hint">Automático segue o seu sistema.</div></div>' + segHTML('', [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']], s.theme, 'theme') + '</div>' +
      '<div class="opt"><div><b>Lembrete de vencimento</b><div class="hint">Notifica contas fixas vencidas ou que vencem em até 2 dias, uma vez por dia, ao abrir o app (se o navegador permitir).</div></div>' + switchHTML('optNotify', s.notify, 'Lembrete de vencimento') + '</div></section>' +
      '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Seus dados</h2></div><p class="hint" style="margin-bottom:14px">Tudo fica guardado só neste navegador — sem servidor, sem anúncios, sem venda de dados. Faça backup de vez em quando.</p>' +
      '<div class="btn-row"><button class="btn" data-act="export-all">' + ico('download') + 'Exportar tudo (CSV)</button><button class="btn" data-act="backup">' + ico('download') + 'Backup (JSON)</button><button class="btn" data-act="restore">' + ico('upload') + 'Restaurar backup</button><input type="file" id="restoreFile" accept="application/json,.json" hidden></div>' +
      '<div class="opt" style="margin-top:8px"><div><b>Carregar dados de exemplo</b><div class="hint">Substitui os dados atuais por um mês de demonstração.</div></div><button class="btn btn-sm" data-act="demo">Carregar</button></div>' +
      '<div class="opt"><div><b>Apagar todos os dados</b><div class="hint">Remove lançamentos, contas e categorias deste navegador.</div></div><button class="btn btn-sm btn-danger" data-act="wipe">Apagar tudo</button></div></section>';
  }

  /* ---- Conta Google */
  const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>';
  const photo = (u) => (u.photoURL && /^https:\/\//.test(u.photoURL) ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer">' : '<span class="row-ico" style="--c:#5b5b69;width:34px;height:34px"><b>' + esc((u.displayName || u.email || '?').charAt(0).toUpperCase()) + '</b></span>');
  const SYNC_TXT = { syncing: 'Sincronizando…', synced: 'Sincronizado', offline: 'Sem conexão — sincroniza ao voltar', error: 'Erro ao sincronizar', idle: 'Conectando…' };
  function updateAccBtn() {
    const b = $('#accBtn'), u = Cloud.user();
    if (!Cloud.available()) { b.hidden = true; return; }
    b.hidden = false;
    if (u) { b.className = 'acc-btn in'; b.innerHTML = photo(u) + '<i class="sync ' + Cloud.status() + '"></i>'; b.title = (u.email || '') + ' · ' + (SYNC_TXT[Cloud.status()] || ''); }
    else { b.className = 'acc-btn'; b.innerHTML = GOOGLE + '<span>Entrar</span>'; b.title = 'Entrar com Google para sincronizar'; }
    $('#sideFoot').innerHTML = '<b>v' + esc(U.current) + '</b><br>' + (u ? 'Mostrando os dados da conta ' + esc(u.email || 'Google') + '.' : 'Dados guardados só neste computador.');
  }
  function accountCard() {
    if (!Cloud.available()) return '<section class="card"><div class="card-head"><h2>Conta Google</h2></div><div class="alert info">' + ico('info') + '<span>Não consegui carregar o Firebase (sem internet?). O app segue funcionando só neste navegador.</span></div></section>';
    const u = Cloud.user();
    if (!u) return '<section class="card"><div class="card-head"><h2>Conta Google</h2></div><p class="hint" style="margin-bottom:14px">Entre com sua conta Google para ver a sua organização financeira em qualquer aparelho. Logado, tudo o que você lançar fica vinculado à sua conta; sem login, o site mostra só os dados deste computador.</p>' +
      (Cloud.error() ? '<div class="alert over" style="margin-bottom:14px">' + ico('alert') + '<span>' + esc(Cloud.error()) + '</span></div>' : '') +
      '<button class="btn btn-primary" data-act="cloud-signin">' + GOOGLE + 'Entrar com Google</button></section>';
    const st = Cloud.status(), last = Cloud.lastSync();
    return '<section class="card"><div class="card-head"><h2>Conta Google</h2></div><div class="who">' + photo(u) + '<div><b>' + esc(u.displayName || 'Conta Google') + '</b><span>' + esc(u.email || '') + '</span></div></div>' +
      '<div class="alert ' + (st === 'error' ? 'over' : st === 'synced' ? 'ok' : 'info') + '">' + ico(st === 'error' ? 'alert' : st === 'synced' ? 'check' : 'refresh') + '<span>' + esc(st === 'error' && Cloud.error() ? Cloud.error() : (SYNC_TXT[st] || '') + (st === 'synced' && last ? ' às ' + new Date(last).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')) + '</span></div>' +
      '<p class="hint" style="margin:12px 0">Você está vendo os dados da conta. Tudo o que lançar fica vinculado a ela e aparece nos seus outros aparelhos em segundos. Ao sair, o site volta a mostrar apenas os dados deste computador (e a cópia da conta é removida daqui).</p>' +
      '<div class="btn-row"><button class="btn" data-act="cloud-sync">' + ico('refresh') + 'Sincronizar agora</button><button class="btn" data-act="cloud-signout">Sair</button></div></section>';
  }
  function importDlg() {
    return openDialog(sheet('Conta nova', '<p class="muted" style="margin-bottom:16px">Esta conta Google ainda não tem dados na nuvem, e este computador tem lançamentos guardados localmente. Quer copiá-los para a conta?</p><div class="choice"><button class="btn" data-close="copy" autofocus>Copiar para a conta<span class="muted small" style="margin-left:auto">os dados locais continuam aqui</span></button><button class="btn" data-close="skip">Começar a conta vazia<span class="muted small" style="margin-left:auto">sem copiar</span></button></div><p class="hint" style="margin-top:12px">Sem login, o site sempre volta a mostrar os dados deste computador.</p>'));
  }
  function conflictDlg(info) {
    const quando = new Date(info.remoteAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return openDialog(sheet('Alterações em conflito', '<p class="muted" style="margin-bottom:16px">Há alterações feitas aqui que ainda não subiram, e outro aparelho alterou a conta nesse meio tempo. Qual versão da conta você quer manter? A outra será substituída.</p><div class="choice"><button class="btn" data-close="remote" autofocus>Usar os dados da conta<span class="muted small" style="margin-left:auto">salvos em ' + esc(quando) + '</span></button><button class="btn" data-close="local">Manter as alterações deste aparelho<span class="muted small" style="margin-left:auto">substitui a conta</span></button></div><p class="hint" style="margin-top:12px">Dica: faça um backup em Ajustes › Dados antes, se tiver dúvida.</p>'));
  }

  /* ---- Atualizações via GitHub */
  function paneUpdates() {
    const s = S.settings(), u = ui.upd, local = location.protocol === 'file:';
    let res = '';
    if (u.status === 'checking') res = '<div class="alert info">' + '<span class="spin" style="width:20px;height:20px;display:inline-block">' + ico('refresh') + '</span><span>Consultando o GitHub…</span></div>';
    else if (u.status === 'norepo') res = '<div class="alert info">' + ico('info') + '<span>Informe o repositório no formato <span class="code">usuario/repositorio</span> para verificar atualizações.</span></div>';
    else if (u.status === 'latest') res = '<div class="alert ok">' + ico('check') + '<span>Você está na versão mais recente (v' + esc(u.current) + ').</span></div>';
    else if (u.status === 'offline') res = '<div class="alert info">' + ico('info') + '<span>Sem conexão agora. Tente novamente quando estiver online.</span></div>';
    else if (u.status === 'error') res = '<div class="alert over">' + ico('alert') + '<span>' + esc(u.message) + '</span></div>';
    else if (u.status === 'available') {
      const notes = String(u.notes || '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/^\s*[-*] /gm, '• ').trim();
      res = '<div class="alert info">' + ico('cloud') + '<span><b>Nova versão disponível: v' + esc(u.latest) + '</b>' + (u.date ? ' · ' + esc(String(u.date).slice(0, 10)) : '') + '</span></div>' +
        (notes ? '<div class="notes">' + esc(notes) + '</div>' : '') +
        '<div class="btn-row" style="margin-top:14px">' +
        (local ? '' : '<button class="btn btn-primary" data-act="upd-apply">' + ico('refresh') + 'Atualizar agora</button>') +
        '<a class="btn" href="' + esc(safeUrl(u.url)) + '" target="_blank" rel="noopener">Ver no GitHub</a>' + (u.zip ? '<a class="btn" href="' + esc(safeUrl(u.zip)) + '" target="_blank" rel="noopener">' + ico('download') + 'Baixar ZIP</a>' : '') + '</div>' +
        (local ? '<p class="hint" style="margin-top:12px">Você abriu o app direto do disco, então ele não consegue trocar os próprios arquivos. Na pasta do projeto rode <span class="code">git pull</span> (ou baixe o ZIP acima) e recarregue. Publicando o app em um site (ex.: GitHub Pages) o botão “Atualizar agora” faz tudo sozinho.</p>' : '');
    } else res = '<p class="hint">Ainda não verificado nesta sessão.</p>';
    return '<section class="card"><div class="ver"><div><div class="eyebrow">Versão instalada</div><div class="ver-badge money">v' + esc(U.current) + '</div></div>' +
      '<div style="margin-left:auto" class="btn-row"><button class="btn btn-primary" data-act="upd-check"' + (u.status === 'checking' ? ' disabled' : '') + '>' + ico('refresh') + 'Verificar agora</button></div></div>' +
      '<div class="field" style="margin-top:18px"><label for="repo">Repositório no GitHub</label><input class="input" id="repo" placeholder="usuario/bussola" value="' + esc(s.repo) + '" spellcheck="false" autocapitalize="off" autocomplete="off"></div>' +
      '<div style="margin-top:16px">' + res + '</div>' +
      '<div class="opt" style="margin-top:8px"><div><b>Verificar automaticamente</b><div class="hint">Ao abrir o app (no máximo a cada 6 horas). Seus dados nunca são tocados por uma atualização.</div></div>' + switchHTML('optAuto', s.autoCheck, 'Verificar automaticamente') + '</div></section>' +
      '<section class="card" style="margin-top:16px"><div class="card-head"><h2>Como lançar uma nova versão</h2></div><div class="stack" style="gap:10px;font-size:14px">' +
      '<div>1. Faça as mudanças no código e rode <span class="code">npm run bump -- 1.1.0 "o que mudou"</span>.</div>' +
      '<div>2. Envie ao GitHub: <span class="code">git push</span>. O GitHub Pages publica o site sozinho.</div>' +
      '<div>3. (Opcional) crie uma Release com a tag <span class="code">v1.1.0</span> para aparecer o texto de novidades aqui.</div>' +
      '<div class="hint">Quem usa o app vê o aviso na próxima abertura e atualiza com um clique.</div></div></section>';
  }

  /* ============================================================== NAVEGAÇÃO ======== */
  const RENDER = { inicio: pageInicio, transacoes: pageTransacoes, contas: pageContas, analise: pageAnalise, ajustes: pageAjustes };
  const TITLES = { inicio: 'Início', transacoes: 'Transações', contas: 'Contas', analise: 'Análise', ajustes: 'Ajustes' };
  const usesMonth = () => ['inicio', 'transacoes', 'analise'].includes(ui.page) || (ui.page === 'contas' && ui.contasTab === 'fixas');

  function buildNav() {
    $('#nav').innerHTML = '<span class="nav-ind"></span>' + PAGES.map((p) => '<a class="nav-item" href="#/' + p.id + '" data-page="' + p.id + '">' + ico(p.icon) + '<span>' + p.label + '</span></a>').join('');
    $('#sideFoot').innerHTML = '<b>v' + esc(U.current) + '</b><br>Dados guardados só neste navegador.';
    $('[data-act="month-prev"]').innerHTML = ico('left');
    $('[data-act="month-next"]').innerHTML = ico('right');
    $('#fab').innerHTML = ico('plus');
    updateThemeIcon();
  }
  function updateNavDot() {
    const a = $('.nav-item[data-page="ajustes"]');
    let dot = $('.nav-dot', a);
    if (ui.upd.status === 'available' && !dot) { dot = document.createElement('i'); dot.className = 'nav-dot'; dot.title = 'Atualização disponível'; a.appendChild(dot); }
    else if (ui.upd.status !== 'available' && dot) dot.remove();
  }
  function updateChrome() {
    $$('.nav-item').forEach((a) => (a.dataset.page === ui.page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#pageTitle').textContent = TITLES[ui.page];
    document.title = TITLES[ui.page] + ' · Bússola';
    $('#month').classList.toggle('hidden', !usesMonth());
    moveNavIndicator();
  }
  function setMonthLabel(dir) {
    const el = $('#monthLabel');
    el.className = 'month-label' + (dir < 0 ? ' back' : '');
    el.innerHTML = '<span>' + esc(C.monthLabel(ui.month)) + '</span>';
  }

  /** enter: anima a troca de sub-aba. initial: primeira pintura da página (o finish do view cuida das animações). */
  function renderPane(enter, initial) {
    const pane = $('#pane');
    if (!pane) return;
    pane.className = 'pane' + (enter ? ' enter' : '') + (initial ? ' st' : '');
    pane.innerHTML = ui.page === 'contas' ? paneContas() : paneAjustes();
    if (!initial) finish(pane, !!enter);
    if (ui.page === 'ajustes' && ui.ajTab === 'importar' && ui.imp) impCompute();
    wirePane(pane);
    $('#month').classList.toggle('hidden', !usesMonth());
  }
  function wirePane(pane) {
    const drop = $('#drop', pane);
    if (drop) {
      const inp = $('#impFile', pane);
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
      inp.addEventListener('change', () => readCsvFile(inp.files[0]));
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => readCsvFile(e.dataTransfer.files[0]));
    }
    const repo = $('#repo', pane);
    if (repo) repo.addEventListener('change', () => { S.setSettings({ repo: repo.value.trim() }); ui.upd = { status: 'idle' }; updateNavDot(); });
  }

  /** Renderiza a página atual. mode: 'enter' (troca de aba), 'month' (troca de mês) ou 'refresh' (dados mudaram). */
  function renderPage(mode, flashId) {
    const animate = mode !== 'refresh';
    view.className = animate ? 'anim' : 'noanim';
    const keepScroll = mode === 'refresh' ? window.scrollY : 0;
    view.innerHTML = RENDER[ui.page]();
    if (ui.page === 'transacoes') {
      renderTxList(animate, flashId);
      wireTx();
    }
    if (ui.page === 'contas' || ui.page === 'ajustes') renderPane(false, animate);
    finish(view, animate);
    updateChrome();
    if (keepScroll) window.scrollTo(0, keepScroll);
  }
  function wireTx() {
    const q = $('#q'), f = $('#fConta');
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { ui.q = q.value; renderTxList(true); }, 120); });
    f.addEventListener('change', () => { ui.fConta = f.value; renderTxList(true); });
  }

  let navToken = 0;
  async function show(id) {
    if (!RENDER[id]) id = 'inicio';
    if (ui.page === id) return;
    const prev = PAGES.findIndex((p) => p.id === ui.page), next = PAGES.findIndex((p) => p.id === id);
    const token = ++navToken;
    if (ui.page) { view.style.setProperty('--dir', next > prev ? 1 : -1); view.classList.add('leaving'); await wait(150); if (token !== navToken) return; }
    ui.page = id;
    window.scrollTo(0, 0);
    renderPage('enter');
    view.classList.remove('leaving');
  }
  function route() {
    const id = (location.hash.match(/^#\/(\w+)/) || [])[1];
    show(id || 'inicio');
  }
  function go(id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; else show(id); }
  /** Vai para a página; se já estiver nela (ex.: trocou a sub-aba), apenas redesenha. */
  function goPage(id) { if (ui.page === id) renderPage('enter'); else go(id); }
  window.addEventListener('hashchange', route);

  /* ============================================================== FORMULÁRIOS ====== */
  function openTxForm(id) {
    const d = D(), edit = id ? d.transacoes.find((t) => t.id === id) : null;
    const s = S.settings(), hoje = today();
    const f = {
      tipo: edit ? edit.tipo : 'despesa', cents: edit ? edit.valor : 0, data: edit ? edit.data : hoje, desc: edit ? edit.descricao : '', parcelas: 1,
      cat: edit ? edit.categoria_id : '', conta: edit ? edit.conta_id : (S.conta(s.lastConta) ? s.lastConta : (d.contas[0] || {}).id),
    };
    const catsOf = (tipo) => d.categorias.filter((c) => (c.kind || 'despesa') === tipo);
    const pickCat = () => { const l = catsOf(f.tipo); if (!l.find((c) => c.id === f.cat)) { const last = S.categoria(s.lastCategoria); f.cat = (last && last.kind === f.tipo ? last : l[0] || {}).id || ''; } };
    pickCat();
    // compra parcelada: todas as parcelas do grupo (para mostrar/editar o total)
    const grupo = edit && edit.grupo_parcela_id ? d.transacoes.filter((t) => t.grupo_parcela_id === edit.grupo_parcela_id).sort((a, b) => a.parcela_atual - b.parcela_atual) : null;
    const grupoTotal = grupo ? grupo.reduce((s, t) => s + t.valor, 0) : 0;
    let totalEditado = false, rowsEditadas = false;
    const body = '<form class="form" id="txForm" autocomplete="off" novalidate>' +
      segHTML('full ' + f.tipo, [['despesa', 'Despesa'], ['receita', 'Receita']], f.tipo) +
      '<div><div class="amount-cur">' + (grupo ? 'VALOR DESTA PARCELA (' + edit.parcela_atual + '/' + edit.total_parcelas + ') · R$' : 'R$') + '</div><input class="amount ' + f.tipo + '" id="fValor" inputmode="numeric" placeholder="0,00" aria-label="Valor" autofocus></div>' +
      '<div class="field"><span class="label">Categoria</span><div class="chips" id="fCats"></div></div>' +
      '<div class="field"><span class="label">Conta</span><div class="chips" id="fContas">' + d.contas.map((a) => '<button type="button" class="chip" data-id="' + esc(a.id) + '" style="--c:' + (ACC[a.tipo] || ACC.pix).c + '" aria-pressed="' + (a.id === f.conta) + '">' + ico(a.tipo in I ? a.tipo : 'pix') + esc(a.nome) + '</button>').join('') + '</div></div>' +
      '<div class="collapse" id="fParc"><div><div class="field" style="padding-top:2px"><span class="label">Parcelas</span><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div class="stepper"><button type="button" data-st="-1" aria-label="Menos parcelas">−</button><b id="fN">1×</b><button type="button" data-st="1" aria-label="Mais parcelas">+</button></div><span class="hint" id="fParcHint"></span></div></div>' +
        '<div class="opt" style="padding:12px 0 0"><div><b>Compra com juros</b><div class="hint">Informe o valor de cada parcela</div></div>' + switchHTML('fSwitch', false, 'Informar o valor de cada parcela') + '</div>' +
        '<div class="collapse" id="fManual"><div><div class="field" style="padding-top:10px"><label for="fAll">Valor de cada parcela (preenche todas)</label><input class="input" id="fAll" inputmode="numeric" placeholder="0,00"></div><div id="fRows" style="margin-top:10px"></div></div></div></div></div>' +
      (grupo ? '<div class="card" style="padding:14px;background:var(--surface-2);box-shadow:none"><div class="field"><label for="fTotal">Valor total da compra (' + grupo.length + (grupo.length === 1 ? ' parcela' : ' parcelas') + ')</label><input class="input" id="fTotal" inputmode="numeric" placeholder="0,00"></div><p class="hint" id="fTotalHint" style="margin-top:8px"></p>' +
        '<div class="opt" style="padding:10px 0 0"><div><b>Ajustar parcela por parcela</b><div class="hint">Para valores diferentes (juros)</div></div>' + switchHTML('fEditSwitch', false, 'Ajustar parcela por parcela') + '</div><div class="collapse" id="fEditWrap"><div><div id="fEditRows" style="margin-top:10px"></div></div></div></div>' : '') +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="fData">Dia da compra</label><input type="date" class="input" id="fData" required></div><div class="field"><label for="fDesc">Descrição (opcional)</label><input class="input" id="fDesc" maxlength="80" placeholder="Ex.: mercado"></div></div>' +
      '<div id="fFatWrap" hidden><div class="alert info">' + ico('credito') + '<span id="fFatura"></span></div></div>' +
      '<div class="btn-row">' + (edit ? '<button type="button" class="btn btn-danger" id="fDel">' + ico('trash') + 'Excluir</button>' : '') + '<button class="btn btn-primary" style="flex:1;padding:14px" type="submit">' + (edit ? 'Salvar alterações' : 'Lançar') + '</button></div></form>';

    openDialog(sheet(edit ? 'Editar lançamento' : 'Novo lançamento', body), {
      mount(root) {
        const val = $('#fValor', root), seg = $('.seg', root), catsBox = $('#fCats', root), parc = $('#fParc', root);
        const refresh = () => {
          const a = S.conta(f.conta);
          const show = !edit && f.tipo === 'despesa' && a && a.tipo === 'credito';
          parc.classList.toggle('open', show);
          if (!show) { f.parcelas = 1; if (f.manual) setManual(false); }
          $('#fN', root).textContent = f.parcelas + '×';
          $('#fParcHint', root).textContent = f.manual ? f.parcelas + ' parcelas · total ' + R(f.cents) + ' (soma das parcelas)'
            : f.parcelas > 1 && f.cents ? f.parcelas + '× de ' + R(C.splitInstallments(f.cents, f.parcelas)[0]) + (f.cents % f.parcelas ? ' (centavos na 1ª)' : '') : 'Digite o valor total da compra';
          fatura();
        };
        const drawCats = () => { pickCat(); catsBox.innerHTML = catsOf(f.tipo).map((c) => chipCat(c, c.id === f.cat)).join(''); };

        /* em qual fatura/mês a compra no cartão vai cair, conforme o dia da compra e o fechamento do cartão */
        function fatura() {
          const a = S.conta(f.conta), data = $('#fData', root).value;
          const show = f.tipo === 'despesa' && a && a.tipo === 'credito' && C.isValidISO(data);
          $('#fFatWrap', root).hidden = !show;
          if (!show) return;
          const inv = C.invoiceFor(a, data);
          const quando = inv.delta <= 0 ? 'vem neste mês' : inv.delta === 1 ? 'vem no mês seguinte' : 'vem daqui a ' + inv.delta + ' meses';
          let txt = 'Compra em ' + C.fmtShort(data) + ' (fechamento dia ' + (a.dia_fechamento || '?') + ') → entra na fatura que fecha ' + C.fmtShort(inv.end) + ' e vence ' + C.fmtDate(inv.due) + ': ' + quando + ' (' + C.monthLabel(inv.dueMonth) + ').';
          if (f.parcelas > 1) txt += ' Última parcela na fatura de ' + C.monthLabel(C.invoiceFor(a, C.addMonths(data, f.parcelas - 1)).dueMonth) + '.';
          $('#fFatura', root).textContent = txt;
        }

        /* compra com juros (lançamento novo): valor de cada parcela informado à mão */
        const man = $('#fManual', root), sw = $('#fSwitch', root), rowsBox = $('#fRows', root);
        f.manual = false; f.valores = [];
        const setVal = (c) => { f.cents = c; val.dataset.cents = c; val.value = c ? R(c, { symbol: false }) : ''; };
        const sync = () => { setVal(f.valores.reduce((s, v) => s + (v || 0), 0)); refresh(); };
        const drawRows = () => {
          const n = f.parcelas, base = Math.round((f.cents || 0) / n), d0 = $('#fData', root).value;
          while (f.valores.length < n) f.valores.push(f.valores.length ? f.valores[f.valores.length - 1] : base);
          f.valores.length = n;
          rowsEditor(rowsBox, f.valores.map((_, i) => (i + 1) + '/' + n + ' · ' + C.fmtShort(C.addMonths(C.isValidISO(d0) ? d0 : hoje, i))), f.valores, sync);
        };
        function setManual(on) {
          f.manual = on; sw.setAttribute('aria-checked', String(on)); man.classList.toggle('open', on); val.readOnly = on;
          if (on) { f.valores = C.splitInstallments(f.cents || 0, f.parcelas); drawRows(); sync(); } else refresh();
        }
        sw.addEventListener('click', () => setManual(!f.manual));
        moneyField($('#fAll', root), 0, (c) => { f.valores = Array(f.parcelas).fill(c); drawRows(); sync(); });
        $('#fData', root).addEventListener('change', () => { if (f.manual) drawRows(); });
        $('#fData', root).addEventListener('input', fatura);

        if (grupo) {
          const tot = $('#fTotal', root), hint = $('#fTotalHint', root);
          const idx = grupo.findIndex((t) => t.id === edit.id);
          const vals = grupo.map((t) => t.valor), labels = grupo.map((t) => t.parcela_atual + '/' + t.total_parcelas + ' · ' + C.fmtShort(t.data));
          const wrap = $('#fEditWrap', root), esw = $('#fEditSwitch', root), ebox = $('#fEditRows', root);
          const setTot = (c) => { tot.dataset.cents = c; tot.value = c ? R(c, { symbol: false }) : ''; };
          const setMain = (c) => { f.cents = c; val.dataset.cents = c; val.value = c ? R(c, { symbol: false }) : ''; };
          const redraw = () => { if (esw.getAttribute('aria-checked') === 'true') rowsEditor(ebox, labels, vals, onRow); };
          const dica = () => { const n = grupo.length, c = vals.reduce((s, v) => s + v, 0); hint.textContent = n + (rowsEditadas ? ' parcelas de valores diferentes' : '× de ' + R(vals[0]) + (c % n ? ' (centavos nas primeiras parcelas)' : '')) + ' · alterar o total reajusta todas as parcelas'; };
          function onRow() { rowsEditadas = true; totalEditado = false; setTot(vals.reduce((s, v) => s + v, 0)); setMain(vals[idx]); dica(); }
          moneyField(tot, grupoTotal, (c) => { totalEditado = true; rowsEditadas = false; C.splitInstallments(c, grupo.length).forEach((v, i) => { vals[i] = v; }); setMain(vals[idx]); dica(); redraw(); });
          moneyField(val, f.cents, (c) => { f.cents = c; totalEditado = false; rowsEditadas = false; vals.fill(c); setTot(c * grupo.length); dica(); redraw(); refresh(); });
          esw.addEventListener('click', () => { const on = esw.getAttribute('aria-checked') !== 'true'; esw.setAttribute('aria-checked', String(on)); wrap.classList.toggle('open', on); if (on) rowsEditor(ebox, labels, vals, onRow); });
          dica();
        } else moneyField(val, f.cents, (c) => { f.cents = c; refresh(); });
        $('#fData', root).value = f.data; $('#fDesc', root).value = f.desc;
        drawCats(); refresh();
        bindSeg(seg, (v) => { f.tipo = v; seg.className = 'seg full ' + v; val.className = 'amount ' + v; drawCats(); refresh(); });
        bindChips(catsBox, (cid) => { f.cat = cid; });
        bindChips($('#fContas', root), (cid) => { f.conta = cid; refresh(); });
        $$('[data-st]', root).forEach((b) => b.addEventListener('click', () => { f.parcelas = Math.max(1, Math.min(48, f.parcelas + Number(b.dataset.st))); if (f.manual) { drawRows(); sync(); } else refresh(); }));
        if (edit) $('#fDel', root).addEventListener('click', () => { closeDialog(); deleteTx(edit.id); });
        $('#txForm', root).addEventListener('submit', async (e) => {
          e.preventDefault();
          f.data = $('#fData', root).value; f.desc = $('#fDesc', root).value.trim();
          if (!f.cents) { val.focus(); val.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 280 }); return toast('Digite o valor.', { kind: 'error' }); }
          if (!C.isValidISO(f.data)) return toast('Escolha uma data válida.', { kind: 'error' });
          if (!f.cat || !f.conta) return toast('Escolha a categoria e a conta.', { kind: 'error' });
          if (!edit && f.manual && f.valores.some((v) => !(v > 0))) return toast('Preencha o valor de todas as parcelas.', { kind: 'error' });
          S.setSettings({ lastConta: f.conta, lastCategoria: f.tipo === 'despesa' ? f.cat : S.settings().lastCategoria });
          const snap = S.snapshot();
          try {
            if (edit) {
              let scope = 'one';
              const patch = { tipo: f.tipo, valor: f.cents, data: f.data, categoria_id: f.cat, conta_id: f.conta, descricao: f.desc };
              if (grupo && rowsEditadas) { // valores diferentes por parcela (juros)
                const vs = $$('#fEditRows input', root).map((i) => centsOf(i));
                if (vs.some((v) => !(v > 0))) return toast('Preencha o valor de todas as parcelas.', { kind: 'error' });
                S.updateParcelas(edit.id, patch, vs);
              } else if (grupo && totalEditado) { // o total vale para a compra inteira: reparte entre as parcelas
                S.updateParcelas(edit.id, patch, centsOf($('#fTotal', root)));
              } else {
                if (edit.grupo_parcela_id) { scope = await scopeDlg(edit, 'alterar'); if (!scope) return; }
                S.updateTransacao(edit.id, patch, scope);
              }
              closeDialog();
              undoable('Lançamento atualizado.', snap);
            } else {
              const novas = S.addTransacao({ tipo: f.tipo, valor: f.cents, data: f.data, categoria_id: f.cat, conta_id: f.conta, descricao: f.desc, parcelas: f.parcelas, valores: f.manual ? f.valores.slice() : undefined });
              closeDialog();
              const mk = C.monthKey(f.data);
              if (mk !== ui.month) { const dir = mk > ui.month ? 1 : -1; ui.month = mk; setMonthLabel(dir); }
              if (ui.page === 'transacoes') ui.q = '';
              renderPage('refresh', novas[0].id); // mostra o mês do lançamento e destaca a linha nova
              undoable((f.tipo === 'receita' ? 'Receita' : 'Despesa') + ' de ' + R(f.cents) + (novas.length > 1 ? ' lançada em ' + novas.length + '×.' : ' lançada.'), snap);
            }
          } catch (err) { fail(err); }
        });
      },
    });
  }

  async function deleteTx(id) {
    const t = D().transacoes.find((x) => x.id === id);
    if (!t) return;
    let scope = 'one';
    if (t.grupo_parcela_id) { scope = await scopeDlg(t, 'excluir'); if (!scope) return; }
    const snap = S.snapshot();
    const n = S.removeTransacao(id, scope);
    closeDialog();
    undoable(n > 1 ? n + ' parcelas excluídas.' : 'Lançamento excluído.', snap);
  }

  function openAccountForm(id) {
    const d = D(), a = id ? S.conta(id) : null;
    const f = { tipo: a ? a.tipo : 'pix', limite: a ? a.limite : 0, fech: a ? a.dia_fechamento : 10, venc: a ? a.dia_vencimento : 17 };
    const body = '<form class="form" id="accForm" autocomplete="off">' +
      '<div class="field"><label for="aNome">Nome</label><input class="input" id="aNome" maxlength="40" placeholder="Ex.: Nubank, Carteira" required autofocus></div>' +
      '<div class="field"><span class="label">Tipo</span>' + segHTML('full', [['pix', 'Pix'], ['debito', 'Débito'], ['credito', 'Crédito'], ['dinheiro', 'Dinheiro']], f.tipo) + '</div>' +
      '<div class="collapse" id="aCred"><div><div class="grid g3" style="gap:12px;padding-top:2px"><div class="field"><label for="aLim">Limite (R$)</label><input class="input" id="aLim" inputmode="numeric" placeholder="0,00"></div><div class="field"><label for="aFech">Dia de fechamento</label><input class="input" id="aFech" type="number" min="1" max="31"></div><div class="field"><label for="aVenc">Dia de vencimento</label><input class="input" id="aVenc" type="number" min="1" max="31"></div></div><p class="hint" style="margin-top:10px">As compras neste cartão entram na fatura do ciclo (fechamento a fechamento). Passando o dia do vencimento, a fatura é considerada paga e sai da fatura pendente e do limite comprometido — o histórico de lançamentos continua.</p></div></div>' +
      '<div class="btn-row">' + (a ? '<button type="button" class="btn btn-danger" id="aDel">' + ico('trash') + 'Excluir</button>' : '') + '<button class="btn btn-primary" style="flex:1;padding:14px">' + (a ? 'Salvar' : 'Criar') + '</button></div></form>';
    openDialog(sheet(a ? 'Editar conta' : 'Nova conta', body), {
      mount(root) {
        $('#aNome', root).value = a ? a.nome : '';
        moneyField($('#aLim', root), f.limite);
        $('#aFech', root).value = f.fech || 10; $('#aVenc', root).value = f.venc || 17;
        const cred = $('#aCred', root); cred.classList.toggle('open', f.tipo === 'credito');
        bindSeg($('.seg', root), (v) => { f.tipo = v; cred.classList.toggle('open', v === 'credito'); });
        if (a) $('#aDel', root).addEventListener('click', () => deleteAccount(a.id));
        $('#accForm', root).addEventListener('submit', (e) => {
          e.preventDefault();
          const nome = $('#aNome', root).value.trim();
          if (!nome) return toast('Dê um nome para a conta.', { kind: 'error' });
          const fech = parseInt($('#aFech', root).value, 10), venc = parseInt($('#aVenc', root).value, 10);
          if (f.tipo === 'credito' && !(fech >= 1 && fech <= 31 && venc >= 1 && venc <= 31)) return toast('Informe dias de fechamento e vencimento entre 1 e 31.', { kind: 'error' });
          const obj = { nome, tipo: f.tipo, limite: f.tipo === 'credito' ? centsOf($('#aLim', root)) : 0, dia_fechamento: f.tipo === 'credito' ? fech : null, dia_vencimento: f.tipo === 'credito' ? venc : null };
          if (a) obj.id = a.id;
          S.upsertConta(obj);
          closeDialog();
          toast(a ? 'Conta atualizada.' : 'Conta criada.');
        });
      },
    });
  }
  async function deleteAccount(id) {
    const d = D(), a = S.conta(id), n = d.transacoes.filter((t) => t.conta_id === id).length;
    const outras = d.contas.filter((c) => c.id !== id);
    if (!n) { if (!(await confirmDlg('Excluir “' + a.nome + '”?', 'Esta conta não tem lançamentos.'))) return; S.removeConta(id); return toast('Conta excluída.'); }
    if (!outras.length) return toast('Crie outra conta antes: os ' + n + ' lançamentos precisam de um destino.', { kind: 'error' });
    const v = await openDialog(sheet('Excluir “' + a.nome + '”', '<p class="muted" style="margin-bottom:14px">Há ' + n + ' lançamento' + (n === 1 ? '' : 's') + ' nesta conta. Nenhum será apagado — escolha para onde movê-los:</p><div class="field"><select class="select" id="mv">' + outras.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>').join('') + '</select></div><div class="btn-row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close="">Cancelar</button><button class="btn btn-danger" id="mvOk">Mover e excluir</button></div>', {}), {
      mount(root) { $('#mvOk', root).addEventListener('click', () => closeDialog($('#mv', root).value)); },
    });
    if (!v) return;
    const snap = S.snapshot();
    try { S.removeConta(id, v); undoable('Conta excluída; lançamentos movidos.', snap); } catch (e) { fail(e); }
  }

  function openCategoryForm(id) {
    const c = id ? S.categoria(id) : null;
    const f = { kind: c ? c.kind : 'despesa', cor: c ? c.cor : S.COLORS[D().categorias.length % S.COLORS.length] };
    const body = '<form class="form" id="catForm" autocomplete="off"><div class="field"><label for="cNome">Nome</label><input class="input" id="cNome" maxlength="30" required autofocus></div>' +
      (c ? '' : '<div class="field"><span class="label">Tipo</span>' + segHTML('full', [['despesa', 'Despesa'], ['receita', 'Receita']], f.kind) + '</div>') +
      '<div class="collapse" id="cOrc"><div><div class="field" style="padding-top:2px"><label for="cLim">Orçamento mensal (R$) — deixe vazio para não limitar</label><input class="input" id="cLim" inputmode="numeric" placeholder="0,00"></div></div></div>' +
      '<div class="field"><span class="label">Cor</span><div class="swatches" id="cCores">' + S.COLORS.map((k) => '<button type="button" class="swatch" data-c="' + k + '" style="--c:' + k + '" aria-pressed="' + (k === f.cor) + '" aria-label="Cor ' + k + '"></button>').join('') + '</div></div>' +
      '<div class="btn-row">' + (c ? '<button type="button" class="btn btn-danger" id="cDel">' + ico('trash') + 'Excluir</button>' : '') + '<button class="btn btn-primary" style="flex:1;padding:14px">' + (c ? 'Salvar' : 'Criar categoria') + '</button></div></form>';
    openDialog(sheet(c ? 'Editar categoria' : 'Nova categoria', body), {
      mount(root) {
        $('#cNome', root).value = c ? c.nome : '';
        moneyField($('#cLim', root), c ? c.orcamento_mensal : 0);
        const orc = $('#cOrc', root); orc.classList.toggle('open', f.kind !== 'receita');
        const seg = $('.seg', root); if (seg) bindSeg(seg, (v) => { f.kind = v; orc.classList.toggle('open', v !== 'receita'); });
        $('#cCores', root).addEventListener('click', (e) => { const b = e.target.closest('.swatch'); if (!b) return; f.cor = b.dataset.c; $$('.swatch', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
        if (c) $('#cDel', root).addEventListener('click', () => deleteCategory(c.id));
        $('#catForm', root).addEventListener('submit', (e) => {
          e.preventDefault();
          const nome = $('#cNome', root).value.trim();
          if (!nome) return toast('Dê um nome para a categoria.', { kind: 'error' });
          if (D().categorias.some((x) => x.id !== (c && c.id) && x.kind === f.kind && C.normText(x.nome) === C.normText(nome))) return toast('Já existe uma categoria com esse nome.', { kind: 'error' });
          const obj = { nome, kind: f.kind, cor: f.cor, orcamento_mensal: f.kind === 'receita' ? 0 : centsOf($('#cLim', root)) };
          if (c) obj.id = c.id;
          S.upsertCategoria(obj);
          closeDialog();
          toast(c ? 'Categoria atualizada.' : 'Categoria criada.');
        });
      },
    });
  }
  async function deleteCategory(id) {
    const d = D(), c = S.categoria(id);
    const n = d.transacoes.filter((t) => t.categoria_id === id).length + d.contas_fixas.filter((f) => f.categoria_id === id).length;
    const outras = d.categorias.filter((x) => x.id !== id && x.kind === c.kind);
    if (!n) { if (!(await confirmDlg('Excluir “' + c.nome + '”?', 'Esta categoria não tem lançamentos.'))) return; S.removeCategoria(id); return toast('Categoria excluída.'); }
    if (!outras.length) return toast('Crie outra categoria do mesmo tipo antes: os ' + n + ' itens precisam de um destino.', { kind: 'error' });
    const v = await openDialog(sheet('Excluir “' + c.nome + '”', '<p class="muted" style="margin-bottom:14px">Há ' + n + ' lançamento' + (n === 1 ? '' : 's') + ' ou conta' + (n === 1 ? '' : 's') + ' fixa' + (n === 1 ? '' : 's') + ' nesta categoria. Nada será apagado — escolha para onde movê-' + (n === 1 ? 'lo' : 'los') + ':</p><div class="field"><select class="select" id="mv">' + outras.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.nome) + '</option>').join('') + '</select></div><div class="btn-row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close="">Cancelar</button><button class="btn btn-danger" id="mvOk">Mover e excluir</button></div>'), {
      mount(root) { $('#mvOk', root).addEventListener('click', () => closeDialog($('#mv', root).value)); },
    });
    if (!v) return;
    const snap = S.snapshot();
    try { S.removeCategoria(id, v); undoable('Categoria excluída; itens movidos.', snap); } catch (e) { fail(e); }
  }

  /** Conta fixa (despesa) ou receita recorrente (ex.: salário). `tipoNovo` define o tipo ao cadastrar. */
  function openFixaForm(id, tipoNovo) {
    const d = D(), fx = id ? d.contas_fixas.find((x) => x.id === id) : null;
    const catsDe = (tipo) => d.categorias.filter((c) => (c.kind || 'despesa') === tipo);
    const recebem = d.contas.filter((c) => c.tipo !== 'credito'); // receita não cai em cartão de crédito
    const tipo0 = fx ? (C.isIncome(fx) ? 'receita' : 'despesa') : (tipoNovo === 'receita' ? 'receita' : 'despesa');
    const f = {
      tipo: tipo0, ativa: fx ? fx.ativa !== false : true, auto: fx ? !!fx.auto : true,
      ini: fx && fx.inicio ? fx.inicio : C.monthKey(today()), fim: (fx && fx.fim) || '', meses: fx && Array.isArray(fx.meses) ? fx.meses.slice() : [],
      cat: fx ? fx.categoria_id : (catsDe(tipo0)[0] || {}).id,
      conta: fx && fx.conta_id && recebem.find((c) => c.id === fx.conta_id) ? fx.conta_id : (S.conta(S.settings().lastConta) && S.conta(S.settings().lastConta).tipo !== 'credito' ? S.settings().lastConta : (recebem[0] || {}).id),
    };
    const rec = f.tipo === 'receita';
    const body = '<form class="form" id="fxForm" autocomplete="off">' +
      (fx ? '' : segHTML('full ' + f.tipo, [['despesa', 'Conta fixa'], ['receita', 'Receita recorrente']], f.tipo)) +
      '<div class="field"><label for="xNome">Nome</label><input class="input" id="xNome" maxlength="40" placeholder="' + (rec ? 'Ex.: Salário' : 'Ex.: Aluguel, Internet') + '" required autofocus></div>' +
      '<div class="grid g2" style="gap:12px"><div class="field"><label for="xVal">Valor (R$)</label><input class="input" id="xVal" inputmode="numeric" placeholder="0,00"></div><div class="field"><label for="xDia" id="xDiaL">' + (rec ? 'Dia do recebimento' : 'Dia do vencimento') + '</label><input class="input" id="xDia" type="number" min="1" max="31" placeholder="5"></div></div>' +
      '<div class="field"><span class="label">Categoria</span><div class="chips" id="xCats">' + catsDe(f.tipo).map((c) => chipCat(c, c.id === f.cat)).join('') + '</div></div>' +
      '<div class="collapse' + (rec ? ' open' : '') + '" id="xRec"><div>' +
        '<div class="field" style="padding-top:2px"><span class="label">Conta que recebe</span><div class="chips" id="xContas">' + recebem.map((a) => '<button type="button" class="chip" data-id="' + esc(a.id) + '" style="--c:' + (ACC[a.tipo] || ACC.pix).c + '" aria-pressed="' + (a.id === f.conta) + '">' + ico(a.tipo in I ? a.tipo : 'pix') + esc(a.nome) + '</button>').join('') + '</div></div>' +
        '<div class="grid g2" style="gap:12px;padding-top:14px"><div class="field"><label for="xIni">Começa em (mês)</label><input type="month" class="input" id="xIni" placeholder="AAAA-MM"></div><div class="field"><label for="xFim">Termina em (opcional)</label><input type="month" class="input" id="xFim" placeholder="AAAA-MM"></div></div>' +
        '<div class="field" style="padding-top:14px"><span class="label">Meses de recebimento</span><div class="chips" id="xMeses">' + ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((n, i) => '<button type="button" class="chip" data-m="' + (i + 1) + '" aria-pressed="' + f.meses.includes(i + 1) + '">' + n + '</button>').join('') + '</div><p class="hint" style="margin-top:6px">Nenhum marcado = todos os meses. Para um 13º salário ou bônus anual, marque só os meses em que ele cai (ex.: Dez).</p></div>' +
        '<div class="opt" style="padding:12px 0 0"><div><b>Lançar sozinha no dia</b><div class="hint">Ao abrir o app a partir desse dia, o recebimento do mês entra nos lançamentos (uma vez por mês). Desligado, você marca “Recebi” manualmente.</div></div>' + switchHTML('xAuto', f.auto, 'Lançar sozinha no dia do recebimento') + '</div></div></div>' +
      (fx ? '<div class="opt" style="padding:0"><div><b>Ativa</b><div class="hint">Pausada, ela deixa de aparecer nos próximos meses (o histórico fica).</div></div>' + switchHTML('xAtiva', f.ativa, 'Ativa') + '</div>' : '') +
      '<div class="btn-row">' + (fx ? '<button type="button" class="btn btn-danger" id="xDel">' + ico('trash') + 'Excluir</button>' : '') + '<button class="btn btn-primary" style="flex:1;padding:14px">' + (fx ? 'Salvar' : 'Cadastrar') + '</button></div></form>';
    openDialog(sheet(fx ? (rec ? 'Editar receita recorrente' : 'Editar conta fixa') : (rec ? 'Nova receita recorrente' : 'Nova conta fixa'), body), {
      mount(root) {
        $('#xNome', root).value = fx ? fx.nome : ''; $('#xDia', root).value = fx ? fx.dia_vencimento : '';
        moneyField($('#xVal', root), fx ? fx.valor : 0);
        const catsBox = $('#xCats', root);
        bindChips(catsBox, (cid) => { f.cat = cid; });
        bindChips($('#xContas', root), (cid) => { f.conta = cid; });
        $('#xIni', root).value = f.ini; $('#xFim', root).value = f.fim;
        $('#xMeses', root).addEventListener('click', (e) => {
          const b = e.target.closest('.chip');
          if (!b) return;
          const m = Number(b.dataset.m), on = !f.meses.includes(m);
          f.meses = on ? [...f.meses, m].sort((a, c) => a - c) : f.meses.filter((x) => x !== m);
          b.setAttribute('aria-pressed', String(on));
        });
        const au = $('#xAuto', root); au.addEventListener('click', () => { f.auto = !f.auto; au.setAttribute('aria-checked', String(f.auto)); });
        const tseg = $('.seg', root);
        if (tseg) bindSeg(tseg, (v) => {
          f.tipo = v; tseg.className = 'seg full ' + v;
          f.cat = (catsDe(v)[0] || {}).id;
          catsBox.innerHTML = catsDe(v).map((c) => chipCat(c, c.id === f.cat)).join('');
          $('#xRec', root).classList.toggle('open', v === 'receita');
          $('#xDiaL', root).textContent = v === 'receita' ? 'Dia do recebimento' : 'Dia do vencimento';
          $('#xNome', root).placeholder = v === 'receita' ? 'Ex.: Salário' : 'Ex.: Aluguel, Internet';
        });
        const sw = $('#xAtiva', root); if (sw) sw.addEventListener('click', () => { f.ativa = !f.ativa; sw.setAttribute('aria-checked', String(f.ativa)); });
        if (fx) $('#xDel', root).addEventListener('click', async () => {
          if (!(await confirmDlg('Excluir “' + fx.nome + '”?', 'Os lançamentos já pagos continuam no histórico.'))) return;
          const snap = S.snapshot(); S.removeFixa(fx.id); closeDialog(); undoable('Conta fixa excluída.', snap);
        });
        $('#fxForm', root).addEventListener('submit', (e) => {
          e.preventDefault();
          const nome = $('#xNome', root).value.trim(), valor = centsOf($('#xVal', root)), dia = parseInt($('#xDia', root).value, 10);
          if (!nome || !valor) return toast('Informe o nome e o valor.', { kind: 'error' });
          if (!(dia >= 1 && dia <= 31)) return toast('O dia do vencimento deve estar entre 1 e 31.', { kind: 'error' });
          if (!f.cat) return toast('Escolha uma categoria.', { kind: 'error' });
          const inc = f.tipo === 'receita';
          if (inc && !f.conta) return toast('Escolha a conta que recebe.', { kind: 'error' });
          const ini = $('#xIni', root).value.trim(), fim = $('#xFim', root).value.trim();
          if (inc) {
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ini)) return toast('Informe o mês inicial (AAAA-MM).', { kind: 'error' });
            if (fim && !/^\d{4}-(0[1-9]|1[0-2])$/.test(fim)) return toast('Mês final inválido (use AAAA-MM).', { kind: 'error' });
            if (fim && fim < ini) return toast('O mês final não pode ser antes do inicial.', { kind: 'error' });
          }
          const obj = { nome, valor, dia_vencimento: dia, categoria_id: f.cat, ativa: f.ativa, tipo: inc ? 'receita' : 'despesa', auto: inc ? f.auto : false, conta_id: inc ? f.conta : null };
          if (inc) Object.assign(obj, { inicio: ini, fim: fim || null, meses: f.meses.slice() });
          if (fx) obj.id = fx.id;
          S.upsertFixa(obj);
          closeDialog();
          toast(inc ? (fx ? 'Receita recorrente atualizada.' : 'Receita recorrente cadastrada.') : (fx ? 'Conta fixa atualizada.' : 'Conta fixa cadastrada.'));
          if (inc && f.auto) runRecurring(true); // se o dia deste mês já passou, lança agora
        });
      },
    });
  }
  function payFixa(id, mk) {
    const d = D(), cf = d.contas_fixas.find((f) => f.id === id);
    if (!cf) return;
    const pref = S.conta(S.settings().lastConta);
    const inc = C.isIncome(cf);
    const alvo = inc && S.conta(cf.conta_id) ? S.conta(cf.conta_id) : (pref && pref.tipo !== 'credito' ? pref : d.contas.find((c) => c.tipo !== 'credito') || d.contas[0]);
    if (!alvo) return toast('Cadastre uma conta antes.', { kind: 'error' });
    const snap = S.snapshot();
    S.payFixa(id, mk, alvo.id, today());
    undoable(inc ? cf.nome + ' recebida (' + R(cf.valor) + ' · ' + alvo.nome + ').' : cf.nome + ' paga (' + R(cf.valor) + ' · ' + alvo.nome + ').', snap);
  }

  /** Lança as receitas recorrentes automáticas cujo dia já chegou. `avisar`: mostra aviso mesmo com pouca coisa. */
  function runRecurring() {
    const n = S.runRecurring(today());
    if (n) toast(n === 1 ? 'Receita recorrente lançada.' : n + ' receitas recorrentes lançadas.');
  }

  /* ================================================================== AÇÕES ======== */
  function download(name, text, mime, bom) {
    const blob = new Blob([bom ? '﻿' + text : text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const stamp = () => today();

  async function doCheck(silent) {
    const s = S.settings();
    if (!silent) { ui.upd = { status: 'checking' }; if (ui.page === 'ajustes' && ui.ajTab === 'atualizacoes') renderPane(false); }
    const r = await U.check(s.repo);
    S.setSettings({ lastCheck: Date.now() });
    ui.upd = r;
    updateNavDot();
    if (ui.page === 'ajustes' && ui.ajTab === 'atualizacoes') renderPane(false);
    if (silent && r.status === 'available') toast('Nova versão disponível: v' + r.latest, { action: 'Ver', onAction: () => { ui.ajTab = 'atualizacoes'; goPage('ajustes'); }, ms: 9000 });
  }

  const ACTIONS = {
    'month-prev': () => changeMonth(-1),
    'month-next': () => changeMonth(1),
    theme: () => { const cur = document.documentElement.dataset.theme; setTheme(cur === 'dark' ? 'light' : 'dark'); },
    'tx-new': () => openTxForm(),
    'tx-edit': (el) => openTxForm(el.dataset.id),
    'tx-del': (el) => deleteTx(el.dataset.id),
    'acc-new': () => openAccountForm(),
    'acc-edit': (el) => openAccountForm(el.dataset.id),
    'cat-new': () => openCategoryForm(),
    'cat-edit': (el) => openCategoryForm(el.dataset.id),
    'fix-new': (el) => openFixaForm(null, el.dataset.tipo),
    'fix-edit': (el) => openFixaForm(el.dataset.id),
    'fix-pay': (el) => payFixa(el.dataset.id, el.dataset.mk),
    'fix-undo': (el) => { const snap = S.snapshot(); S.unpayFixa(el.dataset.id, el.dataset.mk); undoable('Lançamento desfeito.', snap); },
    acc: () => { if (Cloud.user()) { ui.ajTab = 'dados'; goPage('ajustes'); } else Cloud.signIn(); },
    'cloud-signin': () => Cloud.signIn(),
    'cloud-sync': () => { toast('Sincronizando…'); Cloud.syncNow(); },
    'cloud-signout': async () => { await Cloud.signOut(); toast('Você saiu. O site voltou a mostrar só os dados deste computador.'); },
    'inv-pay': (el) => { const snap = S.snapshot(); S.setInvoicePaid(el.dataset.conta, el.dataset.end, true); undoable('Fatura marcada como paga.', snap); },
    'goto-cartoes': () => { ui.contasTab = 'carteiras'; goPage('contas'); },
    'goto-fixas': () => { ui.contasTab = 'fixas'; goPage('contas'); },
    'goto-cats': () => { ui.ajTab = 'categorias'; goPage('ajustes'); },
    'goto-tx': () => goPage('transacoes'),
    'export-view': () => {
      const list = filteredTx();
      if (!list.length) return toast('Nada para exportar com esses filtros.');
      download('bussola-' + (ui.q ? 'busca' : ui.month) + '.csv', C.toCSV(list, D().contas, D().categorias), 'text/csv;charset=utf-8', true);
      toast(list.length + ' lançamento' + (list.length === 1 ? '' : 's') + ' exportado' + (list.length === 1 ? '' : 's') + '.');
    },
    'export-all': () => { const d = D(); download('bussola-tudo-' + stamp() + '.csv', C.toCSV(d.transacoes, d.contas, d.categorias), 'text/csv;charset=utf-8', true); toast('CSV exportado.'); },
    backup: () => { download('bussola-backup-' + stamp() + '.json', S.snapshot(), 'application/json'); toast('Backup salvo.'); },
    restore: () => $('#restoreFile').click(),
    demo: async () => { if (!(await confirmDlg('Carregar dados de exemplo?', 'Isso <b>substitui</b> todos os dados atuais por um mês de demonstração. Faça um backup antes, se precisar.', 'Carregar', false))) return; const snap = S.snapshot(); S.loadDemo(); undoable('Dados de exemplo carregados.', snap); },
    wipe: async () => { if (!(await confirmDlg('Apagar todos os dados?', 'Lançamentos, contas, categorias e contas fixas serão removidos deste navegador. Você poderá desfazer logo em seguida.', 'Apagar tudo'))) return; const snap = S.snapshot(); S.reset(); undoable('Dados apagados.', snap); },
    'imp-cancel': () => { ui.imp = null; renderPane(true); },
    'imp-confirm': () => {
      const r = ui.imp && ui.imp.result;
      if (!r || !r.novas) return;
      const snap = S.snapshot();
      const n = S.importTransacoes(r.items);
      ui.imp = null;
      renderPane(true);
      undoable(n + ' lançamento' + (n === 1 ? '' : 's') + ' importado' + (n === 1 ? '' : 's') + (r.duplicadas ? ' · ' + r.duplicadas + ' ignorado' + (r.duplicadas === 1 ? '' : 's') : '') + '.', snap);
    },
    'upd-check': () => doCheck(false),
    'upd-apply': async (el) => {
      el.disabled = true; el.innerHTML = '<span class="spin" style="display:inline-block;width:18px;height:18px">' + ico('refresh') + '</span>Atualizando…';
      const r = await U.apply(ui.upd.latest);
      if (r.manual) toast('Rode git pull na pasta do projeto e recarregue.');
    },
    seg: (el) => {
      const seg = el.closest('.seg'), key = el.dataset.key, val = el.dataset.val;
      if (ui[key] === val && key !== 'theme') return;
      $$('.seg-btn', seg).forEach((b) => b.setAttribute('aria-selected', String(b === el)));
      moveThumb(seg);
      if (key === 'theme') return setTheme(val);
      ui[key] = val;
      if (key === 'txTipo') renderTxList(true);
      else { renderPane(true); }
    },
  };

  document.addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (sw && !dlg.contains(sw)) return handleSwitch(sw);
    const el = e.target.closest('[data-act]');
    const fn = el && ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role="button"][data-act]')) { e.preventDefault(); t.click(); return; }
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !dlg.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) { e.preventDefault(); openTxForm(); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'restoreFile') return restoreFile(t);
    if (t.dataset && t.dataset.imp && ui.imp) {
      const k = t.dataset.imp;
      if (k === 'map') ui.imp.mapping[t.dataset.k] = parseInt(t.value, 10);
      else ui.imp[k] = t.value;
      impCompute();
    }
  });

  function handleSwitch(sw) {
    const on = sw.getAttribute('aria-checked') !== 'true';
    if (sw.id === 'impHdr' && ui.imp) { ui.imp.hasHeader = on; ui.imp.mapping = on ? C.detectMapping(ui.imp.rows[0]) : { data: 0, valor: 1, descricao: 2, conta: -1, categoria: -1, tipo: -1 }; return renderPane(false); }
    if (sw.id === 'impInv' && ui.imp) { ui.imp.invert = on; sw.setAttribute('aria-checked', String(on)); return impCompute(); }
    if (sw.id === 'optAuto') { S.setSettings({ autoCheck: on }); return sw.setAttribute('aria-checked', String(on)); }
    if (sw.id === 'optNotify') {
      if (!on) { S.setSettings({ notify: false }); return sw.setAttribute('aria-checked', 'false'); }
      if (!('Notification' in window)) return toast('Este navegador não oferece notificações.', { kind: 'error' });
      Notification.requestPermission().then((p) => {
        if (p === 'granted') { S.setSettings({ notify: true }); sw.setAttribute('aria-checked', 'true'); toast('Lembretes ativados.'); } else toast('Permissão de notificação negada.', { kind: 'error' });
      });
    }
  }

  async function restoreFile(input) {
    const f = input.files[0]; input.value = '';
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      S.validateBackup(obj);
      if (!(await confirmDlg('Restaurar este backup?', 'Os dados atuais serão <b>substituídos</b> pelo conteúdo de “' + esc(f.name) + '”.', 'Restaurar', false))) return;
      const snap = S.snapshot();
      S.restore(JSON.stringify(obj));
      undoable('Backup restaurado.', snap);
    } catch (e) { fail(new Error('Não consegui ler esse backup: ' + (e.message || 'arquivo inválido'))); }
  }

  function changeMonth(dir) {
    ui.month = C.shiftMonthKey(ui.month, dir);
    setMonthLabel(dir);
    if (ui.page === 'contas') renderPane(false); else renderPage('month');
  }

  function setTheme(t) {
    const resolved = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
    document.documentElement.dataset.theme = resolved;
    S.setSettings({ theme: t });
    updateThemeIcon();
    const m = $('meta[name="theme-color"]'); if (m) m.content = resolved === 'dark' ? '#1e2029' : '#5b5b69';
  }
  function updateThemeIcon() { $('#themeBtn').innerHTML = ico(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'); }

  /* ---------------------------------------------------------- Observação e boot */
  S.subscribe(() => {
    if (!ui.page) return;
    if (dlg.open && dlg.classList.contains('open')) { /* formulário aberto: atualiza ao fechar */ }
    renderPage('refresh');
  });
  window.addEventListener('resize', () => positionThumbs());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => positionThumbs());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.settings().theme === 'auto') setTheme('auto'); });

  function reminders() {
    const s = S.settings(), hoje = today();
    if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted' || s.lastNotifyDay === hoje) return;
    const d = D();
    const itens = C.fixedOccurrences(d.contas_fixas, C.monthKey(hoje), d.transacoes, hoje).filter((o) => !C.isIncome(o.cf) && (o.status === 'vencida' || (o.status === 'a_vencer' && o.dias <= 2)));
    const cartoes = d.contas.filter((c) => c.tipo === 'credito').flatMap((c) => C.invoiceList(c, d.transacoes, hoje).filter((i) => i.status === 'fechada' && i.total > 0 && C.daysBetween(hoje, i.due) <= 2).map((i) => ({ c, i })));
    if (!itens.length && !cartoes.length) return;
    S.setSettings({ lastNotifyDay: hoje });
    const body = itens.map((o) => o.cf.nome + ' — ' + (o.status === 'vencida' ? 'vencida' : o.dias === 0 ? 'vence hoje' : 'vence em ' + o.dias + 'd') + ' (' + R(o.cf.valor) + ')')
      .concat(cartoes.map(({ c, i }) => 'Fatura ' + c.nome + ' — vence ' + C.fmtShort(i.due) + ' (' + R(i.total) + ')')).join('\n');
    const opts = { body, icon: 'assets/logo.png', tag: 'bussola-vencimentos' };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then((r) => r.showNotification('Contas fixas a pagar', opts)).catch(() => new Notification('Contas fixas a pagar', opts));
    else new Notification('Contas fixas a pagar', opts);
  }

  function boot() {
    buildNav();
    Cloud.setHandlers({ conflict: conflictDlg, importLocal: importDlg });
    Cloud.onChange((evt, msg) => {
      updateAccBtn();
      if (evt === 'error') toast(msg, { kind: 'error', ms: 8000 });
      if (evt === 'user' && Cloud.user()) toast('Conectado como ' + (Cloud.user().email || 'sua conta Google') + '. Você está vendo os dados da conta.');
      if (evt === 'pulled') { toast('Dados carregados da sua conta.'); runRecurring(); }
      if (ui.page === 'ajustes' && ui.ajTab === 'dados' && !dlg.open) renderPane(false);
    });
    Cloud.init();
    updateAccBtn();
    runRecurring(); // salário e outras receitas automáticas do mês
    setMonthLabel(1);
    route();
    if (S.error()) toast('Não consegui salvar os dados neste navegador. Exporte um backup.', { kind: 'error', ms: 9000 });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    const pend = U.takePending();
    if (pend) toast(pend.ok ? 'Atualizado para a v' + U.current + ' ✓' : 'A v' + pend.wanted.replace(/^v/i, '') + ' ainda não foi publicada no site. Tente de novo em alguns minutos.', { ms: 8000 });
    const s = S.settings();
    if (s.repo && s.autoCheck && Date.now() - s.lastCheck > 6 * 3600 * 1000 && navigator.onLine !== false) setTimeout(() => doCheck(true), 2500);
    setTimeout(reminders, 1500);
  }
  boot();
  window.__bussola = { ui, S, C, go }; // facilita depuração no console
})();
