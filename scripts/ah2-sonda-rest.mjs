// A varredura viu 404 em duas relações; o dicionário diz que há uma terceira (`bfr_school_calendar_month_targets`)
// que o mesmo bloco de código consulta e que não apareceu no registo do browser. Para não escrever no relatório
// «falta a terceira» por inferência, pede-se às três o mesmo GET e grava-se o código que o PostgREST devolve.
// Leituras só: `select=1` com `Prefer: count=exact`, sem escrita nem DDL. Chave anónima lida dos bytes servidos.
// Uso: node scripts/ah2-sonda-rest.mjs
import { writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const HOST = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ROTULO = process.argv[2] || '17-11';
const OUT = `${DIR}/evidence/ah2-sonda-rest-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');

const shell = await (await fetch(URL_APP, { headers: { 'cache-control': 'no-store' } })).text();
const ANON = shell.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];

const NOMES = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
// Uma conhecida presente serve de controlo: se ela também der 404, é a minha chamada que está errada e não
// as relações em falta.
const CONTROLO = ['gate_checkins', 'students'];

const pede = async (tabela) => {
  const u = `${HOST}/rest/v1/${tabela}?select=*&limit=1`;
  const r = await fetch(u, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: 'count=exact', Range: '0-0' }, signal: AbortSignal.timeout(20000) });
  const txt = await r.text();
  let corpo = null; try { corpo = JSON.parse(txt); } catch {}
  return { tabela, http: r.status, code: corpo && corpo.code, message: corpo && corpo.message, detalhe: corpo && corpo.details, count: r.headers.get('content-range'), corpo_nao_json: corpo ? null : txt.slice(0, 80) };
};

const resultados = [];
for (const t of NOMES.concat(CONTROLO)) {
  try { resultados.push(await pede(t)); } catch (e) { resultados.push({ tabela: t, erro: String(e.message).slice(0, 160) }); }
  await new Promise((r) => setTimeout(r, 400));
}
const out = { ciclo: 'AH-2-REST', em: new Date().toISOString(), origem_chave: 'bytes servidos', anon_md5_8: createHash8(ANON), resultados };
function createHash8(s) {
  // Só para provar que a chave veio do ar sem a reproduzir no registo.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
writeFileSync(OUT, JSON.stringify(out, null, 2));
for (const r of resultados) console.log(`${r.tabela.padEnd(38)} http=${r.http || 'ERRO'} ${r.code || ''} ${String(r.message || r.erro || '').slice(0, 70)}`);
console.log('OUT ' + OUT);
