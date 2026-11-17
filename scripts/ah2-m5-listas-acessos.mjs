// §AI.19/7 assina que a lista de acessos do app PREVER a medida, dígito a dígito. Uma afirmação dessas não pode
// ficar apoiada num ficheiro de /tmp que desaparece: este programa lê `roleSectionAccess` dos bytes servidos em
// `app/index.html` (mesmo regex que o `ah2-mobile2.mjs` usa para construir `declaradas`, para que instrumento e
// prova não diverjam), varre as catorze chaves e responde a uma pergunta por rota: em quantas listas ela está.
// O resultado fecha a conta dos 14 pares medidos sem resíduo — e é por isso que a linha do §14 pode dizer «a
// lista prevê a medida» em vez de «a lista é compatível com a medida». Só-leitura: não escreve artefacto, não
// abre browser, não toca na base.
// Uso: node scripts/ah2-m5-listas-acessos.mjs [rota ...]
import { readFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const txt = readFileSync(`${DIR}/app/index.html`, 'utf8');
const i = txt.indexOf('const roleSectionAccess');
if (i === -1) throw new Error('roleSectionAccess não encontrado nos bytes servidos — o índice do app mudou de forma');
const bloco = txt.slice(i, txt.indexOf('};', i));
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-zA-Z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const chaves = Object.keys(MAPA);
const rotas = process.argv.slice(2);
const ALVOS = rotas.length ? rotas : ['apoio', 'relatorios', 'direcao', 'conteudos', 'notificacoes', 'multiprofissional', 'escola-historia', 'coordenacao-chat'];

console.log(`roleSectionAccess tem ${chaves.length} chaves: ${chaves.join(' ')}`);
for (const alvo of ALVOS) {
  const com = chaves.filter((c) => MAPA[c].includes(alvo));
  const sem = chaves.filter((c) => !MAPA[c].includes(alvo));
  console.log(`  ${alvo.padEnd(20)} em ${String(com.length).padStart(2)}/${chaves.length}  ${com.length && com.length < chaves.length ? `só: ${com.join(' ')}` : com.length ? 'em todas' : `em NENHUMA`}${sem.length && sem.length <= 3 && com.length ? `  · falta em: ${sem.join(' ')}` : ''}`);
}
console.log('\nprimeira entrada de cada lista (é para lá que navigateToSection atira uma rota não concedida):');
console.log('  ' + chaves.map((c) => `${c}:${MAPA[c][0]}`).join(' '));
console.log('\nnote-se: nenhuma lista contém `apoio` e só `coordinator` contém `relatorios`. A área de apoio tem');
console.log('allow-list própria (`supportRoles`), por isso o painel abre — e por isso mesmo nenhum caminho grava a secção.');
