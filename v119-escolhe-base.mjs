import fs from 'node:fs';
import crypto from 'node:crypto';

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const bases = ['worker-deploy-v118-csp', 'worker-deploy-v118-swclone', 'worker-deploy-v118'];
const html = fs.readFileSync(`${dir}/ar-shell.html`, 'utf8');

for (const b of bases) {
  const src = fs.readFileSync(`${dir}/${b}/worker.mjs`, 'utf8');
  console.log('%s worker.mjs bytes=%d md5=%s', b, Buffer.byteLength(src), md5(src));
  console.log('   ocorrencias bfr-conecta-v118 no worker = %d | no HTML = %d',
    (src.match(/bfr-conecta-v118/g) || []).length, (html.match(/bfr-conecta-v118/g) || []).length);
  const tom = fs.existsSync(`${dir}/${b}/wrangler.toml`) ? fs.readFileSync(`${dir}/${b}/wrangler.toml`, 'utf8').replace(/\n/g, ' | ') : 'AUSENTE';
  console.log('   wrangler.toml: %s', tom);
  const pub = fs.existsSync(`${dir}/${b}/public`) ? fs.readdirSync(`${dir}/${b}/public`) : [];
  console.log('   public/: %d arquivos', pub.length);
}
console.log('\nno HTML do ar, contexto da etiqueta:');
for (const m of html.matchAll(/bfr-conecta-v118/g)) {
  console.log('  pos=%d linha=%d :: %s', m.index, html.slice(0, m.index).split('\n').length, html.slice(m.index - 60, m.index + 30).replace(/\n/g, ' '));
}
