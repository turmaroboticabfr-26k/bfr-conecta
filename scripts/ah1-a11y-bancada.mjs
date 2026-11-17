// AH-1 (peça 4) — bancada A/B OFFLINE da candidata v126: importa o worker base (v123 publicada) e o
// da candidata no Node, serve o shell HTML de cada um com env mockado e compara contra a régua
// publicada (esperado-v123.json). Nada de rede: os dois fetches são locais. A/B = o HTML servido
// pela candidata difere do base SÓ nos 4 patches; a reversão do HTML devolve o md5 do base.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { criarGates } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE_DIR = 'worker-deploy-v123-pdfs';
const CAND_DIR = 'bfr-candidata-v126-a11y-secretaria';
const DIARIO = 'evidence/ah1-a11y-candidata-17-11.json';
const OUT = `${CAND_DIR}/portoes-v126-bancada.json`;
if (existsSync(join(REPO, OUT))) throw new Error(`já existe ${OUT} — renomeie com md5 dos dois lados, não por cima`);

const g = criarGates();
const md5 = (s) => createHash('md5').update(s).digest('hex');
const conta = (t, sub) => t.split(sub).length - 1;

// régua do ar publicada + diário da candidata (ler, não dactilografar)
const regua = JSON.parse(readFileSync(join(REPO, `${BASE_DIR}/esperado-v123.json`), 'utf8'));
const diario = JSON.parse(readFileSync(join(REPO, DIARIO), 'utf8'));
g.gate('diario autoriza (portoes 26 / publicado=false)', [diario.portoes, diario.falhas.length, diario.publicado], [26, 0, false]);
g.gate('diario aponta a base e a candidata certas', [diario.base_dir, diario.candidata_dir], [BASE_DIR, CAND_DIR]);
const patches = diario.patches;
g.gate('diario traz os 4 patches', patches.length, 4);

// A/B: servir o shell com cada worker importado
const url = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const env = {}, ctx = { waitUntil() {} };
const serve = async (dir) => {
  const mod = await import(`file:///${join(REPO, dir, 'worker.mjs').replace(/\\/g, '/')}`);
  const res = await mod.default.fetch(new Request(url), env, ctx);
  if (res.status !== 200) throw new Error(`${dir}: HTTP ${res.status}`);
  return await res.text();
};
const htmlBase = await serve(BASE_DIR);
const htmlCand = await serve(CAND_DIR);
// no bundle as chaves vivem com \n escapado; no HTML servido o template literal já os converteu
const htmlForm = (s) => s.replace(/\\n/g, '\n');
g.gate('A: shell base = régua publicada (md5)', md5(htmlBase), regua.htmlMd5);
g.gate('A: shell base = régua publicada (bytes)', Buffer.byteLength(htmlBase), regua.htmlBytes);

// A: regras antigas presentes, novas ausentes
for (const p of patches) g.gate(`A: regra antiga presente (${p.ocorrencias}×): ${p.nome.slice(0, 42)}`, conta(htmlBase, htmlForm(p.de)), p.ocorrencias);
g.gate('A: nenhuma regra nova no base', patches.every((p) => conta(htmlBase, htmlForm(p.para)) === 0), true);

// B: regras novas presentes, antigas zeradas (na inserção a âncora sobrevive por desenho)
for (const p of patches) g.gate(`B: regra nova presente (${p.ocorrencias}×): ${p.nome.slice(0, 42)}`, conta(htmlCand, htmlForm(p.para)), p.ocorrencias);
for (const p of patches) {
  if (p.para.startsWith(p.de)) g.gate(`B: âncora preservada na inserção: ${p.nome.slice(0, 42)}`, conta(htmlCand, htmlForm(p.de)), p.ocorrencias);
  else g.gate(`B: regra antiga zerada: ${p.nome.slice(0, 42)}`, conta(htmlCand, htmlForm(p.de)), 0);
}

// B difere do A exatamente pelo delta dos patches
g.gate('B != A (md5)', md5(htmlCand) !== md5(htmlBase), true);
let revertido = htmlCand;
for (const p of patches) {
  if (p.ocorrencias === 1) revertido = revertido.replace(htmlForm(p.para), htmlForm(p.de));
  else revertido = revertido.split(htmlForm(p.para)).join(htmlForm(p.de));
}
g.gate('B reversível ao md5 do A (HTML servido)', md5(revertido), md5(htmlBase));

// censo de fontes no HTML servido
g.gate('HTML: font-size:10px caiu exatamente 3', conta(htmlBase, 'font-size:10px') - conta(htmlCand, 'font-size:10px'), 3);
g.gate('HTML: font-size:12px subiu exatamente 3', conta(htmlCand, 'font-size:12px') - conta(htmlBase, 'font-size:12px'), 3);

// autocontrol: um patch adulterado sobre o base NÃO pode reproduzir a candidata
const adulterado = htmlBase.replace(patches[0].de, patches[0].para.replace('24px', '23px'));
g.gate('autocobranca_mordeu (HTML com checkbox adulterado difere da candidata)', md5(adulterado) !== md5(htmlCand), true);

const { portoes, falhas } = g.resumo();
writeFileSync(join(REPO, OUT), JSON.stringify({
  em: new Date().toISOString(),
  ciclo: 'AH-1 peça 4 — bancada A/B offline da candidata v126',
  metodo: 'import offline dos dois workers + fetch local do shell + comparação com a régua publicada; 0 rede, 0 banco',
  regua: { ficheiro: `${BASE_DIR}/esperado-v123.json`, htmlMd5: regua.htmlMd5, htmlBytes: regua.htmlBytes },
  base: { dir: BASE_DIR, html_md5: md5(htmlBase), html_bytes: Buffer.byteLength(htmlBase) },
  candidata: { dir: CAND_DIR, html_md5: md5(htmlCand), html_bytes: Buffer.byteLength(htmlCand) },
  delta_html_bytes: Buffer.byteLength(htmlCand) - Buffer.byteLength(htmlBase),
  publicado: false,
  portoes, falhas,
}, null, 2) + '\n');

for (const f of falhas) console.log('VERMELHO  ' + f);
if (falhas.length === 0) { console.log(`AH1_A11Y_BANCADA_VERDE ${portoes} portões / 0 falhas · ${OUT} · publicado=false`); process.exit(0); }
console.log(`AH1_A11Y_BANCADA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
