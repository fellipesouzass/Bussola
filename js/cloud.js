/*
 * Bússola — login com Google + sincronização (Firebase Auth + Firestore).
 *
 * Os dados continuam no localStorage (funciona offline); logado, uma cópia fica em `usuarios/{uid}`.
 *  - 1º login: se o navegador já tem dados e a nuvem está vazia, eles sobem; se a nuvem tem dados e o navegador
 *    está vazio, eles descem; se os dois têm dados diferentes, o app pergunta qual manter.
 *  - Depois disso: cada alteração sobe sozinha (com 1,2 s de espera) e mudanças feitas em outro aparelho chegam em tempo real.
 * A apiKey abaixo só identifica o projeto; quem protege os dados são as regras do Firestore (uid == dono).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    const off = { available: () => false, init() {}, user: () => null, status: () => 'off', error: () => '', lastSync: () => 0, onChange() {}, setConflictHandler() {}, signIn() {}, signOut() {}, syncNow() {} };
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
  let applying = false, ready = false, pushingAt = 0, timer = null, conflictHandler = null;
  const listeners = new Set();
  const emit = (evt, extra) => listeners.forEach((f) => { try { f(evt, extra); } catch (e) { console.error(e); } });
  const setStatus = (s, msg) => { status = s; errMsg = msg || ''; emit('status'); };

  const hasData = (d) => !!(d.transacoes.length || d.contas_fixas.length || d.categorias.some((c) => c.orcamento_mensal > 0));
  const cfg = () => S.settings();

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
      S.setSettings({ cloudAt: at, cloudDirty: false, cloudUid: user.uid });
      lastSync = Date.now();
      setStatus('synced');
    } catch (e) {
      setStatus(navigator.onLine === false || (e && e.code === 'unavailable') ? 'offline' : 'error', readable(e));
    }
  }

  function pull(remote) {
    applying = true;
    try { S.restore(remote.data); } finally { applying = false; }
    S.setSettings({ cloudAt: remote.updatedAt, cloudDirty: false, cloudUid: user.uid });
    lastSync = Date.now();
    setStatus('synced');
    emit('pulled');
  }

  async function reconcile() {
    ready = false;
    setStatus('syncing');
    try {
      const snap = await ref.get();
      const s = cfg();
      const remote = snap.exists ? snap.data() : null;
      if (!remote) await push();
      else if (remote.updatedAt === s.cloudAt) { if (s.cloudDirty) await push(); else { lastSync = Date.now(); setStatus('synced'); } }
      else if (!s.cloudDirty || !hasData(S.data())) pull(remote);
      else {
        const choice = conflictHandler ? await conflictHandler({ remoteAt: remote.updatedAt }) : 'remote';
        if (choice === 'local') await push();
        else if (choice === 'remote') pull(remote);
        else { setStatus('idle'); return; } // fechou o diálogo: nada muda; tenta de novo no próximo login/sincronizar
      }
      ready = true;
      listen();
    } catch (e) { setStatus(navigator.onLine === false ? 'offline' : 'error', readable(e)); }
  }

  function listen() {
    if (unsub) unsub();
    unsub = ref.onSnapshot((snap) => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return;
      const remote = snap.data(), s = cfg();
      if (remote.updatedAt === s.cloudAt || remote.updatedAt === pushingAt) return;
      if (s.cloudDirty) return; // alteração local pendente: a próxima gravação prevalece
      pull(remote);
    }, (e) => setStatus('error', readable(e)));
  }

  function onLocalChange() {
    if (applying || !user) return;
    S.setSettings({ cloudDirty: true });
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE);
  }

  function onUser(u) {
    user = u;
    if (unsub) { unsub(); unsub = null; }
    clearTimeout(timer);
    ready = false;
    if (!u) { ref = null; lastSync = 0; setStatus('off'); emit('user'); return; }
    ref = db.doc('usuarios/' + u.uid);
    const s = cfg();
    if (s.cloudUid !== u.uid) S.setSettings({ cloudUid: u.uid, cloudAt: 0, cloudDirty: hasData(S.data()) }); // 1º login (ou outra conta) neste navegador
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
    window.addEventListener('online', () => { if (user && cfg().cloudDirty) { ready ? push() : reconcile(); } });
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

  /** wipe: também apaga os dados deste navegador (útil em computador compartilhado). */
  async function signOut(wipe) {
    clearTimeout(timer);
    if (user && ready && cfg().cloudDirty) await push(); // não perde a última alteração
    await auth.signOut();
    if (wipe) {
      applying = true;
      try { S.reset(); } finally { applying = false; }
      S.setSettings({ cloudAt: 0, cloudDirty: false, cloudUid: '' });
    }
  }

  return {
    available: () => true, init, signIn, signOut, syncNow: () => (user ? reconcile() : null),
    user: () => user, status: () => status, error: () => errMsg, lastSync: () => lastSync,
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    setConflictHandler: (fn) => { conflictHandler = fn; },
  };
});
