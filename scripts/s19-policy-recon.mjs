import { readFileSync } from 'fs';
import { homedir } from 'os';

const pat = readFileSync(homedir() + '/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function sql(q) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: q })
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`SQL failed: ${r.status} ${text}`);
  }
  return r.json();
}

console.log('=== POLICIES DE supervision_requests ===');
const reqs = await sql(`
  SELECT policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = 'supervision_requests'
  ORDER BY policyname
`);
reqs.forEach(p => {
  console.log(`\n${p.policyname} (${p.cmd}, ${p.permissive})`);
  console.log(`  roles: ${p.roles}`);
  console.log(`  qual: ${p.qual}`);
  if (p.with_check) console.log(`  with_check: ${p.with_check}`);
});

console.log('\n\n=== POLICIES DE supervision_responses ===');
const resps = await sql(`
  SELECT policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = 'supervision_responses'
  ORDER BY policyname
`);
resps.forEach(p => {
  console.log(`\n${p.policyname} (${p.cmd}, ${p.permissive})`);
  console.log(`  roles: ${p.roles}`);
  console.log(`  qual: ${p.qual}`);
  if (p.with_check) console.log(`  with_check: ${p.with_check}`);
});

console.log('\n\n=== STORAGE POLICIES (secretary-attachments) ===');
const storage = await sql(`
  SELECT name, policy_type, roles, cmd, qual, with_check
  FROM storage.policies
  WHERE bucket_id = 'secretary-attachments'
  ORDER BY name
`);
storage.forEach(p => {
  console.log(`\n${p.name} (${p.cmd}, ${p.policy_type})`);
  console.log(`  roles: ${p.roles}`);
  console.log(`  qual: ${p.qual}`);
  if (p.with_check) console.log(`  with_check: ${p.with_check}`);
});
