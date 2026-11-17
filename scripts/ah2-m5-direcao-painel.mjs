// Porque este programa existe: §AI.19 ponto 5 deixou `direcao@developer` como a única célula «dentro do mapa
// e não marca», e recusei-ma assinar sem mecanismo. A leitura dos artefactos do §5 mudou a pergunta: na banda
// `m5-developer-1@320` o toque na barra deu `via:"barra"`, painel `adminView#282386`, `view_apos:"admin"` e
// `seccao_ativa:"administracao"` — ou seja, o marcador **moveu-se** (não ficou em `inicio` como nos 14 casos
// do `apoio`), mas moveu-se para `administracao`. Se `#bfrDirectionPanel` estiver DENTRO de `#adminView`, então
// o painel medido é o contentor-pai e o que está medido não é uma navegação partida: é a granularidade do
// próprio instrumento (que lê o `.content` visível, não o painel interno) junto com o facto de o app marcar o
// pai. Este programa responde a isso com os BYTES SERVIDOS e sem abrir browser: (1) o painel da direcção é
// descendente do contentor da administração? (2) que chave de papel possui o mapa `direcao:'#bfrDirectionPanel'`
// e que função o consome? (3) o `showSection`/equivalente escreve o marcador com a rota ou com o pai?
// Só-leitura: 0 browser, 0 escrita em base, 1 fetch ao shell público.
// Uso: node scripts/ah2-m5-direcao-painel.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-m5-direcao-painel-v2.json';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — usar outro rótulo');
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const md5 = createHash('md5').update(txt).digest('hex');

// (1) Contentores `.content` por ordem de aparición — é o que o instrumento chama `painel` (o `.content` visível).
const conteudos = [...txt.matchAll(/<(?:section|div)\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*id="([^"]+)"|<(?:section|div)\b[^>]*id="([^"]+)"[^>]*class="[^"]*\bcontent\b[^"]*"/g)]
  .map((m) => ({ id: m[1] || m[2], offset: m.index }));

// (2) Onde está o painel da direcção, e qual o contentor imediatamente anterior a ele na fonte.
//     O primeiro `indexOf('bfrDirectionPanel')` cai em CSS (offset ~294 k), não no elemento: procuro a
//     declaração `id="bfrDirectionPanel"` e exijo que a lista de contentores não esteja vazia.
const idx = txt.indexOf('id="bfrDirectionPanel"');
if (!conteudos.length) throw new Error('ABORTA: 0 contentores `.content` com id reconhecidos nas bytes servidas — o regex mudou de forma');
if (idx === -1) throw new Error('ABORTA: não há id="bfrDirectionPanel" nas bytes servidas');
const anterior = [...conteudos].filter((c) => c.offset < idx).slice(-1)[0] || null;
const seguinte = conteudos.find((c) => c.offset > idx) || null;
// O encerramento do contentor pai, aproximado por equilíbrio de tags a partir da abertura.
const fechoDo = (abertura_offset) => {
  let depth = 0;
  const i = txt.indexOf('>', abertura_offset) + 1;
  for (const m of txt.slice(i).matchAll(/<(\/?)(?:section|div|main)\b[^>]*>/g)) {
    if (m[1] === '/') { depth -= 1; if (depth < 0) return { fecho: i + m.index, ok: true }; }
    else depth += 1;
  }
  return { fecho: null, ok: false };
};
const dentro = anterior ? fechoDo(anterior.offset) : null;
const painel_dentro_do_contentor = !!(anterior && dentro?.ok && idx < dentro.fecho);

// (3) Dono do mapa `direcao:'#bfrDirectionPanel'` e a função que o lê.
const mapa_i = txt.indexOf("direcao:'#bfrDirectionPanel'");
const recuo = txt.slice(Math.max(0, mapa_i - 1200), mapa_i + 120);
const consome_i = txt.indexOf('directionPanel');
const saida = {
  ciclo: 'AH-M5-DIRECAO-PAINEL', em: new Date().toISOString(), md5_shell: md5,
  n_conteudos: conteudos.length, offset_bfrDirectionPanel: idx,
  contentor_imediatamenteanterior: anterior, contentor_seguinte: seguinte,
  painel_dentro_desse_contentor: painel_dentro_do_contentor,
  dono_do_mapa_trecho: recuo.replace(/\s+/g, ' ').slice(-700),
  primeira_aparicao_directionPanel: consome_i,
  leitura_candidata: painel_dentro_do_contentor
    ? 'o `.content` visível é ' + anterior?.id + ' — logo o `painel.id` medido pelo instrumento é o pai, e uma navegação correta para o painel interno NÃO pode mudar essa coluna'
    : 'o painel da direcção não está dentro do contentor anterior na fonte — a coluna `painel` teria de mudar se a navegação fosse correta',
};
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`md5=${md5.slice(0, 12)} · #bfrDirectionPanel @${idx} · contentor anterior=${anterior?.id}@${anterior?.offset} · seguinte=${seguinte?.id}@${seguinte?.offset} · dentro? ${painel_dentro_do_contentor}`);
console.log('\nMAPA (±1200 antes): …' + saida.dono_do_mapa_trecho.slice(-620));
console.log('\nESCRITO: ' + OUT.split('/').pop());
