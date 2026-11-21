#!/usr/bin/env node
// P113 — DIARIO DA PUBLICACAO v142 (21/11, noite).
// Este ficheiro nao publica nada: monta `audit-publicacao-v142.json` so com numeros LIDOS dos artefactos da
// cadeia (p102 candidata, p103 bundle, stdout do wrangler, status/list do Cloudflare, p104 pos-deploy,
// p105/p108/p110/p111/p112 de browser) e do esperado-v142. Aborta se alguma peca nao estiver verde, se o html
// servido agora nao for o certificado, se o vermelho da P105 nao estiver preservado em disco, ou se o artefacto
// ja existir. Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 push, 0 publicacao.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = `${REPO}/audit-publicacao-v142.json`;
const TXT = `${REPO}/audit-publicacao-v142.txt`;
if ([SAIDA, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: o diario v142 ja existe — nunca se sobrescreve');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const rd = (p) => JSON.parse(readFileSync(`${REPO}/${p}`, 'utf8'));

const ESP = rd('worker-deploy-v142-painel-na-troca/esperado-v142.json');
const P102 = rd('evidence/p102-gera-candidata-v142-21-11.json');
const P103 = rd('evidence/p103-gera-bundle-v142-21-11-a.json');
const P104 = rd('evidence/p104-pos-deploy-v142-b.json');
const P105 = rd('evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.json');
const P108 = rd('evidence/p108-actor-do-fecho-na-troca-no-ar-21-11-a.json');
const P110 = rd('evidence/p110-actor-da-escondida-por-pilha-21-11-a.json');
const P111 = rd('evidence/p111-ator-da-escondida-por-simbolo-nos-bytes-21-11-c.json');
const P112 = rd('evidence/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar-21-11-b.json');
const A141 = rd('audit-publicacao-v141.json');
const STDOUT = readFileSync(`${REPO}/evidence/v142-deploy-stdout-21-11.txt`, 'utf8');
const STATUS = rd('evidence/v142-deployments-status-21-11.json');
const LISTA = rd('evidence/v142-deployments-list-21-11.json');
const VER = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
if (!VER) throw new Error('ABORTA: sem version id no stdout do deploy — o diario nao poderia nomear a versao');
const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
if (porData.length < 2) throw new Error('ABORTA: ' + porData.length + ' registos na lista de deployments — sem cadeia de reversao');

const agora = await (await fetch(P104.url + '/', { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const md5Agora = md5(agora);

const git = (cmd) => execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim();
const MAIN = git('git rev-parse main');
const ORIG = git('git rev-parse origin/main');
const AHEAD = git('git rev-list --count origin/main..main');
const REFLOG = git('git reflog show origin/main --date=iso').split(/\r?\n/)[0];

const cel = P112.trocas;
const comFecho = cel.filter((t) => t.classe === 'fecho_novo');
const semFecho = cel.filter((t) => t.classe === 'escondida_sem_fecho');
const p105cel = P105.trocas;
const p105div = p105cel.filter((t) => t.destino_esperado_dos_bytes !== ((t.ultimo_fecho || {}).destino ?? null));
const p111cel = (n) => (P111.celulas.find((c) => c.alvo === n) || {});
const p112classe = (n) => ((cel.find((t) => t.rotulo === n) || {}).classe ?? null);

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 400)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('D1_candidata_verde', P102.veredito === 'P102_CANDIDATA_V142_PAINEL_NA_TROCA_OK 12/0' && P102.portoes.total === 12 && P102.portoes.falhas === 0 && P102.destino.md5 === ESP.htmlMd5, { veredito: P102.veredito, portoes: P102.portoes, destino: P102.destino, html_certificado: ESP.htmlMd5 });
g('D2_bundle_verde_e_o_mesmo_worker_registrado', P103.veredito === 'P103_BUNDLE_V142_OK 34/0' && P103.total.falha === 0 && P103.publicado === false && ESP.workerMd5 === P103.esperado.workerMd5 && ESP.htmlMd5 === P103.esperado.htmlMd5, { p103: P103.veredito, total: P103.total, publicado: P103.publicado, esperado_worker: ESP.workerMd5, p103_worker: P103.esperado.workerMd5 });
g('D3_pos_deploy_verde_e_igual_ao_embed_do_bundle', P104.veredito === 'P104_POS_DEPLOY_V142_OK 17/0' && P104.medido.shells[0].md5 === ESP.htmlMd5 && P104.medido.shells[0].md5 === P103.esperado.htmlMd5, { veredito: P104.veredito, p104_shell: P104.medido.shells[0], embed_p103: P103.esperado.htmlMd5 });
g('D4_browser_verde_sem_excepcao', P112.veredito === 'P112_PAINEL_FECHA_NA_TROCA_COM_ATOR_POR_CELULA_OK 16/0' && P112.falhas.length === 0 && P112.excecoes.length === 0, { veredito: P112.veredito, falhas: P112.falhas, excecoes: P112.excecoes });
g('D5_o_html_certificado_e_o_servido_e_o_medido_e_o_de_agora', ESP.htmlMd5 === P104.medido.shells[0].md5 && ESP.htmlMd5 === P112.ar.md5_servido && ESP.htmlMd5 === P112.ar.md5_no_fim && ESP.htmlMd5 === md5Agora && Buffer.byteLength(agora) === ESP.htmlBytes, { certificado: ESP.htmlMd5, p104: P104.medido.shells[0].md5, p112: P112.ar.md5_servido, p112_fim: P112.ar.md5_no_fim, agora: md5Agora, bytes_agora: Buffer.byteLength(agora), bytes_certificado: ESP.htmlBytes });
g('D6_o_servidor_concorda_com_o_stdout', STATUS.versions[0].version_id === VER && porData[0].versions[0].version_id === VER && STATUS.versions[0].percentage === 100, { stdout: VER, status: STATUS.versions[0], lista: porData[0].versions[0] });
g('D7_a_cadeia_de_reversao_aponta_para_a_v141', porData[1].versions[0].version_id === A141.deploy.version_id, { anterior_na_lista: porData[1].versions[0].version_id, criada: porData[1].created_on, v141_no_diario: A141.deploy.version_id });
g('D8_a_grelha_percorreu_as_nove_vistas_fora_do_mapa_e_todas_escondidas_com_alguma_coisa_pintada', cel.length === 9 && P112.classes_de_celula.total_fora_do_mapa === 9 && cel.every((t) => t.dentro_do_mapa === false && t.aberto_antes_da_troca === true && t.painel.oculto_pela_classe === true && t.alguma_coisa_pintada === true), { n: cel.length, total_fora: P112.classes_de_celula.total_fora_do_mapa, vermelhas: cel.filter((t) => !(t.dentro_do_mapa === false && t.aberto_antes_da_troca === true && t.painel.oculto_pela_classe === true && t.alguma_coisa_pintada === true)).map((t) => t.rotulo) });
g('D9_as_duas_classes_de_celula_estao_ambas_presentes_e_nenhuma_fica_fora_das_duas', comFecho.length === 8 && semFecho.length === 1 && semFecho[0].active_view === 'teacher' && cel.every((t) => t.classe === 'fecho_novo' || t.classe === 'escondida_sem_fecho'), { comFecho: comFecho.map((t) => t.rotulo), semFecho: semFecho.map((t) => t.rotulo) });
g('D10_em_cada_celula_com_fecho_novo_o_destino_e_o_da_regra_dos_bytes', comFecho.length >= 1 && comFecho.every((t) => (t.ultimo_fecho || {}).destino === t.regra_do_shell_para_a_entrante && (t.ultimo_fecho || {}).destino === 'inicio'), { linhas: comFecho.map((t) => t.rotulo + '=' + ((t.ultimo_fecho || {}).destino ?? null) + '/' + t.regra_do_shell_para_a_entrante) });
g('D11_a_celula_sem_fecho_nao_empresta_o_fecho_global', semFecho.length === 1 && semFecho[0].fecho_depois_da_troca_id === semFecho[0].fecho_antes_da_troca_id && semFecho[0].fecho_novo_nesta_celula === false && semFecho[0].painel.oculto_pela_classe === true, { linha: semFecho.map((t) => ({ rotulo: t.rotulo, antes: t.fecho_antes_da_troca_id, depois: t.fecho_depois_da_troca_id, novo: t.fecho_novo_nesta_celula, oculto: t.painel.oculto_pela_classe })) });
g('D12_o_vermelho_da_P105_esta_preservado_e_a_sua_unica_divergencia_e_a_regra_inventada_para_teacher', existsSync(`${REPO}/evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.json`) && P105.veredito === 'P105_PAINEL_FECHA_NA_TROCA_NO_AR_VERMELHO 1 de 14' && P105.falhas.length === 1 && /^F6_/.test(P105.falhas[0]) && p105cel.length === 9 && p105cel.every((t) => t.dentro_do_mapa === false && t.aberto_antes_da_troca === true && t.painel.oculto_pela_classe === true) && p105div.length === 1 && p105div[0].active_view === 'teacher' && p105div[0].destino_esperado_dos_bytes === 'professor-inicio', { veredito: P105.veredito, falhas: P105.falhas.length, todas_escondidas: p105cel.every((t) => t.painel.oculto_pela_classe === true), nao_escondidas: p105cel.filter((t) => t.painel.oculto_pela_classe !== true).map((t) => t.rotulo), divergencias: p105div.map((t) => t.active_view + ' esperado=' + t.destino_esperado_dos_bytes + ' medido=' + ((t.ultimo_fecho || {}).destino ?? null)) });
g('D13_a_atribuicao_por_simbolo_bate_com_a_classe_por_celula', Object.keys(P111.portoes).every((k) => P111.portoes[k] === true) && P111.atores.fora_do_modulo === 1 && P111.atores.modulo === 2 && p111cel('Professor').ator === 'fora_do_modulo' && p112classe('Professor') === 'escondida_sem_fecho' && p111cel('Direção').ator === 'modulo' && p112classe('Direção') === 'fecho_novo' && P110.veredito === 'P110_ACTOR_DA_ESCONDIDA_POR_PILHA_OK 7/0' && P108.por_actor.shell === 1 && P108.por_actor.modulo === 2, { p111: P111.veredito, atores_p111: P111.atores, Professor: [p111cel('Professor').ator, p112classe('Professor')], Direcao: [p111cel('Direção').ator, p112classe('Direção')], p110: P110.veredito, p108: P108.por_actor });
g('D14_a_regra_do_shell_nao_tem_segunda_fonte_e_o_mapa_nao_e_mutado', P112.regra_do_shell.mutacoes_de_roleSectionAccess_nos_bytes === 0 && P112.regra_do_shell.teacher_no_fallbackByRole === false && P112.regra_do_shell.fallbackByRole_chaves.includes('teacher') === false && P112.divergencias_regra_p102_vs_shell.length === 1, { regra: P112.regra_do_shell, divergencias: P112.divergencias_regra_p102_vs_shell });
g('D15_zero_escrita_de_banco_nesta_publicacao', P104.escrita === 0 && P104.ddl === 0 && P104.mint === 0, { escrita: P104.escrita, ddl: P104.ddl, mint: P104.mint, nota: 'os dados municipais foram escritos pela P92, antes da v140; esta publicacao so mudou apresentacao' });
if (falhas.length) {
  writeFileSync(`${REPO}/evidence/p113-diario-v142-VERMELHO.json`, JSON.stringify({ veredito: 'P113_DIARIO_V142_VERMELHO ' + falhas.length + ' de 15', falhas }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  process.exit(1);
}

const diario = {
  version: 'v142',
  data: '2026-11-21',
  ok_literal: 'a escolha do utilizador na pergunta de escopo de 21/11: «So fechar o painel (Recomendado)»',
  nota_do_ok: 'cobre construir a candidata, gerar o bundle e PUBLICAR o fecho do painel municipal na troca de vista. NAO cobre revogar as 4 concessoes municipais de contas reais (respondeu «Manter (Recomendado)» — 0 escritas no banco), NEM o rpc como porta da visibilidade, NEM reverter PEN-43/PEN-44 nem por `secretaria-municipal` no array estatico de `teacher` nem rodar senha (respondeu «Nenhum (Recomendado)» ao bloco dos desaconselhados), NEM git push.',
  escopo_do_ok: 'uma linha no modulo municipal: quando a vista activa sai do mapa do shell e o painel da Secretaria Municipal esta aberto, fecha-lo com `fecharPainelForaDaVista(destino, motivo)`, sendo o destino o que a regra do shell da (a mesma que os bytes dao a qualquer vista sem chave em `fallbackByRole`), e levar isso ao ar',
  tarefa: 'fechar a incoerencia de apresentacao registada no diario da v141 (`observacao_aberta_painel_ja_aberto`): com o painel aberto, a troca de vista escondia a ENTRADA mas deixava o painel display=block com ' + A141.medido_no_browser.clique_na_authorizada_pintou.painel.chars + ' B visiveis por cima da vista nova',
  porque_esta_versao: 'a cadeia certificada e v139 (sonda honesta) -> v140 (trilha) -> v141 (caixa vazia) -> p102 (v142 fecho na troca): a v142 parte do worker que estava no ar (P103 T1) e traz dentro as tres pecas anteriores',
  origem_dos_numeros: 'stdout do wrangler + deployments status/list + artefactos p102/p103/p104/p105/p108/p110/p111/p112 e esperado-v142 em disco; nada copiado-colado da conversa',
  deploy: {
    worker: 'bfr-conecta', conta: A141.deploy.conta, version_id: VER, deployment_id: STATUS.id,
    deployment_created: STATUS.created_on, versao_anterior_v141: A141.deploy.version_id, url: P104.url,
    reversao: 'devolver o ar a v141 e `wrangler deploy` a partir de worker-deploy-v141-caixa-vazia — exige OK literal novo',
  },
  bundle: {
    worker_md5: ESP.workerMd5, worker_bytes: ESP.workerBytes, delta_worker_bytes: ESP.deltaWorkerBytes,
    html_md5: ESP.htmlMd5, html_bytes: ESP.htmlBytes, sw_md5: ESP.swMd5, sw_bytes: ESP.swBytes,
    cache_label_no_ar: ESP.cacheLabel, modulo_md5: ESP.moduleMd5, modulo_bytes: ESP.moduleBytes,
    headers_md5: ESP.headersMd5, assets_copiados: ESP.assetsCopiados, precache_alinhado: ESP.precacheAlinhado,
    base: 'worker-deploy-v141-caixa-vazia (o worker que estava no ar)',
    candidata: { origem: P102.origem.pasta + ' md5=' + P102.origem.md5, destino: P102.destino.pasta + ' md5=' + P102.destino.md5, delta_bytes: P102.destino.delta_bytes, substituicoes: P102.substituicoes.map((s) => s.nome + ' x' + s.vezes) },
  },
  portoes: {
    p102_candidata: P102.veredito, p103_bundle: P103.veredito, p104_pos_deploy: P104.veredito, p112_browser: P112.veredito,
    p105_vermelho_preservado: { caminho: 'evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.json', veredito: P105.veredito },
    p104_vermelho_preservado: 'evidence/p104-pos-deploy-v142-a-VERMELHO-regua_do_H15_procurou_id_em_vez_de_data_section.json',
    p102_vermelho_preservado: 'evidence/p102-gera-candidata-v142-21-11-b-VERMELHO-regua_do_SECT_contava_o_literal_e_insert_exigia_zero.json',
    p112_vermelho_preservado: 'evidence/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar-21-11-a-ERRO-MEU-FIND-EM-VEZ-DE-FINDINDEX.json',
    p111_vermelhos_preservados: ['evidence/p111-ator-da-escondida-por-simbolo-nos-bytes-21-11-a-ERRO-MEU-TDZ-CAL.json', 'evidence/p111-ator-da-escondida-por-simbolo-nos-bytes-21-11-b-ERRO-MEU-ESPERADO-FIXO-NA-CELULA-PAIS.json'],
    p111_terceira_corrida: P111.veredito, p110_pilha: P110.veredito, p108_atribuicao_por_ausencia: P108.veredito,
  },
  conferencia_no_ar: {
    veredito_p104: P104.veredito, duracao_ms_p104: P104.duracao_ms, shells_p104: P104.medido.shells,
    md5_agora: md5Agora, bytes_agora: Buffer.byteLength(agora),
    agulhas_no_ar: P104['H3_as_cinco_agulhas_do_fcho_estao_no_ar_uma_vez_cada'],
    etiquetas_perdidas_da_v141: P104['H5_o_sw_no_ar_tem_a_etiqueta_da_v142_e_perde_a_da_v141'],
    nada_da_v141_perdido: P104['H9_nada_do_que_a_v141_ganhou_se_perdeu_na_v142'],
    destinos_do_fecho_sao_seccoes_da_paleta: P104['H15_os_destinos_do_fcho_sao_seccoes_da_paleta_do_shell_que_estao_no_ar'],
    controlo_negativo_do_H15_tem_dentes: P104['H16_o_controlo_negativo_do_H15_tem_dentes'],
  },
  medido_no_browser: {
    veredito_p112: P112.veredito, duracao_ms: P112.duracao_ms, banda: P112.banda, papel_sessao: P112.papel_sessao,
    pergunta: P112.pergunta, celulas: cel.map((t) => t.rotulo + ' ' + t.active_view + ' ' + t.classe + ' fecho=' + t.fecho_antes_da_troca_id + '->' + t.fecho_depois_da_troca_id + ' destino=' + ((t.ultimo_fecho || {}).destino ?? 'null') + ' regra_shell=' + t.regra_do_shell_para_a_entrante),
    classes_de_celula: P112.classes_de_celula,
    regra_do_shell_lida_dos_bytes: P112.regra_do_shell,
    painel_continua_aberto_sem_troca: { antes: P112.sem_troca.antes.painel, depois: P112.sem_troca.depois.painel },
    saida_e_volta: { saida_painel: P112.saida.painel, entrada_de_volta: P112.volta.s.painel, clique_de_reabertura: P112.volta.clique },
  },
  reclassificacao_do_vermelho_da_P105: {
    veredito_original: P105.veredito,
    unica_porta_chumbada: 'F6_o_fecho_nomeia_o_destino_que_os_bytes_dao_para_a_vista',
    o_que_a_P105_mediu_de_apresentacao: 'nas 9 celulas da P105 a vista entrante estava dentro do mapa=false, aberto_antes_da_troca=true e `painel.oculto_pela_classe`=true — o painel fechou-se em todas; o vermelho nunca foi de apresentacao, foi da espera',
    D1_espectativa: 'a P102 e a P105 comparavam com a primeira seccao do mapa estatico (`roleSectionAccess[vista][0]`) quando `fallbackByRole` nao tinha a vista; os bytes dizem `const fallback = fallbackByRole[activeView] || \'inicio\';` e nao ha nenhuma mutacao de `roleSectionAccess` nos bytes (P112 F16: mutacoes=0, e `teacher` nao e chave de `fallbackByRole`, medido por `hasOwnProperty` = false; a segunda fonte da P102 continua registada em cada celula so para se ver onde divergiria)',
    D2_atribuicao: 'a P105 lia `ultimoFecho()` — um global do modulo — como se fosse a medida da celula; na celula `teacher` o modulo nao cria fecho nenhum, logo a P105 leu o fecho da celula anterior (P112 marca essa celula como `escondida_sem_fecho` com fecho inalterado ' + semFecho.map((t) => t.fecho_antes_da_troca_id + '->' + t.fecho_depois_da_troca_id).join(',') + ')',
    divergencia_unica_medida: P112.divergencias_regra_p102_vs_shell,
    consertado_em: 'scripts/p112-painel-fecha-na-troca-com-ator-por-celula-no-ar.mjs (F6 dividida em F6a/F6b, mais F15 e F16); nenhuma predicado existente foi amaciado nem removido',
    preservados: ['evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.json', 'evidence/p105-painel-fecha-na-troca-no-ar-21-11-a.txt'],
  },
  atribuicao_do_esconder_por_medida: {
    p108_por_ausencia: P108.por_actor, p110_por_pilha: P110.veredito, p111_por_simbolo_nos_bytes: P111.veredito,
    act_p111: P111.atores,
    como_se_le: 'na celula `Professor` a classe `hidden` e escrita ~11 ms depois do clique por `setProfessionalTeacherSection` (bloco `bfr-core-runtime`, injectado em tempo de arranque — por isso o seu frame aparece como `<anonymous>` e a sua numeração é por bloco, nao por documento); nas celulas em que o modulo fecha, quem escreve e `fecharPainelForaDaVista` e nomeia `inicio`',
    corregao_da_p110: 'a P110 comparava a linha da pilha com a faixa de documento do modulo; para frames `<anonymous>` isso sao eixos incompativeis. A P111 resolve o simbolo nos bytes servidos e registra `linha_da_pilha_e_do_documento`; o verde da P110 mantem-se como medido, a sua etiqueta e re-derivada pela P111',
    nota_de_corrida_celula_Pais: P111.divergencia_registada_entre_as_duas_corridas,
  },
  o_que_este_deploy_muda_para_um_usuario_real: {
    quem_ve_a_entrada: 'nada muda: a visibilidade continua a seguir a vista activa e a decisao de dados fica em `aptoParaSessao()` e nas rpcs com RLS',
    painel_aberto_e_troca_de_view: 'fecha: medido nas 9 vistas fora do mapa — `oculto_pela_classe=true` em todas, com alguma coisa pintada na vista nova (P112 D8)',
    quem_nao_tem_painel_para_fechar: 'uma vista (`teacher`) nao passa pelo fecho do modulo: o proprio shell ja lhe poe a classe `hidden` ~11 ms depois do clique, e a P112 nao lhe credita um fecho que nao aconteceu',
    nota_de_atingibilidade: 'o painel tambem continua fechavel e reabrivel na sessao de teste: `volta.clique` deu clicado=true e e_o_proprio=true e o painel tornou a display=block com ' + P112.volta.s.painel.chars + ' B',
  },
  decisoes_de_registro: {
    quatro_concessoes_municipais_de_contas_reais: { decisao: 'Manter (Recomendado) — resposta do utilizador em 21/11', consequencia: 'zero escritas no banco; as 4 concessoes da SM8 sobre o municipio de exemplo ficam como estao e continuam a ler 4/848/27', medida_em: 'evidence/p81-* e evidence/p91-* (contagem da barra) e P92 (4 de 6 escolas ligadas por municipio)' },
    rpc_como_porta_da_visibilidade: { decisao: 'nao construida nem publicada', porque: 'P93 mediu D1=0 e D2=0 em 14 personas legiveis — uma v141 com o rpc como porta nao mudaria nada para as contas da barra e so daria entrada as 4 contas reais concessionadas, logo seria expansao de acesso', tarefa: '#27 fica como decisao de registro' },
    desaconselhados: { decisao: 'Nenhum (Recomendado)', itens: ['reverter PEN-43/PEN-44', 'acrescentar secretaria-municipal ao array estatico de `teacher`', 'rodar senha das contas de teste'] },
  },
  estado_do_remoto_medido_agora: {
    main: MAIN, origin_main: ORIG, ahead: Number(AHEAD), reflog_remoto: REFLOG,
    leitura: 'valor recolhido antes do commit deste diario: `main` e `origin/main` dao o mesmo hash, portanto a publicacao anterior (v141) ja esta no remoto e o commit que ha-de conter este diario ainda nao existe quando esta linha e escrita. O push desta peca nao e feito por esta corrida e pede OK literal novo.',
    medido_por: 'git rev-parse main / git rev-parse origin/main / git rev-list --count origin/main..main / git reflog show origin/main, corridos por esta peca em tempo de execucao (0 escrita em git)',
  },
  o_que_este_diario_nao_autoriza: 'git push; revogar ou manter de novo as 4 concessoes municipais de contas reais (mantidas por decisao do utilizador); tornar `bfr_is_municipal_authority()` a porta da visibilidade (P93: D1=0, D2=0 — seria expansao de acesso); acrescentar `secretaria-municipal` ao array estatico de `teacher`; reverter PEN-43/PEN-44; rodar senha de contas de teste; qualquer DDL ou escrita no banco; publicar uma v143 — cada uma dessas pecas pede OK literal proprio.',
};
writeFileSync(SAIDA, JSON.stringify(diario, null, 2) + '\n');
writeFileSync(TXT, `P113_DIARIO_V142_OK 15/0\n${SAIDA.replace(REPO + '/', '')} · version=${VER} · html=${md5Agora} (${Buffer.byteLength(agora)} B) · portoes: ${P102.veredito} | ${P103.veredito} | ${P104.veredito} | ${P112.veredito}\nnode_exit=0\n`);
console.log(`P113_DIARIO_V142_OK 15/0 · audit-publicacao-v142.json · version=${VER} · html=${md5Agora} (${Buffer.byteLength(agora)} B)`);
process.exit(0);
