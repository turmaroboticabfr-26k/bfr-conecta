#!/usr/bin/env node
// p143 — Gera a candidata e a reversao do REVOKE do EXECUTE do anonimo em 19 funcoes de public,
// composta estritamente do catalogo vivo: 15 entradas nominais `anon=` + 4 abertas so pelo PUBLIC.
//
// Os 19 nomes nao se dactilografam: leem-se de evidence/p142-origem-da-entrada-anon-no-acl-sm37g.json
// (nomes_por_classe.anon_explicito + so_por_publico), com a pegada do registo conferida contra o
// emissor antes de tocar no banco. As assinaturas de identidade que entram no REVOKE sao as do servidor
// (pg_get_function_identity_arguments), nunca as da minha memoria. So leitura no banco: cada query
// passa pelo predicado eLeitura lido do p139 e compilado em node:vm, e a guarda prova que aborta antes
// do sql com um REVOKE. Zero DDL, zero DML, zero GRANT/REVOKE, zero chamada a /rpc.
//
// A candidata cobre cada caminho medido do anonimo: nome com entrada nominal leva `REVOKE … FROM anon`,
// nome com entrada PUBLIC leva `REVOKE … FROM PUBLIC`, nome com as duas leva as duas linhas. Se aparecer
// um nome executavel por anon por nenhum dos dois caminhos (membresia), a peca ABORTA: essa classe nao
// tem remédio nesta candidata e o catalogo mudou desde o registo sm37g.
//
// Uso: node scripts/p143-revoke-anon-e-publico.mjs            (gera e mede; P143_SUF distingue corridas)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const SUF = process.env.P143_SUF ? '-' + process.env.P143_SUF : '-23-11';
const FICHEIRO = join(REPO, 'evidence', 'p143-revoke-anon-e-publico' + SUF + '.json');
if (existsSync(FICHEIRO)) {
  console.error('ABORTA: ja existe ' + FICHEIRO + ' — passe P143_SUF novo em vez de sobrescrever uma medição.');
  process.exit(2);
}
const CAM_CAND = join(REPO, 'scripts', 'p143-revoke-anon-e-publico-ddl-candidata.sql');
const CAM_REV = join(REPO, 'scripts', 'p143-revoke-anon-e-publico-ddl-reversao.sql');
if (existsSync(CAM_CAND) || existsSync(CAM_REV)) {
  console.error('ABORTA: ' + CAM_CAND + ' ou ' + CAM_REV + ' ja existe — as pecas geradas nao se sobrescrevem.');
  process.exit(2);
}
const t0 = Date.now();

// ---- 1) registos a que me ligo, lidos do disco com a pegada de cada um ------------------------------
const registoComPegada = (rel, campos) => {
  const F = join(REPO, rel);
  if (!existsSync(F)) { console.error('ABORTA: falta ' + F); process.exit(2); }
  const buf = readFileSync(F);
  const reg = JSON.parse(buf.toString('utf8'));
  if (!reg || typeof reg.emissor_bytes !== 'number' || typeof reg.emissor_md5 !== 'string') {
    console.error('ABORTA: o registo ' + rel + ' nao declara emissor_bytes/emissor_md5.'); process.exit(2);
  }
  const src = readFileSync(join(REPO, reg.peca));
  const pega = { bytes: src.length, md5: md5(src) };
  return { reg, buf, rel, pega, campos };
};
const L142 = registoComPegada('evidence/p142-origem-da-entrada-anon-no-acl-sm37g.json');
const L139 = registoComPegada('evidence/p139-acls-dos-nomes-do-ar-contra-o-alvo-sm37g.json');
const L140 = registoComPegada('evidence/p140-superficie-rpc-das-duas-formas-sm37g.json');
const p142 = L142.reg, p139 = L139.reg, p140 = L140.reg;
const nomes142 = p142.nomes_por_classe;
const anonExplicito142 = nomes142 && nomes142.anon_explicito;
const soPorPublico142 = nomes142 && nomes142.so_por_publico;
if (!Array.isArray(anonExplicito142) || !Array.isArray(soPorPublico142)) {
  console.error('ABORTA: o registo do p142 nao traz nomes_por_classe com as duas listas.'); process.exit(2);
}
const NOMES = [...new Set([...anonExplicito142, ...soPorPublico142])].sort();
const particao142 = p142.particao_do_esquema;
const censo139 = p139.censo_do_esquema_inteiro;
const chamadosPeloAr = p140 && p140.nomes && p140.nomes.chamados_uniao;
if (!particao142 || !censo139) { console.error('ABORTA: falta particao_do_esquema (p142) ou censo_do_esquema_inteiro (p139).'); process.exit(2); }
if (!Array.isArray(chamadosPeloAr)) { console.error('ABORTA: o registo do p140 nao traz nomes.chamados_uniao.'); process.exit(2); }

// ---- 2) o predicado de leitura vem do ficheiro do produtor, compilado em vm -------------------------
const fonte139 = readFileSync(join(AQUI, 'p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs')).toString('utf8');
const linhaPredicado = fonte139.split(/\r?\n/).find((l) => l.startsWith('const eLeitura ='));
if (!linhaPredicado) { console.error('ABORTA: nao li a linha `const eLeitura =` do p139.'); process.exit(2); }
const mundo = createContext({});
runInContext(linhaPredicado + '\nglobalThis.__eLeitura = eLeitura;', mundo);
const eLeitura = mundo.__eLeitura;
if (typeof eLeitura !== 'function') { console.error('ABORTA: o vm nao devolveu uma funcao de leitura.'); process.exit(2); }
const formas = [];
const q = async (txt) => {
  const t = String(txt);
  formas.push(eLeitura(t));
  if (!eLeitura(t)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + t.slice(0, 60));
  return sql(t);
};
const literal = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const lista = NOMES.map(literal).join(', ');

// ---- 3) a guarda tem de abortar ANTES de chegar ao banco ---------------------------------------------
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('REVOKE ALL ON FUNCTION public.x() FROM anon'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /ABORTA/.test(String(e.message)); }

// ---- 4) o censo, as linhas por nome e as entradas, medidos no catalogo vivo -------------------------
const censo = (await q([
  'select count(*)::int as total,',
  "       count(*) filter (where has_function_privilege('anon'::regrole, p.oid, 'EXECUTE'))::int as anon_pode,",
  "       count(*) filter (where coalesce(array_to_string(p.proacl,''),'') like '%anon=X%')::int as anon_por_entrada,",
  '       count(*) filter (where p.proacl is null)::int as acl_nula',
  'from pg_proc p join pg_namespace nn on nn.oid = p.pronamespace',
  "where nn.nspname = 'public' and p.prokind = 'f'",
].join('\n')))[0];
const linhas = await q([
  'select p.oid::text as oid, p.proname as nome, p.prorettype::regtype::text as retorno,',
  "       p.provolatile::text as vol, p.prosecdef::text as definer, p.proacl is null as acl_nula,",
  '       pg_get_function_identity_arguments(p.oid) as ident,',
  "       has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') as anon_pode,",
  '       coalesce(array_to_string(p.proacl, \',\'), \'\') as acl_texto',
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  "where n.nspname = 'public' and p.prokind = 'f' and p.proname in (" + lista + ')',
  'order by 1',
].join('\n'));
const entradas = await q([
  'select p.proname as nome, a.privilege_type as privilegio,',
  "  case when a.grantee is null or a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as contemplado,",
  '  a.grantor::regrole::text as outorgante',
  'from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
  'cross join lateral aclexplode(p.proacl) a',
  "where n.nspname = 'public' and p.prokind = 'f' and p.proname in (" + lista + ')',
  "  and a.privilege_type = 'EXECUTE'",
  'order by 1, 2',
].join('\n'));

// ---- 5) raio de estouro, so leitura: policies que citam os nomes, gatilhos, e quem o ar chama --------
const policies = await q([
  'select c.relname as tabela, pol.polname as politica,',
  '       pg_get_expr(pol.polqual, pol.polrelid) as qual,',
  '       pg_get_expr(pol.polwithcheck, pol.polrelid) as com_check',
  'from pg_policy pol join pg_class c on c.oid = pol.polrelid',
  'join pg_namespace n on n.oid = c.relnamespace',
  "where n.nspname = 'public'",
  'order by 1, 2',
].join('\n'));
const gatilhos = await q([
  'select p.proname as funcao, t.tgname as gatilho, t.tgenabled::text as estado,',
  '       c.relname as tabela,',
  "       has_table_privilege('anon', t.tgrelid, 'INSERT') as anon_insert,",
  "       has_table_privilege('anon', t.tgrelid, 'UPDATE') as anon_update,",
  "       has_table_privilege('anon', t.tgrelid, 'DELETE') as anon_delete,",
  "       has_table_privilege('anon', t.tgrelid, 'TRUNCATE') as anon_truncate",
  'from pg_trigger t',
  'join pg_proc p on p.oid = t.tgfoid',
  'join pg_class c on c.oid = t.tgrelid',
  'join pg_namespace n on n.oid = c.relnamespace',
  "where n.nspname = 'public' and p.proname in (" + lista + ')',
  'order by 1, 2',
].join('\n'));

// ---- 6) reguas de forma e de composicao --------------------------------------------------------------
const RE_NOME = /^[a-z0-9_]+$/;
const RE_IDENT = /^[A-Za-z0-9_$"., \[\]()]*$/;
const identOk = (s) => RE_IDENT.test(String(s)) && !String(s).includes(';') && !String(s).includes('--');
const rende = (nome, ident, papel, verbo) =>
  verbo + ' EXECUTE ON FUNCTION public.' + nome + '(' + (ident ? ident : '') + ') ' + (verbo === 'REVOKE' ? 'FROM ' : 'TO ') + papel + ';';

// ---- 7) o que cada nome precisa, derivado das entradas medidas ---------------------------------------
const porNome = {};
for (const nome of NOMES) {
  const linha = linhas.find((r) => r.nome === nome);
  const ent = entradas.filter((r) => r.nome === nome);
  const contemplados = [...new Set(ent.map((r) => r.contemplado))].sort();
  porNome[nome] = {
    linha: linha || null,
    contemplados,
    entradas_execute: ent.map((r) => r.contemplado + ' por ' + r.outorgante).sort(),
    tem_anon: contemplados.includes('anon'),
    tem_public: contemplados.includes('PUBLIC'),
  };
}
const nomesComAnon = NOMES.filter((n) => porNome[n].tem_anon);
const nomesComPublic = NOMES.filter((n) => porNome[n].tem_public);
const nomesComAmbos = NOMES.filter((n) => porNome[n].tem_anon && porNome[n].tem_public);
const nomesSemCaminho = NOMES.filter((n) => porNome[n].linha && porNome[n].linha.anon_pode === true && !porNome[n].tem_anon && !porNome[n].tem_public);
if (nomesSemCaminho.length > 0) {
  console.error('ABORTA: estes nomes sao executaveis por anon sem entrada nominal nem PUBLIC — a candidata nao cobre esta classe e o catalogo mudou desde o sm37g: ' + nomesSemCaminho.join(', '));
  process.exit(2);
}
const declaracoes = [];
for (const n of [...nomesComAnon].sort()) declaracoes.push({ nome: n, ident: porNome[n].linha.ident, papel: 'anon', verbo: 'REVOKE' });
for (const n of [...nomesComPublic].sort()) declaracoes.push({ nome: n, ident: porNome[n].linha.ident, papel: 'PUBLIC', verbo: 'REVOKE' });
const devolucoes = declaracoes.map((d) => ({ ...d, verbo: 'GRANT' }));

// ---- 8) geracao dos dois ficheiros --------------------------------------------------------------------
const tEm = new Date().toISOString();
const cabecalho = (verbo, espelho) => `-- P143 ${verbo === 'REVOKE' ? 'candidata' : 'reversao'} — ${verbo === 'REVOKE'
  ? 'revoga o EXECUTE do papel anon em 19 funcoes de public: 15 entradas nominais (REVOKE … FROM anon) e os nomes com entrada PUBLIC (REVOKE … FROM PUBLIC).'
  : 'devolve ao anon e ao PUBLIC exactamente o EXECUTE que a candidata revogou, pela mesma assinatura de cada nome.'}
-- GERADA por scripts/p143-revoke-anon-e-publico.mjs a partir do catalogo vivo (${tEm}); NAO EDITAR A MAO.
-- NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR. O que esta medido: censo ${censo.total}/${censo.anon_pode}/${censo.anon_por_entrada}/${censo.acl_nula} com delta 0
-- contra o registo sm37g; ${nomesComAnon.length} nomes com entrada nominal anon, ${nomesComPublic.length} com entrada PUBLIC, ${nomesComAmbos.length} com as duas.
-- O que fecha: o caminho do anonimo ao EXECUTE nos ${declaracoes.length} graus abaixo, e mais nada.
-- O que nao toca: authenticated, service_role, postgres, outorgantes, policies, tabelas, dados, e o mecanismo de
-- default privileges (pg_default_acl) que reabre a porta a funcoes novas — esse e outra decisao, fora desta peca.
-- Forma de execucao: uma so transaccao, com as duas marcas nos bytes crus (/^BEGIN;/m e /^COMMIT;/m), que e a regua
-- do aplicador. A reversao devolve cada grau ao mesmo papel pela mesma assinatura; meia peca aplicada deixaria a
-- porta fechada sem caminho de volta simetrico, e e isso que a transaccao impede.
`;
const corpoDe = (listaDecl) => listaDecl.map((d) => rende(d.nome, d.ident, d.papel, d.verbo)).join('\n');
const txtCand = cabecalho('REVOKE') + '\nBEGIN;\nSET LOCAL statement_timeout = \'120s\';\nSET LOCAL lock_timeout = \'10s\';\n\n' + corpoDe(declaracoes) + '\n\nCOMMIT;\n';
const txtRev = cabecalho('GRANT') + '\nBEGIN;\nSET LOCAL statement_timeout = \'120s\';\nSET LOCAL lock_timeout = \'10s\';\n\n' + corpoDe(devolucoes) + '\n\nCOMMIT;\n';
writeFileSync(CAM_CAND, txtCand, 'utf8');
writeFileSync(CAM_REV, txtRev, 'utf8');

// ---- 9) reguas sobre o que acabei de escrever ---------------------------------------------------------
const soCodigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const estruturaDe = (t) => { const s = soCodigo(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm), revoke: c(/^\s*REVOKE EXECUTE/gim), grant: c(/^\s*GRANT EXECUTE/gim),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY|GRANT\s+(?!EXECUTE))\b/gim) }; };
const estCand = estruturaDe(txtCand);
const estRev = estruturaDe(txtRev);
const RE_GRAU = (kw) => new RegExp('^\\s*' + kw + '\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?([a-z0-9_]+)\\s*\\(([^)]*)\\)\\s+(?:FROM|TO)\\s+([a-z0-9_\\s]+);', 'gmi');
const grausDe = (t, kw) => [...t.matchAll(RE_GRAU(kw))].map((m) => ({ nome: m[1], ident: m[2].trim(), papel: m[3].trim() }));
const lidosCand = grausDe(txtCand, 'REVOKE');
const lidosRev = grausDe(txtRev, 'GRANT');
const espelho = (a, b) => JSON.stringify(a.map((x) => [x.nome, x.ident, x.papel]).sort()) === JSON.stringify(b.map((x) => [x.nome, x.ident, x.papel]).sort());

// ---- 10) fixtures -------------------------------------------------------------------------------------
const FIX_NOME = [['bfr_audit_lesson_attendance_change', true], ['bfr_x; drop table t', false], ['Bfr_Upper', false], ['bfr_x--', false]];
const FIX_IDENT = [['', true], ['uuid, text, boolean', true], ['p_school uuid, p_municipality uuid', true], ['character varying', true], ['integer[]', true], ['"Tipo Citado"', true], ['uuid; drop table t', false], ['uuid--', false], ['uuid, bad\'x', false]];
const FIX_CLASSE = [
  [[false, false, true], 'sem_caminho'],
  [[false, true, true], 'so_public'],
  [[true, false, true], 'so_anon'],
  [[true, true, true], 'ambos'],
  [[false, false, false], 'fechado'],
];
const classeDe = (tem_anon, tem_public, anon_pode) => {
  if (anon_pode && !tem_anon && !tem_public) return 'sem_caminho';
  if (tem_anon && tem_public) return 'ambos';
  if (tem_anon) return 'so_anon';
  if (tem_public) return 'so_public';
  return 'fechado';
};
const FIX_RENDE = [
  ['uuid', 'REVOKE', 'anon', 'REVOKE EXECUTE ON FUNCTION public.n(uuid) FROM anon;'],
  ['', 'REVOKE', 'PUBLIC', 'REVOKE EXECUTE ON FUNCTION public.n() FROM PUBLIC;'],
];
const rendeFixo = (ident, verbo, papel) => rende('n', ident, papel, verbo);

// ---- 11) portao ---------------------------------------------------------------------------------------
const portoes = [];
const gate = (nome, obtido, esperado, detalhe) => {
  portoes.push({ nome, verde: JSON.stringify(obtido) === JSON.stringify(esperado), obtido, esperado, detalhe });
};
gate('as_pegas_dos_tres_registos_conferem_contra_os_emissores_em_disco',
  [L142.pega.bytes === L142.reg.emissor_bytes && L142.pega.md5 === L142.reg.emissor_md5,
   L139.pega.bytes === L139.reg.emissor_bytes && L139.pega.md5 === L139.reg.emissor_md5,
   L140.pega.bytes === L140.reg.emissor_bytes && L140.pega.md5 === L140.reg.emissor_md5],
  [true, true, true],
  { p142: L142.pega, p139: L139.pega, p140: L140.pega, rel: [L142.rel, L139.rel, L140.rel] });
gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', [guardaAbortou, guardaChegouAoBanco], [true, false],
  { texto_passado: 'REVOKE ALL ON FUNCTION public.x() FROM anon', predicado_lido: linhaPredicado });
gate('o_predicado_de_leitura_e_lido_do_produtor_e_dispara_nos_dois_lados',
  [[eLeitura('select 1'), eLeitura('with a as (select 1) select * from a'), eLeitura('REVOKE ALL ON FUNCTION public.x() FROM anon'), eLeitura('')]],
  [[true, true, false, false]],
  { origem: 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs' });
gate('os_19_nomes_lidos_do_p142_sao_15_mais_4_sem_repeticao',
  [NOMES.length, anonExplicito142.length, soPorPublico142.length, new Set(NOMES).size, NOMES.every((n) => RE_NOME.test(n))],
  [19, 15, 4, 19, true],
  { nomes: NOMES });
gate('o_censo_vivo_bate_com_o_registo_do_p139_e_com_a_particao_do_p142',
  [censo.total, censo.anon_pode, censo.anon_por_entrada, censo.acl_nula],
  [censo139.total, censo139.anon_pode, censo139.anon_por_entrada, censo139.acl_nula],
  { censo139, particao142: { total: particao142.total, anon_pode: particao142.anon_pode, explicito: particao142.classe_anon_explicito, publico: particao142.classe_so_por_publico, membria: particao142.classe_por_membria, acl_nula: particao142.acl_nula } });
gate('a_particao_do_p142_tambem_bate_com_o_censo_vivo',
  [particao142.total, particao142.anon_pode, particao142.classe_anon_explicito, particao142.classe_so_por_publico, particao142.classe_por_membria, particao142.acl_nula],
  [censo.total, censo.anon_pode, censo.anon_por_entrada, NOMES.filter((n) => porNome[n].tem_public && !porNome[n].tem_anon).length, 0, censo.acl_nula],
  { nota: 'a quarta coluna do p142 conta os abertos SO por PUBLIC; se algum dos 15 explicitos tambem tiver PUBLIC, aparece na classe "ambos" e leva as duas linhas' });
gate('cada_nome_tem_exactamente_uma_linha_e_e_executavel_por_anon',
  [linhas.length, linhas.filter((r) => r.anon_pode === true).length, linhas.filter((r) => r.acl_nula === true).length],
  [19, 19, 0],
  { nomes_sem_linha: NOMES.filter((n) => !porNome[n].linha) });
gate('as_classes_medidas_batem_nome_a_nome_com_as_do_p142',
  [nomesComAnon.slice().sort(), nomesComPublic.filter((n) => !nomesComAnon.includes(n)).slice().sort(),
   nomesComAmbos.every((n) => anonExplicito142.includes(n)), nomesComAmbos.filter((n) => soPorPublico142.includes(n)).length],
  [anonExplicito142.slice().sort(), soPorPublico142.slice().sort(), true, 0],
  { nota: 'os 15 explicitos e os 4 so-PUBLIC batem com o p142; a classe "ambos" (entrada nominal + PUBLIC no mesmo nome) nao existe no p142 porque a particao dele e por ordem de eliminacao — aqui ela e medida e tem de estar dentro dos 15, nunca dentro dos 4', nomesComAnon, nomesComPublic, nomesComAmbos });
gate('nenhum_nome_fica_aberto_por_caminho_que_a_candidata_nao_cobre',
  [nomesSemCaminho.length, NOMES.filter((n) => !porNome[n].linha).length, NOMES.filter((n) => porNome[n].linha && porNome[n].linha.anon_pode !== true).length],
  [0, 0, 0],
  { nota: 'classe por_membria medida a zero; um nome novo a aparecer aqui aborta a geracao, nao a contorna' });
gate('as_identidades_do_servidor_passam_a_regua_de_forma',
  [NOMES.filter((n) => porNome[n].linha && identOk(porNome[n].linha.ident)).length, NOMES.length],
  [19, 19],
  { idents: Object.fromEntries(NOMES.map((n) => [n, porNome[n].linha && porNome[n].linha.ident])) });
gate('a_regua_de_nome_tem_positivo_e_negativo_em_fixture', FIX_NOME.map(([s]) => RE_NOME.test(s)), FIX_NOME.map((e) => e[1]), { FIX_NOME });
gate('a_regua_de_identidade_tem_positivo_e_negativo_em_fixture', FIX_IDENT.map(([s]) => identOk(s)), FIX_IDENT.map((e) => e[1]), { FIX_IDENT });
gate('a_classificadora_de_caminhos_tem_positivo_e_negativo_em_fixture', FIX_CLASSE.map((e) => classeDe(e[0][0], e[0][1], e[0][2])), FIX_CLASSE.map((e) => e[1]), { FIX_CLASSE });
gate('o_renderizador_de_graus_tem_fixture_nos_dois_sentidos', FIX_RENDE.map((e) => rendeFixo(e[0], e[1], e[2])), FIX_RENDE.map((e) => e[3]), { FIX_RENDE });
gate('os_ficheiros_gerados_tem_uma_so_transacco_sem_dados_e_o_aviso_de_nao_aplicar',
  [estCand.begin, estCand.commit, estCand.revoke, estCand.grant, estCand.statement_fora_dos_graus,
   estRev.begin, estRev.commit, estRev.grant, estRev.revoke, estRev.statement_fora_dos_graus,
   txtCand.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR'), txtRev.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR')],
  [1, 1, declaracoes.length, 0, 0, 1, 1, devolucoes.length, 0, 0, true, true],
  { estCand, estRev, nota: 'a candidata so REVOKE, a reversao so GRANT, e nenhuma escreve dados' });
gate('o_parser_rele_os_ficheiros_e_devolve_exactamente_o_que_foi_gerado',
  [JSON.stringify(lidosCand.map((x) => [x.nome, x.ident, x.papel])), JSON.stringify(lidosRev.map((x) => [x.nome, x.ident, x.papel]))],
  [JSON.stringify(declaracoes.map((x) => [x.nome, x.ident, x.papel])), JSON.stringify(devolucoes.map((x) => [x.nome, x.ident, x.papel]))],
  { lidosCand, lidosRev, nota: 'o parser e o mesmo que o preflight usa: se os dois nao fecham o circulo, e aqui que se ve' });
gate('a_reversao_e_o_espelho_exacto_da_candidata_e_o_mundo_trocado_chumba',
  [espelho(lidosCand, lidosRev), espelho(lidosCand, lidosRev.map((x, i) => i === 0 ? { ...x, papel: 'postgres' } : x)), espelho(lidosCand, lidosRev.map((x, i) => i === 0 ? { ...x, nome: 'outro_nome' } : x))],
  [true, false, false],
  { nota: 'mesmo nome, mesma assinatura, mesmo papel: REVOKE vira GRANT e nada mais muda' });
gate('as_linhas_de_publico_e_de_anon_batem_com_o_medido_por_nome', [
  lidosCand.filter((d) => d.papel === 'PUBLIC').map((d) => d.nome).sort(),
  lidosCand.filter((d) => d.papel === 'anon').map((d) => d.nome).sort(),
], [nomesComPublic.slice().sort(), nomesComAnon.slice().sort()],
  { nota: 'cada linha gerada corresponde a um caminho medido: anon para entrada nominal, PUBLIC para entrada PUBLIC — um nome com as duas leva as duas linhas' });
gate('cada_query_passa_por_q_e_so_ha_um_toque_directo_de_sql', [
  formas.length === (EU.toString('utf8').split('aw' + 'ait q(').length - 1),
  (EU.toString('utf8').split('s' + 'ql(').length - 1) === 1,
  formas.length >= 4,
  formas.filter(Boolean).length === formas.length - 1,
], [true, true, true, true],
  { formas: formas.length, nota: 'o unico false em formas e a sonda da guarda, que passa um REVOKE de proposito para provar o aborto; as agulhas compoem-se em runtime para nao se contarem a si mesmas' });
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const candidato = JSON.stringify({ censo, declaracoes, devolucoes, linhas, entradas, gatilhos, policies_limpas: policies.map((r) => ({ tabela: r.tabela, politica: r.politica })) });
  const FIX_VARREDURA = 'maria' + '@example.edu ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.' + 'abcdefghij' + '.' + 'klmnopqrst';
  const reEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const reJwt = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
  return [(candidato.match(reEmail) || []).length, (candidato.match(reJwt) || []).length,
    (FIX_VARREDURA.match(reEmail) || []).length, (FIX_VARREDURA.match(reJwt) || []).length];
})(), [0, 0, 1, 1]);

// ---- 12) raio de estouro como dado medido, nao como prosa ---------------------------------------------
const nomesCitadosEmPolicies = () => {
  const alvo = NOMES.map((n) => ({ nome: n, sitios: [] }));
  for (const r of policies) {
    const texto = String(r.qual == null ? '' : r.qual) + '\n' + String(r.com_check == null ? '' : r.com_check);
    for (const n of alvo) {
      const m = texto.match(new RegExp('\\b' + n.nome + '\\s*\\(', 'g'));
      if (m) n.sitios.push({ tabela: r.tabela, politica: r.politica, ocorrencias: m.length });
    }
  }
  return alvo;
};
const citados = nomesCitadosEmPolicies();
const tabelasComDmlAnonimoSobGatilho = [...new Set(gatilhos.filter((g) => g.anon_insert || g.anon_update || g.anon_delete || g.anon_truncate).map((g) => g.tabela))].sort();
const raioDeEstouro = {
  nomes_citados_em_pg_policy: citados.filter((x) => x.sitios.length > 0),
  gatilhos_do_catalogo_para_os_19: gatilhos,
  tabelas_com_dml_anonimo_sob_gatilho_dos_19: tabelasComDmlAnonimoSobGatilho,
  chamado_pelo_ar: {
    na_uniao_dos_27_do_p140: NOMES.filter((n) => chamadosPeloAr.includes(n)).sort(),
    fora_da_uniao: NOMES.filter((n) => !chamadosPeloAr.includes(n)).sort(),
  },
  default_privileges_do_p142: p142.default_privileges || null,
};

// ---- 13) registo --------------------------------------------------------------------------------------
const verdes = portoes.filter((g) => g.verde).length;
const falhas = portoes.length - verdes;
const veredito = 'P143_REVOKE_GERADO ' + verdes + '/' + falhas
  + ' · nomes ' + NOMES.length
  + ' · linhas ' + declaracoes.length
  + ' · anon ' + nomesComAnon.length
  + ' · public ' + nomesComPublic.length
  + ' · ambos ' + nomesComAmbos.length
  + ' · censo ' + censo.total + '/' + censo.anon_pode + '/' + censo.anon_por_entrada + '/' + censo.acl_nula
  + ' · ' + (Date.now() - t0) + ' ms';
const resultado = {
  peca: 'scripts/p143-revoke-anon-e-publico.mjs',
  em: tEm,
  duracao_ms: Date.now() - t0,
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  pergunta: 'qual e a candidata de REVOKE que fecha hoje o caminho do anonimo ao EXECUTE nas 19 funcoes de public medidas no sm37g, sem tocar em mais nenhum grau — e que raio de estouro tem?',
  metodo: 'SELECTs de catalogo (censo, pg_proc com pg_get_function_identity_arguments, aclexplode, pg_policy, pg_trigger) so com o predicado eLeitura lido do p139 e compilado em node:vm; os 19 nomes leem-se do registo do p142 com a pegada conferida; a candidata e a reversao compoem-se estritamente das identidades medidas; zero escrita no banco.',
  identidade_do_medido: {
    registo_p142: { rel: L142.rel, bytes: L142.buf.length, md5: md5(L142.buf), pega_do_emissor: L142.pega },
    registo_p139: { rel: L139.rel, bytes: L139.buf.length, md5: md5(L139.buf), pega_do_emissor: L139.pega },
    registo_p140: { rel: L140.rel, bytes: L140.buf.length, md5: md5(L140.buf), pega_do_emissor: L140.pega },
    predicado_lido_da_fonte: linhaPredicado,
  },
  nomes_lidos: { anon_explicito: anonExplicito142.slice().sort(), so_por_publico: soPorPublico142.slice().sort(), uniao: NOMES },
  medido_por_nome: porNome,
  censo_vivo: censo,
  confronto_com_o_registo_p142: { particao_do_p142: particao142, censo_do_p139: censo139, nomes_com_ambos: nomesComAmbos },
  declaracoes_geradas: { candidata: declaracoes, reversao: devolucoes },
  ficheiros_gerados: {
    candidata: { caminho: 'scripts/p143-revoke-anon-e-publico-ddl-candidata.sql', bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(Buffer.from(txtCand, 'utf8')) },
    reversao: { caminho: 'scripts/p143-revoke-anon-e-publico-ddl-reversao.sql', bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(Buffer.from(txtRev, 'utf8')) },
    estrutura: { candidata: estCand, reversao: estRev },
  },
  raio_de_estouro: raioDeEstouro,
  fixtures: { nome: FIX_NOME, identidade: FIX_IDENT, classe: FIX_CLASSE, renderizador: FIX_RENDE },
  o_que_prova: 'que a candidata fecha exactamente os caminhos medidos do anonimo (entradas nominais e PUBLIC, incluindo os nomes que tem as duas) nos 19 nomes do sm37g, pela assinatura de identidade que o servidor devolve hoje, com reversao simetrica e estrutura de uma transaccao; e que o catalogo nao mudou desde o sm37g (censo com delta 0 e classes nome a nome).',
  o_que_NAO_prova: 'que aplicar seja seguro para os chamadores: os nomes citados em pg_policy e os gatilhos estao medidos como raio de estouro, mas o efeito em RLS e em triggers so se ve depois, com sessao — e nas tabelas onde o anonimo ainda tem DML sob um gatilho dos 19 (ver raio_de_estouro.tabelas_com_dml_anonimo_sob_gatilho_dos_19), fechar o EXECUTE faz a escrita anonima falhar com 42501 em vez de disparar o gatilho, que e uma mudanca de comportamento a decidir, nao um dado. Nao fecha o mecanismo de default privileges (pg_default_acl), nao prova autoria das entradas, e NAO APLICA nada: aplicar, reverter e publicar pedem cada um a sua frase literal.',
  portoes: { total: portoes.length, falhas, lista: portoes },
  veredito,
};
writeFileSync(FICHEIRO, JSON.stringify(resultado, null, 2) + '\n');
console.log(veredito);
portoes.forEach((g) => console.log('  portao ' + g.nome + ': ' + (g.verde ? 'VERDE' : 'VERMELHO obtido=' + JSON.stringify(g.obtido) + ' esperado=' + JSON.stringify(g.esperado))));
console.log('candidata ' + resultado.ficheiros_gerados.candidata.md5 + ' ' + resultado.ficheiros_gerados.candidata.bytes + ' B');
console.log('reversao  ' + resultado.ficheiros_gerados.reversao.md5 + ' ' + resultado.ficheiros_gerados.reversao.bytes + ' B');
if (falhas > 0) {
  const vermelho = FICHEIRO.replace('.json', '-VERMELHO.json');
  writeFileSync(vermelho, JSON.stringify(resultado, null, 2) + '\n');
  console.error('VERMELHO: registo em ' + FICHEIRO + ' e copia em ' + vermelho);
  process.exit(1);
}
console.log('guardado em ' + FICHEIRO + ' (' + statSync(FICHEIRO).size + ' B, md5 ' + md5(readFileSync(FICHEIRO)) + ')');
