// RM-1.4 — censo das VISTAS de public: dono, security_invoker e o que cada papel realmente lê.
// Só-leitura: cada SELECT vai dentro de begin; set local role …; …; rollback.
import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const REF = 'yyzqoxlkcvqpessypfjo';
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + sqlToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text(); if (!r.ok) return { __erro: t.slice(0, 200).replace(/\s+/g, ' ') };
  return JSON.parse(t);
};

const vistas = await sql(`
select c.oid::regclass::text as nome, c.relname, pg_get_userbyid(c.relowner) as dono,
       r.rolbypassrls::text as dono_bypass,
       coalesce(has_table_privilege('anon',c.oid,'SELECT')::text,'?') as anon_sel,
       coalesce(has_table_privilege('authenticated',c.oid,'SELECT')::text,'?') as auth_sel,
       case when c.reloptions::text like '%security_invoker=true%' then 'invoker'
            when c.reloptions::text like '%security_invoker=false%' then 'definer'
            else 'sem-opção' end as modo
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
 where n.nspname='public' and c.relkind='v' order by 2`);
console.log(`vistas em public: ${vistas.length}`);
const alc = vistas.filter((x) => x.anon_sel === 'true' || x.auth_sel === 'true');
console.log(`alcançáveis por anon/authenticated: ${alc.length}`);
console.log(`dono com BYPASSRLS: ${alc.filter((x) => x.dono_bypass === 'true').length} | dessas, modo definer/sem-opção: ${alc.filter((x) => x.dono_bypass === 'true' && x.modo !== 'invoker').length}\n`);
for (const x of vistas) console.log(`   ${x.relname.padEnd(38)} dono=${x.dono.padEnd(14)} bypass=${x.dono_bypass.padEnd(5)} ${x.modo.padEnd(11)} anon=${x.anon_sel} auth=${x.auth_sel}`);

console.log('\n=== contagem real por papel (auth.uid() = NULL neste caminho) ===');
const saida = [];
for (const x of alc) {
  const linha = { ...x };
  for (const papel of ['anon', 'authenticated']) {
    const r = await sql(`begin; set local role ${papel}; select count(*)::int as n from ${x.nome}; rollback;`);
    if (r.__erro) { linha[papel] = 'ERRO ' + r.__erro.slice(0, 90); continue; }
    linha[papel] = Array.isArray(r) ? r[0].n : JSON.stringify(r).slice(0, 80);
  }
  const base = await sql(`select count(*)::int as n from ${x.nome}`);
  linha.dono = Array.isArray(base) ? base[0].n : '?';
  const perigoso = x.dono_bypass === 'true' && x.modo !== 'invoker' && Number(linha.authenticated) > 0;
  console.log(`   ${x.relname.padEnd(38)} dono=${String(linha.dono).padEnd(7)} anon=${String(linha.anon).slice(0, 46).padEnd(48)} auth=${String(linha.authenticated).slice(0, 46)} ${perigoso ? '⚠ FURO' : ''}`);
  saida.push(linha);
}
writeFileSync(`${DIR}/evidence/rm14-censo-views.json`, JSON.stringify({
  em: new Date().toISOString(), total_vistas: vistas.length, alcancaveis: alc.length,
  bypassrls_definer: alc.filter((x) => x.dono_bypass === 'true' && x.modo !== 'invoker').map((x) => x.relname),
  linhas: saida,
}, null, 2) + '\n');
console.log('\ndiário: evidence/rm14-censo-views.json');
