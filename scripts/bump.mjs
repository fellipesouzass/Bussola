// Uso: npm run bump -- 1.1.0 "Novidade 1" "Novidade 2"
// Atualiza js/version.js, version.json e package.json de uma vez.
import { readFileSync, writeFileSync } from 'node:fs';

const [version, ...notes] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Uso: npm run bump -- X.Y.Z "o que mudou" ["outra novidade"]');
  process.exit(1);
}
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

writeFileSync('js/version.js',
  "/* Versão instalada. Atualizada por `npm run bump -- X.Y.Z` (junto de version.json e package.json). */\n" +
  "window.BUSSOLA_VERSION = '" + version + "';\n");
writeFileSync('version.json', JSON.stringify({ version, date: hoje, notes: notes.length ? notes : ['Melhorias e correções.'] }, null, 2) + '\n');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.version = version;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log('Versão ' + version + ' pronta. Agora:\n  git add -A && git commit -m "v' + version + '" && git tag v' + version + ' && git push --follow-tags');
