#!/usr/bin/env node
// Sonda SÓ-LEITURA do catálogo para o §SM.25 (20/11): re-confirma por leitura o estado das
// pendências de catálogo e nomeia o OK literal que cada item aberto exige.
// Não escreve no banco. Não aplica DDL. A única escrita fora do repo é a renovação por
// refresh_token das sessões de autenticação (auth, sem escrita de produto).
import { sql, HOST } from './c2-lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = DIR + '/bfr-conecta';
const ART = REPO + '/evidence/sm25-verifica-catalogo-leitura-20-11.json';
const ART_V = REPO + '/evidence/sm25-verifica-catalogo-leitura-20-11-VERMELHO.json';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const iso = () => new Date().toISOString();

const estado = {
  programa: 'scripts/sm25-verifica-catalogo-leitura.mjs',
  em: iso(),
  metodo: 'só leitura: pg_catalog via PAT (c2-lib) + probes REST anon/autenticado; sessões renovadas por refresh_token (auth, sem escrita de produto)',
};
let falha_em = null;
process.on('uncaughtException', (e) => { falha_em = falha_em ?? 'uncaughtException: ' + e.message; });
process.on('unhandledRejection', (e) => { falha_em = falha_em ?? 'unhandledRejection: ' + (e?.message ?? String(e)); });

try {
  await main();
} catch (e) {
  falha_em = falha_em ?? e.message;
  estado.falha_em = falha_em;
  estado.veredito_global = 'SM25_CATALOGO_VERMELHO';
  writeFileSync(ART_V, JSON.stringify(estado, null, 2) + '\n');
  console.log('SM25_CATALOGO_VERMELHO falha_em=' + falha_em);
  process.exit(1);
}

async function main() {
  if (existsSync(ART) || existsSync(ART_V)) {
    throw new Error('artefacto já existe (verde ou -VERMELHO); renomeie a corrida anterior com o motivo no nome, nunca apagar');
  }

  // 1. identidade do ar: shell servido vs esperado da v136 (e daqui sai a chave anon, nunca impressa)
  const pub = JSON.parse(readFileSync(REPO + '/audit-publicacao-v136.json', 'utf8'));
  const esperado = JSON.parse(readFileSync(REPO + '/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json', 'utf8'));
  const urlAr = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(JSON.stringify(pub)) || [])[0];
  const shell = await (await fetch(urlAr + '/', { headers: { 'cache-control': 'no-cache' } })).text();
  const shellMd5 = md5(shell);
  estado.ar = {
    url: urlAr,
    md5_shell_servido: shellMd5,
    htmlMd5_esperado_v136: esperado.htmlMd5,
    ar_identico_a_v136: shellMd5 === esperado.htmlMd5,
  };
  const anonKey = (/SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shell) || [])[1];
  if (!anonKey) throw new Error('anon key não extraída do shell servido');
  estado.ar.chave_anon_presente = true;

  // 2. controlo de canal: uma régua cega aborta em vez de emitir zeros
  const ctl = (await sql(`select
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relkind='r')::int as tabelas_public,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public')::int as funcoes_public,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public' where has_function_privilege('anon', p.oid, 'EXECUTE'))::int as funcoes_anon_execute,
    (select has_function_privilege('anon', 'public.bfr_rls_session_role()', 'EXECUTE')) as rls_session_role_anon_exec`))[0];
  if (ctl.tabelas_public < 20 || ctl.funcoes_public < 150) {
    throw new Error('controlo de canal anémico: ' + JSON.stringify(ctl));
  }
  estado.controle_de_canal = ctl;

  // 3. PEN-29 (fechada por execução 18/11): as 3 tabelas existem, RLS ligada e forçada, 2 policies, 0 linhas
  const ALVO_29 = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
  const achadas = await sql(`select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forcada
    from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where c.relkind='r' and c.relname in (${ALVO_29.map((n) => `'${n}'`).join(', ')}) order by c.relname`);
  const nomesAchados = achadas.map((t) => t.relname);
  const ausentes = ALVO_29.filter((n) => !nomesAchados.includes(n));
  const contagens = {};
  if (nomesAchados.length) {
    const q = 'select ' + nomesAchados.map((n) => `(select count(*)::int from public."${n}") as "${n}"`).join(', ');
    Object.assign(contagens, (await sql(q))[0]);
  }
  const pols = await sql(`select c.relname, count(*)::int as n from pg_policy p
    join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    where c.relname in (${ALVO_29.map((n) => `'${n}'`).join(', ')}) group by c.relname order by c.relname`);
  const porTabela = {};
  for (const t of achadas) {
    porTabela[t.relname] = {
      rls: t.rls,
      forcada: t.forcada,
      linhas: contagens[t.relname],
      policies: (pols.find((p) => p.relname === t.relname) || {}).n ?? 0,
    };
  }
  const pen29Ok = ausentes.length === 0 && achadas.length === 3 && achadas.every((t) => t.rls && t.forcada) && pols.every((p) => p.n === 2);
  estado.pen29 = { alvo: ALVO_29, achadas: nomesAchados, ausentes, por_tabela: porTabela, veredito: pen29Ok ? 'FECHADA_CONFIRMADA' : 'DIVERGENTE_DO_REGISTO' };

  // 4. PEN-37 (fechada por execução 18/11): anon sem EXECUTE nas duas; authenticated mantém (remanescente PEN-38/39)
  const funcoes37 = await sql(`select p.proname, pg_get_function_arguments(p.oid) as args,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
    where p.proname in ('bfr_municipal_network_totals','bfr_has_municipal_grant') order by p.proname`);
  // caminho do produtor (sm23-sonda-com-sessao.mjs): o PostgREST deste projecto só serve /rest/v1/rpc/…
  const getAnon = async (path, body) => {
    const r = await fetch(HOST + '/rest/v1/rpc/' + path, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
      body,
    });
    const t = await r.text();
    return { status: r.status, bytes: Buffer.byteLength(t) };
  };
  const argGrant = (funcoes37.find((f) => f.proname === 'bfr_has_municipal_grant')?.args || '').trim().split(/\s+/)[0];
  const probesAnon = {
    network_totals: await getAnon('bfr_municipal_network_totals', '{}'),
    has_grant: await getAnon('bfr_has_municipal_grant', JSON.stringify({ [argGrant]: '00000000-0000-0000-0000-000000000000' })),
  };
  const pen37Ok = funcoes37.length === 2
    && funcoes37.every((f) => f.anon_exec === false && f.auth_exec === true)
    && probesAnon.network_totals.status === 401 && probesAnon.has_grant.status === 401;
  estado.pen37 = { funcoes: funcoes37, probes_anon: probesAnon, veredito: pen37Ok ? 'FECHADA_CONFIRMADA' : 'DIVERGENTE_DO_REGISTO' };

  // 5. PEN-23 (fechada 18/11): 7 views em public, todas security_invoker
  const v23 = (await sql(`select count(*)::int as views,
      count(*) filter (where array_to_string(c.reloptions, ',') like '%security_invoker%')::int as com_invoker,
      coalesce(array_agg(c.relname order by c.relname) filter (where array_to_string(c.reloptions, ',') not like '%security_invoker%'), '{}') as sem_invoker
    from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relkind='v'`))[0];
  estado.pen23 = {
    views: v23.views,
    com_invoker: v23.com_invoker,
    sem_invoker: Array.isArray(v23.sem_invoker) ? v23.sem_invoker : [],
    veredito: v23.views === 7 && v23.com_invoker === 7 && (Array.isArray(v23.sem_invoker) ? v23.sem_invoker.length : 0) === 0 ? 'FECHADA_CONFIRMADA' : 'DIVERGENTE_DO_REGISTO',
  };

  // 6. PEN-39 (aberta): assinatura invertida medida com sessões — developer vê a rede, o titular municipal vê zeros
  const defs = await sql(`select pg_get_functiondef(p.oid) as def, pg_get_function_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
    where p.proname='bfr_municipal_network_totals'`);
  const def0 = defs.find((d) => (d.args || '').trim() === '');
  const agora = Math.floor(Date.now() / 1000);
  const expDe = (tok) => JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).exp;
  const refresh = async (refreshToken) => {
    const r = await fetch(HOST + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const t = await r.text();
    let j;
    try { j = JSON.parse(t); } catch {}
    if (!r.ok || !j?.access_token) throw new Error('refresh HTTP ' + r.status + ': ' + t.slice(0, 200));
    return j;
  };
  const sessaoDe = async (ficheiro, chave) => {
    const dados = JSON.parse(readFileSync(ficheiro, 'utf8'));
    const e = dados[chave];
    let tok = e.access_token;
    let renovou = false;
    if (!tok || expDe(tok) - agora < 600) {
      const j = await refresh(e.refresh_token);
      tok = j.access_token;
      dados[chave] = { ...e, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_in ? agora + j.expires_in : e.expires_at };
      writeFileSync(ficheiro, JSON.stringify(dados, null, 2) + '\n');
      renovou = true;
    }
    return { tok, renovou };
  };
  const dev = await sessaoDe(DIR + '/ah2-sessao-developer.json', 'developer');
  const smun = await sessaoDe(DIR + '/sm8-municipal-sessions.json', 'secretario_municipal');
  const rpc = async (tok) => {
    const r = await fetch(HOST + '/rest/v1/rpc/bfr_municipal_network_totals', {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const t = await r.text();
    let j;
    try { j = JSON.parse(t); } catch { j = null; }
    return { status: r.status, valores: Array.isArray(j) && j[0] ? j[0] : j, bytes: Buffer.byteLength(t) };
  };
  const pDev = await rpc(dev.tok);
  const pMun = await rpc(smun.tok);
  const soma = (v) => {
    if (v && typeof v === 'object') return Object.values(v).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    if (typeof v === 'number') return v;
    return null;
  };
  const assinatura = {
    developer_ve_rede: pDev.status === 200 && soma(pDev.valores) > 0,
    titular_ve_zeros: pMun.status === 200 && soma(pMun.valores) === 0,
  };
  estado.pen39 = {
    def_md5_hoje: def0 ? md5(def0.def) : null,
    def_bytes: def0 ? Buffer.byteLength(def0.def) : null,
    probes: {
      developer: { status: pDev.status, valores: pDev.valores, bytes: pDev.bytes },
      secretario_municipal: { status: pMun.status, valores: pMun.valores, bytes: pMun.bytes },
    },
    renovacoes: { developer: dev.renovou, secretario_municipal: smun.renovou },
    assinatura,
    veredito: assinatura.developer_ve_rede && assinatura.titular_ve_zeros ? 'ABERTA_CONFIRMADA' : 'DIVERGENTE_DA_MEDIDA_DE_18_11',
    ok_exigido: 'DDL de reescrita dos agregados municipais (literal OK) + candidata + publicação',
  };

  // 7. RM-5.2 (aberta, produto): o conteúdo das 3 tabelas continua por desenhar
  const rm52Ok = Object.values(contagens).every((n) => n === 0);
  estado.rm52 = {
    linhas_por_tabela: contagens,
    veredito: rm52Ok ? 'ABERTA_CONFIRMADA' : 'DIVERGENTE_DO_REGISTO',
    ok_exigido: 'desenho de conteúdo (turnos, dias letivos, metas mensais) — produto; pede OK literal',
  };

  // 8. PEN-38 (aberta, front): o ar serve a v136 intacta, que contém o defeito; re-medida de browser é o próprio #79
  estado.pen38 = {
    escopo: 'front (o módulo municipal abre 11 mesas e não filtra uma única vez por município)',
    identidade_do_ar: estado.ar.ar_identico_a_v136 ? 'shell servido idêntico à v136 — código da PEN-38 inalterado no ar' : 'DIVERGENTE: shell servido não bate com a v136',
    veredito: estado.ar.ar_identico_a_v136 ? 'ABERTA_CONFIRMADA_POR_IDENTIDADE_DO_AR' : 'AR_DIVERGENTE_DA_V136',
    ok_exigido: 'candidata de código do módulo municipal + publicação v13x (literal OK)',
  };

  // 9. veredito global + lista dos OKs que faltam
  const abertas = [];
  if (estado.pen39.veredito === 'ABERTA_CONFIRMADA') abertas.push({ item: 'PEN-39', ok_exigido: estado.pen39.ok_exigido });
  if (estado.rm52.veredito === 'ABERTA_CONFIRMADA') abertas.push({ item: 'RM-5.2', ok_exigido: estado.rm52.ok_exigido });
  if (estado.pen38.veredito === 'ABERTA_CONFIRMADA_POR_IDENTIDADE_DO_AR') abertas.push({ item: 'PEN-38', ok_exigido: estado.pen38.ok_exigido });
  estado.itens_abertos_com_ok_exigido = abertas;
  const divergentes = [estado.pen29, estado.pen37, estado.pen23, estado.pen39].filter((x) => String(x.veredito).startsWith('DIVERGENTE'));
  estado.veredito_global = divergentes.length === 0 ? 'SM25_CATALOGO_VERDE' : 'SM25_CATALOGO_VERMELHO';
  writeFileSync(ART, JSON.stringify(estado, null, 2) + '\n');
  console.log(estado.veredito_global + ' pen29=' + estado.pen29.veredito + ' pen37=' + estado.pen37.veredito
    + ' pen23=' + estado.pen23.veredito + ' pen39=' + estado.pen39.veredito + ' rm52=' + estado.rm52.veredito);
}
