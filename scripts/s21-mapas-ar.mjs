// S21-3c — extrai roleSectionAccess e viewIds dos BYTES publicados (read-only, sem token, sem navegador).
// Pergunta: o papel education_supervisor tem a seção 'secretaria' no mapa e para qual view ele mapeia?
import { writeFileSync } from 'node:fs';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/s21-mapas-ar.json';

const body = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const out = { bytes: Buffer.byteLength(body), origem: URL_APP };

// literais do objeto: apanha do '{' que abre até o '}' equilibrado
const pegaObjeto = (ancora) => {
  const i = body.indexOf(ancora); if (i < 0) return null;
  const inicio = body.indexOf('{', i); if (inicio < 0) return null;
  let n = 0;
  for (let k = inicio; k < body.length; k++) {
    const c = body[k];
    if (c === '{') n++;
    else if (c === '}') { n--; if (n === 0) return body.slice(inicio, k + 1); }
  }
  return null;
};

const analisaMapa = (txt) => {
  if (!txt) return null;
  // chaves de nível 1 → array de strings
  const res = {};
  const re = /([A-Za-z_][\w]*)\s*:\s*\[/g;
  let m; const marks = [];
  while ((m = re.exec(txt))) marks.push({ chave: m[1], desde: m.index + m[0].length });
  marks.forEach((mk, idx) => {
    const ate = idx + 1 < marks.length ? txt.lastIndexOf(mk.chave, marks[idx + 1].desde) : txt.length;
    const fim = txt.indexOf(']', mk.desde);
    const itens = txt.slice(mk.desde, fim).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    res[mk.chave] = itens;
  });
  return res;
};

const rsa = pegaObjeto('roleSectionAccess');
out.roleSectionAccess_texto_bytes = rsa ? rsa.length : null;
out.roleSectionAccess = analisaMapa(rsa);
out.papeis_no_mapa = Object.keys(out.roleSectionAccess || {}).length;
out.com_secretaria = Object.entries(out.roleSectionAccess || {}).filter(([, v]) => v.includes('secretaria')).map(([k]) => k);
out['education_supervisor'] = {
  no_mapa: !!(out.roleSectionAccess || {}).education_supervisor,
  secoes: (out.roleSectionAccess || {}).education_supervisor || null,
  tem_secretaria: ((out.roleSectionAccess || {}).education_supervisor || []).includes('secretaria'),
};
out.viewIds = analisaMapa(pegaObjeto('viewIds'));
out.viewIds_education_supervisor = (out.viewIds || {}).education_supervisor ?? null;
out.viewIds_secretary = (out.viewIds || {}).secretary ?? null;
out.viewIds_parent = (out.viewIds || {}).parent ?? null;
out.marcas = {
  'setupSecretaryView(': (body.match(/setupSecretaryView\(/g) || []).length,
  'def setupSecretaryView': (body.match(/function setupSecretaryView|setupSecretaryView\s*=/g) || []).length,
  "role === 'education_supervisor'": (body.match(/role\s*===\s*['"]education_supervisor['"]/g) || []).length,
  'education_supervisor (todas)': (body.match(/education_supervisor/g) || []).length,
  'data-sec-tab': (body.match(/data-sec-tab/g) || []).length,
  'supervisao (todas)': (body.match(/supervisao/gi) || []).length,
  'setRole(' : (body.match(/setRole\(/g) || []).length,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  bytes: out.bytes, papeis_no_mapa: out.papeis_no_mapa,
  com_secretaria: out.com_secretaria,
  education_supervisor: out['education_supervisor'],
  viewIds_supervisor: out.viewIds_education_supervisor, viewIds_secretary: out.viewIds_secretary,
  marcas: out.marcas,
}, null, 2));
