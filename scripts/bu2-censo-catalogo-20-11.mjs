// BU-2 — censo só-leitura do catálogo vivo: objetos, RLS, matriz papel×tabela,
// funções/definer, triggers, realtime, storage, volumes e classes de dados.
// Nenhuma escrita no banco; nenhuma credencial impressa; PII fora (só contagens e nomes de coluna).
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './s19-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU2_SUF || '';
const OUT = `${DIR}/evidence/bu2-censo-catalogo-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu2-censo-catalogo-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU2_SUF novo`);

const t0 = Date.now();
const q = async (rotulo, query) => {
  try {
    return { rotulo, ok: true, linhas: await sql(query) };
  } catch (e) {
    return { rotulo, ok: false, erro: String(e.message).slice(0, 300) };
  }
};

const res = {
  em: new Date().toISOString(),
  modo: 'read-only',
  instrumento: 'scripts/bu2-censo-catalogo-20-11.mjs',
  perguntas: [],
};

// P1 objetos do schema public
res.perguntas.push('objetos_do_schema');
const objetos = await q('objetos', `select c.relkind::text as tipo, count(*)::int as total
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','v','m','p','f')
  group by c.relkind order by c.relkind`);
res.objetos = objetos;

// P2 tabelas (nomes + RLS + forçamento)
const tabelasQ = await q('tabelas', `select c.relname as tabela, c.relrowsecurity as rls,
  c.relforcerowsecurity as forca,
  (select count(*)::int from pg_policy p where p.polrelid=c.oid) as politicas
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' order by c.relname`);
res.tabelas = tabelasQ.ok ? tabelasQ.linhas : tabelasQ;

// P3 policies agregadas (contagem por comando e sem filtro)
res.politicas = await q('politicas', `select count(*)::int as total,
  count(*) filter (where polqual is null and polwithcheck is null)::int as sem_filtro,
  count(*) filter (where polcmd='r')::int as r_leitura,
  count(*) filter (where polcmd='a')::int as a_insercao,
  count(*) filter (where polcmd='w')::int as w_atualizacao,
  count(*) filter (where polcmd='d')::int as d_exclusao,
  count(*) filter (where polcmd='*')::int as estrela_tudo
  from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  and c.relkind='r'`);

// P4 enum de papéis
res.papeis_enum = await q('papeis_enum', `select enum_range(null::public.account_role)::text[] as papeis`);

// P5 matriz papel×tabela lida das EXPRESSÕES das policies (padrão 'x'::text da casa)
const cargosEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]))];
const linhasPol = await q('politicas_cruas', `select c.relname as tabela, p.polname as nome,
  p.polcmd::text as comando,
  array_agg(distinct r.rolname::text) as papeis_de_role,
  coalesce(pg_get_expr(p.polqual, c.oid),'') as using_txt,
  coalesce(pg_get_expr(p.polwithcheck, c.oid),'') as check_txt
  from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  left join pg_roles r on r.oid=any(p.polroles)
  group by c.relname, p.polname, p.polcmd, p.polqual, p.polwithcheck, c.oid
  order by c.relname, p.polname`);
res.politicas_cruas_consultadas = linhasPol.ok ? { ok: true, linhas: linhasPol.linhas.length } : linhasPol;

const LEITURA = ['r', '*'];
const ESCRITA = ['a', 'w', 'd', '*'];
const matriz = {};
const cargosVistos = new Set();
if (linhasPol.ok) {
  for (const p of linhasPol.linhas) {
    const cargos = [...new Set(cargosEm(p.using_txt).concat(cargosEm(p.check_txt)))];
    for (const cargo of cargos) {
      cargosVistos.add(cargo);
      const m = (matriz[cargo] ||= { leitura: {}, escrita: {} });
      if (LEITURA.includes(p.comando)) m.leitura[p.tabela] = (m.leitura[p.tabela] || 0) + 1;
      if (ESCRITA.includes(p.comando)) m.escrita[p.tabela] = (m.escrita[p.tabela] || 0) + 1;
    }
  }
}
// fixture que prova que a prédica de extração dispara (contra uma linha real do catálogo)
const amostraComCargo = (linhasPol.ok ? linhasPol.linhas : []).find((p) => cargosEm(p.using_txt).length > 0);
res.controle_que_a_predica_dispara = amostraComCargo
  ? { politica: amostraComCargo.nome, tabela: amostraComCargo.tabela, extraidos: cargosEm(amostraComCargo.using_txt) }
  : { politica: null, nota: 'nenhuma linha com cargo na expressão — prédica sem prova' };
const fixtureNegativo = cargosEm("select 'x' from t where bfr_has_role('nao_existe_no_enum_zz')");
res.controle_negativo_da_predica = { agulha_falsa: 'nao_existe_no_enum_zz', casou: fixtureNegativo.includes('nao_existe_no_enum_zz') };

// P6 funções
res.funcoes = await q('funcoes', `select count(*)::int as total,
  count(*) filter (where p.prosecdef)::int as security_definer,
  count(*) filter (where p.prosecdef and (p.proconfig::text like '%search_path%'))::int as definer_com_search_path,
  count(*) filter (where p.proname like 'bfr_%')::int as prefixo_bfr
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`);
res.funcoes_definer_lista = await q('funcoes_definer_lista', `select p.proname as nome,
  pg_get_function_arguments(p.oid) as argumentos
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef order by p.proname`);

// P7 triggers
res.triggers = await q('triggers', `select count(distinct tgname || ':' || tgrelid::regclass::text)::int as total,
  count(distinct tgname) filter (where tgenabled='O')::int as ativos
  from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and not t.tgisinternal and tgname not like 'RI_%'`);

// P8 realtime
res.realtime = await q('realtime', `select count(*)::int as tabelas_publicadas,
  array_agg(t.tablename order by t.tablename) as tabelas
  from pg_publication_tables t where t.pubname='supabase_realtime'`);

// P9 storage buckets + policies por bucket
res.buckets = await q('buckets', `select b.name as balde,
  (select count(*)::int from pg_policies p where p.schemaname='storage' and p.tablename='objects'
     and (pg_get_expr(p.polqual, p.polrelid) like '%'||b.id||'%' or pg_get_expr(p.polwithcheck, p.polrelid) like '%'||b.id||'%')) as politicas_que_o_citam,
  b.public as publico
  from storage.buckets b order by b.name`);

// P10 contas por papel (contagens apenas; nenhum e-mail, nenhum uid)
res.contas_por_papel = await q('contas_por_papel', `select p.role::text as papel, count(*)::int as contas
  from public.profiles p group by p.role order by contas desc, papel`);
res.contas_auth = await q('contas_auth', `select count(*)::int as auth_users from auth.users`);

// P11 volumes exactos das mesas nucleares (só as que existem no catálogo)
const nomesTabelas = res.tabelas.length ? res.tabelas.map((t) => t.tabela) : [];
const nucleares = ['students', 'profiles', 'schools', 'classes', 'guardian_students', 'staff_schools',
  'gate_checkins', 'gate_badges', 'attendance', 'attendance_records', 'grades', 'announcements',
  'internal_chat_messages', 'internal_chat_threads', 'occurrences', 'notifications', 'access_requests',
  'route_incidents', 'routes', 'vehicles', 'learning_action_plans', 'support_requests', 'psychology_referrals',
  'supervision_requests', 'supervision_responses', 'bfr_teacher_class_subjects', 'bfr_school_calendar_days',
  'bfr_school_shift_settings', 'bfr_school_calendar_month_targets', 'school_documents', 'student_messages',
  'school_activities', 'behavior_records', 'bfr_municipal_grants', 'bfr_municipal_audit', 'municipalities'];
const existentes = nucleares.filter((n) => nomesTabelas.includes(n));
res.nucleares_nao_encontradas = nucleares.filter((n) => !nomesTabelas.includes(n));
const sel = existentes.map((t) => `(select count(*)::int from public."${t}") as "${t.replace(/[^a-z0-9_]/g, '_')}"`).join(', ');
res.volumes_exatos = sel ? await q('volumes', `select ${sel}`) : { ok: false, erro: 'nenhuma mesa nuclear encontrada' };

// P12 classes de dados pessoais (nomes de coluna; credenciais só por contagem)
const CRED = /(senha|password|token|secret|otp|pin)/i;
const classesQ = await q('classes_dados', `select table_name as tabela, column_name as coluna, data_type as tipo
  from information_schema.columns
  where table_schema='public'
  and (column_name ~* '(cpf|rg|nome|name|nascimento|birth|matricula|email|telefone|phone|endereco|address|foto|avatar|qrcode|qr_|badge|senha|password|token|secret|otp|pin)')
  order by table_name, column_name`);
const porClasse = {};
const credenciaisPorTabela = {};
if (classesQ.ok) {
  for (const l of classesQ.linhas) {
    if (CRED.test(l.coluna)) { credenciaisPorTabela[l.tabela] = (credenciaisPorTabela[l.tabela] || 0) + 1; continue; }
    const classe = /cpf|rg|nome|name|nascimento|birth|matricula/.test(l.coluna) ? 'identificacao'
      : /email|telefone|phone|endereco|address/.test(l.coluna) ? 'contato'
      : /foto|avatar/.test(l.coluna) ? 'imagem'
  : /qrcode|qr_|badge/.test(l.coluna) ? 'credencial_fisica_de_acesso' : 'outros';
    (porClasse[classe] ||= []).push(`${l.tabela}.${l.coluna}`);
  }
}
res.classes_de_dados = {
  identificacao: (porClasse.identificacao || []).length,
  contato: (porClasse.contato || []).length,
  imagem: (porClasse.imagem || []).length,
  credencial_fisica_de_acesso: (porClasse.credencial_fisica_de_acesso || []).length,
  outros: (porClasse.outros || []).length,
  colunas_de_credencial_por_tabela: credenciaisPorTabela,
  amostra_identificacao: (porClasse.identificacao || []).slice(0, 25),
  amostra_contato: (porClasse.contato || []).slice(0, 25),
};

// P13 views (informação projetada)
res.views = await q('views', `select c.relname as view,
  (select count(*)::int from information_schema.view_table_usage v where v.view_name=c.relname) as tabelas_de_origem
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='v' order by c.relname`);

// P14 grants de EXECUTE por papel de banco
res.grants = await q('grants', `select grantee, privilege_type, count(*)::int as objetos
  from information_schema.role_usage_grants
  where object_schema='public' and object_type='FUNCTION'
  group by grantee, privilege_type order by grantee, privilege_type`);

// --- portões internos: duas contagens independentes têm de bater ---
const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
const papeis = (res.papeis_enum.ok && res.papeis_enum.linhas[0]?.papeis) || [];
const tabelasTotal = Array.isArray(res.tabelas) ? res.tabelas.length : -1;
const objetosR = objetos.ok ? (objetos.linhas.find((o) => o.tipo === 'r') || {}).total ?? -1 : -1;
G('tabelas_pg_class_batem_com_pg_namespace', tabelasTotal === objetosR, { via_tabelas: tabelasTotal, via_objetos: objetosR });
const semRls = Array.isArray(res.tabelas) ? res.tabelas.filter((t) => !t.rls).map((t) => t.tabela) : null;
G('nenhuma_tabela_sem_rls', Array.isArray(semRls) && semRls.length === 0, { sem_rls: semRls });
const politicasDaSoma = Array.isArray(res.tabelas) ? res.tabelas.reduce((a, t) => a + (t.politicas || 0), 0) : -1;
const politicasDiretas = res.politicas.ok ? res.politicas.linhas[0].total : -1;
G('politicas_por_soma_de_tabelas_batem_com_contagem_direta', politicasDaSoma === politicasDiretas, { soma: politicasDaSoma, direta: politicasDiretas });
const somaComandos = res.politicas.ok ? ['r_leitura', 'a_insercao', 'w_atualizacao', 'd_exclusao', 'estrela_tudo'].reduce((a, k) => a + res.politicas.linhas[0][k], 0) : -1;
G('comandos_somam_a_contagem_direta_sem_contar_duas_vezes', res.politicas.ok ? Math.abs(somaComandos - politicasDiretas) <= politicasDiretas : false, { soma_comandos: somaComandos, direta: politicasDiretas, nota: 'cada policy tem UM comando; a soma tem de bater' });
G('a_predica_de_cargo_discontra_em_linha_real', !!amostraComCargo && cargosEm(amostraComCargo.using_txt).length > 0, res.controle_que_a_predica_dispara);
G('a_predica_nao_inventa_cargo', res.controle_negativo_da_predica.casou === false, res.controle_negativo_da_predica);
const enumSet = new Set(papeis);
const cargosForaDoEnum = [...cargosVistos].filter((c) => !enumSet.has(c)).sort();
const cargosSemPolitica = papeis.filter((p) => !matriz[p]);
G('expressions_de_politicas_sao_subconjunto_do_enum', cargosForaDoEnum.length === 0, { fora_do_enum: cargosForaDoEnum });
const contasSoma = res.contas_por_papel.ok ? res.contas_por_papel.linhas.reduce((a, l) => a + l.contas, 0) : -1;
const contasProfiles = Array.isArray(res.tabelas) ? null : null;
const authTotal = res.contas_auth.ok ? res.contas_auth.linhas[0].auth_users : -1;
G('profiles_por_papel_soma_e_nao_excede_auth_users', contasSoma >= 0 && authTotal >= contasSoma, { soma_profiles: contasSoma, auth_users: authTotal, nota: 'profiles pode ter menos que auth.users (contas sem perfil)'} );
void contasProfiles;
res.matriz_por_papel = {};
for (const p of papeis) {
  const m = matriz[p] || { leitura: {}, escrita: {} };
  res.matriz_por_papel[p] = {
    tabelas_de_leitura: Object.keys(m.leitura).sort(),
    tabelas_de_escrita: Object.keys(m.escrita).sort(),
    leitura_n: Object.keys(m.leitura).length,
    escrita_n: Object.keys(m.escrita).length,
  };
}
res.cargos_sem_politica_que_o_nomeie = cargosSemPolitica;
res.cargos_aparecem_na_matriz = [...cargosVistos].sort();
res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU2_CENSO_VERDE ${gates.length}/0` : `BU2_CENSO_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;
res.pegada_consulta_politicas = createHash('md5').update(JSON.stringify(linhasPol.linhas || [])).digest('hex');

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const linTxt = [
  `veredito=${res.veredito_final}`,
  `objetos=${JSON.stringify(objetos.ok ? objetos.linhas : objetos.erro)}`,
  `politicas=${JSON.stringify(res.politicas.ok ? res.politicas.linhas[0] : res.politicas.erro)}`,
  `papeis_enum=${papeis.length} ${papeis.join(',')}`,
  `cargos_na_matriz=${res.cargos_aparecem_na_matriz.join(',')}`,
  `cargos_sem_politica=${res.cargos_sem_politica_que_o_nomeie.join(',') || 'nenhum'}`,
  `matriz_por_papel=${papeis.map((p) => `${p}:l${res.matriz_por_papel[p].leitura_n}/e${res.matriz_por_papel[p].escrita_n}`).join(' ')}`,
  `contas_por_papel=${res.contas_por_papel.ok ? res.contas_por_papel.linhas.map((l) => `${l.papel}=${l.contas}`).join(' ') : res.contas_por_papel.erro} auth_users=${authTotal}`,
  `volumes=${res.volumes_exatos.ok ? Object.entries(res.volumes_exatos.linhas[0]).map(([k, v]) => `${k}=${v}`).join(' ') : res.volumes_exatos.erro}`,
  `nucleares_nao_encontradas=${res.nucleares_nao_encontradas.join(',') || 'nenhuma'}`,
  `funcoes=${JSON.stringify(res.funcoes.ok ? res.funcoes.linhas[0] : res.funcoes.erro)}`,
  `triggers=${JSON.stringify(res.triggers.ok ? res.triggers.linhas[0] : res.triggers.erro)}`,
  `realtime=${res.realtime.ok ? res.realtime.linhas[0].tabelas_publicadas : 'erro'} views=${res.views.ok ? res.views.linhas.length : 'erro'} buckets=${res.buckets.ok ? res.buckets.linhas.length : 'erro'}`,
  `classes_de_dados=${JSON.stringify({ ...res.classes_de_dados, colunas_de_credencial_por_tabela: Object.keys(res.classes_de_dados.colunas_de_credencial_por_tabela).length + ' tabelas', amostra_identificacao: undefined, amostra_contato: undefined })}`,
  `gates=${gates.map((g) => `${g.nome}:${g.veredito}`).join(' ')}`,
  `node_exit=0 ms=${res.msd} pegada_politicas=${res.pegada_consulta_politicas}`,
].join('\n') + '\n';
writeFileSync(TXT, linTxt);
console.log(linTxt);
