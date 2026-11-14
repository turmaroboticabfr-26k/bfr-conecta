// V121-5 — censo dos ouvintes do service worker EMBUTIDO no worker publicado, para a §V poder
// dizer o que a v121 NÃO mudou no recetor de push. Compara o embed da base (worker-deploy-v120-404)
// com o do bundle publicado (worker-deploy-v121). Somente leitura: 0 deploy, 0 escrita, 0 DDL, 0 mint.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${dir}/evidence/v121-censo-sw-ouvintes-14-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const count = (s, t) => s.split(t).length - 1;

function unquote(src, i) {
  let o = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return o;
    if (c === '\\') { const n = src[i + 1]; o += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; }
    o += c; i++;
  }
  return null;
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  return unquote(src, q + 1);
}
function embeds(caminho) {
  const src = fs.readFileSync(caminho, 'utf8');
  return { html: grab(src, 'const HTML = '), sw: grab(src, 'const SW = ') };
}

const base = embeds(`${dir}/worker-deploy-v120-404/worker.mjs`);
const cand = embeds(`${dir}/worker-deploy-v121/worker.mjs`);

const reghua = e => ({
  bytes: Buffer.byteLength(e),
  md5: md5(Buffer.from(e, 'utf8')),
  ouvintes: {
    install: count(e, "addEventListener('install'"),
    activate: count(e, "addEventListener('activate'"),
    fetch: count(e, "addEventListener('fetch'"),
    push: count(e, "addEventListener('push'"),
    notificationclick: count(e, "addEventListener('notificationclick'"),
  },
  palavras: {
    push_literal: count(e, "'push'"),
    showNotification: count(e, 'showNotification'),
    importScripts: count(e, 'importScripts'),
    self_registration: count(e, 'self.registration'),
  },
  cache_label: (e.match(/bfr-conecta-v\d+/g) || []),
});

const B = reghua(base.sw), C = reghua(cand.sw);
const saida = {
  ciclo: 'V121-CENSO-SW-OUVINTES',
  em: new Date().toISOString(),
  deploy: 0, ddl: 0, escrita_banco: 0, mint: 0,
  metodo: 'o SW medido e o embed `const SW` dentro do worker.mjs de cada directorio, desembaracado por este script; nenhum corpo copiado de diario',
  base_v120_404: B,
  publicada_v121: C,
  diferencas: {
    bytes: C.bytes - B.bytes,
    md5_mudou: C.md5 !== B.md5,
    ouvintes_mudaram: JSON.stringify(C.ouvintes) !== JSON.stringify(B.ouvintes),
    palavras_mudaram: JSON.stringify(C.palavras) !== JSON.stringify(B.palavras),
    rotulos_de_cache: { antes: B.cache_label, depois: C.cache_label },
  },
  html: { base_md5: md5(Buffer.from(base.html, 'utf8')), cand_md5: md5(Buffer.from(cand.html, 'utf8')) },
};
fs.writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log(`escrito ${OUT}`);
console.log(`sw_base=${B.md5} ${B.bytes} B ouvintes=${JSON.stringify(B.ouvintes)}`);
console.log(`sw_v121=${C.md5} ${C.bytes} B ouvintes=${JSON.stringify(C.ouvintes)} cache=${JSON.stringify(C.cache_label)}`);
console.log(`diferencas=${JSON.stringify(saida.diferencas)}`);
