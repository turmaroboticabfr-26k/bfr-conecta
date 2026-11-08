const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const root = __dirname;
const srcDir = path.join(root, 'worker-deploy-v118-swfix');
const outDir = path.join(root, 'worker-deploy-v118-swclone');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');

const gates = [];
function gate(name, ok, detail) { gates.push({ name, ok: !!ok, detail }); if (!ok) { console.error('FALHOU:', name, detail || ''); } }

const srcWorkerPath = path.join(srcDir, 'worker.mjs');
const srcBuf = fs.readFileSync(srcWorkerPath);
const src = srcBuf.toString('utf8');
const srcMd5 = md5(srcBuf);

// Linhagem: o worker publicado tem o fix da rota e o ramo do shell SEM clone.
gate('rota_sw_v4_presente', src.includes("url.pathname === '/sw-v4.js'"), 'fix da rota esperado no worker publicado');
const shellSemClone = 'await cache.put(event.request, response);';
const shellComClone = 'await cache.put(event.request, response.clone());';
const countSemClone = src.split(shellSemClone).length - 1;
const countComCloneAntes = src.split(shellComClone).length - 1;
gate('shell_sem_clone_unico', countSemClone === 1, 'ocorrencias sem clone = ' + countSemClone);
gate('generico_com_clone_unico', countComCloneAntes === 1, 'ocorrencias com clone (generico) = ' + countComCloneAntes);

// Aplicar o clone APENAS no ramo do shell (o unico sem clone).
const fixed = src.replace(shellSemClone, shellComClone);
const countSemCloneDepois = fixed.split(shellSemClone).length - 1;
const countComCloneDepois = fixed.split(shellComClone).length - 1;
gate('shell_sem_clone_zero_depois', countSemCloneDepois === 0, 'ocorrencias sem clone depois = ' + countSemCloneDepois);
gate('clone_total_dois_depois', countComCloneDepois === 2, 'ocorrencias com clone depois (shell+generico) = ' + countComCloneDepois);

// Diff minimo: apenas + '.clone()' inserido (7 chars), nada mais muda.
gate('diff_apenas_clone', fixed.length === src.length + '.clone()'.length, 'delta bytes = ' + (fixed.length - src.length));
gate('diff_replace_unico', fixed.replace(shellComClone, shellSemClone) === src || fixed.split(shellComClone).length === 3, 'reversao do clone recupera estrutura');

// Linha 1 (HTML) intacta; so a linha 2 (SW) muda.
const srcLines = src.split('\n');
const fixedLines = fixed.split('\n');
gate('html_linha1_intacta', srcLines[0] === fixedLines[0], 'linha HTML identica');
gate('apenas_linha2_muda', srcLines.length === fixedLines.length && srcLines.every((l, i) => i === 1 || l === fixedLines[i]), 'so a linha SW difere');

// Extrair o SW da candidata e validar sintaxe + posicao do clone.
function extractSw(workerText) {
  const line = workerText.split('\n')[1];
  return vm.runInNewContext(line + '\nSW;', {}, { timeout: 5000 });
}
const swFixed = extractSw(fixed);
const swSrc = extractSw(src);
let swSyntaxOk = true, swSyntaxErr = '';
try { new vm.Script(swFixed); } catch (e) { swSyntaxOk = false; swSyntaxErr = String(e); }
gate('sw_sintaxe_valida', swSyntaxOk, swSyntaxErr);
gate('sw_cache_v118', swFixed.includes("const CACHE = 'bfr-conecta-v118';"), 'CACHE name');
// O ramo do shell (network-first navigate) deve clonar; provar pela vizinhanca do return response.
const shellBlock = swFixed.split("event.request.mode === 'navigate'")[1] || '';
gate('sw_shell_clona_antes_return', /cache\.put\(event\.request, response\.clone\(\)\);\s*return response;/.test(swFixed), 'clone imediatamente antes do return no shell');
gate('sw_diff_so_clone', swFixed.replace('response.clone()', 'response') === swSrc || swFixed.split('response.clone()').length === swSrc.split('response.clone()').length + 1, 'SW diff = 1 clone');

// Escrever candidata
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'worker.mjs'), fixed, 'utf8');
fs.copyFileSync(path.join(srcDir, 'wrangler.toml'), path.join(outDir, 'wrangler.toml'));
const pubSrc = path.join(srcDir, 'public');
const pubOut = path.join(outDir, 'public');
if (!fs.existsSync(pubOut)) fs.mkdirSync(pubOut, { recursive: true });
for (const f of fs.readdirSync(pubSrc)) fs.copyFileSync(path.join(pubSrc, f), path.join(pubOut, f));

const outBuf = fs.readFileSync(path.join(outDir, 'worker.mjs'));
const outMd5 = md5(outBuf);
gate('out_md5_diferente_src', outMd5 !== srcMd5, 'src=' + srcMd5 + ' out=' + outMd5);
gate('out_escrito_igual_fixed', outBuf.toString('utf8') === fixed, 'ficheiro escrito == texto corrigido');

// Assets identicos (md5 por ficheiro)
const assetsOk = fs.readdirSync(pubSrc).every(f => md5(fs.readFileSync(path.join(pubSrc, f))) === md5(fs.readFileSync(path.join(pubOut, f))));
gate('assets_identico', assetsOk, 'public/ copiado byte a byte');

const allOk = gates.every(g => g.ok);
const report = {
  ciclo: 'v118-swclone',
  data: '2026-11-08',
  defeito: 'V118-SW-NAV: ramo do shell faz cache.put(req,response) e return response (corpo consumido) -> navegacao ERR_FAILED',
  correcao: 'response.clone() no ramo do shell (linha 61 do SW vivo), alinhando com o ramo generico',
  base: 'worker-deploy-v118-swfix/worker.mjs (rota ja corrigida, publicada como version c9235649)',
  src_md5: srcMd5,
  out_md5: outMd5,
  out_bytes: outBuf.length,
  delta_bytes: outBuf.length - srcBuf.length,
  sw_src_md5: md5(Buffer.from(swSrc)),
  sw_fixed_md5: md5(Buffer.from(swFixed)),
  gates_total: gates.length,
  gates_ok: gates.filter(g => g.ok).length,
  gates_falhos: gates.filter(g => !g.ok).length,
  verdict: allOk ? 'PORTAO_VERDE' : 'PORTAO_VERMELHO',
  gates
};
fs.writeFileSync(path.join(outDir, 'portoes.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, gates: report.gates_total + '/' + report.gates_ok, src_md5: srcMd5, out_md5: outMd5, out_bytes: outBuf.length, delta: report.delta_bytes, sw_fixed_md5: report.sw_fixed_md5 }, null, 2));
if (!allOk) process.exit(1);