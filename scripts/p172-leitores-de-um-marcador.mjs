// Censo dos leitores duma string literal no indice, dividida por classe de ficheiro: codigo, prosa, capturas, outras.
// A pergunta que esta peca responde e a que as eliminacoes de marcadores de saida sempre fizeram de memoria: apagar o
// que um emissor imprime so e seguro se nenhum codigo e nenhuma prosa o lerem. Aqui o numero vem do indice, com um
// marcador de controlo declarado que tem leitores de codigo, para que um classificador cego aborte em vez de dar verde.
// Uso: node scripts/p172-leitores-de-um-marcador.mjs <caminho-da-captura> <marcador>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CONTROLO = 'P168_EDICAO_SEM_CORTE_OK';
const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EU = readFileSync(fileURLToPath(import.meta.url), 'utf8');

function lista(m) {
  let stdout = '';
  let exit = 0;
  try {
    stdout = execFileSync('git', ['grep', '-F', '-l', m], { cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  } catch (e) {
    exit = typeof e.status === 'number' ? e.status : -1;
    stdout = typeof e.stdout === 'string' ? e.stdout : '';
  }
  return { files: stdout.split('\n').filter((l) => l.trim().length > 0), exit: exit };
}
function classe(c) {
  if (/^evidence\//.test(c)) return 'capturas';
  const m = c.match(/\.([A-Za-z0-9]+)$/);
  const ext = m ? m[1].toLowerCase() : '';
  if (['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx'].includes(ext)) return 'codigo';
  if (['md', 'markdown', 'html'].includes(ext)) return 'prosa';
  return 'outras';
}
function contagem(files) {
  const c = { codigo: 0, prosa: 0, capturas: 0, outras: 0 };
  for (const f of files) c[classe(f)]++;
  return c;
}

if (process.argv.includes('--fixtures')) {
  const esperadas = [
    ['evidence/p169-varredura-letra-digito-do-bloco-sm57c.txt', 'capturas'],
    ['evidence/p133-inventario-das-pendencias-abertas-22-11-sm56e.json', 'capturas'],
    ['docs/auditoria-bfr-conecta.md', 'prosa'],
    ['docs/roadmap-painel.html', 'prosa'],
    ['scripts/p168-prova-de-edicao-sem-corte.mjs', 'codigo'],
    ['web/index.js', 'codigo'],
    ['config/deploy.yaml', 'outras'],
    ['LICENSE', 'outras'],
  ];
  const linhas = [];
  let maus = 0;
  for (const [caminho, esperada] of esperadas) {
    const obtida = classe(caminho);
    if (obtida !== esperada) maus++;
    linhas.push('fixture caminho=' + caminho + ' esperada=' + esperada + ' obtida=' + obtida + ' veredicto=' + (obtida === esperada ? 'EXPERADO' : 'INESPERADO'));
  }
  const ausente = lista('NOME_QUE_NEM_ESTE_FICHEIRO_PODE_TER_' + Date.now());
  const presente = lista(CONTROLO);
  linhas.push('fixtures caminho_de_classificacao_inesperados=' + maus);
  linhas.push('fixtures marcador_ausente ficheiros=' + ausente.files.length + ' git_grep_exit=' + ausente.exit);
  linhas.push('fixtures marcador_presente ficheiros=' + presente.files.length + ' git_grep_exit=' + presente.exit);
  process.stdout.write(linhas.join('\n') + '\n');
  if (maus !== 0) throw new Error('ABORTA fixtures: o classificador de classes nao deu o esperado em ' + maus + ' caminhos');
  if (!(ausente.files.length === 0 && ausente.exit === 1)) throw new Error('ABORTA fixtures: um marcador inexistente nao foi lido como ausencia com exit 1, deu ficheiros=' + ausente.files.length + ' exit=' + ausente.exit);
  if (!(presente.files.length > 0 && presente.exit === 0)) throw new Error('ABORTA fixtures: o marcador de controlo nao tem ficheiros no indice, a varredura nao tem positivo');
  if (contagem(presente.files).codigo === 0) throw new Error('ABORTA fixtures: o controlo ' + CONTROLO + ' nao e lido em codigo, o classificador esta cego para a classe que decide a eliminacao');
  process.stdout.write('P172_FIXTURES_OK\n');
  process.exit(0);
}

const destino = process.argv[2];
const marcador = process.argv[3];
if (!destino || destino.startsWith('--')) throw new Error('ABORTA: argv[2] e o caminho da captura');
if (!marcador || marcador.startsWith('--')) throw new Error('ABORTA: argv[3] e o marcador literal a procurar; --fixtures e o modo do cego');
if (existsSync(destino)) throw new Error('ABORTA: a captura ja existe, use sufixo novo -- ' + destino + ' tem ' + statSync(destino).size + ' bytes');

const r = lista(marcador);
const c = contagem(r.files);
const rc = lista(CONTROLO);
const ccc = contagem(rc.files);
if (ccc.codigo === 0) throw new Error('ABORTA: o marcador de controlo ' + CONTROLO + ' nao resolve em codigo no indice, por isso nenhuma ausencia medida nesta corrida diria seja o que for');
const linhas = [];
linhas.push('repo=' + REPO + ' git_grep_opcao=-F (procura de string literal, sem regex)');
linhas.push('emissor_bytes=' + Buffer.byteLength(EU, 'utf8') + ' emissor_md5=' + createHash('md5').update(EU).digest('hex'));
linhas.push('marcador=' + marcador + ' git_grep_exit=' + r.exit + ' ficheiros=' + r.files.length);
linhas.push('por_classe codigo=' + c.codigo + ' prosa=' + c.prosa + ' capturas=' + c.capturas + ' outras=' + c.outras + ' soma_das_classes=' + (c.codigo + c.prosa + c.capturas + c.outras));
linhas.push('controlo=' + CONTROLO + ' ficheiros=' + rc.files.length + ' codigo=' + ccc.codigo + ' prosa=' + ccc.prosa + ' capturas=' + ccc.capturas + ' outras=' + ccc.outras + ' (o codigo deste e o emissor que imprime o veredicto que as capturas guardam)');
linhas.push('ficheiros_encontrados=' + JSON.stringify(r.files));
if (c.outras > 0) linhas.push('MEDIDA outras_nao_classificadas=' + c.outras + ' lista=' + JSON.stringify(r.files.filter((f) => classe(f) === 'outras')));
const ativos = c.codigo + c.prosa;
linhas.push('leitores_ativos_codigo_mais_prosa=' + ativos + ' (capturas de corrida nao leem nada: registam o que ja correu)');
const corpo = linhas.join('\n') + '\n' + (ativos === 0
  ? 'P172_LEITORES_MEDIDOS SEM_LEITORES_ATIVOS: apagar o marcador nao parte nenhum codigo nem contradiz prosa versionada\n'
  : 'P172_LEITORES_MEDIDOS COM_LEITORES_ATIVOS: ha ' + ativos + ' ficheiros de codigo ou prosa que leem o marcador, nao apagar sem os mudar\n');
writeFileSync(destino, corpo, 'utf8');
process.stdout.write(corpo);
