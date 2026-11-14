import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${dir}/worker-deploy-v118-csp`;
const OUT = `${dir}/worker-deploy-v119`;
const candPath = `${dir}/bfr-candidata-v119-supervisao-embed/index.html`;
const LIVE_MD5 = 'ae59d35346b685b2fbf9d18ade4fa5cd';
const LIVE_SW_MD5 = '3fcbc3ad52f1a0491362506466c82596';
const ORIGIN = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');

const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} :: ${detail}`); };

function unquote(src, i) {
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') break;
    if (c === '\\') {
      const n = src[i + 1];
      out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
      i += 2; continue;
    }
    out += c; i++;
  }
  return { body: out, closing: src.indexOf(';', i) };
}
const grab = (src, marker) => {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  return unquote(src, src.indexOf('"', k + marker.length) + 1);
};

const baseW = fs.readFileSync(`${BASE}/worker.mjs`, 'utf8');
const newW = fs.readFileSync(`${OUT}/worker.mjs`, 'utf8');
const cand = fs.readFileSync(candPath, 'utf8');

// 1. tamano do worker
const delta = Buffer.byteLength(newW) - Buffer.byteLength(baseW);
gate('worker_delta_7', delta === 7, `worker ${Buffer.byteLength(baseW)} -> ${Buffer.byteLength(newW)} B (+${delta})`);
gate('worker_md5', true, `base ${md5(baseW)} | v119 ${md5(newW)}`);

// 2. o HTML embutido e a candidata, byte a byte
const newHtml = grab(newW, 'const HTML = ');
gate('html_equal_candidata', newHtml.body === cand,
  `HTML embutido ${Buffer.byteLength(newHtml.body)} B md5 ${md5(newHtml.body)} == candidata md5 ${md5(cand)}`);
gate('html_tokens', (newHtml.body.match(/sports_schools\(name\)/g) || []).length === 1
  && (newHtml.body.match(/school_id,schools\(name\)/g) || []).length === 0,
  `sports_schools(name)=${(newHtml.body.match(/sports_schools\(name\)/g) || []).length}, velho=${(newHtml.body.match(/school_id,schools\(name\)/g) || []).length}`);

// 3. o SW so mudou na etiqueta de cache
const baseSW = grab(baseW, 'const SW = ');
const newSW = grab(newW, 'const SW = ');
const swReverted = newSW.body.replaceAll('bfr-conecta-v119', 'bfr-conecta-v118');
gate('sw_so_mudou_etiqueta', swReverted === baseSW.body,
  `SW ${Buffer.byteLength(baseSW.body)} B md5 ${md5(baseSW.body)} -> ${Buffer.byteLength(newSW.body)} B md5 ${md5(newSW.body)} (mesmo tamanho, so a etiqueta)`);
gate('cache_label_v119', /const CACHE = 'bfr-conecta-v119';/.test(newSW.body) && !/bfr-conecta-v118/.test(newSW.body),
  `CACHE='bfr-conecta-v119' presente; resquicio v118 = ${newSW.body.split('bfr-conecta-v118').length - 1}`);

// 4. rotas e CSP intocados (tudo depois da ultima constante)
const lastBase = Math.max(...['const HTML = ', 'const SW = ', 'const CSP = '].map(m => (grab(baseW, m) || { closing: -1 }).closing));
const lastNew = Math.max(...['const HTML = ', 'const SW = ', 'const CSP = '].map(m => (grab(newW, m) || { closing: -1 }).closing));
const tailBase = baseW.slice(lastBase + 1);
const tailNew = newW.slice(lastNew + 1);
gate('rotas_identicas', tailBase === tailNew, `cauda de rotas ${tailNew.length} chars byte a byte`);
const cspBase = grab(baseW, 'const CSP = ');
const cspNew = grab(newW, 'const CSP = ');
gate('csp_const_identica', cspBase && cspNew && cspBase.body === cspNew.body, `CSP ${cspNew.body.length} chars inalterada`);
gate('csp_header_na_resposta', /'content-security-policy': CSP,/.test(newW),
  `emissao do header presente (${(newW.match(/'content-security-policy': CSP/g) || []).length}x)`);

// 5. assets e wrangler
const list = d => fs.readdirSync(`${d}/public`).sort();
const lb = list(BASE), ln = list(OUT);
const mism = lb.filter(f => md5(fs.readFileSync(`${BASE}/public/${f}`)) !== md5(fs.readFileSync(`${OUT}/public/${f}`)));
gate('assets_12_identicos', lb.length === 12 && ln.length === 12 && lb.join() === ln.join() && mism.length === 0,
  `${ln.length} arquivos, divergentes = ${mism.length ? mism.join(',') : '0'}`);
gate('wrangler_identico', fs.readFileSync(`${BASE}/wrangler.toml`, 'utf8') === fs.readFileSync(`${OUT}/wrangler.toml`, 'utf8'),
  'wrangler.toml copiado sem edicao');

// 6. armadilha documentada: o ?v= do PRECACHE tem de bater com o que a HTML pede
//    (o SW precachea com caminho absoluto /x.js?v=N; a HTML referencia sem a barra inicial)
const precache = (newSW.body.match(/const PRECACHE_PATHS = \[([^\]]*)\]/) || ['', ''])[1]
  .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.includes('?v='));
const misv = precache.filter(p => !cand.includes(p.replace(/^\//, '')));
gate('precache_query_alinhada', precache.length > 0 && misv.length === 0,
  `${precache.length} entradas com ?v=: ${precache.join(' , ')} | desalinhadas = ${misv.length}`);

// 7. preflight fresco: o ar ainda e a base, ou seja, nada foi publicado
const rHtml = await fetch(`${ORIGIN}/`, { headers: { 'cache-control': 'no-cache' } });
const bHtml = Buffer.from(await rHtml.arrayBuffer());
gate('ar_ainda_base', md5(bHtml) === LIVE_MD5 && bHtml.length === 3489467,
  `HTTP ${rHtml.status} ${bHtml.length} B md5 ${md5(bHtml)} (candidata nao publicada)`);
const rSw = await fetch(`${ORIGIN}/sw-v4.js`, { headers: { 'cache-control': 'no-cache' } });
const bSw = Buffer.from(await rSw.arrayBuffer());
gate('ar_sw_ainda_v118', md5(bSw) === LIVE_SW_MD5, `SW do ar HTTP ${rSw.status} ${bSw.length} B md5 ${md5(bSw)}`);

const allOk = gates.every(g => g.ok);
const diary = {
  cycle: 'v119-worker-bundle',
  date: '2026-11-13',
  base_bundle: 'worker-deploy-v118-csp (identificado como o worker publicado: SW do ar md5 3fcbc3ad e header CSP)',
  base_worker_md5: md5(baseW),
  worker_md5: md5(newW),
  worker_bytes: Buffer.byteLength(newW),
  html_md5: md5(newHtml.body),
  html_bytes: Buffer.byteLength(newHtml.body),
  sw_md5: md5(newSW.body),
  sw_bytes: Buffer.byteLength(newSW.body),
  cache_label: 'bfr-conecta-v119',
  fix: 'linha 23684 school_id,schools(name) -> school_id,sports_schools(name)',
  gates,
  verdict: allOk ? 'BUNDLE_OK' : 'BUNDLE_FAIL',
  published: false,
};
fs.writeFileSync(`${dir}/bfr-candidata-v119-supervisao-embed/worker-v119-diary.json`, JSON.stringify(diary, null, 2));
console.log(`\nVERDICT: ${diary.verdict} (${gates.filter(g => g.ok).length}/${gates.length})  [sem deploy]`);
process.exit(allOk ? 0 : 1);
