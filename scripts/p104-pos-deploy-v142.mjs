// P104 — POS-DEPLOY DA v142 (21/11, tarde). O deploy aconteceu (stdout em `evidence/v142-deploy-stdout-21-11.txt`,
// lido por esta peça, nunca copy-cola). Aqui prova-se por HTTP e por estado do servidor:
//  · a shell servida é byte a byte o embed que a P103 gateou, e já não é a v141;
//  · o fecho está nos bytes servidos: a função, a chamada a partir do `aplicarVisibilidade`, o conjunto dos
//    conteúdos escondidos e o literal de destinos — e a régua da caixa vazia da v141 continua lá, intacta;
//  · nada regrediu: a sonda honesta da v139, a trilha da v140 e o remendo da PEN-40 têm no ar a mesma contagem
//    que na candidata;
//  · o servidor concorda com o stdout, e a cadeia de reversão aponta para a v141 (lida do diário dela).
// Regras: 0 DDL, 0 escrita no banco, 0 mint, 0 publicação. Só GET e leitura de disco.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SESSAO = 'C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296';
const BUNDLE = `${DIR}/worker-deploy-v142-painel-na-troca`;
const ESP = JSON.parse(readFileSync(`${BUNDLE}/esperado-v142.json`, 'utf8'));
const ESP141 = JSON.parse(readFileSync(`${DIR}/worker-deploy-v141-caixa-vazia/esperado-v141.json`, 'utf8'));
const CAND = readFileSync(`${DIR}/bfr-candidata-v142-painel-na-troca/index.html`, 'utf8');
const CAND141 = readFileSync(`${DIR}/bfr-candidata-v141-caixa-vazia/index.html`, 'utf8');
const STDOUT = readFileSync(`${DIR}/evidence/v142-deploy-stdout-21-11.txt`, 'utf8');
const STATUS = JSON.parse(readFileSync(`${DIR}/evidence/v142-deployments-status-21-11.json`, 'utf8'));
const LISTA = JSON.parse(readFileSync(`${DIR}/evidence/v142-deployments-list-21-11.json`, 'utf8'));
const DIARIO141 = JSON.parse(readFileSync(`${DIR}/audit-publicacao-v141.json`, 'utf8'));
const DDL4 = readFileSync(`${DIR}/scripts/sm4-ddl-municipal-candidata.sql`, 'utf8');
const SUF = (process.argv[2] || 'a').trim();
const OUT = `${DIR}/evidence/p104-pos-deploy-v142-${SUF}.json`;
const TXT = `${SESSAO}/p104-pos-deploy-v142-${SUF}.txt`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — corre com SUF novo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const URL_AR = ((DIARIO141.deploy || {}).url) || null;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error('ABORTA: URL do ar nao resolvida no diario da v141: ' + JSON.stringify(URL_AR));
const auditMesas = [...DDL4.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]).filter((x) => /audit/.test(x));
if (auditMesas.length !== 1) throw new Error('ABORTA: ' + auditMesas.length + ' mesas de trilha no DDL sm4 — a regua nao decidiria');
const MESA_AUDIT = auditMesas[0];
const POR_AUT = 'sonda.autorizada === true';
// O par de réguas: a da v141 (tem de continuar no ar) e a da v142 (tem de ter chegado).
const REGUA_V141 = 'const mostrar = veredito.apto && vista.visivel;';
const AGULHAS_V142 = ['function fecharPainelForaDaVista(', 'function painelAberto() {', 'if (!mostrar && painelAberto()) {', 'const CONTEUDOS_ESCONDIDOS = new Set();', 'const FALBACKS_DOS_BYTES = '];

const t0 = Date.now();
const out = { programa: 'scripts/p104-pos-deploy-v142.mjs', em: new Date().toISOString(), url: URL_AR, escrita: 0, ddl: 0, mint: 0, publicacao: 'esta peça não publica: confere o deploy já feito' };
const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'), content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const SHELLS = [];
for (let i = 0; i < 3; i++) SHELLS.push(await get('/'));
const sw = await get('/sw-v4.js?v=142');
const notfound = await get('/rota-inexistente-v142-pos');
const rotuloSw = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
const ARQUIVOS = readdirSync(`${BUNDLE}/public`).filter((f) => f !== '_headers').sort();
if (ARQUIVOS.length === 0) throw new Error('ABORTA: 0 assets no bundle — o portao dos assets ficaria vacuo');
const vivos = [];
for (const a of ARQUIVOS) { const r = await get(`/${a}`); const local = readFileSync(`${BUNDLE}/public/${a}`); vivos.push({ arquivo: a, http: r.http, md5_servido: r.md5, bytes_servidos: r.bytes, md5_local: md5(local), xfo: r.xfo, csp: r.csp }); }

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; out[nome] = dado; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('H1_shell_servida_tres_vezes_identica_e_igual_ao_embed_da_P103', SHELLS.every((s) => s.http === 200 && s.md5 === ESP.htmlMd5 && s.bytes === ESP.htmlBytes) && new Set(SHELLS.map((s) => s.md5)).size === 1,
  { servido: SHELLS.map((s) => ({ http: s.http, md5: s.md5, bytes: s.bytes })), esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
g('H2_a_shell_deixou_de_ser_a_v141_publicada', SHELLS[0].md5 !== ESP141.htmlMd5, { ar: SHELLS[0].md5, v141: ESP141.htmlMd5, delta_bytes: SHELLS[0].bytes - ESP141.htmlBytes });
g('H3_as_cinco_agulhas_do_fcho_estao_no_ar_uma_vez_cada', AGULHAS_V142.every((x) => n(SHELLS[0].texto, x) === 1), AGULHAS_V142.map((x) => x.slice(0, 30) + '=' + n(SHELLS[0].texto, x)));
g('H3b_a_regua_da_caixa_vazia_da_v141_continua_no_ar', n(SHELLS[0].texto, REGUA_V141) === 1 && n(SHELLS[0].texto, 'function aptoParaVista()') === 1 && n(SHELLS[0].texto, 'b.dataset.munVista = vista.visivel') === 1,
  { mostrar: n(SHELLS[0].texto, REGUA_V141), aptoParaVista: n(SHELLS[0].texto, 'function aptoParaVista()'), munVista: n(SHELLS[0].texto, 'b.dataset.munVista = vista.visivel') });
g('H4_a_contagem_das_agulhas_bate_com_a_candidata_e_com_nada_na_v141', AGULHAS_V142.every((x) => n(SHELLS[0].texto, x) === n(CAND, x) && n(CAND141, x) === 0),
  { no_ar: AGULHAS_V142.map((x) => x.slice(0, 30) + '=' + n(SHELLS[0].texto, x)), na_v141: AGULHAS_V142.map((x) => x.slice(0, 30) + '=' + n(CAND141, x)) });
g('H5_o_sw_no_ar_tem_a_etiqueta_da_v142_e_perde_a_da_v141', rotuloSw === ESP.cacheLabel && n(sw.texto, "'bfr-conecta-v141'") === 0, { rotulo_lido: rotuloSw, esperado: ESP.cacheLabel, v141_no_sw: n(sw.texto, "'bfr-conecta-v141'") });
g('H6_o_asset_de_servico_da_v142_chega_byte_a_byte_ao_ar', vivos.filter((v) => v.md5_servido !== v.md5_local || v.http !== 200).length === 0,
  { total: vivos.length, desvios: vivos.filter((v) => v.md5_servido !== v.md5_local || v.http !== 200).map((v) => v.arquivo) });
g('H7_o_remendo_da_pen40_no_modulo_continua_no_ar', (() => { const m = vivos.find((v) => v.arquivo === 'bfr-responsive-presentation.js'); return !!m && m.md5_servido === ESP.moduleMd5 && m.bytes_servidos === ESP.moduleBytes; })(),
  { lido: vivos.find((v) => v.arquivo === 'bfr-responsive-presentation.js') || {}, esperado: { md5: ESP.moduleMd5, bytes: ESP.moduleBytes } });
g('H8_a_sonda_honesta_e_a_trilha_chegam_ao_ar_com_a_contagem_da_candidata', n(SHELLS[0].texto, POR_AUT) === n(CAND, POR_AUT) && n(SHELLS[0].texto, POR_AUT) >= 1 && n(SHELLS[0].texto, MESA_AUDIT) === n(CAND, MESA_AUDIT) && n(SHELLS[0].texto, MESA_AUDIT) >= 1,
  { autorizada_no_ar: n(SHELLS[0].texto, POR_AUT), autorizada_na_candidata: n(CAND, POR_AUT), mesa_no_ar: n(SHELLS[0].texto, MESA_AUDIT), mesa_na_candidata: n(CAND, MESA_AUDIT), mesa_lida_do_ddl: MESA_AUDIT });
g('H9_nada_do_que_a_v141_ganhou_se_perdeu_na_v142', n(SHELLS[0].texto, MESA_AUDIT) === n(CAND141, MESA_AUDIT) && n(SHELLS[0].texto, POR_AUT) === n(CAND141, POR_AUT) && n(SHELLS[0].texto, 'data-bfr-municipal-nav') === n(CAND141, 'data-bfr-municipal-nav'),
  { trilha_no_ar: n(SHELLS[0].texto, MESA_AUDIT), trilha_na_v141: n(CAND141, MESA_AUDIT), sonda_no_ar: n(SHELLS[0].texto, POR_AUT), sonda_na_v141: n(CAND141, POR_AUT), entrada_no_ar: n(SHELLS[0].texto, 'data-bfr-municipal-nav'), entrada_na_v141: n(CAND141, 'data-bfr-municipal-nav') });
g('H10_headers_da_shell_intactos', SHELLS[0].xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(SHELLS[0].csp)) && /\*\.supabase\.co/.test(String(SHELLS[0].csp)), { xfo: SHELLS[0].xfo, csp_frag: String(SHELLS[0].csp || '').slice(0, 160) });
g('H11_rota_inexistente_ainda_da_404', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes });
g('H12_o_servidor_concorda_com_o_stdout_do_deploy', (() => {
  const verStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
  const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
  return !!verStdout && STATUS.versions[0].version_id === verStdout && STATUS.versions[0].percentage === 100 && porData[0].versions[0].version_id === verStdout;
})(), { stdout: (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1], status: STATUS.versions[0], lista_mais_nova: [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)))[0].versions[0] });
g('H13_a_cadeia_de_reversao_aponta_para_a_v141', (() => {
  const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
  return !!porData[1] && porData[1].versions[0].version_id === (DIARIO141.deploy || {}).version_id;
})(), { anterior: [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)))[1].versions[0].version_id, v141_no_diario: (DIARIO141.deploy || {}).version_id, nota: 'devolver o ar a v141 e um `wrangler deploy` a partir de worker-deploy-v141-caixa-vazia' });
g('H14_nenhum_valor_de_credencial_sale_do_servido', !/refresh_token|access_token=/.test(SHELLS[0].texto.slice(0, 400000)) && /eyJhbGciOi/.test(SHELLS[0].texto) === (/eyJhbGciOi/.test(CAND) === true),
  { nota: 'a chave publishable e configuracao do cliente e vive nos dois lados; o que se proibe aqui e um token de sessao impresso no ar' });
// O destino do fecho tem de ser uma secção que o próprio shell conhece nos bytes servidos. A forma medida é a
// paleta de navegação (`data-section="X"`), não um id de painel: os painéis chamam-se `XView`, e a 1.ª versão
// deste portão procurou `id="inicio"` e por isso deu vermelho da régua (preservado em
// `evidence/p104-pos-deploy-v142-a.json` com o nome do defeito). Uma régua que contasse só a presença do nome
// aceitaria um destino inventado; esta conta tem de bater com a candidata, painel a painel.
g('H15_os_destinos_do_fcho_sao_seccoes_da_paleta_do_shell_que_estao_no_ar', (() => {
  const pares = Object.entries(JSON.parse(readFileSync(`${DIR}/bfr-candidata-v142-painel-na-troca/portoes-v142-candidata.json`, 'utf8')).destino_por_vista_medida);
  if (pares.length < 5) throw new Error('ABORTA: ' + pares.length + ' destinos registados pelo p102 — o portao ficaria vacuo');
  return pares.every(([, d]) => typeof d.destino === 'string' && n(SHELLS[0].texto, 'data-section="' + d.destino + '"') >= 1 && n(SHELLS[0].texto, 'data-section="' + d.destino + '"') === n(CAND, 'data-section="' + d.destino + '"'));
})(), (() => {
  const pares = Object.entries(JSON.parse(readFileSync(`${DIR}/bfr-candidata-v142-painel-na-troca/portoes-v142-candidata.json`, 'utf8')).destino_por_vista_medida);
  return pares.map(([v, d]) => v + '->' + d.destino + '[' + d.fonte + '] data_section_no_ar=' + n(SHELLS[0].texto, 'data-section="' + d.destino + '"') + '/na_candidata=' + n(CAND, 'data-section="' + d.destino + '"'));
})());
g('H16_o_controlo_negativo_do_H15_tem_dentes', (() => {
  const inventado = 'seccao-inventada-v142-controle-negativo';
  return n(SHELLS[0].texto, 'data-section="' + inventado + '"') === 0 && n(SHELLS[0].texto, 'data-section="inicio"') >= 1;
})(), { destino_inventado_no_ar: n(SHELLS[0].texto, 'data-section="secção-que-o-shell-nao-conhece-v142"'), inicio_no_ar: n(SHELLS[0].texto, 'data-section="inicio"'), nota: 'uma regua que so contasse a presenca do nome aceitaria um destino inventado' });

out.medido = { url: URL_AR, shells: SHELLS.map((s) => ({ http: s.http, bytes: s.bytes, md5: s.md5 })), sw: { http: sw.http, bytes: sw.bytes, md5: sw.md5, rotulo: rotuloSw }, notfound: { http: notfound.http }, assets: vivos.map((v) => ({ arquivo: v.arquivo, http: v.http, md5_servido: v.md5_servido, bytes_servidos: v.bytes_servidos, md5_local: v.md5_local })), stdout_bytes: STDOUT.length, deploy_created_on: STATUS.created_on, deployment_id: STATUS.id };
out.duracao_ms = Date.now() - t0;
out.veredito = falhas.length === 0 ? 'P104_POS_DEPLOY_V142_OK 17/0' : 'P104_POS_DEPLOY_V142_VERMELHO ' + falhas.length + ' de 17';
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `${out.veredito}\nfalhas=${falhas.length}\n${falhas.join('\n')}\nnode_exit=${falhas.length ? 1 : 0}\n`);
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.duracao_ms} ms · ${OUT.replace(DIR + '/', '')}`);
process.exit(falhas.length ? 1 : 0);
