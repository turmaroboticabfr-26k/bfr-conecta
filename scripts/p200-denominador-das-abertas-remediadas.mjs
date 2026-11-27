// Denominador falso-falsificavel da pergunta «quantas das ABERTA de hoje tem causa re-medida por instrumento?».
// A conta no ar nao e medida: esta pieza le os tres registos que Ihe dao no comando, confere a identidade de
// cada um ANTES de contar, descodifica JSON (nunca regex sobre texto aninhado), declara a espera e imprime os
// dois lados da soma. Aborta se faltar um caminho, se a espera nao for inteiro, se o campo abertas nao for
// array no topo, se o comprimento nao for o declarado, ou se um id medido nao estiver na lista de abertas.
// Uso: node scripts/p200-denominador-das-abertas-remediadas.mjs <registo-p133> <registo-p164> <registo-p165> <espera>
//      node scripts/p200-denominador-das-abertas-remediadas.mjs --fixtures
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const NL = String.fromCharCode(10);
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');

function md58(txt) {
  return createHash('md5').update(txt).digest('hex').slice(0, 8);
}

function dizer(s) {
  process.stdout.write(s + NL);
}

function idDe(caminho, rotulo) {
  if (!existsSync(caminho)) throw new Error('ABORTA: o registo ' + rotulo + ' nao existe em disco -- ' + caminho);
  const txt = readFileSync(caminho, 'utf8');
  dizer(rotulo + ' caminho=' + caminho + ' bytes=' + Buffer.byteLength(txt) + ' md5_8=' + md58(txt));
  return JSON.parse(txt);
}

function argvPara(argv) {
  if (argv.indexOf('--fixtures') >= 0) return { fixtures: true };
  const pos = argv.filter((t) => t.indexOf('-') !== 0 || /^-\d/.test(t));
  if (pos.length !== 4) throw new Error('ABORTA: a medida exige quatro argumentos (p133, p164, p165, espera); obtido=' + pos.length);
  const espera = pos[3];
  if (!/^[0-9]+$/.test(espera)) throw new Error('ABORTA: a espera tem de ser um inteiro declarado, obtido=' + JSON.stringify(espera));
  return { fixtures: false, p133: pos[0], p164: pos[1], p165: pos[2], espera: Number(espera) };
}

function idpenBruto(x) {
  const m = String(x).match(/(\d{1,2})/);
  if (!m) throw new Error('ABORTA: id sem digitos -- ' + JSON.stringify(x));
  return 'PEN-' + String(Number(m[1])).padStart(2, '0');
}

function lerAbertas(j, rotulo, espera) {
  if (!('abertas' in j)) throw new Error('ABORTA: ' + rotulo + ' nao tem o campo abertas no topo');
  const a = j.abertas;
  if (!Array.isArray(a)) throw new Error('ABORTA: ' + rotulo + ' tem abertas que nao e array de topo');
  if (a.length !== espera) throw new Error('ABORTA: ' + rotulo + ' NAO_CONFORME_ESPERA=' + espera + ' obtido=' + a.length);
  return a.map((it) => idpenBruto(it.id));
}

function linhasDoAr(j, rotulo) {
  const e = j.eixos;
  if (!e || typeof e !== 'object' || Array.isArray(e)) throw new Error('ABORTA: ' + rotulo + ' nao tem o objeto eixos');
  return Object.keys(e).map(idpenBruto);
}

function linhasDoCatalogo(j, rotulo) {
  const nomes = Object.keys(j).filter((k) => /^pen\d\d$/.test(k));
  if (nomes.length === 0) throw new Error('ABORTA: ' + rotulo + ' nao tem nenhum campo penNN');
  return nomes.map((k) => 'PEN-' + k.slice(3));
}

function conjunto(xs) {
  return [...new Set(xs)].sort();
}

function executar(abertas, l164, l165, espera) {
  const uniao = conjunto(l164.concat(l165));
  const inter = conjunto(l164).filter((x) => conjunto(l165).indexOf(x) >= 0);
  const fora = uniao.filter((x) => abertas.indexOf(x) < 0);
  if (fora.length > 0) dizer('NAO_CONFORME_id_medido_fora_das_abertas=' + JSON.stringify(fora));
  const complemento = abertas.filter((x) => uniao.indexOf(x) < 0);
  const bate = uniao.length + complemento.length === abertas.length && fora.length === 0;
  dizer('abertas=' + abertas.length + ' com_espera_declarada=' + espera);
  dizer('medidas_pelo_p164=' + l164.length + ' ' + JSON.stringify(conjunto(l164)));
  dizer('medidas_pelo_p165=' + l165.length + ' ' + JSON.stringify(conjunto(l165)));
  dizer('uniao=' + uniao.length + ' ' + JSON.stringify(uniao));
  dizer('intersecao_duas_pecas=' + JSON.stringify(inter));
  dizer('complemento_por_medir=' + complemento.length + ' ' + JSON.stringify(complemento));
  dizer('PORTAO a_uniao_mais_o_complemento_batem_com_a_lista_de_abertas = ' + (bate ? 'OK' : 'VERMELHO') +
    ' obtido=' + (uniao.length + complemento.length) + ' esperado=' + abertas.length);
  return bate;
}

function fixtureAbertas(espera, cortar) {
  const A = [];
  for (let i = 1; i <= espera; i++) A.push({ id: 'PEN-' + String(i).padStart(2, '0') });
  const j = { abertas: A, veredito: 'fixture' };
  if (cortar) j.abertas = j.abertas.slice(0, cortar);
  return j;
}

function escreverTemporario(nome, obj) {
  const caminho = tmpdir() + '/' + nome;
  writeFileSync(caminho, JSON.stringify(obj), 'utf8');
  return caminho;
}

function fixtures() {
  const ESP = 39;
  dizer('FIXTURE 1 positivo: as duas listas dentro das abertas');
  const r1 = executar(fixtureAbertas(ESP, 0).abertas.map((it) => it.id), ['PEN-01', 'PEN-02'], ['PEN-08', 'PEN-02'], ESP);
  dizer('esperado=OK obtido=' + (r1 ? 'OK' : 'VERMELHO'));
  dizer('FIXTURE 2 vermelho: id medido que nao esta nas abertas');
  const r2 = executar(fixtureAbertas(ESP, 0).abertas.map((it) => it.id), ['PEN-01', 'PEN-99'], ['PEN-08'], ESP);
  dizer('esperado=VERMELHO obtido=' + (r2 ? 'OK' : 'VERMELHO'));
  dizer('FIXTURE 3 aborta: abertas com comprimento diferente do declarado');
  const caminho3 = escreverTemporario('p200-f3-abertas-5.json', fixtureAbertas(ESP, 5));
  dizer('esperado=ABORTA obtido=' + tentar(() => lerAbertas(JSON.parse(readFileSync(caminho3, 'utf8')), 'fixture', ESP)));
  dizer('FIXTURE 4 aborta: campo abertas ausente');
  const caminho4 = escreverTemporario('p200-f4-sem-abertas.json', { veredito: 'x' });
  dizer('esperado=ABORTA obtido=' + tentar(() => lerAbertas(JSON.parse(readFileSync(caminho4, 'utf8')), 'fixture', ESP)));
  dizer('FIXTURE 5 aborta: registo do ar sem o objeto eixos');
  dizer('esperado=ABORTA obtido=' + tentar(() => linhasDoAr({ veredito: 'x' }, 'p164')));
  dizer('FIXTURE 6 aborta: espera nao inteira');
  dizer('esperado=ABORTA obtido=' + tentar(() => argvPara(['a.json', 'b.json', 'c.json', 'trinta e nove'])));
  dizer('FIXTURE 7 aborta: falta um caminho');
  dizer('esperado=ABORTA obtido=' + tentar(() => argvPara(['a.json', 'b.json', '39'])));
  dizer('FIXTURE 8 aborta: registo de catalogo sem campos penNN');
  dizer('esperado=ABORTA obtido=' + tentar(() => linhasDoCatalogo({ veredito: 'x' }, 'p165')));
}

function tentar(f) {
  try {
    f();
    return 'NAO ABORTOU (defeito)';
  } catch (e) {
    return 'ABORTA ' + String(e.message).slice(0, 96);
  }
}

const opts = argvPara(process.argv.slice(2));
dizer('emissor_bytes=' + Buffer.byteLength(EU) + ' emissor_md5=' + md58(EU));
if (opts.fixtures) {
  fixtures();
} else {
  const j133 = idDe(opts.p133, 'p133');
  const j164 = idDe(opts.p164, 'p164');
  const j165 = idDe(opts.p165, 'p165');
  const abertas = lerAbertas(j133, 'p133', opts.espera);
  dizer('amostra_ids_crua=' + JSON.stringify(abertas.slice(0, 3)) + ' ... ' + JSON.stringify(abertas.slice(-2)));
  const ok = executar(abertas, linhasDoAr(j164, 'p164'), linhasDoCatalogo(j165, 'p165'), opts.espera);
  dizer('o_que_prova=que a uniao das linhas com causa re-medida nos dois registos, mais o complemento por medir, e exactamente a lista de abertas do registo p133, com a identidade dos tres registos conferida antes de contar');
  dizer('o_que_NAO_prova=que alguma dessas linhas esteja fechada, que os registos do ar e do catalogo sejam desta mesma corrida do p133 (sao os caminhos que Ihe derem), nem que nenhuma das outras linhas tem causa registada noutro instrumento');
  dizer('P200_DENOMINADOR ' + (ok ? 'OK' : 'VERMELHO') + ' espera=' + opts.espera);
}
