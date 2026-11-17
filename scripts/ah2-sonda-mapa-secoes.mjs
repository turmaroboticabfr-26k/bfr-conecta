// AH-2-SONDA estática: onde o app declara as seções de cada papel e se isso é legível em runtime.
// Motivo: a 390 px todos os [data-section] medem 0×0 (verificado também no recon do AH-1), então
// «visível» não serve de régua de menu. Preciso da fonte declarativa, não do DOM.
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
console.log('=== globals BFR_ expostos ===');
console.log([...new Set((t.match(/window\.BFR_[A-Z_]+/g) || []))].join('\n'));
console.log('\n=== roleSectionAccess: definição e chaves ===');
const i = t.indexOf('roleSectionAccess');
console.log('primeira posição', i);
if (i >= 0) console.log(t.slice(i - 60, i + 1600).replace(/\s+/g, ' '));
console.log('\n=== como o nav monta os itens do papel ===');
for (const chave of ['function visibleSectionsFor', 'sectionsForRole', 'navSections', 'SECTIONS_BY_ROLE', 'buildNav']) {
  const j = t.indexOf(chave);
  console.log(`${chave}: ${j < 0 ? 'AUSENTE' : t.slice(j, j + 260).replace(/\s+/g, ' ')}`);
}
