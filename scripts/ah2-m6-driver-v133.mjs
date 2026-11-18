// AH-M6 — re-varredura mobile pos-fix da barra (§SM.20, 18/11): o fix bfr-mobile-nav-sm8-fix mudou a
// barra para TODOS os papeis em ≤800 px, e a promessa registada foi fechar a superficie com o varimento
// por papel quando a publicacao acontecesse. A v133 esta no ar; este condutor re-mede os 15 papeis a 390
// (a largura onde a barra velha escondia o «Mais») com o MESMO instrumento de registo (ah2-mobile2.mjs),
// contra o site VIVO. Idempotente: pula papeis cujo artefacto v133b ja existe (abort-if-exists no filho).
// Sessoes por papel como no m5 (paralelo seguro), fusao final a uma voz com ah2-funde-sessoes.mjs --provar.
// 0 escrita, 0 DDL, 0 deploy — so leitura no ar e renovacao de token.
// Uso: node scripts/ah2-m6-driver-v133.mjs [orçamento_ms] [papéis_csv] [base_porta]
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const BUDGET = parseInt(process.argv[2] || '520000', 10);
const PEDIDO = (process.argv[3] || '').trim();
const BASE_PORTA = parseInt(process.argv[4] || '9381', 10);
const LARGURA = '390';
const EV = `${DIR}/bfr-conecta/evidence`;

const src = readFileSync(`${DIR}/bfr-conecta/scripts/ah2-varredura.mjs`, 'utf8');
const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
if (!m) throw new Error('ABORTA: enum de perfis não encontrado em ah2-varredura.mjs');
const PAPEIS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS.length < 10) throw new Error('ABORTA: enum lido tem só ' + PAPEIS.length + ' perfis — o padrão partiu');
const ALVOS = PEDIDO ? PEDIDO.split(',').map((x) => x.trim()).filter(Boolean) : PAPEIS;
for (const p of ALVOS) if (!PAPEIS.includes(p)) throw new Error('ABORTA: papel fora do enum da varredura: ' + p);

const ficheiro_sessao = (papel) => `${DIR}/ah2-sessao-v133-${papel}.json`;
const prepara_sessao = (papel) => {
  const mestre = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
  if (!mestre[papel]) throw new Error('ABORTA: sem sessão de ' + papel + ' no registo mestre');
  const atual = existsSync(ficheiro_sessao(papel)) ? JSON.parse(readFileSync(ficheiro_sessao(papel), 'utf8')) : null;
  if (atual?.[papel]?.refresh_token) { for (const k of Object.keys(mestre)) if (k !== papel && !atual[k]) atual[k] = mestre[k]; writeFileSync(ficheiro_sessao(papel), JSON.stringify(atual, null, 2) + '\n'); return; }
  writeFileSync(ficheiro_sessao(papel), JSON.stringify(mestre, null, 2) + '\n');
};

function liberta_porta(porta) {
  const q = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const pids = new Set();
  for (const linha of String(q.stdout || '').split(/\r?\n/)) {
    if (!new RegExp(':' + porta + '\\s+.*LISTENING', 'i').test(linha)) continue;
    const pid = linha.trim().split(/\s+/).pop();
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const p of pids) {
    const dono = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\").Name`], { encoding: 'utf8' });
    const nome = String(dono.stdout || '').trim();
    if (!/chrome/i.test(nome)) { console.log(`PORTA ${porta}: o dono (${pid} ${nome || 'desconhecido'}) não é Chrome nosso — não mato e mudo de porta`); return -1; }
    spawnSync('taskkill', ['/pid', p, '/t', '/f'], { stdio: 'ignore' });
    console.log(`PORTA ${porta}: chrome órfão ${p} parado`);
  }
  return pids.size;
}

const t0 = Date.now(); let corridos = 0;
for (const papel of ALVOS) {
  const OUT = `${EV}/ah2-mobile2-v133b-${papel}.json`;
  if (existsSync(OUT)) { console.log(`${papel}: artefacto v133b ja existe — pula (idempotente)`); continue; }
  const restante = BUDGET - (Date.now() - t0) - 45000;
  if (restante < 110000) { console.log('ORÇAMENTO INSUFICIENTE para um novo filho — relançar o condutor'); break; }
  const teto = Math.min(430000, restante);
  let porta = BASE_PORTA + PAPEIS.indexOf(papel);
  if (liberta_porta(porta) === -1) porta += PAPEIS.length;
  console.log(`\n=== v133b :: ${papel} @ ${LARGURA} (teto ${Math.round(teto / 1000)} s, porta ${porta}) ===`);
  prepara_sessao(papel);
  const r = spawnSync(process.execPath, [`${DIR}/bfr-conecta/scripts/ah2-mobile2.mjs`, papel, LARGURA, `v133b-${papel}`], { cwd: `${DIR}/bfr-conecta`, encoding: 'utf8', timeout: teto + 150000, maxBuffer: 40 * 1024 * 1024, env: { ...process.env, AH2_TETO_MS: String(teto), AH2_PORT: String(porta), AH2_SESSAO: ficheiro_sessao(papel) } });
  console.log('  par de ' + papel + ' guardado em ' + ficheiro_sessao(papel).split('/').pop());
  const linhas = String(r.stdout || '').split('\n');
  console.log(linhas.filter((l) => /^(PORTÕES|VERMELHO|DIAGNOSTICO|AH7b_)/.test(l)).join('\n'));
  if (r.error) console.log('ERRO FILHO: ' + String(r.error.message).slice(0, 200));
  if (r.stderr && /ABORTA|Error/.test(r.stderr)) console.log('STDERR: ' + r.stderr.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300));
  corridos++;
}
const feitos = ALVOS.filter((p) => existsSync(`${EV}/ah2-mobile2-v133b-${p}.json`));
const faltam = ALVOS.filter((p) => !feitos.includes(p));
console.log(`\nCORRIDOS NESTE LANÇAMENTO: ${corridos}  DECORRIDO: ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(`FEITOS: ${feitos.length}/${ALVOS.length}${faltam.length ? ' — faltam: ' + faltam.join(', ') : ''}`);
console.log(faltam.length ? 'M6_INCOMPLETO — relançar o condutor' : 'M6_TODOS_OS_PAPEIS_MEDIDOS');
