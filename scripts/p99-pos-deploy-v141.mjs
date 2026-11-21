// P99 — POS-DEPLOY DA v141 (21/11, madrugada). O deploy aconteceu (stdout em `evidence/v141-deploy-stdout-21-11.txt`,
// lido por esta peça, nunca copy-cola). Aqui prova-se por HTTP e por estado do servidor:
//  · a shell servida é byte a byte o embed que a P98 gateou;
//  · a correção está nos bytes servidos: a regra velha (decisão só da sessão) desapareceu do `aplicarVisibilidade`
//    e a conjunção das duas decisões está lá uma vez — isto é o que o P81 mediu a faltar, visto no ar;
//  · nada regrediu: a sonda honesta da v139 e a trilha da v140 têm no ar a mesma contagem que na candidata;
//  · o servidor concorda com o stdout, e a cadeia de reversão aponta para a v140 (lida do diário dela).
// Regras: 0 DDL, 0 escrita no banco, 0 mint, 0 publicação. Só GET e leitura de disco.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SESSAO = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const BUNDLE = `${DIR}/worker-deploy-v141-caixa-vazia`;
const ESP = JSON.parse(readFileSync(`${BUNDLE}/esperado-v141.json`, 'utf8'));
const ESP140 = JSON.parse(readFileSync(`${DIR}/worker-deploy-v140-trilha-de-acesso/esperado-v140.json`, 'utf8'));
const CAND = readFileSync(`${DIR}/bfr-candidata-v141-caixa-vazia/index.html`, 'utf8');
const CAND140 = readFileSync(`${DIR}/bfr-candidata-v140-trilha-de-acesso/index.html`, 'utf8');
const STDOUT = readFileSync(`${DIR}/evidence/v141-deploy-stdout-21-11.txt`, 'utf8');
const STATUS = JSON.parse(readFileSync(`${DIR}/evidence/v141-deployments-status-21-11.json`, 'utf8'));
const LISTA = JSON.parse(readFileSync(`${DIR}/evidence/v141-deployments-list-21-11.json`, 'utf8'));
const DIARIO140 = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v140.json`, 'utf8'));
const DDL4 = readFileSync(`${DIR}/scripts/sm4-ddl-municipal-candidata.sql`, 'utf8');
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${DIR}/evidence/p99-pos-deploy-v141-${SUF}.json`;
const TXT = `${SESSAO}/p99-pos-deploy-v141-${SUF}.txt`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const URL_AR = ((DIARIO140.deploy || {}).url) || null;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error('ABORTA: URL do ar nao resolvida no diario da v140: ' + JSON.stringify(URL_AR));
const auditMesas = [...DDL4.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]).filter((x) => /audit/.test(x));
if (auditMesas.length !== 1) throw new Error('ABORTA: ' + auditMesas.length + ' mesas de trilha no DDL sm4 — a regua nao decidiria');
const MESA_AUDIT = auditMesas[0];
const POR_AUT = 'sonda.autorizada === true';
const REGUA_VELHA = "b.classList.toggle('hidden', !veredito.apto);";
const REGUA_NOVA = 'const mostrar = veredito.apto && vista.visivel;';

const t0 = Date.now();
const out = { programa: 'scripts/p99-pos-deploy-v141.mjs', em: new Date().toISOString(), url: URL_AR, escrita: 0, ddl: 0, mint: 0, publicacao: 'esta peça não publica: confere o deploy já feito' };
const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'), content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const SHELLS = [];
for (let i = 0; i < 3; i++) SHELLS.push(await get('/'));
const sw = await get('/sw-v4.js?v=141');
const notfound = await get('/rota-inexistente-v141-pos');
const rotuloSw = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
const ARQUIVOS = readdirSync(`${BUNDLE}/public`).filter((f) => f !== '_headers').sort();
if (ARQUIVOS.length === 0) throw new Error('ABORTA: 0 assets no bundle — o portao dos assets ficaria vacuo');
const vivos = [];
for (const a of ARQUIVOS) { const r = await get(`/${a}`); const local = readFileSync(`${BUNDLE}/public/${a}`); vivos.push({ arquivo: a, http: r.http, md5_servido: r.md5, bytes_servidos: r.bytes, md5_local: md5(local), xfo: r.xfo, csp: r.csp }); }

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; out[nome] = dado; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('H1_shell_servida_tres_vezes_identica_e_igual_ao_embed_da_P98', SHELLS.every((s) => s.http === 200 && s.md5 === ESP.htmlMd5 && s.bytes === ESP.htmlBytes) && new Set(SHELLS.map((s) => s.md5)).size === 1,
  { servido: SHELLS.map((s) => ({ http: s.http, md5: s.md5, bytes: s.bytes })), esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
g('H2_a_shell_deixou_de_ser_a_v140_publicada', SHELLS[0].md5 !== ESP140.htmlMd5, { ar: SHELLS[0].md5, v140: ESP140.htmlMd5, delta_bytes: SHELLS[0].bytes - ESP140.htmlBytes });
g('H3_a_correccao_esta_nos_bytes_servidos_e_a_regra_velha_desapareceu', n(SHELLS[0].texto, REGUA_NOVA) === 1 && n(SHELLS[0].texto, REGUA_VELHA) === 0 && n(SHELLS[0].texto, 'function aptoParaVista()') === 1,
  { regra_nova_no_ar: n(SHELLS[0].texto, REGUA_NOVA), regra_velha_no_ar: n(SHELLS[0].texto, REGUA_VELHA), funcao_nova_no_ar: n(SHELLS[0].texto, 'function aptoParaVista()') });
g('H4_a_contagem_da_correccao_bate_com_a_candidata_e_com_nada_na_v140', [REGUA_NOVA, REGUA_VELHA, 'function aptoParaVista()'].every((x) => n(SHELLS[0].texto, x) === n(CAND, x)) && n(CAND140, 'function aptoParaVista()') === 0,
  { no_ar: [REGUA_NOVA, REGUA_VELHA, 'function aptoParaVista()'].map((x) => x.slice(0, 24) + '=' + n(SHELLS[0].texto, x)), na_v140: n(CAND140, 'function aptoParaVista()') });
g('H5_o_sw_no_ar_tem_a_etiqueta_da_v141_e_perde_a_da_v140', rotuloSw === ESP.cacheLabel && n(sw.texto, "'bfr-conecta-v140'") === 0, { rotulo_lido: rotuloSw, esperado: ESP.cacheLabel, v140_no_sw: n(sw.texto, "'bfr-conecta-v140'") });
g('H6_o_asset_de_servico_da_v141_chega_byte_a_byte_ao_ar', vivos.filter((v) => v.md5_servido !== v.md5_local || v.http !== 200).length === 0,
  { total: vivos.length, desvios: vivos.filter((v) => v.md5_servido !== v.md5_local || v.http !== 200).map((v) => v.arquivo) });
g('H7_o_remendo_da_pen40_no_modulo_continua_no_ar', (() => { const m = vivos.find((v) => v.arquivo === 'bfr-responsive-presentation.js'); return !!m && m.md5_servido === ESP.moduleMd5 && m.bytes_servidos === ESP.moduleBytes; })(),
  { lido: vivos.find((v) => v.arquivo === 'bfr-responsive-presentation.js') || {}, esperado: { md5: ESP.moduleMd5, bytes: ESP.moduleBytes } });
g('H8_a_sonda_honesta_e_a_trilha_chegam_ao_ar_com_a_contagem_da_candidata', n(SHELLS[0].texto, POR_AUT) === n(CAND, POR_AUT) && n(SHELLS[0].texto, POR_AUT) >= 1 && n(SHELLS[0].texto, MESA_AUDIT) === n(CAND, MESA_AUDIT) && n(SHELLS[0].texto, MESA_AUDIT) >= 1,
  { autorizada_no_ar: n(SHELLS[0].texto, POR_AUT), autorizada_na_candidata: n(CAND, POR_AUT), mesa_no_ar: n(SHELLS[0].texto, MESA_AUDIT), mesa_na_candidata: n(CAND, MESA_AUDIT), mesa_lida_do_ddl: MESA_AUDIT });
g('H9_nada_do_que_a_v140_ganhou_se_perdeu_na_v141', n(SHELLS[0].texto, MESA_AUDIT) === n(CAND140, MESA_AUDIT) && n(SHELLS[0].texto, POR_AUT) === n(CAND140, POR_AUT),
  { trilha_no_ar: n(SHELLS[0].texto, MESA_AUDIT), trilha_na_v140: n(CAND140, MESA_AUDIT), sonda_no_ar: n(SHELLS[0].texto, POR_AUT), sonda_na_v140: n(CAND140, POR_AUT) });
g('H10_headers_da_shell_intactos', SHELLS[0].xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(SHELLS[0].csp)) && /\*\.supabase\.co/.test(String(SHELLS[0].csp)), { xfo: SHELLS[0].xfo, csp_frag: String(SHELLS[0].csp || '').slice(0, 160) });
g('H11_rota_inexistente_ainda_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes });
g('H12_o_servidor_concorda_com_o_stdout_do_deploy', (() => {
  const verStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
  const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
  return !!verStdout && STATUS.versions[0].version_id === verStdout && STATUS.versions[0].percentage === 100 && porData[0].versions[0].version_id === verStdout;
})(), { stdout: (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1], status: STATUS.versions[0], lista_mais_nova: [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)))[0].versions[0] });
g('H13_a_cadeia_de_reversao_aponta_para_a_v140', (() => {
  const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
  return !!porData[1] && porData[1].versions[0].version_id === (DIARIO140.deploy || {}).version_id;
})(), { anterior: [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)))[1].versions[0].version_id, v140_no_diario: (DIARIO140.deploy || {}).version_id, nota: 'devolver o ar a v140 e um `wrangler deploy` a partir de worker-deploy-v140-trilha-de-acesso' });
g('H14_nenhum_valor_de_credencial_sale_do_servido', !/refresh_token|access_token=/.test(SHELLS[0].texto.slice(0, 400000)) && /eyJhbGciOi/.test(SHELLS[0].texto) === (/eyJhbGciOi/.test(CAND) === true),
  { nota: 'a chave publishable e configuracao do cliente e vive nos dois lados; o que se proibe aqui e um token de sessao impresso no ar' });

out.medido = { url: URL_AR, shells: SHELLS.map((s) => ({ http: s.http, bytes: s.bytes, md5: s.md5 })), sw: { http: sw.http, bytes: sw.bytes, md5: sw.md5, rotulo: rotuloSw }, notfound: { http: notfound.http }, assets: vivos.map((v) => ({ arquivo: v.arquivo, http: v.http, md5_servido: v.md5_servido, bytes_servidos: v.bytes_servidos, md5_local: v.md5_local })), stdout_bytes: STDOUT.length, deploy_created_on: STATUS.created_on, deployment_id: STATUS.id };
out.duracao_ms = Date.now() - t0;
out.veredito = falhas.length === 0 ? 'P99_POS_DEPLOY_V141_OK 14/0' : 'P99_POS_DEPLOY_V141_VERMELHO ' + falhas.length + ' de 14';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nfalhas=${falhas.length}\n${falhas.join('\n')}\nnode_exit=${falhas.length ? 1 : 0}\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(DIR + '/', '')}`);
process.exit(falhas.length ? 1 : 0);
