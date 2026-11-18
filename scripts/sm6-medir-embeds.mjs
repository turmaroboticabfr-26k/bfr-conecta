// SM6-MEDIR-EMBEDS — régua empírica do embed, só-leitura: reproduz contra o REST cada
// `from('A').select('…')` que o payload do MÓDULO 2 emite, com a conta test do supervisor, e grava o
// HTTP e a mensagem do backend por select. Serve de catálogo ao portão 2 do aplicador
// (scripts/sm6-candidata-municipal.mjs), que assim deixa de adivinhar o que o PostgREST considera
// ambíguo. 0 escrita no banco: só GETs com `limit=1`.
//
// Por que é que uma regra estática de FKs não chega: medido a 17/11, `students→classes` tem uma FK
// directa e NOVE caminhos via tabelas-junção e o backend aceita-o; `announcements→profiles` tem uma FK
// directa e DUAS junções e o backend recusa-o com HTTP 300 «more than one relationship was found».
// Qualquer predicado meu sobre o catálogo acusaria o primeiro e deixaria passar o segundo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PAYLOAD = process.env.SM6_PAYLOAD || `${DIR}/scripts/sm6-modulo-municipal.txt`;
// O nome do catálogo é a pegada do texto medido, para que o construtor o encontre sem que ninguém
// tenha de lembrar qual ficheiro está certo.
const PEGADA = createHash('md5').update(readFileSync(PAYLOAD, 'utf8')).digest('hex');
const OUT = process.env.SM6_E_OUT || `${DIR}/evidence/sm6-selects-medidos-${PEGADA.slice(0, 8)}.json`;
const PAPEL = process.env.SM6_E_PAPEL || 'education_supervisor';
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT + ' — correr com SM6_E_OUT noutro nome'); process.exit(1); }

const html = readFileSync(`${DIR}/bfr-candidata-v127-secretaria-municipal/index.html`, 'utf8');
const ANON = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
const REF = (html.match(/https:\/\/([a-z0-9]{12,24})\.supabase\.co/) || [])[1];
if (!ANON || !REF) throw new Error('ABORTA: sem anon key/URL no bundle — nada é sondado às cegas');
const HOST = `https://${REF}.supabase.co`;
const REGISTO = `${DIR}/../ah2-sessions.json`;
const S = JSON.parse(readFileSync(REGISTO, 'utf8'));
if (!S[PAPEL] || !S[PAPEL].refresh_token) throw new Error('ABORTA: sem sessão de teste para ' + PAPEL);
const tok = await (await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
  body: JSON.stringify({ refresh_token: S[PAPEL].refresh_token }), signal: AbortSignal.timeout(45000),
})).json();
if (!tok.access_token) throw new Error('ABORTA: renovação falhou — ' + JSON.stringify(tok).slice(0, 160));
// O registo é escrito por um único autor: só se devolve ao ficheiro o token freso do papel sondado.
S[PAPEL] = { ...S[PAPEL], access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at, user: tok.user };
writeFileSync(REGISTO, JSON.stringify(S, null, 2) + '\n');
const H = { apikey: ANON, Authorization: 'Bearer ' + tok.access_token, Prefer: 'count=exact' };

const separar = (s) => { const o = []; let prof = 0, atual = ''; for (const ch of s) { if (ch === '(') prof++; if (ch === ')') prof--; if (ch === ',' && prof === 0) { o.push(atual); atual = ''; } else atual += ch; } if (atual.trim()) o.push(atual); return o.map((x) => x.trim()).filter(Boolean); };
const embutidos = (cols) => separar(cols).flatMap((t) => { const m = /^([a-z_][a-z0-9_]*)(?:![a-z_0-9]+)?\((.*)\)$/.exec(t); return m ? [m[1]] : []; });

const codigo = readFileSync(PAYLOAD, 'utf8');
const vistos = new Map();
for (const m of codigo.matchAll(/from\('([a-z_][a-z0-9_]*)'\)\s*\.select\('([^']+)'\)/g)) {
  const chave = m[1] + ' :: ' + m[2];
  if (!vistos.has(chave)) vistos.set(chave, { tabela: m[1], cols: m[2], embeds: embutidos(m[2]) });
}
console.log(`selects do payload: ${vistos.size}`);
const linhas = [];
for (const [chave, v] of vistos) {
  const r = await fetch(`${HOST}/rest/v1/${v.tabela}?select=${encodeURIComponent(v.cols)}&limit=1`, { headers: H, signal: AbortSignal.timeout(30000) });
  const corpo = await r.text();
  let n = null, mensagem = null;
  try { const j = JSON.parse(corpo); if (Array.isArray(j)) n = j.length; else mensagem = String(j.message || j.code || corpo).slice(0, 220); } catch { mensagem = corpo.slice(0, 160); }
  const range = (r.headers.get('content-range') || '').split('/')[1] || null;
  linhas.push({ chave, md5: createHash('md5').update(chave).digest('hex').slice(0, 8), tabela: v.tabela, embeds: v.embeds, http: r.status, n, total: range ? Number(range) : null, mensagem });
  console.log(`http=${r.status} n=${n ?? '-'} total=${range ?? '-'} ${v.tabela} embeds=[${v.embeds.join(',')}]${mensagem ? ' :: ' + mensagem.slice(0, 130) : ''}`);
}
const recusados = linhas.filter((l) => l.http >= 300);
console.log(`recusados=${recusados.length} de ${linhas.length}`);
writeFileSync(OUT, JSON.stringify({
  programa: 'scripts/sm6-medir-embeds.mjs', em: new Date().toISOString(), papel: PAPEL, payload: PAYLOAD.replace(`${DIR}/`, ''),
  // A pegada do texto medido é o que liga este catálogo à candidata: sem ela, um select alterado no
  // produtor passaria por medido porque a tabela e as colunas antigas continuam cá dentro.
  payload_md5: createHash('md5').update(codigo).digest('hex'),
  escrita_no_banco: false, metodo: 'GET rest/v1/<tabela>?select=<cols>&limit=1 com o access token da conta test',
  o_que_prova: 'que cada select emitido pelo payload foi pedido ao backend com uma sessão autenticada e com que resposta HTTP ele voltou; é a única régua que sabe o que o PostgREST considera ambíguo.',
  o_que_NAO_prova: 'que as colunas existem fora dos pares medidos, nem que os valores são correctos; limit=1 não percorre a tabela.',
  selects: linhas, recusados: recusados.map((l) => l.chave),
}, null, 2) + '\n');
console.log('artefacto ' + OUT);
