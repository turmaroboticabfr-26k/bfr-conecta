// GAP-3 DEFINITIVE TEST: isolate the exact cause
// Key insight from previous test: profile was created with role='parent' by trigger,
// and ON CONFLICT DO NOTHING skipped our explicit INSERT with role='coordinator'.
// Also: WITH CHECK (true) failed even for authenticated role.

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
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 500)}`);
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

const jwtLogin = async (email, password) => {
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
const policiesToClean = [];

async function safeSql(q) {
  try { return await sql(q); } catch (e) { console.log(`  [SQL] ${e.message.slice(0, 200)}`); return null; }
}

async function dropPolicy(name) {
  await safeSql(`DROP POLICY IF EXISTS ${name} ON staff_announcements`);
}

async function createPolicy(name, forCmd, forRoles, withCheck) {
  const q = withCheck
    ? `CREATE POLICY ${name} ON staff_announcements FOR ${forCmd} TO ${forRoles} WITH CHECK (${withCheck})`
    : `CREATE POLICY ${name} ON staff_announcements FOR ${forCmd} TO ${forRoles} USING (${withCheck || 'true'})`;
  await sql(q);
  policiesToClean.push(name);
}

try {
  // ============================================================
  // STEP 1: Mint account + ensure profile has correct role
  // ============================================================
  console.log('=== STEP 1: Mint coordinator ===');
  const hash = Math.random().toString(36).slice(2, 10);
  const email = `gap3def-${hash}@bfr-admin.test`;
  const mint = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Test1234!', email_confirm: true, user_metadata: { role: 'coordinator' } }),
  });
  uid = mint.body.id;
  console.log(`  uid: ${uid}`);

  // Use ON CONFLICT DO UPDATE to ensure role is correct
  await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${email}', 'coordinator'::account_role) ON CONFLICT (id) DO UPDATE SET role = 'coordinator'::account_role`);
  await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES ('${uid}'::uuid, '08ebef62-2193-4520-ab44-c044160d565f'::uuid, 'coordinator') ON CONFLICT DO NOTHING`);

  // Verify profile
  const prof = await sql(`SELECT id, email, role FROM profiles WHERE id = '${uid}'::uuid`);
  console.log(`  profile: ${JSON.stringify(prof)}`);

  // Verify function
  const fn = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as is_coord`);
  console.log(`  bfr_is_coordinator(): ${JSON.stringify(fn)}`);

  // Get JWT
  const token = await jwtLogin(email, 'Test1234!');
  console.log(`  JWT obtained`);

  // ============================================================
  // STEP 2: Clean slate - drop ALL INSERT policies
  // ============================================================
  console.log('\n=== STEP 2: Clean INSERT policies ===');
  const beforePolicies = await sql("SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT'");
  console.log(`  Before: ${JSON.stringify(beforePolicies.map(p => p.policyname))}`);

  for (const p of beforePolicies) {
    await sql(`DROP POLICY IF EXISTS ${p.policyname} ON staff_announcements`);
  }
  console.log('  All INSERT policies dropped');

  // ============================================================
  // STEP 3: Test with ONLY a trivial policy (WITH CHECK true)
  // ============================================================
  console.log('\n=== STEP 3: Trivial policy (WITH CHECK true, TO authenticated) ===');
  await createPolicy('gap3def_trivial', 'INSERT', 'authenticated', 'true');

  const res3 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEF-T3', body: 'trivial test', target_roles: ['director'], published_by: uid,
  });
  console.log(`  INSERT status: ${res3.status}`);
  if (res3.status === 201) {
    console.log('  >>> PASS: trivial policy works <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEF-T3'");
  } else {
    console.log(`  >>> FAIL: ${JSON.stringify(res3.body).slice(0, 200)} <<<`);
  }

  // ============================================================
  // STEP 4: Test with bfr_is_coordinator policy
  // ============================================================
  console.log('\n=== STEP 4: Function policy (bfr_is_coordinator, TO authenticated) ===');
  await dropPolicy('gap3def_trivial');
  await createPolicy('gap3def_fn', 'INSERT', 'authenticated', 'bfr_is_coordinator(auth.uid())');

  const res4 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEF-T4', body: 'function test', target_roles: ['director'], published_by: uid,
  });
  console.log(`  INSERT status: ${res4.status}`);
  if (res4.status === 201) {
    console.log('  >>> PASS: bfr_is_coordinator policy works <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEF-T4'");
  } else {
    console.log(`  >>> FAIL: ${JSON.stringify(res4.body).slice(0, 200)} <<<`);
  }

  // ============================================================
  // STEP 5: Test with TO public (like the original)
  // ============================================================
  console.log('\n=== STEP 5: Function policy (bfr_is_coordinator, TO public) ===');
  await dropPolicy('gap3def_fn');
  await createPolicy('gap3def_pub', 'INSERT', 'public', 'bfr_is_coordinator(auth.uid())');

  const res5 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEF-T5', body: 'public role test', target_roles: ['director'], published_by: uid,
  });
  console.log(`  INSERT status: ${res5.status}`);
  if (res5.status === 201) {
    console.log('  >>> PASS: TO public works <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEF-T5'");
  } else {
    console.log(`  >>> FAIL: ${JSON.stringify(res5.body).slice(0, 200)} <<<`);
  }

  // ============================================================
  // STEP 6: Test with both policies (coordinator_insert + write)
  // ============================================================
  console.log('\n=== STEP 6: Both original policies restored ===');
  await dropPolicy('gap3def_pub');
  await sql('CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements FOR INSERT TO public WITH CHECK (bfr_is_coordinator(auth.uid()))');
  await sql("CREATE POLICY staff_announcements_write ON staff_announcements FOR INSERT TO authenticated WITH CHECK ((published_by = auth.uid()) AND bfr_staff_is_manager())");

  const res6 = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3DEF-T6', body: 'both policies test', target_roles: ['director'], published_by: uid,
  });
  console.log(`  INSERT status: ${res6.status}`);
  if (res6.status === 201) {
    console.log('  >>> PASS: original policies work with correct profile <<<');
    await safeSql("DELETE FROM staff_announcements WHERE title = 'GAP3DEF-T6'");
  } else {
    console.log(`  >>> FAIL: ${JSON.stringify(res6.body).slice(0, 200)} <<<`);
  }

  // ============================================================
  // STEP 7: Check if the issue was the profile role all along
  // ============================================================
  console.log('\n=== STEP 7: Verify profile role ===');
  const prof2 = await sql(`SELECT id, role FROM profiles WHERE id = '${uid}'::uuid`);
  console.log(`  Current profile: ${JSON.stringify(prof2)}`);
  const fn2 = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as is_coord`);
  console.log(`  bfr_is_coordinator(): ${JSON.stringify(fn2)}`);
  const fn3 = await sql(`SELECT bfr_staff_is_manager() as is_mgr`);
  console.log(`  bfr_staff_is_manager() [as postgres]: ${JSON.stringify(fn3)}`);

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('\n=== CLEANUP ===');
  await safeSql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3DEF-%'");
  for (const p of policiesToClean) {
    await safeSql(`DROP POLICY IF EXISTS ${p} ON staff_announcements`);
  }
  // Ensure original policies exist
  const afterPolicies = await sql("SELECT policyname FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT'");
  const policyNames = afterPolicies.map(p => p.policyname);
  if (!policyNames.includes('staff_announcements_coordinator_insert')) {
    await sql('CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements FOR INSERT TO public WITH CHECK (bfr_is_coordinator(auth.uid()))');
  }
  if (!policyNames.includes('staff_announcements_write')) {
    await sql("CREATE POLICY staff_announcements_write ON staff_announcements FOR INSERT TO authenticated WITH CHECK ((published_by = auth.uid()) AND bfr_staff_is_manager())");
  }
  // Ensure RESTRICTIVE policy on profiles exists
  const restrictivePol = await sql("SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_hide_test_accounts'");
  if (restrictivePol.length === 0) {
    await sql(`CREATE POLICY profiles_hide_test_accounts ON profiles FOR SELECT TO authenticated USING ((id = auth.uid()) OR ((email !~~ '%@bfr-conecta.test'::text) AND (email !~~ 'bfr.qa.email.%'::text))) RESTRICTIVE`);
    console.log('  RESTORED profiles_hide_test_accounts');
  }
  // Clean account
  await safeSql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
  await safeSql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  console.log('  cleanup OK');

  // Final policy check
  const finalPolicies = await sql("SELECT policyname, permissive, roles, cmd, with_check FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT' ORDER BY policyname");
  console.log('\n=== Final INSERT policies ===');
  for (const p of finalPolicies) console.log(`  ${p.policyname}: ${p.permissive} roles=${p.roles} check=${p.with_check}`);

} catch (e) {
  console.error('ERRO:', e.message);
  // Cleanup
  for (const p of policiesToClean) {
    await safeSql(`DROP POLICY IF EXISTS ${p} ON staff_announcements`);
  }
  const afterPolicies = await safeSql("SELECT policyname FROM pg_policies WHERE tablename = 'staff_announcements' AND cmd = 'INSERT'");
  if (afterPolicies) {
    const names = afterPolicies.map(p => p.policyname);
    if (!names.includes('staff_announcements_coordinator_insert')) {
      await safeSql('CREATE POLICY staff_announcements_coordinator_insert ON staff_announcements FOR INSERT TO public WITH CHECK (bfr_is_coordinator(auth.uid()))');
    }
    if (!names.includes('staff_announcements_write')) {
      await safeSql("CREATE POLICY staff_announcements_write ON staff_announcements FOR INSERT TO authenticated WITH CHECK ((published_by = auth.uid()) AND bfr_staff_is_manager())");
    }
  }
  const restrictivePol = await safeSql("SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_hide_test_accounts'");
  if (restrictivePol && restrictivePol.length === 0) {
    await safeSql(`CREATE POLICY profiles_hide_test_accounts ON profiles FOR SELECT TO authenticated USING ((id = auth.uid()) OR ((email !~~ '%@bfr-conecta.test'::text) AND (email !~~ 'bfr.qa.email.%'::text))) RESTRICTIVE`);
  }
  if (uid) {
    await safeSql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3DEF-%'");
    await safeSql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
    await safeSql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  }
  process.exit(1);
}
