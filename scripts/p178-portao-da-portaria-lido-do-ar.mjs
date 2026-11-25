// O que a Portaria ve, avaliado pelo predicado do proprio ar — nao por mim re-dactilografado.
// Pergunta: por que «Nenhum turno ativo agora» as 15:19 de uma quarta-feira com aula a decorrer?
// Le (1) o registo de pos-deploy que pinou o alvo, (2) o shell servido, (3) as linhas vivas de turnos e
// do calendario, (4) as funcoes schoolClock/activeSchoolShift e o mapa weekdays EXTRAIDOS dos bytes do ar,
// corridos em vm contra relogio fixo. As etiquetas de veredicto tem positiva em cada classe (--selfteste).
// SO LEITURA: nenhum INSERT/UPDATE/DDL/grant. PAT lido de ficheiro proprio, nunca impresso.
// Uso: P178_SUF=<sufixo> node scripts/p178-portao-da-portaria-lido-do-ar.mjs [--selfteste]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const REF = 'yyzqoxlkcvqpessypfjo';
const SUF = process.env.P178_SUF;
const SELFTESTE = process.argv.includes('--selfteste');
if (!SUF) throw new Error('ABORTA: P178_SUF e obrigatorio — cada corrida precisa de nome proprio');
const OUT = join(REPO, 'evidence', 'p178-portao-da-portaria' + (SELFTESTE ? '-selfteste' : '') + '-' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe — use outro P178_SUF');
const EMISSOR = fileURLToPath(import.meta.url);
const emissorTxt = readFileSync(EMISSOR, 'utf8');
const pegada = (t) => ({ bytes: Buffer.byteLength(t, 'utf8'), md5: createHash('md5').update(t).digest('hex') });

// ---- extracao: as constantes do produtor leem-se dos bytes, nunca da memoria ---------------------------
// `function schoolClock(` ocorre 2 vezes no shell: a do runtime central e a do bloco da Portaria. A que
// `activeSchoolShift` chama e a mais proxima ANTES dela (mesmo IIFE), nao a primeira do ficheiro — por isso
// ancora-se no anchor. A 1.ª versao desta peca apanhou a primeira e o vm rebateu em ReferenceError de
// `schoolTimeZone`: foi o instrumento a falar, nao o ar.
const ocorrenciasDe = (html, nome) => {
  const agulha = 'function ' + nome + '(';
  const pos = [];
  for (let i = html.indexOf(agulha); i >= 0; i = html.indexOf(agulha, i + 1)) pos.push(i);
  return pos;
};
const linhaDe = (html, idx) => html.slice(0, idx).split('\n').length;
const corpoAte = (html, inicio) => {
  const abre = html.indexOf('{', inicio);
  let fundo = -1, nivel = 0;
  for (let i = abre; i < html.length; i++) {
    const c = html[i];
    if (c === '{') nivel++;
    else if (c === '}') { nivel--; if (nivel === 0) { fundo = i; break; } }
  }
  if (fundo < 0) throw new Error('ABORTA: corpo aberto em ' + inicio + ' nao fecha');
  return html.slice(inicio, fundo + 1);
};
const mapaDeDias = (html) => {
  const m = /const weekdays=\{([^}]*)\}/.exec(html);
  if (!m) throw new Error('ABORTA: o mapa weekdays nao se leu dos bytes servidos');
  const mapa = {};
  for (const par of m[1].split(',')) {
    const [k, v] = par.split(':');
    if (k && v) mapa[k.trim()] = Number(v.trim());
  }
  if (Object.keys(mapa).length !== 7) throw new Error('ABORTA: weekdays lido com ' + Object.keys(mapa).length + ' chaves, esperado 7');
  return mapa;
};

const gradeDoAr = (html, turno) => {
  const ini = html.indexOf('schedule.periods.' + turno + ' = {');
  if (ini < 0) throw new Error('ABORTA: a grade «' + turno + '» nao esta nos bytes servidos');
  const corpo = corpoAte(html, ini + 'schedule.periods.'.length).replace(/^\w+\s*=\s*/, '');
  const dias = vm.runInContext('(' + corpo + ')', vm.createContext({}));
  const minutos = (hhmm) => Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5));
  const porDia = {};
  const aberturas = [], fechamentos = [];
  for (const [dia, aulas] of Object.entries(dias)) {
    if (!Array.isArray(aulas) || !aulas.length) continue;
    porDia[dia] = { aulas: aulas.length, abre: aulas[0][0], fecha: aulas[aulas.length - 1][1] };
    aberturas.push(minutos(aulas[0][0]));
    fechamentos.push(minutos(aulas[aulas.length - 1][1]));
  }
  if (!aberturas.length) throw new Error('ABORTA: a grade «' + turno + '» nao tem nenhum dia com aulas');
  return { dias: porDia, envelope: { mais_cedo: aberturas.sort((a, b) => a - b)[0], mais_tarde: fechamentos.sort((a, b) => b - a)[0] } };
};

// ---- cruzamento: os dias publicados no shell contra os active_weekdays da linha do banco ------------------
// A mesa vive na peca porque a prosa do ledger alegava, desde 24/11, que o sabado nao aparecia na grade
// medida. Quem conta os dias da grade e o envelope desta extraccao, por isso o numero passou a ser impresso.
// A ponte PT→numero nao e minha: os bytes tem duas mesas — `weekdays` (ingles, 1..7) e a mesa por indice de
// `getDay()` (ingles + portugues, domingo a 0). O numero ISO de cada nome portugues e o numero do nome
// ingles que partilha com ele o valor na segunda mesa. Nada aqui conta nem desloca indices.
let BRIDGE = null;
const constroiPonteDeDias = (html) => {
  const vistas = [...html.matchAll(/return \(\{([^}]*)\}\[key\] \?\? null\)/g)].map((m) => m[1]);
  if (!vistas.length) throw new Error('ABORTA: nenhuma mesa de dias por indice de getDay() nos bytes servidos');
  const distintas = [...new Set(vistas)];
  if (distintas.length !== 1) throw new Error('ABORTA: ' + vistas.length + ' mesas de getDay do shell dao ' + distintas.length + ' textos diferentes — a ponte nao e univoca');
  const js = {};
  for (const par of distintas[0].split(',')) { const [k, v] = par.split(':'); if (k && v) js[k.trim()] = Number(v.trim()); }
  const ponte = {};
  for (const nome of Object.keys(js)) {
    const ingles = Object.keys(DIAS).find((e) => js[e.toLowerCase()] === js[nome]);
    if (!ingles) throw new Error('ABORTA: o dia «' + nome + '» da mesa getDay nao tem par no mapa weekdays lido dos bytes');
    ponte[nome] = DIAS[ingles];
  }
  for (const preciso of ['sabado', 'domingo']) if (!(preciso in ponte)) throw new Error('ABORTA: a ponte nao resolve «' + preciso + '»');
  BRIDGE = ponte;
  return { mesas_getday_lidas: vistas.length, mesas_distintas: distintas.length, nomes_resolvidos: Object.keys(ponte).length, ponte, iso_do_mapa_weekdays: DIAS };
};
const diasNumeros = (nomes) => nomes.map((n) => {
  if (!BRIDGE) throw new Error('ABORTA: a ponte de dias nao foi construida antes de contar');
  if (!(n in BRIDGE)) throw new Error('ABORTA: o dia «' + n + '» da grade nao esta na mesa de dias lida dos bytes');
  return BRIDGE[n];
}).sort((x, y) => x - y);

const cruzamentoGradeComLinha = (grade, linhas) => {
  const sem = (a, b) => a.filter((x) => b.indexOf(x) < 0);
  const por_turno = Object.keys(grade).map((turno) => {
    const nomes = Object.keys(grade[turno].dias);
    const numsGrade = diasNumeros(nomes);
    const candidates = linhas.filter((i) => i.shift === turno);
    if (candidates.length > 1) throw new Error('ABORTA: ' + candidates.length + ' linhas para o turno «' + turno + '», esperado 0 ou 1');
    const numsLinha = candidates.length ? [...(candidates[0].active_weekdays || [])].sort((x, y) => x - y) : null;
    return {
      turno,
      dias_na_grade: nomes,
      numeros_na_grade: numsGrade,
      linha_no_banco: candidates.length === 1,
      linha_confirmada: candidates.length === 1 ? !!candidates[0].confirmed_at : null,
      numeros_da_linha: numsLinha,
      so_na_grade: numsLinha ? sem(numsGrade, numsLinha) : numsGrade,
      so_na_linha: numsLinha ? sem(numsLinha, numsGrade) : [],
    };
  });
  const turnosDasLinhas = [...new Set(linhas.map((i) => i.shift))];
  return { por_turno, linhas_sem_grade_no_shell: turnosDasLinhas.filter((t) => !(t in grade)) };
};

// ---- veredicto: uma etiqueta por eixo, cada uma com positiva possivel ----------------------------------
const classifica = (correspondencias, comConfirmacao, comDia, naJanela, diaLetivo) => {
  if (!diaLetivo) return 'FECHADO_CALENDARIO_NAO_CONFIRMADO';
  if (correspondencias === 1) return 'ABERTO';
  if (correspondencias > 1) return 'FECHADO_TURNOS_SOBPOSTOS';
  if (comConfirmacao === 0) return 'FECHADO_NENHUMA_LINHA_CONFIRMADA';
  if (comDia === 0) return 'FECHADO_DIA_DA_SEMANA_FORA_DO_TURNO';
  if (naJanela === 0) return 'FECHADO_HORA_FORA_DA_JANELA_CONFIRMADA';
  return 'FECHADO_CORRESPONDENCIAS_ZERO_SEM_CLASSE_UNICA';
};

let FONTE = '';
let DIAS = null;
let PROVENIENCIA = null;
const instalaPredicadoDoAr = (html) => {
  const turnos = ocorrenciasDe(html, 'activeSchoolShift');
  if (turnos.length !== 1) throw new Error('ABORTA: «activeSchoolShift» com ' + turnos.length + ' ocorrencias, esperado 1');
  const anchor = turnos[0];
  const relogios = ocorrenciasDe(html, 'schoolClock').filter((i) => i < anchor);
  if (!relogios.length) throw new Error('ABORTA: nenhum «schoolClock» antes do anchor');
  const relogio = relogios[relogios.length - 1];
  const corpoRelogio = corpoAte(html, relogio);
  const corpoTurnos = corpoAte(html, anchor);
  if (corpoRelogio.includes('schoolTimeZone')) throw new Error('ABORTA: o relogio ancorado depende de schoolTimeZone — a ancora apanhou o bloco errado');
  FONTE = corpoRelogio + '\n' + corpoTurnos;
  DIAS = mapaDeDias(corpoTurnos);
  PROVENIENCIA = {
    ocorrencias_de_schoolClock: ocorrenciasDe(html, 'schoolClock').map((i) => linhaDe(html, i)),
    relogio_escolhido_linha: linhaDe(html, relogio),
    activeSchoolShift_linha: linhaDe(html, anchor),
    corpo_relogio: pegada(corpoRelogio),
    corpo_turnos: pegada(corpoTurnos),
  };
};

const avalia = (linhas, instante, diaLetivo) => {
  const RelogioReal = Date;
  const ms = instante.getTime();
  class RelogioFixo extends RelogioReal {
    constructor(...a) { if (a.length === 0) super(ms); else super(...a); }
    static now() { return ms; }
  }
  const ctx = vm.createContext({ Intl, Date: RelogioFixo, state: { shiftSettings: linhas } });
  vm.runInContext('var resultado; (function(){ ' + FONTE + '\nresultado = { relogio: schoolClock(), turno: activeSchoolShift() }; })();', ctx);
  const relogio = ctx.resultado.relogio;
  const numero = DIAS[relogio.weekday];
  const abre = (i) => Number(String(i.entry_opens_at).slice(0, 2)) * 60 + Number(String(i.entry_opens_at).slice(3, 5));
  const fecha = (i) => Number(String(i.shift_closes_at).slice(0, 2)) * 60 + Number(String(i.shift_closes_at).slice(3, 5));
  const comConfirmacao = linhas.filter((i) => !!i.confirmed_at).length;
  const comDia = linhas.filter((i) => (i.active_weekdays || [1, 2, 3, 4, 5]).includes(numero)).length;
  const naJanela = linhas.filter((i) => relogio.minutes >= abre(i) && relogio.minutes <= fecha(i)).length;
  const cobre = (i) => !!i.confirmed_at && (i.active_weekdays || [1, 2, 3, 4, 5]).includes(numero) && relogio.minutes >= abre(i) && relogio.minutes <= fecha(i);
  const conformes = linhas.filter(cobre);
  const correspondencias = conformes.length;
  const produtorDeuTurno = ctx.resultado.turno ? ctx.resultado.turno.shift : null;
  const esperado = correspondencias === 1 ? conformes[0].shift : null;
  return {
    minutos_locais: relogio.minutes, dia_da_semana: relogio.weekday, numero_do_dia: numero,
    linhas_de_turno: linhas.length, com_confirmacao: comConfirmacao, com_dia_da_semana: comDia, na_janela: naJanela,
    correspondencias, turno_ativo_do_ar: produtorDeuTurno, turno_esperado_pela_regua: esperado,
    bate_com_o_produtor: produtorDeuTurno === esperado,
    veredito: classifica(correspondencias, comConfirmacao, comDia, naJanela, diaLetivo),
  };
};

const saida = { peca: 'p178-portao-da-portaria-lido-do-ar.mjs', emissor: pegada(emissorTxt), em: new Date().toISOString(), selfteste: SELFTESTE };

if (SELFTESTE) {
  const htmlLocal = readFileSync(join(REPO, 'bfr-candidata-v144c-uniesco', 'index.html'), 'utf8');
  instalaPredicadoDoAr(htmlLocal);
  saida.ponte_de_dias = constroiPonteDeDias(htmlLocal);
  saida.fonte_da_extracao = { origem: 'copia_em_disco_da_candidata_v144c', caminho: 'bfr-candidata-v144c-uniesco/index.html', pegada: pegada(htmlLocal), prova: PROVENIENCIA };
  const instante = new Date('2026-11-25T18:00:00Z');
  const CONF = { confirmed_at: '2026-11-20T10:00:00Z' };
  const FIX = [
    { id: 'f1_nenhuma_linha_confirmada', diaLetivo: true, linhas: [{ shift: 'matutino', confirmed_at: null, entry_opens_at: '07:00:00', shift_closes_at: '11:30:00', active_weekdays: [1, 2, 3, 4, 5] }], espera: 'FECHADO_NENHUMA_LINHA_CONFIRMADA' },
    { id: 'f2_confirmado_fora_da_janela', diaLetivo: true, linhas: [{ shift: 'matutino', entry_opens_at: '07:00:00', shift_closes_at: '11:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }], espera: 'FECHADO_HORA_FORA_DA_JANELA_CONFIRMADA' },
    { id: 'f3_vespertino_casa', diaLetivo: true, linhas: [{ shift: 'matutino', entry_opens_at: '07:00:00', shift_closes_at: '11:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }, { shift: 'vespertino', entry_opens_at: '13:00:00', shift_closes_at: '17:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }], espera: 'ABERTO' },
    { id: 'f4_sobpostos', diaLetivo: true, linhas: [{ shift: 'vespertino', entry_opens_at: '13:00:00', shift_closes_at: '17:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }, { shift: 'extra', entry_opens_at: '15:00:00', shift_closes_at: '16:00:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }], espera: 'FECHADO_TURNOS_SOBPOSTOS' },
    { id: 'f5_so_sabado', diaLetivo: true, linhas: [{ shift: 'sabatino', entry_opens_at: '13:00:00', shift_closes_at: '17:30:00', active_weekdays: [6], ...CONF }], espera: 'FECHADO_DIA_DA_SEMANA_FORA_DO_TURNO' },
    { id: 'f6_calendario_por_confirmar', diaLetivo: false, linhas: [{ shift: 'vespertino', entry_opens_at: '13:00:00', shift_closes_at: '17:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }], espera: 'FECHADO_CALENDARIO_NAO_CONFIRMADO' },
    { id: 'f7_janela_viva_sem_confirmacao', diaLetivo: true, linhas: [{ shift: 'matutino', entry_opens_at: '07:00:00', shift_closes_at: '11:30:00', active_weekdays: [1, 2, 3, 4, 5], ...CONF }, { shift: 'vespertino', confirmed_at: null, entry_opens_at: '13:00:00', shift_closes_at: '17:30:00', active_weekdays: [1, 2, 3, 4, 5] }], espera: 'FECHADO_CORRESPONDENCIAS_ZERO_SEM_CLASSE_UNICA' },
  ];
  const vereditoCruzamento = (() => {
    const G = (nomes) => ({ dias: Object.fromEntries(nomes.map((n) => [n, {}])) });
    const L = (shift, wd, conf) => ({ shift, active_weekdays: wd, confirmed_at: conf ? 'x' : null });
    const X = [
      { id: 'x1_grade_tem_domingo_linha_nao', grade: { matutino: G(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'domingo']) }, linhas: [L('matutino', [1, 2, 3, 4, 5], true)],
        espera: (r) => r.por_turno[0].so_na_grade.join() === '7' && r.por_turno[0].so_na_linha.join() === '' },
      { id: 'x2_linha_tem_domingo_grade_nao', grade: { matutino: G(['segunda', 'terca', 'quarta', 'quinta', 'sexta']) }, linhas: [L('matutino', [1, 2, 3, 4, 5, 7], true)],
        espera: (r) => r.por_turno[0].so_na_linha.join() === '7' && r.por_turno[0].so_na_grade.join() === '' },
      { id: 'x3_turno_sem_linha_no_banco', grade: { vespertino: G(['segunda', 'terca', 'quarta', 'quinta', 'sexta']) }, linhas: [],
        espera: (r) => r.por_turno[0].linha_no_banco === false && r.por_turno[0].numeros_da_linha === null && r.por_turno[0].so_na_grade.join() === '1,2,3,4,5' },
      { id: 'x4_linha_sem_grade_no_shell', grade: { matutino: G(['segunda']) }, linhas: [L('noturno', [1], true)],
        espera: (r) => r.linhas_sem_grade_no_shell.join() === 'noturno' },
      { id: 'x5_sabado_existe_na_grade_e_nao_na_linha', grade: { matutino: G(['segunda', 'sabado']) }, linhas: [L('matutino', [1], true)], espera: (r) => r.por_turno[0].so_na_grade.join() === '6' },
      { id: 'x6_dia_fora_do_mapa_lido_dos_bytes_aborta', grade: { matutino: G(['feriado']) }, linhas: [], aborta: true },
      { id: 'x7_duas_linhas_para_o_mesmo_turno_aborta', grade: { matutino: G(['segunda']) }, linhas: [L('matutino', [1], true), L('matutino', [1], true)], aborta: true },
    ];
    return X.map((f) => {
      let obtido = null, abortou = false;
      try { obtido = f.espera(cruzamentoGradeComLinha(f.grade, f.linhas)); } catch (e) { abortou = true; obtido = e.message.slice(0, 60); }
      const bate = f.aborta ? abortou : abortou === false && obtido === true;
      return { id: f.id, espera: f.aborta ? 'aborta' : 'verdadeiro', obtido, bate };
    });
  })();
  const etiquetas = new Set();  const casos = FIX.map((f) => {
    const a = avalia(f.linhas, instante, f.diaLetivo);
    etiquetas.add(a.veredito);
    return { id: f.id, espera: f.espera, obtido: a.veredito, bate: f.espera === a.veredito, bate_o_produtor: a.bate_com_o_produtor, correspondencias: a.correspondencias };
  });
  const vermelhosX = vereditoCruzamento.filter((c) => !c.bate);
  const veredito = casos.every((c) => c.bate && c.bate_o_produtor) && etiquetas.size === FIX.length && vermelhosX.length === 0 ? 'P178_SELFTESTE_OK' : 'P178_SELFTESTE_VERMELHO';
  Object.assign(saida, { casos, etiquetas_distintas: etiquetas.size, cruzamento: vereditoCruzamento, instantaneo: '2026-11-25T18:00:00Z', veredito });
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  console.log(veredito + ' casos=' + casos.length + ' etiquetas_distintas=' + etiquetas.size + ' cruzamento=' + vereditoCruzamento.length + '/' + vermelhosX.length);
  for (const c of casos) console.log('  ' + c.id + ' espera=' + c.espera + ' obtido=' + c.obtido + ' bate=' + c.bate + ' produtor=' + c.bate_o_produtor);
  for (const c of vereditoCruzamento) console.log('  ' + c.id + ' espera=' + c.espera + ' obtido=' + JSON.stringify(c.obtido) + ' bate=' + c.bate);
  process.exit(veredito === 'P178_SELFTESTE_OK' ? 0 : 1);
}

const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const q = async (sql) => {
  const r = await fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 240));
  return JSON.parse(t);
};

// 1) proveniencia do alvo: URL e pegada do shell leem-se do registo de pos-deploy mais novo por mtime.
// O veredito do p160 tem forma `<ROTULO>_OK <passados>/<falhas>` — a 1.ª versao desta peca exigia que
// acabasse em `_OK` e por isso abortou em cima do registo bom. A guarda passa a ler as tres partes e
// exige falhas zero; `registos_lidos` fica no artefacto para a decisao se poder conferir.
const registos = readdirSync(join(REPO, 'evidence'))
  .filter((f) => /^p160-pos-deploy-.*\.json$/.test(f) && !/VERMELHO|ANTERIOR/.test(f))
  .map((f) => join(REPO, 'evidence', f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
let alvo = null;
const lidos = [];
for (const f of registos) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const b1 = Object.keys(j.portoes || {}).filter((k) => k.indexOf('B1_shell') === 0).map((k) => j.portoes[k])[0];
  const m = /^(.*_OK)\s+(\d+)\/(\d+)$/.exec(String(j.veredito || ''));
  const aptidao = { ficheiro: f.slice(REPO.length + 1), url: !!j.url, b1_shell: !!b1, medido_md5: !!(b1 && b1.medido && b1.medido.md5), veredito: j.veredito, falhas: m ? Number(m[3]) : null };
  lidos.push(aptidao);
  if (j.url && b1 && b1.medido && b1.medido.md5 && m && Number(m[3]) === 0) {
    alvo = { ficheiro: aptidao.ficheiro, url: j.url, md5: b1.medido.md5, bytes: b1.medido.bytes, veredito: j.veredito, em: j.em, rotulo_do_veredito: m[1], passadas: Number(m[2]) };
    break;
  }
}
saida.registos_lidos = lidos;
if (!alvo) throw new Error('ABORTA: nenhum registo p160-pos-deploy com url + B1_shell.medido.md5 + veredito com falhas zero');
saida.registo_do_alvo = alvo;

const resposta = await fetch(alvo.url, { headers: { 'cache-control': 'no-cache' } });
if (!resposta.ok) throw new Error('ABORTA: o ar devolveu HTTP ' + resposta.status);
const html = await resposta.text();
const peg = pegada(html);
saida.ar = { url: alvo.url, bytes: peg.bytes, md5: peg.md5, igual_ao_registo: peg.md5 === alvo.md5 && peg.bytes === alvo.bytes };
if (!saida.ar.igual_ao_registo) throw new Error('ABORTA: ar ' + peg.md5 + '/' + peg.bytes + ' nao bate com o registo ' + alvo.md5 + '/' + alvo.bytes);
instalaPredicadoDoAr(html);
const PONTE = constroiPonteDeDias(html);

// 2) as linhas vivas, no ano local, avaliadas pelo predicado extraido do ar
const dataLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLocal)) throw new Error('ABORTA: data local ilegitima «' + dataLocal + '»');
const ano = Number(dataLocal.slice(0, 4));
const linhas = await q('select school_year, shift, entry_opens_at, class_starts_at, shift_closes_at, active_weekdays, late_grace_minutes, confirmed_at from public.bfr_school_shift_settings where school_year = ' + ano + ' order by shift');
const cal = await q("select calendar_status, source_status, confirmed_at, label from public.bfr_school_calendar_days where school_year = " + ano + " and school_date = '" + dataLocal + "'");
const diaLetivo = cal.length > 0 && cal[0].calendar_status === 'school_day' && cal[0].source_status === 'confirmed';
const a = avalia(linhas, new Date(), diaLetivo);

// 3) a grade que o proprio shell serve, extraida dos mesmos bytes: da a janela que o dono tem de digitar
const grade = { matutino: gradeDoAr(html, 'matutino'), vespertino: gradeDoAr(html, 'vespertino') };

// 4) a tarde existe em turmas e alunos? As colunas conferem-se no catalogo antes de contar; se alguma
// faltar a peca aborta em vez de imprimir zero (zero de consulta partida nao e medida nenhuma).
// Ja me enganou: `classes.year` e o ANO ESCOLAR (6.o ao 9.o), nao o ano do calendario — a primeira versao
// filtrava por `year = 2026` e devolvia `[]`, um zero que nenhuma assercao sustenta. Fica sem filtro e
// com a soma conferida contra o total da tabela.
const colunas = await q("select table_name, column_name from information_schema.columns where table_schema='public' and ((table_name='classes' and column_name in ('shift','year')) or (table_name='students' and column_name in ('active','class_id')))");
const tem = (t, c) => colunas.some((x) => x.table_name === t && x.column_name === c);
for (const [t, c] of [['classes', 'shift'], ['students', 'active'], ['students', 'class_id']]) if (!tem(t, c)) throw new Error('ABORTA: ' + t + '.' + c + ' nao esta no catalogo — a contagem por turno nao e fazivel');
const turmas = await q("select coalesce(shift,'(nulo)') as turno, count(*)::int as turmas from public.classes group by 1 order by 2 desc");
const totalTurmas = await q('select count(*)::int as turmas from public.classes');
const alunos = await q("select coalesce(c.shift,'(sem turma)') as turno, count(*)::int as alunos_activos from public.students s left join public.classes c on c.id = s.class_id where s.active group by 1 order by 2 desc");
const somaTurmas = turmas.reduce((s, r) => s + r.turmas, 0);
if (somaTurmas !== totalTurmas[0].turmas) throw new Error('ABORTA: as turmas por turno somam ' + somaTurmas + ' contra ' + totalTurmas[0].turmas + ' da tabela');
const anosEscolaresMedidos = await q('select min(year)::int as menor, max(year)::int as maior from public.classes');

saida.medido = Object.assign(a, {
  fonte_da_extracao: { origem: 'ar_servido', url: alvo.url, pegada: peg, prova: PROVENIENCIA },
  data_local: dataLocal, ano,
  linhas: linhas.map((i) => ({ shift: i.shift, janela: String(i.entry_opens_at).slice(0, 5) + '-' + String(i.shift_closes_at).slice(0, 5), dias: (i.active_weekdays || []).join(','), confirmado: !!i.confirmed_at, tolerancia: i.late_grace_minutes })),
  calendario_de_hoje: cal, dia_letivo_confirmado: diaLetivo,
  grade_no_ar: grade, grade_contra_linha: cruzamentoGradeComLinha(grade, linhas), ponte_de_dias: PONTE, turmas_por_turno: turmas, turmas_no_total: totalTurmas[0].turmas, alunos_activos_por_turno: alunos, anos_escolares: anosEscolaresMedidos,
});
saida.veredito = a.veredito;
saida.o_que_NAO_prova = 'Nao prova que a camera abra nem que o QR de um aluno passe: prova so o predicado de sessao do painel, lido dos bytes servidos. Nao prova as horas reais da escola — so diz que nenhuma janela confirmada cobre o instante medido.';
writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
console.log('P178_PORTAO_DA_PORTARIA ' + a.veredito);
console.log(JSON.stringify(saida.medido, null, 1));
console.log('artefacto=' + OUT);
