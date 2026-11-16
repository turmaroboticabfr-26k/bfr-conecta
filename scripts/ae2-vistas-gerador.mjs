// AE-2 — gerador do DDL das 5 vistas sports_public_* com security_invoker=true.
// Lê as definições do artefacto de pré-voo (nunca dactilografa), confere que o
// catálogo vivo continua byte-igual ao pré-voo, e emite aplicação + reversão.
// Não escreve no banco; só escreve os dois .sql em scripts/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PRE = `${DIR}/evidence/ae1-vistas-preflight-16-11.json`;
const APL = `${DIR}/scripts/ae2-vistas-aplicacao-16-11.sql`;
const REV = `${DIR}/scripts/ae2-vistas-reversao-16-11.sql`;
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const pre = JSON.parse(readFileSync(PRE, 'utf8'));
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
};

// pré-voo 2: o catálogo vivo tem de ser byte-igual ao artefacto antes de emitir qualquer DDL
const vivo = await sql(`select c.relname, pg_get_viewdef(c.oid) as def
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname='public' and c.relkind='v' and c.relname like 'sports\\_public\\_%' escape '\\'
 order by c.relname`);
const porNome = Object.fromEntries(vivo.map((v) => [v.relname, v.def]));
const divergencias = [];
for (const v of pre.vistas) {
  if (porNome[v.relname] !== v.def) divergencias.push(v.relname);
}
if (divergencias.length > 0) {
  throw new Error(`Catálogo vivo divergiu do pré-voo: ${divergencias.join(', ')} — não emitir DDL.`);
}

const cabeca = (extra) => `-- AE-2 — fecho das 5 vistas sports_public_* (${extra})
-- Gerado por scripts/ae2-vistas-gerador.mjs em ${new Date().toISOString()}
-- Definições copiadas byte-a-byte de evidence/ae1-vistas-preflight-16-11.json
-- (pg_get_viewdef do catálogo vivo, re-conferido igual antes de emitir).
-- O que muda: WITH (security_invoker = true) — a vista passa a rodar com os
-- privilégios do chamador, logo a RLS das tabelas-base aplica-se à leitura autenticada.
-- Medido no pré-voo: para todo papel, a RLS da base é superconjunto do filtro interno
-- da vista, logo nenhum papel perde linhas; fecha-se a via do dono (postgres BYPASSRLS).
-- Os grants de SELECT não são tocados (CREATE OR REPLACE VIEW preserva privilégios);
-- a conferência re-mede anon=false / auth=true depois.
`;
const frases = pre.vistas.map((v) =>
  `CREATE OR REPLACE VIEW public.${v.relname}\nWITH (security_invoker = true) AS\n${v.def};\n`);

writeFileSync(APL, cabeca('APLICAÇÃO — security_invoker=true') + frases.join('\n'));
writeFileSync(REV, cabeca('REVERSÃO — security_invoker=false') +
  pre.vistas.map((v) => `CREATE OR REPLACE VIEW public.${v.relname}\nWITH (security_invoker = false) AS\n${v.def};\n`).join('\n'));

const statA = { md5: md5(readFileSync(APL, 'utf8')), bytes: readFileSync(APL).length };
const statR = { md5: md5(readFileSync(REV, 'utf8')), bytes: readFileSync(REV).length };
console.log(`vivo byte-igual ao pré-voo: ${vivo.length} vistas OK`);
console.log(`aplicacao: ${statA.bytes} B md5 ${statA.md5}`);
console.log(`reversao : ${statR.bytes} B md5 ${statR.md5}`);
console.log(APL);
console.log(REV);
