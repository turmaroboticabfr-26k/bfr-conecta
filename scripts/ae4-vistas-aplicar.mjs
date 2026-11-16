// AE-4 — APLICAÇÃO do fecho das 5 vistas (security_invoker=true) + conferência de catálogo.
// OK que autoriza: «(b) DDL das 5 vistas» (seleção do usuário, 16/11, ciclo AE).
// Portões antes: artefactos de pré-voo e dry-run existem e o dry-run está VERDE.
// Aplicação: UMA transacção com COMMIT. Conferência depois: modo, grants, definições e contagens.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const APL = `${DIR}/scripts/ae2-vistas-aplicacao-16-11.sql`;
const PRE = `${DIR}/evidence/ae1-vistas-preflight-16-11.json`;
const DRY = `${DIR}/evidence/ae3-vistas-dryrun-16-11.json`;
const OUT = `${DIR}/evidence/ae4-vistas-aplicacao-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

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

const portoes = { n: 0, falhas: [] };
const gate = (nome, valor, esperado) => {
  portoes.n++;
  if (JSON.stringify(valor) !== JSON.stringify(esperado)) portoes.falhas.push(`${nome}: ${JSON.stringify(valor)} != ${JSON.stringify(esperado)}`);
};

const pre = JSON.parse(readFileSync(PRE, 'utf8'));
const dry = JSON.parse(readFileSync(DRY, 'utf8'));
const ddl = readFileSync(APL, 'utf8');

// ── portões ANTES de abrir a escrita ──
gate('preflight_existe', existsSync(PRE), true);
gate('dryrun_existe_e_verde', [existsSync(DRY), dry.veredito], [true, 'AE3_DRYRUN_VERDE']);
gate('dryrun_nada_persistiu', dry.escrita_persistida, true);
gate('aplicacao_md5_igual_ao_do_dryrun', md5(ddl), dry.aplicacao_md5);
gate('reversao_existe', existsSync(`${DIR}/scripts/ae2-vistas-reversao-16-11.sql`), true);
gate('reversao_md5', md5(readFileSync(`${DIR}/scripts/ae2-vistas-reversao-16-11.sql`, 'utf8')), '6a7cca4e0f1af5e890f933d67b4118a2');

const censo = `select c.relname,
  case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
       when c.reloptions::text like '%security_invoker=false%' then 'definer'
       else 'sem-opcao' end as modo,
  coalesce(has_table_privilege('anon', c.oid, 'SELECT')::text, '?') as anon_sel,
  coalesce(has_table_privilege('authenticated', c.oid, 'SELECT')::text, '?') as auth_sel,
  pg_get_viewdef(c.oid) as def
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname='public' and c.relkind='v' and c.relname like 'sports\\_public\\_%' escape '\\'
 order by c.relname`;

if (portoes.falhas.length) {
  console.log('PORTÕES ANTES VERMELHOS — nada enviado ao canal:');
  for (const f of portoes.falhas) console.log('VERMELHO  ' + f);
  process.exit(1);
}

// ── aplicação ──
const antes = await sql(censo);
await sql(`BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '60s';\n${ddl}\nCOMMIT;`);
const depois = await sql(censo);

// ── conferência depois ──
gate('depois_5_invoker', depois.filter((x) => x.modo === 'invoker').length, 5);
gate('depois_anon_sem_select', depois.map((x) => x.anon_sel), ['false', 'false', 'false', 'false', 'false']);
gate('depois_auth_com_select', depois.map((x) => x.auth_sel), ['true', 'true', 'true', 'true', 'true']);
gate('depois_defs_byte_iguais_ao_antes', depois.map((x) => x.def), antes.map((x) => x.def));
gate('depois_defs_iguais_ao_preflight', depois.map((x) => x.def), pre.vistas.map((x) => x.def));
gate('antes_estava_sem_opcao', antes.map((x) => x.modo), ['sem-opcao', 'sem-opcao', 'sem-opcao', 'sem-opcao', 'sem-opcao']);

// contagens pós: dono e authenticated (set local role) — esperado igual ao pré-voo (0/0 nas cinco)
const contagens = [];
for (const v of depois) {
  const linha = { view: v.relname };
  for (const papel of ['postgres', 'authenticated']) {
    const r = await sql(`begin; set local role ${papel}; select count(*)::int as n from ${v.relname}; rollback;`);
    linha[papel] = Array.isArray(r) ? r[0].n : 'ERRO';
  }
  contagens.push(linha);
}
gate('contagens_pos_iguais_ao_preflight', contagens, pre.contagens);

const out = {
  em: new Date().toISOString(),
  ok_nomeado: '(b) DDL das 5 vistas — seleção do usuário, 16/11',
  tarefa: 'fechar as 5 vistas sports_public_* com security_invoker=true',
  aplicacao_md5: md5(ddl),
  antes,
  depois,
  contagens,
  portoes,
  veredito: portoes.falhas.length === 0 ? 'AE4_APLICACAO_VERDE' : 'AE4_APLICACAO_VERMELHO',
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(out.veredito, `| portões ${portoes.n}/${portoes.n - portoes.falhas.length} falhas`, `| modos depois: ${depois.map((x) => x.modo).join(',')}`);
if (portoes.falhas.length) { for (const f of portoes.falhas) console.log('VERMELHO  ' + f); process.exit(1); }
