// P0-4: prova de que nenhum diário ou memória contém o token por extenso.
// Só conta ocorrências completas; nunca imprime o valor.
import fs from 'node:fs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const MEM = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/memory';
const ALVOS = [
  `${REPO}/docs/remedicao-seguranca-P1-P3.md`,
  `${REPO}/scripts/seg-p0-clean-remote.mjs`,
  `${REPO}/scripts/seg-p0-access-probe.mjs`,
  `${REPO}/scripts/seg-p0-token-sweep.mjs`,
  `${MEM}/bfr-security-remediation-p2-p3.md`,
  `${MEM}/bfr-security-remediation-p1.md`,
  `${MEM}/bfr-repo-snapshot-v59.md`,
  `${MEM}/MEMORY.md`,
];
const TOKEN = /(ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{20,}/g;
let total = 0;
for (const f of ALVOS) {
  if (!fs.existsSync(f)) { console.log(`  ${f.split('/').pop()}: FICHEIRO INEXISTENTE`); continue; }
  const n = [...fs.readFileSync(f, 'utf8').matchAll(TOKEN)].length;
  total += n;
  console.log(`  ${f.split('/').pop()}: ${n} ocorrências de token por extenso`);
}
console.log(total === 0 ? 'PORTAO P0-4 OK — zero credenciais por extenso nos registos' : 'PORTAO P0-4 FALHA — ha valor por extenso em algum registo');
process.exit(total === 0 ? 0 : 1);
