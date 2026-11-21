#!/usr/bin/env node
// P76 — CENSO DE ACESSO ÀS SEÇÕES DECLARADAS, no ar publicado (21/11).
// A grelha desktop P74 deixou 6 vermelhos que não são estouro. Dois deles têm causa nos bytes do bundle, e
// essa causa é verificável sem browser: o módulo de chat interno abre com `if (!allowed()) return;` e o
// roteamento de `fotos` só existe para uma lista de views. Este leitor pergunta ao BUNDLE, não à minha
// memória: extrai as duas listas dos bytes servidos, traduz papel→view com a prédica lida do bundle, e
// CONFRONTA a previsão com as células medidas nos artefactos `ah2-p35d-*`. Se as duas grades divergirem, o
// portão fica vermelho — é isso que distingue «o papel tem um botão que leva a uma seção garantidamente
// vazia» de «a medição falhou». Só-leitura: 0 DDL, 0 deploy, 0 browser, 0 escrita de produto.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a';
const REPO = `${DIR}/bfr-conecta`;
const EV = `${REPO}/evidence`;
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const SUF = (process.argv[2] || '21-11a').trim();
const OUT = `${EV}/p76-censo-acesso-seccoes-${SUF}.json`;
const OUT_R = OUT.replace(/\.json$/, '-VERMELHO.json');
if (existsSync(OUT) || existsSync(OUT_R)) throw new Error('ABORTA: ' + (existsSync(OUT) ? OUT : OUT_R) + ' existe — re-corra com outro sufixo, nunca por cima');

// ——— o ar, conferido antes de contar (diário mais novo → pasta da MESMA versão) ———
const por_versao = (re) => readdirSync(REPO).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = por_versao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
if (!DIARIO) throw new Error('ABORTA: nenhum audit-publicacao-v*.json');
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${DIARIO}`, 'utf8')) || [])[0] + '/';
const V = /v(\d+)/.exec(DIARIO)[1];
const PASTA = por_versao(new RegExp('^worker-deploy-v' + V + '(?!\\d)')).slice(-1)[0];
const ESP_FICH = readdirSync(`${REPO}/${PASTA}`).filter((f) => /^esperado-v\d+\.json$/.test(f)).slice(-1)[0];
const ESPERADO_MD5 = String(JSON.parse(readFileSync(`${REPO}/${PASTA}/${ESP_FICH}`, 'utf8')).htmlMd5 || '').toLowerCase();
const SERVIDO = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
const AR_MD5 = md5(SERVIDO);

// ——— as três listas vivas, extraídas dos bytes e não dactilografadas ———
const iniChat = SERVIDO.indexOf('<script id="bfr-internal-chat"');
if (iniChat === -1) throw new Error('ABORTA: o módulo bfr-internal-chat não está nos bytes servidos');
const CHAT_MOD = SERVIDO.slice(iniChat, SERVIDO.indexOf('</script>', iniChat));
const m_staff = /const STAFF_ROLES = \[([^\]]*)\]/.exec(CHAT_MOD);
const m_allowed = /const allowed = \(\) => STAFF_ROLES\.includes\(role\(\)\) \|\| \(typeof activeView !== 'undefined' && \[([^\]]*)\]\.includes\(activeView\)\)/.exec(CHAT_MOD);
if (!m_staff || !m_allowed) throw new Error('ABORTA: não extraí as duas listas do chat (staff=' + !!m_staff + ' allowed=' + !!m_allowed + ') — a régua passou a ser minha');
const l = (s) => [...s.matchAll(/'([^']+)'/g)].map((x) => x[1]);
const STAFF_ROLES = l(m_staff[1]);
const CHAT_VIEWS = l(m_allowed[1]);
const iniMapa = SERVIDO.indexOf('roleSectionAccess = {');
const bloco = SERVIDO.slice(iniMapa + 'roleSectionAccess = '.length, SERVIDO.indexOf('};', iniMapa) + 1);
const MAPA = {};
for (const m of bloco.matchAll(/'?([a-z_]+)'?\s*:\s*\[([^\]]*)\]/g)) MAPA[m[1]] = l(m[2]);
const m_fotos = /section === 'fotos' && \[([^\]]*)\]\.includes\(activeView\)/.exec(SERVIDO);
if (!m_fotos) throw new Error('ABORTA: o ramo de roteamento de `fotos` não foi encontrado nos bytes — não posso prever o destino do clique');
const FOTOS_VIEWS = l(m_fotos[1]);
const iniTrad = SERVIDO.indexOf('function syncRoleNavigation');
const m_trad = /viewRole = role === 'developer' \? 'admin' : role === 'pedagogical' \? 'teacher' : role === 'psychology' \? 'psychology' : role === 'social_work' \? 'multiprofessional' : role;/.exec(SERVIDO.slice(iniTrad, iniTrad + 2000));
if (!m_trad) throw new Error('ABORTA: a tradução papel→view não está no `syncRoleNavigation` onde a procurei');
const viewDe = (role) => (role === 'developer' ? 'admin' : role === 'pedagogical' ? 'teacher' : role === 'psychology' ? 'psychology' : role === 'social_work' ? 'multiprofessional' : role);

// ——— as prédicas, com fixture que prova que discriminam ———
const chatAberto = (role) => STAFF_ROLES.includes(role) || CHAT_VIEWS.includes(viewDe(role));
const fotosRoteavel = (role) => FOTOS_VIEWS.includes(viewDe(role)) || FOTOS_VIEWS.includes(role);
if (chatAberto('secretary') !== true || chatAberto('naumexiste') !== false) throw new Error('ABORTA: chatAberto não discrimina no fixture');
if (fotosRoteavel('secretary') !== true || fotosRoteavel('naumexiste') !== false) throw new Error('ABORTA: fotosRoteavel não discrimina no fixture');

// ——— as células medidas pela família p35d ———
const ficheiros = readdirSync(EV).filter((f) => /^ah2-p35d-.*\.json$/.test(f)).sort();
const celulas = {};
for (const f of ficheiros) {
  const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
  const p = j.papel; if (!j.stages || !j.stages[p]) continue;
  for (const banda of j.bandas) {
    const st = j.stages[p][banda]; if (!st || !st.peca) continue;
    if (j.md5_shell !== AR_MD5) continue;
    const k = p + '/' + banda;
    celulas[k] = celulas[k] || { papeis: new Set() };
    celulas[k].chat = st.peca['chat-interno'] ? { nos: st.peca['chat-interno'].nos, painel: st.peca['chat-interno'].painel && st.peca['chat-interno'].painel.id, ativa: st.peca['chat-interno'].seccao_ativa } : null;
    celulas[k].fotos = st.peca['fotos'] ? { nos: st.peca['fotos'].nos, painel: st.peca['fotos'].painel && st.peca['fotos'].painel.id, ativa: st.peca['fotos'].seccao_ativa } : null;
    celulas[k].sem_botao = st.sem_botao || [];
    if (st.papel_da_sessao === p || (p === 'developer' && st.papel_da_sessao === 'admin')) celulas[k].papeis.add(p);
  }
}
const unidades = Object.entries(celulas).filter(([, v]) => v.papeis.size === 1).map(([k, v]) => [k.split('/')[0], k.split('/')[1], v]);
const vazias_chat_medidas = unidades.filter(([, , v]) => v.chat && v.chat.nos === 0).map(([p, b]) => p + '/' + b);
const vazias_chat_previstas = unidades.filter(([p, , v]) => v.chat && !chatAberto(p)).map(([p, b]) => p + '/' + b);
const fotos_fora_medidas = unidades.filter(([, , v]) => v.fotos && v.fotos.ativa !== 'fotos').map(([p, b]) => p + '/' + b);
const fotos_fora_previstas = unidades.filter(([p, , v]) => v.fotos && !fotosRoteavel(p)).map(([p, b]) => p + '/' + b);
const censo_sembotao = {};
const por_seccao = {};
for (const [p, b, v] of unidades) for (const s of v.sem_botao) { censo_sembotao[s] = (censo_sembotao[s] || 0) + 1; (por_seccao[s] = por_seccao[s] || { celulas: [], papeis: new Set() }).celulas.push(`${p}/${b}`); por_seccao[s].papeis.add(p); }

const falhas = []; const portoes = [];
const g = (nome, cond, detalhe) => { portoes.push({ nome, verde: !!cond, detalhe }); if (!cond) falhas.push(`${nome} | dado=${JSON.stringify(detalhe).slice(0, 300)}`); console.log(`${cond ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
const por_papel_sembotao = {};
for (const [p, , v] of unidades) (por_papel_sembotao[p] = por_papel_sembotao[p] || new Set()).add(v.sem_botao.slice().sort().join(','));
g('o_ar_conferido_e_o_publicado_no_diario_mais_novo', AR_MD5 === ESPERADO_MD5, { medido: AR_MD5, esperado: ESPERADO_MD5, diario: DIARIO });
g('a_predica_do_chat_prevem_exatamente_as_celulas_medidas_vazias', JSON.stringify(vazias_chat_medidas.slice().sort()) === JSON.stringify(vazias_chat_previstas.slice().sort()), { medidas: vazias_chat_medidas, previstas: vazias_chat_previstas });
g('a_predica_de_fotos_prevem_exatamente_as_celulas_onde_a_secao_nao_fixou', JSON.stringify(fotos_fora_medidas.slice().sort()) === JSON.stringify(fotos_fora_previstas.slice().sort()), { medidas: fotos_fora_medidas, previstas: fotos_fora_previstas });
const mapa_sem_chat = Object.keys(MAPA).filter((k) => MAPA[k].includes('chat-interno') && !chatAberto(k)).sort();
const papeis_medidos_vazios = [...new Set(vazias_chat_medidas.map((u) => u.split('/')[0]))].sort();
g('todo_papel_a_quem_o_mapa_oferece_chat_fica_fora_do_predicado_e_medido_como_celula_vazia', JSON.stringify(mapa_sem_chat) === JSON.stringify(papeis_medidos_vazios), { mapa_oferece_predicado_recusa: mapa_sem_chat, papeis_medidos_vazios: papeis_medidos_vazios });
const censo_diverge = Object.entries(por_papel_sembotao).filter(([, s]) => s.size > 1).map(([k, v]) => `${k}:${[...v].join(' | ')}`);
g('o_censo_de_seccoes_sem_item_nao_depende_da_banda', censo_diverge.length === 0, censo_diverge);
const sem_peca_onde_o_mapa_declara = unidades.filter(([p, , v]) => (MAPA[p] || []).includes('chat-interno') && !v.chat)
  .concat(unidades.filter(([p, , v]) => (MAPA[p] || []).includes('fotos') && !v.fotos))
  .map(([p, b, v]) => `${p}/${b}=${(MAPA[p] || []).includes('chat-interno') && !v.chat ? 'sem_chat' : ''}${(MAPA[p] || []).includes('fotos') && !v.fotos ? 'sem_fotos' : ''}`);
g('toda_celula_cujo_mapa_declara_a_peca_tem_a_peca_medida', sem_peca_onde_o_mapa_declara.length === 0, sem_peca_onde_o_mapa_declara);

const out = {
  programa: 'scripts/p76-censo-acesso-seccoes-desktop.mjs', em: new Date().toISOString(),
  pergunta: 'as células vazias e os cliques que não fixam que a grelha P74 mediu são previstos pelas listas que o próprio bundle usa, ou são falha de medição?',
  metodo: 'leitor só-leitura: extrai `STAFF_ROLES`, a fallback de views de `allowed()`, o ramo `section === fotos` e `roleSectionAccess` dos bytes SERVIDOS; traduz papel→view com a prédica do `syncRoleNavigation` e confronta com os artefactos `ah2-p35d-*` do MESMO md5.',
  ar: { url: URL_APP, diario: DIARIO, md5: AR_MD5, esperado: ESPERADO_MD5, pasta: PASTA },
  listas_lidas_dos_bytes: { staff_roles: STAFF_ROLES, chat_views: CHAT_VIEWS, fotos_views: FOTOS_VIEWS, posicao_do_ramo_fotos: m_fotos.index, posicao_do_modulo_chat: iniChat },
  traducao_lida: m_trad[0],
  celulas_do_mesmo_ar: unidades.length,
  chat: { medidas_vazias: vazias_chat_medidas, previstas_vazias: vazias_chat_previstas, papeis_com_conteudo: [...new Set(unidades.filter(([, , v]) => v.chat && v.chat.nos > 0).map(([p]) => p))].sort() },
  fotos: { medidas_fora_da_secao: fotos_fora_medidas, previstas_fora: fotos_fora_previstas },
  acesso_negado_pelo_mapa: { papeis_a_quem_roleSectionAccess_oferece_chat_interno_mas_allowed_recusa: mapa_sem_chat, papeis_medidos_com_celula_vazia: papeis_medidos_vazios },
  celulas_sem_peca_onde_o_mapa_a_declara: sem_peca_onde_o_mapa_declara,
  papeis_sem_fotos_no_mapa: Object.keys(MAPA).filter((k) => !MAPA[k].includes('fotos')).sort(),
  censo_seccoes_sem_item_no_dom: censo_sembotao,
  desdobramento_por_seccao: Object.fromEntries(Object.entries(por_seccao).sort((a, b) => b[1].celulas.length - a[1].celulas.length).map(([k, v]) => [k, { celulas: v.celulas.length, papeis: [...v.papeis].sort(), o_mapa_declara_a_seccao_ao_papel: Object.fromEntries([...v.papeis].sort().map((p) => [p, (MAPA[p] || []).includes(k)])) }])),
  o_que_este_verde_nao_autoriza: 'Não corrige nada: as duas listas são do bundle publicado e mexer nelas é produto + publicação, que pede OK literal. Prova só que o destino do clique é previsto pelo código servido, e portanto é estado do produto, não defeito do instrumento.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? `P76_CENSO_OK ${portoes.length}/0` : `P76_CENSO_VERMELHO ${falhas.length} de ${portoes.length}`;
if (falhas.length) writeFileSync(OUT_R, JSON.stringify(out, null, 2) + '\n'); else writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`celulas_do_ar=${out.celulas_do_mesmo_ar} · chat vazias medidas=${vazias_chat_medidas.join(',') || 'nenhuma'} previstas=${vazias_chat_previstas.join(',') || 'nenhuma'}`);
console.log(`fotos fora da seção medidas=${fotos_fora_medidas.join(',') || 'nenhuma'} previstas=${fotos_fora_previstas.join(',') || 'nenhuma'}`);
console.log(`censo sem item no DOM = ${JSON.stringify(censo_sembotao)}`);
for (const [s, v] of Object.entries(por_seccao).sort((a, b) => b[1].celulas.length - a[1].celulas.length)) console.log(`  ${s}: ${v.celulas.length} celulas · papeis ${[...v.papeis].sort().join(',')}`);
console.log(`${out.veredito} · registo ${(falhas.length ? OUT_R : OUT)}`);
process.exit(falhas.length ? 1 : 0);
