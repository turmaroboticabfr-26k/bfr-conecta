import { sql } from './c2-lib.mjs';
console.log(JSON.stringify(await sql(`select id, name from public.schools order by name;`), null, 1));
console.log(JSON.stringify(await sql(`select school_id, count(*)::int as n from public.students group by 1;`), null, 1));
console.log(JSON.stringify(await sql(`select school_id, count(*)::int as n from public.classes group by 1;`), null, 1));
