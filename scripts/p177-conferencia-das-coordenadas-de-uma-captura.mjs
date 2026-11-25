// Conferencia independente das coordenadas que um varredor por ocorrencia imprime: re-conta a regua linha a linha no
// proprio ficheiro varrido e bate o multiset de agulhas de cada linha contra o que a captura lhe atribuiu. Serve
// para o verde dum conserto nao ser autorreferente -- a contagem por linha e uma rota que o produtor nao percorre,
// porque ele varre o bloco inteiro de um golpe.
// A regua NAO e reescrita aqui: `RE` e `limpa` sao lidos do fonte do produtor e a peca aborta se nao os ler, porque
// uma copia aproximada passaria a medir outra coisa consoante o ficheiro.
// Uso: node scripts/p177-conferencia-das-coordenadas-de-uma-captura.mjs <ficheiro-varrido> <captura> [<captura-saida>]
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUTOR = 'scripts/p169-varredura-letra-digito-do-bloco.mjs';
const alvo = process.argv[2];
const captura = process.argv[3];
const destino = process.argv[4];
if (!alvo || !captura) throw new Error('ABORTA: passe o ficheiro varrido e a captura');
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
say('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));

const produtor = readFileSync(PRODUTOR, 'utf8');
const linhaRE = produtor.split('\n').find((l) => l.startsWith('const RE = '));
const linhaLimpa = produtor.split('\n').find((l) => l.startsWith('const limpa = '));
if (!linhaRE || !linhaLimpa) throw new Error('ABORTA: a regua do produtor nao foi lida do fonte (RE/limpa), e sem leitura nao ha copia fiel');
const RE = new Function('return ' + linhaRE.slice('const RE = '.length).replace(/;\s*$/, ''))();
const limpa = new Function('return ' + linhaLimpa.slice('const limpa = '.length).replace(/;\s*$/, ''))();
say('regua_lida_de=' + PRODUTOR);
say('RE=' + String(RE) + ' limpa=' + linhaLimpa.slice(0, 62));

function multisetDas(agulhas) {
  const m = {};
  for (const a of agulhas) m[a] = (m[a] || 0) + 1;
  return m;
}
function chaveOrdem(m) {
  return JSON.stringify(Object.keys(m).sort().map((k) => k + ':' + m[k]));
}
function julga(textoDoFicheiro, linhasDaCaptura) {
  const linhasFicheiro = textoDoFicheiro.split('\n');
  const medidoPorLinha = {};
  linhasFicheiro.forEach((t, k) => {
    const m = (limpa(t).match(RE) || []);
    if (m.length) medidoPorLinha[k + 1] = multisetDas(m);
  });
  const atribuidoPorLinha = {};
  let naoConferiveis = 0;
  const adjs = linhasDaCaptura.filter((l) => l.startsWith('ADJ '));
  if (adjs.length === 0) throw new Error('ABORTA: nenhuma linha ADJ na captura -- o zero duma conferencia sem candidatos nao e verde nenhum');
  for (const l of adjs) {
    const agulha = /\[(.+?)\]/.exec(l);
    const ln = /linha_no_ficheiro=(\S+)/.exec(l);
    const qd = /quadro_linha=(\S+)/.exec(l);
    if (!agulha || !ln || !qd) throw new Error('ABORTA: linha ADJ sem agulha, linha ou quadro declarados: ' + l.slice(0, 120));
    if (qd[1] !== 'ficheiro') { naoConferiveis++; continue; }
    const L = Number(ln[1]);
    if (!atribuidoPorLinha[L]) atribuidoPorLinha[L] = {};
    atribuidoPorLinha[L][agulha[1]] = (atribuidoPorLinha[L][agulha[1]] || 0) + 1;
  }
  const linhas = Object.keys(atribuidoPorLinha).map(Number).sort((a, b) => a - b);
  const relatorio = [];
  let divergentes = 0;
  for (const L of linhas) {
    const a = atribuidoPorLinha[L];
    const b = medidoPorLinha[L] || {};
    const igual = chaveOrdem(a) === chaveOrdem(b);
    if (!igual) divergentes++;
    relatorio.push((igual ? 'IGUAL   ' : 'DIVERGE ') + 'linha=' + L + ' atribuido=' + chaveOrdem(a) + ' medido_na_linha=' + chaveOrdem(b));
  }
  return { adjs: adjs.length, linhas, divergentes, naoConferiveis, relatorio };
}

// Fixtures nos tres sentidos, em tempo de execucao e fora do repo: sem eles a conferencia so saberia o caso limpo,
// que e o caso em que nao ha nada a conferir. O terceiro fixture e o quadro: se a captura declara que a linha nao e
// do ficheiro, a conferencia tem de dizer PARCIAL e nao pode assinar OK.
const CRASE = String.fromCharCode(0x60);
const fx = join(tmpdir(), 'p177-fx-' + process.pid);
mkdirSync(fx, { recursive: true });
const FIX_FICHEIRO = ['uma linha com 28papeis e 3contas aqui', 'outra linha com 5contas la', 'terceira limpa'].join('\n');
const FIX_OK = ['QUADRO_DA_LINHA {"novas_linhas_bruto":2,"novas_linhas_varrido":2,"linha_e_do_bruto":true} bloco_inicio_linha_no_ficheiro=1',
  'ADJ #1/3 [8p] x1 linha_no_texto_varrido=1 linha_no_ficheiro=1 quadro_linha=ficheiro coluna=6 :: "x"',
  'ADJ #2/3 [3c] x1 linha_no_texto_varrido=1 linha_no_ficheiro=1 quadro_linha=ficheiro coluna=18 :: "x"',
  'ADJ #3/3 [5c] x1 linha_no_texto_varrido=2 linha_no_ficheiro=2 quadro_linha=ficheiro coluna=6 :: "x"'].join('\n');
const FIX_LINHA_TROCADA = FIX_OK.replace('linha_no_ficheiro=2', 'linha_no_ficheiro=3');
const FIX_QUADRO_TXT = FIX_OK.replace(/quadro_linha=ficheiro/g, 'quadro_linha=texto_varrido');
const fxLinha = (s) => s.split('\n');
const jOk = julga(FIX_FICHEIRO, fxLinha(FIX_OK));
const jTrocada = julga(FIX_FICHEIRO, fxLinha(FIX_LINHA_TROCADA));
const jParcial = julga(FIX_FICHEIRO, fxLinha(FIX_QUADRO_TXT));
say('PROVA_FIXTURE_CONFERENCIA ok=[div=' + jOk.divergentes + ',parc=' + jOk.naoConferiveis + ',linhas=' + jOk.linhas.length + '] linha_trocada=[div=' + jTrocada.divergentes + '] sem_quadro=[div=' + jParcial.divergentes + ',parc=' + jParcial.naoConferiveis + ']');
if (jOk.divergentes !== 0 || jOk.naoConferiveis !== 0 || jOk.linhas.length !== 2) throw new Error('ABORTA: o fixture limpo da conferencia nao deu zero e duas linhas, deu ' + JSON.stringify([jOk.divergentes, jOk.naoConferiveis, jOk.linhas.length]));
if (jTrocada.divergentes !== 1) throw new Error('ABORTA: a conferencia nao tem positivo para a linha trocada, deu ' + jTrocada.divergentes + ' -- um verde assim nao confere nada');
if (jParcial.naoConferiveis !== 3 || jParcial.divergentes !== 0) throw new Error('ABORTA: o quadro fora do ficheiro nao foi contabilizado como nao conferivel, deu ' + JSON.stringify([jParcial.divergentes, jParcial.naoConferiveis]));

const corpo = readFileSync(captura, 'utf8');
const linhasCaptura = corpo.split('\n');
const quadroLinha = (linhasCaptura.find((l) => l.startsWith('QUADRO_DA_LINHA ')) || '').trim();
if (!quadroLinha) throw new Error('ABORTA: a captura nao declara QUADRO_DA_LINHA, nao ha como saber o quadro das suas linhas');
const r = julga(readFileSync(alvo, 'utf8'), linhasCaptura);
for (const l of r.relatorio) say(l);
say('quadro_lido_da_captura=' + quadroLinha);
say('ADJ_impressas=' + r.adjs + ' linhas_julgadas=' + r.linhas.length + ' coordenadas_fora_do_quadro_do_ficheiro=' + r.naoConferiveis);
say('unidade_da_conferencia=multiset_de_agulhas_por_linha_do_ficheiro_e_nao_linhas_de_candidato');
say('portao_toda_linha_julgada_bate=' + (r.divergentes === 0 && r.naoConferiveis === 0 ? 'OK' : 'VERMELHO') + ' obtido=[divergentes=' + r.divergentes + ', sem_quadro=' + r.naoConferiveis + '] esperado=[divergentes=0, sem_quadro=0]');
if (destino) writeFileSync(destino, capt.join('\n') + '\n', 'utf8');
if (r.divergentes !== 0 || r.naoConferiveis !== 0) throw new Error('ABORTA: a conferencia das coordenadas deu divergentes=' + r.divergentes + ' sem_quadro=' + r.naoConferiveis);
process.stdout.write('P177_COORDENADAS_CONFERIDAS linhas=' + r.linhas.length + ' adjs=' + r.adjs + '\n');
