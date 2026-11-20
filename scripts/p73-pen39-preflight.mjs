#!/usr/bin/env node
// P73-PEN39-PREFLIGHT — só leitura, modos `candidata` (default) e `--reversao`. A candidata
// `scripts/p73-pen39-ddl-candidata.sql` cria duas funções que agrupam a vista `bfr_municipal_school_stats` e
// escrevem nome/UF a partir de `bfr_municipalities`. Cada um desses pressupostos é uma morte possível à aplicação:
// coluna que não existe parte o CREATE FUNCTION, e uma vista cujo WHERE é o predicado de escopo responde
// diferente conforme quem pergunta — logo «a função devolve o bucket NULL com 6» NÃO se prova por este caminho.
// O que aqui se mede é o que este caminho pode medir, e o que ele não pode medir fica escrito como tal.
// Uso: node scripts/p73-pen39-preflight.mjs            (modo candidata)
//      node scripts/p73-pen39-preflight.mjs --reversao (modo reversão: exige o estado de SAÍDA da candidata)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen39-preflight-${MODO}-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const ficheiroCand = readFileSync(join(REPO, 'scripts/p73-pen39-ddl-candidata.sql'));
const ficheiroRev = readFileSync(join(REPO, 'scripts/p73-pen39-ddl-reversao.sql'));
const sonda = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen39-sonda-uso-agregados-20-11e.json'), 'utf8'));
const censo = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));
const alcance = JSON.parse(readFileSync(join(REPO, 'evidence/p73-pen38-alcance-por-concessao-20-11e.json'), 'utf8'));
const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const pegada = (b) => ({ bytes: b.length, md5: md5(b) });

const NOMES = ['bfr_municipal_municipio_totais', 'bfr_municipal_distribuicao_por_zona'];
const funcs = await sql(`select p.proname as nome, pg_get_function_identity_arguments(p.oid) as argumentos,
    pg_get_userbyid(p.proowner)::text as dono, p.prosecdef::text as definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in (${NOMES.map((f) => `'${f}'`).join(',')}) order by 1`);
const laEsta = (nome) => funcs.some((f) => f.nome === nome);

const colunas = await sql(`select table_name as tabela, column_name as coluna, data_type as tipo
  from information_schema.columns where table_schema='public'
    and (table_name='bfr_municipal_school_stats' or (table_name='bfr_municipalities' and column_name in ('id','name','uf')))
  order by 1,2`);
const temColuna = (t, c) => colunas.some((x) => x.tabela === t && x.coluna === c);
const COLUNAS_DA_VISTA = ['municipality_id', 'zone', 'operating_status', 'students_total', 'classes_total'];
const FALTAM_VISTA = COLUNAS_DA_VISTA.filter((c) => !temColuna('bfr_municipal_school_stats', c));
const FALTAM_MUNICIPIOS = ['id', 'name', 'uf'].filter((c) => !temColuna('bfr_municipalities', c));

const [defVista] = await sql(`select md5(pg_get_viewdef('public.bfr_municipal_school_stats'::regclass, true)) as def_md5,
    length(pg_get_viewdef('public.bfr_municipal_school_stats'::regclass, true)) as def_chars`);
const defCensoMd5 = md5(censo.agregados.school_stats_viewdef);
const defTotaisCensoMd5 = md5(censo.agregados.network_totals_def);

const [num] = await sql(`select
  (select count(*)::int from public.schools) as escolas,
  (select count(*)::int from public.schools where municipality_id is null) as escolas_sem_municipio,
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.bfr_municipal_access_grants where revoked_at is null) as concessoes_ativas,
  (select count(*)::int from public.bfr_municipal_school_stats) as linhas_da_vista_por_esta_via`);
const [predicadoSemJwt] = await sql(`select public.bfr_is_platform_admin() as admin_por_esta_via`)
  .catch((e) => [{ admin_por_esta_via: null, erro: String(e.message || e).slice(0, 160) }]);

// O que a via deste programa (PAT, sem JWT de pedido) pode e não pode dizer sobre a promessa da candidata:
// a vista filtra pelo predicado, e o predicado pergunta pelo chamador. Logo o número desta via é uma
// coerência entre predicado e vista, NUNCA a prova do bucket NULL que a candidata promete ao admin real.
const coerente = (() => {
  if (predicadoSemJwt.erro) return false;
  if (predicadoSemJwt.admin_por_esta_via === true) return num.linhas_da_vista_por_esta_via === num.escolas;
  if (predicadoSemJwt.admin_por_esta_via === false) return num.linhas_da_vista_por_esta_via === 0;
  return false;
})();

const contasSql = (buf) => {
  const t = buf.toString('utf8');
  const c = (re) => (t.match(re) || []).length;
  return { transaccao: (t.match(/^BEGIN;/gm) || []).length + (t.match(/^COMMIT;/gm) || []).length,
    create_function: c(/^\s*CREATE FUNCTION /gmi), drop_function: c(/^\s*DROP FUNCTION /gmi),
    grant_execute: c(/^\s*GRANT EXECUTE/gmi), revoke: c(/^\s*REVOKE/gmi),
    comment_function: c(/^\s*COMMENT ON FUNCTION/gmi), create_view: c(/^\s*CREATE (?:OR REPLACE )?VIEW /gmi),
    drop_policy: c(/^\s*DROP POLICY /gmi), insert_em_trilha: c(/^\s*INSERT INTO/gmi) };
};
const estruturaCand = contasSql(ficheiroCand);
const estruturaRev = contasSql(ficheiroRev);
// Vectores certificados pela leitura dos ficheiros, com o controlo que prova que a régua dispara:
const EXPECT_CAND = { transaccao: 2, create_function: 2, drop_function: 0, grant_execute: 2, revoke: 2, comment_function: 2, create_view: 0, drop_policy: 0, insert_em_trilha: 0 };
const EXPECT_REV = { transaccao: 2, create_function: 0, drop_function: 2, grant_execute: 0, revoke: 0, comment_function: 0, create_view: 0, drop_policy: 0, insert_em_trilha: 0 };
const FIXTURE_PARTIDO = contasSql(Buffer.from('BEGIN;\nCREATE FUNCTION a() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\nDROP POLICY p ON t;\nGRANT EXECUTE ON FUNCTION a() TO authenticated;\nREVOKE ALL ON FUNCTION a() FROM PUBLIC;\nCOMMENT ON FUNCTION a() IS \'x\';\nCOMMIT;\n', 'utf8'));
const FIXTURE_BATE = FIXTURE_PARTIDO.transaccao === 2 && FIXTURE_PARTIDO.create_function === 1 && FIXTURE_PARTIDO.drop_function === 0
  && FIXTURE_PARTIDO.drop_policy === 1 && FIXTURE_PARTIDO.grant_execute === 1 && FIXTURE_PARTIDO.revoke === 1 && FIXTURE_PARTIDO.comment_function === 1;

const estado = MODO === 'candidata'
  ? { 'nenhuma_das_duas_funcoes_existe': !laEsta(NOMES[0]) && !laEsta(NOMES[1]) }
  : { 'as_duas_funcoes_estao_lá': laEsta(NOMES[0]) && laEsta(NOMES[1]) };

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('estado_vivo_bate_com_o_que_este_modo_pressupoe', Object.values(estado).every((v) => v === true), { modo: MODO, esperado: estado, lido: funcs.map((f) => `${f.nome}(${f.argumentos}) definer=${f.definer} dono=${f.dono}`) }),
  g('a_vista_expoe_as_colunas_que_as_funcoes_novas_seleccionam', FALTAM_VISTA.length === 0, { vistas: colunas.filter((x) => x.tabela === 'bfr_municipal_school_stats').map((x) => `${x.coluna}:${x.tipo}`), faltam: FALTAM_VISTA }),
  g('a_tabela_de_municipios_expoe_o_que_a_saida_pede', FALTAM_MUNICIPIOS.length === 0, { lidas: colunas.filter((x) => x.tabela === 'bfr_municipalities').map((x) => `${x.coluna}:${x.tipo}`), faltam: FALTAM_MUNICIPIOS, nota: 'o bloco A escreve nome e uf por subselect; `uf` em falta partiria o CREATE FUNCTION a meio da transaccao' }),
  g('a_definicao_viva_da_vista_e_a_que_o_censo_de_hoje_guardou', defVista.def_md5 === defCensoMd5 && defCensoMd5 !== defTotaisCensoMd5, { vista_viva_md5: defVista.def_md5, vista_censo_md5: defCensoMd5, chars_viva: defVista.def_chars, chars_censo: censo.agregados.school_stats_viewdef.length, controlo_funcao_de_totais_md5: defTotaisCensoMd5, nota: 'o terceiro termo é o controlo: se o censo gravou o mesmo texto nos dois campos, esta régua deixou de distinguir vista de função' }),
  g('predicado_e_vista_comportam_se_coherentemente_por_esta_via', coerente, { admin_por_esta_via: predicadoSemJwt.admin_por_esta_via, linhas_da_vista_por_esta_via: num.linhas_da_vista_por_esta_via, escolas: num.escolas, erro: predicadoSemJwt.erro || null, nota: 'via PAT sem JWT de pedido: se o predicado diz que quem lê não é admin, a vista tem de dar 0; se diz que é, tem de dar a rede toda. Qualquer outra combinação é o predicado a ignorar-se a si mesmo' }),
  g('o_bucket_que_a_candidata_promete_distinguir_esta_medido_na_tabela', num.escolas_sem_municipio === alcance.reais_sem_rls.schools - alcance.estado_municipal.escolas_com_municipio && num.escolas === alcance.reais_sem_rls.schools, { agora: { escolas: num.escolas, escolas_sem_municipio: num.escolas_sem_municipio }, do_artefacto_pen38: { schools: alcance.reais_sem_rls.schools, escolas_com_municipio: alcance.estado_municipal.escolas_com_municipio } }),
  g('os_numeros_batem_com_o_censo_de_policies_de_hoje', num.concessoes_ativas === censo.agregados.concessoes_ativas && num.municipios === censo.agregados.municipios_cadastrados, { agora: num, censo: censo.agregados }),
  g('nenhum_nome_da_candidata_e_consumido_pelo_modulo_servido_e_a_sonda_e_verde', sonda.veredito.startsWith('P73_PEN39_USO_OK') && sonda.nomes_da_candidata_pen39.length === NOMES.length && sonda.nomes_da_candidata_pen39.every((x) => x.no_ar === 0), { veredito_sonda: sonda.veredito, nomes_da_candidata_pen39: sonda.nomes_da_candidata_pen39, chamada_no_corpo: sonda.chamadas_de_from_ou_rpc_no_corpo }),
  g('a_regua_de_estrutura_tem_fixture_que_dispara', FIXTURE_BATE, { fixture: FIXTURE_PARTIDO, esperava_no_fixture: { transaccao: 2, create_function: 1, drop_policy: 1, grant_execute: 1, revoke: 1, comment_function: 1 } }),
  g('a_estrutura_da_candidata_e_a_estrutura_da_reversao_sao_as_certificadas', JSON.stringify(estruturaCand) === JSON.stringify(EXPECT_CAND) && JSON.stringify(estruturaRev) === JSON.stringify(EXPECT_REV), { medida_candidata: estruturaCand, certificada_candidata: EXPECT_CAND, medida_reversao: estruturaRev, certificada_reversao: EXPECT_REV }),
  g('a_candidata_e_a_reversao_estao_em_disco_com_pegada', ficheiroCand.length > 4000 && ficheiroRev.length > 300, { candidata: pegada(ficheiroCand), reversao: pegada(ficheiroRev) }),
];

const out = {
  programa: 'scripts/p73-pen39-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pressuposto: MODO === 'candidata' ? 'as duas funções novas ainda não existem; a vista e as suas colunas estão como o censo de hoje as mediu' : 'a candidata foi aplicada; esta corrida afirma o estado de saída dela',
  funcoes: funcs, colunas, definicao_da_vista: { viva: defVista, censo_md5: defCensoMd5, censo_chars: censo.agregados.school_stats_viewdef.length },
  predicado_por_esta_via: predicadoSemJwt, numeros: num,
  o_que_esta_via_nao_prova: 'a candidata promete que o admin real recebe uma linha de bucket NULL com escolas=6. Isso depende do JWT do chamador (o WHERE da vista é o predicado de escopo) e só se mede por HTTP depois de aplicar; por isto este verde não afirma o número da saída, afirma que os pressupostos do CREATE FUNCTION existem.',
  estrutura: { candidata: estruturaCand, certificada_candidata: EXPECT_CAND, reversao: estruturaRev, certificada_reversao: EXPECT_REV, fixture_que_dispara: FIXTURE_PARTIDO },
  ficheiros: { candidata: { caminho: 'scripts/p73-pen39-ddl-candidata.sql', ...pegada(ficheiroCand) }, reversao: { caminho: 'scripts/p73-pen39-ddl-reversao.sql', ...pegada(ficheiroRev) } },
  sonda_de_uso: { artefacto: 'evidence/p73-pen39-sonda-uso-agregados-20-11e.json', veredito: sonda.veredito, agregados_varridos: sonda.agregados_varridos, por_nome: sonda.por_nome, frases: sonda.conclusao },
  precedentes: ['evidence/p73-politicas-municipais-20-11e.json', 'evidence/p73-pen38-alcance-por-concessao-20-11e.json', 'evidence/p73-pen39-sonda-uso-agregados-20-11e.json'],
  portoes, falhas,
  o_que_este_verde_nao_autoriza: 'nada. Aplicar o SQL pede OK literal novo, e publicar o código que consome os agregados pede outro.',
};
out.veredito = falhas.length === 0 ? `P73_PEN39_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0` : `P73_PEN39_PREFLIGHT_VERMELHO_${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN39_PREFLIGHT_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`MODO ${MODO} · numeros ${JSON.stringify(num)} · vista_viva ${defVista.def_md5} ${defVista.def_chars} chars · predicado_por_esta_via ${JSON.stringify({ admin: predicadoSemJwt.admin_por_esta_via, erro: predicadoSemJwt.erro || null })}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`  pegada candidata ${out.ficheiros.candidata.md5} ${out.ficheiros.candidata.bytes} B · reversao ${out.ficheiros.reversao.md5} ${out.ficheiros.reversao.bytes} B`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
