// SEG: censo dos blobs ALCANCAVEIS do origin/main (o que efectivamente subiu).
// Nunca imprime o valor do achado — só caminho, nome do padrao e contagem.
import { execFileSync } from 'node:child_process';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
const gitIn = (args, input) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, input });

const objects = git(['rev-list', '--objects', 'origin/main']).trim().split('\n');
const types = new Map();
const ids = objects.map((line) => {
  const [sha, ...rest] = line.split(' ');
  return { sha, path: rest.join(' ') || '(sem-nome)' };
});
const check = gitIn(['cat-file', '--batch-check=%(objectname) %(objecttype)'], ids.map((e) => e.sha).join('\n') + '\n');
for (const line of check.trim().split('\n')) {
  const [sha, type] = line.split(' ');
  types.set(sha, type);
}
const blobs = ids.filter((e) => types.get(e.sha) === 'blob');
console.log(`blobs alcancaveis do origin/main: ${blobs.length}`);

const PATTERNS = {
  'jwt-service_role': (s) => hasJwt(s, 'service_role'),
  'ghp_ (GitHub)': (s) => /ghp_[A-Za-z0-9]{20,}/.test(s),
  'github_pat_': (s) => /github_pat_[A-Za-z0-9_]{20,}/.test(s),
  'private key PEM': (s) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s),
  'access_token de sessao (JWT)': (s) => /"access_token"\s*:\s*"eyJ/.test(s),
  'refresh_token de sessao': (s) => /"refresh_token"\s*:\s*"[A-Za-z0-9_-]{20,}/.test(s),
  'password hardcoded': (s) => /(Supervisor123!|supervisor123|TestPass123!|Test1234!|Test123!Test|C7-Test-2026!)/.test(s),
  'chave anon do Supabase': (s) => hasJwt(s, 'anon'),
  'chave AIza (Firebase)': (s) => /AIza[0-9A-Za-z_-]{30,}/.test(s),
};

function jwtPayloads(text) {
  const out = [];
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g)) {
    try {
      out.push(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch {}
  }
  return out;
}
function hasJwt(text, role) {
  return jwtPayloads(text).some((p) => new RegExp('"role"\\s*:\\s*"' + role + '"').test(p));
}

const hits = new Map();
for (const { sha, path } of blobs) {
  let body;
  try {
    body = git(['cat-file', 'blob', sha]);
  } catch {
    continue;
  }
  if (body.length > 8 << 20) continue;
  for (const [name, test] of Object.entries(PATTERNS)) {
    let found;
    try {
      found = test(body);
    } catch {
      found = false;
    }
    if (found) {
      if (!hits.has(name)) hits.set(name, new Set());
      hits.get(name).add(path);
    }
  }
}

console.log('\n=== o que subiu para o GitHub, por padrao ===');
if (hits.size === 0) console.log('(nada)');
for (const [name, set] of hits) {
  console.log(`\n${name}: ${set.size} caminho(s)`);
  for (const p of [...set].sort().slice(0, 12)) console.log(`  ${p}`);
  if (set.size > 12) console.log(`  ... +${set.size - 12}`);
}

const TIERS = {
  'A credencial de SERVIDOR (da de rolar se aparece)': ['jwt-service_role', 'ghp_ (GitHub)', 'github_pat_', 'private key PEM'],
  'B token de SESSAO (morto se a conta foi apagada)': ['access_token de sessao (JWT)', 'refresh_token de sessao'],
  'C chave PUBLICA de cliente (nao e segredo)': ['chave anon do Supabase', 'chave AIza (Firebase)'],
};
console.log('\n=== VEREDITO por nivel ===');
for (const [tier, names] of Object.entries(TIERS)) {
  const hit = names.filter((n) => hits.has(n));
  console.log(`\n${tier}`);
  console.log(hit.length ? '  ACHADO: ' + hit.join(' | ') : '  limpo');
}
