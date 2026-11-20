// BU-2d — as políticas que o vocabulário de mecanismos da bu2c não classificou: despejar a expressão e
// propor classe. Só-leitura; o corpo das policies vem do catálogo, nada é escrito no banco.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { sql } from './s19-lib.mjs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU2D_SUF || '';
const OUT = `${DIR}/evidence/bu2d-politicas-sem-mecanismo-20-11${SUF}.json`;
const TXT = `${DIR}/evidence/bu2d-politicas-sem-mecanismo-20-11${SUF}.txt`;
if (existsSync(OUT) || existsSync(TXT)) throw new Error(`ABORTA: ${OUT} já existe — correr com BU2D_SUF novo`);
const t0 = Date.now();

const MATRIZ = `${DIR}/evidence/bu2c-caminhos-de-autorizacao-20-11c.json`;
if (!existsSync(MATRIZ)) throw new Error('falta o artefacto bu2c — a lista de sem-mecanismo tem de nascer da mesma prédica');
const matriz = JSON.parse(readFileSync(MATRIZ, 'utf8'));
const ENUM = new Set(matriz.papeis_enum);
const PONTE = ['staff_schools', 'guardian_students', 'bfr_teacher_class_subjects', 'students', 'profiles', 'classes', 'school_staff', 'route_students', 'student_pairing_codes'];

const castEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_][a-z_0-9]*)'::text/g)].map((m) => m[1]))];
const nuEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_][a-z_0-9]*)'/g)].map((m) => m[1]))].filter((x) => ENUM.has(x));
const helperEm = (txt) => [...new Set([...String(txt || '').matchAll(/\b(bfr_[a-z_0-9]+)\s*\(/g)].map((m) => m[1]))];

const pol = await sql(`select c.relname as tabela, p.polname as nome, p.polcmd::text as comando,
  coalesce(pg_get_expr(p.polqual, c.oid),'') as usando,
  coalesce(pg_get_expr(p.polwithcheck, c.oid),'') as verificando
  from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  order by c.relname, p.polname`);

// candidate vocabulary for the second pass — each needle independent of the seven already tried
const reCand = {
  exists_em_outra_tabela: /\bEXISTS\s*\(\s*SELECT\b/i,
  subselect_na_expression: /\(\s*SELECT\b/i,
  interseccao_de_array: /&&/,
  containment_de_array: /@\>|<@/,
  any_ou_in_de_consulta: /\b(ANY|IN)\s*\(\s*SELECT\b/i,
  current_setting: /\bcurrent_setting\(/i,
  session_ou_current_user: /\b(session_user|current_user)\b/i,
  verificar_de_privilegio: /\b(pg_has_role|has_role|has_table_privilege|has_schema_privilege)\b/i,
  unnest_ou_array_position: /\b(array_position|unnest|string_to_array)\b/i,
  coalesce: /\bcoalesce\(/i,
  like_ou_ilike: /\b(like|ilike)\b/i,
  text_cast: /::text/i,
  null_test: /\bis\b[^|]{0,20}null\b/i,
};
const semMecanismo = [];
for (const p of pol) {
  const txt = `${p.usando} ${p.verificando}`;
  const marcas = {
    literal_cast: castEm(txt).filter((c) => ENUM.has(c)).length > 0,
    literal_nu: nuEm(txt).length > 0,
    helper: helperEm(txt).length > 0,
    auth_uid: /auth\.uid\(\s*\)/.test(txt),
    jwt_claim: /auth\.jwt\(\s*\)/.test(txt),
    join_de_ponte: PONTE.some((t) => new RegExp(`\\b${t}\\b`).test(txt)),
    true_total: /^\s*(true)\s*$/i.test(String(p.usando).trim()),
  };
  if (Object.values(marcas).some(Boolean)) continue;
  const cands = Object.entries(reCand).filter(([, re]) => re.test(txt)).map(([k]) => k);
  semMecanismo.push({
    tabela: p.tabela, nome: p.nome, comando: p.comando,
    usando_chars: p.usando.length, verificando_chars: p.verificando.length,
    candidatos: cands,
    expressao: String(`${p.usando}${p.verificando ? ' | WITH CHECK ' + p.verificando : ''}`).replace(/\s+/g, ' ').slice(0, 700),
  });
}

const porTabela = {};
for (const s of semMecanismo) (porTabela[s.tabela] ||= []).push(s.nome);
const porCandidato = {};
for (const s of semMecanismo) for (const c of s.candidatos) porCandidato[c] = (porCandidato[c] || 0) + 1;

const res = {
  em: new Date().toISOString(), modo: 'read-only', instrumento: 'scripts/bu2d-politicas-sem-mecanismo-20-11.mjs',
  politica_total_no_catalogo: pol.length,
  politicas_sem_mecanismo_na_predica_da_bu2c: semMecanismo.length,
  tabelas_envolvidas: Object.keys(porTabela).sort(),
  por_candidato_de_mecanismo: Object.fromEntries(Object.entries(porCandidato).sort((a, b) => b[1] - a[1])),
  sem_nenhum_candidato: semMecanismo.filter((s) => s.candidatos.length === 0).map((s) => `${s.tabela}|${s.nome}`),
  lista: semMecanismo,
};

const gates = [];
const G = (nome, cond, detalhe) => gates.push({ nome, veredito: cond ? 'VERDE' : 'VERMELHO', detalhe });
const contagemDireta = (await sql(`select count(*)::int as n from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'`))[0].n;
G('a_leitura_de_policies_bate_com_contagem_direta_de_pg_policy', pol.length === contagemDireta, { lidas: pol.length, direta: contagemDireta });
G('o_artefacto_bu2c_declarou_a_mesma_quantidade_de_sem_mecanismo', semMecanismo.length === (matriz.mecanismos?.nenhum ?? -1),
  { nesta_corrida: semMecanismo.length, no_bu2c: matriz.mecanismos?.nenhum ?? null });
G('cada_item_da_lista_tem_expressao_nao_vazia', semMecanismo.every((s) => s.expressao.length > 0), { vazias: semMecanismo.filter((s) => !s.expressao).length });
G('nenhuma_politica_sem_mecanismo_e_de_leitura_com_usando_null', semMecanismo.every((s) => s.usando_chars > 0 || s.verificando_chars > 0), { ambas_vazias: semMecanismo.filter((s) => !s.usando_chars && !s.verificando_chars).map((s) => `${s.tabela}|${s.nome}`) });
res.veredictos = gates;
const vermelhas = gates.filter((g) => g.veredito === 'VERMELHO');
res.veredito_final = vermelhas.length === 0 ? `BU2D_SEM_MECANISMO_VERDE ${gates.length}/0` : `BU2D_SEM_MECANISMO_VERMELHO ${gates.length - vermelhas.length}/${vermelhas.length} ${vermelhas.map((v) => v.nome).join(',')}`;
res.msd = Date.now() - t0;

writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
const txt = [
  `veredito=${res.veredito_final}`,
  `politicas=${pol.length} sem_mecanismo=${semMecanismo.length} tabelas=${Object.keys(porTabela).length}`,
  `por_candidato=${JSON.stringify(res.por_candidato_de_mecanismo)}`,
  `sem_nenhum_candidato=${res.sem_nenhum_candidato.join(',') || 'nenhuma'}`,
  `amostra=${semMecanismo.slice(0, 12).map((s) => `${s.tabela}|${s.nome}|${s.comando}|${s.expressao.slice(0, 160)}`).join(' || ')}`,
  `node_exit=0 ms=${res.msd}`,
].join('\n') + '\n';
writeFileSync(TXT, txt);
console.log(txt);
