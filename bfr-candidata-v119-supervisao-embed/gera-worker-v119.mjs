import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE_BUNDLE = `${dir}/worker-deploy-v118-csp`;
const OUT_BUNDLE = `${dir}/worker-deploy-v119`;
const candPath = `${dir}/bfr-candidata-v119-supervisao-embed/index.html`;
const OLD = 'school_id,schools(name)';
const NEW = 'school_id,sports_schools(name)';
const LABEL_OLD = 'bfr-conecta-v118';
const LABEL_NEW = 'bfr-conecta-v119';
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

if (fs.existsSync(OUT_BUNDLE)) die(`${OUT_BUNDLE} ja existe (nao sobrescrever)`);

const baseWorker = fs.readFileSync(`${BASE_BUNDLE}/worker.mjs`, 'utf8');
const cand = fs.readFileSync(candPath, 'utf8');

const nOld = baseWorker.split(OLD).length - 1;
const nNew = baseWorker.split(NEW).length - 1;
const nLblOld = baseWorker.split(LABEL_OLD).length - 1;
if (nOld !== 1) die(`token velho no worker base = ${nOld}, esperado 1`);
if (nNew !== 0) die(`token novo ja presente no worker base (${nNew})`);
if (nLblOld !== 1) die(`etiqueta ${LABEL_OLD} no worker base = ${nLblOld}, esperado 1`);

const worker = baseWorker.replace(OLD, NEW).replace(LABEL_OLD, LABEL_NEW);
const delta = Buffer.byteLength(worker) - Buffer.byteLength(baseWorker);
if (delta !== 7) die(`delta de bytes do worker = ${delta}, esperado 7 (7 do hunk + 0 da etiqueta)`);

fs.mkdirSync(OUT_BUNDLE, { recursive: true });
fs.writeFileSync(`${OUT_BUNDLE}/worker.mjs`, worker, 'utf8');
fs.copyFileSync(`${BASE_BUNDLE}/wrangler.toml`, `${OUT_BUNDLE}/wrangler.toml`);
fs.mkdirSync(`${OUT_BUNDLE}/public`, { recursive: true });
const assets = fs.readdirSync(`${BASE_BUNDLE}/public`).sort();
for (const a of assets) fs.copyFileSync(`${BASE_BUNDLE}/public/${a}`, `${OUT_BUNDLE}/public/${a}`);

console.log(`worker base   ${Buffer.byteLength(baseWorker)} B md5 ${md5(baseWorker)}`);
console.log(`worker v119   ${Buffer.byteLength(worker)} B md5 ${md5(worker)} (delta +${delta})`);
console.log(`candidata     ${Buffer.byteLength(cand)} B md5 ${md5(cand)}`);
console.log(`etiqueta      ${LABEL_OLD} -> ${LABEL_NEW} (1 ocorrencia)`);
console.log(`assets        ${assets.length} copiados de ${BASE_BUNDLE}/public`);
console.log(`wrangler.toml copiado`);
console.log(`\ngravado em ${OUT_BUNDLE} (SEM deploy)`);
