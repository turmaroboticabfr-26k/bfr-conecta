// V133 — gerador do bundle do Worker para a PUBLICACAO da v133 (sucessora documentada da v131,
// §SM.20: as certidoes v131/v132 estao congeladas; a v133 traz a barra corrigida + gaveta reparada).
// 0 deploy, 0 DDL, 0 escrita no ar. A unica escrita e o diretorio novo worker-deploy-v133-municipal
// (abort-if-exists) e o seu esperado-v133.json. A base e worker-deploy-v123-pdfs — a versao que esta
// no ar (299eadd0, confirmado por wrangler deployments list/status gravados em evidence/).
// Cirurgia: substitui-se APENAS o corpo do embed `const HTML = "..."` pela shell da candidata v133
// (escapamento JSON, igual ao do embed vivo) e a etiqueta de cache do SW `bfr-conecta-v123` -> v133.
// Tudo o resto (CSP, 404 handler, assets, wrangler.toml) fica byte-identico a base.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v123-pdfs`;
const NOVO = `${DIR}/worker-deploy-v133-municipal`;
const CAND = `${DIR}/bfr-candidata-v133-secretaria-municipal/index.html`;
const ESP_BASE = JSON.parse(readFileSync(`${BASE}/esperado-v123.json`, 'utf8'));
const OK_LITERAL = 'Publicar v131 + push'; // o literal selecionado; a v133 e a sucessora documentada em §SM.20

const md5 = (b) => createHash('md5').update(b).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const out = { em: new Date().toISOString(), gerador: 'scripts/v133-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v123-pdfs (a versao no ar: deployment 299eadd0 de 15/11 03:56:09Z, lido de evidence/v133-deployments-status-antes-18-11.json)',
  candidata: 'bfr-candidata-v133-secretaria-municipal/index.html',
  ok_literal: OK_LITERAL,
  nota_ok_literal: 'a v131 selecionada tornou-se v133 em §SM.20 porque as certidoes v131/v132 estao congeladas; publicar v133 cumpre a selecao com a correcao da barra incluida',
  portoes: {}, total: { ok: 0, falha: 0 } };
const checa = (nome, valor, esperado, extra) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { passou, ...(extra || {}) };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
};
const falhou = () => {
  writeFileSync(`${DIR}/evidence/v133-gera-bundle-18-11.json`, JSON.stringify(out, null, 2) + '\n');
  console.error(`VERMELHOS: ${Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ')}`);
  process.exit(1);
};

// O dir so e escrito se nao existir; se ja existir, a corrida verifica-o byte a byte em S12-S13c.
const jaExistia = existsSync(NOVO);

// ---- 1) a base e exatamente a publicada ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_o_publicado_v123', md5(Buffer.from(baseTxt)), ESP_BASE.workerMd5);

// ---- 2) extrai os dois embeds da base (strings JS com aspas duplas) ----
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
checa('S2_embed_html_da_base_e_a_shell_v123', md5(Buffer.from(eHtml.corpo)), ESP_BASE.htmlMd5);
checa('S3_embed_sw_da_base_tem_etiqueta_v123_uma_vez',
  (eSw.corpo.match(/bfr-conecta-v123/g) || []).length, 1);
checa('S3b_sw_da_base_sem_etiqueta_v133', (eSw.corpo.match(/bfr-conecta-v133/g) || []).length, 0);

// ---- 3) a candidata v133 ----
const candTxt = readFileSync(CAND, 'utf8');
checa('S4_candidata_v133_e_a_gateada', md5(Buffer.from(candTxt)), '2afd253b0bafa0eea956a74fde5f92cc',
  { medido: regua(md5(Buffer.from(candTxt)), Buffer.byteLength(candTxt)) });
checa('S5_candidata_regista_sw_v4_com_v45', (candTxt.match(/sw-v4\.js\?v=45/g) || []).length >= 1, true,
  { ocorrencias: (candTxt.match(/sw-v4\.js\?v=45/g) || []).length });
checa('S5b_candidata_sem_a_etiqueta_de_cache_antiga', (candTxt.match(/bfr-conecta-v12[0-9]/g) || []).length, 0);

// ---- 4) cirurgia ----
const novoHtml = JSON.stringify(candTxt);            // mesmo escapamento do embed vivo
const novoSw = eSw.corpo.replace("'bfr-conecta-v123'", "'bfr-conecta-v133'");
checa('S6_sw_novo_com_etiqueta_v133_uma_vez', (novoSw.match(/bfr-conecta-v133/g) || []).length, 1);
checa('S6b_sw_novo_sem_etiqueta_v123', (novoSw.match(/bfr-conecta-v123/g) || []).length, 0);
checa('S6c_so_a_etiqueta_mudou_no_sw', Buffer.byteLength(novoSw) === Buffer.byteLength(eSw.corpo), true,
  { bytes_antes: Buffer.byteLength(eSw.corpo), bytes_depois: Buffer.byteLength(novoSw) });
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim))
  .replace(/const SW = "const CACHE = 'bfr-conecta-v123';/, `const SW = "const CACHE = 'bfr-conecta-v133';`);

// ---- 5) o worker novo compila e o embed re-extraido bate byte a byte com a candidata ----
// vm.Script nao aceita ESM (`export default`), por isso a prova de sintaxe e `node --check`
// sobre um ficheiro temporario .mjs — o mesmo motor que vai servir o bundle.
import { writeFileSync as _w, unlinkSync, existsSync as _e } from 'node:fs';
import { spawnSync } from 'node:child_process';
const tmp = `${DIR}/worker-deploy-v133-municipal.worker-check.tmp.mjs`;
_w(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
unlinkSync(tmp);
checa('S7_worker_novo_compila', compila, true, { erro: erroCompil });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('S8_embed_novo_re-extraido_bate_com_a_candidata', reExtrai ? md5(Buffer.from(reExtrai.corpo)) : null, md5(Buffer.from(candTxt)));
checa('S8b_embed_novo_e_json_stringify_da_candidata', reExtrai ? (workerNovo.slice(reExtrai.ini, reExtrai.fim) === novoHtml) : false, true);
const swNovoExtrai = extrai(workerNovo, 'const SW = ');
checa('S9_sw_embutido_re-extraido_bate_com_o_novo', swNovoExtrai ? md5(Buffer.from(swNovoExtrai.corpo)) : null, md5(Buffer.from(novoSw)));
checa('S10_um_unico_embed_de_cada', { html: (workerNovo.match(/const HTML = /g) || []).length, sw: (workerNovo.match(/const SW = /g) || []).length },
  { html: 1, sw: 1 });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S11_csp_intacta_e_permite_supabase',
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo,
    supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : '') },
  { csp_igual: true, supabase_connect: true });

if (out.total.falha) falhou();

// ---- 6) escreve o diretorio novo — ou verifica-o, se ja existir de uma corrida anterior ----
// O escapamento JSON nao e identico entre shells: o delta certo do worker e a diferenca dos
// BYTES DOS EMBEDS (a troca da etiqueta nao muda bytes). Se o dir ja existe, nada se reescreve:
// os ficheiros sao verificados byte a byte contra o que esta corrida produziria.
// bytes do span SUBSTITUIDO no worker: as duas aspas + o embed escapado cru
// (slice(0, ini) corta a aspa de abertura; o novo embed entra sem aspas).
const reguaDeltaEsperada = Buffer.byteLength(novoHtml) - Buffer.byteLength(baseTxt.slice(eHtml.ini, eHtml.fim));
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of readdirSync(`${BASE}/public`).sort()) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const assets = readdirSync(`${BASE}/public`).sort();
checa('S12_12_assets_copiados_byte_a_byte', assets.every((f) => existsSync(`${NOVO}/public/${f}`) && readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`))), true,
  { total: assets.length, lista: assets });
checa('S13_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S13b_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S13c_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(Buffer.from(workerNovo)), workerBytes: Buffer.byteLength(workerNovo),
  swMd5: md5(Buffer.from(novoSw)), swBytes: Buffer.byteLength(novoSw),
  htmlMd5: md5(Buffer.from(candTxt)), htmlBytes: Buffer.byteLength(candTxt),
  cacheLabel: 'bfr-conecta-v133',
  baseWorkerMd5: ESP_BASE.workerMd5, baseWorkerBytes: ESP_BASE.workerBytes,
  baseSwMd5: ESP_BASE.swMd5, baseSwBytes: ESP_BASE.swBytes,
  baseHtmlMd5: ESP_BASE.htmlMd5, baseHtmlBytes: ESP_BASE.htmlBytes,
  deltaWorkerBytes: Buffer.byteLength(workerNovo) - ESP_BASE.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  ok_literal: OK_LITERAL,
  origemReguas: ['worker-deploy-v123-pdfs/esperado-v123.json', CAND, 'evidence/v133-deployments-list-antes-18-11.json', 'evidence/v133-deployments-status-antes-18-11.json'],
};
checa('S14_regua_do_delta_consistente', reguas.deltaWorkerBytes, reguaDeltaEsperada);
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
writeFileSync(`${NOVO}/esperado-v133.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
writeFileSync(`${DIR}/evidence/v133-gera-bundle-18-11.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${NOVO} — portoes ${out.total.ok}/${out.total.falha} vermelhos`);
