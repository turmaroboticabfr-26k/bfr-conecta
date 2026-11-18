// Confronta dois diários de portão, campo a campo, e diz quais mexeram. Serve para a regra da casa que
// proíbe dizer «a segunda corrida dá o mesmo» sem a segunda corrida: sem este leitor, a única alternativa
// é comparar os JSON por olho, que é onde as pegadas se falsificam. O campo `em` (hora) fica de fora,
// senão um artefacto com timestamp vermelho-ia entre duas corridas só pela hora.
// USO: node scripts/ah1-confronta-diarios.mjs <diarioA> <diarioB>
// Defeito apanhado na primeira utilização (18/11): a versão inicial fazia `JSON.stringify` e depois
// `Object.keys` sobre a *string*, o que dava um diff por índice de caractere (`14: "2" vs "4"`). Comparar
// exige percorrer o valor **antes** de o serializar; por isso a recursão abaixo é sobre objectos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
if (ARGS.length !== 2) throw new Error('USO: node scripts/ah1-confronta-diarios.mjs <diarioA> <diarioB>');
const leio = (p) => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.resolve(RAIZ, p), 'utf8'));
const [A, B] = [leio(ARGS[0]), leio(ARGS[1])];
const e = (x) => x !== null && typeof x === 'object';
const corta = (x) => { const s = JSON.stringify(x); return s === undefined ? 'ausente' : s.length > 160 ? s.slice(0, 160) + '…' : s; };

// Diff recursivo com profundidade limitada: nomes de campo, nunca índices de caractere.
const diff = (a, b, prefixo, saida, prof = 0) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (prof < 2 && e(a) && e(b) && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])]) diff(a[k], b[k], `${prefixo}.${k}`, saida, prof + 1);
    return;
  }
  if (prof < 2 && Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
    saida.push(`${prefixo}: comprimentos ${a.length} vs ${b.length}`);
    return;
  }
  saida.push(`${prefixo}: ${corta(a)} vs ${corta(b)}`);
};

const iguais = [];
const saida = [];
for (const k of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
  if (k === 'em') continue;
  if (JSON.stringify(A[k]) === JSON.stringify(B[k])) { iguais.push(k); continue; }
  diff(A[k], B[k], k, saida);
}
console.log(`A=${ARGS[0]}\nB=${ARGS[1]}`);
console.log(`campos_iguais(${iguais.length}): ${iguais.join(', ')}`);
if (!saida.length) console.log('DIARIOS_IDENTICOS (exceto a hora)');
else { console.log(`campos_diferentes(${saida.length}):`); saida.forEach((l) => console.log('  ' + l)); }
