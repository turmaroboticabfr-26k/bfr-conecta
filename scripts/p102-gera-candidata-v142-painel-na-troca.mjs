#!/usr/bin/env node
// P102 — CANDIDATA v142: FECHAR O PAINEL MUNICIPAL QUANDO A VISTA DEIXA DE AUTORIZAR A SECAO (21/11, tarde).
//
// A P100 mediu e o diário da v141 registou: com o painel aberto, trocar para uma vista fora do mapa esconde a
// ENTRADA mas o painel continua `display=block` com 1 819 B e 10 abas. Esta peça fecha-o. É estritamente
// subtrativo e só age quando consegue nomear um destino — se o shell não der uma secção para aquela vista, o
// painel fica como está, porque um ecrã em branco é pior do que o estado atual. O destino lê-se do literal
// `fallbackByRole` do shell nos mesmos bytes, nunca de memória.
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco, 0 publicação. Escreve só bfr-candidata-v142-painel-na-troca/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PASTA_ORIGEM = 'bfr-candidata-v141-caixa-vazia';
const PASTA_NOVA = 'bfr-candidata-v142-painel-na-troca';
const ORIGEM = `${REPO}/${PASTA_ORIGEM}/index.html`;
const PORTOES_ORIGEM = JSON.parse(readFileSync(`${REPO}/${PASTA_ORIGEM}/portoes-v141-candidata.json`, 'utf8'));
const P100 = JSON.parse(readFileSync(`${REPO}/evidence/p100-caixa-vazia-escondida-no-ar-21-11-b.json`, 'utf8'));
const SAIDA = `${REPO}/${PASTA_NOVA}/index.html`;
const REGISTO = `${REPO}/${PASTA_NOVA}/portoes-v142-candidata.json`;
const EV = `${REPO}/evidence/p102-gera-candidata-v142-21-11.json`;
if ([SAIDA, REGISTO, EV].some((f) => existsSync(f))) throw new Error('ABORTA: ja existe saida da v142 — use nome novo, nunca por cima');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const B = (s) => Buffer.byteLength(s);
const n = (t, x) => t.split(x).length - 1;
const SUF = (process.argv[2] || 'a').trim();

const txt0 = readFileSync(ORIGEM, 'utf8');
if (!/^P97_CANDIDATA_V141_CAIXA_VAZIA_OK/.test(String(PORTOES_ORIGEM.veredito))) throw new Error('ABORTA: a origem nao tem veredito de candidata v141: ' + PORTOES_ORIGEM.veredito);
if (String((PORTOES_ORIGEM.destino || {}).md5) !== md5(txt0)) throw new Error('ABORTA: md5 da origem nao bate com o registo da P97 — a v141 foi tocada depois de gerada');

// ——— predicação pura do fecho, com os quatro lados provados ———
const decideFecho = ({ mostrar, painelAberto, destino, temNavigate }) => {
  if (mostrar === true) return 'deixar';
  if (painelAberto === false) return 'deixar';
  if (!destino || temNavigate !== true) return 'deixar';
  return 'fechar';
};
if (decideFecho({ mostrar: true, painelAberto: true, destino: 'inicio', temNavigate: true }) !== 'deixar') throw new Error('ABORTA: decideFecho fecha o painel a uma vista que autoriza a secao');
if (decideFecho({ mostrar: false, painelAberto: false, destino: 'inicio', temNavigate: true }) !== 'deixar') throw new Error('ABORTA: decideFcho age com o painel ja fechado');
if (decideFecho({ mostrar: false, painelAberto: true, destino: null, temNavigate: true }) !== 'deixar') throw new Error('ABORTA: decideFecho fecharia sem destino nomeado — ecra em branco');
if (decideFecho({ mostrar: false, painelAberto: true, destino: 'inicio', temNavigate: false }) !== 'deixar') throw new Error('ABORTA: decideFcho fecharia sem navigate no shell');
if (decideFecho({ mostrar: false, painelAberto: true, destino: 'inicio', temNavigate: true }) !== 'fechar') throw new Error('ABORTA: decideFecho nunca fecha — o caso que esta peça existe para resolver');

// ——— o destino, lido do shell nos mesmos bytes (contagem de chavetas, nunca regex do corpo) ———
const iniFb = txt0.indexOf('const fallbackByRole = {');
if (iniFb === -1) throw new Error('ABORTA: nenhum `fallbackByRole` no ar — sem destino nomeado a peça não pode existir');
const iniBr = txt0.indexOf('{', iniFb);
let nivel = 0, fimBr = -1;
for (let i = iniBr; i < txt0.length; i++) { const c = txt0[i]; if (c === '{') nivel++; else if (c === '}') { nivel--; if (nivel === 0) { fimBr = i; break; } } }
if (fimBr === -1) throw new Error('ABORTA: o objecto do fallback não fechou — contagem de chavetas partida');
const LITERAL_FALLBACK = txt0.slice(iniBr, fimBr + 1);
const FALLBACKS = Function('return (' + LITERAL_FALLBACK + ')')();
// O `fallbackByRole` do shell nao tem `teacher` (foi o aborto da 1.ª corrida), por isso o destino segue a ordem
// do proprio shell: primeiro o fallback declarado, depois a primeira secção que o mapa do shell autoriza para a
// vista. Sem nenhum dos dois, nada é fechado — a predica do fecho ja cobre esse caso.
const iniMapa = txt0.indexOf('roleSectionAccess');
const iniBrMapa = txt0.indexOf('{', iniMapa);
let nv = 0, fimBrMapa = -1;
for (let i = iniBrMapa; i < txt0.length; i++) { const c = txt0[i]; if (c === '{') nv++; else if (c === '}') { nv--; if (nv === 0) { fimBrMapa = i; break; } } }
if (iniMapa === -1 || fimBrMapa === -1) throw new Error('ABORTA: nenhum mapa `roleSectionAccess`.recortavel na origem — sem segunda fonte de destino');
const MAPA_ESTATICO = Object.fromEntries([...txt0.slice(iniBrMapa, fimBrMapa + 1).matchAll(/([a-z_]+)\s*:\s*\[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])]));
if (Object.keys(MAPA_ESTATICO).length < 5) throw new Error('ABORTA: o recorte do mapa deu ' + Object.keys(MAPA_ESTATICO).length + ' vistas — a segunda fonte de destino nao esta a ser lida');
const destinoPara = (vista) => (typeof FALLBACKS[vista] === 'string' ? FALLBACKS[vista] : (Array.isArray(MAPA_ESTATICO[vista]) && MAPA_ESTATICO[vista].length ? MAPA_ESTATICO[vista][0] : null));
const FONTE_DESTINO = (vista) => (typeof FALLBACKS[vista] === 'string' ? 'fallbackByRole' : (destinoPara(vista) ? 'primeira_seccao_do_mapa' : 'nenhuma'));
const VISTAS_MEDIDAS = [...new Set(P100.celulas.map((c) => c.active_view))];
if (VISTAS_MEDIDAS.length < 5) throw new Error('ABORTA: ' + VISTAS_MEDIDAS.length + ' vistas medidas pela P100 — o portão do destino seria vacuo');
const vistasSemDestino = VISTAS_MEDIDAS.filter((v) => typeof destinoPara(v) !== 'string');
if (vistasSemDestino.length) throw new Error('ABORTA: sem destino nomeado para ' + JSON.stringify(vistasSemDestino) + ' — fecharia e deixaria o ecrã vazio');

const iniMod = txt0.indexOf('<script data-bfr-municipal-module="1">');
const MOD0 = txt0.slice(iniMod, txt0.indexOf('</script>', iniMod));
const SECT = (/const SECT = '([^']+)'/.exec(MOD0) || [])[1];
const VIEW_ID = (/const VIEW_ID = '([^']+)'/.exec(MOD0) || [])[1];
const PAPEIS_MUN = [...((/const PAPEIS_MUNICIPAIS = \[([^\]]*)\]/.exec(MOD0) || [])[1] || '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (!SECT || !VIEW_ID || !PAPEIS_MUN.length) throw new Error('ABORTA: SECT/VIEW_ID/PAPEIS_MUNICIPAIS nao resolvidos da origem');

const AGULHA_ESCONDE = "document.querySelectorAll('#appShell .content').forEach((v) => { if (v.id !== VIEW_ID) v.classList.add('hidden'); });";
const AGULHA_ABRIR = '  function abrir() {';
const AGULHA_VIS = '  function aplicarVisibilidade() {';
const AGULHA_EXPORT = 'window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aptoParaVista, aplicarVisibilidade';
if (n(txt0, AGULHA_ESCONDE) !== 1) throw new Error('ABORTA: agulha do esconder dos conteudos casa ' + n(txt0, AGULHA_ESCONDE) + ' vezes');
if (n(txt0, AGULHA_ABRIR) !== 1) throw new Error('ABORTA: agulha do abrir() casa ' + n(txt0, AGULHA_ABRIR) + ' vezes');
if (n(txt0, AGULHA_VIS) !== 1) throw new Error('ABORTA: agulha do aplicarVisibilidade() casa ' + n(txt0, AGULHA_VIS) + ' vezes');
if (n(txt0, AGULHA_EXPORT) !== 1) throw new Error('ABORTA: agulha do exporto casa ' + n(txt0, AGULHA_EXPORT) + ' vezes');

const NOVO_ESCONDE = "document.querySelectorAll('#appShell .content').forEach((v) => { if (v.id !== VIEW_ID && !v.classList.contains('hidden')) { v.classList.add('hidden'); CONTEUDOS_ESCONDIDOS.add(v.id); } });";
const CONSTS = '  const CONTEUDOS_ESCONDIDOS = new Set();\n  let ULTIMO_FECHO = null;\n';
const FUNCOES = '  const FALBACKS_DOS_BYTES = ' + LITERAL_FALLBACK + ';\n'
  + '  function painelAberto() { const v = document.getElementById(VIEW_ID); return !!v && !v.classList.contains(\'hidden\'); }\n'
  + '  function fecharPainelForaDaVista(motivo) {\n'
  + '    const rt = RT(); const vista = String(rt.activeView || \'\');\n'
  + '    let destino = FALBACKS_DOS_BYTES[vista];\n'
  + '    if (typeof destino !== \'string\') { const secc = rt.roleSectionAccess && rt.roleSectionAccess[vista]; destino = (Array.isArray(secc) && secc.length) ? String(secc[0]) : null; }\n'
  + '    if (destino === SECT) destino = null;\n'
  + '    const temNavigate = typeof rt.navigate === \'function\';\n'
  + '    if (decideFecho({ mostrar: false, painelAberto: true, destino, temNavigate }) !== \'fechar\') return { fechado: false, destino, motivo: \'sem destino nomeado ou sem navigate: deixo o painel como esta (nada de ecra em branco)\' };\n'
  + '    const v = document.getElementById(VIEW_ID); if (v) v.classList.add(\'hidden\');\n'
  + '    for (const id of Array.from(CONTEUDOS_ESCONDIDOS)) { const el = document.getElementById(id); if (el) el.classList.remove(\'hidden\'); }\n'
  + '    CONTEUDOS_ESCONDIDOS.clear();\n'
  + '    let ok = false; try { ok = rt.navigate(destino) !== false; } catch (e) { ok = false; }\n'
  + '    if (!ok) { if (v) v.classList.remove(\'hidden\'); return { fechado: false, destino, motivo: \'o navigate do shell recusou o destino: reabri o painel, nada ficou em branco\' }; }\n'
  + '    return { fechado: true, destino, motivo };\n'
  + '  }\n'
  + '  const decideFecho = ({ mostrar, painelAberto, destino, temNavigate }) => (mostrar === true || painelAberto === false || !destino || temNavigate !== true ? \'deixar\' : \'fechar\');\n';
const INSERTO_VIS = '    if (!mostrar && painelAberto()) { ULTIMO_FECHO = fecharPainelForaDaVista(\'vista fora do mapa com painel aberto\'); }\n';
const NOVO_EXPORT = 'window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aptoParaVista, aplicarVisibilidade, painelAberto, fecharPainelForaDaVista, ultimoFecho: () => ULTIMO_FECHO, decideFecho';

let txt = txt0;
const t0Inicio = Date.now();
const substituicoes = [];
const sub = (nome, de, para) => { const vezes = n(txt, de); if (vezes !== 1) throw new Error('ABORTA: ' + nome + ' casa ' + vezes + ' vezes'); txt = txt.replace(de, para); substituicoes.push({ nome, vezes, delta_bytes: B(para) - B(de) }); };
sub('consts_do_fecho', AGULHA_ABRIR, CONSTS + AGULHA_ABRIR);
sub('registar_o_que_foi_escondido', AGULHA_ESCONDE, NOVO_ESCONDE);
sub('funcoes_de_fecho', AGULHA_VIS, FUNCOES + AGULHA_VIS);
sub('chamada_no_aplicarVisibilidade', '    const mostrar = veredito.apto && vista.visivel;', '    const mostrar = veredito.apto && vista.visivel;\n' + INSERTO_VIS.trimEnd());
sub('exporto_do_fecho', AGULHA_EXPORT, NOVO_EXPORT);

const compila = (corpo) => { try { new Script(corpo); return true; } catch (e) { return false; } };
const iniModNovo = txt.indexOf('<script data-bfr-municipal-module="1">');
const MODn = txt.slice(iniModNovo, txt.indexOf('</script>', iniModNovo));
const CORPO = (s) => s.slice(s.indexOf('>') + 1);
const CORPO_n = CORPO(MODn);
const CORPO_0 = CORPO(MOD0);
if (!compila(CORPO_0)) throw new Error('ABORTA: o modulo da ORIGEM v141 nao compila — a regua nao mede o que pretende');
if (!compila(CORPO_n)) throw new Error('ABORTA: o modulo gerado nao compila');
if (compila(CORPO_n + ' function {' )) throw new Error('ABORTA: o verificador de compilacao nao tem dentes (aceitou corpo partido)');

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 320)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('o1_a_origem_e_a_v141_certificada', md5(txt0) === PORTOES_ORIGEM.destino.md5 && B(txt0) === PORTOES_ORIGEM.destino.bytes, { lido: { md5: md5(txt0), bytes: B(txt0) }, registado: PORTOES_ORIGEM.destino });
g('o2_as_cinco_substituicoes_casaram_uma_vez', substituicoes.length === 5 && substituicoes.every((s) => s.vezes === 1), substituicoes);
g('o3_a_destinacao_e_byte_a_byte_o_literal_do_shell', n(txt, 'const FALBACKS_DOS_BYTES = ' + LITERAL_FALLBACK + ';') === 1 && Object.keys(FALLBACKS).length >= 9 && n(txt, 'const secc = rt.roleSectionAccess && rt.roleSectionAccess[vista]') === 1, { vistas_no_literal: Object.keys(FALLBACKS).length, bytes_literal: B(LITERAL_FALLBACK), vistas_no_mapa: Object.keys(MAPA_ESTATICO).length });
g('o4_toda_a_vista_medida_pela_P100_tem_destino_nomeado_dos_bytes', vistasSemDestino.length === 0 && VISTAS_MEDIDAS.every((v) => typeof destinoPara(v) === 'string' && destinoPara(v) !== SECT), { vistas: VISTAS_MEDIDAS, sem_destino: vistasSemDestino, destinos: VISTAS_MEDIDAS.map((v) => v + '->' + destinoPara(v) + '[' + FONTE_DESTINO(v) + ']') });
g('o5_a_predica_do_fcho_tem_os_cinco_lados_provados', decideFecho({ mostrar: true, painelAberto: true, destino: 'inicio', temNavigate: true }) === 'deixar' && decideFecho({ mostrar: false, painelAberto: true, destino: null, temNavigate: true }) === 'deixar' && decideFecho({ mostrar: false, painelAberto: true, destino: 'inicio', temNavigate: true }) === 'fechar', { tabela: [['mostrar', 'deixar'], ['sem destino', 'deixar'], ['com destino', 'fechar']] });
g('o6_o_modulo_compila_e_a_regua_de_compilacao_tem_dente', compila(CORPO_n) && compila(CORPO_0) && !compila(CORPO_n + ' function {'), { bytes_corpo_v142: B(CORPO_n), bytes_corpo_v141: B(CORPO_0) });
g('o7_a_v141_nao_perde_nada_do_que_prova_a_caixa_vazia', n(txt, 'const mostrar = veredito.apto && vista.visivel;') === 1 && n(txt, 'function aptoParaVista()') === 1 && n(txt, 'dataset.munVista') === n(txt0, 'dataset.munVista') && n(txt, 'b.dataset.munVista = vista.visivel') === 1, { munVista_na_origem: n(txt0, 'dataset.munVista'), munVista_na_v142: n(txt, 'dataset.munVista') });
const MESAS_AUDIT = [...readFileSync(`${REPO}/scripts/sm4-ddl-municipal-candidata.sql`, 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]).filter((x) => /audit/.test(x));
if (MESAS_AUDIT.length !== 1) throw new Error('ABORTA: ' + MESAS_AUDIT.length + ' mesas de trilha no DDL sm4 - a regua de regressao nao decidiria');
const MESA_AUDIT = MESAS_AUDIT[0];
g('o8_a_sonda_honesta_e_a_trilha_sobrevivem', n(txt, 'sonda.autorizada === true') === n(txt0, 'sonda.autorizada === true') && n(txt, MESA_AUDIT) === n(txt0, MESA_AUDIT) && n(txt, 'sonda.autorizada === true') >= 1 && n(txt, MESA_AUDIT) >= 1, { sonda: n(txt, 'sonda.autorizada === true'), mesa_lida_do_ddl: MESA_AUDIT, trilha: n(txt, MESA_AUDIT), trilha_origem: n(txt0, MESA_AUDIT) });
g('o9_esta_peca_nao_alarga_a_visibilidade_a_nenhuma_vista', n(txt, 'map[papel].concat(SECT)') === n(txt0, 'map[papel].concat(SECT)') && n(txt, "'psychology', 'multiprofissional'") === n(txt0, "'psychology', 'multiprofissional'") && n(txt, SECT) === n(txt0, SECT) && n(txt, "const PAPEIS_MUNICIPAIS = [") === n(txt0, "const PAPEIS_MUNICIPAIS = [") && PAPEIS_MUN.join(',') === 'admin,education_supervisor', { concat: n(txt, 'map[papel].concat(SECT)'), concat_origem: n(txt0, 'map[papel].concat(SECT)'), sect_antes: n(txt0, SECT), sect_depois: n(txt, SECT), extras: n(txt, "'psychology', 'multiprofissional'"), papeis: PAPEIS_MUN });
g('o10_o_fecho_so_esconde_e_navega_os_contadores_de_escrita_do_banco_nao_mudam', n(MODn, 'fetch(') === n(MOD0, 'fetch(') && n(MODn, '.insert(') === n(MOD0, '.insert(') && n(MODn, '.update(') === n(MOD0, '.update(') && n(MODn, '.delete(') === n(MOD0, '.delete(') && n(MODn, 'rpc(') === n(MOD0, 'rpc('), { fetch_antes: n(MOD0, 'fetch('), fetch_depois: n(MODn, 'fetch('), insert_antes: n(MOD0, '.insert('), insert_depois: n(MODn, '.insert('), update_antes: n(MOD0, '.update('), update_depois: n(MODn, '.update('), delete_antes: n(MOD0, '.delete('), delete_depois: n(MODn, '.delete('), rpc: n(MODn, 'rpc(') });
g('o11_o_delta_de_bytes_e_a_soma_das_substituicoes', B(txt) - B(txt0) === substituicoes.reduce((a, s) => a + s.delta_bytes, 0), { delta: B(txt) - B(txt0), soma: substituicoes.reduce((a, s) => a + s.delta_bytes, 0) });
g('o12_nada_foi_publicado_por_esta_peca', (() => { try { const d = readFileSync(`${REPO}/audit-publicacao-v142.json`, 'utf8'); return d.length === 0; } catch (e) { return true; } })(), { diario_v142_existe: false, nota: 'esta peca so escreve a candidata; o deploy e outra peca e outro OK ja dado por ele' });

if (falhas.length) {
  const RED = `${REPO}/evidence/p102-gera-candidata-v142-21-11-${SUF}-VERMELHO.json`;
  if (existsSync(RED)) throw new Error('ABORTA: ' + RED + ' existe — use outro sufixo, nunca por cima');
  writeFileSync(RED, JSON.stringify({ veredito: 'P102_CANDIDATA_V142_VERMELHO ' + falhas.length, sufixo: SUF, falhas, substituicoes }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  process.exit(1);
}
mkdirSync(`${REPO}/${PASTA_NOVA}`, { recursive: true });
writeFileSync(SAIDA, txt);
const relido = readFileSync(SAIDA, 'utf8');
if (md5(relido) !== md5(txt)) throw new Error('ABORTA: a candidata re-lida nao bate com a corrida');
const registo = {
  programa: 'scripts/p102-gera-candidata-v142-painel-na-troca.mjs', em: new Date().toISOString(), duracao_ms: 0,
  pergunta: 'com o painel municipal aberto, trocar para uma vista fora do mapa fecha o painel sem deixar ecra em branco?',
  origem: { pasta: PASTA_ORIGEM, md5: md5(txt0), bytes: B(txt0), veredito_portoes: PORTOES_ORIGEM.veredito },
  destino: { pasta: PASTA_NOVA, md5: md5(txt), bytes: B(txt), delta_bytes: B(txt) - B(txt0) },
  substituicoes, sect: SECT, view_id: VIEW_ID, papeis_municipais: PAPEIS_MUN,
  destino_por_vista_medida: Object.fromEntries(VISTAS_MEDIDAS.map((v) => [v, { destino: destinoPara(v), fonte: FONTE_DESTINO(v) }])),
  fallback_dos_bytes: { vistas: Object.keys(FALLBACKS).length, literal_md5: md5(LITERAL_FALLBACK) },
  portoes: { total: 12, falhas: 0 }, veredito: '',
};
registo.veredito = 'P102_CANDIDATA_V142_PAINEL_NA_TROCA_OK 12/0';
writeFileSync(REGISTO, JSON.stringify(registo, null, 2) + '\n');
writeFileSync(EV, JSON.stringify({ ...registo, duracao_ms: Date.now() - t0Inicio }, null, 2) + '\n');
console.log(`${registo.veredito} · ${B(txt)} B (delta ${B(txt) - B(txt0)}) · ${md5(txt)} · destinos=${VISTAS_MEDIDAS.map((v) => v + '->' + destinoPara(v) + '/' + FONTE_DESTINO(v)).join(',')}`);
