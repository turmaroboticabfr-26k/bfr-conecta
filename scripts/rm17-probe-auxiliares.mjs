import fs from 'node:fs';
const p = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/bfr-candidata-v119-supervisao-embed/index.html';
const s = fs.readFileSync(p, 'utf8');
const probes = [
  "education_supervisor:['inicio','secretaria'",
  "['secretary','education_supervisor'].includes(role())",
  "setRole(role === 'developer' ? 'admin'",
  "if (role === 'education_supervisor') setupSecretaryView();",
  "education_supervisor: 'secretaryView'",
];
for (const x of probes) console.log(`${s.split(x).length - 1}  ${x}`);
