// C2-R — porta de higiene do diário: todo caminho entre crases em docs/c2r-diario.md
// tem de existir em disco. Prosa que nomeia artefacto inexistente é o defeito de registo
// que já derrubou diários anteriores.
import { readFileSync, existsSync } from 'node:fs';
import { DIR } from './c2-lib.mjs';

const txt = readFileSync(`${DIR}/docs/c2r-diario.md`, 'utf8');
const alvos = [...new Set([...txt.matchAll(/`((?:sql|scripts|docs)\/[A-Za-z0-9._-]+)/g)].map((m) => m[1]))];
const ausentes = alvos.filter((p) => !existsSync(`${DIR}/${p}`));
console.log(`caminhos citados: ${alvos.length}`);
console.log(alvos.join('\n'));
if (ausentes.length) {
  console.log('C2R_DIARIO_PONTAS_SOLITARIAS:', ausentes.join(', '));
  process.exit(1);
}
console.log('C2R_DIARIO_CAMINHOS_OK');
