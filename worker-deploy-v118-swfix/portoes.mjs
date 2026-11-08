import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const base = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const orig = fs.readFileSync(`${base}/worker-deploy-v118/worker.mjs`, 'utf8');
const cand = fs.readFileSync(`${base}/worker-deploy-v118-swfix/worker.mjs`, 'utf8');
const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const gates = [];
const gate = (name, ok, detail) => { gates.push({ name, ok, detail }); console.log(`${ok ? 'OK ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`); };

const ol = orig.split('\n'), cl = cand.split('\n');
const diffs = [];
for (let i = 0; i < Math.max(ol.length, cl.length); i++) if (ol[i] !== cl[i]) diffs.push(i + 1);
gate('diff de exatamente 1 linha (linha 9)', diffs.length === 1 && diffs[0] === 9, `linhas diferentes: ${diffs.join(',')}`);
gate('HTML embutido intacto (md5 da linha 1)', md5(ol[0]) === md5(cl[0]), md5(cl[0]).replace(/(.)/g, '$1 '));
gate('SW embutido intacto (md5 da linha 2)', md5(ol[1]) === md5(cl[1]), md5(cl[1]).replace(/(.)/g, '$1 '));
gate('CACHE permanece v118', cand.includes("const CACHE = 'bfr-conecta-v118'") || /bfr-conecta-v118/.test(cl[1]));

try { execFileSync(process.execPath, ['--check', `${base}/worker-deploy-v118-swfix/worker.mjs`], { stdio: 'pipe' }); gate('sintaxe node --check', true); }
catch (e) { gate('sintaxe node --check', false, String(e.stderr || e)); }

const mod = await import(`file:///${base}/worker-deploy-v118-swfix/worker.mjs`);
const worker = mod.default;
const env = { ASSETS: { fetch: async () => new Response('asset-stub', { status: 200 }) } };
const req = p => new Request(`https://bfr-conecta.turmaroboticabfr.workers.dev${p}`);

const r1 = await worker.fetch(req('/sw-v4.js?v=45'), env, {});
const b1 = await r1.text();
gate('/sw-v4.js?v=45 → 200', r1.status === 200, `status ${r1.status}`);
gate('/sw-v4.js?v=45 devolve o SW v118', b1.includes("const CACHE = 'bfr-conecta-v118'"), `${b1.length} chars`);
gate('content-type javascript', (r1.headers.get('content-type') || '').includes('application/javascript'));

const r2 = await worker.fetch(req('/sw.js'), env, {});
gate('/sw.js continua 200', r2.status === 200);

const r3 = await worker.fetch(req('/'), env, {});
const b3 = await r3.text();
const live = fs.readFileSync('C:/Users/pcmac/AppData/Local/Temp/v118-live.html');
gate('/ devolve HTML byte-idêntico ao ar v118', r3.status === 200 && md5(b3) === md5(live), `md5 ${md5(b3).replace(/(.)/g, '$1 ')}`);

const r4 = await worker.fetch(req('/manifest.json'), env, {});
gate('/manifest.json cai no ASSETS (200 stub)', r4.status === 200 && (await r4.text()) === 'asset-stub');

const falhas = gates.filter(g => !g.ok).length;
fs.writeFileSync(`${base}/worker-deploy-v118-swfix/portoes.json`, JSON.stringify({ quando: new Date().toISOString(), total: gates.length, falhas, gates }, null, 2));
console.log(`\nPORTOES ${gates.length - falhas}/${gates.length}`);
process.exit(falhas ? 1 : 0);