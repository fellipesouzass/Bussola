'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const factory = require('../js/cloud.js');

global.window = global.window || { addEventListener() {} };

const blank = () => ({ schema: 1, contas: [], categorias: [{ id: 'c', orcamento_mensal: 0 }], transacoes: [], contas_fixas: [] });

/** Firestore + Auth falsos, compartilhados entre "aparelhos". */
function fakeCloud() {
  const docs = {}, watchers = {};
  const mk = () => {
    let authCb;
    const fb = {
      initializeApp() {},
      auth: Object.assign(() => ({ onAuthStateChanged: (cb) => { authCb = cb; }, signOut: async () => authCb(null) }), { GoogleAuthProvider: function () {} }),
      firestore: () => ({
        doc: (p) => ({
          get: async () => ({ exists: p in docs, data: () => docs[p] }),
          set: async (d) => { docs[p] = d; (watchers[p] || []).forEach((w) => w.cb({ exists: true, metadata: { hasPendingWrites: w.owner === fb }, data: () => d })); },
          onSnapshot(cb) { const w = { cb, owner: fb }; (watchers[p] = watchers[p] || []).push(w); return () => { watchers[p] = watchers[p].filter((x) => x !== w); }; },
        }),
      }),
    };
    return { fb, login: (uid) => authCb({ uid }) };
  };
  return { mk, docs };
}

function fakeStore(initial) {
  let data = initial, settings = { cloudAt: 0, cloudDirty: false, cloudUid: '' };
  const subs = new Set();
  return {
    SCHEMA: 1,
    data: () => data, snapshot: () => JSON.stringify(data),
    restore(json) { data = JSON.parse(json); subs.forEach((f) => f()); },
    reset() { data = blank(); subs.forEach((f) => f()); },
    subscribe: (f) => subs.add(f),
    settings: () => settings, setSettings: (p) => { settings = { ...settings, ...p }; },
    edit(fn) { fn(data); subs.forEach((f) => f()); },
  };
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 20));
const device = (cloud, data, conflict) => {
  const { fb, login } = cloud.mk();
  const S = fakeStore(data);
  const c = factory({ firebase: fb, S, debounce: 5 });
  if (conflict) c.setConflictHandler(conflict);
  c.init();
  return { c, S, login };
};

test('primeiro login com dados locais e nuvem vazia: sobe tudo', async () => {
  const cloud = fakeCloud();
  const d = blank(); d.transacoes.push({ id: 't1' });
  const A = device(cloud, d);
  A.login('u1'); await tick();
  assert.equal(JSON.parse(cloud.docs['usuarios/u1'].data).transacoes.length, 1);
  assert.equal(A.c.status(), 'synced');
});

test('aparelho novo (vazio) baixa os dados da nuvem', async () => {
  const cloud = fakeCloud();
  const d = blank(); d.transacoes.push({ id: 't1' });
  device(cloud, d).login('u1'); await tick();
  const B = device(cloud, blank());
  B.login('u1'); await tick();
  assert.equal(B.S.data().transacoes.length, 1);
});

test('alteração local sobe sozinha e chega ao outro aparelho em tempo real', async () => {
  const cloud = fakeCloud();
  const A = device(cloud, blank()), B = device(cloud, blank());
  A.login('u1'); await tick(); B.login('u1'); await tick();
  A.S.edit((x) => x.transacoes.push({ id: 'novo' })); await tick(40);
  assert.equal(JSON.parse(cloud.docs['usuarios/u1'].data).transacoes.length, 1);
  assert.equal(B.S.data().transacoes.length, 1);
  assert.equal(B.S.settings().cloudDirty, false); // recebido da nuvem não vira "pendente"
});

test('conflito: os dois lados têm dados → pergunta, e respeita a escolha', async () => {
  const cloud = fakeCloud();
  const remoto = blank(); remoto.transacoes.push({ id: 'r1' }, { id: 'r2' });
  device(cloud, remoto).login('u1'); await tick();
  const local = blank(); local.transacoes.push({ id: 'l1' });
  let perguntou = 0;
  const B = device(cloud, local, async () => { perguntou++; return 'remote'; });
  B.login('u1'); await tick();
  assert.equal(perguntou, 1);
  assert.equal(B.S.data().transacoes.length, 2);

  const local2 = blank(); local2.transacoes.push({ id: 'l1' });
  const C = device(cloud, local2, async () => 'local');
  C.login('u1'); await tick();
  assert.equal(JSON.parse(cloud.docs['usuarios/u1'].data).transacoes.length, 1);
});

test('sair com limpeza apaga os dados do navegador, mas não os da nuvem', async () => {
  const cloud = fakeCloud();
  const d = blank(); d.transacoes.push({ id: 't1' });
  const A = device(cloud, d);
  A.login('u1'); await tick();
  await A.c.signOut(true);
  assert.equal(A.S.data().transacoes.length, 0);
  assert.equal(JSON.parse(cloud.docs['usuarios/u1'].data).transacoes.length, 1);
  assert.equal(A.c.user(), null);
});
