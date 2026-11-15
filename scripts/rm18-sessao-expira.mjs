import { readFileSync } from 'node:fs';
const S = JSON.parse(readFileSync('C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/rm18-session.json', 'utf8'));
const agora = Math.floor(Date.now() / 1000);
console.log(JSON.stringify({ expira_em_s: S.expires_at - agora, expires_at: S.expires_at, agora, email: S.user?.email }));
