// RM-6.8 régua degrau 3 — limpeza do resíduo de storage deixado pelo S20 ruler3.
// O instrumento s20-behavioral-ruler3.mjs apaga o objecto que ele mesmo usa no
// Gap 10 (DELETE via coordinator) mas não o que o Gap 9 criou pelo secretary:
// resta 1 linha em storage.objects e a baseline pós fica VERMELHA.
// Os uids são lidos do ficheiro de sessões do próprio ciclo — nada é dactilografado.
// Uso: node scripts/rm68-ruler3-limpeza-storage.mjs

import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SESSIONS = `${DIR}/s20-ruler3-sessions.json`;
const BUCKET = 'secretary-attachments';

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

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

const sess = JSON.parse(readFileSync(SESSIONS, 'utf8'));
const uids = Object.values(sess.contas).map((c) => c.uid);
console.log(`uids do ciclo (em ${sess.em}): ${uids.length}`);

const listar = async () =>
  sql(
    `select name from storage.objects where bucket_id = '${BUCKET}' order by name;`,
  );

const antes = await listar();
console.log(`Objetos no bucket antes: ${antes.length}`);
const alvo = antes.filter((o) => uids.some((u) => o.name.includes(u)));
console.log(`Pertencentes a este ciclo: ${alvo.length}`);

for (const o of alvo) {
  const r = await fetch(`${HOST}/storage/v1/object/${BUCKET}/${o.name}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const t = await r.text();
  console.log(`DELETE ${o.name}: HTTP ${r.status} ${t.slice(0, 120)}`);
  if (![200, 204, 404].includes(r.status)) throw new Error(`Falha ao apagar ${o.name}`);
}

const depois = await listar();
const restante = depois.filter((o) => uids.some((u) => o.name.includes(u)));
console.log(`Pertencentes a este ciclo após limpeza: ${restante.length}`);
console.log(`Objetos no bucket depois: ${depois.length}`);
for (const o of depois) console.log(`  ${o.name}`);

if (restante.length !== 0) throw new Error('LIMPEZA_INCOMPLETA: restos do ciclo');
console.log('LIMPEZA_STORAGE_OK');
