// Durante a grelha mobile cada papel renova o seu próprio token em `ah2-sessao-<papel>.json`, porque três
// condutores em paralelo a escrever no mesmo registo queimariam as cadeias uns dos outros (o GoTrue roda o
// refresh token a cada uso). Este programa é a única voz que escreve no registo mestre: percorre os
// ficheiros por papel, e para cada papel escolhe o par MAIS FRESCO comparando `expires_at` — não por data
// de ficheiro nem por suposição. Depois de fundir, prova que a cadeia serve: renova cada papel uma vez e
// grava o par rotado. 0 DDL, 0 escrita de dados de negócio.
// Uso: node scripts/ah2-funde-sessoes.mjs [--provar]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const MESTRE = `${DIR}/ah2-sessions.json`;
const PROVAR = process.argv.includes('--provar');
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const REF = 'yyzqoxlkcvqpessypfjo';
const mestre = JSON.parse(readFileSync(MESTRE, 'utf8'));
const papeis = Object.keys(mestre);
const escolhidos = {};
for (const f of readdirSync(DIR).filter((x) => /^ah2-sessao-.*\.json$/.test(x))) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch { console.log('ignorado (ilegível): ' + f); continue; }
  for (const [papel, v] of Object.entries(j)) {
    if (!papeis.includes(papel) || !v?.refresh_token) continue;
    const atual = escolhidos[papel];
    if (!atual || Number(v.expires_at || 0) > Number(atual.v.expires_at || 0)) escolhidos[papel] = { v, f };
  }
}
const linhas = [];
for (const papel of papeis) {
  const e = escolhidos[papel];
  if (!e) { linhas.push(`  ${papel.padEnd(20)} só no mestre (${String(mestre[papel].refresh_token).slice(0, 10)}…)`); continue; }
  const mudou = e.v.refresh_token !== mestre[papel].refresh_token;
  if (mudou) mestre[papel] = e.v;
  linhas.push(`  ${papel.padEnd(20)} ${mudou ? 'FUNDIDO de ' + e.f.replace('ah2-sessao-', '').replace('.json', '') : 'igual ao mestre'} (${String(e.v.refresh_token).slice(0, 10)}… exp ${e.v.expires_at})`);
}
console.log('PARES POR PAPEL:');
console.log(linhas.join('\n'));
writeFileSync(MESTRE, JSON.stringify(mestre, null, 2) + '\n');
console.log('ESCRITO: ah2-sessions.json com ' + papeis.length + ' papéis');
if (!PROVAR) { console.log('sem prova de cadeia — correr com --provar'); process.exit(0); }
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"`]+)["'`]/)[1];
let boas = 0; const queimadas = [];
for (const papel of papeis) {
  try {
    const r = await fetch(`https://${REF}.supabase.co/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: mestre[papel].refresh_token }) });
    const js = await r.json().catch(() => null);
    if (!r.ok || !js?.access_token) throw new Error(`HTTP ${r.status} ${JSON.stringify(js).slice(0, 90)}`);
    mestre[papel] = { ...mestre[papel], access_token: js.access_token, refresh_token: js.refresh_token, expires_at: js.expires_at, user: js.user };
    boas++; console.log(`  CADEIA VIVA  ${papel}`);
  } catch (e) { queimadas.push(papel); console.log(`  CADEIA RUIM  ${papel}: ${String(e.message).slice(0, 120)}`); }
  await new Promise((z) => setTimeout(z, 350));
}
writeFileSync(MESTRE, JSON.stringify(mestre, null, 2) + '\n');
console.log(`PROVA: ${boas}/${papeis.length} cadeias renovam · ruins: ${queimadas.join(' ') || 'nenhuma'}`);
console.log(queimadas.length ? 'FUNDE_SESSOES_COM_CADEIAS_RUINS' : 'FUNDE_SESSOES_TODAS_VIVAS');
