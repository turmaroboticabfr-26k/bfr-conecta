#!/usr/bin/env node
// P73-PEN38-PREFLIGHT — só leitura, e existe para este ficheiro não ter de confiar na minha memória sobre o
// banco. A candidata `scripts/p73-pen38-ddl-candidata.sql` substitui um predicado, cria uma policy e duas
// funções; cada uma dessas acções é irrecuperável por suposição (DROP POLICY de uma policy que já foi
// substituída apaga a que estava lá, e CREATE FUNCTION sobre uma existente rebenta a transacção a meio).
// Então: nada do que a candidata afirma sobre o estado vivo fica escrito em prosa no SQL — é medido aqui, e
// o verde deste programa é condição necessária (não suficiente) para o OK de aplicação.
// Uso: node scripts/p73-pen38-preflight.mjs            (modo candidata)
//      node scripts/p73-pen38-preflight.mjs --reversao (modo reversão: exige o estado de SAÍDA da candidata)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDeCreateFunction } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen38-preflight-${MODO}-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const ficheiroCand = readFileSync(join(REPO, 'scripts/p73-pen38-ddl-candidata.sql'));
const ficheiroRev = readFileSync(join(REPO, 'scripts/p73-pen38-ddl-reversao.sql'));
const pegada = (b) => ({ bytes: b.length, md5: createHash('md5').update(b).digest('hex') });

// As assinaturas que estes portoes procuram leem-se dos CREATE FUNCTION dos ficheiros que as declaram, nao de
// o que eu dactilografo: uma agulha escrita a mao contra uma build que devolve os nomes dos parametros da
// funcao e um portao sem positivo possivel (foi assim que a PEN-38 aplicada deu conferencia vermelha em 20/11).
const ficheiroSm4 = readFileSync(join(REPO, 'scripts/sm4-ddl-municipal-candidata.sql'));
const assinaturaDe = (texto, nome, quem) => {
  const t = tiposDeCreateFunction(texto, nome);
  if (!t) throw new Error('ABORTA: ' + nome + ' nao tem CREATE FUNCTION legivel em ' + quem + ' — a regua nao pode ser suposicao.');
  return t;
};
const SQL_CAND = ficheiroCand.toString('utf8');
const ASS_SET = assinaturaDe(SQL_CAND, 'bfr_school_set_municipality', 'scripts/p73-pen38-ddl-candidata.sql');
const ASS_DIAG = assinaturaDe(SQL_CAND, 'bfr_municipal_scope_diagnostico', 'scripts/p73-pen38-ddl-candidata.sql');
const ASS_ESCOPO = assinaturaDe(ficheiroSm4.toString('utf8'), 'bfr_school_in_municipal_scope', 'scripts/sm4-ddl-municipal-candidata.sql');

const POLIT = `select po.polname, pg_get_expr(po.polqual, po.polrelid) as qual, pg_get_expr(po.polwithcheck, po.polrelid) as chk
  from pg_policy po join pg_class c on c.oid = po.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname = 'schools' order by po.polname`;
const policies = await sql(POLIT);
const tem = (nome) => policies.some((p) => p.polname === nome);
const qualDe = (nome) => (policies.find((p) => p.polname === nome) || {}).qual || '';

const FUNCS = ['bfr_school_in_municipal_scope', 'bfr_is_platform_admin', 'bfr_is_municipal_authority', 'bfr_municipal_municipalities', 'bfr_school_set_municipality', 'bfr_municipal_scope_diagnostico'];
const funcs = await sql(`select p.proname as nome, pg_get_function_identity_arguments(p.oid) as argumentos,
    pg_get_userbyid(p.proowner)::text as dono, p.prosecdef::text as definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in (${FUNCS.map((f) => `'${f}'`).join(',')}) order by 1`);
const ftem = (nome, tipos = null) => funcs.some((f) => f.nome === nome && assinaturaCorresponde(tipos, f.argumentos));

const colunas = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nullavel
  from information_schema.columns
  where table_schema='public' and (
    (table_name='schools' and column_name in ('municipality_id','id')) or
    (table_name='bfr_municipal_audit' and column_name in ('actor','action','entity','entity_id','detail')) or
    (table_name='bfr_school_key_map' and column_name in ('matched_by','confirmed_by')) or
    (table_name='bfr_municipalities' and column_name in ('id'))
  ) order by 1,2`);
const temColuna = (t, c) => colunas.some((x) => x.tabela === t && x.coluna === c);

const [ctx] = await sql('select current_user as utilizador, session_user as sessao');
const rlsAudit = await sql(`select c.relname as mesa, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls,
    pg_get_userbyid(c.relowner)::text as dono from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname='public'
  where c.relname in ('bfr_municipal_audit','schools') order by 1`);

const [num] = await sql(`select
  (select count(*)::int from public.bfr_municipal_access_grants where revoked_at is null) as concessoes_ativas,
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.schools) as escolas,
  (select count(*)::int from public.schools where municipality_id is not null) as escolas_com_municipio,
  (select count(*)::int from public.bfr_school_key_map where matched_by='mesmo_id' or confirmed_by is not null) as pontes_confirmadas,
  (select count(*)::int from public.bfr_municipalities where name ilike '%fixture%' or name ilike '%apagar%') as municipios_de_fixture`);

const anterior = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen38-alcance-por-concessao-20-11e.json'), 'utf8'));
const c20 = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));

const cand = {
  'policy_a_existe_e_tem_o_predicado_que_a_candidata_substitui': tem('schools_municipal_read') && qualDe('schools_municipal_read').includes('bfr_is_municipal_authority'),
  'policy_b_nao_existe_ainda': !tem('schools_platform_admin_read'),
  'rpc_de_etiquetagem_nao_existe_ainda': !ftem('bfr_school_set_municipality', ASS_SET),
  'rpc_de_diagnostico_nao_existe_ainda': !ftem('bfr_municipal_scope_diagnostico', ASS_DIAG),
};
const rev = {
  'policy_a_ja_aponta_para_o_escopo': tem('schools_municipal_read') && qualDe('schools_municipal_read').includes('bfr_school_in_municipal_scope'),
  'policy_b_la_esta': tem('schools_platform_admin_read'),
  'rpc_de_etiquetagem_la': ftem('bfr_school_set_municipality', ASS_SET),
  'rpc_de_diagnostico_la': ftem('bfr_municipal_scope_diagnostico', ASS_DIAG),
};
const esperadoEstado = MODO === 'candidata' ? cand : rev;

// A estrutura do ficheiro que esta peça certifica conta-se ao ficheiro, não à minha memória do que escrevi:
// se alguém editar a candidata sem mexer aqui, o verde deixa de descrever o SQL que vai ser aplicado.
const contasSql = (buf) => {
  const t = buf.toString('utf8');
  const c = (re) => (t.match(re) || []).length;
  return { transaccao: (t.match(/^BEGIN;/gm) || []).length + (t.match(/^COMMIT;/gm) || []).length,
    drop_policy: c(/^\s*DROP POLICY /gmi), create_policy: c(/^\s*CREATE POLICY /gmi),
    create_function: c(/^\s*CREATE FUNCTION /gmi), drop_function: c(/^\s*DROP FUNCTION /gmi),
    grant_execute: c(/^\s*GRANT EXECUTE/gmi), revoke: c(/^\s*REVOKE/gmi),
    insert_em_trilha: c(/^\s*INSERT INTO/gmi) };
};
const estruturaCand = contasSql(ficheiroCand);
const estruturaRev = contasSql(ficheiroRev);
const EXPECT_CAND = { transaccao: 2, drop_policy: 1, create_policy: 2, create_function: 2, drop_function: 0, grant_execute: 2, revoke: 2, insert_em_trilha: 1 };
const EXPECT_REV = { transaccao: 2, drop_policy: 2, create_policy: 1, create_function: 0, drop_function: 2, grant_execute: 0, revoke: 0, insert_em_trilha: 0 };

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('estado_vivo_bate_com_o_que_este_modo_pressupoe', Object.entries(esperadoEstado).every(([k, v]) => v === true), esperadoEstado),
  g('os_predicados_que_a_candidata_chama_existem', ftem('bfr_school_in_municipal_scope', ASS_ESCOPO) && ftem('bfr_is_platform_admin') && ftem('bfr_is_municipal_authority') && ftem('bfr_municipal_municipalities'), funcs.map((f) => `${f.nome}(${f.argumentos}) definer=${f.definer} dono=${f.dono}`)),
  g('a_coluna_de_municipio_existe_e_e_uuid', temColuna('schools', 'municipality_id') && colunas.some((x) => x.tabela === 'schools' && x.coluna === 'municipality_id' && x.tipo === 'uuid'), colunas.filter((x) => x.tabela === 'schools')),
  g('a_mesa_da_trilha_tem_as_colunas_que_o_rpc_escreve', ['actor', 'action', 'entity', 'entity_id', 'detail'].every((c) => temColuna('bfr_municipal_audit', c)), colunas.filter((x) => x.tabela === 'bfr_municipal_audit')),
  g('o_insert_da_trilha_dentro_de_um_definer_e_o_que_o_catalogo_diz', (() => { const a = rlsAudit.find((r) => r.mesa === 'bfr_municipal_audit'); return !!a && a.dono === ctx.utilizador && a.rls === true && a.force_rls === false; })(), { ctx, audit: rlsAudit.find((r) => r.mesa === 'bfr_municipal_audit') || null, nota: 'o bloco C escreve em bfr_municipal_audit dentro duma SECURITY DEFINER: só escapa ao RLS se o dono da funcao (quem a criar) for o dono da mesa e o RLS da mesa não estiver FORCED — medido, não assumido' }),
  g('nenhuma_policy_de_escolas_vai_ser_apagada_por_acaso', policies.filter((p) => p.polname.startsWith('schools_')).length === (MODO === 'candidata' ? 2 : 3), { lidas: policies.map((p) => `${p.polname} :: ${String(p.qual).slice(0, 60)}`), esperadas_neste_modo: MODO === 'candidata' ? 2 : 3 }),
  g('a_estrutura_da_candidata_e_a_estrutura_da_reversao_sao_as_certificadas', JSON.stringify(estruturaCand) === JSON.stringify(EXPECT_CAND) && JSON.stringify(estruturaRev) === JSON.stringify(EXPECT_REV), { medida_candidata: estruturaCand, certificada_candidata: EXPECT_CAND, medida_reversao: estruturaRev, certificada_reversao: EXPECT_REV }),
  g('os_numeros_batem_com_a_medida_de_alcance_de_hoje', num.concessoes_ativas === anterior.estado_municipal.concessoes_ativas && num.escolas === anterior.estado_municipal.escolas_totais && num.escolas_com_municipio === anterior.estado_municipal.escolas_com_municipio, { agora: num, alcance: anterior.estado_municipal }),
  g('os_numeros_batem_com_o_censo_de_policies_de_hoje', num.concessoes_ativas === c20.agregados.concessoes_ativas && num.municipios === c20.agregados.municipios_cadastrados && num.escolas_com_municipio === c20.agregados.escolas_com_municipality_id, { agora: num, censo: c20.agregados }),
  g('a_candidata_e_a_reversao_estao_em_disco_com_pegada', ficheiroCand.length > 4000 && ficheiroRev.length > 800, { candidata: pegada(ficheiroCand), reversao: pegada(ficheiroRev) }),
];

const out = {
  programa: 'scripts/p73-pen38-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pressuposto: MODO === 'candidata' ? 'a candidata ainda não foi aplicada e o predicado vivo de `schools_municipal_read` é o medido em 20/11' : 'a candidata foi aplicada; esta corrida afirma o estado de saída dela',
  contexto: ctx,
  policies_schools: policies,
  funcoes: funcs,
  colunas: colunas,
  rls_mesas: rlsAudit,
  numeros: num,
  ficheiros: { candidata: { caminho: 'scripts/p73-pen38-ddl-candidata.sql', ...pegada(ficheiroCand) }, reversao: { caminho: 'scripts/p73-pen38-ddl-reversao.sql', ...pegada(ficheiroRev) } },
  estrutura: { candidata: estruturaCand, certificada_candidata: EXPECT_CAND, reversao: estruturaRev, certificada_reversao: EXPECT_REV },
  assinaturas_certificadas: { origem_das_agulhas: 'CREATE FUNCTION lidos de scripts/p73-pen38-ddl-candidata.sql e scripts/sm4-ddl-municipal-candidata.sql', bfr_school_set_municipality: ASS_SET, bfr_municipal_scope_diagnostico: ASS_DIAG, bfr_school_in_municipal_scope: ASS_ESCOPO },
  portoes, falhas,
  precedentes: ['evidence/p73-politicas-municipais-20-11e.json', 'evidence/p73-pen38-alcance-por-concessao-20-11e.json'],
  o_que_este_verde_nao_autoriza: 'nada. A aplicação do SQL continua a pedir OK literal novo; este programa só diz que o estado vivo é aquele contra que a candidata foi escrita.',
};
out.veredito = falhas.length === 0 ? `P73_PEN38_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0` : `P73_PEN38_PREFLIGHT_VERMELHO_${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN38_PREFLIGHT_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`MODO ${MODO} · contexto ${JSON.stringify(ctx)} · numeros ${JSON.stringify(num)}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`  pegada candidata ${out.ficheiros.candidata.md5} ${out.ficheiros.candidata.bytes} B · reversao ${out.ficheiros.reversao.md5} ${out.ficheiros.reversao.bytes} B`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
