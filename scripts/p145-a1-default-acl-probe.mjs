// P145-A1 — sonda só-leitura do mecanismo de grants da função bfr_confirm_school_calendar.
// Mede o pg_default_acl (a fonte das entradas herdadas na criação), a ACL explícita da função,
// os papéis de que anon é membro e os privilégios diretos por papel. Não escreve no banco.
// O que prova: que a função criada por postgres nasce com EXECUTE aos quatro papéis porque o
// default do esquema public o diz — e que o REVOKE por nome (anon, service_role) apaga as
// entradas que o REVOKE FROM PUBLIC não alcança.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './c2-lib.mjs';

const OUT = 'evidence/p145-a1-default-acl-probe-24-11.json';
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — não se reescreve a captura');
const EMISSOR = 'scripts/p145-a1-default-acl-probe.mjs';
const emissor = readFileSync(EMISSOR, 'utf8');

const f = (x) => (Array.isArray(x) ? x : []);
const q = async (t) => f(await sql(String(t)));

const r = {
  programa: EMISSOR,
  emissor_bytes: Buffer.byteLength(emissor),
  emissor_md5: createHash('md5').update(emissor).digest('hex'),
  em: new Date().toISOString(),
  proacl_atual: await q("select aclexplode(proacl) as a from pg_proc where proname = 'bfr_confirm_school_calendar' and pronamespace = 'public'::regnamespace"),
  default_acl: await q("select defaclrole::regrole::text as papel, defaclobjtype::text as tipo, defaclnamespace::regnamespace::text as ns, defaclacl::text as acl from pg_default_acl order by papel, tipo, ns"),
  membros_anon: await q("select r.rolname as grupo from pg_auth_members m join pg_roles r on r.oid = m.roleid where m.member = (select oid from pg_roles where rolname = 'anon')"),
  funcao_owner: await q("select u.rolname as dono from pg_proc p join pg_roles u on u.oid = p.proowner where p.proname = 'bfr_confirm_school_calendar' and p.pronamespace = 'public'::regnamespace"),
  privilegios_diretos: await q("select grantee::regrole::text as quem, privilege_type from information_schema.role_routine_grants where specific_schema = 'public' and routine_name = 'bfr_confirm_school_calendar' order by quem"),
  o_que_prova: 'mecanismo vivo: o pg_default_acl de postgres em public (tipo f) concede EXECUTE a anon/authenticated/service_role na criação; a ACL explícita da função reflete o estado depois do REVOKE por nome de 24/11',
};

writeFileSync(OUT, JSON.stringify(r, null, 2) + '\n');
console.log('escrito ' + OUT + ' com emissor ' + r.emissor_md5);
