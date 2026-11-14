// C2-R — conferir SEM ESCREVER: o deparse VIVO das 7 policies do ciclo ainda é o texto
// contra o qual a candidata e a reversão foram validadas no dry-run de 11/11.
// Se o hash vivo divergir de md5_antes, a candidata gravada em disco está envelhecida
// e a afirmação "reversão provada byte a byte" deixa de valer — aí nada se aplica.
import { readFileSync } from 'node:fs';
import { DIR, sql } from './c2-lib.mjs';

const espacar = (h) => [...String(h)].join(' ');

const achado = (o, chave, caminho = '') => {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k === chave) return { valor: v, caminho: `${caminho}${k}` };
      const fundo = achado(v, chave, `${caminho}${k}.`);
      if (fundo) return fundo;
    }
  }
  return null;
};

const gravado = JSON.parse(readFileSync(`${DIR}/docs/c2r-42p17-dryrun.json`, 'utf8'));
const md5_antes = achado(gravado, 'md5_antes')?.valor;
const md5_rb = achado(gravado, 'md5_rb')?.valor;
if (!md5_antes) {
  console.log('C2R_VIVO_PAROU: md5_antes não está gravado no dry-run — não há com o que comparar');
  process.exit(1);
}

// a mesma expressão do dry-run: 7 policies (profiles_read + as 6 de staff_schools)
const vivo = await sql(`select md5(string_agg(n.nspname || '.' || c.relname || '.' || p.polname || '|'
    || coalesce(pg_get_expr(p.polqual, p.polrelid), '<nulo>') || '|'
    || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '<nulo>'), '' order by 1)) as h,
  count(*)::int as n
  from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools')`);
const md5_vivo = vivo[0].h;
const n_vivo = vivo[0].n;

// a função da candidata NÃO pode existir no vivo (nada foi aplicado)
const fn = await sql(`select count(*)::int as n from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'bfr_profile_in_my_schools' and n.nspname = 'public'`);

const censo = await sql(`select n.nspname || '.' || c.relname || '.' || p.polname as p
  from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and ((c.relname = 'profiles' and p.polname = 'profiles_read') or c.relname = 'staff_schools')
 order by 1`);

console.log('policies no hash vivo:', n_vivo, '(esperado 7)');
for (const r of censo) console.log('  ', r.p);
console.log('md5_antes (11/11):', espacar(md5_antes));
console.log('md5_rb   (11/11):', espacar(md5_rb));
console.log('md5_vivo (agora):', espacar(md5_vivo));
console.log('funcao bfr_profile_in_my_schools no vivo:', fn[0].n, '(esperado 0)');

const falhas = [];
if (n_vivo !== 7) falhas.push(`censo de policies | dado=${n_vivo} | esperado=7`);
if (md5_vivo !== md5_antes) falhas.push('deparse vivo != md5_antes do dry-run (a candidata envelheceu)');
if (md5_vivo !== md5_rb) falhas.push('deparse vivo != md5_rb (a reversao nao reproduziria o vivo)');
if (fn[0].n !== 0) falhas.push(`funcao da candidata existe no vivo | dado=${fn[0].n} | esperado=0`);

if (falhas.length) {
  console.log('C2R_VIVO_PAROU:', JSON.stringify(falhas));
  process.exit(1);
}
console.log('C2R_VIVO_OK: a candidata de 11/11 ainda casa byte a byte com o texto vivo.');
