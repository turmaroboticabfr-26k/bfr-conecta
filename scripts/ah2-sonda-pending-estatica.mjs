// AH-2-SONDA estática (só leitura do ar): a janela completa do ramo `pending` — o que o app escreve,
// em que elemento, e se o `return` deixa ou não a mensagem visível no ecrã de login.
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const i = t.indexOf('ainda está sendo preparado');
console.log('pos ' + i + '\n');
console.log('=== 1400 caracteres antes / 300 depois do ramo pending ===');
console.log(t.slice(i - 1400, i + 300).replace(/\s+/g, ' '));
console.log('\n=== função que escreve em authStatus ===');
const j = t.indexOf('function setAuthStatus');
console.log(j < 0 ? 'setAuthStatus não encontrada por nome — procurar padrão:' : t.slice(j, j + 500).replace(/\s+/g, ' '));
const k = t.indexOf('authStatus.textContent = message');
console.log('\ntrecho do escritor:', k < 0 ? 'AUSENTE' : t.slice(k - 320, k + 120).replace(/\s+/g, ' '));
console.log('\n=== quantas vezes o texto de pendência aparece no bundle ===', (t.match(/sendo preparado/g) || []).length);
