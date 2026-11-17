// AH-2-SONDA estática 2: o select de papel dentro da linha, as opções que expõe e o handler do change
// — o mínimo para um rato pousar no sítio certo e para eu provar que foi o change que emitiu o rpc.
const t = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'Cache-Control': 'no-cache' } })).text();
const i = t.indexOf('role-management-row');
console.log('=== corpo da linha (após role-management-row) ===');
console.log(t.slice(i, i + 1200).replace(/\s+/g, ' '));
console.log('\n=== profileRoleOptions ===');
const j = t.indexOf('profileRoleOptions');
console.log(j < 0 ? 'AUSENTE' : t.slice(j - 40, j + 620).replace(/\s+/g, ' '));
console.log('\n=== handler do change no painel (data-profile-role) ===');
let k = -1, n = 0;
while ((k = t.indexOf('data-profile-role', k + 1)) >= 0 && n < 4) { console.log(`[${n}] @${k} …${t.slice(Math.max(0, k - 160), k + 420).replace(/\s+/g, ' ')}\n`); n++; }
console.log('=== set_profile_role no bundle ===');
const m = t.indexOf('set_profile_role');
console.log(m < 0 ? 'AUSENTE' : t.slice(m - 500, m + 300).replace(/\s+/g, ' '));
