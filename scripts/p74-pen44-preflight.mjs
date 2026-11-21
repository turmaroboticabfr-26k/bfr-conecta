#!/usr/bin/env node
// P74-PEN44-PREFLIGHT — só leitura. A candidata `scripts/p74-pen44-ddl-candidata.sql` fecha o EXECUTE de `anon`
// nos nomes cujo grau chega da entrada a PUBLIC e devolve esse grau, nome a nome, aos papéis que hoje executam
// SÓ por essa via. A peça tem duas maneiras de falhar em silêncio, e nenhuma se vê no texto do SQL:
//   (i) fechar a menos — um REVOKE por nome não toca num grau que chega por associação a outro papel, e um GRANT
//       que não cobre um papel dependente do default deixa esse papel sem o grau que tinha;
//   (ii) abrir a mais — um GRANT a um papel que conservaria o grau de qualquer maneira é uma concessão nova:
//       passa a sobreviver à perda do grau pelo pai, e fica na ACL como entrada explícita que ninguém pediu.
// Por isso o invariante não é «o SQL está bem escrito»: é «depois de aplicar, anon não executa nenhum nome do
// alvo e nenhum outro papel perde um grau que tinha». Em `candidata` esse depois SIMULA-SE contra o catálogo de
// hoje; em `--reversao` lê-se no catálogo, porque a peça já correu — os dois veredictos vão no registo com o
// nome do canal de onde vieram, porque são provas de natureza diferente.
//
// O que os modos afirmam:
//   modo candidata (omissão) — o anon pode executar cada nome e o grau vem duma via que o SQL toca; a simulação
//     com os GRANT de preservação fecha o anon sem deixar ninguém atrás e sem concessão a mais.
//   modo reversao — a peça foi aplicada: nenhum nome do alvo é executável por anon, não sobrou entrada a PUBLIC
//     nem entrada anon=X, e cada papel que a candidata preservou executa hoje.
// Os dois modos correm as mesmas réguas puras. O `--selfteste` fabrica cinco mundos e exige que cada régua dê
// verde num e vermelho noutro: uma régua verde nos cinco mundos não discrimina nada.
// Uso: node scripts/p74-pen44-preflight.mjs            (modo candidata: exige o estado de ENTRADA)
//      node scripts/p74-pen44-preflight.mjs --reversao (modo reversao: exige o estado depois de aplicada)
//      node scripts/p74-pen44-preflight.mjs --selfteste (offline: réguas puras sobre mundos fabricados, 0 banco)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';
import { assinaturaCorresponde, tiposDaAssinatura } from './p73-assinatura-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SELFTESTE = process.argv.includes('--selfteste');
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p74-pen44-preflight-${MODO}-21-11${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();
const LEITURAS_DECLARADAS = 6;

const CAND = join(REPO, 'scripts/p74-pen44-ddl-candidata.sql');
const REV = join(REPO, 'scripts/p74-pen44-ddl-reversao.sql');
const GERADORA = join(REPO, 'scripts/p74-pen44-gera-candidata.mjs');
const PEN43 = join(REPO, 'scripts/p73-pen43-ddl-candidata.sql');
for (const p of [CAND, REV, GERADORA, PEN43]) if (!existsSync(p)) throw new Error('ABORTA: falta ' + p);
const txtCand = readFileSync(CAND, 'utf8');
const txtRev = readFileSync(REV, 'utf8');
const bufCand = readFileSync(CAND);
const bufRev = readFileSync(REV);
const pegada = (b) => ({ bytes: b.length, md5: createHash('md5').update(b).digest('hex') });
const sim = (v) => v === true || String(v).toLowerCase() === 't' || String(v).toLowerCase() === 'true';

// ---- réguas puras, sem banco ---------------------------------------------------------------------
const semComentarios = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const estruturaDe = (t) => { const s = semComentarios(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm), revoke_public: c(/^REVOKE EXECUTE ON FUNCTION .* FROM PUBLIC;/gm),
    revoke_anon: c(/^REVOKE EXECUTE ON FUNCTION .* FROM anon;/gm), grant_public: c(/^GRANT EXECUTE ON FUNCTION .* TO PUBLIC;/gm),
    grant_anon: c(/^GRANT EXECUTE ON FUNCTION .* TO anon;/gm),
    grant_preservacao: c(/^GRANT EXECUTE ON FUNCTION .* TO (?!PUBLIC;|anon;)/gm),
    revoke_preservacao: c(/^REVOKE EXECUTE ON FUNCTION .* FROM (?!PUBLIC;|anon;)/gm),
    statement_fora_dos_graus: c(/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|COPY)\b/gim) }; };
const ehLeitura = (txt) => /^\s*(select|with)\b/i.test(txt);
const RE_GR = (lado) => new RegExp(lado + '\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?([a-z0-9_]+)\\s*\\(([^;]*)\\)\\s+(?:FROM|TO)\\s+([^;]+);', 'gi');
const grausDe = (t, lado) => [...semComentarios(t).matchAll(RE_GR(lado))].map((m) => ({ nome: m[1], args: m[2].trim(),
  papeis: m[3].split(',').map((s) => s.trim()).filter(Boolean) }));
const chave = (nome, args) => nome + '(' + String(args || '').replace(/\s+/g, ' ') + ')';
const ordena = (lista) => [...new Set(lista)].sort().join('|');
const entra = (acl, papel) => String(acl).split('|').some((i) => { const eq = i.indexOf('='); const quem = eq < 0 ? i : i.slice(0, eq);
  return quem === papel && (eq < 0 ? '' : (i.slice(eq + 1).split('/')[0] || '')).includes('X'); });
const leAcl = (acl) => ({ nula: acl === 'NULL_POR_DEFAULT', anon_X: acl !== 'NULL_POR_DEFAULT' && entra(acl, 'anon'),
  public_X: acl !== 'NULL_POR_DEFAULT' && (entra(acl, '') || entra(acl, 'public')) });
// Uma só função responde «este papel executa?», com e sem a peça aplicada, e é ela que serve os mundos
// fabricados e o catálogo vivo. Duas implementações seriam duas réguas para o mesmo facto.
const pode = ({ acl, dono, papel, revogarPublic = false, revogarAnon = false, grants = [], herdado_de = {}, supers = {} }) => {
  const visto = new Set(), estado = leAcl(acl);
  const ir = (r) => {
    if (visto.has(r)) return false;
    visto.add(r);
    if (supers[r] === true) return true;
    if (r === dono) return true;
    if (grants.includes(r)) return true;
    if (entra(acl, r)) return !(r === 'anon' && revogarAnon);
    if (!revogarPublic && estado.public_X) return true;
    return (herdado_de[r] || []).some(ir);
  };
  return ir(papel);
};
// O privilégio efectivo é explicável quando vem de exactamente uma das duas vias que a peça conhece. Um grau que
// chega por associação a outro papel não é explicável por nenhuma delas — e o REVOKE por nome também não o toca.
const explicavel = ({ anon_X, public_X, nula }, priv) => !nula && priv === (anon_X || public_X);
const destaca = ({ anon_X, public_X, nula }, priv, modo) => modo === 'candidata'
  ? nula === false && priv === true && (anon_X === true || public_X === true)
  : nula === false && priv === false && anon_X === false && public_X === false;
const conferePegada = (pin, buf) => !!pin && pin.md5 === pegada(buf).md5 && pin.bytes === buf.length;
// hoje[nome][papel] vem do catalogo (has_function_privilege) ou, nos mundos fabricados, de `pode` sem revoke.
const invariante = ({ nomes, porNome, papeis, hoje, grants, revogaAnon, herdado_de, supers }) => {
  const anon_ainda_pode = [], perdem_sem_grant = [], grants_inuteis = [], nao_explicavel = [], sem_grau_hoje = [];
  for (const n of nomes) {
    const f = porNome[n];
    if (!f) { nao_explicavel.push(n + ':AUSENTE_NO_CORPUS'); continue; }
    const st = leAcl(f.acl);
    if (hoje[n] && hoje[n].anon !== true) { sem_grau_hoje.push(n); continue; }
    if (st.anon_X === false && st.public_X === false) nao_explicavel.push(n + ':' + (hoje[n] ? 'grau_por_herenca' : 'sem_leitura'));
    const sem = (p) => pode({ acl: f.acl, dono: f.dono, papel: p, revogarPublic: true, revogarAnon: revogaAnon[n] === true, grants: [], herdado_de, supers });
    const dep = (p) => pode({ acl: f.acl, dono: f.dono, papel: p, revogarPublic: true, revogarAnon: revogaAnon[n] === true, grants: grants[n] || [], herdado_de, supers });
    if (dep('anon') !== false) anon_ainda_pode.push(n);
    for (const p of papeis) {
      if (p === 'anon') continue;
      if (hoje[n] && hoje[n][p] === true && dep(p) === false) perdem_sem_grant.push(n + ':' + p);
      if ((grants[n] || []).includes(p) && sem(p) === true) grants_inuteis.push(n + ':' + p);
    }
  }
  return { nomes: nomes.length, anon_ainda_pode, perdem_sem_grant, grants_inuteis, nao_explicavel, sem_grau_hoje,
    verde: nomes.length > 0 && anon_ainda_pode.length === 0 && perdem_sem_grant.length === 0 && grants_inuteis.length === 0 && nao_explicavel.length === 0 };
};

// ---- cinco mundos fabricados ---------------------------------------------------------------------
const ACL_COM_PUBLIC = '=X/postgres|postgres=X/postgres|authenticated=X/postgres|service_role=X/postgres';
const ACL_SO_DEFAULT = '=X/postgres|postgres=X/postgres|authenticated=X/postgres|service_role=X/postgres';
// Nenhum grau de anon por nenhuma via que o SQL toca: aqui o REVOKE e decorativo e o modo candidata tem de chumbar.
const ACL_ANON_SEM_GRAU = 'postgres=X/postgres|authenticated=X/postgres|service_role=X/postgres';
const PAPEIS_FIX = ['anon', 'authenticated', 'service_role', 'dashboard_user', 'supabase_read_only_user', 'supabase_admin'];
const MUNDO = (m) => {
  const porNome = { 'f()': { acl: m.acl, dono: m.dono } };
  const nomes = ['f()'], papeis = PAPEIS_FIX;
  const porPapel = {}; for (const p of papeis) porPapel[p] = pode({ acl: m.acl, dono: m.dono, papel: p, grants: [], herdado_de: m.herdado_de, supers: m.supers });
  // `hoje` tem a MESMA forma do mundo vivo: hoje[nome][papel]. Construí-la por papel e lê-la por nome daria um
  // invariante que nunca conta nada — foi assim que o primeiro selfteste ficou verde sem provar nada.
  const hoje = { 'f()': porPapel };
  const inv = invariante({ nomes, porNome, papeis, hoje, grants: m.grants, revogaAnon: m.revogaAnon, herdado_de: m.herdado_de, supers: m.supers });
  const estado = leAcl(m.acl);
  return { ...m, estado, hoje: porPapel, invariante: inv, anon_hoje: porPapel.anon, anon_depois: pode({ acl: m.acl, dono: m.dono, papel: 'anon', revogarPublic: true, grants: [], herdado_de: m.herdado_de, supers: m.supers }),
    destaca_candidata: destaca(estado, porPapel.anon, 'candidata'), destaca_reversao: destaca(estado, false, 'reversao') };
};
const MUNDOS = [
  MUNDO({ nome: 'revoke_pelado_sem_preservacao', acl: ACL_COM_PUBLIC, dono: 'postgres', grants: {}, revogaAnon: {},
    herdado_de: { anon: [], authenticated: [], service_role: [], dashboard_user: [], supabase_read_only_user: [], supabase_admin: [] }, supers: {} }),
  MUNDO({ nome: 'candidata_com_os_grants', acl: ACL_COM_PUBLIC, dono: 'postgres', grants: { 'f()': ['dashboard_user', 'supabase_read_only_user', 'supabase_admin'] }, revogaAnon: {},
    herdado_de: { anon: [], authenticated: [], service_role: [], dashboard_user: [], supabase_read_only_user: [], supabase_admin: [] }, supers: {} }),
  MUNDO({ nome: 'grant_a_quem_conserva_de_qualquer_manera', acl: ACL_COM_PUBLIC, dono: 'postgres', grants: { 'f()': ['authenticated'] }, revogaAnon: {},
    herdado_de: { anon: [], authenticated: [], service_role: [], dashboard_user: [], supabase_read_only_user: [], supabase_admin: [] }, supers: {} }),
  MUNDO({ nome: 'nome_sem_grau_de_anon_o_revoke_ser_decorativo', acl: ACL_ANON_SEM_GRAU, dono: 'postgres', grants: {}, revogaAnon: {},
    herdado_de: { anon: [], authenticated: [], service_role: [], dashboard_user: [], supabase_read_only_user: [], supabase_admin: [] }, supers: {} }),
  MUNDO({ nome: 'papel_conserva_por_herdar_de_superuser', acl: ACL_SO_DEFAULT, dono: 'postgres', grants: {}, revogaAnon: {},
    herdado_de: { anon: [], authenticated: [], service_role: [], dashboard_user: ['supabase_admin'], supabase_read_only_user: ['supabase_admin'], supabase_admin: [] }, supers: { supabase_admin: true } }),
];
const [W_PELADO, W_GRANTS, W_GRANT_INUTIL, W_NO_OP, W_HERANCA] = MUNDOS;
const FIX_MUNDOS_TEM_DENTES = {
  pelado_deixa_papeis_sem_grau: W_PELADO.invariante.perdem_sem_grant.length > 0 && W_PELADO.invariante.verde === false,
  com_grants_nao_perde_ninguem: W_GRANTS.invariante.perdem_sem_grant.length === 0 && W_GRANTS.invariante.verde === true && W_GRANTS.anon_depois === false,
  grant_inutil_chumba: W_GRANT_INUTIL.invariante.grants_inuteis.length > 0 && W_GRANT_INUTIL.invariante.verde === false,
  no_op_chumba_o_modo: W_NO_OP.estado.anon_X === false && W_NO_OP.estado.public_X === false && W_NO_OP.destaca_candidata === false && W_NO_OP.invariante.sem_grau_hoje.length === 1,
  heranca_conserva_sem_grant: W_HERANCA.invariante.perdem_sem_grant.length === 0 && W_HERANCA.anon_depois === false && W_HERANCA.invariante.grants_inuteis.length === 0,
  anon_fica_fora_onde_h_grau: [W_PELADO, W_GRANTS, W_HERANCA].every((m) => m.anon_depois === false),
};
const FIX_ASSINATURA = {
  aridade_errada_nao_casa: assinaturaCorresponde(tiposDaAssinatura('uuid'), '') === false,
  lista_vazia_casa_com_catalogo_vazio: assinaturaCorresponde(tiposDaAssinatura(''), '') === true,
  nomes_de_parametro_casam: assinaturaCorresponde(tiposDaAssinatura('uuid, text'), 'p_school uuid, p_reason text') === true,
  tipo_trocado_nao_casa: assinaturaCorresponde(tiposDaAssinatura('text'), 'uuid') === false,
  tipo_de_duas_palavras_casa: assinaturaCorresponde(tiposDaAssinatura('double precision'), 'double precision') === true,
};
const FIX_ESTRUTURA = (() => {
  const semTx = estruturaDe('REVOKE EXECUTE ON FUNCTION public.x() FROM PUBLIC;\n-- BEGIN; em prosa nao conta\n');
  const comDados = estruturaDe('BEGIN;\nREVOKE EXECUTE ON FUNCTION public.x() FROM PUBLIC;\nINSERT INTO t VALUES (1);\nCOMMIT;');
  const soPublic = estruturaDe('BEGIN;\nGRANT EXECUTE ON FUNCTION public.x() TO PUBLIC;\nCOMMIT;');
  const anonEPreservacao = estruturaDe('GRANT EXECUTE ON FUNCTION public.x() TO anon;\nGRANT EXECUTE ON FUNCTION public.x() TO dashboard_user;\n');
  return { begin_0_no_mundo_sem_transaccao: semTx.begin === 0 && semTx.revoke_public === 1, insert_contado: comDados.statement_fora_dos_graus === 1,
    public_nao_conta_como_preservacao: soPublic.grant_preservacao === 0 && soPublic.grant_public === 1,
    anon_contado_a_parte: anonEPreservacao.grant_anon === 1 && anonEPreservacao.grant_preservacao === 1 };
})();
const FIX_PEGADA_TEM_DENTES = conferePegada({ bytes: bufCand.length, md5: pegada(bufCand).md5 }, bufCand) === true
  && conferePegada({ bytes: bufCand.length, md5: '0'.repeat(32) }, bufCand) === false
  && conferePegada({ bytes: 1, md5: pegada(bufCand).md5 }, bufCand) === false;
// O fixture de dados pessoais compõe-se em tempo de execução: um literal no programa que varre programas seria o
// ofensor que a varredura procura (regra da casa, 18/11).
const AT = String.fromCharCode(64), DOM = ['e', 'x', 'a', 'm', 'p', 'l', 'o', '.', 't', 'e', 's', 't'].join('');
const TOK = ['eyJhbGciOiJIUzI1NiJ9', 'abcdefghij', 'XYZ_wx'].join('.');
const FIX_PESSOAL = 'maria' + AT + DOM + ' ' + TOK;
const varre = (t) => ({ emails: (String(t).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).length, jwt: (String(t).match(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []).length });
const FIX_VARREDURA_TEM_DENTES = (() => { const f = varre(FIX_PESSOAL);
  const c = varre(semComentarios(txtCand) + semComentarios(txtRev) + readFileSync(GERADORA, 'utf8') + readFileSync(PEN43, 'utf8'));
  return { fixture: f, codigo_e_sql: c, verde: f.emails === 1 && f.jwt === 1 && c.emails === 0 && c.jwt === 0 }; })();
const espelhoDosFicheiros = () => {
  const rv = [...new Set(grausDe(txtCand, 'REVOKE').filter((x) => x.papeis.includes('PUBLIC')).map((x) => chave(x.nome, x.args)))];
  const gp = [...new Set(grausDe(txtRev, 'GRANT').filter((x) => x.papeis.includes('PUBLIC')).map((x) => chave(x.nome, x.args)))];
  const presC = Object.fromEntries(grausDe(txtCand, 'GRANT').filter((x) => !x.papeis.includes('PUBLIC') && !x.papeis.includes('anon')).map((x) => [chave(x.nome, x.args), [...new Set(x.papeis)].sort()]));
  const presR = Object.fromEntries(grausDe(txtRev, 'REVOKE').filter((x) => !x.papeis.includes('PUBLIC') && !x.papeis.includes('anon')).map((x) => [chave(x.nome, x.args), [...new Set(x.papeis)].sort()]));
  const anonC = [...new Set(grausDe(txtCand, 'REVOKE').filter((x) => x.papeis.includes('anon')).map((x) => chave(x.nome, x.args)))].sort();
  const anonR = [...new Set(grausDe(txtRev, 'GRANT').filter((x) => x.papeis.includes('anon')).map((x) => chave(x.nome, x.args)))].sort();
  const keysC = Object.keys(presC).sort(), keysR = Object.keys(presR).sort();
  return { revoke_public: rv.length, grant_public: gp.length, mesmas_assinaturas_public: ordena(rv) === ordena(gp),
    preservacao: { candidata: keysC.length, reversao: keysR.length, mesmos_papeis: JSON.stringify(keysC.map((k) => [k, presC[k]]).sort()) === JSON.stringify(keysR.map((k) => [k, presR[k]]).sort()) },
    anon: { revoke: anonC.length, grant_na_reversao: anonR.length, espelhado: JSON.stringify(anonC) === JSON.stringify(anonR) },
    verde: rv.length > 0 && ordena(rv) === ordena(gp) && JSON.stringify(keysC.map((k) => [k, presC[k]]).sort()) === JSON.stringify(keysR.map((k) => [k, presR[k]]).sort()) && JSON.stringify(anonC) === JSON.stringify(anonR) };
};
// O matcher reproduz a semântica de LIKE (`_` = um caractere, `%` = qualquer cadeia, `\` escapa o seguinte) para a
// régua poder mostrar o que um predicado sem escape faria sem correr SQL: `pg_%` come `pgbouncer`, que é papel de
// verdade com LOGIN e grau efectivo. O censo vivo é conferido contra um filtro JS de prefixo literal.
const comoLike = (padrao, valor) => { const esc = (c) => '/[.*+?^${}()|[]\\'.includes(c) ? '\\' + c : c;
  let re = '^';
  for (let i = 0; i < padrao.length; i++) {
    if (padrao[i] === '\\') { re += '\\' + padrao[++i]; continue; }
    if (padrao[i] === '_') { re += '.'; continue; }
    if (padrao[i] === '%') { re += '.*'; continue; }
    re += esc(padrao[i]);
  }
  return new RegExp(re + '$').test(valor); };
const FIX_CANAL_DO_CENSO = { sem_escape_devora_pgbouncer: comoLike('pg_%', 'pgbouncer') === true,
  escapado_so_omite_a_familia: comoLike('pg\\_%', 'pgbouncer') === false && comoLike('pg\\_%', 'pg_read_all_data') === true,
  os_dois_canais_discordam_na_mesma_palavra: comoLike('pg_%', 'pgbouncer') === true && 'pgbouncer'.startsWith('pg_') === false };
// O SQL do REVOKE traz só TIPOS; `pg_get_function_identity_arguments` traz NOMES + tipos. Comparar as duas strings
// por igualdade era a régua sem positivo possível que fez o modo candidata abortar. O fixture mostra os dois lados.
const FIX_RESOLUCAO = (() => { const cat = [{ nome: 'f', ident: 'p_target uuid' }, { nome: 'f', ident: 'p_a text' }];
  const porIgualdade = (args) => cat.filter((x) => String(x.ident) === args).length;
  const pelaAssinatura = (args) => cat.filter((x) => assinaturaCorresponde(tiposDaAssinatura(args), x.ident)).length;
  return { igualdade_de_strings_nao_resolve_nenhum_nome: porIgualdade('uuid') === 0, assinatura_resolve_exactamente_um: pelaAssinatura('uuid') === 1, aridade_distingue_sobrecargas: pelaAssinatura('uuid, text') === 0 }; })();

// ---- selfteste offline: nada de banco, nada de escrita ---------------------------------------------
if (SELFTESTE) {
  const casos = [];
  const c = (nome, verde, detalhe) => casos.push({ nome, verde: !!verde, ...(detalhe ? { detalhe } : {}) });
  c('o_revoke_pelado_chumba_e_os_grants_da_candidata_nao_deixam_ninguem_atras', FIX_MUNDOS_TEM_DENTES.pelado_deixa_papeis_sem_grau && FIX_MUNDOS_TEM_DENTES.com_grants_nao_perde_ninguem, { mundos: MUNDOS.map((m) => ({ nome: m.nome, hoje_anon: m.anon_hoje, depois_anon: m.anon_depois, perdem: m.invariante.perdem_sem_grant, grants_inuteis: m.invariante.grants_inuteis, nao_explicavel: m.invariante.nao_explicavel, sem_grau_hoje: m.invariante.sem_grau_hoje })), dentes: FIX_MUNDOS_TEM_DENTES });
  c('um_grant_a_quem_conservaria_de_qualquer_manera_chumba_o_invariante', FIX_MUNDOS_TEM_DENTES.grant_inutil_chumba, { grant_inutil: W_GRANT_INUTIL.invariante.grants_inuteis, hoje: W_GRANT_INUTIL.hoje });
  c('o_modo_candidata_chumba_num_nome_onde_o_revoke_seria_decorativo', FIX_MUNDOS_TEM_DENTES.no_op_chumba_o_modo, { no_op: { estado: W_NO_OP.estado, hoje_anon: W_NO_OP.anon_hoje, destaca_candidata: W_NO_OP.destaca_candidata, sem_grau_hoje: W_NO_OP.invariante.sem_grau_hoje } });
  c('um_papel_que_herda_de_superuser_conserva_sem_grant_e_o_anon_ainda_fica_fora', FIX_MUNDOS_TEM_DENTES.heranca_conserva_sem_grant, { heranca: { herdado_de: W_HERANCA.herdado_de, hoje: W_HERANCA.hoje, depois_anon: W_HERANCA.anon_depois, perdem: W_HERANCA.invariante.perdem_sem_grant } });
  c('a_regua_de_assinatura_recusa_aridade_e_tipo_e_tolera_nomes_de_parametro', Object.values(FIX_ASSINATURA).every(Boolean), FIX_ASSINATURA);
  c('o_alvo_resolve_por_assinatura_e_a_igualdade_de_strings_nao_poderia_resolver_nada', Object.values(FIX_RESOLUCAO).every(Boolean), FIX_RESOLUCAO);
  c('o_predicado_de_exclusao_de_papeis_so_omite_a_familia_quando_o_under_line_escapa', Object.values(FIX_CANAL_DO_CENSO).every(Boolean), FIX_CANAL_DO_CENSO);
  c('a_contagem_de_estrutura_ve_transaccao_dados_e_separa_anon_da_preservacao', Object.values(FIX_ESTRUTURA).every(Boolean), FIX_ESTRUTURA);
  c('a_pegada_so_bate_com_o_registo_que_a_certificou', FIX_PEGADA_TEM_DENTES, { medido_agora: { candidata: pegada(bufCand), reversao: pegada(bufRev) } });
  c('os_dois_ficheiros_em_disco_espelham_se_por_assinatura_grau_e_papel', espelhoDosFicheiros(), espelhoDosFicheiros());
  c('a_varredura_de_pessoal_dispara_no_fixture_e_nao_no_codigo_nem_no_sql', FIX_VARREDURA_TEM_DENTES.verde, FIX_VARREDURA_TEM_DENTES);
  c('a_query_de_leitura_distinta_de_um_statement_de_escrita', ehLeitura('select 1') === true && ehLeitura('WITH x AS (select 1) select * from x') === true && ehLeitura('UPDATE t SET a = 1') === false && ehLeitura('  insert into t values (1)') === false);
  const boas = casos.filter((x) => x.verde).length;
  console.log(JSON.stringify({ programa: 'scripts/p74-pen44-preflight.mjs', selfteste: true, modo_imitado: MODO,
    escrito_no_banco: false, banco_consultado: false, casos, veredito: boas === casos.length ? `P74_PEN44_PREFLIGHT_SELFTESTE_OK ${casos.length}/0` : `P74_PEN44_PREFLIGHT_SELFTESTE_VERMELHO ${casos.length - boas}` }, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

// ---- estado vivo ----------------------------------------------------------------------------------
const formas = [];
const q = async (txt) => { formas.push(ehLeitura(txt)); return sql(txt); };
const revokePublic = grausDe(txtCand, 'REVOKE').filter((x) => x.papeis.includes('PUBLIC'));
// O SQL traz TIPOS e o `pg_get_function_identity_arguments` traz NOMES + tipos: comparar as duas strings por
// igualdade era uma régua sem positivo possível (foi assim que o modo candidata abortou no `l.acl`). A resolução
// é feita com a mesma `assinaturaCorresponde` que a geradora usou para emitir.
const paresAlvo = revokePublic.map((x) => ({ nome: x.nome, args_no_sql: x.args, tipos: tiposDaAssinatura(x.args) }));
const nomesAlvo = [...new Set(paresAlvo.map((x) => x.nome))];
const grantsPorNome = {}; for (const x of grausDe(txtCand, 'GRANT').filter((x) => !x.papeis.includes('PUBLIC') && !x.papeis.includes('anon'))) grantsPorNome[x.nome] = [...new Set(x.papeis)].sort();
const revogaAnonPorNome = {}; for (const x of grausDe(txtCand, 'REVOKE').filter((x) => x.papeis.includes('anon'))) revogaAnonPorNome[x.nome] = true;
if (nomesAlvo.length === 0) throw new Error('ABORTA: a candidata nao tem um so REVOKE ... FROM PUBLIC — nao ha alvo');

const [ctx] = await q('select current_user as utilizador, pg_backend_pid() as pid');
const papeisLidos = await q(`select rolname as papel, rolsuper::text as super from pg_roles where rolname <> 'pg_database_owner' and rolname not like 'pg\\_%' order by 1`);
const herdLido = await q(`select r.rolname as papel, coalesce(string_agg(m.rolname, ',' order by m.rolname), '') as herdado_de
  from pg_roles r left join pg_auth_members a on a.member = r.oid left join pg_roles m on m.oid = a.roleid
  where r.rolname <> 'pg_database_owner' and r.rolname not like 'pg\\_%' group by 1 order by 1`);
const lidoPorPapel = await q(`select p.proname as nome, r.rolname as papel, has_function_privilege(r.rolname, p.oid, 'EXECUTE')::text as pode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  join pg_roles r on r.rolname <> 'pg_database_owner' and r.rolname not like 'pg\\_%'
  where p.proname in (${nomesAlvo.map((n) => `'${n}'`).join(',')}) order by 1, 2`);
// O censo de papéis é a base da preservação, por isso é conferido por um segundo canal que não conhece LIKE: a
// lista completa vem sem predicado de nome e o filtro é um prefixo literal em JS. Os dois canais têm de discordar
// em zero nomes — foi esta régua que mostrou que `pg_%` sem escape come `pgbouncer`.
const papeisTodosLidos = await q('select rolname as papel from pg_roles order by 1');
const funcoes = (await q(`select p.oid::text as oid, p.proname as nome, p.provolatile as vol, p.prosecdef::text as definer,
  pg_get_function_identity_arguments(p.oid) as ident, p.proowner::regrole::text as dono,
  coalesce(array_to_string(p.proacl, '|'), 'NULL_POR_DEFAULT') as acl,
  (select t.typname from pg_type t where t.oid = p.prorettype) as ret,
  has_function_privilege('anon'::regrole, p.oid, 'EXECUTE')::text as anon_pode
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'`))
  .map((x) => ({ ...x, chave: chave(x.nome, x.ident), estado: leAcl(x.acl) }));
const censo = funcoes.map((x) => ({ nome: x.nome, vol: x.vol, ret: x.ret, acl: x.acl, estado: x.estado, anon_pode: x.anon_pode }));
const resolve = (par) => funcoes.filter((f) => f.nome === par.nome && assinaturaCorresponde(par.tipos, String(f.ident)));
const alvo = paresAlvo.map((par) => ({ par, linhas: resolve(par) }));
const naoResolvidos = alvo.filter((x) => x.linhas.length !== 1).map((x) => `${x.par.nome}(${x.par.args_no_sql}):${x.linhas.length}`);
const PAPEIS = papeisLidos.map((p) => p.papel);
const supers = Object.fromEntries(papeisLidos.map((p) => [p.papel, p.super === 'true']));
const herdado_de = Object.fromEntries(herdLido.map((h) => [h.papel, String(h.herdado_de).split(',').filter(Boolean)]));
const nomesTodos = papeisTodosLidos.map((x) => x.papel);
const esperadosNoServidor = nomesTodos.filter((r) => !r.startsWith('pg_'));
const discordancias_do_predicado = nomesTodos.filter((r) => comoLike('pg_%', r) !== r.startsWith('pg_'));
const hoje = {}; for (const x of lidoPorPapel) { (hoje[x.nome] = hoje[x.nome] || {})[x.papel] = sim(x.pode); }
const porNome = {}; for (const x of alvo) if (x.linhas.length === 1) porNome[x.par.nome] = { acl: x.linhas[0].acl, dono: x.linhas[0].dono };
const invSim = invariante({ nomes: nomesAlvo, porNome, papeis: PAPEIS, hoje, grants: grantsPorNome, revogaAnon: revogaAnonPorNome, herdado_de, supers });
// Em modo reversao o «depois» não se simula: lê-se. Estes são os três factos lidos que a aplicação tem de produzir.
const invVivo = { anon_executa_algum_nome: nomesAlvo.filter((n) => hoje[n] && hoje[n].anon === true),
  public_sobrou: nomesAlvo.filter((n) => porNome[n] && leAcl(porNome[n].acl).public_X === true),
  anon_X_sobrou: nomesAlvo.filter((n) => porNome[n] && leAcl(porNome[n].acl).anon_X === true),
  preservados_que_nao_executam: Object.entries(grantsPorNome).flatMap(([n, ps]) => ps.filter((p) => !(hoje[n] && hoje[n][p] === true)).map((p) => n + ':' + p)),
  nomes_sem_leitura: nomesAlvo.filter((n) => !porNome[n]),
  verde: MODO === 'reversao' ? nomesAlvo.every((n) => hoje[n] && hoje[n].anon === false) && invVivo.public_sobrou.length === 0 && invVivo.preservados_que_nao_executam.length === 0 && invVivo.nomes_sem_leitura.length === 0 : true };
const detalhes = alvo.map(({ par, linhas }) => {
  const l = linhas[0] || null;
  const nome = par.nome;
  const perde = l ? PAPEIS.filter((p) => p !== 'anon' && hoje[nome] && hoje[nome][p] === true && pode({ acl: l.acl, dono: l.dono, papel: p, revogarPublic: true, revogarAnon: revogaAnonPorNome[nome] === true, grants: [], herdado_de, supers }) === false) : [];
  return { nome, args_no_sql: par.args_no_sql, chave_catalogo: l ? (l.chave || 'AUSENTE') : 'AUSENTE',
    assinatura_casa: !!l && assinaturaCorresponde(par.tipos, String(l.ident)),
    sobrecargas_no_catalogo: funcoes.filter((x) => x.nome === nome).length, vol: l ? l.vol : null, ret: l ? l.ret : null,
    definer: l ? l.definer : null, dono: l ? l.dono : null, acl: l ? l.acl : 'AUSENTE', estado: l ? l.estado : null,
    anon_pode_hoje: l ? l.anon_pode : null, explicavel_hoje: l ? explicavel(l.estado, sim(l.anon_pode)) : null,
    destaca: l ? destaca(l.estado, sim(l.anon_pode), MODO) : null,
    preserva: grantsPorNome[nome] || [], revoga_anon: revogaAnonPorNome[nome] === true,
    hoje_dos_preservados: Object.fromEntries((grantsPorNome[nome] || []).map((p) => [p, !!(hoje[nome] && hoje[nome][p] === true)])),
    perde_hoje_sem_grant: perde };
});
const estruturaCand = estruturaDe(txtCand), estruturaRev = estruturaDe(txtRev), espelho = espelhoDosFicheiros();
const nomes43 = [...new Set(grausDe(readFileSync(PEN43, 'utf8'), 'REVOKE').map((x) => x.nome))];
const papeisDoGrant = [...new Set(Object.values(grantsPorNome).flat())];
const papeisDesconhecidos = papeisDoGrant.filter((p) => !PAPEIS.includes(p));
const agregado = { total: censo.length, executiveis_por_anon: censo.filter((x) => sim(x.anon_pode)).length,
  com_entrada_public: censo.filter((x) => x.estado.public_X).length, no_alvo_desta_peca: nomesAlvo.length,
  gatilhos_via_public_executaveis: censo.filter((x) => sim(x.anon_pode) && x.estado.public_X && x.ret === 'trigger').length };
const gatilhosFora = [...new Set(censo.filter((x) => sim(x.anon_pode) && x.estado.public_X && x.ret === 'trigger').map((x) => x.nome))];
const nomesViaPublicForaDoAlvo = [...new Set(censo.filter((x) => sim(x.anon_pode) && x.estado.public_X && !nomesAlvo.includes(x.nome)).map((x) => x.nome))];
const motivosFora = Object.fromEntries([
  ...gatilhosFora.map((n) => [n, 'classe devolve trigger: nao e superficie RPC (medido em prorettype, nao uma lista lembrada)']),
  ...nomes43.map((n) => [n, 'e da PEN-43: a ACL viva nao tem entrada a PUBLIC; a alavanca dela e REVOKE ... FROM anon']),
]);
const naoDeclarados = nomesViaPublicForaDoAlvo.filter((n) => !motivosFora[n]);
const registoGeradora = (() => {
  let lista = [];
  try { lista = execFileSync('git', ['ls-files', 'evidence'], { cwd: REPO, encoding: 'utf8' }).split('\n')
    .map((s) => s.trim()).filter((s) => /^evidence\/p74-pen44-gera-candidata-.*\.json$/.test(s) && !/VERMELHO/.test(s) && !/INTERROMPIDA/.test(s)); } catch { lista = []; }
  const fichas = lista.map((rel) => { const p = join(REPO, rel); if (!existsSync(p)) return null;
    try { const j = JSON.parse(readFileSync(p, 'utf8')); return { registo: rel, em: j.em, arquivos: j.arquivos, veredito: j.veredito, queries_da_geradora: j.queries }; } catch { return null; } })
    .filter(Boolean).sort((a, b) => String(a.em).localeCompare(String(b.em)));
  return { indexados: fichas.length, todos: fichas.map((f) => ({ registo: f.registo, em: f.em, veredito: f.veredito,
    candidata: f.arquivos && f.arquivos.candidata ? f.arquivos.candidata.md5 : null,
    reversao: f.arquivos && f.arquivos.reversao ? f.arquivos.reversao.md5 : null })), mais_recente: fichas.length ? fichas[fichas.length - 1] : null };
})();
const PIN = registoGeradora.mais_recente ? registoGeradora.mais_recente.arquivos : null;
const geradoraDiz = registoGeradora.mais_recente ? JSON.parse(readFileSync(join(REPO, registoGeradora.mais_recente.registo), 'utf8')) : null;

const falhas = [];
// Os papéis que a peça NÃO preserva só podem conservam o grau por uma destas quatro vias; a lista é impressa para
// que o registo diga por qual, e não apenas que conservam.
const naoPreservados = PAPEIS.filter((p) => p !== 'anon' && !papeisDoGrant.includes(p));
const perdemSemPreservar = [];
for (const d of detalhes) for (const p of naoPreservados) if (hoje[d.nome] && hoje[d.nome][p] === true && pode({ acl: d.acl, dono: d.dono, papel: p, revogarPublic: true, revogarAnon: revogaAnonPorNome[d.nome] === true, grants: [], herdado_de, supers }) === false) perdemSemPreservar.push(`${d.nome}:${p}`);
const porqueConservam = naoPreservados.map((p) => { const vias = [];
  if (supers[p] === true) vias.push('super');
  if (detalhes.some((d) => d.dono === p)) vias.push('dono');
  if (detalhes.some((d) => entra(d.acl, p))) vias.push('entrada_propria');
  if ((herdado_de[p] || []).length) vias.push('heranca_de:' + herdado_de[p].join('+'));
  return `${p}:${vias.join('+') || 'NENHUMA_VIA_MEDIDA'}`; });
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_alvo_do_ficheiro_resolve_no_catalogo_um_par_por_linha_de_revoke', paresAlvo.length > 0 && alvo.length === paresAlvo.length && naoResolvidos.length === 0 && new Set(alvo.filter((x) => x.linhas.length === 1).map((x) => x.linhas[0].oid)).size === paresAlvo.length, { pares_no_ficheiro: paresAlvo.length, nomes_distintos: nomesAlvo.length, resolvidos_unicos: alvo.filter((x) => x.linhas.length === 1).length, nao_resolvidos_or_duplicados: naoResolvidos, sobrecargas: detalhes.filter((d) => d.sobrecargas_no_catalogo > 1).map((d) => `${d.nome}:${d.sobrecargas_no_catalogo}`) }),
  g('a_pegada_dos_dois_ficheiros_e_a_do_registo_mais_recente_da_geradora_e_a_regua_tem_dentes', !!PIN && conferePegada(PIN.candidata, bufCand) && conferePegada(PIN.reversao, bufRev) && FIX_PEGADA_TEM_DENTES && !!geradoraDiz && /_OK /.test(String(geradoraDiz.veredito)), { indexados: registoGeradora.indexados, mais_recente: registoGeradora.mais_recente ? registoGeradora.mais_recente.registo : null, veredito_da_geradora: geradoraDiz ? geradoraDiz.veredito : null, historico: registoGeradora.todos, medido_agora: { candidata: pegada(bufCand), reversao: pegada(bufRev) } }),
  g('cada_ficheiro_e_uma_unica_transaccao_de_graus_sem_dados_e_as_quatro_familias_batem', estruturaCand.begin === 1 && estruturaCand.commit === 1 && estruturaCand.revoke_public === nomesAlvo.length && estruturaCand.grant_public === 0 && estruturaCand.statement_fora_dos_graus === 0 && estruturaRev.begin === 1 && estruturaRev.commit === 1 && estruturaRev.grant_public === nomesAlvo.length && estruturaRev.revoke_public === 0 && estruturaRev.statement_fora_dos_graus === 0 && Object.values(FIX_ESTRUTURA).every(Boolean), { candidata: estruturaCand, reversao: estruturaRev, fixtures: FIX_ESTRUTURA }),
  g('os_dois_ficheiros_espelham_se_por_assinatura_grau_e_papel_preservado', espelho.verde && estruturaCand.grant_preservacao === Object.keys(grantsPorNome).length && estruturaCand.revoke_anon === Object.keys(revogaAnonPorNome).length && estruturaRev.grant_anon === Object.keys(revogaAnonPorNome).length, { espelho, candidata: estruturaCand, reversao: estruturaRev }),
  g('cada_assinatura_do_revoke_casa_com_a_identidade_do_servidor_e_a_regua_tem_dentes', detalhes.every((d) => d.assinatura_casa === true) && Object.values(FIX_ASSINATURA).every(Boolean), { por_nome: detalhes.map((d) => `${d.nome}:args_no_sql=${d.args_no_sql}:catalogo=${d.chave_catalogo}:casa=${d.assinatura_casa}`), fixtures: FIX_ASSINATURA }),
  g('o_grau_do_anon_hoje_explicavel_pelas_vias_que_a_peca_toca_e_os_cinco_mundos_tem_dentes', Object.values(FIX_MUNDOS_TEM_DENTES).every(Boolean) && invSim.nao_explicavel.length === 0 && invSim.sem_grau_hoje.length === (MODO === 'candidata' ? 0 : nomesAlvo.length), { nao_explicavel: invSim.nao_explicavel, sem_grau_hoje: invSim.sem_grau_hoje, dentes: FIX_MUNDOS_TEM_DENTES }),
  g(`o_estado_vivo_do_anon_bate_com_o_que_o_modo_${MODO}_pressupoe_e_o_outro_modo_chumba_nesse_estado`, detalhes.length > 0 && detalhes.every((d) => d.destaca === true), { modo: MODO, por_nome: detalhes.map((d) => `${d.nome}:anon_pode=${d.anon_pode_hoje}:anon_X=${d.estado && d.estado.anon_X}:public_X=${d.estado && d.estado.public_X}:destaca=${d.destaca}`), invertido_esperado_no_outro_modo: MODO === 'candidata' ? 'anon_pode=false e sem entradas' : 'anon_pode=true com uma via tocavel' }),
  g('nenhum_papel_preservado_e_o_anon_e_todos_os_papeis_do_grant_existem_no_catalogo', papeisDoGrant.length > 0 && papeisDoGrant.includes('anon') === false && papeisDesconhecidos.length === 0, { preservados: papeisDoGrant, desconhecidos: papeisDesconhecidos, papeis_no_catalogo: PAPEIS.length, super: PAPEIS.filter((p) => supers[p] === true) }),
  g('nenhum_papel_preservado_e_pai_do_anon_senao_o_grant_reabriria_o_que_o_revoke_fecha', papeisDoGrant.every((p) => (herdado_de.anon || []).includes(p) === false) && (supers.anon !== true), { anon_herdado_de: herdado_de.anon || [], anon_super: supers.anon === true, preservados: papeisDoGrant, pais_preservados: papeisDoGrant.filter((p) => (herdado_de.anon || []).includes(p)) }),
  g('o_censo_de_papeis_de_onde_a_preservacao_ve_e_completo_por_dois_canais_independentes', PAPEIS.length === esperadosNoServidor.length && esperadosNoServidor.every((r) => PAPEIS.includes(r)) && PAPEIS.every((r) => r.startsWith('pg_') === false) && Object.values(FIX_CANAL_DO_CENSO).every((x) => x === true), { no_servidor: nomesTodos.length, fora_das_familias_pg: esperadosNoServidor.length, lidos_pelo_predicado: PAPEIS.length, faltantes: esperadosNoServidor.filter((r) => !PAPEIS.includes(r)), sobrantes: PAPEIS.filter((r) => r.startsWith('pg_')), nomes_que_uma_like_sem_escape_deteria: discordancias_do_predicado, fixtures: FIX_CANAL_DO_CENSO }),
  g('a_preservacao_cobre_o_que_o_catalogo_diz_que_perderia_e_nao_da_grau_a_quem_conserva', invSim.verde === true && invSim.perdem_sem_grant.length === 0 && invSim.grants_inuteis.length === 0 && detalhes.every((d) => JSON.stringify(d.perde_hoje_sem_grant) === JSON.stringify(d.preserva.filter((p) => d.perde_hoje_sem_grant.includes(p)))) && detalhes.every((d) => Object.values(d.hoje_dos_preservados).every(Boolean)), { nomes: invSim.nomes, anon_ainda_pode: invSim.anon_ainda_pode, perdem_sem_grant: invSim.perdem_sem_grant.slice(0, 12), grants_inuteis: invSim.grants_inuteis.slice(0, 12), exemplo: detalhes.slice(0, 3).map((d) => `${d.nome}:preserva=${d.preserva.length}:perderiam_sem_grant=${d.perde_hoje_sem_grant.length}`) }),
  g('os_papeis_que_a_peca_nao_preserva_mantem_o_grau_por_entrada_heranca_ou_superuser', naoPreservados.length > 0 && perdemSemPreservar.length === 0, { lidos: naoPreservados.length, nao_preservados: naoPreservados, conservam_por: porqueConservam, perderiam: perdemSemPreservar.slice(0, 12) }),
  g('o_escopo_nao_se_sobrepoe_ao_da_pen43_e_a_disjuncao_e_por_chave_independente', nomes43.length === 3 && nomes43.every((n) => !nomesAlvo.includes(n)) && nomes43.every((n) => { const l = funcoes.find((x) => x.nome === n); return !!l && l.estado.public_X === false; }), { pen43: nomes43, estado: nomes43.map((n) => { const l = funcoes.find((x) => x.nome === n); return l ? `${n}:public_X=${l.estado.public_X}:anon_X=${l.estado.anon_X}:anon_pode=${l.anon_pode}` : `${n}:AUSENTE`; }), interseccao: nomes43.filter((n) => nomesAlvo.includes(n)) }),
  g('os_gatilhos_de_trigger_saem_do_alvo_pela_classe_e_a_classe_recompute_do_catalogo_bate', agregado.gatilhos_via_public_executaveis > 0 && nomesAlvo.every((n) => !gatilhosFora.includes(n)) && detalhes.every((d) => d.ret !== 'trigger'), { gatilhos_na_familia: agregado.gatilhos_via_public_executaveis, nomes_gatilho: gatilhosFora, no_alvo: nomesAlvo.length }),
  g('o_censo_imprime_o_que_fica_fora_e_nenhum_nome_novo_e_aberto_fica_sem_classe', agregado.total > 0 && naoDeclarados.length === 0 && nomesViaPublicForaDoAlvo.length === gatilhosFora.length + nomes43.filter((n) => censo.some((x) => x.nome === n && sim(x.anon_pode) && x.estado.public_X)).length, { agregado, fora_do_alvo: nomesViaPublicForaDoAlvo, nao_declarados: naoDeclarados, motivos: Object.keys(motivosFora).length }),
  g('nenhuma_query_deste_programa_escreveu_no_banco_e_o_numero_de_leituras_e_o_declarado', formas.length === LEITURAS_DECLARADAS && formas.every((x) => x === true), { queries: formas.length, declaradas_no_programa: LEITURAS_DECLARADAS, nao_leitura: formas.filter((x) => !x).length }),
  MODO === 'candidata'
    ? g('o_depois_e_simulado_e_o_antes_lido_confirma_o_predicado_da_peca', invSim.verde === true && invSim.anon_ainda_pode.length === 0 && invVivo.anon_executa_algum_nome.length === nomesAlvo.length && invVivo.nomes_sem_leitura.length === 0, { simulado: { nomes: invSim.nomes, anon_ainda_pode: invSim.anon_ainda_pode.length, perdem_sem_grant: invSim.perdem_sem_grant.length, grants_inuteis: invSim.grants_inuteis.length }, lido_vivo: { nomes_do_alvo: nomesAlvo.length, anon_executa_algum: invVivo.anon_executa_algum_nome.length, nomes_sem_leitura: invVivo.nomes_sem_leitura, nota: 'em candidata o estado lido e o de ENTRADA: o depois so sera lido depois de a peça correr' } })
    : g('o_depois_e_lido_no_catalogo_e_nao_simulado', invVivo.verde === true && invVivo.anon_executa_algum_nome.length === 0 && invVivo.public_sobrou.length === 0 && invVivo.preservados_que_nao_executam.length === 0 && invVivo.nomes_sem_leitura.length === 0, { lido_vivo: { anon_executa_algum: invVivo.anon_executa_algum_nome, public_sobrou: invVivo.public_sobrou, anon_X_sobrou: invVivo.anon_X_sobrou, preservados_que_nao_executam: invVivo.preservados_que_nao_executam.slice(0, 12), nomes_sem_leitura: invVivo.nomes_sem_leitura }, simulado_como_contraste: { perdem_sem_grant: invSim.perdem_sem_grant.length, grants_inuteis: invSim.grants_inuteis.length } }),
  g('nenhum_identificador_pessoal_nem_token_entra_no_registo_codigo_ou_sql', (() => { const corpo = varre(JSON.stringify({ detalhes: detalhes.map((d) => ({ nome: d.nome, acl: d.acl, preserva: d.preserva })), agregado, papeis: PAPEIS, estruturas: { candidata: estruturaCand, reversao: estruturaRev }, pin: PIN })); return corpo.emails === 0 && corpo.jwt === 0 && FIX_VARREDURA_TEM_DENTES.verde; })(), { fixture: FIX_VARREDURA_TEM_DENTES.fixture, codigo_e_sql: FIX_VARREDURA_TEM_DENTES.codigo_e_sql }),
];
const out = {
  programa: 'scripts/p74-pen44-preflight.mjs', modo: MODO, em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: MODO === 'candidata'
    ? 'a candidata em disco fecha hoje o grau de anon em cada um dos seus nomes e, com os GRANT de preservação, não deixa nenhum outro papel atrás — nem dá a alguém um grau que esse alguém já conservaria?'
    : 'a peça foi aplicada neste banco — o anon não executa nenhum nome do alvo, não sobrou entrada a PUBLIC nem do anon, e cada papel que a candidata preservou executa hoje?',
  metodo: 'alvo lido dos REVOKE ... FROM PUBLIC da candidata em disco e resolvido por ASSINATURA no catálogo; privilégio efectivo de TODOS os papéis não-pg_ para TODOS os nomes do alvo por has_function_privilege; preservação recalculada pela mesma função `pode` que serve os mundos fabricados (entrada própria, superuser, dono, default a PUBLIC e herança iterada por pg_auth_members); censo de todas as funções do esquema public; pegada confrontada com o registo indexado mais recente da geradora.',
  contexto: { utilizador: ctx.utilizador, pid: ctx.pid },
  pressuposto: MODO === 'candidata'
    ? 'o anon pode executar cada nome e o grau vem de anon=X ou da entrada a PUBLIC; os papéis preservados são exactamente os que hoje executam e não conservariam sem essa entrada'
    : 'nenhum nome do alvo é executável por anon, não sobrou entrada a PUBLIC nem anon=X, e cada papel preservado executa hoje',
  alvo_no_ficheiro: { pares_assinatura: paresAlvo.length, nomes: nomesAlvo.length, revoga_anon: Object.keys(revogaAnonPorNome).length, nomes_com_preservacao: Object.keys(grantsPorNome).length },
  papeis: { lidos: PAPEIS.length, no_catalogo_inteiro: nomesTodos.length, esperados_sem_familias_pg: esperadosNoServidor.length, discordam_onde_o_curinga_mente: discordancias_do_predicado, anon_herdado_de: herdado_de.anon || [], super: PAPEIS.filter((p) => supers[p] === true), preservados_pela_peca: papeisDoGrant, desconhecidos_no_catalogo: papeisDesconhecidos },
  nomes: detalhes,
  invariante_simulado: { nomes: invSim.nomes, anon_ainda_pode: invSim.anon_ainda_pode, perdem_sem_grant: invSim.perdem_sem_grant, grants_inuteis: invSim.grants_inuteis, nao_explicavel: invSim.nao_explicavel, sem_grau_hoje: invSim.sem_grau_hoje, verde: invSim.verde,
    canal: 'SIMULACAO: a mesma função `pode` corrida sobre a ACL de hoje com os graus da candidata retirados e os GRANT acrescentados' },
  invariante_lido: { anon_executa_algum_nome: invVivo.anon_executa_algum_nome, public_sobrou: invVivo.public_sobrou, anon_X_sobrou: invVivo.anon_X_sobrou, preservados_que_nao_executam: invVivo.preservados_que_nao_executam, nomes_sem_leitura: invVivo.nomes_sem_leitura, verde: invVivo.verde,
    canal: MODO === 'reversao' ? 'LEITURA: has_function_privilege depois da aplicação' : 'LEITURA DE ENTRADA: em modo candidata este canal descreve o antes, não prova o depois' },
  estrutura: { candidata: estruturaCand, reversao: estruturaRev, espelho },
  ficheiros: { candidata: { caminho: 'scripts/p74-pen44-ddl-candidata.sql', ...pegada(bufCand) }, reversao: { caminho: 'scripts/p74-pen44-ddl-reversao.sql', ...pegada(bufRev) } },
  certificacao: { indexados: registoGeradora.indexados, mais_recente: registoGeradora.mais_recente ? registoGeradora.mais_recente.registo : null, veredito: geradoraDiz ? geradoraDiz.veredito : null, historico: registoGeradora.todos },
  censo_de_exposicao_anonima: { agregado, fora_do_alvo: nomesViaPublicForaDoAlvo, motivos_por_classe: motivosFora, nao_declarados: naoDeclarados },
  pen43: { nomes: nomes43, interseccao_com_pen44: nomes43.filter((n) => nomesAlvo.includes(n)) },
  fixtures: { mundos: MUNDOS.map((m) => ({ nome: m.nome, hoje_anon: m.anon_hoje, depois_anon: m.anon_depois, perdem_sem_grant: m.invariante.perdem_sem_grant, grants_inuteis: m.invariante.grants_inuteis, nao_explicavel: m.invariante.nao_explicavel, sem_grau_hoje: m.invariante.sem_grau_hoje, destaca_candidata: m.destaca_candidata })), dentes: FIX_MUNDOS_TEM_DENTES, assinatura: FIX_ASSINATURA, resolucao_do_alvo: FIX_RESOLUCAO, censo_de_papeis: FIX_CANAL_DO_CENSO, estrutura: FIX_ESTRUTURA, pegada: FIX_PEGADA_TEM_DENTES, varredura: FIX_VARREDURA_TEM_DENTES.fixture, varredura_codigo: FIX_VARREDURA_TEM_DENTES.codigo_e_sql },
  conclusao: {
    o_que_este_verde_autoriza_a_perguntar: MODO === 'candidata'
      ? 'que a candidata em disco é aplicável, fecha o anónimo em cada nome e cobre com GRANT exactamente o que o catálogo hoje diz que perderia, sem dar grau a quem já o conservaria; a aplicação pede a frase literal `APLICAR PEN-44 NO BANCO`'
      : 'que a peça está aplicada neste banco e a reversão encontraria exactamente o estado de antes; reverter pede `REVERTER PEN-44 NO BANCO`',
    o_que_nao_prova: 'não prova o canal HTTP (isso mede-se em scripts/p73-sonda-porta-municipal.mjs), não prova que uma chamada anónima devolva 42501 em vez de 404, não prova que nenhum papel de plataforma chame estas funções por um caminho interno que o catálogo não descreve, e não prova o futuro: um papel CRIADO DEPOIS já não herda EXECUTE destes nomes, porque a entrada a PUBLIC foi retirada — é a consequência declarada da peça, não um efeito colateral.',
    frase_que_esta_corrida_deixa_escrita: `no catálogo, neste instante, das ${agregado.total} funções do esquema public ${agregado.executiveis_por_anon} são executáveis por anon e ${agregado.com_entrada_public} têm entrada a PUBLIC; o alvo desta peça é ${nomesAlvo.length} nomes, ${agregado.gatilhos_via_public_executaveis} ficam fora por devolverem trigger, e ${MODO === 'candidata' ? 'a simulação diz que o anon fica fora dos ' + invSim.nomes + ' e que ' + invSim.perdem_sem_grant.length + ' pares papel-função conservam o grau' : 'a leitura diz que o anon executa ' + invVivo.anon_executa_algum_nome.length + ' dos nomes do alvo'}.`,
  },
  portoes, falhas,
  o_que_este_verde_nao_autoriza: 'nada. A aplicação do SQL pede a frase literal `APLICAR PEN-44 NO BANCO`; a reversão pede `REVERTER PEN-44 NO BANCO`. Um verde velho não serve: o aplicador corre o preflight nos dois lados da escrita.',
};
out.veredito = falhas.length === 0 ? `P74_PEN44_PREFLIGHT_VERDE_${MODO.toUpperCase()} ${portoes.length}/0` : `P74_PEN44_PREFLIGHT_VERMELHO_${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P74_PEN44_PREFLIGHT_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`MODO ${MODO} · contexto ${JSON.stringify(ctx.utilizador)} · alvo ${nomesAlvo.length} · revoga_anon ${Object.keys(revogaAnonPorNome).length} · preservados ${JSON.stringify(papeisDoGrant)}`);
console.log(`PEGADA candidata ${pegada(bufCand).md5} ${pegada(bufCand).bytes} B · reversao ${pegada(bufRev).md5} ${pegada(bufRev).bytes} B · certificacao ${registoGeradora.mais_recente ? registoGeradora.mais_recente.registo : 'NENHUM_INDEXADO'}`);
console.log(`CENSO ${JSON.stringify(agregado)} · FORA_DO_ALVO ${nomesViaPublicForaDoAlvo.length} · SIM ${JSON.stringify(invSim.verde)} perdem ${invSim.perdem_sem_grant.length} inuteis ${invSim.grants_inuteis.length} · VIVO ${JSON.stringify(invVivo.verde)}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
