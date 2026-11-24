#!/usr/bin/env node
// P158 — BUNDLE DO WORKER PARA A v144c UNIESCO, SEM PUBLICAR (24/11).
//
// A base e' worker-deploy-v142-painel-na-troca: o worker da v142 tal como o seu esperado o registou. O SW e'
// operado por extracao JSON (parse), cirurgia com contagens, e re-embutido — nunca por regex sobre o texto
// escapado. Os assets publicos: bfr-app-logo.png MUDA DE CONTEUDO (a lockup oficial 800 no nome tecnico, para
// todas as referencias existentes mostrarem a nova marca), manifest.json novo, tres icones uniesco novos; todo o
// resto byte a byte com a base. wrangler.toml identico (name = "bfr-conecta" e' identificador tecnico).
//
// v144c = v144b + os 10 nomes de ficheiro de download com `-bfr-` colado (P157). A etiqueta do cache mantem-se
// 'bfr-conecta-v144': e' identificador tecnico da familia, nao texto visivel.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicacao. Escrita unica em worker-deploy-v144c-uniesco/ e evidence/.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v142-painel-na-troca`;
const NOVO = `${DIR}/worker-deploy-v144c-uniesco`;
const CAND = `${DIR}/bfr-candidata-v144c-uniesco/index.html`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v144c-uniesco/portoes-v144c-candidata.json`, 'utf8'));
const ESP = JSON.parse(readFileSync(`${BASE}/esperado-v142.json`, 'utf8'));
const P150 = JSON.parse(readFileSync(`${DIR}/marca-uniesco/registo-p150.json`, 'utf8'));
const MARCA = `${DIR}/marca-uniesco`;
const DIARIOS = readdirSync(DIR).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10));
const DIARIO = DIARIOS.slice(-1)[0];
const V_NO_AR = /v(\d+)/.exec(DIARIO)[1];
const SUF = (process.argv[2] || 'a').trim();
const EV = `${DIR}/evidence/p158-gera-bundle-v144c-24-11-${SUF}.json`;
const EV_TXT = `${DIR}/evidence/p158-gera-bundle-v144c-24-11-${SUF}.txt`;
if ([EV, EV_TXT].some((f) => existsSync(f))) throw new Error('ABORTA: evidencia ja existe — use outro sufixo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);
const out = {
  em: new Date().toISOString(), gerador: 'scripts/p158-gera-bundle-v144c-uniesco.mjs', publicado: false, sufixo: SUF,
  base: 'worker-deploy-v142-painel-na-troca (certificada pelo esperado-v142.json)',
  candidata: 'bfr-candidata-v144c-uniesco/index.html (P157_DERIVA_V144C_OK 7/0)',
  ar_no_momento: { diario_mais_novo: DIARIO, versao_no_ar: V_NO_AR },
  portoes: {}, total: { ok: 0, falha: 0 },
};
const checa = (nome, passou, detalhe) => { out.portoes[nome] = { passou: passou === true, detalhe }; out.total[passou === true ? 'ok' : 'falha'] += 1; return passou === true; };
const listaVermelhos = () => Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ');
const falhou = () => {
  const RED = `${DIR}/evidence/p158-gera-bundle-v144c-24-11-${SUF}-VERMELHO.json`;
  const RED_TXT = `${DIR}/evidence/p158-gera-bundle-v144c-24-11-${SUF}-VERMELHO.txt`;
  out.veredito = `P158_BUNDLE_V144C_FALHOU ${out.total.ok}/${out.total.falha}`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(RED_TXT, `VERMELHOS: ${listaVermelhos()}\nnode_exit=1\n`);
  console.error(`VERMELHOS: ${listaVermelhos()}`);
  process.exit(1);
};

const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
const extrai = (src, marcador) => {
  const j = src.indexOf(marcador);
  if (j < 0) return null;
  const q = src.indexOf('"', j + marcador.length);
  let k = q + 1;
  for (;;) {
    const c = src.indexOf('"', k);
    if (c < 0) return null;
    let bs = 0, i = c - 1;
    while (src[i] === '\\') { bs++; i--; }
    if (bs % 2 === 0) return { ini: q, fim: c + 1, corpo: JSON.parse(src.slice(q, c + 1)) };
    k = c + 1;
  }
};
const eHtml = extrai(baseTxt, 'const HTML = ');
const eSw = extrai(baseTxt, 'const SW = ');
const eCsp = extrai(baseTxt, 'const CSP = ');
if (!eHtml || !eSw || !eCsp) throw new Error('ABORTA: embeds nao extraiveis da base');

// ---- 1) a base e o worker v142 tal como o esperado o registou; a candidata e a do P157 ----
checa('b1_a_base_e_o_worker_v142_do_seu_esperado', md5(baseTxt) === ESP.workerMd5 && B(baseTxt) === ESP.workerBytes, { lido: { md5: md5(baseTxt), bytes: B(baseTxt) }, esperado: { md5: ESP.workerMd5, bytes: ESP.workerBytes } });
checa('b2_o_embed_html_da_base_e_a_candidata_v142', md5(eHtml.corpo) === ESP.htmlMd5 && B(eHtml.corpo) === ESP.htmlBytes, { lido: { md5: md5(eHtml.corpo), bytes: B(eHtml.corpo) }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
checa('b3_a_candidata_v144c_bate_com_a_saida_certificada_do_p157', md5(readFileSync(CAND, 'utf8')) === PORT_CAND.destino.md5 && String(PORT_CAND.veredito).startsWith('P157_DERIVA_V144C_OK'), { lido: md5(readFileSync(CAND, 'utf8')), certificado: PORT_CAND.destino.md5, veredito: PORT_CAND.veredito });
checa('b4_o_sw_da_base_tem_a_etiqueta_v142_e_o_titulo_velho', n(eSw.corpo, "'bfr-conecta-v142'") === 1 && n(eSw.corpo, "'bfr-conecta-v144'") === 0 && n(eSw.corpo, "|| 'BFR Conecta';") === 1, { v142: n(eSw.corpo, "'bfr-conecta-v142'"), titulo_velho: n(eSw.corpo, "'BFR Conecta'") });

// ---- 2) cirurgia do SW (no corpo parseado, com contagens) ----
let sw = eSw.corpo;
const subSw = (nome, de, para, esperado = 1) => { if (n(sw, de) !== esperado) throw new Error('ABORTA: ' + nome + ' casa ' + n(sw, de) + ' vezes (esperava ' + esperado + ')'); sw = sw.split(de).join(para); };
subSw('etiqueta_do_cache', "'bfr-conecta-v142'", "'bfr-conecta-v144'");
subSw('titulo_push_fallback', "|| 'BFR Conecta';", "|| 'UNIESCO';");
subSw('precache_com_os_icones', "'/bfr-teacher-arrivals.js?v=2'];", "'/bfr-teacher-arrivals.js?v=2', '/uniesco-icon-192.png', '/uniesco-icon-180.png', '/uniesco-icon-512.png'];");
subSw('assets_publicos_com_os_icones', "'/bfr-app-logo.png', '/lia-avatar.svg', '/lia-avatar.png',\n  '/calendario-letivo-2026.pdf',", "'/bfr-app-logo.png', '/uniesco-icon-192.png', '/uniesco-icon-180.png', '/uniesco-icon-512.png', '/lia-avatar.svg', '/lia-avatar.png',\n  '/calendario-letivo-2026.pdf',");
checa('b5_o_sw_novo_tem_etiqueta_titulo_e_icones_e_o_resto_inalterado', n(sw, "'bfr-conecta-v144'") === 1 && n(sw, "'bfr-conecta-v142'") === 0 && n(sw, "|| 'UNIESCO';") === 1 && n(sw, "'BFR Conecta'") === 0 && n(sw, "'/uniesco-icon-192.png'") === 2 && n(sw, "'/uniesco-icon-180.png'") === 2 && n(sw, "'/uniesco-icon-512.png'") === 2 && n(sw, '/bfr-app-logo.png') === n(eSw.corpo, '/bfr-app-logo.png') && n(sw, '/bfr-app-logo.png') === 4, { v144: n(sw, "'bfr-conecta-v144'"), uniesco: n(sw, "'UNIESCO'"), icones192: n(sw, "'/uniesco-icon-192.png'"), bfr_logo: n(sw, '/bfr-app-logo.png'), bfr_logo_base: n(eSw.corpo, '/bfr-app-logo.png') });
let swCompila = true;
try { new Script(sw); } catch (e) { swCompila = false; }
checa('b6_o_sw_novo_compila', swCompila, { bytes: B(sw) });

// ---- 3) o worker novo: um unico rebuild por spans ----
const candTxt = readFileSync(CAND, 'utf8');
const spansBase = [{ nome: 'CSP', span: eCsp }, { nome: 'SW', span: eSw }, { nome: 'HTML', span: eHtml }].sort((a, b) => a.span.ini - b.span.ini);
const workerNovo = (() => {
  const novos = { CSP: eCsp.corpo, SW: sw, HTML: candTxt };
  let s = '', i = 0;
  for (const sp of spansBase) { s += baseTxt.slice(i, sp.span.ini) + JSON.stringify(novos[sp.nome]); i = sp.span.fim; }
  return s + baseTxt.slice(i);
})();
const reHtml = extrai(workerNovo, 'const HTML = ');
const reSw = extrai(workerNovo, 'const SW = ');
const reCsp = extrai(workerNovo, 'const CSP = ');
checa('b7_embeds_reextraidos_batem_com_candidata_e_sw_novo', !!reHtml && !!reSw && md5(reHtml.corpo) === md5(candTxt) && B(reHtml.corpo) === B(candTxt) && reSw.corpo === sw, { html: reHtml ? md5(reHtml.corpo) : null, sw_igual: !!reSw && reSw.corpo === sw });
const esqueleto = (src, spans) => { const ord = spans.slice().sort((a, b) => a.ini - b.ini); let s = '', i = 0; for (const sp of ord) { s += src.slice(i, sp.ini) + '@@' + sp.nome + '@@'; i = sp.fim; } return s + src.slice(i); };
const spBase = [{ nome: 'HTML', ini: eHtml.ini, fim: eHtml.fim }, { nome: 'SW', ini: eSw.ini, fim: eSw.fim }, { nome: 'CSP', ini: eCsp.ini, fim: eCsp.fim }];
const spNovo = [{ nome: 'HTML', ini: reHtml.ini, fim: reHtml.fim }, { nome: 'SW', ini: reSw.ini, fim: reSw.fim }, { nome: 'CSP', ini: reCsp.ini, fim: reCsp.fim }];
const esqueletoAntes = md5(esqueleto(baseTxt, spBase));
checa('b8_fora_dos_tres_embeds_o_worker_e_byte_a_byte_e_a_regua_tem_dente', !!reCsp && md5(esqueleto(workerNovo, spNovo)) === esqueletoAntes && md5(esqueleto(workerNovo + ' /*X*/', spNovo)) !== esqueletoAntes && reCsp.corpo === eCsp.corpo, { antes: esqueletoAntes, depois: reCsp ? md5(esqueleto(workerNovo, spNovo)) : null });
writeFileSync(`${NOVO}.worker-check.tmp.mjs`, workerNovo);
const chk = spawnSync(process.execPath, ['--check', `${NOVO}.worker-check.tmp.mjs`], { encoding: 'utf8' });
unlinkSync(`${NOVO}.worker-check.tmp.mjs`);
checa('b9_o_worker_novo_compila', chk.status === 0, { erro: chk.status === 0 ? null : String(chk.stderr || '').trim().slice(0, 240) });

// ---- 4) o manifest novo ----
const manifest = {
  name: 'UNIESCO', short_name: 'UNIESCO',
  description: 'Portal escolar UNIESCO da Escola Benício Ferreira Reis.',
  lang: 'pt-BR', id: '/', scope: '/', start_url: '/',
  display: 'standalone', display_override: ['standalone', 'minimal-ui'],
  background_color: '#ffffff', theme_color: '#00399b',
  icons: [
    { src: 'uniesco-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'uniesco-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
const baseManifest = JSON.parse(readFileSync(`${BASE}/public/manifest.json`, 'utf8'));
checa('b10_o_manifest_novo_e_UNIESCO_e_so_muda_o_que_a_marca_manda', manifest.name === 'UNIESCO' && manifest.theme_color === NAVY150() && manifest.icons.length === 2 && manifest.id === baseManifest.id && manifest.scope === baseManifest.scope && manifest.start_url === baseManifest.start_url && manifest.display === baseManifest.display && manifest.lang === baseManifest.lang, { novo: manifest, theme_color: manifest.theme_color });
function NAVY150() { return P150.paleta_medida.navy_institucional; }

// ---- 5) escreve o diretorio novo ----
const jaExistia = existsSync(NOVO);
if (!jaExistia) { mkdirSync(`${NOVO}/public`, { recursive: true }); }
writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
writeFileSync(`${NOVO}/public/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
copyFileSync(`${MARCA}/uniesco-logo-800.png`, `${NOVO}/public/bfr-app-logo.png`);
copyFileSync(`${MARCA}/uniesco-simbolo-192.png`, `${NOVO}/public/uniesco-icon-192.png`);
copyFileSync(`${MARCA}/uniesco-simbolo-180.png`, `${NOVO}/public/uniesco-icon-180.png`);
copyFileSync(`${MARCA}/uniesco-simbolo-512.png`, `${NOVO}/public/uniesco-icon-512.png`);
const assetsBase = readdirSync(`${BASE}/public`).filter((f) => f !== 'manifest.json' && f !== 'bfr-app-logo.png');
for (const f of assetsBase) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);

const F = (p) => md5(readFileSync(p));
checa('b11_a_logo_tecnica_agora_e_a_lockup_oficial_800', F(`${NOVO}/public/bfr-app-logo.png`) === P150.ficheiros['uniesco-logo-800.png'].md5, { lido: F(`${NOVO}/public/bfr-app-logo.png`), esperado: P150.ficheiros['uniesco-logo-800.png'].md5 });
checa('b12_os_tres_icones_batem_com_o_p150', ['uniesco-icon-192.png:uniesco-simbolo-192.png', 'uniesco-icon-180.png:uniesco-simbolo-180.png', 'uniesco-icon-512.png:uniesco-simbolo-512.png'].every((par) => { const [novo, orig] = par.split(':'); return F(`${NOVO}/public/${novo}`) === P150.ficheiros[orig].md5; }), { icones: readdirSync(`${NOVO}/public`).filter((f) => f.startsWith('uniesco-icon')) });
const diferentesEsperados = ['manifest.json', 'bfr-app-logo.png'];
const iguais = assetsBase.filter((f) => readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`)));
checa('b13_todos_os_outros_assets_byte_a_byte_com_a_base', iguais.length === assetsBase.length, { total_base: assetsBase.length, iguais: iguais.length, diferentes_esperados: diferentesEsperados });
checa('b14_o_manifest_escrito_faz_parse_e_diz_UNIESCO', (() => { const m = JSON.parse(readFileSync(`${NOVO}/public/manifest.json`, 'utf8')); return m.name === 'UNIESCO' && m.short_name === 'UNIESCO' && m.theme_color === '#00399b' && m.icons.length === 2; })(), { manifest: readFileSync(`${NOVO}/public/manifest.json`, 'utf8').slice(0, 200) });
checa('b15_headers_e_wrangler_identicos_a_base', readFileSync(`${NOVO}/public/_headers`).equals(readFileSync(`${BASE}/public/_headers`)) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('b16_o_worker_do_dir_bate_com_o_desta_corrida', readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), { bytes: B(workerNovo) });
checa('b17_nada_foi_publicado_por_esta_peca', !existsSync(`${DIR}/audit-publicacao-v144.json`) && V_NO_AR !== '144', { diario_mais_novo: DIARIO, versao_no_ar: V_NO_AR, diario_v144: existsSync(`${DIR}/audit-publicacao-v144.json`) });
if (out.total.falha) falhou();

const reguas = {
  workerMd5: md5(workerNovo), workerBytes: B(workerNovo),
  swMd5: md5(sw), swBytes: B(sw), cacheLabel: 'bfr-conecta-v144',
  htmlMd5: md5(candTxt), htmlBytes: B(candTxt),
  baseWorkerMd5: ESP.workerMd5, baseHtmlMd5: ESP.htmlMd5, baseSwMd5: ESP.swMd5,
  headersMd5: md5(readFileSync(`${NOVO}/public/_headers`)),
  logoTecnicaMd5: F(`${NOVO}/public/bfr-app-logo.png`),
  icones: { 192: F(`${NOVO}/public/uniesco-icon-192.png`), 180: F(`${NOVO}/public/uniesco-icon-180.png`), 512: F(`${NOVO}/public/uniesco-icon-512.png`) },
  deltaWorkerBytes: B(workerNovo) - ESP.workerBytes,
  ar_no_momento: { diario: DIARIO, versao: V_NO_AR },
  origemReguas: ['worker-deploy-v142-painel-na-troca/esperado-v142.json', CAND, 'bfr-candidata-v144c-uniesco/portoes-v144c-candidata.json', `${MARCA}/registo-p150.json`],
};
out.esperado = reguas;
writeFileSync(`${NOVO}/esperado-v144c.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
const relido = JSON.parse(readFileSync(`${NOVO}/esperado-v144c.json`, 'utf8'));
checa('b18_o_esperado_re_lido_bate_com_as_reguas', Object.keys(reguas).every((k) => JSON.stringify(relido[k]) === JSON.stringify(reguas[k])), { campos: Object.keys(reguas).length });
if (out.total.falha) falhou();
out.veredito = `P158_BUNDLE_V144C_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [
  out.veredito,
  `escrito ${NOVO.replace(DIR + '/', '')} — worker=${reguas.workerMd5} (${reguas.workerBytes} B) html=${reguas.htmlMd5} etiqueta=${reguas.cacheLabel} logo-tecnica=${reguas.logoTecnicaMd5}`,
  `ar_no_momento=${DIARIO} (v${V_NO_AR}) · publicado=${out.publicado} · o deploy fica sem OK, como manda o brief`,
];
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(linhas.join('\n'));
process.exit(0);
