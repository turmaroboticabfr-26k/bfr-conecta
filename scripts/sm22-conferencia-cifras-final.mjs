#!/usr/bin/env node
// SM-22 (peca 19, SOMENTE LEITURA, ZERO REDE): fecha a conferencia das cifras do §SM.22.
// A peca 9 cobria as peças 1-9; as pecas 10-18 (polaridade, SW servido, escada de geracoes, delta
// setRole, nomes e rotas do PEN-29, formas emitidas, arbitragem do `schools(name)`) mediram depois
// dela e portanto nao estao no seu registo. Aqui as duas metades ligam-se no mesmo ficheiro: cada
// cifra e lida do artefacto que a produzuiu, com o nome desse artefacto ao lado, e as identidades
// (shell no ar, shell em disco, SW servido, esperado do certidao) confrontam-se por md5 medido.
// Nada se dactilografia: se um numero nao estiver num artefacto, esta peca aborta em vez de o escrever.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-conferencia-cifras-18-11d.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const rd = (nome) => {
  const p = join(REPO, 'evidence', nome);
  if (!existsSync(p)) throw new Error(`ABORTA: falta o artefacto ${nome} — nenhuma cifra sai desta peca sem a sua origem em disco`);
  return JSON.parse(readFileSync(p, 'utf8'));
};
const md5de = (rel) => {
  const p = join(REPO, rel);
  if (!existsSync(p)) throw new Error(`ABORTA: falta ${rel}`);
  const b = readFileSync(p);
  return { md5: createHash('md5').update(b).digest('hex'), bytes: b.length };
};

const c9 = rd('sm22-conferencia-cifras-18-11.json');
const vivo = rd('sm22-varre-vivo-pen-18-11b.json');
const polar = rd('sm22-varre-polaridade-18-11f.json');
const swServ = rd('sm22-varre-sw-servido-18-11.json');
const escada = rd('sm22-escada-proveniencia-32-33-18-11.json');
const delta = rd('sm22-delta-setrole-e-formato-labels-18-11b.json');
const nomes = rd('sm22-nomes-tabelas-pen29-18-11.json');
const rotas = rd('sm22-rotas-pen29-e-pen28-18-11.json');
const emitidas = rd('sm22-formas-emitidas-no-ar-18-11d.json');
const onde = rd('sm22-onde-sao-as-2-schools-name-18-11.json');
const arbitra = rd('sm22-arbitra-schools-name-18-11b.json');
const esperado = JSON.parse(readFileSync(join(REPO, 'worker-deploy-v134-sidebar/esperado-v134.json'), 'utf8'));

// ── identidade: o disco de topo da escada tem de ser os bytes servidos ─────────────────────────
const cand = md5de('bfr-candidata-v134-sidebar-escondida/index.html');
const identidade = {
  shell_no_ar_md5: vivo.identidade.shell_md5, shell_no_ar_bytes: vivo.identidade.shell_bytes ?? null,
  candidata_v134_em_disco: cand,
  disco_igual_ao_ar: cand.md5 === vivo.identidade.shell_md5,
  topo_da_escada_md5: (escada.degraus.find((d) => /v134/.test(d.geracao)) || {}).md5 ?? null,
  escada_top_ficheiro: (escada.degraus.find((d) => /v134/.test(d.geracao)) || {}).ficheiro ?? null,
  certidao_v134_htmlMd5: esperado.htmlMd5, certidao_v134_htmlBytes: esperado.htmlBytes,
  disco_igual_ao_certidao: cand.md5 === esperado.htmlMd5 && cand.bytes === esperado.htmlBytes,
  ar_igual_ao_certidao: vivo.identidade.shell_md5 === esperado.htmlMd5 && vivo.identidade.shell_bytes === esperado.htmlBytes,
};
if (!identidade.disco_igual_ao_ar) throw new Error(`ABORTA: candidata ${cand.md5} != ar ${vivo.identidade.shell_md5} — o que esta em disco nao e o que esta publicado`);
if (!identidade.disco_igual_ao_certidao) throw new Error(`ABORTA: candidata ${cand.md5}/${cand.bytes}B != certidao v134 ${esperado.htmlMd5}/${esperado.htmlBytes}B`);

// ── PEN-26 no SW SERVIDO (peca 11), que e o par da peca 1 e do certidao ────────────────────────
const cadaSW = Object.fromEntries(swServ.sw_servidos.map((s) => [s.caminho, {
  status: s.status, bytes: s.bytes, md5: s.md5, ouvintes: s.ouvintes, addEventListener_contados: s.addEventListener_contados }]));
const sw = { brutos_no_shell: swServ.brutos_no_shell, resolvidos: swServ.resolvidos, cada: cadaSW,
  md5_igual_entre_os_dois_caminhos: new Set(swServ.sw_servidos.map((s) => s.md5)).size === 1,
  confrontacao: swServ.confrontacao, veredito: swServ.veredito_sw, controlo_negativo: swServ.controlo_negativo,
  md5_no_artefacto_da_peca1: vivo.pen26_sw.md5, md5_no_certidao_v134: esperado.swMd5 };

// ── PEN-32/33: a régua que discrimina, nao a palavra que aparece ────────────────────────────────
const p32 = {
  portao_por_geracao: delta.pen32_portao_por_geracao, regua_discrimina: delta.pen32_a_regua_discrimina,
  escala: delta.pen32_escala_da_correcao, delta_v119_para_v120: { offset_no_corpo: delta.pen32_delta_v119_para_v120.offset_no_corpo,
    bytes_removidos: delta.pen32_delta_v119_para_v120.bytes_removidos, bytes_adicionados: delta.pen32_delta_v119_para_v120.bytes_adicionados },
  fora_de_setRole: delta.pen32_o_que_a_v120_mexeu_fora_de_setRole,
  primeira_geracao_com_o_portao: (delta.pen32_portao_por_geracao.find((e) => e.portao_de_edsup) || {}).geracao ?? null,
};
const p33 = {
  corpo_bytes: delta.pen33_accountLabels.corpo_bytes, n_por_chaves: delta.pen33_accountLabels.n_por_chaves,
  n_por_valores: delta.pen33_accountLabels.n_por_valores, batem: delta.pen33_accountLabels.batem,
  chaves: delta.pen33_accountLabels.chaves, rotulo_education_supervisor: delta.pen33_accountLabels.rotulo_education_supervisor,
  fixture_do_contador: delta.fixtures, primeira_geracao_com_par: (escada.leitura || {}).primeira_com_accountLabels_par ?? null,
};
if (!p33.batem) throw new Error(`ABORTA: accountLabels por chaves (${p33.n_por_chaves}) e por valores (${p33.n_por_valores}) nao batem`);
const polaridade = { defeito_confessado: polar.defeito_confessado, identidade_do_corpus: polar.identidade,
  marcadores: polar.marcadores.map((m) => ({ nome: m.nome, polaridade: m.polaridade, no_ar: m.no_ar, na_base_v133: m.na_base_v133, na_base_v119: m.na_base_v119, discrimina: m.discrimina, poder_de_fogo: m.poder_de_fogo, veredito: m.veredito })) };
// o que cada PEN fechada tem para apoiar o fecho: uma regua que muda de valor entre o corpus anterior
// e o actual. Onde nenhuma regua discrimina (pen32 por palavra, pen26 por template), o fecho nao e
// afirmado com esta peca — vem das pecas 11/12/13, cujas reguas estao acima.
const reguas_que_discriminam = { marcadores_que_discriminam: polaridade.marcadores.filter((m) => m.discrimina).map((m) => m.nome),
  marcadores_cegos: polaridade.marcadores.filter((m) => !m.discrimina).map((m) => m.nome),
  pen32_pelo_portao: p32.regua_discrimina, pen33_pela_escada: escada.leitura.discriminam_as_duas_anotacoes };

// ── PEN-28 / PEN-31: quantas formas saem do ar hoje ────────────────────────────────────────────
const regua = emitidas.regua_do_PEN31_no_ar;
const soma_fronteiras = regua.schools_name_com_fronteira + regua.sports_schools_name_com_fronteira;
const pen28 = { resumo: emitidas.resumo, por_status: c9.cifras.pen28.por_status,
  formas: emitidas.nove_formas_do_censo_v118.map((f) => `${f.de}|${f.code_v118}|emitida=${f.emitida_no_ar_hoje}|re_sonda=${f.re_sonda_de_hoje || '-'}`),
  guardian_students_emitidas: emitidas.contagem_guardian_students_emitida,
  pen31_no_ar: regua, regua_soma_bate_com_substring: soma_fronteiras === regua.schools_name_por_substring,
  nao_emitida: emitidas.nove_formas_do_censo_v118.filter((f) => !f.emitida_no_ar_hoje).map((f) => `${f.de}|${f.code_v118}`),
  arbitragem: { n_pares: arbitra.n_pares_from_select, n_supervision_requests: arbitra.n_supervision_requests,
    n_classes: arbitra.n_classes, as_duas_reguas_dizem_o_mesmo: arbitra.as_duas_reguas_dizem_o_mesmo, selects_supervision: arbitra.supervision_requests.map((s) => s.select.slice(-40)),
    regua_das_posicoes: arbitra.regua_das_posicoes, regua_dos_pares: arbitra.regua_dos_pares,
    regua_cega_vs_fronteira: { includes_supervision: arbitra.regua_cega_includes_supervision, com_fronteira_supervision: arbitra.regua_com_fronteira_supervision },
    occurs: arbitra.posicoes_schools_name, contexto: arbitra.contexto_de_cada.map((c) => `${c.offset} dentro_de ${JSON.stringify(c.dentro_do_select_de)}`),
    fks_de_classes_para_schools: onde.fks_das_origens_para_schools, tabela_schools_existe: onde.tabela_schools_existe },
  caminhos_fk_hoje: rotas.pen28_detalle_dos_nove_estados.caminhos_fk };
if (!pen28.regua_soma_bate_com_substring) throw new Error(`ABORTA: a regua de fronteira (2+2=${soma_fronteiras}) nao bate com a contagem por substring (${regua.schools_name_por_substring}) — o PEN-31 nao pode ser afirmado`);
if (pen28.resumo.emitidas_no_ar_hoje + pen28.resumo.nao_emitidas_mas_ainda_falsas_no_catalogo !== 9) throw new Error('ABORTA: as formas emitidas + nao emitidas nao somam 9');

// ── PEN-29 / PEN-30 ─────────────────────────────────────────────────────────────────────────────
const pen29 = { termos_no_bundle: nomes.termos, contexto_no_bundle: Object.fromEntries(Object.entries(nomes.contexto_no_bundle_v134)
    .map(([k, v]) => [k, { ocorrencias: v.ocorrencias, primeiro_offset: (v.trechos[0] || {}).offset_bytes ?? null }])),
  tabelas_parecidas_por_semelhanca: nomes.pareadas_por_semelhanca,
  nomes_exatos_no_catalogo: nomes.nomes_exatos, leitura_dos_nomes: nomes.leitura,
  rotas: rotas.pen29_rotas_pedidas_pelo_bundle, contraprova: rotas.contraprova_rotas_vivas, leitura: rotas.leitura };
// o 404 so vale contra uma contraprove que NAO da 404: sem `profiles` 200 e `schools` 401, um 404
// em tudo seria a sonda partida (URL, chave, esquema) e nao a tabela ausente.
const tres404 = ['bfr_school_shift_settings', 'bfr_school_calendar_days', 'bfr_school_calendar_month_targets']
  .every((t) => rotas.pen29_rotas_pedidas_pelo_bundle[t].status === 404 && rotas.pen29_rotas_pedidas_pelo_bundle[t].codigo === 'PGRST205');
if (!tres404) throw new Error('ABORTA: nem todas as tres rotas do PEN-29 dao 404/PGRST205 — a cifra nao pode ser escrita como ausencia de tabela');
if (rotas.contraprova_rotas_vivas.profiles.status === 404) throw new Error('ABORTA: o controle `profiles` tambem devolve 404 — a sonda esta partida, nenhum 404 prova ausencia');
const pen30 = { sitios: c9.cifras.pen30.sitios_from_announcements, pedem_created_at: c9.cifras.pen30.pedem_created_at,
  detalhe_hoje: rotas.pen28_detalle_dos_nove_estados ? JSON.stringify(rotas.pen28_detalle_dos_nove_estados).includes('42703') : null };

// ── PEN-13 / 18 / 19 / 22 / 23 / 37: herdadas da peca 9 (ja medidas nos seus artefactos) ────────
const herdadas = { pen13: c9.cifras.pen13, pen18: c9.cifras.pen18, pen19: c9.cifras.pen19,
  pen22: c9.cifras.pen22, pen23: c9.cifras.pen23, pen25: c9.cifras.pen25, pen27: c9.cifras.pen27,
  pen34: c9.cifras.pen34, pen37_rpc_anon: c9.cifras.pen37_rpc_anon, sw_inlinado_no_worker: c9.cifras.sw };

const out = {
  em: new Date().toISOString(),
  metodo: 'leitura dos 12 artefactos desta tranche + md5 do disco; zero rede; zero escrita; nenhum segredo',
  esta_peca_succede_a: 'evidence/sm22-conferencia-cifras-18-11.json (pecas 1-9)',
  identidade, sw_servido: sw, polaridade_dos_marcadores: polaridade, reguas_que_discriminam,
  pen32: p32, pen33: p33, pen28, pen29, pen30, herdadas_da_peca9: herdadas,
  promessas_que_falham: { disco_diferente_do_ar: !identidade.disco_igual_ao_ar,
    chaves_diferem_de_valores: !p33.batem, regua_pen31_nao_bate: !pen28.regua_soma_bate_com_substring,
    sw_dos_dois_caminhos_diferentes: !sw.md5_igual_entre_os_dois_caminhos },
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const cap = (s, n = 1200) => (s.length > n ? s.slice(0, n) + '…(corte, ver artefacto)' : s);
console.log(`identidade: ${cap(JSON.stringify(identidade))}`);
for (const [c, v] of Object.entries(cadaSW)) console.log(`  sw ${c}: status=${v.status} ${v.bytes}B md5=${v.md5} ouvintes=${JSON.stringify(v.ouvintes)}`);
console.log(`  sw confrontacao: ${cap(JSON.stringify(sw.confrontacao))} | veredito=${JSON.stringify(sw.veredito)} | controlo_negativo=${JSON.stringify(sw.controlo_negativo)}`);
console.log(`  md5 sw: peca1=${sw.md5_no_artefacto_da_peca1} certidao=${sw.md5_no_certidao_v134}`);
for (const m of polaridade.marcadores) console.log(`  marcador ${m.nome} [${m.polaridade}] ar=${m.no_ar} v133=${m.na_base_v133} v119=${m.na_base_v119} discrimina=${m.discrimina} fogo=${m.poder_de_fogo} veredito=${m.veredito}`);
console.log(`reguas que discriminam: ${cap(JSON.stringify(reguas_que_discriminam), 700)}`);
console.log(`pen32 portao: ${p32.portao_por_geracao.map((e) => `${e.geracao}=${e.portao_de_edsup}`).join(' ')} | discrimina=${p32.regua_discrimina} | primeira_com_portao=${p32.primeira_geracao_com_o_portao}`);
console.log(`pen32 escala: ${cap(JSON.stringify(p32.escala))}`);
console.log(`pen32 fora_de_setRole: ${cap(JSON.stringify(p32.fora_de_setRole), 700)}`);
console.log(`pen33: ${p33.corpo_bytes}B chaves=${p33.n_por_chaves} valores=${p33.n_por_valores} batem=${p33.batem} par_edSup_em=${p33.primeira_geracao_com_par} rotulo="${p33.rotulo_education_supervisor}"`);
console.log(`pen33 chaves: [${p33.chaves.join(',')}]`);
console.log(`pen33 fixture: ${cap(JSON.stringify(p33.fixture_do_contador), 500)}`);
console.log(`pen28 resumo: ${cap(JSON.stringify(pen28.resumo), 400)} | por_status=${JSON.stringify(pen28.por_status)}`);
for (const f of pen28.formas) console.log(`  forma ${f}`);
console.log(`pen28 nao_emitida=[${pen28.nao_emitida.join(',')}] regua=${JSON.stringify(pen28.pen31_no_ar)} soma_bate=${pen28.regua_soma_bate_com_substring}`);
console.log(`pen28 arbitragem: ${cap(JSON.stringify(pen28.arbitragem), 900)}`);
console.log(`pen29 nomes_exatos: ${cap(JSON.stringify(pen29.nomes_exatos_no_catalogo), 500)}`);
console.log(`pen29 rotas: ${cap(JSON.stringify(pen29.rotas), 700)}`);
console.log(`pen29 contraprova: ${cap(JSON.stringify(pen29.contraprova), 700)}`);
console.log(`pen30: ${cap(JSON.stringify(pen30), 400)}`);
console.log(`herdadas: ${cap(JSON.stringify(herdadas), 3000)}`);
console.log(`promessas_que_falham: ${JSON.stringify(out.promessas_que_falham)}`);
console.log(`\nSM22_CONFERENCIA2_OK · registo evidence/sm22-conferencia-cifras-18-11d.json`);
