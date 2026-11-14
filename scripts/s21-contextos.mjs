// S21 — contextos das ocorrências de education_supervisor e do roteador de views nos BYTES do ar (read-only).
import { writeFileSync } from 'node:fs';
const body = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'cache-control': 'no-cache' } })).text();
const out = { bytes: Buffer.byteLength(body), ocorrencias: [], roteador: [], applyRole: [] };
let i = -1;
while ((i = body.indexOf('education_supervisor', i + 1)) >= 0) {
  const linha = body.slice(0, i).split('\n').length;
  out.ocorrencias.push({ linha, contexto: body.slice(Math.max(0, i - 220), i + 220).replace(/\s+/g, ' ') });
}
for (const ancora of ['viewIds', 'function setRole', 'applyRoleSectionAccess', 'roleSectionAccess[']) {
  const k = body.indexOf(ancora);
  if (k >= 0) out.roteador.push({ ancora, linha: body.slice(0, k).split('\n').length, contexto: body.slice(k, k + 700).replace(/\s+/g, ' ') });
}
writeFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/s21-contextos.json', JSON.stringify(out, null, 2) + '\n');
console.log('bytes=' + out.bytes + ' ocorrencias=' + out.ocorrencias.length);
out.ocorrencias.forEach(o => console.log('  :' + o.linha + '  ' + o.contexto.slice(0, 260)));
console.log('--- roteador:');
out.roteador.forEach(r => console.log('  [' + r.ancora + '] :' + r.linha + '  ' + r.contexto.slice(0, 400)));
