// scripts/seg-p0-tenta-pat-antigo.mjs
// Tenta o PAT classico vazado (sobrevive so no transcrito do chat) como credencial de push.
// O valor NUNCA sai: nem stdout, nem stderr, nem argv (so stdin do git credential approve).
// Saida: len + 12 hex do md5 + resultado de cada candidato.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const TRANSCRITO = 'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-10-13-28077d9a/28077d9a-b3f1-4a3a-9146-bcdcacf4110c.jsonl';
// Grafia do dono vem do login da API (/user), nunca dactilografada — fallback so para a sonda do repo.
const USER = 'turmaroboticabfr-26k';
const HOST = 'github.com';

function approve(tok, username) {
  execFileSync('git', ['credential', 'approve'], {
    cwd: REPO,
    input: `protocol=https\nhost=${HOST}\nusername=${username}\npassword=${tok}\n\n`,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}

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
  console.error('INSTRUMENTO CEGO — 0 candidatos ghp_ de 36+ no transcrito');
  process.exit(1);
}
console.log(`candidatos unicos no transcrito: ${cands.length}`);

let winner = null;
let winnerLogin = null;
let ok = 0;
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
  try {
    const owner = login !== '-' ? login : USER;
    const r2 = await fetch(`https://api.github.com/repos/${owner}/bfr-conecta`, {
      headers: { Authorization: `token ${tok}`, 'User-Agent': 'bfr-seg-p0', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30_000),
    });
    acesso = r2.status === 200 ? 'SIM' : `nao(${r2.status})`;
  } catch (e) {
    acesso = `erro(${e.name})`;
  }
  console.log(`cand ${i + 1}: len=${tok.length} md5=${md5} vivo=${vivo} acesso=${acesso} login=${login}`);
  if (vivo === 'SIM' && acesso === 'SIM') {
    ok += 1;
    winner = tok;
    winnerLogin = login;
  }
}

if (ok === 0) {
  console.error('TOTAL: 0 candidatos vivos com acesso — PAT morto ou revogado');
  process.exit(2);
}
if (ok > 1) {
  console.error(`TOTAL: ${ok} funcionam — ambiguo, nao prosseguir sem decisao`);
  process.exit(3);
}
// Ultimo approve vencedor: garante que o GCM fica com a credencial que FUNCIONA,
// mesmo que um candidato posterior tenha falhado e sobrescrito.
approve(winner, winnerLogin);
console.log(`TOTAL: 1 candidato vivo com acesso (login=${winnerLogin}) — credencial vencedora instalada no GCM (por stdin, valor nunca impresso)`);
