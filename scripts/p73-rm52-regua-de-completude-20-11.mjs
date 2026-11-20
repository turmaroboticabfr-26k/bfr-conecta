#!/usr/bin/env node
// P73-RM5.2-R — régua de completude e de região do calendário (20/11), só leitura.
// Porque existe: `p73-rm52-estado-calendario.mjs` deu VERDE com 20 portões, mas deixou duas coisas de fora
// que a proposta de conteúdo precisa de citar com instrumento versionado e não como sonda de momento:
// (a) a forma exata do predicado de prontidão do painel (uma contagem fixa de linhas, não uma cobertura de
// datas) e a sua consequência aritmética em ano bissexto; (b) qual das DUAS portarias servidas é a alcançável
// no ar, hoje. O item (b) foi formulado no artefacto verde como «pergunta de browser por medir»; aqui ele é
// medido ao nível dos bytes: o módulo diferido esconde o formulário da base por classe e CSS, e o seu próprio
// formulário submete para o RPC que o catálogo diz não existir. Continua a faltar só a confirmação do clique
// no DOM vivo, e o critério de fecho vai escrito no artefacto.
// Zero DDL, zero escrita de produto, zero publicação, zero push. Nenhuma credencial é lida nem impressa.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BUNDLE = join(REPO, 'bfr-candidata-v136-secretaria-de-educacao/index.html');
const ART_REF = join(REPO, 'evidence/p73-rm52-estado-calendario-20-11.json');
const SUF = process.env.P73_SUF ? '-' + process.env.P73_SUF : '';
const OUT = join(REPO, `evidence/p73-rm52-regua-completude-20-11${SUF}.json`);
const TXT = OUT.replace(/\.json$/, '.txt');
if (!existsSync(BUNDLE)) throw new Error('ABORTA: falta o bundle versionado ' + BUNDLE);
if (!existsSync(ART_REF)) throw new Error('ABORTA: falta o artefacto de referência ' + ART_REF);
if (existsSync(OUT) || existsSync(TXT)) throw new Error('ABORTA: registo já existe em ' + OUT + ' — correr com P73_SUF=novo, não por cima');
const t0 = Date.now();
const md5 = (s) => createHash('md5').update(Buffer.from(String(s))).digest('hex');
const ANO = 2026;

const bundle = readFileSync(BUNDLE, 'utf8');
const bundleMd5 = md5(bundle);
const bundleBytes = Buffer.byteLength(bundle);
const ref = JSON.parse(readFileSync(ART_REF, 'utf8'));

const contas = (texto, agulha) => { let i = -1, c = 0; while ((i = texto.indexOf(agulha, i + 1)) >= 0) c++; return c; };
const posicoes = (texto, agulha) => { const r = []; let i = -1; while ((i = texto.indexOf(agulha, i + 1)) >= 0) r.push(i); return r; };
const janelas = (texto, agulha, antes, depois) => posicoes(texto, agulha).map((p) => texto.slice(Math.max(0, p - antes), p + depois));

// Regiões: cada <script> e o seu intervalo, para atribuir definições a blocos em vez de as contar à sorte.
const tags = [];
for (const m of bundle.matchAll(/<script\b[^>]*>/g)) tags.push({ off: m.index, tag: m[0] });
const regiaoDe = (pos) => { let k = null; for (const x of tags) { if (x.off <= pos) k = x; else break; } if (!k) return null; const fecho = bundle.indexOf('</script>', k.off); return { off: k.off, tag: k.tag, ate: fecho < 0 ? bundle.length : fecho }; };

// 1. Prontidão do painel: uma contagem fixa, não uma cobertura.
const janelaRegra = janelas(bundle, 'calendarDays.length', 120, 200)[0] || '';
const ocorrenciasLength = contas(bundle, 'calendarDays.length');
const exige365 = janelaRegra.includes('calendarDays.length===365');
const exigeTodosConfirmados = janelaRegra.includes(".every(item=>item.source_status==='confirmed')");
const existeContagemAlternativa = contas(bundle, 'calendarDays.length===366') + contas(bundle, 'calendarDays.length>=365');
const rotuloPronto = posicoes(bundle, 'calendarReady').length;

// 2. Aritmética do conteúdo, por duas Engines que têm de bater-se entre si e com o artefacto verde.
const datasDoAno = (ano) => (Date.UTC(ano + 1, 0, 1) - Date.UTC(ano, 0, 1)) / 86400000;
const diasFevereiro = (ano) => new Date(Date.UTC(ano, 2, 0)).getUTCDate();
const diasDeMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const porMes = (ano, lo, hi) => { const r = []; for (let m = 1; m <= 12; m++) { let n = 0; for (let d = 1; d <= diasDeMes(ano, m); d++) { const w = new Date(Date.UTC(ano, m - 1, d)).getUTCDay(); if (w >= lo && w <= hi) n++; } r.push(n); } return r; };
const porAno = (ano, lo, hi) => { let n = 0; const d = new Date(Date.UTC(ano, 0, 1)); while (d.getUTCFullYear() === ano) { const w = d.getUTCDay(); if (w >= lo && w <= hi) n++; d.setUTCDate(d.getUTCDate() + 1); } return n; };
const soma = (a) => a.reduce((x, y) => x + y, 0);
const seg_sex_mes = porMes(ANO, 1, 5), seg_sex_ano = porAno(ANO, 1, 5);
const seg_sab_mes = porMes(ANO, 1, 6), seg_sab_ano = porAno(ANO, 1, 6);
const acima31 = seg_sab_mes.map((v, i) => (v > 31 ? i + 1 : null)).filter((x) => x !== null);
const artefactoMetas = (ref.metas_por_mes_computadas_para_o_ano || {}).valores || [];
const metasDoArtefacto = artefactoMetas.map((m) => m.dias_de_semana);
const bissextos = [2026, 2027, 2028, 2032].map((a) => ({ ano: a, datas: datasDoAno(a), fevereiro: diasFevereiro(a) }));

// 3. Região de cada definição de registerGateCheckin e dos seus formulários.
// As duas definições são procuradas por regex, porque uma delas tem `async` à frente e contar a agulha
// simples daria três posições para duas funções.
const unicasDef = [...new Set([...bundle.matchAll(/(?:async\s+)?function registerGateCheckin\(/g)].map((m) => m.index))];
const regDefs = unicasDef.map((p) => ({ pos: p, regiao: regiaoDe(p) }));
const REG_MARK = 'data-bfr-auth-deferred';
const diferido = regDefs.filter((x) => x.regiao && x.regiao.tag.includes('text/plain') && x.regiao.tag.includes(REG_MARK));
const imediata = regDefs.filter((x) => x.regiao && !x.regiao.tag.includes('text/plain'));
const regiaoDiferida = diferido.length ? { de: diferido[0].regiao.off, ate: diferido[0].regiao.ate } : null;
const regiaoBase = imediata.length ? { de: imediata[0].regiao.off, ate: imediata[0].regiao.ate } : null;
const dentro = (r, agulha) => (r ? posicoes(bundle.slice(r.de, r.ate), agulha).length : -1);

// 4. O mecanismo que decide qual formulário é alcançável.
// `function hideLegacy` existe CINCO vezes no bundle — uma por módulo (coordinator duas, secretary, monitor,
// gatekeeper). A minha primeira versão apanhou a primeira ocorrência, que é a do coordenador, e o portão
// ficou vermelho com agulha certa e região errada. A régua é por família: recolhe as cinco, escolhe a da
// portaria pela expressão do seletor e prova que essa vive dentro da região diferida.
const AGULHA_ESCONDE_GATE = ':scope > .gate-welcome,:scope > .gate-layout';
const definicoesHideLegacy = posicoes(bundle, 'function hideLegacy').map((p) => {
  const texto = bundle.slice(p, p + 300);
  const adiciona = (texto.match(/classList\.add\('([^']+)'\)/) || [])[1] || null;
  return { pos: p, off_regiao: regiaoDe(p).off, tag_regiao: regiaoDe(p).tag, adiciona_classe: adiciona, texto };
});
const hideLegadoPortaria = definicoesHideLegacy.filter((x) => x.texto.includes(AGULHA_ESCONDE_GATE));
const hideLegacyTxt = hideLegadoPortaria.length === 1 ? hideLegadoPortaria[0].texto : '';
const hideLegacyNaRegiaoDiferida = hideLegadoPortaria.length === 1 && !!regiaoDiferida && hideLegadoPortaria[0].pos >= regiaoDiferida.de && hideLegadoPortaria[0].pos <= regiaoDiferida.ate;
const cssLegacy = janelas(bundle, '#gatekeeperView .bfr-gate-legacy', 0, 120)[0] || '';
const formBase = 'data-gate-manual-form';
const formDiferido = 'data-gate-central-manual';
const loaderTxt = janelas(bundle, 'activateApplicationModules', 40, 700)[0] || '';
const seletorLoader = 'script[type="text/plain"][data-bfr-auth-deferred],script[type="text/plain"][data-bfr-deferred]';
const gatilhoLoader = 'if (data?.session || hasOAuthCallback) await loadApplication()';
const guardaManual = janelas(bundle, "intakeSource!=='manual'", 260, 120)[0] || '';
// As duas agulhas de RPC são as grafias EXATAS dos bytes servidos: entre `gateLegacyMode()` e o `?` há
// quebra de linha no bundle, por isso uma agulha colada devolveria zero e o portão seria vermelho da sonda.
const AGULHA_V1 = "? client.rpc('register_gate_checkin',{target_badge_token:params.target_badge_token";
const AGULHA_V2 = ": client.rpc('register_gate_checkin_v2',params)";

// 5. Catálogo: o RPC que o módulo diferido escolhe fora do legado, e a vacuidade das mesas (re-medis aqui).
const catalogo = await sql(`select 'register_gate_checkin_v2' as nome, count(*)::int as no_catalogo from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='register_gate_checkin_v2'
  union all select 'register_gate_checkin', count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='register_gate_checkin'
  union all select 'bfr_confirm_school_calendar', count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bfr_confirm_school_calendar'`);
const noCatalogo = Object.fromEntries(catalogo.map((r) => [r.nome, r.no_catalogo]));
const linhas = await sql(`select 'bfr_school_calendar_days' as tabela, count(*)::int as linhas from public.bfr_school_calendar_days union all select 'bfr_school_shift_settings', count(*) from public.bfr_school_shift_settings union all select 'bfr_school_calendar_month_targets', count(*) from public.bfr_school_calendar_month_targets`);
// As políticas das três mesas, com o comando CRU. O Postgres deste projeto (versão 170006, medida) renderiza
// `FOR ALL` como o caractere `*` em `polcmd`, não como `a`; a minha primeira versão filtrou por ('a','w','i')
// e devolveu lista vazia, o que teria vendido «ninguém pode escrever» como facto do produto.
const politicasCalendario = await sql(`select p.polname as nome, t.relname as tabela, p.polcmd::text as comando_cru, array_agg(distinct r.rolname::text) as papeis_da_policy, pg_get_expr(p.polqual, p.polrelid) as using_txt, pg_get_expr(p.polwithcheck, p.polrelid) as check_txt from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace and n.nspname='public' left join pg_roles r on r.oid=any(p.polroles) where t.relname in ('bfr_school_calendar_days','bfr_school_shift_settings','bfr_school_calendar_month_targets') group by p.polname, t.relname, p.polcmd, p.polqual, p.polwithcheck, p.polrelid order by p.polname`);
const COMANDOS_COM_ESCRITA = ['*', 'a', 'w', 'd'];
const escrita = politicasCalendario.filter((p) => COMANDOS_COM_ESCRITA.includes(p.comando_cru));
const leitura = politicasCalendario.filter((p) => p.comando_cru === 'r');
// Quem pode escrever não se lê do `papeis_da_policy` (que é só `authenticated`): lê-se do ARRAY de cargos
// dentro da expressão. O mesmo vale para a leitura, cuja expressão é de EXCLUSÃO (`<> 'parent'`).
const cargosEm = (txt) => [...new Set([...String(txt || '').matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]))].sort();
const papeisQueEscrevem = [...new Set(escrita.flatMap((p) => cargosEm(p.using_txt).concat(cargosEm(p.check_txt))))].sort();
const cargosExcluidosDaLeitura = [...new Set(leitura.flatMap((p) => cargosEm(p.using_txt)))].sort();
const wireAusente = Object.fromEntries(Object.entries(ref.rpc_pelo_fio.por_nome || {}).map(([k, v]) => [k, `${v.status}/${v.code}`]));

// 6. Fixture negativo: a régua de região tem de mudar de resposta quando os marcadores trocam de bloco.
const synthetic = bundle.slice(0, 0) + '<script id="bfr-public-schedule-fallback">async function registerGateCheckin(client,params){}' + formDiferido + '</script><script type="text/plain" data-bfr-auth-deferred>' + formBase + '</script>';
const tagsSyn = [];
for (const m of synthetic.matchAll(/<script\b[^>]*>/g)) tagsSyn.push({ off: m.index, tag: m[0] });
const regiaoDeSyn = (pos) => { let k = null; for (const x of tagsSyn) { if (x.off <= pos) k = x; else break; } const fecho = synthetic.indexOf('</script>', k.off); return { de: k.off, tag: k.tag, ate: fecho }; };
const posSyn = posicoes(synthetic, 'function registerGateCheckin');
const regSyn = regiaoDeSyn(posSyn[0]);
const fixturePartidoTomaOPoloErrado = regSyn.tag.includes('text/plain') === false && synthetic.slice(regSyn.de, regSyn.ate).includes(formDiferido);

const falhas = [];
const g = (nome, cond, detalhe) => { if (!cond) falhas.push(`${nome}: ${JSON.stringify(detalhe).slice(0, 320)}`); return { nome, verde: !!cond, detalhe }; };
const portoes = [
  g('o_ficheiro_versionado_e_a_pego_dos_bytes_que_o_artefacto_verde_declarou_servidos', bundleMd5 === ((ref.bundle_servido_versionado || {}).md5 || null) && bundleBytes === ((ref.bundle_servido_versionado || {}).bytes || null), { md5_lido: bundleMd5, md5_do_artefacto: (ref.bundle_servido_versionado || {}).md5, bytes_lidos: bundleBytes, bytes_do_artefacto: (ref.bundle_servido_versionado || {}).bytes }),
  g('a_prontidao_do_painel_e_uma_contagem_fixa_de_365_linhas_e_nao_uma_cobertura_de_datas', ocorrenciasLength === 1 && exige365 && exigeTodosConfirmados && existeContagemAlternativa === 0 && rotuloPronto === 2, { ocorrencias_calendarDays_length: ocorrenciasLength, exige365, exige_todos_confirmados: exigeTodosConfirmados, contagens_alternativas_lidas: existeContagemAlternativa, ocorrencias_calendarReady: rotuloPronto, janela: janelaRegra.slice(0, 200) }),
  g('a_aritmetica_por_mes_bate_com_a_por_ano_e_com_a_terceira_contagem_do_artefacto_verde', soma(seg_sex_mes) === seg_sex_ano && soma(seg_sab_mes) === seg_sab_ano && JSON.stringify(metasDoArtefacto) === JSON.stringify(seg_sex_mes) && datasDoAno(ANO) === 365, { seg_sex_por_mes: seg_sex_mes, soma: soma(seg_sex_mes), por_ano: seg_sex_ano, seg_sab_por_mes: seg_sab_mes, soma_seg_sab: soma(seg_sab_mes), metas_do_artefacto: metasDoArtefacto, datas_2026: datasDoAno(ANO) }),
  g('a_contagem_fixa_de_365_e_intransponivel_num_ano_bissexto_e_2026_nao_e_bissexto', bissextos.every((x) => (x.datas === 365) === (x.fevereiro === 28)) && bissextos.filter((x) => x.datas === 366).length === 2 && datasDoAno(2026) === 365 && datasDoAno(2028) === 366 && datasDoAno(2032) === 366 && diasFevereiro(2028) === 29, { bissextos, regra: 'datas do ano !== 365 nos bissextos, logo 366 datas nunca caberiam na contagem fixa' }),
  g('nenhuma_meta_mensal_ultrapassa_o_CHECK_de_31_dias_mesmo_com_sabado_letivo', acima31.length === 0 && seg_sab_mes.every((v) => v >= 0 && v <= 31), { meses_fora_do_CHECK: acima31, seg_sab_por_mes: seg_sab_mes }),
  g('as_duas_portarias_servidas_estao_em_regioes_de_execucao_diferentes', unicasDef.length === 2 && diferido.length === 1 && imediata.length === 1 && regDefs.every((x) => !!x.regiao), { definicoes: unicasDef, regioes: regDefs.map((x) => ({ pos: x.pos, off_regiao: x.regiao.off, tag: x.regiao.tag.slice(0, 90) })) }),
  g('a_portaria_diferida_esconde_a_da_base_por_classe_e_CSS_e_o_formulario_alcancavel_e_o_dela', definicoesHideLegacy.length === 5 && hideLegadoPortaria.length === 1 && hideLegacyNaRegiaoDiferida && dentro(regiaoBase, AGULHA_ESCONDE_GATE) === 0 && hideLegacyTxt.includes(AGULHA_ESCONDE_GATE) && hideLegacyTxt.includes("'bfr-gate-legacy'") && cssLegacy.includes('{display:none!important}') && dentro(regiaoDiferida, formBase) === 0 && dentro(regiaoDiferida, formDiferido) >= 1 && dentro(regiaoBase, formDiferido) === 0, { definicoes_hide_legacy: definicoesHideLegacy.map((x) => ({ pos: x.pos, tag: x.tag_regiao.slice(0, 60), adiciona: x.adiciona_classe })), escolhida_pelo_seletor_da_portaria: hideLegadoPortaria.map((x) => x.pos), na_regiao_diferida: hideLegacyNaRegiaoDiferida, agulha_fora_da_regiao_da_base: dentro(regiaoBase, AGULHA_ESCONDE_GATE) === 0, css_legacy: cssLegacy.slice(0, 90), form_base_na_regiao_diferida: dentro(regiaoDiferida, formBase), form_diferido_na_regiao_diferida: dentro(regiaoDiferida, formDiferido), form_diferido_na_regiao_da_base: dentro(regiaoBase, formDiferido), total_form_base: contas(bundle, formBase), total_form_diferido: contas(bundle, formDiferido) }),
  g('o_loader_so_executa_os_diferidos_depois_de_haver_sessao_e_essa_e_a_ordem_que_define_a_portaria_viva', loaderTxt.includes(seletorLoader) && loaderTxt.includes('data-bfr-auth-deferred-disabled') && bundle.includes(gatilhoLoader) && contas(bundle, 'executeDeferred') >= 3, { seletor_no_loader: seletorLoader, gatilho: gatilhoLoader, ocorrencias_executeDeferred: contas(bundle, 'executeDeferred') }),
  g('o_caminho_manual_da_guarda_nao_chega_a_rpc_existente_em_nenhum_dos_dois_estados_reais', guardaManual.includes("intakeSource!=='manual'||exceptionReason.length<8") && dentro(regiaoDiferida, AGULHA_V2) >= 1 && dentro(regiaoDiferida, AGULHA_V1) >= 1 && noCatalogo.register_gate_checkin_v2 === 0 && noCatalogo.register_gate_checkin >= 1, { guarda: guardaManual.slice(0, 200), no_catalogo: noCatalogo, v2_na_regiao_diferida: dentro(regiaoDiferida, AGULHA_V2), v1_na_regiao_diferida: dentro(regiaoDiferida, AGULHA_V1) }),
  g('as_tres_mesas_continuam_vazias_e_a_escrita_de_calendario_nao_tem_politica_para_secretary', linhas.every((l) => l.linhas === 0) && linhas.length === 3 && politicasCalendario.length === 6 && escrita.length === 3 && leitura.length === 3 && JSON.stringify(papeisQueEscrevem) === JSON.stringify(['coordinator', 'developer', 'director']) && !papeisQueEscrevem.includes('secretary') && JSON.stringify(cargosExcluidosDaLeitura) === JSON.stringify(['parent', 'student']) && Object.keys(wireAusente).length === 3 && wireAusente.register_gate_checkin_v2 === '404/PGRST202', { linhas, comandos_cruos_medidos: [...new Set(politicasCalendario.map((p) => p.comando_cru))].sort(), politicas: politicasCalendario.map((p) => `${p.nome}|${p.comando_cru}|${(p.papeis_da_policy || []).join('+')}`), cargos_que_escrevem: papeisQueEscrevem, cargos_excluidos_da_leitura: cargosExcluidosDaLeitura, fio_do_artefacto: wireAusente }),
  g('a_regua_de_regiao_dispara_no_fixture_partido_e_nao_e_um_predicado_que_so_ve_o_que_espera', fixturePartidoTomaOPoloErrado === true, { fixture: 'dois blocos sintéticos com os marcadores trocados: a definição fica no bloco imediato mas o marcador do diferido vai com ela', sinteticos: { tag_da_regiao_escolhida: regSyn.tag, tem_form_diferido_na_imediata: synthetic.slice(regSyn.de, regSyn.ate).includes(formDiferido) } }),
];

const out = {
  programa: 'scripts/p73-rm52-regua-de-completude-20-11.mjs',
  em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  metodo: 'Bytes lidos do bundle VERSIONADO (md5 conferido contra o artefacto verde do estado), com contagem de ocorrências por `indexOf`, regiões por `<script>` e suas fronteiras, e catálogo SQL só de leitura. Nenhuma rede autenticada, nenhuma escrita.',
  autorizacao: 'Só leitura: nenhum DDL aplicado, nenhuma linha escrita, nenhuma publicação, nenhum push.',
  bundle: { caminho: BUNDLE.replace(/\\/g, '/'), md5: bundleMd5, bytes: bundleBytes, caracteres: bundle.length },
  referencia: { artefacto: 'evidence/p73-rm52-estado-calendario-20-11.json', veredito: ref.veredito, em: ref.em },
  prontidao_do_painel: { ocorrencias_calendarDays_length: ocorrenciasLength, ocorrencias_calendarReady: rotuloPronto, exige365, exige_todos_confirmados: exigeTodosConfirmados, contagens_alternativas: existeContagemAlternativa, janela_textual: janelaRegra },
  aritmetica: { ano: ANO, datas_2026: datasDoAno(ANO), seg_sex_por_mes: seg_sex_mes, seg_sex_soma: soma(seg_sex_mes), seg_sex_por_ano: seg_sex_ano, seg_sab_por_mes: seg_sab_mes, seg_sab_soma: soma(seg_sab_mes), seg_sab_por_ano: seg_sab_ano, meses_com_meta_acima_de_31: acima31, linhas_de_semente: { dias: datasDoAno(ANO), turnos: 2, metas: 12, total: datasDoAno(ANO) + 14 }, bissextos },
  portarias: { definicoes: regDefs.map((x) => ({ pos: x.pos, regiao_off: x.regiao.off, regiao_tag: x.regiao.tag, regiao_ate: x.regiao.ate })), regiao_diferida: regiaoDiferida, regiao_da_base: regiaoBase, hide_legacy: hideLegacyTxt.slice(0, 340), css_legacy: cssLegacy.slice(0, 120), marcador_formulario_base: formBase, marcador_formulario_diferido: formDiferido, contagens: { form_base_total: contas(bundle, formBase), form_base_na_diferida: dentro(regiaoDiferida, formBase), form_diferido_total: contas(bundle, formDiferido), form_diferido_na_base: dentro(regiaoBase, formDiferido) }, loader: { seletor: seletorLoader, gatilho: gatilhoLoader, script_tags_totais: tags.length, scripts_text_plain: tags.filter((x) => x.tag.includes('text/plain')).length, scripts_com_atributo_diferido: tags.filter((x) => x.tag.includes(REG_MARK)).length, scripts_desativados: tags.filter((x) => x.tag.includes('data-bfr-auth-deferred-disabled')).length } },
  rpc_no_catalogo: noCatalogo,
  rpc_pelo_fio_do_artefacto_verde: wireAusente,
  linhas_das_mesas: linhas,
  politicas_das_tres_mesas: politicasCalendario.map((p) => ({ nome: p.nome, tabela: p.tabela, comando_cru: p.comando_cru, papeis_da_policy: p.papeis_da_policy, cargos_na_expressao: cargosEm(p.using_txt).concat(cargosEm(p.check_txt)) })),
  cargos_que_escrevem_calendario: papeisQueEscrevem,
  cargos_excluidos_da_leitura: cargosExcluidosDaLeitura,
  o_que_este_verde_prova: 'Que a prontidão do painel é uma contagem fixa de 365 linhas com todas confirmadas, que essa contagem é insatisfaível num ano de 366 datas, que existem duas portarias servidas em regiões de execução diferentes, que a região diferida esconde o formulário da base e submete para `register_gate_checkin_v2`, e que esse RPC não existe no catálogo enquanto o v1 existe.',
  o_que_este_verde_nao_autoriza: 'Nada privilegiado: não aplica DDL, não cria RPC, não semeia conteúdo, não publica, não faz push.',
  falta_declarada: 'A prova do clique no DOM vivo — que ouvinte está de facto ligado ao formulário alcançável e que nome de RPC sai no fio quando se submete — é de browser e continua por correr. O critério de fecho é: abrir a portaria com sessão de `gatekeeper`, enumerar os ouvintes do formulário alcançável e registar o nome do rpc pedido, com o registo de `gate_checkins` conferido antes e depois para provar que nada foi escrito.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P73_RM52_REGUA_VERDE ${portoes.length}/0` : `P73_RM52_REGUA_VERMELHO ${falhas.length}`;
if (falhas.length) { const p = OUT.replace(/\.json$/, '-VERMELHO.json'); writeFileSync(p, JSON.stringify(out, null, 2) + '\n'); for (const f of falhas) console.log('  FALTA ' + f); console.log(`P73_RM52_REGUA_VERMELHO · registo ${p}`); process.exit(1); }
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(TXT, `bundle=${bundleMd5} bytes=${bundleBytes} caracteres=${bundle.length}\nregra_painel=${ocorrenciasLength}x calendarDays.length exige365=${exige365} todos_confirmados=${exigeTodosConfirmados}\naritmetica_2026=datas ${datasDoAno(ANO)} seg_sex ${soma(seg_sex_mes)} [${seg_sex_mes}] seg_sab ${soma(seg_sab_mes)} [${seg_sab_mes}]\nbissextos=${JSON.stringify(bissextos)}\nportarias=${regDefs.map((x) => x.pos + '@' + x.regiao.off + (x.regiao.tag.includes('text/plain') ? ' diferida' : ' imediata')).join(' | ')}\nmarcadores=base ${contas(bundle, formBase)}/${dentro(regiaoDiferida, formBase)} diferido ${contas(bundle, formDiferido)}/${dentro(regiaoBase, formDiferido)}\nrpc=${JSON.stringify(noCatalogo)} fio=${JSON.stringify(wireAusente)}\nlinhas=${JSON.stringify(linhas)}\nescrita=${JSON.stringify(escrita.map((p) => `${p.nome}|${p.comando_cru}|${cargosEm(p.using_txt).join('+')}`))} cargos_que_escrevem=${JSON.stringify(papeisQueEscrevem)} excluidos_da_leitura=${JSON.stringify(cargosExcluidosDaLeitura)}\n`);
for (const p of portoes) console.log(`  portao ${p.nome}: ${p.verde ? 'VERDE' : 'VERMELHO'}`);
console.log(`${out.veredito} · ${out.duracao_ms} ms · registo ${OUT}`);
