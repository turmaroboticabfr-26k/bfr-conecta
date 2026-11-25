// Comparacao campo a campo de duas capturas do MESMO bloco, corridas por duas versoes dum instrumento: o agregado
// tem de bater byte-a-byte e o que diverge tem de ser explicado no diario, nao escondido. As chaves comparadas nao
// sao uma lista lembrada: o classificador parte do prefixo de cada linha (ate ao primeiro sinal de igual, ou ate ao
// primeiro espaco quando nao o ha) e divide os campos em quatro classes medidas.
// Uso: node scripts/p176-comparacao-de-capturas-do-mesmo-bloco.mjs <captura-antiga> <captura-nova> [<captura>]
// O portao julga tres grandezas por nome (CANDIDATOS, HISTOGRAMA, FORA_DA_ESCRITA) e as quatro classes de falha tem
// fixture proprio: DIVERGE, SÓ_na_antiga, SÓ_na_nova, AUSENTE_dos_dois_lados.
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const antiga = process.argv[2];
const nova = process.argv[3];
const destino = process.argv[4];
if (!antiga || !nova) throw new Error('ABORTA: passe as duas capturas como argv[2] e argv[3]');
if (destino && existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');
const capt = [];
const say = (s) => { capt.push(s); console.log(s); };
// A pegada do emissor vive no artefacto, nao na minha prosa: so assim uma re-corrida byte-a-byte autoriza dizer
// que e a mesma medida e nao uma medida nova com o mesmo nome de campo.
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
say('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));

const CHAVES_QUE_TEM_DE_BATER = ['CANDIDATOS', 'HISTOGRAMA ', 'FORA_DA_ESCRITA'];

function chaveDa(linha) {
  const i = linha.indexOf('=');
  if (i > 0) return linha.slice(0, i);
  const j = linha.indexOf(' ');
  return j > 0 ? linha.slice(0, j) + ' ' : linha;
}
function porChave(caminho) {
  const linhas = readFileSync(caminho, 'utf8').split('\n').filter((l) => l.trim() !== '');
  const m = new Map();
  for (const l of linhas) {
    const c = chaveDa(l);
    if (!m.has(c)) m.set(c, []);
    m.get(c).push(l);
  }
  return { m, n: linhas.length };
}
function compara(a, b) {
  const iguais = [];
  const divergentes = [];
  const soAntiga = [];
  const soNova = [];
  for (const c of a.m.keys()) {
    if (!b.m.has(c)) { soAntiga.push(c); continue; }
    const va = a.m.get(c).join('\n');
    const vb = b.m.get(c).join('\n');
    (va === vb ? iguais : divergentes).push({ c, va, vb });
  }
  for (const c of b.m.keys()) if (!a.m.has(c)) soNova.push(c);
  return { iguais, divergentes, soAntiga, soNova };
}
function veredictosDoPortao(r) {
  return CHAVES_QUE_TEM_DE_BATER.map((c) => {
    if (r.iguais.some((x) => x.c === c)) return c.trim() + ':IGUAL';
    if (r.divergentes.some((x) => x.c === c)) return c.trim() + ':DIVERGE';
    if (r.soAntiga.includes(c)) return c.trim() + ':SÓ_na_antiga';
    if (r.soNova.includes(c)) return c.trim() + ':SÓ_na_nova';
    return c.trim() + ':AUSENTE_dos_dois_lados';
  }).filter((v) => !v.endsWith(':IGUAL'));
}

// Os fixtures correm em tempo de execucao e fora do repo: um fixture escrito a mao dentro do indice seria varrido
// pelo portao que se denuncia a si mesmo, e o verde duma classe que nunca dispara nao e verde de nada.
const fxDir = join(tmpdir(), 'p176-fixtures-' + process.pid);
mkdirSync(fxDir, { recursive: true });
const fxIgual = join(fxDir, 'igual.txt');
const fxPartido = join(fxDir, 'partido.txt');
const fxSemChave = join(fxDir, 'falta-uma-chave.txt');
const fxComSobra = join(fxDir, 'sobra-uma-chave.txt');
const corpo = ['CANDIDATOS=44', 'HISTOGRAMA {"p1":3}', 'FORA_DA_ESCRITA=0 no bloco SM.99', 'ALGO_de_formato_novo=7'];
writeFileSync(fxIgual, corpo.join('\n') + '\n', 'utf8');
writeFileSync(fxPartido, corpo.map((l) => (l.startsWith('CANDIDATOS') ? 'CANDIDATOS=43' : l)).join('\n') + '\n', 'utf8');
writeFileSync(fxSemChave, corpo.filter((l) => !l.startsWith('FORA_DA_ESCRITA')).join('\n') + '\n', 'utf8');
writeFileSync(fxComSobra, corpo.concat(['EXTRA_so_na_nova=1']).join('\n') + '\n', 'utf8');

const fIguais = compara(porChave(fxIgual), porChave(fxIgual));
const fPartido = compara(porChave(fxIgual), porChave(fxPartido));
const fSemChave = compara(porChave(fxIgual), porChave(fxSemChave));
const fComSobra = compara(porChave(fxIgual), porChave(fxComSobra));
const fAusente = compara(porChave(fxSemChave), porChave(fxSemChave));
const vSemChave = veredictosDoPortao(fSemChave);
const vSobra = veredictosDoPortao(fComSobra);
const vAusente = veredictosDoPortao(fAusente);
say('PROVA_FIXTURE identico_divergentes=' + fIguais.divergentes.length + ' partido_divergentes=' + fPartido.divergentes.length + ' chave_do_vermelho=' + (fPartido.divergentes[0] ? fPartido.divergentes[0].c : 'nenhuma') + ' vereditos=[sem_chave=' + JSON.stringify(vSemChave) + ' sobra=' + JSON.stringify(vSobra) + ' ausente=' + JSON.stringify(vAusente) + ']');
if (fIguais.divergentes.length !== 0) throw new Error('ABORTA: o comparador divergiu sobre duas entradas identicas, deu ' + fIguais.divergentes.length);
if (fPartido.divergentes.length !== 1 || fPartido.divergentes[0].c !== 'CANDIDATOS') throw new Error('ABORTA: o fixture partido nao disparou exactamente uma divergencia em CANDIDATOS, deu ' + JSON.stringify(fPartido.divergentes.map((d) => d.c)));
if (vSemChave.length !== 1 || vSemChave[0] !== 'FORA_DA_ESCRITA:SÓ_na_antiga') throw new Error('ABORTA: a classe SÓ_na_antiga nao foi atingida pelo fixture, deu ' + JSON.stringify(vSemChave));
if (vSobra.length !== 0) throw new Error('ABORTA: uma linha extra num dos lados mexeu o veredicto das grandezas, deu ' + JSON.stringify(vSobra) + ' -- o comparador julga o que nao lhe pertence');
if (vAusente.length !== 1 || vAusente[0] !== 'FORA_DA_ESCRITA:AUSENTE_dos_dois_lados') throw new Error('ABORTA: a classe AUSENTE dos dois lados nao foi atingida, deu ' + JSON.stringify(vAusente) + ' -- um campo que desapareceu das duas capturas passaria por verde');

const A = porChave(antiga);
const B = porChave(nova);
const r = compara(A, B);
const vermelhos = veredictosDoPortao(r);
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
say('antiga=' + antiga + ' bytes=' + statSync(antiga).size + ' md5_8=' + md5(antiga).slice(0, 8) + ' linhas=' + A.n);
say('nova=' + nova + ' bytes=' + statSync(nova).size + ' md5_8=' + md5(nova).slice(0, 8) + ' linhas=' + B.n);
say('CAMPOS_IGUAIS=' + r.iguais.length + ' CAMPOS_DIVERGENTES=' + r.divergentes.length + ' SÓ_na_antiga=' + r.soAntiga.length + ' SÓ_na_nova=' + r.soNova.length);
say('lista_de_iguais=' + JSON.stringify(r.iguais.map((x) => x.c.trim())));
for (const d of r.divergentes) say('DIVERGE [' + d.c.trim() + '] antiga=' + JSON.stringify(d.va.slice(0, 220)) + ' nova=' + JSON.stringify(d.vb.slice(0, 220)));
say('so_antiga=' + JSON.stringify(r.soAntiga) + ' so_nova=' + JSON.stringify(r.soNova));
say('unidade_do_campo=prefixo_ate_o_primeiro_sinal_de_igual_e_nao_linhas');
say('portao_as_grandezas_do_agregado_batem=' + (vermelhos.length === 0 ? 'OK' : 'VERMELHO') + ' obtido=' + JSON.stringify(vermelhos) + ' esperado=[]');
if (destino) writeFileSync(destino, capt.join('\n') + '\n', 'utf8');
if (vermelhos.length > 0) throw new Error('ABORTA: as grandezas do agregado nao batem -- ' + JSON.stringify(vermelhos));
process.stdout.write('P176_COMPARACAO_FEITA iguais=' + r.iguais.length + ' divergentes=' + r.divergentes.length + ' so_antiga=' + r.soAntiga.length + ' so_nova=' + r.soNova.length + '\n');
