// A senha que saiu no push ainda destranca alguma conta viva?
// Compara (bcrypt.compare, programatico) as senhas em claro colhidas dos ficheiros rastreados
// contra os hashes de TODAS as linhas de auth.users. Nao escreve no banco.
// Saida: md5+comprimento da senha, e por conta apenas id/dominio/papel/ultimo login. Nunca
// imprime o hash, nem o valor da senha, nem o email completo de conta que nao seja padrao de teste.
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const BIN = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|tar|7z|woff2?|ttf|otf|mp4|webm|xlsx|docx|pptx)$/i;
const RX = /password\s*[:=]\s*["']([^"'\n]{4,})["']/gi;
// `encrypted_password='${hash}'` casa o RX mas e interpolacao de codigo, nao senha em claro
const senhaReal = (s) => !s.includes('${');

const files = execFileSync('git', ['ls-files'], { cwd: DIR, encoding: 'utf8' }).split('\n').filter(Boolean);
const senhas = new Map();
let lidos = 0;
for (const rel of files) {
  if (BIN.test(rel)) continue;
  let txt;
  try { txt = readFileSync(`${DIR}/${rel}`, 'latin1'); } catch { continue; }
  lidos++;
  for (const m of txt.matchAll(RX)) if (senhaReal(m[1]) && !senhas.has(m[1])) senhas.set(m[1], rel);
}
if (!senhas.size) console.log('[PUSHED] zero senhas no tracking (desde 2a6a351) — o guarda de cegueira passa a olhar o corpus do disco');
else console.log(`[PUSHED] senhas em claro colhidas de ${lidos} ficheiros rastreados: ${senhas.size}`);

// o mesmo corpus do portao, mas incluindo o que esta no disco sem estar no tracking
import path from 'node:path';
import fs from 'node:fs';
const disco = new Map(senhas);
const walk = (dir, depth) => {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1);
    else if (/\.(mjs|js|sql|md|json)$/.test(e.name)) {
      for (const m of fs.readFileSync(p, 'latin1').matchAll(RX)) if (senhaReal(m[1]) && !disco.has(m[1])) disco.set(m[1], path.relative(DIR, p));
    }
  }
};
if (process.argv.includes('--com-disco')) walk(DIR, 3);
console.log(`[DISCO] senhas colhidas (tracking + ignorados): ${disco.size}`);
// o guarda de cegueira avalia o corpus que vai ser comparado, não só o tracking
if (!disco.size) { console.log('INSTRUMENTO CEGO: zero senhas colhidas — a comparacao nao prova nada'); process.exit(1); }

const rows = await sql(`select id, email, role, created_at, last_sign_in_at, encrypted_password from auth.users order by created_at`);
if (!Array.isArray(rows) || !rows.length) { console.log('INSTRUMENTO CEGO: auth.users devolveu zero linhas'); process.exit(1); }
console.log(`contas em auth.users: ${rows.length}`);

const mask = (u) => {
  const [local, dom] = String(u.email || '').split('@');
  return /^(test|bfr|synth|audit|seed|demo|supervis)/i.test(local) ? `${local}@${dom}` : `<${local.length} chars>@${dom}`;
};

let destrancaveis = 0;
for (const [senha, origem] of disco) {
  const onde = senhas.has(senha) ? 'PUSHED' : 'so-disco';
  const hits = [];
  for (const u of rows) {
    if (!u.encrypted_password || !/^\$2/.test(u.encrypted_password)) continue;
    if (await bcrypt.compare(senha, u.encrypted_password)) hits.push(u);
  }
  if (hits.length) destrancaveis += hits.length;
  console.log(`senha md5=${md5(senha).slice(0, 12)} len=${senha.length} [${onde}] (origem: ${origem}) -> destranca ${hits.length}`);
  for (const h of hits) {
    const s = await sql(`select count(*)::int as n from auth.sessions where user_id = '${h.id}'`);
    console.log(`   VIVA: ${h.id} | ${mask(h)} | role=${h.role} | criado=${h.created_at} | ultimo_login=${h.last_sign_in_at ?? 'NULL'} | sessoes=${s[0].n}`);
  }
}

console.log(`\nTOTAL de combinações senha-conta que funcionam hoje: ${destrancaveis}`);
const semHash = rows.filter((u) => !u.encrypted_password || !/^\$2/.test(u.encrypted_password));
console.log(`contas sem hash bcrypt (OAuth ou sem senha): ${semHash.length}`);
for (const u of semHash) console.log(`   ${u.id} | ${mask(u)} | role=${u.role} | ultimo_login=${u.last_sign_in_at ?? 'NULL'}`);
