// GAP-3 Deep Diagnostic: find the actual root cause
// Tests: (1) trivial policy, (2) function in policy, (3) role matching

import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, body: j };
};

const jwt = async (email, password) => {
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`jwt HTTP ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
};

const rest = async (token, method, path, body) => {
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, body: j };
};

let uid;
const cleanupPolicies = [];

async function safeSql(q) {
  try { return await sql(q); } catch (e) { console.log(`  SQL error: ${e.message}`); return null; }
}

try {
  const hash = Math.random().toString(36).slice(2, 10);
  const email = `gap3deep-${hash}@bfr-admin.test`;
  const password = 'Test1234!';
  const schoolId = '08ebef62-2193-4520-ab44-c044160d565f';

  // STEP 1: Mint
  console.log('=== STEP 1: Mint coordinator ===');
  const mint = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'coordinator' } }),
  });
  uid = mint.body.id;
  console.log(`  uid: ${uid}`);

  await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${email}', 'coordinator'::account_role) ON CONFLICT (id) DO NOTHING`);
  await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES ('${uid}'::uuid, '${schoolId}'::uuid, 'coordinator') ON CONFLICT DO NOTHING`);

  const token = await jwt(email, password);
  console.log(`  JWT obtained`);

  // STEP 2: Verify functions directly
  console.log('\n=== STEP 2: Verify functions ===');
  const fn1 = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as is_coord`);
  console.log(`  bfr_is_coordinator(uid): ${JSON.stringify(fn1)}`);

  // STEP 3: Test with trivial policy (WITH CHECK true)
  console.log('\n=== STEP 3: Test with trivial policy (true) ===');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_true ON staff_announcements');
  await sql('CREATE POLICY gap3deep_test_true ON staff_announcements FOR INSERT TO authenticated WITH CHECK (true)');
  cleanupPolicies.push('gap3deep_test_true');

  const res3 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEEP-T3',
    body: 'Test trivial policy',
    target_roles: ['director'],
    published_by: uid,
  });
  console.log(`  INSERT status: ${res3.status}`);
  console.log(`  INSERT body: ${JSON.stringify(res3.body).slice(0, 300)}`);

  if (res3.status === 201) {
    console.log('  >>> TRIVIAL POLICY WORKS: issue is in the WITH CHECK expression <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEEP-T3'");
  } else {
    console.log('  >>> TRIVIAL POLICY FAILED: issue is NOT in WITH CHECK, it is in role matching or elsewhere <<<');
  }

  // STEP 4: Drop trivial policy, test with auth.uid() = auth.uid()
  console.log('\n=== STEP 4: Test WITH CHECK (auth.uid() IS NOT NULL) ===');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_true ON staff_announcements');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_uid ON staff_announcements');
  await sql('CREATE POLICY gap3deep_test_uid ON staff_announcements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)');
  cleanupPolicies.push('gap3deep_test_uid');

  const res4 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEEP-T4',
    body: 'Test uid not null',
    target_roles: ['director'],
    published_by: uid,
  });
  console.log(`  INSERT status: ${res4.status}`);
  if (res4.status === 201) {
    console.log('  >>> auth.uid() IS NOT NULL passes: JWT is valid <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEEP-T4'");
  } else {
    console.log('  >>> auth.uid() IS NOT NULL fails: JWT issue <<<');
    console.log(`  body: ${JSON.stringify(res4.body).slice(0, 300)}`);
  }

  // STEP 5: Test with bfr_is_coordinator directly
  console.log('\n=== STEP 5: Test WITH CHECK bfr_is_coordinator(auth.uid()) ===');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_uid ON staff_announcements');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_fn ON staff_announcements');
  await sql(`CREATE POLICY gap3deep_test_fn ON staff_announcements FOR INSERT TO authenticated WITH CHECK (bfr_is_coordinator(auth.uid()))`);
  cleanupPolicies.push('gap3deep_test_fn');

  const res5 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEEP-T5',
    body: 'Test function in policy',
    target_roles: ['director'],
    published_by: uid,
  });
  console.log(`  INSERT status: ${res5.status}`);
  if (res5.status === 201) {
    console.log('  >>> bfr_is_coordinator(auth.uid()) WORKS in policy <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEEP-T5'");
  } else {
    console.log('  >>> bfr_is_coordinator(auth.uid()) FAILS in policy <<<');
    console.log(`  body: ${JSON.stringify(res5.body).slice(0, 300)}`);
  }

  // STEP 6: Check if the existing coordinator_insert policy works when alone
  console.log('\n=== STEP 6: Drop all INSERT policies, keep ONLY coordinator_insert for authenticated ===');
  await safeSql('DROP POLICY IF EXISTS gap3deep_test_fn ON staff_announcements');
  await safeSql('DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements');
  await safeSql('DROP POLICY IF EXISTS staff_announcements_write ON staff_announcements');

  await sql(`CREATE POLICY gap3deep_coord_only ON staff_announcements FOR INSERT TO authenticated WITH CHECK (bfr_is_coordinator(auth.uid()))`);
  cleanupPolicies.push('gap3deep_coord_only');

  const res6 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEEP-T6',
    body: 'Test alone',
    target_roles: ['director'],
    published_by: uid,
  });
  console.log(`  INSERT status: ${res6.status}`);
  if (res6.status === 201) {
    console.log('  >>> ALONE works: issue is interaction between policies <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEEP-T6'");
  } else {
    console.log('  >>> ALONE fails: issue is in the function/policy itself <<<');
    console.log(`  body: ${JSON.stringify(res6.body).slice(0, 300)}`);
  }

  // STEP 7: Restore original policies
  console.log('\n=== STEP 7: Restore original policies ===');
  await safeSql('DROP POLICY IF EXISTS gap3deep_coord_only ON staff_announcements');
  await sql(`CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements FOR INSERT TO public WITH CHECK (bfr_is_coordinator(auth.uid()))`);
  await sql(`CREATE POLICY staff_announcements_write ON staff_announcements FOR INSERT TO authenticated WITH CHECK ((published_by = auth.uid()) AND bfr_staff_is_manager())`);

  // STEP 8: Cleanup
  console.log('\n=== STEP 8: Cleanup ===');
  await safeSql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3DEEP-%'");
  await safeSql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
  await safeSql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  console.log('  cleanup OK');

} catch (e) {
  console.error('ERRO:', e.message);
  // Cleanup policies
  for (const p of cleanupPolicies) {
    await safeSql(`DROP POLICY IF EXISTS ${p} ON staff_announcements`);
  }
  // Restore original policies
  await safeSql('DROP POLICY IF EXISTS staff_announcements_coordinator_insert ON staff_announcements');
  await safeSql('DROP POLICY IF EXISTS staff_announcements_write ON staff_announcements');
  await sql('CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements FOR INSERT TO public WITH CHECK (bfr_is_coordinator(auth.uid()))');
  await sql('CREATE POLICY staff_announcements_write ON staff_announcements FOR INSERT TO authenticated WITH CHECK ((published_by = auth.uid()) AND bfr_staff_is_manager())');
  // Cleanup data
  if (uid) {
    await safeSql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3DEEP-%'");
    await safeSql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
    await safeSql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  }
  process.exit(1);
}
