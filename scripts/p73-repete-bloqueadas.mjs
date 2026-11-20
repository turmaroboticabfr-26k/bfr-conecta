// P73-P — repeticao cruzada-portfolio das celulas BLOQUEADAS, para responder à pergunta que a PEN-35 exige e
// uma corrida sozinha nao responde: «e a LARGURA ou e a CORRIDA?». O instrumento ja rechega uma vez dentro do
// mesmo processo (ah2-mobile2.mjs:278-289) antes de dar BLOQUEADA, logo cada celula bloqueada ja tem duas
// tentativas. Este programa acrescenta N processos independentes para o mesmo (papel, larguras) e classifica
// cada um deles com a PREDICA DO PRODUTOR — copiada do condutor e compilada, nao reimplementada aqui.
// Veredito por papel: DETERMINISTA (bloqueia em todos os processos), CORRIDAS (misto — o module de
// apresentacao nao monta sempre) ou MONTA_SEMPRE (as bloqueadas eram desta fileira, nao do papel).
// 0 escrita de produto, 0 DDL, 0 publicacao; so artefactos de evidence/ e ficheiros de perfil do Chrome.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const PAPEL = (process.argv[2] || '').trim();
const LARGURAS = (process.argv[3] || '360').split(',').map((x) => parseInt(x, 10));
const N = parseInt(process.argv[4] || '3', 10);
const PORTA = parseInt(process.argv[5] || '9281', 10);
const SUF = (process.argv[6] || '19-11').trim();
const OUT = `${EV}/p73-repeticao-${PAPEL}-${LARGURAS.join('-')}px-${SUF}.json`;
if (!PAPEL) throw new Error('ABORTA: uso node scripts/p73-repete-bloqueadas.mjs <papel> <larguras> <n> <porta> <suf>');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(`${REPO}/scripts/ah2-m5-driver.mjs`, 'utf8');
const linhaCoerencia = dsrc.split('\n').findIndex((l) => /const coerente = !!b\.censo/.test(l)) + 1;
if (!linhaCoerencia) throw new Error('ABORTA: a linha da predica nao esta no condutor');
const eh_coerente = new Function('b', 'return (' + dsrc.split('\n')[linhaCoerencia - 1].replace(/^\s*const coerente =\s*/, '').replace(/;\s*$/, '') + ');');
// fixture: a predica tem de poder divergir, senao o verde da matriz nao quer dizer nada.
if (eh_coerente({ censo: { barra_existe: true, barra: [{ w: 40, h: 44 }] }, abertas: 1 }) !== true || eh_coerente({ censo: { barra_existe: true, barra: [{ w: 40, h: 44 }] }, abertas: 0 }) !== false) throw new Error('ABORTA: predica nao discrimina no fixture');

const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
const AR_MD5 = md5(await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text());
const sessao = `${DIR}/ah2-sessao-${PAPEL}.json`;
if (!existsSync(sessao)) throw new Error('ABORTA: sem ficheiro de sessao de ' + PAPEL);

// MATRIZ (largura × processo), uma largura por processo. A versão anterior passava as N larguras ao mesmo
// filho e media `NAO_CHEGOU` na segunda: `m5-secretary-rep1` e `rep2` (20/11) morreram os dois com
// `uncaughtException: CDP Page.navigate sem resposta em 150 s` exactamente na segunda largura, idêntico ao
// aborto da vaga 5. O limite do instrumento é medido, não opinado: um filho = uma largura. Assim cada célula
// da matriz é um processo independente, que é exactamente a pergunta «é a LARGURA ou é a CORRIDA?».
const tentativas = [];
for (const w of LARGURAS) {
  for (let i = 1; i <= N; i++) {
    const rotulo = `m5-${PAPEL}-rep${i}w${w}`;
    const arte = `${EV}/ah2-mobile2-${rotulo}.json`;
    let j = null;
    if (existsSync(arte)) { try { j = JSON.parse(readFileSync(arte, 'utf8')); } catch { } if (j) { console.log('  (reaproveitado, ja existe: ' + rotulo + ')'); } }
    let decorrido = 0, status = null;
    if (!j) {
      const t0 = Date.now();
      const r = spawnSync(process.execPath, [`${REPO}/scripts/ah2-mobile2.mjs`, PAPEL, String(w), rotulo], { cwd: REPO, encoding: 'utf8', timeout: 420000, maxBuffer: 40 * 1024 * 1024, env: { ...process.env, AH2_TETO_MS: '400000', AH2_PORT: String(PORTA + LARGURAS.indexOf(w) * N + i - 1), AH2_SESSAO: sessao } });
      decorrido = Math.round((Date.now() - t0) / 1000); status = r.status;
      try { j = JSON.parse(readFileSync(arte, 'utf8')); } catch { }
    }
    const bloqueada = (j?.bloqueadas || []).find((b) => b.largura === w);
    const b = j?.bandas?.[w];
    const estado = !j ? 'SEM_ARTEFACTO' : bloqueada ? 'BLOQUEADA' : !b ? 'NAO_CHEGOU' : b.pela_praga ? 'PRAGA' : eh_coerente(b) ? 'COERENTE' : 'OCAS';
    tentativas.push({ largura: w, processo: i, rotulo, decorrido_s: decorrido, exit: status, md5_shell: j?.md5_shell || null, ar_e_actual: j?.md5_shell === AR_MD5, estado, morreu_com_parcial: !!j?.em_parcial, motivo_morte: j?.INTERROMPIDA || null });
    console.log('  ' + w + 'px processo ' + i + ': ' + decorrido + ' s exit=' + (status === null ? 'reaproveitado' : status) + ' · ' + estado + (j?.em_parcial ? ' (parcial: ' + String(j.INTERROMPIDA).slice(0, 60) + ')' : ''));
  }
}
const por_largura = {};
for (const w of LARGURAS) {
  const st = tentativas.filter((t) => t.largura === w).map((t) => t.estado);
  const montou = st.filter((x) => x === 'COERENTE').length, bloq = st.filter((x) => x === 'BLOQUEADA').length;
  const outros = st.length - montou - bloq;
  // `MONTA_SEMPRE` só quando TODOS os processos chegaram e montaram; um `NAO_CHEGOU` (morte de instrumento,
  // renovação 504) não é prova de nada sobre a app, e contá-lo como «sempre» era a régua a sobre-afirmar.
  const veredicto = bloq && montou ? 'CORRIDAS' : bloq ? 'DETERMINISTA' : montou && !outros ? 'MONTA_SEMPRE' : montou ? 'MONTA_TODAS_AS_QUE_CHEGARAM' : outros ? 'NAO_CHEGOU_NENHUM' : 'NAO_MONTA_NENHUMA';
  por_largura[w] = { estados: st, processos: st.length, montou, bloqueadas: bloq, nao_chegaram: outros, veredicto };
  console.log('  ' + w + 'px: ' + st.join(' | ') + ' → ' + veredicto);
}
const saida = { programa: 'scripts/p73-repete-bloqueadas.mjs', em: new Date().toISOString(), papel: PAPEL, ar: { url: URL_APP, md5: AR_MD5 }, processos: N, uma_largura_por_processo: true, linha_do_predicado_no_condutor: linhaCoerencia, predicado: dsrc.split('\n')[linhaCoerencia - 1].trim(), tentativas, por_largura };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
// A linha de fecho era binária (CORRIDAS vs DETERMINISTA) e contradizia as linhas: um resultado todo
// MONTA_SEMPRE saía impresso como DETERMINISTA. Agora é o histograma medido dos veredictos.
const histo = {};
for (const w of LARGURAS) { const v = por_largura[w].veredicto; histo[v] = (histo[v] || 0) + 1; }
console.log('P73_REPETICAO_HISTOGRAMA ' + JSON.stringify(histo) + ' · registo ' + OUT);
