// sm10-aplicar — aplica a correção sm10 (GRANT EXECUTE dos 2 predicados a authenticated),
// com preflight (ACL antes), aplicação e conferência (ACL depois + SET ROLE authenticated).
// Autorização: OK literal do usuário em 18/11 («Aplicar agora», questão sm10).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${RAIZ}/evidence/sm10-aplicar-grant-escopo-18-11.json`;
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT); process.exit(1); }

const { sql } = await import('./c2-lib.mjs');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const diario = {
  programa: 'sm10-aplicar-grant-escopo-18-11', em: new Date().toISOString(),
  autorizacao: 'OK literal do usuário de 18/11 («Aplicar agora»)',
  instrumento_md5: md5(readFileSync(new URL(import.meta.url), 'utf8')),
  preflight: null, aplicado: [], pos: null, sonda_authenticated: null, veredito: '', falhas: [],
};

const ACL_SQL = `select p.proname, p.proacl::text as acl from pg_proc p
  where p.proname in ('bfr_school_in_municipal_scope','bfr_school_in_own_school_scope') order by 1`;

diario.preflight = await sql(ACL_SQL);

const GRANTS = [
  'GRANT EXECUTE ON FUNCTION public.bfr_school_in_municipal_scope(uuid) TO authenticated',
  'GRANT EXECUTE ON FUNCTION public.bfr_school_in_own_school_scope(uuid) TO authenticated',
];
for (const g of GRANTS) {
  const r = await sql(g);
  diario.aplicado.push({ stmt: g, resultado: r });
}

diario.pos = await sql(ACL_SQL);

const semAuthenticated = diario.preflight.filter((p) => !p.acl.includes('authenticated='));
const posComAuthenticated = diario.pos.filter((p) => p.acl.includes('authenticated='));
diario.falhas = [];
if (semAuthenticated.length !== 2) diario.falhas.push(`preflight inesperado: ${JSON.stringify(diario.preflight)}`);
if (posComAuthenticated.length !== 2) diario.falhas.push(`pós inesperado: ${JSON.stringify(diario.pos)}`);

const sonda = await sql("set local role authenticated; select id from public.students limit 1;")
  .then(() => ({ students: 'SEM_ERRO' }))
  .catch((e) => ({ students: String(e.message).slice(0, 160) }));
const sondaVista = await sql("set local role authenticated; select school_id from public.bfr_municipal_school_stats limit 1;")
  .then(() => ({ vista: 'SEM_ERRO' }))
  .catch((e) => ({ vista: String(e.message).slice(0, 160) }));
diario.sonda_authenticated = { ...sonda, ...sondaVista };

const ok = diario.falhas.length === 0 && sonda.students === 'SEM_ERRO' && sondaVista.vista === 'SEM_ERRO';
diario.veredito = ok ? 'GRANT_ESCopo_APLICADO_E_CONFERIDO' : 'GRANT_APLICADO_COM_DUVIDA';

writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(diario.veredito);
console.log(JSON.stringify({ preflight: diario.preflight, pos: diario.pos, sonda: diario.sonda_authenticated, falhas: diario.falhas }, null, 1));
