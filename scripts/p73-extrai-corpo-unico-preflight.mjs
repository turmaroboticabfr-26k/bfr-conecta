// P73-Y — o passo seguinte ao classificador: quando um artefacto grande é a única cópia em disco de um corpo
// que o índice NÃO tem, ignorar o artefacto era apagar a prova. Este programa extracta só os corpos únicos para
// um ficheiro próprio, pequeno, com o caminho da chave, a medição do pai sem o corpo, e a origem (nome + md5 +
// bytes do artefacto de que veio). É a regra do 18/11 para o `evidence/rm68-ruler3-instrumento.patch`: o que é
// duplicado fica fora do snapshot, o que é delta entra versionado — e NADA é apagado do disco.
// A prédica de «duplicado» vem do módulo partilhado (scripts/p73-corpus-lib.mjs) e aceita as duas formas de
// acerto: md5 do render e md5/bytes declarados pelo pai. Na primeira versão desta régua o corpus eram os
// `*.html` rastreados, por isso o render de `calendario-letivo-2026.pdf` (202 349 B no fio, cujo par versionado
// está em `worker-deploy-v123-pdfs/public/`) foi declarado único e extractado à toa — o companion dessa corrida
// ficou no índice como `ANTERIOR-…` com o motivo no nome, que é o registo do defeito.
// A identidade é conferida por re-leitura: o companion é aberto, varrido outra vez, e o corpo tem de voltar com
// o MESMO md5 e os MESMOs bytes. Um companion que não reproduza o byte medido aborta.
// Uso: node scripts/p73-extrai-corpo-unico-preflight.mjs <sufixo> <limite_bytes> <ficheiro.json> [...]
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { corpus_de_git, varre_corpos, classifica_corpo } from './p73-corpus-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || '20-11f').trim();
const LIMITE = parseInt(process.argv[3] || String(100 * 1024), 10);
const ORIGENS = process.argv.slice(4);
if (!ORIGENS.length) throw new Error('ABORTA: uso node scripts/p73-extrai-corpo-unico-preflight.mjs <sufixo> <limite> <ficheiros...>');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const corpus = corpus_de_git(REPO, LIMITE);
console.log('corpus do indice: ' + corpus.total_rastreados + ' rastreados · ' + corpus.acima_do_limite + ' >= ' + LIMITE + ' B · ' + corpus.pegadas_distintas + ' pegadas · extensoes ' + JSON.stringify(corpus.por_extensao));

// O pai do corpo sem o corpo: é a medição que dá sentido ao byte (http, content-type, url) e é pequena.
const pai_sem_corpo = (obj, chave) => {
  const seg = chave.split('.');
  let cur = obj;
  for (let i = 0; i < seg.length - 1; i++) cur = cur[seg[i]];
  const copia = {};
  for (const [k, v] of Object.entries(cur)) copia[k] = typeof v === 'string' && Buffer.byteLength(v) >= LIMITE ? { omitido: 'corpo >= limite', chars: v.length, md5: md5(Buffer.from(v)) } : v;
  return copia;
};

const por_md5 = new Map();
for (const f of ORIGENS) {
  const caminho = f.startsWith('/') ? f : `${REPO}/${f}`;
  if (!existsSync(caminho)) throw new Error('ABORTA: sem ' + caminho);
  const txt = readFileSync(caminho);
  const j = JSON.parse(txt.toString('utf8'));
  const rel = caminho.slice(REPO.length + 1);
  for (const c of varre_corpos(j, '', LIMITE)) {
    const hit = classifica_corpo(c, corpus);
    const e = por_md5.get(c.md5_render) || { md5: c.md5_render, bytes: c.bytes, chave: c.chave, texto: c.texto, hit, pais: {}, origem_primaria: rel, aparece_em: [] };
    if (!e.aparece_em.includes(rel)) e.aparece_em.push(rel);
    if (!e.pais[rel]) e.pais[rel] = pai_sem_corpo(j, c.chave);
    por_md5.set(c.md5_render, e);
  }
  console.log(rel + ': ' + txt.length + ' B · md5 ' + md5(txt));
}
const corpos = [...por_md5.values()];
const unicos = corpos.filter((c) => !c.hit.ja_no_indice);
const cobertos = corpos.filter((c) => c.hit.ja_no_indice);
for (const c of cobertos) console.log('  JA NO INDICE (' + (c.hit.direto ? 'render direto' : 'md5 declarado pelo pai') + '): ' + c.chave + ' ' + c.bytes + ' B → ' + (c.hit.direto || c.hit.declarado).caminho + ' · aparece em ' + c.aparece_em.length + ' artefacto(s)');
for (const c of unicos) console.log('  UNICO: ' + c.chave + ' ' + c.bytes + ' B md5=' + c.md5.slice(0, 12) + ' — ' + c.hit.porque);

const escritos = [];
for (const c of unicos) {
  const nome = `p73-corpo-unico-${c.chave.replace(/[^a-z0-9]+/gi, '-')}-${c.md5.slice(0, 8)}-${SUF}.json`;
  const OUT = `${REPO}/evidence/${nome}`;
  if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
  writeFileSync(OUT, JSON.stringify({
    programa: 'scripts/p73-extrai-corpo-unico-preflight.mjs', em: new Date().toISOString(),
    porque: 'os bytes deste corpo nao existem no indice sob nenhum caminho; a origem e um artefacto grande que tambem carrega copias ja versionadas',
    origem: { ficheiro: c.origem_primaria, aparece_em: c.aparece_em, campo: c.chave },
    medicao_do_pai_sem_o_corpo: c.pais,
    corpo: { bytes: c.bytes, md5: c.md5, chars: c.texto.length }
  , texto: c.texto }, null, 2) + '\n');
  const relido = JSON.parse(readFileSync(OUT, 'utf8'));
  const re = varre_corpos(relido, '', LIMITE);
  if (re.length !== 1) throw new Error('ABORTA: o companion ' + nome + ' tem ' + re.length + ' corpos >= limite, esperava 1');
  if (re[0].md5 !== c.md5 || re[0].bytes !== c.bytes) throw new Error('ABORTA: o companion nao reproduz o corpo de origem (md5 ' + re[0].md5 + '/' + c.md5 + ', bytes ' + re[0].bytes + '/' + c.bytes + ')');
  escritos.push({ ficheiro: 'evidence/' + nome, bytes_no_disco: statSync(OUT).size, corpo_md5: c.md5, corpo_bytes: c.bytes, origem: c.origem_primaria });
  console.log('  ESCRITO evidence/' + nome + ' (' + statSync(OUT).size + ' B) · re-leitura bate');
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
const saida = { programa: 'scripts/p73-extrai-corpo-unico-preflight.mjs', em: new Date().toISOString(), limite_bytes: LIMITE, corpus_pegadas: corpus.pegadas_distintas, corpo_unicos: unicos.map((c) => ({ md5: c.md5, bytes: c.bytes, chave: c.chave, aparece_em: c.aparece_em, porque: c.hit.porque })), corpo_ja_no_indice: cobertos.map((c) => ({ md5: c.md5, bytes: c.bytes, chave: c.chave, forma_de_acerto: c.hit.direto ? 'render_direto' : 'md5_declarado_pelo_pai', caminho_no_indice: (c.hit.direto || c.hit.declarado).caminho, pai_md5_declarado: c.hit.declarado ? c.pais[c.origem_primaria].md5 : null, aparece_em: c.aparece_em })), companions: escritos, bytes_ja_cobertos_que_a_origem_carregava: sum(cobertos.map((c) => c.bytes * c.aparece_em.length)), bytes_unicos_preservados: sum(unicos.map((c) => c.bytes)) };
const OUT2 = `${REPO}/evidence/p73-extracao-de-corpos-unicos-${SUF}.json`;
if (existsSync(OUT2)) throw new Error('ABORTA: ' + OUT2 + ' existe');
writeFileSync(OUT2, JSON.stringify(saida, null, 2) + '\n');
console.log('BYTES JA COBERTOS que a origem carregaria: ' + saida.bytes_ja_cobertos_que_a_origem_carregava + ' · BYTES UNICOS PRESERVADOS: ' + saida.bytes_unicos_preservados);
console.log(unicos.length ? 'P7Y_DELTA_VERSIONADO · registo ' + OUT2 : 'P7Y_NADA_A_EXTRACTAR · a origem so carrega copias do indice; fica fora do snapshot sem perdida de prova · registo ' + OUT2);
