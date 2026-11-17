// Prova por comparação de hash, nunca por leitura do valor: toma o literal candidato («bytes servidos»),
// calcula o mesmo hash dos valores casados pelo regex do portão nos artefactos, e diz apenas se são
// iguais. Se forem, a classe está provada — etiqueta de procedência, não credencial — e a exceção pode ser
// assinada com essa medida. Imprime também a lista de comprimentos tal como o portão a mede, para a exceção
// casar byte a byte com a régua.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SENHA = /(senha|password|passwd|chave)\s*["']?\s*[:=]\s*["']([^"'`${}]{6,24})["']/gi;
const h = (s) => createHash('sha256').update(s).digest('hex');
const candidatas = ['bytes servidas', 'bytes servidos'];
const hcand = candidatas.map((c) => ({ c: c.length, h: h(c) }));
for (const f of process.argv.slice(2)) {
  const t = readFileSync(f, 'utf8');
  const ms = [...t.matchAll(SENHA)];
  const iguais = ms.map((m) => { const x = h(m[2]); const i = hcand.findIndex((y) => y.h === x); return i < 0 ? null : candidatas[i]; });
  console.log(f + '  n=' + ms.length + ' comprimentos=' + ms.map((m) => m[2].length).join(',') + '  igual_a_candidata=' + JSON.stringify(iguais));
}
