/*
 * Bússola — login com Google + sincronização (Firebase Auth + Firestore).
 *
 * Dois "espaços" de dados, nunca misturados:
 *   · LOCAL  — os dados deste computador (sem login). É o que o site mostra quando não há conta logada.
 *   · CONTA  — os dados do seu login. Logado, o site mostra e grava só aqui (cache local + Firestore `usuarios/{uid}`).
 * Ao sair, o site volta a mostrar apenas os dados locais e apaga o cache da conta deste navegador.
 * No primeiro login com a conta vazia, o app oferece COPIAR os dados locais para a conta (a cópia local continua lá).
 * A apiKey abaixo só identifica o projeto; quem protege os dados são as regras do Firestore (uid == dono).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    const off = { available: () => false, init() {}, user: () => null, status: () => 'off', error: () => '', lastSync: () => 0, onChange() {}, setHandlers() {}, signIn() {}, signOut() {}, syncNow() {} };
    root.BussolaCloud = root.firebase && root.BussolaStore ? factory({ firebase: root.firebase, S: root.BussolaStore, version: root.BUSSOLA_VERSION }) : off;
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';
  const { firebase, S } = deps;
  const CONFIG = {
    apiKey: 'AIzaSyDuzOevyXiXM0R_B-F_JNCRW4GRGGWoDYc',
    authDomain: 'bussola-financas.firebaseapp.com',
    projectId: 'bussola-financas',
    storageBucket: 'bussola-financas.firebasestorage.app',
    messagingSenderId: '275621588530',
    appId: '1:275621588530:web:28d094c5d604208a11562b',
  };
  const DEBOUNCE = deps.debounce == null ? 1200 : deps.debounce;

  let auth, db, ref = null, unsub = null, user = null;
  let status = 'off', errMsg = '', lastSync = 0;
  let applying = false, ready = false, pushingAt = 0, timer = null;
  let handlers = { conflict: null, importLocal: null };
  const listeners = new Set();
  const emit = (evt, extra) => listeners.forEach((f) => { try { f(evt, extra); } catch (e) { console.error(e); } });
  const setStatus = (s, msg) => { status = s; errMsg = msg || ''; emit('status'); };
  const quietly = (fn) => { applying = true; try { return fn(); } finally { applying = false; } };

  const hasData = (d) => !!(d && (d.transacoes.length || d.contas_fixas.length || d.categorias.some((c) => c.orcamento_mensal > 0)));
  const meta = () => S.cloudMeta(user.uid);
  const setMeta = (p) => S.setCloudMeta(user.uid, p);

  function readable(e) {
    const c = (e && e.code) || '';
    if (c === 'auth/unauthorized-domain') return 'Este endereço não está autorizado no Firebase (Authentication › Domínios autorizados).';
    if (c === 'permission-denied' || c === 'firestore/permission-denied') return 'O Firestore recusou o acesso. Confira as regras publicadas.';
    if (c === 'unavailable' || c === 'auth/network-request-failed') return 'Sem conexão com o Firebase agora.';
    return (e && e.message) || 'Falha ao sincronizar.';
  }

  async function push() {
    if (!user || !ref) return;
    clearTimeout(timer);
    setStatus('syncing');
    const at = Date.now();
    pushingAt = at;
    try {
      await ref.set({ data: S.snapshot(), updatedAt: at, schema: S.SCHEMA, app: deps.version || '' });
      setMeta({ at, dirty: false });
      lastSync = Date.now();
      setStatus('synced');
    } catch (e) {
      setStatus(navigator.onLine === false || (e && e.code === 'unavailable') ? 'offline' : 'error', readable(e));
    }
  }

  function pull(remote) {
    quietly(() => S.restore(remote.data));
    setMeta({ at: remote.updatedAt, dirty: false });
    lastSync = Date.now();
    setStatus('synced');
    emit('pulled');
  }

  async function reconcile() {
    ready = false;
    setStatus('syncing');
    try {
      const snap = await ref.get();
      const m = meta();
      const remote = snap.exists ? snap.data() : null;
      if (!remote) {
        // conta nova: oferece copiar os dados deste computador (que seguem intactos no espaço local)
        const local = S.peekLocal();
        if (!m.dirty && hasData(local) && !hasData(S.data()) && handlers.importLocal) {
          const copy = await handlers.importLocal();
          if (copy === 'copy') quietly(() => S.restore(JSON.stringify(local)));
        }
        await push();
      } else if (remote.updatedAt === m.at) {
        if (m.dirty) await push(); else { lastSync = Date.now(); setStatus('synced'); }
      } else if (!m.dirty) pull(remote);
      else {
        // alterações feitas aqui (offline) e outro aparelho também gravou: pergunta
        const choice = handlers.conflict ? await handlers.conflict({ remoteAt: remote.updatedAt }) : 'remote';
        if (choice === 'local') await push();
        else if (choice === 'remote') pull(remote);
        else { setStatus('idle'); return; }
      }
      ready = true;
      listen();
    } catch (e) { setStatus(navigator.onLine === false ? 'offline' : 'error', readable(e)); }
  }

  function listen() {
    if (unsub) unsub();
    unsub = ref.onSnapshot((snap) => {
      if (!snap.exists || snap.metadata.hasPendingWrites || !user) return;
      const remote = snap.data(), m = meta();
      if (remote.updatedAt === m.at || remote.updatedAt === pushingAt) return;
      if (m.dirty) return; // alteração local pendente: a próxima gravação prevalece
      pull(remote);
    }, (e) => setStatus('error', readable(e)));
  }

  function onLocalChange() {
    if (applying || !user) return; // sem conta logada, nada sobe: dados locais ficam só no computador
    setMeta({ dirty: true });
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE);
  }

  function onUser(u) {
    if (unsub) { unsub(); unsub = null; }
    clearTimeout(timer);
    ready = false;
    if (!u) {
      user = null; ref = null; lastSync = 0;
      quietly(() => S.useLocal()); // volta aos dados do computador e limpa o cache da conta
      setStatus('off'); emit('user');
      return;
    }
    user = u;
    ref = db.doc('usuarios/' + u.uid);
    quietly(() => S.useAccount(u.uid)); // a partir daqui o site mostra e grava só os dados da conta
    emit('user');
    reconcile();
  }

  function init() {
    if (auth) return;
    try {
      firebase.initializeApp(CONFIG);
      auth = firebase.auth(); db = firebase.firestore();
    } catch (e) { setStatus('error', readable(e)); return; }
    S.subscribe(onLocalChange);
    window.addEventListener('online', () => { if (user && meta().dirty) { ready ? push() : reconcile(); } });
    setStatus('idle');
    auth.onAuthStateChanged(onUser);
  }

  async function signIn() {
    if (location.protocol === 'file:') return emit('error', 'O login com Google precisa do site publicado (ou de http://localhost). Abra o endereço do GitHub Pages.');
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(provider); } catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      if (e.code === 'auth/popup-blocked') return auth.signInWithRedirect(provider);
      emit('error', readable(e));
    }
  }

  async function signOut() {
    clearTimeout(timer);
    if (user && ready && meta().dirty) await push(); // não perde a última alteração
    await auth.signOut(); // dispara onUser(null): volta aos dados locais
  }

  return {
    available: () => true, init, signIn, signOut, syncNow: () => (user ? reconcile() : null),
    user: () => user, status: () => status, error: () => errMsg, lastSync: () => lastSync,
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    setHandlers: (h) => { handlers = { ...handlers, ...h }; },
  };
});
