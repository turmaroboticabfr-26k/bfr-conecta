// P128 — conferir se as agulhas do plano da RM-5.2 (§2, §5, §6) contam o mesmo no bundle que o
// instrumento leu (v136) e no bundle que o ar serve hoje (v142). Só-leitura: nenhum browser, nenhuma
// escrita no banco, nenhum portão de decisão — é uma comparação entre duas identidades medidas.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const REPO = join(process.cwd());
const SUFIXO = process.argv[2] || 'a';
const BUNDLES = (process.argv[3] || 'bfr-candidata-v136-secretaria-de-educacao/index.html,bfr-candidata-v142-painel-na-troca/index.html').split(',');
const AGULHAS = [
  'gateReady', 'schoolDayConfirmed', 'activeSchoolShift', 'gateLegacyMode', 'gateScanReady',
  "state.schoolCalendarDay?.calendar_status==='school_day'",
  "source_status==='confirmed'",
  'calendarDays.length', 'confirmGateCalendar', "source_status:'draft'",
  'active_weekdays', 'expected_school_days',
  'register_gate_checkin', 'register_gate_checkin_v2',
  'registerGateCheckin', 'registerGateToken',
  'data-gate-manual-form', 'data-gate-central-manual',
  'function hideLegacy', 'bfr-gate-legacy', 'gate-welcome',
  // As formas de **definição**, que são a régua de §2 do plano (1 por nome), separadas das ocorrências
  // do identificador nu, que contam também as chamadas. Uma régua por classe de objeto, não uma única.
  'function gateReady', 'function schoolDayConfirmed', 'function activeSchoolShift',
  'function gateLegacyMode', 'function gateScanReady', 'function confirmGateCalendar',
];
const conta = (txt, agulha) => txt.split(agulha).length - 1;
// As posições são outra promessa do plano (§5 e §2 citam deslocamentos, não só contagens). Todas as
// agulhas posicionais dão-se como texto e os deslocamentos leem-se dos bytes de cada bundle: um número
// que só vale para um de dois ficheiros tem de ser dito, não calado.
const posicoes = (txt, agulha) => {
  const out = [];
  let i = txt.indexOf(agulha);
  while (i >= 0 && out.length < 12) { out.push(i); i = txt.indexOf(agulha, i + 1); }
  return out;
};
const AGULHAS_POSICAO = [
  '<script id="bfr-public-schedule-fallback">',
  'data-bfr-auth-deferred',
  'function hideLegacy',
  '!gateLegacyMode()&&!gateReady()',
  'confirmGateCalendar',
];
const saida = {
  peca: 'scripts/p128-conferencia-dos-dous-bundles.mjs',
  sufixo: SUFIXO,
  em: new Date().toISOString(),
  metodo: 'contagem por split e deslocamentos por indexOf, sobre os bytes de dois ficheiros versionados; nenhuma normalizacao, nenhuma substituicao',
  bundles: [],
  agulhas: {},
  posicoes: {},
};
for (const rel of BUNDLES) {
  const caminho = join(REPO, rel);
  let txt;
  try { txt = readFileSync(caminho, 'utf8'); }
  catch (e) { console.log('BUNDLE_AUSENTE ' + rel + ' :: ' + e.code); process.exit(2); }
  const bytes = Buffer.byteLength(txt, 'utf8');
  const md5 = createHash('md5').update(txt).digest('hex');
  saida.bundles.push({ caminho: rel, bytes, md5, linhas: txt.split('\n').length });
  for (const ag of AGULHAS) {
    const k = ag;
    (saida.agulhas[k] = saida.agulhas[k] || {})[rel] = conta(txt, ag);
  }
  for (const ag of AGULHAS_POSICAO) {
    (saida.posicoes[ag] = saida.posicoes[ag] || {})[rel] = posicoes(txt, ag);
  }
}
const divergentes = [];
for (const [k, porB] of Object.entries(saida.agulhas)) {
  const valores = Object.values(porB);
  if (new Set(valores).size !== 1) divergentes.push({ agulha: k, contagens: porB });
}
const posicoesDivergentes = [];
for (const [k, porB] of Object.entries(saida.posicoes)) {
  const serializadas = Object.values(porB).map((v) => JSON.stringify(v));
  if (new Set(serializadas).size !== 1) posicoesDivergentes.push({ agulha: k, deslocamentos: porB });
}
saida.n_agulhas = AGULHAS.length;
saida.n_agulhas_posicao = AGULHAS_POSICAO.length;
saida.divergentes = divergentes;
saida.posicoes_divergentes = posicoesDivergentes;
saida.veredito = divergentes.length === 0 && posicoesDivergentes.length === 0
  ? `P128_CONFERENCIA_DOS_DOUS_BUNDLES_IGUAIS ${AGULHAS.length + AGULHAS_POSICAO.length}/0`
  : `P128_CONFERENCIA_DOS_DOUS_BUNDLES_DIVERGE contagens=${divergentes.length} de ${AGULHAS.length} posicoes=${posicoesDivergentes.length} de ${AGULHAS_POSICAO.length}`;
const OUT = join(REPO, 'evidence', 'p128-conferencia-dos-dous-bundles-' + SUFIXO + '.json');
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(saida.veredito);
for (const b of saida.bundles) console.log('BUNDLE ' + b.bytes + ' B md5=' + b.md5 + ' linhas=' + b.linhas + ' :: ' + b.caminho);
for (const [k, porB] of Object.entries(saida.agulhas)) console.log('AG ' + k + ' ' + JSON.stringify(porB));
for (const [k, porB] of Object.entries(saida.posicoes)) console.log('POS ' + k + ' ' + JSON.stringify(porB));
for (const d of divergentes) console.log('DIVERGE ' + d.agulha + ' ' + JSON.stringify(d.contagens));
for (const d of posicoesDivergentes) console.log('DIVERGE_POS ' + d.agulha + ' ' + JSON.stringify(d.deslocamentos));
console.log('ESCRITO ' + OUT.replace(REPO + '/', '') + ' ' + Buffer.byteLength(JSON.stringify(saida, null, 2) + '\n', 'utf8') + ' B');
