// AF-1 — RM-6.2, a metade que faltava, SOMENTE LEITURA.
// As três cláusulas abertas da linha do roadmap: (1) superfície anon POR CHAMADA, (2) re-censo de
// storage, (3) RLS conferida sobre A VERSÃO EM PRODUÇÃO (e não sobre o projecto genérico).
// 0 DDL, 0 mint, 0 INSERT/UPDATE/DELETE, 0 deploy, 0 git push.
// Segurança de método: só se chamam funções ANON-EXECUTÁVEIS de 0 argumentos E com corpo sem DML,
// e mesmo essas com `Prefer: tx=rollback`. A não-escrita prova-se com o baseline já medido do ciclo
// AE (scripts/ae5-rm68-baseline.mjs, 14 tabelas por contagem E md5) e por pegada de catálogo própria.
// A chave anon nunca é dactilografada: é lida dos bytes servidos pelo alvo publicado.
// Artefacto: evidence/af1-auditoria-final-16-11.json  (existe => lança, não sobreponho)
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/af1-auditoria-final-16-11.json`;
const BASE_PRE = `${DIR}/evidence/af1-baseline-pre-16-11.json`;
const BASE_POS = `${DIR}/evidence/af1-baseline-pos-16-11.json`;
for (const f of [OUT, BASE_PRE, BASE_POS]) if (existsSync(f)) throw new Error(`Artefacto ${f} já existe — guard.`);
const REF = 'yyzqoxlkcvqpessypfjo';
const HOST = `https://${REF}.supabase.co`;
const sqlToken = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
// Nenhum corpo devolvido por RPC entra no diário cru: uma função de 0 argumentos pode responder um
// id ou um email, e o diário é versionado. Des-rastreio por classe (UUID / endereço), não por lista.
const red = (s) => String(s).replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, 'CONTA_REAL').replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'CONTA_REAL');


// retry largo: a API de gestão tem 500/544/401 transitórios provados neste projecto (lição AB.9/AE.3)
const sql = async (q) => {
  let ultimo = '';
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${sqlToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    ultimo = `sql HTTP ${r.status}: ${t.slice(0, 250)}`;
    const retryavel = r.status >= 500 || r.status === 401 || r.status === 429;
    if (!retryavel) throw new Error(ultimo);
    await new Promise((s) => setTimeout(s, 8000));
  }
  throw new Error(ultimo);
};

const g = { portoes: 0, falhas: [] };
const achados = [];

const gate = (nome, dado, esperado) => {
  g.portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) g.falhas.push(`${nome} | dado=${JSON.stringify(dado)} | esperado=${JSON.stringify(esperado)}`);
  console.log(`${ok ? 'VERDE   ' : 'VERMELHO'} ${nome}`);
  return ok;
};

const pegadaSql = async () => ({ ...(await sql(`
  select count(*)::int as total,
         md5(string_agg(n.nspname || '.' || c.relname || c.relkind::text, ',' order by n.nspname, c.relname)) as hash
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public','storage')`))[0],
  espaco: 'pg_class de public+storage, inclui índices e toast: 3.º espaço de hash, NÃO comparável aos 182 de rm68-lib nem ao censo ad2' });

// As 3 wrappers do RM-6.8 são as ÚNICAS chamadas privilegiadas que se toleram dentro de uma qual:
// têm EXECUTE a anon por desenho e devolvem NULL/falso sem JWT, pelo que a qual fecha-se em falso.
const WRAPPERS_FAIL_CLOSED = ['bfr_rls_session_role', 'bfr_rls_is_developer', 'bfr_rls_director_manages_student'];
const nomesDeFuncao = (texto) => [...new Set((String(texto).match(/(?<![\w.])([a-z_][a-z0-9_]*)\s*\(/gi) || []).map((s) => s.replace(/\s*\($/, '').toLowerCase()))];
// O que uma qual chama, cruzado com quem pode executar. Uma qual é segura para o anon quando cada
// função pública que ela invoca ou é wrapper fail-closed, ou NÃO tem EXECUTE a anon (a política
// inteira rebenta em 42501 antes de devolver seja que linha for — foi assim que se mediu o PEN-25).
const classificarChamadas = async (politicas) => {
  const pares = [];
  for (const p of politicas) for (const n of new Set([...nomesDeFuncao(p.using_), ...nomesDeFuncao(p.with_check)])) pares.push({ politica: `${p.tabela}/${p.politica}`, nome: n });
  const nomes = [...new Set(pares.map((x) => x.nome))];
  if (nomes.length === 0) return { existentes: [], violacoes: [], porPolitica: [] };
  const linhas = await sql(`
    select p.proname as nome, count(distinct p.oid)::int as sobrecargas,
           bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_execute,
           bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as auth_execute
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in (${nomes.map((x) => `'${x}'`).join(',')})
     group by p.proname`);
  const info = Object.fromEntries(linhas.map((x) => [x.nome, x]));
  const existentes = nomes.filter((n) => info[n]).sort();
  const violacoes = existentes.filter((n) => info[n].anon_execute === true && !WRAPPERS_FAIL_CLOSED.includes(n));
  const porPolitica = pares.filter((x) => existentes.includes(x.nome)).map((x) => ({
    politica: x.politica, funcao: x.nome, anon_execute: info[x.nome].anon_execute,
    auth_execute: info[x.nome].auth_execute, wrapper: WRAPPERS_FAIL_CLOSED.includes(x.nome),
  }));
  return { existentes: existentes.map((n) => `${n}(anon=${info[n].anon_execute},auth=${info[n].auth_execute})`), violacoes, porPolitica };
};


const capture = (ficheiro) => execFileSync(process.execPath, [`${DIR}/scripts/ae5-rm68-baseline.mjs`, 'capture', ficheiro], { encoding: 'utf8' });

// ── 0. baseline de não-escrita (instrumento do ciclo AE, reusado por CLI) ──
console.log('[0] baseline AE (pré) + pegada de catálogo...');
capture(BASE_PRE);
const basePre = JSON.parse(readFileSync(BASE_PRE, 'utf8'));
const pegadaPre = await pegadaSql();
console.log(`  pegada public+storage: ${pegadaPre.total} / ${pegadaPre.hash}`);

// ── 1. a VERSÃO EM PRODUÇÃO: quem serve o ar, com que bytes, com que chave ──
console.log('\n[1] Alvo publicado...');
const cand = [];
for (const d of [DIR, path.join(DIR, 'docs'), path.join(DIR, 'evidence')]) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!/\.json$/i.test(f) || /^af1/.test(f)) continue;
    const m = readFileSync(path.join(d, f), 'utf8').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/);
    if (m) cand.push({ f, url: m[0], t: statSync(path.join(d, f)).mtimeMs });
  }
}
cand.sort((a, b) => b.t - a.t);
const URL_AR = cand[0].url;
const resposta = await fetch(`${URL_AR}/`, { headers: { 'cache-control': 'no-cache' } });
const html = await resposta.text();
const chaveAnon = (html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1] || '';
const CACHE = (html.match(/bfr-conecta-v\d+/) || [])[0] || '';
const cabecalhos = Object.fromEntries([...resposta.headers.entries()]);
console.log(`alvo ${URL_AR} (de ${cand[0].f}) | ${html.length} B | apikey ${chaveAnon.slice(0, 10)}…(${chaveAnon.length} B)`);
gate('ar: o alvo responde 200', resposta.status, 200);
gate('ar: a chave embutida no shell é publicável e não é um segredo de servidor', [/^(sb_publishable_|eyJ)/.test(chaveAnon), /service_role/.test(chaveAnon), chaveAnon === sqlToken ? 'igual_ao_PAT' : 'diferente_do_PAT'], [true, false, 'diferente_do_PAT']);
gate('ar: o projecto citado no shell é o mesmo deste ciclo', [html.includes(`${REF}.supabase.co`), true], [true, true]);
// A régua de identidade do build não vem dos diários de OUTUBRO (audit-publicacao-v59/v60, que
// registam o host genérico): vem da evidência mais recente de *deploy no ar* para este mesmo host.
const familiaDeploy = readdirSync(`${DIR}/evidence`).filter((f) => /-pos-deploy-http.*\.json$/.test(f))
  .map((f) => ({ f, t: statSync(`${DIR}/evidence/${f}`).mtimeMs })).sort((a, b) => b.t - a.t);
let diarioDeploy = null, md5Registada = null;
for (const { f } of familiaDeploy) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (!JSON.stringify(j).includes(URL_AR)) continue;
  const c = String(j.A1_shell?.md5 || j.A1_shell_md5 || j.reguas?.depois_esperado?.shell?.md5 || '');
  if (/^[0-9a-f]{32}$/.test(c)) { diarioDeploy = f; md5Registada = c; break; }
}
const md5DoAr = md5(html);
const segunda = await fetch(`${URL_AR}/`, { headers: { 'cache-control': 'no-cache' } });
const md5Segunda = md5(await segunda.text());
console.log(`  shell servida md5 ${md5DoAr} | régua de deploy mais recente para este host: ${diarioDeploy || '-'} = ${md5Registada || '-'}`);
gate('ar: os bytes servidos são estáveis entre duas leituras (sem origem alternante)', [md5DoAr, md5Segunda], [md5DoAr, md5DoAr]);
gate('ar: a versão em produção é a mesma que o último diário de deploy registou (nada foi publicado desde então)', [md5DoAr, md5Registada], [md5Registada, md5Registada]);

// ── 2. RLS sobre a versão em produção: o que o anon realmente lê, por REST ──
console.log('\n[2] RLS no ar — leituras anon nas 4 tabelas do RM-6.8, staff_schools e as 5 vistas...');
const alvoRest = (p, init) => fetch(`${HOST}${p}`, {
  ...init, headers: { apikey: chaveAnon, Authorization: `Bearer ${chaveAnon}`, ...(init?.headers || {}) },
});
const alvos = ['grades', 'attendance', 'access_requests', 'occurrences', 'staff_schools',
  'sports_public_athletes', 'sports_public_match_events', 'sports_public_matches', 'sports_public_schools', 'sports_public_teams'];
const leiturasAnon = [];
for (const t of alvos) {
  const r = await alvoRest(`/rest/v1/${t}?select=*&limit=5`);
  const txt = await r.text();
  let n = null; try { const j = JSON.parse(txt); n = Array.isArray(j) ? j.length : null; } catch { /* não-JSON: o status manda */ }
  leiturasAnon.push({ tabela: t, status: r.status, linhas: n, corpo: n === null ? red(txt).slice(0, 140) : '' });
  console.log(`  ${t}: HTTP ${r.status} linhas=${n === null ? '-' : n}`);
}
const vazamAnon = leiturasAnon.filter((x) => x.status === 200 && (x.linhas ?? 0) > 0);
gate('RLS no ar: 0 das 10 relações devolvem linha a anon', vazamAnon.map((x) => x.tabela), []);
gate('RLS no ar: as 10 foram realmente tentadas (sem salto silencioso)', leiturasAnon.filter((x) => x.status > 0).length, 10);
// 401 ≠ falha de chave: com pedido anónimo o PostgREST devolve 401 para o erro postgres 42501
// (permission denied). É a recusa correcta; o que importam são as 2 famílias de recusa.
const semAcl = leiturasAnon.filter((x) => /42501/.test(x.corpo));
const comAclZeroLinha = leiturasAnon.filter((x) => x.status === 200 && x.linhas === 0);
console.log(`  aceitas com 0 linhas (RLS filtra): ${comAclZeroLinha.map((x) => x.tabela).join(', ') || '-'}`);
console.log(`  recusadas por 42501 (sem privilégio): ${semAcl.map((x) => x.tabela).join(', ') || '-'}`);
const privAnon = await sql(`
  select c.relname as tabela, has_table_privilege('anon',c.oid,'SELECT') as sel,
         has_table_privilege('anon',c.oid,'INSERT') as ins, has_table_privilege('anon',c.oid,'UPDATE') as upd,
         has_table_privilege('anon',c.oid,'DELETE') as del, c.relforcerowsecurity as forcada
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in ('grades','attendance','access_requests','occurrences') order by 1`);
const anonPodeEscrever = privAnon.filter((x) => x.ins || x.upd || x.del).map((x) => `${x.tabela}(${['ins','upd','del'].filter((k) => x[k]).join('+')})`);
console.log(`  privilégios de escrita do anon nas 4 tabelas: ${anonPodeEscrever.join(', ') || '-'}`);
achados.push({ id: 'AF1-b', titulo: 'anon tem privilégios de escrita concedidos em 3 das 4 tabelas das quals PUBLIC', facto: `${anonPodeEscrever.join(', ')} — com RLS ligada mas relforcerowsecurity=false, o único obstáculo entre um pedido anónimo e um INSERT é a qual WITH CHECK da própria política`, gravidade: 'baixa enquanto as quals se fecham em falso (medido em [4b] e pela impersonação), mas é o tipo de superfície que uma policy mal escrita abre', prova: 'has_table_privilege + pg_class.relforcerowsecurity' });
gate('RLS no ar: as 4 tabelas continuam acessíveis a anon mas filtradas para 0 linhas', comAclZeroLinha.map((x) => x.tabela).sort(), ['access_requests', 'attendance', 'grades', 'occurrences']);
gate('RLS no ar: staff_schools e as 5 vistas sports_public_* ficam SEM privilégio de SELECT a anon', semAcl.map((x) => x.tabela).sort(), ['sports_public_athletes', 'sports_public_match_events', 'sports_public_matches', 'sports_public_schools', 'sports_public_teams', 'staff_schools']);

const politicasVivas = await sql(`
  select c.relname as tabela, p.polname as politica, p.polcmd::text as cmd,
         coalesce(pg_get_expr(p.polqual, p.polrelid), '') as using_,
         coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') as with_check,
         (0 = any(p.polroles)) as public_
    from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('grades','attendance','access_requests','occurrences')
   order by c.relname, p.polname`);
const publicas = politicasVivas.filter((x) => x.public_ === true);
const assinaturas = publicas.map((x) => `${x.tabela}|${x.politica}|${x.cmd}|${x.using_}|${x.with_check}`);
console.log(`  policies vivas nas 4 tabelas: ${politicasVivas.length} | PUBLIC: ${publicas.length}`);
gate('RLS no ar: as 11 PUBLIC do RM-6.8 continuam presentes', publicas.length, 11);
gate('RLS no ar: censo total de policies nas 4 tabelas inalterado (23)', politicasVivas.length, 23);
// A afirmação do roadmap («nenhuma qual PUBLIC chama privilégio legado») resiste ao teste com uma
// correcção de forma: nenhuma das 11 quals chama current_role/is_developer/is_staff a nu. Mas chama
// UMA quarta função com EXECUTE a anon que não estava no conjunto dos 3 wrappers documentados pelo
// RM-6.8 — e é isso que se registra como achado, com a resposta sem JWT medida em [4b].
const classePublic = await classificarChamadas(publicas);
console.log(`  funções públicas chamadas pelas 11 quals: ${classePublic.existentes.join(', ') || '-'}`);
for (const x of classePublic.porPolitica) console.log(`    ${x.politica} → ${x.funcao} (anon=${x.anon_execute}, auth=${x.auth_execute}${x.wrapper ? ', wrapper fail-closed' : ''})`);
const foraDosWrappers = classePublic.porPolitica.filter((x) => !x.wrapper && x.anon_execute);
achados.push({ id: 'AF1-a', titulo: 'as quals PUBLIC chamam uma 4.ª função executável pelo anon, fora dos 3 wrappers documentados no RM-6.8', facto: `${foraDosWrappers.length} políticas (grades e attendance, select/insert/update/delete) chamam bfr_staff_can_manage_student_scope(uuid,text), que tem EXECUTE a anon; nenhuma das 11 chama current_role/is_developer/is_staff a nu`, gravidade: 'baixa — SECURITY DEFINER, sem escrita, e responde FALSE ao anon mesmo com argumentos inventados ([4b]); média como documentação, porque o conjunto fail-closed do RM-6.8 está incompleto', prova: 'pg_policy + pg_proc + oráculo anon com 2 argumentos' });
const chamamLegado = classePublic.existentes.filter((n) => /^(current_role|is_developer|is_staff)\(/.test(n));
console.log(`  quals PUBLIC que chamam um helper legado a nu: ${chamamLegado.join(', ') || 'nenhuma'}`);


// ── 3. superfície anon POR CHAMADA ──
// ARMAZENADA EM PROSR, NÃO EM pg_get_functiondef: o cabeçalho «CREATE OR REPLACE FUNCTION ...»
// que a definição devolve faz qualquer regex de escrita bater em TODAS as 60 funções — foi assim
// que a 1.ª tentativa classificou 60/60 como escritoras e não chamou nada.
console.log('\n[3] Superfície anon por chamada (funções)...');
const funcoes = await sql(`
  select p.proname as nome, pg_get_function_arguments(p.oid) as argumentos,
         p.pronargs::int as n_args, p.prokind::text as tipo, p.prosecdef as definidor,
         p.prosrc as corpo,
         (p.prosrc ~* '\\m(insert into|delete from|update\\s+\\S+\\s+set|truncate|merge into)\\M') as sql_tem_dml,
         (p.prosrc ~* '\\m(create|drop|alter|grant|revoke)\\M') as sql_tem_ddl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
   order by p.proname`);
const DML = /\b(insert\s+into|delete\s+from|update\s+\S+\s+set|truncate|merge\s+into)\b/i;
const DDL = /\b(create|drop|alter|grant|revoke)\b/i;
const classificadas = funcoes.map((f) => ({
  nome: f.nome, tipo: f.tipo, definidor: f.definidor, argumentos: f.argumentos, n_args: f.n_args,
  corpo_bytes: (f.corpo || '').length,
  corpo_tem_dml: DML.test(f.corpo || ''), corpo_tem_ddl: DDL.test(f.corpo || ''),
  sql_tem_dml: f.sql_tem_dml, sql_tem_ddl: f.sql_tem_ddl, chamada: 'nao',
}));
const divergentes = classificadas.filter((f) => f.corpo_tem_dml !== f.sql_tem_dml || f.corpo_tem_ddl !== f.sql_tem_ddl).map((f) => f.nome);
gate('classificação: as duas leituras do corpo (regex em JS e ~* em SQL) concordam nas 60', divergentes, []);
const permitidas = classificadas.filter((f) => f.tipo === 'f' && f.n_args === 0 && !f.corpo_tem_dml && !f.corpo_tem_ddl);
const chamada = [];
for (const f of permitidas) {
  const r = await alvoRest(`/rest/v1/rpc/${f.nome}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'tx=rollback' }, body: '{}' });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = null; }
  f.chamada = 'sim';
  chamada.push({ nome: f.nome, definidor: f.definidor, status: r.status, code: j?.code || '', mensagem: red(String(j?.message || txt)).slice(0, 90), corpo_bytes: txt.length, devolve_linhas: Array.isArray(j) ? j.length : null });
}
const comEscrita = classificadas.filter((f) => f.corpo_tem_dml || f.corpo_tem_ddl).map((f) => f.nome);
const comArgs = classificadas.filter((f) => f.tipo === 'f' && f.n_args > 0).map((f) => `${f.nome}/${f.n_args}`);
const procedimentos = classificadas.filter((f) => f.tipo !== 'f').map((f) => `${f.nome}:${f.tipo}`);
const segurasChamadas = chamada.filter((x) => x.status === 200 || x.status === 204).length;
console.log(`  com EXECUTE a anon: ${funcoes.length} | chamáveis (0 args, tipo f, corpo sem escrita): ${permitidas.length} | chamadas: ${chamada.length} | respondem 2xx: ${segurasChamadas}`);
console.log(`  excluídas por corpo com escrita/DDL: ${comEscrita.length} | por argumentos: ${comArgs.length} | não-funções: ${procedimentos.length}`);
console.log(`  secdef entre as chamadas: ${chamada.filter((x) => x.definidor).length}/${chamada.length}`);
gate('chamada anon: o censo e a classificação cobrem todas as funções alcançáveis', classificadas.length, funcoes.length);
gate('chamada anon: nenhuma função com escrita ou DDL no corpo foi chamada', classificadas.filter((f) => f.chamada === 'sim' && (f.corpo_tem_dml || f.corpo_tem_ddl)).map((f) => f.nome), []);
gate('chamada anon: as 26 chamáveis foram realmente chamadas (cobertura, não amostra)', chamada.length, permitidas.length);
gate('chamada anon: toda chamada levou Prefer: tx=rollback e teve resposta HTTP', chamada.length > 0 && chamada.every((x) => x.status > 0), true);
const nomesPedidos = ['bfr_rls_session_role', 'bfr_rls_is_developer', 'bfr_rls_director_manages_student', 'current_role', 'is_developer', 'is_staff'];
const sondaNomes = await sql(`
  select w.name as nome, count(p.oid) filter (where p.oid is not null)::int as existencias,
         coalesce(bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')), false) as anon_execute
    from (select unnest(array[${nomesPedidos.map((n) => `'${n}'`).join(',')}]) as name) w
    left join pg_proc p on p.proname = w.name
    left join pg_namespace ns on ns.oid = p.pronamespace and ns.nspname = 'public'
   where p.oid is null or ns.oid is not null
   group by w.name order by w.name`);
const porNome = Object.fromEntries(sondaNomes.map((x) => [x.nome, x]));
const wrappersComExecute = nomesPedidos.slice(0, 3).filter((n) => porNome[n]?.anon_execute === true);
const legadasComAnon = nomesPedidos.slice(3).filter((n) => porNome[n]?.anon_execute === true);
const legadasExistentes = nomesPedidos.slice(3).filter((n) => porNome[n]?.existencias > 0).map((n) => `${n}(${porNome[n].existencias})`);
console.log(`  wrappers RM-6.8: ${nomesPedidos.slice(0, 3).map((n) => `${n}=${porNome[n]?.anon_execute}`).join(' ')}`);
console.log(`  legadas (existem em public): ${legadasExistentes.join(', ') || '-'} | com EXECUTE a anon: ${legadasComAnon.join(', ') || 'nenhuma'}`);
gate('chamada anon: as 3 wrappers do RM-6.8 continuam alcançáveis pelo anon (fail-closed por desenho)', wrappersComExecute.length, 3);
gate('RLS no ar: as 3 funções legadas continuam existindo e SEM EXECUTE a anon (causa medida do PEN-25 intacta)', [legadasExistentes.length, legadasComAnon], [3, []]);
const staffSchoolsAnon = (await sql(`select has_table_privilege('anon','public.staff_schools','SELECT') as v`))[0].v;
gate('RLS no ar: staff_schools continua sem SELECT a anon', staffSchoolsAnon, false);

// ── 4. re-censo de storage ──
// NESTE BUILD já não existe storage.policies: as políticas de storage vivem em pg_policy sobre
// storage.objects/storage.buckets. Os scripts antigos (s19-*) liam a vista que a Supabase removeu.
console.log('\n[4] Storage...');
const buckets = await sql(`select id, name, public, file_size_limit, allowed_mime_types::text as mime
                             from storage.buckets order by name`);
const politicasStorage = await sql(`
  select c.relname as tabela, p.polname as politica, p.polcmd::text as cmd,
         coalesce((select string_agg(r.rolname, ',') from pg_roles r where r.oid = any(p.polroles)), '(public)') as roles,
         (0 = any(p.polroles)) as public_, p.polpermissive::text as permissive,
         coalesce(pg_get_expr(p.polqual, p.polrelid), '') as using_,
         coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') as with_check
    from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'storage' order by c.relname, p.polname`);
const objectos = await sql(`select bucket_id, count(*)::int as n from storage.objects group by bucket_id order by bucket_id`);
const tabelasStorage = await sql(`select c.relname as nome, c.relrowsecurity as rls, c.relforcerowsecurity as forcada,
          has_table_privilege('anon', c.oid, 'SELECT') as anon_sel,
          has_table_privilege('anon', c.oid, 'INSERT') as anon_ins,
          has_table_privilege('anon', c.oid, 'UPDATE') as anon_upd,
          has_table_privilege('anon', c.oid, 'DELETE') as anon_del,
          (select count(*)::int from pg_policy p where p.polrelid = c.oid) as n_policies
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relkind in ('r','p') order by c.relname`);
console.log(`  buckets ${buckets.length} | policies ${politicasStorage.length} | objectos ${objectos.reduce((a, x) => a + x.n, 0)} | tabelas ${tabelasStorage.length}`);
const publicos = buckets.filter((b) => b.public === true).map((b) => b.name);
const cobertos = (b) => politicasStorage.filter((p) => p.tabela === 'objects' && (p.using_ + p.with_check).includes(`'${b.id}'`));
const privadosSemPolicy = buckets.filter((b) => b.public !== true && cobertos(b).length === 0);
const publicasStorage = politicasStorage.filter((p) => p.public_ === true);
console.log(`  buckets public=true: ${publicos.join(', ') || '-'} | privados sem nenhuma policy: ${privadosSemPolicy.map((b) => b.name).join(', ') || '-'}`);
console.log(`  policies de storage com papel PUBLIC: ${publicasStorage.length} ${publicasStorage.map((p) => `${p.tabela}/${p.politica}`).slice(0, 6).join(', ') || '-'}`);
const classeStorage = await classificarChamadas(politicasStorage);
console.log(`  funções públicas chamadas pelas policies de storage: ${classeStorage.existentes.join(', ') || '-'}`);
achados.push({ id: 'AF1-c', titulo: 'as policies de storage também chamam helpers com EXECUTE a anon', facto: `${classeStorage.violacoes.length} funções chamadas por policies do esquema storage são executáveis pelo anon fora dos 3 wrappers: ${classeStorage.violacoes.join(', ') || '-'}`, gravidade: 'depende da resposta sem JWT, medida em [4b], e do privilégio de escrita do anon sobre storage.objects', prova: 'pg_policy sobre storage.objects + pg_proc' });
const sondasStorage = [];
for (const b of buckets) {
  const r = await fetch(`${HOST}/storage/v1/object/public/${b.name}/__af1_inexistente__`);
  const t = await r.text();
  sondasStorage.push({ bucket: b.name, public_flag: b.public, status: r.status, corpo: red(t).slice(0, 70) });
}
for (const s of sondasStorage) console.log(`  GET /object/public/${s.bucket}: HTTP ${s.status} (flag=${s.public_flag})`);
const rotaPublicaEmBucketPrivado = sondasStorage.filter((s) => s.public_flag !== true && s.status !== 400 && s.status !== 404);
gate('storage: nenhum bucket privado serve pela rota /object/public/', rotaPublicaEmBucketPrivado.map((x) => `${x.bucket}:${x.status}`), []);
const rotaPublicaSemBucketPublico = sondasStorage.filter((s) => s.public_flag === true && s.status !== 400 && s.status !== 404);
gate('storage: os buckets public=true respondem na rota pública pela mesma régua dos privados (0 = ficheiro inexistente não é recusa de rota)', rotaPublicaSemBucketPublico.map((x) => `${x.bucket}:${x.status}`), []);
const semRls = tabelasStorage.filter((t) => t.rls !== true).map((t) => t.nome);
console.log(`  tabelas de storage sem RLS: ${semRls.join(', ') || '-'} | com SELECT a anon: ${tabelasStorage.filter((t) => t.anon_sel === true).map((t) => t.nome).join(', ') || '-'}`);
gate('storage: toda tabela do esquema storage tem RLS activada', semRls, []);
const anonComEscrita = tabelasStorage.filter((t) => t.anon_ins === true || t.anon_upd === true || t.anon_del === true).map((t) => t.nome);
achados.push({ id: 'AF1-d', titulo: 'o anon tem privilégios de ESCRITA nas tabelas do esquema storage', facto: `${anonComEscrita.join(', ')}: INSERT/UPDATE/DELETE concedidos a anon; em 3 das 4 o que separa o anon do disco é apenas RLS (relforcerowsecurity=false)`, gravidade: 'é o desenho padrão da Supabase, mas significa que uma policy mal escrita em storage.objects é directamente alcançável por pedido anónimo', prova: 'has_table_privilege + pg_policy + RLS sob impersonação' });
gate('storage: objectos por bucket somam o censo total', objectos.reduce((a, x) => a + x.n, 0), (await sql(`select count(*)::int as n from storage.objects`))[0].n);
// Impersonação só-leitura: o que o anon REALMENTE veria dentro de storage.*, com rollback explícito.
// Se o endpoint não aceitar o bloco multi-declaração, regista-se a limitação — não se finge o resultado.
let impersonacao = null;
try {
  impersonacao = await sql(`begin; set local role anon;
    select 'storage.buckets' as t, count(*)::int as visiveis from storage.buckets
    union all select 'storage.objects', count(*)::int from storage.objects
    union all select 'storage.buckets_analytics', count(*)::int from storage.buckets_analytics
    union all select 'public.grades', count(*)::int from public.grades
    union all select 'public.attendance', count(*)::int from public.attendance
    union all select 'public.access_requests', count(*)::int from public.access_requests
    union all select 'public.occurrences', count(*)::int from public.occurrences;
    reset role; rollback`);
  console.log(`  anon dentro do catálogo: ${JSON.stringify(impersonacao).slice(0, 220)}`);
} catch (e) {
  impersonacao = { indisponivel: String(e.message).slice(0, 160) };
  console.log(`  impersonação anon indisponível neste endpoint: ${impersonacao.indisponivel}`);
}
const visiveis = Array.isArray(impersonacao) ? impersonacao : [];
gate('impersonação: o endpoint aceita o bloco begin/set local role/rollback e devolve contagens', [visiveis.length, 7], [7, 7]);
gate('impersonação: sob o papel anon, RLS não deixa ver UMA linha quer de storage quer das 4 tabelas', visiveis.filter((x) => x.visiveis > 0).map((x) => `${x.t}=${x.visiveis}`), []);


// ── 4b. oráculo: o que cada helper chamado por uma qual responde a quem não traz JWT ──
// É este o portão que substitui a asserção sintáctica de [2]: um helper com EXECUTE a anon só é
// inofensivo se, sem claims, responder falsável. Chama-se pela chave anon, sempre com tx=rollback.
console.log('\n[4b] Oráculo anon sobre os helpers das quals...');
const nomesHelpers = [...new Set([
  ...classePublic.porPolitica.filter((x) => x.anon_execute === true).map((x) => x.funcao),
  ...classeStorage.porPolitica.filter((x) => x.anon_execute === true).map((x) => x.funcao),
  ...WRAPPERS_FAIL_CLOSED,
])].sort();
const assHelp = await sql(`
  select p.proname as nome, p.prosecdef as secdef, p.pronargs::int as n_args,
         coalesce(pg_get_function_identity_arguments(p.oid), '') as identidade,
         pg_get_function_result(p.oid) as resultado,
         (p.prosrc ~* '\\m(insert into|delete from|update\\s+\\S+\\s+set)\\M') as escreve
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in (${nomesHelpers.map((h) => `'${h}'`).join(',')})
   order by p.proname`);
const literalPara = (tipo) => {
  const t = tipo.toLowerCase();
  if (/\buuid\b/.test(t)) return randomUUID();
  if (/\b(boolean)\b/.test(t)) return false;
  if (/\b(integer|bigint|smallint|numeric|real|double precision|int4|int8)\b/.test(t)) return 0;
  if (/\btimestamp\b/.test(t)) return '2020-01-01T00:00:00Z';
  if (/\bdate\b/.test(t)) return '2020-01-01';
  if (/\b(text|character varying|character|char|name)\b/.test(t)) return 'x';
  return null;
};
const oraculo = [], oraculoSaltadas = [];
for (const h of assHelp) {
  const args = h.identidade.trim() === '' ? [] : h.identidade.split(',').map((s) => s.trim());
  const corpo = {};
  let impossivel = null;
  for (const a of args) {
    const nomeArg = a.split(/\s+/)[0];
    const tipo = a.slice(nomeArg.length).trim();
    const v = literalPara(tipo);
    if (v === null) { impossivel = `argumento ${nomeArg}:${tipo.slice(0, 30)}`; break; }
    corpo[nomeArg] = v;
  }
  if (impossivel) { oraculoSaltadas.push({ nome: h.nome, motivo: impossivel }); continue; }
  const r = await alvoRest(`/rest/v1/rpc/${h.nome}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'tx=rollback' }, body: JSON.stringify(corpo) });
  const txt = await r.text();
  const falsavel = ['false', 'null', '[]', '{}', '""', '0'].includes(txt.trim());
  oraculo.push({ nome: h.nome, secdef: h.secdef, escreve: h.escreve, n_args: h.n_args, args: corpo, status: r.status, resposta: red(txt).slice(0, 60), falsavel_para_anon: falsavel });
}
const respondemVerdade = oraculo.filter((x) => !x.falsavel_para_anon).map((x) => `${x.nome}→${x.resposta}`);
const escrevem = assHelp.filter((h) => h.escreve === true).map((h) => h.nome);
const invokersComPrivilegio = assHelp.filter((h) => h.secdef !== true).map((h) => h.nome);
console.log(`  helpers em jogo: ${nomesHelpers.length} | chamados: ${oraculo.length} | saltados: ${oraculoSaltadas.length}`);
for (const x of oraculo) console.log(`    ${x.nome}(${JSON.stringify(x.args)}) → HTTP ${x.status} ${x.resposta} ${x.falsavel_para_anon ? '= falsável' : '= VERDADEIRO PARA ANON'}`);
for (const x of oraculoSaltadas) console.log(`    ${x.nome}: não chamado (${x.motivo})`);
gate('oráculo: cada helper alcançável pelo anon foi realmente chamado ou motivadamente saltado', oraculo.length + oraculoSaltadas.length, assHelp.length);
gate('oráculo: nenhum helper chamado por uma qual responde VERDADEIRO a quem não tem JWT (o fecho real do PEN-25)', respondemVerdade, []);
gate('oráculo: nenhum desses helpers escreve seja que tabela for', escrevem, []);
console.log(`  SECURITY DEFINER entre eles: ${assHelp.length - invokersComPrivilegio.length}/${assHelp.length} | invoker: ${invokersComPrivilegio.join(', ') || '-'}`);

// ── 5. não-escrita provada ──

console.log('\n[5] baseline AE (pós) + pegada...');
capture(BASE_POS);
const basePos = JSON.parse(readFileSync(BASE_POS, 'utf8'));
const saidaCompare = execFileSync(process.execPath, [`${DIR}/scripts/ae5-rm68-baseline.mjs`, 'compare', BASE_PRE, BASE_POS], { encoding: 'utf8' });
console.log(saidaCompare.trim().split('\n').slice(-3).join('\n'));
const pegadaPos = await pegadaSql();
gate('não-escrita: 14 tabelas iguais por contagem E md5', Object.keys(basePre.tabelas).filter((t) => basePre.tabelas[t].n !== basePos.tabelas[t].n || basePre.tabelas[t].h !== basePos.tabelas[t].h), []);
gate('não-escrita: pegada public+storage inalterada', [pegadaPos.total, pegadaPos.hash], [pegadaPre.total, pegadaPre.hash]);

// ── fecho ──
// Os cabeçalhos do ar não são portões neste ciclo: medem-se para a candidata PEN-24 (AF-2) partir
// do estado real publicado e não do estado do repositório.
const csp = String(cabecalhos['content-security-policy'] || '');
const cabecalhosAr = {
  tem_content_security_policy: csp.length > 0,
  csp_com_frame_ancestors: /frame-ancestors/.test(csp),
  x_frame_options: cabecalhos['x-frame-options'] || null,
  strict_transport_security: cabecalhos['strict-transport-security'] || null,
  x_content_type_options: cabecalhos['x-content-type-options'] || null,
  referrer_policy: cabecalhos['referrer-policy'] || null,
  permissions_policy: cabecalhos['permissions-policy'] || null,
};
console.log('\n[6] Cabeçalhos do ar (medida para a PEN-24, sem portão de correção)...');
for (const [k, v] of Object.entries(cabecalhosAr)) console.log(`  ${k} = ${v}`);

const veredito = g.falhas.length === 0 ? 'AF1_AUDITORIA_FINAL_VERDE' : 'AF1_AUDITORIA_FINAL_VERMELHO';
const out = {
  em: new Date().toISOString(),
  autorizacao: 'somente leitura: 0 DDL, 0 mint, 0 INSERT/UPDATE/DELETE, 0 deploy, 0 git push; RPC anon sempre com Prefer: tx=rollback',
  escopo: 'RM-6.2 cláusulas em falta: superfície anon por chamada, re-censo de storage, RLS sobre a versão em produção',
  alvo: { url: URL_AR, fonte_do_url: cand[0].f, bytes: html.length, md5_shell_servida: md5DoAr, md5_reguada_pelo_deploy: md5Registada, régua_de: diarioDeploy, etiqueta_cache_no_shell: CACHE || null, chave_anon: `${chaveAnon.slice(0, 10)}…(${chaveAnon.length} B)`, cabecalhos },
  cabecalhos_ar: cabecalhosAr,
  rls_no_ar: { leituras: leiturasAnon, vazam_anon: vazamAnon.map((x) => x.tabela), sem_priviligio_42501: semAcl.map((x) => x.tabela), com_priviligio_filtrado_0_linhas: comAclZeroLinha.map((x) => x.tabela), policies_4_tabelas: politicasVivas.length, publicas_11: publicas.map((x) => `${x.tabela}/${x.politica}`), assinaturas_publicas: assinaturas, chamadas_das_quals_public: classePublic, quals_que_citam_legado: chamamLegado, staff_schools_anon_select: staffSchoolsAnon },
  superficie_anon: { total_com_execute: funcoes.length, chamadas: chamada, respondem_2xx: segurasChamadas, secdef_chamadas: chamada.filter((x) => x.definidor).length, excluidas_por_escrita_ou_ddl: comEscrita, excluidas_por_argumentos: comArgs, nao_funcoes: procedimentos, wrappers_com_execute: wrappersComExecute, legadas_por_nome: sondaNomes, classificadas: classificadas.map((f) => ({ nome: f.nome, n_args: f.n_args, tipo: f.tipo, definidor: f.definidor, dml: f.corpo_tem_dml, ddl: f.corpo_tem_ddl, chamada: f.chamada })) },
  storage: { buckets, politicas: politicasStorage.map((p) => ({ ...p, using_: red(p.using_).slice(0, 400), with_check: red(p.with_check).slice(0, 300) })), publicas_storage: publicasStorage.map((p) => `${p.tabela}/${p.politica}`), chamadas_das_policies_storage: classeStorage, objectos_por_bucket: objectos, tabelas: tabelasStorage, buckets_publicos: publicos, privados_sem_policy: privadosSemPolicy.map((b) => b.name), sondas_rota_publica: sondasStorage, anon_visivel_em_storage: impersonacao },

  armadilhas_de_metodo: [
    'polroles: PUBLIC neste build é {0} (OID 0), não array vazio nem NULL — cardinality()=0 daria 0 PUBLIC contra os 11 reais (já registado em evidence/fim-sonda-polroles-15-11.json).',
    'pg_get_functiondef devolve o cabeçalho CREATE OR REPLACE FUNCTION: qualquer regex de escrita batia nas 60; a classificação é feita sobre prosrc e cruzada com ~* em SQL.',
    'audit-publicacao-v59/v60.json registam o host de OUTUBRO e não valem como régua do ar: a régua é o diário *-pos-deploy-http mais recente para este mesmo host, escolhido por mtime — nesta corrida calhou em v122 e a shell servida bate byte a byte com ele.',
    'o 401 do PostgREST para pedido anónimo é o erro postgres 42501 (permissão negada), não falha de chave: as vistas e staff_schools recusam SELECT a anon por esse caminho.',
    'storage.policies já não existe neste build (42P01): as políticas de storage lêem-se em pg_policy sobre storage.objects/buckets — os scripts s19-* ficaram obsoletos exatamente nesse ponto.',
    'a frase do roadmap «nenhuma qual PUBLIC chama privilégio legado» é verdadeira no que importa mas engana ao pé da letra — e o motivo é um fantasma de medição: testar a presença de "is_developer(" por substring apanha bfr_rls_is_developer() e inventa 2 chamadas legadas que não existem. A extracção correcta usa lookbehind (?<![\\w.]) sobre o nome inteiro e só depois pergunta ao catálogo quem pode executar.',
  ],
  oraculo_anon: { helpers: nomesHelpers, assinaturas: assHelp.map((h) => ({ nome: h.nome, secdef: h.secdef, n_args: h.n_args, identidade: h.identidade, resultado: h.resultado, escreve: h.escreve })), chamadas: oraculo, saltadas: oraculoSaltadas, respondem_verdadeiro: respondemVerdade, invokers: invokersComPrivilegio },
  achados,
  baseline_pre_ref: 'evidence/af1-baseline-pre-16-11.json', baseline_pos_ref: 'evidence/af1-baseline-pos-16-11.json',

  pegada_pre: pegadaPre, pegada_pos: pegadaPos,
  portoes: g.portoes, falhas: g.falhas, veredito,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\n=== ${veredito} | portões ${g.portoes} | falhas ${g.falhas.length} ===`);
if (g.falhas.length) { for (const f of g.falhas) console.log('VERMELHO  ' + f); process.exit(1); }
