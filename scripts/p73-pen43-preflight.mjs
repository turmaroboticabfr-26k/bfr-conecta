#!/usr/bin/env node
// P73-PEN43-PREFLIGHT — só leitura. A candidata `scripts/p73-pen43-ddl-candidata.sql` fecha o grau de EXECUTE do
// pseudo-papel `anon` em três funções municipais de leitura, e a reversão devolve-o. Parece a peça mais inofensiva da
// casa — não apaga dados, não toca em policies — e é justamente por isso que ela precisa de preflight: um REVOKE pode
// ser (i) um no-op decorativo, se o grau do anónimo chegar pelo default a PUBLIC em vez duma entrada explícita do
// anon, (ii) dirigido a uma assinatura que não existe, (iii) aplicado a uma função que escreve, fechando o caminho de
// etiquetagem por acidente, ou (iv) a peça que fecha uma porta enquanto as outras 63 ficam abertas, e lida como
// «a porta municipal está fechada». Nada disso se vê no texto do SQL; mede-se no catálogo, neste instante.
//
// O que os modos afirmam, e por que os dois têm verde:
//   modo candidata (omissão) — o grau do anon está ONDE ESTÁ E PODE SER TOCADO: entrada explícita anon=X, nenhuma
//     entrada a PUBLIC, privilégio efectivo true. É o estado que a aplicação destrói.
//   modo reversao — a peça foi aplicada: nenhuma entrada anon=X, privilégio efectivo false, e o GRANT da reversão
//     ainda não está no banco. É o estado que a reversão destrói.
// Os dois modos correm as mesmas duas régua por nomes diferentes, e o `--selfteste` fabrica os dois mundos e exige
// que a cláusula de modo dê verde num e vermelho no outro — uma cláusula verde nos dois mundos não discrimina nada.
//
// O censo de exposição anónima (quantas funções o anon pode executar, quantas só por PUBLIC) é impresso e portado
// contra uma lista DECLARADA, porque a PEN-43 fecha 3 nomes duma família e a casa tem de saber o que fica fora.
// O portão chumba um nome NOVO e aberto, não um nome que deixe de estar aberto: fechar mais portas que a futura
// autorização exige é trabalho, não falha deste instrumento.
// Uso: node scripts/p73-pen43-preflight.mjs            (modo candidata: exige o estado de ENTRADA)
//      node scripts/p73-pen43-preflight.mjs --reversao (modo reversao: exige o estado depois de aplicada)
//      node scripts/p73-pen43-preflight.mjs --selfteste (offline: reguas puras sobre mundos fabricados, 0 banco)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDaAssinatura } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SELFTESTE = process.argv.includes('--selfteste');
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen43-preflight-${MODO}-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const CAND = join(REPO, 'scripts/p73-pen43-ddl-candidata.sql');
const REV = join(REPO, 'scripts/p73-pen43-ddl-reversao.sql');
if (!existsSync(CAND) || !existsSync(REV)) throw new Error('ABORTA: falta a candidata ou a reversao em scripts/');
const txtCand = readFileSync(CAND, 'utf8');
const txtRev = readFileSync(REV, 'utf8');
const bufCand = readFileSync(CAND);
const bufRev = readFileSync(REV);
const pegada = (b) => ({ bytes: b.length, md5: createHash('md5').update(b).digest('hex') });
const sim = (v) => v === true || String(v).toLowerCase() === 't' || String(v).toLowerCase() === 'true';
const nao = (v) => v === false || String(v).toLowerCase() === 'f' || String(v).toLowerCase() === 'false';

// ---- reguas puras (correm tambem no --selfteste, sem banco) -------------------------------------
const semComentarios = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const estruturaDe = (t) => { const s = semComentarios(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm), revoke: c(/^REVOKE EXECUTE/gm), grant: c(/^GRANT EXECUTE/gm),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY)\b/gim) }; };
const RE_GR = (lado) => new RegExp(lado + '\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?([a-z0-9_]+)\\s*\\(([^)]*)\\)\\s+(?:FROM|TO)\\s+anon;', 'gi');
const alvosDe = (t) => [...semComentarios(t).matchAll(RE_GR('REVOKE'))].map((m) => ({ nome: m[1], args: m[2].trim() }));
const grantDe = (t) => [...semComentarios(t).matchAll(RE_GR('GRANT'))].map((m) => ({ nome: m[1], args: m[2].trim() }));
const ehLeitura = (txt) => /^\s*(select|with)\b/i.test(txt);

// A ACL e lida em duas metades independentes: a ENTRADA DO ANON e a ENTRADA A PUBLIC. `public_X` e o que faz um
// REVOKE por nome virar no-op, e e exatamente o mundo que hoje existe noutro nome da familia (medido, nao temido).
const entra = (acl, papel) => String(acl).split('|').some((i) => { const eq = i.indexOf('='); const quem = eq < 0 ? i : i.slice(0, eq);
  return quem === papel && (eq < 0 ? '' : i.slice(eq + 1).split('/')[0] || '').includes('X'); });
const leAcl = (acl) => ({ nula: acl === 'NULL_POR_DEFAULT', anon_X: acl !== 'NULL_POR_DEFAULT' && entra(acl, 'anon'),
  public_X: acl !== 'NULL_POR_DEFAULT' && entra(acl, '') });
// Canal 1: o privilegio efectivo do catalogo. Canal 2: o que a ACL declara. A concordancia e a invariant dos dois
// mundos; o vermelho e um estado que nenhuma das duas metades explica (ou a ACL mente, ou eu li-a mal).
const explicavel = ({ anon_X, public_X, nula }, priv) => !nula && priv === (anon_X || public_X);
// O statement tem de DESTACAR algo: em candidata o anon-X existe e o PUBLIC nao; em reversao o anon-X ja nao existe
// e o PUBLIC continua sem estar la, senao o GRANT da reversao e decorativo.
const destaca = ({ anon_X, public_X }, priv, modo) => modo === 'candidata'
  ? priv === true && anon_X === true && public_X === false
  : priv === false && anon_X === false && public_X === false;
const conferePegada = (pin, buf) => !!pin && pin.md5 === pegada(buf).md5 && pin.bytes === buf.length;

// Nomes da familia municipal que a casa ja sabe estarem fora desta peca, com o motivo medido hoje. Declarar nao e
// exceccao perpétua: um nome NOVO e aberto chumba, e o estado medido de cada declarado vai no registo.
const FORA_DO_ALVO_DECLARADOS = {
  bfr_municipalities_visible: 'stabel, executavel por anon; a ACL dela traz `=X/postgres` alem do anon=X, por isso um REVOKE por nome nao a fecha — fechar-lheia exigir REVOKE ... FROM PUBLIC, que e alargar o escopo da peca e pede OK proprio',
  bfr_school_set_municipality: 'volatil, e a porta de etiquetagem: mantida executavel por anon de proposito para que um anonimo receba 42501 em vez de 404 (decisao da casa, §SM.33)',
};
const AGREGADO = (c) => ({ total: c.length, executiveis: c.filter((x) => sim(x.anon_pode)).length,
  so_por_public: c.filter((x) => sim(x.anon_pode) && !x.acl_estado.anon_X && x.acl_estado.public_X).length,
  sem_entrada_de_anon: c.filter((x) => sim(x.anon_pode) && !x.acl_estado.anon_X).length });
const familiaForaDoAlvo = (censo, alvos) => [...new Set(censo.filter((x) => /^bfr_municipal/.test(x.nome) && sim(x.anon_pode)
  && !alvos.some((a) => a.nome === x.nome)).map((x) => x.nome))];
const temDeclarado = (fora) => fora.every((n) => !!FORA_DO_ALVO_DECLARADOS[n]);

// ---- mundos fabricados: os dois sentidos de cada regua, dentro da propria corrida ---------------
const ACL_HOJE = 'postgres=X/postgres|anon=X/postgres|authenticated=X/postgres|service_role=X/postgres';
const ACL_DEPOIS = 'postgres=X/postgres|authenticated=X/postgres|service_role=X/postgres';
const ACL_COM_PUBLIC = '=X/postgres|postgres=X/postgres|anon=X/postgres|authenticated=X/postgres';
const FIX_MUNDOS = [
  { nome: 'hoje_candidata', acl: ACL_HOJE, priv: true },
  { nome: 'depois_reversao', acl: ACL_DEPOIS, priv: false },
  { nome: 'public_da_no_op', acl: ACL_COM_PUBLIC, priv: true },
  { nome: 'acl_nula_do_default', acl: 'NULL_POR_DEFAULT', priv: true },
  { nome: 'inexplicavel_acl_sem_grau', acl: ACL_HOJE, priv: false },
].map((w) => { const e = leAcl(w.acl); return { ...w, estado: e, explicavel: explicavel(e, w.priv),
  destaca_candidata: destaca(e, w.priv, 'candidata'), destaca_reversao: destaca(e, w.priv, 'reversao') }; });
const M_HOJE = FIX_MUNDOS[0], M_DEPOIS = FIX_MUNDOS[1], M_PUBLIC = FIX_MUNDOS[2], M_NULA = FIX_MUNDOS[3], M_INEXPL = FIX_MUNDOS[4];
const FIX_MUNDOS_TEM_DENTES = M_HOJE.destaca_candidata === true && M_HOJE.destaca_reversao === false
  && M_DEPOIS.destaca_reversao === true && M_DEPOIS.destaca_candidata === false
  && M_PUBLIC.explicavel === true && M_PUBLIC.destaca_candidata === false && M_PUBLIC.destaca_reversao === false
  && M_NULA.explicavel === false && M_NULA.destaca_candidata === false
  && M_INEXPL.explicavel === false && M_INEXPL.destaca_candidata === false && M_INEXPL.destaca_reversao === false;
const FIX_ASSINATURA = {
  aridade_errada_nao_casa: assinaturaCorresponde(tiposDaAssinatura('uuid'), '') === false,
  lista_vazia_casa_com_catalogo_vazio: assinaturaCorresponde(tiposDaAssinatura(''), '') === true,
  nomes_de_parametro_casam: assinaturaCorresponde(tiposDaAssinatura('uuid, text'), 'p_school uuid, p_reason text') === true,
  tipo_trocado_nao_casa: assinaturaCorresponde(tiposDaAssinatura('text'), 'uuid') === false,
};
const FIX_ESTRUTURA = (() => {
  const semTx = estruturaDe('REVOKE EXECUTE ON FUNCTION public.x() FROM anon;\n-- BEGIN; em prosa nao conta\n');
  const comDados = estruturaDe('BEGIN;\nREVOKE EXECUTE ON FUNCTION public.x() FROM anon;\nINSERT INTO t VALUES (1);\nCOMMIT;');
  const espelho = estruturaDe('BEGIN;\nGRANT EXECUTE ON FUNCTION public.x() TO anon;\nCOMMIT;');
  return { sem_transaccao_da_begin_0: semTx.begin === 0 && semTx.revoke === 1, insert_contado: comDados.statement_fora_dos_graus === 1,
    grant_espelho: espelho.grant === 1 && espelho.revoke === 0 && espelho.begin === 1 && espelho.commit === 1 };
})();
const FIX_CENSO_NAO_E_LICENCA = temDeclarado(['bfr_municipalities_visible']) === true
  && temDeclarado(['bfr_municipal_qualquer_coisa_nova']) === false;
const FIX_PEGADA_TEM_DENTES = conferePegada({ bytes: bufCand.length, md5: pegada(bufCand).md5 }, bufCand) === true
  && conferePegada({ bytes: bufCand.length, md5: '0'.repeat(32) }, bufCand) === false
  && conferePegada({ bytes: 1, md5: pegada(bufCand).md5 }, bufCand) === false;

// ---- os dois ficheiros, medidos em disco ---------------------------------------------------------
const alvos = alvosDe(txtCand);
const grants = grantDe(txtRev);
const estruturaCand = estruturaDe(txtCand);
const estruturaRev = estruturaDe(txtRev);
const nomesAlvo = [...new Set(alvos.map((a) => a.nome))];

// A pegada certificada e a da geradora MAIS RECENTE, lida do indice — nao do que eu lembro. Os registos antigos
// continuam listados (historico) mas nao certificam: a regra e o ultimo, senao reverter o ficheiro para o conteudo
// de ontem passaria.
const registoGeradora = (() => {
  let lista = [];
  try { lista = execFileSync('git', ['ls-files', 'evidence'], { cwd: REPO, encoding: 'utf8' }).split('\n')
    .map((s) => s.trim()).filter((s) => /^evidence\/p73-pen43-gera-candidata-.*\.json$/.test(s) && !/VERMELHO/.test(s)); } catch { lista = []; }
  const fichas = lista.map((rel) => { const p = join(REPO, rel); if (!existsSync(p)) return null;
    try { const j = JSON.parse(readFileSync(p, 'utf8')); return { registo: rel, em: j.em, arquivos: j.arquivos, veredito: j.veredito }; } catch { return null; } })
    .filter(Boolean).sort((a, b) => String(a.em).localeCompare(String(b.em)));
  return { indexados: fichas.length, todos: fichas.map((f) => ({ registo: f.registo, em: f.em,
    candidata: f.arquivos && f.arquivos.candidata ? f.arquivos.candidata.md5 : null,
    reversao: f.arquivos && f.arquivos.reversao ? f.arquivos.reversao.md5 : null })),
    mais_recente: fichas.length ? fichas[fichas.length - 1] : null };
})();
const PIN = registoGeradora.mais_recente ? registoGeradora.mais_recente.arquivos : null;

// ---- selfteste offline: nada de banco, nada de escrita --------------------------------------------
if (SELFTESTE) {
  const casos = [];
  const c = (nome, verde, detalhe) => casos.push({ nome, verde: !!verde, ...(detalhe ? { detalhe } : {}) });
  c('os_cinco_mundos_de_acl_tem_os_dois_sentidos_de_cada_regua', FIX_MUNDOS_TEM_DENTES, FIX_MUNDOS);
  c('a_regua_de_assinatura_recusa_aridade_e_tipo_e_tolera_nomes_de_parametro', Object.values(FIX_ASSINATURA).every(Boolean), FIX_ASSINATURA);
  c('a_contagem_de_estrutura_ve_transaccao_dados_e_o_espelho_do_grant', FIX_ESTRUTURA.sem_transaccao_da_begin_0 && FIX_ESTRUTURA.insert_contado && FIX_ESTRUTURA.grant_espelho, FIX_ESTRUTURA);
  c('o_censo_porta_um_nome_novo_e_nao_o_que_ja_esta_declarado', FIX_CENSO_NAO_E_LICENCA, { declarados: Object.keys(FORA_DO_ALVO_DECLARADOS) });
  c('a_pegada_so_bate_com_o_registo_que_a_certificou', FIX_PEGADA_TEM_DENTES, { pin: PIN && { candidata: PIN.candidata.md5, reversao: PIN.reversao.md5 }, medido_agora: { candidata: pegada(bufCand), reversao: pegada(bufRev) } });
  c('os_dois_ficheiros_em_disco_batem_com_o_registo_mais_recente_da_geradora', !!PIN && conferePegada(PIN.candidata, bufCand) && conferePegada(PIN.reversao, bufRev), { indexados: registoGeradora.indexados, todos: registoGeradora.todos });
  c('os_nomes_do_revoke_e_do_grant_sao_o_mesmo_conjunto_espelhado',
    nomesAlvo.length === alvos.length && alvos.length === grants.length && JSON.stringify(nomesAlvo) === JSON.stringify([...new Set(grants.map((x) => x.nome))])
      && JSON.stringify(nomesAlvo) === JSON.stringify(alvos.map((a) => a.nome)), { revoke: alvos, grant: grants });
  c('a_candidata_e_a_reversao_sao_cada_um_uma_unica_transaccao_de_graus',
    estruturaCand.begin === 1 && estruturaCand.commit === 1 && estruturaCand.revoke === alvos.length && estruturaCand.grant === 0 && estruturaCand.statement_fora_dos_graus === 0
      && estruturaRev.begin === 1 && estruturaRev.commit === 1 && estruturaRev.grant === alvos.length && estruturaRev.revoke === 0 && estruturaRev.statement_fora_dos_graus === 0, { candidata: estruturaCand, reversao: estruturaRev });
  c('a_query_de_leitura_e_distinta_de_um_statement_de_escrita', ehLeitura('select 1') === true && ehLeitura('WITH x AS (select 1) select * from x') === true
    && ehLeitura('UPDATE t SET a = 1') === false && ehLeitura('  insert into t values (1)') === false);
  const pires = 'maria@example.edu e um token eyJhbGciOiJIUzI1NiJ9.abcdefghij';
  c('a_varredura_de_pessoal_dispara_no_fixture_e_nao_no_texto_de_ambos_os_lados',
    (pires.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length === 1 && (pires.match(/eyJ[\w-]{10,}/g) || []).length === 1
      && ((semComentarios(txtCand) + semComentarios(txtRev)).match(/eyJ[\w-]{10,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length === 0, { fixture: { emails: 1, jwt: 1 } });
  const boas = casos.filter((x) => x.verde).length;
  console.log(JSON.stringify({ programa: 'scripts/p73-pen43-preflight.mjs', selfteste: true, modo_imitado: MODO,
    escrito_no_banco: false, banco_consultado: false, casos, veredito: boas === casos.length ? `P73_PEN43_PREFLIGHT_SELFTESTE_OK ${casos.length}/0` : `P73_PEN43_PREFLIGHT_SELFTESTE_VERMELHO ${casos.length - boas}` }, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

// ---- estado vivo ----------------------------------------------------------------------------------
const formas = [];
const q = async (txt) => { formas.push(ehLeitura(txt)); return sql(txt); };
const [ctx] = await q('select current_user as utilizador, pg_backend_pid() as pid');
const papeis = await q(`select rolname as papel from pg_roles where rolname in ('anon','authenticated','service_role','postgres') order by 1`);
const lidos = await q(`select p.proname as nome, p.provolatile as vol, p.prosecdef::text as definer,
  pg_get_function_identity_arguments(p.oid) as ident,
  coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,
  has_function_privilege('anon'::regrole, p.oid, 'EXECUTE')::text as anon_pode,
  has_function_privilege('authenticated'::regrole, p.oid, 'EXECUTE')::text as authenticated_pode,
  has_function_privilege('service_role'::regrole, p.oid, 'EXECUTE')::text as service_role_pode,
  pg_get_userbyid(p.proowner)::text as dono
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in (${nomesAlvo.map((n) => `'${n}'`).join(',')}) order by 1`);
// Os controlos leem-se por uma chave INDEPENDENTE do alvo (NOT IN, num select separado): reler o privilégio do
// controlo dentro do predicado que o definiu seria a tautologia que ja me deu um verde sem positivo.
const controlos = await q(`select p.proname as nome, coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,
  has_function_privilege('anon'::regrole, p.oid, 'EXECUTE')::text as anon_pode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where has_function_privilege('anon'::regrole, p.oid, 'EXECUTE') = false and p.proname not in (${nomesAlvo.map((n) => `'${n}'`).join(',')})
  order by 1 limit 8`);
const censo = (await q(`select p.proname as nome, p.provolatile as vol,
  coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,
  has_function_privilege('anon'::regrole, p.oid, 'EXECUTE')::text as anon_pode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public' order by 1`))
  .map((x) => ({ ...x, acl_estado: leAcl(x.acl) }));
// Onde cada REVOKE aponta tem de ser UMA linha do catálogo: `where proname in (...)` traz também sobrecargas, e um
// REVOKE sem argumentos sobre um nome sobrecarregado é ambiguidade no banco, não neste texto.
const porNome = nomesAlvo.map((nome) => {
  const linhas = lidos.filter((x) => x.nome === nome);
  const a = alvos.find((x) => x.nome === nome);
  const l = linhas[0];
  const estado = l ? leAcl(l.acl) : null;
  return { nome, argumentos_no_sql: a ? a.args : null, ident_no_catalogo: l ? l.ident : null, vol: l ? l.vol : null,
    definer: l ? l.definer : null, dono: l ? l.dono : null, acl: l ? l.acl : 'AUSENTE', sobrecargas: linhas.length,
    estado, anon_pode: l ? l.anon_pode : null, authenticated_pode: l ? l.authenticated_pode : null, service_role_pode: l ? l.service_role_pode : null,
    assinatura_casa: !!l && assinaturaCorresponde(tiposDaAssinatura(a ? a.args : ''), String(l.ident)),
    explicavel: !!l && explicavel(estado, sim(l.anon_pode)),
    destaca: !!l && destaca(estado, sim(l.anon_pode), MODO),
    e_de_leitura: !!l && 'si'.includes(String(l.vol)) };
});
const agregado = AGREGADO(censo);
const foraDoAlvo = familiaForaDoAlvo(censo, alvos);
const declaradosMedidos = Object.entries(FORA_DO_ALVO_DECLARADOS).map(([nome, porque]) => {
  const l = censo.find((x) => x.nome === nome);
  return { nome, porque, continua_no_catalogo: !!l, continua_executavel_por_anon: !!l && sim(l.anon_pode),
    acl: l ? l.acl : 'AUSENTE', grau_vem_de_public: l ? l.acl_estado.public_X : null };
});

// ---- portões ---------------------------------------------------------------------------------------
const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('os_nomes_do_revoke_e_do_grant_sao_o_mesmo_conjunto_espelhado', alvos.length >= 1 && nomesAlvo.length === alvos.length
    && JSON.stringify(nomesAlvo) === JSON.stringify([...new Set(grants.map((x) => x.nome))]) && grants.length === alvos.length, { revoke: alvos, grant: grants }),
  g('a_pegada_dos_dois_ficheiros_e_a_do_registo_mais_recente_da_geradora_e_a_regua_tem_dentes',
    !!PIN && conferePegada(PIN.candidata, bufCand) && conferePegada(PIN.reversao, bufRev) && FIX_PEGADA_TEM_DENTES, { indexados: registoGeradora.indexados, mais_recente: registoGeradora.mais_recente ? registoGeradora.mais_recente.registo : null, historico: registoGeradora.todos, medido_agora: { candidata: pegada(bufCand), reversao: pegada(bufRev) } }),
  g('cada_ficheiro_e_uma_unica_transaccao_de_graus_sem_dados_e_os_mundos_fabricados_chumbam',
    estruturaCand.begin === 1 && estruturaCand.commit === 1 && estruturaCand.revoke === alvos.length && estruturaCand.grant === 0 && estruturaCand.statement_fora_dos_graus === 0
      && estruturaRev.begin === 1 && estruturaRev.commit === 1 && estruturaRev.grant === alvos.length && estruturaRev.revoke === 0 && estruturaRev.statement_fora_dos_graus === 0
      && Object.values(FIX_ESTRUTURA).every(Boolean), { candidata: estruturaCand, reversao: estruturaRev, fixtures: FIX_ESTRUTURA }),
  g('cada_nome_existe_uma_sozinha_no_catalogo_e_a_assinatura_do_revoke_casa_com_a_identidade',
    porNome.every((p) => p.sobrecargas === 1 && p.assinatura_casa === true) && porNome.length === alvos.length
      && Object.values(FIX_ASSINATURA).every(Boolean), { por_nome: porNome.map((p) => ({ nome: p.nome, argumentos_no_sql: p.argumentos_no_sql, ident_no_catalogo: p.ident_no_catalogo, sobrecargas: p.sobrecargas, assinatura_casa: p.assinatura_casa })), fixtures: FIX_ASSINATURA }),
  g('o_privilegio_efectivo_do_anon_e_explicado_pela_acl_em_cada_nome_e_os_cinco_mundos_tem_dentes',
    porNome.every((p) => p.explicavel === true) && FIX_MUNDOS_TEM_DENTES, { por_nome: porNome.map((p) => `${p.nome}:acl=${p.acl}:anon_pode=${p.anon_pode}:anon_X=${p.estado && p.estado.anon_X}:public_X=${p.estado && p.estado.public_X}:explicavel=${p.explicavel}`), mundos: FIX_MUNDOS.map(({ estado, ...w }) => ({ ...w, anon_X: estado.anon_X, public_X: estado.public_X, nula: estado.nula })) }),
  g(`o_estado_vivo_do_anon_bate_com_o_que_o_modo_${MODO}_pressupoe_e_o_outro_modo_chumba_nesse_estado`,
    porNome.every((p) => p.destaca === true) && FIX_MUNDOS_TEM_DENTES, { modo: MODO, por_nome: porNome.map((p) => `${p.nome}:anon_pode=${p.anon_pode}:anon_X=${p.estado && p.estado.anon_X}:public_X=${p.estado && p.estado.public_X}:destaca=${p.destaca}`),
      mundo_do_outro_modo: MODO === 'candidata' ? M_DEPOIS.nome : M_HOJE.nome }),
  // O verde do modo reversao nao pode ser so construcao minha: ha nomes reais, hoje, com exactamente a forma que o
  // modo pressupoe — sem entrada de anon, sem entrada a PUBLIC, privilegio efectivo false. Sao os controlos do
  // catalogo, e esta corrida mostra que a regua os reconhece no estado em que eles vivem.
  g('o_estado_que_o_modo_reversao_pressupoe_ja_existe_hoje_noutros_nomes_lidos_do_catalogo', (() => {
    const espelhos = controlos.map((x) => ({ nome: x.nome, estado: leAcl(x.acl), priv: sim(x.anon_pode) }))
      .filter((x) => x.estado.nula === false && x.estado.anon_X === false && x.estado.public_X === false && x.priv === false);
    return espelhos.length >= 2 && espelhos.every((x) => destaca(x.estado, false, 'reversao') === true) && FIX_MUNDOS_TEM_DENTES;
  })(), { espelhos_lidos_do_catalogo: controlos.map((x) => `${x.nome}:anon_X=${leAcl(x.acl).anon_X}:public_X=${leAcl(x.acl).public_X}:anon_pode=${x.anon_pode}`) }),
  g('so_funcoes_de_leitura_entram_na_peca_e_a_porta_de_etiquetagem_fica_fora',
    porNome.every((p) => p.e_de_leitura === true) && alvos.every((a) => a.nome !== 'bfr_school_set_municipality')
      && censo.some((x) => x.nome === 'bfr_school_set_municipality' && sim(x.anon_pode)), { vol: porNome.map((p) => `${p.nome}:${p.vol}`), etiqueta: censo.filter((x) => x.nome === 'bfr_school_set_municipality').map((x) => `${x.nome}:vol=${x.vol}:anon_pode=${x.anon_pode}`) }),
  g('os_papeis_que_a_peca_nao_toca_mantem_o_grau_e_o_anon_e_um_papel_que_existe',
    ['anon', 'authenticated', 'service_role', 'postgres'].every((r) => papeis.some((p) => p.papel === r))
      && porNome.every((p) => sim(p.authenticated_pode) && sim(p.service_role_pode)), { papeis: papeis.map((p) => p.papel), por_nome: porNome.map((p) => `${p.nome}:authenticated=${p.authenticated_pode}:service_role=${p.service_role_pode}:dono=${p.dono}`) }),
  g('existe_controlo_que_o_anon_nao_pode_executar_e_ele_e_disjoint_do_alvo_por_chave_independente',
    controlos.length >= 2 && controlos.every((x) => nao(x.anon_pode)) && controlos.every((x) => !nomesAlvo.includes(x.nome)), { controlos: controlos.map((x) => `${x.nome}:anon_pode=${x.anon_pode}`), alvos: nomesAlvo }),
  g('o_censo_de_exposicao_anonima_imprime_o_que_a_peca_nao_fecha_sem_alargar_o_escopo_silenciosamente',
    agregado.total > 0 && foraDoAlvo.every((n) => !!FORA_DO_ALVO_DECLARADOS[n]) && FIX_CENSO_NAO_E_LICENCA
      && declaradosMedidos.every((d) => d.continua_no_catalogo), { agregado, fora_do_alvo_na_familia_municipal: foraDoAlvo, declarados: declaradosMedidos,
        nota: 'o portao chumba um nome NOVO e aberto na familia, nao um que deixe de estar aberto — fechar mais portas e trabalho de outra autorizacao' }),
  g('nenhuma_query_deste_programa_escreveu_no_banco', formas.length >= 1 && formas.every((x) => x === true) && ehLeitura('UPDATE t SET a = 1') === false, { queries: formas.length, nao_leitura: formas.filter((x) => !x).length }),
];
const varreduraAntes = JSON.stringify({ contexto: ctx, papeis, por_nome: porNome, controlos, agregado, fora_do_alvo: foraDoAlvo, declarados: declaradosMedidos, estruturas: { candidata: estruturaCand, reversao: estruturaRev } });
const varredura = { emails: (varreduraAntes.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length, jwt: (varreduraAntes.match(/eyJ[\w-]{10,}/g) || []).length };
const FIX_VARREDURA = 'maria@example.edu eyJhbGciOiJIUzI1NiJ9.abcdefghij';
const varreduraFix = { emails: (FIX_VARREDURA.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []).length, jwt: (FIX_VARREDURA.match(/eyJ[\w-]{10,}/g) || []).length };
portoes.push(g('nenhum_identificador_pessoal_nem_token_entra_neste_registo', varredura.emails === 0 && varredura.jwt === 0 && varreduraFix.emails === 1 && varreduraFix.jwt === 1, { medida_no_registo: varredura, fixture_que_dispara: varreduraFix }));

const out = {
  programa: 'scripts/p73-pen43-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: MODO === 'candidata'
    ? 'o REVOKE que a candidata envia muda alguma coisa neste instante, nas assinaturas certas, sem tocar em dados nem noutros papeis?'
    : 'a candidata foi aplicada neste banco — o grau do anon esta de facto fechado nos nomes que ela revogou, e o caminho de volta ainda nao foi percorrido?',
  metodo: 'nomes e assinaturas lidos dos REVOKE/GRANT dos dois .sql em disco; pegada confrontada com o registo mais recente da geradora (git ls-files, lido do indice); privilegio efectivo e ACL lidos do catalogo por duas chaves separadas (alvo por IN, controlo por NOT IN); censo de todas as funcoes do esquema public agregado por familia de nome; comparacoes por sim()/nao() porque has_function_privilege devolve booleano e nao um t/f de letra.',
  contexto: { utilizador: ctx.utilizador, pid: ctx.pid },
  pressuposto: MODO === 'candidata'
    ? 'o anon pode executar cada um dos nomes e o grau vem duma entrada anon=X explicita, sem entrada a PUBLIC: o REVOKE por nome e o grau efetivo'
    : 'nenhum dos nomes e executavel pelo anon e nao sobrou entrada anon=X: a aplicacao aconteceu e o GRANT da reversao ainda nao correu',
  papeis_lidos: papeis.map((p) => p.papel),
  nomes: porNome,
  estrutura: { candidata: estruturaCand, reversao: estruturaRev },
  ficheiros: { candidata: { caminho: 'scripts/p73-pen43-ddl-candidata.sql', ...pegada(bufCand) }, reversao: { caminho: 'scripts/p73-pen43-ddl-reversao.sql', ...pegada(bufRev) } },
  certificacao: { indexados: registoGeradora.indexados, mais_recente: registoGeradora.mais_recente ? registoGeradora.mais_recente.registo : null, historico: registoGeradora.todos },
  controlos_de_privilegio: controlos,
  censo_de_exposicao_anonima: { agregado, fora_do_alvo_na_familia_municipal: foraDoAlvo, declarados: declaradosMedidos,
    amostra_so_por_public: censo.filter((x) => sim(x.anon_pode) && !x.acl_estado.anon_X && x.acl_estado.public_X).slice(0, 12).map((x) => x.nome),
    divergencia_entre_as_duas_contagens: agregado.sem_entrada_de_anon - agregado.so_por_public,
    nota: 'so_por_public e sem_entrada_de_anon coincidem enquanto toda a exposição do anon vem ou da entrada anon=X ou da entrada a PUBLIC; a diferenca entre as duas e medidas, nao afirmada — se algum dia for nao-zero, o grau esta a chegar por associacao a outro papel e o REVOKE por nome tambem nao o toca' },
  fixtures: { mundos_de_acl: FIX_MUNDOS.map(({ estado, ...w }) => ({ ...w, anon_X: estado.anon_X, public_X: estado.public_X, nula: estado.nula })), assinatura: FIX_ASSINATURA, estrutura: FIX_ESTRUTURA, censo_licenca: FIX_CENSO_NAO_E_LICENCA, pegada: FIX_PEGADA_TEM_DENTES, varredura: varreduraFix },
  varredura_de_pessoal_no_registo: varredura,
  conclusao: {
    o_que_este_verde_autoriza_a_perguntar: MODO === 'candidata'
      ? 'que o REVOKE por nome tem efeito medido hoje nos nomes declarados, e que a reversao em disco e o espelho deles — nada mais; a aplicacao continua a pedir a frase literal da peca'
      : 'que a peca esta aplicada e o GRANT da reversao encontraria o estado que a candidata produziu',
    o_que_nao_prova: 'nao prova o canal HTTP (isso mede-se em scripts/p73-sonda-porta-municipal.mjs, que porta a concordancia catalogo-vs-HTTP por classe), nao prova que as 63+ outras funcoes executaveis por anon estejam fechadas — a PEN-43 e sobre os agregados municipais novos — e nao prova que depois do REVOKE uma chamada anon deva 42501 em vez de 404.',
    frase_que_esta_corrida_deixa_escrita: `no catalogo, neste instante, o anon ${MODO === 'candidata' ? 'PODE' : 'NAO PODE'} executar ${JSON.stringify(nomesAlvo)}; das ${agregado.total} funcoes do esquema public, ${agregado.executiveis} sao executaveis por anon e ${agregado.so_por_public} recebem o grau apenas pelo default a PUBLIC, onde um REVOKE por nome nao tocava.`,
  },
  portoes, falhas,
  o_que_este_verde_nao_autoriza: 'nada. A aplicacao do SQL pede a frase literal `APLICAR PEN-43 NO BANCO`; a reversao pede `REVERTER PEN-43 NO BANCO`. Um verde velho de hoje nao serve: o aplicador corre o preflight nos dois lados da escrita.',
};
out.veredito = falhas.length === 0 ? `P73_PEN43_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0` : `P73_PEN43_PREFLIGHT_VERMELHO_${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN43_PREFLIGHT_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`MODO ${MODO} · contexto ${JSON.stringify(ctx.utilizador)} · nomes ${JSON.stringify(nomesAlvo)} · pegada candidata ${out.ficheiros.candidata.md5} ${out.ficheiros.candidata.bytes} B · reversao ${out.ficheiros.reversao.md5} ${out.ficheiros.reversao.bytes} B`);
console.log(`CENSO ${JSON.stringify(agregado)} · FORA_DO_ALVO ${JSON.stringify(foraDoAlvo)} · CONTROLOS ${controlos.length}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
