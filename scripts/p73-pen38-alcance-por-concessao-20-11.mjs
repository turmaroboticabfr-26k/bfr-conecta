#!/usr/bin/env node
// P73-PEN38 — ALCANCE REAL POR CONCESSÃO (só leitura). O censo de policies (`p73-politicas-municipais-20-11`)
// diz O QUE está escrito; esta peça diz O QUE PASSA: para cada persona com sessão local, quantas linhas cada
// uma das 11 mesas que o módulo municipal abre devolve, confrontado com o total sem RLS medido pelo canal de
// leitura. É a única forma de distinguir as duas afirmações que a PEN-38 mistura — «a rede toda» e «nada» —
// porque as duas podem ser verdadeiras em mesas diferentes do mesmo utilizador.
// Por HEAD e não por GET: o `Content-Range` dá a contagem sem fazer sair uma linha de dado de aluno, e o
// corpo zero em cada célula é portão, não pressuposto.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-pen38-alcance-por-concessao-20-11e${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();

const censo = JSON.parse(readFileSync(join(REPO, 'evidence/p73-politicas-municipais-20-11e.json'), 'utf8'));
const MESAS = censo.mesas_do_modulo;
if (!Array.isArray(MESAS) || MESAS.length < 11) throw new Error('ABORTA: mesas_do_modulo não é a lista esperada — ' + JSON.stringify(MESAS).slice(0, 200));
const IDENT = /^[a-z_][a-z0-9_]*$/;
const nomesOk = MESAS.every((m) => IDENT.test(m));

const esperadoV137 = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v137-remendo-pen40/esperado-v137.json'), 'utf8'));
const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicação v136');
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const shellMd5 = createHash('md5').update(Buffer.from(shellTxt)).digest('hex');
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

// Régua do Content-Range com fixture que sabe disparar e controlo que sabe não inventar.
const totalDoRange = (h) => { if (typeof h !== 'string') return null; const p = h.split('/')[1]; if (!p || p === '*') return null; const n = Number(p); return Number.isInteger(n) && n >= 0 ? n : null; };
const FIX_RANGE = { cheio: '0-24/137', vazio: '*/0', sem: undefined, mentiroso: '0-24/abc' };
const fixMedido = { cheio: totalDoRange(FIX_RANGE.cheio), vazio: totalDoRange(FIX_RANGE.vazio), sem: totalDoRange(FIX_RANGE.sem), mentiroso: totalDoRange(FIX_RANGE.mentiroso) };

const celula = async (path, access, init) => {
  const headers = { apikey: anonKey, Authorization: `Bearer ${access}`, 'content-type': 'application/json', Prefer: 'count=exact', ...(init && init.headers || {}) };
  const r = await fetch(HOST + path, { ...init, headers });
  const corpo = await r.text();
  return { status: r.status, total: totalDoRange(r.headers.get('content-range')), corpo_bytes: Buffer.byteLength(corpo), code: (() => { try { const j = JSON.parse(corpo); return j && j.code ? String(j.code) : null; } catch { return null; } })() };
};
const head = (path, access) => celula(path, access, { method: 'HEAD' });
const rpc = async (fn, body, access) => {
  const r = await fetch(`${HOST}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${access}`, 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const t = await r.text();
  let valor = null; try { valor = JSON.parse(t); } catch { valor = t.slice(0, 160); }
  return { status: r.status, valor, corpo_bytes: Buffer.byteLength(t) };
};

const [totaisRow] = await sql(`select ${MESAS.map((m) => `(select count(*)::int from public.${m}) as "${m}"`).join(', ')}`);
const [muniRow] = await sql(`select (select count(*)::int from public.bfr_municipal_access_grants where revoked_at is null) as concessoes_ativas,
  (select count(*)::int from public.bfr_municipalities) as municipios,
  (select count(*)::int from public.schools where municipality_id is not null) as escolas_com_municipio,
  (select count(*)::int from public.schools) as escolas_totais`);
const concessoes = await sql(`select g.profile_id::text as uid, g.municipal_role, m.name as municipio, p.role::text as papel_no_perfil
  from public.bfr_municipal_access_grants g
  left join public.bfr_municipalities m on m.id = g.municipality_id
  left join public.profiles p on p.id = g.profile_id
  where g.revoked_at is null order by g.municipal_role`);
const catalogo = await sql(`select c.relname as mesa, c.relkind::text as tipo from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (${MESAS.map((m) => `'${m}'`).join(',')})`);
const papelPorUid = Object.fromEntries((await sql('select id::text as uid, role::text as papel from public.profiles')).map((x) => [x.uid, x.papel]));

const ah2 = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const sm8 = JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8'));
const REFERENCIA = ['developer', 'education_supervisor', 'director', 'secretary'];
// Correção datada 20/11, depois duma corrida vermelha em que SÓ as 4 contas municipais passaram: as quatro
// referências morreram com `refresh HTTP 400` porque o instrumento só olhava para o mestre de 19/11. A casa
// tem dois sítios de cadeia — o mestre e `ah2-sessao-<papel>.json` — e o doador (`p73-renova-cadeias.mjs`)
// prova que o por-papel é o que sobrevive às rotações paralelas. Agora tenta-se o por-papel primeiro, e a
// cadeia nova volta a gravar-se no mesmo sítio de onde veio; um refresh bem-sucedido ROTACIONA, por isso
// «sondar» e «gastar» são o mesmo ato e nenhuma cadeia é gasta duas vezes na mesma corrida.
const cadeias = new Map();
const lerCadeia = (p) => {
  if (p.origem === 'sm8-municipal-sessions') return { onde: 'sm8-municipal-sessions.json', dados: sm8[p.perfil], escrever: (novo) => { const c = JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8')); c[p.perfil] = novo; writeFileSync(join(FORA, 'sm8-municipal-sessions.json'), JSON.stringify(c, null, 2) + '\n'); } };
  const fich = join(FORA, `ah2-sessao-${p.perfil}.json`);
  if (existsSync(fich)) { const tudo = JSON.parse(readFileSync(fich, 'utf8')); if (tudo[p.perfil] && tudo[p.perfil].refresh_token) return { onde: fich, dados: tudo[p.perfil], escrever: (novo) => { const c = JSON.parse(readFileSync(fich, 'utf8')); c[p.perfil] = novo; writeFileSync(fich, JSON.stringify(c, null, 2) + '\n'); } }; }
  return { onde: 'ah2-sessions.json', dados: ah2[p.perfil], escrever: (novo) => { const c = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8')); c[p.perfil] = novo; writeFileSync(join(FORA, 'ah2-sessions.json'), JSON.stringify(c, null, 2) + '\n'); } };
};
const lista = [...Object.keys(sm8).map((perfil) => ({ origem: 'sm8-municipal-sessions', perfil })), ...REFERENCIA.filter((p) => ah2[p]).map((perfil) => ({ origem: 'ah2-sessions', perfil }))].map((p) => { const c = lerCadeia(p); return { ...p, id: c.dados.id, cadeia_de: c.onde.split('/').pop() }; });
const tokenVivo = async (p) => {
  const c = lerCadeia(p);
  if (Number(c.dados.expires_at) * 1000 > Date.now() + 30_000) return { access: c.dados.access_token, renovado: false, gravado_em: null };
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: c.dados.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error(`refresh HTTP ${r.status} ${(j && (j.error_code || j.error || j.msg)) || ''}`.trim());
  const novo = { ...c.dados, ...j, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
  if (c.escrever) c.escrever(novo);
  return { access: j.access_token, renovado: true, gravado_em: c.onde.split('/').pop(), cadeia_md5: createHash('md5').update(Buffer.from(j.refresh_token)).digest('hex').slice(0, 12) };
};

const uidComConcessao = new Set(concessoes.map((c) => c.uid));
const pessoas = [];
for (const p of lista) {
  const linha = { perfil: p.perfil, origem: p.origem, uid: p.id, papel_no_perfil: papelPorUid[p.id] || 'SEM-PERFIL', tem_concessao_ativa: uidComConcessao.has(p.id), cadeia_lida_de: p.cadeia_de, alcance: {}, rpc: {} };
  try {
    const tk = await tokenVivo(p);
    linha.token_renovado = tk.renovado;
    linha.gravado_em = tk.gravado_em || null;
    linha.gravado_hash = tk.cadeia_md5 || null;
    const access = tk.access;
    for (const m of MESAS) linha.alcance[m] = await head(`/rest/v1/${m}?select=id`, access);
    linha.alcance_escolas_com_municipio = await head(`/rest/v1/schools?select=id&municipality_id=not.is.null`, access);
    linha.rpc.autoridade = await rpc('bfr_is_municipal_authority', {}, access);
    linha.rpc.network_totals = await rpc('bfr_municipal_network_totals', {}, access);
    linha.rpc.vista_linhas = await head('/rest/v1/bfr_municipal_school_stats?select=school_id', access);
  } catch (e) { linha.erro = String(e.message).slice(0, 160); }
  pessoas.push(linha);
}
const anon = { perfil: 'anon', origem: 'sem sessao', alcance: {} };
for (const m of MESAS) anon.alcance[m] = await head(`/rest/v1/${m}?select=id`, anonKey);
anon.rpc_autoridade_status = (await rpc('bfr_is_municipal_authority', {}, anonKey)).status;

const pessoasOk = pessoas.filter((p) => !p.erro);
const celulas = pessoasOk.flatMap((p) => MESAS.map((m) => p.alcance[m]));
const achados = {
  escolas_reais: totaisRow.schools,
  alunos_reais: totaisRow.students,
  turmas_reais: totaisRow.classes,
  por_persona: pessoasOk.map((p) => ({ perfil: p.perfil, autoridade: p.rpc.autoridade && p.rpc.autoridade.valor, escolas: p.alcance.schools && p.alcance.schools.total, escolas_com_municipio: p.alcance_escolas_com_municipio && p.alcance_escolas_com_municipio.total, alunos: p.alcance.students && p.alcance.students.total, turmas: p.alcance.classes && p.alcance.classes.total, vista: p.rpc.vista_linhas && p.rpc.vista_linhas.total, totals: p.rpc.network_totals && p.rpc.network_totals.valor })),
  sobre_largo_em_schools: pessoasOk.filter((p) => p.alcance.schools && p.alcance.schools.total === totaisRow.schools && totaisRow.schools > 0).map((p) => p.perfil),
  sobre_estreito_em_students: pessoasOk.filter((p) => p.alcance.students && p.alcance.students.total === 0 && totaisRow.students > 0).map((p) => p.perfil),
  municipio_da_concessao_filtra_algo: pessoasOk.filter((p) => p.tem_concessao_ativa && p.alcance_escolas_com_municipio && p.alcance_escolas_com_municipio.total > 0).map((p) => p.perfil),
};

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(nome); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('mesas_lidas_do_artefacto_do_censo_e_todas_com_policy_censurada', MESAS.length >= 11 && MESAS.every((m) => censo.policies.some((x) => x.tabela === m)), { n: MESAS.length, sem_policy: MESAS.filter((m) => !censo.policies.some((x) => x.tabela === m)), origem: censo.programa }),
  g('identificadores_de_mesa_validados_antes_do_sql', nomesOk, MESAS),
  g('todas_as_mesas_existem_no_catalogo', catalogo.length === MESAS.length, { lidas: catalogo.map((c) => `${c.mesa}:${c.tipo}`), esperadas: MESAS.length }),
  g('a_shell_servida_e_a_mesma_que_a_candidata_v137_estende', shellMd5 === esperadoV137.htmlMd5, { servido: shellMd5, esperado: esperadoV137.htmlMd5 }),
  g('a_regua_do_content_range_ve_o_total_do_fixture_e_nao_inventa_no_controlo', fixMedido.cheio === 137 && fixMedido.vazio === 0 && fixMedido.sem === null && fixMedido.mentiroso === null, fixMedido),
  g('nenhuma_celula_devolveu_corpo', celulas.length === MESAS.length * pessoasOk.length && celulas.every((c) => c.corpo_bytes === 0), { celulas: celulas.length, com_corpo: celulas.filter((c) => c.corpo_bytes > 0).length }),
  g('nenhuma_celula_sem_status_ou_sem_total', celulas.every((c) => Number.isInteger(c.status) && (Number.isInteger(c.total) || c.status === 401)), { sem_total: celulas.filter((c) => !Number.isInteger(c.total)).map((c) => c.status) }),
  g('concessoes_ativas_batem_com_o_censo', muniRow.concessoes_ativas === censo.agregados.concessoes_ativas && concessoes.length === muniRow.concessoes_ativas, { sql: muniRow.concessoes_ativas, censo: censo.agregados.concessoes_ativas, linhas: concessoes.length }),
  g('escolas_com_municipio_batem_com_o_censo', muniRow.escolas_com_municipio === censo.agregados.escolas_com_municipality_id, { sql: muniRow.escolas_com_municipio, censo: censo.agregados.escolas_com_municipality_id }),
  g('controle_de_autenticacao_passa_para_quem_tem_sessao', pessoasOk.length === pessoas.length && pessoasOk.every((p) => p.alcance.schools && p.alcance.schools.status !== 401), { sem_erro: pessoasOk.length, pessoas: pessoas.length, schools_status: pessoasOk.map((p) => p.alcance.schools && p.alcance.schools.status) }),
  g('autoridade_devolve_o_que_a_mesa_das_concessoes_afirma', pessoasOk.every((p) => !!p.rpc.autoridade.valor === p.tem_concessao_ativa || p.papel_no_perfil === 'education_supervisor'), pessoasOk.map((p) => `${p.perfil}:rpc=${p.rpc.autoridade.valor}:mesa=${p.tem_concessao_ativa}:papel=${p.papel_no_perfil}`)),
  g('o_anon_nao_recebe_linha_de_dado_escolar', MESAS.every((m) => anon.alcance[m].status === 401 || anon.alcance[m].total === 0), Object.fromEntries(MESAS.map((m) => [m, [anon.alcance[m].status, anon.alcance[m].total]]))),
  g('a_rpc_de_totais_responde_para_quem_tem_autoridade', pessoasOk.filter((p) => p.rpc.autoridade.valor === true).every((p) => p.rpc.network_totals.status === 200), pessoasOk.filter((p) => p.rpc.autoridade.valor === true).map((p) => `${p.perfil}:${p.rpc.network_totals.status}`)),
];

const out = {
  programa: 'scripts/p73-pen38-alcance-por-concessao-20-11.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'quanto do que o módulo municipal abre chega de facto a cada persona com concessão — e o município da concessão é hoje uma fronteira em alguma mesa?',
  metodo: 'HEAD por mesa com `Prefer: count=exact` e sessão de cada persona local; totais sem RLS pelo canal de leitura; zero corpo no fio; refresh de token vencido escrito só nos ficheiros locais de sessão, nunca no artefacto',
  servido: { url: alvoUrl, bytes: Buffer.byteLength(shellTxt), md5: shellMd5 },
  mesas: { origem: 'evidence/p73-politicas-municipais-20-11e.json (mesas_do_modulo)', nomes: MESAS },
  reais_sem_rls: totaisRow,
  estado_municipal: muniRow,
  concessoes,
  fixture_content_range: { entrada: FIX_RANGE, medido: fixMedido },
  anon,
  pessoas,
  achados,
  portoes,
  falhas,
};
out.veredito = falhas.length === 0 ? `P73_PEN38_ALCANCE_OK ${portoes.length}/0` : `P73_PEN38_ALCANCE_VERMELHO ${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_PEN38_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`SERVIDO ${out.servido.md5} IGAUL_CANDIDATA ${shellMd5 === esperadoV137.htmlMd5} · REAIS escolas=${totaisRow.schools} alunos=${totaisRow.students} turmas=${totaisRow.classes}`);
console.log(`ESTADO_MUNICIPAL ${JSON.stringify(muniRow)}`);
for (const a of achados.por_persona) console.log(`  ${a.perfil}: autoridade=${JSON.stringify(a.autoridade)} escolas=${a.escolas}/${totaisRow.schools} c_municipio=${a.escolas_com_municipio} alunos=${a.alunos} turmas=${a.turmas} vista=${a.vista} totals=${JSON.stringify(a.totals)}`);
console.log(`  anon autoridade HTTP ${anon.rpc_autoridade_status}`);
console.log(`ACHADOS sobre_largo_em_schools=${JSON.stringify(achados.sobre_largo_em_schools)} sobre_estreito_em_students=${JSON.stringify(achados.sobre_estreito_em_students)} municipio_filtra=${JSON.stringify(achados.municipio_da_concessao_filtra_algo)}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
