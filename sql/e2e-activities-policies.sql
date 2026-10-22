select json_agg(json_build_object(
  'policy', p.policyname,
  'cmd', p.cmd,
  'roles', p.roles,
  'qual', p.qual,
  'with_check', p.with_check
) order by p.cmd, p.policyname) as policies
from pg_policies p
where p.schemaname='public' and p.tablename='school_activities';
