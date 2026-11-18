/*
 * Bússola — atualizações via GitHub.
 *
 * Como funciona:
 *  1. Você informa o repositório (usuario/repositorio) em Ajustes › Atualizações.
 *  2. O app consulta a última Release do GitHub (ou, se não houver Release, o version.json da branch padrão)
 *     e compara com a versão instalada (js/version.js).
 *  3. Se houver versão nova, "Atualizar agora" limpa o cache do app, baixa os arquivos novos do site publicado
 *     (ex.: GitHub Pages) e recarrega. Os dados ficam no navegador e não são tocados.
 *  Abrindo o index.html direto do disco (file://) não dá para trocar os arquivos sozinho: o app mostra o link da
 *  Release e o comando `git pull`.
 */
(function (root) {
  'use strict';
  const C = root.BussolaCore;
  const current = root.BUSSOLA_VERSION || '0.0.0';
  const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  const PENDING = 'bussola.pendingUpdate';

  async function getJSON(url, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 9000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  /** Consulta o GitHub. Retorna { status: 'available'|'latest'|'norepo'|'offline'|'error', ... } */
  async function check(repo) {
    repo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/$/, '');
    if (!REPO_RE.test(repo)) return { status: 'norepo' };
    if (navigator.onLine === false) return { status: 'offline', current };
    let info = null, erro = null;
    try {
      const rel = await getJSON('https://api.github.com/repos/' + repo + '/releases/latest');
      info = { version: rel.tag_name, notes: rel.body || '', url: rel.html_url, date: rel.published_at, zip: rel.zipball_url, via: 'release' };
    } catch (e) {
      erro = e;
      try {
        const v = await getJSON('https://raw.githubusercontent.com/' + repo + '/HEAD/version.json');
        info = {
          version: v.version, date: v.date, via: 'version.json',
          notes: Array.isArray(v.notes) ? v.notes.map((n) => '- ' + n).join('\n') : String(v.notes || ''),
          url: 'https://github.com/' + repo, zip: 'https://github.com/' + repo + '/archive/refs/heads/HEAD.zip',
        };
        erro = null;
      } catch (e2) { erro = e2; }
    }
    if (!info || !info.version) {
      return { status: 'error', current, message: erro && erro.status === 404 ? 'Repositório não encontrado (ele precisa ser público).' : 'Não foi possível consultar o GitHub agora.' };
    }
    const cmp = C.compareVersions(info.version, current);
    return { status: cmp > 0 ? 'available' : 'latest', current, latest: String(info.version).replace(/^v/i, ''), ...info };
  }

  /** Baixa de novo os arquivos do app (ignorando caches) e recarrega. */
  async function apply(latest) {
    if (location.protocol === 'file:') return { manual: true };
    try { localStorage.setItem(PENDING, latest || ''); } catch (e) { /* ignora */ }
    try {
      if (navigator.serviceWorker) (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
      if (root.caches) (await caches.keys()).forEach((k) => caches.delete(k));
    } catch (e) { /* segue */ }
    try {
      const html = await (await fetch(location.pathname, { cache: 'reload' })).text();
      const urls = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css|json|webmanifest|png|svg))(?:\?[^"]*)?"/g)].map((m) => m[1]);
      await Promise.all([...new Set(urls)].map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
      await fetch('version.json', { cache: 'reload' }).catch(() => null);
    } catch (e) { /* segue: o reload ainda tenta */ }
    location.reload();
    return { manual: false };
  }

  /** Após recarregar: diz se a atualização pedida realmente entrou. */
  function takePending() {
    let p = '';
    try { p = localStorage.getItem(PENDING) || ''; localStorage.removeItem(PENDING); } catch (e) { return null; }
    if (!p) return null;
    return { wanted: p, ok: C.compareVersions(current, p) >= 0 };
  }

  root.BussolaUpdater = { current, check, apply, takePending, REPO_RE };
})(window);
