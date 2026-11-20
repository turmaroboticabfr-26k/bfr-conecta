// P73-R — recuperação de cadeias de refresh para a grelha m5. As dez células de B e C abortaram com
// «cadeia queimada»: `refresh_token_already_used` (HTTP 400), porque três condutores em paralelo e a passada
// P36-B2 (que renova sem gravar) rodaram a mesma cadeia. Um refresh bem-sucedido ROTACIONA o token, por isso
// «sondar» e «gastar» são o mesmo ato: este script renova UMA vez por papel, pela primeira cadeia que bater
// certo, e grava o par novo no ficheiro do papel — que é o ficheiro que o condutor lê. Nunca escreve no
// mestre (o mestre só se funde no fim, a uma voz, com ah2-funde-sessoes.mjs) e nunca imprime token algum:
// só papel, estado HTTP, código de erro e onde ficou gravado. 0 DDL, 0 escrita no banco.
// Uso: node scripts/p73-renova-cadeias.mjs [papel1,papel2|TODOS]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const MESTRE = `${DIR}/ah2-sessions.json`;
const OUT = `${REPO}/evidence/p73-renovacao-de-cadeias-19-11.json`;
const PEDIDO = (process.argv[2] || 'TODOS').trim();
const dsrc = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8');
const mT = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(dsrc);
if (!mT) throw new Error('ABORTA: enum de perfis nao lido de ah2-varredura.mjs');
const TODOS = [...mT[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (TODOS.length < 10) throw new Error('ABORTA: enum de perfis lido tem ' + TODOS.length);
const ALVOS = PEDIDO === 'TODOS' ? TODOS : PEDIDO.split(',').map((s) => s.trim()).filter(Boolean);
for (const p of ALVOS) if (!TODOS.includes(p)) throw new Error('ABORTA: papel fora do enum: ' + p);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

// A chave anónima (publishable) lê-se do ar servido, como no resto da casa: nunca dactilografada.
const diario = readFileSync(`${REPO}/audit-publicacao-v136.json`, 'utf8');
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(diario) || [])[0] + '/';
const shellTxt = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem SUPABASE_PUBLISHABLE_KEY nos bytes servidos');
const regua_md5 = createHash('md5').update(Buffer.from(shellTxt)).digest('hex');

const mestre = JSON.parse(readFileSync(MESTRE, 'utf8'));
const saida = { programa: 'scripts/p73-renova-cadeias.mjs', em: new Date().toISOString(), ar: { url: URL_APP, md5_shell: regua_md5 }, papel_nao_tocado_por_filho_em_fundo: 'nenhum: quem corre em paralelo deve passar so os seus papeis', papeis: {} };

for (const papel of ALVOS) {
  const fich = `${DIR}/ah2-sessao-${papel}.json`;
  const do_papel = existsSync(fich) ? JSON.parse(readFileSync(fich, 'utf8')) : null;
  const candidatos = [];
  if (do_papel?.[papel]?.refresh_token) candidatos.push({ de: 'ficheiro_do_papel', cadeia: do_papel[papel] });
  if (mestre[papel]?.refresh_token) candidatos.push({ de: 'mestre', cadeia: mestre[papel] });
  if (!candidatos.length) { saida.papeis[papel] = { ok: false, porque: 'sem cadeia em lado nenhum' }; continue; }
  let resultado = null;
  for (const c of candidatos) {
    const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ refresh_token: c.cadeia.refresh_token }) });
    const j = await r.json().catch(() => null);
    resultado = { tentativa: c.de, http: r.status, error_code: j && j.error_code ? j.error_code : (j && j.error ? String(j.error).slice(0, 60) : (r.ok ? 'ok' : 'sem-corpo')), renovou: !!(j && j.access_token) };
    if (r.ok && j.access_token) {
      const novo = { ...c.cadeia, ...j, expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
      const corpo = do_papel ? { ...do_papel } : { ...mestre };
      corpo[papel] = novo;
      writeFileSync(fich, JSON.stringify(corpo, null, 2) + '\n');
      // Prova de identidade do que ficou em disco: comprimento da cadeia e hash, nunca o token.
      const gravado = JSON.parse(readFileSync(fich, 'utf8'))[papel];
      resultado.gravado_em = fich.split('/').pop();
      resultado.gravado_hash = createHash('md5').update(Buffer.from(gravado.refresh_token)).digest('hex').slice(0, 12);
      resultado.gravado_e_o_mesmo = gravado.refresh_token === novo.refresh_token;
      break;
    }
  }
  saida.papeis[papel] = Object.assign({ ok: !!(resultado && resultado.renovou) }, resultado || {});
  console.log((resultado && resultado.renovou ? 'VERDE  ' : 'VERMELHO ') + papel.padEnd(21) + ' tentativas=' + JSON.stringify(saida.papeis[papel].tentativa) + ' http=' + saida.papeis[papel].http + ' code=' + saida.papeis[papel].error_code + ' gravado=' + (saida.papeis[papel].gravado_em || '-') + ' conferido=' + JSON.stringify(saida.papeis[papel].gravado_e_o_mesmo));
}
const renovados = Object.entries(saida.papeis).filter(([, v]) => v.ok).map(([k]) => k);
const queimados = Object.entries(saida.papeis).filter(([, v]) => !v.ok).map(([k]) => k);
saida.resumo = { pedidos: ALVOS.length, renovados: renovados.length, por_renovar: queimados.length, lista_por_renovar: queimados };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log('RENOVADOS: ' + renovados.length + '/' + ALVOS.length + (queimados.length ? ' · NAO RENOVADOS: ' + queimados.join(',') : ''));
console.log(queimados.length ? 'P73_CADEIAS_COM_FALHAS · registo ' + OUT : 'P73_CADEIAS_OK · registo ' + OUT);
process.exit(queimados.length ? 1 : 0);
