rollback;
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3abaa3a-ac38-40ea-82f5-94073ce0155a","role":"authenticated"}';
insert into public.school_activities (title, subject, class_id, description, published_by, published_at)
values ('sonda-d3-antes', 'História', '5e6d0744-f2b7-4201-8ad5-64c36a1bc3da', 'sonda rollback', 'c3abaa3a-ac38-40ea-82f5-94073ce0155a', now())
returning id;
rollback;
