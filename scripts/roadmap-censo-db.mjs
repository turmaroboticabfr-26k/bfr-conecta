// ROADMAP MASTER — censo read-only do catálogo (nada é escrito no banco).
import { readFileSync, writeFileSync } from 'node:fs';
import { sql } from './s19-lib.mjs';

const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/roadmap-censo-db.json';

const q = async (query) => {
  const r = await sql(query);
  return r;
};

const res = { em: new Date().toISOString(), mode: 'read-only' };

// 1. tabelas e RLS
res.tabelas = await q(`select count(*) as total, count(*) filter (where relrowsecurity) as com_rls,
  count(*) filter (where not relrowsecurity) as sem_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'`);

// 2. policies e as sem filtro
res.policies = await q(`select count(*) as total,
  count(*) filter (where qual is not null or with_check is not null) as com_filtro,
  count(*) filter (where qual is null and with_check is null) as sem_filtro
  from pg_policies where schemaname='public'`);

// 3. enum account_role
res.roles = await q(`select enum_range(null::public.account_role)::text[] as papeis`);

// 4. funções públicas (prosecdef, acl de anon)
res.funcoes = await q(`select count(*) as total,
  count(*) filter (where prosecdef) as definer
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prorettype::regtype::text='trigger' is false
  and p.proname not like '\\_%'`).catch(() => null);

// 5. triggers
res.triggers = await q(`select count(*) as total from pg_trigger where not tgisinternal and tgname not like 'RI_%' and tgrelid::regclass::text like 'public.%'`);

// 6. publication realtime
res.realtime = await q(`select count(*) as tabelas_publicadas from pg_publication_tables where pubname='supabase_realtime'`);

// 7. storage buckets
res.buckets = await q(`select name from storage.buckets order by name`);

// 8. tabelas do app (grandes famílias) — contagem por prefixo
res.contagens = await q(`select c.relname as tabela, s.n_live_tup::int as linhas
  from pg_class c join pg_stat_user_tables s on s.relid=c.oid
  join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  and c.relname in ('students','profiles','guardian_students','classes','school_activities','gate_checkins',
    'internal_chat_messages','announcements','occurrences','grades','attendance_records','attendance',
    'schools','staff_schools','supervision_requests','supervision_responses','learning_action_plans',
    'support_requests','route_incidents','student_messages','notifications','access_requests','gate_badges')
  order by s.n_live_tup desc`);

// 9. linhas de students / profiles (só contagem)
res.contas = await q(`select (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.students) as students`);

// 10. tabelas sem RLS nenhuma (deve ser 0) + policies por tabela com menos de 1
res.risco = await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
  order by c.relname`);

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
console.log(JSON.stringify(res, null, 2));
