// §5 do briefing: «testar em resoluções 320, 360, 375, 390, 414 e 430» para os 15 perfis. São 90 células
// e cada processo do instrumento tem uma praga própria (470 s) — nenhuma chamada de shell aguenta a série
// toda. Este condutor resolve isso por construção: lê o enum de perfis do código da varredura (não de uma
// lista lembrada), olha para os artefactos já escritos em evidence/ e só corre as larguras que faltam.
// Relançar é idempotente; a cobertura é medida no disco, não na memória. 0 escrita, 0 DDL, 0 deploy.
// Uso: node scripts/ah2-m5-driver.mjs [orçamento_ms]
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const BUDGET = parseInt(process.argv[2] || '520000', 10);
// Papéis e porta ficam por argumento para que vários condutores possam correr ao mesmo tempo, cada um com
// a sua fileira de portas — a grelha são 90 células e uma janela de shell de 10 minutos não chega para ela.
const PEDIDO = (process.argv[3] || '').trim();
const BASE_PORTA = parseInt(process.argv[4] || '9381', 10);
const LARGURAS = [320, 360, 375, 390, 414, 430];
// A fonte da verdade são os perfis que a varredura percorre — se lá mudar, aqui muda com ela.
const src = readFileSync(`${DIR}/bfr-conecta/scripts/ah2-varredura.mjs`, 'utf8');
const m = src.match(/const TODOS\s*=\s*\[([^\]]*)\]/);
if (!m) throw new Error('ABORTA: enum de perfis não encontrado em ah2-varredura.mjs');
const PAPEIS = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (PAPEIS.length < 10) throw new Error('ABORTA: enum lido tem só ' + PAPEIS.length + ' perfis — o padrão partiu');
const ALVOS = PEDIDO ? PEDIDO.split(',').map((x) => x.trim()).filter(Boolean) : PAPEIS;
for (const p of ALVOS) if (!PAPEIS.includes(p)) throw new Error('ABORTA: papel fora do enum da varredura: ' + p);
// O GoTrue roda o refresh token a cada uso. Com papéis em paralelo a escrever o mesmo registo, um filho
// grava por cima do par do outro e a cadeia queimada só se descobre tarde. Durante a grelha o registo
// MESTRE não é tocado por ninguém: cada papel escreve no seu ficheiro e no fim corre-se uma vez o
// ah2-funde-sessoes.mjs. Um único escritor, sempre.
const ficheiro_sessao = (papel) => `${DIR}/ah2-sessao-${papel}.json`;
const prepara_sessao = (papel) => {
  const mestre = JSON.parse(readFileSync(`${DIR}/ah2-sessions.json`, 'utf8'));
  if (!mestre[papel]) throw new Error('ABORTA: sem sessão de ' + papel + ' no registo mestre');
  const atual = existsSync(ficheiro_sessao(papel)) ? JSON.parse(readFileSync(ficheiro_sessao(papel), 'utf8')) : null;
  // Se já existe ficheiro do papel, ele é que está fresco (o mestre encolheu quando a cadeia rodou): só se
  // copiam de volta as cadeias dos OUTROS papéis, nunca a deste.
  if (atual?.[papel]?.refresh_token) { for (const k of Object.keys(mestre)) if (k !== papel && !atual[k]) atual[k] = mestre[k]; writeFileSync(ficheiro_sessao(papel), JSON.stringify(atual, null, 2) + '\n'); return; }
  writeFileSync(ficheiro_sessao(papel), JSON.stringify(mestre, null, 2) + '\n');
};

const EV = `${DIR}/bfr-conecta/evidence`;
// Um condutor em paralelo não pode matar o browser dos outros: a limpeza é feita por PORTA, e só a porta
// atribuída ao papel que este lançamento vai medir. Um Chrome órfão que escuta na porta faz o filho seguir
// para um browser morto — foi assim que a célula `parent@360` ficou a meio.
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
// Célula coberta = artefacto m5 do papel com essa largura medida e SEM praga e com a banda COERENTE: barra
// do censo com botões a caixa e pelo menos uma seção aberta a toque. As bandas ocas (pedagogical@320/360 com
// barra_existe=false; pending com abertas=0) contavam como cobertas e a grelha dava 12/90 quando havia 8.
// Larguras travadas de propósito (j.bloqueadas: conta em análise sem shell, módulo de apresentação ausente
// após rechegar) NÃO são re-tentadas — relançar não muda o estado do produto.
const cobertura = (papel) => {
  const cobertas = new Set(); const bloqueadas = new Set(); const ficheiros = [];
  for (const f of readdirSync(EV)) {
    if (!/^ah2-mobile2-m5-/.test(f) || !f.endsWith('.json')) continue;
    let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
    if (j.ciclo !== 'AH-7b-MOBILE' || j.papel !== papel) continue;
    ficheiros.push(f);
    for (const [w, b] of Object.entries(j.bandas || {})) {
      if (b.pela_praga) continue;
      const coerente = !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
      if (coerente) cobertas.add(parseInt(w, 10));
    }
    for (const q of j.bloqueadas || []) bloqueadas.add(q.largura);
  }
  return { cobertas, bloqueadas, tentativas: ficheiros.length };
};

const t0 = Date.now(); let corridos = 0;
const resumo = [];
for (const papel of ALVOS) {
  const { cobertas, bloqueadas, tentativas } = cobertura(papel);
  const faltam = LARGURAS.filter((w) => !cobertas.has(w) && !bloqueadas.has(w));
  resumo.push(`${papel}: ${cobertas.size}/6${bloqueadas.size ? ' + ' + bloqueadas.size + ' travada(s)' : ''}${faltam.length ? ' faltam ' + faltam.join('/') : ''}`);
  if (!faltam.length) continue;
  // Cada filho recebe o tempo que resta (menos a margem de escrita) e fecha-se sozinho com o que mediu;
  // assim a janela de shell é usada toda e nenhuma célula é perdida por timeout externo sem artefacto.
  const restante = BUDGET - (Date.now() - t0) - 45000;
  if (restante < 110000) { console.log('ORÇAMENTO INSUFICIENTE para um novo filho — relançar o condutor'); break; }
  const teto = Math.min(430000, restante);
  let porta = BASE_PORTA + PAPEIS.indexOf(papel);
  if (liberta_porta(porta) === -1) porta += PAPEIS.length;
  const rotulo = `m5-${papel}-${tentativas + 1}`;
  const OUT = `${EV}/ah2-mobile2-${rotulo}.json`;
  if (existsSync(OUT)) { console.log('ABORTA: ' + OUT + ' existe'); continue; }
  console.log(`\n=== ${rotulo} :: ${papel} @ ${faltam.join(',')} (teto ${Math.round(teto / 1000)} s, porta ${porta}) ===`);
  prepara_sessao(papel);
  const r = spawnSync(process.execPath, [`${DIR}/bfr-conecta/scripts/ah2-mobile2.mjs`, papel, faltam.join(','), rotulo], { cwd: `${DIR}/bfr-conecta`, encoding: 'utf8', timeout: teto + 150000, maxBuffer: 40 * 1024 * 1024, env: { ...process.env, AH2_TETO_MS: String(teto), AH2_PORT: String(porta), AH2_SESSAO: ficheiro_sessao(papel) } });
  console.log('  par de ' + papel + ' guardado em ' + ficheiro_sessao(papel).split('/').pop() + ' (o mestre só é fundido no fim, a uma voz)');
  const linhas = String(r.stdout || '').split('\n');
  console.log(linhas.filter((l) => /^(PORTÕES|VERMELHO|[A-Z-]+ \(|  \d+px\/|PAROU:)/.test(l)).slice(-24).join('\n'));
  if (r.error) console.log('ERRO FILHO: ' + String(r.error.message).slice(0, 200));
  if (r.stderr && /ABORTA|Error/.test(r.stderr)) console.log('STDERR: ' + r.stderr.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300));
  corridos++;
}
const estado = PAPEIS.map((p) => { const { cobertas, bloqueadas } = cobertura(p); return { papel: p, cobertas: [...cobertas].sort((a, b) => a - b), travadas: [...bloqueadas].sort((a, b) => a - b) }; });
console.log(`\nCORRIDOS NESTE LANÇAMENTO: ${corridos}  DECORRIDO: ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(estado.map((e) => `  ${e.papel}: ${e.cobertas.join('/') || 'nenhuma'}${e.travadas.length ? ' | TRAVADAS ' + e.travadas.join('/') : ''}`).join('\n'));
const n_med = estado.reduce((a, e) => a + e.cobertas.length, 0); const n_trav = estado.reduce((a, e) => a + e.travadas.length, 0);
console.log(`CELULAS MEDIDAS: ${n_med}/90  TRAVADAS COM CAUSA: ${n_trav}  POR MEDIR: ${90 - n_med - n_trav}`);
console.log(n_med + n_trav === 90 ? (n_trav ? 'M5_GRELHA_COMPLETA_COM_TRAVAS' : 'M5_TODAS_LARGURAS_MEDIDAS') : 'M5_INCOMPLETO — relançar o condutor');
