#!/usr/bin/env node
// P97 — CANDIDATA v141: A ENTRADA MUNICIPAL DEIXA DE DESFAZER O QUE O SHELL ESCONDE (21/11, madrugada).
// A P89 nomeou a causa pelos bytes e a P81 mediu o sintoma: na persona «Professor» (sessão developer) as duas
// cópias do botão estão a 0×0 com `hidden=false` e `aptoAttr="sim"` — `aplicarVisibilidade()` decide só pelo
// veredicto da SESSÃO e, a cada 600 ms, volta a pôr visível o que `syncRoleNavigation` acabou de esconder pelo
// mapa da vista activa. Esta peça acrescenta `aptoParaVista()`, que transcreve a regra do shell indexada por
// `runtime().activeView`, e passa a mostrar apenas quando os dois concordam. Apresentação: não acrescenta
// nenhuma vista ao mapa, não tira a entrada a nenhuma conta autorizada e não escreve no banco. 0 publicação.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = join(DIR, 'bfr-candidata-v140-trilha-de-acesso/index.html');
const REGISTO_ORIGEM = join(DIR, 'bfr-candidata-v140-trilha-de-acesso/portoes-v140-candidata.json');
const PARA = join(DIR, 'bfr-candidata-v141-caixa-vazia');
const SAIDA = join(PARA, 'index.html');
const PORTOES = join(PARA, 'portoes-v141-candidata.json');
const AR_PUBLICADO = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ESP140 = join(DIR, 'worker-deploy-v140-trilha-de-acesso/esperado-v140.json');
const SUF = (process.argv[2] || 'a').trim();
const EV = join(DIR, `evidence/p97-gera-candidata-v141-21-11-${SUF}.json`);
const INVOLUCRO = '<script data-bfr-municipal-module="1">';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const vezes = (t, x) => t.split(x).length - 1;
const t0 = Date.now();

if (!existsSync(ORIGEM)) throw new Error('ABORTA: origem ' + ORIGEM + ' não existe');
if (!existsSync(REGISTO_ORIGEM)) throw new Error('ABORTA: ' + REGISTO_ORIGEM + ' não existe — gerar sobre uma candidata sem registo de portões');
const registoOrigem = JSON.parse(readFileSync(REGISTO_ORIGEM, 'utf8'));
if (!/^P87_CANDIDATA_V140_TRILHA_OK/.test(String(registoOrigem.veredito))) throw new Error('ABORTA: portões da origem não estão verdes (' + String(registoOrigem.veredito) + ')');
const txt0 = readFileSync(ORIGEM, 'utf8');
const MD5_0 = md5(txt0), B0 = statSync(ORIGEM).size;
if (String((registoOrigem.destino || {}).md5 || '') !== MD5_0) throw new Error('ABORTA: md5 da origem ' + MD5_0 + ' não é o da saída certificada ' + String((registoOrigem.destino || {}).md5) + ' — a candidata foi tocada depois de gerada');
if (txt0.indexOf(INVOLUCRO) === -1) throw new Error('ABORTA: a origem não tem o invólucro do módulo municipal');

// ——— extração estática: o mapa do shell e a regra do shell, lidos dos MESMOS bytes da origem ———
const recortaChavetas = (t, desde) => { let nivel = 0; for (let i = desde; i < t.length; i++) { const c = t[i]; if (c === '{') nivel++; else if (c === '}') { nivel--; if (nivel === 0) return t.slice(desde, i + 1); } } return null; };
const iniMapa = txt0.indexOf('const roleSectionAccess = {');
if (iniMapa === -1) throw new Error('ABORTA: nenhum `const roleSectionAccess = {` na origem — sem mapa não há equivalência a provar');
const blocoMapa = recortaChavetas(txt0, txt0.indexOf('{', iniMapa));
if (!blocoMapa) throw new Error('ABORTA: o objecto do mapa não fechou por contagem de chavetas');
const MAPA0 = (() => { try { return Function('return (' + blocoMapa + ')')(); } catch (e) { throw new Error('ABORTA: o mapa do shell não avalia como objecto: ' + String(e.message).slice(0, 120)); } })();
const VISTAS_MAPA = Object.keys(MAPA0);
if (VISTAS_MAPA.length < 5) throw new Error('ABORTA: ' + VISTAS_MAPA.length + ' vistas lidas do mapa — a régua de equivalência ficaria vacua');

// A regra do shell transcreve-se do TEXTO dele, não da minha memória: os extras do ramo `admin` e a queda em
// `parent` lêem-se da linha do `syncRoleNavigation`. Se o shell mudar de extras, esta régua fica vermelha.
const linhaShell = (txt0.split('\n').find((l) => /const allowed = viewRole === 'admin'/.test(l)) || '');
const EXTRAS_SHELL = [...new Set([...linhaShell.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).filter((x) => x !== 'admin'))];
const TEM_QUEDA_PARENT = /roleSectionAccess\.parent/.test(linhaShell);
if (EXTRAS_SHELL.length !== 2 || !TEM_QUEDA_PARENT) throw new Error('ABORTA: não extraí a regra do shell (extras=' + JSON.stringify(EXTRAS_SHELL) + ' parent=' + TEM_QUEDA_PARENT + ') — linha lida: ' + JSON.stringify(linhaShell.trim().slice(0, 200)));
const regraShell = (map, vista) => (vista === 'admin' ? [...new Set([...(map.admin || []), ...EXTRAS_SHELL])] : (map[vista] || map.parent || []));

// ——— as três substituições, cada uma contada uma vez na origem ———
const SUBS = [
  {
    nome: 'a_funcao_que_le_a_mapa_da_view_activa',
    antes: "  // §5/§6 medidos a 18/11: um papel que não tem chave em `roleSectionAccess` (o `secretary` real é o",
    depois: "  function aptoParaVista() {\n"
      + "    const rt = RT(); const map = rt.roleSectionAccess || {};\n"
      + "    const vista = String(rt.activeView || '');\n"
      + "    // Sem vista activa conhecida (arranque), decide a sessão: esconder aqui tiraria a entrada a uma\n"
      + "    // pessoa autorizada antes de o shell ter desenhado seja o que for, e é precisamente o que esta\n"
      + "    // peça não pode fazer. Com vista conhecida, a regra É a do shell, indexada por `activeView`.\n"
      + "    if (!vista) return { visivel: aptoParaSessao().apto, por: 'sem activeView (arranque): decide a sessao' };\n"
      + "    const permitido = vista === 'admin' ? [...new Set([...(map.admin || []), " + EXTRAS_SHELL.map((x) => "'" + x + "'").join(', ') + "])]\n"
      + "      : (map[vista] || map.parent || []);\n"
      + "    return { visivel: permitido.includes(SECT), por: 'activeView=' + vista + ' no mapa=' + permitido.includes(SECT) };\n"
      + "  }\n"
      + "  // §5/§6 medidos a 18/11: um papel que não tem chave em `roleSectionAccess` (o `secretary` real é o",
  },
  {
    nome: 'a_visibilidade_passa_a_pedir_as_duas_decisoes',
    antes: "  function aplicarVisibilidade() {\n    const veredito = aptoParaSessao();\n"
      + "    for (const b of document.querySelectorAll('[data-bfr-municipal-nav]')) {\n"
      + "      b.classList.toggle('hidden', !veredito.apto);\n"
      + "      b.style.display = veredito.apto ? '' : 'none';\n"
      + "      b.dataset.munApto = veredito.apto ? 'sim' : 'nao';\n"
      + "    }\n"
      + "    const raiz = document.getElementById(VIEW_ID);\n"
      + "    if (raiz) raiz.dataset.munApto = veredito.apto ? 'sim' : 'nao';\n"
      + "    return veredito;\n  }",
    depois: "  function aplicarVisibilidade() {\n    const veredito = aptoParaSessao();\n"
      + "    const vista = aptoParaVista();\n"
      + "    const mostrar = veredito.apto && vista.visivel;\n"
      + "    for (const b of document.querySelectorAll('[data-bfr-municipal-nav]')) {\n"
      + "      b.classList.toggle('hidden', !mostrar);\n"
      + "      b.style.display = mostrar ? '' : 'none';\n"
      + "      b.dataset.munApto = veredito.apto ? 'sim' : 'nao';\n"
      + "      b.dataset.munVista = vista.visivel ? 'dentro' : 'fora';\n"
      + "    }\n"
      + "    const raiz = document.getElementById(VIEW_ID);\n"
      + "    if (raiz) { raiz.dataset.munApto = veredito.apto ? 'sim' : 'nao'; raiz.dataset.munVista = vista.visivel ? 'dentro' : 'fora'; }\n"
      + "    return veredito;\n  }",
  },
  {
    nome: 'a_funcao_nova_ficou_exposta_para_medir',
    antes: "  window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aplicarVisibilidade,",
    depois: "  window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aptoParaVista, aplicarVisibilidade,",
  },
];
for (const s of SUBS) { const v = vezes(txt0, s.antes); if (v !== 1) throw new Error('ABORTA: substituição "' + s.nome + '" casou ' + v + ' vezes na origem (esperado 1)'); }
let txt = txt0;
for (const s of SUBS) txt = txt.replace(s.antes, s.depois);
if (txt === txt0) throw new Error('ABORTA: nenhuma substituição escreveu nada');

// ——— corpo do módulo re-extraído do texto GERADO, e as duas regras avaliadas sobre o mesmo mapa ———
const iniCorpo = txt.indexOf(INVOLUCRO) + INVOLUCRO.length;
const corpo = txt.slice(iniCorpo, txt.indexOf('</script>', iniCorpo));
const iniFn = corpo.indexOf('function aptoParaVista()');
if (iniFn === -1) throw new Error('ABORTA: o corpo gerado não tem aptoParaVista');
const fimFn = corpo.indexOf('\n  }\n', iniFn);
if (fimFn === -1) throw new Error('ABORTA: não encontrei o fecho de aptoParaVista por terminação — a indentação mudou');
const FUNCAO = corpo.slice(iniFn, fimFn + 5);

const PAPEIS_MUN = [...new Set([...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(corpo) || [])[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]))];
if (PAPEIS_MUN.length === 0) throw new Error('ABORTA: 0 papéis municipais lidos do corpo — o `registar()` não teria onde ser aplicado e a equivalência seria vacua');
// `registar()` muta o mapa vivo: só comparo as duas regras sobre o mapa DEPOIS do registo, como no browser.
const SECT_DA_ORIGEM = (/const SECT = '([^']+)'/.exec(corpo) || [])[1];
if (!SECT_DA_ORIGEM) throw new Error('ABORTA: nenhum SECT no corpo');
const copiaMapa = () => JSON.parse(JSON.stringify(MAPA0));
const aposRegistar = (map) => { for (const p of PAPEIS_MUN) if (Array.isArray(map[p]) && !map[p].includes(SECT_DA_ORIGEM)) map[p] = map[p].concat(SECT_DA_ORIGEM); return map; };
const mapaVivo = aposRegistar(copiaMapa());

// A regra nova, AVALIADA do texto gerado (não transcrita à mão): se eu mudar a fórmula no módulo, o comparador
// passa a discordar do shell — é isto que dá dentes à régua de equivalência.
const avaliaRegraNova = (funcaoTexto, mapa, secc) => {
  const f = Function('RT', 'SECT', 'EXTRAS', 'aptoParaSessao', funcaoTexto + '\nreturn aptoParaVista();');
  return (vista) => {
    const rt = { activeView: vista, roleSectionAccess: mapa, profile: { role: 'developer' } };
    return f(() => rt, secc, EXTRAS_SHELL, () => ({ apto: true })).visivel === true;
  };
};
const novaRegraVista = avaliaRegraNova(FUNCAO, mapaVivo, SECT_DA_ORIGEM);
// A regra VELHA (sessão-only), também avaliada, para contar o que muda — nunca um número dactilografado.
const antigaRegraVista = () => true;
const VISTAS_COMPARADAS = [...new Set([...VISTAS_MAPA, 'admin', 'teacher', 'education_supervisor', 'secretary'])];
const discordancias = VISTAS_COMPARADAS.filter((v) => novaRegraVista(v) !== regraShell(mapaVivo, v).includes(SECT_DA_ORIGEM));
const boxQuePassamAEscondidos = VISTAS_COMPARADAS.filter((v) => antigaRegraVista(v) && !novaRegraVista(v));
const vistasQueMantem = VISTAS_COMPARADAS.filter((v) => novaRegraVista(v));

// ——— predicações puras com os dois lados provados ———
if (regraShell(mapaVivo, 'admin').includes(SECT_DA_ORIGEM) !== true) throw new Error('ABORTA: a regra do shell não dá `admin` como visível — o comparador estaria cego');
if (regraShell(mapaVivo, 'teacher').includes(SECT_DA_ORIGEM) !== false) throw new Error('ABORTA: a regra do shell dá `teacher` como visível — então não há caixa 0× para esconder e esta peça é outra coisa');
if (novaRegraVista('teacher') !== false) throw new Error('ABORTA: a regra nova não esconde a vista que o shell esconde — o defecto continuaria');
if (novaRegraVista('admin') !== true) throw new Error('ABORTA: a regra nova esconde a vista authorizada — isso TIRARIA acesso');
if (novaRegraVista('education_supervisor') !== true) throw new Error('ABORTA: a regra nova esconde `education_supervisor`, que o `registar()` authoriza — tiraria acesso');
if (avaliaRegraNova("function aptoParaVista() { return { visivel: true }; }", mapaVivo, SECT_DA_ORIGEM)('teacher') !== true) throw new Error('ABORTA: o comparador não discrimina uma regra falsa (tudo-visivel) — a régua de equivalência seria vacua');
if (avaliaRegraNova("function aptoParaVista() { return { visivel: false }; }", mapaVivo, SECT_DA_ORIGEM)('admin') !== false) throw new Error('ABORTA: o comparador não discrimina uma regra falsa (nada-visivel)');
const compila = (t) => { try { new Script(t, { filename: 'modulo-municipal-v141.js' }); return true; } catch (e) { return 'ERRO: ' + String(e.message || e).slice(0, 160); } };
if (compila('const a = 1;') !== true) throw new Error('ABORTA: compila() chumba código válido');
if (compila('const a = 1; function ( {') === true) throw new Error('ABORTA: compila() aceita sintaxe partida — o portão seria vacuo');

if (process.argv.includes('--selfteste')) {
  console.log('P97_SELFTESTE_OK — a regra do shell extrai-se dos bytes dele (' + EXTRAS_SHELL.join(',') + ' + parent), o comparador discrimina nas duas direcces e a vista authorizada fica de fora; 0 rede, 0 banco');
  process.exit(0);
}

if (existsSync(SAIDA)) {
  if (md5(readFileSync(SAIDA, 'utf8')) !== md5(txt)) throw new Error('ABORTA: ' + SAIDA + ' já existe com bytes DIFERENTES — não se sobrescreve; use outro destino');
} else mkdirSync(PARA, { recursive: true });
writeFileSync(SAIDA, txt);

// ——— nada publicado: o ar serve ainda o bundle que a P94 certificou ———
const porVersao = (re) => readdirSync(DIR).filter((f) => re.test(f)).sort((a, b) => parseInt(/v?(\d+)/.exec(a)[1], 10) - parseInt(/v?(\d+)/.exec(b)[1], 10));
const DIARIO = porVersao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const ESP140j = JSON.parse(readFileSync(ESP140, 'utf8'));
let SERVIDO = '';
try { const r = await fetch(AR_PUBLICADO, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(60000) }); SERVIDO = md5(await r.text()); }
catch (e) { SERVIDO = 'fetch_falhou: ' + String(e.message || e).slice(0, 90); }

const MESA = String((JSON.parse(readFileSync(join(DIR, 'worker-deploy-v140-trilha-de-acesso/esperado-v140.json'), 'utf8')).mesaDeTrilha) || '');
const POR_AUT = 'sonda.autorizada === true';

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = cond === true; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('a_origem_e_a_saida_certificada_do_p87', MD5_0 === registoOrigem.destino.md5 && B0 === registoOrigem.destino.bytes, { origem: { md5: MD5_0, bytes: B0 }, certificado: registoOrigem.destino, veredito: registoOrigem.veredito });
g('cada_substituicao_casou_uma_svez_na_origem_e_escreveu_uma_no_destino', SUBS.every((s) => vezes(txt0, s.antes) === 1 && vezes(txt, s.depois) === 1), SUBS.map((s) => s.nome + ':antes=' + vezes(txt0, s.antes) + ',depois=' + vezes(txt, s.depois)));
g('o_corpo_do_modulo_compila', compila(corpo) === true, { bytes_corpo: corpo.length, erro: compila(corpo) === true ? '' : compila(corpo) });
g('a_regra_do_shell_extrai_se_dos_bytes_e_nao_da_minha_memoria', EXTRAS_SHELL.length === 2 && TEM_QUEDA_PARENT, { extras_lidos: EXTRAS_SHELL, queda_em_parent: TEM_QUEDA_PARENT, linha: linhaShell.trim().slice(0, 220) });
g('a_funcao_nova_nao_le_o_papel_da_sessao_como_view', /rt\.activeView/.test(FUNCAO) && !/rt\.profile \|\| \{\}\)\.role/.test(FUNCAO), { le_activeView: /rt\.activeView/.test(FUNCAO), bytes_funcao: FUNCAO.length });
g('a_equivalencia_com_o_shell_bate_em_todas_as_vistas', discordancias.length === 0 && VISTAS_COMPARADAS.length >= 14, { vistas_comparadas: VISTAS_COMPARADAS.length, discordantes: discordancias, nota: 'a visibilidade do modulo passa a ser, vista a vista, a decisao que o shell ja tomou' });
g('o_sintoma_da_p81_muda_de_estado_em_cada_vista_afectada', boxQuePassamAEscondidos.length === VISTAS_COMPARADAS.filter((v) => !regraShell(mapaVivo, v).includes(SECT_DA_ORIGEM)).length && boxQuePassamAEscondidos.length >= 1, { antes: 'sessao-authorizada mostrava em ' + VISTAS_COMPARADAS.length + ' vistas', depois_visiveis: vistasQueMantem, escondidos: boxQuePassamAEscondidos });
g('nenhuma_conta_autorizada_perde_a_entrada', vistasQueMantem.slice().sort().join(',') === VISTAS_COMPARADAS.filter((v) => regraShell(mapaVivo, v).includes(SECT_DA_ORIGEM)).sort().join(','), { mantem: vistasQueMantem, deveriam_manter: VISTAS_COMPARADAS.filter((v) => regraShell(mapaVivo, v).includes(SECT_DA_ORIGEM)) });
g('esta_peca_nao_alarga_o_mapa_a_nenhuma_vista', vezes(txt, 'map[papel].concat(SECT)') === vezes(txt0, 'map[papel].concat(SECT)') && (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(txt) || [''])[0] === (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(txt0) || [''])[0] && !PAPEIS_MUN.includes('teacher'), { linha_registar_antes: vezes(txt0, 'map[papel].concat(SECT)'), linha_registar_depois: vezes(txt, 'map[papel].concat(SECT)'), papeis_municipais: PAPEIS_MUN });
g('o_mapa_estatico_do_shell_e_byte_a_byte_o_mesmo_de_v140', (recortaChavetas(txt, txt.indexOf('{', txt.indexOf('const roleSectionAccess = {'))) || '') === blocoMapa, { bytes_bloco_antes: blocoMapa.length, bytes_bloco_depois: (recortaChavetas(txt, txt.indexOf('{', txt.indexOf('const roleSectionAccess = {'))) || '').length, vistas: VISTAS_MAPA });
g('a_dispositivo_de_arranque_nao_esconde_o_que_o_shell_mostraria', /sem activeView \(arranque\): decide a sessao/.test(FUNCAO) && /if \(!vista\) return \{ visivel: aptoParaSessao\(\)\.apto/.test(FUNCAO), { linha: (FUNCAO.split('\n').find((l) => /if \(!vista\)/.test(l)) || '').trim() });
g('a_medicao_antiga_fica_intacta_e_a_nova_fica_visivel', /b\.dataset\.munApto = veredito\.apto \? 'sim' : 'nao';/.test(txt) && /b\.dataset\.munVista = vista\.visivel \? 'dentro' : 'fora';/.test(txt) && /raiz\.dataset\.munVista/.test(txt), { munApto_preservado: /b\.dataset\.munApto = veredito\.apto/.test(txt), munVista_novo: /dataset\.munVista/.test(txt) });
g('a_sonda_honesta_da_v139_e_a_trilha_da_v140_sobrevivem', vezes(txt, POR_AUT) === vezes(txt0, POR_AUT) && vezes(txt, POR_AUT) >= 1 && vezes(txt, MESA) === vezes(txt0, MESA) && MESA.length > 0, { sonda_antes: vezes(txt0, POR_AUT), sonda_depois: vezes(txt, POR_AUT), mesa_lida_do_esperado_v140: MESA, mesa_antes: vezes(txt0, MESA), mesa_depois: vezes(txt, MESA) });
g('a_funcao_ficou_exposta_para_medir', /window\.BFR_MUNICIPAL = \{[^}]*\baptoParaVista\b/.test(corpo), { linha_export: (corpo.split('\n').find((l) => /window\.BFR_MUNICIPAL =/.test(l)) || '').trim().slice(0, 220) });
g('nada_foi_publicado', DIARIO === 'audit-publicacao-v140.json' && SERVIDO === ESP140j.htmlMd5 && !existsSync(join(DIR, 'audit-publicacao-v141.json')), { diario_mais_novo: DIARIO, md5_servido: SERVIDO, md5_do_bundle_v140: ESP140j.htmlMd5, diario_v141_existe: existsSync(join(DIR, 'audit-publicacao-v141.json')) });

const out = {
  programa: 'scripts/p97-gera-candidata-v141-caixa-vazia.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'a entrada municipal pode deixar de desfazer o escondido do shell — sem dar acesso a ninguem e sem o tirar a quem o tem?',
  metodo: 'geracao por substituicao contada sobre a candidata v140 certificada pelo p87; o mapa do shell e a sua regra (extras de `admin` e queda em `parent`) extraem-se dos mesmos bytes, e a regra nova AVALIA-SE do texto gerado. 0 publicacao, 0 DDL, 0 INSERT.',
  origem: { pasta: 'bfr-candidata-v140-trilha-de-acesso', md5: MD5_0, bytes: B0, veredito_portoes: registoOrigem.veredito },
  destino: { pasta: 'bfr-candidata-v141-caixa-vazia', md5: md5(txt), bytes: statSync(SAIDA).size, delta_bytes: statSync(SAIDA).size - B0 },
  shell: { extras_admin_lidos: EXTRAS_SHELL, queda_em_parent: TEM_QUEDA_PARENT, vistas_no_mapa: VISTAS_MAPA.length, sect: SECT_DA_ORIGEM, papeis_municipais: PAPEIS_MUN },
  equivalencia: { vistas_comparadas: VISTAS_COMPARADAS.length, discordantes: discordancias, ficam_visiveis: vistasQueMantem, passam_a_escondidos: boxQuePassamAEscondidos },
  funcao: FUNCAO,
  publicacao: { diario_mais_novo: DIARIO, md5_servido: SERVIDO, md5_bundle_v140: ESP140j.htmlMd5 },
  substituicoes: SUBS.map((s) => ({ nome: s.nome, depois_presente: vezes(txt, s.depois) === 1 })),
  o_que_este_verde_nao_autoriza: 'Nada fora do disco. Publicar a v141 e outro passo e outro OK; dar a seccao `secretaria-municipal` a vista `teacher` continua decisao de produto, e esta peca nao a tomou.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P97_CANDIDATA_V141_CAIXA_VAZIA_OK ' + portoes.length + '/0' : `P97_CANDIDATA_V141_CAIXA_VAZIA_VERMELHO ${falhas.length}`;
writeFileSync(PORTOES, JSON.stringify(out, null, 2) + '\n');
if (!existsSync(EV)) writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.destino.bytes} B (Δ ${out.destino.delta_bytes}) · ${out.destino.md5} · visiveis=[${vistasQueMantem.join(',')}] escondidos=${boxQuePassamAEscondidos.length} · ${out.duracao_ms} ms`);
process.exit(falhas.length ? 1 : 0);
