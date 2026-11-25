// Prova, contra HEAD, que uma edicao no diario substitui UMA linha e acrescenta so depois dela.
// Uso: node scripts/p168-prova-de-edicao-sem-corte.mjs <caminho-da-captura>
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --fixtures
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --medir
//      node scripts/p168-prova-de-edicao-sem-corte.mjs <captura> --acrescimo --espera "<cabecalho esperado>"
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --portao-a3
// Duas classes de edicao, um predicado por classe, cada classe com fixture proprio: a substituicao duma linha e o
// acrescimo puro no fim do ficheiro. A classe de acrescimo exige a expectativa declarada, senao aborta antes de medir.
// O portao_A3 da classe de acrescimo foi escrito como o comprimento do prefixo comum ate ao fim do HEAD, que e o
// portao_A1 por outra forma; --portao-a3 mede as separacoes entre os dois e passa o A3 a exigir que a primeira
// linha nova com conteudo traga a expectativa, o unico eixo com positivo proprio, provado nas mesmas fabricas.
// Cada portao tem fixture que o faz abortar; a guarda de sobrescrita exige sufixo novo.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const ALVO = process.argv[3] || 'docs/auditoria-bfr-conecta.md';
const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const flagDe = (nome) => {
  const i = process.argv.indexOf(nome);
  return i < 0 ? null : process.argv[i + 1];
};
const CLASSE = process.argv.includes('--acrescimo') ? 'acrescimo_no_fim' : 'substituicao_de_uma_linha';
const ESPERA = flagDe('--espera');

function primeiraComConteudo(L) {
  const comConteudo = L.filter((l) => l.trim().length > 0);
  return comConteudo.length === 0 ? '' : comConteudo[0];
}

function analisa(headTexto, discoTexto, soMedir, opcao) {
  const classe = (opcao && opcao.classe) || CLASSE;
  const espera = opcao && Object.prototype.hasOwnProperty.call(opcao, 'espera') ? opcao.espera : ESPERA;
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
  if (classe === 'acrescimo_no_fim') {
    if (espera === null || espera === undefined) throw new Error('ABORTA: a classe de acrescimo exige a expectativa declarada, senao o verde nao tem o que medir');
    const novas = D.slice(H.length);
    linhas.push('classe_da_edicao=acrescimo_no_fim linhas_novas=' + novas.length + ' linhas_novas_sem_conteudo=' + (novas.length - novas.filter((l) => l.trim().length > 0).length) + ' primeira_linha_nova_com_conteudo=' + JSON.stringify(primeiraComConteudo(novas).slice(0, 40)));
    chk('portao_A1_todas_as_linhas_de_head_sao_o_comeco_exacto_do_disco', D.slice(0, H.length).join('\n') === H.join('\n'), { head: H.length, disco: D.length });
    chk('portao_A2_o_acrescimo_contem_a_expectativa_declarada', novas.some((l) => l.indexOf(espera) >= 0), { espera: espera, em_linhas: novas.filter((l) => l.indexOf(espera) >= 0).length });
    chk('portao_A3_a_primeira_linha_nova_com_conteudo_traz_a_expectativa', primeiraComConteudo(novas).indexOf(espera) >= 0, { primeira_com_conteudo: primeiraComConteudo(novas).slice(0, 60), espera: espera });
    return { linhas, portoes, indiceDaLinha: H.length, acrescentadas: novas.length, classe: classe };
  }
  linhas.push('classe_da_edicao=' + classe);
  linhas.push('MEDIDA_linhas_de_head_fora_da_tocada_que_nao_aparecem_no_disco=' + H.filter((l, i) => i !== p && !setD.has(l)).length + ' (medida, nao portao: um corte noutra linha faz o portao_1 abortar antes, por isso aqui nao ha positivo possivel)');
  chk('portao_1_uma_unica_linha_de_head_alterada', meioH.length === 1, meioH.length);
  chk('portao_2_acrescimo_depois_da_linha_tocada', meioD.length > 1, meioD.length);
  chk('portao_3_linha_tocada_mantem_cabeca_nao_vazia', comum > 0, comum);
  chk('portao_4_a_substituida_dentro_da_linha_nao_vazia', caudaOld.length > 0, Buffer.byteLength(caudaOld, 'utf8'));
  chk('portao_5_frase_substituida_unica_no_head', emHead === 1, emHead);
  chk('portao_6_frase_substituida_nao_sobrevive_no_disco', emDisco === 0, emDisco);
  return { linhas, portoes, indiceDaLinha: p + 1, acrescentadas: meioD.length - 1, classe: classe };
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
  const AC = { classe: 'acrescimo_no_fim', espera: 'SM.57. cabecalho do bloco' };
  const casos = [
    ['F1_positivo', headTxt(null), discoTxt(ok, null), false, '-'],
    ['F2_duas_linhas_alteradas', headTxt(null), discoTxt(ok, null).replace(base[10], base[10] + ' CORTE NO MEIO DO FICHEIRO'), true, 'portao_1'],
    ['F3_insercao_no_topo', headTxt(null), 'CABECALHO NOVO FORA DO LUGAR\n' + discoTxt(ok, null), true, 'portao_1'],
    ['F4_sem_acrescimo', headTxt(null), discoTxt(ok, { semBloco: true }), true, 'portao_2'],
    ['F5_linha_reescrita_desde_o_primeiro_byte', headTxt(null), discoTxt('W' + velho.slice(1), null), true, 'portao_3'],
    ['F6_acrescimo_puro_no_fim_da_linha', headTxt(null), discoTxt(velho + ' acrescimo puro no fim', null), true, 'portao_4'],
    ['F7_frase_antiga_duplicada_noutro_lugar', headTxt(cauda), discoTxt(ok, { e20: cauda }), true, 'portao_5'],
    ['F8_frase_antiga_preservada_dentro_do_bloco', headTxt(null), discoTxt(ok, { repete: cauda }), true, 'portao_6'],
    ['A1_positivo_acrescimo_no_fim', headTxt(null), headTxt(null) + '\nSM.57. cabecalho do bloco\nitem um do bloco', false, '-', AC],
    ['A2_mutacao_duma_linha_de_head_no_meio', headTxt(null), headTxt(null).replace(base[10], base[10] + ' CORTE') + '\nSM.57. cabecalho do bloco', true, 'portao_A1', AC],
    ['A3_sem_nenhuma_linha_nova', headTxt(null), headTxt(null), true, 'portao_A2', AC],
    ['A4_acrescimo_que_nao_traz_o_cabecalho_declarado', headTxt(null), headTxt(null) + '\nparagrafo sem titulo nenhum', true, 'portao_A2', AC],
    ['A5_apagar_a_ultima_linha_de_head_passa_por_acrescimo', headTxt(null), headTxt(null).split('\n').slice(0, 39).join('\n') + '\nSM.57. cabecalho do bloco', true, 'portao_A1', AC],
    ['A6_classe_sem_expectativa_declara_da_aborta_antes_de_medir', headTxt(null), headTxt(null) + '\nSM.57. cabecalho do bloco', true, 'ABORTA: a classe de acrescimo exige', { classe: 'acrescimo_no_fim', espera: null }],
    ['A7_positivo_com_linhas_em_branco_antes_do_cabecalho', headTxt(null), headTxt(null) + '\n\n\nSM.57. cabecalho do bloco\nitem um do bloco', false, '-', AC],
    ['A8_linha_com_conteudo_antes_do_cabecalho_declarado', headTxt(null), headTxt(null) + '\nparagrafo solto\nSM.57. cabecalho do bloco', true, 'portao_A3', AC],
  ];
  const saida = [];
  const veredictos = [];
  for (const [nome, h, d, esperaAborto, alvo, opcao] of casos) {
    let abortou = false;
    let msg = '';
    try { analisa(h, d, false, opcao || { classe: 'substituicao_de_uma_linha', espera: null }); } catch (e) { abortou = true; msg = e.message; }
    const esperado = esperaAborto ? abortou && msg.includes(alvo) : !abortou;
    veredictos.push(esperado);
    saida.push(nome + ' abortou=' + abortou + ' esperava_aborto=' + esperaAborto + ' portao_alvo=' + alvo + ' veredicto=' + (esperado ? 'EXPERADO' : 'INESPERADO') + (abortou ? ' [' + msg + ']' : ''));
  }
  const nEsperados = veredictos.filter(Boolean).length;
  const nPositivos = casos.filter((c) => !c[3]).length;
  console.log(saida.join('\n'));
  console.log('FIXTURES total=' + casos.length + ' positivos=' + nPositivos + ' negativos=' + (casos.length - nPositivos) + ' esperados=' + nEsperados + ' inesperados=' + veredictos.filter((v) => !v).length);
  if (nEsperados !== casos.length) throw new Error('ABORTA ' + nEsperados + ' de ' + casos.length + ' fixtures nao dao o veredicto esperado');
  console.log('P168_FIXTURES_OK');
  process.exit(0);
}

if (process.argv.includes('--portao-a3')) {
  const CAB = 'SM.57. cabecalho do bloco';
  const total = 240;
  const A1 = (H, D) => D.slice(0, H.length).join('\n') === H.join('\n');
  const A2 = (H, D) => D.slice(H.length).some((l) => l.indexOf(CAB) >= 0);
  const A3 = (H, D) => {
    const novas = D.slice(H.length);
    let primeira = '';
    for (let i = 0; i < novas.length; i++) { if (novas[i].trim().length > 0) { primeira = novas[i]; break; } }
    return primeira.indexOf(CAB) >= 0;
  };
  const antigoA3 = (H, D) => {
    let p = 0;
    while (p < H.length && p < D.length && H[p] === D[p]) p++;
    return p === H.length;
  };
  const fabrica = (k) => {
    const n = 8 + (k % 15);
    const H = [];
    for (let i = 0; i < n; i++) H.push('linha ' + i + ' ' + 'a'.repeat(30 + i + (k % 7)));
    const r = k % 5;
    if (r === 0) return { H, D: H.concat(['', '', CAB, 'item um do bloco']) };
    if (r === 1) return { H, D: H.concat(['', 'paragrafo solto antes do cabecalho', CAB]) };
    if (r === 2) { const D = H.slice(); D[1] = D[1] + ' TOCADA'; return { H, D: D.concat(['', CAB]) }; }
    if (r === 3) return { H, D: H.concat(['', 'paragrafo sem titulo nenhum']) };
    return { H, D: H.slice(0, H.length - 1) };
  };
  const NOMES = ['acrescimo_apos_duas_linhas_em_branco', 'linha_solta_antes_do_cabecalho', 'linha_de_head_tocada', 'acrescimo_sem_cabecalho', 'head_truncado_sem_acrescimo'];
  let separacoesDoAntigoA3 = 0, falhasDoAntigoA3 = 0, atingemA1eA2 = 0, falhamNoNovoA3 = 0, passamOsTres = 0;
  const porClasse = {};
  for (let k = 0; k < total; k++) {
    const f = fabrica(k);
    const a1 = A1(f.H, f.D), a2 = A2(f.H, f.D), a3 = A3(f.H, f.D), anti = antigoA3(f.H, f.D);
    if (a1 !== anti) separacoesDoAntigoA3++;
    if (a1 && !anti) falhasDoAntigoA3++;
    if (a1 && a2) {
      atingemA1eA2++;
      if (!a3) falhamNoNovoA3++;
    }
    if (a1 && a2 && a3) passamOsTres++;
    const nome = NOMES[k % 5];
    const c = porClasse[nome] || (porClasse[nome] = { total: 0, A1: 0, antigo_A3: 0, A2: 0, novo_A3: 0, separacoes: 0 });
    c.total++;
    if (a1) c.A1++;
    if (anti) c.antigo_A3++;
    if (a2) c.A2++;
    if (a3) c.novo_A3++;
    if (a1 !== anti) c.separacoes++;
  }
  const linhas = [
    'total_fabricas=' + total,
    'o_antigo_A3_separa_se_do_A1_em=' + separacoesDoAntigoA3,
    'o_antigo_A3_falha_onde_o_A1_da_OK=' + falhasDoAntigoA3,
    'atingem_A1_e_A2=' + atingemA1eA2,
    'falham_no_novo_A3_atingindo_A1_e_A2=' + falhamNoNovoA3,
    'passam_os_tres=' + passamOsTres,
    'POR_CLASSE=' + JSON.stringify(porClasse),
  ];
  if (separacoesDoAntigoA3 !== 0) throw new Error('ABORTA o antigo portao_A3 separa-se do A1 em ' + separacoesDoAntigoA3 + ' de ' + total + ' fabricas, portanto tinha positivo proprio e nao era reposicao do A1');
  if (atingemA1eA2 === 0) throw new Error('ABORTA denominador zero: nenhuma fabrica atinge A1 e A2, a medida do novo A3 nao fala de nada');
  if (falhamNoNovoA3 === 0) throw new Error('ABORTA o novo portao_A3 nunca falha com A1 e A2 ambos OK, e por isso nao mede nada que os dois ja nao meçam');
  if (passamOsTres === 0) throw new Error('ABORTA o novo portao_A3 nunca da OK, nao tem positivo');
  process.stdout.write(linhas.join('\n') + '\n');
  process.stdout.write('P168_PORTAO_A3_MEDIDA separacoes_do_antigo_A3_contra_o_A1=' + separacoesDoAntigoA3 + ' de ' + total + ' fabricas, que e a medida de que os dois portoes sao o mesmo; o A3 novo passa em ' + passamOsTres + ' e aborta noutras ' + falhamNoNovoA3 + ', todas com A1 e A2 ja OK\n');
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
const corpo = r.linhas.join('\n') + '\n' + r.portoes.join('\n') + '\nP168_EDICAO_SEM_CORTE_OK classe=' + r.classe +
  (r.classe === 'acrescimo_no_fim' ? ' linhas_no_fim_do_ficheiro=' : ' linha_unica_tocada_no_indice=') + r.indiceDaLinha +
  ' linhas_acrescentadas=' + r.acrescentadas + '\n';
writeFileSync(destino, corpo, 'utf8');
process.stdout.write(corpo);
