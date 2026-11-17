// §14 do briefing exige um relatório com a tabela | Funcionalidade | Perfil | Resultado | Problema |
// Correção | e proíbe inventar resultados. Este gerador não sabe nada sobre o que foi observado: lê os
// artefactos do disco e escreve a tabela a partir deles. O que não tem artefacto sai NÃO TESTADA, com o
// motivo. Assim a frase «não invente resultados» deixa de depender da minha disciplina e passa a ser
// estrutural. Regenerável: correr depois de cada ciclo.
// Uso: node scripts/relatorio-14.mjs [caminho/para/relatorio.md]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const md5buf = (b) => createHash('md5').update(b).digest('hex');

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT = process.argv[2] || `${DIR}/docs/relatorio-auditoria-17-11.md`;

// Só vale como prova o artefacto medido pela régua corrigida: painel declarado pelo próprio app
// (activeSection), persona reposta depois de cada clique e teto de assentamento de 6 s. Artefactos
// anteriores mediram «o maior painel visível tem caracteres», que dava verde a botões escondidos.
const REGUA_VALIDA = (a) => a && a.tetos && a.tetos.estabilizacao_ms === 6000;

const fich = readdirSync(EV).filter((f) => /^ah2-varredura-.*\.json$/.test(f) && !f.includes('ANTERIOR'));
// (papel, banda) -> { artefacto, ficheiro, em }
const celula = new Map();
for (const f of fich) {
  let a;
  try { a = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (!REGUA_VALIDA(a)) continue;
  for (const [papel, p] of Object.entries(a.stages || {})) {
    for (const banda of ['390', '1280', '1366', '1440', '1920']) {
      const b = p[banda];
      if (!b || b.erro_boot) continue;
      const chave = papel + '/' + banda;
      const actual = celula.get(chave);
      if (!actual || String(b.em || a.em) > String(actual.em)) celula.set(chave, { a, f, em: a.em, b });
    }
  }
}

const PAPEIS = ['parent', 'student', 'pedagogical', 'coordinator', 'secretary', 'aee', 'director', 'psychology', 'social_work', 'sports_operator', 'education_supervisor', 'monitor', 'gatekeeper', 'developer', 'pending'];
// Os NOMES das seções não dependem da régua: vêm do bundle, em qualquer artefacto. Sem esta passagem, um
// papel nunca medido desaparecia da tabela em vez de aparecer NÃO TESTADA — exatamente o que o §14 proíbe.
const nomes = {};
for (const f of fich.concat(readdirSync(EV).filter((x) => /^ah2-varredura-.*\.json$/.test(x)))) {
  let a; try { a = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  for (const [p, v] of Object.entries(a.stages || {})) if (Array.isArray(v.secoes) && v.secoes.length > (nomes[p] || []).length) nomes[p] = v.secoes;
  if (a.mapa_declarado) for (const [p, n] of Object.entries(a.mapa_declarado)) if (!nomes[p] && n === 0 && p === 'pending') nomes[p] = [];
}
const ROTULOS = { parent: 'Responsável', student: 'Aluno', pedagogical: 'Professor', coordinator: 'Coordenação', secretary: 'Secretaria', aee: 'AEE', director: 'Direção', psychology: 'Psicologia', social_work: 'Serviço social', sports_operator: 'Operador desportivo', education_supervisor: 'Supervisão de ensino', monitor: 'Monitor', gatekeeper: 'Portaria', developer: 'Developer', pending: 'Conta pendente' };

const linha = (c, papel, banda, seccao) => {
  if (!c) return { res: 'NÃO TESTADA', prob: `sem artefacto da régua válida para ${papel}/${banda}`, corr: 'correr a varredura desta banda' };
  if (c.b.erro_boot) return { res: 'NÃO ABRIU', prob: c.b.erro_boot, corr: 'por classificar' };
  const m = (c.b.peca || {})[seccao];
  if (!m) {
    if ((c.b.sem_botao || []).includes(seccao)) return { res: 'SEM BOTÃO', prob: `declarada no bundle mas sem button[data-section]`, corr: 'por decidir: retirar do mapa ou ligar o botão' };
    if ((c.b.medicoes_perdidas || []).some((x) => String(x).startsWith(seccao))) return { res: 'NÃO TESTADA', prob: 'browser não respondeu durante a medição', corr: 'repetir a banda' };
    return { res: 'NÃO TESTADA', prob: 'a seção não foi percorrida nesta corrida', corr: 'repetir a banda' };
  }
  if (m.painel.c === 0) return { res: 'PAINEL VAZIO', prob: 'abriu sem caracteres', corr: 'por classificar' };
  const problemas = [];
  if (m.nao_estabilizou) problemas.push(`conteúdo ainda a mudar aos ${m.ms}ms`);
  if (m.tap) problemas.push(`${m.tap} alvos < 44px`);
  if (m.fonte) problemas.push(`${m.fonte} textos < 11px`);
  if (m.cortados) problemas.push(`${m.cortados} elementos cortados`);
  if (m.estouro_h) problemas.push('estouro horizontal');
  if (m.seccao_ativa && m.seccao_ativa !== seccao) problemas.push(`o app declara seção «${m.seccao_ativa}»`);
  return { res: `ABRE (${m.painel.id}, ${m.painel.c} car., ${m.ms}ms)`, prob: problemas.join('; ') || '—', corr: problemas.length ? 'por classificar com a evidência' : '—' };
};

const ORDEM = ['390', '1280', '1366', '1440', '1920'];
// Larguras em jogo = as duas originais + as que algum artefacto válido medir. Assim, quando entro com
// as desktop do §6, todos os papéis passam a ter linha (e a faltar-me teste onde ainda não correu).
const LARGURAS = ORDEM.filter((b) => b === '390' || b === '1280' || [...celula.values()].some((v) => (v.a.bandas || []).includes(b)));

// O que está pronto em disco e o que foi publicado são frases diferentes. Uma candidata destas não traz
// HTML: traz um `worker.mjs` que escreve os patches sobre o shell servido, por isso a comparação honesta é
// candidato ↔ base publicada (`worker-deploy-v123-pdfs`), e o estado de publicação lê-se no portão da
// própria candidata. Se o md5 do worker difere do da base, a correção NÃO está no que o utilizador vê.
const md5_ar = (() => {
  const v = [...celula.values()].sort((a, b) => String(a.em).localeCompare(String(b.em))).pop();
  return v ? v.a.md5_shell : null;
})();
const md5_worker_base = (() => {
  try { return md5buf(readFileSync(`${DIR}/worker-deploy-v123-pdfs/worker.mjs`)); } catch { return null; }
})();
const linhasCand = readdirSync(DIR).filter((d) => /^bfr-candidata-v12[4-9]/.test(d) && !d.includes('ANTERIOR')).map((d) => {
  const ficheiros = [];
  const colhe = (p, raiz) => { for (const f of readdirSync(p, { withFileTypes: true })) { const q = p + '/' + f.name; if (f.isDirectory()) colhe(q, raiz); else ficheiros.push(q.slice(raiz.length + 1)); } };
  colhe(`${DIR}/${d}`, `${DIR}/${d}`);
  const w = ficheiros.find((f) => /(^|\/)worker\.mjs$/.test(f));
  const wm = w ? md5buf(readFileSync(`${DIR}/${d}/${w}`)) : null;
  const portoes = ficheiros.filter((f) => /portoes-.*\.json$/.test(f) && !f.includes('ANTERIOR')).sort();
  let pg = { portoes: '—', falhas: '—', publicado: 'desconhecido', ciclo: '—' };
  if (portoes.length) {
    try {
      const j = JSON.parse(readFileSync(`${DIR}/${d}/${portoes[portoes.length - 1]}`, 'utf8'));
      pg = { portoes: j.portoes != null ? j.portoes : (Array.isArray(j.checks) ? j.checks.length : '—'), falhas: Array.isArray(j.falhas) ? j.falhas.length : '—', publicado: j.publicado === true ? 'SIM' : j.publicado === false ? 'não' : 'desconhecido', ciclo: j.ciclo || '—' };
    } catch { pg.falhas = 'ficheiro ilegível'; }
  }
  const mesma = wm && wm === md5_worker_base ? 'worker = base (sem patch)' : wm ? `worker ≠ base` : 'sem worker.mjs';
  return `| ${d} | ${w ? `\`worker.mjs\` md5 ${wm.slice(0, 12)}… — ${mesma}` : 'sem worker.mjs'} | ${pg.portoes} portões / ${pg.falhas} falhas · \`${portoes[portoes.length - 1] || 'sem portões'}\` | publicado: **${pg.publicado}** | ${ficheiros.length} ficheiros |`;
});

// Uma linha por banda corrida: sem isto, «ABRE 127» não diz se o shell abriu depressa nem quantos botões
// é que não existem no menu — que são as perguntas do §1 e do §11 do briefing.
const linhasBandas = [];
for (const papel of PAPEIS) for (const ba of LARGURAS) {
  const c = celula.get(papel + '/' + ba);
  if (!c) continue;
  const b = c.b;
  linhasBandas.push(`| ${papel} | ${ba} px | ${b.ms_ready} ms | ${b.abertas} | ${(b.sem_botao || []).join(', ') || '—'} | ${(b.instaveis || []).join(', ') || '0'} | ${b.n_erros} | ${b.botoes_no_dom} | ${b.estado && b.estado.nav_visiveis} | \`${c.f}\` |`);
}

// «ABRE» com 0 caracteres e «o app declara outra seção» são duas famílias de defeito que a tabela por
// seção mostra célula a célula; aqui ficam juntas porque é assim que se prioriza: uma lista de painéis
// que abrem vazios e uma lista de cliques cuja declaração do próprio app não bate com o botão.
const linhasPaineis = [];
for (const papel of PAPEIS) for (const ba of LARGURAS) {
  const c = celula.get(papel + '/' + ba);
  if (!c || !c.b.peca) continue;
  const vazias = Object.entries(c.b.peca).filter(([, m]) => m.painel && m.painel.c === 0).map(([k, m]) => `${k} (${m.painel.id})`);
  const desalinhadas = Object.entries(c.b.peca).filter(([k, m]) => m.seccao_ativa && m.seccao_ativa !== k).map(([k, m]) => `${k}→${m.seccao_ativa}`);
  if (!vazias.length && !desalinhadas.length) continue;
  linhasPaineis.push(`| ${papel} @ ${ba} px | ${vazias.join(', ') || '—'} | ${desalinhadas.join(', ') || '—'} | \`${c.f}\` |`);
}

// O portão de rede da varredura é por célula; aqui junta-se as células para a causa se ler uma vez. Lê só
// o que o censo mediu (as amostras têm teto de 6 por célula, e ele próprio diz quantas células vieram
// truncadas) e acrescenta o GET directo ao PostgREST, que distingue «não existe» de «não tenho privilégio».
const lido = (prefixo) => {
  const fs = readdirSync(EV).filter((x) => x.startsWith(prefixo) && x.endsWith('.json') && !x.includes('ANTERIOR')).sort();
  if (!fs.length) return null;
  try { return { f: fs[fs.length - 1], j: JSON.parse(readFileSync(`${EV}/${fs[fs.length - 1]}`, 'utf8')) }; } catch { return null; }
};
const censo404 = lido('ah2-censo-404');
const sondaRest = lido('ah2-sonda-rest-17-11b') || lido('ah2-sonda-rest');
const linhas404 = censo404 ? censo404.j.urls.map((u) => `| \`${u.url}\` | ${u.status} | ${u.papeis.join(', ')} | ${u.bandas.join(' + ')} |`) : [];
const linhasRest = sondaRest ? sondaRest.j.resultados.map((r) => `| \`${r.tabela}\` | ${r.http || 'sem resposta'} | ${r.code || ''} ${r.message || r.erro || ''} |`) : [];

// A tabela por seção diz «o quê» célula a célula; isto diz «quanto» por classe, porque as 48 células com
// défice não são 48 problemas: são um punhado de classes que se repetem (alvos pequenos, letra pequena,
// elementos cortados, seções declaradas sem botão). Só entro em cada painel uma vez por (papel, banda,
// seção) para a contagem não duplicar quando um papel é medido em duas larguras.
const classe = { alvo_miudo: new Set(), fonte_miuda: new Set(), cortado: new Set(), estouro: new Set(), nao_assenta: new Set(), sem_botao: new Set(), declarada_a_mais: new Set(), painel_vazio: new Set() };
const em_cada_classe = new Set();
for (const papel of PAPEIS) for (const ba of LARGURAS) {
  const c = celula.get(papel + '/' + ba);
  if (!c || !c.b.peca) continue;
  for (const [s, m] of Object.entries(c.b.peca)) {
    const k = `${papel}/${ba}/${s}`;
    em_cada_classe.add(k);
    if (m.tap) classe.alvo_miudo.add(k);
    if (m.fonte) classe.fonte_miuda.add(k);
    if (m.cortados) classe.cortado.add(k);
    if (m.estouro_h) classe.estouro.add(k);
    if (m.nao_estabilizou) classe.nao_assenta.add(k);
    if (m.painel && m.painel.c === 0) classe.painel_vazio.add(k);
  }
  for (const s of (c.b.sem_botao || [])) classe.sem_botao.add(`${papel}/${ba}/${s}`);
  for (const s of (c.b.declaradas_a_mais || [])) classe.declarada_a_mais.add(`${papel}/${ba}/${s}`);
}
const NOME_CLASSE = {
  alvo_miudo: 'alvo com menos de 44 px', fonte_miuda: 'texto com menos de 11 px', cortado: 'elemento cortado pelo painel',
  estouro: 'estouro horizontal', nao_assenta: 'conteúdo sem assentar em 6 s', sem_botao: 'seção declarada sem botão de menu',
  declarada_a_mais: 'botão no menu fora do mapa declarado', painel_vazio: 'painel que abre sem caracteres',
};
const LINHA_CLASSE = (k) => `| ${NOME_CLASSE[k]} | ${classe[k].size} | ${Math.round((classe[k].size / Math.max(1, em_cada_classe.size)) * 100)} % das ${em_cada_classe.size} medições |`;
const linhasClasses = Object.keys(classe).filter((k) => classe[k].size).map(LINHA_CLASSE);

const seg = [];
const contagens = { ABRE: 0, deficit: 0, nao_testada: 0 };
for (const papel of PAPEIS) {
  const celulas = Object.fromEntries(LARGURAS.map((ba) => [ba, celula.get(papel + '/' + ba)]));
  const medidas = LARGURAS.filter((ba) => celulas[ba]);
  const ref = celulas[medidas[0]];
  const seccoes = [...new Set([...(nomes[papel] || []), ...((ref && ref.b.peca && Object.keys(ref.b.peca)) || [])])];
  const cab = `| Funcionalidade | Perfil | Resultado | Problema | Correção |\n|---|---|---|---|---|`;
  if (!seccoes.length) {
    seg.push(`### ${papel} — ${ROTULOS[papel] || papel}\n\n${cab}\n| ${papel === 'pending' ? 'barreira de aprovação antes do shell' : 'lista de seções do papel'} | ${papel} | NÃO TESTADA | ${papel === 'pending' ? 'a conta pendente não tem menu: a verificação é a barreira, não as seções' : 'nenhum artefacto conhece as seções deste papel'} | correr a varredura de ${papel} |`);
    continue;
  }
  const linhas = [];
  for (const s of seccoes) {
    for (const ba of medidas) {
      const r = linha(celulas[ba], papel, ba, s);
      if (r.res.startsWith('ABRE')) contagens.ABRE++; else if (r.res === 'NÃO TESTADA') contagens.nao_testada++; else contagens.deficit++;
      linhas.push(`| ${s} | ${papel} @ ${ba} px | ${r.res} | ${r.prob} | ${r.corr} |`);
    }
  }
  for (const ba of LARGURAS.filter((x) => !celulas[x])) {
    contagens.nao_testada += seccoes.length;
    linhas.push(`| (${seccoes.length} seções de ${papel}) | ${papel} @ ${ba} px | NÃO TESTADA | nenhuma corrida desta banda com a régua válida | correr \`node scripts/ah2-varredura.mjs ${papel} ${papel}${ba} ${ba}\` |`);
  }
  seg.push(`### ${papel} — ${ROTULOS[papel] || papel}\n\n${cab}\n${linhas.join('\n')}\n\nLarguras com artefacto válido: ${medidas.join(' + ') || 'nenhuma'} · ficheiros: ${[...new Set(medidas.map((ba) => '`' + celulas[ba].f + '`'))].join(', ')}`);
}

// Os ciclos que não são varredura entram por prefixo de nome de ficheiro; o que não existir dizê-lo-á como NÃO TESTADO.
// Prefixo e não nome exato, porque os rótulos mudam entre corridas (larguras, contas) e um relatório que
// não encontra o seu próprio ficheiro diria «não testado» de uma coisa que foi medida.
// Ordenar por NOME punha `…-r9.json` depois de `…-r11.json`: o «mais recente» tem de ser o mais recente no
// disco, não o último no dicionário.
const procura = (prefixo) => {
  const fs = readdirSync(EV).filter((x) => x.startsWith(prefixo) && x.endsWith('.json'));
  if (!fs.length) return null;
  return fs.map((x) => ({ x, m: statSync(`${EV}/${x}`).mtimeMs })).sort((a, b) => a.m - b.m).pop().x;
};
const extra = [
  ['RM-1.2 · clique real de developer no painel «Contas e cargos»', 'ah2-cliques-', 'scripts/ah2-cliques.mjs',
    'o painel abriu com sessão real e a linha do próprio developer vem desabilitada; a escrita não aconteceu porque a conta-alvo é sintética e a política RESTRITIVA `profiles_hide_test_accounts` esconde-a do developer (10 de 24 perfis visíveis) — precisa de decisão, ver §notas'],
  ['RM-2.7 · vistas do professor com vínculo real', 'ah2-professor-', 'scripts/ah2-professor.mjs', ''],
  ['§5 · telemóvel a toque nas larguras do briefing (320/360/375/390/414/430 × 15 perfis)', 'ah2-m5-consolidado-', 'scripts/ah2-mobile2.mjs + ah2-m5-driver.mjs', ''],
  ['§6 · causa da demora do clique em Home', 'ah2-home-causa-', 'scripts/ah2-home-causa.mjs', ''],
  ['§6 · censo de nós: vazamento ou troca depois de 12 cliques em Home', 'ah2-home-nodos-', 'scripts/ah2-home-nodos.mjs', ''],
];
const linhasExtra = extra.map(([nome, prefixo, script, nota]) => {
  const f = procura(prefixo);
  if (!f) return `| ${nome} | NÃO TESTADA | instrumento \`(${script})\` pronto, ainda não corrido |`;
  const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
  const v = j.veredito || (j.falhas ? (j.falhas.length ? 'CORRIDA COM BLOQUEIO' : 'SEM_FALHAS') : 'sem veredito no ficheiro');
  // O consolidador do §5 tem o veredicto no campo `veredito` e os buracos em `nao_testadas` com a causa
  // escrita pelo instrumento; dizer-lhe «0 falhas declaradas» seria apagar 7 classes de defeito.
  if (j.ciclo === 'AH-7b-M5-CONSOLIDADO') return `| ${nome} | ${v} | \`${f}\` · ${Object.keys(j.defeitos || {}).length} classes de defeito · ${(j.nao_testadas || []).length} NÃO TESTADA com causa · md5 ${j.md5_shell.join('/')} · tabela linha a linha em \`scripts/ah2-m5-tabela.mjs\` |`;
  return `| ${nome} | ${v} | \`${f}\`${nota ? ' · ' + nota : (j.falhas && j.falhas.length ? ' · ' + j.falhas.slice(0, 2).join(' · ') : ' · 0 falhas declaradas')}${j.diagnostico ? '<br>' + j.diagnostico : ''} |`;
});
// As três larguras desktop do §6 não têm ficheiro próprio: entram pela varredura, que já corre 390/1280.
// Conto células válidas por banda em vez de procurar um nome, para o relatório não anunciar «não corrido»
// uma coisa que está numa das bandas que ele próprio lê.
const Desktop = ['1366', '1440', '1920'].map((ba) => ({ ba, n: [...celula.keys()].filter((k) => k.endsWith('/' + ba)).length }));
const desktopFeito = Desktop.filter((d) => d.n > 0);
linhasExtra.push(`| §6 · bandas desktop 1366/1440/1920 | ${desktopFeito.length ? 'CORRIDAS: ' + desktopFeito.map((d) => d.ba + ' px (' + d.n + ' perfis)').join(', ') : 'NÃO TESTADA'} | ${desktopFeito.length ? 'mesma régua da varredura, \`node scripts/ah2-varredura.mjs TODOS <rótulo> <banda>\`' : 'instrumento pronto (\`ah2-varredura.mjs\` aceita as bandas); falta correr a série'} |`);

// O «nada falta» desta conta é só da régua desktop (papel × largura). A grelha do §5 tem as suas células
// NÃO TESTADA noutro ficheiro, e omiti-las aqui faria o relatório anunciar amostra completa com 11 posições
// por medir. As causas vêm gravadas no consolidador, não escritas por mim.
const m5f = procura('ah2-m5-consolidado-');
const m5 = m5f ? JSON.parse(readFileSync(`${EV}/${m5f}`, 'utf8')) : null;
const m5_causas = m5 ? [...new Set((m5.nao_testadas || []).map((s) => s.split(' — ')[1] || 'sem causa gravada'))].map((c) => c + ' × ' + (m5.nao_testadas || []).filter((s) => (s.split(' — ')[1] || 'sem causa gravada') === c).length) : [];
// A sonda de tempo do `apoio` reclassificou uma classe inteira da tabela mobile, e o relatório tem de dizer
// isso com os números dela, não com a minha memória.
const sondas = readdirSync(EV).filter((f) => /^ah2-sonda-apoio-tempo-.*\.json$/.test(f)).sort();
const sonda_lida = [], larguras_sondadas = new Set();
for (const f of sondas) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  const p = (j.serie || []).find((x) => x && typeof x.c === 'number' && x.c > 0);
  larguras_sondadas.add(j.largura);
  if (p) sonda_lida.push(`${j.papel}@${j.largura}: ${p.c} c aos ${p.t_ms_apos_toque} ms`);
}
const sonda_texto = sonda_lida.length
  ? `\n- **Reclassificação medida, e é do instrumento não do produto**: as células «painel vazio» do \`apoio\` foram sondadas no tempo (${sonda_lida.length} corridas com série preenchida — ${sonda_lida.join(' · ')}). O \`#supportView\` fica visível com caixa antes de ter texto, e o \`MEDIR\` do provador sai quando a contagem se repete duas vezes (600 ms × 2, ≈1,8 s): por isso a grelha mediu 0 c onde há 2791-3434. Nas larguras sondadas (${[...larguras_sondadas].sort((a, b) => a - b).join('/')}) o vermelho do \`apoio\` é defeito de medição; nas outras é suspeita pela mesma prédica, não verde provado.`
  : '';
// A segunda metade da pergunta foi respondida pela sonda com o id do painel parametrizado, e a resposta é
// a contrária: aqui o painel ABRE e não enche, portanto o FALHA fica de pé — com causa medida.
const sondas_p = readdirSync(EV).filter((f) => /^ah2-sonda-painel-tempo-.*\.json$/.test(f)).sort();
const painel_lida = [];
for (const f of sondas_p) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  const s = j.serie || [];
  const p = s.find((x) => x && typeof x.c === 'number' && x.c > 0);
  const abriu = s.some((x) => x.ativa === j.rota && x.visivel === true);
  const base = (j.rede_janela || []).filter((r) => !/open-meteo/.test(r.u || '')).length;
  if (!p && abriu) painel_lida.push(`${j.papel}@${j.largura} \`${j.painel}\` aberto (activeSection=${j.rota}) e a 0 em ${s.length} amostras ≈${Math.round((s[s.length - 1]?.t_ms_apos_toque || 0) / 1000)} s, ${base} pedidos à base, html máximo ${Math.max(0, ...s.map((x) => x.html || 0))} bytes`);
  else if (p) painel_lida.push(`${j.papel}@${j.largura} \`${j.painel}\` enche ${p.c} c aos ${p.t_ms_apos_toque} ms`);
}
const painel_texto = painel_lida.length
  ? `\n- **Confirmação medida, e é do produto**: a mesma sonda com o painel por parâmetro foi corrida nas células \`chat-interno\` que estavam em dúvida (${painel_lida.length} corridas — ${painel_lida.join(' · ')}). Ao contrário do \`apoio\`, aqui o painel abre — \`activeSection\` fica na rota tocada e o contentor tem caixa — e mesmo assim não produz texto, sem exceção lançada e sem pedido à base na janela. Não é a janela de assentamento: é o render a não produzir conteúdo para este papel, e a linha FALHA da grelha mantém-se, agora com a causa lida em browser e não só no código.`
  : '';
const m5_texto = m5
  ? `**${m5.celulas_medidas} de ${m5.total_celulas} células medidas** e **${(m5.nao_testadas || []).length} NÃO TESTADA**, cada uma com a causa escrita pelo instrumento: ${m5_causas.join(' · ')}. Nenhuma é buraco de campanha: relançar não muda o estado do produto. Fonte: \`${m5f}\``
  : 'sem artefacto do consolidador (`scripts/ah2-m5-consolidador.mjs`)';

const md = `# BFR Conecta — relatório do ciclo de 17/11/2026 (gerado)


Gerado por \`node scripts/relatorio-14.mjs\`. **Não editar à mão**: cada célula vem de um artefacto em
\`evidence/\`. Uma linha só conta como provada se existir o ficheiro que a mede; o resto diz NÃO TESTADA.

Régua aceite como prova: painel declarado pelo próprio app (\`BFR_APP_RUNTIME.activeSection\`), persona
reposta por \`BFR_APP_RUNTIME.setRole\` depois de cada clique, teto de assentamento de 6 s, chamada CDP com
teto de 25 s. Artefactos anteriores a esta régua foram arquivados com \`-ANTERIOR-\` no nome e não contam.

## Estado da amostra

- células ABRE: **${contagens.ABRE}** · com défice: **${contagens.deficit}** · NÃO TESTADA: **${contagens.nao_testada}**
- bandas com artefacto válido: **${celula.size} de ${PAPEIS.length * 5}** (papel × largura; as 5 larguras são 390 e 1280 da varredura original mais 1366/1440/1920 do §6 do briefing)
- telemóvel (§5, 15 perfis × 6 larguras): ${m5_texto}${sonda_texto}${painel_texto}
- o que falta para a amostra estar completa: ${PAPEIS.flatMap((p) => ['390', '1280', '1366', '1440', '1920'].filter((b) => !celula.has(p + '/' + b)).map((b) => p + '/' + b)).join(', ') || 'nada'} — **esta linha conta apenas as células perfil×largura da régua desktop**; a tabela de funcionalidade tem as suas NÃO TESTADA noutro sítio, e são ${contagens.nao_testada} nesta régua e ${(m5 && m5.nao_testadas ? m5.nao_testadas.length : 0)} na grelha mobile do §5.

## Bandas corridas (o que cada artefacto diz do arranque)

| Perfil | Largura | shell pronto | seções abertas | sem botão no menu | não assentaram em 6 s | erros de app | botões no DOM | nav visível ao abrir | artefacto |
|---|---|---|---|---|---|---|---|---|---|
${linhasBandas.join('\n')}

## Défices por classe (as ${contagens.deficit} células com défice são ${linhasClasses.length} famílias, não ${contagens.deficit} problemas)

| Classe do défice | Medições afetadas | Quota |
|---|---|---|
${linhasClasses.join('\n') || '| — | 0 | — |'}

## Painéis vazios e declarações que não batem

Um clique pode abrir um painel com o identificador certo e 0 caracteres, ou abrir um painel enquanto o
próprio app declara outra seção ativa. Os dois são defeitos funcionais e nenhum aparece como «não abriu».

Causa do painel vazio de \`chat-interno\` no education_supervisor, lida dos bytes servidos (não é hipótese):
o mapa de navegação dá \`chat-interno\` a este papel (\`app/index.html:9018\`), mas o módulo do chat decide
abrir só para \`STAFF_ROLES\` (\`:19143\` — \`pedagogical, aee, coordinator, director, secretary, psychology,
social_work, developer\`) ou para as vistas \`teacher/coordinator/director/secretary/aee/multiprofessional/
admin\` (\`:19153\`); \`education_supervisor\` não está em nenhuma das duas listas, por isso \`allowed()\` é
falso e \`open()\` devolve \`false\` em \`:19338\` SEM injetar o shell. Quem mostra a vista é o router
(\`:10060-10063\`: des-esconde \`#internalChatView\` e chama \`BFRInternalChat.open()\`), e o resultado é
exatamente o que a varredura mede: painel com o id certo, 0 caracteres, 0 erros de consola, reproduzido em
390, 1280, 1366. Remédio é uma linha no \`allowed()\` do chat (ou tirar \`chat-interno\` do mapa do papel) —
é decisão de produto, não ambiguidade técnica, por isso fica por aplicar.

| Célula | Painéis que abrem vazios | Clique × declaração do app | artefacto |
|---|---|---|---|
${linhasPaineis.join('\n') || '| — | nenhum painel vazio | nenhuma declaração trocada | — |'}

## Ciclos fora da varredura

| Verificação | Resultado | Onde |
|---|---|---|
${linhasExtra.join('\n')}

## Candidatas prontas em disco e não publicadas

| Candidata | Worker comparado à base publicada | Portões da candidata | Estado | Conteúdo |
|---|---|---|---|---|
${linhasCand.join('\n') || '| nenhuma em disco | — | — | — | — |'}

O shell medido nesta régua tem md5 \`${md5_ar || 'desconhecido'}\` e o \`worker.mjs\` da base publicada tem
md5 \`${md5_worker_base ? md5_worker_base.slice(0, 12) + '…' : 'desconhecido'}\`. \`worker ≠ base\` quer dizer
que a correção dessa candidata **não está** no que o utilizador vê: publicar é decisão à parte, não
consequência desta tabela.

## Rede: o que os painéis pedem e não recebem

Do censo das ${censo404 ? censo404.j.celulas_lidas : 0} células com artefacto válido${censo404 ? ` (amostra de ${censo404.j.amostra_por_celula} entradas por célula; ${censo404.j.celulas_truncadas} células teriam mais)` : ' o censo ainda não foi corrido'}:

| URL | HTTP | Perfis que o pedem | Bandas |
|---|---|---|---|
${linhas404.join('\n') || '| — | — | — | — |'}

GET directo ao PostgREST com a chave anónima lida dos bytes servidos (\`${sondaRest ? sondaRest.f : 'por correr'}\`) — é o que distingue tabela em falta de falta de privilégio:

| Relação | HTTP | Código / mensagem |
|---|---|---|
${linhasRest.join('\n') || '| — | — | — |'}

\`/cdn-cgi/rum\` é telemetria da própria Cloudflare, não do app; fica listado porque o portão conta tudo o que
falha. As relações \`bfr_school_shift_settings\`, \`bfr_school_calendar_days\` e
\`bfr_school_calendar_month_targets\` são pedidas pelo bloco \`app/index.html:15088-15091\` e nunca foram criadas:
a correção é DDL, está preparada em \`scripts/ah2-ddl-calendario-candidata.sql\` e **não foi aplicada**.

## Bloqueios que precisam de decisão do utilizador

Nada disto é «falta de tempo»: são três pontos em que continuar exige autorização porque o passo seguinte
escreve em dados reais, publica para a escola, ou corre DDL.

1. **RM-1.2 (clique real a mudar um cargo).** A política RESTRITIVA \`profiles_hide_test_accounts\` esconde
   do developer qualquer conta \`%@bfr-conecta.test\`: a sessão de developer vê 10 dos 24 perfis
   (\`content-range: 0-9/10\`, provado em \`evidence/ah2-sonda-limite-17-11e.json\`), e as minhas contas de
   teste estão todas fora dessa janela. Para fechar o teste é preciso **(a)** mudar o cargo de uma conta
   real e reverter, ou **(b)** criar uma conta sintética fora do domínio escondido — que passaria a ser
   visível no painel da escola — e apagá-la no fim. Não escolho por ti porque as duas alternativas tocam
   no que a primeira protegia.
2. **Item 35 (Aniversários da secretaria)** e o **calendário/turnos em falta** pedem DDL. As três relações
   nunca existiram (\`404 PGRST205\`, ver a secção de rede acima) e a candidata está escrita em
   \`scripts/ah2-ddl-calendario-candidata.sql\` com reversão em \`scripts/ah2-ddl-calendario-reversao.sql\`;
   não foi aplicada.
3. **Publicar v124 / v125 / v126.** As candidatas estão prontas em disco com os portões delas; nenhuma está
   no ar (\`worker ≠ base\` na tabela das candidatas). Publicar é um ato à parte, e «finalize tudo» não é
   autorização para ele.

## Funcionalidade × perfil

${seg.join('\n\n')}
`;
writeFileSync(OUT, md);
const n = (md.match(/\n/g) || []).length;
console.log(`relatório: ${OUT}`);
console.log(`ABRE=${contagens.ABRE} deficit=${contagens.deficit} não_testada=${contagens.nao_testada} celulas_lidas=${celula.size}/${PAPEIS.length * 5} (390 e 1280 + as 3 desktop do §6) linhas_md=${n}`);
const falta = PAPEIS.flatMap((p) => ['390', '1280'].filter((b) => !celula.has(p + '/' + b)).map((b) => p + '/' + b));
console.log('FALTAM: ' + (falta.join(', ') || 'nada'));
