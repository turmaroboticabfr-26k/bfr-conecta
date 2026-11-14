// S21 — corpo completo de setRole() e da cadeia ternária de "allowed", a partir dos BYTES do ar (read-only).
const body = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'cache-control': 'no-cache' } })).text();
const k = body.indexOf('function setRole(');
const fimLista = body.indexOf(') {', k);           // fim da lista de parâmetros
let n = 0, fim = -1;
for (let j = fimLista + 2; j < body.length; j++) { if (body[j] === '{') n++; else if (body[j] === '}') { n--; if (!n) { fim = j; break; } } }
const corpo = body.slice(k, fim + 1);
const linhas = body.slice(0, k).split('\n').length;
console.log(':' + linhas + '  setRole com ' + corpo.length + ' chars');
// ramos da cadeia: role === 'X' ? [...]
const ramos = [...corpo.matchAll(/role === '([a-z_]+)'\s*\?\s*\[([^\]]*)\]/g)].map(m => ({ ramo: m[1], permite: m[2].replace(/['" ]/g, '').split(',') }));
console.log('ramos da cadeia (' + ramos.length + '):');
ramos.forEach(r => console.log('  ' + r.ramo + ' → ' + JSON.stringify(r.permite) + '  | education_supervisor? ' + r.permite.includes('education_supervisor')));
console.log('  education_supervisor tem ramo próprio? ' + ramos.some(r => r.ramo === 'education_supervisor'));
const cauda = corpo.slice(corpo.lastIndexOf('const allowed'));
console.log('\ncauda a partir de "const allowed":\n' + cauda.replace(/\s+/g, ' ').slice(0, 1500));
const { writeFileSync } = await import('node:fs');
writeFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/s21-setrole.json', JSON.stringify({ linha: linhas, chars: corpo.length, ramos, cauda }, null, 2) + '\n');
