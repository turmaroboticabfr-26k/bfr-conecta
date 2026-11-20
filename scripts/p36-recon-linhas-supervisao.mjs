// P36-R — sonda SÓ-LEITURA do que cada persona lê nas três tabelas que o sub-aba «Supervisão» da
// Secretaria de Educação desenha. PEN-36 exige prova de browser com sessão; antes de correr o browser
// preciso da expectativa numerada, senão o portão do browser é vazio. O módulo (index.html da v136,
// linha 23684) faz `from('supervision_requests').select('id,indicator,motive,description,questions,
// deadline_at,priority,status,created_by,closed_by,closed_at,created_at,updated_at,school_id,
// sports_schools(name)').order('created_at',{ascending:false}).limit(200)` e `from('schools').select(
// 'id,name,active').order('name').limit(50)` — esta sonda reproduz as duas chamadas via PostgREST com o
// token renovado de cada persona, porque é o RLS que decide, não o JavaScript. 0 escrita, 0 DDL, 0 mint;
// tokens só em memória e nada de credencial vai para o artefacto.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sql, HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const FORA = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const OUT = join(REPO, 'evidence/p36-recon-linhas-supervisao-19-11.json');
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const alvoUrl = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v136.json'), 'utf8')) || [])[0];
if (!alvoUrl) throw new Error('ABORTA: sem URL de publicacao no diario da v136');
const shellTxt = await (await fetch(alvoUrl + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt) || [])[1];
if (!anonKey) throw new Error('ABORTA: sem chave publishable nos bytes servidos');

const ah2 = JSON.parse(readFileSync(join(FORA, 'ah2-sessions.json'), 'utf8'));
const sm8 = JSON.parse(readFileSync(join(FORA, 'sm8-municipal-sessions.json'), 'utf8'));
const PERFIS = ['secretary', 'education_supervisor', 'monitor', 'director', 'secretario_municipal'];
const lista = [];
for (const p of PERFIS) {
  const src = ah2[p] ? { origem: 'ah2-sessions', s: ah2[p] } : (sm8[p] ? { origem: 'sm8-municipal-sessions', s: sm8[p] } : null);
  if (!src) { lista.push({ perfil: p, ausente: true }); continue; }
  lista.push({ perfil: p, origem: src.origem, id: src.s.id, email: src.s.email, access: src.s.access_token, refresh: src.s.refresh_token, expira: src.s.expires_at });
}

const papelPorUid = Object.fromEntries((await sql(`select id::text as uid, role::text as papel from public.profiles`)).map((x) => [x.uid, x.papel]));
const tokenVivo = async (p) => {
  if (Number(p.expira) * 1000 > Date.now() + 30_000) return { access: p.access, renovado: false };
  const r = await fetch(`${HOST}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ refresh_token: p.refresh }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new Error(`refresh HTTP ${r.status} ${(j && (j.msg || j.error_description || j.error)) || ''}`.trim());
  return { access: j.access_token, renovado: true };
};
const jsonDe = async (path, access) => {
  const r = await fetch(HOST + path, { headers: { apikey: anonKey, Authorization: `Bearer ${access}`, accept: 'application/json' } });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, j, bytes: Buffer.byteLength(t) };
};

const COLUNAS_MODULO = 'id,indicator,motive,description,questions,deadline_at,priority,status,created_by,closed_by,closed_at,created_at,updated_at,school_id,sports_schools(name)';
const porPersona = [];
for (const p of lista) {
  const linha = { perfil: p.perfil, origem: p.origem || null, uid: p.id || null, papel_no_perfil: p.id ? papelPorUid[p.id] || 'SEM-PERFIL' : null, token_vivo_antes: p.expira ? Number(p.expira) * 1000 > Date.now() : null };
  if (p.ausente) { linha.observacao = 'sem sessao local para este perfil'; porPersona.push(linha); continue; }
  try {
    const tk = await tokenVivo(p);
    linha.token_renovado = tk.renovado;
    const a = tk.access;
    const sup = await jsonDe(`/rest/v1/supervision_requests?select=${encodeURIComponent(COLUNAS_MODULO)}&order=created_at.desc&limit=200`, a);
    linha.supervision_requests_http = sup.status;
    if (Array.isArray(sup.j)) {
      const hist = {}; for (const r of sup.j) hist[r.status] = (hist[r.status] || 0) + 1;
      const esc = {}; for (const r of sup.j) esc[r.school_id] = (esc[r.school_id] || 0) + 1;
      linha.supervision_linhas = sup.j.length;
      linha.supervision_por_status = hist;
      linha.supervision_school_ids_distintos = Object.keys(esc).length;
      linha.supervision_com_sports_schools = sup.j.filter((r) => r.sports_schools && r.sports_schools.name).length;
      linha.supervision_bytes = sup.bytes;
    } else { linha.supervision_corpo = JSON.stringify(sup.j).slice(0, 200); }
    const schools = await jsonDe('/rest/v1/schools?select=id,name,active&order=name&limit=50', a);
    linha.schools_http = schools.status;
    linha.schools_linhas = Array.isArray(schools.j) ? schools.j.length : null;
    if (!Array.isArray(schools.j) && schools.j) linha.schools_corpo = JSON.stringify(schools.j).slice(0, 200);
    const planos = await jsonDe('/rest/v1/learning_action_plans?select=id&limit=200', a);
    linha.planos_http = planos.status;
    linha.planos_linhas = Array.isArray(planos.j) ? planos.j.length : null;
    if (!Array.isArray(planos.j) && planos.j) linha.planos_corpo = JSON.stringify(planos.j).slice(0, 200);
    const sect = await jsonDe('/rest/v1/secretary_requests?select=id&limit=200', a);
    linha.secretary_requests_http = sect.status;
    linha.secretary_requests_linhas = Array.isArray(sect.j) ? sect.j.length : null;
  } catch (e) { linha.erro = String(e.message).slice(0, 200); }
  porPersona.push(linha);
}
const anon = { perfil: 'anon' };
{
  const sup = await jsonDe('/rest/v1/supervision_requests?select=id&limit=200', anonKey);
  anon.supervision_http = sup.status;
  anon.supervision_linhas = Array.isArray(sup.j) ? sup.j.length : null;
  if (!Array.isArray(sup.j) && sup.j) anon.supervision_corpo = JSON.stringify(sup.j).slice(0, 200);
}

// O censo do banco, pelo caminho administrativo (leitura), para que «0 linhas da persona» se possa
// distinguir de «a tabela está vazia para todos».
const censo = await sql(`select
  (select count(*)::int from public.supervision_requests) as supervisao_total,
  (select count(*)::int from public.schools) as schools_total,
  (select count(*)::int from public.learning_action_plans) as planos_total,
  (select count(*)::int from public.secretary_requests) as secretary_requests_total`);
const porStatus = await sql(`select status::text as status, count(*)::int as n from public.supervision_requests group by 1 order by 2 desc`);

const out = {
  programa: 'scripts/p36-recon-linhas-supervisao.mjs',
  em: new Date().toISOString(),
  metodo: 'GET PostgREST com o refresh token renovado de cada persona local; so SELECT; nenhuma credencial gravada',
  url_servida: alvoUrl,
  select_do_modulo: COLUNAS_MODULO,
  catalogo_no_instante: censo[0],
  supervisao_por_status_no_banco: porStatus,
  anon,
  por_persona: porPersona,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`banco ${JSON.stringify(censo[0])}`);
console.log(`  anon: supervisao=${anon.supervision_http}/${anon.supervision_linhas}`);
for (const l of porPersona) console.log(`  ${l.perfil}: papel=${l.papel_no_perfil} renovou=${l.token_renovado} sup=${l.supervision_requests_http}/${l.supervision_linhas} schools=${l.schools_http}/${l.schools_linhas} planos=${l.planos_http}/${l.planos_linhas} sec=${l.secretary_requests_http}/${l.secretary_requests_linhas}${l.erro ? ' ERRO=' + l.erro : ''}`);
console.log('P36_RECON_OK · registo ' + OUT);
