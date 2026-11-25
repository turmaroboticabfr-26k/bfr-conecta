// Prova, contra HEAD, que uma edicao no diario substitui UMA linha e acrescenta so depois dela.
// Uso: node scripts/p168-prova-de-edicao-sem-corte.mjs <caminho-da-captura>
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --fixtures
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --medir
// Cada portao tem fixture que o faz abortar; a guarda de sobrescrita exige sufixo novo.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const ALVO = process.argv[3] || 'docs/auditoria-bfr-conecta.md';
const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function analisa(headTexto, discoTexto, soMedir) {
  const H = headTexto.split('\n');
  const D = discoTexto.split('\n');
  let p = 0;
  while (p < H.length && p < D.length && H[p] === D[p]) p++;
  let s = 0;
  while (s < H.length - p && s < D.length - p && H[H.length - 1 - s] === D[D.length - 1 - s]) s++;
  const meioH = H.slice(p, H.length - s);
  const meioD = D.slice(p, D.length - s);
  const a = meioH.length === 1 ? meioH[0] : '';
  const b = meioD.length >= 1 ? meioD[0] : '';
  let comum = 0;
  while (comum < a.length && comum < b.length && a.charCodeAt(comum) === b.charCodeAt(comum)) comum++;
  const caudaOld = a.slice(comum);
  const caudaNew = b.slice(comum);
  const emHead = H.filter((l) => l.includes(caudaOld)).length;
  const emDisco = D.filter((l) => l.includes(caudaOld)).length;
  const linhas = [];
  const portoes = [];
  const chk = (nome, cond, obtido) => {
    portoes.push(nome + '=' + (cond ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(obtido));
    if (!cond && !soMedir) throw new Error('ABORTA ' + nome + ' nao se cumpre, obtido=' + JSON.stringify(obtido));
  };
  linhas.push('alvo=' + ALVO + ' repo=' + REPOReal);
  linhas.push('linhas_head=' + H.length + ' linhas_disco=' + D.length);
  linhas.push('bytes_head=' + Buffer.byteLength(headTexto, 'utf8') + ' bytes_disco=' + Buffer.byteLength(discoTexto, 'utf8') + ' delta_bytes=' + (Buffer.byteLength(discoTexto, 'utf8') - Buffer.byteLength(headTexto, 'utf8')));
  linhas.push('prefixo_identico_linhas=' + p + ' sufixo_identico_linhas=' + s);
  linhas.push('miolo_head_linhas=' + meioH.length + ' miolo_disco_linhas=' + meioD.length + ' linhas_acrescentadas=' + (meioD.length - 1));
  linhas.push('coluna_de_divergencia_na_linha_tocada=' + comum + ' bytes_da_cauda_substituida=' + Buffer.byteLength(caudaOld, 'utf8') + ' bytes_da_cauda_nova=' + Buffer.byteLength(caudaNew, 'utf8'));
  linhas.push('cauda_substituida_comeca_por=' + JSON.stringify(caudaOld.slice(0, 24)));
  linhas.push('frase_substituida_em_head_linhas=' + emHead + ' frase_substituida_em_disco_linhas=' + emDisco);
  const setD = new Set(D);
  linhas.push('MEDIDA_linhas_de_head_fora_da_tocada_que_nao_aparecem_no_disco=' + H.filter((l, i) => i !== p && !setD.has(l)).length + ' (medida, nao portao: um corte noutra linha faz o portao_1 abortar antes, por isso aqui nao ha positivo possivel)');
  chk('portao_1_uma_unica_linha_de_head_alterada', meioH.length === 1, meioH.length);
  chk('portao_2_acrescimo_depois_da_linha_tocada', meioD.length > 1, meioD.length);
  chk('portao_3_linha_tocada_mantem_cabeca_nao_vazia', comum > 0, comum);
  chk('portao_4_a_substituida_dentro_da_linha_nao_vazia', caudaOld.length > 0, Buffer.byteLength(caudaOld, 'utf8'));
  chk('portao_5_frase_substituida_unica_no_head', emHead === 1, emHead);
  chk('portao_6_frase_substituida_nao_sobrevive_no_disco', emDisco === 0, emDisco);
  return { linhas, portoes, indiceDaLinha: p + 1, acrescentadas: meioD.length - 1 };
}

function lePar() {
  const head = execFileSync('git', ['show', 'HEAD:' + ALVO], { cwd: REPOReal, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const disco = readFileSync(REPOReal + '/' + ALVO, 'utf8');
  return { head, disco };
}

if (process.argv.includes('--fixtures')) {
  const base = [];
  for (let i = 0; i < 40; i++) base.push('linha de corpo ' + i + ' ' + 'x'.repeat(200 + i));
  const velho = 'FRASE TOCADA ' + 'y'.repeat(140) + ' FINAL ' + 'z'.repeat(60);
  const corte = 120;
  const cauda = velho.slice(corte);
  const extraDe = (repete) => ['', 'SM.56. cabecalho do bloco acrescentado', 'item um do bloco', repete ? 'item dois ' + repete : 'item dois do bloco'];
  const headTxt = (e20) => base.map((l, i) => (i === 35 ? velho : (i === 20 && e20 ? l + ' ' + e20 : l))).join('\n');
  const discoTxt = (nova, o) => {
    const L = [];
    for (let i = 0; i < 40; i++) {
      if (i === 20 && o && o.e20) L.push(base[i] + ' ' + o.e20);
      else if (i === 35) {
        L.push(nova);
        if (!(o && o.semBloco)) L.push(...extraDe(o && o.repete));
      } else L.push(base[i]);
    }
    return L.join('\n');
  };
  const ok = velho.slice(0, corte) + ' SUBSTITUICAO DO RESTO DA FRASE.';
  const casos = [
    ['F1_positivo', headTxt(null), discoTxt(ok, null), false, '-'],
    ['F2_duas_linhas_alteradas', headTxt(null), discoTxt(ok, null).replace(base[10], base[10] + ' CORTE NO MEIO DO FICHEIRO'), true, 'portao_1'],
    ['F3_insercao_no_topo', headTxt(null), 'CABECALHO NOVO FORA DO LUGAR\n' + discoTxt(ok, null), true, 'portao_1'],
    ['F4_sem_acrescimo', headTxt(null), discoTxt(ok, { semBloco: true }), true, 'portao_2'],
    ['F5_linha_reescrita_desde_o_primeiro_byte', headTxt(null), discoTxt('W' + velho.slice(1), null), true, 'portao_3'],
    ['F6_acrescimo_puro_no_fim_da_linha', headTxt(null), discoTxt(velho + ' acrescimo puro no fim', null), true, 'portao_4'],
    ['F7_frase_antiga_duplicada_noutro_lugar', headTxt(cauda), discoTxt(ok, { e20: cauda }), true, 'portao_5'],
    ['F8_frase_antiga_preservada_dentro_do_bloco', headTxt(null), discoTxt(ok, { repete: cauda }), true, 'portao_6'],
  ];
  const saida = [];
  const veredictos = [];
  for (const [nome, h, d, esperaAborto, alvo] of casos) {
    let abortou = false;
    let msg = '';
    try { analisa(h, d, false); } catch (e) { abortou = true; msg = e.message; }
    const esperado = esperaAborto ? abortou && msg.includes(alvo) : !abortou;
    veredictos.push(esperado);
    saida.push(nome + ' abortou=' + abortou + ' esperava_aborto=' + esperaAborto + ' portao_alvo=' + alvo + ' veredicto=' + (esperado ? 'EXPERADO' : 'INESPERADO') + (abortou ? ' [' + msg + ']' : ''));
  }
  const nEsperados = veredictos.filter(Boolean).length;
  console.log(saida.join('\n'));
  console.log('FIXTURES total=' + casos.length + ' positivos=1 negativos=' + (casos.length - 1) + ' esperados=' + nEsperados + ' inesperados=' + veredictos.filter((v) => !v).length);
  if (nEsperados !== casos.length) throw new Error('ABORTA ' + nEsperados + ' de ' + casos.length + ' fixtures nao dao o veredicto esperado');
  console.log('P168_FIXTURES_OK');
  process.exit(0);
}

if (process.argv.includes('--tautologia')) {
  // O quarto portao da primeira versao comparava as duas caudas DERIVADAS do mesmo alinhamento maximo por sufixo.
  // Pergunta medida: ha par (H, D) em que essa igualdade dea falso? E o corte duma cauda passa por ela?
  function v1(H, D) {
    let p = 0;
    while (p < H.length && p < D.length && H[p] === D[p]) p++;
    let s = 0;
    while (s < H.length - p && s < D.length - p && H[H.length - 1 - s] === D[D.length - 1 - s]) s++;
    const meioH = H.slice(p, H.length - s);
    const meioD = D.slice(p, D.length - s);
    const a = meioH.length === 1 ? meioH[0] : '';
    const b = meioD.length >= 1 ? meioD[0] : '';
    let comum = 0;
    while (comum < a.length && comum < b.length && a.charCodeAt(comum) === b.charCodeAt(comum)) comum++;
    const g = [meioH.length === 1, meioD.length > 1, comum > 0, H.slice(p + meioH.length).join('\n') === D.slice(p + meioD.length).join('\n')];
    return { g, meioH: meioH.length, meioD: meioD.length, comum };
  }
  const legal = (k, cortaCauda) => {
    const n = 12 + (k % 20);
    const tocada = 1 + (k % (n - 2));
    const tamBloco = 1 + (k % 5);
    const H = [];
    for (let i = 0; i < n; i++) H.push('linha ' + i + ' ' + 'a'.repeat(50 + i * 3 + k));
    const D = [];
    for (let i = 0; i < n; i++) {
      if (i === tocada) {
        D.push(H[i].slice(0, 40) + ' SUBSTITUIDO ' + k);
        for (let j = 0; j < tamBloco; j++) D.push('bloco ' + k + ' ' + j);
        continue;
      }
      D.push(H[i]);
    }
    if (cortaCauda) D.splice(D.length - 1, 1);
    return { H, D };
  };
  const malformada = (k) => {
    const n = 6 + (k % 30);
    const tocada = 1 + (k * 7) % Math.max(1, n - 2);
    const H = [];
    for (let i = 0; i < n; i++) H.push('linha ' + i + ' ' + 'a'.repeat(10 + ((i * 3 + k) % 40)));
    const D = H.slice();
    D[tocada] = D[tocada] + ' tocada ' + k;
    const inserido = Array.from({ length: 1 + (k % 4) }, (_, i) => 'bloco ' + i);
    D.splice(Math.min(D.length, tocada + 1 + ((k * 11) % 5)), 0, ...inserido);
    if (k % 3 === 0) D.splice(D.length - 1, 1);
    if (k % 7 === 0) D[0] = D[0] + ' topo';
    if (k % 13 === 0) D.splice(2, 1);
    if (k % 19 === 0) D[D.length - 1] = D[D.length - 1] + ' cauda cortada';
    return { H, D };
  };
  const conta = (familia, mk) => {
    let atinge = 0;
    let falsos = 0;
    let cortadasPassamOsQuatro = 0;
    for (let k = 0; k < 240; k++) {
      const f = mk(k);
      const r = v1(f.H, f.D);
      if (r.g[0] && r.g[1] && r.g[2]) atinge++;
      if (!r.g[3]) falsos++;
      if (r.g.every(Boolean)) cortadasPassamOsQuatro++;
    }
    return { familia, total: 240, atinge, falsos, passamOsQuatro: cortadasPassamOsQuatro };
  };
  const espera = {
    legal: { atinge: 'todos', passamOsQuatro: 240, falsos: 0 },
    legal_com_corte_da_ultima_linha: { atinge: 0, passamOsQuatro: 0, falsos: 0 },
    malformada: { atinge: '>=1', passamOsQuatro: '<240', falsos: 0 },
  };
  const fs = [
    conta('legal', (k) => legal(k, false)),
    conta('legal_com_corte_da_ultima_linha', (k) => legal(k, true)),
    conta('malformada', malformada),
  ];
  const desc = [];
  for (const f of fs) {
    const e = espera[f.familia];
    const okAtinge = e.atinge === 'todos' ? f.atinge === f.total : e.atinge === '>=1' ? f.atinge >= 1 : f.atinge === e.atinge;
    const okPassam = e.passamOsQuatro === '<240' ? f.passamOsQuatro < 240 : f.passamOsQuatro === e.passamOsQuatro;
    const okFalsos = f.falsos === e.falsos;
    desc.push(f.familia + ': total=' + f.total + ' atinge_os_tres_primeiros=' + f.atinge + ' (esperado ' + e.atinge + ')' + ' quarto_portao_deu_falso=' + f.falsos + ' (esperado ' + e.falsos + ')' + ' passam_os_quatro=' + f.passamOsQuatro + ' (esperado ' + e.passamOsQuatro + ')' + ' veredicto=' + (okAtinge && okPassam && okFalsos ? 'CONFORME' : 'DIVERGENTE'));
    if (!(okAtinge && okPassam && okFalsos)) throw new Error('ABORTA a familia ' + f.familia + ' nao deu o esperado: atinge=' + f.atinge + ' falsos=' + f.falsos + ' passam=' + f.passamOsQuatro);
  }
  process.stdout.write(desc.join('\n') + '\n');
  const dominio = fs.reduce((a, f) => a + f.atinge, 0);
  if (dominio === 0) throw new Error('ABORTA denominador zero: nenhuma fabrica atinge os tres primeiros portoes, a medida do quarto portao nao fala de nada');
  const c = fs[1];
  process.stdout.write('P168_TAUTOLOGIA_MEDIDA o quarto portao deu falso em 0 de ' + fs.reduce((a, f) => a + f.total, 0) + ' fabricas e ' + dominio + ' delas atingem os tres primeiros portoes; na familia com a ultima linha apagada, que e um corte real, o quarto portao deu OK em ' + (c.total - c.falsos) + ' e passam os quatro ' + c.passamOsQuatro + ', porque e o primeiro portao que apanha o corte\n');
  process.exit(0);
}

if (process.argv.includes('--medir')) {
  const { head, disco } = lePar();
  const r = analisa(head, disco, true);
  console.log(r.linhas.join('\n'));
  console.log(r.portoes.join('\n'));
  console.log('P168_MEDICAO_SEM_ABORTO linha_unica_tocada_no_indice=' + r.indiceDaLinha);
  process.exit(0);
}

const destino = process.argv[2];
if (!destino || destino === ALVO) throw new Error('ABORTA: passe o caminho da captura como argv[2], antes do alvo opcional');
if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const { head, disco } = lePar();
const r = analisa(head, disco, false);
const corpo = r.linhas.join('\n') + '\n' + r.portoes.join('\n') + '\nP168_EDICAO_SEM_CORTE_OK linha_unica_tocada_no_indice=' + r.indiceDaLinha + ' linhas_acrescentadas=' + r.acrescentadas + '\n';
writeFileSync(destino, corpo, 'utf8');
process.stdout.write(corpo);
