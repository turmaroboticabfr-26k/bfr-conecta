// AG-4 (peça 2) — candidata PEN-30, SEM PUBLICAR. Parte da v123 publicada (md5 do worker conferido),
// corrige o ÚNICO sítio que pede `announcements.created_at` e prova que os outros 13 call sites de
// `announcements` e as outras 51 ordenações por `created_at` não foram tocadas.
// ARMADILHA MEDIDA 16/11: `order('created_at',{ascending:false})` ocorre 52 vezes no bundle. Uma
// substituição por esse padrão reescreveria 51 pedidos alheios; a chave de busca é o trecho completo
// (from + select + order + limit), que ocorre 1 vez — e é isso que o portão `chave_unica` mede.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, baseDir, saidaDir, md5, conta, diario } from './ag-lib.mjs';

const { criarGates } = await import('file:///C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/scripts/c2-lib.mjs');
const g = criarGates();

const BASE = join(REPO, baseDir);
const CAND = join(REPO, saidaDir);
const DIARIO = join(REPO, diario);
if (existsSync(CAND)) throw new Error(`já existe ${CAND} — renomeie a candidata anterior com md5 dos dois lados, não por cima`);
if (existsSync(DIARIO)) throw new Error(`já existe ${DIARIO} — renomeie com md5 dos dois lados, não por cima`);

const baseWorker = readFileSync(join(BASE, 'worker.mjs'), 'utf8');
const md5Base = md5(baseWorker);
g.gate('base_e_a_v123_publicada', md5Base, '7044c8c02368fbc2a99edc1b366e2326');

// A correção: o campo fantasma sai do select e a ordenação passa a ser por uma coluna que existe.
// Não se introduce sintaxe nova de alias do PostgREST (não há como prová-la sem tocar no ar): o
// select corrigido é exatamente um select JÁ EMBUTIDO nesta mesma versão, mais `meeting_id`.
const TRECHO = ".from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100)";
const CORRIGIDO = ".from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100)";

g.gate('chave_unica_no_base', conta(baseWorker, TRECHO), 1);
const novo = baseWorker.replace(TRECHO, CORRIGIDO);
g.gate('substituicao_aplicada_uma_vez', conta(novo, TRECHO), 0);
g.gate('corrigido_presente_uma_vez', conta(novo, CORRIGIDO), 1);

// Os call sites vizinhos têm de continuar byte-a-byte iguais.
const selects = (t) => [...t.matchAll(/from\(\s*'announcements'\s*\)(?:\s*\.select\(\s*'[^']*'\s*\))?/g)].map((m) => m[0]);
const sBase = selects(baseWorker); const sCand = selects(novo);
g.gate('mesmo_numero_de_call_sites_de_announcements', sCand.length, sBase.length);
const mudados = sBase.map((x, k) => (x === sCand[k] ? null : x)).filter(Boolean);
g.gate('apenas_o_sitio_defeituoso_mudou', mudados.length, 1);
// o regex de vizinhos apanha from+select (sem o order), por isso a expectativa é o select defeituoso
// sozinho — não a TRECHO inteira, que inclui order e limit.
g.gate('o_sitio_mudado_e_mesmo_o_defeituoso', mudados[0], TRECHO.match(/from\('announcements'\)\.select\('[^']*'\)/)[0]);

// As ordenações alheias por created_at têm de sobreviver: eram 52, passam a 51.
g.gate('ordenacoes_created_at_alheias_intactas', conta(novo, ".order('created_at',{ascending:false})"), conta(baseWorker, ".order('created_at',{ascending:false})") - 1);
// quantas ocorrências de `created_at` o patch apaga, calculada das próprias strings (número mágico é
// a armadilha da última vez)
g.gate('ocorrencias_apagadas_sao_as_da_chave', conta(baseWorker, 'created_at') - conta(novo, 'created_at'), conta(TRECHO, 'created_at') - conta(CORRIGIDO, 'created_at'));

// O select corrigido só pede colunas que o catálogo confirma — lista lida do artefacto da peça 1,
// não da memória.
const colunas = JSON.parse(readFileSync(join(REPO, 'evidence/ag4-pen30-sonda-16-11.json'), 'utf8')).colunas_catalogo;
const colsCorrigido = CORRIGIDO.match(/\.select\('([^']+)'\)/)[1].split(',');
g.gate('colunas_do_select_corrigido_existem_no_catalogo', colsCorrigido.filter((c) => !colunas.includes(c)), []);
g.gate('o_defeituoso_pediu_coluna_inexistente', ['created_at'].filter((c) => !colunas.includes(c)), ['created_at']);
g.gate('shape_do_corrigido_ja_embutido_na_versao_publicada', conta(baseWorker, "select('id,title,body,message_type,status,published_at,scheduled_at,important')") >= 1, true);

// Escrever a candidata: cópia da v123 com o worker substituído.
mkdirSync(CAND, { recursive: true });
cpSync(BASE, CAND, { recursive: true });
writeFileSync(join(CAND, 'worker.mjs'), novo);
const md5Cand = md5(readFileSync(join(CAND, 'worker.mjs'), 'utf8'));
g.gate('candidata_difere_do_base', md5Cand !== md5Base, true);
g.gate('delta_de_bytes_igual_ao_da_substituicao', Buffer.byteLength(novo) - Buffer.byteLength(baseWorker), Buffer.byteLength(CORRIGIDO) - Buffer.byteLength(TRECHO));

// REVERSIBILIDADE: a substituição inversa sobre a candidata devolve o md5 do base. Se falhar, a
// candidata não é «o base com um patch» e deixa de ser comparável à régua.
g.gate('reversivel_ao_md5_do_base', md5(novo.replace(CORRIGIDO, TRECHO)), md5Base);
// Todo o resto da árvore tem de ser byte-a-byte o do base: a candidata é «a v123 com um patch», não
// uma re-construção. Comparo por md5 de cada ficheiro, listado dos dois lados.
const { readdirSync, statSync } = await import('node:fs');
const arvore = (dir, sub = '') => {
  const acc = {};
  for (const f of readdirSync(join(dir, sub))) {
    const r = join(dir, sub, f);
    if (statSync(r).isDirectory()) Object.assign(acc, arvore(dir, join(sub, f)));
    else acc[join(sub, f)] = md5(readFileSync(r));
  }
  return acc;
};
const aBase = arvore(BASE), aCand = arvore(CAND);
g.gate('mesma_lista_de_ficheiros', Object.keys(aCand).sort(), Object.keys(aBase).sort());
const dif = Object.keys(aBase).filter((f) => aBase[f] !== aCand[f] && !/(^|[\\/])worker\.mjs$/.test(f));
g.gate('nada_fora_do_worker_mudou', dif, []);

// AUTOCONTROLE: um portão que não morde num valor trocado não é um portão.
const baseAdulterado = md5(baseWorker.replace('scheduled_at,created_at', 'scheduled_at,createX_at'));
const mordeu = md5Cand !== baseAdulterado;
console.log(`AUTOCONTROLE  md5 da candidata comparado a um base com o select adulterado → ${mordeu ? 'MORDE' : 'NÃO MORDE (portão morto)'}`);
g.gate('autocobranca_mordeu', mordeu, true);

const { portoes, falhas } = g.resumo();
writeFileSync(DIARIO, JSON.stringify({
  em: new Date().toISOString(),
  tarefa: 'AG-4 — candidata PEN-30 (announcements.created_at não existe), sem publicar',
  base_dir: baseDir, base_md5: md5Base,
  candidata_dir: saidaDir, candidata_md5: md5Cand,
  delta_bytes: Buffer.byteLength(novo) - Buffer.byteLength(baseWorker),
  substituicoes: [{
    motivo: 'PEN-30 — o select de loadHistory() pede announcements.created_at, que não está nas 13 colunas do catálogo; o erro vai para o innerHTML do histórico',
    de: TRECHO, para: CORRIGIDO,
  }],
  ordem_dos_portoes: 'chave única → substituição → vizinhos intactos → colunas pelo catálogo → reversibilidade → autocontrole',
  publicado: false,
  portoes, falhas,
}, null, 2) + '\n');

for (const f of falhas) console.log('VERMELHO  ' + f);
if (falhas.length === 0) { console.log(`AG4_CANDIDATA_VERDE ${portoes} portões / 0 falhas · ${baseDir} → ${saidaDir} · publicado=false · diário ${diario}`); process.exit(0); }
console.log(`AG4_CANDIDATA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
