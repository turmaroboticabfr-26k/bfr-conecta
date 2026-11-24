#!/usr/bin/env node
// P153 — PROVA LOCAL DA v144 UNIESCO A PARTIR DOS DUMPS HEADLESS (24/11).
//
// Lê os dump-dom reais que o Chrome headless serviu de localhost:8144 (390×844 e 1280×900) e mede os campos
// de identidade. A prova de pixels (naturalWidth) vem das screenshots do mesmo Chrome no mesmo servidor.
// Escreve só evidence/p153-prova-local-v144-24-11.json. 0 deploy, 0 rede (só lê ficheiros).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = (process.argv[2] || 'a').trim();
const VERSAO = process.argv[3] || 'v144';
const EV = `${DIR}/evidence/p153-prova-local-${VERSAO}-24-11-${SUF}.json`;
if (existsSync(EV)) throw new Error('ABORTA: ' + EV + ' existe — use outro sufixo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.isBuffer(b) ? b : Buffer.from(String(b))).digest('hex');
const B = (s) => Buffer.byteLength(s);
const n = (t, x) => t.split(x).length - 1;
const stripTags = (t) => t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const bandas = {};
const portoes = {};
const total = { ok: 0, falha: 0 };
const checa = (nome, passou, detalhe) => { portoes[nome] = { passou: passou === true, detalhe }; total[passou === true ? 'ok' : 'falha'] += 1; };

for (const px of [390, 1280]) {
  const dom = readFileSync(`${DIR}/evidence/p153-dom-${VERSAO}-${px}px-24-11.html`, 'utf8');
  const shot = readFileSync(`${DIR}/evidence/p153-prova-local-${VERSAO}-${px}px-24-11.png`);
  const titulo = (/<title>([^<]*)<\/title>/.exec(dom) || [])[1] || null;
  const tema = (/name="theme-color" content="([^"]+)"/.exec(dom) || [])[1] || null;
  const favicon = (/rel="icon"[^>]*href="([^"]+)"/.exec(dom) || [])[1] || null;
  const apple = (/rel="apple-touch-icon"[^>]*href="([^"]+)"/.exec(dom) || [])[1] || null;
  const manifestHref = (/rel="manifest" href="([^"]+)"/.exec(dom) || [])[1] || null;
  const corpo = stripTags(dom);
  const bfrConecta = (corpo.match(/BFR Conecta|BFR CONECTA/g) || []).length;
  const bfrSozinho = (corpo.match(/\bBFR\b/g) || []).length;
  const uniesco = (corpo.match(/UNIESCO/g) || []).length;
  bandas[px] = {
    dump: { md5: md5(dom), bytes: B(dom) },
    screenshot: { md5: md5(shot), bytes: shot.length },
    title: titulo, theme_color: tema, favicon, apple_touch_icon: apple, manifest_href: manifestHref,
    corpo_visivel: { UNIESCO: uniesco, BFR_Conecta: bfrConecta, BFR_sozinho: bfrSozinho },
  };
  checa(`p_${px}_titulo_UNIESCO`, titulo === 'UNIESCO | Escola Benício Ferreira Reis', { title: titulo });
  checa(`p_${px}_tema_navy`, tema === '#00399b', { theme_color: tema });
  checa(`p_${px}_icones_novos`, favicon === 'uniesco-icon-192.png' && apple === 'uniesco-icon-180.png', { favicon, apple });
  checa(`p_${px}_zero_BFR_visivel`, bfrConecta === 0 && bfrSozinho === 0, { bfrConecta, bfrSozinho });
  checa(`p_${px}_UNIESCO_presente`, uniesco >= 2, { uniesco });
  checa(`p_${px}_screenshot_com_bytes`, shot.length > 20000, { bytes: shot.length });
}
if (total.falha) {
  writeFileSync(`${DIR}/evidence/p153-prova-local-${VERSAO}-24-11-${SUF}-VERMELHO.json`, JSON.stringify({ veredito: `P153_PROVA_LOCAL_VERMELHO ${total.ok}/${total.falha}`, portoes }, null, 2) + '\n');
  process.exit(1);
}
writeFileSync(EV, JSON.stringify({
  veredito: `P153_PROVA_LOCAL_OK ${total.ok}/${total.falha}`,
  em: new Date().toISOString(),
  origem: `Chrome headless --dump-dom/--screenshot contra http://localhost:8144/ (servidor local com public/ do worker-deploy-${VERSAO}-uniesco + index.html da candidata ${VERSAO})`,
  bandas,
  portoes,
}, null, 2) + '\n');
console.log(`P153_PROVA_LOCAL_OK ${total.ok}/${total.falha} · ${VERSAO} · 390: ${bandas[390].corpo_visivel.UNIESCO} UNIESCO / ${bandas[390].corpo_visivel.BFR_Conecta + bandas[390].corpo_visivel.BFR_sozinho} BFR · 1280: ${bandas[1280].corpo_visivel.UNIESCO} UNIESCO / ${bandas[1280].corpo_visivel.BFR_Conecta + bandas[1280].corpo_visivel.BFR_sozinho} BFR`);
process.exit(0);
