// S19 — helpers partilhados do ciclo. Credenciais só de ficheiro, nunca impressas.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const REF = 'yyzqoxlkcvqpessypfjo';
export const HOST = `https://${REF}.supabase.co`;
export const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
export const SESSIONS = `${DIR}/s19-sessions.json`;
export const DIARY = `${DIR}/evidence/s19-diary.json`;

const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

export const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
};

export const admin = async (path, init) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 300) }; }
  return { status: r.status, j };
};

// JWT de utilizador sintético; apikey service (papel vem do Bearer, não da apikey)
export const jwtFetch = async (accessToken, path, init = {}) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { bruto: t.slice(0, 400) }; }
  return { status: r.status, j };
};

export const jwtRaw = async (accessToken, path, init = {}) => {
  const r = await fetch(`${HOST}${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
  });
  const text = await r.text();
  return { status: r.status, text, contentType: r.headers.get('content-type') };
};

export const loadSessions = () => JSON.parse(readFileSync(SESSIONS, 'utf8'));
export const saveSessions = (s) => writeFileSync(SESSIONS, JSON.stringify(s, null, 2) + '\n');

export const ensureFresh = async (chave) => {
  const s = loadSessions(); const e = s[chave];
  const exp = e.expires_at ?? JSON.parse(Buffer.from(e.access_token.split('.')[1], 'base64url').toString('utf8')).exp;
  if (exp - Math.floor(Date.now() / 1000) > 300) return e.access_token;
  const r = await admin('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: e.refresh_token }) });
  if (!r.j?.access_token) throw new Error(`refresh ${chave} falhou HTTP ${r.status}`);
  s[chave] = { ...e, ...r.j, expires_at: r.j.expires_at ?? Math.floor(Date.now() / 1000) + r.j.expires_in };
  saveSessions(s);
  return s[chave].access_token;
};

export const stage = (nome, dados) => {
  const d = existsSync(DIARY) ? JSON.parse(readFileSync(DIARY, 'utf8')) : { ciclo: 'S19', started: new Date().toISOString(), stages: {} };
  d.stages[nome] = { em: new Date().toISOString(), ...dados };
  writeFileSync(DIARY, JSON.stringify(d, null, 2) + '\n');
};

export const criarGates = () => {
  const falhas = []; let portoes = 0;
  return {
    gate(nome, dado, esperado) {
      portoes++;
      const ok = JSON.stringify(dado) === JSON.stringify(esperado);
      if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
      console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
      return ok;
    },
    resumo() { return { portoes, falhas }; },
  };
};