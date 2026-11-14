// C2-R — sondas do 42P17: medir o raio do ciclo de policies profiles↔staff_schools.
// Cada sonda roda numa transação própria com rollback (somente leitura no efeito).
import { sql } from './c2-lib.mjs';
import { writeFileSync } from 'node:fs';

const out = { em: new Date().toISOString() };
const uidReal = (await sql(`select id::text from public.profiles where email not like '%@bfr-conecta.test' order by id limit 1;`))[0]?.id;
const aluno = (await sql(`select id::text from public.students order by id limit 1;`))[0]?.id;
const turma = (await sql(`select id::text from public.classes order by id limit 1;`))[0]?.id;
const setRole = `
set local role authenticated;
set local request.jwt.claims = '{"sub":"${uidReal}","role":"authenticated"}';
set local request.jwt.claim.sub = '${uidReal}';
`;

async function sonda(nome, corpo, esperaErro = null) {
  try {
    const r = await sql(`begin;\n${setRole}\n${corpo}\nrollback;`);
    if (esperaErro) {
      out[nome] = { ok: false, code: 'SEM_ERRO', message: `esperava ${esperaErro} mas a query rodou sem erro` };
      console.log('ERRO  ', nome, '→', out[nome].message);
    } else {
      out[nome] = { ok: true, res: r };
      console.log('VERDE ', nome);
    }
  } catch (e) {
    const m = e.message.match(/ERROR:\s+(\w+):\s(.+?)(?:\n|$)/);
    const code = m?.[1];
    if (esperaErro && code === esperaErro) {
      out[nome] = { ok: true, code, message: m?.[2]?.slice(0, 200) };
      console.log('VERDE ', nome, '→', code, '(esperado)');
    } else {
      out[nome] = { ok: false, code, message: m?.[2]?.slice(0, 200) };
      console.log('ERRO  ', nome, '→', code, out[nome].message);
    }
  }
}

await sonda('P1_self_profile', `select id, role from public.profiles where id='${uidReal}';`);
await sonda('P2_other_profile', `select id from public.profiles where id<>'${uidReal}' limit 1;`);
await sonda('P3_insert_gate_literais', `insert into public.gate_checkins (student_id, class_id, gatekeeper_id, direction, checked_at, intake_source, entry_status, school_date) values ('${aluno}','${turma}','${uidReal}','entry',now(),'manual','allowed',current_date) returning id;`, '42501');
await sonda('P4_staff_schools_read', `select * from public.staff_schools limit 1;`);
await sonda('P5_guardian_students_read', `select * from public.guardian_students limit 1;`);
await sonda('P6_gate_badges_read', `select * from public.gate_badges limit 1;`);

writeFileSync(new URL('../docs/c2r-probe-42p17.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('\nc2r-probe-42p17.json gravado');
