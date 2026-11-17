// §13 do briefing manda criar contas de teste e «removê-las de forma segura ao final». Antes de remover
// seja quem for, é preciso saber o que existe: este programa paginA o Admin API e responde a três perguntas
// sem escrever nada: quantas contas há, quantas são do domínio de teste, e que papéis elas declaram.
// Não imprime e-mails de utilizadores reais — só contagens, domínios e os endereços `*.test` (que são da
// auditoria). A PAT vive em ficheiro e nunca passa pela linha de comandos. Só-leitura: 0 DELETE, 0 DDL.
// Uso: node scripts/ah2-inventario-contas.mjs
import { readFileSync } from 'node:fs';

const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
// O Admin API do GoTrue NÃO aceita a PAT da plataforma (responde 401); pede a service role. As duas
// credenciais vêm de ficheiro e nunca passam pela linha de comandos; a apikey é a publishable lida dos
// bytes servidos, porque é essa que o browser também envia.
const SERVICE = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();
const shellTxt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const ANON = shellTxt.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["'`]([^"'`]+)["'`]/)[1];
const tudo = [];
for (let pagina = 1; pagina <= 40; pagina++) {
  const r = await fetch(`${HOST}/auth/v1/admin/users?page=${pagina}&per_page=1000`, { headers: { apikey: ANON, Authorization: `Bearer ${SERVICE}` }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('ABORTA: Admin API respondeu ' + r.status);
  const j = await r.json();
  const us = j.users || j.auditors || [];
  tudo.push(...us);
  if (us.length < 1000) break;
}
const dom = (e) => String(e || '').split('@')[1] || '(sem @)';
const por_dominio = {}; const por_papel = {}; const figuras = [];
for (const u of tudo) {
  const d = dom(u.email);
  por_dominio[d] = (por_dominio[d] || 0) + 1;
  const papel = u.user_metadata?.role || u.user_metadata?.app_metadata?.role || '(sem role)';
  por_papel[papel] = (por_papel[papel] || 0) + 1;
  if (/\.test$/.test(d)) figuras.push({ email: u.email, papel, criado: String(u.created_at).slice(0, 10), id: String(u.id).slice(0, 8) });
}
console.log('TOTAL DE CONTAS: ' + tudo.length);
console.log('\nPOR DOMÍNIO');
for (const [d, n] of Object.entries(por_dominio).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${d}${/\.test$/.test(d) ? '   <-- domínio de teste da auditoria' : '   (não listado: endereços reais)'}`);
console.log('\nPOR PAPEL DECLARADO');
for (const [p, n] of Object.entries(por_papel).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${p}`);
console.log('\nCONTAS DE TESTE (destas, e só destas, é que o desmontador trata):');
for (const f of figuras.sort((a, b) => a.papel.localeCompare(b.papel) || a.email.localeCompare(b.email))) console.log(`  ${f.papel.padEnd(21)} ${f.email}  criada ${f.criado}  id ${f.id}`);
console.log(`\nFIGURAS: ${figuras.length} / ${tudo.length} contas`);
console.log(figuras.length ? 'INVENTARIO_PRONTO_PARA_O_DESMONTADOR' : 'SEM FIGURAS — nada a remover');
