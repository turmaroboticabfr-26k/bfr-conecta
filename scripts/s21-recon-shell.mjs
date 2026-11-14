// S21-RECON — contexto dos marcadores na aba Supervisão, medido sobre os bytes VIVOS da v119.
// SOMENTE LEITURA. Nada dactilografado: os marcadores vêm do próprio corpo (extraídos, não assumidos).
import { writeFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const shell = await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'Cache-Control': 'no-cache' } });
const body = await shell.text();
const out = { em: new Date().toISOString(), http: shell.status, bytes: Buffer.byteLength(body) };

const ctx = (needle, before = 120, after = 520) => {
  const hits = []; let i = -1;
  while ((i = body.indexOf(needle, i + 1)) >= 0) hits.push({ pos: i, texto: body.slice(Math.max(0, i - before), i + after).replace(/\s+/g, ' ') });
  return hits;
};

out.contagens = {};
for (const k of ['education_supervisor', 'supervision_requests', 'sports_schools(name)', 'data-sec-tab="supervisao"', 'data-role-section="secretaria"', 'setRole(']) out.contagens[k] = body.split(k).length - 1;

out.roleSectionAccess = ctx('roleSectionAccess', 80, 460);
out.marco_supervisao = ctx('data-sec-tab="supervisao"', 260, 260);
out.supervisor_no_acesso = ctx('education_supervisor', 200, 260);
out.query_da_aba = ctx('sports_schools(name)', 700, 260);

writeFileSync(`${DIR}/s21-recon-shell.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.contagens, null, 2));
console.log('\n--- roleSectionAccess (primeiro hit) ---\n' + (out.roleSectionAccess[0]?.texto || ''));
console.log('\n--- consulta da aba ---\n' + (out.query_da_aba[0]?.texto || ''));
