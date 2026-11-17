// O painel «Contas e cargos» renderizou 10 linhas (evidence/ah2-cliques-17-11-17-11.json) mas o banco tem
// 24 perfis (evidence/ah2-sonda-perfis-17-11.json) e a query do bundle não tem `.range()` nem `.limit()`
// (app/index.html:9081). Uma lista de cargos que corta em 10 é um defeito de serviço: a 11.ª conta fica
// sem dono. Este censo separa as três hipóteses: teto do PostgREST no projeto, teto só para o papel
// `authenticated` (RLS a filtrar), ou nada de teto — e então foram as minhas contas que não apareceram.
// Chave de serviço lida de ficheiro próprio; só GET, nenhuma escrita.
// Uso: node scripts/ah2-sonda-limite.mjs [rótulo]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const ROTULO = process.argv[2] || '17-11';
const OUT = `${DIR}/evidence/ah2-sonda-limite-${ROTULO}.json`;
if (existsSync(OUT) && !process.argv.includes('--force')) throw new Error('ABORTA: ' + OUT + ' existe — use --force');
const SERVICE = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const shell = await (await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'cache-control': 'no-store' } })).text();
const ANON = shell.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
// Uma sessão real do ciclo, para pedir /profiles com o papel `authenticated` (é assim que o developer do
// browser vê a lista). Token lido do registo, nunca escrito no artefacto.
const S = JSON.parse(readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/ah2-sessions.json', 'utf8'));
const devToken = S.developer && S.developer.access_token;

const pede = async (tabela, key, extra = {}) => {
  const r = await fetch(`${HOST}/rest/v1/${tabela}?select=full_name&order=full_name.asc.nullslast`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', ...extra },
    signal: AbortSignal.timeout(25000),
  });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  return { http: r.status, linhas: Array.isArray(j) ? j.length : null, total_declarado: r.headers.get('content-range'), erro: j && j.message ? j.message : null };
};

const peds = {
  service_role: await pede('profiles', SERVICE),
  anon: await pede('profiles', ANON),
};
if (devToken) {
  const r = await fetch(`${HOST}/rest/v1/profiles?select=full_name&order=full_name.asc.nullslast`, {
    headers: { apikey: ANON, Authorization: `Bearer ${devToken}`, Prefer: 'count=exact' }, signal: AbortSignal.timeout(25000),
  });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  peds.authenticated_developer = { http: r.status, linhas: Array.isArray(j) ? j.length : null, total_declarado: r.headers.get('content-range'), erro: j && j.message ? j.message : null };
  // Não gravo nomes nem e-mails de contas reais: só o censo de quais das linhas visíveis são do meu ciclo.
  const nomes = Array.isArray(j) ? j.map((x) => String(x.full_name || '')) : [];
  peds.authenticated_developer.sao_do_ciclo = nomes.filter((n) => /AH2|Sintética/i.test(n)).length;
  peds.authenticated_developer.visiveis_sem_marca_de_ciclo = nomes.length - peds.authenticated_developer.sao_do_ciclo;
}
// O teto configurado do projeto, se a API de gestão o expõe.
let settings = null;
try {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}`, { headers: { Authorization: `Bearer ${PAT}` }, signal: AbortSignal.timeout(25000) });
  const j = await r.json();
  settings = { http: r.status, relevantes: (() => { const o = {}; for (const k of Object.keys(j || {})) if (/row|limit|max|db_/i.test(k) && typeof j[k] !== 'object') o[k] = j[k]; return o; })() };
} catch (e) { settings = { erro: String(e.message).slice(0, 120) }; }

// O `content-range: 0-9/10` diz que não é teto de linhas: são mesmo 10 linhas visíveis para esta sessão.
// Se é a RLS a filtrar, a política diz porquê — e é ela que responde se «o developer não vê a conta do
// pai» é defeito ou desenho.
const sqlPolicies = "select p.polname, p.polcmd, p.polpermissive, pg_get_expr(p.polqual, p.polrelid) as using_, pg_get_expr(p.polwithcheck, p.polrelid) as check_ from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where c.relname = 'profiles' and n.nspname = 'public' order by p.polname";
let policies = null;
try {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlPolicies }), signal: AbortSignal.timeout(40000),
  });
  const t = await r.text();
  try { policies = JSON.parse(t); } catch { policies = { erro: 'HTTP ' + r.status + ' ' + t.slice(0, 160) }; }
} catch (e) { policies = { erro: String(e.message).slice(0, 160) }; }

const out = { ciclo: 'AH-2-LIMITE', em: new Date().toISOString(), notas: 'GET only; 0 escrita', pedidos: peds, project: settings, politicas_rls_profiles: policies };
writeFileSync(OUT, JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(peds)) console.log(`${k.padEnd(24)} http=${v.http} linhas=${v.linhas} range=${v.total_declarado} ${v.erro || ''}`);
for (const p of (Array.isArray(policies) ? policies : [])) console.log(`POL ${p.polname} [${p.polcmd}] ${p.polpermissive ? 'PERMISSIVA' : 'RESTRITIVA'} using=${String(p.using_).slice(0, 200)}`);
if (!Array.isArray(policies)) console.log('POLITICAS ilegíveis: ' + JSON.stringify(policies).slice(0, 200));
console.log('project: ' + JSON.stringify(settings).slice(0, 300));
console.log('OUT ' + OUT);
