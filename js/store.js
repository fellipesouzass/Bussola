/*
 * Bússola — persistência local (localStorage) e operações sobre as quatro entidades:
 * contas, categorias, transacoes, contas_fixas.
 * Os dados têm `schema`; ao atualizar o app, MIGRATIONS leva dados antigos para o formato novo
 * (com cópia de segurança antes).
 */
(function (root) {
  'use strict';
  const C = root.BussolaCore;
  const LOCAL_KEY = 'bussola.data';
  const ACCOUNT_PREFIX = 'bussola.data.u.';
  const SESSION = 'bussola.session'; // uid da conta cujos dados estão sendo mostrados (vazio = dados locais do computador)
  const META_PREFIX = 'bussola.cloudmeta.';
  let KEY = LOCAL_KEY;
  try { const u = localStorage.getItem(SESSION); if (u) KEY = ACCOUNT_PREFIX + u; } catch (e) { /* segue com os dados locais */ }
  const SKEY = 'bussola.settings';
  const SCHEMA = 1;

  /** MIGRATIONS[n] converte o schema n em n+1. Exemplo futuro: MIGRATIONS[1] = (d) => { ...; } */
  const MIGRATIONS = {};

  // sem vermelho/âmbar puros: essas cores ficam reservadas para os alertas de orçamento
  const COLORS = ['#3f8fd2', '#5c6bc0', '#2aa876', '#27a3b5', '#8e6bd8', '#e0699b', '#9aa64a', '#7a8599', '#b9805a', '#5b5b69'];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let state = null;
  const subs = new Set();
  let lastError = null;

  /* ------------------------------------------------------------------ sementes */

  function seed() {
    const cats = [
      ['Alimentação', 'despesa'], ['Transporte', 'despesa'], ['Moradia', 'despesa'], ['Lazer', 'despesa'],
      ['Saúde', 'despesa'], ['Outros', 'despesa'], ['Salário', 'receita'], ['Outras receitas', 'receita'],
    ];
    return {
      schema: SCHEMA,
      contas: [
        { id: uid(), nome: 'Pix', tipo: 'pix', limite: 0, dia_fechamento: null, dia_vencimento: null },
        { id: uid(), nome: 'Dinheiro', tipo: 'dinheiro', limite: 0, dia_fechamento: null, dia_vencimento: null },
        { id: uid(), nome: 'Cartão de crédito', tipo: 'credito', limite: 0, dia_fechamento: 10, dia_vencimento: 17 },
      ],
      categorias: cats.map(([nome, kind], i) => ({ id: uid(), nome, kind, orcamento_mensal: 0, cor: COLORS[i % COLORS.length] })),
      transacoes: [],
      contas_fixas: [],
    };
  }

  /* ----------------------------------------------------------------- persistência */

  function normalize(d) {
    d.contas = Array.isArray(d.contas) ? d.contas : [];
    d.categorias = Array.isArray(d.categorias) ? d.categorias : [];
    d.transacoes = Array.isArray(d.transacoes) ? d.transacoes : [];
    d.contas_fixas = Array.isArray(d.contas_fixas) ? d.contas_fixas : [];
    d.categorias.forEach((c, i) => { c.kind = c.kind || 'despesa'; c.cor = c.cor || COLORS[i % COLORS.length]; c.orcamento_mensal = c.orcamento_mensal | 0; });
    return d;
  }

  function migrate(d) {
    const from = d.schema || 1;
    if (from > SCHEMA) throw new Error('Dados criados por uma versão mais nova do app (schema ' + from + ').');
    if (from < SCHEMA) {
      try { localStorage.setItem(KEY + '.backup-v' + from, JSON.stringify(d)); } catch (e) { /* sem espaço: segue */ }
      for (let v = from; v < SCHEMA; v++) if (MIGRATIONS[v]) MIGRATIONS[v](d);
      d.schema = SCHEMA;
    }
    return normalize(d);
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { lastError = e; }
    if (raw) {
      try { state = migrate(JSON.parse(raw)); return; } catch (e) {
        lastError = e;
        try { localStorage.setItem(KEY + '.corrompido', raw); } catch (e2) { /* ignora */ }
      }
    }
    state = seed();
    save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); lastError = null; return true; } catch (e) { lastError = e; return false; }
  }

  const notify = () => subs.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });

  function commit(fn) {
    const r = fn(state);
    save();
    notify();
    return r;
  }

  /* ---------------------------------------------------------------- configurações */

  const defaultSettings = { theme: 'auto', repo: '', autoCheck: true, notify: false, lastCheck: 0, lastNotifyDay: '', lastConta: '', lastCategoria: '' };
  function settings() {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch (e) { return { ...defaultSettings }; }
  }
  function setSettings(patch) {
    const s = { ...settings(), ...patch };
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* ignora */ }
    return s;
  }

  /* -------------------------------------------------------------------- consultas */

  const byId = (list, id) => list.find((x) => x.id === id) || null;
  const conta = (id) => byId(state.contas, id);
  const categoria = (id) => byId(state.categorias, id);

  /* ------------------------------------------------------------------ transações */

  /** draft: {tipo, valor (total), data, categoria_id, conta_id, descricao, parcelas} */
  function addTransacao(draft) {
    return commit((d) => {
      const n = Math.max(1, Math.min(60, draft.parcelas | 0 || 1));
      const manual = draft.tipo === 'despesa' && Array.isArray(draft.valores) && draft.valores.length === n ? draft.valores : null;
      const total = manual ? manual.reduce((s, v) => s + v, 0) : draft.valor;
      const novas = C.buildInstallments(draft, total, draft.tipo === 'despesa' ? n : 1, uid, manual);
      d.transacoes.push(...novas);
      return novas;
    });
  }

  /** scope: 'one' (só esta) ou 'group' (todas as parcelas do grupo; a data não é alterada). */
  function updateTransacao(id, patch, scope) {
    return commit((d) => {
      const t = byId(d.transacoes, id);
      if (!t) return;
      if (scope === 'group' && t.grupo_parcela_id) {
        const { data, ...resto } = patch;
        d.transacoes.filter((x) => x.grupo_parcela_id === t.grupo_parcela_id).forEach((x) => Object.assign(x, resto));
      } else Object.assign(t, patch);
    });
  }

  /** Compra parcelada: define o valor TOTAL e reparte entre as parcelas do grupo (centavos que sobram vão para as primeiras).
   *  Os demais campos de `patch` (categoria, conta, descrição, tipo) valem para todas; a data não é alterada. */
  function updateParcelas(id, patch, totalOuValores) {
    return commit((d) => {
      const t = byId(d.transacoes, id);
      if (!t || !t.grupo_parcela_id) return;
      const grupo = d.transacoes.filter((x) => x.grupo_parcela_id === t.grupo_parcela_id).sort((a, b) => a.parcela_atual - b.parcela_atual);
      // número = total (repartido igualmente); lista = valor de cada parcela, informado à mão (juros)
      const valores = Array.isArray(totalOuValores) ? totalOuValores : C.splitInstallments(totalOuValores, grupo.length);
      if (valores.length !== grupo.length || !valores.every((v) => Number.isInteger(v) && v > 0)) return;
      const { data, valor, ...resto } = patch;
      grupo.forEach((x, i) => Object.assign(x, resto, { valor: valores[i] }));
    });
  }

  function removeTransacao(id, scope) {
    return commit((d) => {
      const t = byId(d.transacoes, id);
      if (!t) return 0;
      const antes = d.transacoes.length;
      if (scope === 'group' && t.grupo_parcela_id) d.transacoes = d.transacoes.filter((x) => x.grupo_parcela_id !== t.grupo_parcela_id);
      else d.transacoes = d.transacoes.filter((x) => x.id !== id);
      return antes - d.transacoes.length;
    });
  }

  function importTransacoes(items) {
    return commit((d) => {
      const have = new Set(d.transacoes.map((t) => t.hash_importacao).filter(Boolean));
      let n = 0;
      for (const i of items) {
        if (i.status !== 'nova' || have.has(i.hash_importacao)) continue; // defesa extra contra duplicata
        have.add(i.hash_importacao);
        d.transacoes.push({
          id: uid(), tipo: i.tipo, valor: i.valor, data: i.data, categoria_id: i.categoria_id, conta_id: i.conta_id,
          descricao: i.descricao || '', parcela_atual: null, total_parcelas: null, grupo_parcela_id: null,
          conta_fixa_id: null, competencia: null, hash_importacao: i.hash_importacao,
        });
        n++;
      }
      return n;
    });
  }

  /* ---------------------------------------------------------------------- contas */

  function upsertConta(c) {
    return commit((d) => {
      if (c.id) { Object.assign(byId(d.contas, c.id), c); return c.id; }
      const nova = { ...c, id: uid() };
      d.contas.push(nova);
      return nova.id;
    });
  }

  /** Marca (ou desmarca) uma fatura de cartão como paga antes do vencimento. `fechamento` = data de fechamento da fatura. */
  function setInvoicePaid(contaId, fechamento, paid) {
    return commit((d) => {
      const c = byId(d.contas, contaId);
      if (!c) return;
      const set = new Set(c.faturas_pagas || []);
      if (paid) set.add(fechamento); else set.delete(fechamento);
      c.faturas_pagas = [...set].sort().slice(-24); // guarda só as mais recentes
    });
  }

  /** Remove uma conta sem apagar lançamentos: eles são movidos para `moveTo`. */
  function removeConta(id, moveTo) {
    return commit((d) => {
      const usados = d.transacoes.filter((t) => t.conta_id === id);
      if (usados.length) {
        if (!moveTo || moveTo === id || !byId(d.contas, moveTo)) throw new Error('Escolha outra conta para receber os lançamentos.');
        usados.forEach((t) => { t.conta_id = moveTo; });
      }
      d.contas = d.contas.filter((c) => c.id !== id);
    });
  }

  /* ------------------------------------------------------------------ categorias */

  function upsertCategoria(c) {
    return commit((d) => {
      if (c.id) { Object.assign(byId(d.categorias, c.id), c); return c.id; }
      const nova = { orcamento_mensal: 0, kind: 'despesa', cor: COLORS[d.categorias.length % COLORS.length], ...c, id: uid() };
      d.categorias.push(nova);
      return nova.id;
    });
  }

  /** Remove uma categoria sem apagar lançamentos nem contas fixas: eles vão para `moveTo`. */
  function removeCategoria(id, moveTo) {
    return commit((d) => {
      const tx = d.transacoes.filter((t) => t.categoria_id === id);
      const fx = d.contas_fixas.filter((f) => f.categoria_id === id);
      if (tx.length || fx.length) {
        if (!moveTo || moveTo === id || !byId(d.categorias, moveTo)) throw new Error('Escolha outra categoria para receber os lançamentos.');
        tx.forEach((t) => { t.categoria_id = moveTo; });
        fx.forEach((f) => { f.categoria_id = moveTo; });
      }
      d.categorias = d.categorias.filter((c) => c.id !== id);
    });
  }

  /* ---------------------------------------------------------------- contas fixas */

  function upsertFixa(f) {
    return commit((d) => {
      if (f.id) { Object.assign(byId(d.contas_fixas, f.id), f); return f.id; }
      const nova = { ativa: true, inicio: C.monthKey(C.todayISO()), ...f, id: uid() };
      d.contas_fixas.push(nova);
      return nova.id;
    });
  }

  /** Remove o cadastro; os lançamentos já pagos permanecem (apenas perdem o vínculo). */
  function removeFixa(id) {
    return commit((d) => {
      d.transacoes.forEach((t) => { if (t.conta_fixa_id === id) { t.conta_fixa_id = null; t.competencia = null; } });
      d.contas_fixas = d.contas_fixas.filter((f) => f.id !== id);
    });
  }

  /** Marca como paga: cria o lançamento vinculado (no máximo um por conta fixa por mês). */
  function payFixa(id, mk, contaId, data) {
    return commit((d) => {
      const f = byId(d.contas_fixas, id);
      if (!f) return null;
      const ja = d.transacoes.find((t) => t.conta_fixa_id === id && (t.competencia || t.data.slice(0, 7)) === mk);
      if (ja) return ja;
      const t = {
        id: uid(), tipo: f.tipo === 'receita' ? 'receita' : 'despesa', valor: f.valor, data, categoria_id: f.categoria_id, conta_id: contaId, descricao: f.nome,
        parcela_atual: null, total_parcelas: null, grupo_parcela_id: null, conta_fixa_id: id, competencia: mk, hash_importacao: null,
      };
      d.transacoes.push(t);
      return t;
    });
  }

  /**
   * Lança sozinhas as receitas recorrentes marcadas como automáticas (ex.: salário) do mês atual cujo dia já chegou.
   * Seguro para chamar várias vezes: o lançamento fica vinculado (conta_fixa_id + competência), então não duplica.
   */
  function runRecurring(today) {
    if (!C.dueRecurring(state.contas_fixas, state.transacoes, today).length) return 0; // nada a lançar: não grava nem sincroniza à toa
    return commit((d) => {
      let n = 0;
      for (const o of C.dueRecurring(d.contas_fixas, d.transacoes, today)) {
        const conta = byId(d.contas, o.cf.conta_id) || d.contas.find((c) => c.tipo !== 'credito') || d.contas[0];
        if (!conta) continue;
        d.transacoes.push({
          id: uid(), tipo: 'receita', valor: o.cf.valor, data: o.due, categoria_id: o.cf.categoria_id, conta_id: conta.id, descricao: o.cf.nome,
          parcela_atual: null, total_parcelas: null, grupo_parcela_id: null, conta_fixa_id: o.cf.id, competencia: monthOf(today), hash_importacao: null,
        });
        n++;
      }
      return n;
    });
  }
  const monthOf = (iso) => iso.slice(0, 7);

  function unpayFixa(id, mk) {
    return commit((d) => {
      const f = byId(d.contas_fixas, id);
      // receita automática desfeita pelo usuário: não relança sozinha neste mês (dá para marcar "Recebi" de novo)
      if (f && f.tipo === 'receita' && f.auto) f.puladas = [...new Set([...(f.puladas || []), mk])].sort().slice(-12);
      d.transacoes = d.transacoes.filter((t) => !(t.conta_fixa_id === id && (t.competencia || t.data.slice(0, 7)) === mk));
    });
  }

  /* ------------------------------------------------------- backup, reset, exemplo */

  const snapshot = () => JSON.stringify(state);
  function restore(json) {
    const d = migrate(JSON.parse(json));
    return commit(() => { state = d; });
  }
  function reset() { return commit(() => { state = seed(); }); }

  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.transacoes) || !Array.isArray(obj.categorias) || !Array.isArray(obj.contas)) {
      throw new Error('Arquivo de backup inválido.');
    }
  }

  function loadDemo() {
    const hoje = C.todayISO();
    const mk = C.monthKey(hoje);
    const prev = C.shiftMonthKey(mk, -1);
    const dHoje = C.parseISO(hoje).d;
    const base = seed();
    const cat = (n) => base.categorias.find((c) => c.nome === n).id;
    const conta = (n) => base.contas.find((c) => c.nome === n).id;
    const orc = { Alimentação: 90000, Transporte: 35000, Moradia: 180000, Lazer: 12000, Saúde: 30000, Outros: 150000 };
    base.categorias.forEach((c) => { if (orc[c.nome]) c.orcamento_mensal = orc[c.nome]; });
    const cc = base.contas.find((c) => c.tipo === 'credito');
    cc.limite = 600000;
    const pix = conta('Pix'), din = conta('Dinheiro');
    const day = (m, d) => (m === mk ? Math.min(d, dHoje) : d);
    const iso = (m, d) => m + '-' + String(day(m, d)).padStart(2, '0');
    const t = [];
    const add = (m, d, tipo, valor, categoria, contaId, descricao) => t.push({
      id: uid(), tipo, valor, data: iso(m, d), categoria_id: cat(categoria), conta_id: contaId, descricao,
      parcela_atual: null, total_parcelas: null, grupo_parcela_id: null, conta_fixa_id: null, competencia: null, hash_importacao: null,
    });
    for (const m of [prev, mk]) {
      add(m, 2, 'despesa', 18790, 'Alimentação', pix, 'Supermercado');
      add(m, 9, 'despesa', 6450, 'Alimentação', cc.id, 'Restaurante');
      add(m, 14, 'despesa', 23490, 'Alimentação', pix, 'Supermercado');
      add(m, 3, 'despesa', 4500, 'Transporte', pix, 'Combustível');
      add(m, 12, 'despesa', 3200, 'Transporte', din, 'Aplicativo de corrida');
      add(m, 7, 'despesa', 8990, 'Lazer', cc.id, 'Cinema e jantar');
      add(m, 11, 'despesa', 12000, 'Saúde', pix, 'Farmácia');
      add(m, 16, 'despesa', 4890, 'Outros', din, 'Presente');
    }
    const fixas = [
      { id: uid(), nome: 'Aluguel', valor: 150000, dia_vencimento: 10, categoria_id: cat('Moradia'), ativa: true, inicio: prev },
      { id: uid(), nome: 'Internet', valor: 11990, dia_vencimento: 15, categoria_id: cat('Moradia'), ativa: true, inicio: prev },
      { id: uid(), nome: 'Academia', valor: 9990, dia_vencimento: 20, categoria_id: cat('Saúde'), ativa: true, inicio: prev },
      { id: uid(), nome: 'Streaming', valor: 3990, dia_vencimento: 8, categoria_id: cat('Lazer'), ativa: true, inicio: prev },
      { id: uid(), tipo: 'receita', auto: true, conta_id: pix, nome: 'Salário', valor: 550000, dia_vencimento: 5, categoria_id: cat('Salário'), ativa: true, inicio: prev },
    ];
    // contas fixas pagas: o mês anterior inteiro e o aluguel/streaming no mês atual
    const pague = (f, m) => t.push({
      id: uid(), tipo: f.tipo === 'receita' ? 'receita' : 'despesa', valor: f.valor, data: iso(m, f.dia_vencimento), categoria_id: f.categoria_id, conta_id: pix, descricao: f.nome,
      parcela_atual: null, total_parcelas: null, grupo_parcela_id: null, conta_fixa_id: f.id, competencia: m, hash_importacao: null,
    });
    fixas.forEach((f) => pague(f, prev));
    [fixas[0], fixas[3], fixas[4]].forEach((f) => { if (f.dia_vencimento <= dHoje) pague(f, mk); });
    // compra parcelada no cartão: 3x a partir do mês anterior
    t.push(...C.buildInstallments({ tipo: 'despesa', data: iso(prev, 20), categoria_id: cat('Outros'), conta_id: cc.id, descricao: 'Notebook' }, 360000, 3, uid));
    base.transacoes = t;
    base.contas_fixas = fixas;
    return commit(() => { state = base; });
  }

  load();
  /* ---------------------------------------- dados locais x dados da conta */
  /** Mostra os dados da conta (cache local por uid). Os dados locais do computador ficam intactos, em outra chave. */
  function useAccount(uid) {
    try { localStorage.setItem(SESSION, uid); } catch (e) { /* ignora */ }
    KEY = ACCOUNT_PREFIX + uid;
    load(); notify();
  }
  /** Volta a mostrar só os dados locais do computador e apaga o cache das contas deste navegador. */
  function useLocal() {
    try {
      localStorage.removeItem(SESSION);
      Object.keys(localStorage).filter((k) => k.startsWith(ACCOUNT_PREFIX) || k.startsWith(META_PREFIX)).forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignora */ }
    KEY = LOCAL_KEY;
    load(); notify();
  }
  const mode = () => (KEY === LOCAL_KEY ? 'local' : 'account');
  function peekLocal() {
    try { const raw = localStorage.getItem(LOCAL_KEY); return raw ? normalize(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function cloudMeta(uid) { try { return { at: 0, dirty: false, ...JSON.parse(localStorage.getItem(META_PREFIX + uid) || '{}') }; } catch (e) { return { at: 0, dirty: false }; } }
  function setCloudMeta(uid, patch) { const m = { ...cloudMeta(uid), ...patch }; try { localStorage.setItem(META_PREFIX + uid, JSON.stringify(m)); } catch (e) { /* ignora */ } return m; }

  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); notify(); } });

  root.BussolaStore = {
    COLORS, SCHEMA, uid,
    data: () => state,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    error: () => lastError,
    settings, setSettings, conta, categoria,
    addTransacao, updateTransacao, updateParcelas, removeTransacao, importTransacoes,
    upsertConta, removeConta, setInvoicePaid, upsertCategoria, removeCategoria,
    upsertFixa, removeFixa, payFixa, unpayFixa, runRecurring,
    snapshot, restore, reset, validateBackup, loadDemo,
    useAccount, useLocal, mode, peekLocal, cloudMeta, setCloudMeta,
  };
})(window);
