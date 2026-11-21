// P94 — BUNDLE DO WORKER PARA A v140, SEM PUBLICAR (21/11, noite).
//
// O que está medido e manda aqui:
//  · A candidatura vem por cadeia certificada: p85 gerou a v139 sobre `bfr-candidata-v138-painel-municipal/index.html`
//    (md5 592b3652…, portões V138_CANDIDATA_OK) e o p87 gerou a v140 sobre a v139 (md5 6a902562…, portões
//    P85_CANDIDATA_V139_SONDA_HONESTA_OK). Logo a v140 traz DENTRO a sonda honesta da v139 — publicar a v140 não é
//    escolher entre as duas candidatas.
//  · A base do bundle é `worker-deploy-v138-painel-municipal`: é o único worker local que já leva o módulo remendado
//    da PEN-40 (`bfr-responsive-presentation.js`, md5 lido do esperado-v138) e os `_headers`. Usar o worker da v136
//    como base perderia o remendo medido — regressão; fica documentada e não executada. Nem v137 nem v138 foram
//    publicadas: o ar está na v136 (lê-se do diário mais novo, não de memória).
//  · Esta peça NÃO publica. O `wrangler deploy` é outra peça e outro OK.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no ar. Escrita única em worker-deploy-v140-trilha-de-acesso/ e nos artefactos
// de evidence/. Se o diretório já existir, verifica byte a byte e não reescreve.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v138-painel-municipal`;
const NOVO = `${DIR}/worker-deploy-v140-trilha-de-acesso`;
const CAND = `${DIR}/bfr-candidata-v140-trilha-de-acesso/index.html`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v140-trilha-de-acesso/portoes-v140-candidata.json`, 'utf8'));
const CAND139 = `${DIR}/bfr-candidata-v139-sonda-honesta/index.html`;
const ESP = JSON.parse(readFileSync(`${BASE}/esperado-v138.json`, 'utf8'));
const DDL39 = `${DIR}/scripts/p73-pen39-ddl-candidata.sql`;
const DDL4 = `${DIR}/scripts/sm4-ddl-municipal-candidata.sql`;
const DIARIO = readdirSync(DIR).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const V_PUBLICADA = /v(\d+)/.exec(DIARIO)[1];
const EV = `${DIR}/evidence/p94-gera-bundle-v140-21-11.json`;
const EV_TXT = `${DIR}/evidence/p94-gera-bundle-v140-21-11.txt`;
const EV_V = `${DIR}/evidence/p94-gera-bundle-v140-21-11-VERMELHO.json`;
const EV_V_TXT = `${DIR}/evidence/p94-gera-bundle-v140-21-11-VERMELHO.txt`;
if ([EV, EV_TXT, EV_V, EV_V_TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto de evidência já existe — use nome novo, nunca por cima');
const NAO_PUBLICAR = '(sem deploy — bundle de candidata; publicar exige OK literal)';

const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);

const out = {
  em: new Date().toISOString(), gerador: 'scripts/p94-gera-bundle-v140.mjs', publicado: false,
  base: 'worker-deploy-v138-painel-municipal (leva o modulo da PEN-40 e os _headers; nao publicada)',
  base_alternativa_nao_executada: 'worker-deploy-v136-secretaria-de-educacao — daria uma v140 sem o remendo medido da PEN-40',
  candidata: 'bfr-candidata-v140-trilha-de-acesso/index.html',
  cadeia_candidata: 'v138 -> p85 (v139 sonda honesta) -> p87 (v140 trilha): a v140 inclui a v139',
  ar_no_momento: { diario_mais_novo: DIARIO, versao_publicada: V_PUBLICADA },
  ok_literal: NAO_PUBLICAR,
  portoes: {}, total: { ok: 0, falha: 0 },
};
const checa = (nome, passou, detalhe) => {
  out.portoes[nome] = { passou: passou === true, detalhe };
  out.total[passou === true ? 'ok' : 'falha'] += 1;
  return passou === true;
};
const falhou = () => {
  const lista = Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ');
  out.veredito = `P94_BUNDLE_V140_FALHOU ${out.total.ok}/${out.total.falha}`;
  writeFileSync(EV_V, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(EV_V_TXT, `VERMELHOS: ${lista}\nnode_exit=1\n`);
  console.error(`VERMELHOS: ${lista}`);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');

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
if (!eHtml || !eSw) throw new Error('ABORTA: embeds nao extraiveis da base');

// ---- 1) a base é o worker da v138 tal como o seu próprio esperado o registou ----
checa('S1_base_worker_e_o_bundle_v138_do_seu_esperado', md5(baseTxt) === ESP.workerMd5 && B(baseTxt) === ESP.workerBytes,
  { lido: { md5: md5(baseTxt), bytes: B(baseTxt) }, esperado: { md5: ESP.workerMd5, bytes: ESP.workerBytes } });
checa('S2_embed_html_da_base_e_a_candidata_v138_certificada', md5(eHtml.corpo) === ESP.htmlMd5 && B(eHtml.corpo) === ESP.htmlBytes,
  { lido: { md5: md5(eHtml.corpo), bytes: B(eHtml.corpo) }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
checa('S3_etiqueta_v138_uma_vez_e_v140_zero_na_base', n(baseTxt, "'bfr-conecta-v138'") === 1 && n(baseTxt, "'bfr-conecta-v140'") === 0,
  { v138: n(baseTxt, "'bfr-conecta-v138'"), v140: n(baseTxt, "'bfr-conecta-v140'") });

// ---- 2) a candidata v140, conferida contra os portões dela e contra a cadeia ----
const candTxt = readFileSync(CAND, 'utf8');
const cand139Txt = readFileSync(CAND139, 'utf8');
checa('S4_candidata_bate_com_a_saida_certificada_do_p87', md5(candTxt) === PORT_CAND.destino.md5 && B(candTxt) === PORT_CAND.destino.bytes,
  { lido: { md5: md5(candTxt), bytes: B(candTxt) }, certificado: PORT_CAND.destino, veredito: PORT_CAND.veredito });
checa('S4b_veredito_da_candidata_ok', typeof PORT_CAND.veredito === 'string' && PORT_CAND.veredito.startsWith('P87_CANDIDATA_V140_TRILHA_OK'), { veredito: PORT_CAND.veredito });
checa('S4c_a_origem_declarada_e_a_v139_que_esta_em_disco_e_esta_certificada',
  PORT_CAND.origem.pasta === 'bfr-candidata-v139-sonda-honesta' && md5(cand139Txt) === PORT_CAND.origem.md5 && /^P85_CANDIDATA_V139_SONDA_HONESTA_OK/.test(String(PORT_CAND.origem.veredito_portoes)),
  { pasta_declarada: PORT_CAND.origem.pasta, md5_v139_em_disco: md5(cand139Txt), md5_declarado: PORT_CAND.origem.md5, veredito_portoes_origem: PORT_CAND.origem.veredito_portoes });
checa('S4d_a_candidata_difere_do_embed_da_base', md5(candTxt) !== ESP.htmlMd5,
  { base: ESP.htmlMd5, candidata: md5(candTxt), delta_bytes: B(candTxt) - ESP.htmlBytes });

// Nomes lidos dos DDL aplicados, nunca dactilografados. A régua é de REGRESSÃO por par (v139 ↔ v140) e de
// presença (≥1): nem a contagem pode mudar nem o nome pode desaparecer — as duas formas de vermelho existem.
const nomes39 = [...readFileSync(DDL39, 'utf8').matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi)].map((m) => m[1]);
if (nomes39.length === 0) throw new Error('ABORTA: 0 funcoes lidas do DDL da PEN-39 — os portões de regressao ficariam vacuos');
const mesas4 = [...readFileSync(DDL4, 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]);
const auditMesas = mesas4.filter((x) => /audit/.test(x));
if (auditMesas.length !== 1) throw new Error('ABORTA: ' + auditMesas.length + ' mesas de trilha no DDL sm4 — esperava exatamente 1, a régua não decidiria');
const MESA_AUDIT = auditMesas[0];
checa('S5_os_rpc_de_agregado_tem_a_mesma_contagem_em_v139_e_v140_e_estao_presentes',
  nomes39.every((x) => n(candTxt, x) === n(cand139Txt, x) && n(candTxt, x) >= 1),
  nomes39.map((x) => x + ': v139=' + n(cand139Txt, x) + ' v140=' + n(candTxt, x)));
checa('S5b_a_mesa_de_trilha_leia_do_DDL_aparece_na_v140_uma_vez_mais_que_na_v139',
  n(candTxt, MESA_AUDIT) === n(cand139Txt, MESA_AUDIT) + 1,
  { mesa_lida_do_ddl: MESA_AUDIT, v139: n(cand139Txt, MESA_AUDIT), v140: n(candTxt, MESA_AUDIT) });
checa('S5c_porta_de_etiquetagem_continua_fora_das_duas_candidatas',
  n(candTxt, 'bfr_school_set_municipality') === 0 && n(cand139Txt, 'bfr_school_set_municipality') === 0,
  { v140: n(candTxt, 'bfr_school_set_municipality'), v139: n(cand139Txt, 'bfr_school_set_municipality') });
checa('S5d_balde_de_teste_nao_aparece_na_candidata', n(candTxt, '"bfr_municipal_nao_existe"') + n(candTxt, "'bfr_municipal_nao_existe'") === 0, { ocorrencias: n(candTxt, 'bfr_municipal_nao_existe') });
// A sonda honesta da v139 tem de sobreviver na v140: o banner decide pelo veredicto da rpc, não pela exequibilidade.
const POR_AUT = 'sonda.autorizada === true';
checa('S6_a_clausa_da_sonda_honesta_tem_a_mesma_contagem_na_v140_que_na_v139_e_esta_presente',
  n(candTxt, POR_AUT) === n(cand139Txt, POR_AUT) && n(candTxt, POR_AUT) >= 1, { v139: n(cand139Txt, POR_AUT), v140: n(candTxt, POR_AUT) });

// ---- 3) cirurgia: embed HTML novo + etiqueta do SW ----
const novoHtml = JSON.stringify(candTxt);
const ancSw = "const SW = \"const CACHE = 'bfr-conecta-v138';";
checa('S7_ancora_da_etiqueta_presente_exatamente_uma_vez', n(baseTxt, ancSw) === 1, { vezes: n(baseTxt, ancSw) });
if (out.total.falha) falhou();
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim)).replace(ancSw, "const SW = \"const CACHE = 'bfr-conecta-v140';");
checa('S8_etiqueta_nova_dentro_e_velha_fora', n(workerNovo, "'bfr-conecta-v140'") === 1 && n(workerNovo, "'bfr-conecta-v138'") === 0,
  { v140: n(workerNovo, "'bfr-conecta-v140'"), v138: n(workerNovo, "'bfr-conecta-v138'") });

const tmp = `${NOVO}.worker-check.tmp.mjs`;
if (!jaExistia && !existsSync(NOVO)) mkdirSync(NOVO, { recursive: true });
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
unlinkSync(tmp);
checa('S9_worker_novo_compila', compila, { erro: compila ? null : String(chk.stderr || chk.stdout || '').trim().slice(0, 300) });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('S10_embed_novo_re-extraido_bate_com_a_candidata', !!reExtrai && md5(reExtrai.corpo) === md5(candTxt) && B(reExtrai.corpo) === B(candTxt),
  { re_extraido: reExtrai ? { md5: md5(reExtrai.corpo), bytes: B(reExtrai.corpo) } : null, candidata: { md5: md5(candTxt), bytes: B(candTxt) } });
checa('S11_embed_novo_e_o_json_stringify_da_candidata', !!reExtrai && workerNovo.slice(reExtrai.ini, reExtrai.fim) === novoHtml, true);
const swRe = extrai(workerNovo, 'const SW = ');
checa('S12_sw_embutido_com_etiqueta_v140_e_mesmo_comprimento_da_base',
  !!swRe && n(swRe.corpo, "'bfr-conecta-v140'") === 1 && n(swRe.corpo, "'bfr-conecta-v138'") === 0 && B(swRe.corpo) === ESP.swBytes,
  { v140: swRe ? n(swRe.corpo, "'bfr-conecta-v140'") : null, v138: swRe ? n(swRe.corpo, "'bfr-conecta-v138'") : null, bytes: swRe ? B(swRe.corpo) : null, bytes_da_base: ESP.swBytes });
checa('S13_um_unico_embed_de_cada', n(workerNovo, 'const HTML = ') === 1 && n(workerNovo, 'const SW = ') === 1 && n(workerNovo, 'const CSP = ') === 1,
  { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S14_csp_intacta_e_permite_supabase_e_frame_ancestors',
  !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo && /\*\.supabase\.co/.test(eCspNovo.corpo) && /frame-ancestors 'self'/.test(eCspNovo.corpo),
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo, supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : ''), frame_ancestors: /frame-ancestors 'self'/.test(eCspNovo ? eCspNovo.corpo : '') });

const esqueleto = (src, spans) => {
  const ord = spans.slice().sort((a, b) => a.ini - b.ini);
  let s = '', i = 0;
  for (const sp of ord) { s += src.slice(i, sp.ini) + '@@' + sp.nome + '@@'; i = sp.fim; }
  return s + src.slice(i);
};
const spBase = [{ nome: 'HTML', ini: eHtml.ini, fim: eHtml.fim }, { nome: 'SW', ini: eSw.ini, fim: eSw.fim }];
const spNovo = [{ nome: 'HTML', ini: reExtrai.ini, fim: reExtrai.fim }, { nome: 'SW', ini: swRe.ini, fim: swRe.fim }];
const esqueletoAntes = md5(esqueleto(baseTxt, spBase));
checa('S15_fora_dos_dois_embeds_o_worker_e_byte_a_byte_e_a_regua_tem_dente',
  md5(esqueleto(workerNovo, spNovo)) === esqueletoAntes && md5(esqueleto(workerNovo + ' /*X*/', spNovo)) !== esqueletoAntes,
  { antes: esqueletoAntes, depois: md5(esqueleto(workerNovo, spNovo)), dente_saburado: md5(esqueleto(workerNovo + ' /*X*/', spNovo)) !== esqueletoAntes, embeds_mascarados: spNovo.map((s) => s.nome) });

// ---- 4) escreve (ou verifica) o diretório novo ----
const assets = readdirSync(`${BASE}/public`).sort();
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of assets) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const faltam = assets.filter((f) => !existsSync(`${NOVO}/public/${f}`));
const diferentes = assets.filter((f) => existsSync(`${NOVO}/public/${f}`) && !readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`)));
checa('S16_assets_do_bundle_todos_presentes_e_byte_a_byte_com_a_base',
  faltam.length === 0 && diferentes.length === 0 && assets.includes('_headers') && assets.includes('bfr-responsive-presentation.js') && assets.length === ESP.assetsCopiados,
  { total: assets.length, faltam, diferentes, base_declara: ESP.assetsCopiados });
const modNovo = readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`);
checa('S17_modulo_remendado_da_pen40_continua_no_bundle', md5(modNovo) === ESP.moduleMd5 && B(modNovo.toString('utf8')) === ESP.moduleBytes,
  { lido: { md5: md5(modNovo), bytes: B(modNovo.toString('utf8')) }, esperado: { md5: ESP.moduleMd5, bytes: ESP.moduleBytes } });
checa('S18_headers_com_o_md5_da_base', md5(readFileSync(`${NOVO}/public/_headers`)) === ESP.headersMd5, { lido: md5(readFileSync(`${NOVO}/public/_headers`)), esperado: ESP.headersMd5 });
checa('S19_wrangler_toml_identico_a_base', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S20_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S21_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? true : existsSync(`${NOVO}/worker.mjs`), { estado: jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora' });
checa('S22_nada_foi_publicado_por_esta_peca', DIARIO === 'audit-publicacao-v136.json' && V_PUBLICADA === '136' && !existsSync(`${DIR}/audit-publicacao-v140.json`),
  { diario_mais_novo: DIARIO, versao: V_PUBLICADA, diario_v140_existe: existsSync(`${DIR}/audit-publicacao-v140.json`) });

const reguas = {
  workerMd5: md5(workerNovo), workerBytes: B(workerNovo),
  swMd5: md5(swRe ? swRe.corpo : ''), swBytes: B(swRe ? swRe.corpo : ''),
  htmlMd5: md5(candTxt), htmlBytes: B(candTxt),
  cacheLabel: 'bfr-conecta-v140',
  baseWorkerMd5: ESP.workerMd5, baseWorkerBytes: ESP.workerBytes, baseSwMd5: ESP.swMd5, baseSwBytes: ESP.swBytes,
  baseHtmlMd5: ESP.htmlMd5, baseHtmlBytes: ESP.htmlBytes,
  headersMd5: ESP.headersMd5, headersBytes: ESP.headersBytes,
  moduleMd5: ESP.moduleMd5, moduleBytes: ESP.moduleBytes,
  deltaWorkerBytes: B(workerNovo) - ESP.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  rpcNoModulo: nomes39, mesaDeTrilha: MESA_AUDIT,
  ar_no_momento: { diario: DIARIO, versao: V_PUBLICADA },
  ok_literal: NAO_PUBLICAR,
  origemReguas: ['worker-deploy-v138-painel-municipal/esperado-v138.json', CAND, 'bfr-candidata-v140-trilha-de-acesso/portoes-v140-candidata.json', CAND139, DDL39, DDL4],
};
checa('S23_delta_do_worker_igual_ao_delta_do_embed', reguas.deltaWorkerBytes === B(novoHtml) - B(baseTxt.slice(eHtml.ini, eHtml.fim)),
  { delta: reguas.deltaWorkerBytes, embed_antes_bytes: B(baseTxt.slice(eHtml.ini, eHtml.fim)), embed_depois_bytes: B(novoHtml) });
if (out.total.falha) falhou();
out.esperado = reguas;
writeFileSync(`${NOVO}/esperado-v140.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
const relido = JSON.parse(readFileSync(`${NOVO}/esperado-v140.json`, 'utf8'));
checa('S24_esperado_re_lido_bate_com_as_reguas_da_corrida', Object.keys(reguas).every((k) => JSON.stringify(relido[k]) === JSON.stringify(reguas[k])), { campos: Object.keys(reguas).length, diferentes: Object.keys(reguas).filter((k) => JSON.stringify(relido[k]) !== JSON.stringify(reguas[k])) });
out.veredito = out.total.falha ? `P94_BUNDLE_V140_FALHOU ${out.total.ok}/${out.total.falha}` : `P94_BUNDLE_V140_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [
  out.veredito,
  `escrito ${NOVO.replace(DIR + '/', '')} — worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5} (${reguas.htmlBytes} B) modulo=${reguas.moduleMd5} etiqueta=${reguas.cacheLabel}`,
  `ar_no_momento=${DIARIO} (v${V_PUBLICADA}) · publicado=${out.publicado} · ${NAO_PUBLICAR}`,
];
if (out.total.falha) falhou();
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(linhas.join('\n'));
process.exit(out.total.falha ? 1 : 0);
