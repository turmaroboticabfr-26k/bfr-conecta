// RM-6.8 régua degrau 3 — baseline pré/pós por contagem E md5 das tabelas
// que o s20-behavioral-ruler3 toca: auth.users, public.profiles, staff_schools,
// sports_schools, supervision_requests, supervision_responses,
// supervision_response_attachments, storage.objects (bucket secretary-attachments).
// Uso:
//   node scripts/rm68-ruler3-baseline.mjs capture <path.json>
//   node scripts/rm68-ruler3-baseline.mjs compare <pre.json> <pos.json>
// capture não escreve nada no banco; compare imprime VERDE/VERMELHO por tabela e sai 1 se houver diferença.

import { readFileSync, writeFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const TABELAS = {
  'auth.users': 'auth.users',
  'public.profiles': 'public.profiles',
  staff_schools: 'public.staff_schools',
  sports_schools: 'public.sports_schools',
  supervision_requests: 'public.supervision_requests',
  supervision_responses: 'public.supervision_responses',
  supervision_response_attachments: 'public.supervision_response_attachments',
  supervision_audit: 'public.supervision_audit',
  'storage.objects(secretary-attachments)': "storage.objects WHERE bucket_id = 'secretary-attachments'",
};

const CHAVE = {
  'auth.users': 'id::text',
  'public.profiles': 'id::text',
  staff_schools: 'profile_id::text || $$:$$ || school_id::text',
  sports_schools: 'id::text || $$:$$ || name',
  supervision_requests: 'id::text',
  supervision_responses: 'id::text',
  supervision_response_attachments: 'id::text',
  supervision_audit: 'id::text',
  'storage.objects(secretary-attachments)': 'name',
};

// A API de gestão devolve HTTP 500 {"message":"Failed to check user auth status"}
// de forma intermitente: derrubou a captura pós de 15/11 às 06:32Z
// (evidence/rm68-ruler3-baseline-pos.log:5), mas uma passada de 5 sondas `select 1`
// às 06:39Z deu 5/5 OK (evidence/rm68-ruler3-fecho.json). Como as consultas são
// leituras idempotentes, o retry é seguro; o HTTP 500 vindo do próprio SQL é erro
// de execução e não casa nesta mensagem, por isso continua a lançar.
const sql = async (query, tentativas = 6) => {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!/Failed to check user auth status/.test(t)) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error(`sql esgotou as tentativas — ${ultimo}`);
};

const capturar = async () => {
  const out = { em: new Date().toISOString(), tabelas: {} };
  for (const [nome, alvo] of Object.entries(TABELAS)) {
    const chave = CHAVE[nome];
    const q = `select count(*) as n, md5(coalesce(string_agg(t.k, ',' order by t.k), '')) as h from (select ${chave} as k from ${alvo}) t;`;
    const [r] = await sql(q);
    out.tabelas[nome] = { n: Number(r.n), h: r.h };
    console.log(`${String(r.n).padStart(6)}  ${r.h}  ${nome}`);
  }
  return out;
};

const [modo, a, b] = process.argv.slice(2);

if (modo === 'capture') {
  if (!a) { console.error('Uso: capture <path.json>'); process.exit(2); }
  const out = await capturar();
  writeFileSync(a, JSON.stringify(out, null, 2) + '\n');
  console.log(`Escrito ${a}`);
} else if (modo === 'compare') {
  if (!a || !b) { console.error('Uso: compare <pre.json> <pos.json>'); process.exit(2); }
  const pre = JSON.parse(readFileSync(a, 'utf8'));
  const pos = JSON.parse(readFileSync(b, 'utf8'));
  let falhas = 0;
  for (const nome of Object.keys(pre.tabelas)) {
    const p = pre.tabelas[nome];
    const q = pos.tabelas?.[nome];
    const igual = q && p.n === q.n && p.h === q.h;
    if (!igual) falhas++;
    console.log(`${igual ? 'VERDE' : 'VERMELHO'}  ${nome}  pré=${p.n}/${p.h}  pós=${q ? q.n + '/' + q.h : 'AUSENTE'}`);
  }
  console.log(falhas === 0 ? 'BASELINE_RESTAURADA' : `BASELINE_DIVERGENTE (${falhas})`);
  process.exit(falhas === 0 ? 0 : 1);
} else {
  console.error('Uso: capture <path.json> | compare <pre.json> <pos.json>');
  process.exit(2);
}
