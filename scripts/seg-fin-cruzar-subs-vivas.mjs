// SEG-FIN: as 2 sessões vivas que restam são as vazadas no histórico, ou são sessões normais?
// Cruza os `sub` extraídos dos blobs pushados com os user_id de auth.sessions/refresh_tokens vivos.
// Somente-leitura. Imprime apenas prefixos de uuid e contagens.
import { execFileSync } from 'node:child_process';
import { sql } from './s19-lib.mjs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

// O corpus é o mesmo do censo: TODOS os blobs alcançáveis de origin/main, não só a árvore da ponta
// (c2-sessions.json saiu do tracking em 80c951c mas o blob continua alcançável no histórico).
const ALVOS = new Set(['c2-sessions.json', 's19-sessions.json', 's20-sessions.json']);
const objects = git(['rev-list', '--objects', 'origin/main']).trim().split('\n');
const encontrados = new Map();
for (const linha of objects) {
  const [sha, ...rest] = linha.split(' ');
  const p = rest.join(' ');
  const base = p.split('/').pop();
  if (ALVOS.has(base) && !encontrados.has(base)) encontrados.set(base, sha);
}
const subsPush = new Set();
for (const [ficheiro, sha] of encontrados) {
  let corpo = '';
  try { corpo = git(['cat-file', 'blob', sha]); } catch { console.log(`${ficheiro}: blob ilegível`); continue; }
  const antes = subsPush.size;
  for (const m of corpo.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g)) {
    try {
      const p = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (p.sub) subsPush.add(p.sub);
    } catch {}
  }
  console.log(`${ficheiro} (blob ${sha.slice(0, 8)}): +${subsPush.size - antes} sub de JWT (total ${subsPush.size})`);
}
for (const a of ALVOS) if (!encontrados.has(a)) console.log(`${a}: nenhum blob alcançável`);
if (subsPush.size === 0) { console.log('INSTRUMENTO CEGO: zero sub extraído'); process.exit(1); }

const vivas = await sql(`select user_id, count(*)::int as n from auth.sessions group by user_id order by user_id`);
const refreshVivas = await sql(`select user_id, count(*)::int as n from auth.refresh_tokens where revoked is distinct from true group by user_id order by user_id`);

console.log(`\nsessões vivas por conta: ${vivas.length} conta(s) | refresh vivos: ${refreshVivas.length} conta(s)`);
const uuid = (u) => String(u).replace(/"/g, '');
for (const r of vivas) {
  const id = uuid(r.user_id);
  console.log(`   ${id.slice(0, 8)} | sessoes=${r.n} | vazado_no_historico=${subsPush.has(id) ? 'SIM' : 'NAO'}`);
}
for (const r of refreshVivas) {
  const id = uuid(r.user_id);
  console.log(`   refresh ${id.slice(0, 8)} | n=${r.n} | vazado_no_historico=${subsPush.has(id) ? 'SIM' : 'NAO'}`);
}
const aindaVivos = [...subsPush].filter((s) => vivas.some((v) => uuid(v.user_id) === s));
console.log(`\nsub vazados com sessão viva HOJE: ${aindaVivos.length} de ${subsPush.size}`);
for (const s of aindaVivos) console.log(`   ${s.slice(0, 8)}`);

console.log('\n=== por sub vazado: existe em auth.users? quantas linhas de refresh? ===');
const EH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let comLinha = 0, comViva = 0, descartados = 0;
for (const s of [...subsPush].sort()) {
  if (!EH_UUID.test(s)) { descartados++; console.log(`   (descartado: sub com forma não-uuid)`); continue; }
  const ex = await sql(`select count(*)::int as n from auth.users where id = '${s}'`);
  const rt = await sql(`select count(*)::int as total, count(*) filter (where revoked is distinct from true)::int as vivas from auth.refresh_tokens where user_id = '${s}'`);
  if (rt[0].total > 0) comLinha++;
  if (rt[0].vivas > 0) comViva++;
  console.log(`   ${s.slice(0, 8)} | usuario=${ex[0].n ? 'existe' : 'NAO existe'} | refresh_total=${rt[0].total} vivas=${rt[0].vivas}`);
}
console.log(`\nsubs com QUALQUER linha de refresh: ${comLinha} | com refresh NÃO revogado: ${comViva}`);
console.log('NOTA: as strings vão para o canal de SQL somente-leitura; nenhum uuid impresso por inteiro.');
