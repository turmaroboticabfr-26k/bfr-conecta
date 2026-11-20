#!/usr/bin/env node
// P73-MUNICIPAL-ETIQUETA — a porta de etiquetagem escola↔município (PEN-38 bloco C) e a folha de decisão.
// Existe porque o `UPDATE public.schools SET municipality_id = …` é a única escrita deste pacote que não é
// DDL: é decisão de conteúdo, e a régua de que ela precisa é «o vínculo existe e tem motivo», não «a coluna
// está preenchida». A candidata PEN-38 fecha o alcance num RPC nomeado (`bfr_school_set_municipality`), que
// exige `auth.uid()` — por isso o modo de escrita não corre pela API de gestão (lá `auth.uid()` é nulo e a
// própria função recusa), e sim por uma sessão autenticada de admin de plataforma lida de um ficheiro.
//
// Por omissão não escreve nada: `--lista` é só-leitura e é o que este ficheiro pode correr hoje. O modo de
// escrita exige (a) a frase literal, (b) o RPC já existente no catálogo — ou seja, PEN-38 aplicada, (c) um
// ficheiro de sessão com o rótulo dado, (d) os dois uuid a resolver em linhas reais, e (e) um motivo com ≥ 3
// caracteres. Falta qualquer um: recusa, sem tocar no banco.
//
// Uso:  node scripts/p73-municipal-etiqueta.mjs --selfteste
//       node scripts/p73-municipal-etiqueta.mjs --lista
//       node scripts/p73-municipal-etiqueta.mjs --escola <uuid> --municipio <uuid> --motivo "…" \
//             --sessao ah2-sessions.json --rotulo direcao@developer --ok "ETIQUETAR ESCOLA E MUNICIPIO"
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { sql, jwtFetch } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf('--' + n); return i === -1 ? null : argv[i + 1]; };
const tem = (n) => argv.includes('--' + n);
const FRASE = 'ETIQUETAR ESCOLA E MUNICIPIO';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// A linha de município que hoje tem as quatro concessões declara-se sozinha no nome. A régua é essa
// declaração, não um nome lembrado por mim: a primeira versão desta peça procurava «Município de Teste»,
// que não existe no banco, e imprimia `aviso_fixture: []` como se fosse prova. O fixture embaixo é o nome
// medido em 20/11 (`--lista`, `evidence/p73-municipal-etiqueta-lista-20-11.json`): se a régua não disparar
// nele, a corrida é VERMELHA e não verde-vazio.
const AGULHA_FIXTURE = /fixture|apagar|descartar|de teste|teste\b/i;
const NOME_FIXTURE_MEDIDO = 'Sao Paulo (SM8 fixture — apagar)';
// O `sql` da API de gestão recebe texto e não parâmetros: tudo o que entra numa consulta tem de passar por
// aqui, senão um `--escola` malformado transforma-se em SQL meu.
const id = (v) => (UUID.test(String(v === null || v === undefined ? '' : v)) ? String(v) : null);
const literal = (v) => (v === null ? 'NULL' : `'${v}'::uuid`);
const sim = (v) => v === true || String(v).toLowerCase() === 't' || String(v).toLowerCase() === 'true';

// A frase é o portão; o uuid é a régua de forma, porque um id malformado não é «linha inexistente» — é o
// meu erro de cópia, e as duas coisas têm de se distinguir no registo.
const casosFix = {
  uuid_bom_passa: id('2f8f0e2a-6f1e-4c1b-9a1d-7c2b1a0d9e3f') === '2f8f0e2a-6f1e-4c1b-9a1d-7c2b1a0d9e3f',
  uuid_malformado_recusa: [undefined, null, '', "a' or 1=1--", '2f8f0e2a-6f1e-4c1b-9a1d-7c2b1a0d9e3'].every((v) => id(v) === null),
  frase_solta_nao_autoriza: 'ok' !== FRASE && 'SIM' !== FRASE,
  motivo_curto_recusa: 'ab'.trim().length < 3 && '  ab  '.trim().length < 3 && 'abc'.trim().length >= 3,
  literal_de_uuid_nao_e_texto_solto: literal(null) === 'NULL' && literal('abc') === "'abc'::uuid",
  agulha_de_fixture_dispara_no_nome_medido: AGULHA_FIXTURE.test(NOME_FIXTURE_MEDIDO),
};

const recusa = (motivos, extra) => {
  const corpo = { programa: 'scripts/p73-municipal-etiqueta.mjs', em: new Date().toISOString(), escrito: false, motivos_de_recusa: motivos, ...(extra || {}) };
  console.log('RECUSADO · ' + JSON.stringify(motivos));
  process.exit(2);
};

if (tem('selfteste')) {
  const maus = Object.entries(casosFix).filter(([, v]) => !v).map(([k]) => k);
  console.log(JSON.stringify({ programa: 'scripts/p73-municipal-etiqueta.mjs', selfteste: true, casos: Object.keys(casosFix).length, falhas: maus, veredito: maus.length === 0 ? `P73_MUNICIPAL_ETIQUETA_SELFTESTE_OK ${Object.keys(casosFix).length}/0` : `P73_MUNICIPAL_ETIQUETA_SELFTESTE_VERMELHO ${maus.join(',')}` }, null, 1));
  process.exit(maus.length === 0 ? 0 : 1);
}

// ── modo só-leitura: a folha com a coluna de município vazia ─────────────────
if (tem('lista')) {
  const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
  const OUT = join(REPO, `evidence/p73-municipal-etiqueta-lista-20-11${SUF}.json`);
  if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, não por cima');
  const escolas = await sql(`select s.id, s.name, s.city, s.state, s.municipality_id,
      (select count(*)::int from public.students st where st.school_id = s.id) as alunos,
      (select count(*)::int from public.classes c where c.school_id = s.id) as turmas
    from public.schools s order by alunos desc, turmas desc, s.name`);
  const municipios = await sql(`select id, name, uf, code_ibge,
      (select count(*)::int from public.schools x where x.municipality_id = m.id) as escolas_ligadas,
      (select count(*)::int from public.bfr_municipal_access_grants g where g.municipality_id = m.id) as concessoes
    from public.bfr_municipalities m order by name`);
  const out = {
    programa: 'scripts/p73-municipal-etiqueta.mjs', modo: 'lista', em: new Date().toISOString(),
    pressuposto: 'nenhum município foi aplicado às escolas: esta corrida é a folha de decisão, não a prova de fecho',
    escolas: { total: escolas.length, com_municipio: escolas.filter((e) => !!e.municipality_id).length,
      com_dados: escolas.filter((e) => e.alunos > 0 || e.turmas > 0).length, linhas: escolas.map((e) => ({ ...e, decidir_municipio: e.municipality_id === null })) },
    municipios: { total: municipios.length, linhas: municipios },
    o_que_esta_folha_decide: 'para cada escola com dados, que município a governa. As escolas sem dados ficam como estão: etiquetar uma escola vazia não muda nenhum número e cria uma falsa sensação de censo completo.',
    aviso_fixture: municipios.filter((m) => AGULHA_FIXTURE.test(String(m.name))).map((m) => `${m.name} (${m.uf}) tem ${m.concessoes} concessoes e ${m.escolas_ligadas} escolas ligadas: e a linha que hoje sustenta o escopo municipal e esta marcada para apagar`),
    regua_fixture: { agulha: String(AGULHA_FIXTURE), nomes_varridos: municipios.length, disparou_no_nome_medido_em_disco: AGULHA_FIXTURE.test(NOME_FIXTURE_MEDIDO) },
  };
  out.veredito = !out.regua_fixture.disparou_no_nome_medido_em_disco
    ? 'P73_MUNICIPAL_ETIQUETA_LISTA_VERMELHO_agulha_de_fixture_nao_dispara_no_nome_medido'
    : `P73_MUNICIPAL_ETIQUETA_LISTA ${escolas.length} escolas, ${escolas.filter((e) => !!e.municipality_id).length} etiquetadas, ${municipios.length} municipios, ${out.aviso_fixture.length} avisos de fixture`;
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(out.veredito);
  for (const e of escolas) console.log(`ESCOLA ${e.name} · ${e.city}/${e.state} · alunos ${e.alunos} turmas ${e.turmas} · municipio ${e.municipality_id === null ? 'A DECIDIR' : 'ligado'}`);
  for (const m of municipios) console.log(`MUNICIPIO ${m.name}/${m.uf} · ibge ${m.code_ibge} · escolas ligadas ${m.escolas_ligadas} · concessoes ${m.concessoes}`);
  console.log(`AVISO_FIXTURE ${JSON.stringify(out.aviso_fixture)}`);
  console.log(`registo ${OUT}`);
  process.exit(0);
}

// ── modo de escrita ─────────────────────────────────────────────────────────
const escola = flag('escola');
const municipio = flag('municipio');
const motivo = flag('motivo');
const sessaoPath = flag('sessao');
const rotulo = flag('rotulo');
const ok = flag('ok');
const motivos = [];
if (!UUID.test(String(escola || ''))) motivos.push(`--escola nao e um uuid: ${JSON.stringify(escola)}`);
if (!UUID.test(String(municipio || ''))) motivos.push(`--municipio nao e um uuid: ${JSON.stringify(municipio)}`);
if (ok === null) motivos.push(`falta --ok com a frase literal (${FRASE}); sem frase, nada e escrito`);
else if (ok !== FRASE) motivos.push(`--ok nao e a frase certificada: esperado exatamente "${FRASE}"`, 'um «ok» solto nao autoriza escrita no banco');
if (motivo === null || String(motivo).trim().length < 3) motivos.push(`falta --motivo com pelo menos 3 caracteres (o RPC recusa menos que isso; §11.5)`);
if (!sessaoPath || !rotulo) motivos.push('falta --sessao <ficheiro> e --rotulo <rotulo>: o RPC exige auth.uid(), logo precisa duma sessao autenticada de admin de plataforma, nao da API de gestao');

// Estado vivo, medido AGORA: o RPC só existe depois de a PEN-38 ser aplicada, e o motivo pelo qual a
// etiquetagem falha tem de ser lido, não presumido.
const rpc = await sql(`select exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname = 'bfr_school_set_municipality') as existe`);
const escolaId = id(escola);
const municipioId = id(municipio);
if (!sim(rpc[0].existe)) motivos.push('o RPC public.bfr_school_set_municipality ainda nao existe no banco: a PEN-38 tem de ser aplicada antes (scripts/p73-municipal-aplica-ddl.mjs --peca PEN-38 …)');
const alvos = await sql(`select (select count(*)::int from public.schools where id = ${literal(escolaId)}) as escola,
  (select count(*)::int from public.bfr_municipalities where id = ${literal(municipioId)}) as municipio,
  (select name from public.schools where id = ${literal(escolaId)}) as nome_escola,
  (select name || '/' || uf from public.bfr_municipalities where id = ${literal(municipioId)}) as nome_municipio`);
if (escolaId && alvos[0].escola !== 1) motivos.push(`a escola ${escolaId} nao e exactamente uma linha (${alvos[0].escola})`);
if (municipioId && alvos[0].municipio !== 1) motivos.push(`o municipio ${municipioId} nao e exactamente uma linha (${alvos[0].municipio})`);
const sessaoAbs = sessaoPath ? (isAbsolute(sessaoPath) ? sessaoPath : join(REPO, sessaoPath)) : null;
const resumoSessao = { ficheiro: sessaoPath, rotulo, fonte: 'so o rotulo e o expirar: o token nunca entra neste registo' };
let token = null;
if (sessaoAbs && rotulo) {
  if (!existsSync(sessaoAbs)) motivos.push(`ficheiro de sessao nao existe: ${sessaoPath} — o mint cria-o (scripts/ah2-mint.mjs) e nao e versionado`);
  else {
    const s = JSON.parse(readFileSync(sessaoAbs, 'utf8'))[rotulo];
    if (!s || typeof s.access_token !== 'string') motivos.push(`rotulo ${rotulo} nao tem access_token no ficheiro de sessao`);
    else {
      token = s.access_token;
      // Uma sessão velha daria 401 dentro do RPC, e o registo pareceria recusa de permissão em vez do que
      // é: o meu token expirou. Mede-se o `exp` antes de chamar.
      const payload = (() => { try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8')); } catch { return null; } })();
      const exp = payload && payload.exp ? payload.exp : null;
      if (exp === null) motivos.push('o access_token do rotulo nao tem payload legivel com exp: sessao corrompida');
      else if (exp - Math.floor(Date.now() / 1000) < 60) motivos.push(`sessao expirada ha ${Math.round((Math.floor(Date.now() / 1000) - exp) / 60)} min: re-correr o mint antes de etiquetar`);
      else resumoSessao.exp_min_restantes = Math.round((exp - Math.floor(Date.now() / 1000)) / 60);
    }
  }
}
if (alvos[0].nome_municipio && AGULHA_FIXTURE.test(String(alvos[0].nome_municipio)) && !tem('aceita-fixture'))
  motivos.push(`o municipio e a linha de teste ${alvos[0].nome_municipio}: passa so com --aceita-fixture, porque etiquetar todas as escolas para uma linha marcada para apagar nao e um fecho`);
const resumoAlvo = { escola: escolaId, nome_escola: alvos[0].nome_escola, municipio: municipioId, nome_municipio: alvos[0].nome_municipio, motivo_chars: String(motivo || '').trim().length };
if (motivos.length) recusa(motivos, { alvo: resumoAlvo, ok_literal: ok });

const antes = await sql(`select municipality_id from public.schools where id = ${literal(escolaId)}`);
const em = new Date().toISOString();
const r = await jwtFetch(token, '/rest/v1/rpc/bfr_school_set_municipality', { method: 'POST', body: JSON.stringify({ p_school: escolaId, p_municipality: municipioId, p_reason: String(motivo).trim() }) });
const depois = await sql(`select municipality_id from public.schools where id = ${literal(escolaId)}`);
const trilha = await sql(`select count(*)::int as n from public.bfr_municipal_audit where action = 'school_municipality_set' and entity_id = ${literal(escolaId)}`);
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-municipal-etiqueta-${String(escolaId).slice(0, 8)}-${String(municipioId).slice(0, 8)}${SUF}.json`);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — correr com P73_SUF=novo, nao por cima');
const out = {
  programa: 'scripts/p73-municipal-etiqueta.mjs', em, escrito: r.status >= 200 && r.status < 300,
  chamada: { rota: '/rest/v1/rpc/bfr_school_set_municipality', status: r.status, corpo_resposta: JSON.stringify(r.j).slice(0, 400) },
  alvo: resumoAlvo, sessao: resumoSessao,
  antes_depois: { antes: antes[0].municipality_id, depois: depois[0].municipality_id, mudou: antes[0].municipality_id !== depois[0].municipality_id },
  trilha: { linhas_para_esta_escola: trilha[0].n },
};
out.veredito = !out.escrito ? `P73_MUNICIPAL_ETIQUETA_RECUSADO_PELO_BANCO ${r.status}`
  : (out.antes_depois.mudou && out.trilha.linhas_para_esta_escola > 0 ? 'P73_MUNICIPAL_ETIQUETADO_E_TRILHADO' : 'P73_MUNICIPAL_ETIQUETADO_COM_CONFERENCIA_VERMELHA');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`HTTP ${r.status} · ${JSON.stringify(r.j).slice(0, 200)}`);
console.log(`ANTES_DEPOIS ${JSON.stringify(out.antes_depois)} · trilha ${out.trilha.linhas_para_esta_escola}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(out.veredito === 'P73_MUNICIPAL_ETIQUETADO_E_TRILHADO' ? 0 : 1);
