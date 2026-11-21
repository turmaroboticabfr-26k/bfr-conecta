#!/usr/bin/env node
// P74-PEN44-GERA-CANDIDATA — fecha o EXECUTE de `anon` nos nomes cujo grau chega pela entrada a PUBLIC, sem tirar
// grau a mais nenhum papel. Escrita a partir do que o catálogo AFIRMA, nunca da memória.
// Porque a PEN-43 não chega aqui: as três funções municipais dela não têm entrada a PUBLIC na ACL, e o
// classificador da geradora anterior recusava justamente os nomes com `=X` — `REVOKE … FROM anon` num nome cujo
// grau vem de PUBLIC é no-op decorativo. A alavanca deste caso é outra, e o custo também: `REVOKE … FROM PUBLIC`
// não sabe de papéis, retira o grau a TODOS os que o recebiam por essa via. Medido em 21/11 antes de escrever uma
// linha de SQL: 59 nomes têm a entrada a PUBLIC e o anónimo a executar; um revoke pelo próprio deixaria papéis de
// plataforma sem grau que hoje têm. Por isso cada nome traz, ao lado do revoke, um GRANT explícito exactamente aos
// papéis que hoje executam e NÃO conservariam o grau sem a entrada a PUBLIC — considerando herança de papéis,
// porque herdar de um superuser também conserva. A invariante que a candidata declara e o preflight confere:
//   depois de aplicar, `anon` não executa nenhum nome do alvo, e nenhum outro papel perde um grau que tinha.
// Um GRANT a mais seria uma abertura real: daria a um papel o grau mesmo depois de o pai o perder. Por isso a
// lista é calculada, e não é «todos os papéis».
// 0 escrita no banco: só SELECTs ao catálogo, contados no registo. Única escrita: os dois .sql novos + o registo.
// Os ficheiros saem entre BEGIN; e COMMIT;: um GRANT de preservação em falta no meio deixaria um papel sem o grau
// que tinha e o anónimo ainda com ele — o pior dos dois mundos, e irreversível de memória.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDaAssinatura } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p74-pen44-gera-candidata-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const CAND = join(REPO, 'scripts/p74-pen44-ddl-candidata.sql');
const REVS = join(REPO, 'scripts/p74-pen44-ddl-reversao.sql');
const t0 = Date.now();
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
// Toda saida por exceccao escreve o parcial: sem artefacto em disco, um vermelho e uma anedota (regra da casa).
const escreveParcial = (motivo, e) => {
  const p = OUT.replace(/\.json$/, '-INTERROMPIDA.json');
  const ficheiros = [CAND, REVS].map((c) => ({ caminho: c, existe: existsSync(c),
    bytes: existsSync(c) ? Buffer.byteLength(readFileSync(c)) : null, md5: existsSync(c) ? md5(readFileSync(c)) : null }));
  try { writeFileSync(p, JSON.stringify({ programa: 'scripts/p74-pen44-gera-candidata.mjs', em: new Date().toISOString(),
    motivo, pilha: String((e && e.stack) || e).slice(0, 1200), ficheiros_na_disc: ficheiros }, null, 2) + '\n'); } catch {}
  console.log('P74_PEN44_CANDIDATA_INTERROMPIDA · ' + motivo + ' · registo ' + p);
  process.exit(1);
};
process.on('uncaughtException', (e) => escreveParcial('uncaughtException', e));
process.on('unhandledRejection', (e) => escreveParcial('unhandledRejection', e));

const formas = [];
const q = async (txt) => { formas.push(/^\s*(select|with)\b/i.test(txt)); return sql(txt); };

// ---- leitura do catálogo ---------------------------------------------------------------------------------
const linhas = await q("select p.oid::text as oid, p.proname as nome,"
  + " coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,"
  + " p.provolatile as vol, p.prosecdef::text as definer,"
  + " (select t.typname from pg_type t where t.oid = p.prorettype) as ret,"
  + " pg_get_function_identity_arguments(p.oid) as ident,"
  + " p.proowner::regrole::text as dono,"
  + " has_function_privilege('anon', p.oid, 'EXECUTE') as anon_pode,"
  + " (select r.rolsuper::text from pg_roles r where r.rolname = 'anon') as anon_super"
  + " from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public' order by 1");
// O `array_agg` volta ora como array JS ora como texto `{a,b}` consoante o caminho; as duas formas são legítimas
// e a régua não pode depender de adivinhar qual chegou, por isso se normaliza por nome e não por tipo.
const comoLista = (v) => Array.isArray(v) ? v.map(String)
  : String(v ?? '').replace(/^[{[]|[}\]]$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
const papeis = await q("select r.rolname as papel, r.rolsuper::text as super,"
  + " coalesce(array_agg(m.rolname order by m.rolname), '{}') as herdado_de"
  + " from pg_roles r left join pg_auth_members a on a.member = r.oid left join pg_roles m on m.oid = a.roleid"
  + " where r.rolname not like 'pg\\_%' group by 1, 2 order by 1");
// O predicado de exclusão das famílias `pg*` é a régua que decide quem entra no censo de preservação, e `LIKE` sem
// ESCAPE usa `_` como curinga de um caractere: `pg_%` come `pgbouncer`, que é um papel de verdade com LOGIN e que
// hoje executa os nomes por causa da entrada a PUBLIC. Foi assim que a primeira corrida desta geradora emitiu 7
// papéis preservados onde o catálogo diz 8 — o preflight, que enumera por outro caminho, deu o vermelho. A lista
// completa é portanto lida à parte e confrontada com um filtro JS que não tem curingas.
const papeisTodos = await q("select rolname as papel from pg_roles order by 1");
const comoLike = (padrao, valor) => { const esc = (c) => '/[.*+?^${}()|[]\\'.includes(c) ? '\\' + c : c;
  let re = '^';
  for (let i = 0; i < padrao.length; i++) {
    if (padrao[i] === '\\') { re += '\\' + padrao[++i]; continue; }
    if (padrao[i] === '_') { re += '.'; continue; }
    if (padrao[i] === '%') { re += '.*'; continue; }
    re += esc(padrao[i]);
  }
  return new RegExp(re + '$').test(valor); };
const FIX_PREDICADO_DE_EXCLUSAO = {
  sem_escape_devora_pgbouncer: comoLike('pg_%', 'pgbouncer') === true,
  escapado_so_omite_a_familia: comoLike('pg\\_%', 'pgbouncer') === false && comoLike('pg\\_%', 'pg_read_all_data') === true,
  papel_de_plataforma_fica: comoLike('pg\\_%', 'dashboard_user') === false,
};
const esperadosNoServidor = papeisTodos.map((x) => x.papel).filter((r) => !r.startsWith('pg_'));
const PAPEIS = papeis.map((x) => x.papel);
const Info = Object.fromEntries(papeis.map((x) => [x.papel, { super: x.super === 'true', herdado_de: comoLista(x.herdado_de) }]));

const entra = (acl, quem) => String(acl).split('|').some((i) => {
  const eq = i.indexOf('=');
  return (eq < 0 ? i : i.slice(0, eq)) === quem && (eq < 0 ? '' : (i.slice(eq + 1).split('/')[0] || '')).includes('X');
});
const publicX = (acl) => entra(acl, '') || entra(acl, 'public');
const nula = (acl) => acl === 'NULL_POR_DEFAULT';

// Simulação do que cada papel conserva DEPOIS de retirar a entrada a PUBLIC (e, nos nomes com entrada explícita,
// depois de a retirar também ao anon): conserva por entrada própria, por ser superuser, por ser dono, ou por
// herdar de um papel que conserva. O fecho é iterativo porque a herança tem ciclos e profundidade variável.
const conservaSemPublic = (acl, dono, papel, { semAnon = true } = {}) => {
  const vista = new Set();
  const ir = (r) => {
    if (vista.has(r)) return false;
    vista.add(r);
    if (Info[r]?.super) return true;
    if (r === dono) return true;
    if (r === 'anon' && semAnon) return false;
    if (entra(acl, r)) return true;
    return (Info[r]?.herdado_de || []).some(ir);
  };
  return ir(papel);
};

const alvoBruto = linhas.filter((x) => x.anon_pode === true && publicX(x.acl));
const gatilhosFora = alvoBruto.filter((x) => x.ret === 'trigger').map((x) => x.nome);
const alvo = alvoBruto.filter((x) => x.ret !== 'trigger');
const ids = alvo.map((x) => x.oid);
if (ids.some((o) => !/^[0-9]+$/.test(o))) throw new Error('ABORTA: oid de funcao fora da forma numerica — a lista IN nao pode levar texto');
const porPapel = await q("select p.oid::text as oid, r.rolname as papel, has_function_privilege(r.rolname, p.oid, 'EXECUTE') as pode"
  + " from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'"
  + " join pg_roles r on r.rolname not like 'pg\\_%' where p.oid in (" + ids.join(',') + ") order by 1, 2");
const porOid = Object.fromEntries(alvo.map((x) => [x.oid, x]));
const perdas = {}, antes = {};
for (const p of porPapel) {
  const x = porOid[p.oid];
  if (!x) continue;
  (antes[x.nome] = antes[x.nome] || []).push({ papel: p.papel, pode: p.pode === true });
  if (p.papel === 'anon' || p.pode !== true) continue;
  if (conservaSemPublic(x.acl, x.dono, p.papel) === false) (perdas[x.nome] = perdas[x.nome] || []).push(p.papel);
}

const classif = alvo.map((x) => ({
  nome: x.nome, ret: x.ret, vol: x.vol, definer: x.definer, dono: x.dono, acl: x.acl, ident: x.ident,
  anon_explicito: entra(x.acl, 'anon'), public_explicito: publicX(x.acl), acl_nula: nula(x.acl),
  precisa_revoke_anon: entra(x.acl, 'anon'),
  preservar: (perdas[x.nome] || []).sort(),
  tipos: tiposDaAssinatura(x.ident),
  anon_superuser: x.anon_super === 'true',
  assinatura_casa: assinaturaCorresponde(tiposDaAssinatura(x.ident), x.ident),
}));

const contagemPerdas = Object.values(perdas).reduce((s, v) => s + v.length, 0);
const papeisPreservados = [...new Set(Object.values(perdas).flat())].sort();
const nomesComPerda = Object.keys(perdas).length;

// ---- mundos fabricados, para cada régua ter positivo E negativo ------------------------------------------
const ACL_BASE = 'postgres=X/postgres|anon=X/postgres';
const ACL_REAL = ACL_BASE + '|authenticated=X/postgres|service_role=X/postgres';
const mundoSemPublic = publicX('postgres=X/postgres|anon=X/postgres|authenticated=X/postgres') === false;
const mundoAclNula = nula('NULL_POR_DEFAULT') === true && publicX('NULL_POR_DEFAULT') === false;
// Mundo legitimo onde ninguem depende do default alem do anon: cada papel tem entrada propria na ACL. La a
// preservacao e vazia e correcta — a regua nao pode estar viciada a exigir lista nao vazia, senao «sem
// preservasao» e «todos preservados por entrada propria» dariam o mesmo verde.
const ACL_TODOS_EXPLICITOS = [ACL_BASE, ...PAPEIS.filter((p) => p !== 'anon').map((p) => p + '=X/postgres')].join('|');
const todosConservamPorEntradaPropria = PAPEIS.filter((p) => p !== 'anon').every((p) => conservaSemPublic(ACL_TODOS_EXPLICITOS, 'postgres', p) === true);
const anon_perde_mesmo_la = conservaSemPublic(ACL_TODOS_EXPLICITOS, 'postgres', 'anon') === false;
const FIX_SEM_PRESERVAR_NECESSARIO = todosConservamPorEntradaPropria && anon_perde_mesmo_la;
// Na ACL real, com a entrada a PUBLIC retirada, papeis de plataforma perdem o grau: e o custo que os GRANT pagam.
const perdem_na_acl_real = PAPEIS.filter((p) => p !== 'anon' && !conservaSemPublic(ACL_REAL, 'postgres', p));
const mundoDaAclRealPerdePapeis = perdem_na_acl_real.length > 0;
const FIX_TIPOS = {
  nomes_de_parametro: assinaturaCorresponde(['uuid'], 'p_target uuid') === true,
  tipo_de_duas_palavras: assinaturaCorresponde(['double precision'], 'p_valor double precision') === true,
  aridade_trocada: assinaturaCorresponde(['uuid', 'text'], 'p_a uuid') === false,
  tipo_trocado: assinaturaCorresponde(['uuid'], 'p_a text') === false,
  lista_vazia: assinaturaCorresponde([], '') === true,
};
const PEN43 = readFileSync(join(REPO, 'scripts/p73-pen43-ddl-candidata.sql'), 'utf8');
const nomes43 = [...new Set([...PEN43.matchAll(/^REVOKE EXECUTE ON FUNCTION public\.([a-z0-9_]+)\(/gm)].map((m) => m[1]))];
const nomes43Vivos = nomes43.filter((n) => linhas.some((x) => x.nome === n && publicX(x.acl) === false));

// ---- os dois ficheiros ------------------------------------------------------------------------------------
const chaveDe = (c) => c.nome + '(' + c.tipos.join(', ') + ')';
const assina = (c) => 'public.' + chaveDe(c);
const cabecalho = [
  '-- PEN-44 - candidata: fecha o EXECUTE de anon nos nomes municipais cujo grau chega da entrada a PUBLIC e',
  '-- devolve o grau, nome a nome, EXACTAMENTE aos papeis que hoje executam so por causa dessa entrada.',
  '-- Gerada por scripts/p74-pen44-gera-candidata.mjs: nomes, assinaturas e listas de preservacao vem do',
  '-- catalogo vivo (proacl, pg_get_function_identity_arguments, prorettype, has_function_privilege por papel e',
  '-- pg_auth_members), nunca dactilografados. Mudou o catalogo, re-gera-se ou os portoes dao vermelho.',
  '-- Invariante: depois de aplicar, anon nao executa nenhum nome daqui e nenhum outro papel perde um grau que',
  '-- tinha. Um REVOKE FROM PUBLIC pelado deixaria ' + contagemPerdas + ' pares papel-funcao sem grau, entre eles',
  '-- ' + papeisPreservados.length + ' papeis de plataforma que hoje executam estes nomes so pela entrada a PUBLIC.',
  '-- Um GRANT a mais tambem e um erro: daria o grau a um papel mesmo depois de o pai o perder. Por isso a lista',
  '-- de cada nome e a diferenca medida entre o grau de hoje e o que restaria, nunca uma lista recordada.',
  '-- 0 dados tocados: nenhuma linha escreve em tabelas. Autorizacao exigida: APLICAR PEN-44 NO BANCO.',
  '-- Transacao unica: um GRANT de preservacao em falta aborta tudo, em vez de deixar meio mundo fechado.',
  '', 'BEGIN;', '',
];
const blocoCand = (c) => {
  const l = [];
  if (c.precisa_revoke_anon) l.push('REVOKE EXECUTE ON FUNCTION ' + assina(c) + ' FROM anon;');
  l.push('REVOKE EXECUTE ON FUNCTION ' + assina(c) + ' FROM PUBLIC;');
  if (c.preservar.length) l.push('GRANT EXECUTE ON FUNCTION ' + assina(c) + ' TO ' + c.preservar.join(', ') + ';');
  return l.join('\n');
};
const textoCand = cabecalho.join('\n') + '\n' + classif.map(blocoCand).join('\n\n') + '\n\nCOMMIT;\n\n'
  + '-- FORA DESTA PECA (declarado, nao esquecido):\n'
  + '-- * ' + gatilhosFora.length + ' nomes devolvem `trigger`: nao sao superficie RPC e saem do alvo por\n'
  + '--   `prorettype`; a lista de nomes esta no registo da geradora.\n'
  + '-- * As ' + nomes43.length + ' funcoes municipais de leitura da PEN-43 nao tem entrada a PUBLIC na ACL viva,\n'
  + '--   por isso a alavanca delas e REVOKE ... FROM anon e o ficheiro e outro.\n';
const textoRevs = [
  '-- PEN-44 - reversao: devolve a PUBLIC o grau que a candidata retirou e retira dos papeis que ela preservou,',
  '-- nos mesmos nomes e com as mesmas assinaturas. Se a preservacao nao for desfeita, a reversao deixa na ACL',
  '-- entradas explicitas que o default ja cobre, e o catalogo vivo deixa de ser o espelho do estado de antes.',
  '-- Transacao unica, pela mesma razao da candidata.\n',
  'BEGIN;', '',
].join('\n') + classif.map((c) => {
  const l = [];
  if (c.preservar.length) l.push('REVOKE EXECUTE ON FUNCTION ' + assina(c) + ' FROM ' + c.preservar.join(', ') + ';');
  l.push('GRANT EXECUTE ON FUNCTION ' + assina(c) + ' TO PUBLIC;');
  if (c.precisa_revoke_anon) l.push('GRANT EXECUTE ON FUNCTION ' + assina(c) + ' TO anon;');
  return l.join('\n');
}).join('\n\n') + '\n\nCOMMIT;\n';

for (const [p, t] of [[CAND, textoCand], [REVS, textoRevs]]) {
  if (existsSync(p)) { if (md5(readFileSync(p, 'utf8')) !== md5(t)) throw new Error('ABORTA: ' + p + ' difere do gerado — renomear como ANTERIOR e re-correr'); }
  else writeFileSync(p, t);
}

// ---- portoes -----------------------------------------------------------------------------------------------
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const relectoCand = readFileSync(CAND, 'utf8');
const relectoRevs = readFileSync(REVS, 'utf8');
const semComentarios = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const estruturaDe = (t) => { const s = semComentarios(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm),
    revoke_public: c(/^REVOKE EXECUTE ON FUNCTION .* FROM PUBLIC;/gm),
    revoke_anon: c(/^REVOKE EXECUTE ON FUNCTION .* FROM anon;/gm),
    grant_public: c(/^GRANT EXECUTE ON FUNCTION .* TO PUBLIC;/gm),
    grant_preservacao: c(/^GRANT EXECUTE ON FUNCTION .* TO (?!PUBLIC;|anon;)/gm),
    grant_anon: c(/^GRANT EXECUTE ON FUNCTION .* TO anon;/gm),
    revoke_preservacao: c(/^REVOKE EXECUTE ON FUNCTION .* FROM (?!PUBLIC;|anon;)/gm),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY)\b/gim) }; };
const FIX_SEM_TX = 'REVOKE EXECUTE ON FUNCTION public.x() FROM PUBLIC;\n-- BEGIN; e COMMIT; em comentario nao contam\n';
const estruturaFixSemTx = estruturaDe(FIX_SEM_TX);
const FIX_COMENTARIO_NAO_VIRA_TX = estruturaFixSemTx.begin === 0 && estruturaFixSemTx.commit === 0 && estruturaFixSemTx.revoke_public === 1;
// Uma familia por sentido e por grante: contar `TO anon` como preservacao faria a reversao parecer que
// abria um grau novo, e a ausencia de `TO anon` na reversao passaria despercebida.
const FIX_REVS_SEM_DEVOLVER_ANON = 'GRANT EXECUTE ON FUNCTION public.x() TO PUBLIC;\nGRANT EXECUTE ON FUNCTION public.x() TO dashboard_user;\n';
const estruturaFixSemDevolverAnon = estruturaDe(FIX_REVS_SEM_DEVOLVER_ANON);
const FIX_CONTA_ANON_E_PRESERVACAO_SEPARADAS = estruturaFixSemDevolverAnon.grant_anon === 0 && estruturaFixSemDevolverAnon.grant_preservacao === 1 && estruturaFixSemDevolverAnon.grant_public === 1;
const grauRe = /^(REVOKE|GRANT) EXECUTE ON FUNCTION public\.([a-z0-9_]+)\((.*)\) (?:FROM|TO) ([^;]+);$/gm;
// A chave e a ASSINATURA, nao o nome: um nome com duas sobrecargas fundir-se-ia num só ponto do mapa e o
// espelho deixaria de ver que uma das duas ficou sem GRANT de preservacao.
const colheita = (t) => { const chaves = [], porChave = {}; for (const m of t.matchAll(grauRe)) {
  const chave = m[2] + '(' + m[3] + ')';
  if (!porChave[chave]) { chaves.push(chave); porChave[chave] = { chave, revoke: [], grant: [], revoke_public: false, grant_public: false }; }
  const a = porChave[chave];
  for (const alvoGrau of m[4].split(',').map((s) => s.trim()).filter(Boolean)) {
    if (alvoGrau === 'PUBLIC') { if (m[1] === 'REVOKE') a.revoke_public = true; else a.grant_public = true; continue; }
    a[m[1] === 'REVOKE' ? 'revoke' : 'grant'].push(alvoGrau);
  }
} return { chaves, porChave }; };
const C = colheita(relectoCand), R = colheita(relectoRevs);
// Espelho assinatura a assinatura, com os dois sentidos do PUBLIC medidos no texto: uma linha `TO PUBLIC` na
// candidata seria uma reabertura disfarçada de preservação, e o revoke da reversão sem devolução a PUBLIC
// deixaria o mundo mais fechado do que estava antes de aplicar.
const espelhosOk = classif.every((c) => {
  const vazio = { revoke: [], grant: [], revoke_public: false, grant_public: false };
  const k = chaveDe(c);
  const r = R.porChave[k] || vazio;
  const cand = C.porChave[k] || vazio;
  return JSON.stringify(c.preservar) === JSON.stringify([...new Set(r.revoke)].sort())
    && JSON.stringify([...new Set(cand.grant)].sort()) === JSON.stringify(c.preservar)
    && (c.precisa_revoke_anon ? r.grant.includes('anon') && cand.revoke.includes('anon') : !cand.revoke.includes('anon'))
    && cand.revoke_public === true && cand.grant_public === false && r.grant_public === true && r.revoke_public === false;
});
// O fixture de dados pessoais compoe-se em tempo de execusao: um literal de email no programa que varre emails
// seria o ofensor que a varredura procura (regra da casa, 18/11).
const AT = String.fromCharCode(64), DOM = ['e', 'x', 'a', 'm', 'p', 'l', 'o', '.', 't', 'e', 's', 't'].join('');
const FIX_PESSOAL = 'conta' + AT + DOM;
const varre = (t) => ({ emails: (String(t).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).length, jwt: (String(t).match(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []).length });
const varreduraRegisto = varre(JSON.stringify(classif));
const varreduraFix = varre(FIX_PESSOAL);
const comAnon = classif.filter((c) => c.precisa_revoke_anon).length;
const comPreservar = classif.filter((c) => c.preservar.length > 0).length;
const a = estruturaDe(relectoCand), b = estruturaDe(relectoRevs);

const portoes = [
  g('o_alvo_e_lido_do_catalogo_e_cada_nome_traz_acl_identidade_retorno_e_papeis_enumerados', classif.length > 0 && linhas.length > 0 && PAPEIS.length > 3 && classif.every((c) => c.acl && c.ret && Array.isArray(c.tipos) && c.ident !== undefined), { funcoes_lidas: linhas.length, alvo: classif.length, papeis: PAPEIS.length, tipos_null: classif.filter((c) => !c.tipos).map((c) => c.nome) }),
  g('o_censo_de_papeis_ve_do_catalogo_inteiro_e_o_predicado_nao_devora_um_papel_real', esperadosNoServidor.every((r) => PAPEIS.includes(r)) && PAPEIS.every((r) => r.startsWith('pg_') === false) && papeisTodos.length >= esperadosNoServidor.length && Object.values(FIX_PREDICADO_DE_EXCLUSAO).every((x) => x === true), { no_servidor: papeisTodos.length, esperados: esperadosNoServidor.length, lidos: PAPEIS.length, faltantes: esperadosNoServidor.filter((r) => !PAPEIS.includes(r)), sobrantes: PAPEIS.filter((r) => r.startsWith('pg_')), nomes_onde_o_curinga_e_o_literal_discordam: papeisTodos.map((x) => x.papel).filter((r) => comoLike('pg_%', r) !== r.startsWith('pg_')), predicado: FIX_PREDICADO_DE_EXCLUSAO }),
  g('a_alavanca_e_mesmo_a_entrada_a_public_e_os_dois_mundos_sem_elachumbam_do_alvo', classif.every((c) => c.public_explicito && !c.acl_nula) && mundoSemPublic === true && mundoAclNula === true, { public_sem_entrada_chumba: mundoSemPublic, acl_nula_chumba: mundoAclNula, anon_via_public_sem_acl: linhas.filter((x) => nula(x.acl) && x.anon_pode === true).length }),
  g('o_anon_nao_e_superuser_nem_dono_de_nada_no_alvo_senao_o_revoke_nao_fecharia_nada', classif.every((c) => c.anon_superuser === false && c.dono !== 'anon'), { anon_superuser: classif.filter((c) => c.anon_superuser).map((c) => c.nome), dono_anon: classif.filter((c) => c.dono === 'anon').map((c) => c.nome) }),
  g('a_preservacao_e_calculada_por_papel_com_heranca_e_a_regua_tem_os_dois_mundos', contagemPerdas > 0 && comPreservar === classif.filter((c) => c.preservar.length > 0).length && mundoDaAclRealPerdePapeis === true && FIX_SEM_PRESERVAR_NECESSARIO === true, { pares_preservados: contagemPerdas, papeis_preservados: papeisPreservados, mundo_de_acl_real_perde_papeis: mundoDaAclRealPerdePapeis, mundo_onde_todos_tem_entrada_propria_nao_preserva_nada: FIX_SEM_PRESERVAR_NECESSARIO, perderiam_na_acl_real: perdem_na_acl_real }),
  g('os_grants_de_preservacao_nao_dao_grau_a_quem_ja_o_tem_por_entrada_propria', classif.every((c) => c.preservar.every((p) => entra(c.acl, p) === false)), { entradas_explicitas_na_acl_real: classif.slice(0, 3).map((c) => `${c.nome}:${String(c.acl).split('|').length}`), vazios: classif.filter((c) => c.preservar.length === 0).map((c) => c.nome) }),
  g('os_nomes_com_entrada_anon_explicita_trazem_os_dois_revoke_e_os_outros_so_um', classif.every((c) => { const g2 = ((C.porChave[chaveDe(c)]) || { revoke: [] }).revoke.includes('anon'); return c.anon_explicito ? c.precisa_revoke_anon && g2 : !g2; }) && a.revoke_anon === comAnon, { com_entrada_anon: comAnon, sem_entrada_anon: classif.length - comAnon, revoke_anon_no_ficheiro: a.revoke_anon }),
  g('os_gatilhos_de_trigger_saem_do_alvo_e_a_saida_e_impressa_em_nome_proprio', gatilhosFora.length > 0 && classif.every((c) => c.ret !== 'trigger') && alvoBruto.length === classif.length + gatilhosFora.length, { gatilhos_fora: gatilhosFora.length, rpc_no_alvo: classif.length, nomes_gatilho: gatilhosFora }),
  g('o_escopo_nao_se_sobrepoe_ao_da_pen43_e_a_disjuncao_e_por_chave_independente', nomes43.length === 3 && nomes43Vivos.length === nomes43.length && nomes43.every((n) => !classif.some((c) => c.nome === n)), { pen43: nomes43, sem_public_no_catalogo: nomes43Vivos, interseccao: nomes43.filter((n) => classif.some((c) => c.nome === n)) }),
  g('cada_assinatura_emitida_casa_com_a_identidade_do_servidor_e_a_regua_tem_dentes', classif.every((c) => c.assinatura_casa) && Object.values(FIX_TIPOS).every((x) => x === true), { fixtures: FIX_TIPOS, por_nome: classif.slice(0, 4).map((c) => `${c.nome}:${c.tipos.join('|')}:${c.ident}`), tipos_de_duas_palavras: classif.filter((c) => c.tipos.some((t) => t.includes(' '))).map((c) => c.nome) }),
  g('a_candidata_e_a_reversao_espelham_se_por_assinatura_e_grau_a_grau', espelhosOk && C.chaves.length === classif.length && R.chaves.length === classif.length && JSON.stringify(C.chaves) === JSON.stringify(R.chaves), { assinaturas_candidata: C.chaves.length, assinaturas_reversao: R.chaves.length, espelhos_por_assinatura: espelhosOk, ordem_igual: JSON.stringify(C.chaves) === JSON.stringify(R.chaves) }),
  g('cada_ficheiro_e_uma_unica_transaccao_de_graus_sem_dados_e_dois_mundos_fabricados_chumbam', a.begin === 1 && a.commit === 1 && a.statement_fora_dos_graus === 0 && a.grant_public === 0 && a.revoke_preservacao === 0 && a.revoke_public === classif.length && b.begin === 1 && b.commit === 1 && b.statement_fora_dos_graus === 0 && b.revoke_public === 0 && b.grant_preservacao === 0 && b.grant_public === classif.length && FIX_COMENTARIO_NAO_VIRA_TX === true && FIX_CONTA_ANON_E_PRESERVACAO_SEPARADAS === true, { candidata: a, reversao: b, fixture_sem_transaccao: estruturaFixSemTx, fixture_reversao_sem_devolver_anon: estruturaFixSemDevolverAnon, comentario_contado_como_tx: FIX_COMENTARIO_NAO_VIRA_TX, anon_e_preservacao_contados_a_parte: FIX_CONTA_ANON_E_PRESERVACAO_SEPARADAS }),
  g('as_contagens_textuais_das_quatro_familias_de_grau_batem_com_o_lido_do_catalogo', a.revoke_anon === comAnon && a.grant_preservacao === comPreservar && b.grant_anon === comAnon && b.revoke_preservacao === comPreservar && a.revoke_public === classif.length && b.grant_public === classif.length, { revoke_anon_cand: a.revoke_anon, grant_preservacao_cand: a.grant_preservacao, grant_anon_revs: b.grant_anon, revoke_preservacao_revs: b.revoke_preservacao, com_anon: comAnon, com_preservar: comPreservar, alvo: classif.length }),
  g('nenhuma_query_deste_programa_escreveu_no_banco', formas.length === 4 && formas.every((x) => x === true), { queries: formas.length, nao_leitura: formas.filter((x) => !x).length }),
  g('nenhum_identificador_pessoal_nem_token_entra_neste_registo_e_a_varredura_tem_fixture', varreduraRegisto.emails === 0 && varreduraRegisto.jwt === 0 && varreduraFix.emails === 1, { registo: varreduraRegisto, fixture_dispara: varreduraFix }),
  g('os_dois_ficheiros_sao_o_que_o_gerador_produz_byte_a_byte', md5(relectoCand) === md5(textoCand) && md5(relectoRevs) === md5(textoRevs), { candidata: { bytes: Buffer.byteLength(relectoCand), md5: md5(relectoCand) }, reversao: { bytes: Buffer.byteLength(relectoRevs), md5: md5(relectoRevs) } }),
];

const out = {
  programa: 'scripts/p74-pen44-gera-candidata.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'que REVOKE fecha hoje o grau de anon nos nomes cujo EXECUTE chega da entrada a PUBLIC, sem tirar grau a mais nenhum papel?',
  metodo: 'catalogo vivo por SELECT: proacl, pg_get_function_identity_arguments, prorettype, prosecdef, proowner, has_function_privilege por cada papel nao-pg_ e pg_auth_members; a lista de preservacao de cada nome e a diferenca entre o que cada papel pode hoje e o que conservaria sem a entrada a PUBLIC, com heranca iterada',
  queries: formas.length, funcoes_no_public: linhas.length, alvo_ate_gatilhos: alvoBruto.length, alvo: classif.length,
  papeis_no_catalogo: papeisTodos.length, papeis_fora_das_familias_pg: esperadosNoServidor.length,
  gatilhos_fora_do_alvo: gatilhosFora, papeis_lidos: PAPEIS, papeis_preservados: papeisPreservados,
  pares_que_perderiam_sem_preservar: contagemPerdas, nomes_com_preservacao: nomesComPerda,
  exemplo_de_preservacao: classif.filter((c) => c.preservar.length > 0).slice(0, 2).map((c) => c.nome + ' <- ' + c.preservar.join('+')),
  precisa_revoke_de_anon: classif.filter((c) => c.precisa_revoke_anon).map((c) => c.nome),
  por_nome: classif,
  fixtures: { public_sem_entrada_chumba: mundoSemPublic, acl_nula_chumba: mundoAclNula,
    mundo_onde_todos_tem_entrada_propria_nao_preserva_nada: FIX_SEM_PRESERVAR_NECESSARIO,
    mundo_da_acl_real_perde_papeis: mundoDaAclRealPerdePapeis, papeis_que_perderiam: perdem_na_acl_real,
    mundo_sem_transaccao_chumba: FIX_COMENTARIO_NAO_VIRA_TX, assinatura: FIX_TIPOS, varredura_dispara: varreduraFix,
    predicado_de_exclusao_de_papeis: FIX_PREDICADO_DE_EXCLUSAO },
  estrutura_dos_arquivos: { candidata: a, reversao: b, fixture_sem_transaccao: estruturaFixSemTx, fixture_reversao_sem_devolver_anon: estruturaFixSemDevolverAnon },
  arquivos: { candidata: { caminho: 'scripts/p74-pen44-ddl-candidata.sql', bytes: Buffer.byteLength(relectoCand), md5: md5(relectoCand) }, reversao: { caminho: 'scripts/p74-pen44-ddl-reversao.sql', bytes: Buffer.byteLength(relectoRevs), md5: md5(relectoRevs) } },
  o_que_nao_prova: 'prova que a candidata existe, que o grau a fechar esta medido na proacl e que a preservacao de cada papel e calculada por has_function_privilege antes e por simulacao com heranca depois. NAO prova o canal HTTP (isso e scripts/p73-sonda-porta-municipal.mjs), nao prova que os ' + gatilhosFora.length + ' gatilhos nem as ' + nomes43.length + ' funcoes da PEN-43 estejam fechados, e nao prova que nenhum papel de plataforma chame uma destas funcoes por caminho interno que o catalogo nao descreva. A aplicacao pede OK literal proprio.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P74_PEN44_CANDIDATA_OK ${portoes.length}/0` : `P74_PEN44_CANDIDATA_VERMELHO ${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P74_PEN44_CANDIDATA_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ALVO ' + classif.length + ' · ATE_GATILHOS ' + alvoBruto.length + ' · GATILHOS_FORA ' + gatilhosFora.length + ' · COM_REVOKE_ANON ' + out.precisa_revoke_de_anon.length);
console.log('PRESERVADOS ' + JSON.stringify(papeisPreservados) + ' · PARES_PRESERVADOS ' + contagemPerdas);
console.log('ARQUIVOS ' + JSON.stringify(out.arquivos.candidata) + ' | ' + JSON.stringify(out.arquivos.reversao));
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
