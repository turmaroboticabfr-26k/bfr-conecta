// S21 — corpos de setRole / activeView / roteador do boot nos BYTES do ar (read-only).
import { writeFileSync } from 'node:fs';
const body = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'cache-control': 'no-cache' } })).text();
const linha = i => body.slice(0, i).split('\n').length;
const corpoFn = (ancora) => {
  const k = body.indexOf(ancora); if (k < 0) return null;
  const abre = body.indexOf('{', k); let n = 0;
  for (let j = abre; j < body.length; j++) { if (body[j] === '{') n++; else if (body[j] === '}') { n--; if (!n) return { ainda: ancora, linha: linha(k), corpo: body.slice(k, j + 1) }; } }
  return { ainda: ancora, linha: linha(k), corpo: body.slice(k, k + 2000) };
};
const out = { bytes: Buffer.byteLength(body), funcs: [] };
for (const a of ['function setRole(', 'function activeView(', 'function applyRoleSectionAccess', 'function buildNav', 'function setupSecretaryView(', 'function showSection(']) {
  const f = corpoFn(a);
  if (f) out.funcs.push({ ainda: f.ainda, linha: f.linha, caracteres: f.corpo.length, corpo: f.corpo.replace(/\s+/g, ' ').slice(0, 3000) });
  else console.log('AUSENTE: ' + a);
}
writeFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/s21-funcoes.json', JSON.stringify(out, null, 2) + '\n');
out.funcs.forEach(f => { console.log('\n════ ' + f.ainda + '  :' + f.linha + '  (' + f.caracteres + ' chars)'); console.log(f.corpo.slice(0, 1400)); });
