#!/usr/bin/env node
// P73-C — censo SÓ DE LEITURA das policies das 11 mesas que o módulo municipal abre (nomes lidos do
// artefacto sm23-escopo-aplicado-por-leitura, nunca dactilografados) + as definições atuais dos agregados
// municipais (PEN-39). Serve de insumo às candidatas P73 (DDL de escopo e DDL de agregados). 0 escrita.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const OUT = `${EV}/p73-politicas-municipais-20-11e.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');

const REF = 'yyzqoxlkcvqpessypfjo';
const tok = readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000) });
  const t = await r.text(); if (!r.ok) throw new Error('sql HTTP ' + r.status + ' ' + t.slice(0, 300)); return JSON.parse(t);
};

const escopo = JSON.parse(readFileSync(`${EV}/sm23-escopo-aplicado-por-leitura-18-11.json`, 'utf8'));
const mesas = [...new Set(escopo.leituras.map((l) => l.mesa).filter((m) => m !== 'bfr_is_municipal_authority'))];
const inList = mesas.map((m) => `'${m}'`).join(',');

const saida = { programa: 'scripts/p73-politicas-municipais-20-11.mjs', em: new Date().toISOString(), mesas_do_modulo: mesas, origem_das_mesas: 'evidence/sm23-escopo-aplicado-por-leitura-18-11.json (leituras[].mesa)', portoes: {}, falhas: [] };
const portao = (nome, ok, detalhe) => { saida.portoes[nome] = { verde: !!ok, detalhe: detalhe ?? null }; if (!ok) saida.falhas.push(nome); };

const pol = await sql(`select c.relname as tabela, p.polname, p.polcmd, p.polpermissive, (p.polroles::regrole[]::text[]) as papeis, pg_get_expr(p.polqual, p.polrelid) as qual, pg_get_expr(p.polwithcheck, p.polrelid) as withcheck
  from pg_policy p join pg_class c on c.oid = p.polrelid
  where c.relnamespace = 'public'::regnamespace and c.relname in (${inList})
  order by c.relname, p.polname`);
saida.policies = pol;
portao('censo_de_policies_respondeu', pol.length >= mesas.length, { politicas: pol.length, mesas: mesas.length });
for (const m of mesas) portao('mesa_com_pelo_menos_uma_policy_' + m, pol.some((p) => p.tabela === m), { n: pol.filter((p) => p.tabela === m).length });

const agregados = {};
const net_totals = await sql(`select pg_get_functiondef('public.bfr_municipal_network_totals()'::regprocedure) as def`);
agregados.network_totals_def = net_totals[0]?.def ?? null;
agregados.network_totals_def_md5 = agregados.network_totals_def ? md5(agregados.network_totals_def) : null;
const stats_view = await sql(`select pg_get_viewdef('public.bfr_municipal_school_stats'::regclass, true) as def`);
agregados.school_stats_viewdef = stats_view[0]?.def ?? null;
const grants = await sql(`select count(*)::int as n from public.bfr_municipal_access_grants where revoked_at is null`);
agregados.concessoes_ativas = grants[0]?.n ?? null;
const munic = await sql(`select count(*)::int as n from public.bfr_municipalities`);
agregados.municipios_cadastrados = munic[0]?.n ?? null;
const escolas_com_municipio = await sql(`select count(*)::int as n from public.schools where municipality_id is not null`);
agregados.escolas_com_municipality_id = escolas_com_municipio[0]?.n ?? null;
saida.agregados = agregados;
portao('defs_dos_agregados_lidas', Boolean(agregados.network_totals_def && agregados.school_stats_viewdef), { totals_md5: agregados.network_totals_def_md5 });

writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
const nF = saida.falhas.length;
console.log('P73_POLITICAS_MUNICIPAIS · ' + (nF ? 'FALHOU ' : 'OK ') + Object.keys(saida.portoes).length + '/' + nF + ' · ' + pol.length + ' policies em ' + mesas.length + ' mesas · totals_def_md5=' + agregados.network_totals_def_md5 + ' · concessoes_ativas=' + agregados.concessoes_ativas + ' · municipios=' + agregados.municipios_cadastrados + ' · escolas_com_municipality_id=' + agregados.escolas_com_municipality_id + ' · registo ' + OUT);
process.exit(nF ? 1 : 0);
