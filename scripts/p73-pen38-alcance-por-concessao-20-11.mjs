#!/usr/bin/env node
// P73-PEN38 — ALCANCE REAL POR CONCESSÃO (só leitura). O censo de policies (`p73-politicas-municipais-20-11`)
// diz O QUE está escrito; esta peça diz O QUE PASSA: para cada persona com sessão local, quantas linhas cada
// uma das 11 mesas que o módulo municipal abre devolve, confrontado com o total sem RLS medido pelo canal de
// leitura. É a única forma de distinguir as duas afirmações que a PEN-38 mistura — «a rede toda» e «nada» —
// porque as duas podem ser verdadeiras em mesas diferentes do mesmo utilizador.
// Por HEAD e não por GET: o `Content-Range` dá a contagem sem fazer sair uma linha de dado de aluno, e o
// corpo zero em cada célula é portão, não pressuposto.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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

// Proveniência da shell (correção 22/11, depois duma corrida vermelha): até aqui o esperado era
// `worker-deploy-v137-remendo-pen40/esperado-v137.json` lido pelo URL do diário v136 — dois retratos de 20/11
// que a publicação seguinte ultrapassou, logo a cláusula não podia estar verde enquanto a casa publicasse.
// Agora deriva-se da regra da casa: o diário de publicação indexado de MAIOR número, pareado com a pasta
// `worker-deploy-vNNN-*` da MESMA versão, e nem um dígito do número é meu.
const diarios = readdirSync(REPO)
  .filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
  .map((f) => ({ f, n: Number(/(\d+)\.json$/.exec(f)[1]) }))
  .sort((a, b) => a.n - b.n);
if (diarios.length === 0) throw new Error('ABORTA: nenhum diário de publicação no índice');
const publicado = diarios[diarios.length - 1];
const diario = JSON.parse(readFileSync(join(REPO, publicado.f), 'utf8'));
const alvoUrl = (diario.deploy && diario.deploy.url) || null;
if (!alvoUrl || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(alvoUrl)) throw new Error('ABORTA: deploy.url com forma inesperada no diário ' + publicado.f + ' — ' + String(alvoUrl).slice(0, 120));
const htmlMd5DoDiario = (diario.bundle && diario.bundle.html_md5) || null;
const md5DoArNoDiario = (diario.conferencia_no_ar && diario.conferencia_no_ar.md5_agora) || null;
const pastasDaVersao = readdirSync(REPO).filter((d) => new RegExp('^worker-deploy-v' + publicado.n + '-').test(d) && statSync(join(REPO, d)).isDirectory());
const esperadoDaPasta = pastasDaVersao.length === 1 && existsSync(join(REPO, pastasDaVersao[0], `esperado-v${publicado.n}.json`))
  ? JSON.parse(readFileSync(join(REPO, pastasDaVersao[0], `esperado-v${publicado.n}.json`), 'utf8')) : null;
const htmlMd5DaPasta = esperadoDaPasta && esperadoDaPasta.htmlMd5;
const diarioAnterior = diarios.length > 1 ? JSON.parse(readFileSync(join(REPO, diarios[diarios.length - 2].f), 'utf8')) : null;
const htmlMd5DoDiarioAnterior = diarioAnterior && diarioAnterior.bundle && diarioAnterior.bundle.html_md5;
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
const concessoes = await sql(`select g.id::text as grant_id, g.profile_id::text as uid, g.municipal_role, m.name as municipio, p.role::text as papel_no_perfil
  from public.bfr_municipal_access_grants g
  left join public.bfr_municipalities m on m.id = g.municipality_id
  left join public.profiles p on p.id = g.profile_id
  where g.revoked_at is null order by g.municipal_role`);
const ligadasVivo = await sql('select id::text as escola from public.schools where municipality_id is not null order by id');
const municipiosVivo = await sql('select id::text as municipio from public.bfr_municipalities order by id');
const catalogo = await sql(`select c.relname as mesa, c.relkind::text as tipo from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relname in (${MESAS.map((m) => `'${m}'`).join(',')})`);
const papelPorUid = Object.fromEntries((await sql('select id::text as uid, role::text as papel from public.profiles')).map((x) => [x.uid, x.papel]));
// Proveniência do estado de dados (correção 22/11): os dois agregados que antes se comparavam com o censo de
// policies de 20/11 agora derivam do registro versionado da escrita que criou esse estado (`p92 --aplicar`,
// veredito no próprio ficheiro). A relação portada é de CONTIDO, não de igual: uma concessão nova de produto
// não pode pôr vermelha uma peça que mede alcance, mas uma ligação certificada que desapareça tem de dar
// vermelha. Os dentes da régua medem-se num fixture construído com as linhas vivas, não com um número lembrado.
const p92 = JSON.parse(readFileSync(join(REPO, 'evidence/p92-dados-municipais-c.json'), 'utf8'));
const certificadosP92 = {
  programa: p92.programa, veredito: p92.veredito, em: p92.em,
  escolas_ligadas: (p92.depois.escolas || []).filter((e) => e.municipality_id).map((e) => e.id),
  municipios: (p92.depois.municipios || []).map((m) => m.id),
  grants: (p92.depois.grants || []).map((x) => x.id),
};
const faltam = (esperados, vivos) => { const s = new Set(vivos); return esperados.filter((x) => !s.has(x)); };
const idsLigados = ligadasVivo.map((x) => x.escola), idsMunicipios = municipiosVivo.map((x) => x.municipio), idsGrants = concessoes.map((x) => x.grant_id);
const fixPerda = { sumir_uma_escola: faltam(idsLigados, idsLigados.slice(1)).length, sumir_um_grant: faltam(idsGrants, idsGrants.slice(1)).length, intacto: faltam(idsLigados, idsLigados).length };

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
  g('a_shell_servida_bate_com_o_par_diario_pasta_da_mesma_versao', shellMd5 === htmlMd5DoDiario && shellMd5 === md5DoArNoDiario && pastasDaVersao.length === 1 && !!esperadoDaPasta && shellMd5 === htmlMd5DaPasta, { servido: shellMd5, diario: publicado.f, versao: publicado.n, html_md5_do_diario: htmlMd5DoDiario, md5_no_ar_do_diario: md5DoArNoDiario, pasta: pastasDaVersao, html_md5_da_pasta: htmlMd5DaPasta, md5_do_diario_anterior: htmlMd5DoDiarioAnterior, distingue_da_anterior: shellMd5 !== htmlMd5DoDiarioAnterior }),
  g('a_regua_do_content_range_ve_o_total_do_fixture_e_nao_inventa_no_controlo', fixMedido.cheio === 137 && fixMedido.vazio === 0 && fixMedido.sem === null && fixMedido.mentiroso === null, fixMedido),
  g('nenhuma_celula_devolveu_corpo', celulas.length === MESAS.length * pessoasOk.length && celulas.every((c) => c.corpo_bytes === 0), { celulas: celulas.length, com_corpo: celulas.filter((c) => c.corpo_bytes > 0).length }),
  g('nenhuma_celula_sem_status_ou_sem_total', celulas.every((c) => Number.isInteger(c.status) && (Number.isInteger(c.total) || c.status === 401)), { sem_total: celulas.filter((c) => !Number.isInteger(c.total)).map((c) => c.status) }),
  g('o_que_o_registro_P92_certificado_ainda_esta_no_banco_vivo', faltam(certificadosP92.escolas_ligadas, idsLigados).length === 0 && faltam(certificadosP92.grants, idsGrants).length === 0 && faltam(certificadosP92.municipios, idsMunicipios).length === 0, { escolas_que_faltam: faltam(certificadosP92.escolas_ligadas, idsLigados), grants_que_faltam: faltam(certificadosP92.grants, idsGrants), municipios_que_faltam: faltam(certificadosP92.municipios, idsMunicipios), certificados: { escolas: certificadosP92.escolas_ligadas.length, grants: certificadosP92.grants.length, municipios: certificadosP92.municipios.length }, vivos: { escolas: idsLigados.length, grants: idsGrants.length, municipios: idsMunicipios.length }, registro: certificadosP92.programa + ' · ' + certificadosP92.veredito }),
  g('as_contagens_agregadas_batem_com_as_listas_de_linhas_do_mesmo_instante', muniRow.concessoes_ativas === idsGrants.length && muniRow.escolas_com_municipio === idsLigados.length && muniRow.municipios === idsMunicipios.length, { agregados: muniRow, listas: { grants: idsGrants.length, escolas_ligadas: idsLigados.length, municipios: idsMunicipios.length } }),
  g('a_regua_de_conjunto_tem_dentes_no_fixture_de_perda', fixPerda.sumir_uma_escola === 1 && fixPerda.sumir_um_grant === 1 && fixPerda.intacto === 0, fixPerda),
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
  servido: { url: alvoUrl, bytes: Buffer.byteLength(shellTxt), md5: shellMd5, diario: publicado.f, versao: publicado.n, html_md5_do_diario: htmlMd5DoDiario, html_md5_da_pasta: htmlMd5DaPasta, pasta: pastasDaVersao, md5_do_diario_anterior: htmlMd5DoDiarioAnterior },
  mesas: { origem: 'evidence/p73-politicas-municipais-20-11e.json (mesas_do_modulo)', nomes: MESAS },
  proveniencia_dos_esperados: {
    shell: 'o par diário↔pasta da MESMA versão, enumerados do índice por número de versão (regra da casa; nada pinado à mão)',
    dados: 'evidence/p92-dados-municipais-c.json (`depois`, escrita certificada) em relação de CONTIDO — agregados do censo de policies de 20/11 ficaram campo de história, não régua',
    censo_20_11_historico: censo.agregados,
    porque_mudou: 'as três cláusulas antigas pediam ao censo de 20/11 o que ele não podia dar depois do P92 e da v142: um verde que envelhece no dia em que a ação é autorizada não mede o mundo, mede o passado',
  },
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
console.log(`SERVIDO ${out.servido.md5} IGAUL_DIARIO_${publicado.n} ${shellMd5 === htmlMd5DoDiario && shellMd5 === htmlMd5DaPasta} · REAIS escolas=${totaisRow.schools} alunos=${totaisRow.students} turmas=${totaisRow.classes}`);
console.log(`ESTADO_MUNICIPAL ${JSON.stringify(muniRow)}`);
for (const a of achados.por_persona) console.log(`  ${a.perfil}: autoridade=${JSON.stringify(a.autoridade)} escolas=${a.escolas}/${totaisRow.schools} c_municipio=${a.escolas_com_municipio} alunos=${a.alunos} turmas=${a.turmas} vista=${a.vista} totals=${JSON.stringify(a.totals)}`);
console.log(`  anon autoridade HTTP ${anon.rpc_autoridade_status}`);
console.log(`ACHADOS sobre_largo_em_schools=${JSON.stringify(achados.sobre_largo_em_schools)} sobre_estreito_em_students=${JSON.stringify(achados.sobre_estreito_em_students)} municipio_filtra=${JSON.stringify(achados.municipio_da_concessao_filtra_algo)}`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
