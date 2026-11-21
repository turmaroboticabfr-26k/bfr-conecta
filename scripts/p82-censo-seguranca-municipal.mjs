#!/usr/bin/env node
// P82 — CENSO SÓ-LEITURA DA SUPERFÍCIE MUNICIPAL (21/11, noite): «quem pode ver isto, e onde é que isso é decidido?»
// O usuário encontrou a entrada e pediu para tratar a segurança dela como extrema. A pergunta tem de ter resposta
// medida, não resposta de prosa: (1) que tabelas o painel servido lê, (2) se cada uma tem RLS ligado, (3) quantas
// políticas municipais existem hoje nelas, (4) se o predicado do backend existe e a quem pode executar, (5) se a
// tabela de concessões municipais existe e quantas linhas tem, (6) se o banner verde do ar publicado exige
// VERDADE ou só «a sonda correu sem erro». Zero escrita: SELECT-only, 0 DDL, 0 deploy, 0 publicação.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${EV}/p82-censo-seguranca-municipal-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const t0 = Date.now();

// ——— predicações puras, cada uma com o fixture que prova que discrimina ———
const temRlsLigado = (linha) => !!linha && (linha.rls === 'true' || linha.rls === true);
const ramoVerdeExigeVerdade = (linha) => /mun-ok/.test(linha) && (/===\s*true/.test(linha) || /\.data\s*===/.test(linha) || /verdadeiro/.test(linha));
const podeExecutar = (papeis, papel) => papeis.some((p) => p.papel === papel && p.pode === 'true');
const nomeMunicipal = (n) => /^bfr_(is_municipal_authority|has_municipal_grant|municipal)/.test(String(n));
if (temRlsLigado({ rls: 'true' }) !== true || temRlsLigado({ rls: 'false' }) !== false || temRlsLigado(null) !== false) throw new Error('ABORTA: temRlsLigado não discrimina no fixture');
if (ramoVerdeExigeVerdade("if (sonda.executavel) return '<div class=\"mun-ok\">x</div>'") !== false) throw new Error('ABORTA: ramoVerdeExigeVerdade aceita o ramo medido hoje (só executavel)');
if (ramoVerdeExigeVerdade("if (sonda.verdadeiro === true) return '<div class=\"mun-ok\">x</div>'") !== true) throw new Error('ABORTA: ramoVerdeExigeVerdade chumba o ramo que exige verdade');
if (podeExecutar([{ papel: 'anon', pode: 'false' }, { papel: 'authenticated', pode: 'true' }], 'anon') !== false || podeExecutar([{ papel: 'anon', pode: 'false' }, { papel: 'authenticated', pode: 'true' }], 'authenticated') !== true) throw new Error('ABORTA: podeExecutar não discrimina anon de authenticated no fixture');
if (nomeMunicipal('bfr_is_municipal_authority') !== true || nomeMunicipal('bfr_school_set_municipality') !== false) throw new Error('ABORTA: nomeMunicipal não discrimina os dois nomes no fixture');

if ((process.argv[3] || '').trim() === '--selfteste') {
  console.log('P82_SELFTESTE_OK 4/0 — temRlsLigado, ramoVerdeExigeVerdade, podeExecutar e nomeMunicipal discriminam nos fixtures (0 rede, 0 banco)');
  process.exit(0);
}

// ——— o ar: qual é o publicado, e o que o módulo servido faz ———
const porVersao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = porVersao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
if (!DIARIO) throw new Error('ABORTA: nenhum audit-publicacao-v*.json em ' + REPO);
const V = /v(\d+)/.exec(DIARIO)[1];
const PASTA = porVersao(new RegExp('^worker-deploy-v' + V + '(?!\\d)')).slice(-1)[0];
if (!PASTA) throw new Error('ABORTA: nenhum worker-deploy-v' + V + ' para o diário ' + DIARIO);
// O pacote v136 não traz HTML em public/ (o worker serve-o a partir do bundle); o HTML versionado é o da
// candidata. Censa-lo só vale se for byte a byte o que o ar publicado devolve — é o que a primeira régua prova.
const PASTA_CAND = porVersao(new RegExp('^bfr-candidata-v' + V + '(?!\\d)')).slice(-1)[0];
if (!PASTA_CAND) throw new Error('ABORTA: nenhum bfr-candidata-v' + V + ' — sem HTML para censar');
const FICHEIRO_AR = 'index.html';
if (!existsSync(`${REPO}/${PASTA_CAND}/${FICHEIRO_AR}`)) throw new Error('ABORTA: ' + PASTA_CAND + '/' + FICHEIRO_AR + ' não existe');
const AR_TXT = readFileSync(`${REPO}/${PASTA_CAND}/${FICHEIRO_AR}`, 'utf8');
const URL_AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
let SERVIDO = null;
try { const r = await fetch(URL_AR, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(60000) }); SERVIDO = md5(await r.text()); } catch (e) { SERVIDO = 'fetch_falhou: ' + String(e.message || e).slice(0, 90); }
const iniMod = AR_TXT.indexOf('<script data-bfr-municipal-module="1">');
if (iniMod === -1) throw new Error('ABORTA: ' + PASTA_CAND + '/' + FICHEIRO_AR + ' não traz o invólucro municipal');
const MOD = AR_TXT.slice(iniMod, AR_TXT.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD) || [])[1];
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
const TABELAS_LIDAS = [...new Set([...MOD.matchAll(/from\(\s*'([a-z_]+)'\)/g)].map((m) => m[1]))].sort();
const LINHA_RAMO_VERDE = MOD.split('\n').find((l) => /mun-ok/.test(l)) || null;
const CANDIDATA_DDL = `${REPO}/scripts/sm4-ddl-municipal-candidata.sql`;
const DDL_TXT = readFileSync(CANDIDATA_DDL, 'utf8');
const POLITICAS_CANDIDATAS = [...DDL_TXT.matchAll(/CREATE POLICY ([a-z0-9_]+)/g)].map((m) => m[1]).sort();
const FUNCOES_CANDIDATAS = [...new Set([...DDL_TXT.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?([a-z0-9_]+)/g)].map((m) => m[1]))].sort();
const MESAS_CANDIDATAS = [...new Set([...DDL_TXT.matchAll(/CREATE (?:TABLE|VIEW) (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/g)].map((m) => m[1]))].sort();
// Sem estas três listas lidas do DDL, os portões «nenhuma candidata falta» seriam vacuos — verde sem positivo
// possível é defeito do instrumento, não resultado do banco.
if (FUNCOES_CANDIDATAS.length === 0) throw new Error('ABORTA: 0 funções lidas do DDL — a regex partiu e o portão ficaria vacuo');
if (POLITICAS_CANDIDATAS.length === 0) throw new Error('ABORTA: 0 políticas lidas do DDL — a regex partiu e o portão ficaria vacuo');
if (MESAS_CANDIDATAS.length === 0) throw new Error('ABORTA: 0 mesas lidas do DDL — a regex partiu, o censo de concessões não teria onde cair');

// ——— o banco: SELECT-only ———
const q = (ts) => ts.map((t) => `'${t}'`).join(',');
const listaLidas = q(TABELAS_LIDAS);
const lista = q([...new Set([...TABELAS_LIDAS, ...MESAS_CANDIDATAS])]);
const rlsLidas = await sql(`select c.relname as tabela, c.relrowsecurity::text as rls, c.relforcerowsecurity::text as forca,
  (select count(*)::text from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as politicas_hoje
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind='r' and c.relname in (${listaLidas}) order by 1`);
const rlsCandidatas = await sql(`select c.relname as tabela, c.relrowsecurity::text as rls,
  (select count(*)::text from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as politicas_hoje
  from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind='r' and c.relname in (${q(MESAS_CANDIDATAS)}) order by 1`);
const politicasHoje = await sql(`select policyname as nome, tablename as tabela, cmd, permissive, array_to_string(roles, ',') as papeis,
  coalesce(qual,'') as qual, coalesce(with_check,'') as with_check
  from pg_policies where schemaname='public' and tablename in (${lista}) order by tablename, policyname`);
const nomesExistentes = await sql(`select p.proname as nome, p.prosecdef::text as definer, p.proowner::regrole::text as dono,
  coalesce(array_to_string(p.proacl,'|'),'NULL_POR_DEFAULT') as acl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  where p.proname in (${[...new Set([...FUNCOES_CANDIDATAS, 'bfr_is_municipal_authority'])].map((x) => `'${x}'`).join(',')}) order by 1`);
const grausPorPapel = await sql(`select p.proname as nome, r.rolname as papel, has_function_privilege(r.rolname, p.oid, 'EXECUTE')::text as pode
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  join pg_roles r on r.rolname in ('anon','authenticated','service_role','supabase_privileged_role')
  where p.proname in (${[...new Set([...FUNCOES_CANDIDATAS, 'bfr_is_municipal_authority'])].map((x) => `'${x}'`).join(',')}) order by 1,2`);
const regclasses = await sql(`select unnest(array[${MESAS_CANDIDATAS.map((t) => `'public.${t}'`).join(',')}]) as mesa,
  to_regclass(unnest(array[${MESAS_CANDIDATAS.map((t) => `'public.${t}'`).join(',')}]))::text as existe`);
let concessoes = null;
const mesaConcessoes = MESAS_CANDIDATAS.find((t) => /access_grants/.test(t)) || null;
// to_regclass devolve o nome (sem esquema) quando a mesa existe e NULL quando não existe — os dois lados do
// fixture abaixo garantem que o portão «a mesa de concessões existe» pode ficar vermelho.
const existeMesa = (regclasses, nome) => regclasses.some((r) => r.mesa === 'public.' + nome && typeof r.existe === 'string' && r.existe !== 'null');
if (existeMesa([{ mesa: 'public.x', existe: 'x' }, { mesa: 'public.y', existe: null }], 'y') !== false || existeMesa([{ mesa: 'public.x', existe: 'x' }], 'x') !== true) throw new Error('ABORTA: existeMesa não discrimina null de nome no fixture');
if (mesaConcessoes && existeMesa(regclasses, mesaConcessoes)) {
  const cols = await sql(`select column_name as coluna, data_type as tipo from information_schema.columns
    where table_schema='public' and table_name='${mesaConcessoes}' order by ordinal_position`);
  const contagem = await sql(`select count(*)::text as linhas from public.${mesaConcessoes}`);
  concessoes = { mesa: mesaConcessoes, colunas: cols, linhas: contagem[0] ? contagem[0].linhas : null };
}
const corpoPredicado = await sql(`select pg_get_functiondef(p.oid) as corpo from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where p.proname='bfr_is_municipal_authority' limit 1`);
const mesaAuditoria = MESAS_CANDIDATAS.find((t) => /audit/.test(t)) || null;
let linhasAuditoria = null;
if (mesaAuditoria && existeMesa(regclasses, mesaAuditoria))
  linhasAuditoria = (await sql(`select count(*)::text as linhas from public.${mesaAuditoria}`))[0]?.linhas ?? null;

const nomesExistentesSet = new Set(nomesExistentes.map((f) => f.nome));
const politicasExistentesSet = new Set(politicasHoje.map((p) => p.nome));
const faltamFuncoes = FUNCOES_CANDIDATAS.filter((n) => !nomesExistentesSet.has(n));
const faltamPoliticas = POLITICAS_CANDIDATAS.filter((n) => !politicasExistentesSet.has(n));
const mesasSemRls = rlsLidas.filter((r) => !temRlsLigado(r)).map((r) => r.tabela);
const lidasSemRls = TABELAS_LIDAS.filter((t) => !rlsLidas.some((r) => r.tabela === t));

const falhas = []; const portoes = [];
const g = (nome, cond, detalhe) => { const v = !!cond; portoes.push({ nome, verde: v, detalhe }); if (!v) falhas.push(`${nome} | dado=${JSON.stringify(detalhe).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('o_html_censado_e_byte_a_byte_o_ar_publicado', SERVIDO === md5(AR_TXT), { diario: DIARIO, pasta_deploy: PASTA, censado: PASTA_CAND + '/' + FICHEIRO_AR, md5_censado: md5(AR_TXT), md5_servido: SERVIDO });
g('todas_as_mesas_lidas_pelo_ar_existem_no_censo_de_RLS', lidasSemRls.length === 0, { lidas: TABELAS_LIDAS, sem_censo: lidasSemRls });
g('nenhuma_mesa_lida_pelo_painel_esta_com_RLS_desligado', mesasSemRls.length === 0, { mesas_sem_rls: mesasSemRls, censo: rlsLidas.map((r) => r.tabela + ':' + r.rls) });
g('o_predicado_municipal_existe_no_banco', nomesExistentesSet.has('bfr_is_municipal_authority'), { existentes: nomesExistentes.map((f) => f.nome) });
g('o_predicado_nao_e_executavel_por_anon', !podeExecutar(grausPorPapel.filter((x) => x.nome === 'bfr_is_municipal_authority'), 'anon'), { graus: grausPorPapel.filter((x) => x.nome === 'bfr_is_municipal_authority') });
g('a_tabela_de_concessoes_municipais_existe', !!concessoes, { regclasses, mesa_procurada: mesaConcessoes });
g('nenhuma_funcao_candidata_SM4_falta_no_banco', faltamFuncoes.length === 0, { faltam: faltamFuncoes, candidatas: FUNCOES_CANDIDATAS.length });
g('nenhuma_politica_candidata_SM4_falta_no_banco', faltamPoliticas.length === 0, { faltam: faltamPoliticas.slice(0, 18), candidatas: POLITICAS_CANDIDATAS.length, existentes_na_superficie: politicasHoje.length });
g('o_bundle_que_abre_o_painel_escreve_no_registro_de_acesso', /bfr_municipal_audit/.test(MOD), { mesa_no_banco: mesaAuditoria, linhas_na_mesa: linhasAuditoria, bytes_do_modulo: MOD.length, nota: 'procura no bundle servido por qualquer referência à mesa de auditoria municipal' });
g('o_banner_verde_do_ar_exige_verdade_do_backend', ramoVerdeExigeVerdade(LINHA_RAMO_VERDE || ''), { linha: LINHA_RAMO_VERDE });

const out = {
  programa: 'scripts/p82-censo-seguranca-municipal.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'quem decide hoje quem vê a Secretaria Municipal, o que o painel lê, e o que falta para o backend (e não o bundle) ser o porteiro?',
  metodo: 'SELECT-only via o mesmo canal de censo do catálogo usado em PEN-43/PEN-44; as tabelas, o banner e o predicado são lidos dos bytes do ar publicado (mais novo diário), nunca dactilografados. Zero DDL, zero escrita, zero publicação.',
  ar: { diario: DIARIO, versao: V, pasta_deploy: PASTA, pasta_censada: PASTA_CAND, ficheiro: FICHEIRO_AR, md5_ar: md5(AR_TXT), md5_servido: SERVIDO, bytes_modulo: MOD.length, sect: SECT, papeis_municipais_no_bundle: PAPEIS_MUN },
  painel_le: { tabelas: TABELAS_LIDAS, rls_censo: rlsLidas, rls_das_mesas_candidatas: rlsCandidatas, politicas_nas_mesas_do_universo: politicasHoje.length, nomes_das_politicas_municipais_hoje: politicasHoje.filter((p) => /municipal/.test(p.nome)).map((p) => p.tabela + '/' + p.nome + ':' + p.cmd) },
  bundle_decide_visibilidade: { linha_do_ramo_verde: LINHA_RAMO_VERDE, exige_verdade: ramoVerdeExigeVerdade(LINHA_RAMO_VERDE || ''), nota: 'a visibilidade vem de PAPEIS_MUNICIPAIS no bundle; o backend é consultado mas não é a porta' },
  banco: { funcoes_candidatas: FUNCOES_CANDIDATAS, funcoes_existentes: nomesExistentes.map((f) => f.nome + '|definer=' + f.definer + '|dono=' + f.dono), graus_por_papel: grausPorPapel, predicado_corpo: corpoPredicado[0] ? String(corpoPredicado[0].corpo).slice(0, 2400) : null, concessoes, mesa_auditoria: mesaAuditoria, linhas_auditoria: linhasAuditoria, regclasses },
  candidata_sm4: { ficheiro: 'scripts/sm4-ddl-municipal-candidata.sql', bytes: DDL_TXT.length, politicas: POLITICAS_CANDIDATAS, faltam_politicas: faltamPoliticas, faltam_funcoes: faltamFuncoes, mesas: MESAS_CANDIDATAS },
  o_que_este_verde_nao_autoriza: 'Nada. Esta peça não aplica DDL, não publica ar, não concede acesso a ninguém: mede o estado. A decisão de aplicar a candidata SM4 (PEN-41) ou de corrigir o banner do bundle continua a pedir OK literal.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P82_CENSO_SEGURANCA_MUNICIPAL_OK' : `P82_CENSO_SEGURANCA_MUNICIPAL_VERMELHO ${falhas.length}`;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`tabelas_lidas=${TABELAS_LIDAS.length} politicas_nestas_mesas=${politicasHoje.length} funcoes_candidatas=${FUNCOES_CANDIDATAS.length} faltam_funcoes=${faltamFuncoes.length} faltam_politicas=${faltamPoliticas.length} concessoes=${concessoes ? concessoes.linhas + ' linhas' : 'mesa inexistente'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.split('/').pop()}`);
process.exit(falhas.length ? 1 : 0);
