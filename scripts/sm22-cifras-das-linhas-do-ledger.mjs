#!/usr/bin/env node
// SM-22 (peca 21, SOMENTE LEITURA, ZERO REDE): imprime, linha a linha do ledger PEN, a cifra que each
// row will cite together with the artefact FILE it comes from. O proposito e escrever no roadmap e na
// auditoria apenas numeros que estejam nesta conversa, com a origem nomeada — e com portoes aritmeticos
// que so passam se as contas baterem: 65-57 = 8 nomes novos; com_invoker + sem_invoker = total de views;
// emitidas + nao_emitidas = 9; soma dos tres grupos de status = 9; e a identidade do shell, que tem de
// ser a MESMA md5 em quatro artefactos diferentes. Um portao vermelho aqui nao e um defeito de produto:
// e esta peca a contar mal, e por isso nada vai para o ledger.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-cifras-das-linhas-do-ledger-18-11b.json');
const OUTV = OUT.replace(/.json$/, '-VERMELHO.json');
if (existsSync(OUTV)) throw new Error(`ABORTA: ${OUTV} existe — a corrida vermelha anterior nao se sobrescreve; correr com outro nome`);
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const md5 = (b) => createHash('md5').update(b).digest('hex');
const L = (p) => { const f = join(REPO, p); if (!existsSync(f)) throw new Error(`ABORTA: artefacto ausente ${p}`);
  return { j: JSON.parse(readFileSync(f, 'utf8')), md5: md5(readFileSync(f)), bytes: readFileSync(f).length }; };

const F = {
  higiene18: L('evidence/sm22-higiene-catalogo-18-11.json'),
  higiene12: L('evidence/fin2-higiene-rm62.json'),
  viewMun: L('evidence/sm22-varre-view-municipal-18-11.json'),
  swServido: L('evidence/sm22-varre-sw-servido-18-11.json'),
  vivo: L('evidence/sm22-varre-vivo-pen-18-11b.json'),
  estrutura: L('evidence/sm22-varre-estrutura-18-11b.json'),
  polaridade: L('evidence/sm22-varre-polaridade-18-11f.json'),
  conf1: L('evidence/sm22-conferencia-cifras-18-11.json'),
  confFinal: L('evidence/sm22-conferencia-cifras-18-11d.json'),
  emitidas: L('evidence/sm22-formas-emitidas-no-ar-18-11d.json'),
  nomes29: L('evidence/sm22-nomes-tabelas-pen29-18-11.json'),
  rotas: L('evidence/sm22-rotas-pen29-e-pen28-18-11.json'),
  arbitra: L('evidence/sm22-arbitra-schools-name-18-11b.json'),
  delta: L('evidence/sm22-delta-setrole-e-formato-labels-18-11b.json'),
  escada: L('evidence/sm22-escada-proveniencia-32-33-18-11.json'),
  motivo: L('evidence/sm22-motivo-do-grant-anon-18-11b.json'),
  rpc: L('evidence/sm22-varre-rpc-anon-18-11.json'),
};

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${detalhe}`); return { nome, verde: !!cond, detalhe }; };

// identidade do shell: a mesma md5 tem de estar em quatro artefactos de origens diferentes
const md5s = { peca1_vivo: F.vivo.j.identidade.shell_md5, peca10_polaridade: F.polaridade.j.identidade.ar_md5,
  peca2_estrutura: F.estrutura.j.identidade.candidato_md5, peca19_conferencia: F.confFinal.j.identidade.shell_no_ar_md5,
  peca20_topo_da_escada: F.confFinal.j.identidade.topo_da_escada_md5 };
const identidadeShell = [...new Set(Object.values(md5s).filter(Boolean))];

const p22h = F.higiene18.j.pen22, p22v = F.higiene12.j.pen22;
const novas = F.viewMun.j.pen22.novas_com_anon_execute;
const p23h = F.higiene18.j.pen23, p23v = F.higiene12.j.pen23;
const sw1 = F.swServido.j;
const porGer = F.conf1.j.cifras.pen27.forma_do_fetch_por_geracao;
const gerComString = Object.entries(porGer).filter(([, v]) => v.passado_string > 0).map(([k]) => k);
const res = F.emitidas.j.resumo;
const porStatus = F.rotas.j.pen28_detalle_dos_nove_estados.por_status;
const somaStatus = Object.values(porStatus).reduce((s, n) => s + n, 0);
const mar = Object.fromEntries(F.polaridade.j.marcadores.map((m) => [m.nome, m]));

const gates = [
  g('identidade_do_shell_unica', identidadeShell.length === 1, `md5 diferentes: ${JSON.stringify(md5s)}`),
  g('pen22_diff_bate_com_a_lista_de_novas', p22h.com_execute_anon - p22v.com_execute_anon === novas.length,
    `${p22h.com_execute_anon} - ${p22v.com_execute_anon} != ${novas.length} nomes`),
  g('pen23_views_somam', p23h.com_security_invoker.length + p23h.sem_security_invoker.length === p23h.total_views,
    `${p23h.com_security_invoker.length}+${p23h.sem_security_invoker.length} != ${p23h.total_views}`),
  g('pen23_censo_igual_entre_as_tres_pecas', F.viewMun.j.pen23.total_views === F.motivo.j.views.total_nas_definicoes && F.higiene18.j.pen23.total_views === F.viewMun.j.pen23.total_views,
    `17(higiene)=${F.higiene18.j.pen23.total_views} 06(view)=${F.viewMun.j.pen23.total_views} 20(motivo)=${F.motivo.j.views.total_nas_definicoes}`),
  g('pen26_sw_tem_os_dois_ouvintes_e_o_negativo_empurra', sw1.veredito_sw.startsWith('PELO MENOS') && sw1.controlo_negativo.empurra_dois_para_false === true,
    JSON.stringify(sw1.controlo_negativo)),
  g('pen26_md5_igual_entre_os_dois_caminhos', sw1.confrontacao.length > 0 && F.confFinal.j.sw_servido.md5_igual_entre_os_dois_caminhos === true, 'md5 dos caminhos differentes'),
  g('pen28_nove_formas_somam_os_status', somaStatus === F.rotas.j.pen28_detalle_dos_nove_estados.formas.length, `${somaStatus} != ${F.rotas.j.pen28_detalle_dos_nove_estados.formas.length}`),
  g('pen28_emitidas_mais_nao_emitidas_dao_nove', res.emitidas_no_ar_hoje + res.nao_emitidas_mas_ainda_falsas_no_catalogo === 9, JSON.stringify(res)),
  g('pen29_nomes_exatos_zero', [F.nomes29.j.nomes_exatos.shift_settings, F.nomes29.j.nomes_exatos.calendar_days, F.nomes29.j.nomes_exatos.month_targets].every((x) => x.com_esse_nome_exato === 0), JSON.stringify(F.nomes29.j.nomes_exatos)),
  g('pen29_rotas_404_e_controles_nao', Object.values(F.rotas.j.pen29_rotas_pedidas_pelo_bundle).every((r) => r.status === 404 && r.codigo === 'PGRST205') && F.rotas.j.contraprova_rotas_vivas.profiles.status !== 404, JSON.stringify(F.rotas.j.contraprova_rotas_vivas)),
  g('pen30_um_sitio_de_quatorze', F.conf1.j.cifras.pen30.sitios_from_announcements === 14 && F.conf1.j.cifras.pen30.pedem_created_at === 1, JSON.stringify(F.conf1.j.cifras.pen30)),
  g('pen31_reguas_convergem_e_nao_nomeiam_supervision', F.arbitra.j.as_duas_reguas_dizem_o_mesmo === true && F.arbitra.j.regua_com_fronteira_supervision === 0 && F.arbitra.j.regua_cega_includes_supervision === 2, JSON.stringify(F.arbitra.j).slice(0, 300)),
  g('pen32_a_regua_do_portao_discrimina', F.delta.j.pen32_a_regua_discrimina === true, 'escada do portao nao discrimina'),
  g('pen33_chaves_igual_valores', F.delta.j.pen33_accountLabels.batem === true && F.delta.j.pen33_accountLabels.n_por_chaves === 13, JSON.stringify(F.delta.j.pen33_accountLabels).slice(0, 200)),
  g('pen33_fixture_da_peca13_explicado', F.delta.j.fixtures.n_peca13 === 12 && F.delta.j.fixtures.n_regra_certa === 13 && F.delta.j.fixtures.chaves_que_a_peca13_perdia.join() === 'aee', JSON.stringify(F.delta.j.fixtures)),
  g('pen37_duas_reguas_de_policies_batem', F.motivo.j.duas_reguas_batem === true, 'via SQL e via JS dao contagens diferentes'),
  g('pen37_fixture_nao_cego', F.motivo.j.regua_discrimina_fixture.discriminate === true, JSON.stringify(F.motivo.j.regua_discrimina_fixture.medidos)),
  g('pen37_um_marcador_discrimina_na_polaridade', Object.values(mar).filter((m) => m.discrimina).length >= 1, 'nenhum marcador discrimina entre v119 e o ar'),
];

const linhas = {
  PEN_22: { hoje_18_11: p22h, em_12_11: { total_funcoes: p22v.total_funcoes, com_execute_anon: p22v.com_execute_anon, com_execute_public: p22v.com_execute_public },
    novas_com_anon_execute: novas, origem: ['evidence/sm22-higiene-catalogo-18-11.json', 'evidence/fin2-higiene-rm62.json', 'evidence/sm22-varre-view-municipal-18-11.json'] },
  PEN_23: { hoje: { total_views: p23h.total_views, com_invoker: p23h.com_security_invoker, sem_invoker: p23h.sem_security_invoker, dono: p23h.bypassrls_dono },
    em_12_11: { total_views: p23v.total_views, com_invoker: p23v.com_security_invoker, sem_invoker: p23v.sem_security_invoker },
    vista_municipal: F.viewMun.j.pen23.a_vista_municipal ? { nome: F.viewMun.j.pen23.a_vista_municipal.nome, dono: F.viewMun.j.pen23.a_vista_municipal.dono, opcoes: F.viewMun.j.pen23.a_vista_municipal.opcoes } : null,
    probe_anon_na_vista: F.viewMun.j.probe_anon_na_vista_municipal, origem: ['evidence/sm22-higiene-catalogo-18-11.json', 'evidence/fin2-higiene-rm62.json', 'evidence/sm22-varre-view-municipal-18-11.json'] },
  PEN_24_cabecalhos_no_ar_hoje: F.vivo.j.pen24_cabecalhos,
  PEN_26: { brutos_no_shell: sw1.brutos_no_shell, resolvidos: sw1.resolvidos, servidos: sw1.sw_servidos.map((s) => ({ caminho: s.caminho, status: s.status, bytes: s.bytes, md5: s.md5, ouvintes: s.ouvintes })), controlo_negativo: sw1.controlo_negativo, veredito: sw1.veredito_sw, origem: ['evidence/sm22-varre-sw-servido-18-11.json'] },
  PEN_27: { status_fora_do_bundle: F.conf1.j.cifras.pen27.status_fora_do_bundle, geracoes_em_disco: Object.keys(porGer).length, geracoes_com_a_forma_string: gerComString, por_geracao: porGer, origem: ['evidence/sm22-conferencia-cifras-18-11.json'] },
  PEN_28: { por_status: porStatus, n_formas: F.rotas.j.pen28_detalle_dos_nove_estados.formas.length, formas: F.rotas.j.pen28_detalle_dos_nove_estados.formas, emitidas_no_ar_hoje: res.emitidas_no_ar_hoje, nao_emitidas_mas_ainda_falsas: res.nao_emitidas_mas_ainda_falsas_no_catalogo, re_sonda_coincide_com_12_11: res.re_sonda_de_hoje_coincide_com_a_de_12_11, origem: ['evidence/sm22-rotas-pen29-e-pen28-18-11.json', 'evidence/sm22-formas-emitidas-no-ar-18-11d.json'] },
  PEN_29: { nomes_exatos: F.nomes29.j.nomes_exatos, pareadas_por_semelhanca: F.nomes29.j.pareadas_por_semelhanca, rotas: F.rotas.j.pen29_rotas_pedidas_pelo_bundle, contraprova: F.rotas.j.contraprova_rotas_vivas, ocorrências_no_bundle: Object.fromEntries(Object.entries(F.nomes29.j.contexto_no_bundle_v134).map(([k, v]) => [k, v.ocorrencias])), origem: ['evidence/sm22-nomes-tabelas-pen29-18-11.json', 'evidence/sm22-rotas-pen29-e-pen28-18-11.json'] },
  PEN_30: F.conf1.j.cifras.pen30,
  PEN_31: { regua_das_posicoes: F.arbitra.j.regua_das_posicoes, regua_dos_pares: F.arbitra.j.regua_dos_pares, cega_includes_supervision: F.arbitra.j.regua_cega_includes_supervision, com_fronteira_supervision: F.arbitra.j.regua_com_fronteira_supervision, as_duas_reguas_dizem_o_mesmo: F.arbitra.j.as_duas_reguas_dizem_o_mesmo, fks_e_arbitragem_da_peca19: F.confFinal.j.pen28, regua_do_PEN31_no_ar: F.emitidas.j.regua_do_PEN31_no_ar, origem: ['evidence/sm22-arbitra-schools-name-18-11b.json', 'evidence/sm22-formas-emitidas-no-ar-18-11d.json'] },
  PEN_32: { portao_por_geracao: F.delta.j.pen32_portao_por_geracao, regua_discrimina: F.delta.j.pen32_a_regua_discrimina, escala: F.delta.j.pen32_escala_da_correcao, o_que_mexeu_fora_de_setRole: F.delta.j.pen32_o_que_a_v120_mexeu_fora_de_setRole, corpo_bytes_hoje: F.estrutura.j.pen32.corpo_bytes, primeira_geracao_com_chave: F.escada.j.leitura.primeira_com_setRole_chave, origem: ['evidence/sm22-delta-setrole-e-formato-labels-18-11b.json', 'evidence/sm22-varre-estrutura-18-11b.json', 'evidence/sm22-escada-proveniencia-32-33-18-11.json'] },
  PEN_33: { chaves: F.delta.j.pen33_accountLabels.chaves, n_chaves: F.delta.j.pen33_accountLabels.n_por_chaves, n_valores: F.delta.j.pen33_accountLabels.n_por_valores, rotulo: F.delta.j.pen33_accountLabels.rotulo_education_supervisor, fixtures: F.delta.j.fixtures, primeira_geracao_com_par: F.escada.j.leitura.primeira_com_accountLabels_par, ocorrencias_de_Responsavel: F.estrutura.j.pen33.ocorrencias_de_Responsavel, origem: ['evidence/sm22-delta-setrole-e-formato-labels-18-11b.json', 'evidence/sm22-varre-estrutura-18-11b.json'] },
  PEN_34_no_ar_hoje: F.vivo.j.pen34_rotas_internas,
  PEN_37_nova: { total_policies_public: F.motivo.j.total_policies_public, n_funcoes_com_anon_execute: F.motivo.j.n_com_anon_execute, total_da_lista: Object.keys(F.motivo.j.motivo_por_funcao).length, dentro_das_policies: Object.keys(F.motivo.j.dentro_das_policies), fora_das_policies: Object.keys(F.motivo.j.fora_das_policies), dentro_com_anon: Object.keys(F.motivo.j.motivo_por_funcao).filter((n) => F.motivo.j.motivo_por_funcao[n].anon_execute && F.motivo.j.dentro_das_policies[n]), fora_do_subconjunto_anon: Object.keys(F.motivo.j.motivo_por_funcao).filter((n) => F.motivo.j.motivo_por_funcao[n].anon_execute && F.motivo.j.fora_das_policies[n]), sem_anon_mas_em_policy: Object.keys(F.motivo.j.motivo_por_funcao).filter((n) => !F.motivo.j.motivo_por_funcao[n].anon_execute), revoke_seguro: F.motivo.j.revoke_seguro_para_anon, motivo_por_funcao: F.motivo.j.motivo_por_funcao, fixture: F.motivo.j.regua_discrimina_fixture, duas_reguas_batem: F.motivo.j.duas_reguas_batem, bundle: F.motivo.j.bundle, probe_anon_de_hoje_da_funcao: F.rpc.j.pen22_rpc_anon.chamadas.filter((c) => c.nome === 'bfr_municipal_network_totals'), origem: ['evidence/sm22-motivo-do-grant-anon-18-11b.json', 'evidence/sm22-varre-rpc-anon-18-11.json'] },
  marcadores_de_polaridade: mar,
};

// O portao que faltava: um caminho errado dentro de `linhas` nao rebenta — escreve `undefined` no
// artefacto, e a linha do ledger sairia com uma cifra vazia. A primeira versao desta peca teve exatamente
// isso no PEN-34 (`pen34_rotas_internos` em vez de `pen34_rotas_internas`), visivel so no stdout.
// `g()` e chamado depois de `linhas`, por isso o resultado desta varredura vai em `gatesNull`.
const nulos = [];
const walk = (o, path) => { if (o === undefined) nulos.push(path); else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => walk(v, `${path}.${k}`)); };
walk(linhas, 'linhas'); walk(md5s, 'md5s');
const gatesNull = [g('nenhum_campo_undefined', nulos.length === 0, `cifras vazias em: ${nulos.join(', ')}`),
  g('pen27_censo_de_geracoes_em_disco', linhas.PEN_27.geracoes_em_disco === 11, `${linhas.PEN_27.geracoes_em_disco}`),
  g('pen37_lista_de_nove_e_oito_tem_anon', linhas.PEN_37_nova.total_da_lista === 9 && linhas.PEN_37_nova.n_funcoes_com_anon_execute === 8, JSON.stringify({ total: linhas.PEN_37_nova.total_da_lista, anon: linhas.PEN_37_nova.n_funcoes_com_anon_execute })),
  g('pen37_dentro_mais_fora_igual_a_lista_inteira', linhas.PEN_37_nova.dentro_das_policies.length + linhas.PEN_37_nova.fora_das_policies.length === linhas.PEN_37_nova.total_da_lista, `${linhas.PEN_37_nova.dentro_das_policies.length}+${linhas.PEN_37_nova.fora_das_policies.length} != ${linhas.PEN_37_nova.total_da_lista}`),
  // A identidade que importa para o REVOKE e sobre o SUBCONJUNTO com anon: as 8 executaveis anon dividem-se
  // em citadas / nao citadas em policy. Somar a lista inteira (9, que inclui a predicado sem anon) contra os 8
  // foi o erro que o portao anterior continha — por isso a regua passa agora a contar dentro do subconjunto.
  g('pen37_dentro_mais_fora_do_subconjunto_anon_igual_oito', linhas.PEN_37_nova.dentro_com_anon.length + linhas.PEN_37_nova.fora_do_subconjunto_anon.length === linhas.PEN_37_nova.n_funcoes_com_anon_execute, `${linhas.PEN_37_nova.dentro_com_anon.length}+${linhas.PEN_37_nova.fora_do_subconjunto_anon.length} != ${linhas.PEN_37_nova.n_funcoes_com_anon_execute}`),
  g('pen37_revoke_seguro_igual_o_fora_do_subconjunto', linhas.PEN_37_nova.revoke_seguro.slice().sort().join() === linhas.PEN_37_nova.fora_do_subconjunto_anon.slice().sort().join(), `${linhas.PEN_37_nova.revoke_seguro} vs ${linhas.PEN_37_nova.fora_do_subconjunto_anon}`)];

const out = { em: new Date().toISOString(),
  metodo: 'leitura dos artefactos desta tranche; zero rede; zero escrita; nenhum segredo. Cada cifra traz o ficheiro de origem',
  identidade_do_shell: { por_peca: md5s, unicas: identidadeShell,
    bytes_no_ar: F.vivo.j.identidade.shell_bytes, candidata_em_disco: F.confFinal.j.identidade.candidata_v134_em_disco },
  artefactos_lidos: Object.fromEntries(Object.entries(F).map(([k, v]) => [k, { bytes: v.bytes, md5: v.md5 }])),
  portoes: gates.concat(gatesNull), veredito: falhas.length === 0 ? 'TODOS OS PORTOES VERDES' : `VERMELHO: ${falhas.length}`, falhas, linhas };

if (falhas.length) { writeFileSync(OUT.replace(/\.json$/, '-VERMELHO.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('PORTOES VERMELHOS — nada deve ser escrito no ledger:'); for (const f of falhas) console.log('  ' + f);
  console.log(`\nSM22_LINHAS_VERMELHO · registo ${OUT.replace(/\.json$/, '-VERMELHO.json')}`); process.exit(1); }

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`identidade do shell: ${identidadeShell[0]} ${F.vivo.j.identidade.shell_bytes} B · ${new Set(Object.values(md5s)).size} valor(es) em ${Object.keys(md5s).length} artefactos`);
for (const [k, v] of Object.entries(F)) console.log(`  ${k}: ${v.bytes} B md5 ${v.md5}`);
for (const t of gates.concat(gatesNull)) console.log(`  portao ${t.nome}: ${t.verde ? 'VERDE' : 'VERMELHO'}`);
for (const [nome, v] of Object.entries(linhas)) console.log(`\n${nome}: ${JSON.stringify(v)}`.slice(0, 3000));
console.log(`\nSM22_LINHAS_OK · registo ${OUT}`);
