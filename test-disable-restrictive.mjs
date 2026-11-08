import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PAT = readFileSync(join(homedir(), '.supabase-pat'), 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const BASE = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const headers = {
  'Authorization': `Bearer ${PAT}`,
  'Content-Type': 'application/json'
};

async function sql(query) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`SQL ${r.status}: ${t}`);
  }
  return r.json();
}

console.log('[1] Disable RESTRICTIVE policy temporarily:');
await sql(`ALTER TABLE profiles DISABLE ROW LEVEL SECURITY`);
console.log('  RLS disabled on profiles');

console.log('\n[2] Run behavioral test:');
const { execSync } = await import('child_process');
try {
  const output = execSync('node scripts/c7-gap-fix-prova.mjs', { 
    cwd: process.cwd(), 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n[3] Re-enable RLS:');
await sql(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`);
console.log('  RLS re-enabled on profiles');
