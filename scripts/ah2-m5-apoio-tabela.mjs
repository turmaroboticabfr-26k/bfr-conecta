// Porque este programa existe: a linha do §5 dizia «Espaço de Apoio vazio para o staff», e ela nascia de ver
// `apoio` com 0 caracteres em coordinator/developer. Se a regra fosse «papel de staff», o `aee` — que é staff
// e está em `STAFF_ROLES` — também daria 0. Não dá: dá 3001. Então a afirmação que interessa não é «quais são
// staff», é «em que células é que o painel enche», e isso só se vê com todas as leituras lado a lado. Este
// programa tabula a MAIOR leitura de `apoio.painel.c` por (papel, largura) a partir dos artefactos da grelha,
// e separa o contentor em que cada leitura caiu — porque um `resultsLearningView` medido no lugar do
// `supportView` não é um apoio cheio, é o instrumento a medir o vizinho.
// Só-leitura: 0 browser, 0 escrita em base. Uso: node scripts/ah2-m5-apoio-tabela.mjs [rotulo]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTULO = process.argv[2] || 'v1';
const OUT = `${DIR}/evidence/ah2-m5-apoio-tabela-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const LARGURAS = [320, 360, 375, 390, 414, 430];
// Por célula guarda-se a maior leitura e o contentor de onde ela veio; as leituras menores do mesmo contentor
// ficam contadas à parte, porque é a diferença 0↔cheio que está em causa.
const cel = {};
let leituras = 0;
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-.*\.json$/.test(x))) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  if (!j.papel || !j.bandas) continue;
  for (const [w, b] of Object.entries(j.bandas)) {
    const p = b.seccoes?.apoio;
    if (!p || p.painel?.c === undefined || p.painel?.c === null) continue;
    leituras++;
    const k = `${j.papel}@${w}`;
    const atual = { c: p.painel.c, id: p.painel.id ?? null, ativa: p.seccao_ativa ?? null, ficheiro: f };
    if (!cel[k] || atual.c > cel[k].c) cel[k] = atual;
  }
}
const por_papel = {};
for (const [k, v] of Object.entries(cel)) {
  const [p, w] = k.split('@');
  (por_papel[p] ||= {})[w] = v;
}
const linhas = Object.keys(por_papel).sort().map((p) => ({
  papel: p,
  celulas: LARGURAS.filter((w) => por_papel[p][w]).length,
  zeros: LARGURAS.filter((w) => por_papel[p][w] && por_papel[p][w].c === 0).length,
  cheios: LARGURAS.filter((w) => por_papel[p][w] && por_papel[p][w].c > 0).length,
  por_largura: Object.fromEntries(LARGURAS.map((w) => [w, por_papel[p][w] ? `${por_papel[p][w].id ?? '?'}=${por_papel[p][w].c}` : '—'])),
  sempre_supportView: LARGURAS.every((w) => !por_papel[p][w] || por_papel[p][w].id === 'supportView'),
  marcadores: [...new Set(LARGURAS.map((w) => por_papel[p][w]?.ativa).filter(Boolean))],
}));
const saida = { ciclo: 'AH-M5-APOIO-TABELA', em: new Date().toISOString(), rotulo: ROTULO, leituras_de_apoio_lidas: leituras,
  pergunta: 'o painel de apoio está vazio POR PAPEL (gate de staff) ou por outra coisa qualquer?',
  nota: '`c` são caracteres do contentor MAIS POPULOSO visível — é por isso que coordinator@390 mostra resultsLearningView: o instrumento mediu o vizinho, não o apoio. A coluna `sempre_supportView` diz em que papéis essa confusão não acontece.',
  papeis: linhas, leitura: null };
const cheios = linhas.filter((l) => l.cheios > 0 && l.zeros > 0);
saida.leitura = `nem todos os papéis de staff dão 0: ${linhas.filter((l) => l.zeros === l.celulas && l.celulas > 0).map((l) => l.papel).join(', ') || 'nenhum'} dão 0 em TODAS as larguras corridas, e ${cheios.map((l) => `${l.papel} (${l.zeros} zeros / ${l.cheios} cheios)`).join(', ') || 'ninguém'} têm as duas coisas na mesma célula de papel — logo a causa não pode ser uma regra de papel, e as duas candidatas que sobram (tempo de render vs caminho do toque) só se separam com uma sonda de browser a amostrar no tempo.`;
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const l of linhas) console.log(`${l.papel.padEnd(12)} ${Object.values(l.por_largura).map((x) => String(x).padStart(22)).join('')}`);
console.log('\nLEITURA: ' + saida.leitura);
console.log('ESCRITO: ' + OUT.split('/').pop());
