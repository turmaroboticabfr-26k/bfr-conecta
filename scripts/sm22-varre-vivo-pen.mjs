#!/usr/bin/env node
// SM-22 (peca 1, SOMENTE LEITURA): varre o que esta publicado HOJE e re-mede, por marcador,
// cada linha PEN cujo estado depende dos bytes servidos e nao do banco. A URL nao e digitada:
// vem de `audit-publicacao-v134.json`. Nada e escrito no banco, nada e publicado, nada e pushado.
//
// Regua dupla de proposito: cada marcador e contado (a) no ar e (b) na base local v123. Se um
// marcador der 0 nos dois lados, a sonda nao distingue nada e o 0 nao prova ausencia — e por
// isso o veredito de cada linha PEN so sai como FECHADA se o par (ar, base) divergir.
//
// Higiene: este ficheiro nunca imprimi nem grava valores de chave. Grava comprimentos, contagens
// e nomes de marcador. O md5 da shell servida e gravado porque e uma pegada, nao uma credencial.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-varre-vivo-pen-18-11b.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);

// 1) a URL viva, lida do diario de publicacao da v134 (campo extraido por chave, nao digitado)
const diario = JSON.parse(readFileSync(join(REPO, 'audit-publicacao-v134.json'), 'utf8'));
const bruto = JSON.stringify(diario);
const alvo = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(bruto) || [])[0];
if (!alvo) throw new Error('ABORTA: nenhum *.workers.dev no diario de publicacao da v134');

const noCache = { headers: { 'cache-control': 'no-cache' } };
const get = async (p) => {
  const r = await fetch(alvo + p, noCache);
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, bytes: buf.length, headers: Object.fromEntries(r.headers.entries()), body: buf.toString('utf8'), md5: createHash('md5').update(buf).digest('hex') };
};

const shell = await get('/');
const manifest = await get('/manifest.json');
const sw = await get('/sw-v4.js');
const porDentro = await get('/fora-do-bundle-sm22.js');
const rotas = {};
for (const r of ['/aluno', '/coordenacao', '/direcao', '/professor']) rotas[r] = (await get(r)).status;

// 2) o fixture local: a v133 (antecessora imediata do que esta no ar). Serve de prova de
// poder de fogo — um 0 no ar so vale como «ausente» se o mesmo marcador disparar na base;
// se nao dispara em lado nenhum, a sonda esta cega e o 0 e INDETERMINADO, nao ausencia.
const baseTxt = readFileSync(join(REPO, 'bfr-candidata-v133-secretaria-municipal/index.html'), 'utf8');
// A pegada esperada da candidata publicada tambem nao se dactilografa: le-se do proprio
// portao da v134, no campo que o gerador gravou.
const certidao = JSON.parse(readFileSync(join(REPO, 'bfr-candidata-v134-sidebar-escondida/portoes-v134-candidata.json'), 'utf8'));
const md5Esperada = certidao.saida.index_md5;

const MARCADORES = {
  pen30_select_created_at_do_announcements: /from\('announcements'\)\s*\.select\('[^']*created_at[^']*'\)/,
  pen29_tabela_shift_settings: /bfr_school_shift_settings/g,
  pen29_tabela_calendar_days: /bfr_school_calendar_days/g,
  pen29_tabela_month_targets: /bfr_school_calendar_month_targets/g,
  pen32_setrole_conhece_supervisor: /setRole[\s\S]{0,4000}?education_supervisor/,
  pen33_accountLabels_sem_fallback: /accountLabels[\s\S]{0,2000}?education_supervisor/,
  pen18_MutationObserver: /new MutationObserver/g,
  pen19_escritor_periodico_navButton: /setInterval\([\s\S]{0,160}?navButton[\s\S]{0,160}?,\s*1200\s*\)/,
  pen26_registro_sw_v4: /serviceWorker\.register\(['"]\/sw-v4\.js/,
  sidebar_flex_em_body_sm8fix: /#appShell\.ready \.sidebar\s*\{\s*display:\s*flex\s*!important/,
};

const conta = (txt, re) => (txt.match(re) || []).length;

const marcadores = {};
for (const [nome, re] of Object.entries(MARCADORES)) {
  const noAr = conta(shell.body, re);
  const naBase = conta(baseTxt, re);
  // poder de fogo: um 0 no ar so vale como «ausente» se o mesmo marcador casar em algum lado.
  // Sem isso, o 0 e sonda cega (INDETERMINADO), nao ausencia — a licao da regua auto-referente.
  marcadores[nome] = { no_ar: noAr, na_base_v133: naBase, discrimina: noAr !== naBase, poder_de_fogo: noAr > 0 || naBase > 0 };
}

// 3) cabecalhos anti-clique-jacketing (PEN-24) — medidos na resposta, nao no fonte
const cab = (h) => ({
  x_frame_options: h['x-frame-options'] || null,
  cdp_frame_ancestors: (h['content-security-policy'] || '').match(/frame-ancestors[^;]*/i)?.[0] || null,
  permissions_policy: h['permissions-policy'] || null,
  coop: h['cross-origin-opener-policy'] || null,
  csp_presente: !!h['content-security-policy'],
});
const pen24 = { shell: cab(shell.headers), manifest: cab(manifest.headers), sw: cab(sw.headers) };

const out = {
  em: new Date().toISOString(),
  origem_url: 'audit-publicacao-v134.json (campo https://*.workers.dev)',
  url: alvo,
  identidade: {
    shell_md5: shell.md5, shell_bytes: shell.bytes,
    esperada_da_candidata_v134: md5Esperada,
    igual_a_candidata_publicada: shell.md5 === md5Esperada,
    base_local_v133_bytes: Buffer.byteLength(baseTxt),
  },
  pen24_cabecalhos: pen24,
  pen27_fora_do_bundle: { caminho: '/fora-do-bundle-sm22.js', status: porDentro.status },
  pen34_rotas_internas: rotas,
  pen26_sw: { caminho: '/sw-v4.js', status: sw.status, bytes: sw.bytes, md5: sw.md5, tem_push: /addEventListener\(['"]push/i.test(sw.body), tem_notificationclick: /addEventListener\(['"]notificationclick/i.test(sw.body) },
  marcadores,
};

// 4) veredito por linha. A regra: um «CORRIGIDA» exige ar=0 E base>0 (a sonda tem de saber
// o que procura); ar>0 e CONTINUA; ar=0 E base=0 e SONDA_CEGA, nunca ausencia.
const d = marcadores;
const classif = (chave) => {
  if (d[chave].no_ar > 0) return `CONTINUA_NO_AR (${d[chave].no_ar})`;
  if (d[chave].na_base_v133 > 0) return 'CORRIGIDO_NO_AR';
  return 'SONDA_CEGA_INDETERMINADA';
};
out.veredito = {
  'PEN-24': pen24.shell.cdp_frame_ancestors || pen24.shell.x_frame_options ? 'PROTEGIDO_NO_SHELL' : 'CONTINUA_AUSENTE',
  'PEN-27': porDentro.status === 404 ? 'FECHADA_NO_AR (404)' : `CONTINUA (status ${porDentro.status})`,
  'PEN-29': (() => {
    const noAr = d.pen29_tabela_shift_settings.no_ar + d.pen29_tabela_calendar_days.no_ar + d.pen29_tabela_month_targets.no_ar;
    const naBase = d.pen29_tabela_shift_settings.na_base_v133 + d.pen29_tabela_calendar_days.na_base_v133 + d.pen29_tabela_month_targets.na_base_v133;
    return noAr > 0 ? `CONTINUA_NO_AR (${noAr} mencoes)` : naBase > 0 ? 'NAO_SELECIONA_MAIS' : 'SONDA_CEGA_INDETERMINADA';
  })(),
  'PEN-30': classif('pen30_select_created_at_do_announcements'),
  'PEN-32': classif('pen32_setrole_conhece_supervisor'),
  'PEN-33': classif('pen33_accountLabels_sem_fallback'),
  'PEN-19': classif('pen19_escritor_periodico_navButton'),
  'PEN-34': Object.entries(rotas).map(([r, s]) => `${r}=${s}`).join(' '),
  'PEN-26': `sw-v4.js status=${out.pen26_sw.status} push=${out.pen26_sw.tem_push} notifclick=${out.pen26_sw.tem_notificationclick}`,
  'SM.21_sidebar_fix': `bloco_sidebar_flex_em_body ar=${d.sidebar_flex_em_body_sm8fix.no_ar} base_v133=${d.sidebar_flex_em_body_sm8fix.na_base_v133} — NAO e a PEN-01: a PEN-01 e tempo entre toque e paint, isto e ordem de cascade`,
  'PEN-18': `MutationObserver ar=${d.pen18_MutationObserver.no_ar} base_v133=${d.pen18_MutationObserver.na_base_v133}`,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`identidade_shell=${out.identidade.igual_a_candidata_publicada ? 'IGUAL' : 'DIFERENTE'} md5=${shell.md5} bytes=${shell.bytes}`);
for (const [k, v] of Object.entries(marcadores)) console.log(`  marcador ${k}: ar=${v.no_ar} base_v133=${v.na_base_v133} discrimina=${v.discrimina} poder_de_fogo=${v.poder_de_fogo}`);
console.log('--- vereditos ---');
for (const [k, v] of Object.entries(out.veredito)) console.log(`  ${k}: ${v}`);
console.log(`\nSM22_VARRE_VIVO_OK · registo evidence/sm22-varre-vivo-pen-18-11b.json`);
