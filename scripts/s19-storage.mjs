// S19-5 — prova comportamental storage anexos (bucket secretary-attachments).
// Upload/download/delete object + attachment row + signed URL + negativos.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, HOST, sql, jwtFetch, jwtRaw, loadSessions, ensureFresh, stage, criarGates } from './s19-lib.mjs';

const F = JSON.parse(readFileSync(`${DIR}/evidence/s19-fixtures.json`, 'utf8'));
const S = loadSessions();
const { gate, resumo } = criarGates();
const testes = [];
const tokens = {};
for (const k of Object.keys(S)) tokens[k] = await ensureFresh(k);

const BUCKET = 'secretary-attachments';
const FILE_NAME = 's19-prova.txt';
const FILE_CONTENT = 'S19 storage behavioral proof — fixed content';
const PATH_OK = `supervision/${F.resp_id}/${S.director.uid}/${FILE_NAME}`;

// Cleanup prévio (idempotência): remove object e row de runs anteriores
console.log('[0] Cleanup prévio');
const preObj = await sql(`select count(*)::int as n from storage.objects where bucket_id='${BUCKET}' and name='${PATH_OK}';`);
if (preObj[0].n > 0) {
  const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
  await fetch(`${HOST}/storage/v1/object/${BUCKET}/${PATH_OK}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  console.log(`  object prévio removido`);
}
const preRow = await sql(`select id::text from public.supervision_response_attachments where storage_path='${PATH_OK}';`);
for (const r of preRow) {
  await sql(`delete from public.supervision_response_attachments where id='${r.id}'::uuid;`);
  console.log(`  row prévia ${r.id} removida`);
}

const upload = async (chave, path, content) => {
  const r = await fetch(`${HOST}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { apikey: (await import('./s19-lib.mjs')).serviceKey || readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim(), Authorization: `Bearer ${tokens[chave]}`, 'Content-Type': 'text/plain' },
    body: content,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};
const download = async (chave, path) => {
  const r = await fetch(`${HOST}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { apikey: readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim(), Authorization: `Bearer ${tokens[chave]}` },
  });
  const t = await r.text();
  return { status: r.status, text: t, contentType: r.headers.get('content-type') };
};
const del = async (chave, path) => {
  const r = await fetch(`${HOST}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { apikey: readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim(), Authorization: `Bearer ${tokens[chave]}` },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};
const signedUrl = async (chave, path, expiresIn = 60) => {
  const r = await fetch(`${HOST}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { apikey: readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim(), Authorization: `Bearer ${tokens[chave]}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};
const getSigned = async (url) => {
  const fullUrl = url.startsWith('/') ? `${HOST}/storage/v1${url}` : url;
  const r = await fetch(fullUrl);
  const t = await r.text();
  return { status: r.status, text: t };
};
const insertRow = async (chave, body) => jwtFetch(tokens[chave], '/rest/v1/supervision_response_attachments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify(body),
});
const deleteRow = async (chave, id) => jwtFetch(tokens[chave], `/rest/v1/supervision_response_attachments?id=eq.${id}`, { method: 'DELETE' });

// ═══════════════════════════════════════════════════════════════
// 1. Upload positivo (director)
// ═══════════════════════════════════════════════════════════════
console.log('[1] Upload positivo');
const up1 = await upload('director', PATH_OK, FILE_CONTENT);
testes.push({ nome: 'director upload', status: up1.status });
gate('director upload → 200', up1.status, 200);

// 2. Download ANTES da row → bloqueado (select policy exige row)
console.log('[2] Download sem row');
const dl2 = await download('director', PATH_OK);
testes.push({ nome: 'director download sem row', status: dl2.status });
gate('director download sem row → bloqueado (4xx)', dl2.status >= 400, true);

// 3. Insert row (director)
console.log('[3] Insert row');
const row = await insertRow('director', {
  response_id: F.resp_id,
  storage_path: PATH_OK,
  file_name: FILE_NAME,
  mime_type: 'text/plain',
  created_by: S.director.uid,
});
testes.push({ nome: 'director insert row', status: row.status, id: row.j?.[0]?.id });
gate('director insert row → 201', row.status, 201);
const rowId = row.j?.[0]?.id;

// 4. Download após row → 200, conteúdo bate
console.log('[4] Download após row');
const dl4 = await download('director', PATH_OK);
testes.push({ nome: 'director download após row', status: dl4.status, content: dl4.text });
gate('director download → 200', dl4.status, 200);
gate('conteúdo bate', dl4.text, FILE_CONTENT);

// 5. Secretary download → 200 (select permite)
console.log('[5] Secretary download');
const dl5 = await download('secretary', PATH_OK);
testes.push({ nome: 'secretary download', status: dl5.status });
gate('secretary download → 200', dl5.status, 200);

// 6. Coordinator download → 200 (select permite, sem filtro escola)
console.log('[6] Coordinator download');
const dl6 = await download('coordinator', PATH_OK);
testes.push({ nome: 'coordinator download', status: dl6.status });
gate('coordinator download → 200', dl6.status, 200);

// 7. Supervisor download → bloqueado (select exclui supervisor)
console.log('[7] Supervisor download');
const dl7 = await download('supervisor', PATH_OK);
testes.push({ nome: 'supervisor download', status: dl7.status });
gate('supervisor download → bloqueado (4xx)', dl7.status >= 400, true);

// 8. Signed URL (director)
console.log('[8] Signed URL');
const su8 = await signedUrl('director', PATH_OK, 60);
testes.push({ nome: 'director signed URL', status: su8.status, url: su8.j?.signedURL });
gate('director signed URL → 200', su8.status, 200);
if (su8.j?.signedURL) {
  const dl8 = await getSigned(su8.j.signedURL);
  testes.push({ nome: 'GET signed URL', status: dl8.status, content: dl8.text });
  gate('GET signed URL → 200', dl8.status, 200);
  gate('conteúdo signed bate', dl8.text, FILE_CONTENT);
}

// 9. Coordinator delete object → bloqueado (delete: uploader OR developer/director)
console.log('[9] Coordinator delete object');
const d9 = await del('coordinator', PATH_OK);
testes.push({ nome: 'coordinator delete object', status: d9.status });
gate('coordinator delete object → bloqueado', d9.status >= 400, true);
const obj9 = await sql(`select count(*)::int as n from storage.objects where bucket_id='${BUCKET}' and name='${PATH_OK}';`);
gate('object ainda existe (SQL)', obj9[0].n, 1);

// 10. Secretary upload → bloqueado (insert: director/coordinator/developer)
console.log('[10] Secretary upload');
const up10 = await upload('secretary', `supervision/${F.resp_id}/${S.secretary.uid}/sec.txt`, 'sec');
testes.push({ nome: 'secretary upload', status: up10.status });
gate('secretary upload → bloqueado', up10.status >= 400, true);

// 11. Director upload com uid forjado → bloqueado (split_part 3 ≠ auth.uid())
console.log('[11] Upload uid forjado');
const up11 = await upload('director', `supervision/${F.resp_id}/${S.secretary.uid}/forged.txt`, 'forged');
testes.push({ nome: 'director upload uid forjado', status: up11.status });
gate('director upload uid forjado → bloqueado', up11.status >= 400, true);

// 12. Director upload response inexistente → bloqueado (EXISTS supervision_responses)
console.log('[12] Upload response inexistente');
const FAKE_RESP = '00000000-0000-0000-0000-000000000000';
const up12 = await upload('director', `supervision/${FAKE_RESP}/${S.director.uid}/fake.txt`, 'fake');
testes.push({ nome: 'director upload response inexistente', status: up12.status });
gate('director upload response inexistente → bloqueado', up12.status >= 400, true);

// 13. Director delete object → 200 (uploader)
console.log('[13] Director delete object');
const d13 = await del('director', PATH_OK);
testes.push({ nome: 'director delete object', status: d13.status });
gate('director delete object → 200', d13.status, 200);
const obj13 = await sql(`select count(*)::int as n from storage.objects where bucket_id='${BUCKET}' and name='${PATH_OK}';`);
gate('object removido (SQL)', obj13[0].n, 0);

// 14. Coordinator delete row → bloqueado (delete: developer only)
console.log('[14] Coordinator delete row');
const d14 = await deleteRow('coordinator', rowId);
testes.push({ nome: 'coordinator delete row', status: d14.status });
gate('coordinator delete row → 204/200 sem body (RLS bloqueia)', [200, 204].includes(d14.status), true);
const row14 = await sql(`select count(*)::int as n from public.supervision_response_attachments where id='${rowId}'::uuid;`);
gate('row ainda existe (SQL)', row14[0].n, 1);

// 15. Director delete row → bloqueado (delete: developer only)
console.log('[15] Director delete row');
const d15 = await deleteRow('director', rowId);
testes.push({ nome: 'director delete row', status: d15.status });
gate('director delete row → 204/200 sem body (RLS bloqueia)', [200, 204].includes(d15.status), true);
const row15 = await sql(`select count(*)::int as n from public.supervision_response_attachments where id='${rowId}'::uuid;`);
gate('row ainda existe (SQL)', row15[0].n, 1);

// ═══════════════════════════════════════════════════════════════
// Persistência
// ═══════════════════════════════════════════════════════════════
const { portoes, falhas } = resumo();
const gaps = [
  'supervisor não baixa anexo (select exclui education_supervisor)',
  'coordinator/director não deletam row da tabela (delete developer-only)',
  'secretary não faz upload (insert: director/coordinator/developer)',
];
const idsCriados = { row_id: rowId, object_path: PATH_OK };
writeFileSync(`${DIR}/evidence/s19-storage-ids.json`, JSON.stringify({ ciclo: 'S19', ids: idsCriados }, null, 2) + '\n');
stage('storage', { testes, portoes, falhas, gaps, ids_criados: idsCriados });

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'S19_STORAGE_PAROU' : 'S19_STORAGE_OK');
if (falhas.length) process.exit(1);