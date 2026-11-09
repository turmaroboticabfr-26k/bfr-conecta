#!/usr/bin/env node
// Verifica estado de bfr_pf_notify_location() — P2-2

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
        console.log('(sem linhas)');
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

// 1. Verificar SECURITY DEFINER + dono + linguagem
await sql(`
SELECT p.proname,
       p.prosecdef,
       l.lanname AS linguagem,
       pg_get_userbyid(p.proowner) AS dono
FROM pg_proc p
JOIN pg_language l ON l.oid = p.prolang
WHERE p.proname LIKE 'bfr_pf%'
ORDER BY p.proname;
`, 'Funções bfr_pf* — SECURITY DEFINER e dono');

// 2. Verificar proacl (grants de EXECUTE)
await sql(`
SELECT p.proname,
       COALESCE(p.proacl::text[], '{}') AS grants
FROM pg_proc p
WHERE p.proname LIKE 'bfr_pf%'
ORDER BY p.proname;
`, 'ACL de EXECUTE das funções bfr_pf*');

// 3. Verificar se a função acessa Vault (padrão mitigado)
await sql(`
SELECT pg_get_functiondef(p.oid) AS corpo
FROM pg_proc p
WHERE p.proname = 'bfr_pf_notify_location';
`, 'Corpo da função bfr_pf_notify_location()');

console.log('\n=== VERIFICAÇÃO P2-2 CONCLUÍDA ===');
