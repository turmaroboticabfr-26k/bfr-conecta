// Censo read-only do perfil de Chrome deixado por um ciclo de teste: que lojas de credencial
// existem e com quantas linhas. Nunca imprime valores, utilizadores, tokens ou cookies.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/.c2-chrome-profile';
const D = path.join(RAIZ, 'Default');

const abro = (f) => {
  const p = path.join(D, f);
  if (!fs.existsSync(p)) return null;
  const st = fs.statSync(p);
  if (st.size === 0) return { p, size: 0, erro: 'vazio' };
  try {
    return { p, size: st.size, db: new DatabaseSync(p, { readOnly: true }) };
  } catch (e) {
    return { p, size: st.size, erro: e.message.slice(0, 60) };
  }
};

const q = (h, sql) => {
  if (!h?.db) return null;
  try { return h.db.prepare(sql).all(); } catch { return null; }
};

console.log('=== Login Data ===');
const lg = abro('Login Data');
if (lg?.db) {
  const rows = q(lg, 'select origin_url, count(*) as n from logins group by origin_url order by n desc');
  const tot = q(lg, 'select count(*) as n from logins')[0].n;
  console.log(`ficheiro=${lg.size} B | linhas de logins=${tot} | origens(distinct)=${(rows || []).length}`);
  for (const r of rows || []) console.log(`   ${r.origin_url.slice(0, 90)} : ${r.n}`);
  try { console.log(`   form_history=${q(lg, 'select count(*) as n from form_history')[0].n}`); } catch {}
} else console.log(`sem leitura: ${lg?.erro ?? 'ausente'}`);

console.log('\n=== Cookies (Network/Cookies) ===');
const ck = abro('Network/Cookies') || abro('Cookies');
if (ck?.db) {
  const tot = q(ck, 'select count(*) as n from cookies')?.[0]?.n ?? '?';
  const hp = q(ck, 'select count(*) as n from http_cookies')?.[0]?.n ?? 'sem tabela';
  const nd = q(ck, 'select count(distinct host_key) as n from cookies')?.[0]?.n ?? '?';
  const hosts = q(ck, 'select host_key, count(*) as n from cookies group by host_key order by n desc limit 30');
  console.log(`ficheiro=${ck.size} B | cookies=${tot} + http_cookies=${hp} | hosts(distinct)=${nd}`);
  for (const h of hosts || []) console.log(`   ${h.host_key} : ${h.n}`);
} else console.log(`sem leitura: ${ck?.erro ?? 'ausente'}`);

console.log('\n=== Local Storage (LevelDB) ===');
const lsDir = path.join(D, 'Local Storage', 'leveldb');
if (fs.existsSync(lsDir)) {
  const files = fs.readdirSync(lsDir);
  let bytes = 0;
  for (const f of files) bytes += fs.statSync(path.join(lsDir, f)).size;
  const txt = files.filter((f) => /\.log$|\.ldb$/.test(f)).map((f) => fs.readFileSync(path.join(lsDir, f), 'latin1')).join('');
  const hosts = new Set([...txt.matchAll(/https?:\/\/[a-z0-9.-]+/gi)].map((m) => m[0]));
  const sb = (txt.match(/sb-[\w-]+-auth-token/g) || []).length;
  console.log(`files=${files.length} bytes=${bytes} | hosts vistas=${hosts.size} | ocorrencias de sb-*-auth-token=${sb}`);
  for (const h of [...hosts].slice(0, 15)) console.log(`   ${h}`);
} else console.log('ausente');

console.log('\n=== Historia ===');
const hi = abro('History');
if (hi?.db) {
  console.log(`ficheiro=${hi.size} B | urls=${q(hi, 'select count(*) as n from urls')?.[0]?.n ?? '?'} | urls_distintas=${q(hi, 'select count(distinct url) as n from urls')?.[0]?.n ?? '?'} (a tabela do Chrome 14x não tem coluna host; hosts = marcadores crus abaixo)`);
} else console.log(`sem leitura: ${hi?.erro ?? 'ausente'}`);

console.log('\n=== lojas em espera de WAL (o SQLite read-only não vê o que está no -wal) ===');
for (const f of ['Login Data', 'Network/Cookies', 'History', 'Web Data', 'Favicons', 'DIPS']) {
  const main = path.join(D, f);
  const wal = main + '-wal';
  const shm = main + '-shm';
  if (!fs.existsSync(main)) continue;
  const w = fs.existsSync(wal) ? fs.statSync(wal).size : 0;
  console.log(`   ${f}: main=${fs.statSync(main).size} B wal=${w} B shm=${fs.existsSync(shm) ? fs.statSync(shm).size : 0} B` + (w > 0 ? '  <-- contagem acima é LIMITE INFERIOR' : ''));
}

console.log('\n=== bytes crus: hosts que aparecem nas lojas (só contagem de marcadores) ===');
const marcadores = ['workers.dev', 'supabase.co', 'github.com', 'accounts.google', 'push.googlev1', 'firebase', 'bu.app'];
for (const f of ['Login Data', 'Network/Cookies', 'History', 'Web Data', 'Favicons']) {
  const main = path.join(D, f);
  if (!fs.existsSync(main)) continue;
  const buf = fs.readFileSync(main);
  const walP = main + '-wal';
  const walBuf = fs.existsSync(walP) ? fs.readFileSync(walP) : Buffer.alloc(0);
  const t = Buffer.concat([buf, walBuf]).toString('latin1');
  const hits = marcadores.map((m) => `${m}=${(t.split(m).length - 1)}`).filter((s) => !s.endsWith('=0'));
  console.log(`   ${f} (${buf.length + walBuf.length} B lidos): ${hits.length ? hits.join(' ') : 'nenhum marcador'}`);
}

console.log('\n=== outras lojas ===');
for (const f of ['Web Data', ' Favicons', 'DIPS', 'Session Storage', 'Sessions']) {
  const p = path.join(D, f.trim());
  if (fs.existsSync(p)) console.log(`   ${f.trim()}: ${fs.statSync(p).size} B`);
}
const st = path.join(RAIZ, 'Local State');
if (fs.existsSync(st)) {
  const j = JSON.parse(fs.readFileSync(st, 'utf8'));
  const os = j?.os_crypt?.encrypted_key ? `presente (b64 len=${j.os_crypt.encrypted_key.length})` : 'ausente';
  console.log(`   Local State: ${fs.statSync(st).size} B | os_crypt.encrypted_key: ${os}`);
}
