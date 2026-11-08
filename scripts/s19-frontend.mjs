// S19-6 — prova frontend v115: aba Supervisão na Secretaria (secretary/supervisor) + Direção (director).
// Injeção de sessão via localStorage, navegação, screenshots, verificação de dados.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, loadSessions, stage, criarGates } from './s19-lib.mjs';

const URL = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const S = loadSessions();
const { gate, resumo } = criarGates();
const testes = [];

// Helper: chama ferramenta browser-use
const browser = async (tool, args) => {
  const { mcp_call } = await import('qoder:mcp');
  return mcp_call({ toolName: `mcp__browser-use__${tool}`, arguments: args });
};

// Helper: injeta sessão no localStorage
const injectSession = async (session) => {
  const key = 'sb-yyzqoxlkcvqpessypfjo-auth-token';
  const val = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: session.user,
  });
  await browser('evaluate_script', { script: `localStorage.setItem('${key}', '${val}'); location.reload();` });
  await new Promise(r => setTimeout(r, 3000)); // aguarda reload + boot
};

// Helper: limpa sessão
const clearSession = async () => {
  await browser('evaluate_script', { script: `localStorage.clear(); location.reload();` });
  await new Promise(r => setTimeout(r, 2000));
};

// Helper: screenshot com nome
const shot = async (nome) => {
  const path = `${DIR}/evidence/s19--frontend-${nome}.png`;
  await browser('take_screenshot', { path, fullPage: false });
  return path;
};

// Helper: verifica erros no console
const consoleErrors = async () => {
  const msgs = await browser('list_console_messages', { levels: ['error'] });
  return msgs.filter(m => !m.text.includes('favicon')).map(m => m.text.slice(0, 200));
};

// ═══════════════════════════════════════════════════════════════
// TESTE 1: SECRETARY — aba Supervisão na Secretaria
// ═══════════════════════════════════════════════════════════════
console.log('[1] Secretary — Secretaria → Supervisão');
await browser('navigate_page', { url: URL, waitForStableDom: false });
await new Promise(r => setTimeout(r, 2000));
await injectSession(S.secretary);
await browser('wait_for', { selector: '[data-bfr-shell]', timeout: 10000 });

// Navega para Secretaria (roleSectionAccess)
await browser('evaluate_script', { script: `document.querySelector('[data-role-section="secretaria"]')?.click();` });
await new Promise(r => setTimeout(r, 1500));

// Aba Supervisão
await browser('click', { selector: '[data-sec-tab="supervisao"]' });
await new Promise(r => setTimeout(r, 2000));
await shot('secretary-supervisao');

// Verifica R_A visível, R_B não
const secData = await browser('evaluate_script', { script: `
  const rows = document.querySelectorAll('[data-sec-supervision-list] article');
  const ids = Array.from(rows).map(r => r.dataset.id || r.textContent.match(/[0-9a-f]{8}-/)?.[0]).filter(Boolean);
  return { count: rows.length, ids };
`});
testes.push({ nome: 'secretary supervision list', data: secData });
gate('secretary vê 1 request (R_A)', secData.count, 1);

const secErrors = await consoleErrors();
testes.push({ nome: 'secretary console errors', errors: secErrors });
gate('secretary sem erros críticos', secErrors.length === 0, true);

await clearSession();

// ═══════════════════════════════════════════════════════════════
// TESTE 2: SUPERVISOR — aba Supervisão na Secretaria (trap 422: setRole('secretary'))
// ═══════════════════════════════════════════════════════════════
console.log('[2] Supervisor — Secretaria → Supervisão (trap 422)');
await browser('navigate_page', { url: URL, waitForStableDom: false });
await new Promise(r => setTimeout(r, 2000));
await injectSession(S.supervisor);
await browser('wait_for', { selector: '[data-bfr-shell]', timeout: 10000 });

// Trap 422: supervisor routes via setRole('secretary')
await browser('evaluate_script', { script: `
  if (typeof window.setRole === 'function') window.setRole('secretary');
  document.querySelector('[data-role-section="secretaria"]')?.click();
`});
await new Promise(r => setTimeout(r, 1500));

// Aba Supervisão
await browser('click', { selector: '[data-sec-tab="supervisao"]' });
await new Promise(r => setTimeout(r, 2000));
await shot('supervisor-supervisao');

// Verifica R_A + R_B visíveis (supervisor vê tudo)
const supData = await browser('evaluate_script', { script: `
  const rows = document.querySelectorAll('[data-sec-supervision-list] article');
  const ids = Array.from(rows).map(r => r.dataset.id || r.textContent.match(/[0-9a-f]{8}-/)?.[0]).filter(Boolean);
  return { count: rows.length, ids };
`});
testes.push({ nome: 'supervisor supervision list', data: supData });
gate('supervisor vê 2 requests (R_A + R_B)', supData.count, 2);

const supErrors = await consoleErrors();
testes.push({ nome: 'supervisor console errors', errors: supErrors });
gate('supervisor sem erros críticos', supErrors.length === 0, true);

await clearSession();

// ═══════════════════════════════════════════════════════════════
// TESTE 3: DIRECTOR — Direção (supervision NÃO presente, usa support_requests)
// ═══════════════════════════════════════════════════════════════
console.log('[3] Director — Direção (sem aba Supervisão)');
await browser('navigate_page', { url: URL, waitForStableDom: false });
await new Promise(r => setTimeout(r, 2000));
await injectSession(S.director);
await browser('wait_for', { selector: '[data-bfr-shell]', timeout: 10000 });

// Navega para Direção
await browser('evaluate_script', { script: `document.querySelector('[data-role-section="direcao"]')?.click();` });
await new Promise(r => setTimeout(r, 1500));
await shot('director-direcao');

// Verifica aba Supervisão NÃO existe na Direção
const dirSupTab = await browser('evaluate_script', { script: `
  return !!document.querySelector('[data-sec-tab="supervisao"]');
`});
testes.push({ nome: 'director supervision tab exists', exists: dirSupTab });
gate('director NÃO tem aba Supervisão na Direção', dirSupTab, false);

const dirErrors = await consoleErrors();
testes.push({ nome: 'director console errors', errors: dirErrors });
gate('director sem erros críticos', dirErrors.length === 0, true);

await clearSession();

// ═══════════════════════════════════════════════════════════════
// Persistência
// ═══════════════════════════════════════════════════════════════
const { portoes, falhas } = resumo();
stage('frontend', { testes, portoes, falhas });

console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'S19_FRONTEND_PAROU' : 'S19_FRONTEND_OK');
if (falhas.length) process.exit(1);