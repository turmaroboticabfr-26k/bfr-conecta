select json_build_object(
  'profiles', (select count(*) from profiles),
  'bfr_grade_audit', (select count(*) from bfr_grade_audit),
  'auth_users', (select count(*) from auth.users),
  'sinteticos', (select count(*) from auth.users where email like '%@bfr-conecta.test'),
  'scratch_aluno_restos', (select count(*) from students where id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1')),
  'scratch_turma_restos', (select count(*) from classes where id='dfee8520-a361-45e9-b5dc-25c5684df41b'),
  'scratch_conta_restos', (select count(*) from profiles where id='3204787f-3736-43e7-b940-c1facf6da17c')
) as dados;
