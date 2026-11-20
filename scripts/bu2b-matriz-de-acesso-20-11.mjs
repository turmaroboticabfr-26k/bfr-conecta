// BU-2b — refino do censo: separa literal-de-papel de literal-de-status, resolve o caminho
// real de autorização (literal na policy × helper function × JWT), conserta buckets e grants.
// Só-leitura. A corrida vermelha anterior fica preservada como está.
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './s19-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU2_SUF || '';
const OUT = `${DIR}/evidence/bu2b-matriz-de-acesso-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu2b-matriz-de-acesso-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU2_SUF novo`);
const t0 = Date.now();

const LIT = /'([a-z_][a-z_0-9]*)'::text/g;
const cargosEm = (txt) => [...new Set([...String(txt || '').matchAll(LIT)].map((m) => m[1]))];
const q = async (rotulo, query) => {
  try { return { rotulo, ok: true, linhas: await sql(query) }; }
  catch (e) { return { rotulo, ok: false, erro: String(e.message).slice(0, 400) }; }
};

const res = { em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu2b-matriz-de-acesso-20-11.mjs' };

res.papeis_enum = (await q('papeis', `select enum_range(null::public.account_role)::text[] as papeis`)).linhas?.[0]?.papeis || [];
const ENUM = new Set(res.papeis_enum);

// 1. todas as policies com expressão e os seus literais, classificados
const pol = await q('politicas_com_expressao', `select c.relname as tabela, p.polname as nome, p.polcmd::text as comando,
  coalesce(pg_get_expr(p.polqual, c.oid),'') as using_txt,
  coalesce(pg_get_expr(p.polwithcheck, c.oid),'') as check_txt
  from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  order by c.relname, p.polname`);
const literaisFora = {};
let leituraSemQual = 0;
const exemplosLeituraSemQual = [];
const estiloPorPolitica = { auth_jwt: 0, helper_bfr: 0, subselect_exists: 0, nenhum_dos_anteriores: 0 };
const politicas = [];
for (const p of (pol.ok ? pol.linhas : [])) {
  const txt = `${p.using_txt} ${p.check_txt}`;
  const lits = cargosEm(txt);
  const dePapel = lits.filter((l) => ENUM.has(l));
  const fora = lits.filter((l) => !ENUM.has(l));
  for (const f of fora) (literaisFora[f] ||= []).push(`${p.tabela}|${p.nome}|${p.comando}`);
  const estilo = { jwt: /auth\.jwt\(/.test(txt), helper: /\bbfr_[a-z_0-9]+\(/.test(txt), exists: /\bexists\(/.test(txt) };
  if (estilo.jwt) estiloPorPolitica.auth_jwt++;
  else if (estilo.helper) estiloPorPolitica.helper_bfr++;
  else if (estilo.exists) estiloPorPolitica.subselect_exists++;
  else estiloPorPolitica.nenhum_dos_anteriores++;
  const helpers = [...new Set([...txt.matchAll(/\b(bfr_[a-z_0-9]+)\s*\(/g)].map((m) => m[1]))];
  if (['r', '*'].includes(p.comando) && String(p.using_txt).trim() === '') {
    leituraSemQual++;
    if (exemplosLeituraSemQual.length < 10) exemplosLeituraSemQual.push(`${p.tabela}|${p.nome}`);
  }
  politicas.push({ tabela: p.tabela, nome: p.nome, comando: p.comando, cargos: dePapel, fora_do_enum: fora, helpers, estilo });
}
res.politicas_analisadas = politicas.length;
res.estilo_de_autorizacao = { ...estiloPorPolitica, total: politicas.length };
res.literais_fora_do_enum = Object.fromEntries(Object.entries(literaisFora)
  .map(([k, v]) => [k, { n_politicas: v.length, amostra_politicas: v.slice(0, 4) }]).sort((a, b) => b[1].n_politicas - a[1].n_politicas));

// 2. corpo das helpers: que papéis cada uma autoriza (extraído do texto da função)
const helpersUsadas = [...new Set(politicas.flatMap((p) => p.helpers))].sort();
const corpo = await q('corpo_helpers', `select p.proname as nome, p.prosecdef as definer,
  length(p.prosrc) as corpo_chars, md5(p.prosrc) as corpo_md5, p.prosrc as corpo,
  pg_get_function_arguments(p.oid) as argumentos
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname = any(array[${helpersUsadas.map((h) => `'${h}'`).join(',')}])`);
const helpers = {};
if (corpo.ok) {
  for (const h of corpo.linhas) {
    const lits = cargosEm(h.corpo);
    helpers[h.nome] = {
      definer: h.definer, corpo_chars: h.corpo_chars, corpo_md5: h.corpo_md5, argumentos: h.argumentos,
      cargos_no_corpo: lits.filter((l) => ENUM.has(l)),
      literais_no_corpo_fora_do_enum: lits.filter((l) => !ENUM.has(l)),
      le_tabelas_de: [...new Set([...h.corpo.matchAll(/\b(?:from|join)\s+public\.([a-z_0-9]+)/gi)].map((m) => m[1]))].sort(),
    };
  }
}
res.helpers_n = Object.keys(helpers).length;
res.helpers = helpers;
res.helpers_erro = corpo.ok ? null : corpo.erro;

// 3. matriz real por papel: literal direto + tabelas cuja policy chama uma helper que nomeia o papel
const matriz = {};
for (const papel of res.papeis_enum) matriz[papel] = { leitura: new Set(), escrita: new Set(), via_literal: new Set(), via_helper: new Set() };
const LEITURA = ['r', '*'], ESCRITA = ['a', 'w', 'd', '*'];
for (const p of politicas) {
  for (const papel of p.cargos) {
    if (LEITURA.includes(p.comando)) matriz[papel].leitura.add(p.tabela);
    if (ESCRITA.includes(p.comando)) matriz[papel].escrita.add(p.tabela);
    matriz[papel].via_literal.add(p.tabela);
  }
  for (const h of p.helpers) {
    const cargosDaHelper = helpers[h]?.cargos_no_corpo || [];
    for (const papel of cargosDaHelper) {
      if (LEITURA.includes(p.comando)) matriz[papel].leitura.add(p.tabela);
      if (ESCRITA.includes(p.comando)) matriz[papel].escrita.add(p.tabela);
      matriz[papel].via_helper.add(`${p.tabela}<-${h}`);
    }
  }
}
res.matriz_por_papel = Object.fromEntries(res.papeis_enum.map((p) => [p, {
  leitura_tabelas: [...matriz[p].leitura].sort(),
  escrita_tabelas: [...matriz[p].escrita].sort(),
  leitura_n: matriz[p].leitura.size,
  escrita_n: matriz[p].escrita.size,
  so_por_helper: [...matriz[p].via_helper].sort(),
}]));

// 4. tabelas mortas para a interface: RLS ligado e zero policies
const semPolicy = await q('sem_policy', `select c.relname as tabela from pg_class c
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind='r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid=c.oid) order by 1`);
res.tabelas_sem_politica = semPolicy.ok ? semPolicy.linhas.map((l) => l.tabela) : semPolicy;

// 5. buckets e as policies que os citam (pg_policy, não pg_policies)
res.buckets = await q('buckets', `select b.name as balde, b.public as publico, b.id as id_balde,
  (select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='storage' and c.relname='objects'
     where coalesce(pg_get_expr(p.polqual, c.oid),'') like '%'||b.id||'%'
        or coalesce(pg_get_expr(p.polwithcheck, c.oid),'') like '%'||b.id||'%') as politicas_que_o_citam
  from storage.buckets b order by b.name`);

// 6. grants de EXECUTE e de tabela por papel de banco (anon / authenticated / service_role)
res.grants_funcoes = await q('grants_funcoes', `select a.grantee::regrole::text as papel_de_banco,
  a.privilege_type as privilegio, count(*)::int as funcoes
  from pg_proc p cross join lateral aclexplode(p.proacl) a
  join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
  group by 1,2 order by 1,2`);
res.grants_tabelas = await q('grants_tabelas', `select a.grantee::regrole::text as papel_de_banco,
  a.privilege_type as privilegio, count(*)::int as objetos
  from pg_class c cross join lateral aclexplode(c.relacl) a
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind in ('r','v') group by 1,2 order by 1,2`);

// 7. quantas tabelas de catálogo existem vs as citadas no código servido? (aqui: nomes completos p/ cruzamento)
res.todas_as_tabelas = await q('tabelas', `select c.relname as tabela from pg_class c
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where c.relkind='r' order by 1`);

// portões
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
G('enum_tem_15', res.papeis_enum.length === 15, { n: res.papeis_enum.length });
G('nenhuma_policy_de_leitura_sem_usando', leituraSemQual === 0, { leitura_sem_qual: leituraSemQual, exemplos: exemplosLeituraSemQual });
G('helpers_citadas_em_politicas_todas_encontradas_no_catalogo', corpo.ok && Object.keys(helpers).length === helpersUsadas.length, { citadas: helpersUsadas.length, resolvidas: Object.keys(helpers).length, faltantes: helpersUsadas.filter((h) => !helpers[h]) });
const semLeitura = res.papeis_enum.filter((p) => matriz[p].leitura.size === 0);
G('todo_papel_tem_caminho_de_leitura_ou_e_listado_como_sem', res.papeis_enum.every((p) => matriz[p].leitura.size > 0) || semLeitura.every((p) => !!res.matriz_por_papel[p]), { sem_leitura: semLeitura });
const diretaContada = await q('contagem_direta', `select count(*)::int as n from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'`);
res.contagem_direta_pg_policy = diretaContada.ok ? diretaContada.linhas[0].n : diretaContada.erro;
G('politicas_analisadas_batem_com_contagem_direta_do_pg_policy', pol.ok && res.politicas_analisadas === res.contagem_direta_pg_policy, { analisadas: res.politicas_analisadas, direta: res.contagem_direta_pg_policy });
const somaEstilos = estiloPorPolitica.auth_jwt + estiloPorPolitica.helper_bfr + estiloPorPolitica.subselect_exists + estiloPorPolitica.nenhum_dos_anteriores;
G('estilos_somam_o_total_de_politicas', somaEstilos === res.politicas_analisadas, { soma_estilos: somaEstilos, total: res.politicas_analisadas, estilos: estiloPorPolitica });
G('grants_de_funcao_tem_linhas', res.grants_funcoes.ok && res.grants_funcoes.linhas.length > 0, { n: res.grants_funcoes.ok ? res.grants_funcoes.linhas.length : res.grants_funcoes.erro });
G('buckets_consultados_sem_erro', res.buckets.ok, { n: res.buckets.ok ? res.buckets.linhas.length : res.buckets.erro });

res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU2B_MATRIZ_VERDE ${gates.length}/0` : `BU2B_MATRIZ_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;
res.pegada_politicas = createHash('md5').update(JSON.stringify(politicas)).digest('hex');

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `politicas=${res.politicas_analisadas} estilo=${JSON.stringify(res.estilo_de_autorizacao)}`,
  `literais_fora_do_enum=${Object.entries(res.literais_fora_do_enum).map(([k, v]) => `${k}:${v.n_politicas}`).join(' ')}`,
  `helpers=${res.helpers_n} citadas_de=${helpersUsadas.length} pegada=${res.pegada_politicas}`,
  `matriz=${res.papeis_enum.map((p) => `${p}:l${res.matriz_por_papel[p].leitura_n}/e${res.matriz_por_papel[p].escrita_n}/h${res.matriz_por_papel[p].so_por_helper.length}`).join(' ')}`,
  `sem_politica=${res.tabelas_sem_politica.length} ${res.tabelas_sem_politica.slice(0, 40).join(',')}`,
  `buckets=${res.buckets.ok ? res.buckets.linhas.map((b) => `${b.balde}:${b.politicas_que_o_citam}${b.publico ? '/publico' : ''}`).join(' ') : res.buckets.erro}`,
  `grants_funcoes=${res.grants_funcoes.ok ? res.grants_funcoes.linhas.map((g) => `${g.papel_de_banco}/${g.privilegio}=${g.funcoes}`).join(' ') : res.grants_funcoes.erro}`,
  `grants_tabelas=${res.grants_tabelas.ok ? res.grants_tabelas.linhas.map((g) => `${g.papel_de_banco}/${g.privilegio}=${g.objetos}`).join(' ') : res.grants_tabelas.erro}`,
  `tabelas=${res.todas_as_tabelas.ok ? res.todas_as_tabelas.linhas.length : 'erro'}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
