// V138 — gerador do bundle do Worker para a candidata v138 (painel municipal por município, NÃO publicada).
//
// Base: worker-deploy-v137-remendo-pen40. Escolhida por medida, não por hábito: o `htmlMd5` do `esperado-v137.json`
// é byte a byte a shell publicada da v136 (9e236a23eed978cf7c2a2743d449b307, 3 547 458 B), que é também a origem
// declarada nos portões da candidata v138 — logo o worker da v137 difere do publicado só no asset remendado da
// PEN-40 e na etiqueta do SW, e empilhar aqui significa que a v138 leva a PEN-40 dentro. A alternativa (base v136)
// produziria uma v138 sem o remendo medido, o que é regressão; fica documentada, não executada.
//
// O que muda: (a) o embed `const HTML = "…"` passa a ser `JSON.stringify` do index.html da candidata v138;
// (b) a etiqueta do SW passa de bfr-conecta-v137 para bfr-conecta-v138 (15 caracteres, mesmo comprimento, e o
// fetch é network-first — o bump força a reinstalação que re-precacheia o shell novo). CSP, FRAME_GUARD, NOFOUNDR,
// os 13 assets e o módulo remendado ficam byte a byte.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no ar. Única escrita: worker-deploy-v138-painel-municipal/ (worker.mjs,
// public/, wrangler.toml, esperado-v138.json) e os artefactos em evidence/. Se o diretório já existir, verifica
// byte a byte e NÃO reescreve. A PUBLICAÇÃO exige OK literal novo.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v137-remendo-pen40`;
const NOVO = `${DIR}/worker-deploy-v138-painel-municipal`;
const CAND = `${DIR}/bfr-candidata-v138-painel-municipal/index.html`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json`, 'utf8'));
const ESP137 = JSON.parse(readFileSync(`${BASE}/esperado-v137.json`, 'utf8'));
const DDL39 = `${DIR}/scripts/p73-pen39-ddl-candidata.sql`;
const EV_OUT = `${DIR}/evidence/v138-gera-bundle-20-11.json`;
const EV_TXT = `${DIR}/evidence/v138-gera-bundle-20-11.txt`;
const EV_OUT_V = `${DIR}/evidence/v138-gera-bundle-20-11-VERMELHO.json`;
const EV_TXT_V = `${DIR}/evidence/v138-gera-bundle-20-11-VERMELHO.txt`;
if ([EV_OUT, EV_TXT, EV_OUT_V, EV_TXT_V].some((f) => existsSync(f)))
  throw new Error('ABORTA: artefacto de evidência já existe — renomeie como ANTERIOR e re-corra');
const NAO_PUBLICAR = '(sem OK literal — candidata pronta; a publicacao exige OK literal novo)';

const md5 = (b) => createHash('md5').update(Buffer.from(b)).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);

const out = { em: new Date().toISOString(), gerador: 'scripts/v138-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v137-remendo-pen40 (candidata da PEN-40 ainda nao publicada; o ar esta na v136)',
  base_alternativa_nao_executada: 'worker-deploy-v136-secretaria-de-educacao — daria uma v138 sem o remendo da PEN-40, que e regressao',
  candidata: 'bfr-candidata-v138-painel-municipal/index.html',
  ok_literal: NAO_PUBLICAR,
  nota_ok_literal: 'bundle de candidata: NAO publica nada. A publicacao (deploy) exige OK literal novo, à semelhanca da v136 e da v137',
  portoes: {}, total: { ok: 0, falha: 0 } };
const checa = (nome, valor, esperado, extra) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { passou, ...(extra || {}) };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
};
const falhou = () => {
  const linha = `VERMELHOS: ${Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ')}`;
  out.veredito = `V138_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}`;
  writeFileSync(EV_OUT_V, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(EV_TXT_V, linha + '\nnode_exit=1\n');
  console.error(linha);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);

// ---- 1) a base é exatamente o worker da v137 como o seu diário o registou ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_o_bundle_v137_do_seu_esperado', { md5: md5(baseTxt), bytes: B(baseTxt) },
  { md5: ESP137.workerMd5, bytes: ESP137.workerBytes });

// ---- 2) extrai os embeds da base ----
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
checa('S2_embed_html_da_base_e_a_shell_publicada_da_v136', { md5: md5(eHtml.corpo), bytes: B(eHtml.corpo) },
  { md5: ESP137.htmlMd5, bytes: ESP137.htmlBytes });
checa('S3_etiqueta_v137_uma_vez_e_v138_zero_na_base', { v137: n(baseTxt, "'bfr-conecta-v137'"), v138: n(baseTxt, "'bfr-conecta-v138'") },
  { v137: 1, v138: 0 });

// ---- 3) a candidata v138, conferida contra os portões dela e contra o DDL ----
const candTxt = readFileSync(CAND, 'utf8');
checa('S4_candidata_e_a_gateadapelos_portoes_da_v138', { md5: md5(candTxt), bytes: B(candTxt) },
  { md5: PORT_CAND.saida.md5, bytes: PORT_CAND.saida.bytes }, { veredito_da_candidata: PORT_CAND.veredito });
checa('S4b_veredito_da_candidata_ok', typeof PORT_CAND.veredito === 'string' && PORT_CAND.veredito.startsWith('V138_CANDIDATA_OK'), true,
  { veredito: PORT_CAND.veredito, portoes: (PORT_CAND.portoes || []).length });
checa('S4c_origem_declarada_da_candidata_e_o_embed_da_base', PORT_CAND.origem.md5, ESP137.htmlMd5,
  { origem: regua(PORT_CAND.origem.md5, PORT_CAND.origem.bytes) });
checa('S4d_candidata_difere_da_shell_da_base', md5(candTxt) !== ESP137.htmlMd5, true,
  { base: ESP137.htmlMd5, candidata: md5(candTxt), delta_bytes: B(candTxt) - ESP137.htmlBytes });
// Os dois nomes de RPC releem-se do DDL aqui também — o bundle não confia na candidata para saber o que procurar.
const ddl = readFileSync(DDL39, 'utf8');
const nomesDoDDL = [...ddl.matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(\s*\)\s*\s*RETURNS\s+TABLE/gi)].map((m) => m[1]);
const NOME_TOTAIS = nomesDoDDL.find((x) => /totais/.test(x));
const NOME_DISTRIB = nomesDoDDL.find((x) => /distribuicao/.test(x));
checa('S5_os_dois_nomes_do_DDL_estao_cada_um_uma_vez_na_candidata', { totais: n(candTxt, `"${NOME_TOTAIS}"`) + n(candTxt, `'${NOME_TOTAIS}'`), distrib: n(candTxt, `"${NOME_DISTRIB}"`) + n(candTxt, `'${NOME_DISTRIB}'`) },
  { totais: 1, distrib: 1 }, { nomes_lidos_do_ddl: nomesDoDDL });
checa('S5b_porta_de_etiquetagem_nao_entra_no_bundle', n(candTxt, 'bfr_school_set_municipality'), 0);
checa('S5c_fixture_os_nomescumpridos_do_DDL_nao_estao_na_candidata', { inventado: n(candTxt, '"bfr_municipal_nao_existe"'), inventado_s: n(candTxt, `'bfr_municipal_nao_existe'`) }, { inventado: 0, inventado_s: 0 });

// ---- 4) cirurgia: troca o embed HTML e a etiqueta do SW ----
const novoHtml = JSON.stringify(candTxt);
const ancSw = "const SW = \"const CACHE = 'bfr-conecta-v137';";
checa('S6_ancora_da_etiqueta_presente_uma_vez', n(baseTxt, ancSw), 1);
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim))
  .replace(ancSw, "const SW = \"const CACHE = 'bfr-conecta-v138';");
checa('S7_etiqueta_nova_dentro_e_velha_fora', { v138: n(workerNovo, "'bfr-conecta-v138'"), v137: n(workerNovo, "'bfr-conecta-v137'") },
  { v138: 1, v137: 0 });

// ---- 5) compila e re-extrai ----
const tmp = `${NOVO}.worker-check.tmp.mjs`;
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
unlinkSync(tmp);
checa('S8_worker_novo_compila', compila, true, { erro: erroCompil });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('S9_embed_novo_re-extraido_bate_com_a_candidata', reExtrai ? { md5: md5(reExtrai.corpo), bytes: B(reExtrai.corpo) } : null,
  { md5: md5(candTxt), bytes: B(candTxt) });
checa('S10_embed_novo_e_json_stringify_da_candidata', reExtrai ? workerNovo.slice(reExtrai.ini, reExtrai.fim) === novoHtml : false, true);
const swNovoExtrai = extrai(workerNovo, 'const SW = ');
checa('S11_sw_embutido_re-extraido_com_etiqueta_v138_e_mesmo_comprimento', swNovoExtrai
  ? { v138: n(swNovoExtrai.corpo, "'bfr-conecta-v138'"), v137: n(swNovoExtrai.corpo, "'bfr-conecta-v137'"), bytes: B(swNovoExtrai.corpo) }
  : null, { v138: 1, v137: 0, bytes: ESP137.swBytes });
checa('S12_um_unico_embed_de_cada', { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') },
  { html: 1, sw: 1, csp: 1 });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S13_csp_intacta_e_permite_supabase_e_frame_ancestors',
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo,
    supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : ''),
    frame_ancestors: /frame-ancestors 'self'/.test(eCspNovo ? eCspNovo.corpo : '') },
  { csp_igual: true, supabase_connect: true, frame_ancestors: true });
checa('S14_cirurgia_de_headers_preservada_no_worker_novo', {
  frame_guard: n(workerNovo, 'FRAME_GUARD'), x_frame: n(workerNovo, "x-frame-options"), h_set: n(workerNovo, "h.set('content-security-policy', FRAME_GUARD)"),
  frame_ancestors_total: n(workerNovo, 'frame-ancestors') }, { frame_guard: 2, x_frame: 2, h_set: 1, frame_ancestors_total: 2 });
// S15 — o esqueleto é o texto do worker com os dois embeds mascarados por etiquetas. Trocar o embed HTML e a
// letra dentro do embed SW é permitido; qualquer outra diferença no corpo do worker não é. O dente é provado
// nesta corrida: um `/*X*/` acrescentado fora dos embeds tem de partir o esqueleto.
const esqueleto = (src, spans) => {
  const ord = spans.slice().sort((a, b) => a.ini - b.ini);
  let s = '', i = 0;
  for (const sp of ord) { s += src.slice(i, sp.ini) + '@@' + sp.nome + '@@'; i = sp.fim; }
  return s + src.slice(i);
};
const spBase = [{ nome: 'HTML', ini: eHtml.ini, fim: eHtml.fim }, { nome: 'SW', ini: eSw.ini, fim: eSw.fim }];
const spNovo = [{ nome: 'HTML', ini: reExtrai.ini, fim: reExtrai.fim }, { nome: 'SW', ini: swNovoExtrai.ini, fim: swNovoExtrai.fim }];
const esqueletoAntes = md5(esqueleto(baseTxt, spBase));
const saburado = workerNovo + ' /*X*/';
checa('S15_fora_dos_dois_embeds_o_worker_e_byte_a_byte_o_mesmo_e_a_regua_tem_dente',
  { antes: esqueletoAntes, depois: md5(esqueleto(workerNovo, spNovo)), dente_saburado: md5(esqueleto(saburado, spNovo)) !== esqueletoAntes },
  { antes: esqueletoAntes, depois: esqueletoAntes, dente_saburado: true },
  { embeds_mascarados: spNovo.map((s) => s.nome), ordem: spNovo.slice().sort((a, b) => a.ini - b.ini).map((s) => s.nome).join('->') });

if (out.total.falha) falhou();

// ---- 6) escreve (ou verifica) o diretório novo ----
const assets = readdirSync(`${BASE}/public`).sort();
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of assets) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
checa('S16_assets_do_bundle_todos_presentes_e_byte_a_byte_com_a_base', {
  total: assets.length, faltam: assets.filter((f) => !existsSync(`${NOVO}/public/${f}`)),
  diferentes: assets.filter((f) => existsSync(`${NOVO}/public/${f}`) && !readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`))),
  inclui_headers: assets.includes('_headers'), inclui_modulo: assets.includes('bfr-responsive-presentation.js') },
  { total: 13, faltam: [], diferentes: [], inclui_headers: true, inclui_modulo: true });
checa('S17_modulo_remendado_da_pen40_continua_no_bundle', { md5: md5(readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`)), bytes: B(readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`, 'utf8')) },
  { md5: ESP137.moduleMd5, bytes: ESP137.moduleBytes });
checa('S18_headers_com_o_md5_da_base', md5(readFileSync(`${NOVO}/public/_headers`)), ESP137.headersMd5);
checa('S19_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S20_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S21_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(workerNovo), workerBytes: B(workerNovo),
  swMd5: md5(swNovoExtrai ? swNovoExtrai.corpo : ''), swBytes: B(swNovoExtrai ? swNovoExtrai.corpo : ''),
  htmlMd5: md5(candTxt), htmlBytes: B(candTxt),
  cacheLabel: 'bfr-conecta-v138',
  baseWorkerMd5: ESP137.workerMd5, baseWorkerBytes: ESP137.workerBytes,
  baseSwMd5: ESP137.swMd5, baseSwBytes: ESP137.swBytes,
  baseHtmlMd5: ESP137.htmlMd5, baseHtmlBytes: ESP137.htmlBytes,
  headersMd5: ESP137.headersMd5, headersBytes: ESP137.headersBytes,
  deltaWorkerBytes: B(workerNovo) - ESP137.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  ok_literal: NAO_PUBLICAR,
  moduleMd5: ESP137.moduleMd5, moduleBytes: ESP137.moduleBytes,
  rpcNoModulo: [NOME_TOTAIS, NOME_DISTRIB],
  origemReguas: ['worker-deploy-v137-remendo-pen40/esperado-v137.json', CAND, 'bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json', 'scripts/p73-pen39-ddl-candidata.sql'],
};
checa('S22_delta_do_worker_positivo_e_igual_ao_delta_do_embed', reguas.deltaWorkerBytes, B(novoHtml) - B(baseTxt.slice(eHtml.ini, eHtml.fim)),
  { delta: reguas.deltaWorkerBytes, embed_antes_bytes: B(baseTxt.slice(eHtml.ini, eHtml.fim)), embed_depois_bytes: B(novoHtml) });
if (out.total.falha) falhou();
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache|^rpcNoModulo|^ok_literal|^cacheLabel|^origemReguas|^module/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
writeFileSync(`${NOVO}/esperado-v138.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
const relido = JSON.parse(readFileSync(`${NOVO}/esperado-v138.json`, 'utf8'));
checa('S23_esperado_re-lido_bate_com_as_reguas_da_corrida', Object.keys(reguas).every((k) => JSON.stringify(relido[k]) === JSON.stringify(reguas[k])), true, { campos: Object.keys(reguas).length });
out.portoes_resumo = `${out.total.ok}/${out.total.falha}`;
out.veredito = out.total.falha ? `V138_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}` : `V138_BUNDLE_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [
  out.veredito,
  `escrito ${NOVO} — worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5} modulo=${reguas.moduleMd5} etiqueta=${reguas.cacheLabel}`,
  `publicado=${out.publicado} ok_literal=${NAO_PUBLICAR}`,
];
if (out.total.falha) falhou();
writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(linhas.join('\n'));
process.exit(out.total.falha ? 1 : 0);
