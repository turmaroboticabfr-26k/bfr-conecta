// Sonda SOMENTE LEITURA do resíduo s17 (ciclo d): contas auth, perfis, supervision_audit
// e tabelas que referenciam esses perfis — para montar a limpeza FK-safe.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const REF = 'yyzqoxlkcvqpessypfjo';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/ae5k-s17-recon-16-11.json`;
if (existsSync(OUT)) throw new Error(`Artefacto ${OUT} já existe — guard.`);
const pat = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const serviceKey = readFileSync('C:/Users/pcmac/.supabase-service-role', 'utf8').trim();

async function sql(query, tentativas = 10) {
  let ultimo = '';
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `HTTP ${r.status}: ${t.slice(0, 400)}`;
    if (!(r.status >= 500 || r.status === 401 || /Failed to/i.test(t))) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 8000));
  }
  throw new Error(`esgotou tentativas — ${ultimo}`);
}

const out = { em: new Date().toISOString(), autorizacao: 'somente leitura' };

// 1) contas auth com email s17* (emails reais? máscara só para o artefacto ficar legível)
const authS17 = await sql(`select id, email from auth.users where email ilike 's17%' or email ilike '%s17%' order by email;`);
out.auth_s17 = authS17;

// 2) supervision_audit completo (9 linhas) com email do perfil
const audit = await sql(`select sa.id, sa.profile_id, p.email, sa.action, sa.created_at::text as criado
  from public.supervision_audit sa left join public.profiles p on p.id = sa.profile_id order by sa.created_at;`);
out.supervision_audit = audit;

// 3) FKs que apontam para profiles (tabela + coluna referenciadora) — para saber que
// tabelas podem referenciar os perfis s17
const fks = await sql(`select conrelid::regclass::text as tabela,
  (select attname from pg_attribute where attrelid = conrelid and attnum = conkey[1]) as coluna,
  conname
  from pg_constraint where confrelid = 'public.profiles'::regclass and contype = 'f' order by 1;`);
out.fks_para_profiles = fks;

// 4) contagens de referências aos perfis s17 em TODAS as tabelas com FK para profiles
const idsS17 = authS17.map((u) => u.id);
out.perfis_s17_esperados = await sql(`select id, email from public.profiles where email ilike '%s17%' order by email;`);
const tabelas = fks.map((f) => ({ tabela: f.tabela, coluna: f.coluna })).filter((t) => t.tabela !== 'profiles');
out.referencias = {};
for (const { tabela, coluna } of tabelas) {
  const ref = await sql(`select count(*)::int as n from ${tabela} where ${coluna} in ('${idsS17.join("','")}')`);
  out.referencias[`${tabela}.${coluna}`] = ref[0]?.n ?? -1;
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('AE5K_RECON_ESCRITO');
console.log(JSON.stringify(out, null, 1));
