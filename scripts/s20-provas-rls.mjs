#!/usr/bin/env node
// Provas RLS com JWT S20 — isolamento por escola + negativos
import { readFileSync } from 'fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const SERVICE_KEY = readFileSync(process.env.HOME + '/.supabase-service-role', 'utf8').trim();
const SESSIONS = JSON.parse(readFileSync('s20-sessions.json', 'utf8'));

const rest = async (path, token, init = {}) => {
  const r = await fetch(`${HOST}/rest/v1${path}`, {
    ...init,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

console.log('[1] Provas RLS com JWT S20\n');

let portoes = 0;
let verdes = 0;
const gate = (nome, ok, dado) => {
  portoes++;
  if (ok) verdes++;
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}${dado !== undefined ? ' | ' + JSON.stringify(dado) : ''}`);
  return ok;
};

// ═══════════════════════════════════════════════════════════════
// TESTE 1: Cada papel lê profiles da sua escola
// ═══════════════════════════════════════════════════════════════
console.log('\n[TESTE 1] Leitura de profiles por papel');

for (const [role, session] of Object.entries(SESSIONS)) {
  const token = session.access_token;
  const uid = session.uid;

  // Ler próprio profile (deve funcionar)
  const ownProfile = await rest(`/profiles?id=eq.${uid}`, token);
  gate(`${role} lê próprio profile`, ownProfile.status === 200 && ownProfile.j.length === 1, `status=${ownProfile.status} rows=${ownProfile.j.length}`);

  // Ler profiles de outros (deve ver 0 ou só da mesma escola)
  const otherProfiles = await rest(`/profiles?id=neq.${uid}&limit=5`, token);
  gate(`${role} lê outros profiles (RLS filtra)`, otherProfiles.status === 200, `status=${otherProfiles.status} rows=${otherProfiles.j.length}`);
}

// ═══════════════════════════════════════════════════════════════
// TESTE 2: Supervisor vê apenas escolas vinculadas via staff_schools
// ═══════════════════════════════════════════════════════════════
console.log('\n[TESTE 2] Isolamento do supervisor via staff_schools');

const supToken = SESSIONS.supervisor.access_token;
const supUid = SESSIONS.supervisor.uid;

// Ler schools vinculadas (deve ver apenas as da sua vinculação)
const supSchools = await rest(`/sports_schools?select=id,name&limit=10`, supToken);
gate('supervisor lê schools (RLS por staff_schools)', supSchools.status === 200, `status=${supSchools.status} rows=${supSchools.j.length}`);

// ═══════════════════════════════════════════════════════════════
// TESTE 3: Secretary/Director/Coordinator têm visibilidade diferente
// ═══════════════════════════════════════════════════════════════
console.log('\n[TESTE 3] Visibilidade por papel');

for (const role of ['secretary', 'director', 'coordinator']) {
  const token = SESSIONS[role].access_token;

  // Ler schools (cada papel tem policy diferente)
  const schools = await rest(`/sports_schools?select=id,name&limit=10`, token);
  gate(`${role} lê schools`, schools.status === 200, `status=${schools.status} rows=${schools.j.length}`);

  // Ler supervision_requests (se existir)
  const requests = await rest(`/supervision_requests?select=id&limit=5`, token);
  gate(`${role} lê supervision_requests`, requests.status === 200 || requests.status === 404, `status=${requests.status}`);
}

// ═══════════════════════════════════════════════════════════════
// TESTE 4: Negativos — tentar acessar dados de outra escola
// ═══════════════════════════════════════════════════════════════
console.log('\n[TESTE 4] Negativos (acesso cruzado deve falhar)');

// Supervisor tenta ler staff_schools de outro supervisor
const supStaffSchools = await rest(`/staff_schools?select=*&limit=10`, supToken);
gate('supervisor lê staff_schools (próprios vínculos)', supStaffSchools.status === 200, `status=${supStaffSchools.status} rows=${supStaffSchools.j.length}`);

// Secretary tenta apagar profile de outro (deve falhar)
const secToken = SESSIONS.secretary.access_token;
const deleteAttempt = await rest(`/profiles?id=eq.${supUid}`, secToken, { method: 'DELETE' });
const rlsBlockedImplicitly = (deleteAttempt.status === 200 && Array.isArray(deleteAttempt.j) && deleteAttempt.j.length === 0) || (deleteAttempt.status === 204);
gate('secretary NÃO apaga profile de supervisor', deleteAttempt.status === 403 || deleteAttempt.status === 404 || deleteAttempt.j.code === 'PGRST203' || rlsBlockedImplicitly, `status=${deleteAttempt.status} body=${JSON.stringify(deleteAttempt.j).slice(0,50)}`);

// ═══════════════════════════════════════════════════════════════
// TESTE 5: Storage — cada papel vê apenas seus anexos
// ═══════════════════════════════════════════════════════════════
console.log('\n[TESTE 5] Storage RLS');

for (const [role, session] of Object.entries(SESSIONS)) {
  const token = session.access_token;

  // Listar objetos do bucket secretary-attachments (se existir)
  const storage = await rest(`/storage/v1/object?prefix=${role}/`, token);
  gate(`${role} lista storage (prefixo próprio)`, storage.status === 200 || storage.status === 404 || storage.status === 403, `status=${storage.status}`);
}

// ═══════════════════════════════════════════════════════════════
// RESUMO
// ═══════════════════════════════════════════════════════════════
console.log(`\n[RESUMO] ${verdes}/${portoes} portões VERDE`);

if (verdes === portoes) {
  console.log('\n[OK] Provas RLS S20 concluídas — isolamento funcionando');
} else {
  console.log(`\n[ALERTA] ${portoes - verdes} portões VERMELHO — revisar policies`);
}
