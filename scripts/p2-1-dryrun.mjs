#!/usr/bin/env node
// Dry-run transacional do P2-1: escopo por escola em profiles_read e gate_badges_staff_manage
// Lê ANTES → aplica em transação → lê DEPOIS → rollback

import { readFileSync } from 'fs';

const PAT = readFileSync(process.env.HOME + '/.supabase-pat', 'utf8').trim();
const PROJECT = 'yyzqoxlkcvqpessypfjo';
const URL = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function sql(query, label) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  console.log(`\n=== ${label} (HTTP ${r.status}) ===`);
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      if (json.length === 0) {
        console.log('(sem linhas — esperado para DDL)');
      } else {
        console.table(json);
      }
    } else {
      console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    }
  } catch {
    console.log(text.slice(0, 2000));
  }
  return text;
}

// 1. Estado ANTES
await sql(`
SELECT policyname, tablename, cmd,
       COALESCE(qual, '') AS usando,
       COALESCE(with_check, '') AS verificacao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'gate_badges')
  AND policyname IN ('profiles_read', 'gate_badges_staff_manage')
ORDER BY tablename, policyname;
`, 'ANTES (estado atual)');

// 2. Dry-run: aplicar + verificar + rollback numa transação
await sql(`
BEGIN;

DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (id = auth.uid())
    OR is_developer()
    OR EXISTS (
      SELECT 1 FROM staff_schools ss_target
      JOIN profiles p_caller ON p_caller.id = auth.uid()
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      WHERE ss_target.profile_id = profiles.id
        AND ss_caller.school_id = ss_target.school_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p_caller
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      JOIN students st ON st.school_id = ss_caller.school_id
      JOIN profiles p_student ON p_student.id = profiles.id
      WHERE p_caller.id = auth.uid()
        AND st.student_profile_id = p_student.id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p_caller
      JOIN staff_schools ss_caller ON ss_caller.profile_id = p_caller.id
      JOIN guardian_students gs ON gs.profile_id = profiles.id
      JOIN students st ON st.id = gs.student_id
      WHERE p_caller.id = auth.uid()
        AND ss_caller.school_id = st.school_id
    )
  );

DROP POLICY IF EXISTS gate_badges_staff_manage ON public.gate_badges;
CREATE POLICY gate_badges_staff_manage ON public.gate_badges
  FOR ALL TO authenticated
  USING (
    is_developer()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND st.id = gate_badges.student_id
    )
  )
  WITH CHECK (
    is_developer()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN staff_schools ss ON ss.profile_id = p.id
      JOIN students st ON st.school_id = ss.school_id
      WHERE p.id = auth.uid()
        AND st.id = gate_badges.student_id
    )
  );

SELECT policyname, tablename, cmd,
       COALESCE(qual, '') AS usando,
       COALESCE(with_check, '') AS verificacao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'gate_badges')
  AND policyname IN ('profiles_read', 'gate_badges_staff_manage')
ORDER BY tablename, policyname;

ROLLBACK;
`, 'DEPOIS (dentro da transação, antes do ROLLBACK)');

// 3. Confirmar que o rollback funcionou (deve ser igual ao ANTES)
await sql(`
SELECT policyname, tablename, cmd,
       COALESCE(qual, '') AS usando,
       COALESCE(with_check, '') AS verificacao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'gate_badges')
  AND policyname IN ('profiles_read', 'gate_badges_staff_manage')
ORDER BY tablename, policyname;
`, 'PÓS-ROLLBACK (deve ser igual ao ANTES)');

console.log('\n=== DRY-RUN CONCLUÍDO — nenhuma alteração permanente ===');
