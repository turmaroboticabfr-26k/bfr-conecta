// SM5-A — lê do catálogo as colunas reais das tabelas que a interface municipal vai consultar.
// Zero escrita. Serve para o candidato UI não inventar nenhum nome de coluna (a armadilha dos 404
// PGRST205 de §28: calendário/turnos nunca existiram, e o bundle chamava-os como se existissem).
import { existsSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const OUT = 'evidence/sm5-colunas-reais-para-ui-17-11.json';
if (existsSync(OUT)) { console.log(`VERMELHO  já existe ${OUT}`); process.exit(1); }

const ALVO = ['schools', 'students', 'classes', 'supervision_requests', 'supervision_responses',
  'supervision_alerts', 'supervision_action_plans', 'announcements', 'school_documents',
  'attendance', 'grades', 'bfr_lesson_attendance', 'student_school_profiles', 'profiles'];
const lista = ALVO.map((t) => `'${t}'`).join(',');
const linhas = await sql(`select table_name, string_agg(column_name, ', ' order by ordinal_position) as cols,
  count(*)::int as n_colunas
  from information_schema.columns where table_schema='public' and table_name = any(array[${lista}])
  group by table_name order by table_name`);
const porTabela = Object.fromEntries(linhas.map((l) => [l.table_name, l.cols]));
const ausentes = ALVO.filter((t) => !porTabela[t]);
const diario = {
  programa: 'scripts/sm5-colunas-reais-para-ui.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  o_que_prova: 'as colunas existentes em cada tabela que a interface municipal vai ler, e as tabelas do plano municipal que NÃO existem no catálogo (ausentes)',
  o_que_NAO_prova: 'quais dessas colunas o papel do utilizador efetivamente recebe — isso é RLS e exige chamada autenticada',
  ausentes,
  por_tabela: porTabela
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
for (const t of ALVO) console.log(`${t} :: ${porTabela[t] || 'AUSENTE'}`);
console.log(ausentes.length ? `COLUNAS_AUSENTES ${JSON.stringify(ausentes)}` : 'COLUNAS_OK');
