// RM-1.7 preflight — SOMENTE LEITURA. Extrai da base v119 as âncoras dos 3 hunks e prova unicidade.
// Nada dactilografado como verdade: as strings abaixo são hipóteses; o script imprime o texto real da linha.
import fs from 'node:fs';
const BASE = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/bfr-candidata-v119-supervisao-embed/index.html';
const RULER_MD5 = 'a1969cdf023042e7d2a91e7ed9333a05';
const RULER_BYTES = 3489474;
const crypto = await import('node:crypto');
const buf = fs.readFileSync(BASE);
const md5 = crypto.createHash('md5').update(buf).digest('hex');
const src = buf.toString('utf8');
const lines = src.split('\n');
console.log(`base md5 ${md5} bytes ${buf.length} linhas ${lines.length} chars ${src.length}`);
console.log(`regua    ${RULER_MD5} / ${RULER_BYTES} -> ${md5 === RULER_MD5 && buf.length === RULER_BYTES ? 'OK' : 'DIVERGENTE'}`);

const anchors = [
  ['H1', 9902, `: role === 'sports_operator' ? ['sports_operator','developer'].includes(currentProfile?.role) : role === 'admin' && currentProfile?.role === 'developer';`],
  ['H2', 9926, `secretaryView.classList.toggle('hidden', role !== 'secretary');`],
  ['H3', 10145, `secretary:secretaryView, aee:aeeView,`],
  ['H4', 10425, `!['parent','secretary','developer'].includes(role)`],
  ['H5', 10437, `secretary:['Secretaria escolar','Atendimento e protocolos'],`],
];
for (const [name, line, needle] of anchors) {
  const occ = src.split(needle).length - 1;
  const real = lines[line - 1] ?? '';
  const at = real.indexOf(needle);
  console.log(`\n### ${name} linha ${line}: ocorrencias ${occ}; presente na linha? ${at >= 0 ? 'SIM pos ' + at : 'NAO'}`);
  console.log(`    linha comprimento ${real.length}`);
  if (at >= 0) console.log(`    contexto: ${real.slice(Math.max(0, at - 90), Math.min(real.length, at + needle.length + 90)).replace(/\s+/g, ' ')}`);
  else console.log(`    linha real: ${real.slice(0, 300).replace(/\s+/g, ' ')}`);
}

// tokens novos: devem estar AUSENTES na base
const fresh = [
  `role === 'education_supervisor' ? ['education_supervisor','developer'].includes(currentProfile?.role)`,
  `role !== 'secretary' && role !== 'education_supervisor'`,
  `education_supervisor:secretaryView`,
];
console.log('\n### tokens novos na base (esperado 0 em todos)');
for (const t of fresh) console.log(`  ${src.split(t).length - 1}  ${t}`);

// estado vivo dos ramos que ja conhecem o papel
console.log('\n### trechos ja prontos (cópia literal da base)');
for (const l of [9947, 9948, 9903, 9904, 9907, 10306, 5286]) console.log(`  ${l}: ${(lines[l - 1] || '').trim().slice(0, 200)}`);
console.log(`\n  setRole ocorrencias ${src.split('function setRole').length - 1}`);
console.log(`  education_supervisor ocorrencias ${src.split('education_supervisor').length - 1}`);
