// GAP-3 Final Test: prove the fix works
// Root cause: INSERT succeeds but SELECT (for return=representation) fails
// because staff_announcements_read doesn't allow author to read their own row.
//
// This script:
// 1. Mint coordinator + fixture
// 2. Test BEFORE fix: INSERT with return=representation → 403
// 3. Apply fix: modify staff_announcements_read to include published_by = auth.uid()
// 4. Test AFTER fix: INSERT with return=representation → 201
// 5. Rollback fix
// 6. Cleanup

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

const rest = async (token, method, path, body, prefer) => {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${HOST}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, body: j };
};

let uid;
let fixApplied = false;

async function applyFix() {
  await sql('DROP POLICY IF EXISTS staff_announcements_read ON staff_announcements');
  await sql(`CREATE POLICY staff_announcements_read ON staff_announcements
    FOR SELECT TO authenticated
    USING (
      bfr_is_staff() AND (
        bfr_staff_role() = 'developer'
        OR bfr_staff_role() = ANY (target_roles)
        OR published_by = auth.uid()
      )
    )`);
  fixApplied = true;
  console.log('  FIX applied');
}

async function rollbackFix() {
  if (!fixApplied) return;
  await sql('DROP POLICY IF EXISTS staff_announcements_read ON staff_announcements');
  await sql(`CREATE POLICY staff_announcements_read ON staff_announcements
    FOR SELECT TO authenticated
    USING (
      bfr_is_staff() AND (
        bfr_staff_role() = 'developer'::text
        OR bfr_staff_role() = ANY (target_roles)
      )
    )`);
  fixApplied = false;
  console.log('  FIX rolled back');
}

try {
  const hash = Math.random().toString(36).slice(2, 10);
  const email = `gap3final-${hash}@bfr-admin.test`;
  const schoolId = '08ebef62-2193-4520-ab44-c044160d565f';
  let passed = 0, failed = 0;

  const gate = (name, ok, detail) => {
    if (ok) { passed++; console.log(`  PASS [${name}]: ${detail}`); }
    else { failed++; console.log(`  FAIL [${name}]: ${detail}`); }
  };

  // STEP 1: Mint coordinator
  console.log('=== STEP 1: Mint coordinator ===');
  const mint = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Test1234!', email_confirm: true, user_metadata: { role: 'coordinator' } }),
  });
  uid = mint.body.id;
  console.log(`  uid: ${uid}`);

  await sql(`INSERT INTO profiles (id, email, role) VALUES ('${uid}'::uuid, '${email}', 'coordinator'::account_role) ON CONFLICT (id) DO UPDATE SET role = 'coordinator'::account_role`);
  await sql(`INSERT INTO staff_schools (profile_id, school_id, role) VALUES ('${uid}'::uuid, '${schoolId}'::uuid, 'coordinator') ON CONFLICT DO NOTHING`);

  const prof = await sql(`SELECT id, role FROM profiles WHERE id = '${uid}'::uuid`);
  gate('PROFILE_ROLE', prof[0]?.role === 'coordinator', `role=${prof[0]?.role}`);

  const fn = await sql(`SELECT bfr_is_coordinator('${uid}'::uuid) as is_coord`);
  gate('BFR_IS_COORDINATOR', fn[0]?.is_coord === true, `is_coord=${fn[0]?.is_coord}`);

  const token = await jwtLogin(email, 'Test1234!');
  console.log(`  JWT obtained`);

  // STEP 2: Test BEFORE fix
  console.log('\n=== STEP 2: BEFORE fix ===');

  // 2a: INSERT with return=minimal (should work)
  const resMin = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3-BEFORE-MIN', body: 'Test before fix minimal', target_roles: ['director', 'secretary'], published_by: uid,
  }, 'return=minimal');
  gate('INSERT_MINIMAL_BEFORE', resMin.status === 201, `status=${resMin.status}`);
  await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-BEFORE-MIN'");

  // 2b: INSERT with return=representation (should fail - the bug)
  const resRep = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3-BEFORE-REP', body: 'Test before fix representation', target_roles: ['director', 'secretary'], published_by: uid,
  }, 'return=representation');
  gate('INSERT_REPR_BEFORE_FAILS', resRep.status === 403, `status=${resRep.status} (expected 403)`);
  if (resRep.status === 201) {
    await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-BEFORE-REP'");
  }

  // STEP 3: Apply fix
  console.log('\n=== STEP 3: Apply fix ===');
  await applyFix();

  // Verify fix
  const pol = await sql("SELECT qual FROM pg_policies WHERE tablename = 'staff_announcements' AND policyname = 'staff_announcements_read'");
  const hasAuthorCheck = pol[0]?.qual?.includes('published_by');
  gate('FIX_APPLIED', hasAuthorCheck, `policy includes published_by check: ${hasAuthorCheck}`);

  // STEP 4: Test AFTER fix
  console.log('\n=== STEP 4: AFTER fix ===');

  // 4a: INSERT with return=representation (should now work!)
  const resAfter = await rest(token, 'POST', 'staff_announcements', {
    title: 'GAP3-AFTER-REP', body: 'Test after fix representation', target_roles: ['director', 'secretary'], published_by: uid,
  }, 'return=representation');
  gate('INSERT_REPR_AFTER_FIX', resAfter.status === 201, `status=${resAfter.status}`);
  if (resAfter.status === 201) {
    gate('RESPONSE_HAS_DATA', Array.isArray(resAfter.body) && resAfter.body.length > 0, `rows=${Array.isArray(resAfter.body) ? resAfter.body.length : 'N/A'}`);
    await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-AFTER-REP'");
  }

  // 4b: Verify coordinator can also READ announcements targeting their role
  await sql(`INSERT INTO staff_announcements (title, body, target_roles, published_by) VALUES ('GAP3-READ-TEST', 'read test', '{coordinator}', '${uid}'::uuid)`);
  const resRead = await rest(token, 'GET', 'staff_announcements?title=eq.GAP3-READ-TEST');
  gate('SELECT_TARGETING_COORDINATOR', resRead.status === 200 && Array.isArray(resRead.body) && resRead.body.length > 0, `status=${resRead.status} rows=${Array.isArray(resRead.body) ? resRead.body.length : 0}`);
  await sql("DELETE FROM staff_announcements WHERE title = 'GAP3-READ-TEST'");

  // STEP 5: Rollback fix
  console.log('\n=== STEP 5: Rollback fix ===');
  await rollbackFix();

  // Verify rollback
  const pol2 = await sql("SELECT qual FROM pg_policies WHERE tablename = 'staff_announcements' AND policyname = 'staff_announcements_read'");
  const noAuthorCheck = !pol2[0]?.qual?.includes('published_by');
  gate('ROLLBACK_OK', noAuthorCheck, `policy reverted: ${noAuthorCheck}`);

  // STEP 6: Cleanup
  console.log('\n=== STEP 6: Cleanup ===');
  await sql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3-%'");
  await sql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
  await sql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  console.log('  cleanup OK');

  // Summary
  console.log(`\n=== GAP-3 FINAL TEST SUMMARY ===`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log('ALL TESTS PASSED - fix-gap3-final.sql is ready to apply');
  } else {
    console.log('SOME TESTS FAILED - review the output above');
  }

} catch (e) {
  console.error('ERRO:', e.message);
  await rollbackFix().catch(() => {});
  if (uid) {
    try {
      await sql("DELETE FROM staff_announcements WHERE title LIKE 'GAP3-%'");
      await sql(`DELETE FROM staff_schools WHERE profile_id = '${uid}'::uuid`);
      await sql(`DELETE FROM profiles WHERE id = '${uid}'::uuid`);
      await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    } catch {}
  }
  process.exit(1);
}
