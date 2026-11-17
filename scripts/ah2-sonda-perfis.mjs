// RM-1.2 parou com o painel «Contas e cargos» a mostrar 10 linhas e a conta-alvo fora delas. Há duas
// leituras e a correção é diferente: (a) o PostgREST está limitado a 10 linhas por pedido, e então um
// administrador real não consegue mudar o cargo da 11.ª conta em diante — defeito de serviço; (b) a RLS
// de `profiles` só mostra ao developer as contas do mesmo vínculo, e as minhas contas sintéticas não têm
// vínculo — defeito do meu fixture. Este censo conta as linhas, vê as primeiras por `order full_name`
// (a ordem que o bundle usa) e procura as contas do ciclo dentro delas.
// Só SELECT. Uso: node scripts/ah2-sonda-perfis.mjs [rótulo]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const REF = 'yyzqoxlkcvqpessypfjo';
const ROTULO = process.argv[2] || '17-11';
const OUT = `${DIR}/evidence/ah2-sonda-perfis-${ROTULO}.json`;
if (existsSync(OUT) && !process.argv.includes('--force')) throw new Error('ABORTA: ' + OUT + ' existe — use --force');
const PAT = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();

const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }), signal: AbortSignal.timeout(60000),
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  if (!r.ok || !j) throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 200));
  return j;
};

const contas = JSON.parse(readFileSync(`${DIR}/evidence/ah2-contas-17-11.json`, 'utf8'));
// Os e-mails vêm do meu próprio registo de contas, mas a lista entra em SQL por interpolação: escapo a
// aspa simples para um «'» num nome não estragar a consulta.
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const emails = contas.contas.map((c) => c.email).filter(Boolean);
const listaEmails = emails.map(lit).join(',');

const total = await q('select count(*)::int as n from public.profiles');
const porNome = await q('select id, role, full_name, email, created_at from public.profiles order by full_name nulls last limit 20');
// A mesma query que o bundle faz, com o limite de serviço removido: se isto vier > 10, o teto é do
// PostgREST/project setting e não do código da app.
const emFalta = emails.length
  ? await q(`select email, role, full_name from public.profiles where email in (${listaEmails}) order by full_name`)
  : [];
// A ligação à escola não é uma tabela que eu saiba de memória: pergunto ao dicionário quais colunas de
// `profiles` apontam para escola e uso-as, em vez de adivinhar um nome de tabela.
const cols = await q("select column_name, data_type from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position");
const colEscola = cols.filter((c) => /school/i.test(c.column_name)).map((c) => c.column_name);
const temVinculo = emails.length && colEscola.length
  ? await q(`select email, role, ${colEscola.join(', ')} from public.profiles where email in (${listaEmails}) order by full_name`)
  : { nota: 'profiles não tem coluna com «school» no nome', colunas: cols.map((c) => c.column_name) };

const out = {
  ciclo: 'AH-2-PERFIS', em: new Date().toISOString(),
  origem: 'evidence/ah2-contas-17-11.json',
  contas_do_ciclo: emails.length,
  total_profiles: total,
  colunas_profiles: cols.map((c) => c.column_name),
  primeiros_20_por_full_name: porNome.map((r, i) => ({ ordem: i + 1, role: r.role, full_name: r.full_name, email: r.email })),
  contas_do_ciclo_no_banco: emFalta,
  vinculos_de_escola: temVinculo,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('total=' + JSON.stringify(total) + ' contas_no_banco=' + emFalta.length + '/' + emails.length);
console.log('primeiros 12 por full_name:');
for (const r of out.primeiros_20_por_full_name.slice(0, 12)) console.log('  ' + String(r.ordem).padStart(2) + ' ' + String(r.role).padEnd(20) + ' ' + r.full_name + ' · ' + r.email);
console.log('OUT ' + OUT);
