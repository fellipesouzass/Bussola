/*
 * Bússola — núcleo de cálculo (puro, sem DOM).
 * Funciona no navegador (window.BussolaCore) e no Node (testes).
 * Regras: valores em centavos (inteiros) e datas como "AAAA-MM-DD" no fuso America/Sao_Paulo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BussolaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TZ = 'America/Sao_Paulo';
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  /* ------------------------------------------------------------------ dinheiro */

  function fmtBRL(cents, opts) {
    const o = opts || {};
    const v = Math.round(Number(cents) || 0);
    const abs = Math.abs(v);
    const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const cs = String(abs % 100).padStart(2, '0');
    const sinal = v < 0 ? '-' : (o.sign && v > 0 ? '+' : '');
    return sinal + (o.symbol === false ? '' : 'R$ ') + reais + ',' + cs;
  }

  /** Converte texto ("1.234,56", "R$ 12,5", "-50", "12.50") em centavos. NaN se inválido. */
  function parseMoney(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
    let s = String(input == null ? '' : input).trim();
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/R\$|\s| /gi, '');
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); } else if (s.startsWith('+')) s = s.slice(1);
    if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1); }
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN;
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    let intPart, decPart = '';
    if (lastDot >= 0 && lastComma >= 0) {
      const sep = Math.max(lastDot, lastComma);
      intPart = s.slice(0, sep).replace(/[.,]/g, '');
      decPart = s.slice(sep + 1);
    } else if (lastComma >= 0) {
      intPart = s.slice(0, lastComma).replace(/,/g, '');
      decPart = s.slice(lastComma + 1);
    } else if (lastDot >= 0) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) intPart = s.replace(/\./g, '');
      else { intPart = s.slice(0, lastDot).replace(/\./g, ''); decPart = s.slice(lastDot + 1); }
    } else intPart = s;
    if (!/^\d*$/.test(decPart) || !/^\d*$/.test(intPart)) return NaN;
    const cents = Math.round(Number((intPart || '0') + '.' + (decPart || '0')) * 100);
    return neg ? -cents : cents;
  }

  /* --------------------------------------------------------------------- datas */

  const pad = (n) => String(n).padStart(2, '0');

  function todayISO(now) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now || new Date());
  }
  function parseISO(iso) {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return { y, m, d };
  }
  const isoOf = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const clampDay = (y, m, d) => Math.min(Math.max(1, d), daysInMonth(y, m));
  function shiftMonth(y, m, n) {
    const t = y * 12 + (m - 1) + n;
    return { y: Math.floor(t / 12), m: (t % 12) + 1 };
  }
  function addMonths(iso, n) {
    const { y, m, d } = parseISO(iso);
    const s = shiftMonth(y, m, n);
    return isoOf(s.y, s.m, clampDay(s.y, s.m, d));
  }
  function addDays(iso, n) {
    const { y, m, d } = parseISO(iso);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return isoOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function daysBetween(a, b) {
    const A = parseISO(a), B = parseISO(b);
    return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86400000);
  }
  const monthKey = (iso) => String(iso).slice(0, 7);
  function shiftMonthKey(mk, n) {
    const [y, m] = mk.split('-').map(Number);
    const s = shiftMonth(y, m, n);
    return s.y + '-' + pad(s.m);
  }
  const monthLabel = (mk) => { const [y, m] = mk.split('-').map(Number); return MESES[m - 1] + ' ' + y; };
  const monthShort = (mk) => { const [y, m] = mk.split('-').map(Number); return MESES_CURTOS[m - 1] + '/' + String(y).slice(2); };
  const fmtDate = (iso) => { const { y, m, d } = parseISO(iso); return pad(d) + '/' + pad(m) + '/' + y; };
  const fmtShort = (iso) => { const { m, d } = parseISO(iso); return pad(d) + '/' + pad(m); };
  function weekdayOf(iso) { const { y, m, d } = parseISO(iso); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function dayHeading(iso, today) {
    if (iso === today) return 'Hoje';
    if (iso === addDays(today, -1)) return 'Ontem';
    if (iso === addDays(today, 1)) return 'Amanhã';
    const { m, d } = parseISO(iso);
    return DIAS_CURTOS[weekdayOf(iso)] + ', ' + d + ' ' + MESES_CURTOS[m - 1];
  }
  function isValidISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
  }

  /* ------------------------------------------------------------------- parcelas */

  /** Divide o total em N parcelas inteiras; os centavos que sobram vão para as primeiras. */
  function splitInstallments(total, n) {
    const base = Math.floor(total / n);
    const resto = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
  }

  /**
   * Gera N lançamentos (um por mês) com o mesmo grupo_parcela_id.
   * `base` traz tipo, data (da 1ª parcela), categoria_id, conta_id, descricao; `total` é o valor total da compra.
   */
  function buildInstallments(base, total, n, newId) {
    const grupo = n > 1 ? newId() : null;
    return splitInstallments(total, n).map((valor, i) => ({
      id: newId(),
      tipo: base.tipo,
      valor,
      data: addMonths(base.data, i),
      categoria_id: base.categoria_id,
      conta_id: base.conta_id,
      descricao: base.descricao || '',
      parcela_atual: n > 1 ? i + 1 : null,
      total_parcelas: n > 1 ? n : null,
      grupo_parcela_id: grupo,
      conta_fixa_id: base.conta_fixa_id || null,
      competencia: base.competencia || null,
      hash_importacao: base.hash_importacao || null,
    }));
  }

  /* --------------------------------------------------------------------- fatura */

  /** Ciclo de fatura (fechamento a fechamento) que contém a data `ref`. */
  function invoiceCycle(conta, ref) {
    const fech = conta.dia_fechamento || 1;
    const venc = conta.dia_vencimento || fech;
    const { y, m, d } = parseISO(ref);
    let end = { y, m };
    if (d > clampDay(y, m, fech)) end = shiftMonth(y, m, 1);
    const endISO = isoOf(end.y, end.m, clampDay(end.y, end.m, fech));
    const prev = shiftMonth(end.y, end.m, -1);
    const prevClose = isoOf(prev.y, prev.m, clampDay(prev.y, prev.m, fech));
    let due = end;
    if (venc <= fech) due = shiftMonth(end.y, end.m, 1);
    return { start: addDays(prevClose, 1), end: endISO, due: isoOf(due.y, due.m, clampDay(due.y, due.m, venc)) };
  }

  const signed = (t) => (t.tipo === 'receita' ? t.valor : -t.valor);

  /** Fatura estimada: despesas (menos estornos) da conta de crédito dentro do ciclo. */
  function invoiceTotal(conta, txs, ref) {
    const c = invoiceCycle(conta, ref);
    let total = 0;
    for (const t of txs) {
      if (t.conta_id !== conta.id || t.data < c.start || t.data > c.end) continue;
      total -= signed(t);
    }
    return { ...c, total };
  }

  /**
   * Fatura paga: passou do vencimento (paga automaticamente) ou foi marcada como paga antes (conta.faturas_pagas guarda o dia de fechamento).
   * Compras de uma fatura paga saem da fatura pendente e do limite comprometido, mas continuam no histórico.
   */
  const invoiceIsPaid = (conta, cycle, today) => today > cycle.due || (conta.faturas_pagas || []).includes(cycle.end);
  const invoiceStatus = (conta, cycle, today) => (invoiceIsPaid(conta, cycle, today) ? 'paga' : today <= cycle.end ? 'aberta' : 'fechada');

  /** Faturas ainda pendentes (abertas ou fechadas e não vencidas), em ordem, com o total de cada uma. */
  function invoiceList(conta, txs, today) {
    const map = {};
    for (const t of txs) {
      if (t.conta_id !== conta.id) continue;
      const c = invoiceCycle(conta, t.data);
      if (invoiceIsPaid(conta, c, today)) continue;
      const m = map[c.end] || (map[c.end] = { ...c, total: 0, count: 0 });
      m.total -= signed(t);
      m.count++;
    }
    return Object.values(map).map((i) => ({ ...i, status: invoiceStatus(conta, i, today) })).sort((a, b) => (a.end < b.end ? -1 : 1));
  }

  /** Quanto do limite está comprometido: soma das faturas ainda pendentes (inclui parcelas futuras). */
  function creditCommitted(conta, txs, today) {
    return Math.max(0, invoiceList(conta, txs, today).reduce((s, i) => s + i.total, 0));
  }

  /** A compra pertence a uma fatura de cartão já paga? */
  function isPaidCharge(t, conta, today) {
    return !!conta && conta.tipo === 'credito' && invoiceIsPaid(conta, invoiceCycle(conta, t.data), today);
  }

  /** Saldo de contas que não são cartão: receitas - despesas até hoje. */
  function accountBalance(conta, txs, today) {
    let s = 0;
    for (const t of txs) if (t.conta_id === conta.id && t.data <= today) s += signed(t);
    return s;
  }

  /* --------------------------------------------------------- resumo e orçamento */

  const inMonth = (txs, mk) => txs.filter((t) => t.data.slice(0, 7) === mk);

  function summary(txs, mk) {
    let receitas = 0, despesas = 0;
    for (const t of txs) {
      if (t.data.slice(0, 7) !== mk) continue;
      if (t.tipo === 'receita') receitas += t.valor; else despesas += t.valor;
    }
    return { receitas, despesas, saldo: receitas - despesas };
  }

  function spentByCategory(txs, mk) {
    const out = {};
    for (const t of txs) {
      if (t.tipo !== 'despesa' || t.data.slice(0, 7) !== mk) continue;
      out[t.categoria_id] = (out[t.categoria_id] || 0) + t.valor;
    }
    return out;
  }

  /** 'none' sem limite · 'ok' · 'warn' a partir de 80% · 'over' a partir de 100%. Aritmética inteira. */
  function budgetLevel(gasto, limite) {
    if (!limite || limite <= 0) return 'none';
    if (gasto >= limite) return 'over';
    if (gasto * 5 >= limite * 4) return 'warn';
    return 'ok';
  }
  const budgetPercent = (gasto, limite) => (limite > 0 ? Math.round((gasto / limite) * 100) : null);
  const budgetTotal = (cats) => cats.filter((c) => c.kind !== 'receita').reduce((s, c) => s + (c.orcamento_mensal || 0), 0);

  function budgetRows(cats, txs, mk) {
    const gastos = spentByCategory(txs, mk);
    return cats.filter((c) => c.kind !== 'receita').map((c) => {
      const gasto = gastos[c.id] || 0;
      const limite = c.orcamento_mensal || 0;
      return { cat: c, gasto, limite, pct: budgetPercent(gasto, limite), ratio: limite > 0 ? gasto / limite : 0, level: budgetLevel(gasto, limite) };
    });
  }

  /* --------------------------------------------------------------- contas fixas */

  function fixedDueDate(cf, mk) {
    const [y, m] = mk.split('-').map(Number);
    return isoOf(y, m, clampDay(y, m, cf.dia_vencimento));
  }

  /** Status derivado: paga (existe lançamento vinculado) · vencida · a_vencer. */
  function fixedStatus(cf, mk, txs, today) {
    const due = fixedDueDate(cf, mk);
    const tx = txs.find((t) => t.conta_fixa_id === cf.id && (t.competencia || t.data.slice(0, 7)) === mk);
    if (tx) return { status: 'paga', due, tx };
    if (today > due) return { status: 'vencida', due, dias: daysBetween(due, today) };
    return { status: 'a_vencer', due, dias: daysBetween(today, due) };
  }

  /** Ocorrências do mês, derivadas do cadastro (nunca gravadas → nunca duplicam). */
  function fixedOccurrences(fixas, mk, txs, today) {
    return fixas
      .filter((cf) => cf.ativa !== false && (!cf.inicio || cf.inicio <= mk))
      .map((cf) => ({ cf, ...fixedStatus(cf, mk, txs, today) }))
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  }

  /* ------------------------------------------------------------------ projeção */

  /**
   * Projeção de fechamento do mês:
   *   ritmo   = gasto avulso até hoje / dias passados × dias do mês
   *   + contas fixas já pagas + contas fixas ainda não pagas + lançamentos futuros do mês (parcelas).
   * Os gastos de contas fixas ficam fora do ritmo para não serem multiplicados.
   */
  function projection(txs, fixas, mk, today, orcamento) {
    const [y, m] = mk.split('-').map(Number);
    const dim = daysInMonth(y, m);
    const cur = monthKey(today);
    const dayN = mk === cur ? parseISO(today).d : mk < cur ? dim : 0;
    const limit = mk === cur ? today : mk < cur ? isoOf(y, m, dim) : '';
    let atual = 0, avulsoAteHoje = 0, fixasPagas = 0, futuros = 0;
    for (const t of txs) {
      if (t.tipo !== 'despesa' || t.data.slice(0, 7) !== mk) continue;
      if (limit && t.data <= limit) {
        atual += t.valor;
        if (t.conta_fixa_id) fixasPagas += t.valor; else avulsoAteHoje += t.valor;
      } else futuros += t.valor;
    }
    let fixasPendentes = 0;
    if (mk >= cur) {
      for (const o of fixedOccurrences(fixas, mk, txs, today)) if (o.status !== 'paga') fixasPendentes += o.cf.valor;
    }
    const ritmo = dayN > 0 ? Math.round((avulsoAteHoje / dayN) * dim) : 0;
    const projecao = ritmo + fixasPagas + fixasPendentes + futuros;
    return {
      projecao, atual, ritmo, fixasPagas, fixasPendentes, futuros, dayN, dim,
      orcamento: orcamento || 0,
      diferenca: orcamento ? orcamento - projecao : null,
      level: budgetLevel(projecao, orcamento),
      ratio: orcamento > 0 ? projecao / orcamento : 0,
    };
  }

  /* --------------------------------------------------------------- comparativos */

  function compareMonths(txs, cats, mk) {
    const prev = shiftMonthKey(mk, -1);
    const a = spentByCategory(txs, mk), b = spentByCategory(txs, prev);
    const mkRow = (nome, cat, atual, anterior) => ({
      nome, cat, atual, anterior, delta: atual - anterior,
      pct: anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : (atual > 0 ? null : 0),
    });
    const rows = cats.filter((c) => c.kind !== 'receita')
      .map((c) => mkRow(c.nome, c, a[c.id] || 0, b[c.id] || 0))
      .filter((r) => r.atual > 0 || r.anterior > 0)
      .sort((x, y) => y.atual - x.atual);
    const ta = summary(txs, mk).despesas, tb = summary(txs, prev).despesas;
    return { prev, rows, total: mkRow('Total', null, ta, tb) };
  }

  const riskRanking = (cats, txs, mk) => budgetRows(cats, txs, mk).filter((r) => r.limite > 0).sort((a, b) => b.ratio - a.ratio);

  /* ----------------------------------------------------------------------- CSV */

  const normText = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const count = (ch) => { let q = false, n = 0; for (const c of firstLine) { if (c === '"') q = !q; else if (c === ch && !q) n++; } return n; };
    const cand = [[';', count(';')], [',', count(',')], ['\t', count('\t')]].sort((a, b) => b[1] - a[1]);
    const delim = cand[0][1] > 0 ? cand[0][0] : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some((x) => x.trim() !== '')) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x.trim() !== '')) rows.push(row);
    return { rows, delimiter: delim };
  }

  function detectMapping(header) {
    const rules = {
      data: /^(data|date|dt|dia|vencimento)\b|\bdata\b/,
      valor: /valor|amount|value|quantia|montante/,
      descricao: /descri|hist|memo|estabelec|title|titulo|detalhe|lancamento|nome/,
      conta: /^(conta|account|carteira|cartao)/,
      categoria: /categ/,
      tipo: /^(tipo|type|d\/c|natureza)/,
    };
    const map = { data: -1, valor: -1, descricao: -1, conta: -1, categoria: -1, tipo: -1 };
    const used = new Set();
    header.forEach((h, i) => {
      const n = normText(h);
      for (const [k, re] of Object.entries(rules)) {
        if (map[k] === -1 && !used.has(i) && re.test(n)) { map[k] = i; used.add(i); break; }
      }
    });
    return map;
  }

  function parseDate(s) {
    s = String(s == null ? '' : s).trim();
    let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s))) {
      d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000;
    } else return null;
    const iso = isoOf(y, mo, d);
    return isValidISO(iso) ? iso : null;
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  /** Hash de importação a partir de data + valor + descrição (+ nº da ocorrência quando a linha se repete no arquivo). */
  function importHash(data, valor, descricao, ocorrencia) {
    const s = [data, valor, normText(descricao)].join('|') + (ocorrencia ? '|#' + ocorrencia : '');
    return 'i1-' + fnv1a(s) + fnv1a(s.split('').reverse().join(''));
  }

  /**
   * Prepara a importação (sem gravar nada).
   * opts: { contas, cats, existing:Set, contaId, catDespesaId, catReceitaId, invert }
   */
  function buildImport(rows, mapping, opts) {
    const existing = opts.existing || new Set();
    const seen = {};
    const byName = (list, nome) => { const n = normText(nome); return n ? list.find((x) => normText(x.nome) === n) : null; };
    const items = rows.map((r, idx) => {
      const get = (k) => (mapping[k] >= 0 ? (r[mapping[k]] == null ? '' : String(r[mapping[k]]).trim()) : '');
      const data = parseDate(get('data'));
      const bruto = parseMoney(get('valor'));
      const descricao = get('descricao');
      const item = { linha: idx + 1, data, descricao, status: 'nova', motivo: '' };
      if (!data) { item.status = 'invalida'; item.motivo = 'data inválida'; return item; }
      if (!Number.isFinite(bruto) || bruto === 0) { item.status = 'invalida'; item.motivo = 'valor inválido'; return item; }
      let tipo;
      const tcol = normText(get('tipo'));
      if (tcol) {
        if (/^(d|deb|desp|saida|pagamento|compra|expense|-)/.test(tcol)) tipo = 'despesa';
        else if (/^(c|cred|rec|entrada|deposito|income|\+)/.test(tcol)) tipo = 'receita';
      }
      if (!tipo) tipo = (bruto < 0) !== !!opts.invert ? 'despesa' : 'receita';
      const conta = byName(opts.contas, get('conta'));
      const cat = byName(opts.cats.filter((c) => (c.kind || 'despesa') === tipo), get('categoria'));
      const chave = data + '|' + bruto + '|' + normText(descricao);
      seen[chave] = (seen[chave] || 0) + 1;
      const hash = importHash(data, bruto, descricao, seen[chave] - 1);
      Object.assign(item, {
        tipo, valor: Math.abs(bruto), hash_importacao: hash,
        conta_id: conta ? conta.id : opts.contaId,
        categoria_id: cat ? cat.id : (tipo === 'despesa' ? opts.catDespesaId : opts.catReceitaId),
      });
      if (existing.has(hash)) { item.status = 'duplicada'; item.motivo = 'já importada'; }
      return item;
    });
    return {
      items,
      novas: items.filter((i) => i.status === 'nova').length,
      duplicadas: items.filter((i) => i.status === 'duplicada').length,
      invalidas: items.filter((i) => i.status === 'invalida').length,
    };
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita injeção de fórmula no Excel
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(txs, contas, cats) {
    const conta = Object.fromEntries(contas.map((c) => [c.id, c.nome]));
    const cat = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
    const head = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Parcela'];
    const linhas = [...txs].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)).map((t) => [
      fmtDate(t.data), t.tipo === 'receita' ? 'Receita' : 'Despesa', t.descricao || '', cat[t.categoria_id] || '', conta[t.conta_id] || '',
      fmtBRL(t.valor, { symbol: false }).replace(/\./g, ''), t.total_parcelas ? t.parcela_atual + '/' + t.total_parcelas : '',
    ]);
    return [head, ...linhas].map((l) => l.map(csvCell).join(';')).join('\r\n');
  }

  /* -------------------------------------------------------------------- versão */

  function compareVersions(a, b) {
    const p = (v) => String(v).replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
    const A = p(a), B = p(b);
    for (let i = 0; i < 3; i++) { if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) > (B[i] || 0) ? 1 : -1; }
    return 0;
  }

  return {
    TZ, MESES, fmtBRL, parseMoney, todayISO, parseISO, isoOf, daysInMonth, clampDay, shiftMonth, addMonths, addDays, daysBetween,
    monthKey, shiftMonthKey, monthLabel, monthShort, fmtDate, fmtShort, dayHeading, isValidISO,
    splitInstallments, buildInstallments, invoiceCycle, invoiceTotal, creditCommitted, accountBalance,
    invoiceIsPaid, invoiceStatus, invoiceList, isPaidCharge,
    summary, inMonth, spentByCategory, budgetLevel, budgetPercent, budgetTotal, budgetRows,
    fixedDueDate, fixedStatus, fixedOccurrences, projection, compareMonths, riskRanking,
    normText, parseCSV, detectMapping, parseDate, importHash, buildImport, toCSV, compareVersions,
  };
});
