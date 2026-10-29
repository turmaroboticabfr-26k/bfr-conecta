import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads/';
const REF = 'yyzqoxlkcvqpessypfjo';
const PAT = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const SQLURL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function q(query) {
  const r = await fetch(SQLURL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = t; }
  if (r.status !== 201) { const e = new Error(`HTTP ${r.status} ${String(JSON.stringify(b)).slice(0, 400)}`); e.body = b; throw e; }
  return b;
}
const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const espacado = h => h.split('').join(' ');

const cand = fs.readFileSync(DIR + 'pf-throttle-candidate.sql', 'utf8');
const live = JSON.parse(fs.readFileSync(DIR + 'pf-throttle-recon.json', 'utf8')).notifyDef;
const candidatoMd5 = md5(cand);
const originalMd5 = md5(live);

const corpo = cand.slice(cand.indexOf('CREATE OR REPLACE FUNCTION'), cand.indexOf('\nrevoke all on function'));
const corpoMd5 = md5(corpo);

const gates = {};
function gate(nome, ok, detalhe) { gates[nome] = { ok, detalhe }; if (!ok) throw new Error('PORTAO FALHO: ' + nome + ' :: ' + detalhe); }

const modo = process.argv[2] === 'aplicar' ? 'aplicar' : 'dry-run';
const wrapper = modo === 'aplicar' ? s => s : s => s.replace(/\ncommit;\n/, '\nrollback;\n');
if (modo === 'dry-run' && wrapper(cand) === cand) throw new Error('dry-run: nao achei o commit para trocar por rollback');

const out = { quando: new Date().toISOString(), modo, candidatas: {
  arquivo: 'pf-throttle-candidate.sql', bytes: cand.length, md5: candidatoMd5, md5_espacado: espacado(candidatoMd5),
  original_md5: originalMd5, original_md5_espacado: espacado(originalMd5), corpo_md5: corpoMd5 }, gates };

// Estado inicial: a tabela define se estamos na primeira aplicacao ou numa re-aplicacao.
const existeAntes = (await q("select to_regclass('public.student_location_notify_throttle') as r;"))[0].r !== null;
const antes = await q("select pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure) as t;");
const semTerminator = s => s.trimEnd().replace(/;$/, '');
out.estado_inicial = { tabela_ja_existe: existeAntes, def_md5: md5(antes[0].t),
  igual_ao_original: md5(antes[0].t) === originalMd5, igual_a_candidata: semTerminator(antes[0].t) === semTerminator(corpo) };
if (existeAntes) {
  gate('G0_reaplicacao_do_mesmo_texto', out.estado_inicial.igual_a_candidata, 'tabela existe mas a funcao nao e a da candidata');
} else {
  gate('G0_texto_vivo_igual_ao_recon', out.estado_inicial.igual_ao_original, `${md5(antes[0].t)} vs ${originalMd5}`);
}
// G1: o gatilho esta no ar e habilitado.
const trgAntes = await q("select tgtype, tgenabled::text as en from pg_trigger where tgname='bfr_pf_notify_location' and tgrelid='public.student_locations'::regclass and not tgisinternal;");
gate('G1_gatilho_no_ar', trgAntes.length === 1 && trgAntes[0].en === 'O', JSON.stringify(trgAntes));
// G3: o corpo da candidata contem as tres pecas e nao contem PII.
gate('G3_corpo_tem_janela', corpo.includes("v_janela interval := interval '5 minutes'"), 'sem v_janela');
gate('G3_corpo_tem_silencio', corpo.includes('if not v_livre then'), 'sem bloco de silencio');
gate('G3_corpo_tem_carimbo', corpo.includes('insert into public.student_location_notify_throttle'), 'sem carimbo');
gate('G3_ainda_chama_a_edge', corpo.includes('net.http_post') && corpo.includes('send-school-notification'), 'perdeu a chamada da Edge');
gate('G3_sem_nome_de_aluno', !/full_name|nome/.test(corpo.replace(/last_notified_at|student_location_notify_throttle/g, '')), 'PII no corpo');

// DRY-RUN primeiro: mesmo texto, rollback no lugar do commit.
out.dryrun = await q(wrapper(cand));
out.dryrun_ok = true;

// Conferencia de catalogo POS-aplicacao so acontece no modo aplicar.
if (modo === 'aplicar') {
  out.aplicar = await q(cand);
  const def = await q("select pg_get_functiondef('public.bfr_pf_notify_location()'::regprocedure) as t;");
  const agora = def[0].t;
  const corpoAgora = agora.slice(agora.indexOf('CREATE OR REPLACE FUNCTION'));
  out.conferencia = {
    def_md5: md5(agora),
    def_md5_espacado: espacado(md5(agora)),
    corpo_md5_candidata: corpoMd5,
    corpo_md5_live: md5(semTerminator(corpoAgora)),
    corpo_igual_a_candidata: semTerminator(corpoAgora) === semTerminator(corpo),
    tabela: await q(`select c.relname, r.rolname as owner, c.relrowsecurity, c.relforcerowsecurity, coalesce(c.relacl::text,'(null)') as acl,
      (select count(*)::int from pg_policy p where p.polrelid=c.oid) as policies
      from pg_class c join pg_roles r on r.oid=c.relowner where c.oid='public.student_location_notify_throttle'::regclass;`),
    constraints: await q("select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.student_location_notify_throttle'::regclass order by 1;"),
    colunas: await q("select a.attname, format_type(a.atttypid,a.atttypmod) as tipo, a.attnotnull from pg_attribute a where a.attrelid='public.student_location_notify_throttle'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum;"),
    funcao: await q("select prosecdef, r.rolname as owner, proacl::text as acl from pg_proc p join pg_roles r on r.oid=p.proowner where p.oid='public.bfr_pf_notify_location()'::regprocedure;"),
    gatilho: await q("select tgtype, tgenabled, pg_get_triggerdef(oid) as def from pg_trigger where tgname='bfr_pf_notify_location' and tgrelid='public.student_locations'::regclass and not tgisinternal;"),
    anon_exec: await q("select has_function_privilege('anon','public.bfr_pf_notify_location()','execute') as a, has_function_privilege('authenticated','public.bfr_pf_notify_location()','execute') as b;"),
    tabela_livre_para_anon: await q("select has_table_privilege('anon','public.student_location_notify_throttle','select') as sel, has_table_privilege('authenticated','public.student_location_notify_throttle','insert') as ins;"),
    linhas_tabela: await q('select count(*)::int as n from public.student_location_notify_throttle;'),
  };
  gate('G4_def_igual_a_candidata', out.conferencia.corpo_igual_a_candidata, 'corpo aplicado difere da candidata');
  gate('G5_tabela_dono_postgres_rls_sem_force', out.conferencia.tabela[0].owner === 'postgres' && out.conferencia.tabela[0].relrowsecurity === true && out.conferencia.tabela[0].relforcerowsecurity === false, JSON.stringify(out.conferencia.tabela));
  gate('G6_tabela_zero_policies', out.conferencia.tabela[0].policies === 0, String(out.conferencia.tabela[0].policies));
  gate('G7_anon_sem_exec_na_funcao', out.conferencia.anon_exec[0].a === false && out.conferencia.anon_exec[0].b === false, JSON.stringify(out.conferencia.anon_exec));
  gate('G8_anon_sem_leitura_da_tabela', out.conferencia.tabela_livre_para_anon[0].sel === false && out.conferencia.tabela_livre_para_anon[0].ins === false, JSON.stringify(out.conferencia.tabela_livre_para_anon));
  gate('G9_gatilho_intacto', out.conferencia.gatilho.length === 1 && out.conferencia.gatilho[0].tgenabled === 'O' && String(out.conferencia.gatilho[0].tgtype) === '21', JSON.stringify(out.conferencia.gatilho));
  gate('G10_tabela_nascida_vazia', out.conferencia.linhas_tabela[0].n === 0, String(out.conferencia.linhas_tabela[0].n));
  out.veredito = 'PF_THROTTLE_APLICADO_OK';
} else {
  out.veredito = 'PF_THROTTLE_DRYRUN_OK (nada aplicado)';
}

const arq = DIR + `pf-throttle-${modo}.json`;
fs.writeFileSync(arq, JSON.stringify(out, null, 2) + '\n');
console.log('modo', modo, '|', out.veredito);
console.log('md5 candidata :', espacado(candidatoMd5));
console.log('md5 original  :', espacado(originalMd5));
for (const [k, v] of Object.entries(gates)) console.log(v.ok ? '  ok  ' + k : '  FAL ' + k + ' ' + v.detalhe);
if (out.conferencia) {
  console.log('tabela:', JSON.stringify(out.conferencia.tabela));
  console.log('constraints:', JSON.stringify(out.conferencia.constraints));
  console.log('funcao:', JSON.stringify(out.conferencia.funcao));
  console.log('anon:', JSON.stringify(out.conferencia.anon_exec), JSON.stringify(out.conferencia.tabela_livre_para_anon));
  console.log('linhas:', JSON.stringify(out.conferencia.linhas_tabela));
}
console.log('ARTEFATO', arq);
