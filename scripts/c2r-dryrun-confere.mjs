// C2-R — conferir o dry-run gravado: chaves, hashes e a igualdade antes == reversão.
// Casa: hash nunca por olho — comparação programática e re-emissão espaçada com [ ... ].
import { readFileSync } from 'node:fs';
import { DIR } from './c2-lib.mjs';

const espacar = (h) => [...h].join(' ');
const j = JSON.parse(readFileSync(`${DIR}/docs/c2r-42p17-dryrun.json`, 'utf8'));
console.log('chaves:', Object.keys(j).join(', '));
const r = j.resultado ?? j.res ?? j.fechamento ?? j;
const achado = (o, chave, caminho = '') => {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k === chave) return { valor: v, caminho: `${caminho}${k}` };
      const fundo = achado(v, chave, `${caminho}${k}.`);
      if (fundo) return fundo;
    }
  }
  return null;
};
for (const chave of ['md5_antes', 'md5_cand', 'md5_rb', 'md5_vivo']) {
  const a = achado(j, chave);
  console.log(chave, a ? `${a.valor}  (${a.caminho})  [${espacar(String(a.valor))}]` : 'NAO ENCONTRADO');
}
const antes = achado(j, 'md5_antes')?.valor;
const rb = achado(j, 'md5_rb')?.valor;
const vivo = achado(achado(j, 'baseline')?.valor ?? {}, 'md5_vivo')?.valor ?? achado(j, 'md5_vivo')?.valor;
console.log('antes == rb:', antes === rb, '| antes == vivo:', antes === vivo);
console.log('portoes:', achado(j, 'portoes')?.valor, '| falhas:', JSON.stringify(achado(j, 'falhas')?.valor));
