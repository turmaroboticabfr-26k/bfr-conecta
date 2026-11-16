// Sonda SOMENTE LEITURA: constraints e triggers de grades/attendance
// para re-derivar a tabela-verdade dos gates G/A do instrumento AE5.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5i-rm68-constraints-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const pat = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

async function sql(query, tentativas = 10) {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!/Failed to check user auth status|Invalid access token/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 8000));
  }
  throw new Error(`esgotou tentativas — ${ultimo}`);
}

const cons = await sql(`select conrelid::regclass::text as tabela, conname, contype, pg_get_constraintdef(oid) as def
  from pg_constraint where conrelid in ('public.grades'::regclass,'public.attendance'::regclass)
  and contype in ('u','c','f','p') order by 1,2;`);
const trig = await sql(`select tgrelid::regclass::text as tabela, tgname, pg_get_triggerdef(oid) as def
  from pg_trigger where tgrelid in ('public.grades'::regclass,'public.attendance'::regclass)
  and not tgisinternal order by 1,2;`);
const out = { em: new Date().toISOString(), autorizacao: 'somente leitura', constraints: cons, triggers: trig };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5I_CONSTRAINTS_ESCRITO');
console.log(JSON.stringify(out, null, 1));
