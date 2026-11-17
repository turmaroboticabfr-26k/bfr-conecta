// Sonda (só leitura): como a chave anónima aparece nos bytes servidos, sem a escrever na conversa.
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const t = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
console.log('bytes', Buffer.byteLength(t));
const oculos = [...t.matchAll(/eyJ[A-Za-z0-9_-]{5,}/g)];
console.log('ocorrências de eyJ…:', oculos.length, oculos.slice(0, 3).map((m) => `len=${m[0].length} pref=${m[0].slice(0, 8)}…`));
for (const chave of ['SUPABASE_ANON', 'anon', 'apikey', 'ANON_KEY', 'supabaseUrl', 'VITE_SUPABASE']) {
  const i = t.indexOf(chave);
  console.log(`"${chave}" → ${i < 0 ? 'AUSENTE' : 'pos ' + i + ' · ' + t.slice(Math.max(0, i - 40), i + 90).replace(/\s+/g, ' ')}`);
}
const jwt = t.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
console.log('JWT de 3 partes?', jwt ? `sim len=${jwt[0].length} header=${Buffer.from(jwt[0].split('.')[0], 'base64url').toString().slice(0, 60)}` : 'não');
const sb = t.match(/sb-[a-z]{20}-[a-z-]*/g);
console.log('chaves sb-*:', sb ? [...new Set(sb)].slice(0, 6) : 'nenhuma');
