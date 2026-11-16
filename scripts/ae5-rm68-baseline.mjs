// AE-5 baseline — pré/pós por contagem E md5 das tabelas tocadas pelo ciclo behavioral
// do RM-6.8 (grades/attendance/access_requests/occurrences + vistas sports_public_*).
// Extende o rm68-ruler3-baseline.mjs (que cobre o lote S20) com: grades, attendance,
// access_requests, occurrences, students, classes, schools, guardian_students,
// bfr_teacher_class_subjects. Instrumento NOVO: o guard do outro não permite reuso.
// Uso:
//   node scripts/ae5-rm68-baseline.mjs capture <path.json>
//   node scripts/ae5-rm68-baseline.mjs compare <pre.json> <pos.json>
import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const TABELAS = {
  'auth.users': 'auth.users',
  'public.profiles': 'public.profiles',
  staff_schools: 'public.staff_schools',
  sports_schools: 'public.sports_schools',
  schools: 'public.schools',
  classes: 'public.classes',
  students: 'public.students',
  guardian_students: 'public.guardian_students',
  bfr_teacher_class_subjects: 'public.bfr_teacher_class_subjects',
  grades: 'public.grades',
  attendance: 'public.attendance',
  access_requests: 'public.access_requests',
  occurrences: 'public.occurrences',
  supervision_audit: 'public.supervision_audit',
};

const CHAVE = {
  'auth.users': 'id::text',
  'public.profiles': 'id::text',
  staff_schools: 'profile_id::text || $$:$$ || school_id::text',
  sports_schools: 'id::text || $$:$$ || name',
  schools: 'id::text || $$:$$ || name',
  classes: 'id::text || $$:$$ || class_code',
  students: 'id::text || $$:$$ || official_name',
  guardian_students: 'profile_id::text || $$:$$ || student_id::text',
  bfr_teacher_class_subjects: 'id::text || $$:$$ || class_id::text || $$:$$ || subject',
  grades: 'id::text',
  attendance: 'id::text',
  access_requests: 'id::text',
  occurrences: 'id::text',
  supervision_audit: 'id::text',
};

// Retry de leituras idempotentes contra o HTTP 500 intermitente da API de gestão
// (lição AB.9: "Failed to check user auth status" é transitório; erro do SQL lança).
const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!(r.status >= 500 || r.status === 401 || /Failed to/i.test(t))) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const capturar = async () => {
  const out = { em: new Date().toISOString(), tabelas: {} };
  for (const [nome, alvo] of Object.entries(TABELAS)) {
    const chave = CHAVE[nome];
    const q = `select count(*) as n, md5(coalesce(string_agg(t.k, ',' order by t.k), '')) as h from (select ${chave} as k from ${alvo}) t;`;
    const [r] = await sql(q);
    out.tabelas[nome] = { n: Number(r.n), h: r.h };
    console.log(`${String(r.n).padStart(6)}  ${r.h}  ${nome}`);
  }
  return out;
};

const [modo, a, b] = process.argv.slice(2);

if (modo === 'capture') {
  if (!a) { console.error('Uso: capture <path.json>'); process.exit(2); }
  const out = await capturar();
  writeFileSync(a, JSON.stringify(out, null, 2) + '\n');
  console.log(`Escrito ${a}`);
} else if (modo === 'compare') {
  if (!a || !b) { console.error('Uso: compare <pre.json> <pos.json>'); process.exit(2); }
  const pre = JSON.parse(readFileSync(a, 'utf8'));
  const pos = JSON.parse(readFileSync(b, 'utf8'));
  let falhas = 0;
  for (const nome of Object.keys(pre.tabelas)) {
    const p = pre.tabelas[nome];
    const q = pos.tabelas?.[nome];
    const igual = q && p.n === q.n && p.h === q.h;
    if (!igual) falhas++;
    console.log(`${igual ? 'VERDE' : 'VERMELHO'}  ${nome}  pré=${p.n}/${p.h}  pós=${q ? q.n + '/' + q.h : 'AUSENTE'}`);
  }
  console.log(falhas === 0 ? 'AE5_BASELINE_RESTAURADA' : `AE5_BASELINE_DIVERGENTE (${falhas})`);
  process.exit(falhas === 0 ? 0 : 1);
} else {
  console.error('Uso: capture <path.json> | compare <pre.json> <pos.json>');
  process.exit(2);
}
