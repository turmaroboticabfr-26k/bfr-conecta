// C2 — cliente CDP mínimo (Node 24 WebSocket nativo). Sessões só de c2-sessions.json; nunca impressas.
import { readFileSync } from 'node:fs';
import { SESSIONS, ensureFresh } from './c2-lib.mjs';

const PORT = 9333;
export const STORAGE_KEY = 'sb-yyzqoxlkcvqpessypfjo-auth-token';

export const connect = async () => {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('sem alvo page no CDP');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
  const evalJS = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) throw new Error('eval: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
    return r.result?.value;
  };
  const waitFor = async (expression, timeout = 90000, step = 500) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (await evalJS(expression)) return true; await new Promise(r => setTimeout(r, step)); }
    throw new Error('waitFor timeout: ' + expression.slice(0, 140));
  };
  const navigate = url => send('Page.navigate', { url });
  return { send, evalJS, waitFor, navigate, close: () => ws.close() };
};

// Boot real: injeta sessão no localStorage da origem, recarrega, espera appShell.ready + papel.
export const bootAs = async (cdp, chave, role, url) => {
  await ensureFresh(chave);
  const s = JSON.parse(readFileSync(SESSIONS, 'utf8'))[chave];
  const session = { access_token: s.access_token, token_type: s.token_type || 'bearer', expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user };
  await cdp.navigate(url);
  await cdp.waitFor(`location.href.startsWith(${JSON.stringify(url)}) && !!document.getElementById('loginScreen')`, 45000);
  await cdp.evalJS(`(() => { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(session))}); localStorage.setItem(${JSON.stringify('bfr-pn-skipped:' + s.uid)}, '1'); return true; })()`);
  await cdp.navigate(url);
  await cdp.waitFor(`window.BFR_CURRENT_PROFILE?.role === ${JSON.stringify(role)} && document.getElementById('appShell')?.classList.contains('ready')`, 120000);
  return true;
};