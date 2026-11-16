// Sonda SOMENTE LEITURA do estado atual: contas ae5 no auth.users, resíduo AE5 no public,
// e integridade da conta real gameral2027 (alvo acidental do repro anterior, barrado pela FK).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5h-rm68-state-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const pat = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();

async function sql(q) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (r.status !== 200 && r.status !== 201) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 800)}`);
  return JSON.parse(t);
}

async function admin(path) {
  const r = await fetch(`https://${REF}.supabase.co${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j, texto: t };
}

const out = { em: new Date().toISOString(), autorizacao: 'somente leitura' };

// 1) auth.users com email bfr.test
const authBfr = await sql(`select id, email from auth.users where email like '%@bfr.test' order by email`);
out.auth_bfr_test = authBfr;

// 2) lista completa do Admin API (per_page=100) — para ver se ae5 aparece e quantos no total
const all = await admin('/auth/v1/admin/users?per_page=100');
out.admin_total = { status: all.status, n: all.j?.users?.length ?? -1, emails: (all.j?.users ?? []).map((u) => u.email) };

// 3) conta real gameral2027: auth + profile
const realAuth = await sql(`select id, email from auth.users where email = 'gameral2027@gmail.com'`);
const realProfile = await sql(`select id, email, role from public.profiles where email = 'gameral2027@gmail.com'`);
const realSr = await sql(`select count(*)::int as n from public.support_requests`);
out.conta_real = { auth: realAuth, profile: realProfile, support_requests_n: realSr };

// 4) resíduo AE5 no public (uma query por tabela, counts)
const counts = {};
const q = {
  auth_ae5: `select count(*)::int as n from auth.users where email like 'ae5-%@bfr.test'`,
  profiles_ae5: `select count(*)::int as n from public.profiles where email like 'ae5-%@bfr.test'`,
  grades_ae5: `select count(*)::int as n from public.grades where entered_by in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  attendance_ae5: `select count(*)::int as n from public.attendance where entered_by in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  occurrences_ae5: `select count(*)::int as n from public.occurrences where created_by in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  access_requests_ae5: `select count(*)::int as n from public.access_requests where email like 'ae5-%@bfr.test' or reviewed_by in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  students_ae5: `select count(*)::int as n from public.students where official_name like 'AE5 %'`,
  classes_ae5: `select count(*)::int as n from public.classes where class_code like 'AE5 %'`,
  schools_ae5: `select count(*)::int as n from public.schools where name like 'AE5 %'`,
  sports_schools_ae5: `select count(*)::int as n from public.sports_schools where name like 'AE5 %'`,
  staff_schools_ae5: `select count(*)::int as n from public.staff_schools where profile_id in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  teacher_links_ae5: `select count(*)::int as n from public.bfr_teacher_class_subjects where profile_id in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  guardian_ae5: `select count(*)::int as n from public.guardian_students where profile_id in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  supervision_audit_ae5: `select count(*)::int as n from public.supervision_audit where profile_id in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
  push_ae5: `select count(*)::int as n from public.push_subscriptions where profile_id in (select id from public.profiles where email like 'ae5-%@bfr.test')`,
};
for (const [k, query] of Object.entries(q)) {
  counts[k] = await sql(query);
}
out.contagens = counts;
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5H_STATE_ESCRITO');
