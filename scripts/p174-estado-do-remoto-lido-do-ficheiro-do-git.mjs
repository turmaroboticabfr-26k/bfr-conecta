// p174 - Estado do remoto lido de ficheiros e comandos do git, com portoes e fixtures nos dois sentidos.
// Uso: node scripts/p174-estado-do-remoto-lido-do-ficheiro-do-git.mjs <caminho-da-captura>
//      node scripts/p174-estado-do-remoto-lido-do-ficheiro-do-git.mjs --fixtures
// Porque esta peca existe: o fecho do bloco SM.58 da auditoria escreveu que o envio daquele commit continuava sem autorizacao literal,
// e na ronda seguinte esse envio foi pago com OK proprio. Se a unica prova ficar no stdout daquela corrida, o estado
// do remoto passa a ser a minha memoria de conversa; o que nao tem produtor versionado nao e medida, e a memoria
// envelhece no instante em que o proximo commit nasce. Esta peca le o que o proprio git registou.
// O que e lido, tudo de ficheiro ou de comando do git e nunca de um argumento meu:
//   - a ultima linha de .git/logs/refs/remotes/origin/main, que e o registo que o git escreve quando um envio chega;
//   - `git status -sb`, primeira linha, que e onde um ahead se mostra;
//   - `git rev-parse HEAD` e `git rev-parse origin/main`, os dois nomes do mesmo grau quando o envio chegou;
//   - `git rev-list --count` e `git log --oneline` do intervalo que a linha do reflog nomeia, conferidos um pelo outro.
// Os seis portoes sao funcoes puras sobre o objecto de medida, para que os fixtures o possam montar partido sem
// tocar no git: cada portao tem positivo (o verde muda nesta corrida legitimamente) e o caso contrario tambem.
// Forma dos portoes: `portao_<nome>=OK` com o sinal de igual COLADO ao nome, por razao de procedencia e nao de
// gosto - a regua de cifra dupla do p168 exclui uma linha pelo PRIMEIRO par chave=valor que nela aparece, portanto
// um espaco antes do veredicto faria a primeira chave ser 'obtido' e os seis portoes entrariam na varredura a
// repetir 'obtido' e 'esperado' com valores diversos na mesma regiao, que e o defeito da corrida sm58b do p171.
// Toda esta peca e escrita em ASCII: a familia de corruptela letra->glifo ja me partiu dois ficheiros longos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';

const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const EMISSOR = { bytes: Buffer.byteLength(EU, 'utf8'), md5: createHash('md5').update(EU).digest('hex') };
const REGUA_DUO = REPO + '/scripts/p168-prova-de-edicao-sem-corte.mjs';
const REFLOG = REPO + '/.git/logs/refs/remotes/origin/main';
const CAUSA_DE_ENVIO = 'update by push';
const MARCA = 'P174_ESTADO_DO_REMOTO_MEDIDO';
const RE_HASH = /^[0-9a-f]{40}$/;
const RE_FUSO = /^[+-]\d{4}$/;

function git(args) { return execFileSync('git', args, { encoding: 'utf8' }); }

function fusoEmMinutos(fuso) {
  if (!RE_FUSO.test(fuso)) throw new Error('ABORTA: o fuso da linha do reflog nao tem forma de +-HHMM, veio ' + fuso);
  const h = Number(fuso.slice(1, 3)), m = Number(fuso.slice(3, 5));
  return (fuso[0] === '-' ? -1 : 1) * (h * 60 + m);
}

function leReflog(caminho) {
  const linhas = readFileSync(caminho, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  if (!linhas.length) throw new Error('ABORTA: o registo de refs do remoto esta vazio, nao h ultima linha para ler');
  const L = linhas[linhas.length - 1];
  const tab = L.indexOf('\t');
  const causa = tab < 0 ? '' : L.slice(tab + 1).trim();
  const campos = (tab < 0 ? L : L.slice(0, tab)).trim().split(/\s+/);
  if (campos.length < 5) throw new Error('ABORTA: a linha do reflog nao tem os campos esperados, veio: ' + L);
  return {
    reflog_linhas: linhas.length,
    de: campos[0],
    para: campos[1],
    // os tokens entre o segundo hash e o epoch sao o autor do registo; nao sao lidos nem emitidos, porque o que
    // esta peca mede e o grau do remoto, e um correo de autor num artefacto de evidence nao acrescenta prova nenhuma
    epoch: Number(campos[campos.length - 2]),
    fuso: campos[campos.length - 1],
    causa,
  };
}

function mede() {
  const r = leReflog(REFLOG);
  const intervalo = r.de + '..' + r.para;
  const contagem = Number(git(['rev-list', '--count', intervalo]).trim());
  const titulos = git(['log', '--oneline', intervalo]).split('\n').filter((l) => l.trim().length > 0);
  return {
    alvo: REFLOG,
    reflog_linhas: r.reflog_linhas,
    de: r.de,
    para: r.para,
    causa: r.causa,
    epoch: r.epoch,
    fuso: r.fuso,
    fuso_minutos: fusoEmMinutos(r.fuso),
    em_utc: new Date(r.epoch * 1000).toISOString(),
    head: git(['rev-parse', 'HEAD']).trim(),
    origin_main: git(['rev-parse', 'origin/main']).trim(),
    status: git(['status', '-sb']).split('\n')[0].trim(),
    contagem,
    titulos: titulos.length,
  };
}

// Cada portao e uma linha so, julgada sobre o objecto de medida. Nenhuma delas depende do meu stdout de conversa.
function julgamentos(m) {
  const g = [];
  const push = (nome, obtido, esperado, ok) => g.push({ nome, obtido: String(obtido), esperado: String(esperado), ok: !!ok });
  push('a_causa_da_ultima_linha_do_reflog_e_a_de_envio', m.causa, CAUSA_DE_ENVIO, m.causa === CAUSA_DE_ENVIO);
  push('os_dois_hash_da_linha_do_reflog_tem_forma_de_objeto', m.de.length + '/' + m.para.length, '40/40', RE_HASH.test(m.de) && RE_HASH.test(m.para));
  push('o_hash_final_do_reflog_e_o_head', m.para === m.head, 'igualdade', m.para === m.head);
  push('head_e_origin_main_sao_o_mesmo_objeto', m.head === m.origin_main, 'igualdade', m.head === m.origin_main);
  push('a_primeira_linha_do_status_nao_mostra_ahead', /\bahead\b/.test(m.status), 'falso', !/\bahead\b/.test(m.status));
  push('o_count_do_intervalo_bate_com_a_lista_de_titulos', m.contagem + '/' + m.titulos, 'iguais', m.contagem === m.titulos && m.contagem > 0);
  return g;
}

function corpoDaMedida(m, g) {
  const L = [];
  L.push('alvo=' + m.alvo);
  L.push('emissor_bytes=' + EMISSOR.bytes + ' emissor_md5=' + EMISSOR.md5);
  L.push('registo_de_reflog_linhas=' + m.reflog_linhas);
  L.push('reflog_de=' + m.de);
  L.push('reflog_para=' + m.para);
  L.push('reflog_causa=' + m.causa);
  L.push('reflog_epoch=' + m.epoch);
  L.push('reflog_fuso=' + m.fuso + ' reflog_fuso_minutos=' + m.fuso_minutos);
  L.push('reflog_em_utc=' + m.em_utc);
  L.push('head=' + m.head);
  L.push('origin_main=' + m.origin_main);
  L.push('status_sb_primeira_linha=' + m.status);
  L.push('commits_no_intervalo=' + m.contagem);
  L.push('titulos_no_intervalo=' + m.titulos);
  L.push('o_que_prova=que o registo do remoto no disco termina num envio, que HEAD e origin/main sao o mesmo objeto, que a primeira linha do status nao mostra ahead, e que o intervalo que a linha do reflog nomeia tem os titulos que conta');
  L.push('o_que_NAO_prova=que o envio tenha sido autorizado por ninguem, que os titulos contidos no intervalo sejam os desta ronda, nem nada do estado do ar: esta peca so le o que o git registou neste repositorio');
  for (const p of g) L.push('portao_' + p.nome + '=' + (p.ok ? 'OK' : 'VERMELHO') + ' obtido=' + p.obtido + ' esperado=' + p.esperado);
  L.push(MARCA);
  return L.join('\n') + '\n';
}

function baseVerde() {
  return {
    alvo: 'x', reflog_linhas: 3,
    de: 'a'.repeat(40), para: 'b'.repeat(40),
    causa: CAUSA_DE_ENVIO,
    epoch: 1795582914, fuso: '-0300', fuso_minutos: -180, em_utc: 'quando',
    head: 'b'.repeat(40), origin_main: 'b'.repeat(40),
    status: '## main...origin/main', contagem: 2, titulos: 2,
  };
}
const QUEBRAS = {
  a_causa_da_ultima_linha_do_reflog_e_a_de_envio: (m) => { m.causa = 'update by fetch'; },
  os_dois_hash_da_linha_do_reflog_tem_forma_de_objeto: (m) => { m.de = 'abc'; },
  o_hash_final_do_reflog_e_o_head: (m) => { m.para = 'e'.repeat(40); },
  head_e_origin_main_sao_o_mesmo_objeto: (m) => { m.origin_main = 'd'.repeat(40); },
  a_primeira_linha_do_status_nao_mostra_ahead: (m) => { m.status = '## main...origin/main [ahead 3]'; },
  o_count_do_intervalo_bate_com_a_lista_de_titulos: (m) => { m.titulos = 1; },
};

const FALHAS = [];
let CASOS = 0;
function roda(nome, fn) {
  CASOS++;
  try { fn(); console.log('fixture ' + nome + ' passaram=true'); }
  catch (e) { FALHAS.push(nome); console.log('fixture ' + nome + ' passaram=false ' + e.message); }
}

// O recorte da linha do reflog e uma face a parte: se eu so o julgar ao correr contra o git verdadeiro, um campo
// trocado passa a ser medicao ate a linha mudar de forma. Por isso o parse tem caso positivo e caso de aborto,
// montados num ficheiro de teste fora do repo e lidos pela mesma funcao que mede.
const LINHA_DE_ENVIO = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb Quem <q@e> 1795582914 -0300\tupdate by push';
function fixturesDoParse() {
  const caminho = joinPath(tmpdir(), 'p174-reflog-de-teste.txt');
  roda('o_recorte_duma_linha_de_envio', () => {
    writeFileSync(caminho, 'lixo antigo\n' + LINHA_DE_ENVIO + '\n', 'utf8');
    const r = leReflog(caminho);
    const esperado = { de: 'a'.repeat(40), para: 'b'.repeat(40), epoch: 1795582914, fuso: '-0300', causa: CAUSA_DE_ENVIO };
    const maus = Object.keys(esperado).filter((k) => String(r[k]) !== String(esperado[k]));
    if (maus.length) throw new Error('RECORTE_PARTIDO: ' + JSON.stringify(maus.map((k) => k + '=' + r[k])));
    if (r.reflog_linhas !== 2) throw new Error('CONTAGEM_DE_LINHAS=' + r.reflog_linhas);
  });
  roda('uma_linha_sem_tabulacao_nao_inventa_causa', () => {
    writeFileSync(caminho, 'commit (amend): titulo 1795582914 -0300\n', 'utf8');
    const r = leReflog(caminho);
    if (r.causa !== '') throw new Error('CAUSA_INVENTADA=' + r.causa);
  });
  roda('uma_linha_sem_campos_aborta', () => {
    writeFileSync(caminho, 'duas palavras so\n', 'utf8');
    let abortou = false;
    try { leReflog(caminho); } catch (e) { abortou = /ABORTA/.test(e.message); }
    if (!abortou) throw new Error('NAO_ABORTOU');
  });
  roda('um_fuso_fora_de_forma_aborta', () => {
    let abortou = false;
    try { fusoEmMinutos('+300'); } catch (e) { abortou = /ABORTA/.test(e.message); }
    if (!abortou) throw new Error('NAO_ABORTOU');
    if (fusoEmMinutos('-0300') !== -180) throw new Error('CONVERSAO=' + fusoEmMinutos('-0300'));
  });
}

function fixtures() {
  const nomes = Object.keys(QUEBRAS);
  roda('o_caso_inteiro_verde', () => {
    const g = julgamentos(baseVerde());
    const ruins = g.filter((p) => !p.ok).map((p) => p.nome);
    if (ruins.length) throw new Error('VERDE_QUEBRADO: ' + JSON.stringify(ruins));
  });
  for (const nome of nomes) {
    roda('partir_so_' + nome, () => {
      const m = baseVerde();
      QUEBRAS[nome](m);
      const g = julgamentos(m);
      const ruins = g.filter((p) => !p.ok).map((p) => p.nome);
      if (ruins.length !== 1 || ruins[0] !== nome) throw new Error('POSITIVO_MOVIDO: ' + JSON.stringify(ruins));
    });
  }
  roda('nenhum_portao_sem_fixture', () => {
    const sem = julgamentos(baseVerde()).filter((p) => !QUEBRAS[p.nome]).map((p) => p.nome);
    if (sem.length) throw new Error('PORTAO_SEM_FIXTURE: ' + JSON.stringify(sem));
  });
  // o parse do reflog e uma face a parte e tambem precisa de caso positivo: sem ele, um campo trocado so se veria
  // na proxima linha do git verdadeiro, que e exactamente o instante em que ja nao se pode re-correr a medida
  fixturesDoParse();
  const portoes = julgamentos(baseVerde()).length;
  if (nomes.length !== portoes) throw new Error('ABORTA: ha portoes sem familia de quebra ou familias sem portao');
  if (FALHAS.length) throw new Error('ABORTA fixtures_falhas=' + JSON.stringify(FALHAS) + ' de ' + CASOS + ' casos');
  console.log('P174_FIXTURES_OK portoes=' + portoes + ' familias_de_quebra=' + nomes.length + ' casos=' + CASOS);
}

function guardaDeSobrescrita(caminho) {
  if (existsSync(caminho)) throw new Error('ABORTA: a captura ja existe em ' + caminho + ' - re-correr por cima apagaria a corrida anterior; use um sufixo novo e deixe a velha versionada');
}

if (process.argv.includes('--fixtures')) { fixtures(); process.exit(0); }
const caminhoCaptura = process.argv[2];
if (!caminhoCaptura || caminhoCaptura.startsWith('--')) throw new Error('ABORTA: uso - node scripts/p174-estado-do-remoto-lido-do-ficheiro-do-git.mjs <caminho-da-captura>; sem default porque um caminho lembrado e justamento o que esta peca existe para nao ser');
const m = mede();
const g = julgamentos(m);
const ruins = g.filter((p) => !p.ok).map((p) => p.nome);
if (ruins.length) throw new Error('ABORTA portoes_vermelhos=' + JSON.stringify(ruins) + ' - a captura nao sai por cima dum portao vermelho');
const texto = corpoDaMedida(m, g);
guardaDeSobrescrita(caminhoCaptura);
writeFileSync(caminhoCaptura, texto);
const duo = execFileSync('node', [REGUA_DUO, '--duo', caminhoCaptura], { encoding: 'utf8' });
writeFileSync(caminhoCaptura, texto + duo);
if (duo.includes('P168_DUO_FORA_DO_DOMINIO')) throw new Error('ABORTA: o p168 nao encontrou regiao de medida na minha captura, logo a varredura de cifras nao foi feita');
if (duo.includes('P168_DUO_DE_CIFRAS_ACHADO')) throw new Error('ABORTA: a captura ficou com cifra dupla - renomeie-a com o defeito no nome, nao a sobrescreva');
console.log('P174_ESCRITO em=' + caminhoCaptura + ' commits_no_intervalo=' + m.contagem + ' em_utc=' + m.em_utc);
