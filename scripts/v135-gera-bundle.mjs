// V135 — gerador do bundle do Worker para a PUBLICACAO da v135 (headers anti-cliquejacking).
// A v135 e a sucessora documentada de bfr-candidata-v124-anticliquejacking (nunca publicada; o seu
// worker e monolitico sobre uma base velha), re-aplicada sobre a base v134 em producao. O patch e
// exclusivamente de headers, em 4 sitios medidos no velho v124: (1) `frame-ancestors 'self'` na CSP
// principal, (2) const FRAME_GUARD, (3) x-frame-options SAMEORIGIN na resposta da shell HTML, e
// (4) CSP=FRAME_GUARD + x-frame-options SAMEORIGIN em cada asset que sai pelo fallback ASSETS.
// MEDIDO NO POS-DEPLOY (19/11): o worker NAO e invocado para pedidos de asset — o Cloudflare
// serve-os direto, logo o sitio (4) do patch nunca dispara no ar. O mecanismo que leva os headers
// aos assets servidos e o ficheiro public/_headers (documentado em developers.cloudflare.com/
// workers/static-assets/headers/), que este gerador tambem escreve e gatea: os 12 assets saem com
// os dois headers, e o sitio (4) fica como o mesmo patch do velho v124 (dispara se um dia o
// run_worker_first for ligado). O HTML embed NAO muda nesta versao (md5 igual ao da v134); muda o
// SW (etiqueta de cache v134->v135) e o handler. 0 deploy, 0 DDL, 0 escrita no ar: a unica escrita
// e worker-deploy-v135-headers (abort-if-exists no directorio => verifica byte a byte) e o
// esperado-v135.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v134-sidebar`;
const NOVO = `${DIR}/worker-deploy-v135-headers`;
const ESP_BASE = JSON.parse(readFileSync(`${BASE}/esperado-v134.json`, 'utf8'));
const EV_OUT = `${DIR}/evidence/v135-gera-bundle-19-11.json`;
if (existsSync(EV_OUT)) throw new Error('ABORTA: ' + EV_OUT + ' existe — renomeie como ANTERIOR e re-corra');
const OK_LITERAL = 'Sim, publicar ambos (v124+v125 sobre a base v134)'; // opcao selecionada em 18/11
const ETIQUETA_NOVA = 'bfr-conecta-v135';
const HEADERS_TXT = '/*\n\tX-Frame-Options: SAMEORIGIN\n\tContent-Security-Policy: frame-ancestors \'self\'; base-uri \'self\'; form-action \'self\'\n';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const out = { em: new Date().toISOString(), gerador: 'scripts/v135-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v134-sidebar (a v134 publicada, 8600fc3d — evidence/v134-deploy-stdout-18-11.txt)',
  sucessora_de: 'bfr-candidata-v124-anticliquejacking (nunca publicada; patch de headers re-aplicado sobre a base v134)',
  ok_literal: OK_LITERAL,
  nota_ok_literal: 'pergunta de 18/11 «Publicar v124 + v125?» -> «Sim, publicar ambos». Ambito: este deploy do Worker e o deploy da v136; nada de DDL, escrita no banco, mint ou push',
  portoes: {}, total: { ok: 0, falha: 0 } };
const checa = (nome, valor, esperado, extra) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { passou, ...(extra || {}) };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
};
const falhou = () => {
  writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
  console.error(`VERMELHOS: ${Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ')}`);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);
const n = (t, x) => t.split(x).length - 1;

// ---- 1) a base e exatamente a v134 publicada ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_o_publicado_v134', { md5: md5(Buffer.from(baseTxt)), bytes: Buffer.byteLength(baseTxt) },
  { md5: ESP_BASE.workerMd5, bytes: ESP_BASE.workerBytes });

// ---- 2) as quatro ancoras da cirurgia existem na base nas contagens esperadas ----
const ANC_CSP_FIM = "form-action 'self' https://accounts.google.com https://*.supabase.co\";";
const ANC_NOFOUNDR = '\nconst NOFOUNDR = {';
const ANC_SHELL_HEADERS = "          'content-security-policy': CSP,\n          'x-content-type-options': 'nosniff',";
const ANC_ASSET_RETURN = '    if (asset.status !== 404) return asset;';
const ANC_SW = "const SW = \"const CACHE = 'bfr-conecta-v134';";
checa('S2_ancoras_da_base_nas_contagens_esperadas', {
  csp_fim: n(baseTxt, ANC_CSP_FIM), nofoundr: n(baseTxt, ANC_NOFOUNDR), shell_headers: n(baseTxt, ANC_SHELL_HEADERS),
  asset_return: n(baseTxt, ANC_ASSET_RETURN), sw_v134: n(baseTxt, ANC_SW),
  frame_ancestors_antes: n(baseTxt, 'frame-ancestors'), frame_guard_antes: n(baseTxt, 'FRAME_GUARD'),
  x_frame_antes: n(baseTxt, 'x-frame-options') },
  { csp_fim: 1, nofoundr: 1, shell_headers: 1, asset_return: 1, sw_v134: 1, frame_ancestors_antes: 0, frame_guard_antes: 0, x_frame_antes: 0 });

// ---- 3) o embed HTML da base e o da v134 (nao muda na v135) ----
const extrai = (src, marcador) => {
  const j = src.indexOf(marcador);
  if (j < 0) return null;
  const q = src.indexOf('"', j + marcador.length);
  let k = q + 1;
  while (true) {
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
if (!eHtml || !eSw) { console.error('ABORTO: embeds nao extraiveis da base'); process.exit(1); }
checa('S3_embed_html_da_base_e_a_shell_v134', md5(Buffer.from(eHtml.corpo)), ESP_BASE.htmlMd5);
checa('S4_sw_da_base_com_etiqueta_v134_uma_vez', n(eSw.corpo, 'bfr-conecta-v134'), 1);
checa('S4b_sw_da_base_sem_etiqueta_v135', n(eSw.corpo, ETIQUETA_NOVA), 0);

// ---- 4) cirurgia: 5 substituicoes exatas, cada uma com delta medido ----
const PED_CSP_FIM_NOVO = "form-action 'self' https://accounts.google.com https://*.supabase.co; frame-ancestors 'self'\";";
const PED_FRAME_GUARD = '\nconst FRAME_GUARD = "frame-ancestors \'self\'; base-uri \'self\'; form-action \'self\'";\n\nconst NOFOUNDR = {';
const PED_SHELL_NOVO = "          'content-security-policy': CSP,\n          'x-frame-options': 'SAMEORIGIN',\n          'x-content-type-options': 'nosniff',";
const PED_ASSET_NOVO = `    if (asset.status !== 404) {
      // PEN-24 (medido 16/11, re-aplicado 19/11): os assets saiam do Worker sem qualquer
      // cabecalho, e um PDF e um documento framavel. Preserva status/bytes e so acrescenta
      // os dois cabecalhos.
      const h = new Headers(asset.headers);
      h.set('content-security-policy', FRAME_GUARD);
      h.set('x-frame-options', 'SAMEORIGIN');
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers: h });
    }`;
const PED_SW_NOVO = "const SW = \"const CACHE = 'bfr-conecta-v135';";
const substituicoes = [
  ['csp_frame_ancestors', ANC_CSP_FIM, PED_CSP_FIM_NOVO],
  ['const_frame_guard', ANC_NOFOUNDR, PED_FRAME_GUARD],
  ['shell_x_frame_options', ANC_SHELL_HEADERS, PED_SHELL_NOVO],
  ['asset_headers', ANC_ASSET_RETURN, PED_ASSET_NOVO],
  ['sw_etiqueta', ANC_SW, PED_SW_NOVO],
];
let workerNovo = baseTxt;
const deltas = {};
for (const [nome, velho, novo] of substituicoes) {
  if (n(workerNovo, velho) !== 1) { console.error(`ABORTO: ancora ${nome} nao ocorre 1x no estado actual`); process.exit(1); }
  deltas[nome] = Buffer.byteLength(novo) - Buffer.byteLength(velho);
  workerNovo = workerNovo.replace(velho, novo);
}
const deltaEsperado = Object.values(deltas).reduce((a, b) => a + b, 0);

// ---- 5) portoes pos-cirurgia ----
checa('S5_marcadores_novos_nas_contagens_esperadas', {
  frame_ancestors: n(workerNovo, 'frame-ancestors'), frame_guard: n(workerNovo, 'FRAME_GUARD'),
  x_frame: n(workerNovo, 'x-frame-options'), h_set_csp: n(workerNovo, "h.set('content-security-policy', FRAME_GUARD)"),
  csp_v135: n(workerNovo, 'bfr-conecta-v135'), csp_v134_resto: n(workerNovo, 'bfr-conecta-v134') },
  { frame_ancestors: 2, frame_guard: 2, x_frame: 2, h_set_csp: 1, csp_v135: 1, csp_v134_resto: 0 });
checa('S5b_delta_total_bate_com_a_soma_das_cinco_substituicoes', Buffer.byteLength(workerNovo) - Buffer.byteLength(baseTxt), deltaEsperado,
  { deltas, delta_medido: Buffer.byteLength(workerNovo) - Buffer.byteLength(baseTxt) });

const tmp = `${DIR}/worker-deploy-v135-headers.worker-check.tmp.mjs`;
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
unlinkSync(tmp);
checa('S6_worker_novo_compila', compila, true, { erro: erroCompil });

const reHtml = extrai(workerNovo, 'const HTML = ');
checa('S7_embed_html_nao_mudou', reHtml ? md5(Buffer.from(reHtml.corpo)) : null, ESP_BASE.htmlMd5);
checa('S7b_embed_novo_e_json_stringify_da_shell_v134', reHtml ? (workerNovo.slice(reHtml.ini, reHtml.fim) === JSON.stringify(eHtml.corpo)) : false, true);
const reSw = extrai(workerNovo, 'const SW = ');
checa('S8_sw_embutido_com_etiqueta_v135_uma_vez_e_v134_zero', reSw ? { v135: n(reSw.corpo, ETIQUETA_NOVA), v134: n(reSw.corpo, 'bfr-conecta-v134'), bytes_iguais: Buffer.byteLength(reSw.corpo) === Buffer.byteLength(eSw.corpo) } : null,
  { v135: 1, v134: 0, bytes_iguais: true });
const reCspBase = extrai(baseTxt, 'const CSP = ');
const reCspNovo = extrai(workerNovo, 'const CSP = ');
const cspRawBase = reCspBase ? baseTxt.slice(reCspBase.ini, reCspBase.fim) : null;
const cspRawNovo = reCspNovo ? workerNovo.slice(reCspNovo.ini, reCspNovo.fim) : null;
checa('S9_csp_so_ganhou_frame_ancestors_e_mantem_supabase',
  { ganhou: !!cspRawBase && !!cspRawNovo && (cspRawNovo + ';') === (cspRawBase + ';').replace(ANC_CSP_FIM, PED_CSP_FIM_NOVO),
    supabase_connect: /\*\.supabase\.co/.test(reCspNovo ? reCspNovo.corpo : ''),
    frame_ancestors_no_corpo: n(reCspNovo ? reCspNovo.corpo : '', 'frame-ancestors'),
    sem_frame_ancestors_na_base: !/frame-ancestors/.test(reCspBase ? reCspBase.corpo : '') },
  { ganhou: true, supabase_connect: true, frame_ancestors_no_corpo: 1, sem_frame_ancestors_na_base: true });
checa('S10_um_unico_embed_de_cada', { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') },
  { html: 1, sw: 1, csp: 1 });

if (out.total.falha) falhou();

// ---- 6) escreve (ou verifica) o diretorio novo ----
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of readdirSync(`${BASE}/public`).sort()) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
// O _headers e o mecanismo que leva os dois headers aos assets servidos (o worker nao corre para
// pedidos de asset). Escreve-se so se nao existir; existindo com conteudo diferente, ABORTA.
if (!existsSync(`${NOVO}/public/_headers`)) writeFileSync(`${NOVO}/public/_headers`, HEADERS_TXT);
else if (readFileSync(`${NOVO}/public/_headers`, 'utf8') !== HEADERS_TXT) {
  console.error('ABORTO: public/_headers existe com conteudo diferente do gateado');
  process.exit(1);
}
checa('S15_headers_arquivo_gateado_e_no_lugar', readFileSync(`${NOVO}/public/_headers`, 'utf8'), HEADERS_TXT,
  { bytes: Buffer.byteLength(HEADERS_TXT), md5: md5(Buffer.from(HEADERS_TXT)) });
const assets = readdirSync(`${BASE}/public`).sort();
checa('S11_12_assets_copiados_byte_a_byte', assets.every((f) => existsSync(`${NOVO}/public/${f}`) && readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`))), true,
  { total: assets.length, lista: assets });
checa('S12_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S13_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S13b_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(Buffer.from(workerNovo)), workerBytes: Buffer.byteLength(workerNovo),
  swMd5: md5(Buffer.from(reSw.corpo)), swBytes: Buffer.byteLength(reSw.corpo),
  htmlMd5: md5(Buffer.from(eHtml.corpo)), htmlBytes: Buffer.byteLength(eHtml.corpo),
  cacheLabel: ETIQUETA_NOVA,
  baseWorkerMd5: ESP_BASE.workerMd5, baseWorkerBytes: ESP_BASE.workerBytes,
  baseSwMd5: ESP_BASE.swMd5, baseSwBytes: ESP_BASE.swBytes,
  baseHtmlMd5: ESP_BASE.htmlMd5, baseHtmlBytes: ESP_BASE.htmlBytes,
  deltaWorkerBytes: Buffer.byteLength(workerNovo) - ESP_BASE.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  headersMd5: md5(Buffer.from(HEADERS_TXT)), headersBytes: Buffer.byteLength(HEADERS_TXT),
  ok_literal: OK_LITERAL,
  origemReguas: [`${BASE}/esperado-v134.json`, 'evidence/v134-deploy-stdout-18-11.txt', 'public/_headers (mecanismo de headers dos assets)'],
};
checa('S14_regua_do_delta_consistente', reguas.deltaWorkerBytes, deltaEsperado);
if (out.total.falha) falhou();
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
out.portoes_resumo = `${out.total.ok}/${out.total.falha}`;
out.veredito = out.total.falha ? `V135_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}` : `V135_BUNDLE_OK ${out.total.ok}/${out.total.falha}`;
writeFileSync(`${NOVO}/esperado-v135.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${NOVO} — ${out.veredito}  worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} sw=${reguas.swMd5} etiqueta=${reguas.cacheLabel}`);
process.exit(out.total.falha ? 1 : 0);
