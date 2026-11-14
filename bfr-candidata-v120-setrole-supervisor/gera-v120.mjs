// RM-1.7 / PEN-32 — gera a candidata v120 sobre a v119 congelada. 3 hunks no roteador setRole().
// NAO escreve no ar: cria apenas bfr-candidata-v120-setrole-supervisor/index.html.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const candDir = `${dir}/bfr-candidata-v120-setrole-supervisor`;
const basePath = `${dir}/bfr-candidata-v119-supervisao-embed/index.html`;
const candPath = `${candDir}/index.html`;

const BASE_MD5 = 'a1969cdf023042e7d2a91e7ed9333a05';
const BASE_BYTES = 3489474;
const BASE_LINES = 28661;
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };

const baseBuf = fs.readFileSync(basePath);
if (md5(baseBuf) !== BASE_MD5) die(`base md5 ${md5(baseBuf)} != ${BASE_MD5}`);
if (baseBuf.length !== BASE_BYTES) die(`base bytes ${baseBuf.length} != ${BASE_BYTES}`);
const base = baseBuf.toString('utf8');
const bl = base.split('\n');
if (bl.length !== BASE_LINES) die(`base linhas ${bl.length} != ${BASE_LINES}`);

// H1 guard :9902 — ramo education_supervisor antes da cauda admin/developer
const H1_OLD = `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`;
const H1_NEW = `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'education_supervisor' ? ['education_supervisor','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`;
// H2 toggle :9926 — secretaryView continua visivel para o supervisor
const H2_OLD = `secretaryView.classList.toggle('hidden', role !== 'secretary');`;
const H2_NEW = `secretaryView.classList.toggle('hidden', role !== 'secretary' && role !== 'education_supervisor');`;
// H3 mapa de views :10145 — activeView education_supervisor resolve para secretaryView
const H3_OLD = `secretary:secretaryView, aee:aeeView,`;
const H3_NEW = `secretary:secretaryView, education_supervisor:secretaryView, aee:aeeView,`;

const hunks = [
  ['H1', 9902, H1_OLD, H1_NEW],
  ['H2', 9926, H2_OLD, H2_NEW],
  ['H3', 10145, H3_OLD, H3_NEW],
];

for (const [id, line, oldS, newS] of hunks) {
  const occ = base.split(oldS).length - 1;
  if (occ !== 1) die(`${id}: ancora velha ocorre ${occ}x, esperado 1`);
  if (base.split(newS).length - 1 !== 0) die(`${id}: token novo ja existe na base`);
  const hit = bl.findIndex(l => l.includes(oldS)) + 1;
  if (hit !== line) die(`${id}: ancora na linha ${hit}, esperado ${line}`);
}

let cand = base;
for (const [, , oldS, newS] of hunks) cand = cand.replace(oldS, newS);
fs.writeFileSync(candPath, cand, 'utf8');

const candBuf = fs.readFileSync(candPath);
const cl = cand.split('\n');
console.log(`base        ${baseBuf.length} B md5 ${md5(baseBuf)} linhas ${bl.length}`);
console.log(`candidata   ${candBuf.length} B md5 ${md5(candBuf)} linhas ${cl.length}`);
console.log(`delta       ${candBuf.length - baseBuf.length} B`);
const diffLines = [];
for (let i = 0; i < Math.max(cl.length, bl.length); i++) if (cl[i] !== bl[i]) diffLines.push(i + 1);
console.log(`linhas alteradas [${diffLines.join(',')}]`);
for (const [id, line, oldS, newS] of hunks) {
  const b = bl[line - 1], a = cl[line - 1];
  console.log(`\n${id} linha ${line}:`);
  console.log(`  antes : ...${b.slice(Math.max(0, b.indexOf(oldS) - 60), b.indexOf(oldS) + oldS.length)}`);
  console.log(`  depois: ...${a.slice(Math.max(0, a.indexOf(newS) - 60), a.indexOf(newS) + newS.length)}`);
}
console.log(`\ngravado em ${candPath}`);
