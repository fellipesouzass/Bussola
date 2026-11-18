'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const factory = require('../js/cloud.js');

global.window = global.window || { addEventListener() {} };

const blank = () => ({ schema: 1, contas: [], categorias: [{ id: 'c', orcamento_mensal: 0 }], transacoes: [], contas_fixas: [] });
const withTx = (...ids) => { const d = blank(); d.transacoes.push(...ids.map((id) => ({ id }))); return d; };

/** Firestore + Auth falsos, compartilhados entre "aparelhos". */
function fakeCloud() {
  const docs = {}, watchers = {};
  const mk = () => {
    let authCb, current = null;
    const fb = {
      initializeApp() {},
      auth: Object.assign(() => ({ onAuthStateChanged: (cb) => { authCb = cb; }, signOut: async () => { current = null; authCb(null); } }), { GoogleAuthProvider: function () {} }),
      firestore: () => ({
        doc: (p) => ({
          get: async () => ({ exists: p in docs, data: () => docs[p] }),
          set: async (d) => { docs[p] = d; (watchers[p] || []).forEach((w) => w.cb({ exists: true, metadata: { hasPendingWrites: w.owner === fb }, data: () => d })); },
          onSnapshot(cb) { const w = { cb, owner: fb }; (watchers[p] = watchers[p] || []).push(w); return () => { watchers[p] = watchers[p].filter((x) => x !== w); }; },
        }),
      }),
    };
    return { fb, login: (uid) => { current = { uid }; authCb(current); } };
  };
  return { mk, docs };
}

/** Store falso com dois espaços: 'local' e um por conta. */
function fakeStore(localData) {
  const spaces = { local: localData };
  let ns = 'local';
  const metas = {};
  const subs = new Set();
  const fire = () => subs.forEach((f) => f());
  return {
    SCHEMA: 1,
    data: () => spaces[ns], snapshot: () => JSON.stringify(spaces[ns]),
    restore(json) { spaces[ns] = JSON.parse(json); fire(); },
    subscribe: (f) => subs.add(f),
    useAccount(uid) { ns = uid; spaces[ns] = spaces[ns] || blank(); fire(); },
    useLocal() { ns = 'local'; Object.keys(spaces).filter((k) => k !== 'local').forEach((k) => delete spaces[k]); Object.keys(metas).forEach((k) => delete metas[k]); fire(); },
    mode: () => (ns === 'local' ? 'local' : 'account'),
    peekLocal: () => spaces.local,
    cloudMeta: (uid) => ({ at: 0, dirty: false, ...(metas[uid] || {}) }),
    setCloudMeta(uid, p) { metas[uid] = { ...(metas[uid] || {}), ...p }; },
    edit(fn) { fn(spaces[ns]); fire(); },
    spaces,
  };
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 25));
const device = (cloud, localData, handlers) => {
  const { fb, login } = cloud.mk();
  const S = fakeStore(localData);
  const c = factory({ firebase: fb, S, debounce: 5 });
  c.setHandlers({ importLocal: async () => 'skip', ...handlers });
  c.init();
  return { c, S, login, logout: () => c.signOut() };
};
const remoteTx = (cloud, uid) => JSON.parse(cloud.docs['usuarios/' + uid].data).transacoes.length;

test('logado, o site mostra só os dados da conta; deslogado, só os locais', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, withTx('local1'));
  A.login('u1'); await tick();
  assert.equal(A.S.mode(), 'account');
  assert.equal(A.S.data().transacoes.length, 0); // dados locais não vazam para a conta
  A.S.edit((d) => d.transacoes.push({ id: 'conta1' })); await tick(40);
  assert.equal(remoteTx(cloud, 'u1'), 1);
  await A.logout(); await tick();
  assert.equal(A.S.mode(), 'local');
  assert.deepEqual(A.S.data().transacoes.map((t) => t.id), ['local1']); // só o que era do computador
  assert.equal(A.S.spaces.u1, undefined); // cache da conta apagado
});

test('lançamentos feitos logado ficam na conta e nunca nos dados locais', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, blank());
  A.login('u1'); await tick();
  A.S.edit((d) => d.transacoes.push({ id: 'a' }, { id: 'b' })); await tick(40);
  assert.equal(remoteTx(cloud, 'u1'), 2);
  assert.equal(A.S.spaces.local.transacoes.length, 0);
});

test('deslogado, nada é enviado à nuvem', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, blank());
  A.S.edit((d) => d.transacoes.push({ id: 'x' })); await tick(40);
  assert.deepEqual(Object.keys(cloud.docs), []);
});

test('conta nova: oferece copiar os dados locais e, se aceito, copia sem apagar os locais', async () => {
  const cloud = fakeCloud();
  let perguntou = 0;
  const A = device(cloud, withTx('l1', 'l2'), { importLocal: async () => { perguntou++; return 'copy'; } });
  A.login('u1'); await tick();
  assert.equal(perguntou, 1);
  assert.equal(remoteTx(cloud, 'u1'), 2);
  assert.equal(A.S.data().transacoes.length, 2);
  await A.logout(); await tick();
  assert.equal(A.S.data().transacoes.length, 2); // o computador continua com os seus dados
});

test('conta nova: recusando a cópia, a conta começa vazia', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, withTx('l1'), { importLocal: async () => 'skip' });
  A.login('u1'); await tick();
  assert.equal(remoteTx(cloud, 'u1'), 0);
  assert.equal(A.S.spaces.local.transacoes.length, 1);
});

test('outro aparelho entra na mesma conta e baixa os dados; mudanças chegam em tempo real', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, blank()), B = device(cloud, withTx('local-do-B'));
  A.login('u1'); await tick();
  A.S.edit((d) => d.transacoes.push({ id: 'n1' })); await tick(40);
  B.login('u1'); await tick(40);
  assert.deepEqual(B.S.data().transacoes.map((t) => t.id), ['n1']); // sem misturar com os dados locais do B
  A.S.edit((d) => d.transacoes.push({ id: 'n2' })); await tick(40);
  assert.equal(B.S.data().transacoes.length, 2);
});

test('alterações offline + outro aparelho gravou: pergunta qual manter', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, blank());
  A.login('u1'); await tick();
  A.S.edit((d) => d.transacoes.push({ id: 'a1' })); await tick(40);
  // simula: este aparelho tem pendência local e a nuvem foi alterada por outro
  A.S.setCloudMeta('u1', { dirty: true });
  cloud.docs['usuarios/u1'] = { data: JSON.stringify(withTx('outro1', 'outro2')), updatedAt: Date.now() + 5000 };
  let perguntou = 0;
  A.c.setHandlers({ conflict: async () => { perguntou++; return 'remote'; } });
  await A.c.syncNow(); await tick();
  assert.equal(perguntou, 1);
  assert.equal(A.S.data().transacoes.length, 2);
});
