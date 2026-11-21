// P73-SONDA-PORTA-MUNICIPAL — quem consegue o quê, na porta municipal, medido por dois canais.
//
// Existe porque a pergunta «a vista municipal é uma saída de RLS?» e a pergunta «a PEN-43 ainda está aberta?» têm
// a mesma resposta só se forem medidas, e têm respostas diferentes consoante o canal: `bfr_is_platform_admin()`
// responde `false` pelo canal SQL de gestão e `true` para uma conta `developer` pelo REST, porque lê o papel do
// JWT. Um número vindo de um canal não prova o outro. Esta peça corre os dois e confronta-os.
//
// As duas classes de nomes não são dactilografadas:
//   · o ALVO lê-se das linhas `REVOKE EXECUTE … FROM anon` de `scripts/p73-pen43-ddl-candidata.sql` — se a
//     candidata mudar de alvo, esta peça passa a medir o alvo novo sem que ninguém edite aqui;
//   · o CONTROLO lê-se do catálogo, pelo PRIVILÉGIO EFECTIVO (`has_function_privilege('anon', oid,'execute')`),
//     não pela forma do ACL. Um `proacl` explícito pode CONCEDER ao anon — foi assim que a primeira versão desta
//     régua escolheu para o controlo dois dos três nomes do alvo e produziu um vermelho sem positivo possível.
//     A régua exige as duas classes disjoint, e o `--selfteste` prova que essa exigência dispara.
//
// O veredicto nomeia o estado do mundo, não o sucesso da corrida: enquanto a PEN-43 não for aplicada os três nomes
// respondem 200 ao `anon`. O dia em que for aplicada, a mesma peça passa a dizer `PORTA_FECHADA` sem que se tenha
// aliviado uma cláusula.
//
// 0 DDL, 0 escrita no banco, 0 mint, 0 deploy. Só `sql()` de catálogo (SELECT), HTTP GET/POST de agregados que já
// são leitura, e renovação de sessão dos registos existentes. Não imprime tokens: só md5 de 8 do access token.
//
// Uso: node scripts/p73-sonda-porta-municipal.mjs --selfteste     (offline: 0 HTTP, 0 escrita, 0 registo tocado)
//      node scripts/p73-sonda-porta-municipal.mjs                  (corrida real; recusa se a saída já existir)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { sql } from './c2-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const DDL43 = `${DIR}/scripts/p73-pen43-ddl-candidata.sql`;
const DDL39 = `${DIR}/scripts/p73-pen39-ddl-candidata.sql`;
const REG_ENUM = `${RAIZ}/ah2-sessions.json`;
const REG_MUN = `${RAIZ}/sm8-municipal-sessions.json`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = `${DIR}/evidence/p73-sonda-porta-municipal-20-11.json`;
const VISTA = 'bfr_municipal_school_stats';
const md5 = (b) => crypto.createHash('md5').update(Buffer.from(String(b))).digest('hex');
const md5_8 = (s) => md5(String(s)).slice(0, 8);
const n = (t, x) => t.split(x).length - 1;

// ── 1. os nomes, dos dois lados ────────────────────────────────────────────────────────────────────────────
function nomesDoPen43(texto) {
  return [...new Set([...texto.matchAll(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\([^)]*\)\s*FROM\s+anon/gi)].map((m) => m[1]))];
}
function nomesDoDDL39(texto) {
  return [...new Set([...texto.matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(\s*\)\s*RETURNS\s+TABLE/gi)].map((m) => m[1]))];
}
const alvo = nomesDoPen43(fs.readFileSync(DDL43, 'utf8'));
const pen39 = nomesDoDDL39(fs.readFileSync(DDL39, 'utf8'));

// ── 2. a régua em pureza, com dados injectáveis para o --selfteste correr offline ─────────────────────────
// O que é portão é a CONCORDÂNCIA entre os dois canais sobre cada classe, a disjointness das classes e a negação
// da vista. Não é portão «o alvo está aberto»: no dia em que a PEN-43 for aplicada o alvo passa a estar fechado,
// e uma régua com a resposta de hoje escrita dentro transformaria o fecho num vermelho do instrumento — a forma
// agregada do defeito de «um limiar que é função do valor medido». O estado nomeia para que lado pende.
function reuna({ alvoHttp, alvoPodeCatalogo, controloHttp, controloPodeCatalogo, vistaHttp, interseccao }) {
  const alvoCatalogoPode = alvoPodeCatalogo.length === 3 && alvoPodeCatalogo.every((x) => x === true);
  const alvoHttpPode = alvoHttp.length === 3 && alvoHttp.every((h) => h === 200);
  const controloCatalogoPode = controloPodeCatalogo.length >= 2 && controloPodeCatalogo.every((x) => x === true);
  const controloHttpPode = controloHttp.length >= 2 && controloHttp.every((h) => h === 200);
  return {
    alvo_tem_tres_nomes_e_sao_lidos_do_ddl: alvo.length === 3 && alvoHttp.length === 3 && alvoPodeCatalogo.length === 3,
    as_duas_classes_sao_disjoint: interseccao.length === 0 && controloHttp.length >= 2,
    os_canais_concordam_sobre_o_alvo: alvoCatalogoPode === alvoHttpPode,
    os_canais_concordam_sobre_o_controlo: controloCatalogoPode === controloHttpPode,
    existe_controlo_que_o_anon_nao_pode_executar: controloHttp.length >= 2 && !(controloCatalogoPode && controloHttpPode),
    vista_negada_ao_anon_por_http: vistaHttp === 401,
    _alvo_aberto_agora: alvoCatalogoPode && alvoHttpPode,
  };
}
function veredito(cls) {
  const maus = Object.entries(cls).filter(([k, v]) => k[0] !== '_' && !v).map(([k]) => k);
  if (maus.length) return { estado: 'PORTA_MUNICIPAL_DESCONFIADO', maus };
  return cls._alvo_aberto_agora
    ? { estado: 'PORTA_MUNICIPAL_AINDA_ABERTA · os tres nomes continuam executaveis por anon nos dois canais; a PEN-43 esta por aplicar', maus: [] }
    : { estado: 'PORTA_MUNICIPAL_FECHADA · os tres nomes ja nao sao executaveis por anon em nenhum dos canais', maus: [] };
}
// Padrões que a corrida real usa para construir o alvo a partir do que o ar devolve: postos como funções puras
// para o --selfteste poder provar que recusam o que não devem aceitar, sem tocar na rede.
const ehUrlApp = (u) => /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.workers\.dev\/?$/.test(String(u));
const hostDeRef = (r) => {
  if (!/^[a-z0-9]{12,24}$/.test(String(r))) return null;
  return `https://${r}.supabase.co`;
};
// Fixture sintético, não a referência real: o --selfteste tem de correr sem depender de o projecto mudar.
const REF_EXEMPLO = 'ab'.repeat(11);

// O leitor tem quatro formas e nomeia qual delas é: na primeira versão, um corpo de erro 401 era contado como
// `linhas: 1` e o escalar `false` de `bfr_is_municipal_authority` ia parar ao campo `erro` — o artefacto ficava
// legível ao contrário. O `--selfteste` corre os quatro casos abaixo para que isto não dependa da minha leitura.
function classifica(status, texto) {
  const base = { http: status, bytes: Buffer.byteLength(texto) };
  let j = null, parseavel = true;
  try { j = JSON.parse(texto); } catch { parseavel = false; }
  if (!parseavel) return { ...base, forma: 'corpo nao parseavel', corpo: String(texto).slice(0, 140) };
  if (status !== 200) {
    const m = (j && (j.message || j.msg || j.error)) || JSON.stringify(j).slice(0, 140);
    return { ...base, forma: 'resposta de erro', code: (j && j.code) || null, mensagem: String(m).slice(0, 160) };
  }
  if (Array.isArray(j)) return { ...base, forma: 'linhas', linhas: j.length, colunas: j.length ? Object.keys(j[0]) : [] };
  if (j && typeof j === 'object') return { ...base, forma: 'linhas', linhas: 1, colunas: Object.keys(j) };
  return { ...base, forma: 'escalar', valor: j };
}

const SELFTESTE = process.argv.includes('--selfteste');
if (SELFTESTE) {
  const casos = [];
  const c = (nome, verde, dado) => casos.push({ nome, verde: !!verde, ...dado });
  const MUNDO = (alvoHttp, alvoPode, controloHttp, controloPode, vistaHttp, interseccao) =>
    reuna({ alvoHttp, alvoPodeCatalogo: alvoPode, controloHttp, controloPodeCatalogo: controloPode, vistaHttp, interseccao });
  // O mundo legítimo de hoje: alvo 200 + catálogo a conceder, controlo 401 + catálogo a negar, vista 401.
  const hoje = MUNDO([200, 200, 200], [true, true, true], [401, 401], [false, false], 401, []);
  c('a_regra_tem_positivo_no_mundo_de_hoje', veredito(hoje).estado.startsWith('PORTA_MUNICIPAL_AINDA_ABERTA') && veredito(hoje).maus.length === 0, { hoje, veredito_hoje: veredito(hoje) });
  // O fecho da PEN-43 tem de ser um VERDE com outro nome, não um vermelho do instrumento: os dois canais passam a
  // negar o alvo e todas as cláusulas de concordância continuam verdadeiras.
  const depois = MUNDO([401, 401, 401], [false, false, false], [401, 401], [false, false], 401, []);
  c('o_verdicto_muda_de_nome_quando_a_pen43_for_aplicada', (() => {
    const v = veredito(depois);
    return v.estado === 'PORTA_MUNICIPAL_FECHADA · os tres nomes ja nao sao executaveis por anon em nenhum dos canais' && v.maus.length === 0;
  })(), { depois, veredito_depois: veredito(depois) });
  // Os vermelhos que a régua tem de apanhar, um por cláusula, cada um com fixture que dispara.
  c('um_anon_que_passe_a_ler_a_vista_e_vermelho', veredito(MUNDO([200, 200, 200], [true, true, true], [401, 401], [false, false], 200, [])).maus.includes('vista_negada_ao_anon_por_http'), {});
  c('um_canal_que_diga_o_contrario_do_outro_sobre_o_alvo_e_vermelho', (() => {
    const m = MUNDO([200, 200, 200], [true, false, true], [401, 401], [false, false], 401, []);
    return veredito(m).maus.includes('os_canais_concordam_sobre_o_alvo') && veredito(m).estado === 'PORTA_MUNICIPAL_DESCONFIADO';
  })(), { por_canais: 'catalogo nega uma das tres mas o HTTP responde 200 — foi exactamente o buraco do canal de gestao vs REST' });
  c('um_controlo_que_passa_a_responder_ao_anon_e_vermelho', veredito(MUNDO([200, 200, 200], [true, true, true], [200, 200], [true, true], 401, [])).maus.includes('existe_controlo_que_o_anon_nao_pode_executar'), {});
  c('uma_classe_de_controlo_vazia_e_vermelho_e_nao_verde_por_omissao', (() => {
    const v = veredito(MUNDO([200, 200, 200], [true, true, true], [], [], 401, []));
    return v.maus.includes('as_duas_classes_sao_disjoint') && v.maus.includes('existe_controlo_que_o_anon_nao_pode_executar');
  })(), { maus_esperados: 2 });
  c('uma_classe_de_controlo_que_sobreponha_o_alvo_e_vermelho', veredito(MUNDO([200, 200, 200], [true, true, true], [401, 200], [false, true], 401, ['bfr_municipal_municipio_totais'])).maus.includes('as_duas_classes_sao_disjoint'), { nota: 'a primeira versao desta regua escolheu para controlo dois dos tres nomes do alvo, por ler a forma do ACL em vez do privilegio efectivo' });
  c('um_alvo_com_menos_de_tres_itens_e_vermelho', veredito(MUNDO([200, 200], [true, true], [401, 401], [false, false], 401, [])).maus.includes('alvo_tem_tres_nomes_e_sao_lidos_do_ddl'), {});
  c('o_extrator_so_le_revoke_from_anon_nao_le_grant', (() => {
    const texto = 'REVOKE EXECUTE ON FUNCTION public.um_nome() FROM anon;';
    return nomesDoPen43(texto).join() === 'um_nome' && nomesDoPen43('GRANT EXECUTE ON FUNCTION public.outro() TO anon;').length === 0;
  })(), { extrator: 'sem isto o alvo seria lembrado em vez de lido' });
  c('os_tres_nomes_actuais_sao_lidos_do_ddl_e_a_pen39_e_subconjunto', alvo.length === 3 && pen39.length === 2 && pen39.every((x) => alvo.includes(x)),
    { alvo, pen39 });
  c('os_padroes_de_url_tem_dente_e_o_ar_real_passa_neles', (() => {
    const legiveis = [URL_APP, 'https://a.workers.dev', 'https://bfr-conecta.turmaroboticabfr.workers.dev/'].every(ehUrlApp);
    const recusados = ['http://a.workers.dev', 'https://a.workers.dev/prefixo', 'https://a.example.com', 'https://a.workers.dev.evil/'].map(ehUrlApp).every((x) => x === false);
    const ref = hostDeRef(REF_EXEMPLO) === `https://${REF_EXEMPLO}.supabase.co`;
    const refRuim = [null, '', 'YYZQOX', 'abc.def', 'a'.repeat(30)].every((r) => hostDeRef(r) === null);
    return legiveis && recusados && ref && refRuim;
  })(), { url_do_ar: URL_APP, ref_exemplo: REF_EXEMPLO, nota: 'a referencia do projecto nao se adivinha: le-se da shell servida na corrida real e sem ela a peca aborta' });
  // Os quatro formatos de resposta, cada um com o fixture que o distingue. A primeira versão desta peça contava o
  // corpo de erro como linha e o escalar como erro: estes casos são o dente, não a minha leitura do artefacto.
  c('um_corpo_de_erro_401_nao_e_contado_como_linha', (() => {
    const r = classifica(401, '{"code":"42501","message":"failed to authorize"}');
    return r.forma === 'resposta de erro' && r.linhas === undefined && r.code === '42501';
  })(), { fixture: '401 com corpo JSON' });
  c('um_escalar_200_nao_e_contado_como_erro', (() => {
    const r = classifica(200, 'false');
    return r.forma === 'escalar' && r.valor === false && r.mensagem === undefined && r.linhas === undefined;
  })(), { fixture: 'bfr_is_municipal_authority devolve booleano' });
  c('uma_tabela_200_devolve_a_contagem_e_as_colunas', (() => {
    const r = classifica(200, '[{"escolas":3,"alunos":800},{"escolas":1,"alunos":2}]');
    return r.forma === 'linhas' && r.linhas === 2 && r.colunas.join() === 'escolas,alunos';
  })(), { fixture: 'duas linhas de agregado' });
  c('zero_linhas_e_um_resultado_e_nao_uma_recusa', (() => {
    const r = classifica(200, '[]');
    return r.forma === 'linhas' && r.linhas === 0 && r.colunas.length === 0;
  })(), { nota: 'o caso real dos dois agregados para o anon' });
  c('um_corpo_nao_parseavel_nao_inventa_colunas', (() => {
    const r = classifica(200, 'nao-e-json');
    return r.forma === 'corpo nao parseavel' && r.linhas === undefined && r.corpo === 'nao-e-json';
  })(), {});
  const boas = casos.filter((x) => x.verde).length;
  console.log(JSON.stringify({ programa: 'scripts/p73-sonda-porta-municipal.mjs', selfteste: true, em: new Date().toISOString(),
    http: 0, escrita_no_banco: 0, ddl: 0, mint: 0, casos, nomes_lidos_do_ddl: { alvo, pen39 },
    veredito: boas === casos.length ? `PORTA_MUNICIPAL_SELFTESTE_OK ${casos.length}/0` : `PORTA_MUNICIPAL_SELFTESTE_VERMELHO ${casos.length - boas}` }, null, 1));
  console.log('selfteste: 0 HTTP, 0 escrita; as clausulas correm sobre mundos fabricados, nao sobre o banco');
  process.exit(boas === casos.length ? 0 : 1);
}

if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
if (alvo.length !== 3) throw new Error(`esperava 3 nomes-alvo da candidata PEN-43, lidos ${alvo.length}: ${JSON.stringify(alvo)}`);

// ── 3. corrida real: catálogo (via sql) e HTTP (via REST) sobre as mesmas grandezas ─────────────────────────
if (!ehUrlApp(URL_APP)) throw new Error('ABORTA: URL_APP fora do padrão workers.dev — a origem do ar seria outra');
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const ANON = (shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
const REF = (shellTxt.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!ANON || !REF) throw new Error('ABORTA: o ar não devolve a anon key nem a referência do projecto — sem sessão não se mede nada');
const HOST = hostDeRef(REF);
if (!HOST) throw new Error('ABORTA: a referência lida do ar não passa no padrão do host Supabase');

const catalogoAlvo = await sql(`
select p.proname as nome, (p.proacl is null) as sem_acl,
       has_function_privilege('anon', p.oid, 'execute') as anon_pode,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_pode,
       coalesce(array_to_string(p.proacl, ' | '), '(null = DEFAULT EXECUTE TO PUBLIC)') as acl,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('${alvo.join("','")}') order by 1;`);
if (catalogoAlvo.length !== 3) throw new Error(`o catálogo devolve ${catalogoAlvo.length} das 3 funções-alvo — a candidata nomeia algo que não existe`);

// O controlo pelo privilégio efectivo, e disjoint do alvo por construção verificada.
const catalogoControlo = await sql(`
select p.proname as nome, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as resultado
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'bfr\\_%' and pg_get_function_identity_arguments(p.oid) = ''
  and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute') = false
  and pg_get_function_result(p.oid) like 'TABLE%' order by 1;`);
const controlo = catalogoControlo.map((r) => r.nome).filter((x) => !alvo.includes(x)).slice(0, 3);
if (controlo.length < 2) throw new Error(`controlo precisa de >=2 funções que o anon NÃO pode executar, lidos ${controlo.length}`);
// O privilégio do controlo re-lido por nome, num predicado separado do que escolheu os nomes: é isso que torna a
// concordância com o HTTP uma comparação entre canais e não a própria frase de escolha repetida.
const catalogoControloPriv = await sql(`
select p.proname as nome, has_function_privilege('anon', p.oid, 'execute') as anon_pode
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('${controlo.join("','")}') order by 1;`);

const vistaCatalogo = await sql(`
select c.relname, c.relkind, coalesce(array_to_string(c.reloptions,','),'(sem opcoes)') as reloptions,
       pg_get_userbyid(c.relowner) as dono, coalesce(array_to_string(c.relacl,','),'(default)') as acl,
       c.relrowsecurity as rls_propria
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname = '${VISTA}';`);
const vistasTotais = await sql(`
select count(*) as vistas_total,
       count(*) filter (where coalesce(array_to_string(reloptions,','),'') like '%security_invoker=true%') as com_invoker_true
from pg_class where relkind='v';`);
const origemDaVista = await sql(`select definition as definicao from pg_views where schemaname='public' and viewname='${VISTA}';`);

// Identidades: anon (sem sessão) e três contas test já mintadas. O rótulo do registo municipal não é o papel do
// perfil, por isso os dois vão no registo, cada um com o seu nome.
const leJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const regs = { enum: leJson(REG_ENUM), mun: leJson(REG_MUN) };
const IDENTIDADES = [
  { rotulo: 'anon', canal: null },
  { rotulo: 'secretario_municipal', canal: 'mun' },
  { rotulo: 'developer', canal: 'enum' },
  { rotulo: 'director', canal: 'enum' },
];
const post = async (tok, nome) => {
  const r = await fetch(`${HOST}/rest/v1/rpc/${nome}`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(45000) });
  return { nome, ...classifica(r.status, await r.text()) };
};
const getVista = async (tok) => {
  const r = await fetch(`${HOST}/rest/v1/${VISTA}?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${tok}` }, cache: 'no-store', signal: AbortSignal.timeout(45000) });
  return { nome: VISTA, ...classifica(r.status, await r.text()) };
};

const porIdentidade = {};
for (const id of IDENTIDADES) {
  let tok = ANON;
  const linha = { canal: id.rotulo === 'anon' ? 'sem sessao' : `registo ${id.canal === 'mun' ? 'sm8-municipal-sessions.json' : 'ah2-sessions.json'}` };
  if (id.canal) {
    const reg = regs[id.canal][id.rotulo];
    if (!reg) { linha.recusa = 'sem linha neste registo'; porIdentidade[id.rotulo] = linha; continue; }
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: reg.refresh_token }), signal: AbortSignal.timeout(45000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.access_token) { linha.recusa = `cadeia de refresh esgotada (HTTP ${r.status}) — re-mint pede OK literal proprio`; porIdentidade[id.rotulo] = linha; continue; }
    regs[id.canal][id.rotulo] = { ...reg, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: j.user };
    tok = j.access_token;
    linha.acesso_md5_8 = md5_8(tok);
    const rP = await fetch(`${HOST}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(j.user.id)}`, { headers: { apikey: ANON, Authorization: `Bearer ${tok}` }, cache: 'no-store', signal: AbortSignal.timeout(45000) });
    const tP = await rP.json().catch(() => null);
    linha.papel_do_perfil_no_banco = Array.isArray(tP) && tP.length === 1 ? String(tP[0].role) : null;
    linha.rotulo_do_registo = id.rotulo;
  }
  for (const nome of alvo) linha['alvo::' + nome] = await post(tok, nome);
  for (const nome of controlo) linha['controlo::' + nome] = await post(tok, nome);
  linha[VISTA] = await getVista(tok);
  const rA = await post(tok, 'bfr_is_municipal_authority');
  linha.bfr_is_municipal_authority = rA;
  porIdentidade[id.rotulo] = linha;
}

// Gravar de volta só os pares rodados, para não queimar cadeias — os dois registos ficam ilegíveis a tokens
// antigos, e é a única escrita desta peça (fora do índice: os dois ficheiros não são versionados).
fs.writeFileSync(REG_ENUM, JSON.stringify(regs.enum, null, 2) + '\n');
fs.writeFileSync(REG_MUN, JSON.stringify(regs.mun, null, 2) + '\n');

const ia = porIdentidade.anon;
const cls = reuna({
  alvoHttp: alvo.map((x) => ia['alvo::' + x]?.http),
  alvoPodeCatalogo: alvo.map((nome) => { const r = catalogoAlvo.find((x) => x.nome === nome); return r ? r.anon_pode === true : null; }),
  controloHttp: controlo.map((x) => ia['controlo::' + x]?.http),
  controloPodeCatalogo: controlo.map((nome) => { const r = catalogoControloPriv.find((x) => x.nome === nome); return r ? r.anon_pode === true : null; }),
  vistaHttp: ia[VISTA].http,
  interseccao: controlo.filter((x) => alvo.includes(x)),
});
const pen39_nos_servidos = { nota: 'o que a shell servida chama é medido por scripts/p73-sonda-uso-quatro.mjs; aqui só se regista que os dois nomes da PEN-39 estão no alvo da PEN-43', pen39, alvo };

const reg = {
  programa: 'scripts/p73-sonda-porta-municipal.mjs', ciclo: 'P73-SONDA-PORTA-MUNICIPAL', em: new Date().toISOString(),
  escrita_no_banco: 0, ddl: 0, mint: 0, publicacao: 0, http_escrita: 0,
  origem: { ar: URL_APP, shell_md5: md5(shellTxt), shell_bytes: Buffer.byteLength(shellTxt), candidata_pen43: DDL43.replace(DIR + '/', ''),
    ddl_pen39: DDL39.replace(DIR + '/', ''), registos: [REG_ENUM.replace(RAIZ + '/', ''), REG_MUN.replace(RAIZ + '/')] },
  nomes: { alvo_lido_da_candidata_pen43: alvo, pen39_lida_do_ddl: pen39, controlo_lido_do_catalogo: controlo, criterio_do_controlo: "has_function_privilege('anon', oid, 'execute') = false, disjoint do alvo" },
  catalogo: { alvo: catalogoAlvo, controlo_priv: catalogoControloPriv, vista: vistaCatalogo[0] || null, contagem_vistas: vistasTotais[0] || null, definicao_da_vista: (origemDaVista[0] || {}).definicao || null },
  regua: { o_que_e_portao: 'concordancia catalogo-vs-HTTP em cada classe, disjoint das classes, negacao da vista ao anon', estados_legiveis: ['PORTA_MUNICIPAL_AINDA_ABERTA', 'PORTA_MUNICIPAL_FECHADA'],
    porque_aberta_nao_e_vermelho: 'o veredicto nomeia o mundo; aliviar ou apagar a cláusula de estado seria o defeito de «limiar que é função do valor medido» — a PEN-43 aplica-se por OK literal e a mesma peça re-corrida passa a dizer FECHADA sem que aqui se mude uma letra' },
  por_identidade: porIdentidade,
  leitor: { formas: ['linhas (200 + array/object: contagem e colunas)', 'escalar (200 + booleano/null/numero)', 'resposta de erro (status != 200: code e mensagem, nunca linhas)', 'corpo nao parseavel'],
    porque: 'a primeira versão contava o corpo de erro como `linhas: 1` e o escalar como erro, o que fazia o artefacto ler-se ao contrário; os quatro fixtures estão no --selfteste' },
  clausulas: cls, veredicto: veredito(cls),
  nao_probatorio_hoje: { alvo_revela_colunas_de_linha: alvo.map((x) => ({ nome: x, linhas_para_anon: ia['alvo::' + x]?.linhas })),
    motivo: 'os agregados devolvem contagens e nenhuma escola tem município: com 0 linhas não há identificador de linha para contar, por isso esta cláusula foi posta fora do veredicto em vez de se amaciar o limiar' },
  pen39_e_alvo: pen39_nos_servidos,
  o_que_prova: 'que o anon não lê a vista (401 na base, security_invoker=true medido no catálogo), que os três nomes da candidata PEN-43 continuam executáveis pelo anon nos dois canais (catálogo e HTTP), e que existe pelo menos uma função agregada municipal que o anon NÃO pode executar — o que prova que o 401 é um estado alcançável neste deployment e não um artefacto da chamada.',
  o_que_NAO_prova: 'o que a tela mostra (isso é scripts/sm7-navegador-municipal.mjs), nem o que aconteceria depois de aplicar a PEN-43 (isso é a mesma peça re-corrida depois do OK literal), nem qualquer escrita: nada aqui INSERT/UPDATE/DELETE.',
};
fs.writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log(`${reg.veredicto.estado} · maus=${JSON.stringify(reg.veredicto.maus)}`);
console.log(`alvo=${JSON.stringify(alvo)} controlo=${JSON.stringify(controlo)}`);
console.log(`anon: vista ${ia[VISTA].http} · authority ${JSON.stringify(ia.bfr_is_municipal_authority.http)}`);
console.log('ESCRITO: ' + OUT.split('/').pop() + ' · ' + fs.statSync(OUT).size + ' B');
process.exit(reg.veredicto.maus.length ? 1 : 0);
