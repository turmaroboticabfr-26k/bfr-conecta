// SM6-PONTE — medição read-only das colunas e das FOREIGN KEYS reais das tabelas que o MÓDULO 2 vai ler.
// Existe porque um `select('a,b,rel(cid)')` do PostgREST só funciona se a FK existir no catálogo: sem este
// ficheiro, cada embutido seria uma suposta coluna (a classe de defeito 404/PGRST205 já medida na casa),
// e a candidata de interface nasceria a chamar caminhos que o backend recusa.
import { existsSync, writeFileSync } from 'node:fs';
import { sql } from './c2-lib.mjs';

const OUT = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/sm6-colunas-e-vinculos-17-11.json';
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT + ' — correr com outro nome'); process.exit(1); }

// Universo = o que o MÓDULO 2 toca. `staff_schools` e `sports_schools` não estavam no artefacto SM5,
// por isso entram aqui; os restantes repetem-se de propósito para este ficheiro ser auto-suficiente.
const TABELAS = ['schools', 'sports_schools', 'students', 'student_school_profiles', 'classes', 'grades',
  'attendance', 'bfr_lesson_attendance', 'staff_schools', 'supervision_requests', 'supervision_responses',
  'supervision_alerts', 'supervision_action_plans', 'announcements', 'school_documents', 'profiles'];

const colunas = {};
for (const t of TABELAS) {
  const r = await sql(`select column_name as nome, data_type as tipo, is_nullable as anula from information_schema.columns
    where table_schema='public' and table_name='${t}' order by ordinal_position`);
  colunas[t] = r.map((c) => `${c.nome}:${c.tipo}`);
}

// FK medida pelo catálogo, não por memória: (origem.coluna) -> (destino.coluna)
const fks = await sql(`select kcu.table_name as de, kcu.column_name as coluna,
    ccu.table_name as para, ccu.column_name as coluna_par, rc.constraint_name as nome
  from information_schema.referential_constraints rc
  join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name and kcu.constraint_schema = rc.constraint_schema
  join information_schema.constraint_column_usage ccu on ccu.constraint_name = rc.constraint_name and ccu.constraint_schema = rc.constraint_schema
  where kcu.table_schema='public' and ccu.table_schema='public'
    and kcu.table_name = any(array[${TABELAS.map((t) => `'${t}'`).join(',')}])
  order by 1,2,3`);

// Um embutido só é afirmável se houver FK na direção certa. Regra da casa: a régua precisa de fixture —
// aqui o fixture é o par falso óbvio (`students` -> `staff_schools`, que não existe) e o par verdadeiro
// (`supervision_requests` -> `sports_schools`, medido em sm2): se a função aceitar o primeiro e rejeitar
// o segundo, o verificador está cego e a candidata não pode ser escrita a partir dele.
const temFk = (de, para) => fks.some((f) => f.de === de && f.para === para);
const fixture = {
  negativos: ['students->staff_schools', 'announcements->students', 'school_documents->schools'].map((p) => {
    const [a, b] = p.split('->'); return { par: p, aceita: temFk(a, b) };
  }),
  positivos: ['supervision_requests->sports_schools', 'students->schools', 'grades->students', 'staff_schools->profiles'].map((p) => {
    const [a, b] = p.split('->'); return { par: p, aceita: temFk(a, b) };
  })
};
const bloqueios = [];
for (const f of fixture.positivos) if (!f.aceita) bloqueios.push(`fixture positivo falhou: ${f.par} — a medição de FK não está a ver o que sm2 viu`);
for (const f of fixture.negativos) if (f.aceita) bloqueios.push(`fixture negativo aceito: ${f.par} — a régua de embutidos é demasiado larga`);

const diario = {
  programa: 'scripts/sm6-colunas-vinculos.mjs',
  em: new Date().toISOString(),
  escrita_no_banco: false,
  o_que_prova: 'as colunas existentes (com tipo) de cada tabela que o MÓDULO 2 lê e o mapa completo de foreign keys na direção origem->destino, mais o autoteste da prédica de embutido contra três pares falsos e quatro verdadeiros.',
  o_que_NAO_prova: 'que o PostgREST aceita o request: a FK do catálogo é condição necessária, não suficiente (o expose/relação exposta também conta). A prova final é correr a UI com sessão, o que depende de OK.',
  tabelas: TABELAS, colunas, foreign_keys: fks, autoteste_da_prédica: fixture, bloqueios,
  veredito: bloqueios.length ? 'PONTE_BLOQUEADA' : 'COLUNAS_E_VINCULOS_OK'
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(diario.veredito, bloqueios.length ? JSON.stringify(bloqueios, null, 1) : '');
console.log('FKs', fks.length, '| tabelas', TABELAS.length);
console.log('staff_schools', colunas.staff_schools.join(','));
console.log('sports_schools', colunas.sports_schools.join(','));
process.exit(bloqueios.length ? 1 : 0);
