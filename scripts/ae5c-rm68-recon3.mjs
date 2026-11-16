// AE-5c recon 3 — bfr_subject_matches e bfr_teacher_class_subjects. Somente leitura.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5c-rm68-recon3-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard de não-sobreposição.`);
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};
const out = { em: new Date().toISOString(), autorizacao: 'somente leitura' };
out.funcoes = await sql(`
  select p.proname as nome, pg_get_function_identity_arguments(p.oid) as args, pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('bfr_subject_matches','bfr_is_guardian')
   order by p.proname;`);
out.objetos = await sql(`
  select c.relname, c.relkind::text as kind,
         pg_get_userbyid(c.relowner) as dono,
         c.relrowsecurity as rls, c.relforcerowsecurity as forca_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('bfr_teacher_class_subjects','bfr_schedule_entries',
     'bfr_schedule_versions','bfr_teacher_directory')
   order by c.relname;`);
out.colunas = await sql(`
  select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bfr_teacher_class_subjects'
   order by ordinal_position;`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5C_RECON3_ESCRITO', OUT);
