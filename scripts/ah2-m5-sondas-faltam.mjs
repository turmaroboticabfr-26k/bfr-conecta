// Corre em série as sondas que faltam para §AI.24 sair de «só 390 px» sem colisões: cada papel×largura tem
// a sua porta CDP e o seu perfil de Chrome, e a porta BASE+índice garante que duas corridas nunca partilham
// perfil (a colisão de perfil era o `CRASH` de §AI.6/4). Aborte se um artefacto do rótulo já existir — o
// condutor não pisa prova, e um rótulo repetido significa que a saída não é reprodutível.
// Uso: node scripts/ah2-m5-sondas-faltam.mjs [base_port=9470] [de=1] [ate=n]
//        (fatias porque cada sonda tem teto de 180 s e o topo de chamadas em background é 10 min)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = parseInt(process.argv[2] || '9470', 10);
const DE = parseInt(process.argv[3] || '1', 10) - 1;
const ATE = parseInt(process.argv[4] || '99', 10);
const EV = `${DIR}/evidence`;
// (1) o `chat-interno` do education_supervisor é a classe que §AI.24 ponto 4 deixou sob dúvida; (2) as
// larguras fora de 390 são o limite que o ponto 3 assinou como «suspeitas pela mesma prédica».
const SONDAS = [
  ['edschat390', 'education_supervisor', 390, 'chat-interno', 'internalChatView'],
  ['edschat320', 'education_supervisor', 320, 'chat-interno', 'internalChatView'],
  ['sec320', 'secretary', 320, 'apoio', 'supportView'],
  ['dev320', 'developer', 320, 'apoio', 'supportView'],
  ['aee375', 'aee', 375, 'apoio', 'supportView'],
  ['stu320', 'student', 320, 'apoio', 'supportView'],
];
// A colisão só interessa na fatia que se vai correr: as sondas já gravadas são prova intocável, mas a
// existência delas não pode impedir uma fatia seguinte (é assim que se corre 4–6 depois de 1–3).
const ja_existe = SONDAS.slice(DE, Math.min(ATE, SONDAS.length)).filter(([r]) => existsSync(`${EV}/ah2-sonda-apoio-tempo-${r}.json`) || existsSync(`${EV}/ah2-sonda-painel-tempo-${r}.json`));
if (ja_existe.length) throw new Error('ABORTA: rótulos já gravados: ' + ja_existe.map((x) => x[0]).join(', '));
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, falhas = [];
for (let i = DE; i < Math.min(ATE, SONDAS.length); i++) {
  const [rot, papel, largura, rota, painel] = SONDAS[i];
  const script = rota === 'apoio' ? 'scripts/ah2-sonda-apoio-tempo.mjs' : 'scripts/ah2-sonda-painel-tempo.mjs';
  const args = rota === 'apoio' ? [papel, String(largura), rot] : [papel, String(largura), rot, rota, painel];
  console.log(`\n[${i + 1}/${SONDAS.length}] ${rot} = ${script} ${args.join(' ')} (porta ${BASE + i})`);
  const r = spawnSync(process.execPath, [`${DIR}/${script}`, ...args], {
    cwd: DIR, encoding: 'utf8', timeout: 200000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, AH2_PORT: String(BASE + i) },
  });
  const t = (r.stdout || '') + (r.stderr || '');
  console.log(t.split('\n').filter((l) => /ESCRITO|PAROU|ABORTA|Error/.test(l)).join('\n') || t.slice(0, 500));
  // O veredito vive no artefacto, não no stdout: lê-lo do disco é a única forma de o condutor não inventar
  // um «sem veredito» quando a sonda gravou e saiu 0.
  const ficheiro = `${EV}/ah2-sonda-${rota === 'apoio' ? 'apoio' : 'painel'}-tempo-${rot}.json`;
  let v = null, c = null;
  try { const j = JSON.parse(readFileSync(ficheiro, 'utf8')); v = j.veredito; c = (j.serie || []).find((x) => x && x.c > 0) || null; } catch {}
  console.log(`  saida=${r.status} ${v ? String(v).slice(0, 200) : '(sem artefacto legível)'}`);
  if (r.status === 0 && v) ok++; else falhas.push(`${rot}(saida ${r.status})`);
  await dorme(2500);
}
console.log(`\nSONDAS_FALTAM: ${ok}/${SONDAS.length} gravadas com veredito${falhas.length ? ' · falhas: ' + falhas.join(', ') : ''}`);
