begin;

delete from public.bfr_grade_audit
where grade_id in (
  select id from public.grades
  where student_id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1')
);

delete from public.grades
where student_id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1');

delete from public.bfr_teacher_content where class_id='dfee8520-a361-45e9-b5dc-25c5684df41b';
delete from public.bfr_teacher_diary where class_id='dfee8520-a361-45e9-b5dc-25c5684df41b';
delete from public.bfr_teacher_plans where class_id='dfee8520-a361-45e9-b5dc-25c5684df41b';

delete from public.student_reading_levels
where student_id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1');

delete from public.student_messages
where student_id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1');

delete from public.bfr_teacher_class_subjects where profile_id='3204787f-3736-43e7-b940-c1facf6da17c';

delete from public.students
where id in ('a05e54a9-724d-449d-8894-cc904ed421e0','e8faf66b-920a-4acb-88ec-241dba7291e1');

delete from public.classes where id='dfee8520-a361-45e9-b5dc-25c5684df41b';

delete from public.profiles where id='3204787f-3736-43e7-b940-c1facf6da17c';

delete from auth.users where id='3204787f-3736-43e7-b940-c1facf6da17c';

commit;
