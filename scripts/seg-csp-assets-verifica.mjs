// Verifica byte a byte os 12 assets de worker-deploy-v118-swfix/public/ contra o ar.
// Nada e publicado; so leitura. O URL vem do portoes.json (derivado, nunca dactilografado).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const base = JSON.parse(readFileSync('worker-deploy-v118-csp/portoes.json', 'utf8')).url;
const dir = 'worker-deploy-v118-swfix/public';
const files = readdirSync(dir).sort();
const gates = [];
const gate = (nome, ok, detalhe = '') => {
  gates.push({ nome, ok, detalhe });
  console.log((ok ? 'VERDE  ' : 'VERMELHO') + ' ' + nome + (detalhe ? ' — ' + detalhe : ''));
  if (!ok) process.exitCode = 1;
};

gate('lista de assets no disco tem 12 ficheiros', files.length === 12, `${files.length}`);

const vivos = {};
for (const f of files) {
  const res = await fetch(new URL('/' + f, base).href, { cache: 'no-store' });
  const buf = Buffer.from(await res.arrayBuffer());
  vivos[f] = { status: res.status, buf };
  const disco = readFileSync(`${dir}/${f}`);
  gate(`${f} vivo == disco (bytes)`, res.status === 200 && buf.equals(disco),
    `status ${res.status} bytes ${buf.length} md5 ${md5(buf)}`);
}

gate('todos os 12 vivos conferidos contra o disco', files.every((f) => vivos[f].status === 200 && vivos[f].buf.equals(readFileSync(`${dir}/${f}`))));

const falhas = gates.filter((g) => !g.ok).length;
console.log(`\n${gates.length} portoes, ${falhas} falhas.`);
if (falhas > 0) process.exit(1);
