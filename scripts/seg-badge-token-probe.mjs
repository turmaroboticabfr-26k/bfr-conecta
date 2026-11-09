// SEG-BADGE-PROBE — prova somente-leitura da morte do badge_token do ciclo C2.
// O valor mora no historico empurrado (docs/c2-fixtures.json, tier-B). A questao registada no
// diario S20 ponto 5 era: o token esta vivo no banco? Este script responde por contagem.
// Nada e escrito no banco. Nenhum valor e impresso: saida so numeros, booleanos e chaves.
import { readFileSync, writeFileSync } from 'node:fs';
import { sql as sqlBruto, DIR } from './c2-lib.mjs';

const FIXTURES = `${DIR}/docs/c2-fixtures.json`;
const DIARIO = `${DIR}/evidence/seg-badge-token-probe.json`;
const fx = JSON.parse(readFileSync(FIXTURES, 'utf8'));
const segredo = [String(fx.badge_token), String(fx.badge), String(fx.student_uid), String(fx.parent_uid)];
const redig = (s) => segredo.reduce((acc, v) => acc.split(v).join('REDACTADO'), String(s));
// o c2-lib imprime os primeiros 400 chars do body no erro — e os queries [4]/[5] levam o token.
// logo NENHUM erro sai para a consola sem passar pelo redactor, com valor fixo, sem backreferencia.
const sql = (q) => sqlBruto(q).catch((e) => { throw new Error(redig(e.message)); });
const diz = (...a) => console.log(a.map((x) => (typeof x === 'string' ? redig(x) : x)).join(' '));

const gates = [];
const gate = (nome, passou, detalhe) => {
  gates.push({ nome, passou, detalhe });
  diz(`${passou ? 'VERDE' : 'VERMELHO'}  ${nome}${detalhe !== undefined ? ` | ${JSON.stringify(detalhe)}` : ''}`);
};
const one = async (rotulo, query) => {
  const rows = await sql(query);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`INSTRUMENTO CEGO: ${rotulo} devolveu ${Array.isArray(rows) ? rows.length : typeof rows} linhas, esperava 1`);
  return rows[0];
};

diz('[1] schema de public.gate_badges');
const cols = await sql(`select a.attname as col, format_type(a.atttypid,a.atttypmod) as tipo
  from pg_attribute a where a.attrelid = to_regclass('public.gate_badges') and a.attnum > 0 and not a.attisdropped
  order by a.attnum;`);
if (cols.length === 0) throw new Error('INSTRUMENTO CEGO: gate_badges nao existe ou nao tem colunas');
const tem = (c) => cols.some((x) => x.col === c);
gate('colunas badge_token e active existem', tem('badge_token') && tem('active'), cols.map((c) => c.col));
const tipoToken = cols.find((c) => c.col === 'badge_token')?.tipo;

diz('\n[2] censo de linhas (contagem, nunca valor)');
const censo = await one('censo', `select count(*)::int as linhas,
  count(*) filter (where active)::int as activas,
  count(distinct badge_token::text)::int as tokens_distintos,
  count(*) filter (where badge_token is null)::int as tokens_nulos
  ${tem('created_at') ? ",count(*) filter (where created_at >= '2026-11-08T00:00'::timestamptz)::int as criadas_desde_08_11" : ''}
  from public.gate_badges;`);
diz('  ', JSON.stringify(censo));

diz('\n[3] controle positivo do predicado (o valor nunca sai do banco)');
if (censo.linhas > 0) {
  const ctrl = await one('controle', `select count(*)::int as casadas from public.gate_badges
    where badge_token::text = (select badge_token::text from public.gate_badges where badge_token is not null order by 1 limit 1);`);
  gate('predicado badge_token = <uuid> encontra uma linha que existe', ctrl.casadas >= 1, ctrl);
} else {
  diz('  NAO EXECUTAVEL: tabela vazia — o controle positivo nao pode correr; ver [6].');
}

diz('\n[4] o token do ciclo C2');
const porToken = await one('por-token', `select count(*)::int as casadas from public.gate_badges where badge_token::text = '${fx.badge_token}'::text;`);
gate('0 linhas com o badge_token do fixture', porToken.casadas === 0, porToken);
const porId = await one('por-id', `select count(*)::int as casadas from public.gate_badges where id::text = '${fx.badge}'::text;`);
gate('0 linhas com o id do badge do fixture', porId.casadas === 0, porId);
const alunosToken = tem('student_id')
  ? await one('por-aluno', `select count(*)::int as casadas from public.gate_badges where student_id::text = '${fx.student_uid}'::text;`)
  : null;
if (alunosToken) gate('0 badges para o aluno do fixture', alunosToken.casadas === 0, alunosToken);

diz('\n[5] o caminho que usa o token: RPC e superficie de leitura');
const rpc = await one('rpc', `select (position('badge_token' in p.prosrc) > 0) as usa_token,
  (position('active' in p.prosrc) > 0) as usa_active,
  length(p.prosrc)::int as chars, p.prosecdef as security_definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'register_gate_checkin';`);
diz('  ', JSON.stringify(rpc));
const acl = await one('acl', `select coalesce(c.relacl::text,'(null = defaults)') as acl, c.relrowsecurity as rls_on
  from pg_class c where c.oid = to_regclass('public.gate_badges');`);
diz('  acl:', redig(acl.acl), '| rls_on:', acl.rls_on);
const pols = await sql(`select pol.polname as nome, pol.polcmd as cmd,
  (position('anon' in array_to_string(pol.polroles::regrole[], ',')) > 0) as inclui_anon
  from pg_policy pol where pol.polrelid = to_regclass('public.gate_badges') order by 1;`);
diz('  policies:', pols.length, JSON.stringify(pols.map((p) => `${p.nome}:${p.cmd}${p.inclui_anon ? '/anon' : ''}`)));

diz('\n[6] superficie do anon sobre gate_badges (a chave anon esta no HTML publicado)');
const anon = await one('anon', `begin;
  set local role anon;
  select count(*)::int as linhas_visiveis from public.gate_badges;
  rollback;`);
diz('  ', JSON.stringify(anon));
gate('anon nao le nenhuma linha de gate_badges', anon.linhas_visiveis === 0, anon);

diz('\n[7] veredito');
const vivo = porToken.casadas > 0;
if (censo.linhas === 0) diz('  TABELA VAZIA: nenhum cracha existe no banco; o token do fixture nao pode estar vivo.');
else diz(`  ${vivo ? 'TOKEN VIVO — ha ' + porToken.casadas + ' linha(s) com o token do fixture' : 'TOKEN MORTO — 0 linhas com o token do fixture'} (linhas totais: ${censo.linhas}, activas: ${censo.activas})`);
const falhas = gates.filter((g) => !g.passou).map((g) => g.nome);
if (falhas.length) throw new Error(`PORTAO VERMELHO: ${falhas.join(' | ')}`);
writeFileSync(DIARIO, JSON.stringify({ em: new Date().toISOString(), modo: 'somente-leitura', tipo_token: tipoToken, censo, por_token: porToken, por_id: porId, por_aluno: alunosToken, rpc, acl: acl.acl, rls_on: acl.rls_on, policies: pols, anon, veredito: vivo ? 'TOKEN_VIVO' : 'TOKEN_MORTO', gates: gates.length, falhas }, null, 2) + '\n');
console.log(`\n${gates.length} portoes, 0 falhas. Diario: ${DIARIO}`);
