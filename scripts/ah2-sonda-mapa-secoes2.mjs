// AH-2-SONDA estática 2: o mapa roleSectionAccess inteiro (parseado dos bytes servidos) e como o app
// traduz o rótulo do profile na chave do mapa (pedagogical→teacher, developer→admin, social_work→?).
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const i = t.indexOf('roleSectionAccess = {');
const fim = t.indexOf('};', i);
const bloco = t.slice(i + 'roleSectionAccess = '.length, fim + 1);
const mapa = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) mapa[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
console.log('chaves do mapa:', Object.keys(mapa).length, Object.keys(mapa).join(' '));
for (const [k, v] of Object.entries(mapa)) console.log(`  ${k} (${v.length}): ${v.join(' ')}`);
console.log('\n=== usos de roleSectionAccess[ ===');
let j = -1, n = 0;
while ((j = t.indexOf('roleSectionAccess[', j + 1)) >= 0 && n < 6) { console.log(`[${n}] …${t.slice(Math.max(0, j - 300), j + 160).replace(/\s+/g, ' ')}`); n++; }
console.log('\n=== tradução de rótulo → chave ===');
for (const chave of ['pedagogical', 'social_work', "role === 'developer'"]) {
  const k = t.indexOf(chave);
  console.log(`primeira ocorrência de ${chave} @${k}: ${k < 0 ? '' : t.slice(k - 160, k + 160).replace(/\s+/g, ' ')}`);
}
const sec = t.indexOf("'secretary':");
console.log('\nsecretary declarado:', JSON.stringify(mapa.secretary));
