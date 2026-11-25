#!/usr/bin/env node
// P180 — a janela do denominador do p125: o que se mexeu ENTRE dois registos, por mtime medido e nao por hipotese.
//
// Existe porque o `varridos` do `p125` e medicao do instante e move-se por dois motivos diferentes, que o §SM.69(3)
// separou por medida: um caminho novo que fica nao-versionado, e um `git add` que tira caminhos do conjunto
// nao-versionado. Sem esta peca, os deltas citados em prosa (581 para 598, 598 para 603) eram alegacoes minhas — a
// falta que o §SM.69(7)(d) confessa. A peca le os dois registos, extrai o template do nome da fonte do produtor
// (aborta se nao o ler), e particiona a janela aberta pelos dois carimbos `em` nas duas classes de caminho.
//
// Uso: node scripts/p180-janela-do-denominador-do-p125.cjs <sufixoA> <sufixoB> [--captura <fora-do-repo>]
//      node scripts/p180-janela-do-denominador-do-p125.cjs --selfteste
// Zero escrita no banco, zero rede, zero deploy; o unico ficheiro que escreve e a captura, so com nomes, numeros e
// carimbos — nunca conteudo de ficheiro algum.
// Os dois RegExp de leitura da fonte do produtor sao compostos com `new RegExp`, e nao por literal: a primeira
// versao desta peca perdeu a barra dos flags num literal com `$` mesmo antes deles e partiu no `--check`.
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PRODUTOR = 'scripts/p125-portadores-fora-do-indice.mjs';
const ESTA_PECA = 'scripts/p180-janela-do-denominador-do-p125.cjs';
const argv = process.argv.slice(2);

function templateDoProdutor() {
  const fonte = readFileSync(join(REPO, PRODUTOR), 'utf8');
  const linha = new RegExp('^const OUT = join\\(REPO, `([^`]+)`\\);$', 'm').exec(fonte);
  if (!linha) throw new Error('ABORTA: nao li o template do registo na fonte do produtor -- ' + PRODUTOR + ':const OUT');
  const varSuf = new RegExp("^const SUF = process\\.env\\.([A-Z0-9_]+) \\? '-' \\+ process\\.env\\.\\1 : '';$", 'm').exec(fonte);
  if (!varSuf) throw new Error('ABORTA: nao li a variavel de sufixo na fonte do produtor -- ' + PRODUTOR + ':const SUF');
  return { template: linha[1], env: varSuf[1] };
}
function caminhoDoRegisto(tmpl, sufixo) {
  return join(REPO, tmpl.template.replace('${SUF}', '-' + sufixo));
}
function leRegisto(tmpl, sufixo) {
  const p = caminhoDoRegisto(tmpl, sufixo);
  if (!existsSync(p)) throw new Error('ABORTA: registo nao existe -- ' + p);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  if (typeof j.em !== 'string' || Number.isNaN(Date.parse(j.em))) throw new Error('ABORTA: registo sem `em` legivel -- ' + p);
  const c = j.contagens || {};
  for (const campo of ['varridos', 'nao_versionados', 'modificados', 'no_indice']) {
    if (typeof c[campo] !== 'number') throw new Error('ABORTA: registo sem `contagens.' + campo + '` -- ' + p);
  }
  return { caminho: p, em: j.em, contagens: c };
}

// Fronteiras: estritamente depois do carimbo A e ate ao carimbo B inclusive — B e o instante em que o portao conta.
function janela(paresComMtime, t0, t1) {
  return paresComMtime.filter((o) => o.m > t0 && o.m <= t1).map((o) => o.p);
}

// Portoes como funcao pura, para os fixtures poderem disparar os ramos vermelhos sem git nem disco.
function portoesDe(r) {
  const p = [];
  p.push({
    nome: 'os_dois_registos_foram_lidos_com_em_e_as_quatro_contagens',
    ok: !!(r.a && r.b && r.a.em_lido && r.b.em_lido && r.b.contagens_lidas),
    obtido: { em_a: r.a ? r.a.em : null, em_b: r.b ? r.b.em : null },
  });
  p.push({
    nome: 'em_ambos_os_registos_varridos_bate_com_nao_versionados_mais_modificados',
    ok: r.contas_batem_em_a && r.contas_batem_em_b,
    obtido: { batem_a: r.contas_batem_em_a, batem_b: r.contas_batem_em_b },
  });
  p.push({
    nome: 'com_o_indice_parado_o_delta_de_nao_versionados_bate_com_a_janela_dos_nao_versionados',
    ok: r.delta_no_indice !== 0 || r.delta_nao_versionados === r.janela_nao_versionados,
    obtido: { delta_no_indice: r.delta_no_indice, delta_nao_versionados: r.delta_nao_versionados, janela_nao_versionados: r.janela_nao_versionados },
  });
  p.push({
    nome: 'quando_o_indice_se_mexeu_a_classe_da_janela_versionada_e_impressa',
    ok: r.delta_no_indice === 0 || (r.janela_versionados_impressa === true && r.janela_versionados === r.janela_versionados_declarado),
    obtido: { delta_no_indice: r.delta_no_indice, janela_versionados: r.janela_versionados, impressa: r.janela_versionados_impressa === true },
  });
  p.push({
    nome: 'a_janela_vazia_tem_marcador_e_a_janela_cheia_tem_lista',
    ok: r.janela_nao_versionados + r.janela_versionados > 0 ? r.lista_impressa === true : r.marcador_vazio_impresso === true,
    obtido: { janela_nao_versionados: r.janela_nao_versionados, janela_versionados: r.janela_versionados, lista_impressa: r.lista_impressa === true, marcador_vazio_impresso: r.marcador_vazio_impresso === true },
  });
  return p;
}

function contasBatem(c) { return c.varridos === c.nao_versionados + c.modificados; }
function registoFake(em, varridos, naoVer, mods, noIndice) {
  return { em, em_lido: true, contagens_lidas: true, contagens: { varridos, nao_versionados: naoVer, modificados: mods, no_indice: noIndice } };
}

function selfteste() {
  const base = {
    a: registoFake('2026-11-25T00:00:00.000Z', 102, 100, 2, 500),
    b: registoFake('2026-11-25T01:00:00.000Z', 105, 103, 2, 500),
    contas_batem_em_a: true, contas_batem_em_b: true,
    delta_no_indice: 0, delta_nao_versionados: 3, janela_nao_versionados: 3,
    janela_versionados: 0, janela_versionados_impressa: false, janela_versionados_declarado: 0,
    lista_impressa: true, marcador_vazio_impresso: false,
  };
  const casos = [];
  casos.push({ nome: 'positivo_tres_para_tres_com_indice_parado', espera: 'VERDE', r: { ...base } });
  casos.push({ nome: 'janela_a_mais_com_indice_parado', espera: 'VERMELHO', r: { ...base, janela_nao_versionados: 4 } });
  casos.push({ nome: 'janela_a_menos_com_indice_parado', espera: 'VERMELHO', r: { ...base, janela_nao_versionados: 2 } });
  casos.push({ nome: 'contas_do_registo_nao_batem', espera: 'VERMELHO', r: { ...base, b: registoFake(base.b.em, 105, 100, 2, 500), contas_batem_em_b: contasBatem({ varridos: 105, nao_versionados: 100, modificados: 2 }) } });
  casos.push({ nome: 'registo_sem_em', espera: 'VERMELHO', r: { ...base, b: { ...base.b, em: null, em_lido: false } } });
  // O indice mexeu-se: a igualdade simples nao vale e o que se exige e a classe da janela versionada impressa.
  const mexido = { ...base, delta_no_indice: 2, delta_nao_versionados: 0, janela_nao_versionados: 1, janela_versionados: 2, janela_versionados_impressa: true, janela_versionados_declarado: 2, lista_impressa: true };
  casos.push({ nome: 'indice_mexido_com_classe_impressa', espera: 'VERDE', r: mexido });
  casos.push({ nome: 'indice_mexido_sem_classe_impressa', espera: 'VERMELHO', r: { ...mexido, janela_versionados_impressa: false } });
  casos.push({ nome: 'indice_mexido_com_classe_declarada_errada', espera: 'VERMELHO', r: { ...mexido, janela_versionados_declarado: 3 } });
  casos.push({ nome: 'janela_vazia_com_marcador', espera: 'VERDE', r: { ...base, delta_nao_versionados: 0, janela_nao_versionados: 0, lista_impressa: false, marcador_vazio_impresso: true } });
  casos.push({ nome: 'janela_vazia_sem_marcador', espera: 'VERMELHO', r: { ...base, delta_nao_versionados: 0, janela_nao_versionados: 0, lista_impressa: false, marcador_vazio_impresso: false } });
  const t0 = Date.parse(base.a.em), t1 = Date.parse(base.b.em);
  const pares = [{ p: 'em_t0', m: t0 }, { p: 'um_ms_depois_de_t0', m: t0 + 1 }, { p: 'em_t1', m: t1 }, { p: 'depois_de_t1', m: t1 + 1 }, { p: 'antes_de_t0', m: t0 - 1 }];
  const dentro = janela(pares, t0, t1);
  let falhas = 0;
  for (const c of casos) {
    const rs = portoesDe(c.r);
    const vermelhos = rs.filter((x) => !x.ok).map((x) => x.nome);
    const deu = c.espera === 'VERDE' ? vermelhos.length === 0 : vermelhos.length > 0;
    if (!deu) { console.log('  FALHA_ESPERA ' + c.nome + ' esperava=' + c.espera + ' vermelhos=' + JSON.stringify(vermelhos)); falhas++; }
  }
  if (dentro.join(',') !== 'um_ms_depois_de_t0,em_t1') { console.log('  FALHA_FRONT dentro=' + JSON.stringify(dentro)); falhas++; }
  else console.log('  FRONT_OK t0_exclusivo_t1_inclusivo dentro=' + JSON.stringify(dentro));
  console.log('P180_SELFTESTE ' + (casos.length + 1) + ' casos · ' + falhas + ' faltas');
  if (falhas) throw new Error('ABORTA selfteste com faltas');
}

const idxSelf = argv.indexOf('--selfteste');
if (idxSelf >= 0) selfteste();
else {
  const [sufA, sufB] = argv;
  if (!sufA || !sufB) throw new Error('ABORTA: uso --selfteste ou <sufixoA> <sufixoB> [--captura <caminho>]');
  const tmpl = templateDoProdutor();
  const ra = leRegisto(tmpl, sufA), rb = leRegisto(tmpl, sufB);
  const t0 = Date.parse(ra.em), t1 = Date.parse(rb.em);
  if (!(t1 > t0)) throw new Error('ABORTA: o carimbo B nao e posterior ao A -- ' + ra.em + ' / ' + rb.em);
  const lista = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean);
  const comMtime = (ps) => ps.map((p) => { const f = join(REPO, p); return existsSync(f) ? { p, m: statSync(f).mtimeMs } : null; }).filter(Boolean);
  const naoVer = comMtime(lista(['ls-files', '--others', '--exclude-standard']));
  const ver = comMtime(lista(['ls-files', '--cached']));
  const dentroNaoVer = janela(naoVer, t0, t1);
  const dentroVer = janela(ver, t0, t1);
  const dNV = rb.contagens.nao_versionados - ra.contagens.nao_versionados;
  const dNI = rb.contagens.no_indice - ra.contagens.no_indice;
  const dV = rb.contagens.varridos - ra.contagens.varridos;
  const dMod = rb.contagens.modificados - ra.contagens.modificados;
  console.log('JANELA ' + sufA + ' -> ' + sufB + ' em_a=' + ra.em + ' em_b=' + rb.em);
  console.log('CONTAS a=' + JSON.stringify(ra.contagens) + ' b=' + JSON.stringify(rb.contagens));
  console.log('DELTA varridos=' + dV + ' nao_versionados=' + dNV + ' modificados=' + dMod + ' no_indice=' + dNI);
  const total = dentroNaoVer.length + dentroVer.length;
  if (total === 0) console.log('JANELA_VAZIA 0 caminhos com mtime na janela nas duas classes');
  dentroNaoVer.forEach((p, i) => console.log('  JanelaNAOVER ' + (i + 1) + '/' + dentroNaoVer.length + ' ' + p));
  if (dNI !== 0) console.log('JANELA_VERSIONADOS_DECLARADO=' + dentroVer.length);
  dentroVer.forEach((p, i) => console.log('  JanelaVER ' + (i + 1) + '/' + dentroVer.length + ' ' + p));
  const r = {
    a: { ...ra, em_lido: true }, b: { ...rb, em_lido: true, contagens_lidas: true },
    contas_batem_em_a: contasBatem(ra.contagens), contas_batem_em_b: contasBatem(rb.contagens),
    delta_no_indice: dNI, delta_nao_versionados: dNV,
    janela_nao_versionados: dentroNaoVer.length,
    janela_versionados: dentroVer.length,
    janela_versionados_impressa: dNI === 0 ? false : dentroVer.length >= 0,
    janela_versionados_declarado: dentroVer.length,
    lista_impressa: total > 0, marcador_vazio_impresso: total === 0,
  };
  const rs = portoesDe(r);
  let falhas = 0;
  for (const x of rs) { if (!x.ok) falhas++; console.log('PORTAO ' + x.nome + ' = ' + (x.ok ? 'VERDE' : 'VERMELHO') + ' ' + JSON.stringify(x.obtido)); }
  const corpo = readFileSync(join(REPO, ESTA_PECA));
  const registo = {
    o_que_prova: 'que, com o indice parado entre os dois registos do p125, o delta de `nao_versionados` e exactamente o numero de caminhos nao-versionados com mtime na janela aberta pelos dois carimbos `em`; e que, mexendo-se o indice, a corrida nomeia e conta a classe dos caminhos versionados na mesma janela',
    o_que_NAO_prova: 'que mtime seja data de entrada no indice — um caminho editado antes da janela e `git add` dentro dela nao e visto, e um caminho apagado dentro da janela desaparece das duas listas; prova contagens do instante, nao a historia do indice',
    sufixos: [sufA, sufB], em_a: ra.em, em_b: rb.em,
    contagens_a: ra.contagens, contagens_b: rb.contagens,
    delta_varridos: dV, delta_nao_versionados: dNV, delta_modificados: dMod, delta_no_indice: dNI,
    janela_nao_versionados: dentroNaoVer, janela_versionados: dentroVer,
    emissor_bytes: corpo.length,
    emissor_md5: createHash('md5').update(corpo).digest('hex'),
    portoes: rs.map((x) => ({ nome: x.nome, ok: x.ok })),
  };
  const iCap = argv.indexOf('--captura');
  if (iCap >= 0) {
    const destino = argv[iCap + 1];
    if (!destino || destino.startsWith(REPO)) throw new Error('ABORTA: passe uma captura fora do repo -- ' + destino);
    if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino);
    writeFileSync(destino, JSON.stringify(registo, null, 1), 'utf8');
    console.log('P180_CAPTURE ' + destino);
  }
  console.log('P180_JANELA_' + (falhas ? 'VERMELHO ' : 'OK ') + rs.length + '/' + falhas + ' · ' + sufA + '-' + sufB + ' · janela_nao_ver=' + dentroNaoVer.length + ' janela_ver=' + dentroVer.length);
  if (falhas) throw new Error('ABORTA portoes_vermelhos=' + JSON.stringify(rs.filter((x) => !x.ok).map((x) => x.nome)));
}
