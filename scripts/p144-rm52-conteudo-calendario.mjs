#!/usr/bin/env node
// p144 — Gera a candidata e a reversao do CONTEUDO da RM-5.2 (calendario letivo 2026 + metas mensais +
// turno), composta estritamente do CALENDARIO LETIVO 2026 oficial de Limoeiro de Anadia/AL (as quatro
// imagens de 23/11 e as respostas do dono, registadas na sessao em g-p151-d1-extracao.txt) e dos
// horarios ja medidos da grade servida (p73: inicio_min 07:00:00, fim_max 11:30:00, dias seg-sex).
//
// O que e semeado (as tres mesas estao hoje a 0/0/0, medido pelo p73 e re-medido no preflight):
//   bfr_school_calendar_days           365 datas de 2026, source_status fica 'draft' (omissao da coluna)
//                                      — NENHUMA confirmacao e fingida: confirmed_by/confirmed_at nascem
//                                      NULL; confirmar e o ato administrativo da funcao A1 (ausente).
//   bfr_school_calendar_month_targets  12 linhas com os rotulos mensais «DIAS LETIVOS» do documento
//                                      (incluem os 8 sabados letivos; soma 204 = declarado).
//   bfr_school_shift_settings          1 linha (matutino) com horas medidas da grade (07:00/07:00/11:30)
//                                      e active_weekdays [1..5]; confirmed_at NULL. O turno vespertino
//                                      NAO tem horas medidas em lado nenhum e nao se inventa: fica por
//                                      semear (turnos_sem_horas_medidas), decisao do dono.
//
// Regras de status por dia (precedencia): feriado > carnaval > recesso de julho > recuperacao >
// sabado letivo > fora do periodo > fim-de-semana > dia letivo. Consequencia medida e registada:
// nos sabados letivos o calendario diz school_day mas o turno nao cobre sabado ([1..5]) — o portao
// da portaria continua fechado nesses dias; alargar o turno e decisao do dono.
//
// Uso: node scripts/p144-rm52-conteudo-calendario.mjs   (gera e mede; P144_SUF distingue corridas)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(AQUI);
const EU = readFileSync(fileURLToPath(import.meta.url));
const md5 = (b) => createHash('md5').update(b).digest('hex');
const SUF = process.env.P144_SUF ? '-' + process.env.P144_SUF : '-23-11';
const FICHEIRO = join(REPO, 'evidence', 'p144-rm52-conteudo-registo-do-gerador' + SUF + '.json');
if (existsSync(FICHEIRO)) {
  console.error('ABORTA: ja existe ' + FICHEIRO + ' — passe P144_SUF novo em vez de sobrescrever uma medição.');
  process.exit(2);
}
const CAM_CAND = join(REPO, 'scripts', 'p144-rm52-conteudo-ddl-candidata.sql');
const CAM_REV = join(REPO, 'scripts', 'p144-rm52-conteudo-ddl-reversao.sql');
if (existsSync(CAM_CAND) || existsSync(CAM_REV)) {
  console.error('ABORTA: ' + CAM_CAND + ' ou ' + CAM_REV + ' ja existe — as pecas geradas nao se sobrescrevem.');
  process.exit(2);
}
const t0 = Date.now();

// CONST-INICIO (o preflight extrai este bloco e compila-o em vm — nao mover as marcas)
const CONST = {
  ano: 2026,
  inicio: '2026-02-09',
  fim: '2026-12-18',
  carnaval: ['2026-02-16', '2026-02-17', '2026-02-18'],
  recesso_julho: { de: '2026-07-06', ate: '2026-07-17' },
  recuperacao: ['2026-12-21', '2026-12-22', '2026-12-23'],
  sabados_letivos: ['2026-03-14', '2026-04-11', '2026-05-16', '2026-06-13', '2026-08-15', '2026-09-12', '2026-10-10', '2026-11-14'],
  feriados: [
    ['2026-04-02', 'Nao letivo (sem nome no documento)'],
    ['2026-04-03', 'Sexta Santa'],
    ['2026-04-21', 'Tiradentes'],
    ['2026-05-01', 'Feriado nacional'],
    ['2026-05-31', 'Feriado municipal'],
    ['2026-06-04', 'Corpus Christi'],
    ['2026-06-24', 'Feriado municipal'],
    ['2026-06-29', 'Feriado municipal'],
    ['2026-09-07', 'Feriado nacional'],
    ['2026-09-16', 'Feriado estadual'],
    ['2026-10-12', 'N. S. Aparecida'],
    ['2026-10-15', 'Professor'],
    ['2026-10-28', 'Dia do Servidor Publico'],
    ['2026-11-02', 'Finados'],
    ['2026-11-20', 'Consciencia Negra'],
    ['2026-11-30', 'Dia do Evangelico'],
    ['2026-12-08', 'N. S. da Conceicao'],
    ['2026-12-25', 'Natal'],
  ],
  metas_mensais: [0, 12, 23, 20, 21, 20, 13, 22, 21, 20, 19, 13],
  turno: { shift: 'matutino', entry_opens_at: '07:00:00', class_starts_at: '07:00:00', shift_closes_at: '11:30:00', active_weekdays: [1, 2, 3, 4, 5], late_grace_minutes: 0 },
  turnos_sem_horas_medidas: ['vespertino'],
};
// CONST-FIM

// ---- derivacao dos 365 dias --------------------------------------------------------------------------
const dsc = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return { y: +m[1], mo: +m[2], da: +m[3] }; };
const key = (y, mo, da) => y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
const diasDoAno = (ano) => {
  const bis = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const N = bis ? 366 : 365;
  const out = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(Date.UTC(ano, 0, 1 + i));
    out.push({ key: key(ano, d.getUTCMonth() + 1, d.getUTCDate()), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), dow: d.getUTCDay(), y: ano });
  }
  return out;
};
const dentro = (d, de, ate) => d >= de && d <= ate;
const dias = diasDoAno(CONST.ano);
const feriadosMap = new Map(CONST.feriados.map(([d, l]) => [d, l]));
const sabadosSet = new Set(CONST.sabados_letivos);
const carnavalSet = new Set(CONST.carnaval);
const recuperacaoSet = new Set(CONST.recuperacao);
const recessoSet = new Set();
for (const d of dias) {
  if (dentro(d.key, CONST.recesso_julho.de, CONST.recesso_julho.ate) && d.dow >= 1 && d.dow <= 5) recessoSet.add(d.key);
}
const linhas = dias.map((d) => {
  let status = null; let label = '';
  if (feriadosMap.has(d.key)) { status = 'holiday'; label = feriadosMap.get(d.key); }
  else if (carnavalSet.has(d.key)) { status = 'recess'; label = 'Carnaval'; }
  else if (recessoSet.has(d.key)) { status = 'recess'; label = 'Recesso escolar'; }
  else if (recuperacaoSet.has(d.key)) { status = 'recovery'; label = 'Recuperacao final'; }
  else if (sabadosSet.has(d.key)) { status = 'school_day'; label = 'Sabado letivo'; }
  else if (!dentro(d.key, CONST.inicio, CONST.fim)) { status = 'no_school'; label = ''; }
  else if (d.dow === 0 || d.dow === 6) { status = 'no_school'; label = ''; }
  else { status = 'school_day'; label = ''; }
  return { data: d.key, mes: d.mes, dow: d.dow, status, label };
});
const metas = CONST.metas_mensais.map((m, i) => ({ mes: i + 1, esperado: m }));
const turno = CONST.turno;

// ---- reguas de forma e de conteudo -------------------------------------------------------------------
const isoSemana = (d) => { const { y, mo, da } = dsc(d); return new Date(Date.UTC(y, mo - 1, da)).getUTCDay(); };
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const portoes = [];
const gate = (nome, obtido, esperado, detalhe) => {
  portoes.push({ nome, verde: JSON.stringify(obtido) === JSON.stringify(esperado), obtido, esperado, detalhe });
};
const contaStatus = () => linhas.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
const porMes = () => {
  const m = Array(13).fill(0);
  for (const l of linhas) if (l.status === 'school_day') m[l.mes]++;
  return m.slice(1);
};
const cnt = contaStatus();
const mensais = porMes();
gate('o_ano_tem_365_datas_distintas_e_todas_dentro_de_2026',
  [linhas.length, new Set(linhas.map((l) => l.data)).size, linhas.filter((l) => !l.data.startsWith('2026-')).length],
  [365, 365, 0], {});
gate('as_contagens_por_status_sao_exactamente_as_derivadas',
  [cnt.school_day, cnt.holiday, cnt.recess, cnt.recovery, cnt.no_school],
  [204, 18, 13, 3, 127],
  { contagens: cnt, nota: '204 = 196 uteis (225 - 16 feriados em dia util - 3 carnaval - 10 recesso) + 8 sabados letivos; feriados 18 = 16 em dia util + 31/05 domingo + 25/12 fora do periodo; recess 13 = 3 carnaval + 10 julho' });
gate('as_metas_mensais_do_documento_batem_com_a_derivacao_mes_a_mes',
  mensais, CONST.metas_mensais,
  { mensais, nota: 'os rotulos «DIAS LETIVOS» do documento incluem os sabados letivos e somam 204' });
gate('a_soma_das_metas_mensais_e_o_declarado_do_documento',
  [CONST.metas_mensais.reduce((a, b) => a + b, 0), metas.length],
  [204, 12], {});
gate('os_8_sabados_letivos_sao_todos_sabado_e_estao_dentro_do_periodo',
  [CONST.sabados_letivos.length,
   CONST.sabados_letivos.every((d) => isoSemana(d) === 6),
   CONST.sabados_letivos.every((d) => dentro(d, CONST.inicio, CONST.fim)),
   CONST.sabados_letivos.every((d) => linhas.find((l) => l.data === d).status === 'school_day')],
  [8, true, true, true], {});
gate('os_feriados_em_dia_util_sao_16_e_todos_caem_de_segunda_a_sexta',
  [CONST.feriados.filter(([d]) => dentro(d, CONST.inicio, CONST.fim) && isoSemana(d) >= 1 && isoSemana(d) <= 5).length,
   CONST.feriados.filter(([d]) => dentro(d, CONST.inicio, CONST.fim) && isoSemana(d) >= 1 && isoSemana(d) <= 5).map(([d]) => d),
   CONST.feriados.filter(([d]) => !dentro(d, CONST.inicio, CONST.fim) || isoSemana(d) === 0 || isoSemana(d) === 6).map(([d]) => d)],
  [16,
   ['2026-04-02', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04', '2026-06-24', '2026-06-29', '2026-09-07', '2026-09-16', '2026-10-12', '2026-10-15', '2026-10-28', '2026-11-02', '2026-11-20', '2026-11-30', '2026-12-08'],
   ['2026-05-31', '2026-12-25']],
  { nota: '31/05 e domingo e 25/12 esta fora do periodo: nao consomem dia util mas ficam rotulados de feriado por fidelidade ao documento' });
gate('o_carnaval_sao_3_dias_uteis_e_a_recuperacao_3_dias_uteis_apos_o_periodo',
  [CONST.carnaval.map(isoSemana), CONST.carnaval.every((d) => dentro(d, CONST.inicio, CONST.fim)),
   CONST.recuperacao.map(isoSemana), CONST.recuperacao.every((d) => !dentro(d, CONST.inicio, CONST.fim))],
  [[1, 2, 3], true, [1, 2, 3], true], {});
gate('o_recesso_de_julho_sao_exactamente_10_dias_uteis_entre_06_e_17',
  [recessoSet.size, [...recessoSet].every((d) => isoSemana(d) >= 1 && isoSemana(d) <= 5),
   [...recessoSet].filter((d) => !dentro(d, CONST.recesso_julho.de, CONST.recesso_julho.ate)).length,
   linhas.filter((l) => l.status === 'recess' && l.label === 'Recesso escolar').length],
  [10, true, 0, 10], {});
gate('todas_as_datas_dos_rotulos_respeitam_a_forma_e_os_rotulos_o_tecto_de_160',
  [CONST.feriados.every(([d]) => RE_DATA.test(d)),
   [...sabadosSet, ...carnavalSet, ...recuperacaoSet, CONST.inicio, CONST.fim, CONST.recesso_julho.de, CONST.recesso_julho.ate].every((d) => RE_DATA.test(d)),
   linhas.every((l) => l.label.length <= 160),
   linhas.filter((l) => l.label.includes("'")).length],
  [true, true, true, 0], { nota: 'sem apostrofo em rotulo nenhum: o escape de aspa simples do gerador nunca e exercitado' });
gate('o_turno_respeita_a_janela_do_CHECK_e_os_weekdays_sao_de_segunda_a_sexta',
  [turno.class_starts_at >= turno.entry_opens_at, turno.class_starts_at <= turno.shift_closes_at,
   turno.active_weekdays.length >= 1 && turno.active_weekdays.length <= 7,
   turno.active_weekdays.slice().sort().join(',') === '1,2,3,4,5',
   turno.late_grace_minutes >= 0 && turno.late_grace_minutes <= 240,
   CONST.turnos_sem_horas_medidas.length],
  [true, true, true, true, true, 1],
  { turno, nota: 'horas lidas da grade medida (p73 grade_tempos: inicio_min 07:00:00, fim_max 11:30:00); vespertino sem horas medidas fica por semear' });
gate('as_horas_do_turno_sao_as_da_grade_medida_do_p73', (() => {
  const F = join(REPO, 'evidence', 'p73-rm52-estado-calendario-20-11.json');
  if (!existsSync(F)) return ['falta_registo', '', ''];
  const reg = JSON.parse(readFileSync(F, 'utf8'));
  const gt = reg.catalogo && reg.catalogo.grade_tempos && reg.catalogo.grade_tempos[0];
  return [turno.entry_opens_at, turno.class_starts_at, turno.shift_closes_at].join(' ') ===
         [gt && gt.inicio_min, gt && gt.inicio_min, gt && gt.fim_max].join(' ');
})(), true,
  { nota: '07:00 e 11:30 leem-se do artefacto do p73 (grade_tempos.inicio_min/fim_max), nunca da memoria' });

// ---- geracao dos ficheiros ----------------------------------------------------------------------------
const tEm = new Date().toISOString();
const literal = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const linhasSql = linhas.map((l) =>
  'INSERT INTO public.bfr_school_calendar_days (school_year, school_date, calendar_status, label) VALUES (' +
  CONST.ano + ', ' + literal(l.data) + ', ' + literal(l.status) + ', ' + literal(l.label) + ');');
const metasSql = metas.map((m) =>
  'INSERT INTO public.bfr_school_calendar_month_targets (school_year, month, expected_school_days) VALUES (' +
  CONST.ano + ', ' + m.mes + ', ' + m.esperado + ');');
const turnoSql = 'INSERT INTO public.bfr_school_shift_settings (school_year, shift, entry_opens_at, class_starts_at, shift_closes_at, active_weekdays, late_grace_minutes) VALUES (' +
  CONST.ano + ', ' + literal(turno.shift) + ', ' + literal(turno.entry_opens_at) + ', ' + literal(turno.class_starts_at) + ', ' +
  literal(turno.shift_closes_at) + ', ARRAY[' + turno.active_weekdays.join(',') + '], ' + turno.late_grace_minutes + ');';
const cabecalho = (verbo) => `-- P144 ${verbo === 'candidata' ? 'candidata' : 'reversao'} — ${verbo === 'candidata'
  ? 'semeia o conteudo do calendario letivo 2026 da RM-5.2: 365 datas (204 school_day, 18 holiday, 13 recess, 3 recovery, 127 no_school), 12 metas mensais do documento (soma 204) e 1 turno (matutino, horas da grade medida).'
  : 'apaga exactamente o que a candidata semeou: as linhas de 2026 das tres mesas.'}
-- GERADA por scripts/p144-rm52-conteudo-calendario.mjs a partir do CALENDARIO LETIVO 2026 oficial
-- (quatro imagens de 23/11 + respostas do dono, registadas em g-p151-d1-extracao.txt) e da grade medida
-- (p73 grade_tempos); NAO EDITAR A MAO. Geracao em ${tEm}.
-- NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR. ${verbo === 'candidata'
  ? 'A semente nao finge confirmacao: source_status fica no default \'draft\' e confirmed_by/confirmed_at nascem NULL — confirmar e o ato da funcao A1 (ausente). O turno vespertino nao tem horas medidas e nao se semeia. Nos sabados letivos o calendario diz school_day mas o turno ([1..5]) nao cobre sabado: o portao da portaria continua fechado nesses dias.'
  : 'A reversao apaga o ano 2026 inteiro das tres mesas; o preflight em modo reversao mede que as linhas presentes batem com as da candidata antes de a autorizar.'}
-- Forma de execucao: uma so transaccao, com as duas marcas nos bytes crus (/^BEGIN;/m e /^COMMIT;/m).
-- A candidata so insere; a reversao so apaga. Meia peca aplicada deixa o ano incompleto, e e isso que a
-- transaccao impede. Nada de DDL, policies, funcoes ou grants: este pacote e so conteudo.
`;
const corpoCand = linhasSql.join('\n') + '\n\n' + metasSql.join('\n') + '\n\n' + turnoSql;
const corpoRev = [
  'DELETE FROM public.bfr_school_calendar_days WHERE school_year = ' + CONST.ano + ';',
  'DELETE FROM public.bfr_school_calendar_month_targets WHERE school_year = ' + CONST.ano + ';',
  'DELETE FROM public.bfr_school_shift_settings WHERE school_year = ' + CONST.ano + ';',
].join('\n');
const txtCand = cabecalho('candidata') + '\nBEGIN;\nSET LOCAL statement_timeout = \'120s\';\nSET LOCAL lock_timeout = \'10s\';\n\n' + corpoCand + '\n\nCOMMIT;\n';
const txtRev = cabecalho('reversao') + '\nBEGIN;\nSET LOCAL statement_timeout = \'120s\';\nSET LOCAL lock_timeout = \'10s\';\n\n' + corpoRev + '\n\nCOMMIT;\n';
writeFileSync(CAM_CAND, txtCand, 'utf8');
writeFileSync(CAM_REV, txtRev, 'utf8');

// ---- reguas sobre o que acabei de escrever -------------------------------------------------------------
const soCodigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n');
const conta = (re, t) => (t.match(re) || []).length;
const estruturaDe = (t) => { const s = soCodigo(t); return {
  begin: conta(/^BEGIN;/gm, s), commit: conta(/^COMMIT;/gm, s),
  insert_dias: conta(/^INSERT INTO public\.bfr_school_calendar_days /gim, s),
  insert_metas: conta(/^INSERT INTO public\.bfr_school_calendar_month_targets /gim, s),
  insert_turno: conta(/^INSERT INTO public\.bfr_school_shift_settings /gim, s),
  deletes: conta(/^DELETE FROM /gim, s),
  fora: conta(/^\s*(UPDATE|DROP|ALTER|CREATE|TRUNCATE|COPY|GRANT|REVOKE|SELECT)\b/gim, s),
}; };
const estCand = estruturaDe(txtCand);
const estRev = estruturaDe(txtRev);
const RE_INS_DIA = /^INSERT INTO public\.bfr_school_calendar_days \(school_year, school_date, calendar_status, label\) VALUES \((\d+), '(\d{4}-\d{2}-\d{2})', '([a-z_]+)', '([^']*)'\);/gim;
const RE_INS_META = /^INSERT INTO public\.bfr_school_calendar_month_targets \(school_year, month, expected_school_days\) VALUES \((\d+), (\d+), (\d+)\);/gim;
const lidosDias = [...soCodigo(txtCand).matchAll(RE_INS_DIA)].map((m) => ({ ano: +m[1], data: m[2], status: m[3], label: m[4] }));
const lidosMetas = [...soCodigo(txtCand).matchAll(RE_INS_META)].map((m) => ({ ano: +m[1], mes: +m[2], esperado: +m[3] }));
const RE_DEL = /^DELETE FROM public\.(bfr_school_calendar_days|bfr_school_calendar_month_targets|bfr_school_shift_settings) WHERE school_year = (\d+);/gim;
const lidosDel = [...soCodigo(txtRev).matchAll(RE_DEL)].map((m) => ({ tabela: m[1], ano: +m[2] }));

gate('a_candidata_tem_uma_transaccao_com_378_inserts_e_nada_fora_de_inserts',
  [estCand.begin, estCand.commit, estCand.insert_dias, estCand.insert_metas, estCand.insert_turno, estCand.deletes, estCand.fora],
  [1, 1, 365, 12, 1, 0, 0], { estCand });
gate('a_reversao_tem_uma_transaccao_com_3_deletes_do_mesmo_ano_e_nada_fora_de_deletes',
  [estRev.begin, estRev.commit, estRev.insert_dias, estRev.insert_metas, estRev.insert_turno, estRev.deletes, estRev.fora],
  [1, 1, 0, 0, 0, 3, 0], { estRev });
gate('o_parser_rele_as_365_datas_e_devolve_exactamente_o_derivado',
  [lidosDias.length, lidosDias.every((l) => l.ano === CONST.ano),
   JSON.stringify(lidosDias.map((l) => [l.data, l.status, l.label])),
   lidosDias.filter((l) => !RE_DATA.test(l.data)).length],
  [365, true,
   JSON.stringify(linhas.map((l) => [l.data, l.status, l.label])), 0],
  { nota: 'o parser e o mesmo que o preflight usa' });
gate('o_parser_rele_as_12_metas_e_devolve_exactamente_o_derivado',
  [lidosMetas.length, JSON.stringify(lidosMetas.map((m) => [m.ano, m.mes, m.esperado]))],
  [12, JSON.stringify(metas.map((m) => [CONST.ano, m.mes, m.esperado]))], {});
gate('a_reversao_apaga_exactamente_as_tres_mesas_do_mesmo_ano',
  [JSON.stringify(lidosDel.map((d) => [d.tabela, d.ano]))],
  [JSON.stringify([
    ['bfr_school_calendar_days', CONST.ano],
    ['bfr_school_calendar_month_targets', CONST.ano],
    ['bfr_school_shift_settings', CONST.ano],
  ])], {});
gate('o_aviso_de_nao_aplicar_esta_nas_duas_pecas',
  [txtCand.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR'), txtRev.includes('NÃO APLICAR SEM FRASE LITERAL DO UTILIZADOR')],
  [true, true], {});

// ---- fixtures ------------------------------------------------------------------------------------------
const FIX_WEEK = [['2026-03-14', 6], ['2026-02-09', 1], ['2026-12-31', 4], ['2026-01-01', 4]];
const FIX_DENTRO = [['2026-02-08', false], ['2026-02-09', true], ['2026-12-18', true], ['2026-12-19', false]];
gate('a_derivadora_de_dia_de_semana_tem_fixture_nos_dois_sentidos',
  FIX_WEEK.map(([d]) => isoSemana(d)), FIX_WEEK.map((e) => e[1]), { FIX_WEEK, nota: '2026-01-01 e quinta (dow 4)' });
gate('a_predicada_dentro_do_periodo_tem_fixture_nos_dois_sentidos',
  FIX_DENTRO.map(([d]) => dentro(d, CONST.inicio, CONST.fim)), FIX_DENTRO.map((e) => e[1]), { FIX_DENTRO });

// ---- registo -------------------------------------------------------------------------------------------
const verdes = portoes.filter((g) => g.verde).length;
const falhas = portoes.length - verdes;
const veredito = 'P144_RM52_CONTEUDO_GERADO ' + verdes + '/' + falhas
  + ' · dias ' + linhasSql.length
  + ' · metas ' + metasSql.length
  + ' · turnos ' + 1
  + ' · status ' + Object.entries(cnt).map(([k, v]) => k + '=' + v).join('/')
  + ' · soma_metas ' + CONST.metas_mensais.reduce((a, b) => a + b, 0)
  + ' · ' + (Date.now() - t0) + ' ms';
const resultado = {
  peca: 'scripts/p144-rm52-conteudo-calendario.mjs',
  em: tEm,
  duracao_ms: Date.now() - t0,
  emissor_bytes: EU.length,
  emissor_md5: md5(EU),
  pergunta: 'qual e a semente de conteudo da RM-5.2 que reproduz exactamente o CALENDARIO LETIVO 2026 oficial (204 dias letivos declarados, rotulos mensais, feriados, recessos, sabados letivos, etapas e recuperacao) e o turno com as horas ja medidas da grade — sem fingir confirmacao e sem inventar o turno vespertino?',
  metodo: 'as 365 datas derivam-se por getUTCDay de 2026; os status saem das regras de precedencia sobre as constantes do documento (feriados, carnaval, recesso 06-17/07, recuperacao 21-23/12, 8 sabados letivos, periodo 09/02-18/12); as metas mensais sao os rotulos «DIAS LETIVOS» do documento e a sua soma (204) e conferida contra a derivacao mes a mes; o turno usa inicio_min/fim_max da grade medida no artefacto do p73; zero escrita no banco e zero chamada de rede.',
  constantes: CONST,
  derivado: {
    contagens_por_status: cnt,
    mensais_derivados: mensais,
    soma_metas: CONST.metas_mensais.reduce((a, b) => a + b, 0),
    recesso_julho_uteis: [...recessoSet].sort(),
    feriados_em_dia_util: CONST.feriados.filter(([d]) => dentro(d, CONST.inicio, CONST.fim) && isoSemana(d) >= 1 && isoSemana(d) <= 5).map(([d]) => d),
    fora_do_efeito: CONST.feriados.filter(([d]) => !dentro(d, CONST.inicio, CONST.fim) || isoSemana(d) === 0 || isoSemana(d) === 6).map(([d]) => d),
  },
  ficheiros_gerados: {
    candidata: { caminho: 'scripts/p144-rm52-conteudo-ddl-candidata.sql', bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(Buffer.from(txtCand, 'utf8')) },
    reversao: { caminho: 'scripts/p144-rm52-conteudo-ddl-reversao.sql', bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(Buffer.from(txtRev, 'utf8')) },
    estrutura: { candidata: estCand, reversao: estRev },
  },
  fixtures: { semana: FIX_WEEK, dentro: FIX_DENTRO },
  decisoes_registadas: {
    carnaval_e_recesso: 'os 3 dias de Carnaval (16-18/02) levam o status recess com o rotulo Carnaval: o documento marca-os sem categoria legivel e recesso de Carnaval e a categoria escolar que nao inventa um feriado que o documento nao declara.',
    confirmacao: 'nenhuma linha nasce confirmada (source_status fica draft por omissao; confirmed_by/confirmed_at NULL em dias e turno) — confirmar e o ato administrativo da funcao A1, ausente; corrige-se aqui a linha de §6 do plano que pedia confirmed_at nao nulo na semente.',
    vespertino: 'o turno vespertino nao tem horas medidas em nenhuma fonte e nao se semeia (turnos_sem_horas_medidas); as horas do matutino sao as da grade medida (07:00/07:00/11:30).',
    sabados_letivos: 'sao school_day no calendario, mas o turno cobre [1..5]: nesses 8 dias o portao da portaria continua fechado (schoolDayConfirmed sem activeSchoolShift) — alargar o turno a sabado e decisao do dono.',
    metas_mensais: 'as metas sao os rotulos mensais do documento, que incluem os 8 sabados letivos (soma 204); substitui-se por esta decisao a linha de §3 do plano que usava o regime seg-sex 261.',
    feriados_fora_do_efeito: '31/05 (domingo) e 25/12 (fora do periodo) ficam rotulados holiday por fidelidade ao documento, sem consumir dia util.',
  },
  o_que_prova: 'que a semente reproduz o documento oficial: 365 datas unicas de 2026, contagens por status exactas, metas mensais iguais aos rotulos lidos e soma 204 = declarado, sabados letivos todos ao sabado, recesso de julho com 10 uteis, e o turno com horas da grade medida e janela do CHECK respeitada.',
  o_que_NAO_prova: 'nada sobre o ar, o produto ou a base: e geracao local. NAO APLICA nada — aplicar, reverter e publicar pedem cada um a sua frase literal. Nao cria a funcao de confirmacao (A1) nem muda policies: com so esta semente o portao da portaria continua fechado (faltam source_status confirmed e confirmed_at, que sao o ato de A1).',
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
