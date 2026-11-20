#!/usr/bin/env node
// P73-L — leitor da bancada A/B do remendo PEN-40: compõe as duas pernas (base e candidata) num veredito
// único com portões. As identidades esperadas (md5 do html, dos módulos) são lidas dos artefactos
// versionados (esperado-v137.json e portoes-v137-remendo-pen40.json), nunca dactilografadas. Só leitura.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const OUT = `${EV}/p73-leitor-bancada-pen40-20-11e.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');

const LARGURAS = [320, 360, 375, 390, 414, 430];
const le = (p) => { const t = readFileSync(p, 'utf8'); return { json: JSON.parse(t), bytes: Buffer.byteLength(t), md5: md5(t), caminho: p }; };
const esperado = JSON.parse(readFileSync(`${REPO}/worker-deploy-v137-remendo-pen40/esperado-v137.json`, 'utf8'));
const portoes = JSON.parse(readFileSync(`${REPO}/bfr-candidata-v137-remendo-pen40/portoes-v137-remendo-pen40.json`, 'utf8'));
const base = le(`${EV}/p73-bancada-pen40-monitor-base-20-11e.json`);
const cand = le(`${EV}/p73-bancada-pen40-monitor-candidata-20-11e.json`);

const saida = { programa: 'scripts/p73-leitor-bancada-pen40.mjs', em: new Date().toISOString(), pernas: { base: { bytes: base.bytes, md5: base.md5 }, candidata: { bytes: cand.bytes, md5: cand.md5 } }, identidade_esperada: { html_md5: esperado.htmlMd5, modulo_base_md5: null, modulo_cand_md5: null }, portoes: {}, falhas: [] };
const portao = (nome, ok, detalhe) => { saida.portoes[nome] = { verde: !!ok, detalhe: detalhe ?? null }; if (!ok) saida.falhas.push(nome); };

const lido = (o, ...ks) => ks.reduce((a, k) => (a == null ? a : a[k]), o);
const armados = (leg, w) => lido(leg, 'resultados', String(w), 'sem_toque', 'armados_piso');
const sinistro = (leg, w) => ['sem_toque', 'dois_eventos', 'sossego_5s'].reduce((n, fase) => { const s = lido(leg, 'resultados', String(w), fase, 'sinistros'); return n + (Array.isArray(s) ? s.length : 0); }, 0);

saida.identidade_esperada.modulo_base_md5 = lido(portoes, 'origem', 'md5');
saida.identidade_esperada.modulo_cand_md5 = lido(portoes, 'saida', 'md5');
portao('esperado_e_portoes_disseram_o_mesmo_md5', lido(esperado, 'moduleMd5') === saida.identidade_esperada.modulo_cand_md5 && lido(esperado, 'htmlMd5') === saida.identidade_esperada.html_md5, { esperado_module: lido(esperado, 'moduleMd5'), portoes_saida: saida.identidade_esperada.modulo_cand_md5, esperado_html: lido(esperado, 'htmlMd5') });
portao('pernas_sem_interrupcao', !base.json.INTERROMPIDA && !cand.json.INTERROMPIDA, { base: base.json.INTERROMPIDA || null, candidata: cand.json.INTERROMPIDA || null });
portao('html_da_bancada_e_o_embed_v137', lido(base.json, 'bancada', 'html', 'md5') === lido(esperado, 'htmlMd5') && lido(cand.json, 'bancada', 'html', 'md5') === lido(esperado, 'htmlMd5'), { md5_bancada: lido(base.json, 'bancada', 'html', 'md5'), md5_esperado_v137: lido(esperado, 'htmlMd5') });
portao('modulo_base_e_o_do_repo', lido(base.json, 'bancada', 'modulos', 'base', 'md5') === saida.identidade_esperada.modulo_base_md5, { md5: lido(base.json, 'bancada', 'modulos', 'base', 'md5'), esperado: saida.identidade_esperada.modulo_base_md5 });
portao('modulo_candidata_e_a_saida_do_remendo', lido(cand.json, 'bancada', 'modulos', 'candidata', 'md5') === saida.identidade_esperada.modulo_cand_md5, { md5: lido(cand.json, 'bancada', 'modulos', 'candidata', 'md5'), esperado: saida.identidade_esperada.modulo_cand_md5 });
portao('cada_perna_serviu_o_modulo_que_declarou', lido(base.json, 'bancada', 'modulos', 'md5_leg') === saida.identidade_esperada.modulo_base_md5 && lido(base.json, 'bancada', 'modulos', 'selfcheck_servido_igual') === true && lido(cand.json, 'bancada', 'modulos', 'md5_leg') === saida.identidade_esperada.modulo_cand_md5 && lido(cand.json, 'bancada', 'modulos', 'selfcheck_servido_igual') === true, { base_leg: lido(base.json, 'bancada', 'modulos', 'md5_leg'), candidata_leg: lido(cand.json, 'bancada', 'modulos', 'md5_leg') });
portao('nenhuma_leitura_com_sinistro', LARGURAS.every((w) => sinistro(base.json, w) === 0 && sinistro(cand.json, w) === 0), { por_largura: Object.fromEntries(LARGURAS.map((w) => [w, [sinistro(base.json, w), sinistro(cand.json, w)]])) });
portao('base_reproduz_o_defeito_6_de_6', LARGURAS.every((w) => lido(base.json, 'resumo', String(w), 'veredicto') === 'NAO_MONTA'), Object.fromEntries(LARGURAS.map((w) => [w, lido(base.json, 'resumo', String(w), 'veredicto')])));
portao('base_tambem_nao_monta_depois_de_5s_de_sossego', LARGURAS.every((w) => lido(base.json, 'resumo', String(w), 'apos_sossego') === false && lido(base.json, 'resumo', String(w), 'apos_eventos') === false), Object.fromEntries(LARGURAS.map((w) => [w, { sossego: lido(base.json, 'resumo', String(w), 'apos_sossego'), eventos: lido(base.json, 'resumo', String(w), 'apos_eventos') }])));
portao('base_com_churn_do_monitor', LARGURAS.every((w) => (armados(base.json, w) || 0) > 100), Object.fromEntries(LARGURAS.map((w) => [w, armados(base.json, w)])));
portao('candidata_com_churn_do_monitor', LARGURAS.every((w) => (armados(cand.json, w) || 0) > 100), Object.fromEntries(LARGURAS.map((w) => [w, armados(cand.json, w)])));
portao('candidata_monta_6_de_6', LARGURAS.every((w) => lido(cand.json, 'resumo', String(w), 'veredicto') === 'MONTA' && lido(cand.json, 'resumo', String(w), 'sem_toque') === true), Object.fromEntries(LARGURAS.map((w) => [w, lido(cand.json, 'resumo', String(w), 'veredicto')])));
portao('candidata_com_botoes_com_caixa_6_de_6', LARGURAS.every((w) => lido(cand.json, 'resumo', String(w), 'botoes_com_caixa') === 5), Object.fromEntries(LARGURAS.map((w) => [w, lido(cand.json, 'resumo', String(w), 'botoes_com_caixa')])));
portao('monta_mesmo_com_estrelacao_total', LARGURAS.some((w) => lido(cand.json, 'resumo', String(w), 'venceu_piso') === 0 && lido(cand.json, 'resumo', String(w), 'sem_toque') === true), { caso: Object.fromEntries(LARGURAS.map((w) => [w, { venceu: lido(cand.json, 'resumo', String(w), 'venceu_piso'), monta: lido(cand.json, 'resumo', String(w), 'sem_toque') }])) });
const ctl = lido(cand.json, 'controlo');
portao('controlo_gatekeeper_monta_com_candidata', lido(ctl, 'sem_toque', 'nav_existe') === true && lido(ctl, 'sem_toque', 'botoes_com_caixa') === 5 && (lido(ctl, 'sem_toque', 'venceu_piso') || 0) > 0, { nav_existe: lido(ctl, 'sem_toque', 'nav_existe'), botoes: lido(ctl, 'sem_toque', 'botoes_com_caixa'), venceu: lido(ctl, 'sem_toque', 'venceu_piso') });
const sess = { ...(base.json.sessoes || {}), ...(cand.json.sessoes || {}) };
portao('sessoes_gravadas_fieis_e_sem_token', Object.values(sess).every((s) => s.gravado_fiel === true) && !JSON.stringify(sess).includes('access_token') && !JSON.stringify(sess).includes('refresh_token'), { papeis: Object.keys(sess), campos: Object.keys(Object.values(sess)[0] || {}) });

const nF = saida.falhas.length;
saida.veredito = nF ? 'P73_BANCADA_PEN40_FALHOU ' + nF : 'P73_BANCADA_PEN40_AB_VERDE';
saida.leitura = nF ? 'ver portoes' : 'a candidata v137 monta a barra mobile do monitor nas 6 larguras (5/5 botões com caixa em todas) onde a base — byte-idêntica ao módulo servido no ar — nunca monta; e monta mesmo na largura com estrelação total (venceu=0). Prova ao nível da candidata; a re-corrida do ah2-mobile2 no AR continua a pedir a publicação, que pede OK literal.';
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
console.log((saida.veredito.includes('VERDE') ? 'P73_BANCADA_PEN40_AB_VERDE' : 'P73_BANCADA_PEN40_FALHOU') + ' · ' + Object.keys(saida.portoes).length + '/' + nF + (nF ? ' · falhas: ' + nF : '') + ' · registo ' + OUT);
process.exit(nF ? 1 : 0);
