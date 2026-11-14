// RM-6.9 passo de registro — SOMENTE LEITURA: imprime o essencial dos tres diarios do ciclo
// (candidata, antes, depois) sem trazer os `texto` de 7 MB para a conversa.
import { readFileSync } from 'node:fs';
const l = (p) => JSON.parse(readFileSync(p, 'utf8'));
for (const p of ['evidence/rm69-candidata-14-11.json', 'evidence/rm69-antes-14-11.json', 'evidence/rm69-depois-14-11.json']) {
  const o = l(p);
  console.log(`\n===== ${p}  ${o.em}`);
  console.log('veredito:', o.veredito, '| total:', JSON.stringify(o.total));
  console.log('portoes:', Object.keys(o.portoes).length, '->', Object.entries(o.portoes)
    .map(([k, v]) => `${k}=${JSON.stringify(v.valor)}${v.passou ? '' : ' FALHA'}`).join(' | '));
  if (o.censo) console.log('censo:', JSON.stringify(o.censo));
  if (o.ficheiros) console.log('ficheiros:', JSON.stringify(o.ficheiros));
  if (o.regua_local) console.log('regua_local:', JSON.stringify(o.regua_local));
  if (o.rotas) for (const [r, v] of Object.entries(o.rotas))
    console.log(`  rota ${r.padEnd(34)} ${v.http} ${String(v.ct).padEnd(28)} ${String(v.bytes).padStart(8)} B ${v.md5}`);
  if (o.shell_servido) console.log('shell:', JSON.stringify(o.shell_servido));
  if (o.sw_servido) console.log('sw:', JSON.stringify({ ...o.sw_servido, texto: undefined }));
  if (o.assets) console.log('assets:', JSON.stringify(o.assets.map((a) => [a.caminho || a.nome, a.http, a.bytes, a.md5, a.identico])));
}
