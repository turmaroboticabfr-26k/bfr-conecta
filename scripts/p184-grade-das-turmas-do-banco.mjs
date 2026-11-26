// A grade real das turmas, medida no catalogo vivo, confrontada com a captura do p183 que a localizou.
// Pergunta a que responde: que horas a escola tem de facto na grade publicada por turma, e em que turno falta
// hora alguma? O p178 so conhece a tabela de turnos (uma linha por turno); os horarios das turmas moram noutro
// lado. A janela daqui e a da GRADE (min(start_time)..max(end_time)) — a janela do PORTAO e outra e e o p178 que
// a mede nos bytes do ar.
// Nada aqui escreve no banco: uma consulta por linha de catalogo. O unico ficheiro escrito e a captura.
// Uso: P184_SUF=<sufixo> P184_CAPTURA_P183=<caminho da captura do p183> node scripts/p184-grade-das-turmas-do-banco.mjs [--selfteste]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PRODUTOR = 'scripts/p178-portao-da-portaria-lido-do-ar.mjs';
const SUF = process.env.P184_SUF;
const CAPTURAP183 = process.env.P184_CAPTURA_P183;
if (!SUF) throw new Error('ABORTA: P184_SUF e obrigatorio — cada corrida precisa de nome proprio');
if (!CAPTURAP183) throw new Error('ABORTA: P184_CAPTURA_P183 e obrigatorio — o nome da tabela vem duma medicao, nao da memoria');
const OUT = join(REPO, 'evidence', 'p184-grade-das-turmas-' + SUF + '.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' ja existe — use outro P184_SUF');
const EU = readFileSync(new URL(import.meta.url), 'utf8');
const fonte = readFileSync(join(REPO, PRODUTOR), 'utf8');
const capturaP183 = JSON.parse(readFileSync(CAPTURAP183, 'utf8'));

function constanteDe(nome, re, deOnde) {
  const m = re.exec(deOnde);
  if (!m) throw new Error('ABORTA: nao li a constante «' + nome + '» de onde ela deve viver — foi renomeada ou apagada');
  return m[1];
}
const REF = constanteDe('REF', /const REF = '([a-z0-9]+)'/, fonte);
const PATCAMINHO = constanteDe('PAT', /readFileSync\('([^']+\.supabase-pat)'/, fonte);
const ENDPOINT = constanteDe('ENDPOINT', /fetch\('(https:\/\/api\.supabase\.com\/v1\/projects\/)'/, fonte);
const FUSO = constanteDe('FUSO', /timeZone: '([^']+)'/, fonte);

const FIX_PROVENIENCIA = [
  { id: 'f1_ref_ausente_aborta', deOnde: "const OUTRO = 'abc'", re: /const REF = '([a-z0-9]+)'/, esperaAborta: true },
  { id: 'f2_ref_presente_devolve', deOnde: "const REF = 'zzz1'", re: /const REF = '([a-z0-9]+)'/, espera: 'zzz1' },
  { id: 'f3_endpoint_ausente_aborta', deOnde: "await fetch(outraUrl)", re: /fetch\('(https:\/\/api\.supabase\.com\/v1\/projects\/)'/, esperaAborta: true },
  { id: 'f4_tabela_do_p183_ausente_aborta', deOnde: '{\n "catalogo": {\n  "colunas_de_tempo": []\n }\n}', re: /"table_name": "([a-z_][a-z0-9_]*)"/, esperaAborta: true },
  { id: 'f5_tabela_do_p183_devolve', deOnde: '{\n "x": {\n  "table_name": "bfr_schedule_entries"\n }\n}', re: /"table_name": "([a-z_][a-z0-9_]*)"/, espera: 'bfr_schedule_entries' },
];
const casosProv = FIX_PROVENIENCIA.map((f) => {
  let obtido = null, abortou = false;
  try { obtido = constanteDe(f.id, f.re, f.deOnde); } catch (e) { abortou = true; obtido = e.message.slice(0, 40); }
  const bate = f.esperaAborta ? abortou === true : abortou === false && obtido === f.espera;
  return { id: f.id, espera: f.esperaAborta ? 'aborta' : f.espera, obtido, bate };
});

const saida = {
  peca: 'p184-grade-das-turmas-do-banco',
  emissor_bytes: Buffer.byteLength(EU, 'utf8'),
  emissor_md5: createHash('md5').update(EU).digest('hex'),
  produtor_bytes: Buffer.byteLength(fonte, 'utf8'),
  produtor_md5_8: createHash('md5').update(fonte).digest('hex').slice(0, 8),
  captura_p183_bytes: Buffer.byteLength(readFileSync(CAPTURAP183, 'utf8'), 'utf8'),
  captura_p183_md5_8: createHash('md5').update(readFileSync(CAPTURAP183, 'utf8')).digest('hex').slice(0, 8),
  proveniencia_lida: { ref_8: REF.slice(0, 8), pat_caminho: PATCAMINHO, endpoint_prefixo: ENDPOINT, fuso: FUSO },
  prova_proveniencia: casosProv,
};
const vermesProv = casosProv.filter((c) => !c.bate);
if (vermesProv.length) {
  saida.veredito = 'P184_VERMELHO_PROVENIENCIA';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  throw new Error('ABORTA: a prova de proveniencia falhou em ' + JSON.stringify(vermesProv.map((c) => c.id)));
}

if (process.argv.includes('--selfteste')) {
  saida.modo = 'selfteste';
  saida.veredito = 'P184_SELFTESTE_OK';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  console.log(saida.veredito + ' casos=' + casosProv.length + ' capt=' + OUT);
  for (const c of casosProv) console.log('  ' + c.id + ' espera=' + c.espera + ' bate=' + c.bate);
  process.exit(0);
}

const PAT = readFileSync(PATCAMINHO, 'utf8').trim();
const q = async (sql) => {
  const r = await fetch(ENDPOINT + REF + '/database/query', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + PAT, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error('ABORTA HTTP ' + r.status + ' :: ' + t.slice(0, 300));
  return JSON.parse(t);
};

const agora = new Date();
const partes = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(agora).reduce((a, p) => (a[p.type] = p.value, a), {});
const minutoLocal = Number(partes.hour) * 60 + Number(partes.minute);
const numeroDoDiaISO = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[partes.weekday];
saida.instantaneo = { data_local: partes.year + '-' + partes.month + '-' + partes.day, dia_da_semana: partes.weekday, dia_iso: numeroDoDiaISO, hora_local: partes.hour + ':' + partes.minute, minutos_desde_meia_noite: minutoLocal, fuso: FUSO };

const candidatas = await q("select table_name from information_schema.columns where table_schema='public' and column_name='start_time' group by table_name having count(*) > 0 order by table_name");
const nomesMedidos = candidatas.map((c) => c.table_name);
const nomeMedidoPeloP183 = new Set((capturaP183.catalogo?.colunas_de_tempo || []).map((c) => c.table_name));
saida.cruce_da_tabela = {
  medida_agora_com_start_time: nomesMedidos,
  tabelas_com_coluna_de_tempo_naCapturaP183: [...nomeMedidoPeloP183],
  p183_tem_tabela: nomesMedidos.length > 0 && nomesMedidos.every((t) => nomeMedidoPeloP183.has(t)),
};
if (nomesMedidos.length !== 1) {
  saida.veredito = 'P184_VERMELHO_TABELA_AMBIGUA';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  throw new Error('ABORTA: as tabelas com start_time dao ' + JSON.stringify(nomesMedidos) + ' — a pergunta nao tem alvo unico');
}
if (!saida.cruce_da_tabela.p183_tem_tabela) {
  saida.veredito = 'P184_VERMELHO_NOME_DIVERGENTE';
  writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
  throw new Error('ABORTA: a tabela medida agora nao esta na captura do p183 — as duas rotas leram catalogos diferentes');
}
const T = nomesMedidos[0];
if (!/^[a-z_][a-z0-9_]*$/.test(T)) throw new Error('ABORTA: nome de tabela ilegitimo lido do catalogo: ' + T);

const colunas = await q("select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='" + T + "' order by ordinal_position");
saida.tabela = T;
saida.colunas = colunas;

const nomes = colunas.map((c) => c.column_name);
const COL = {};
for (const precisa of ['start_time', 'end_time', 'shift', 'weekday']) {
  if (!nomes.includes(precisa)) throw new Error('ABORTA: a tabela ' + T + ' nao tem a coluna «' + precisa + '» — o eixo mudou de nome e a consulta nao pode ser escrita a memoria');
  COL[precisa] = precisa;
}
const turmaEixo = nomes.filter((n) => /class|turma/.test(n));
saida.eixos_lidos = nomes.filter((n) => /weekday|shift|day|start|end|class|turma|subject|room|period/.test(n));
saida.eixo_de_turma_lido_do_catalogo = turmaEixo;

const porTurno = await q('select ' + COL.shift + ' as turno, count(*)::int as linhas, min(' + COL.start_time + ') as inicio_mais_antigo, max(' + COL.end_time + ') as fim_mais_tarde from public.' + T + ' group by ' + COL.shift + ' order by ' + COL.shift);
saida.grade_por_turno = porTurno;
const porDia = await q('select ' + COL.weekday + ' as dia, count(*)::int as linhas, min(' + COL.start_time + ') as mais_antigo, max(' + COL.end_time + ') as mais_tarde from public.' + T + ' group by ' + COL.weekday + ' order by ' + COL.weekday);
saida.grade_por_dia = porDia;
const turmas = turmaEixo.length
  ? await q('select count(distinct ' + turmaEixo[0] + ')::int as turmas_distintas, count(*)::int as linhas from public.' + T)
  : [{ turmas_distintas: null, linhas: (await q('select count(*)::int as linhas from public.' + T))[0].linhas }];
saida.turmas = turmas[0];
const hhmm = String(partes.hour).padStart(2, '0') + ':' + String(partes.minute).padStart(2, '0');
const cobrindo = await q("select count(*)::int as aulas_acontecendo, min(start_time)::text as comeca_as, max(end_time)::text as acaba_as from public." + T + " where start_time <= '" + hhmm + ":00' and end_time > '" + hhmm + ":00'");
saida.aulas_no_instante = cobrindo[0];

function horaParaMinuto(h) {
  const p = String(h).split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

const vazio = await q('select shift as turno, count(*)::int as linhas, count(*) filter (where start_time is null)::int as sem_inicio, count(*) filter (where end_time is null)::int as sem_fim, count(*) filter (where class_id is null)::int as sem_turma from public.' + T + ' group by shift order by shift');
saida.vazio_por_turno = vazio;
const rotulos = await q('select shift as turno, period, grade_label, start_time::text, end_time::text, count(*)::int as linhas from public.' + T + ' group by shift, period, grade_label, start_time, end_time order by shift, period limit 40');
saida.rotulos_amostra = rotulos;
const procedencia = await q('select coalesce(source_status, \'NULO\') as estado, count(*)::int as linhas from public.' + T + ' group by source_status order by linhas desc');
saida.procedencia_das_linhas = procedencia;

const bandas = porTurno.map((r) => ({ turno: r.turno, desde: r.inicio_mais_antigo, ate: r.fim_mais_tarde, linhas: r.linhas }));
saida.janela_real_da_grade_por_turno = bandas;
// Nome declarado: esta e a janela da GRADE (min(start_time)..max(end_time) das linhas), nao a do PORTAO.
// A do portao compara entry_opens_at com fim inclusivo e e medida pelo p178 nos bytes do ar; quem precisar da
// resposta do portao le o registo do p178, nao esta linha.
saida.janela_real_da_grade_que_cobre_o_instante = bandas.filter((b) => minutoLocal >= horaParaMinuto(b.desde) && minutoLocal < horaParaMinuto(b.ate)).map((b) => b.turno);
saida.turnos_sem_hora_nenhuma = vazio.filter((v) => v.sem_inicio === v.linhas).map((v) => v.turno);

saida.veredito = 'P184_GRADE_MEDIDA';
writeFileSync(OUT, JSON.stringify(saida, null, 1), 'utf8');
console.log(saida.veredito + ' tabela=' + T + ' linhas=' + saida.turmas.linhas + ' turmas=' + saida.turmas.turmas_distintas + ' minuto_local=' + minutoLocal + ' janela_real_da_grade_que_cobre_o_instante=' + (saida.janela_real_da_grade_que_cobre_o_instante.join(',') || 'nenhuma') + ' turnos_sem_hora_nenhuma=' + (saida.turnos_sem_hora_nenhuma.join(',') || 'nenhum') + ' capt=' + OUT);
for (const v of vazio) console.log('  turno=' + JSON.stringify(v.turno) + ' linhas=' + v.linhas + ' sem_inicio=' + v.sem_inicio + ' sem_fim=' + v.sem_fim + ' sem_turma=' + v.sem_turma);
for (const b of bandas) console.log('  janela_real_da_grade ' + JSON.stringify(b.turno) + ' ' + b.desde + '..' + b.ate + ' linhas=' + b.linhas);
for (const p of procedencia) console.log('  source_status=' + JSON.stringify(p.estado) + ' linhas=' + p.linhas);
console.log('  amostra_de_rotulos=' + rotulos.length + ' linhas_de_amostra');
