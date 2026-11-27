// Instrumento da FORMA dos indices de memoria: saldos de parentesis, colchetes e chavetas por linha,
// backticks a pares, e espacos duplos dentro ou fora dos spans de backtick.
// Porque esta peca existe: o fecho do SM.86 registou a classe sem regua - um parentesis pendurado na linha
// do SM.85 sobreviveu a tres rondas porque nem o p181 (apontadores, ordem, janela) nem o p173 (familias de
// escrita por codepoint) julgam a forma da linha. O SM.86 teve de contar a mao, numa peca de sessao sem
// fixture negativo. Isso passa a ser regua versionada, com os dois sentidos exercidos.
// A regra que governa tudo aqui: os spans de backtick sao retirados ANTES de contar. Medido no SM.85:
// contar o ficheiro inteiro deu 64 candidatos onde a retirada dava 14, e as pegadas do defeito vivem nos spans.
// Uso: node scripts/p199-forma-do-indice-de-memoria.mjs                     (mede os dois indices e julga)
//      node scripts/p199-forma-do-indice-de-memoria.mjs --selfteste          (fixtures: positivo, negativo, classe legitima)
//      o --selfteste le tambem um ficheiro partido escrito em tmpdir, para que o caminho do disco e o nome da
//      linha ofensora sejam provados fim-a-fim e nao so nas funcoes de memoria.
// Registo: evidence/p199-forma-do-indice-de-memoria-<P199_SUF>.json, com sufixo obrigatorio por env;
// aborta se o nome ja existe, porque sobrescrever apagaria a corrida que a prosa cita.
// Toda esta peca e escrita em ASCII: a familia de corruptela letra-para-glifo ja me partiu dois ficheiros longos.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SUF = process.env.P199_SUF;
const SELFTESTE = process.argv.indexOf('--selfteste') >= 0;
const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const md5 = (t) => createHash('md5').update(t, 'utf8').digest('hex');

const INDICES = [
  'C:/Users/pcmac/.qoder/projects/C--Users-pcmac-Documents-Qoder-2026-11-15-2e9c4296/memory/MEMORY.md',
  'C:/Users/pcmac/.qoder/memory/MEMORY.md',
];
const PARES = { par: ['(', ')'], colchete: ['[', ']'], chaveta: ['{', '}'] };
const OUT = REPO + '/evidence/p199-forma-do-indice-de-memoria-' + SUF + '.json';

function spansDaLinha(l) {
  const out = [];
  const re = /`[^`]*`/g;
  let m;
  while ((m = re.exec(l)) !== null) { out.push([m.index, m.index + m[0].length]); if (m.index === re.lastIndex) re.lastIndex++; }
  return out;
}
function semSpans(l, fillspace) {
  const sp = spansDaLinha(l);
  let s = '';
  let cur = 0;
  for (const a of sp) { s += l.slice(cur, a[0]); s += fillspace.repeat(a[1] - a[0]); cur = a[1]; }
  return s + l.slice(cur);
}
function dentroDeSpan(sp, col) { return sp.some((a) => col >= a[0] && col < a[1]); }

function saldo(l, abre, fecha) {
  const pilha = [];
  let maus = [];
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === abre) pilha.push(i);
    else if (c === fecha) { if (pilha.length === 0) maus.push({ tipo: 'fecho_sem_abertura', coluna: i + 1 }); else pilha.pop(); }
  }
  for (const p of pilha) maus.push({ tipo: 'abertura_sem_fecho', coluna: p + 1 });
  return maus;
}

function medeLinha(l) {
  const sp = spansDaLinha(l);
  const fora = semSpans(l, ' ');
  const r = { backticks: (l.match(/`/g) || []).length, espacos_duplos_fora: [], espacos_duplos_dentro: [], saldos: {} };
  const reD = / {2,}/g;
  let m;
  while ((m = reD.exec(l)) !== null) {
    const alvo = dentroDeSpan(sp, m.index) ? r.espacos_duplos_dentro : r.espacos_duplos_fora;
    alvo.push({ coluna: m.index + 1, comprimento: m[0].length, contexto: l.slice(Math.max(0, m.index - 24), m.index + 28) });
    if (m.index === reD.lastIndex) reD.lastIndex++;
  }
  for (const nome of Object.keys(PARES)) {
    const par = PARES[nome];
    const soSpans = spansDaLinha(l).map((a) => l.slice(a[0], a[1])).join(' ');
    r.saldos[nome] = { fora: saldo(fora, par[0], par[1]), dentro: saldo(soSpans, par[0], par[1]).length, abertos_fora: fora.split(par[0]).length - 1, fechados_fora: fora.split(par[1]).length - 1 };
  }
  return r;
}

function medeTexto(txt, alvo) {
  if (txt.trim() === '') throw new Error('ABORTA: ' + alvo + ' nao tem uma linha com texto; o verde dum indice vazio seria o verde de nada julgada');
  const linhas = txt.split('\n');
  const bruto = {};
  for (const nome of Object.keys(PARES)) {
    const par = PARES[nome];
    bruto[nome] = { abertos: txt.split(par[0]).length - 1, fechados: txt.split(par[1]).length - 1 };
  }
  const julgadas = [];
  for (let i = 0; i < linhas.length; i++) julgadas.push(Object.assign({ linha: i + 1, verbete: linhas[i].indexOf('- [') === 0 }, medeLinha(linhas[i])));
  return {
    alvo: alvo,
    bytes: Buffer.byteLength(txt, 'utf8'),
    bytes_md5_8: md5(txt).slice(0, 8),
    linhas: linhas.length,
    linhas_julgadas: julgadas.length,
    bruto: bruto,
    linhas_de_verbete: julgadas.filter((x) => x.verbete).length,
    backticks_impares: julgadas.filter((x) => x.backticks % 2 === 1).map((x) => ({ linha: x.linha, backticks: x.backticks })),
    julgadas: julgadas,
  };
}

function medeFicheiro(p) {
  if (!existsSync(p)) throw new Error('ABORTA: o indice declarado nao resolve em disco: ' + p);
  return medeTexto(readFileSync(p, 'utf8'), p);
}

function agregado(m) {
  const foraDosSpans = (nome) => m.julgadas.filter((x) => x.saldos[nome].fora.length > 0).map((x) => ({ linha: x.linha, posicoes: x.saldos[nome].fora }));
  const duplosFora = m.julgadas.reduce((s, x) => s + x.espacos_duplos_fora.length, 0);
  const duplosDentro = m.julgadas.reduce((s, x) => s + x.espacos_duplos_dentro.length, 0);
  return {
    alvo: m.alvo,
    bytes: m.bytes,
    bytes_md5_8: m.bytes_md5_8,
    linhas: m.linhas,
    linhas_julgadas: m.linhas_julgadas,
    linhas_de_verbete: m.linhas_de_verbete,
    bruto: m.bruto,
    parenteses_fora_dos_spans: foraDosSpans('par'),
    colchetes_fora_dos_spans: foraDosSpans('colchete'),
    chavetas_fora_dos_spans: foraDosSpans('chaveta'),
    backticks_impares: m.backticks_impares,
    espacos_duplos_fora_dos_spans: m.julgadas.filter((x) => x.espacos_duplos_fora.length > 0).map((x) => ({ linha: x.linha, posicoes: x.espacos_duplos_fora })),
    soltos_dentro_dos_spans: m.julgadas.filter((x) => Object.keys(x.saldos).some((k) => x.saldos[k].dentro > 0)).map((x) => ({ linha: x.linha, par: x.saldos.par.dentro, colchete: x.saldos.colchete.dentro, chaveta: x.saldos.chaveta.dentro })),
    total_espacos_duplos_fora: duplosFora,
    total_espacos_duplos_dentro: duplosDentro,
  };
}

function porta(nome, ok, obtido) { return { nome: nome, ok: ok, obtido: obtido }; }

function julga(agregados) {
  const soma = (chave) => agregados.reduce((s, a) => s + a[chave].length, 0);
  const julgadasIguais = agregados.every((a) => a.linhas_julgadas === a.linhas && a.linhas >= 1);
  return [
    porta('C1_parenteses_equilibrados_fora_dos_spans_em_cada_linha', soma('parenteses_fora_dos_spans') === 0, agregados.map((a) => a.parenteses_fora_dos_spans.map((x) => x.linha))),
    porta('C2_colchetes_equilibrados_fora_dos_spans_em_cada_linha', soma('colchetes_fora_dos_spans') === 0, agregados.map((a) => a.colchetes_fora_dos_spans.map((x) => x.linha))),
    porta('C3_chavetas_equilibradas_fora_dos_spans_em_cada_linha', soma('chavetas_fora_dos_spans') === 0, agregados.map((a) => a.chavetas_fora_dos_spans.map((x) => x.linha))),
    porta('C4_backticks_a_pares_em_cada_linha', soma('backticks_impares') === 0, agregados.map((a) => a.backticks_impares.map((x) => x.linha))),
    porta('C5_nenhum_espaco_duplo_fora_dos_spans', agregados.reduce((s, a) => s + a.total_espacos_duplos_fora, 0) === 0, agregados.map((a) => ({ fora: a.total_espacos_duplos_fora, dentro: a.total_espacos_duplos_dentro }))),
    porta('C6_todas_as_linhas_foram_julgadas_e_o_corpus_nao_e_vazio', julgadasIguais, agregados.map((a) => a.linhas_julgadas + '/' + a.linhas)),
  ];
}

function fixtures() {
  const casos = [];
  const push = (nome, fn) => casos.push({ nome: nome, fn: fn });
  const L = (t) => medeLinha(t);
  push('positivo_parentesis_aberto_sem_fecho_fora_dos_spans', () => L('- [Titulo](a.md) - fecho (aberto sem terminar').saldos.par.fora.length === 1);
  push('negativo_parentesis_equilibrado', () => L('- [Titulo (com nada)](a.md) - prosa (equilibrio)').saldos.par.fora.length === 0);
  push('classe_legitima_parentesis_solto_dentro_dum_span_nao_e_membro', () => { const r = L('o portao disse `obtido=( 3` e ficou verde'); return r.saldos.par.fora.length === 0; });
  push('positivo_backtick_impar_na_linha', () => L('tres `spans `abertos ` e um sobra').backticks % 2 === 1);
  push('negativo_backtick_par', () => L('dois `spans` apenas').backticks === 2);
  push('positivo_espaco_duplo_fora_do_span_localizado_com_coluna', () => { const r = L('aqui  ha dois espacos'); return r.espacos_duplos_fora.length === 1 && r.espacos_duplos_fora[0].coluna === 5; });
  push('classe_legitima_espaco_duplo_dentro_do_span_nao_e_membro', () => { const r = L('a saida `edee9a5..637d417  main -> main` e literal'); return r.espacos_duplos_fora.length === 0 && r.espacos_duplos_dentro.length === 1; });
  push('tres_ocorrencias_dao_tres_posicoes_distintas_e_nao_a_primeira', () => { const r = L('um  dois  tres  quatro'); return r.espacos_duplos_fora.length === 3 && new Set(r.espacos_duplos_fora.map((x) => x.coluna)).size === 3; });
  push('saldo_posicional_abertura_sem_fecho_e_a_primeira_solteira', () => { const r = L('(( )'); return r.saldos.par.fora.length === 1 && r.saldos.par.fora[0].tipo === 'abertura_sem_fecho' && r.saldos.par.fora[0].coluna === 1; });
  push('saldo_posicional_fecho_sem_abertura_e_localizado', () => { const r = L('a ) b'); return r.saldos.par.fora.length === 1 && r.saldos.par.fora[0].coluna === 3; });
  push('colchete_e_chaveta_tem_os_dois_sentidos', () => { const r = L('[a](b.md) e {sobra'); return r.saldos.colchete.fora.length === 0 && r.saldos.chaveta.fora.length === 1; });
  push('classe_legitima_colchete_dentro_do_span_e_medicao_mas_nao_membro', () => { const r = L('disse `a [ b` e {c'); return r.saldos.colchete.fora.length === 0 && r.saldos.colchete.dentro === 1 && r.saldos.chaveta.fora.length === 1; });
  push('retirar_os_spans_antes_de_contar_nao_e_contar_o_ficheiro_inteiro', () => { const t = 'x `( `( y'; const comRetirada = medeLinha(t).saldos.par.fora.length; const semRetirada = saldo(t, '(', ')').length; return comRetirada === 1 && semRetirada === 2; });
  push('aborta_indice_que_nao_existe_em_disco', () => { let abortou = false; try { medeFicheiro('C:/nao/ha/MEMORY.md'); } catch (e) { abortou = /nao resolve em disco/.test(e.message); } return abortou; });
  push('aborta_texto_sem_linha_com_escrita_e_o_verde_seriao_verde_de_nada', () => { let abortou = false; try { medeTexto('', 'x'); } catch (e) { abortou = /nao tem uma linha/.test(e.message); } return abortou; });
  push('aborta_texto_so_com_quebras_pela_mesma_razao', () => { let abortou = false; try { medeTexto('\n\n', 'x'); } catch (e) { abortou = /nao tem uma linha/.test(e.message); } return abortou; });
  push('bruto_de_um_texto_e_contagem_que_o_veredito_nao_faz', () => { const m = medeTexto('( ) [ ] { } e mais um ( aqui\n', 'x'); return m.bruto.par.abertos === 2 && m.bruto.par.fechados === 1 && m.bruto.colchete.abertos === 1 && m.bruto.chaveta.abertos === 1; });
  push('julgar_todo_o_texto_e_o_portao_C6_ter_positivo', () => { const m = medeTexto('a\n- [T](u.md)  com duplo\n', 'x'); return m.linhas === m.linhas_julgadas && m.linhas === 3 && m.linhas_de_verbete === 1; });
  push('um_duplo_fora_dos_spans_num_texto_julgado_da_um_membro_a_C5', () => { const m = medeTexto('a  b\nc\nd\n', 'x'); return m.julgadas[0].espacos_duplos_fora.length === 1 && agregado(m).total_espacos_duplos_fora === 1; });
  push('as_seis_classes_imprimem_mesmo_com_corpus_limpo', () => { const g = julga([agregado(medeTexto('- [T](u.md) - nada fora.\n', 'x'))]); return g.length === 6 && g.every((x) => x.ok === true && JSON.stringify(x.obtido).length > 2); });
  push('um_parentesis_solto_da_vermelho_C1_e_nome_a_linha', () => { const g = julga([agregado(medeTexto('linha limpa\nprosa ( solta\noutra limpa\n', 'x'))]); return g[0].ok === false && JSON.stringify(g[0].obtido).indexOf('2') >= 0 && g[1].ok === true; });
  push('o_bruto_ve_o_que_a_regra_de_contar_nao_pode_ver_na_ficheiro_todo', () => { const a = agregado(medeTexto('um ( dentro `de dois (` span`\noutro ( solto', 'x')); return a.bruto.par.abertos === 3 && a.bruto.par.fechados === 0 && a.parenteses_fora_dos_spans.length === 2; });
  push('o_bruto_conta_o_que_o_veredito_nao_julga_e_ambos_tem_positivo', () => { const a = agregado(medeTexto('(`x ( y` [z])\n', 'x')); return a.bruto.par.abertos === 2 && a.bruto.par.fechados === 1 && a.parenteses_fora_dos_spans.length === 0 && a.colchetes_fora_dos_spans.length === 0; });
  push('solto_dentro_do_span_e_registado_por_linha_sem_tocar_no_veredito_C1', () => { const a = agregado(medeTexto('prosa limpa\no portao disse `x ( y` e aqui ( esta ) equilibrado\nterceira limpa\n', 'x')); const g = julga([a]); return a.soltos_dentro_dos_spans.length === 1 && a.soltos_dentro_dos_spans[0].linha === 2 && a.soltos_dentro_dos_spans[0].par === 1 && a.parenteses_fora_dos_spans.length === 0 && g[0].ok === true; });
  push('ficheiro_de_disco_sem_soltos_dentro_regista_o_duplo_dentro_e_nao_fora', () => {
    const p = tmpdir() + '/p199-fixture-dentro-' + process.pid + '.md';
    writeFileSync(p, '# Mapa\n\n- [Ciclo](c.md) - saida `edee9a5..637d417  main` com duas colunas.\n', 'utf8');
    try { const a = agregado(medeFicheiro(p)); return a.soltos_dentro_dos_spans.length === 0 && a.linhas === 4 && a.linhas_julgadas === 4 && a.total_espacos_duplos_dentro === 1 && a.total_espacos_duplos_fora === 0; } finally { rmSync(p, { force: true }); }
  });
  push('fim_a_fim_um_ficheiro_partido_da_vermelho_e_nome_a_linha_do_defeito', () => {
    const p = tmpdir() + '/p199-fixture-' + process.pid + '.md';
    writeFileSync(p, '# Mapa\n\n- [Ciclo](c.md) - aqui  sobra um ( parentesis e um ` backtick\n- [Outro](o.md) - limpa.\n', 'utf8');
    try {
      const g = julga([agregado(medeFicheiro(p))]);
      const vermelho = g.filter((x) => !x.ok).map((x) => x.nome.slice(0, 2));
      return JSON.stringify(vermelho) === '["C1","C4","C5"]' && JSON.stringify(g[0].obtido) === '[[3]]' && g[5].ok === true;
    } finally { rmSync(p, { force: true }); }
  });
  push('fim_a_fim_um_ficheiro_limpo_da_as_seis_verdes_com_as_listas_vazias', () => {
    const p = tmpdir() + '/p199-fixture-limpo-' + process.pid + '.md';
    writeFileSync(p, '# Mapa\n\n- [Ciclo](c.md) - saida `edee9a5..637d417  main -> main` e o resto.\n', 'utf8');
    try {
      const a = agregado(medeFicheiro(p));
      const g = julga([a]);
      return g.every((x) => x.ok === true) && a.total_espacos_duplos_dentro === 1 && a.total_espacos_duplos_fora === 0;
    } finally { rmSync(p, { force: true }); }
  });
  push('a_identidade_do_alvo_vai_no_registo_e_e_medida_em_bytes_nao_em_caracteres', () => { const m = medeTexto('a b\n', 'x'); return m.bytes === 4 && m.bytes_md5_8.length === 8; });
  return casos;
}if (!SUF) throw new Error('ABORTA: P199_SUF e obrigatorio - cada corrida precisa de nome proprio, a re-corrida por cima apagaria a que a prosa cita');

if (SELFTESTE) {
  const cs = fixtures();
  const faltas = cs.filter((c) => !c.fn());
  cs.forEach((c) => console.log((faltas.indexOf(c) >= 0 ? 'FALTA ' : 'OK     ') + c.nome));
  console.log('peca=p199-forma-do-indice-de-memoria.mjs');
  console.log('P199_SELFTESTE ' + cs.length + ' casos ' + faltas.length + ' faltas sufixo=' + SUF);
  if (faltas.length) throw new Error('ABORTA: selfteste com faltas');
} else {
  if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe - correr com P199_SUF=novo, nao por cima');
  const agregados = INDICES.map((p) => agregado(medeFicheiro(p)));
  const g = julga(agregados);
  for (const a of agregados) {
    console.log('alvo=' + a.alvo + ' bytes=' + a.bytes + ' md5_8=' + a.bytes_md5_8 + ' linhas=' + a.linhas + ' julgadas=' + a.linhas_julgadas + ' verbetes=' + a.linhas_de_verbete);
    console.log('  brutos_no_ficheiro_todo parenteses=' + a.bruto.par.abertos + '/' + a.bruto.par.fechados + ' colchetes=' + a.bruto.colchete.abertos + '/' + a.bruto.colchete.fechados + ' chavetas=' + a.bruto.chaveta.abertos + '/' + a.bruto.chaveta.fechados);
    console.log('  parenteses_fora=' + a.parenteses_fora_dos_spans.length + ' colchetes_fora=' + a.colchetes_fora_dos_spans.length + ' chavetas_fora=' + a.chavetas_fora_dos_spans.length + ' backticks_impares=' + a.backticks_impares.length);
    console.log('  espacos_duplos_fora=' + a.total_espacos_duplos_fora + ' espacos_duplos_dentro=' + a.total_espacos_duplos_dentro + ' linhas_com_soltos_dentro_dos_spans=' + a.soltos_dentro_dos_spans.length);
    if (a.soltos_dentro_dos_spans.length) console.log('  SOLTOS_DENTRO=' + JSON.stringify(a.soltos_dentro_dos_spans).slice(0, 1200));
    for (const k of ['parenteses_fora_dos_spans', 'colchetes_fora_dos_spans', 'chavetas_fora_dos_spans', 'espacos_duplos_fora_dos_spans']) {
      if (a[k].length) console.log('  OFENSOR_' + k + '=' + JSON.stringify(a[k]).slice(0, 900));
    }
  }
  const registo = {
    peca: 'p199-forma-do-indice-de-memoria.mjs',
    em: new Date().toISOString(),
    emissor_bytes: Buffer.byteLength(EU, 'utf8'),
    emissor_md5: md5(EU),
    sufixo: SUF,
    o_que_prova: 'que cada linha dos dois indices tem saldos equilibrados de parentesis, colchetes e chavetas FORA dos spans de backtick, backticks a pares, nenhum espaco duplo fora dos spans, e que o numero de linhas julgadas e o numero de linhas do ficheiro. Cada alvo vai com bytes e md5 de oito, para que a frase que cita um numero possa dizer que ficheiro foi medido. Imprime alem disso os totais brutos dos tres pares em todo o ficheiro e, por linha, os saldos e duplicos que caem DENTRO dos spans (soltos_dentro_dos_spans, total_espacos_duplos_dentro): esses numeros sao contagem para confrontar com medicao a mao, nao veredicto.',
    o_que_NAO_prova: 'nada do conteudo das frases, nem a geometria dos apontadores (essa e do p181), nem as familias de escrita por codepoint (essa e do p173), nem que um span dentro doutro span seja bem formado: a extracao de spans e gulosa e de um nivel. Nao prova que os totais brutos estao equilibrados, nem que os saltos dentro dos spans estao equilibrados - um par dentro dum span fica de fora do veredicto de propositito.',
    agregados: agregados,
    portoes: g.map((x) => ({ nome: x.nome, ok: x.ok, obtido: x.obtido })),
  };
  writeFileSync(OUT, JSON.stringify(registo, null, 1), 'utf8');
  const vermelhos = g.filter((x) => !x.ok);
  for (const x of g) console.log('portao_' + x.nome + '=' + (x.ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(x.obtido).slice(0, 200));
  console.log('peca=p199-forma-do-indice-de-memoria.mjs alvo=2_indices linhas_julgadas=' + agregados.reduce((s, a) => s + a.linhas_julgadas, 0) + ' espacos_duplos_dentro=' + agregados.reduce((s, a) => s + a.total_espacos_duplos_dentro, 0));
  console.log('emissor_bytes=' + registo.emissor_bytes + ' emissor_md5=' + registo.emissor_md5);
  console.log('P199_FORMA ' + (g.length - vermelhos.length) + '/' + vermelhos.length + ' vermes=' + JSON.stringify(vermelhos.map((x) => x.nome)) + ' sufixo=' + SUF);
  console.log('escrito em ' + OUT);
  if (vermelhos.length) throw new Error('ABORTA: forma do indice com vermelhos nomeados');
}
