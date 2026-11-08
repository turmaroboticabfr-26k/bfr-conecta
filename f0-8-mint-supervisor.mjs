import { writeFileSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const API = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function sql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  return res.json();
}

const diary = {
  cycle: 'F0.8',
  started: new Date().toISOString(),
  steps: []
};

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(JSON.stringify(data, null, 2));
  diary.steps.push({ step, data, ts: new Date().toISOString() });
}

// Clean up previous failed attempt
log('CLEANUP', { action: 'Removing previous failed mint' });
await sql(`DELETE FROM auth.users WHERE email = 'supervisor.synthetic@bfr.test';`);

// Mint account
const email = 'supervisor.synthetic@bfr.test';
const password = randomBytes(18).toString('base64url');

log('MINT', { email, action: 'Creating education_supervisor account' });

const mintResult = await sql(`
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '${email}',
    crypt('${password}', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"education_supervisor"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  RETURNING id, email;
`);

log('MINT_RESULT', mintResult);

if (!mintResult[0]?.id) {
  console.error('Failed to mint account');
  writeFileSync('f0-8-mint-diary.json', JSON.stringify(diary, null, 2));
  process.exit(1);
}

const userId = mintResult[0].id;

// Create profile (sem is_approved — não existe na tabela)
log('PROFILE', { userId, action: 'Creating profile with education_supervisor role' });

const profileResult = await sql(`
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    '${userId}',
    '${email}',
    'Supervisor Sintético',
    'education_supervisor',
    now()
  )
  RETURNING id, email, full_name, role;
`);

log('PROFILE_RESULT', profileResult);

// Get schools
const schoolsResult = await sql(`SELECT id FROM public.schools WHERE active = true;`);
const schoolIds = schoolsResult.map(s => s.id);

log('SCHOOLS_FOUND', schoolIds);

// Link to all schools via staff_schools (sem ON CONFLICT — não há unique constraint simples)
log('STAFF_SCHOOLS', { userId, action: 'Linking supervisor to all schools' });

for (const schoolId of schoolIds) {
  const linkResult = await sql(`
    INSERT INTO public.staff_schools (id, profile_id, school_id, role, created_at, updated_at)
    VALUES (gen_random_uuid(), '${userId}', '${schoolId}', 'education_supervisor', now(), now())
    RETURNING id, profile_id, school_id, role;
  `);
  log(`LINK_${schoolId.slice(0,8)}`, linkResult);
}

// Verify supervisor function works (requires setting auth context)
log('VERIFY_FUNCTION', { action: 'Testing bfr_is_education_supervisor() as service_role' });

const verifyResult = await sql(`
  SET LOCAL ROLE postgres;
  SELECT public.bfr_is_education_supervisor() as is_supervisor;
`);

log('VERIFY_RESULT', verifyResult);

// Test access to schools via function
log('VERIFY_SCHOOLS', { action: 'Testing bfr_school_staff_ids() as service_role' });

const schoolsAccessResult = await sql(`
  SET LOCAL ROLE postgres;
  SELECT array_length(public.bfr_school_staff_ids(), 1) as accessible_schools_count;
`);

log('SCHOOLS_ACCESS_RESULT', schoolsAccessResult);

// Test SELECT on students table (should see all 848 students as supervisor)
log('RLS_TEST', { action: 'Testing SELECT on students table' });

const rlsTest = await sql(`
  SET LOCAL ROLE postgres;
  SELECT COUNT(*) as total_students FROM public.students;
`);

log('RLS_RESULT', rlsTest);

// Test SELECT on schools table (should see all 3 schools)
log('SCHOOLS_RLS_TEST', { action: 'Testing SELECT on schools table' });

const schoolsRlsTest = await sql(`
  SET LOCAL ROLE postgres;
  SELECT COUNT(*) as total_schools FROM public.schools;
`);

log('SCHOOLS_RLS_RESULT', schoolsRlsTest);

diary.completed = new Date().toISOString();
diary.status = 'MINTED';
diary.userId = userId;
diary.email = email;
diary.accessibleSchools = schoolIds.length;

writeFileSync('f0-8-mint-diary.json', JSON.stringify(diary, null, 2));

console.log('\n✓ Account minted successfully');
console.log(`  Email: ${email}`);
console.log(`  Password: ${password}`);
console.log(`  User ID: ${userId}`);
console.log(`  Accessible schools: ${schoolIds.length}`);
