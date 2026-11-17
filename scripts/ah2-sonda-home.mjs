// Só-leitura, sem browser: extrai das BYTES SERVIDAS o caminho que o clique em Home percorre, para
// responder ao §6 do briefing («identificar a causa real antes de alterar a estrutura») sem adivinhar.
// Não escreve no ar, não faz deploy, não abre Chrome — por isso pode correr em paralelo com a varredura.
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-sonda-home-17-11.json';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const cria = (needle, span = 1400) => {
  const hits = [];
  let i = txt.indexOf(needle);
  while (i !== -1 && hits.length < 6) { hits.push({ at: i, trecho: txt.slice(Math.max(0, i - 220), i + span) }); i = txt.indexOf(needle, i + 1); }
  return hits;
};
const out = { em: new Date().toISOString(), bytes: txt.length, md5: null, achados: {} };
out.achados.nav_inicio = cria("case 'inicio'").concat(cria("=== 'inicio'"));
out.achados.show_home = cria('function showHome').concat(cria('function renderHome')).concat(cria('function loadHome'));
out.achados.setActive_view_inicio = cria("activeView === 'parent'").slice(0, 2).map((h) => h.trecho.slice(0, 700));
out.achados.parent_view_render = cria('function renderParentView', 900).concat(cria('parentView', 300)).slice(0, 8);
out.achados.home_functions = (txt.match(/function\s+\w*[Hh]ome\w*/g) || []).slice(0, 40);
out.achados.md5 = createHash('md5').update(txt).digest('hex');
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('bytes=' + txt.length + ' · chaves=' + Object.keys(out.achados).join(',') + ' · ' + OUT.split('/').pop());
