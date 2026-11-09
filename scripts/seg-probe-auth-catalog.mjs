// SEG: censo do catalogo auth.* (so nomes de coluna, nunca valores).
import fs from 'node:fs';
import fetch from 'node-fetch';

const PAT = fs.readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const URL_Q = 'https://api.supabase.com/v1/projects/yyzqoxlkcvqpessypfjo/database/query';

async function q(sql) {
  const res = await fetch(URL_Q, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json() };
}

const r = await q(`select table_name, column_name from information_schema.columns
 where table_schema = 'auth' and table_name in ('users','sessions','refresh_tokens','mfa_factors')
 order by table_name, ordinal_position`);
console.log('status', r.status);
const rows = Array.isArray(r.data) ? r.data : [r.data];
const byTable = {};
for (const x of rows) (byTable[x.table_name] ||= []).push(x.column_name);
for (const [t, cols] of Object.entries(byTable)) console.log(t + ':', cols.join(', '));
