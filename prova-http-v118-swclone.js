const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const ROOT = __dirname;
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'v118-confirmacao.json'), 'utf8'));
const HOST = new URL(conf.alvo).host;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: HOST, path: urlPath, headers: { 'User-Agent': 'prova-http-v118-swclone', 'Cache-Control': 'no-cache' }, timeout: 30000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout ' + urlPath)); });
    req.on('error', reject);
  });
}

(async () => {
  const out = { ciclo: 'V118-CLONE-HTTP', quando: new Date().toISOString(), host: HOST, version_id: '8930aa19-e79f-4a8f-bb7c-6d05a2055db4', gates: [], escrita_no_banco: 'zero' };
  const gate = (name, ok, detail) => { out.gates.push({ name, ok, detail }); };

  const swv4 = await get('/sw-v4.js?v=45');
  const swjs = await get('/sw.js');
  const shell = await get('/');
  const swv4md5 = md5(swv4.body), swjsmd5 = md5(swjs.body), shellmd5 = md5(shell.body);
  const sw = swv4.body.toString('utf8');
  const semClone = (sw.match(/await cache\.put\(event\.request, response\);/g) || []).length;
  const comClone = (sw.match(/await cache\.put\(event\.request, response\.clone\(\)\);/g) || []).length;

  out.medidas = {
    sw_v4: { status: swv4.status, bytes: swv4.body.length, md5: swv4md5, content_type: swv4.headers['content-type'], cache_control: swv4.headers['cache-control'] },
    sw_js: { status: swjs.status, bytes: swjs.body.length, md5: swjsmd5 },
    shell: { status: shell.status, bytes: shell.body.length, md5: shellmd5 },
    sw_cache_put: { sem_clone: semClone, com_clone: comClone },
    sw_cache_v118: /const CACHE = 'bfr-conecta-v118'/.test(sw),
  };

  gate('sw_v4_200', swv4.status === 200, 'status ' + swv4.status);
  gate('sw_js_200', swjs.status === 200, 'status ' + swjs.status);
  gate('sw_iguais', swv4md5 === swjsmd5, swv4md5 + ' vs ' + swjsmd5);
  gate('sw_corrigido_md5', swv4md5 === '3fcbc3ad52f1a0491362506466c82596', 'SW vivo == candidata corrigida (3fcbc3ad…)');
  gate('sw_nao_eh_mais_buggy', swv4md5 !== '7111e4fc3a4069b3df60bc3cfe76ff92', 'SW vivo deixou de ser o buggy (7111e4fc…)');
  gate('sw_shell_sem_clone_zero', semClone === 0, 'sem clone = ' + semClone);
  gate('sw_dois_com_clone', comClone === 2, 'com clone (shell+generico) = ' + comClone);
  gate('sw_cache_v118', out.medidas.sw_cache_v118, 'CACHE v118');
  gate('shell_200', shell.status === 200, 'status ' + shell.status);
  gate('shell_intacto', shellmd5 === 'ae59d35346b685b2fbf9d18ade4fa5cd' && shell.body.length === 3489467, shellmd5 + ' / ' + shell.body.length + ' B');

  out.gates_total = out.gates.length;
  out.gates_ok = out.gates.filter(g => g.ok).length;
  out.verdict = out.gates_ok === out.gates_total ? 'HTTP_VERDE' : 'HTTP_VERMELHO';
  fs.writeFileSync(path.join(ROOT, 'docs', 'v118-swclone-http.json'), JSON.stringify(out, null, 2));
  console.log('SW vivo', swv4md5, swv4.body.length, 'B; shell', shellmd5, shell.body.length);
  console.log('cache.put sem_clone', semClone, 'com_clone', comClone, 'CACHE v118', out.medidas.sw_cache_v118);
  console.log(out.verdict, out.gates_ok + '/' + out.gates_total);
  out.gates.filter(g => !g.ok).forEach(g => console.log('FALHOU', g.name, g.detail));
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });