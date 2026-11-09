// SEG-FIN-5: confere as etiquetas de redaccao da memoria do P1 contra as senhas colhidas no
// diario §7 (seg-p1-senha-viva.mjs --com-disco). Comparacao corpus<->corpus: e o unico uso
// legitimo de md5 aqui — texto-claro vs hash bcrypt nao se compara por md5.
// Nao imprime valores: apenas os conjuntos de md5 e a igualdade.
import fs from 'node:fs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const MEM = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/memory/bfr-security-remediation-p1.md';

const rot = new Set([...fs.readFileSync(MEM, 'utf8').matchAll(/\(md5 ([0-9a-f]{12}) len=(\d+)\)/g)].map((m) => m[1]));
const log = fs.readFileSync(`${REPO}/evidence/seg-fin-2026-11-09.log`, 'utf8');
const seco = log.split('================ 10.')[0];
const di = new Set([...seco.matchAll(/senha md5=([0-9a-f]{12}) len=(\d+)/g)].map((m) => m[1]));

console.log(`memoria do P1: ${rot.size} md5 distintos de senha redigida`);
console.log(`diario S7:     ${di.size} md5 distintos de senha colhida do disco`);
if (!rot.size || !di.size) { console.log('INSTRUMENTO CEGO: um dos conjuntos esta vazio'); process.exit(1); }

const soMem = [...rot].filter((x) => !di.has(x));
const soLog = [...di].filter((x) => !rot.has(x));
console.log(`so na memoria: ${soMem.length} | so no diario: ${soLog.length}`);
for (const x of soMem) console.log(`   memoria-only ${x}`);
for (const x of soLog) console.log(`   diario-only  ${x}`);
console.log(soMem.length + soLog.length === 0
  ? 'CONFERENCIA OK — o registo redigido e exactamente o corpus que o bcrypt comparou (0 destrancam)'
  : 'CONFERENCIA FALHA — os dois registos descrevem corpus diferentes');
process.exit(soMem.length + soLog.length === 0 ? 0 : 1);
