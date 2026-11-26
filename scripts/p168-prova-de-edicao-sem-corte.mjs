// Prova, contra HEAD, que uma edicao no diario substitui UMA linha e acrescenta so depois dela.
// Uso: node scripts/p168-prova-de-edicao-sem-corte.mjs <caminho-da-captura>
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --fixtures
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --medir
//      node scripts/p168-prova-de-edicao-sem-corte.mjs <captura> --acrescimo --espera "<cabecalho esperado>"
//      node scripts/p168-prova-de-edicao-sem-corte.mjs <captura> --acrescimo-com-substituicao --espera "<cabecalho esperado>"
//      node scripts/p168-prova-de-edicao-sem-corte.mjs <captura> --so-linha-tocada --espera "<frase que ha-de ler-se na linha>"
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --portao-a3
//      node scripts/p168-prova-de-edicao-sem-corte.mjs --duo <captura>
// Toda a saida leva a pegada do emissor (bytes e md5 deste ficheiro, lidos do disco) e fecha-se com `cifras_em_duo=0`,
// o portao que recusa um artefacto onde o mesmo nome de grandeza aparece com dois valores.
// --duo e a mesma regua aplicada a um artefacto de fora: a regiao de uma medida e da familia toda (`alvo=` ate a
// primeira linha `P<tres digitos>_`), porque uma pieza nova nao reimplementa o predicado que ja vive aqui; por isso
// a saida diz ONDE a regiao se fechou e se ela cobre o fim do ficheiro, senao um veredicto alhures no meio encurtava
// a varredura e o verde passava a significar "nao vi".
// Tres classes de edicao, um predicado por classe, cada classe com fixture proprio: a substituicao duma linha com
// acrescimo logo depois dela, o acrescimo puro no fim do ficheiro, e a forma que os fechos de ronda realmente produzem
// (uma linha reescrita a meio MAIS acrescimo no fim). Cada classe exige a expectativa que julga, senao aborta antes
// de medir; passar duas flags de classe de uma vez aborta, porque a escolha do predicado nao pode ser implicita.
// O portao_A3 da classe de acrescimo foi escrito como o comprimento do prefixo comum ate ao fim do HEAD, que e o
// portao_A1 por outra forma; --portao-a3 mede as separacoes entre os dois e passa o A3 a exigir que a primeira
// linha nova com conteudo traga a expectativa, o unico eixo com positivo proprio, provado nas mesmas fabricas.
// Cada portao tem fixture que o faz abortar; a guarda de sobrescrita exige sufixo novo.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// argv[3] so e o alvo quando nao tem forma de flag. Com a forma antiga, `--acrescimo-com-substituicao` no lugar do
// alvo era lido como caminho e a pieza morria num `git show HEAD:--…` em vez de dizer o que se passou.
const ALVOarg = process.argv[3];
const ALVO = ALVOarg && !ALVOarg.startsWith('--') ? ALVOarg : 'docs/auditoria-bfr-conecta.md';
const REPOReal = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const flagDe = (nome) => {
  const i = process.argv.indexOf(nome);
  return i < 0 ? null : process.argv[i + 1];
};
const flagAcrescimo = process.argv.includes('--acrescimo');
const flagMista = process.argv.includes('--acrescimo-com-substituicao');
const flagSoTocada = process.argv.includes('--so-linha-tocada');
const flagsDeClasse = [flagAcrescimo, flagMista, flagSoTocada].filter(Boolean).length;
if (flagsDeClasse > 1) throw new Error('ABORTA: mais de uma flag de classe foi passada, o predicado escolhido nao pode depender da ordem do codigo');
const CLASSE = flagMista ? 'acrescimo_no_fim_com_uma_linha_tocada' : flagAcrescimo ? 'acrescimo_no_fim' : flagSoTocada ? 'linha_tocada_sem_acrescimo' : 'substituicao_de_uma_linha';
const ESPERA = flagDe('--espera');
// A pegada do emissor e identidade do codigo que corre, nao alegacao estavel: envelhece a cada edicao desta peça.
// Por isso vive na captura e nunca na prosa, e le-se com o mesmo metodo do p169 (bytes e md5 do proprio ficheiro).
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const EMISSOR = { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') };

function primeiraComConteudo(L) {
  const comConteudo = L.filter((l) => l.trim().length > 0);
  return comConteudo.length === 0 ? '' : comConteudo[0];
}

// A coluna onde uma linha deixada para tras coincide com a mesma linha reescrita, e as duas caudas a partir dela.
// Vive fora das classes porque a classe de acrescimo com linha tocada observa a linha tocada por indice (o miolo do
// prefixo comum nao a isola) e a prédica de substituicao tem de ser a mesma das duas rotas, nao uma copia aproximada.
function parDeCaudas(a, b) {
  let comum = 0;
  while (comum < a.length && comum < b.length && a.charCodeAt(comum) === b.charCodeAt(comum)) comum++;
  return { comum, caudaOld: a.slice(comum), caudaNew: b.slice(comum) };
}

// Uma cifra com o mesmo nome e valores diferentes no mesmo artefacto nao e duas medidas, e uma delas falsa: quem le o
// numero nao pode saber a que grandeza pertence. As linhas dos portoes repetem `obtido` por construcao (cada portao
// observa o seu), por isso saem da varredura pelo nome da primeira chave e a saida diz quantas linhas ficaram fora.
function duoDeCifras(L) {
  const vistas = new Map();
  const fora = [];
  for (const texto of L) {
    const re = new RegExp('([a-zA-Z_][a-zA-Z0-9_]*)=(-?\\d+)(?=\\s|$)', 'g');
    let m;
    while ((m = re.exec(texto)) !== null) {
      if (vistas.has(m[1]) && vistas.get(m[1]) !== m[2]) fora.push(m[1] + ': ' + vistas.get(m[1]) + ' e ' + m[2]);
      vistas.set(m[1], m[2]);
    }
  }
  return fora;
}
function soMedidas(L) {
  // Uma tabela de casos repete `linha`, `coluna`, `obtido` linha a linha por construcao: cada fila e uma medida sua.
  // Quem imprime tabelas declara os prefixos das suas filas numa linha `TABELAS_DECLARADAS [TOKEN TOKEN]` — a lista
  // e lida do ARTEFACTO, nunca lembrada por esta régua, e so exclui filas comecadas por um token declarado. As linhas
  // de medida (`alvo=`, `CANDIDATOS…=`) nao tem token, logo uma declaracao nao pode esconder uma cifra dupla que
  // viva nelas: isso e o fixture E3. Uma declaracao sem fila correspondente imprime-se como censo, nao como vermelho,
  // porque zero ofensores duma classe legitima e o resultado honesto de um ficheiro limpo.
  const declaradas = new Set();
  for (const l of L) {
    const m = /^TABELAS_DECLARADAS \[([A-Z0-9 ]*)\]/.exec(l);
    if (m) for (const t of m[1].trim().split(/\s+/)) if (t) declaradas.add(t);
  }
  const usos = {};
  const kept = [];
  let excluidas = 0;
  let excluidas_por_declaracao = 0;
  for (const l of L) {
    const primeira = (l.match(/([a-zA-Z_][a-zA-Z0-9_]*)=/) || [null, ''])[1];
    const token = (l.match(/^([A-Z][A-Z0-9]*) /) || [null, ''])[1];
    if (/^portao/.test(primeira)) excluidas++;
    else if (token && declaradas.has(token)) { excluidas_por_declaracao++; usos[token] = (usos[token] || 0) + 1; }
    else kept.push(l);
  }
  return { kept, excluidas, excluidas_por_declaracao, declaradas: Array.from(declaradas).sort(), declaracoes_sem_fila: Array.from(declaradas).filter((t) => !usos[t]).sort() };
}
// Uma cifra dupla so e defeito dentro de UMA medida. Os artefactos de uma medida comecam por `alvo=` e fecham-se na
// primeira linha de veredicto da familia `P<tres digitos>_`; as tabelas de casos (fixtures, tautologia) repetem
// `obtido` e `passam_os_quatro` linha a linha por construcao, e chamar-lhes defeito seria a regua a chumbar classe
// legitima. Sem regiao, o probe nao afirma nada. O fecho e tambem medido: `fecha_em` diz a linha que fechou a regiao
// e `cobre_o_fim` diz se nada mais do que linhas em branco se segue a ela, porque regiao encurtada por um veredicto
// no meio e uma varredura mais curta a dar verde.
function regiaoDeMedida(L) {
  const i = L.findIndex((l) => /^alvo=/.test(l));
  if (i < 0) return null;
  let j = -1;
  for (let k = i; k < L.length; k++) if (/^P\d{3}_/.test(L[k])) { j = k; break; }
  const corpo = L.slice(i, (j < 0 ? L.length : j + 1));
  return { corpo, fecha_em: j < 0 ? 'fim_do_ficheiro' : L[j].split(' ')[0], cobre_o_fim: j < 0 || L.slice(j + 1).every((l) => l.trim().length === 0) };
}
function duoNaRegiao(L) {
  const reg = regiaoDeMedida(L);
  if (!reg) return null;
  const { kept, excluidas, excluidas_por_declaracao, declaradas, declaracoes_sem_fila } = soMedidas(reg.corpo);
  return { kept, excluidas, excluidas_por_declaracao, declaradas, declaracoes_sem_fila, fecha_em: reg.fecha_em, cobre_o_fim: reg.cobre_o_fim, fora: duoDeCifras(kept) };
}
function corpoDe(r, veredicto) {
  return r.linhas.join('\n') + '\n' + r.portoes.join('\n') + '\n' + veredicto + '\n';
}
function veredictoDeClasse(r) {
  return 'P168_EDICAO_SEM_CORTE_OK classe=' + r.classe +
    (r.classe === 'acrescimo_no_fim' ? ' linhas_no_fim_do_ficheiro=' : ' linha_unica_tocada_no_indice=') + r.indiceDaLinha +
    ' linhas_acrescentadas=' + r.acrescentadas;
}
// O portao da cifra dupla corre antes de qualquer escrita: um artefacto com o mesmo nome e dois valores sai partido,
// nao sai com um deles. A linha `cifras_em_duo=0` mede a varredura do corpo SEM ella propria, porque o seu valor
// unico nao pode colidir consigo mesmo; o positivo prova-se com as duas linhas que o emissor antigo imprimia.
function corpoFinalOuAborto(r, veredicto) {
  const base = corpoDe(r, veredicto);
  const m = duoNaRegiao(base.split('\n'));
  if (!m) throw new Error('ABORTA: o corpo emitido nao comeca por `alvo=`, a varredura de cifras nao tem regiao onde medir');
  if (m.fora.length > 0) throw new Error('ABORTA cifras_em_duo=' + m.fora.length + ' ' + JSON.stringify(m.fora) + ' -- um nome com dois valores nao sao duas medidas, uma delas e falsa');
  return base + 'cifras_em_duo=0\n';
}

if (process.argv.includes('--duo')) {
  const alvoDuo = process.argv[process.argv.indexOf('--duo') + 1];
  if (!alvoDuo || alvoDuo.startsWith('--')) throw new Error('ABORTA: --duo pede o caminho duma captura como argumento seguinte');
  const L = readFileSync(alvoDuo, 'utf8').split('\n');
  const m = duoNaRegiao(L);
  if (!m) {
    console.log('DUO em=' + alvoDuo + ' linhas=' + L.length + ' regiao_de_medida=nao_encontrada: o ficheiro e uma tabela de casos, cada linha e uma medida sua, e repetir chaves entre linhas nao e cifra dupla');
    console.log('P168_DUO_FORA_DO_DOMINIO');
    process.exit(0);
  }
  console.log('DUO em=' + alvoDuo + ' linhas=' + L.length + ' varridas=' + m.kept.length + ' excluidas_por_portao=' + m.excluidas + ' tabelas_declaradas=' + JSON.stringify(m.declaradas) + ' filas_de_caso_excluidas=' + m.excluidas_por_declaracao + ' declaracoes_sem_fila=' + JSON.stringify(m.declaracoes_sem_fila) + ' regiao_fecha_em=' + m.fecha_em + ' regiao_cobre_o_fim=' + m.cobre_o_fim + ' cifras_em_duo=' + m.fora.length + ' listas=' + JSON.stringify(m.fora));
  console.log(m.fora.length > 0 ? 'P168_DUO_DE_CIFRAS_ACHADO' : 'P168_DUO_DE_CIFRAS_NENHUM');
  process.exit(0);
}

function analisa(headTexto, discoTexto, soMedir, opcao) {
  const classe = (opcao && opcao.classe) || CLASSE;
  const espera = opcao && Object.prototype.hasOwnProperty.call(opcao, 'espera') ? opcao.espera : ESPERA;
  // Medido na corrida que versionei como `evidence/p168-medicao-do-diario-SEM-EDICAO-PENDENTE-o-indice-ia-igual-a-cabeca-e-os-seis-portoes-estavam-vermelhos-por-nao-haver-edicao.txt`
  // (seis portoes vermelhos, delta_bytes=0): com o indice byte-identico a cabeca esta classe nao tem linha tocada, o
  // miolo fica vazio e a agulha da frase substituida fica a string vazia, que casa todas as linhas do ficheiro, por
  // isso as seis portas so podiam estar vermelhas. Um vermelho sem positivo e o mesmo defeito que o p171 acabou de
  // nomear na sua propria emissao, e o remedio e dar o nome ao estado, nunca arranjar uma edicao para que a regua
  // tenha o que morder. A classe de acrescimo nao passa por aqui: para ela o acrescimo zero e face legitima e ja tem
  // porta propria, o fixture A3.
  if (headTexto === discoTexto && classe !== 'acrescimo_no_fim') throw new Error('ABORTA_SEM_EDICAO_PENDENTE: o conteudo em disco e byte-identico ao de cabeca (' + Buffer.byteLength(discoTexto, 'utf8') + ' bytes, ' + discoTexto.split('\n').length + ' linhas) e nao ha edicao para provar nesta classe');
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
  const { comum, caudaOld, caudaNew } = parDeCaudas(a, b);
  const emHead = H.filter((l) => l.includes(caudaOld)).length;
  const emDisco = D.filter((l) => l.includes(caudaOld)).length;
  const linhas = [];
  const portoes = [];
  const chk = (nome, cond, obtido) => {
    portoes.push(nome + '=' + (cond ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(obtido));
    if (!cond && !soMedir) throw new Error('ABORTA ' + nome + ' nao se cumpre, obtido=' + JSON.stringify(obtido));
  };
  linhas.push('alvo=' + ALVO + ' repo=' + REPOReal);
  linhas.push('emissor_bytes=' + EMISSOR.bytes + ' emissor_md5=' + EMISSOR.md5);
  linhas.push('linhas_head=' + H.length + ' linhas_disco=' + D.length);
  linhas.push('bytes_head=' + Buffer.byteLength(headTexto, 'utf8') + ' bytes_disco=' + Buffer.byteLength(discoTexto, 'utf8') + ' delta_bytes=' + (Buffer.byteLength(discoTexto, 'utf8') - Buffer.byteLength(headTexto, 'utf8')));
  linhas.push('prefixo_identico_linhas=' + p + ' sufixo_identico_linhas=' + s);
  // Estas quatro linhas medem a vista do miolo, que so e a linha tocada na classe de substituicao e na de acrescimo
  // puro. Na classe mista o miolo e todo o resto do ficheiro, e imprimir `coluna_de_divergencia_na_linha_tocada=0`
  // com esse valor seria a cifra de uma grandeza que a classe nao define: a linha tocada la observada por indice.
  if (classe !== 'acrescimo_no_fim_com_uma_linha_tocada') {
    // O miolo nao e a regiao acrescentada na classe de acrescimo (la o que vale e `novas.length`, impresso pela classe),
    // por isso esta cifra tem nome proprio: partilhar o nome com a cifra da classe dava dois valores no mesmo artefacto.
    linhas.push('miolo_head_linhas=' + meioH.length + ' miolo_disco_linhas=' + meioD.length + ' linhas_acrescentadas_no_miolo=' + (meioD.length - 1));
    linhas.push('coluna_de_divergencia_na_linha_tocada=' + comum + ' bytes_da_cauda_substituida=' + Buffer.byteLength(caudaOld, 'utf8') + ' bytes_da_cauda_nova=' + Buffer.byteLength(caudaNew, 'utf8'));
    linhas.push('cauda_substituida_comeca_por=' + JSON.stringify(caudaOld.slice(0, 24)));
    linhas.push('frase_substituida_em_head_linhas=' + emHead + ' frase_substituida_em_disco_linhas=' + emDisco);
  }
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
  // A terceira classe e a forma como este diario e mesmo editado num fecho de ronda: uma linha reescrita a meio do
  // ficheiro (uma celula corrigida, um glifo fora do alfabeto trocado) e o bloco novo acrescentado no FIM. Nenhuma
  // das duas classes anteriores a mede, e isso foi medido antes de escrito: com os dois eixos no mesmo diff, o
  // portao_A1 da classe de acrescimo fica vermelho porque uma linha de head nao e igual ao disco, e o portao_1 da
  // classe de substituicao fica vermelho porque o sufixo comum e zero e o miolo passa a ser todo o resto do ficheiro.
  // Amaciar qualquer dos dois seria mover uma regua que ja tem fixture; o que falta era o predicado da classe mista,
  // por isso as linhas tocadas sao comparadas por INDICE (o alinhamento nao se move, so ha acrescimo depois do head)
  // e a substituicao em si e julgada pela mesma prédica de caudas da classe de substituicao, agora em parDeCaudas.
  if (classe === 'acrescimo_no_fim_com_uma_linha_tocada') {
    if (espera === null || espera === undefined) throw new Error('ABORTA: a classe de acrescimo com linha tocada exige a expectativa declarada, senao o verde nao tem o que medir');
    const dif = [];
    for (let i = 0; i < H.length; i++) if (H[i] !== D[i]) dif.push(i);
    const c = dif.length === 1 ? dif[0] : -1;
    const par = parDeCaudas(c < 0 ? '' : H[c], c < 0 ? '' : D[c]);
    const caudaTocada = par.caudaOld;
    const emHeadTocada = H.filter((l) => l.includes(caudaTocada)).length;
    const emDiscoTocada = D.filter((l) => l.includes(caudaTocada)).length;
    const novas = D.slice(H.length);
    linhas.push('classe_da_edicao=' + classe + ' indices_de_head_diferentes_do_disco=' + JSON.stringify(dif) + ' linha_tocada_no_indice=' + c);
    linhas.push('coluna_de_divergencia_na_linha_tocada=' + par.comum + ' bytes_da_cauda_substituida=' + Buffer.byteLength(caudaTocada, 'utf8') + ' bytes_da_cauda_nova=' + Buffer.byteLength(par.caudaNew, 'utf8'));
    linhas.push('frase_substituida_em_head_linhas=' + emHeadTocada + ' frase_substituida_em_disco_linhas=' + emDiscoTocada);
    linhas.push('linhas_novas=' + novas.length + ' linhas_novas_sem_conteudo=' + (novas.length - novas.filter((l) => l.trim().length > 0).length) + ' primeira_linha_nova_com_conteudo=' + JSON.stringify(primeiraComConteudo(novas).slice(0, 40)));
    chk('portao_C1_uma_unica_linha_de_head_diferente_do_disco', dif.length === 1, { indices: dif, head: H.length, disco: D.length });
    chk('portao_C2_o_disco_tem_acrescimo_depois_de_todo_o_head', novas.length > 0, { head: H.length, disco: D.length });
    chk('portao_C3_a_linha_tocada_mantem_cabeca_nao_vazia', par.comum > 0, par.comum);
    chk('portao_C4_a_substituida_dentro_da_linha_nao_vazia', caudaTocada.length > 0, Buffer.byteLength(caudaTocada, 'utf8'));
    chk('portao_C5_a_frase_substituida_e_unica_no_head', emHeadTocada === 1, emHeadTocada);
    chk('portao_C6_a_frase_substituida_nao_sobrevive_no_disco', emDiscoTocada === 0, emDiscoTocada);
    chk('portao_C7_o_acrescimo_contem_a_expectativa_declarada', novas.some((l) => l.indexOf(espera) >= 0), { espera: espera, em_linhas: novas.filter((l) => l.indexOf(espera) >= 0).length });
    chk('portao_C8_a_primeira_linha_nova_com_conteudo_traz_a_expectativa', primeiraComConteudo(novas).indexOf(espera) >= 0, { primeira_com_conteudo: primeiraComConteudo(novas).slice(0, 60), espera: espera });
    return { linhas, portoes, indiceDaLinha: c, acrescentadas: novas.length, classe: classe };
  }
  // A quarta classe e a forma duma correccao de uma frase a meio duma linha ja comitada, sem bloco novo no fim. As
  // outras tres nao a medem, e isso foi medido antes de escrito: na classe de substituicao o portao_2 exige mais de
  // uma linha no miolo, por isso uma linha crescida no sitio da-lhe VERMELHO com zero cortes (corrida verificada com
  // --medir); na mista o portao_C2 exige acrescimo depois do head; na de acrescimo puro o portao_A1 exige head
  // integral. Alargar qualquer um dos tres seria mover uma regua que ja tem fixture, pelo que o que faltava era o
  // predicado propio, julgado por INDICE e com o numero de linhas conferido.
  if (classe === 'linha_tocada_sem_acrescimo') {
    if (espera === null || espera === undefined) throw new Error('ABORTA: a classe de linha tocada sem acrescimo exige a expectativa declarada, senao o verde nao tem o que medir');
    const dif = [];
    for (let i = 0; i < H.length; i++) if (H[i] !== D[i]) dif.push(i);
    const c = dif.length === 1 ? dif[0] : -1;
    const par = parDeCaudas(c < 0 ? '' : H[c], c < 0 ? '' : D[c]);
    const caudaTocada = par.caudaOld;
    const emHeadTocada = H.filter((l) => l.includes(caudaTocada)).length;
    linhas.push('classe_da_edicao=' + classe + ' indices_de_head_diferentes_do_disco=' + JSON.stringify(dif) + ' linha_tocada_no_indice=' + c);
    linhas.push('coluna_de_divergencia_na_linha_tocada=' + par.comum + ' bytes_da_cauda_substituida=' + Buffer.byteLength(caudaTocada, 'utf8') + ' bytes_da_cauda_nova=' + Buffer.byteLength(par.caudaNew, 'utf8'));
    chk('portao_T1_uma_unica_linha_de_head_diferente_do_disco', dif.length === 1, { indices: dif, head: H.length, disco: D.length });
    chk('portao_T2_o_numero_de_linhas_nao_se_mexe', D.length === H.length, { head: H.length, disco: D.length });
    chk('portao_T3_a_linha_tocada_mantem_cabeca_nao_vazia', par.comum > 0, par.comum);
    chk('portao_T4_a_substituida_dentro_da_linha_nao_vazia', caudaTocada.length > 0, Buffer.byteLength(caudaTocada, 'utf8'));
    chk('portao_T5_a_frase_substituida_e_unica_no_head', emHeadTocada === 1, emHeadTocada);
    chk('portao_T6_a_linha_tocada_traz_a_expectativa_declarada', par.caudaNew.indexOf(espera) >= 0, { espera: espera, coluna_da_cauda_nova: par.caudaNew.indexOf(espera) });
    return { linhas, portoes, indiceDaLinha: c, acrescentadas: D.length - H.length, classe: classe };
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
  const CC = { classe: 'acrescimo_no_fim_com_uma_linha_tocada', espera: 'SM.57. cabecalho do bloco' };
  const TD = { classe: 'linha_tocada_sem_acrescimo', espera: 'SUBSTITUICAO DO RESTO DA FRASE.' };
  const FIM = '\nSM.57. cabecalho do bloco\nitem um do bloco';
  // O diff da classe mista: a linha 35 reescrita no sitio, sem linhas inseridas ao lado, e o bloco só depois do fim
  // do head. e exactamente a forma dum fecho de ronda neste diario, por isso os casos dela constroem-se daqui.
  const tocada = headTxt(null).replace(velho, ok);
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
    // O caso espelho do A3, na outra classe: sem edicao nenhuma o veredicto honesto e o nome do estado, nao seis
    // portas vermelhas. Sem este fixture o aborta so existiria na prosa do cabecalho.
    ['B1_sem_edicao_pendente_o_disco_igual_a_cabeca_na_classe_de_substituicao', headTxt(null), headTxt(null), true, 'ABORTA_SEM_EDICAO_PENDENTE'],
    // A classe mista, nos dois sentidos: o positivo e cada uma das sete portas vermelhas com o seu caso proprio.
    ['C1_positivo_linha_tocada_a_meio_mais_acrescimo_no_fim', headTxt(null), tocada + FIM, false, '-', CC],
    ['C2_duas_linhas_de_head_diferentes_do_disco', headTxt(null), tocada.replace(base[10], base[10] + ' OUTRA TOCADA') + FIM, true, 'portao_C1', CC],
    ['C3_linha_tocada_sem_acrescimo_no_fim', headTxt(null), tocada, true, 'portao_C2', CC],
    ['C4_linha_tocada_reescrita_desde_o_primeiro_byte', headTxt(null), headTxt(null).replace(velho, 'W' + velho.slice(1)) + FIM, true, 'portao_C3', CC],
    ['C5_acrescimo_puro_no_fim_da_linha_tocada', headTxt(null), headTxt(null).replace(velho, velho + ' acrescimo puro no fim') + FIM, true, 'portao_C4', CC],
    ['C6_frase_antiga_duplicada_noutro_lugar_do_head', headTxt(cauda), headTxt(cauda).replace(velho, ok) + FIM, true, 'portao_C5', CC],
    ['C7_frase_antiga_preservada_dentro_do_acrescimo', headTxt(null), tocada + '\nSM.57. cabecalho do bloco\n' + cauda, true, 'portao_C6', CC],
    ['C8_acrescimo_que_nao_traz_o_cabecalho_declarado', headTxt(null), tocada + '\nparagrafo sem titulo nenhum', true, 'portao_C7', CC],
    ['C9_primeira_linha_nova_solta_antes_do_cabecalho', headTxt(null), tocada + '\nparagrafo solto\nSM.57. cabecalho do bloco', true, 'portao_C8', CC],
    ['C10_classe_sem_expectativa_declara_da_aborta', headTxt(null), tocada + FIM, true, 'ABORTA: a classe de acrescimo com linha tocada exige', { classe: 'acrescimo_no_fim_com_uma_linha_tocada', espera: null }],
    ['C11_sem_edicao_pendente_o_disco_igual_a_cabeca_na_classe_mista', headTxt(null), headTxt(null), true, 'ABORTA_SEM_EDICAO_PENDENTE', CC],
    // A quarta classe nos dois sentidos: o positivo e cada uma das seis portas vermelhas com o seu caso proprio, e o
    // caso que e Verde na classe mista mas vermelho aqui (acrescimo depois do head) e o que prova que as duas nao sao
    // a mesma régua.
    ['D1_positivo_linha_crescida_no_sitio_sem_acrescimo', headTxt(null), headTxt(null).replace(velho, ok), false, '-', TD],
    ['D2_duas_linhas_de_head_diferentes_do_disco', headTxt(null), headTxt(null).replace(velho, ok).replace(base[10], base[10] + ' OUTRA TOCADA'), true, 'portao_T1', TD],
    ['D3_acrescimo_depois_de_todo_o_head_nao_e_esta_classe', headTxt(null), headTxt(null).replace(velho, ok) + FIM, true, 'portao_T2', TD],
    ['D4_linha_reescrita_desde_o_primeiro_byte', headTxt(null), headTxt(null).replace(velho, 'W' + velho.slice(1)), true, 'portao_T3', TD],
    ['D5_acrescimo_puro_no_fim_da_linha_tocada', headTxt(null), headTxt(null).replace(velho, velho + ' acrescimo puro no fim'), true, 'portao_T4', TD],
    ['D6_frase_antiga_em_duas_linhas_do_head', headTxt(cauda), headTxt(cauda).replace(velho, ok), true, 'portao_T5', TD],
    ['D7_linha_tocada_sem_a_expectativa_declarada', headTxt(null), headTxt(null).replace(velho, velho.slice(0, corte) + ' OUTRA FRASE QUALQUER'), true, 'portao_T6', TD],
    ['D8_classe_sem_expectativa_declara_da_aborta', headTxt(null), headTxt(null).replace(velho, ok), true, 'ABORTA: a classe de linha tocada sem acrescimo exige', { classe: 'linha_tocada_sem_acrescimo', espera: null }],
  ];
  const saida = [];
  const veredictos = [];
  const CAB = 'alvo=docs/auditoria-bfr-conecta.md repo=/x emissor_bytes=1 emissor_md5=a1';
  const LIN_PORTAO = 'portao_1_uma_unica_linha_de_head_alterada=OK obtido=1';
  const LIN_VEREDICTO = 'P168_EDICAO_SEM_CORTE_OK classe=acrescimo_no_fim linhas_no_fim_do_ficheiro=5155 linhas_acrescentadas=16';
  const COLISAO = [CAB, 'miolo_head_linhas=0 miolo_disco_linhas=16 linhas_acrescentadas=15', LIN_PORTAO, LIN_VEREDICTO];
  const CORIGIDA = [CAB, 'miolo_head_linhas=0 miolo_disco_linhas=16 linhas_acrescentadas_no_miolo=15', LIN_PORTAO, LIN_VEREDICTO];
  const TABELA = ['F1_INESPERADO ABORTA: uma_unica_linha_alterada nao se cumpre, obtido=5', 'F2_ABORTOU ABORTA: uma_unica_linha_alterada nao se cumpre, obtido=30'];
  // O fecho da regiao passou a ser da familia `P<tres digitos>_` para que una pieza nova peca esta regua em vez de a
  // reimplementar. Os dois sentidos provam-se com veredicto doutro nome: antes do fecho a colisao e apanhada, depois
  // do fecho nao e julgada, e `fecha_em` diz qual linha encerrou a varredura.
  const VEREDICTO_ESTRANGEIRO = 'P171_AGRUPAMENTO_MEDIDO grupos=4 soma_dos_grupos=36';
  const ANTES_DO_FECHO = [CAB, 'abertas=36', 'abertas=40', VEREDICTO_ESTRANGEIRO];
  const DEPOIS_DO_FECHO = [CAB, 'abertas=36', VEREDICTO_ESTRANGEIRO, 'abertas=40'];
  const dAntesDoFecho = duoNaRegiao(ANTES_DO_FECHO);
  const dDepoisDoFecho = duoNaRegiao(DEPOIS_DO_FECHO);
  const dColisao = duoNaRegiao(COLISAO);
  const dCorrigida = duoNaRegiao(CORIGIDA);
  const dTabela = duoNaRegiao(TABELA);
  const semRegiao = duoDeCifras(soMedidas(TABELA).kept);
  console.log('PROVA_DUO_DE_CIFRAS colisao=' + JSON.stringify(dColisao && dColisao.fora) + ' corrigida=' + JSON.stringify(dCorrigida && dCorrigida.fora) + ' tabela_sem_regiao=' + (dTabela === null ? 'true' : 'false') + ' tabela_se_varrida_sem_regiao_daria=' + semRegiao.length + ' portoes_excluidas=' + (dColisao ? dColisao.excluidas : -1) + ' fecho_estrang=' + (dAntesDoFecho ? dAntesDoFecho.fecha_em : 'null') + ' antes_do_fecho_apanhado=' + (dAntesDoFecho ? dAntesDoFecho.fora.length : -1) + ' depois_do_fecho_julgado=' + (dDepoisDoFecho ? dDepoisDoFecho.fora.length : -1) + ' depois_cobre_o_fim=' + (dDepoisDoFecho ? dDepoisDoFecho.cobre_o_fim : 'null'));
  if (!dAntesDoFecho || dAntesDoFecho.fecha_em !== 'P171_AGRUPAMENTO_MEDIDO') throw new Error('ABORTA: um veredicto doutro nome da familia nao fechou a regiao, deu ' + (dAntesDoFecho ? dAntesDoFecho.fecha_em : 'null'));
  if (!dAntesDoFecho || dAntesDoFecho.fora.length !== 1) throw new Error('ABORTA: a colisao antes do fecho da familia nao foi apanhada, deu ' + (dAntesDoFecho ? dAntesDoFecho.fora.length : 'null'));
  if (!dDepoisDoFecho || dDepoisDoFecho.fora.length !== 0) throw new Error('ABORTA: a regiao nao se fechou no veredicto, a linha depois dele foi julgada');
  if (!dDepoisDoFecho || dDepoisDoFecho.cobre_o_fim !== false) throw new Error('ABORTA: cobre_o_fim afirmou o fim dum ficheiro que tem linhas depois do fecho');
  if (!dColisao || dColisao.fora.length !== 1) throw new Error('ABORTA: a regua nao dispara na colisao fabricada das duas linhas do emissor antigo, deu ' + JSON.stringify(dColisao && dColisao.fora));
  if (!dCorrigida || dCorrigida.fora.length !== 0) throw new Error('ABORTA: o layout corrigido ainda aparece com cifra dupla, deu ' + JSON.stringify(dCorrigida && dCorrigida.fora));
  if (dTabela !== null) throw new Error('ABORTA: a regua tratou uma tabela de casos como uma medida, o que faria dela uma regua que chumba classe legitima');
  if (dColisao.excluidas !== 1) throw new Error('ABORTA: a linha de portao nao foi excluida pelo nome, deu ' + dColisao.excluidas);
  // A face (e) do §SM.77: as filas duma tabela de casos repetem `linha` e `char_varrido` por construcao, e a regua
  // julgava-as uma medida. Quem imprime as filas declara os prefixos numa linha `TABELAS_DECLARADAS [TOKEN …]` e a
  // regua le a lista do proprio artefacto. Os quatro fixtures separam as quatro coisas que a declaracao pode fazer,
  // cada uma com o seu contra-exemplo: com declaracao as filas saem, sem declaracao as mesmas filas dao vermelho
  // (logo e a declaracao que julga, nao a regua afrouxada), uma cifra dupla numa linha de MEDIDA continua vermelha
  // com declaracao presente (a declaracao nao serve para esconder), e uma declaracao sem fila imprime-se como censo
  // e nao como vermelho, porque zero ofensores duma classe legitima e o resultado honesto dum ficheiro limpo.
  const DECL = 'TABELAS_DECLARADAS [ADJ OFENSOR]';
  const FILAS = ['ADJ #1/2 [2a] linha=5 char_varrido=90', 'ADJ #2/2 [3b] linha=9 char_varrido=140'];
  const dE1 = duoNaRegiao([CAB, 'CANDIDATOS=2 POSICOES_DISTINTAS=2', DECL].concat(FILAS, [LIN_VEREDICTO]));
  const dE2 = duoNaRegiao([CAB, 'CANDIDATOS=2 POSICOES_DISTINTAS=2'].concat(FILAS, [LIN_VEREDICTO]));
  const dE3 = duoNaRegiao([CAB, 'CANDIDATOS=2', DECL].concat(FILAS, ['CANDIDATOS=7', LIN_VEREDICTO]));
  const dE4 = duoNaRegiao([CAB, 'FORA_DO_LATINO=0', DECL, LIN_VEREDICTO]);
  console.log('PROVA_DUO_DE_TABELAS com_declaracao_fora=' + dE1.fora.length + ' filas_excluidas=' + dE1.excluidas_por_declaracao + ' declaradas_lidas=' + JSON.stringify(dE1.declaradas) + ' sem_declaracao_fora=' + dE2.fora.length + ' dupla_em_linha_de_medida_com_declaracao_fora=' + dE3.fora.length + ' declaracao_sem_fila_sem_ocorrencia=' + JSON.stringify(dE4.declaracoes_sem_fila) + ' declaracao_sem_fila_fora=' + dE4.fora.length);
  if (dE1.fora.length !== 0 || dE1.excluidas_por_declaracao !== 2) throw new Error('ABORTA: com a declaracao presente as filas ainda foram julgadas como uma medida (fora=' + dE1.fora.length + ', filas=' + dE1.excluidas_por_declaracao + ')');
  if (dE2.fora.length === 0) throw new Error('ABORTA: sem declaracao as MESMAS filas deram o mesmo veredicto — entao nao era a declaracao que mudava o julgamento, era a regua que tinha deixado de medir');
  if (dE3.fora.length !== 1) throw new Error('ABORTA: uma cifra dupla numa linha de medida desapareceu por haver declaracao de tabela no artefacto — a declaracao serviria para esconder, deu ' + JSON.stringify(dE3.fora));
  if (dE4.fora.length !== 0 || dE4.declaracoes_sem_fila.length !== 2) throw new Error('ABORTA: uma declaracao sem fila nao foi censada como censo (sem_ocorrencia=' + JSON.stringify(dE4.declaracoes_sem_fila) + ', fora=' + dE4.fora.length + ')');
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
  process.stdout.write(corpoFinalOuAborto(r, 'P168_MEDICAO_SEM_ABORTO linha_unica_tocada_no_indice=' + r.indiceDaLinha));
  process.exit(0);
}

const destino = process.argv[2];
if (!destino || destino === ALVO) throw new Error('ABORTA: passe o caminho da captura como argv[2], antes do alvo opcional');
if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const { head, disco } = lePar();
const r = analisa(head, disco, false);
const corpo = corpoFinalOuAborto(r, veredictoDeClasse(r));
writeFileSync(destino, corpo, 'utf8');
process.stdout.write(corpo);
