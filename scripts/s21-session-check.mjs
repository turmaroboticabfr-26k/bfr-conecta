// S21 — sonda de frescura da sessão: imprime SÓ chaves, tempos e booleans. Nunca o token.
import { readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const S = JSON.parse(readFileSync(`${DIR}/s21-session.json`, 'utf8'));
const agora = Math.floor(Date.now() / 1000);
const expira = S.expires_at ?? S.user?.expires_at ?? null;
console.log(JSON.stringify({
  chaves_topo: Object.keys(S),
  chaves_user: S.user ? Object.keys(S.user) : null,
  tem_access_token: typeof S.access_token === 'string' && S.access_token.length > 40,
  tem_refresh_token: typeof S.refresh_token === 'string' && S.refresh_token.length > 20,
  token_type: S.token_type ?? null,
  expires_in: S.expires_in ?? null,
  expires_at: expira,
  agora,
  segundos_restantes: expira ? expira - agora : null,
  expirou_em_segundos: expira ? agora - expira : null,
  uid_user: S.user?.sub ?? S.user?.id ?? null,
  role_no_token: (() => {
    try { return JSON.parse(atob(S.access_token.split('.')[1])).role; } catch { return null; }
  })(),
}, null, 2));
