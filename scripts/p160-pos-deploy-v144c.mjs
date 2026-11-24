#!/usr/bin/env node
// P160 — POS-DEPLOY DA v144c (24/11). O deploy aconteceu (stdout em evidence/v144c-deploy-stdout-24-11.txt).
// Esta peça NÃO publica: confere o deploy já feito com HTTP GET e leitura de disco. As réguas do nome são
// lidas da fonte do p156 (aborta se não as ler). 0 escrita no banco, 0 DDL, 0 deploy, 0 push.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const EV = `${DIR}/evidence/p160-pos-deploy-v144c-24-11-${SUF}.json`;
const EV_TXT = `${DIR}/evidence/p160-pos-deploy-v144c-24-11-${SUF}.txt`;
if ([EV, EV_TXT].some((f) => existsSync(f))) throw new Error('ABORTA: evidencia ja existe — use outro sufixo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const B = (s) => Buffer.byteLength(s);
const n = (t, x) => t.split(x).length - 1;
const rd = (p) => JSON.parse(readFileSync(`${DIR}/${p}`, 'utf8'));

const D142 = rd('audit-publicacao-v142.json');
const URL_AR = D142.deploy.url;
const ESP144C = rd('worker-deploy-v144c-uniesco/esperado-v144c.json');
const P156 = rd('evidence/p156-varredura-nome-v144c-24-11-a.json');
const ST = rd('evidence/v144c-deployments-status-depois-24-11.json');
const LD = rd('evidence/v144c-deployments-list-depois-24-11.json');
const STDOUT = readFileSync(`${DIR}/evidence/v144c-deploy-stdout-24-11.txt`, 'utf8');
const VER = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
if (!VER) throw new Error('ABORTA: sem version id no stdout do deploy');

const SRC156 = readFileSync(`${DIR}/scripts/p156-varredura-nome-v144b.mjs`, 'utf8');
const mVis = /const RE_VISIVEL = (\/[^;]*\/g);/.exec(SRC156);
const mDow = /const RE_DOWNLOAD = (\/[^;]*\/g);/.exec(SRC156);
if (!mVis || !mDow) throw new Error('ABORTA: nao li as reguas da fonte do p156');
const RE_VISIVEL = new RegExp(mVis[1].slice(1, -2), 'g');
const RE_DOWNLOAD = new RegExp(mDow[1].slice(1, -2), 'g');
const visivelDe = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const scriptsDe = (s) => [...s.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n').replace(/bfr-conecta/g, ' ');

const out = {
  ciclo: 'P160-POS-DEPLOY-V144C', em: new Date().toISOString(), url: URL_AR,
  escrita: 0, ddl: 0, mint: 0, publicacao: 'esta peça não publica: confere o deploy já feito',
  version_id_do_stdout: VER, portoes: {}, total: { ok: 0, falha: 0 },
};
const g = (nome, ok, dado) => { out.portoes[nome] = { passou: ok === true, ...(dado || {}) }; out.total[ok === true ? 'ok' : 'falha'] += 1; };
const falhou = () => {
  const RED = `${DIR}/evidence/p160-pos-deploy-v144c-24-11-${SUF}-VERMELHO.json`;
  const RED_TXT = `${DIR}/evidence/p160-pos-deploy-v144c-24-11-${SUF}-VERMELHO.txt`;
  out.veredito = `P160_POS_DEPLOY_V144C_FALHOU ${out.total.ok}/${out.total.falha}`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(RED_TXT, 'VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ') + '\nnode_exit=1\n');
  console.error(out.veredito);
  process.exit(1);
};

const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'), ctype: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const manifest = await get('/manifest.json');
const notfound = await get('/rota-inexistente-p160-pos-deploy');

const corpo = visivelDe(shell.texto);
const scr = scriptsDe(shell.texto);
const medido = {
  visivel_velho: [...corpo.matchAll(RE_VISIVEL)].length,
  scripts_velho: [...scr.matchAll(RE_VISIVEL)].length,
  downloads_velho: [...shell.texto.matchAll(RE_DOWNLOAD)].length,
  UNIESCO: (corpo.match(/UNIESCO/g) || []).length,
  sw_velho: [...sw.texto.replace(/bfr-conecta/g, ' ').matchAll(RE_VISIVEL)].length,
  nota_sw: 'SW medido com o composto tecnico preservado bfr-conecta (etiqueta do cache) removido, como o p156 faz aos scripts',
};
out.medido = medido;

g('B1_shell_no_ar_e_a_candidata_v144c', shell.http === 200 && shell.md5 === ESP144C.htmlMd5 && shell.bytes === ESP144C.htmlBytes,
  { medido: { md5: shell.md5, bytes: shell.bytes }, esperado: { md5: ESP144C.htmlMd5, bytes: ESP144C.htmlBytes } });
g('B2_nome_velho_a_zero_nas_tres_reguas_no_ar', medido.visivel_velho === 0 && medido.scripts_velho === 0 && medido.downloads_velho === 0,
  { regra: 'RE_VISIVEL/RE_DOWNLOAD lidos do p156; scripts com o composto tecnico bfr-conecta removido' });
g('B3_UNIESCO_presente_no_ar', medido.UNIESCO >= 2, { UNIESCO: medido.UNIESCO });
const MANIFEST = JSON.parse(manifest.texto);
g('B4_manifest_no_ar_e_UNIESCO', manifest.http === 200 && MANIFEST.name === 'UNIESCO' && MANIFEST.short_name === 'UNIESCO' && MANIFEST.theme_color === '#00399b',
  { name: MANIFEST.name, short_name: MANIFEST.short_name, theme: MANIFEST.theme_color });
const rotulo = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];
g('B5_sw_no_ar_e_o_da_v144c_com_etiqueta_e_titulo_novos', sw.http === 200 && sw.md5 === ESP144C.swMd5 && sw.bytes === ESP144C.swBytes && rotulo === 'bfr-conecta-v144' && n(sw.texto, "|| 'UNIESCO';") === 1 && medido.sw_velho === 0,
  { rotulo, md5: sw.md5, esperado: { md5: ESP144C.swMd5, bytes: ESP144C.swBytes }, titulo_UNIESCO: n(sw.texto, "|| 'UNIESCO';") });
const icones = [];
for (const f of ['uniesco-icon-192.png', 'uniesco-icon-180.png', 'uniesco-icon-512.png', 'bfr-app-logo.png']) {
  const r = await get(`/${f}`);
  icones.push({ arquivo: f, http: r.http, md5: r.md5, bytes: r.bytes });
}
const iconesEsperados = {
  'uniesco-icon-192.png': ESP144C.icones[192], 'uniesco-icon-180.png': ESP144C.icones[180], 'uniesco-icon-512.png': ESP144C.icones[512], 'bfr-app-logo.png': ESP144C.logoTecnicaMd5,
};
g('B6_icones_e_logo_tecnica_no_ar_batem_com_o_bundle', icones.every((i) => i.http === 200 && i.md5 === iconesEsperados[i.arquivo]), { icones });
g('B7_headers_de_seguranca_na_shell', shell.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp || '')), { xfo: shell.xfo, csp_tem_frame_ancestors: /frame-ancestors 'self'/.test(String(shell.csp || '')) });
g('B8_rota_inexistente_da_404', notfound.http === 404, { http: notfound.http });
const porData = [...LD].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
g('B9_versao_no_servidor_e_a_do_deploy_a_100', ST.versions[0].version_id === VER && ST.versions[0].percentage === 100 && porData[0].versions[0].version_id === VER,
  { status: ST.versions[0], lista_mais_nova: porData[0].versions[0].version_id, created: porData[0].created_on });
const anterior = porData[1];
g('B10_cadeia_de_reversao_para_a_v142', !!anterior && anterior.versions[0].version_id === D142.deploy.version_id,
  { anterior: anterior ? anterior.versions[0].version_id : null, v142_no_diario: D142.deploy.version_id, nota: 'reversao: wrangler deploy a partir de worker-deploy-v142-painel-na-troca — exige OK literal novo' });
g('B11_p156_disco_verde_sobre_esta_mesma_candidata', P156.veredito === 'P156_VARREDURA_NOME_V144C_OK 5/5' && P156.identidade.candidata_md5 === ESP144C.htmlMd5,
  { p156: P156.veredito, p156_candidata: P156.identidade.candidata_md5, esperado: ESP144C.htmlMd5 });
g('B12_diario_v144_ainda_nao_existe', !existsSync(`${DIR}/audit-publicacao-v144.json`), { nota: 'o diario de publicacao v144 ainda nao existe' });
if (out.total.falha) falhou();

out.veredito = `P160_POS_DEPLOY_V144C_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [out.veredito,
  `ar=${URL_AR} · shell=${shell.md5} (${shell.bytes} B) · visivel=${medido.visivel_velho} scripts=${medido.scripts_velho} downloads=${medido.downloads_velho} sw=${medido.sw_velho} · UNIESCO=${medido.UNIESCO}`,
  `versao=${VER} a 100% · reversao para ${D142.deploy.version_id} (v142) · escrita=0 ddl=0 mint=0 publicacao=0 · node_exit=0`];
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\n');
console.log(linhas.join('\n'));
process.exit(0);
