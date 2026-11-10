// scripts/seg-p0-sonda-classico.mjs
// Sonda SO-LEITURA dos classicos (ghp_) vazados no transcrito: vivo? acesso ao repo?
// Diferenca para seg-p0-tenta-pat-antigo.mjs: NUNCA instala nada no GCM (sem approve).
// Saida: len + 12 hex do md5 + status por candidato. Valor nunca sai.

import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const TRANSCRITO = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/28077d9a-b3f1-4a3a-9146-bcdcacf4110c.jsonl';

if (!existsSync(TRANSCRITO)) {
  console.error('FALHA — transcrito nao existe: ' + TRANSCRITO);
  process.exit(1);
}

const seen = new Set();
for await (const line of createInterface({
  input: createReadStream(TRANSCRITO, { encoding: 'utf8' }),
  crlfDelay: Infinity,
})) {
  for (const m of line.match(/ghp_[A-Za-z0-9]{36}/g) || []) seen.add(m);
}
const cands = [...seen];
if (cands.length === 0) {
  console.error('INSTRUMENTO CEGO — 0 candidatos ghp_ no transcrito');
  process.exit(1);
}
console.log(`candidatos unicos no transcrito: ${cands.length}`);

let vivos = 0;
for (const [i, tok] of cands.entries()) {
  const md5 = createHash('md5').update(tok).digest('hex').slice(0, 12);
  let vivo = '?';
  let acesso = '?';
  let login = '-';
  try {
    const r1 = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${tok}`, 'User-Agent': 'bfr-seg-p0', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30_000),
    });
    vivo = r1.status === 200 ? 'SIM' : `nao(${r1.status})`;
    if (r1.status === 200) {
      const j = await r1.json();
      login = String(j.login || '-');
    }
  } catch (e) {
    vivo = `erro(${e.name})`;
  }
  if (vivo === 'SIM') {
    try {
      const r2 = await fetch(`https://api.github.com/repos/${login}/bfr-conecta`, {
        headers: { Authorization: `token ${tok}`, 'User-Agent': 'bfr-seg-p0', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(30_000),
      });
      acesso = r2.status === 200 ? 'SIM' : `nao(${r2.status})`;
    } catch (e) {
      acesso = `erro(${e.name})`;
    }
    vivos += 1;
  }
  console.log(`cand ${i + 1}: len=${tok.length} md5=${md5} vivo=${vivo} acesso=${acesso} login=${login}`);
}
console.log(`TOTAL: ${vivos} classicos vivos no transcrito (sonda so-leitura, nada instalado)`);
process.exit(vivos > 0 ? 0 : 2);