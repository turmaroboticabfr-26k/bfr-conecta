// Varredura de duas familias dum bloco do diario, por codepoint, com o positivo provado antes de confiar num zero:
// a adjacencia letra-digito (o nome trocado por cifra) e a escrita fora do Latino, que e de onde vem o glifo que o
// teclado do condutor injerta. Os ofensores da segunda familia nomeiam-se por codepoint, nunca pelo glifo, senao a
// captura que denuncia passa a ser a ofensora varrida pelo portao do indice.
// Uso: node scripts/p169-varredura-letra-digito-do-bloco.mjs <caminho-da-captura> [MARCA] [alvo]
//      node scripts/p169-varredura-letra-digito-do-bloco.mjs <caminho-da-captura> --redigir <captura-original>
//      No modo --redigir o destino e a original com os glifos da familia nomeados por codepoint, para que a prova
//      dum vermelho se versiona sem importar o ofensor; os bytes e o md5 da origem ficam no artefacto.
//      MARCA default SM.56; o fim do bloco e medido como a mais pequena **SM.N.** seguinte existente no ficheiro.
// Os spans de backtick vao fora antes de contar: e neles que vivem os nomes de peca, os md5 e as cifras citadas.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const destino = process.argv[2];
if (!destino) throw new Error('ABORTA: passe o caminho da captura como argv[2]');
if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const MARCA = process.argv[3] || 'SM.56';
const ALVO = process.argv[4] || 'docs/auditoria-bfr-conecta.md';
const RE = /[A-Za-zÀ-ÿ][0-9]|[0-9][A-Za-zÀ-ÿ]/g;
const limpa = (t) => t.replace(/`[^`]*`/g, ' ');
const eu = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };

const FIX_PARTIDO = 'a linha dice 28papeis e 3contas mas devia 28 papeis e 3 contas';
const FIX_LIMPO = 'a linha diz 28 papeis e 3 contas';
const positivo = limpa(FIX_PARTIDO).match(RE) || [];
const negativo = limpa(FIX_LIMPO).match(RE) || [];

// A lista de faixas e medida, nao intuicao: o censo bloco a bloco do corpus de escrita propria (`p196`, registos
// da familia p196-familias-de-escrita-do-corpus) deu um membro cirilico dentro dum vocábulo portugues, sem nenhum
// uso legitimo do bloco nos meus ficheiros, e por isso a faixa cirilica entrou. O bloco grego tem ocorrencias
// legitimas medidas (as duas maiusculas gregas usadas como notacao desde os ciclos antigos) e ficou FORA: alargar
// uma faixa sem medir seria o portao a proibir uma classe legitima, e o verde viria da proibicao, nao da medição.
const faixasOfensoras = [[0x0400, 0x04ff], [0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xac00, 0xd7a3], [0xd800, 0xdfff], [0xff00, 0xffef]];
const ehOfensora = (c) => faixasOfensoras.some((f) => c >= f[0] && c <= f[1]);
function foraDoASCII(t) {
  const ach = [];
  for (let i = 0; i < t.length; ) {
    const c = t.codePointAt(i);
    const pos = i;
    i += c > 0xffff ? 2 : 1;
    if (c < 0x80) continue;
    ach.push({ i: pos, cp: 'U+' + c.toString(16).toUpperCase() });
  }
  return ach;
}
const ofensoras = (t) => foraDoASCII(t).filter((a) => ehOfensora(parseInt(a.cp.slice(2), 16)));
// O contexto dum ofensor nao pode levar o glifo: a captura que o denuncia passaria a pertencer a familia que o
// portao proibe. A linha mantem o codepoint e a posicao, que e o que mede; o glifo vira o seu nome.
function nomeiaGlifos(t) {
  let saida = '';
  for (const ch of t) saida += ehOfensora(ch.codePointAt(0)) ? 'U+' + ch.codePointAt(0).toString(16).toUpperCase() : ch;
  return saida;
}
function linhaEColuna(texto, indice) {
  const ate = texto.slice(0, indice);
  return { linha: ate.split('\n').length, coluna: indice - (ate.lastIndexOf('\n') + 1) + 1 };
}
// A limpa troca cada span de backtick por UM espaco. Enquanto nenhum span levar uma quebra de linha, contar novas
// linhas no texto varrido da-me as linhas do bruto; se um span levar uma, os totais deixam de bater e a linha
// impressa passa a ser do texto varrido, nao do bloco. A devolcao traz os dois totais para que o quadro seja medido
// em cada corrida e declarado em cada linha, nunca suposto.
function quadroDaLinha(bruto, varrido) {
  const nb = (bruto.match(/\n/g) || []).length;
  const nv = (varrido.match(/\n/g) || []).length;
  return { novas_linhas_bruto: nb, novas_linhas_varrido: nv, linha_e_do_bruto: nb === nv };
}
const GLIFO_FORA = String.fromCodePoint(0x79fb, 0x52a8);
// Cada faixa declarada precisa dum positiva e dum negativa seus: uma lista de faixas sem membro que dispara e o
// mesmo limiar metido dentro dum regex sem prova. O membro compoe-se por codepoint, nunca dactilografado, porque
// o fonte que denuncia a familia nao pode passar a pertencer-lhe. O negativo e o codepoint nao-ofensor mais
// proximo por baixo: duas faixas contiguas (U+3000-303F e U+3040-30FF) deixam o `f[0]-1` da segunda dentro da
// primeira, e chamar a isso falta de negativo seria o portao a proibir uma classe legitima do proprio vocabulario.
function negativoDaFaixa(f) {
  let c = f[0] - 1, saltos = 0;
  while (c >= 0x80 && ehOfensora(c)) { c -= 1; saltos += 1; }
  return { cp: c, saltos: saltos };
}
const porFaixa = faixasOfensoras.map((f) => {
  const neg = negativoDaFaixa(f);
  return { faixa: 'U+' + f[0].toString(16).toUpperCase() + '-' + f[1].toString(16).toUpperCase(),
    dentro: ofensoras(String.fromCodePoint(f[0] + 1)).length,
    abaixo: ofensoras(String.fromCodePoint(neg.cp)).length, cp_abaixo: 'U+' + neg.cp.toString(16).toUpperCase(), saltos_ate_fora: neg.saltos };
});
const semPositivo = porFaixa.filter((r) => r.dentro !== 1);
const semNegativo = porFaixa.filter((r) => r.abaixo !== 0 || r.cp_abaixo === 'U+7F');
say('PROVA_FIXTURE_FAIXA_POR_FAIXA ' + JSON.stringify(porFaixa));
say('FAIXAS_sem_positivo=' + JSON.stringify(semPositivo) + ' sem_negativo=' + JSON.stringify(semNegativo));
if (semPositivo.length) throw new Error('ABORTA: uma faixa declarada nao dispara no proprio membro, deu ' + JSON.stringify(semPositivo));
if (semNegativo.length) throw new Error('ABORTA: uma faixa declarada nao tem fronteira por baixo, deu ' + JSON.stringify(semNegativo));
// O exemplar do defeito do ciclo anterior: a letra cirilica que a ferramenta de edição injerta dentro dum vocabulo
// portugues. A faixa nova so esta provada pela string que ela existe para apanhar.
const FIX_CIRILICO_EXEMPLAR = 'a palavra ass' + String.fromCodePoint(0x0435) + 'rcoes voltou a sair com letra cirilica';
const cirilicoFix = ofensoras(FIX_CIRILICO_EXEMPLAR);
const cirilicoRedigido = nomeiaGlifos(FIX_CIRILICO_EXEMPLAR);
say('PROVA_FIXTURE_CIRILICO ocorrencias=' + cirilicoFix.length + ' codepoints=' + JSON.stringify(cirilicoFix.map((a) => a.cp)) + ' redigido_sem_glifo=' + (cirilicoRedigido.indexOf(String.fromCodePoint(0x0435)) < 0));
if (cirilicoFix.length !== 1) throw new Error('ABORTA: o exemplar do defeito nao foi apanhado pela familia nova, deu ' + cirilicoFix.length);
if (cirilicoRedigido.indexOf(String.fromCodePoint(0x0435)) >= 0) throw new Error('ABORTA: a redacao deixou o glifo na captura, o instrumento passaria a ser o ofensor');
const FIX_LIMPO_FORA = 'a linha diz 28 papeis e 3 contas, com plicas «» ‘’ “” – — … , setas -> e <=> , matemática ≥ ≤ ≠ ≈ ± × ÷ ∪ ∩ ∑ ∆ ⋯ , sinais ✓ ✗ ⚠ † ‡ , e o emoji 📷 🏠 🃆 🔔 📅 🔎 📊 ❌ 🎮';
const partidoNaoLatino = ofensoras(GLIFO_FORA + FIX_LIMPO_FORA);
const limpoNaoLatino = ofensoras(FIX_LIMPO_FORA);
say('FAIXAS_OFENSORAS=' + JSON.stringify(faixasOfensoras));
say('PROVA_FIXTURE_NAO_LATINO partido=' + JSON.stringify(partidoNaoLatino.map((a) => a.cp)) + ' limpo=' + JSON.stringify(limpoNaoLatino.map((a) => a.cp)));
if (partidoNaoLatino.length !== 2) throw new Error('ABORTA: a familia do nao-Latino nao deu as duas letras do fixture, deu ' + JSON.stringify(partidoNaoLatino.map((a) => a.cp)));
if (limpoNaoLatino.length !== 0) throw new Error('ABORTA: o fixture limpo do nao-Latino deu ' + JSON.stringify(limpoNaoLatino.map((a) => a.cp)) + ', a familia proibe uma classe legita do diario');
const FIX_REDIGIR_PARTIDO = 'detalhe de ' + GLIFO_FORA + ' importante, o 28 papeis fica';
const FIX_REDIGIR_LIMPO = FIX_LIMPO_FORA;
const redigidoFix = nomeiaGlifos(FIX_REDIGIR_PARTIDO);
say('PROVA_FIXTURE_REDIGIR antes_com_glifos=' + ofensoras(FIX_REDIGIR_PARTIDO).length + ' depois=' + JSON.stringify(redigidoFix) + ' limpo_identico=' + (nomeiaGlifos(FIX_REDIGIR_LIMPO) === FIX_REDIGIR_LIMPO));
if (ofensoras(redigidoFix).length !== 0) throw new Error('ABORTA: a redacao deixou ' + ofensoras(redigidoFix).length + ' glifos na familia, o destino ainda seria ofensor');
if (!redigidoFix.includes('U+79FB') || !redigidoFix.includes('U+52A8')) throw new Error('ABORTA: a redacao nao nomeou os dois codepoints esperados, deu ' + JSON.stringify(redigidoFix));
if (nomeiaGlifos(FIX_REDIGIR_LIMPO) !== FIX_REDIGIR_LIMPO) throw new Error('ABORTA: a redacao tocou no fixture limpo, o instrumento deixa de ser identidade sobre o que nao e da familia');

// Os fixtures que seguem nao provam a regua de contar (essa esta provada acima): provam a localizacao, o ramo
// consertado a 25/11 porque o contexto era derivado por agulha com indexOf, e nao por ocorrencia. O controlo da
// regra velha e obrigatorio: se as duas regras dessem o mesmo numero neste fixture, o verde do ramo novo nao teria
// positivo nenhum e eu teria assinado uma cara morta.
const CRASE = String.fromCharCode(0x60);
const QUEBRA = String.fromCharCode(10);
const REg = new RegExp(RE.source, RE.flags.indexOf('g') >= 0 ? RE.flags : RE.flags + 'g');
const FIX_ADJ_REPETIDO = 'a primeira 28papeis fica aqui e a segunda 28papeis fica ali';
const varridoFixAdj = limpa(FIX_ADJ_REPETIDO);
const ocsFixAdj = [...varridoFixAdj.matchAll(REg)].map((m) => ({ g: m[0], i: m.index }));
const posNovasFix = new Set(ocsFixAdj.map((o) => o.i)).size;
const posVelhasFix = new Set(ocsFixAdj.map((o) => varridoFixAdj.indexOf(o.g))).size;
const ctxNovasFix = new Set(ocsFixAdj.map((o) => varridoFixAdj.slice(Math.max(0, o.i - 12), o.i + 12))).size;
say('PROVA_FIXTURE_LOCALIZACAO ocorrencias=' + ocsFixAdj.length + ' posicoes_distintas_nova=' + posNovasFix + ' contextos_distintos_nova=' + ctxNovasFix + ' posicoes_distintas_regra_velha=' + posVelhasFix);
if (ocsFixAdj.length < 2) throw new Error('ABORTA: o fixture de localizacao nao tem duas ocorrencias da mesma adjacencia, deu ' + ocsFixAdj.length);
if (posNovasFix !== ocsFixAdj.length) throw new Error('ABORTA: a localizacao por ocorrencia nao deu uma posicao por ocorrencia, deu ' + posNovasFix + ' de ' + ocsFixAdj.length);
if (ctxNovasFix !== ocsFixAdj.length) throw new Error('ABORTA: as posicoes distintas nao chegaram ao contexto impresso, deu ' + ctxNovasFix + ' de ' + ocsFixAdj.length + ' -- o agregado estaria certo e o onde mentiria');
if (posVelhasFix !== 1) throw new Error('ABORTA: o fixture nao reproduz o defecto consertado, a regra do indexOf deveria dar UMA posicao e deu ' + posVelhasFix);
const FIX_Q_INLINE = 'primeira linha ' + CRASE + 'um_span_de_codigo_28' + CRASE + ' e 28papeis no fim';
const FIX_Q_QUEBRA = ['linha_um', 'com ' + CRASE + 'abc', 'def' + CRASE + ' aqui', 'linha_quatro'].join(QUEBRA);
const qInline = quadroDaLinha(FIX_Q_INLINE, limpa(FIX_Q_INLINE));
const qQuebra = quadroDaLinha(FIX_Q_QUEBRA, limpa(FIX_Q_QUEBRA));
say('PROVA_FIXTURE_QUADRO span_inline=' + JSON.stringify(qInline) + ' span_que_cruza_a_quebra=' + JSON.stringify(qQuebra));
if (qInline.linha_e_do_bruto !== true) throw new Error('ABORTA: com um span dentro da linha a guarda negou o quadro do bruto, deu ' + JSON.stringify(qInline));
if (qQuebra.linha_e_do_bruto !== false) throw new Error('ABORTA: a guarda nao tem positivo para o span que cruza a quebra, deu ' + JSON.stringify(qQuebra) + ' -- a linha impressa seria uma mentira');

// Modo de derivação: uma captura ja corrida, fora do repo, que carregue os glifos no contexto. O destino e a mesma
// varrida com os ofensores nomeados por codepoint, com os bytes e o md5 da origem registados para que a cadeia de
// custodia se leia no artefacto e nao na minha prosa.
if (process.argv[3] === '--redigir') {
  const origem = process.argv[4];
  if (!origem) throw new Error('ABORTA: o modo --redigir pede o caminho da captura original como argv[4]');
  const brutoOrigem = readFileSync(origem, 'utf8');
  const ditto = ofensoras(brutoOrigem);
  const corpo = nomeiaGlifos(brutoOrigem);
  say('modo=redigir_captura');
  say('alvo=' + origem + ' repo=' + REPOReal + ' MARCA=' + MARCA);
  say('emissor_bytes=' + Buffer.byteLength(eu, 'utf8') + ' emissor_md5=' + createHash('md5').update(eu).digest('hex'));
  say('ORIGEM_bytes=' + Buffer.byteLength(brutoOrigem, 'utf8') + ' ORIGEM_md5=' + createHash('md5').update(brutoOrigem).digest('hex'));
  say('GLIFOS_NA_ORIGEM=' + ditto.length + ' codigo=' + JSON.stringify(ditto.map((o) => o.cp)));
  say('GLIFOS_NO_DESTINO=' + ofensoras(corpo).length);
  if (ofensoras(corpo).length !== 0) throw new Error('ABORTA: o destino ainda tem a familia, a redacao nao cobriu tudo');
  writeFileSync(destino, capt.join('\n') + '\n' + corpo);
  say('DESTINO_bytes=' + Buffer.byteLength(readFileSync(destino, 'utf8'), 'utf8'));
  process.exit(0);
}


// O alvo pode ser um caminho absoluto duma escrita FORA do repo (o bloco antes de ele ser appended, uma captura
// de sessao) ou relativo ao repo (o diario). A 1.ª versao fazia sempre `REPO + '/' + ALVO`, por isso um absoluto
// era colado ao repo e a peca rebentava em ENOENT com o caminho partido ao meio. Os tres casos abaixo dao as duas
// faces (relativa prefixada, absoluta nao tocada) em Windows e POSIX, e abortam se alguma se mover.
function caminhoDoAlvo(alvo, repo) {
  if (/^[A-Za-z]:[\/\\]/.test(alvo) || alvo.startsWith('/')) return alvo;
  return repo + '/' + alvo;
}
const provaCaminho = {
  relativa: caminhoDoAlvo('docs/x.md', 'R:/repo'),
  absoluta_windows: caminhoDoAlvo('C:/x/y.md', 'R:/repo'),
  absoluta_posix: caminhoDoAlvo('/tmp/x.md', 'R:/repo'),
};
if (provaCaminho.relativa !== 'R:/repo/docs/x.md') throw new Error('ABORTA: o alvo relativo deixou de ser prefixado pelo repo, deu ' + provaCaminho.relativa);
if (provaCaminho.absoluta_windows !== 'C:/x/y.md') throw new Error('ABORTA: o alvo absoluto em Windows foi colado ao repo, deu ' + provaCaminho.absoluta_windows);
if (provaCaminho.absoluta_posix !== '/tmp/x.md') throw new Error('ABORTA: o alvo absoluto POSIX foi colado ao repo, deu ' + provaCaminho.absoluta_posix);

say('alvo=' + ALVO + ' repo=' + REPOReal + ' MARCA=' + MARCA);
say('PROVA_FIXTURE_CAMINHO relativa=' + provaCaminho.relativa + ' absoluta_windows=' + provaCaminho.absoluta_windows + ' absoluta_posix=' + provaCaminho.absoluta_posix);
say('emissor_bytes=' + Buffer.byteLength(eu, 'utf8') + ' emissor_md5=' + createHash('md5').update(eu).digest('hex'));
say('PROVA_FIXTURE positivo=' + JSON.stringify(positivo) + ' negativo=' + JSON.stringify(negativo));
if (!positivo.includes('8p') || !positivo.includes('3c')) throw new Error('ABORTA: a regua nao dispara no fixture partido — nenhum zero faria sentido');
if (negativo.length !== 0) throw new Error('ABORTA: o fixture limpo nao e limpo, deu ' + JSON.stringify(negativo));

const bruto = readFileSync(caminhoDoAlvo(ALVO, REPOReal), 'utf8');
const inicio = bruto.indexOf('**' + MARCA + '.');
if (inicio < 0) throw new Error('ABORTA: o bloco ' + MARCA + ' nao esta no ficheiro');
const numerode = Number(MARCA.split('.')[1]);
const seguintes = [...bruto.matchAll(/\*\*SM\.(\d+)\./g)].map((m) => Number(m[1])).filter((n) => n > numerode).sort((a, b) => a - b);
const marcaSeguinte = seguintes[0];
const fim = marcaSeguinte === undefined ? -1 : bruto.indexOf('**SM.' + marcaSeguinte + '.', inicio);
const bloco = bruto.slice(inicio, fim < 0 ? bruto.length : fim);
const varrido = limpa(bloco);
const ocorrencias = [...varrido.matchAll(REg)].map((m) => ({ g: m[0], i: m.index }));
const achados = ocorrencias.map((o) => o.g);
say('bloco_inicio_char=' + inicio + ' marca_seguinte_mais_proxima=' + (marcaSeguinte === undefined ? 'nenhuma' : 'SM.' + marcaSeguinte) + ' bloco_fim_char=' + (fim < 0 ? 'fim_do_ficheiro' : fim));
say('ficheiro_chars=' + bruto.length + ' ficheiro_bytes=' + Buffer.byteLength(bruto, 'utf8') + ' bloco_bytes=' + Buffer.byteLength(bloco, 'utf8') + ' bloco_linhas=' + bloco.split('\n').length);
say('chars_cru=' + bloco.length + ' chars_varridos=' + varrido.length + ' chars_a_menos_pela_limpa=' + (bloco.length - varrido.length) + ' backticks_no_bloco=' + (bloco.split(CRASE).length - 1));
say('CANDIDATOS=' + achados.length);
const hist = {};
for (const a of achados) hist[a] = (hist[a] || 0) + 1;
say('HISTOGRAMA ' + JSON.stringify(hist));
const posDistintas = new Set(ocorrencias.map((o) => o.i)).size;
const porAgulhaVelha = new Set(ocorrencias.map((o) => varrido.indexOf(o.g))).size;
const q = quadroDaLinha(bloco, varrido);
const linhaDoInicioNoFicheiro = linhaEColuna(bruto, inicio).linha;
say('QUADRO_DA_LINHA ' + JSON.stringify(q) + ' bloco_inicio_linha_no_ficheiro=' + linhaDoInicioNoFicheiro);
say('POSICOES_DISTINTAS=' + posDistintas + ' de ' + ocorrencias.length + ' ocorrencias se_fosse_por_agulha_regra_velha=' + porAgulhaVelha);
if (ocorrencias.length > 0 && posDistintas !== ocorrencias.length) throw new Error('ABORTA: a localizacao por ocorrencia deu ' + posDistintas + ' posicoes para ' + ocorrencias.length + ' ocorrencias -- sem posicao por linha o onde nao e medido');
say('TABELAS_DECLARADAS [ADJ OFENSOR] · cada fila e uma medida sua, declaracao lida pela regua de cifras em duo do p168');
ocorrencias.forEach((o, k) => {
  const lc = linhaEColuna(varrido, o.i);
  const linhaFicheiro = q.linha_e_do_bruto ? linhaDoInicioNoFicheiro + lc.linha - 1 : 'nao_derivavel';
  say('ADJ #' + (k + 1) + '/' + ocorrencias.length + ' [' + o.g + '] x' + hist[o.g] + ' linha_no_texto_varrido=' + lc.linha + ' linha_no_ficheiro=' + linhaFicheiro + ' quadro_linha=' + (q.linha_e_do_bruto ? 'ficheiro' : 'texto_varrido') + ' coluna_no_texto_varrido=' + lc.coluna + ' char_varrido=' + o.i + ' :: ' + JSON.stringify(nomeiaGlifos(varrido.slice(Math.max(0, o.i - 40), o.i + 40))));
});
// O censo do ficheiro conta, mas nao diz ONDE: sem posicao, a prosa que nomeasse a linha do ofensor seria mais uma
// cifra de nenhuma peça. A derivação tem fixture próprio, com o glifo na segunda linha, para que linha e coluna
// possam falhar -- um contador que so sabe o caso limpo nao mede nada.
const FIX_GLIBO_NA_2A_LINHA = 'a primeira linha nao tem ofensor nenhum\n' + 'segunda ' + String.fromCharCode(0xff0b) + ' com o sinal de largura completa';
const posFix = ofensoras(FIX_GLIBO_NA_2A_LINHA).map((o) => ({ cp: o.cp, ...linhaEColuna(FIX_GLIBO_NA_2A_LINHA, o.i) }));
say('PROVA_FIXTURE_POSICAO ' + JSON.stringify(posFix));
if (posFix.length !== 1 || posFix[0].linha !== 2 || posFix[0].coluna !== 9) throw new Error('ABORTA: a derivação de linha e coluna nao deu o par esperado do fixture, deu ' + JSON.stringify(posFix));
const ofensasNoBloco = ofensoras(bloco);
const mapaDoFicheiro = {};
for (const o of foraDoASCII(bruto)) mapaDoFicheiro[o.cp] = (mapaDoFicheiro[o.cp] || 0) + 1;
const mapaDoBloco = {};
for (const o of foraDoASCII(bloco)) mapaDoBloco[o.cp] = (mapaDoBloco[o.cp] || 0) + 1;
const ofensasNoFicheiro = ofensoras(bruto);
say('CENSO_NAO_LATINO_DO_FICHEIRO=' + JSON.stringify(mapaDoFicheiro));
say('CENSO_NAO_LATINO_DO_BLOCO=' + JSON.stringify(mapaDoBloco));
say('FORA_DA_ESCRITA=' + ofensasNoBloco.length + ' no bloco ' + MARCA + ' · no_ficheiro=' + ofensasNoFicheiro.length);
say('POSICOES_DOS_OFENSORES_DO_FICHEIRO=' + JSON.stringify(ofensasNoFicheiro.map((o) => ({ cp: o.cp, ...linhaEColuna(bruto, o.i) }))));
for (const o of ofensasNoBloco) say('OFENSOR codepoint=' + o.cp + ' indice_char=' + o.i + ' contexto=' + JSON.stringify(nomeiaGlifos(bloco.slice(Math.max(0, o.i - 40), o.i + 40))));
writeFileSync(destino, capt.join('\n') + '\n', 'utf8');
if (ofensasNoBloco.length !== 0) throw new Error('ABORTA FORA_DA_ESCRITA=' + ofensasNoBloco.length + ' no bloco ' + MARCA + ', captura guardada em ' + destino);
process.stdout.write('P169_VARREDURA_FEITA candidatos=' + achados.length + ' fora_da_escrita=' + ofensasNoBloco.length + ' captura=' + destino + '\n');
