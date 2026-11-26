// FIN-2 (peça 2) — RM-6.2 SOMENTE LEITURA. Re-emite do catálogo o que PEN-22/23/29/30/31 afirmam, sem
// digitar nenhum nome a partir da memória: as 3 tabelas ausentes, as colunas de `announcements` e os
// nomes das FKs vêm de `evidence/fin2b-ruins-catalogo.json`; as vistas da baseline vêm de
// `evidence/rm14-censo-views.json`. Ambos são INSTANTÂNEOS de 12/11, não o que o roadmap afirma hoje: a
// igualdade contra um instantâneo velho chumba para sempre que o catálogo cresce (medido 25/11 na corrida
// sm71b: 4 vermelhos, 3 deles desse tipo) e apaga o sinal das cláusulas que ainda mordem. Ver §SM.71.
// Uma SELECT de pg_catalog por veredito, e a pegada do catálogo no início e no fim prova que nada foi escrito.
// Artefacto: por argumento — `node scripts/fin2-higiene-rm62.mjs evidence/fin2-higiene-rm62-<data>.json`.
// ARMADILHA MEDIDA 16/11 (achados AF1-e/AF1-f de §AF) — este script gravava sempre no mesmo caminho e
// sem defesa, e a corrida de re-emissão sobrepor-se-ia à régua de 12/11 que o roadmap cita. Agora o
// destino é argumento e um ficheiro existente nunca se sobrepõe, igual ao `rm68-recon-quals.mjs` de 15/11.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql, criarGates } from "./c2-lib.mjs";

// ── Réguas puras, usadas pelas clausulas e pelo modo --fixtures (sem banco) ──
// Porque existem: tres dos quatro vermelhos da corrida sm71b nao eram falhas do catalogo, eram expectativas
// congeladas num instantaneo de 12/11. Uma igualdade contra um instantaneo velho nao tem positivo quando o
// catalogo cresce de forma licita, e um portao permanentemente vermelho nao protege nada: so abafa as
// clausulas que ainda mordem. Separei em eixos distintos: (a) nada do que a baseline tem pode ter sumido;
// (b) a propriedade de seguranca vale sobre o conjunto vivo todo; (c) a deriva e reportada com nomes.
function semRepetidos(lista) { return [...new Set(lista)]; }
function derivadasDaBaseline(baseline, vivo) {
  const b = semRepetidos(baseline), v = semRepetidos(vivo);
  return { so_no_vivo: v.filter((n) => !b.includes(n)).sort(), so_na_baseline: b.filter((n) => !v.includes(n)).sort() };
}
function nomesQueSumiram(baseline, vivo) { return baseline.filter((n) => !vivo.includes(n)).sort(); }
// Uma relacao que existe noutro esquema nao e alcançável pelo PostgREST (schema cache), por isso "existe" so
// vale com o esquema qualificado: a varredura vai a todos os esquemas justamente para nao aceitar um
// 'existe em s' como resposta a uma pergunta que e sobre o alcance.
function nomesForaDoAlcancePublic(nomes, porNome) {
  return nomes.filter((t) => !(porNome[t] || []).some((e) => String(e).startsWith("public."))).sort();
}
function alvoAindaFechado(alvo, medido) {
  const violados = [];
  for (const n of semRepetidos(alvo)) {
    const m = medido[n];
    if (!m) { violados.push(n + "=ausente_do_catalogo"); continue; }
    if (m.anon_execute) violados.push(n + "=anon_execute_true");
    if (m.public_execute) violados.push(n + "=public_execute_true");
  }
  return violados.sort();
}
// O alvo nao e digitado da memoria: le-se do ficheiro SQL versionada da candidata, na forma que o gerador
// emite. Se a forma mudar, a peca aborta em vez de contar zero nomes e chamar-lhe "alvo conferido".
const CANDIDATA_REVOKE = "scripts/p143-revoke-anon-e-publico-ddl-candidata.sql";
const RE_LINE = /^REVOKE EXECUTE ON FUNCTION public\.([a-z0-9_]+)\([^)]*\) FROM (anon|PUBLIC);/gm;
function alvoDaCandidata(textoSql) {
  const ocs = [...textoSql.matchAll(RE_LINE)];
  if (ocs.length === 0) throw new Error("ABORTA: nenhuma linha REVOKE na forma lida por esta peca -- o alvo deixou de ser mensuravel, atualize a forma ou aborte");
  const porGrantee = {};
  for (const m of ocs) { porGrantee[m[2]] = (porGrantee[m[2]] || new Set()).add(m[1]); }
  return { nomes: semRepetidos(ocs.map((m) => m[1])), statements: ocs.length, por_grantee: Object.fromEntries(Object.entries(porGrantee).map(([k, s]) => [k, [...s].sort()])) };
}

if (process.argv.includes("--fixtures")) {
  const cs = [];
  const add = (nome, fn) => cs.push({ nome, fn });
  add("positivo_crescimento_licito_nao_morde_a_baseline", () =>
    nomesQueSumiram(["a", "b", "c"], ["a", "b", "c", "d"]).length === 0);
  add("negativo_view_da_baseline_sumida_morde", () =>
    JSON.stringify(nomesQueSumiram(["a", "b", "c"], ["a", "c", "d"])) === JSON.stringify(["b"]));
  add("positivo_derivada_reporta_os_dois_lados", () => {
    const r = derivadasDaBaseline(["a", "b"], ["b", "c"]);
    return JSON.stringify(r.so_no_vivo) === JSON.stringify(["c"]) && JSON.stringify(r.so_na_baseline) === JSON.stringify(["a"]);
  });
  add("negativo_derivada_de_listas_iguais_e_vazia", () => {
    const r = derivadasDaBaseline(["a", "a", "b"], ["b", "a"]);
    return r.so_no_vivo.length === 0 && r.so_na_baseline.length === 0;
  });
  add("positivo_alvo_do_revoke_fechado_nao_morde", () =>
    alvoAindaFechado(["f1", "f2"], { f1: { anon_execute: false, public_execute: false }, f2: { anon_execute: false, public_execute: false } }).length === 0);
  add("negativo_alvo_reaberto_para_anon_morde", () =>
    JSON.stringify(alvoAindaFechado(["f1", "f2"], { f1: { anon_execute: true, public_execute: false }, f2: { anon_execute: false, public_execute: false } })) === JSON.stringify(["f1=anon_execute_true"]));
  add("negativo_alvo_reaberto_para_public_morde", () =>
    alvoAindaFechado(["f1"], { f1: { anon_execute: false, public_execute: true } })[0] === "f1=public_execute_true");
  add("negativo_alvo_fora_do_catalogo_morde", () =>
    alvoAindaFechado(["f9"], {})[0] === "f9=ausente_do_catalogo");
  add("positivo_funcao_fora_do_alvo_aberta_nao_morde_a_clausula_do_alvo", () =>
    alvoAindaFechado(["f1"], { f1: { anon_execute: false, public_execute: false }, f_outro: { anon_execute: true, public_execute: true } }).length === 0);
  add("positivo_parser_le_as_duas_formas_de_grantee", () => {
    const sqlFake = "BEGIN;\nREVOKE EXECUTE ON FUNCTION public.a() FROM anon;\nREVOKE EXECUTE ON FUNCTION public.b(x uuid) FROM PUBLIC;\nCOMMIT;\n";
    const r = alvoDaCandidata(sqlFake);
    return r.statements === 2 && r.nomes.length === 2 && r.por_grantee.anon.includes("a") && r.por_grantee.PUBLIC.includes("b");
  });
  add("negativo_parser_aborta_sem_a_forma", () => {
    try { alvoDaCandidata("-- nada aqui\n"); return false; } catch (e) { return /ABORTA/.test(String(e.message)); }
  });
  add("positivo_candidata_versionada_no_disco_da_nomes", () => {
    const r = alvoDaCandidata(readFileSync(CANDIDATA_REVOKE, "utf8"));
    return r.nomes.length >= 1 && Object.keys(r.por_grantee).length >= 1;
  });
  add("positivo_tres_tabelas_em_public_nao_estao_fora_do_alcance", () =>
    nomesForaDoAlcancePublic(["t1", "t2", "t3"], { t1: ["public.r"], t2: ["public.r"], t3: ["public.p"] }).length === 0);
  add("negativo_relacao_so_noutro_esquema_continua_fora_do_alcance", () =>
    JSON.stringify(nomesForaDoAlcancePublic(["t1", "t2"], { t1: ["public.r"], t2: ["outro_esquema.r"] })) === JSON.stringify(["t2"]));
  add("negativo_relacao_inexistente_e_contada_como_fora", () =>
    JSON.stringify(nomesForaDoAlcancePublic(["t1", "t9"], { t1: ["public.r"] })) === JSON.stringify(["t9"]));
  const faltas = cs.filter((c) => !c.fn());
  cs.forEach((c) => console.log((faltas.includes(c) ? "FALTA " : "OK     ") + c.nome));
  console.log("FIN2_FIXTURES " + (cs.length - faltas.length) + "/" + faltas.length);
  process.exit(faltas.length ? 1 : 0);
}

const SAIDA = process.argv[2] || "evidence/fin2-higiene-rm62.json";
if (existsSync(SAIDA)) { console.log(`VERMELHO  já existe ${SAIDA} — não sobreponho artefactos; re-emita para um caminho datado`); process.exit(1); }

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
// A clausula que estava aqui somava as duas parcelas que ela propria calcula da mesma grandeza
// (sem_execute_anon = total - com_execute_anon), por isso nao tinha vermelho possivel — e a forma agregada
// do defeito registado a 18/11. Saiu e entrou a verificacao que morde: os nomes do alvo da candidata
// versionada, lidos do SQL e conferidos nome a nome contra has_function_privilege no catalogo vivo. Se um
// default privilege reabrir uma delas, ou se a funcao desaparecer do catalogo, a lista de violados enche.
const medidoPorNome = {};
for (const f of out.pen22_funcoes) {
  const cur = medidoPorNome[f.nome] || { anon_execute: false, public_execute: false, sobrecargas: 0 };
  cur.anon_execute = cur.anon_execute || f.anon_execute;
  cur.public_execute = cur.public_execute || f.public_execute;
  cur.sobrecargas += 1;
  medidoPorNome[f.nome] = cur;
}
const alvoRevoke = alvoDaCandidata(readFileSync(CANDIDATA_REVOKE, "utf8"));
const violadosDoAlvo = alvoAindaFechado(alvoRevoke.nomes, medidoPorNome);
out.pen22_alvo_do_revoke = {
  fonte: CANDIDATA_REVOKE,
  nomes_lidos: alvoRevoke.nomes.length,
  statements: alvoRevoke.statements,
  por_grantee: Object.fromEntries(Object.entries(alvoRevoke.por_grantee).map(([k, v]) => [k, v.length])),
  violados: violadosDoAlvo,
};
g.gate("pen22_alvo_do_revoke_sem_execute_para_anon_e_public", violadosDoAlvo, []);
console.log(`pen22 alvo: ${alvoRevoke.nomes.length} nomes em ${alvoRevoke.statements} statements (${Object.entries(alvoRevoke.por_grantee).map(([k, v]) => k + "=" + v.length).join(", ")}), violados=${violadosDoAlvo.length}`);
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
const nomesVivo = out.pen23_views.map((v) => v.nome).sort();
// BASELINE_PINNADA: 6 nomes e o que o instantaneo de 12/11 guarda; a cifra nao e medida de hoje nem
// expectativa sobre o catalogo vivo -- e o pino da baseline, que muda de cor se alguem re-emitar o
// rm14-censo-views.json. Relido na corrida sm71b (25/11), onde o catalogo vivo ja tinha 7.
const BASELINE_RM14_NOMES = 6;
g.gate("pen23_baseline_rm14_pinnada_com_a_contagem_declarada", nomesCenso.length, BASELINE_RM14_NOMES);
// Eixo 1 (pertinencia): nada do que a baseline de 12/11 regista pode ter sumido. A clausula antiga pedia
// igualdade de conjuntos, pelo que crescimento licito — a vista de agregados municipais que a PEN-39
// criou — era VERMELHO para sempre, e um portao permanentemente vermelho nao protege nada.
const sumiramDaBaseline = nomesQueSumiram(nomesCenso, nomesVivo);
g.gate("pen23_nenhuma_view_da_baseline_sumiu_do_catalogo", sumiramDaBaseline, []);
// Eixo 2 (seguranca): a propriedade vale sobre o conjunto VIVO todo, portanto cobre as vistas novas sem
// que a lista de 12/11 tenha de adivinhar o futuro. Era esta a assercao de 16/11 (achado AF1-e).
g.gate("pen23_nenhuma_view_sem_security_invoker", out.pen23.sem_security_invoker, []);
// Eixo 3 (deriva): reportada com nomes, nunca chumbada — o que ha-de decidir uma vista a mais e o roadmap,
// nao um instantaneo.
const derividaPen23 = derivadasDaBaseline(nomesCenso, nomesVivo);
out.pen23_derivida_da_baseline_rm14 = {
  so_no_vivo: derividaPen23.so_no_vivo,
  so_na_baseline: derividaPen23.so_na_baseline,
  total_vivo: nomesVivo.length,
  total_baseline: nomesCenso.length,
};
console.log(`pen23 deriva: vivo=${nomesVivo.length} baseline=${nomesCenso.length} so_no_vivo=[${derividaPen23.so_no_vivo.join(",")}] so_na_baseline=[${derividaPen23.so_na_baseline.join(",")}]`);
{
  // AUTOCONTROLE: um portão que não morde num valor trocado não é um portão. Não passa pelo `g.gate`
  // para não imprimir um VERMELHO que não é falha — imprime a sua própria linha e assina o resultado.
  const esperadoTrocado = nomesVivo.concat("vista_inexistente_neste_catalogo");
  const mordeu = JSON.stringify(nomesVivo) !== JSON.stringify(esperadoTrocado);
  const mordeuSumiram = JSON.stringify(nomesQueSumiram(nomesCenso, nomesVivo.filter((n) => n !== nomesCenso[0]))) !== JSON.stringify([]);
  console.log(`AUTOCONTROLE  pen23 comparado a uma expectativa trocada → ${mordeu ? "MORDE" : "NÃO MORDE (portão morto)"}`);
  console.log(`AUTOCONTROLE  pen23 sumidos com uma vista a menos → ${mordeuSumiram ? "MORDE" : "NÃO MORDE (portão morto)"}`);
  g.gate("pen23_autocobranca_mordeu", mordeu && mordeuSumiram, true);
}
// HISTORICO (nao e clausula, para nao contar duas vezes no mesmo eixo): a 16/11 o achado AF1-e trocou a
// assercao «so a support_professionals_directory tem invoker» — que pedia que a PEN-23 continuasse aberta —
// por «0 vistas sem security_invoker», que e o que §AE.2 passou a garantir. A 25/11 (sm71b) a segunda
// clausula daquele bloco, «as vistas com invoker sao exactamente as 6 do censo rm14», mostrou-se do mesmo
// mal que a primeira: pedia ao catalogo vivo que continuasse igual a um instantaneo de 12/11. Saiu, porque
// a sua funcao ja e coberta por duas clausulas mais fortes acima — nenhuma vista sem invoker (conjunto vivo
// todo) e nenhuma vista da baseline sumida — e nao por conveniencia: nenhuma das duas perdoaria o que esta
// chumbava, antes pelo contrario.

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
const pen29NomesBase = Array.isArray(fin2b.tabelas_ausentes) ? semRepetidos(fin2b.tabelas_ausentes).sort() : [];
if (pen29NomesBase.length === 0) throw new Error("ABORTA: a baseline fin2b nao declara nenhuma tabela em tabelas_ausentes, por isso esta peca nao tem alvo para a clausula do PEN-29");
out.perguntas_abertas = {
  tabelas_do_alvo_pen29_por_esquema: pen29NomesBase.map((t) => ({ [t]: porNome[t] || [] })),
  public_schools_existe: porNome.schools.length > 0 ? `SIM → ${porNome.schools.join(",")}` : "NAO",
  sports_schools_existe: porNome.sports_schools.length > 0 ? `SIM → ${porNome.sports_schools.join(",")}` : "NAO",
};
// HISTORICO do sentido desta clausula, registado e nao emendado: ate 12/11 o catalogo nao tinha nenhuma
// destas relacoes (fin2b) e a clausula media por isso «as N nomes ausentes == N». O DDL do calendario,
// aplicado antes de 20/11, criou-as — a prova versionada e evidence/bu2-censo-catalogo-20-11.json, que ja
// lista as tres com RLS — e a corrida sm71b (25/11) mostrou que a expectativa velha estava la parada: deu
// VERMELHO com dado=0, ou seja o contrario de uma porta aberta. A clausula passou a medir o que importa
// hoje: nenhuma das relacoes do alvo pode ter voltado a faltar no esquema alcancavel pelo PostgREST. Tem
// vermelho possivel (drop, saida do public, mudanca de esquema) e a sua leitura e conferida por nome.
const pen29ForaDoAlcance = nomesForaDoAlcancePublic(pen29NomesBase, porNome);
out.pen29_estado_no_esquema_alcancavel = {
  alvo_lido_de: "evidence/fin2b-ruins-catalogo.json",
  nomes: pen29NomesBase,
  fora_do_alcance: pen29ForaDoAlcance,
};
g.gate("pen29_tabelas_do_alvo_no_esquema_alcancavel", pen29ForaDoAlcance, []);
console.log(`pen29 alvo: ${pen29NomesBase.length} nomes (${pen29NomesBase.join(", ")}) · fora do alcance=${pen29ForaDoAlcance.length}`);

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
writeFileSync(SAIDA, JSON.stringify(out, null, 2) + "\n");

const { portoes, falhas } = g.resumo();
for (const f of falhas) console.log("VERMELHO  " + f);
console.log(`pen22: ${out.pen22.total_funcoes} funções · EXECUTE a anon em ${out.pen22.com_execute_anon} · a public em ${out.pen22.com_execute_public}`);
console.log(`pen23: ${out.pen23.total_views} views · security_invoker em ${out.pen23.com_security_invoker.length} · definer/BYPASSRLS em ${out.pen23.sem_security_invoker.length}`);
console.log(`escolas: public.schools = ${out.perguntas_abertas.public_schools_existe} · sports_schools = ${out.perguntas_abertas.sports_schools_existe}`);
console.log(`FKs de supervision_requests: ${out.fks_pen31.join(" · ") || "nenhuma"}`);
if (falhas.length === 0) { console.log(`FIN2_HIGIENE_VERDE ${portoes} portões / 0 falhas · artefacto ${SAIDA}`); process.exit(0); }
console.log(`FIN2_HIGIENE_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
process.exit(1);
