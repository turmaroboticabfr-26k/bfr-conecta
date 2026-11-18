#!/usr/bin/env node
// SM-22 (peca 7, SOMENTE LEITURA, ZERO CHAMADAS RPC): duas correcoes proprias e uma causa.
//  (a) A peca 5 contou 0 caminhos FK entre `guardian_students` e `profiles` enquanto o
//      PostgREST respondia PGRST201. A regua estava cega: `cast(oid as regclass)::text` devolve
//      o nome SEM o prefixo do esquema quando este esta no search_path, e eu comparava com
//      'public.guardian_students'. Aqui a chave e o nome despido, e o par e re-contado.
//  (b) A peca 6 provou que um anon obtem HTTP 200 com linhas de `bfr_municipal_network_totals`.
//      Procura-se a causa estatica: o corpo da funcao consulta alguma predicate de municipalidade
//      (`bfr_is_municipal_authority`, `bfr_has_municipal_grant`) ou `auth.uid()`? Se nao, o
//      resultado e incondicional e o grant e a unica porta. Censo de quantas das 65 funcoes com
//      EXECUTE a anon sao chamaveis sem argumentos (a superficie RPC real do anon).
//  (c) PEN-13: duas linhas `pending` existem hoje. Le-se o DEFAULT da coluna e o corpo de
//      `handle_new_user` para dizer quem as escreveu, sem tocar em PII (so nomes de expressao).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-causa-fk-rpc-pending-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

// ---- (a) caminhos FK com a chave certa (nome despido, como o regclass devolve)
const fks = await sql(`select c.conname as nome, cast(c.conrelid as regclass)::text as de,
  cast(c.confrelid as regclass)::text as para,
  (select string_agg(a.attname, ',' order by k.ord) from generate_subscripts(c.conkey, 1) as k(ord)
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[k.ord]) as colunas
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f' and n.nspname = 'public' order by 2, 3, 1`);
const caminhoDe = (a, b) => fks.filter((f) => f.de === a && f.para === b);
const paresTestados = [['guardian_students', 'profiles'], ['guardian_students', 'students'],
  ['supervision_requests', 'schools'], ['supervision_requests', 'sports_schools'],
  ['supervision_requests', 'profiles'], ['students', 'profiles']];
const caminhos = Object.fromEntries(paresTestados.map(([a, b]) => {
  const idas = caminhoDe(a, b), voltas = caminhoDe(b, a);
  return [`${a} -> ${b}`, { idas: idas.length, voltas: voltas.length, total: idas.length + voltas.length,
    fks_idas: idas.map((f) => `${f.nome}(${f.colunas})`), fks_voltas: voltas.map((f) => `${f.nome}(${f.colunas})`) }];
}));
// fixture da regua corrigida: um par que o PostgREST NAO reporta como ambiguo deve dar 1 caminho,
// e o proprio par que PGRST201 denuncia deve dar >1 — sem esta dupla face o 0 da peca 5 passou.
const unicos = paresTestados.filter(([a, b]) => caminhoDe(a, b).length + caminhoDe(b, a).length === 1).map(([a, b]) => `${a} -> ${b}`);
const ambigos = paresTestados.filter(([a, b]) => caminhoDe(a, b).length + caminhoDe(b, a).length > 1).map(([a, b]) => `${a} -> ${b}`);
const maisDeUmaParaProfiles = fks.filter((f) => f.para === 'profiles')
  .reduce((m, f) => ((m[f.de] = (m[f.de] || 0) + 1), m), {});
const tabelasComDuasFksParaProfiles = Object.entries(maisDeUmaParaProfiles).filter(([, n]) => n > 1).map(([t]) => t);

// ---- (b) a superficie RPC do anon e a guarda (ou ausencia dela) nos agregados municipais
const FUNCOES = await sql(`select p.oid, p.proname as nome, p.prosecdef as definer, p.provolatile as volatil,
  p.pronargs::int as argumentos, pg_get_function_result(p.oid) as resultado, pg_get_functiondef(p.oid) as corpo
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE') order by 1`);
const ESCRITA = /\b(insert\s+into|update\s+|delete\s+from|truncate\s|create\s+table|alter\s+table|grant\s|revoke\s|copy\s)/i;
const semEscrita = (c) => !ESCRITA.test((c || '').replace(/--[^\n]*/g, ''));
const chamaveisSemArg = FUNCOES.filter((f) => f.argumentos === 0 && /[is]/.test(f.volatil) && !/trigger/.test(f.resultado || ''));
const devolvemTabela = FUNCOES.filter((f) => /^TABLE\(/i.test(f.resultado || ''));
const GUARDA = /bfr_is_municipal_authority|bfr_has_municipal_grant|auth\.uid\(\)|current_setting\(/;
const municipais = FUNCOES.filter((f) => /municipal/.test(f.nome)).map((f) => ({
  nome: f.nome, argumentos: f.argumentos, resultado: f.resultado, definer: f.definer,
  bytes_corpo: (f.corpo || '').length,
  corpo_referencia_guarda_de_sessao: GUARDA.test(f.corpo || ''),
  guarda_especifica: [...new Set((f.corpo || '').match(/bfr_is_municipal_authority|bfr_has_municipal_grant|auth\.uid\(\)|current_setting\([^)]*\)/g) || [])],
  escrita_no_corpo: !semEscrita(f.corpo),
}));

// ---- (c) quem escreve `pending`
const defaultPapel = await sql(`select column_name as coluna, column_default as default, data_type as tipo
  from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('role','status')`);
const gatilhos = await sql(`select t.tgname as nome, cast(c.relname as text) as tabela,
  pg_get_triggerdef(t.oid) as definicao, p.proname as funcao
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and cast(c.relname as text) in ('profiles','auth.users') order by 2, 1`);
const corpoHU = await sql(`select p.proname as nome, pg_get_functiondef(p.oid) as corpo, p.prosecdef as definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public','auth') and p.proname in ('handle_new_user','handle_new_user_trigger')`);
const huResumo = corpoHU.map((f) => ({
  esquema_de_facto: f.nome, definer: f.definer, anon_execute: f.anon, bytes_corpo: (f.corpo || '').length,
  escreve_role: /\brole\b\s*[=,]|\(\s*id\s*,\s*role|insert[\s\S]{0,200}profiles/i.test(f.corpo || ''),
  menciona_pending: /pending/i.test(f.corpo || ''),
  expressoes_pending: [...new Set((f.corpo || '').match(/[^\n]*pending[^\n]*/gi) || [])].map((s) => s.trim().slice(0, 120)),
  coalesce_de_metadata: /coalesce\([^)]*raw_user_meta_data/i.test(f.corpo || ''),
}));
if (!corpoHU.length) throw new Error('ABORTA: nao foi encontrada a funcao de criação de perfil — a causa do pending nao pode ser atribuída');

const out = {
  em: new Date().toISOString(),
  metodo: 'SELECTs de catalogo; zero chamada RPC nesta peca; zero escrita; corpo de funcao lido só em resumo (bytes e expressoes que mencionam pending)',
  pen28_caminhos_fk: {
    total_fk_public: fks.length,
    pares: caminhos,
    fixture: { pares_com_um_caminho: unicos, pares_com_mais_de_um: ambigos },
    corrigido: 'a peca 5 comparava com prefixo public.; cast(oid as regclass)::text devolve o nome despido',
    tabelas_com_duas_ou_mais_fks_para_profiles: tabelasComDuasFksParaProfiles,
  },
  pen22_rpc: {
    funcoes_com_anon_execute: FUNCOES.length,
    chamaveis_sem_argumentos: chamaveisSemArg.map((f) => f.nome),
    n_chamaveis_sem_argumentos: chamaveisSemArg.length,
    devolvem_tabela: devolvemTabela.map((f) => f.nome),
    n_devolvem_tabela: devolvemTabela.length,
    municipais,
  },
  pen13_causa: { default_prole: defaultPapel, gatilhos, handle_new_user: huResumo },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`(a) fk_public=${fks.length}`);
for (const [k, v] of Object.entries(caminhos)) console.log(`    ${k}: idas=${v.idas} voltas=${v.voltas} total=${v.total} [${v.fks_idas.join(',')}]`);
console.log(`    fixture: um_caminho=[${unicos.join(',')}] mais_de_um=[${ambigos.join(',')}]`);
console.log(`    tabelas com >=2 FK para profiles: ${tabelasComDuasFksParaProfiles.length} (${tabelasComDuasFksParaProfiles.slice(0, 8).join(', ')}${tabelasComDuasFksParaProfiles.length > 8 ? ', …' : ''})`);
console.log(`(b) anon EXECUTE=${FUNCOES.length} · sem_argumentos=${chamaveisSemArg.length} · devolvem_tabela=${devolvemTabela.length}`);
for (const f of municipais) console.log(`    ${f.nome}: args=${f.argumentos} definer=${f.definer} tabela=${/^TABLE/i.test(f.resultado)} guarda_de_sessao=${f.corpo_referencia_guarda_de_sessao} expressoes=[${f.guarda_especifica.join(',')}] bytes=${f.bytes_corpo} escrita=${f.escrita_no_corpo}`);
console.log(`    chamaveis sem args: [${chamaveisSemArg.map((f) => f.nome).join(',')}]`);
console.log(`(c) default: ${JSON.stringify(defaultPapel)}`);
for (const t of gatilhos) console.log(`    gatilho ${t.tabela}.${t.nome} -> ${t.funcao} :: ${t.definicao.slice(0, 110)}`);
for (const f of huResumo) console.log(`    corpo ${f.esquema_de_facto}: definer=${f.definer} anon=${f.anon_execute} bytes=${f.bytes_corpo} escreve_role=${f.escreve_role} menciona_pending=${f.menciona_pending} metadata_coalesce=${f.coalesce_de_metadata}`);
for (const f of huResumo) for (const s of f.expressoes_pending) console.log(`      expressao: ${s}`);
console.log(`\nSM22_CAUSA_OK · registo evidence/sm22-varre-causa-fk-rpc-pending-18-11.json`);
