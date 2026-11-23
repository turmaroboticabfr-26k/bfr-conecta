#!/usr/bin/env node
// P144-PREFLIGHT — só leitura, zero escrita. A candidata scripts/p144-rm52-conteudo-ddl-candidata.sql
// semeia o conteudo do calendario letivo 2026 (365 datas, 12 metas, 1 turno) e a reversao apaga o ano.
// Este preflight certifica que (i) os ficheiros em disco sao exactamente os bytes que o gerador escreveu,
// (ii) o bloco CONST do registo do gerador e o extraido do proprio gerador sao o mesmo JSON, (iii) uma
// re-derivacao INDEPENDENTE (por fontes, com deteccao de conflitos, e nao a cadeia do gerador) reproduz
// as 365 linhas do SQL, (iv) o catalogo vivo esta no estado que o modo exige: candidata = 3 mesas vazias
// + esquema identico ao medido no p73 + a funcao A1 ainda ausente; reversao = exactamente a semente de
// 2026 em cada mesa. Nada disto se le so do texto do SQL; mede-se no catalogo, neste instante.
//
// Uso: node scripts/p144-rm52-conteudo-preflight.mjs            (modo candidata: exige as 3 mesas vazias)
//      node scripts/p144-rm52-conteudo-preflight.mjs --reversao (modo reversao: exige a semente de 2026)
//      P144PF_SUF=novo distingue corridas; P144PF_REG=evidence/p144-…json liga ao registo do gerador.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const MODO = process.argv.includes('--reversao') ? 'reversao' : 'candidata';
const SUF = process.env.P144PF_SUF ? '-' + process.env.P144PF_SUF : '-23-11';
const REL_REG = process.env.P144PF_REG;
if (!REL_REG) { console.error('ABORTA: passe P144PF_REG=evidence/p144-rm52-conteudo-registo-do-gerador-….json (o registo do gerador).'); process.exit(2); }
const OUT = join(REPO, 'evidence', 'p144-rm52-conteudo-preflight-' + MODO + SUF + '.json');
if (existsSync(OUT)) { console.error('ABORTA: ja existe ' + OUT + ' — passe P144PF_SUF novo.'); process.exit(2); }
const CAM_CAND = 'scripts/p144-rm52-conteudo-ddl-candidata.sql';
const CAM_REV = 'scripts/p144-rm52-conteudo-ddl-reversao.sql';
const CAM_P73 = 'evidence/p73-rm52-estado-calendario-20-11.json';
const t0 = Date.now();
const cru = (c) => readFileSync(join(REPO, c), 'utf8');
const rawCand = cru(CAM_CAND), rawRev = cru(CAM_REV);
const soCodigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const conta = (re, t) => (t.match(re) || []).length;

// ---- o registo do gerador, com a pegada dele -----------------------------------------------------------
const F_REG = join(REPO, REL_REG);
if (!existsSync(F_REG)) { console.error('ABORTA: falta ' + F_REG); process.exit(2); }
const bufReg = readFileSync(F_REG);
const gen = JSON.parse(bufReg.toString('utf8'));
if (!gen || !gen.ficheiros_gerados || !gen.constantes || !gen.peca || !gen.derivado) {
  console.error('ABORTA: o registo do gerador nao traz ficheiros_gerados/constantes/peca/derivado.'); process.exit(2);
}

// ---- o bloco CONST: duas proveniencias, uma so identidade ----------------------------------------------
const fonteGeradora = readFileSync(join(REPO, gen.peca), 'utf8');
const ini = fonteGeradora.indexOf('// CONST-INICIO');
const fim = fonteGeradora.indexOf('// CONST-FIM');
if (ini < 0 || fim < 0 || fim <= ini) { console.error('ABORTA: nao achei as marcas CONST-INICIO/CONST-FIM no gerador.'); process.exit(2); }
const bloco = fonteGeradora.slice(ini, fim).slice(fonteGeradora.slice(ini, fim).indexOf('const CONST')).split('};')[0] + '};';
const mundoConst = createContext({});
runInContext(bloco + '\nglobalThis.__CONST = CONST;', mundoConst);
const C = mundoConst.__CONST;

// ---- o predicado de leitura vem do ficheiro do p139, como no gerador -----------------------------------
const fonte139 = readFileSync(join(AQUI, 'p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs')).toString('utf8');
const linhaPredicado = fonte139.split(/\r?\n/).find((l) => l.startsWith('const eLeitura ='));
if (!linhaPredicado) { console.error('ABORTA: nao li a linha `const eLeitura =` do p139.'); process.exit(2); }
const mundoPred = createContext({});
runInContext(linhaPredicado + '\nglobalThis.__eLeitura = eLeitura;', mundoPred);
const eLeitura = mundoPred.__eLeitura;
const formas = [];
const q = async (txt) => {
  const t = String(txt);
  formas.push(eLeitura(t));
  if (!eLeitura(t)) throw new Error('ABORTA: esta peca e so-leitura e alguem lhe passou ' + t.slice(0, 60));
  return sql(t);
};

// ---- a guarda aborta antes do banco ---------------------------------------------------------------------
let guardaAbortou = false;
let guardaChegouAoBanco = false;
try { await q('INSERT INTO public.bfr_school_calendar_days (school_year, school_date) VALUES (2026, current_date)'); guardaChegouAoBanco = true; }
catch (e) { guardaAbortou = /ABORTA/.test(String(e.message)); }

// ---- re-derivacao INDEPENDENTE: por fontes, com deteccao de conflitos ----------------------------------
const dsc = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return { y: +m[1], mo: +m[2], da: +m[3] }; };
const dowDe = (d) => { const { y, mo, da } = dsc(d); return new Date(Date.UTC(y, mo - 1, da)).getUTCDay(); };
const dentro = (d, de, ate) => d >= de && d <= ate;
const bis = (C.ano % 4 === 0 && C.ano % 100 !== 0) || C.ano % 400 === 0;
const N = bis ? 366 : 365;
const chave = (y, mo, da) => y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
const todas = [];
for (let i = 0; i < N; i++) { const d = new Date(Date.UTC(C.ano, 0, 1 + i)); todas.push(chave(C.ano, d.getUTCMonth() + 1, d.getUTCDate())); }
const mapa = {};
for (const d of todas) mapa[d] = { status: 'no_school', label: '', fonte: 'resto' };
const conflitos = [];
const poe = (d, status, label, fonte) => {
  if (mapa[d].status !== 'no_school') { conflitos.push([d, mapa[d].fonte, fonte]); return; }
  mapa[d] = { status, label, fonte };
};
C.feriados.forEach(([d, l]) => poe(d, 'holiday', l, 'feriados'));
C.carnaval.forEach((d) => poe(d, 'recess', 'Carnaval', 'carnaval'));
C.recuperacao.forEach((d) => poe(d, 'recovery', 'Recuperacao final', 'recuperacao'));
for (const d of todas) { if (dentro(d, C.recesso_julho.de, C.recesso_julho.ate) && dowDe(d) >= 1 && dowDe(d) <= 5) poe(d, 'recess', 'Recesso escolar', 'recesso_julho'); }
C.sabados_letivos.forEach((d) => poe(d, 'school_day', 'Sabado letivo', 'sabados_letivos'));
for (const d of todas) {
  if (mapa[d].status !== 'no_school') continue;
  const w = dowDe(d);
  mapa[d] = (!dentro(d, C.inicio, C.fim) || w === 0 || w === 6)
    ? { status: 'no_school', label: '', fonte: 'resto' }
    : { status: 'school_day', label: '', fonte: 'resto' };
}

// ---- o que as duas pecas escrevem, lido do codigo ------------------------------------------------------
const RE_INS_DIA = /^INSERT INTO public\.bfr_school_calendar_days \(school_year, school_date, calendar_status, label\) VALUES \((\d+), '(\d{4}-\d{2}-\d{2})', '([a-z_]+)', '([^']*)'\);/gim;
const RE_INS_META = /^INSERT INTO public\.bfr_school_calendar_month_targets \(school_year, month, expected_school_days\) VALUES \((\d+), (\d+), (\d+)\);/gim;
const RE_INS_TURNO = /^INSERT INTO public\.bfr_school_shift_settings \(school_year, shift, entry_opens_at, class_starts_at, shift_closes_at, active_weekdays, late_grace_minutes\) VALUES \((\d+), '([a-z]+)', '(\d{2}:\d{2}:\d{2})', '(\d{2}:\d{2}:\d{2})', '(\d{2}:\d{2}:\d{2})', ARRAY\[([\d,]+)\], (\d+)\);/gim;
const RE_DEL = /^DELETE FROM public\.(bfr_school_calendar_days|bfr_school_calendar_month_targets|bfr_school_shift_settings) WHERE school_year = (\d+);/gim;
const parsedDias = [...soCodigo(rawCand).matchAll(RE_INS_DIA)].map((m) => ({ ano: +m[1], data: m[2], status: m[3], label: m[4] }));
const parsedMetas = [...soCodigo(rawCand).matchAll(RE_INS_META)].map((m) => ({ ano: +m[1], mes: +m[2], esperado: +m[3] }));
const parsedTurno = [...soCodigo(rawCand).matchAll(RE_INS_TURNO)].map((m) => ({ ano: +m[1], shift: m[2], entry_opens_at: m[3], class_starts_at: m[4], shift_closes_at: m[5], active_weekdays: m[6].split(',').map(Number), late_grace_minutes: +m[7] }));
const parsedDel = [...soCodigo(rawRev).matchAll(RE_DEL)].map((m) => ({ tabela: m[1], ano: +m[2] }));
const estruturaDe = (t) => { const s = soCodigo(t); const c = (re) => (s.match(re) || []).length;
  return { begin: c(/^BEGIN;/gm), commit: c(/^COMMIT;/gm),
    insert_dias: c(/^INSERT INTO public\.bfr_school_calendar_days /gim),
    insert_metas: c(/^INSERT INTO public\.bfr_school_calendar_month_targets /gim),
    insert_turno: c(/^INSERT INTO public\.bfr_school_shift_settings /gim),
    total_inserts: c(/^\s*INSERT INTO/gim), deletes: c(/^\s*DELETE FROM/gim),
    fora: c(/^\s*(UPDATE|DROP|ALTER|CREATE|TRUNCATE|COPY|GRANT|REVOKE)\b/gim) }; };
const estCand = estruturaDe(rawCand), estRev = estruturaDe(rawRev);

// ---- o catalogo vivo, re-medido -------------------------------------------------------------------------
const censo = (await q([
  'select',
  '  (select count(*) from public.bfr_school_calendar_days)::int as dias,',
  '  (select count(*) from public.bfr_school_calendar_month_targets)::int as metas,',
  '  (select count(*) from public.bfr_school_shift_settings)::int as turnos',
].join('\n')))[0];
const anosDias = (await q('select coalesce(array_agg(distinct school_year order by school_year), \'{}\')::text as anos from public.bfr_school_calendar_days'))[0];
const anosMetas = (await q('select coalesce(array_agg(distinct school_year order by school_year), \'{}\')::text as anos from public.bfr_school_calendar_month_targets'))[0];
const anosTurnos = (await q('select coalesce(array_agg(distinct school_year order by school_year), \'{}\')::text as anos from public.bfr_school_shift_settings'))[0];
const colunasVivas = await q([
  'select c.table_name as tabela, c.column_name as coluna, c.data_type as tipo, c.is_nullable as nulable,',
  '       coalesce(c.column_default, \'\') as omissao',
  'from information_schema.columns c',
  "where c.table_schema = 'public' and c.table_name in ('bfr_school_calendar_days','bfr_school_calendar_month_targets','bfr_school_shift_settings')",
  'order by c.table_name, c.ordinal_position',
].join('\n'));
const restricoesVivas = await q([
  'select c.relname as tabela, con.conname as nome, con.contype as tipo, pg_get_constraintdef(con.oid) as definicao',
  'from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace',
  "where n.nspname = 'public' and c.relname in ('bfr_school_calendar_days','bfr_school_calendar_month_targets','bfr_school_shift_settings')",
  'order by c.relname, con.conname',
].join('\n'));
const rpcVivas = await q([
  'select p.proname as nome, count(*)::int as n from pg_proc p',
  "where p.proname in ('bfr_confirm_school_calendar','register_gate_checkin','bfr_rls_session_role')",
  'group by p.proname order by p.proname',
].join('\n'));
const linhasDiasVivas = await q([
  'select school_year::int as ano, to_char(school_date, \'YYYY-MM-DD\') as d, calendar_status, label',
  'from public.bfr_school_calendar_days order by school_date',
].join('\n'));
const linhasMetasVivas = await q([
  'select school_year::int as ano, month::int as mes, expected_school_days::int as esperado',
  'from public.bfr_school_calendar_month_targets order by month',
].join('\n'));
const linhasTurnosVivas = await q([
  'select school_year::int as ano, shift, entry_opens_at::text as entry_opens_at, class_starts_at::text as class_starts_at,',
  '       shift_closes_at::text as shift_closes_at, array_to_string(active_weekdays, \',\') as wd, late_grace_minutes::int as late_grace_minutes',
  'from public.bfr_school_shift_settings order by shift',
].join('\n'));

// ---- o artefacto p73 como testemunha do esquema --------------------------------------------------------
const artP73 = JSON.parse(readFileSync(join(REPO, CAM_P73), 'utf8'));
const colunasArt = Object.values(artP73.catalogo.colunas).map((x) => [x.tabela, x.coluna, x.tipo, x.nulable, x.omissao]).sort();
const restricoesArt = Object.values(artP73.catalogo.restricoes).map((x) => [x.tabela, x.nome, x.tipo, x.definicao]).sort();
const grade = artP73.catalogo.grade_tempos && artP73.catalogo.grade_tempos[0];

// ---- portao ---------------------------------------------------------------------------------------------
const portoes = [];
const gate = (nome, obtido, esperado, detalhe) => {
  portoes.push({ nome, verde: JSON.stringify(obtido) === JSON.stringify(esperado), obtido, esperado, detalhe });
};

gate('a_pega_dos_ficheiros_lidos_e_a_do_registo_do_gerador',
  [Buffer.byteLength(rawCand, 'utf8'), md5(Buffer.from(rawCand, 'utf8')), Buffer.byteLength(rawRev, 'utf8'), md5(Buffer.from(rawRev, 'utf8'))],
  [gen.ficheiros_gerados.candidata.bytes, gen.ficheiros_gerados.candidata.md5, gen.ficheiros_gerados.reversao.bytes, gen.ficheiros_gerados.reversao.md5],
  { rel: REL_REG, nota: 'o preflight certifica exactamente os bytes que o gerador escreveu' });
gate('a_pega_do_emissor_do_gerador_bate_com_o_ficheiro_em_disco', (() => {
  const src = readFileSync(join(REPO, gen.peca));
  return [src.length === gen.emissor_bytes, md5(src) === gen.emissor_md5];
})(), [true, true], { peca: gen.peca });
gate('o_bloco_const_do_registo_e_o_extraido_do_gerador_sao_o_mesmo_json',
  [JSON.stringify(C) === JSON.stringify(gen.constantes)], [true],
  { nota: 'as constantes do registo nao podem ter vindo de outro lado que nao o gerador' });
gate('a_guarda_de_leitura_aborta_antes_de_chegar_ao_banco', [guardaAbortou, guardaChegouAoBanco], [true, false],
  { texto_passado: 'INSERT INTO public.bfr_school_calendar_days (school_year, school_date) VALUES (2026, current_date)', predicado_lido: linhaPredicado });
gate('o_predicado_de_leitura_dispara_nos_dois_lados',
  [[eLeitura('select 1'), eLeitura('with a as (select 1) select * from a'), eLeitura('INSERT INTO public.bfr_school_calendar_days VALUES (1)'), eLeitura('')]],
  [[true, true, false, false]], { origem: 'scripts/p139-acls-dos-nomes-do-ar-contra-o-alvo.mjs' });
gate('as_duas_pecas_tem_uma_so_transaccao_de_linhas_sem_ddl_e_o_aviso_de_nao_aplicar',
  [estCand.begin, estCand.commit, estCand.insert_dias, estCand.insert_metas, estCand.insert_turno, estCand.total_inserts, estCand.deletes, estCand.fora,
   estRev.begin, estRev.commit, estRev.insert_dias, estRev.insert_metas, estRev.insert_turno, estRev.total_inserts, estRev.deletes, estRev.fora,
   rawCand.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR'), rawRev.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR')],
  [1, 1, 365, 12, 1, 378, 0, 0, 1, 1, 0, 0, 0, 0, 3, 0, true, true],
  { estCand, estRev });
gate('a_reversao_apaga_exactamente_as_tres_mesas_pelo_mesmo_ano_sem_mais_nada',
  [parsedDel.length, parsedDel.map((d) => d.tabela).sort(), parsedDel.every((d) => d.ano === 2026)],
  [3, ['bfr_school_calendar_days', 'bfr_school_calendar_month_targets', 'bfr_school_shift_settings'], true], { parsedDel });
gate('a_re-derivacao_por_fontes_nao_tem_conflitos_nenhuns',
  [conflitos.length, conflitos], [0, []],
  { nota: 'as cinco fontes (feriados, carnaval, recuperacao, recesso, sabados) sao disjuntas: um dia reclamado por duas fontes seria um vermelho que a cadeia do gerador mascararia' });
gate('o_parser_rele_as_365_datas_e_cada_linha_bate_com_a_re-derivacao_independente',
  [parsedDias.length, N,
   parsedDias.every((l) => l.ano === C.ano && mapa[l.data] && mapa[l.data].status === l.status && mapa[l.data].label === l.label),
   todas.filter((d) => parsedDias.some((l) => l.data === d)).length],
  [365, N, true, N], { exemplo: parsedDias[0], nota: 'a derivacao deste preflight e por fontes com deteccao de conflitos, nao a cadeia por-dia do gerador' });
gate('as_contagens_por_status_do_sql_batem_com_o_derivado_do_registo',
  [Object.fromEntries(['no_school', 'school_day', 'recess', 'holiday', 'recovery'].map((s) => [s, parsedDias.filter((l) => l.status === s).length]))],
  [gen.derivado.contagens_por_status], {});
gate('o_parser_rele_as_12_metas_e_batem_com_o_bloco_const',
  [parsedMetas.length, parsedMetas.map((m) => m.esperado), parsedMetas.every((m) => m.ano === C.ano && m.mes >= 1 && m.mes <= 12 && m.esperado >= 0 && m.esperado <= 31)],
  [12, C.metas_mensais, true], {});
gate('a_soma_mensal_das_linhas_do_sql_bate_com_as_metas_e_com_o_declarado',
  [Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => parsedDias.filter((l) => l.status === 'school_day' && +l.data.slice(5, 7) === mes).length),
   parsedDias.filter((l) => l.status === 'school_day').length],
  [C.metas_mensais, 204], { declarado: '204 DIAS LETIVOS!! do documento' });
gate('o_parser_rele_o_turno_e_bate_com_o_bloco_const_e_com_a_grade_do_p73',
  [parsedTurno.length, parsedTurno[0] && parsedTurno[0].ano, parsedTurno[0] && parsedTurno[0].shift,
   parsedTurno[0] && parsedTurno[0].entry_opens_at, parsedTurno[0] && parsedTurno[0].class_starts_at, parsedTurno[0] && parsedTurno[0].shift_closes_at,
   parsedTurno[0] && parsedTurno[0].active_weekdays, parsedTurno[0] && parsedTurno[0].late_grace_minutes,
   grade && [parsedTurno[0].entry_opens_at, parsedTurno[0].shift_closes_at].join(' ') === [grade.inicio_min, grade.fim_max].join(' ')],
  [1, C.ano, C.turno.shift, C.turno.entry_opens_at, C.turno.class_starts_at, C.turno.shift_closes_at,
   C.turno.active_weekdays, C.turno.late_grace_minutes, true],
  { grade: { inicio_min: grade && grade.inicio_min, fim_max: grade && grade.fim_max }, nota: 'as horas leem-se do artefacto do p73, nunca da memoria' });
gate('o_turno_nao_finge_confirmacao_nem_semeia_o_vespertino',
  [conta(/confirmed_at|confirmed_by|source_status|updated_by/gi, soCodigo(rawCand)),
   conta(/vespertino/gi, soCodigo(rawCand)),
   JSON.stringify(C.turnos_sem_horas_medidas) === JSON.stringify(['vespertino'])],
  [0, 0, true],
  { nota: 'sem colunas de confirmacao no INSERT e sem linha vespertino: confirmar e o ato da funcao A1 (ausente), nao da semente' });
gate('os_8_sabados_sao_sabado_escolar_dentro_do_periodo',
  [parsedDias.filter((l) => l.label === 'Sabado letivo').length,
   parsedDias.filter((l) => l.label === 'Sabado letivo').every((l) => dowDe(l.data) === 6),
   parsedDias.filter((l) => l.label === 'Sabado letivo').every((l) => l.status === 'school_day' && dentro(l.data, C.inicio, C.fim)),
   parsedDias.filter((l) => l.label === 'Sabado letivo').map((l) => l.data)],
  [8, true, true, C.sabados_letivos], {});
gate('os_feriados_em_dia_util_sao_16_e_os_fora_do_efeito_sao_os_do_registo',
  [parsedDias.filter((l) => l.status === 'holiday' && dentro(l.data, C.inicio, C.fim) && dowDe(l.data) >= 1 && dowDe(l.data) <= 5).map((l) => l.data),
   parsedDias.filter((l) => l.status === 'holiday' && (!dentro(l.data, C.inicio, C.fim) || dowDe(l.data) === 0 || dowDe(l.data) === 6)).map((l) => l.data)],
  [gen.derivado.feriados_em_dia_util, gen.derivado.fora_do_efeito],
  { nota: '31/05 e domingo e 25/12 esta fora do periodo: rotulados de feriado sem consumir dia util' });
gate('o_recesso_de_julho_no_sql_sao_exactamente_os_10_uteis_do_registo',
  [parsedDias.filter((l) => l.label === 'Recesso escolar').map((l) => l.data),
   parsedDias.filter((l) => l.label === 'Carnaval').map((l) => l.data),
   parsedDias.filter((l) => l.label === 'Recuperacao final').map((l) => l.data)],
  [gen.derivado.recesso_julho_uteis, C.carnaval, C.recuperacao], {});
gate('as_fixtures_de_dia_de_semana_disparam_nos_dois_sentidos',
  [['2026-03-14', '2026-02-09', '2026-12-31', '2026-01-01'].map(dowDe)], [[6, 1, 4, 4]], { nota: 'sabado 14/03, segunda 09/02, quintas 31/12 e 01/01' });
gate('as_fixtures_de_dentro_do_periodo_disparam_nos_dois_sentidos',
  [['2026-02-08', '2026-02-09', '2026-12-18', '2026-12-19'].map((d) => dentro(d, C.inicio, C.fim))], [[false, true, true, false]], {});
gate('o_catalogo_vivo_no_modo_' + MODO + '_esta_no_estado_esperado',
  [[censo.dias, censo.metas, censo.turnos, anosDias.anos, anosMetas.anos, anosTurnos.anos]],
  MODO === 'candidata' ? [[0, 0, 0, '{}', '{}', '{}']] : [[365, 12, 1, '{2026}', '{2026}', '{2026}']],
  { censo, anos: { dias: anosDias.anos, metas: anosMetas.anos, turnos: anosTurnos.anos },
    nota: MODO === 'candidata' ? 'as tres mesas estao vazias: a semente ainda nao foi aplicada' : 'so ha linhas do ano 2026: a reversao apaga exactamente a semente e nada de outro ano' });
gate('as_colunas_vivas_batem_com_o_artefacto_p73',
  [colunasVivas.map((x) => [x.tabela, x.coluna, x.tipo, x.nulable, x.omissao]).sort()],
  [colunasArt], { vivas: colunasVivas.length, artefacto: colunasArt.length });
gate('as_restricoes_vivas_batem_com_o_artefacto_p73',
  [restricoesVivas.map((x) => [x.tabela, x.nome, x.tipo, x.definicao]).sort()],
  [restricoesArt], { vivas: restricoesVivas.length, artefacto: restricoesArt.length });
gate('a_funcao_a1_continua_ausente_e_os_controlos_positivos_existem',
  [rpcVivas.filter((r) => r.nome === 'bfr_confirm_school_calendar').length,
   rpcVivas.filter((r) => r.nome === 'register_gate_checkin').map((r) => r.n),
   rpcVivas.filter((r) => r.nome === 'bfr_rls_session_role').map((r) => r.n)],
  [0, [1], [1]],
  { rpcVivas, nota: 'sem A1, confirmar o calendario continua impossivel por funcao; os dois controlos positivos provam que a query ve o catalogo' });
gate(MODO === 'candidata'
  ? 'em_candidata_as_leituras_de_linhas_estao_vazias_como_o_censo'
  : 'em_reversao_as_linhas_vivas_sao_exactamente_as_da_candidata',
  [linhasDiasVivas.map((r) => [r.ano, r.d, r.calendar_status, r.label]).sort(),
   linhasMetasVivas.map((r) => [r.ano, r.mes, r.esperado]).sort(),
   linhasTurnosVivas.map((r) => [r.ano, r.shift, r.entry_opens_at, r.class_starts_at, r.shift_closes_at, r.wd, r.late_grace_minutes]).sort()],
  MODO === 'candidata'
    ? [[], [], []]
    : [parsedDias.map((l) => [l.ano, l.data, l.status, l.label]).sort(),
       parsedMetas.map((m) => [m.ano, m.mes, m.esperado]).sort(),
       parsedTurno.map((t) => [t.ano, t.shift, t.entry_opens_at, t.class_starts_at, t.shift_closes_at, t.active_weekdays.join(','), t.late_grace_minutes]).sort()],
  { nota: MODO === 'candidata' ? 'nada a ler' : 'linha a linha: o que a reversao vai apagar e exactamente o que a candidata escreve' });
gate('cada_query_passa_por_q_e_so_ha_um_toque_directo_de_sql',
  [formas.length === (EU.toString('utf8').split('aw' + 'ait q(').length - 1),
   (EU.toString('utf8').split('s' + 'ql(').length - 1) === 1,
   formas.length >= 2,
   formas.filter(Boolean).length === formas.length - 1],
  [true, true, true, true],
  { formas: formas.length, nota: 'o unico false e a sonda da guarda' });
gate('nenhum_identificador_pessoal_nem_token_entra_neste_registo', (() => {
  const candidato = JSON.stringify({ parsedDias, parsedMetas, parsedTurno, parsedDel, censo, anosDias, anosMetas, anosTurnos, colunasVivas, restricoesVivas, rpcVivas, conflitos });
  const FIX_VARREDURA = 'maria' + '@example.edu ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.' + 'abcdefghij' + '.' + 'klmnopqrst';
  const reEmail = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const reJwt = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
  return [(candidato.match(reEmail) || []).length, (candidato.match(reJwt) || []).length,
    (FIX_VARREDURA.match(reEmail) || []).length, (FIX_VARREDURA.match(reJwt) || []).length];
})(), [0, 0, 1, 1]);

const verdes = portoes.filter((g) => g.verde).length;
const falhas = portoes.length - verdes;
const veredito = 'P144_RM52_PREFLIGHT_' + (falhas === 0 ? 'VERDE' : 'VERMELHO') + '_' + MODO.toUpperCase() + ' ' + verdes + '/' + falhas
  + ' · dias ' + parsedDias.length
  + ' · metas ' + parsedMetas.length
  + ' · turnos ' + parsedTurno.length
  + ' · censo ' + censo.dias + '/' + censo.metas + '/' + censo.turnos
  + ' · conflitos ' + conflitos.length
  + ' · ' + (Date.now() - t0) + ' ms';
const resultado = {
  peca: 'scripts/p144-rm52-conteudo-preflight.mjs',
  modo: MODO,
  em: new Date().toISOString(),
  duracao_ms: Date.now() - t0,
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  pergunta: 'o que o catalogo vivo diz hoje sobre as duas pecas do p144: a candidata semeia exactamente o calendario medido e a reversao apaga exactamente o ano 2026?',
  metodo: 'as declaracoes leem-se do codigo sem comentarios das duas pecas; o bloco CONST tem duas proveniencias (registo do gerador e gerador em disco) e so vale se forem o mesmo JSON; a derivacao e independente (por fontes, com deteccao de conflitos); o catalogo e re-medido (censo, colunas, restricoes, rpc, linhas) com o predicado eLeitura lido do p139; zero escrita.',
  identidade_do_medido: {
    registo_do_gerador: { rel: REL_REG, bytes: bufReg.length, md5: md5(bufReg) },
    ficheiros: { candidata: { caminho: CAM_CAND, bytes: Buffer.byteLength(rawCand, 'utf8'), md5: md5(Buffer.from(rawCand, 'utf8')) },
      reversao: { caminho: CAM_REV, bytes: Buffer.byteLength(rawRev, 'utf8'), md5: md5(Buffer.from(rawRev, 'utf8')) } },
    predicado_lido_da_fonte: linhaPredicado,
    artefacto_p73: { caminho: CAM_P73, grade: { inicio_min: grade && grade.inicio_min, fim_max: grade && grade.fim_max } },
  },
  declaracoes: { dias: parsedDias.length, metas: parsedMetas, turno: parsedTurno[0] || null, deletes: parsedDel, estrutura: { candidata: estCand, reversao: estRev } },
  re_derivacao: { conflitos, contagens_por_status: Object.fromEntries(['no_school', 'school_day', 'recess', 'holiday', 'recovery'].map((s) => [s, parsedDias.filter((l) => l.status === s).length])) },
  catalogo_vivo: { censo, anos: { dias: anosDias.anos, metas: anosMetas.anos, turnos: anosTurnos.anos }, colunas: colunasVivas.length, restricoes: restricoesVivas.length, rpc: rpcVivas },
  o_que_este_verde_nao_autoriza: 'nada: e leitura. Aplicar a candidata, reverter, publicar seja o que for, escrever no banco e git push continuam a pedir cada um a sua frase literal.',
  o_que_este_verde_nao_prova: MODO === 'candidata'
    ? 'que a semente esta aplicada — este modo pressupoe o contrario: prova que as mesas estao vazias, que os ficheiros sao os bytes do gerador e que a derivacao independente reproduz as 365 linhas. '
    : 'que a reversao basta — este modo prova que as linhas presentes batem com as da candidata antes de a autorizar. '
    + 'Nao prova o efeito na portaria (gateReady, sabados letivos fora do turno [1..5]), nem que a funcao A1 funciona — A1 nao existe no catalogo.',
  portoes: { total: portoes.length, falhas, lista: portoes },
  veredito,
};
writeFileSync(OUT, JSON.stringify(resultado, null, 2) + '\n');
console.log(veredito);
portoes.forEach((g) => console.log('  portao ' + g.nome + ': ' + (g.verde ? 'VERDE' : 'VERMELHO obtido=' + JSON.stringify(g.obtido) + ' esperado=' + JSON.stringify(g.esperado))));
if (falhas > 0) {
  const vermelho = OUT.replace('.json', '-VERMELHO.json');
  writeFileSync(vermelho, JSON.stringify(resultado, null, 2) + '\n');
  console.error('VERMELHO: registo em ' + OUT + ' e copia em ' + vermelho);
  process.exit(1);
}
console.log('guardado em ' + OUT);
