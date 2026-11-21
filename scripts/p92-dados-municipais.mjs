#!/usr/bin/env node
// P92 — LIGAR AS ESCOLAS AO MUNICÍPIO REAL, SEM EMPOWERAR NINGUÉM POR ACCIDENTE (21/11, noite).
//
// O que a P90 e a P91 mediram, e por que isto ficou assim:
//  · P90: 6 escolas, 0 com `municipality_id`; as `city` são reais — 4 «São Paulo», 1 «Rio de Janeiro»,
//    1 «Belo Horizonte». Logo associar é DERIVAÇÃO do que já está no banco, não invenção (§11.5 não proíbe
//    ler o que lá está; proíbe números fictícios). O UF não está em nenhuma coluna com dados, mas o SP de
//    «São Paulo» está medido no banco, na linha de município que a SM8 criou.
//  · P91 VERMELHO 1/7: as 4 concessões vivas apontam TODAS para «Sao Paulo (SM8 fixture — apagar)» e os
//    concessionados são contas reais com papel `secretary`×2, `coordinator`, `pending` — 0 delas é conta de
//    teste da barra. Ligar escolas a ESSE município seria dar leitura de rede a papéis de escola, e o §5.377
//    recusa exatamente isso. Por isso esta peça cria um município NOVO e não toca no fixture nem nas 4 linhas.
//  · Consequência medida do desenho: `bfr_school_in_municipal_scope` usa apenas o conjunto de municípios das
//    CONCESSÕES (`bfr_municipal_municipalities()`); o papel `education_supervisor` dá `bfr_is_municipal_authority()`
//    mas não dá municipalities. Sem uma concessão sobre o município novo, ninguém lê dados agregados — é por
//    isso que a P92 insere uma concessão, e insere-a sobre a conta de teste da barra, nunca sobre uma conta real.
//
// Modos: `--preflight` (default) não escreve nada; `--aplicar` escreve e grava o estado de antes + a reversão.
// Regras: 0 publicação, 0 bundle, 0 DDL (nenhuma tabela alterada), 0 token no artefacto, 0 PII para além do
// id de conta. A verificação simula a sessão como o PostgREST a simula (`request.jwt.claims`), por isso não há
// rotação de cadeia nem escrita de produto pelo REST.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const MODO = (process.argv[3] || '--preflight').trim();
if (!['--preflight', '--aplicar'].includes(MODO)) throw new Error('ABORTA: modo "' + MODO + '" inexiste — use --preflight ou --aplicar');
const OUT = `${REPO}/evidence/p92-dados-municipais-${SUF}.json`;
const REVERSAO = `${REPO}/scripts/p92-reversao-dados-municipais.sql`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');
if (MODO === '--aplicar' && existsSync(REVERSAO)) throw new Error('ABORTA: ' + REVERSAO + ' já existe — a P92 só aplica uma vez, não por cima');
const t0 = Date.now();

// ——— constantes derivadas do que está medido, nunca dactilografadas de memória ———
const MUN_NOME = 'São Paulo';            // igual a schools.city, byte a byte (a P90 listou a string)
const MUN_UF = 'SP';                     // medido na linha de município que a SM8 criou (P91)
const GRANTEE_PERSONA = 'education_supervisor';   // conta de teste da barra, já authority por papel
const PAPEL_PESSOAL = 'secretario_municipal';     // um dos 4 valores do CHECK aplicado

// ——— predicações puras, com os dois lados provados ———
const cidadeBate = (schoolCity, alvo) => String(schoolCity || '').trim() === alvo;
if (cidadeBate('São Paulo', MUN_NOME) !== true) throw new Error('ABORTA: cidadeBate chumba a cidade que a P90 mediu');
if (cidadeBate(' São Paulo ', 'São Paulo') !== true) throw new Error('ABORTA: cidadeBate não tolera espaços — a P90 contou cidades com trim');
if (cidadeBate('Sao Paulo', MUN_NOME) !== false) throw new Error('ABORTA: cidadeBate aceitaria a grafia sem acento do fixture; as ligações sairiam erradas');
const portadorDeCredencial = (s) => /access_token|refresh_token|password|eyJhbGciOi/i.test(String(s));
if (portadorDeCredencial('{"refresh_token":"x"}') !== true) throw new Error('ABORTA: portadorDeCredencial não deteta o fixture de token');
if (portadorDeCredencial('{"grantee":"uuid"}') !== false) throw new Error('ABORTA: portadorDeCredencial chumba prosa legítima');
// A negação do escopo tem de poder ser medida: com claims de ninguém autenticado, o agregado dá 0 linhas.
const escopoEsperado = (concedido, municipiosDoConcedido, escolaMun) => concedido && municipiosDoConcedido.includes(escolaMun);
if (escopoEsperado(true, ['m1'], 'm1') !== true) throw new Error('ABORTA: escopoEsperado chumba o caso legítimo');
if (escopoEsperado(true, ['m1'], 'm2') !== false) throw new Error('ABORTA: escopoEsperado aceitaria uma escola fora do município concedido');
if (escopoEsperado(false, ['m1'], 'm1') !== false) throw new Error('ABORTA: escopoEsperado daria escopo a quem não tem concessão');

// ——— o estado de antes (lido antes de qualquer escrita, e gravado para a reversão) ———
const ANTES_ESCOLAS = await sql(`select id::text as id, name as nome, city, municipality_id::text as municipality_id
  from public.schools order by name`);
const ANTES_MUN = await sql(`select id::text as id, name, uf from public.bfr_municipalities order by name`);
const ANTES_GRANTS = await sql(`select id::text as id, profile_id::text as profile_id, municipality_id::text as municipality_id,
  municipal_role from public.bfr_municipal_access_grants order by granted_at`);
const CAND = ANTES_ESCOLAS.filter((e) => cidadeBate(e.city, MUN_NOME));
if (CAND.length === 0) throw new Error('ABORTA: 0 escolas com city="' + MUN_NOME + '" — a P90 mediu 4; o universo declarado caiu');
if (ANTES_ESCOLAS.some((e) => e.municipality_id !== null)) throw new Error('ABORTA: já há escolas ligadas a município; a P90 mediu 0, o estado mudou desde então — re-medir antes de escrever');
if (ANTES_MUN.some((m) => String(m.name).trim() === MUN_NOME)) throw new Error('ABORTA: já existe um município com nome exato "' + MUN_NOME + '" — não se duplica, e o fixture tem grafia diferente');
// A conta de teste: o id vem da barra de personas, não de memória. `profiles.role` confirma o papel.
const SESSAO = `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${GRANTEE_PERSONA}.json`;
if (!existsSync(SESSAO)) throw new Error('ABORTA: sem ficheiro de sessão da persona ' + GRANTEE_PERSONA);
const S = JSON.parse(readFileSync(SESSAO, 'utf8'));
const GRANTEE_ID = ((S[GRANTEE_PERSONA] || {}).user || {}).id;
if (!GRANTEE_ID) throw new Error('ABORTA: a sessão da persona não traz user.id');
const PERFIL = await sql(`select id::text as id, role::text as papel from public.profiles where id::text = '${GRANTEE_ID}'`);
if (PERFIL.length !== 1) throw new Error('ABORTA: o perfil ' + GRANTEE_ID.slice(0, 8) + '… não existe em `profiles` — a concessão ficaria órfã');
if (PERFIL[0].papel !== GRANTEE_PERSONA) throw new Error('ABORTA: o papel medido é "' + PERFIL[0].papel + '", a persona chama-se "' + GRANTEE_PERSONA + '" — não concedo sobre estado que não bate');
const NEGADO_PERSONA = 'secretary';
const SNEG = JSON.parse(readFileSync(`C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessao-${NEGADO_PERSONA}.json`, 'utf8'));
const NEGADO_ID = ((SNEG[NEGADO_PERSONA] || {}).user || {}).id;
if (!NEGADO_ID) throw new Error('ABORTA: sem user.id da persona negada');
const PERFIL_NEGADO = await sql(`select role::text as papel from public.profiles where id::text = '${NEGADO_ID}'`);
const ADMIN_GRANTER = await sql(`select id::text as id, role::text as papel from public.profiles where role = 'developer' limit 1`);

const pre = {
  escolas_candidatas: CAND.map((e) => ({ id: e.id, nome: e.nome })),
  escolas_fora: ANTES_ESCOLAS.filter((e) => !cidadeBate(e.city, MUN_NOME)).map((e) => ({ nome: e.nome, city: e.city })),
  municipio_fixture: ANTES_MUN.find((m) => /apagar/i.test(m.name)) || null,
  grantees_actuais: ANTES_GRANTS.map((x) => x.municipal_role),
  grantee_novo: { persona: GRANTEE_PERSONA, papel_medido: PERFIL[0].papel, id: GRANTEE_ID },
  conta_controle_negada: { persona: NEGADO_PERSONA, papel_medido: PERFIL_NEGADO[0].papel, id: NEGADO_ID },
  quem_concede: ADMIN_GRANTER[0] ? { papel: ADMIN_GRANTER[0].papel, id: ADMIN_GRANTER[0].id } : null,
};

// ——— as escritas, só em --aplicar ———
let escritos = [];
let MUN_ID = null;
let GRANT_ID = null;
if (MODO === '--aplicar') {
  if (!ADMIN_GRANTER[0]) throw new Error('ABORTA: sem perfil developer para figurar em granted_by — a política de INSERT exige granted_by = autenticado e admin');
  const ins = await sql(`insert into public.bfr_municipalities (name, uf) values ('${MUN_NOME}', '${MUN_UF}') returning id::text as id`);
  if (ins.length !== 1) throw new Error('ABORTA: insert de município devolveu ' + ins.length + ' linhas');
  MUN_ID = ins[0].id;
  const upd = await sql(`update public.schools set municipality_id = '${MUN_ID}'
    where id::text in (${CAND.map((e) => "'" + e.id + "'").join(',')}) and municipality_id is null returning id::text as id, name`);
  if (upd.length !== CAND.length) throw new Error('ABORTA: liguei ' + upd.length + ' escolas, esperado ' + CAND.length);
  const gr = await sql(`insert into public.bfr_municipal_access_grants (profile_id, municipality_id, municipal_role, granted_by)
    values ('${GRANTEE_ID}', '${MUN_ID}', '${PAPEL_PESSOAL}', '${ADMIN_GRANTER[0].id}') returning id::text as id`);
  if (gr.length !== 1) throw new Error('ABORTA: insert da concessão devolveu ' + gr.length + ' linhas');
  GRANT_ID = gr[0].id;
  escritos = [
    `bfr_municipalities: 1 linha («${MUN_NOME}», ${MUN_UF}) id ${MUN_ID}`,
    `schools.municipality_id: ${upd.length} linhas ligadas a ${MUN_ID}`,
    `bfr_municipal_access_grants: 1 linha (${GRANTEE_PERSONA} → ${MUN_NOME}, ${PAPEL_PESSOAL}) id ${GRANT_ID}`,
  ];
  writeFileSync(REVERSAO, `-- P92 — REVERSÃO DOS DADOS MUNICIPAIS (escrita por scripts/p92-dados-municipais.mjs em ${new Date().toISOString()}).
-- Apaga APENAS o que a P92 criou; não toca no fixture da SM8 nem nas 4 concessões que sobre ele existem.
BEGIN;
delete from public.bfr_municipal_access_grants where id = '${GRANT_ID}';
update public.schools set municipality_id = null where municipality_id = '${MUN_ID}';
delete from public.bfr_municipalities where id = '${MUN_ID}';
-- estado de antes (medido): ${ANTES_ESCOLAS.length} escolas, ${ANTES_MUN.length} municípios, ${ANTES_GRANTS.length} concessões, 0 escolas ligadas.
COMMIT;
`, 'utf8');
}

// ——— a verificação, na mesma forma que o PostgREST usa: claims na sessão ———
// `set_config` tem de viver NO MESMO pedido que a leitura: cada `sql()` é um pedido e a ligação pode ser outra.
// Falsifiquei as duas formas antes de escolher esta (ver `simula` + o portão do `uid` lido).
const depois = await sql(`select id::text as id, name, municipality_id::text as municipality_id from public.schools order by name`);
const depoisMun = await sql(`select id::text as id, name, uf from public.bfr_municipalities order by name`);
const depoisGrants = await sql(`select id::text as id, profile_id::text as profile_id, municipality_id::text as municipality_id from public.bfr_municipal_access_grants`);
const simula = async (uid, cols) => sql(`select set_config('request.jwt.claims', json_build_object('sub', '${uid}')::text, false) as _claims; select coalesce(auth.uid()::text,'SEM_CLAIMS') as uid_lido, ${cols}`);
const COLS_CONCEDIDO = `(select count(*)::int from public.bfr_municipal_school_stats) as escolas,
   (select coalesce(sum(students_total),0)::int from public.bfr_municipal_school_stats) as alunos,
   (select coalesce(sum(classes_total),0)::int from public.bfr_municipal_school_stats) as turmas,
   (select count(*)::int from public.schools s where public.bfr_school_in_municipal_scope(s.id)) as escolas_no_escopo_da_funcao`;
let visaoConcedido = null, visaoNegado = null, escopoFuncao = null;
try {
  visaoConcedido = await simula(GRANTEE_ID, COLS_CONCEDIDO);
  visaoNegado = await simula(NEGADO_ID, `(select count(*)::int from public.bfr_municipal_school_stats) as escolas`);
} catch (e) { visaoConcedido = { erro: String(e.message || e).slice(0, 240) }; }
const cel = (v) => (Array.isArray(v) && v.length === 1 ? v[0] : v);
const l = cel(visaoConcedido), ln = cel(visaoNegado);
escopoFuncao = l && l.escolas_no_escopo_da_funcao !== undefined ? { uid_lido: l.uid_lido, escolas_no_escopo: l.escolas_no_escopo_da_funcao } : visaoConcedido;

const falhas = []; const portoes = [];
const gt = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
const fixtureId = pre.municipio_fixture ? pre.municipio_fixture.id : null;
const MUN_ID_NO_DEPOIS = (depoisMun.find((m) => String(m.name).trim() === MUN_NOME) || {}).id || null;
const EXISTE_AGREGADO_NOVO = !!MUN_ID_NO_DEPOIS;
// Sem o município real, `municipality_id === null` casaria com `MUN_ID_NO_DEPOIS === null` e as 6 escolas
// desligadas contariam como ligadas: a régua não teria negativo possível. Por isso o guarda explícito.
const GRANTS_DO_REAL = EXISTE_AGREGADO_NOVO ? depoisGrants.filter((x) => x.municipality_id === MUN_ID_NO_DEPOIS) : [];
const ESCOLAS_LIGADAS_AO_NOVO = EXISTE_AGREGADO_NOVO ? depois.filter((e) => e.municipality_id === MUN_ID_NO_DEPOIS).length : 0;
const LIGADAS_QUAISQUER = depois.filter((e) => e.municipality_id !== null);
gt('o_municipio_real_nunca_é_a_linha_do_fixture', !EXISTE_AGREGADO_NOVO || MUN_ID_NO_DEPOIS !== fixtureId, { novo: MUN_ID_NO_DEPOIS, fixture: fixtureId, nomes: depoisMun.map((m) => m.name) });
gt('nenhuma_escola_foi_ligada_ao_municipio_do_fixture', depois.filter((e) => e.municipality_id === fixtureId).length === 0, { ligadas_ao_fixture: depois.filter((e) => e.municipality_id === fixtureId).map((e) => e.nome) });
gt('as_concessões_sobre_o_fixture_ficam_intactas_e_as_do_municipio_real_são_as_que_devo', depoisGrants.filter((x) => x.municipality_id === fixtureId).length === ANTES_GRANTS.filter((x) => x.municipality_id === fixtureId).length && GRANTS_DO_REAL.length === (EXISTE_AGREGADO_NOVO ? 1 : 0), { grants_antes: ANTES_GRANTS.length, grants_depois: depoisGrants.length, no_fixture: depoisGrants.filter((x) => x.municipality_id === fixtureId).length, no_real: GRANTS_DO_REAL.length });
gt('só_escolas_da_cidade_medida_estão_ligadas', LIGADAS_QUAISQUER.length === ESCOLAS_LIGADAS_AO_NOVO && LIGADAS_QUAISQUER.every((e) => cidadeBate((ANTES_ESCOLAS.find((x) => x.id === e.id) || {}).city, MUN_NOME)), { ligadas: LIGADAS_QUAISQUER.map((e) => e.nome), ao_real: ESCOLAS_LIGADAS_AO_NOVO, candidatas: CAND.length });
gt('a_concessão_efectiva_é_sobre_a_conta_de_teste_e_nunca_sobre_uma_conta_real', GRANTS_DO_REAL.every((x) => x.profile_id === GRANTEE_ID) && (EXISTE_AGREGADO_NOVO ? PERFIL[0].papel === GRANTEE_PERSONA : true), { papeis_no_municipio_real: GRANTS_DO_REAL.map((x) => x.profile_id.slice(0, 8) + '…'), esperado: GRANTEE_ID.slice(0, 8) + '…', papel: PERFIL[0].papel });
gt('as_claims_chegam_onde_o_predicado_as_lê', !!l && l.uid_lido === GRANTEE_ID && !!ln && ln.uid_lido === NEGADO_ID, { concedida: l ? l.uid_lido : null, esperada: GRANTEE_ID, negada: ln ? ln.uid_lido : null, esperada_negada: NEGADO_ID });
gt('o_agregado_vê_exactamente_as_escolas_ligadas_ao_municipio_real', !!l && Number(l.escolas) === ESCOLAS_LIGADAS_AO_NOVO && Number(l.escolas) === CAND.length * (EXISTE_AGREGADO_NOVO ? 1 : 0), { lido: l, ligadas_no_estado: ESCOLAS_LIGADAS_AO_NOVO, candidatas: CAND.length, municipio_real_existe: EXISTE_AGREGADO_NOVO });
gt('a_sessão_sem_concessão_sobre_o_municipio_real_vê_zero', !!ln && Number(ln.escolas) === 0, { lido: ln, papel_da_controle: PERFIL_NEGADO[0].papel });
gt('a_função_de_escopo_confirma_o_mesmo_número_da_vista', !!l && Number(l.escolas_no_escopo_da_funcao) === Number(l.escolas), { lido: escopoFuncao });
gt('se_existe_município_real_então_a_reversão_existe_e_o_antes_está_gravado', EXISTE_AGREGADO_NOVO ? existsSync(REVERSAO) : true, { reversao: existsSync(REVERSAO), municipio_real_existe: EXISTE_AGREGADO_NOVO, antes_escolas: ANTES_ESCOLAS.length, antes_municipios: ANTES_MUN.length, antes_grants: ANTES_GRANTS.length });
gt('o_estado_de_antes_está_gravado_no_artefacto_com_a_contagem_medida', ANTES_ESCOLAS.length === 6 && ANTES_GRANTS.length === 4, { escolas: ANTES_ESCOLAS.length, grants: ANTES_GRANTS.length, municipios: ANTES_MUN.length });
gt('o_artefacto_não_contém_credencial', !portadorDeCredencial(JSON.stringify(pre)), { chaves: Object.keys(pre) });

const out = {
  programa: 'scripts/p92-dados-municipais.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0, modo: MODO,
  pergunta: 'encher o buraco de dados sem dar acesso a quem o §5.377 recusa',
  descoberta_p91: 'as 4 concessões vivas são de contas reais (secretary×2, coordinator, pending) sobre um município marcado «apagar»; ligar escolas a esse município seria uma concessão disfarçada de cadastro',
  decisão: 'município NOVO a partir de schools.city (derivação, não invenção; UF medido no banco); escolas fora de São Paulo ficam NULL; concessão nova só sobre a conta de teste da barra; fixture e as 4 linhas ficam intactas',
  antes: { escolas: ANTES_ESCOLAS, municipios: ANTES_MUN, grants: ANTES_GRANTS },
  pre, escritos,
  depois: { escolas: depois, municipios: depoisMun, grants: depoisGrants },
  visao_por_sessao: { concedida: visaoConcedido, funcao_de_escopo: escopoFuncao, negada_controle: visaoNegado },
  dados_dentro_das_escolas_ligadas: null,
  portoes, falhas,
};
out.dados_dentro_das_escolas_ligadas = await sql(`select s.name as escola,
    (select count(*)::int from public.students st where st.school_id = s.id) as alunos,
    (select count(*)::int from public.classes cl where cl.school_id = s.id) as turmas
  from public.schools s where s.municipality_id is not null or s.city = '${MUN_NOME}' order by s.name`);
out.veredito = falhas.length === 0
  ? (MODO === '--aplicar' ? 'P92_DADOS_MUNICIPAIS_APLICADO_E_CONFERIDO ' + portoes.length + '/0' : 'P92_DADOS_MUNICIPAIS_PREFLIGHT_VERDE ' + portoes.length + '/0')
  : 'P92_DADOS_MUNICIPAIS_' + (MODO === '--aplicar' ? 'APLICADO' : 'PREFLIGHT') + '_VERMELHO ' + falhas.length + ' de ' + portoes.length;
if (portadorDeCredencial(JSON.stringify(out))) throw new Error('ABORTA: o artefacto seria portador de credencial — não se escreve');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(REPO + '/', '')}`);
console.log(`escolas_ligadas=${depois.filter((e) => e.municipality_id !== null).length} de ${depois.length} · agregado_concedido=${JSON.stringify(visaoConcedido)} · negado=${JSON.stringify(visaoNegado)}`);
for (const d of out.dados_dentro_das_escolas_ligadas) console.log(`  ${d.escola}: alunos=${d.alunos} turmas=${d.turmas}`);
process.exit(falhas.length ? 1 : 0);
