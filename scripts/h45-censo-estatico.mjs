import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const buf = readFileSync(`${ROOT}/evidence/h45-ar-v120-shell.html`);
const txt = buf.toString('utf8');
const lines = txt.split('\n');
const L = (n) => lines[n - 1];
const md5 = (b) => createHash('md5').update(b).digest('hex');

const hits = (needle) => {
  const o = [];
  lines.forEach((l, i) => { if (l.includes(needle)) o.push(i + 1); });
  return o;
};

const out = { ar: { bytes: buf.length, md5: md5(buf), linhas: lines.length } };

// H5 — mapa de rotulos
out.h5 = {
  linha_mapa: 10437,
  mapa: L(10437),
  tem_chave_supervisor: L(10437).includes('education_supervisor'),
  chaves_no_mapa: [...L(10437).matchAll(/([a-z_]+):\['/g)].map((m) => m[1]),
  fallback: L(10438),
  onde_pinta: L(10440),
};

// H4 — item do menu
out.h4 = {
  linha_toggle: 10425,
  toggle: L(10425),
  aceita_supervisor: L(10425).includes('education_supervisor'),
  markup_data_section_secretaria: hits('data-section="secretaria"'),
};
out.h4.markup = out.h4.markup_data_section_secretaria.map((n) => ({ linha: n, texto: L(n).trim().slice(0, 400) }));

// todo papel conhecido em cada superficie
out.censo_papel = {};
for (const alvo of ['education_supervisor', 'secretary']) {
  out.censo_papel[alvo] = { ocorrencias: hits(alvo).length, linhas: hits(alvo).slice(0, 60) };
}

// superfícies de navegação
out.nav = {
  syncRoleNavigation_def: hits('function syncRoleNavigation').concat(hits('syncRoleNavigation =')),
  roleSectionAccess_def: hits('roleSectionAccess'),
  viewIds_def: hits('viewIds'),
  data_sec_tab: hits('data-sec-tab').slice(0, 20),
  qtd_data_sec_tab: hits('data-sec-tab').length,
  bfr_platform_nav: hits('bfr-platform-nav-item').slice(0, 12),
  mini_person: hits('mini-person').slice(0, 14),
};

console.log(JSON.stringify(out, null, 1));
