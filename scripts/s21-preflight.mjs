// S21-PREFLIGHT — PEN-31 na v119. SOMENTE LEITURA: 0 DDL, 0 escrita, 0 deploy.
// Perguntas: (1) o ar é mesmo a v119; (2) quantas supervision_requests já existem;
// (3) a policy de leitura de sports_schools inclui education_supervisor; (4) o que o módulo da aba consulta.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const OUT = `${DIR}/s21-preflight.json`;

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const out = { ciclo: 'S21-PREFLIGHT', em: new Date().toISOString(), escrita: 0, ddl: 0 };

// 1. ar atual
const shell = await fetch('https://bfr-conecta.turmaroboticabfr.workers.dev/', { headers: { 'Cache-Control': 'no-cache' } });
const body = await shell.text();
out.ar = {
  http: shell.status,
  bytes: Buffer.byteLength(body),
  md5: createHash('md5').update(body).digest('hex'),
  esperado_md5: 'a1969cdf023042e7d2a91e7ed9333a05',
  esperado_bytes: 3489474,
};
out.ar.ok = out.ar.http === 200 && out.ar.md5 === out.ar.esperado_md5 && out.ar.bytes === out.ar.esperado_bytes;

// literais do embed dentro dos bytes que o browser recebe — derivados, não dactilografados
const literal_bom = 'sports_schools(name)';
const literal_mau = /[^_.a-z]schools\(name\)/g;
out.embed = {
  no_ar: body.split(literal_bom).length - 1,
  partida_no_ar: (body.match(literal_mau) || []).length,
  cache_v119: body.includes('bfr-conecta-v119'),
  cache_v118: body.includes('bfr-conecta-v118'),
};

// 2. contagens vivas das tabelas do ciclo
for (const t of ['auth.users', 'public.profiles', 'public.sports_schools', 'public.staff_schools', 'public.supervision_requests', 'public.supervision_audit']) {
  const key = t.split('.').join('_');
  const n = await sql(`select count(*)::int as n from ${t};`);
  const h = await sql(`select md5(string_agg(x::text, ',' order by x::text)) as h from (select * from ${t}) x;`);
  out[key] = { n: n[0].n, md5: h[0].h || 'empty' };
}

// 3. o que existe em supervision_requests: escolas vinculadas + estado
out.solicitações_existentes = await sql(
  `select sr.id, sr.status, sr.indicator, sr.school_id, ss.name as escola, ss.id is not null as escola_existe
     from public.supervision_requests sr
     left join public.sports_schools ss on ss.id = sr.school_id
     order by sr.created_at desc limit 10;`);

// 4. RLS: policies de SELECT sobre sports_schools — education_supervisor está em alguma?
out.policies_sports_schools = await sql(
  `select p.polname, p.polcmd::text, pg_get_expr(p.polqual, p.polrelid) as qual,
          pg_get_expr(p.polwithcheck, p.polrelid) as veri
     from pg_policy p join pg_class c on c.oid = p.polrelid
     where c.relname = 'sports_schools' and p.polcmd in ('r','=','*') order by p.polname;`);
out.policies_sports_schools_texto = out.policies_sports_schools.filter(r => /education_supervisor/.test(r.qual || ''));
out.policies_sports_schools_sem_supervisor = out.policies_sports_schools.filter(r => !/education_supervisor/.test(r.qual || ''));

// 5. RLS da própria supervision_requests
out.policies_supervision_requests = await sql(
  `select p.polname, p.polcmd::text, pg_get_expr(p.polqual, p.polrelid) as qual
     from pg_policy p join pg_class c on c.oid = p.polrelid
     where c.relname = 'supervision_requests' order by p.polname;`);

// 6. o módulo da aba no ar: pares origem→select derivados do bundle
const pairs = [];
const reQ = /(from|table)\(\s*['"]([a-z_]+)['"]\s*\)[^;]{0,400}?\.select\(\s*(['"`][^'"`]{0,400})/g;
let m;
while ((m = reQ.exec(body))) pairs.push({ origem: m[1], tabela: m[2], select: m[3].slice(0, 220) });
out.consultas_supervisao = pairs.filter(p => /supervision/.test(p.tabela));

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  ar_ok: out.ar.ok, ar: out.ar, embed: out.embed,
  supervisao_requests: out.public_supervision_requests_n ?? out['public_supervision_requests'].n,
  schools: out['public_sports_schools'].n,
  policies_sports_schools: out.policies_sports_schools.map(r => `${r.polname}/${r.polcmd}`),
  com_supervisor: out.policies_sports_schools_texto.map(r => r.polname),
  consultas: out.consultas_supervisao.length,
}, null, 2));
