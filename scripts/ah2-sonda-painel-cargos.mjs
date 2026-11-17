// AH-2-SONDA estática: markup das linhas de «Contas e cargos» e o caminho até ao painel — necessário
// para pousar um rato real no sítio certo (Input.dispatchMouseEvent quer coordenadas e o seletor da
// linha tem de identificar a conta-alvo sem adivinhar).
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const i = t.indexOf('data-role-management-list');
console.log('=== template das linhas (em torno de data-role-management-list) ===');
console.log(t.slice(i - 200, i + 1800).replace(/\s+/g, ' '));
console.log('\n=== como o painel é aberto / garantido ===');
let j = -1, n = 0;
while ((j = t.indexOf('ensureRoleManagementView', j + 1)) >= 0 && n < 5) { console.log(`[${n}] …${t.slice(Math.max(0, j - 220), j + 90).replace(/\s+/g, ' ')}`); n++; }
console.log('\n=== queueRoleSave / onchange do select ===');
const k = t.indexOf('queueRoleSave');
console.log(k < 0 ? 'AUSENTE' : t.slice(k - 400, k + 900).replace(/\s+/g, ' '));
