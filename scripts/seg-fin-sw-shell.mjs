// SEG-FIN-2b: lê o Service Worker publicado e verifica a afirmação do plano de record
// «o Service Worker guarda o shell em cache» — é o risco declarado da rota de nonce.
// Somente-leitura. A URL é derivada de um diário de publicação, nunca dactilografada.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const REPO = path.resolve(import.meta.dirname, '..');
const DIARIOS = ['audit-publicacao-v118.json', 'audit-publicacao-v117.json'];
let fonte = null;
for (const d of DIARIOS) {
  const p = path.join(REPO, d);
  if (fs.existsSync(p)) { fonte = p; break; }
}
if (!fonte) { console.log('INSTRUMENTO CEGO: nenhum diário de publicação encontrado'); process.exit(1); }
const m = fs.readFileSync(fonte, 'utf8').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/);
if (!m) { console.log(`INSTRUMENTO CEGO: nenhum workers.dev no diário ${path.basename(fonte)}`); process.exit(1); }
const BASE = m[0];
console.log(`alvo derivado de ${path.basename(fonte)}: ${BASE}\n`);

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

const rotaSW = (await fs.promises.readFile(path.join(REPO, 'app/index.html'), 'utf8')
  .then((t) => [...t.matchAll(/navigator\.serviceWorker\.register\(\s*[`'"]([^`'"]+)/g)].map((x) => x[1])))[0];
console.log(`rota de registo no shell: ${rotaSW ?? 'nenhuma'}`);

const rotas = [...new Set(['/sw.js', '/sw-v4.js?v=45', rotaSW].filter(Boolean).map((r) => r.replace(/^\$\{[^}]*\}/, '')))];
const saida = { medidoEm: new Date().toISOString(), base: BASE, rotas: {} };

for (const rota of rotas) {
  const url = BASE + (rota.startsWith('http') ? rota.replace(/^[^/]*\/\/[^/]+/, '') : rota);
  const r = await fetch(url);
  const txt = await r.text();
  const cachesOpen = [...new Set([...txt.matchAll(/caches\.open\(\s*[`'"]([^`'"]+)/g)].map((x) => x[1]))];
  const addAllBlocos = [...txt.matchAll(/\.addAll\(\s*\[([\s\S]*?)\]/g)].map((x) => x[1]);
  const addAllItens = addAllBlocos.flatMap((b) => [...b.matchAll(/[`'"]([^`'"]+)[`'"]/g)].map((x) => x[1]));
  const extStrings = [...txt.matchAll(/[`'"]((?:\.\/|\/)?[\w./?=&-]*\.(?:js|css|html|png|svg|ico|json|webmanifest))[`'"]/g)].map((x) => x[1]);
  const URLs = [...new Set([...addAllItens, ...extStrings])];
  const temShell = URLs.some((u) => /index\.html|^\/?$|app\/index/i.test(u));
  const handlers = {
    install: /addEventListener\(\s*['"]install/.test(txt),
    activate: /addEventListener\(\s*['"]activate/.test(txt),
    fetch: /addEventListener\(\s*['"]fetch/.test(txt),
  };
  const modoFetch = /request\.mode\s*===\s*['"]navigate['"]|navigation/i.test(txt);
  saida.rotas[rota] = {
    url, status: r.status, bytes: txt.length, md5: md5(txt).slice(0, 12),
    cachesOpen, caminhosAddAll: URLs, temShellNoPrecache: temShell, handlers,
    trataNavegacao: modoFetch,
    headerCSP: r.headers.get('content-security-policy'),
    headerCacheControl: r.headers.get('cache-control'),
  };
  console.log(`\n=== ${rota} ===`);
  console.log(`   HTTP ${r.status} | ${txt.length} B | md5=${md5(txt).slice(0, 12)} | cache-control=${r.headers.get('cache-control') ?? 'AUSENTE'} | header CSP=${r.headers.get('content-security-policy') ?? 'AUSENTE'}`);
  console.log(`   caches.open: ${cachesOpen.join(', ') || 'nenhum'}`);
  console.log(`   caminhos em addAll/strings: ${URLs.length}`);
  for (const u of URLs.slice(0, 20)) console.log(`      ${u}`);
  console.log(`   shell (index/raiz) no precache? ${temShell ? 'SIM' : 'NAO'}`);
  console.log(`   handlers: install=${handlers.install} activate=${handlers.activate} fetch=${handlers.fetch} | trata navegacao=${modoFetch}`);
}

fs.mkdirSync(path.join(REPO, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'evidence/seg-fin-sw-shell.json'), JSON.stringify(saida, null, 2));
console.log('\ndiário: evidence/seg-fin-sw-shell.json');
