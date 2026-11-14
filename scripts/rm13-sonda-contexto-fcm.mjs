// RM-1.3 complemento: imprimir o CONTEXTO das ocorrencias de "firebase-messaging"
// no worker.mjs da linhagem e no shell do ar. Somente-leitura; multinha por [\s\S]
// porque o ponto nao casa nova e isso escondia o contexto na sonda anterior.
import { readFileSync, readdirSync } from 'node:fs';
const ctx = (t, re, n = 4) =>
  [...t.matchAll(re)].slice(0, n).map((m) => m[0].replace(/\s+/g, ' '));
const shell = readFileSync('ar-shell.html', 'utf8');
console.log('SHELL firebase-messaging ->');
for (const c of ctx(shell, /[\s\S]{0,60}firebase-messaging[\s\S]{0,60}/g)) console.log('  |' + c + '|');
for (const dir of readdirSync('.').filter((d) => /^worker-deploy-v\d/.test(d)).sort()) {
  const t = readFileSync(`${dir}/worker.mjs`, 'utf8');
  console.log(`WORKER ${dir} occurrences=${(t.match(/firebase-messaging/g) || []).length} com -sw=${(t.match(/firebase-messaging-sw/g) || []).length}`);
  for (const c of ctx(t, /[\s\S]{0,70}firebase-messaging[\s\S]{0,70}/g, 6)) console.log('  |' + c + '|');
}
