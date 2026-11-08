// GAP-3 Diagnostic Test: Does the RESTRICTIVE policy on profiles cause the 403?
// Steps: mint coordinator → test INSERT → drop RESTRICTIVE → test again → restore

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
let policyRestored = false;

async function restorePolicy() {
  if (policyRestored) return;
  console.log('  Restoring RESTRICTIVE policy...');
  const check = await sql("SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_hide_test_accounts'");
  if (check.length === 0) {
    await sql(`CREATE POLICY profiles_hide_test_accounts ON profiles
      FOR SELECT TO authenticated
      USING ((id = auth.uid()) OR ((email !~~ '%@bfr-conecta.test'::text) AND (email !~~ 'bfr.qa.email.%'::text)))
      RESTRICTIVE`);
    console.log('  RESTORED profiles_hide_test_accounts');
  } else {
    console.log('  Policy still exists (was not dropped)');
  }
  policyRestored = true;
}

try {
  const hash = Math.random().toString(36).slice(2, 10);
  const email = `gap3test-coord-${hash}@bfr-admin.test`;
  const password = 'Test1234!';
  const schoolId = '08ebef62-2193-4520-ab44-c044160d565f';

  // STEP 1: Mint coordinator account
  console.log('=== STEP 1: Mint coordinator account ===');
  const mint = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'coordinator' } }),
  });
  console.log(`  mint status: ${mint.status}`);
  uid = mint.body.id;
  console.log(`  uid: ${uid}`);

  // STEP 2: Create profile + staff_schools
  console.log('\n=== STEP 2: Create profile + staff_schools ===');
  await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${email}', 'coordinator'::account_role) ON CONFLICT (id) DO UPDATE SET role = 'coordinator'::account_role`);
  await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES ('${uid}'::uuid, '${schoolId}'::uuid, 'coordinator') ON CONFLICT DO NOTHING`);
  console.log('  profile + staff_schools OK');

  // STEP 3: Verify function directly
  console.log('\n=== STEP 3: Verify bfr_is_coordinator() directly ===');
  const fnTest = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as is_coord`);
  console.log(`  bfr_is_coordinator(): ${JSON.stringify(fnTest)}`);

  // STEP 4: Get JWT
  console.log('\n=== STEP 4: Get JWT ===');
  const token = await jwt(email, password);
  console.log(`  JWT: ${token.slice(0, 20)}...`);

  // STEP 5: Test INSERT BEFORE dropping RESTRICTIVE
  console.log('\n=== STEP 5: Test INSERT (BEFORE dropping RESTRICTIVE) ===');
  const res1 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3-TEST-BEFORE',
    body: 'Test GAP-3 before dropping RESTRICTIVE policy',
    target_roles: ['director', 'secretary'],
    published_by: uid,
  });
  console.log(`  INSERT status: ${res1.status}`);
  console.log(`  INSERT body: ${JSON.stringify(res1.body).slice(0, 500)}`);

  if (res1.status === 201) {
    console.log('\n  >>> INSERT SUCCEEDED even WITH the RESTRICTIVE policy! <<<');
    console.log('  >>> Hypothesis DISPROVED: RESTRICTIVE policy is NOT the cause <<<');
    console.log('  >>> The SECURITY DEFINER function works as expected <<<');

    // Cleanup
    await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-TEST-BEFORE'");
  } else {
    console.log('\n  >>> INSERT FAILED with RESTRICTIVE policy (expected) <<<');

    // STEP 6: Backup + DROP the RESTRICTIVE policy
    console.log('\n=== STEP 6: Backup + DROP the RESTRICTIVE policy ===');
    const polBefore = await sql("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_hide_test_accounts'");
    console.log(`  BACKUP: ${JSON.stringify(polBefore)}`);

    await sql('DROP POLICY IF EXISTS profiles_hide_test_accounts ON profiles');
    console.log('  DROPPED profiles_hide_test_accounts');
    policyRestored = false; // Mark that we need to restore

    // STEP 7: Test INSERT AFTER dropping RESTRICTIVE
    console.log('\n=== STEP 7: Test INSERT (AFTER dropping RESTRICTIVE) ===');
    const res2 = await rest(token, 'POST', 'staff_announcements', {
      title: 'GAP3-TEST-AFTER',
      body: 'Test GAP-3 after dropping RESTRICTIVE policy',
      target_roles: ['director', 'secretary'],
      published_by: uid,
    });
    console.log(`  INSERT status: ${res2.status}`);
    console.log(`  INSERT body: ${JSON.stringify(res2.body).slice(0, 500)}`);

    if (res2.status === 201) {
      console.log('\n  >>> INSERT SUCCEEDED after dropping RESTRICTIVE! <<<');
      console.log('  >>> Hypothesis CONFIRMED: RESTRICTIVE policy IS the cause <<<');
      await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-TEST-AFTER'");
    } else {
      console.log('\n  >>> INSERT STILL FAILED after dropping RESTRICTIVE! <<<');
      console.log('  >>> Hypothesis WRONG: cause is elsewhere <<<');

      // STEP 7b: Additional diagnostics
      console.log('\n=== STEP 7b: Additional diagnostics ===');

      // Check if the policy was actually dropped
      const polAfter = await sql("SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_hide_test_accounts'");
      console.log(`  Policy exists after drop? ${polAfter.length > 0}`);

      // Check all INSERT policies on staff_announcements
      const insPol = await sql("SELECT policyname, permissive, roles, with_check FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT'");
      console.log(`  INSERT policies: ${JSON.stringify(insPol)}`);

      // Test with service_role to isolate RLS from privilege issues
      console.log('\n=== STEP 7c: Test INSERT with service_role (bypasses RLS) ===');
      const res3 = await rest(serviceKey, 'POST', 'staff_announcements', {
        title: 'GAP3-TEST-SVCROLE',
        body: 'Test with service_role',
        target_roles: ['director'],
        published_by: uid,
      });
      console.log(`  service_role INSERT status: ${res3.status}`);
      console.log(`  service_role INSERT body: ${JSON.stringify(res3.body).slice(0, 300)}`);
      if (res3.status === 201) {
        await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-TEST-SVCROLE'");
        console.log('  >>> service_role INSERT works: table grants are OK, issue IS RLS <<<');
      }
    }

    // STEP 8: RESTORE the RESTRICTIVE policy
    console.log('\n=== STEP 8: RESTORE the RESTRICTIVE policy ===');
    await restorePolicy();
  }

  // STEP 9: Cleanup
  console.log('\n=== STEP 9: Cleanup ===');
  await sql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3-TEST-%'");
  await sql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
  await sql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  console.log('  cleanup OK');

} catch (e) {
  console.error('ERRO:', e.message);
  await restorePolicy().catch(() => {});
  if (uid) {
    try {
      await sql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3-TEST-%'");
      await sql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
      await sql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
      await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    } catch {}
  }
  process.exit(1);
}
