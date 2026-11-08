const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = __dirname;
const md5 = b => crypto.createHash('md5').update(b).digest('hex');

// Host derivado do diário, nunca dactilografado (armadilha da grafia).
const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'v118-confirmacao.json'), 'utf8'));
const HOST = new URL(conf.alvo).host;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: HOST, path: urlPath, headers: { 'User-Agent': 'preflight-v118-swclone', 'Cache-Control': 'no-cache' }, timeout: 30000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout ' + urlPath)); });
    req.on('error', reject);
  });
}

(async () => {
  const out = { ciclo: 'V118-CLONE-PREFLIGHT', quando: new Date().toISOString(), host: HOST, gates: [], escrita_no_banco: 'zero' };
  const gate = (name, ok, detail) => { out.gates.push({ name, ok, detail }); if (!ok) out.verdict = 'PORTAO_VERMELHO'; };

  // 1. Estado vivo: SW atualmente no ar == conteúdo do swfix (buggy SW, rota já corrigida)
  const swv4 = await get('/sw-v4.js?v=45');
  const swjs = await get('/sw.js');
  const shell = await get('/');
  const swv4md5 = md5(swv4.body), swjsmd5 = md5(swjs.body), shellmd5 = md5(shell.body);
  out.vivo = {
    sw_v4: { status: swv4.status, bytes: swv4.body.length, md5: swv4md5 },
    sw_js: { status: swjs.status, bytes: swjs.body.length, md5: swjsmd5 },
    shell: { status: shell.status, bytes: shell.body.length, md5: shellmd5 },
  };
  gate('vivo_sw_v4_200', swv4.status === 200, 'status ' + swv4.status);
  gate('vivo_sw_js_200', swjs.status === 200, 'status ' + swjs.status);
  gate('vivo_sw_iguais', swv4md5 === swjsmd5, swv4md5 + ' vs ' + swjsmd5);
  gate('vivo_sw_eh_base_swfix', swv4md5 === '7111e4fc3a4069b3df60bc3cfe76ff92', 'SW vivo == conteúdo publicado pelo swfix (7111e4fc…)');
  gate('vivo_shell_200', shell.status === 200, 'status ' + shell.status);
  gate('vivo_shell_intacto', shellmd5 === 'ae59d35346b685b2fbf9d18ade4fa5cd' && shell.body.length === 3489467, shellmd5 + ' / ' + shell.body.length + ' B');

  // 2. Candidata em disco
  const candPath = path.join(ROOT, 'worker-deploy-v118-swclone', 'worker.mjs');
  const cand = fs.readFileSync(candPath);
  const candmd5 = md5(cand);
  out.candidata = { path: 'worker-deploy-v118-swclone/worker.mjs', bytes: cand.length, md5: candmd5 };
  gate('candidata_md5', candmd5 === '7a2e41f448e5d8c331f1bcc5eb029e9a', candmd5);
  gate('candidata_bytes', cand.length === 3614649, cand.length + ' B');

  // 3. SW embutido na candidata (linha 2) — extrair e conferir
  const lines = cand.toString('utf8').split('\n');
  // linha 2 = const SW = "...";
  const swLine = lines.find(l => l.startsWith('const SW = '));
  const swEscaped = swLine.slice('const SW = "'.length, swLine.lastIndexOf('";'));
  // reverter o escapeForJs
  const sw = swEscaped.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
  const swmd5 = md5(Buffer.from(sw, 'utf8'));
  out.candidata.sw_embutido = { chars: sw.length, md5: swmd5 };
  gate('sw_embutido_md5', swmd5 === '3fcbc3ad52f1a0491362506466c82596', swmd5);
  // A rota vive no handler do módulo worker (linha 9), não no SW embutido.
  const workerSrc = cand.toString('utf8');
  gate('worker_rota_v4_presente', /if \(url\.pathname === '\/sw\.js' \|\| url\.pathname === '\/sw-v4\.js'\)/.test(workerSrc), 'rota sw-v4 no handler do worker');
  // shell branch deve ter clone antes do return; contar cache.put com e sem clone
  const semClone = (sw.match(/await cache\.put\(event\.request, response\);/g) || []).length;
  const comClone = (sw.match(/await cache\.put\(event\.request, response\.clone\(\)\);/g) || []).length;
  out.candidata.sw_cache_put = { sem_clone: semClone, com_clone: comClone };
  gate('sw_shell_sem_clone_zero', semClone === 0, 'sem clone = ' + semClone);
  gate('sw_dois_com_clone', comClone === 2, 'com clone (shell+generico) = ' + comClone);
  gate('sw_cache_v118', /const CACHE = 'bfr-conecta-v118'/.test(sw), 'CACHE v118');

  // 4. wrangler.toml + public/ completos
  const toml = fs.readFileSync(path.join(ROOT, 'worker-deploy-v118-swclone', 'wrangler.toml'), 'utf8');
  gate('toml_name', /name = "bfr-conecta"/.test(toml), 'name bfr-conecta');
  gate('toml_assets', /directory = "\.\/public"/.test(toml), 'assets ./public');
  const pub = fs.readdirSync(path.join(ROOT, 'worker-deploy-v118-swclone', 'public'));
  gate('public_12_ficheiros', pub.length === 12, pub.length + ' ficheiros');

  out.gates_total = out.gates.length;
  out.gates_ok = out.gates.filter(g => g.ok).length;
  if (!out.verdict) out.verdict = out.gates_ok === out.gates_total ? 'PORTAO_VERDE' : 'PORTAO_VERMELHO';
  fs.writeFileSync(path.join(ROOT, 'docs', 'v118-swclone-preflight.json'), JSON.stringify(out, null, 2));
  console.log('HOST', HOST);
  console.log('vivo SW', swv4md5, 'shell', shellmd5, shell.body.length);
  console.log('candidata', candmd5, cand.length, 'SW embutido', swmd5);
  console.log('cache.put sem_clone', semClone, 'com_clone', comClone);
  console.log(out.verdict, out.gates_ok + '/' + out.gates_total);
  out.gates.filter(g => !g.ok).forEach(g => console.log('FALHOU', g.name, g.detail));
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });