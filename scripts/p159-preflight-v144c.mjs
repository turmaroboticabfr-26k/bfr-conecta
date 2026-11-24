#!/usr/bin/env node
// P159 — PREFLIGHT SOMENTE LEITURA antes do deploy da v144c (24/11). 0 deploy, 0 DDL, 0 escrita no banco.
// Só HTTP GET e leitura de disco. O ar deve ser a v142 (ebe8e698, 21/11) COM a marca velha visível nas três
// réguas do p156 (palavra, fronteira, download) e 0 UNIESCO. URL lida do diário da v142, nunca dactilografada.
// As réguas RE_VISIVEL/RE_DOWNLOAD são lidas da fonte do p156 (aborta se não as ler).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const EV = `${DIR}/evidence/p159-preflight-v144c-24-11-${SUF}.json`;
const EV_TXT = `${DIR}/evidence/p159-preflight-v144c-24-11-${SUF}.txt`;
if ([EV, EV_TXT].some((f) => existsSync(f))) throw new Error('ABORTA: evidencia ja existe — use outro sufixo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const B = (s) => Buffer.byteLength(s);
const n = (t, x) => t.split(x).length - 1;
const rd = (p) => JSON.parse(readFileSync(`${DIR}/${p}`, 'utf8'));

const D142 = rd('audit-publicacao-v142.json');
const URL_AR = D142.deploy.url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const ESP142 = rd('worker-deploy-v142-painel-na-troca/esperado-v142.json');
const ESP144C = rd('worker-deploy-v144c-uniesco/esperado-v144c.json');
const ST_ANTES = rd('evidence/v144c-deployments-status-antes-24-11.json');
const LD_ANTES = rd('evidence/v144c-deployments-list-antes-24-11.json');
const P156 = rd('evidence/p156-varredura-nome-v144c-24-11-a.json');
const P158 = rd('evidence/p158-gera-bundle-v144c-24-11-a.json');
const MANIFEST142 = JSON.parse(readFileSync(`${DIR}/worker-deploy-v142-painel-na-troca/public/manifest.json`, 'utf8'));

// réguas lidas da fonte do p156 — menção de origem não é origem
const SRC156 = readFileSync(`${DIR}/scripts/p156-varredura-nome-v144b.mjs`, 'utf8');
const mVis = /const RE_VISIVEL = (\/[^;]*\/g);/.exec(SRC156);
const mDow = /const RE_DOWNLOAD = (\/[^;]*\/g);/.exec(SRC156);
if (!mVis || !mDow) throw new Error('ABORTA: nao li as reguas da fonte do p156');
const RE_VISIVEL = new RegExp(mVis[1].slice(1, -2), 'g');
const RE_DOWNLOAD = new RegExp(mDow[1].slice(1, -2), 'g');
const visivelDe = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
if (!RE_VISIVEL.test('BFR Conecta') || !RE_DOWNLOAD.test('x-boletim-bfr-2026.pdf')) throw new Error('ABORTA: regua lida sem dente');

const out = {
  ciclo: 'P159-PREFLIGHT-V144C', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem_url: 'audit-publicacao-v142.json', url: URL_AR,
  versao_esperada_no_ar: 'v142 (ebe8e698-620c-47ff-bc88-10c0c25b456c)',
  portoes: {}, total: { ok: 0, falha: 0 },
};
const g = (nome, ok, dado) => { out.portoes[nome] = { passou: ok === true, ...(dado || {}) }; out.total[ok === true ? 'ok' : 'falha'] += 1; };
const falhou = () => {
  const RED = `${DIR}/evidence/p159-preflight-v144c-24-11-${SUF}-VERMELHO.json`;
  const RED_TXT = `${DIR}/evidence/p159-preflight-v144c-24-11-${SUF}-VERMELHO.txt`;
  out.veredito = `P159_PREFLIGHT_V144C_FALHOU ${out.total.ok}/${out.total.falha}`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(RED_TXT, 'VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ') + '\nnode_exit=1\n');
  console.error(out.veredito);
  process.exit(1);
};

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'), ctype: r.headers.get('content-type') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const manifest = await get('/manifest.json');
const notfound = await get('/rota-inexistente-p159-preflight');

const corpoAr = visivelDe(shell.texto);
const velhoAr = [...corpoAr.matchAll(RE_VISIVEL)].length;
const uniescoAr = (corpoAr.match(/UNIESCO/g) || []).length;
const downAr = [...shell.texto.matchAll(RE_DOWNLOAD)].length;
g('A1_shell_no_ar_e_a_v142', shell.http === 200 && shell.md5 === ESP142.htmlMd5 && shell.bytes === ESP142.htmlBytes,
  { medido: { md5: shell.md5, bytes: shell.bytes }, esperado_v142: { md5: ESP142.htmlMd5, bytes: ESP142.htmlBytes } });
g('A2_a_marca_velha_esta_visivel_no_ar_e_UNIESCO_ainda_nao', velhoAr > 0 && uniescoAr === 0,
  { nome_velho_visivel: velhoAr, UNIESCO_no_ar: uniescoAr, nota: 'prova que este preflight olha a versao com a marca velha' });
g('A3_nomes_de_download_velhos_no_ar', downAr > 0, { downloads_bfr_no_ar: downAr, regra: 'RE_DOWNLOAD lido do p156' });
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
g('A4_sw_no_ar_e_o_da_v142_com_etiqueta_e_titulo_velhos', sw.http === 200 && sw.md5 === ESP142.swMd5 && rotuloAr === 'bfr-conecta-v142' && n(sw.texto, "|| 'BFR Conecta';") === 1,
  { rotulo: rotuloAr, md5: sw.md5, esperado: ESP142.swMd5 });
g('A5_manifest_no_ar_e_o_da_v142', manifest.http === 200 && md5(Buffer.from(manifest.texto)) === md5(readFileSync(`${DIR}/worker-deploy-v142-painel-na-troca/public/manifest.json`)) && (MANIFEST142.name || '').includes('BFR'),
  { nome_v142: MANIFEST142.name, md5_ar: md5(Buffer.from(manifest.texto)) });
const porData = [...LD_ANTES].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
g('A6_versao_no_servidor_e_a_v142_a_100', (ST_ANTES.versions || [])[0] && ST_ANTES.versions[0].version_id === 'ebe8e698-620c-47ff-bc88-10c0c25b456c' && ST_ANTES.versions[0].percentage === 100
  && porData[0].versions[0].version_id === 'ebe8e698-620c-47ff-bc88-10c0c25b456c',
  { status: (ST_ANTES.versions || [])[0] || null, lista_mais_nova: porData[0].versions[0].version_id });
g('A7_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http });

const workerDisco = readFileSync(`${DIR}/worker-deploy-v144c-uniesco/worker.mjs`);
const candDisco = readFileSync(`${DIR}/bfr-candidata-v144c-uniesco/index.html`);
g('A8_worker_em_disco_bate_com_o_esperado_v144c', md5(workerDisco) === ESP144C.workerMd5 && workerDisco.length === ESP144C.workerBytes,
  { medido: { md5: md5(workerDisco), bytes: workerDisco.length }, esperado: { md5: ESP144C.workerMd5, bytes: ESP144C.workerBytes } });
g('A9_candidata_em_disco_bate_com_o_esperado_v144c', md5(candDisco) === ESP144C.htmlMd5 && candDisco.length === ESP144C.htmlBytes,
  { medido: { md5: md5(candDisco), bytes: candDisco.length }, esperado: { md5: ESP144C.htmlMd5, bytes: ESP144C.htmlBytes } });
g('A10_p156_e_p158_verdes_no_disco', String(P156.veredito) === 'P156_VARREDURA_NOME_V144C_OK 5/5' && String(P158.veredito).startsWith('P158_BUNDLE_V144C_OK'),
  { p156: P156.veredito, p158: P158.veredito });
g('A11_nada_publicado_ainda_para_v144', !existsSync(`${DIR}/audit-publicacao-v144.json`), { nota: 'o diario de publicacao v144 ainda nao existe' });
if (out.total.falha) falhou();

out.veredito = `P159_PREFLIGHT_V144C_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [out.veredito,
  `ar=${URL_AR} · shell=${shell.md5} (v142) · marca velha visivel ${velhoAr} / downloads ${downAr} / UNIESCO ${uniescoAr}`,
  `disco v144c: worker=${md5(workerDisco)} candidata=${md5(candDisco)} · escrita=0 ddl=0 mint=0 deploy=0 · node_exit=0`];
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\n');
console.log(linhas.join('\n'));
process.exit(0);
