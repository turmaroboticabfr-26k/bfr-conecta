#!/usr/bin/env node
// P139 — ACLs vivas dos nomes que o ar chama, cortadas pelo alvo das pecas de graus. SO LEITURA: zero DDL,
// zero DML, zero GRANT/REVOKE, zero chamada a /rpc.
//
// A pergunta nasce do fecho da PEN-48: a peça fechou UM nome (`register_gate_checkin_v2`) e UM papel (`anon`), e o
// cabecalho dela declara que a classe — o grau de `anon` chegar pela entrada nominal do ACL e nao pelo pseudo-papel
// PUBLIC — esta medida em `scripts/p73-sonda-exposicao-anonima.mjs`. O que ficou em aberto e se a mesma classe vive
// noutros nomes que o front servido realmente chama, fora do alvo de qualquer peça de graus já escrita.
//
// Proveniência, porque nenhuma cifra desta peca e dactilografada:
//  - os nomes vem de `evidence/p126-censo-rpc-21-11-v142b.json` (o censo do bundle da v142), e os nomes municipais
//    de CREATE FUNCTION das candidatas de DDL lidas por globo;
//  - as colunas do catalogo, o censo do esquema inteiro, `temEntradaAnon` e `papeisDe` vem do texto de
//    `scripts/p73-pen48-preflight.mjs`; se nao os ler, aborta antes de escrever seja o que for;
//  - a identidade do medido (ar = diario de publicacao = bundle varrido pelo p126) segue `scripts/p136-...`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P139_SUF ? '-' + process.env.P139_SUF : '-22-11-a';
const OUT = join(REPO, 'evidence/p139-acls-dos-nomes-do-ar-contra-o-alvo' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P139_SUF=novo, nao por cima');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(b).digest('hex');
const normal = (t) => String(t).replace(/\s+/g, ' ').trim();

// ---- 1) o produtor das predicas: o preflight da PEN-48 -----------------------------------------------
const F_PREFLIGHT = 'scripts/p73-pen48-preflight.mjs';
const txtPreflight = readFileSync(join(REPO, F_PREFLIGHT), 'utf8');
const RE_CENSO = /const censo = \(await q\(`([\s\S]*?)`\)\)\[0\];/;
const SQL_CENSO = (RE_CENSO.exec(txtPreflight) || [])[1];
if (!SQL_CENSO) throw new Error('ABORTA: nao li a query do censo em ' + F_PREFLIGHT + ' — nenhuma cifra de esquema sai daqui');
const RE_COLS_ALVO = /const alvo = \(await q\(`select (p\.oid[\s\S]*?) from pg_proc/;
const COLS_ALVO = (RE_COLS_ALVO.exec(txtPreflight) || [])[1];
if (!COLS_ALVO) throw new Error('ABORTA: nao li a lista de colunas do alvo em ' + F_PREFLIGHT);

// Copiadas literalmente do mesmo ficheiro; a igualdade de texto e portao, nao suposicao.
const temEntradaAnon = (acl) => String(acl).split(',').some((x) => /^\s*anon=X/.test(x.trim()));
const papeisDe = (acl) => [...new Set(String(acl).split(',').map((x) => x.trim().split('=')[0]).filter((r) => r && r !== '<null_por_default>'))].sort();
const eLeitura = (t) => /^\s*(select|with)\b/i.test(String(t));
const temPublicX = (acl) => String(acl).split(',').some((x) => /^\s*=/.test(x.trim()));
const PREDICAS_DE_HOJE = [
  "const temEntradaAnon = (acl) => String(acl).split(',').some((x) => /^\\s*anon=X/.test(x.trim()));",
  "const papeisDe = (acl) => [...new Set(String(acl).split(',').map((x) => x.trim().split('=')[0]).filter((r) => r && r !== '<null_por_default>'))].sort();",
  "const eLeitura = (t) => /^\\s*(select|with)\\b/i.test(String(t));",
  "const temPublicX = (acl) => String(acl).split(',').some((x) => /^\\s*=/.test(x.trim()));",
];
const predicasConferidas = PREDICAS_DE_HOJE.map((p) => normal(txtPreflight).includes(normal(p)));

// Guarda local: qualquer texto que nao comece por select/with aborta antes de chegar ao banco.
const q = async (txt) => { if (!eLeitura(txt)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + String(txt).slice(0, 40)); return sql(txt); };

// ---- 2) identidade do medido, antes de contar (a disciplina do p136) ---------------------------------
const diarios = readdirSync(REPO)
  .filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ f, v: Number(/v(\d+)\.json$/.exec(f)[1]) }))
  .sort((a, b) => b.v - a.v);
if (!diarios.length) throw new Error('ABORTA: nenhum audit-publicacao-vNNN.json no disco');
const diario = JSON.parse(readFileSync(join(REPO, diarios[0].f), 'utf8'));
const url = diario.deploy && diario.deploy.url;
if (!url) throw new Error('ABORTA: ' + diarios[0].f + ' nao tem deploy.url');
const reg = diario.conferencia_no_ar || {};
if (!reg.md5_agora || !reg.bytes_agora) throw new Error('ABORTA: ' + diarios[0].f + ' nao tem conferencia_no_ar.md5_agora/bytes_agora');
const arBruto = Buffer.from(await (await fetch(url + '/', { headers: { 'cache-control': 'no-cache' } })).arrayBuffer());
const identidade = {
  diario: diarios[0].f, versao_registada: diarios[0].v, url_lida_do_diario: url,
  bytes_no_diario: reg.bytes_agora, md5_no_diario: reg.md5_agora,
  bytes_apanhados: arBruto.length, md5_apanhado: md5(arBruto),
  ar_bate_com_o_diario: md5(arBruto) === reg.md5_agora && arBruto.length === reg.bytes_agora,
};

// ---- 3) os nomes: censo do p126 + CREATE FUNCTION das candidatas municipais ---------------------------
const F_P126 = 'evidence/p126-censo-rpc-21-11-v142b.json';
const p126 = JSON.parse(readFileSync(join(REPO, F_P126), 'utf8'));
const bundlesP126 = p126.bundles || [];
if (bundlesP126.length !== 1) throw new Error('ABORTA: esperava um bundle no ' + F_P126 + ', li ' + bundlesP126.length);
const BUNDLE = bundlesP126[0];
if (!Array.isArray(BUNDLE.nomes) || !BUNDLE.nomes.length) throw new Error('ABORTA: o ' + F_P126 + ' nao traz nomes');
const bundleEmDisco = Buffer.from(readFileSync(join(REPO, BUNDLE.caminho)));
const pega_do_bundle = {
  caminho: BUNDLE.caminho, bytes_declarados: BUNDLE.bytes, md5_declarado: BUNDLE.md5,
  bytes_em_disco: bundleEmDisco.length, md5_em_disco: md5(bundleEmDisco),
  disco_bate_com_o_registro_p126: bundleEmDisco.length === BUNDLE.bytes && md5(bundleEmDisco) === BUNDLE.md5,
  bundle_e_o_ar_do_diario: md5(bundleEmDisco) === reg.md5_agora && bundleEmDisco.length === reg.bytes_agora,
};
const NOMES_DO_AR = [...BUNDLE.nomes].sort();

const RE_CREATE = /CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)/gi;
const FICHEIROS_DDL_TODOS = readdirSync(join(REPO, 'scripts')).filter((f) => /pen\d+-ddl-.*\.sql$/.test(f)).sort();
const FICHEIROS_DDL = FICHEIROS_DDL_TODOS.filter((f) => /pen\d+-ddl-candidata\.sql$/.test(f));
if (!FICHEIROS_DDL.length) throw new Error('ABORTA: nenhum scripts/penNN-ddl-candidata.sql lido por globo');
const municipais = [];
const porFicheiroCreate = {};
for (const f of FICHEIROS_DDL) {
  const t = readFileSync(join(REPO, 'scripts', f), 'utf8');
  const lidos = [...new Set([...t.matchAll(RE_CREATE)].map((m) => m[1]))].sort();
  porFicheiroCreate[f] = lidos;
  municipais.push(...lidos);
}
const NOMES_MUNICIPAIS = [...new Set(municipais)].sort();
const UNIVERSO = [...new Set([...NOMES_DO_AR, ...NOMES_MUNICIPAIS])].sort();

// ---- 4) o alvo das pecas de graus: REVOKE/GRANT (EXECUTE|ALL) ON FUNCTION nos mesmos SQL ----------------
// Uma linha comentada num SQL nao e um grau que alguem pediu: a casa ja usa `replace(/--[^\n]*/g,'')` para
// despir comentarios antes de varrer corpo (sm22), por isso o mesmo despir vale aqui. O fixture em baixo e que
// prova que o ramo existe nas duas direcoes, nao a minha assercao.
// A familia `REVOKE ALL ON FUNCTION` existe no texto versionado (medido: 5 linhas nos tres SQL de candidatas
// que este extractor varre) e nao cabia no padrao, que pedia EXECUTE literal. Deixa-la fora fazia o artefacto
// negar um grau que a casa escreveu — e foi exatamente o que aconteceu com `bfr_school_set_municipality`, cujo
// REMEDIO do PUBLIC esta numa linha REVOKE ALL. O privilege passa a alternancia, com `grau` declarado na linha.
const RE_ALVO = /\b(REVOKE|GRANT)\s+(EXECUTE|ALL)\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(([^)]*)\)\s+(FROM|TO)\s+([a-z0-9_,\s]+)/gi;
const RE_LINHA_CRUA = /\b(?:REVOKE|GRANT)\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+(?:public\.)?[a-z0-9_]+\s*\(/gi;
const semComentarios = (t) => String(t).replace(/--[^\n]*/g, '');
const alvos = [];
let linhas_de_graus_extraidas = 0;
let linhas_de_graus_cruas = 0;
for (const f of FICHEIROS_DDL) {
  const t = semComentarios(readFileSync(join(REPO, 'scripts', f), 'utf8'));
  linhas_de_graus_cruas += (t.match(RE_LINHA_CRUA) || []).length;
  for (const m of t.matchAll(RE_ALVO)) {
    linhas_de_graus_extraidas++;
    for (const papel of m[6].split(',').map((x) => x.trim()).filter(Boolean)) {
      alvos.push({ ficheiro: f, nome: m[3], assinatura: normal(m[4]), verbo: m[1].toUpperCase(), grau: m[2].toUpperCase(), preposicao: m[5].toUpperCase(), papel });
    }
  }
}
const familias_de_grau = Object.keys(alvos.reduce((acc, a) => (acc[a.grau] = (acc[a.grau] || 0) + 1, acc), {})).sort();
const contagem_por_grau = alvos.reduce((acc, a) => (acc[a.grau] = (acc[a.grau] || 0) + 1, acc), {});
// Unidades distintas, e isso e portao e nao palavra minha: `linhas_*` conta cabecas de declaracao de grau (uma
// linha `... FROM anon, authenticated` e uma cabeca), `contagem_por_grau` conta pares declaracao x papel porque
// a lista de papeis e desdobrada acima. O fixture da duas grandezas diferentes no mesmo texto.
const FIX_MULTI_PAPEL = 'REVOKE ALL ON FUNCTION public.f_multi(uuid) FROM anon, authenticated;\n';
const fix_multi_cabecas = (FIX_MULTI_PAPEL.match(RE_LINHA_CRUA) || []).length;
const fix_multi_pares = [...semComentarios(FIX_MULTI_PAPEL).matchAll(RE_ALVO)].reduce((n, m) => n + m[6].split(',').map((x) => x.trim()).filter(Boolean).length, 0);
if (!alvos.length) throw new Error('ABORTA: os ' + FICHEIROS_DDL.length + ' SQL de graus nao declararam um so REVOKE/GRANT (EXECUTE|ALL) ON FUNCTION — o extractor nao esta a ver nada');
const NOMES_DO_ALVO = [...new Set(alvos.map((a) => a.nome))].sort();

// O extractor tem de apanhar a linha que a casa realmente aplicou, senao o conjunto do alvo e fantasia.
const txt48 = readFileSync(join(REPO, 'scripts/p73-pen48-ddl-candidata.sql'), 'utf8');
const RE_48 = /REVOKE EXECUTE ON FUNCTION public\.(register_gate_checkin_v2)\s*\(([^)]*)\)\s+FROM\s+(\w+)/i;
const m48 = RE_48.exec(txt48);
const extraiu_a_linha_da_pen48 = (() => {
  if (!m48) return false;
  const a = alvos.filter((x) => x.ficheiro === 'p73-pen48-ddl-candidata.sql');
  return a.length === 1 && a[0].nome === m48[1] && a[0].papel === m48[3] && a[0].verbo === 'REVOKE'
    && normal(a[0].assinatura) === normal(m48[2]);
})();
const FIX_ALVO = "GRANT EXECUTE ON FUNCTION public.uma_funcao(uuid, text) TO authenticated;\nREVOKE EXECUTE ON FUNCTION public.outra() FROM anon;\nREVOKE ALL ON FUNCTION public.terceira(uuid) FROM PUBLIC;\n-- REVOKE ALL ON FUNCTION public.comentario() FROM anon;\n";
const fixAlvo = [...semComentarios(FIX_ALVO).matchAll(RE_ALVO)].map((m) => m[1] + ':' + m[2] + ':' + m[3] + ':' + m[6]);
const FIX_ALVO_ESPERADO = ['GRANT:EXECUTE:uma_funcao:authenticated', 'REVOKE:EXECUTE:outra:anon', 'REVOKE:ALL:terceira:PUBLIC'];
const FIX_ALVO_SEM_DESPIR = [...FIX_ALVO.matchAll(RE_ALVO)].map((m) => m[3]);
const extrator_de_alvo_dispara_no_fixture = fixAlvo.join('|') === FIX_ALVO_ESPERADO.join('|');

// ---- 5) o catalogo vivo, nas colunas do produtor ------------------------------------------------------
// O produtor filtrava UM nome por query, por isso a sua lista nao traz `proname`: acrescento so essa coluna,
// declarada no artefacto, e nada mais. As colunas de graus continuam a ser as do preflight da PEN-48.
const COLUNAS_ACRESCENTADAS = 'p.proname as nome';
const lista = UNIVERSO.map((n) => "'" + n.replace(/'/g, "''") + "'").join(',');
const linhas = await q(`select ${COLUNAS_ACRESCENTADAS}, ${COLS_ALVO}\n  from pg_proc p join pg_namespace nn on nn.oid=p.pronamespace and nn.nspname='public'\n  where p.proname in (${lista})\n  order by 1, 2`);
const censo = await q(SQL_CENSO);
const porNome = {};
for (const r of linhas) (porNome[r.nome] = porNome[r.nome] || []).push(r);
const ausentes = UNIVERSO.filter((n) => !porNome[n]);

//assinaturas podem divergir (sobrecargas): guardo as linhas separadas e classifico por linha.
const rows = [];
for (const n of UNIVERSO) {
  const ls = porNome[n] || [];
  if (!ls.length) continue;
  for (const r of ls) {
    rows.push({
      nome: n, oid: r.oid, assinatura: r.ident || '', definer: r.definer, vol: r.vol,
      acl: r.acl, anon_pode: r.anon_pode, authenticated_pode: r.authenticated_pode, service_role_pode: r.service_role_pode,
      // `def_bytes` e o tamanho de `pg_get_functiondef`, cabecalho e marcador de corpo incluidos. Chamar-lhe
      // `corpo_bytes` foi prometer o corpo e entregar a definicao: o corpo recortado mede-se no p141, que confere
      // este numero contra o seu `def_bytes` e mostra que os dois sao a mesma grandeza.
      def_bytes: (r.def || '').length,
      entrada_anon_no_acl: temEntradaAnon(r.acl), papeis_no_acl: papeisDe(r.acl), publico_na_acl: temPublicX(r.acl),
      chamado_pelo_ar: NOMES_DO_AR.includes(n), municipal_de_ddl: NOMES_MUNICIPAIS.includes(n),
      no_alvo_de_peca_de_graus: NOMES_DO_ALVO.includes(n),
    });
  }
}
const CLASSES = ['no_alvo_e_anon_pode', 'no_alvo_e_anon_nao_pode', 'fora_do_alvo_e_anon_pode', 'fora_do_alvo_e_anon_nao_pode'];
const classeDe = (r) => (r.no_alvo_de_peca_de_graus ? 'no_alvo_' : 'fora_do_alvo_') + (r.anon_pode ? 'e_anon_pode' : 'e_anon_nao_pode');
// O resumo imprime sempre as quatro classes: uma classe vazia diz «medido, zero ocorrências», e suprimi-la
// transformaria «não sei» em «não existe». Por isso o corpus vazio é o fixture que verifica esta forma.
const resumoClasses = (rr) => Object.fromEntries(CLASSES.map((c) => {
  const dentro = rr.filter((r) => classeDe(r) === c);
  return [c, { total: dentro.length, nomes: dentro.map((r) => r.nome) }];
}));
const resumo = resumoClasses(rows);
const porClasse = Object.fromEntries(CLASSES.map((c) => [c, resumo[c].nomes]));
porClasse.ausente_no_catalogo = ausentes;

// ---- 5b) a rota do texto da ACL, independente do has_function_privilege ------------------------------
// `anon_pode` vem do catalogo e leva a membria de papeis dentro dela; as duas colunas por entrada vem do texto.
// Confronta-las e o unico modo de ver o buraco entre «o anon pode» e «o anon esta nomeado na ACL».
const rotaDe = (rr) => ({
  linhas: rr.length,
  anon_pode: rr.filter((r) => r.anon_pode === true).length,
  anon_explicito_no_texto: rr.filter((r) => r.entrada_anon_no_acl === true).length,
  publico_na_acl: rr.filter((r) => r.publico_na_acl === true).length,
  so_por_publico: rr.filter((r) => r.anon_pode === true && r.publico_na_acl === true && r.entrada_anon_no_acl === false).length,
  por_membria_ou_default: rr.filter((r) => r.anon_pode === true && r.publico_na_acl === false && r.entrada_anon_no_acl === false).length,
  nomes_so_por_publico: rr.filter((r) => r.anon_pode === true && r.publico_na_acl === true && r.entrada_anon_no_acl === false).map((r) => r.nome).sort(),
  nomes_por_membria_ou_default: rr.filter((r) => r.anon_pode === true && r.publico_na_acl === false && r.entrada_anon_no_acl === false).map((r) => r.nome).sort(),
});
const rota_do_texto = rotaDe(rows);

// ---- 6) o registo de pos-aplicacao da PEN-48, escolhido por medida e nao por memoria ------------------
const candidatosRegisto = readdirSync(join(REPO, 'evidence'))
  .filter((f) => /^p73-pen48-preflight-reversao-.*pen48pos\.json$/.test(f));
if (candidatosRegisto.length !== 1) throw new Error('ABORTA: o registo de pos-aplicacao da PEN-48 nao e exactamente um em evidence/ — li ' + JSON.stringify(candidatosRegisto));
const registo48 = JSON.parse(readFileSync(join(REPO, 'evidence', candidatosRegisto[0]), 'utf8'));
const censoRegistrado = registo48.censo_de_exposicao_anonima || {};
const contraste = {};
for (const k of ['total', 'anon_pode', 'anon_por_entrada', 'acl_nula']) {
  contraste[k] = { registro_pen48: censoRegistrado[k] ?? null, hoje: censo[0] ? censo[0][k] : null, delta: censo[0] && typeof censoRegistrado[k] === 'number' ? censo[0][k] - censoRegistrado[k] : null };
}
const alvoRegistrado = (registo48.alvo || {}).acl;

// ---- 7) fixtures: cada classe e cada predicado tem de disparar, e o inverso tambem -------------------
// A fabrica deriva as duas colunas de texto da ACL com os predicados copiados do produtor, exatamente como a
// rota de cima as deriva do catalogo: assim o fixture exercita o codigo que produz o numero, nao uma copia dele.
const fabrica = (nome, acl, anonPode, noAlvo) => ({
  nome, acl, anon_pode: anonPode, no_alvo_de_peca_de_graus: noAlvo,
  entrada_anon_no_acl: temEntradaAnon(acl), publico_na_acl: temPublicX(acl),
});
const FIX_ROWS = [
  fabrica('f_no_alvo_aberto', 'postgres=X/postgres,anon=X/postgres', true, true),
  fabrica('f_no_alvo_fechado', 'postgres=X/postgres,authenticated=X/postgres', false, true),
  fabrica('f_fora_aberto', 'postgres=X/postgres,anon=X/postgres,service_role=X/postgres', true, false),
  fabrica('f_fora_fechado', '<null_por_default>', false, false),
  fabrica('f_so_por_publico', 'postgres=X/postgres,=X/postgres', true, false),
  fabrica('f_por_membria', 'postgres=X/postgres,municipality_admin=X/postgres', true, false),
];
const rotaFix = rotaDe(FIX_ROWS);
const fixClasses = Object.fromEntries(CLASSES.map((c) => [c, FIX_ROWS.filter((r) => classeDe(r) === c).map((r) => r.nome)]));
const cada_classe_tem_positivo_em_fixture = CLASSES.every((c) => fixClasses[c].length >= 1);
const fix_predicados = {
  entrada_anon_positivo: temEntradaAnon('postgres=X/postgres,anon=X/postgres,authenticated=X/postgres'),
  entrada_anon_negativo_na_acl_apertada: temEntradaAnon('postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres'),
  entrada_anon_negativa_so_no_nome: temEntradaAnon('anon_reader=X/postgres,postgres=X/postgres'),
  papeis_da_acl_apertada: papeisDe('postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres'),
  papeis_do_default: papeisDe('<null_por_default>'),
  leitura_negativa: eLeitura('REVOKE EXECUTE ON FUNCTION public.x() FROM anon'),
};
// A cegueira do `papeisDe` sobre PUBLIC e medida aqui, nao suposta: a entrada de PUBLIC e a unica cuja
// palavra antes do `=` e vazia, por isso o `.filter((r) => r)` dela desiste. Sem este fixture, ler
// `papeis_no_acl` como «todos os que podem executar» fabricaria um fechado para o anon.
const FIX_ACL_COM_PUBLICO = 'postgres=X/postgres,=X/postgres,anon=X/postgres';
const fix_publico = {
  papeis_de_um_acl_com_publico: papeisDe(FIX_ACL_COM_PUBLICO),
  publico_positivo: temPublicX(FIX_ACL_COM_PUBLICO),
  publico_negativo_na_acl_apertada: temPublicX('postgres=X/postgres,anon=X/postgres'),
  publico_negativo_no_default: temPublicX('<null_por_default>'),
  publico_so_sem_anon: temPublicX('postgres=X/postgres,=X/postgres'),
};
const fix_predicados_ok = fix_predicados.entrada_anon_positivo === true
  && fix_predicados.entrada_anon_negativo_na_acl_apertada === false
  && fix_predicados.entrada_anon_negativa_so_no_nome === false
  && fix_predicados.papeis_do_default.length === 0
  && fix_predicados.leitura_negativa === false;
const fix_publico_ok = fix_publico.publico_positivo === true
  && fix_publico.publico_negativo_na_acl_apertada === false
  && fix_publico.publico_negativo_no_default === false
  && fix_publico.publico_so_sem_anon === true
  && fix_publico.papeis_de_um_acl_com_publico.join(',') === 'anon,postgres';

// ---- 8) portoes ---------------------------------------------------------------------------------------
// A guarda de leitura prova-se pelo seu negativo: passo-lhe texto de escrita e exijo que tenha atirado **sem**
// chegar ao `sql`. Sem este ramo, `eLeitura` seria uma frase no meu cabeçalho, não um portão.
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('REVOKE EXECUTE ON FUNCTION public.x() FROM anon'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /so-leitura/.test(String(e && e.message)); }
const falhas = [];
const gate = (nome, obtido, esperado, detalhe) => {
  const verde = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!verde) falhas.push(nome);
  return { nome, verde, obtido, esperado, detalhe };
};
const portoes = [
  gate('a_identidade_do_ar_bate_com_o_diario_de_publicacao', identidade.ar_bate_com_o_diario, true, identidade),
  gate('o_bundle_varrido_pelo_p126_e_o_mesmo_ar_do_diario', [pega_do_bundle.disco_bate_com_o_registro_p126, pega_do_bundle.bundle_e_o_ar_do_diario], [true, true], pega_do_bundle),
  gate('as_predicas_de_acl_sao_as_do_preflight_da_pen48', predicasConferidas.filter(Boolean).length, PREDICAS_DE_HOJE.length, { lidas: predicasConferidas, ficheiro: F_PREFLIGHT }),
  gate('a_query_do_censo_e_a_do_produtor', normal(SQL_CENSO).includes("has_function_privilege('anon'::regrole"), true, { caracteres: SQL_CENSO.length, colunas: SQL_CENSO.split('count(*)').length - 1 }),
  gate('o_extractor_de_alvo_apanha_a_linha_aplicada_da_pen48', extraiu_a_linha_da_pen48, true, alvos.filter((a) => a.ficheiro === 'p73-pen48-ddl-candidata.sql')),
  gate('o_extractor_de_alvo_dispara_no_fixture_e_na_pega_do_comentario', fixAlvo, FIX_ALVO_ESPERADO, { obtido: fixAlvo, esperado: FIX_ALVO_ESPERADO }),
  gate('cada_classe_de_classificador_tem_positivo_em_fixture', cada_classe_tem_positivo_em_fixture, true, fixClasses),
  gate('os_predicados_de_acl_tem_positivo_e_negativo_em_fixture', fix_predicados_ok, true, fix_predicados),
  gate('nenhum_nome_do_universo_fica_fora_das_quatro_classes', rows.length + ausentes.length, UNIVERSO.length, { linhas: rows.length, ausentes: ausentes.length, universo: UNIVERSO.length }),
  gate('o_nome_aplicado_pela_pen48_esta_fechado_hoje', (() => { const r = rows.filter((x) => x.nome === 'register_gate_checkin_v2'); return r.length === 1 && r[0].anon_pode === false && r[0].entrada_anon_no_acl === false ? [1, false, false] : [r.length, null, null]; })(), [1, false, false], rows.filter((x) => x.nome === 'register_gate_checkin_v2')),
  gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', [guardaAbortou, guardaChegouAoBanco], [true, false], { mensagem: 'REVOKE passado a q() na corrida' }),
  gate('o_despir_de_comentarios_tem_os_dois_lados_no_fixture', [fixAlvo, FIX_ALVO_SEM_DESPIR], [FIX_ALVO_ESPERADO, ['uma_funcao', 'outra', 'terceira', 'comentario']], { com_despir: fixAlvo, sem_despir: FIX_ALVO_SEM_DESPIR }),
  gate('o_extractor_le_as_duas_familias_de_grau_e_nao_deixa_linha_do_texto_fora', [linhas_de_graus_extraidas === linhas_de_graus_cruas, linhas_de_graus_cruas > 0, familias_de_grau], [true, true, ['ALL', 'EXECUTE']], { extraidas: linhas_de_graus_extraidas, cruas: linhas_de_graus_cruas, por_grau: contagem_por_grau, ficheiros: FICHEIROS_DDL }),
  gate('o_resumo_de_classes_imprime_as_quatro_com_corpus_vazio_e_cheio', [Object.keys(resumoClasses([])).length, resumoClasses([]).fora_do_alvo_e_anon_pode.total, Object.keys(resumoClasses(FIX_ROWS)).length, resumoClasses(FIX_ROWS).fora_do_alvo_e_anon_pode.total], [4, 0, 4, 3], { vazio: resumoClasses([]), fixture: resumoClasses(FIX_ROWS) }),
  gate('o_predicado_de_publico_e_do_preflight_e_a_cegueira_do_papeisDe_e_medida_em_fixture', [fix_publico_ok, fix_publico.papeis_de_um_acl_com_publico, fix_publico.publico_positivo, fix_publico.publico_so_sem_anon], [true, ['anon', 'postgres'], true, true], fix_publico),
  gate('a_rota_do_texto_tem_positivo_nos_tres_baldes_de_abertura_no_fixture', [rotaFix.linhas, rotaFix.anon_pode, rotaFix.anon_explicito_no_texto, rotaFix.so_por_publico, rotaFix.por_membria_ou_default], [6, 4, 2, 1, 1], rotaFix),
  gate('as_duas_unidades_do_extractor_de_graus_sao_divergentes_no_fixture', [fix_multi_cabecas, fix_multi_pares, alvos.length >= linhas_de_graus_extraidas], [1, 2, true], { cabecas_no_corpus: linhas_de_graus_extraidas, pares_no_corpus: alvos.length, por_grau: contagem_por_grau, fixture: FIX_MULTI_PAPEL.trim() }),
  gate('a_rota_do_texto_bate_conta_a_conta_com_a_coluna_do_catalogo_no_corpus', [rota_do_texto.anon_explicito_no_texto + rota_do_texto.so_por_publico + rota_do_texto.por_membria_ou_default === rota_do_texto.anon_pode, rota_do_texto.anon_pode <= censo[0].anon_pode], [true, true], { soma_dos_tres_baldes: rota_do_texto.anon_explicito_no_texto + rota_do_texto.so_por_publico + rota_do_texto.por_membria_ou_default, coluna_do_catalogo: rota_do_texto.anon_pode, censo_do_esquema: censo[0].anon_pode, rotas: rota_do_texto }),
];

const euBruto = readFileSync(join(REPO, 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs'));
const saida = {
  peca: 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  emissor_bytes: euBruto.length, emissor_md5: md5(euBruto),
  pergunta: 'dos nomes que o servido chama e dos que as candidatas municipais de DDL criam, quantos tem hoje EXECUTE a anon, por qual entrada do texto da ACL, e quantos estao fora do alvo de qualquer peca de graus ja escrita?',
  metodo: 'SELECTs de catalogo so com a eLeitura do produtor como guarda; nomes lidos do artefacto do p126 e dos CREATE FUNCTION por globo; alvo lido das duas familias de linha de grau nos mesmos SQL (REVOKE/GRANT EXECUTE e REVOKE/GRANT ALL ON FUNCTION, com o despir de comentarios); identidade do ar conferida antes de contar; zero chamada a /rpc. As quatro predicas de ACL (anon, papeis, leitura, PUBLIC) sao copiadas literalmente do preflight da PEN-48 e a igualdade de texto e portao.',
  identidade_do_medido: identidade, bundle_dos_nomes: pega_do_bundle,
  fontes: {
    preflight_pen48: F_PREFLIGHT, censo_p126: F_P126, ficheiros_ddl_lidos: FICHEIROS_DDL,
    ficheiros_ddl_no_repo: FICHEIROS_DDL_TODOS.length, ficheiros_ddl_excluidos_por_globo: FICHEIROS_DDL_TODOS.filter((f) => !FICHEIROS_DDL.includes(f)),
    create_function_por_ficheiro: porFicheiroCreate, registo_pen48: 'evidence/' + candidatosRegisto[0],
  },
  universos: { nomes_do_ar: NOMES_DO_AR, nomes_municipais_de_ddl: NOMES_MUNICIPAIS, universo: UNIVERSO.length, nomes_do_alvo: NOMES_DO_ALVO, alvo_linhas: alvos, cobertura_do_extract_de_graus: { linhas_no_texto: linhas_de_graus_cruas, linhas_extraidas: linhas_de_graus_extraidas, por_grau: contagem_por_grau, familias: familias_de_grau, ficheiros: FICHEIROS_DDL, unidade_de_linhas: 'cabecas de declaracao de grau no texto despido de comentarios, nao linhas do ficheiro', unidade_de_por_grau: 'pares declaracao x papel, depois do desdobrar da lista de papeis', pares_no_corpus: alvos.length } },
  por_nome: rows, classes: resumo, rota_do_texto,
  ausente_no_catalogo: { total: ausentes.length, nomes: ausentes },
  censo_do_esquema_inteiro: censo[0], contraste_com_registo_da_pen48: contraste, acl_do_alvo_no_registo: alvoRegistrado,
  entrada_anon_distinta_no_corpus: [...new Set(rows.map((r) => r.entrada_anon_no_acl))].sort(),
  publico_na_acl_distinto_no_corpus: [...new Set(rows.map((r) => r.publico_na_acl))].sort(),
  fixtures: { classes: fixClasses, predicados: fix_predicados, publico: fix_publico, extractor_alvo: { com_despir: fixAlvo, sem_despir: FIX_ALVO_SEM_DESPIR, esperado: FIX_ALVO_ESPERADO } },
  o_que_prova: 'quais nomes que o ar servido chama ou que as candidatas municipais criam tem hoje EXECUTE a anon no catalogo vivo, medido com as predicas e a query do preflight da PEN-48, e quantos desses nunca aparecem como alvo de um REVOKE/GRANT EXECUTE escrito pela casa; e, por rota independente do has_function_privilege, em quantos a abertura vem duma entrada explicita do anon, dum grant a PUBLIC ou de nada dos dois.',
  o_que_NAO_prova: 'que uma pessoa sem sessao receba dados de um nome aberto: RLS, colunas e argumentos nao se leem num ACL, e esta peca nao chamou /rpc nenhuma vez. Nao prova nada sobre os nomes de public que o front nao chama nem as candidatas criam (o denominador deles e o censo). Nao autoriza REVOKE nenhum: uma peca de graus continua a pedir a sua frase literal. E `papeis_no_acl` nao e a lista de quem pode executar: a entrada de PUBLIC comeca por `=` sem nome, por isso o predicado copiado do produtor descarta-a; quem precisar de PUBLIC leia `publico_na_acl` e `rota_do_texto`.',
  portoes: { total: portoes.length, falhas: falhas.length, lista: portoes },
};
saida.veredito = falhas.length === 0
  ? 'P139_ALVOS_MEDIDO ' + portoes.length + '/0 · universo ' + UNIVERSO.length + ' · anon_pode_fora_do_alvo ' + porClasse.fora_do_alvo_e_anon_pode.length + ' · censo ' + censo[0].anon_pode + '/' + censo[0].anon_por_entrada + ' de ' + censo[0].total
  : 'P139_VERMELHO_' + falhas.length;

if (falhas.length) {
  const p = OUT.replace(/\.json$/, '-VERMELHO.json');
  writeFileSync(p, JSON.stringify(saida, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  console.log('P139_VERMELHO ' + falhas.length + '/' + portoes.length + ' · guarda dos dois nomes: ' + OUT + ' (nao escrito) e ' + p);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('ar: ' + identidade.versao_registada + ' md5=' + identidade.md5_apanhado + ' bytes=' + identidade.bytes_apanhados + ' bate=' + identidade.ar_bate_com_o_diario);
console.log('bundle dos nomes: ' + pega_do_bundle.caminho + ' ' + pega_do_bundle.bytes_em_disco + ' B · mesmo_ar=' + pega_do_bundle.bundle_e_o_ar_do_diario);
console.log('universo ' + UNIVERSO.length + ' (ar ' + NOMES_DO_AR.length + ' + municipais ' + NOMES_MUNICIPAIS.length + ') · alvo das pecas: ' + NOMES_DO_ALVO.join(', '));
for (const c of CLASSES) console.log('  ' + c + ': ' + porClasse[c].length + ' — ' + (porClasse[c].join(', ') || '(vazio, impresso de proposito)'));
console.log('  ausente_no_catalogo: ' + ausentes.length + ' — ' + (ausentes.join(', ') || '(vazio)'));
console.log('censo hoje: ' + JSON.stringify(censo[0]) + ' · contraste ' + JSON.stringify(contraste.total) + ' ' + JSON.stringify(contraste.anon_pode));
console.log('nomes com entrada anon=X no ACL: ' + rows.filter((r) => r.entrada_anon_no_acl).map((r) => r.nome + (r.no_alvo_de_peca_de_graus ? '[alvo]' : '[fora]')).join(' '));
for (const p of portoes) console.log('  portao ' + p.nome + ': ' + (p.verde ? 'VERDE' : 'VERMELHO'));
console.log(saida.veredito + ' · ' + saida.duracao_ms + ' ms · registo ' + OUT);
