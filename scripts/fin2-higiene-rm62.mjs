// FIN-2 (peça 2) — RM-6.2 SOMENTE LEITURA. Re-emite do catálogo o que PEN-22/23/29/30/31 afirmam, sem
// digitar nenhum nome a partir da memória: as 3 tabelas ausentes, as colunas de `announcements` e os
// nomes das FKs vêm de `evidence/fin2b-ruins-catalogo.json`; as 6 vistas vêm de `evidence/rm14-censo-views.json`.
// Uma SELECT de pg_catalog por veredito, e a pegada do catálogo no início e no fim prova que nada foi escrito.
// Artefacto: evidence/fin2-higiene-rm62.json
import { readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";

const g = criarGates();
const fin2b = JSON.parse(readFileSync("evidence/fin2b-ruins-catalogo.json", "utf8"));
const censoViews = JSON.parse(readFileSync("evidence/rm14-censo-views.json", "utf8"));

// Pegada do catálogo: contagem + md5 da lista ordenada de relações. Se a passada escrever algo, muda.
// `relkind` é "char" (tipo de um byte), não text: concatenar sem cast dá 42725 "operator is not unique".
const pegada = async () => {
  const r = await sql(`
    select count(*)::int as total,
           md5(string_agg(n.nspname || '.' || c.relname || c.relkind::text, ',' order by n.nspname, c.relname)) as hash
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','v','m','p')`);
  return r[0];
};
const antes = await pegada();

const out = {
  em: new Date().toISOString(),
  tarefa: "FIN-2 — portão de higiene RM-6.2 sobre o catálogo (PEN-22, PEN-23) + vereditos PEN-29/30/31",
  metodo: "somente leitura (SELECT de pg_catalog/information_schema); pegada de catálogo antes == depois",
  origem: ["evidence/fin2b-ruins-catalogo.json", "evidence/rm14-censo-views.json"],
  pegada_antes: antes,
};

// ── PEN-22 ─────────────────────────────────────────────────────────────────────
// O Supabase dá EXECUTE a `anon` em função nova por padrão (docs §11 risco 3). `has_function_privilege`
// é a única resposta que vale: `proacl` nulo significa ACL do pg_default, e lê-la como texto diria
// "sem grantes" justamente nas funções que estão abertas.
out.pen22_funcoes = await sql(`
  select p.proname as nome,
         pg_get_userbyid(p.proowner) as dono,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
         array_to_string(p.proacl, '|') as proacl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
   order by p.proname`);
const abertas = out.pen22_funcoes.filter((f) => f.anon_execute);
out.pen22 = {
  total_funcoes: out.pen22_funcoes.length,
  com_execute_anon: abertas.length,
  com_execute_public: out.pen22_funcoes.filter((f) => f.public_execute).length,
  sem_execute_anon: out.pen22_funcoes.length - abertas.length,
  anon_nulas: out.pen22_funcoes.filter((f) => f.proacl === null || f.proacl === "").length,
  nomes_com_execute_anon: abertas.map((f) => f.nome),
};
g.gate("pen22_contas_somam_o_total",
  out.pen22.com_execute_anon + out.pen22.sem_execute_anon, out.pen22.total_funcoes);
// RM-6.8/PEN-25 atribuiu a causa ao inverso do que um `grant` faria: `anon` NÃO tem EXECUTE em
// "current_role"(), e é isso que transforma a qualificação em 42501 (fail-closed por privilégio).
// O portão mede a função nomeada — se ela sumir do catálogo, o veredito deixa de ser explicável.
const fnCurrentRole = await sql(`
  select has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'current_role'
     and (p.proargnames is null or p.pronargs = 0)`);
out.pen25_causa = fnCurrentRole;
g.gate("pen25_causa_current_role_sem_execute_para_anon_e_aberta_a_authenticated",
  fnCurrentRole.filter((r) => r.anon_execute === false && r.authenticated_execute === true).length >= 1, true);

// ── PEN-23 ─────────────────────────────────────────────────────────────────────
// `security_invoker` mora em pg_class.reloptions, não em pg_views — é ali que a view deixa de rodar
// como dono (BYPASSRLS). Os nomes conferidos são os do censo RM-1.4, re-emitidos daqui.
out.pen23_views = await sql(`
  select c.relname as nome,
         pg_get_userbyid(c.relowner) as dono,
         coalesce(array_to_string(c.reloptions, '|'), '') as reloptions,
         coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true'] as security_invoker
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
   order by c.relname`);
out.pen23 = {
  total_views: out.pen23_views.length,
  com_security_invoker: out.pen23_views.filter((v) => v.security_invoker).map((v) => v.nome),
  sem_security_invoker: out.pen23_views.filter((v) => !v.security_invoker).map((v) => v.nome),
  bypassrls_dono: out.pen23_views.filter((v) => !v.security_invoker).map((v) => `${v.nome}(${v.dono})`),
};
const nomesCenso = censoViews.linhas.map((v) => v.nome).sort();
g.gate("pen23_mesmos_nomes_do_censo_rm14", out.pen23_views.map((v) => v.nome).sort(), nomesCenso);
g.gate("pen23_total_views_bate_com_documento", out.pen23.total_views, 6);
g.gate("pen23_unica_com_security_invoker", out.pen23.com_security_invoker, ["support_professionals_directory"]);

// ── PEN-29 + a pergunta aberta do PEN-31: existe uma relação chamada `schools`? ──
// Varredura em TODOS os esquemas, não só `public`: se existir fora do `public` não é alcançável pelo
// PostgREST (schema cache), e aí o veredito muda de "nunca existiu" para "fora do alcance".
const nomesABuscar = [...new Set([...fin2b.tabelas_ausentes, "schools", "sports_schools"])];
out.referencias = await sql(`
  select n.nspname as esquema, c.relname as relacao, c.relkind as tipo
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relname = any(array[${nomesABuscar.map((t) => `'${t}'`).join(",")}])
   order by c.relname, n.nspname`);
// O alias do SELECT é `tipo`; ler `r.relkind` aqui dava `esquema.undefined` e o veredito impresso
// perderia justamente o que interessa (relkind 'r' = tabela existe, só falta a FK).
const porNome = Object.fromEntries(nomesABuscar.map((t) =>
  [t, out.referencias.filter((r) => r.relacao === t).map((r) => `${r.esquema}.${r.tipo}`)]));
out.perguntas_abertas = {
  tabela_pen29_ausente_em_todo_o_catalogo: nomesABuscar.slice(0, 3).map((t) => ({ [t]: porNome[t] })),
  public_schools_existe: porNome.schools.length > 0 ? `SIM → ${porNome.schools.join(",")}` : "NAO",
  sports_schools_existe: porNome.sports_schools.length > 0 ? `SIM → ${porNome.sports_schools.join(",")}` : "NAO",
};
g.gate("pen29_tres_tabelas_nao_existem_em_esquema_algum",
  nomesABuscar.slice(0, 3).filter((t) => (porNome[t] || []).length === 0).length, 3);

// O PEN-31 só se sustenta se a FK realmente apontar para `sports_schools` — o nome é lido do artefacto
// da passada anterior e conferido contra pg_constraint, com o esquema qualificado (regclass sem
// qualificar foi a armadilha da vez anterior).
const fksPesquisadas = (out.fks_supervision = await sql(`
  select con.conname as fk,
         (select a.attname from pg_attribute a
           where a.attrelid = con.conrelid and a.attnum = con.conkey[1]) as coluna_local,
         n2.nspname as esquema_alvo, c2.relname as relacao_alvo
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class c2 on c2.oid = con.confrelid
    join pg_namespace n2 on n2.oid = c2.relnamespace
   where n.nspname = 'public' and c.relname = 'supervision_requests' and con.contype = 'f'
   order by con.conname`));
out.fks_pen31 = fksPesquisadas.map((f) => `${f.fk}: ${f.coluna_local} → ${f.esquema_alvo}.${f.relacao_alvo}`);
const fkArtefacto = (fin2b.fks_de.supervision_requests || []).map((f) => `${f.fk} → ${f.para}`).sort();
g.gate("pen31_alvos_de_fk_dizem_o_mesmo_que_o_artefacto",
  fksPesquisadas.map((f) => `${f.fk} → ${f.relacao_alvo}`).sort(), fkArtefacto);
g.gate("pen31_nao_existe_fk_para_schools",
  fksPesquisadas.some((f) => f.relacao_alvo === "schools" && f.esquema_alvo === "public"), false);

// ── PEN-30 — a coluna pedida pelo ar não está no catálogo ──────────────────────
const colsAnn = out.colunas_announcements = (await sql(`
  select column_name, data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'announcements' order by ordinal_position`))
  .map((c) => c.column_name);
out.pen30 = {
  created_at_presente: colsAnn.includes("created_at"),
  publicadas_e_atualizadas: ["published_at", "updated_at"].filter((c) => colsAnn.includes(c)),
  colunas: colsAnn,
};
g.gate("pen30_created_at_nao_existe_em_announcements", out.pen30.created_at_presente, false);
g.gate("pen30_published_at_e_updated_at_existem", out.pen30.publicadas_e_atualizadas, ["published_at", "updated_at"]);
g.gate("pen30_mesmas_colunas_do_artefacto_fin2b", colsAnn, fin2b.colunas.announcements);

const depois = await pegada();
console.log(`pegada catálogo antes=${antes.total}/${antes.hash.slice(0, 12)} depois=${depois.total}/${depois.hash.slice(0, 12)}`);
g.gate("nao_escrita_pegada_de_catalogo_igual", depois, antes);
out.pegada_depois = depois;
out.portoes = g.resumo();
writeFileSync("evidence/fin2-higiene-rm62.json", JSON.stringify(out, null, 2) + "\n");

const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`pen22: ${out.pen22.total_funcoes} funções · EXECUTE a anon em ${out.pen22.com_execute_anon} · a public em ${out.pen22.com_execute_public}`);
console.log(`pen23: ${out.pen23.total_views} views · security_invoker em ${out.pen23.com_security_invoker.length} · definer/BYPASSRLS em ${out.pen23.sem_security_invoker.length}`);
console.log(`escolas: public.schools = ${out.perguntas_abertas.public_schools_existe} · sports_schools = ${out.perguntas_abertas.sports_schools_existe}`);
console.log(`FKs de supervision_requests: ${out.fks_pen31.join(" · ") || "nenhuma"}`);
if (falhas.length === 0) { console.log(`FIN2_HIGIENE_VERDE ${portoes} portões / 0 falhas · artefacto evidence/fin2-higiene-rm62.json`); process.exit(0); }
console.log(`FIN2_HIGIENE_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
