#!/usr/bin/env node
// SM-22 (peca 15, SOMENTE LEITURA, ZERO ESCRITA): as duas pontas que faltam para a linha PEN-29 do
// roadmap levar nomes e nao termos. A peca 14 provou em pg_catalog que nao ha nenhuma tabela publica
// com `shift_settings`, `calendar_days` ou `month_targets` no nome, e que o bundle chama
// `bfr_school_shift_settings`, `bfr_school_calendar_days`, `bfr_school_calendar_month_targets`.
// Aqui faz-se o par dessa prova com o sintoma do lado do utilizador: um GET anon por cada rota, com
// o codigo PostgREST, porque «a tabela nao existe no catalog» e «o utilizador ve um erro» so se
// encontram no HTTP. Le-se ainda o detalhe de PEN-28 que a conferencia ja trazia resumido, para que
// os nove estados saiam do artefacto em vez de se re-escreverem a memoria.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOST } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-rotas-pen29-e-pen28-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

// A chave mora no SHELL da aplicacao, que e o worker de publicacao — nao no host do Supabase, que
// serve a API e nao a pagina. Bati aqui: a primeira versao pedia `${HOST}/` e o aborta era justo,
// porque sem chave a sonda anon nao e anon.
const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8')) || [])[0];
if (!alvo) throw new Error('ABORTA: sem URL de publicacao');
const shellTxt = await (await fetch(alvo + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const m = /SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(shellTxt);
if (!m) throw new Error('ABORTA: a chave publishable nao apareceu nos bytes servidos — a sonda nao continua às cegas');
const k = m[1]; // vive so nesta variavel; nunca impressa nem gravada

const NOME = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets'];
const rotas = {};
for (const t of NOME) {
  const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: k, Authorization: `Bearer ${k}` } });
  const txt = await r.text();
  let code = null, message = null, linhas = null;
  try { const j = JSON.parse(txt); if (Array.isArray(j)) linhas = j.length; else { code = j.code || null; message = (j.message || '').slice(0, 160) || null; } } catch { message = 'nao-JSON'; }
  rotas[t] = { status: r.status, codigo: code, mensagem: message, linhas: linhas };
}
// CONTRAPROVA obrigatoria: uma rota que se sabe que existe tem de dar 200 com o mesmo par de
// cabecalhos, senao um 404 generico (rede, host, chave) se leria como «a tabela nao existe».
const controle = {};
for (const t of ['profiles', 'schools']) {
  const r = await fetch(`${HOST}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: k, Authorization: `Bearer ${k}` } });
  const txt = await r.text();
  let n = null; try { const j = JSON.parse(txt); n = Array.isArray(j) ? j.length : null; } catch {}
  controle[t] = { status: r.status, linhas: n };
}

const formas = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-varre-formas-pen-18-11.json'), 'utf8'));
const confer = JSON.parse(readFileSync(join(REPO, 'evidence/sm22-conferencia-cifras-18-11.json'), 'utf8'));
const formasDe = (confer.cifras && confer.cifras.pen28) ? confer.cifras.pen28 : null;
if (!formasDe) throw new Error('ABORTA: a conferencia nao trouxe pen28 — o detalhe nao pode ser lido de outro lado');
const por_status_de_forma = {};
for (const f of formas.pen28.formas || []) {
  const chave = `${f.de}${f.alvo_embed ? '→' + f.alvo_embed : ''}`;
  por_status_de_forma[chave] = (por_status_de_forma[chave] || []).concat(f.code || f.status);
}

const out = {
  em: new Date().toISOString(),
  metodo: 'GET anon de tres rotas PostgREST + duas rotas de controlo; nenhuma escrita; chave lida dos bytes servidos e jamais gravada',
  pen29_rotas_pedidas_pelo_bundle: rotas,
  contraprova_rotas_vivas: controle,
  pen28_detalle_dos_nove_estados: formasDe,
  pen28_por_casa: por_status_de_forma,
  leitura: Object.entries(rotas).map(([t, r]) => `${t}: HTTP ${r.status} ${r.codigo || 'SEM CODIGO'}`).join(' · '),
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(out.leitura);
console.log(`contrapartida das rotas vivas: ${JSON.stringify(controle)}`);
console.log(`pen28 por casa: ${JSON.stringify(por_status_de_forma)}`);
console.log(`pen28 formas: ${JSON.stringify(formasDe.formas)}`);
console.log(`pen28 por_status: ${JSON.stringify(formasDe.por_status)}`);
console.log(`\nSM22_ROTAS_OK · registo evidence/sm22-rotas-pen29-e-pen28-18-11.json`);
