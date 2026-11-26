// Cobertura da varredura do `p173`. A pergunta que ele responde: que fraccao do alvo e mesmo varrida, e o que
// ficou dentro dum span de backtick (a `limpa` do produtor retira esses spans antes de contar, por isso uma
// captura com muitos nomes entre backticks pode dar zero sem ter varrido o ficheiro).
// Os numeros da cobertura mudam com o alvo, por isso NAO sao escritos aqui: leem-se da linha COBERTURA da corrida
// (chars_crus, chars_varridos, linhas_totalmente_comidas) e da COBERTURA_FRACAO. A 1.ª versao dactilografou os do
// fonte do `p181` e envelheceram no instante em que o `p181` foi editado -- régua que se move com o medido.
// O produtor varre com /backtick nao-backtick* backtick/, por isso um nome que eu acho dentro
// dum span pode estar fora e vice-versa: com numero impar de backticks o emparelhamento desloca-se a partir do
// ultimo, e e isso que a clausula C3 chumba. As duas rotas dao o numero da diferenca, que e o que a rota A nao ve.
// Duas rotas, sempre: (A) o texto varrido pelo produtor -- a mesma coisa que o `p173` conta; (B) o texto bruto com
// os backticks neutralizados (U+0060 -> U+007E, que nao cria adjacencia letra-digito). A diferenca entre as duas
// rotas e a lista do que a rota A nao ve, com a linha do FICHEIRO (contada no bruto, nao no varrido).
// A regra das familias nao e reescrita aqui: RE, faixasOfensoras e limpa sao lidos do fonte do produtor (`p169`)
// e a peca aborta se nao os ler.
// Uso: node scripts/p182-cobertura-da-varredura.mjs <caminho-do-alvo> [<caminho-da-captura>]
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUF = process.env.P182_SUF;
if (!SUF) throw new Error('ABORTA: P182_SUF e obrigatorio -- cada corrida precisa de nome proprio');
const SELFTESTE = process.argv.includes('--selfteste');
const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const alvo = process.argv[2];
if (!alvo) throw new Error('ABORTA: passe o caminho do alvo como argv[2]');
const destino = process.argv[3];
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };
// A captura e escrita ANTES de qualquer aborto do veredicto: na 1.ª versao o `writeFileSync` vivia depois do
// `throw`, por isso a corrida sm70l -- que era justamente a que chumbava -- nao deixou prova em disco. Um
// instrumento que so grava quando esta verde nao e um instrumento, e um relatorio do que ja se sabia.
const grava = () => { if (destino) writeFileSync(destino, capt.join('\n') + '\n'); };

const produtorCaminho = REPO + '/scripts/p169-varredura-letra-digito-do-bloco.mjs';
const produtor = readFileSync(produtorCaminho, 'utf8');
const linhaRE = produtor.split('\n').find((l) => l.startsWith('const RE = '));
const linhaFaixas = produtor.split('\n').find((l) => l.startsWith('const faixasOfensoras = '));
const linhaLimpa = produtor.split('\n').find((l) => l.startsWith('const limpa = '));
if (!linhaRE || !linhaFaixas || !linhaLimpa) throw new Error('ABORTA: a regua do produtor nao foi lida do fonte (RE/faixasOfensoras/limpa), e sem leitura nao ha copia fiel');
const RE = new Function('return ' + linhaRE.slice('const RE = '.length).replace(/;\s*$/, ''))();
const REg = new RegExp(RE.source, RE.flags.indexOf('g') >= 0 ? RE.flags : RE.flags + 'g');
const faixasOfensoras = new Function('return ' + linhaFaixas.slice('const faixasOfensoras = '.length).replace(/;\s*$/, ''))();
const limpa = new Function('return ' + linhaLimpa.slice('const limpa = '.length).replace(/;\s*$/, ''))();
const CRASE = String.fromCharCode(0x60);
const TIL = String.fromCharCode(0x7e);

// Modelo de spans: os backticks aparecem por ordem e emparelham (0,1) (2,3) ... -- e exactamente o que uma
// substituicao nao-gulosa do tipo backtick, zero ou mais caracteres que nao sejam backtick, backtick faz. Um par
// cujo segundo backtick esta noutra linha come as linhas do meio. A regra e descrita, nunca escrita com o glifo:
// reproduzir o padrao dentro dum comentario da peca e o que faz o numero de backticks do proprio ficheiro ficar
// impar e deslocar o emparelhamento que ela mede (medido a 25/11 na corrida sm70m: 13, o impar na linha 45).
function spansDoTexto(texto) {
  const pos = [];
  for (let i = texto.indexOf(CRASE); i >= 0; i = texto.indexOf(CRASE, i + 1)) pos.push(i);
  const spans = [];
  for (let k = 0; k + 1 < pos.length; k += 2) spans.push({ a: pos[k], b: pos[k + 1] });
  const sobra = pos.length % 2 === 1 ? pos[pos.length - 1] : null;
  return { pos, spans, sobra };
}
function linhaDoBruto(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}
function rotas(texto) {
  const varrido = limpa(texto);
  const neutralizado = texto.split(CRASE).join(TIL);
  const conta = (t) => [...t.matchAll(REg)].map((m) => m[0]);
  const emSpan = (s, indice) => s.spans.some((x) => indice > x.a && indice < x.b);
  const sp = spansDoTexto(texto);
  const brutoOcs = [...neutralizado.matchAll(REg)];
  const dentroDeSpan = brutoOcs.filter((m) => emSpan(sp, m.index)).map((m) => ({ agulha: m[0], linha: linhaDoBruto(texto, m.index) }));
  return {
    chars_crus: texto.length,
    chars_varridos: varrido.length,
    chars_retirados_pela_limpa: texto.length - varrido.length,
    backticks: sp.pos.length,
    spans: sp.spans.length,
    spans_que_cruzam_a_quebra: sp.spans.filter((x) => texto.slice(x.a, x.b).indexOf('\n') >= 0).length,
    linhas_do_ficheiro: texto.split('\n').length,
    linhas_totalmente_comidas: (() => {
      let n = 0;
      const linhas = texto.split('\n');
      let off = 0;
      for (let i = 0; i < linhas.length; i++) {
        const interior = linhas[i].length > 0 && sp.spans.some((x) => off >= x.a && off + linhas[i].length <= x.b);
        if (interior) n++;
        off += linhas[i].length + 1;
      }
      return n;
    })(),
    backtick_sem_fecho: sp.sobra === null ? null : { indice: sp.sobra, linha: linhaDoBruto(texto, sp.sobra) },
    candidatos_rota_A_varrido: conta(varrido).length,
    candidatos_rota_B_bruto_neutralizado: brutoOcs.length,
    escondidos_dentro_de_span: dentroDeSpan,
  };
}

function fixtures() {
  const cs = [];
  const add = (nome, fn) => cs.push({ nome, fn });
  const C = CRASE;
  add('positivo_span_inline_esconde_uma_agulha_na_rota_A', () => {
    const t = 'o nome ' + C + 'campanha-sm69-a' + C + ' e depois 7contas no fim';
    const r = rotas(t);
    return r.escondidos_dentro_de_span.length === 1 && r.candidatos_rota_A_varrido < r.candidatos_rota_B_bruto_neutralizado;
  });
  add('negativo_texto_sem_backticks_da_as_duas_rotas_iguais', () => {
    const r = rotas('7contas e 28papeis sem nomes entre plicas');
    return r.backticks === 0 && r.candidatos_rota_A_varrido === r.candidatos_rota_B_bruto_neutralizado && r.escondidos_dentro_de_span.length === 0;
  });
  add('positivo_backtick_impar_e_reportado_com_a_linha', () => {
    const r = rotas('linha_um ' + C + 'fechado' + C + '\nlinha_dois ' + C + '\nlinha_tres\n');
    return r.backticks === 3 && r.backtick_sem_fecho !== null && r.backtick_sem_fecho.linha === 2;
  });
  add('negativo_backtick_par_nao_da_sem_fecho', () => {
    const r = rotas('a ' + C + 'x' + C + '\nb ' + C + 'y' + C + '\n');
    return r.backticks === 4 && r.backtick_sem_fecho === null;
  });
  add('positivo_span_que_cruza_a_quebra_come_linhas', () => {
    const r = rotas('um ' + C + 'abc\ndef\nghi' + C + ' jk\n');
    return r.spans_que_cruzam_a_quebra === 1 && r.linhas_totalmente_comidas === 1 && r.chars_varridos < r.chars_crus;
  });
  add('negativo_o_varrido_do_produtor_e_a_rota_A', () => {
    const t = 'x ' + C + 'nome-sm41' + C + ' y 5turnos';
    return rotas(t).candidatos_rota_A_varrido === (limpa(t).match(REg) || []).length;
  });
  return cs;
}

if (SELFTESTE) {
  const cs = fixtures();
  const faltas = cs.filter((c) => !c.fn());
  cs.forEach((c) => say((faltas.includes(c) ? 'FALTA ' : 'OK     ') + c.nome));
  say('P182_SELFTESTE ' + cs.length + '/' + faltas.length + ' · ' + SUF);
  grava();
  if (faltas.length) throw new Error('ABORTA: selfteste com faltas');
} else {
  const bruto = readFileSync(alvo, 'utf8');
  const r = rotas(bruto);
  say('alvo=' + alvo + ' bytes=' + Buffer.byteLength(bruto, 'utf8') + ' bytes_md5_8=' + createHash('md5').update(bruto).digest('hex').slice(0, 8));
  say('emissor_p182_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_p182_md5=' + createHash('md5').update(EU).digest('hex'));
  say('produtor_p169_bytes=' + Buffer.byteLength(produtor, 'utf8') + ' produtor_p169_md5_8=' + createHash('md5').update(produtor).digest('hex').slice(0, 8));
  say('COBERTURA ' + JSON.stringify(r));
  const frac = r.chars_crus > 0 ? (r.chars_varridos / r.chars_crus) : 1;
  say('COBERTURA_FRACAO_varrido_sobre_cru=' + frac.toFixed(4) + ' linhas_comidas=' + r.linhas_totalmente_comidas + '/' + r.linhas_do_ficheiro);
  for (const e of r.escondidos_dentro_de_span) say('ESCONDIDO_NO_SPAN [' + e.agulha + '] linha_do_ficheiro=' + e.linha);
  if (r.backtick_sem_fecho) say('SEM_FECHO backtick_impar_na_linha=' + r.backtick_sem_fecho.linha + ' -- a partir dele o emparelhamento que eu espero nao e o do produtor, por isso C3 chumba');
  const g = {
    C1_a_rota_A_e_mesmo_o_varrido_do_produtor: { ok: r.candidatos_rota_A_varrido === (limpa(bruto).match(REg) || []).length, obtido: [r.candidatos_rota_A_varrido, (limpa(bruto).match(REg) || []).length] },
    C2_a_diferenca_das_rotas_e_a_lista_dos_escondidos: { ok: r.candidatos_rota_B_bruto_neutralizado - r.candidatos_rota_A_varrido === r.escondidos_dentro_de_span.length, obtido: [r.candidatos_rota_B_bruto_neutralizado, r.candidatos_rota_A_varrido, r.escondidos_dentro_de_span.length] },
    C3_par_de_backticks_impar_chumba_porque_desloca_o_emparelhamento: { ok: r.backticks % 2 === 0, obtido: [r.backticks, r.backtick_sem_fecho] },
    C4_a_fracao_de_cobertura_e_impressa: { ok: frac > 0 && Number.isFinite(frac), obtido: frac.toFixed(4) },
    C5_uma_alegacao_de_zero_so_se_cita_a_cobertura: { ok: r.candidatos_rota_A_varrido !== 0 || r.chars_retirados_pela_limpa === 0, obtido: [r.candidatos_rota_A_varrido, r.chars_retirados_pela_limpa] },
  };
  Object.keys(g).forEach((k) => say('portao_' + k + '=' + (g[k].ok ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(g[k].obtido)));
  say('P182_COBERTURA ' + Object.keys(g).filter((k) => g[k].ok).length + '/' + Object.keys(g).filter((k) => !g[k].ok).length + ' · ' + SUF);
  grava();
  if (Object.keys(g).some((k) => !g[k].ok)) throw new Error('ABORTA: cobertura da varredura com faltas, veja os portoes acima');
}
if (destino) writeFileSync(destino, capt.join('\n') + '\n');
