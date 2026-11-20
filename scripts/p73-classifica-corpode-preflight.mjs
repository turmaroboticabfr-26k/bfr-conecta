// P73-X — sorte de ficheiros grandes: um artefacto de preflight de 4 MB guarda lá dentro o TEXTO integral da
// shell que mediu e o render do PDF que foi buscar. Antes de decidir se isso entra no índice, a pergunta é se
// aqueles bytes já vivem no índice sob outro caminho — a régua dos §AI.31/§SM.21 aplicada aos artefactos.
// O corpus é o ÍNDICE (bolbos de `git ls-tree -r HEAD --long` acima do limite), não o disco, e é partilhado com
// o extractor (scripts/p73-corpus-lib.mjs) para a prédica não ter duas versões. Duas formas de acerto: md5 do
// render direto, e a declaração do próprio pai (`pdf.md5`/`pdf.bytes` dos bytes do fio) — sem a segunda, um PDF
// já versionado era declarado «único» porque o artefacto lhe guardava o texto, não os bytes (foi o vermelho da
// primeira versão desta régua, 20/11: corpus de `*.html` só, e os 202 349 B do calendário estão no índice desde
// a v123). Só comprimentos e md5 no registo: nenhum corpo é copiado para aqui. 0 escrita de produto.
// Uso: node scripts/p73-classifica-corpode-preflight.mjs <sufixo> <ficheiro.json> [...]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { corpus_de_git, varre_corpos, classifica_corpo } from './p73-corpus-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || '20-11f').trim();
const FICHEIROS = process.argv.slice(3);
if (!FICHEIROS.length) throw new Error('ABORTA: uso node scripts/p73-classifica-corpode-preflight.mjs <sufixo> <ficheiro.json> [...]');
const LIMITE = 100 * 1024;
const OUT = `${REPO}/evidence/p73-corpos-de-artefactos-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const corpus = corpus_de_git(REPO, LIMITE);
console.log('corpus: ' + corpus.total_rastreados + ' ficheiros rastreados, ' + corpus.acima_do_limite + ' com >= ' + LIMITE + ' B, ' + corpus.pegadas_distintas + ' pegadas distintas · extensões ' + JSON.stringify(corpus.por_extensao));

const saida = { programa: 'scripts/p73-classifica-corpode-preflight.mjs', em: new Date().toISOString(), limite_bytes: LIMITE, corpus: { total_rastreados: corpus.total_rastreados, acima_do_limite: corpus.acima_do_limite, pegadas_distintas: corpus.pegadas_distintas, por_extensao: corpus.por_extensao, metodo: 'md5 dos bolbos em HEAD (git ls-tree -r HEAD --long + git cat-file blob), nao do disco', duas_formas_de_acerto: ['md5 do render utf8 do corpo', 'md5/bytes declarados pelo pai do corpo (medicao do fio)'] }, artefactos: {} };
for (const f of FICHEIROS) {
  const caminho = f.startsWith('/') ? f : `${REPO}/${f}`;
  if (!existsSync(caminho)) throw new Error('ABORTA: sem ' + caminho);
  const buf = readFileSync(caminho);
  const rel = caminho.slice(REPO.length + 1);
  const fora = varre_corpos(JSON.parse(buf.toString('utf8')), '', LIMITE);
  const no_indice = execFileSync('git', ['ls-files', rel], { cwd: REPO, encoding: 'utf8' }).trim().length > 0;
  saida.artefactos[rel] = { bytes_no_disco: buf.length, md5_no_disco: md5(buf), no_indice, corpos_grandes: [], bytes_de_corpos: fora.reduce((a, c) => a + c.bytes, 0) };
  console.log(rel + ': ' + buf.length + ' B · md5 ' + md5(buf) + ' · no_indice=' + (no_indice ? 'sim' : 'nao') + ' · corpos >= ' + LIMITE + ' B: ' + fora.length);
  for (const c of fora) {
    const hit = classifica_corpo(c, corpus);
    const reg = { chave: c.chave, bytes_do_render: c.bytes, md5_do_render: c.md5_render, pai_md5_declarado: c.pai.md5, pai_bytes_declarados: c.pai.bytes, pai_caminho: c.pai.caminho, pai_http: c.pai.http, acerto_direto: hit.direto ? hit.direto.caminho : null, acerto_por_declaracao: hit.declarado ? hit.declarado.caminho : null, ja_no_indice: hit.ja_no_indice, porque: hit.porque };
    saida.artefactos[rel].corpos_grandes.push(reg);
    console.log('  ' + c.chave + ': render ' + c.bytes + ' B md5=' + c.md5_render.slice(0, 12) + ' · declarado pelo pai: ' + (c.pai.md5 || '-') + '/' + (c.pai.bytes ?? '-') + (c.pai.caminho ? ' ' + c.pai.caminho : '') + ' → ' + (reg.acerto_direto ? 'JA VERSIONADO (render direto) em ' + reg.acerto_direto : reg.acerto_por_declaracao ? 'JA VERSIONADO (bytes declarados pelo pai) em ' + reg.acerto_por_declaracao : 'UNICO — so existe neste artefacto'));
  }
}
const todos = Object.values(saida.artefactos).flatMap((v) => v.corpos_grandes);
const unicos = todos.filter((c) => !c.ja_no_indice);
const cobertos = todos.filter((c) => c.ja_no_indice);
const bytes_unicos = unicos.reduce((a, c) => a + c.bytes_do_render, 0);
const bytes_cobertos = cobertos.reduce((a, c) => a + c.bytes_do_render, 0);
saida.veredito = unicos.length ? 'HA_CORPO_UNICO' : 'TODOS_OS_CORPOS_JA_VERSIONADOS';
saida.bytes_unicos = bytes_unicos; saida.bytes_ja_cobertos = bytes_cobertos;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('CORPOS JA COBERTOS PELO INDICE: ' + cobertos.length + ' (' + bytes_cobertos + ' B) · CORPOS UNICOS: ' + unicos.length + ' (' + bytes_unicos + ' B)');
console.log(unicos.length ? 'P7X_HA_CORPO_UNICO — o artefacto e prova, nao copia: ' + unicos.map((c) => c.chave).join(' | ') : 'P7X_TODOS_OS_CORPOS_JA_VERSIONADOS — os bytes dos artefactos vivem no indice sob outro caminho; a copia de 4 MB nao entra no snapshot nem no portao que a le');
console.log('registo ' + OUT);
