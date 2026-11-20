// BU-5 (v3): deriva o estado das 17 unidades do registro a partir do que esta medido em disco.
// So-leitura. Nada neste ficheiro escreve no banco, publica ou altera produto.
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SUF = process.env.BU5U_SUF || '';
const JSON_OUT = `${DIR}/evidence/bu5-unidades-do-roadmap${SUF}-20-11.json`;
const TXT_OUT = `${DIR}/evidence/bu5-unidades-do-roadmap${SUF}-20-11.txt`;
if (fs.existsSync(JSON_OUT) || fs.existsSync(TXT_OUT)) throw new Error(`ABORTA: ${JSON_OUT} já existe — correr com BU5U_SUF novo`);

const ler = (p) => JSON.parse(fs.readFileSync(`${DIR}/${p}`, 'utf8'));
const bu5 = ler('evidence/bu5-portas-do-ar-20-11.json');
const bu3 = ler('evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json');
const p73 = ler('evidence/p73-cobertura-m5-por-ar-20-11.json');
const sm25 = ler('evidence/sm25-cobertura-desktop-20-11.json');
const bu4 = ler('evidence/bu4-digestao-para-documentacao-20-11.json');
const bu2c = ler('evidence/bu2c-caminhos-de-autorizacao-20-11c.json');
const registroTxt = fs.readFileSync(`${DIR}/docs/roadmap-master.md`, 'utf8').split(/\r?\n/);

const AR = bu5.bundle.md5;
const DIA_DA_ANALISE = '2026-11-20';
const PAPEL_DE_PREVIEW = 'developer';
const REGIOES = new Map(bu3.regioes.map((r) => [r.nome, r]));
const HELPERS = new Set(bu2c.helpers.map((h) => h.nome));
const POR_PAPEL = bu4.autorizacao.por_papel;

const celulasDeLinha = (l) => {
  const out = [];
  let cur = '';
  for (let i = 0; i < l.length; i += 1) {
    if (l[i] === '\\' && l[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (l[i] === '|') { out.push(cur.trim()); cur = ''; continue; }
    cur += l[i];
  }
  out.push(cur.trim());
  return out.slice(1, -1);
};
const celulasNaive = (l) => l.split('|').map((s) => s.trim()).slice(1, -1);

const GRUPO_DE_REGISTRO = new Map();
const TITULOS_DO_REGISTRO = new Map();
let grupoActual = null;
let nLinhasComPipeEscapado = 0;
for (const l of registroTxt) {
  if (/\\\|/.test(l)) nLinhasComPipeEscapado += 1;
  const h = l.match(/^### (5\.\d+) (.*)$/);
  if (h) { grupoActual = h[1]; TITULOS_DO_REGISTRO.set(h[1], h[2]); GRUPO_DE_REGISTRO.set(h[1], []); continue; }
  const it = l.match(/^\| ([A-Z][A-Z0-9]{0,3}\.\d+) \|/);
  if (it && grupoActual) {
    const c = celulasDeLinha(l);
    GRUPO_DE_REGISTRO.get(grupoActual).push({ id: it[1], titulo: c[1], codigo: c[2], evidencia: c[3], observacoes: c[4], ncolunas_naive: celulasNaive(l).length, ncolunas: c.length });
  }
}
const totalItens = [...GRUPO_DE_REGISTRO.values()].reduce((a, b) => a + b.length, 0);

const PEN = new Map();
const PEN_ID_DA_LINHA = (c) => c[0].replace(/\s*\(.*\)\s*$/, '').trim();
for (const l of registroTxt) {
  if (!/^\| PEN-\d+/.test(l)) continue;
  const c = celulasDeLinha(l);
  if (c.length === 5) PEN.set(PEN_ID_DA_LINHA(c), { item: c[1], tipo: c[2], prioridade: c[3], estado: c[4], colunas: c.length });
}

const portasMedidas = new Map();
for (const [papel, destinos] of Object.entries(bu5.destinos_por_papel))
  for (const d of destinos) {
    const rota = d.split('«')[0];
    if (!portasMedidas.has(rota)) portasMedidas.set(rota, new Set());
    portasMedidas.get(rota).add(papel);
  }

const TRANSVERSAIS = ['inicio', 'more', 'notificacoes', 'conteudos'];
const RUNTIME_COMPARTIDO = ['bfr-core-runtime'];
const APRESENTACAO_TRANSVERSAL = ['bfr-lia-image-avatar', 'bfr-lia-logo-asset', 'bfr-lia-logo-component', 'bfr-final-published-asset-fix'];

// grupo, rotulo declarado, portas proprias, regioes por nome exato, regua de prova
const UNIDADES = [
  ['5.1', 'Autenticação e sessão', [], ['bfr-login-bootstrap', 'bfr-install-runtime', 'bfr-deferred-module-bootstrap', 'bfr-fouc-guard-js'], 'conteudo'],
  ['5.2', 'Navegação e estrutura', ['inicio', 'more', 'notificacoes', 'conteudos'], ['bfr-platform-shell', 'bfr-global-scroll-bridge', 'bfr-route-scroll-memory', 'bfr-mobile-a11y', 'bfr-motion-runtime', 'bfr-lia-runtime', 'bfr-core-fallbacks'], 'conteudo'],
  ['5.3', 'Área do aluno', ['aprender', 'evoluir', 'escola', 'meu-espaco', 'notas', 'boletim', 'biblioteca', 'atividades', 'horarios', 'jogos', 'resultados-aprendizagem', 'fotos'], ['bfr-student-today.js', 'bfr-student-registration-quick.js', 'bfr-activity-center-inline', 'bfr-reading-library-inline', 'bfr-reading-integration', 'bfr-unified-library-catalog', 'bfr-portal-upgrades.js', 'bfr-profile-photo'], 'conteudo'],
  ['5.4', 'Responsáveis', ['agenda', 'apoio', 'ocorrencias', 'secretaria', 'escola', 'meu-espaco', 'notas'], ['bfr-parent-dashboard-v3', 'bfr-parent-refinement', 'bfr-parent-navigation-v2', 'bfr-parent-teachers-script', 'bfr-parent-weather-order', 'bfr-weather-premium.js', 'bfr-global-weather-placement', 'bfr-agenda-copy'], 'conteudo'],
  ['5.5', 'Professor', ['professor-inicio', 'professor-turmas', 'professor-frequencia', 'professor-avaliacoes', 'professor-atividades', 'professor-diario', 'professor-planejamento', 'professor-comunicacao', 'professor-relatorios', 'professor-calendario', 'professor-conteudos', 'professor-biblioteca', 'professor-agenda', 'professor-espaco', 'professor-notificacoes', 'resultados-aprendizagem'], ['bfr-teacher-command-center.js'], 'conteudo'],
  ['5.6', 'Coordenação', ['coordenacao', 'ocorrencias', 'relatorios', 'atividades', 'cadastro-alunos', 'jogos-escolares', 'comunicacao', 'chat-interno', 'fotos', 'apoio', 'aee'], ['bfr-coordination-central', 'bfr-coordination-command', 'bfr-coordination-dashboard-v3', 'bfr-coordination-density-v4', 'bfr-coordination-realtime-v2', 'bfr-coordination-ux', 'bfr-coordination-collapsible'], 'conteudo'],
  ['5.7', 'Direção', ['direcao', 'director:overview', 'director:students', 'director:pedagogical', 'director:communication', 'coordenacao', 'relatorios', 'ocorrencias', 'fotos'], ['bfr-direction-command-runtime', 'bfr-director-routine-runtime', 'bfr-direction-action-fallback', 'bfr-direction-retry-fallback', 'bfr-direction-patch-js', 'bfr-director-safe-actions', 'bfr-admin-schedule-central-v5.js'], 'conteudo'],
  ['5.8', 'Secretaria Escolar', ['secretaria', 'cadastro-alunos', 'relatorios', 'fotos', 'apoio', 'comunicacao'], ['bfr-secretary-central.js'], 'conteudo'],
  ['5.9', 'Supervisão Educacional (Secretaria de Educação)', ['secretaria', 'resultados-aprendizagem'], ['bfr-results-learning-module'], 'conteudo'],
  ['5.10', 'Monitor (transporte)', ['monitor', 'ocorrencias'], ['bfr-monitor-central.js'], 'conteudo'],
  ['5.11', 'Porteiro', ['gate', 'horarios'], ['bfr-vespertino-schedule.js'], 'conteudo'],
  ['5.12', 'AEE / Psicologia / Serviço Social', ['aee', 'psychology', 'multiprofissional', 'apoio', 'chat-interno'], ['bfr-support-runtime', 'bfr-aee-pdi-entry'], 'conteudo'],
  ['5.13', 'Jogos Escolares', ['jogos-escolares', 'jogos'], [], 'conteudo'],
  ['5.14', 'Comunicação e plataforma', ['comunicados', 'comunicacao', 'chat-interno'], ['bfr-internal-chat', 'bfr-chat-redesign.js'], 'conteudo'],
  ['5.15', 'Desenvolvedor / equipe técnica', ['administracao'], ['bfr-admin-console.js', 'bfr-dev-student-center.js', 'bfr-student-photo-manager.js', 'bfr-platform-evolution.js', 'bfr-ux-audit.js', 'bfr-product-enhancements'], 'conteudo'],
  ['5.16', 'Segurança transversal', [], ['bfr-audit-hardening', 'bfr-lia-official-identity'], 'banco'],
  ['M2', 'Secretaria Municipal (módulo 2)', ['secretaria-municipal'], ['modulo-municipal'], 'banco'],
];

const CORRIDAS = {
  '5.1': { conteudo: ['evidence/rm12-veredito.json'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: ['evidence/bu2-censo-catalogo-20-11.json'] },
  '5.2': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json', 'evidence/sm25-cobertura-desktop-20-11.json'], banco: [] },
  '5.3': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.4': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: ['evidence/bu2-censo-catalogo-20-11.json'] },
  '5.5': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: ['evidence/bu2c-caminhos-de-autorizacao-20-11c.json'] },
  '5.6': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: ['evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json'] },
  '5.7': { conteudo: ['evidence/p36-browser-supervisao-director-390-1280px-19-11.json'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.8': { conteudo: ['evidence/p36-browser-supervisao-secretary-390-1280px-19-11.json'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.9': { conteudo: ['evidence/p36-browser-supervisao-education_supervisor-390-1280px-19-11.json', 'evidence/s21-diary.json'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.10': { conteudo: ['docs/c2r-diario.md'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.11': { conteudo: ['docs/c2r-diario.md'], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: ['evidence/p73-rm52-estado-calendario-20-11.txt'] },
  '5.12': { conteudo: [], superficie: ['evidence/ah2-mobile2-m5-aee-1.json', 'evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.13': { conteudo: [], superficie: ['evidence/ah2-mobile2-m5-sports_operator-1.json', 'evidence/ah2-mobile2-sm25-sports_operator-1280.json', 'evidence/bu5-portas-do-ar-20-11.json'], banco: ['evidence/bu2c-caminhos-de-autorizacao-20-11c.json'] },
  '5.14': { conteudo: [], superficie: ['evidence/bu5-portas-do-ar-20-11.json', 'evidence/p73-cobertura-m5-por-ar-20-11.json'], banco: [] },
  '5.15': { conteudo: [], superficie: ['evidence/ah2-mobile2-m5-developer-11.json', 'evidence/ah2-mobile2-sm25-developer-1280.json', 'evidence/bu5-portas-do-ar-20-11.json', 'evidence/sm25-cobertura-desktop-20-11.json'], banco: [] },
  '5.16': { conteudo: [], superficie: [], banco: ['evidence/bu2-censo-catalogo-20-11.json', 'evidence/bu2c-caminhos-de-autorizacao-20-11c.json', 'evidence/fin2-higiene-rm62.json'] },
  M2: { conteudo: ['docs/c7-2-resumo-jornada.json'], superficie: ['evidence/bu5-portas-do-ar-20-11.json'], banco: ['evidence/p73-politicas-municipais-20-11e.json', 'evidence/sm23-censo-municipios-18-11.json'] },
};

const CONTRADICOES = {
  '5.1': [{ tipo: 'defeito', registro: 'A.06 IF', medido: 'aprovação medida com clique real, mas o estado `pending` é inalcançável; o próprio veredicto reescreve o item como IMPLEMENTADO COM PROBLEMAS', artefacto: 'evidence/rm12-veredito.json' }],
  '5.2': [{ tipo: 'defeito', registro: 'N.02 ICP (abarca quem?)', medido: 'a barra mobile não montou em 6 de 6 larguras do papel `monitor` e em 5 de 6 do `pending`', artefacto: 'evidence/p73-cobertura-m5-por-ar-20-11.json' }],
  '5.4': [{ tipo: 'prova_ausente', registro: 'P.01 IF vínculo com alunos', medido: 'existe 1 linha em `guardian_students`: a passada com conta real não é reprodutível com o parque de contas', artefacto: 'evidence/bu2-censo-catalogo-20-11.json' }],
  '5.5': [{ tipo: 'defeito', registro: 'T.05 IF diário de aula', medido: 'o papel `pedagogical` não tem caminho de leitura nem de escrita em `bfr_teacher_diary`', artefacto: 'evidence/bu2c-caminhos-de-autorizacao-20-11c.json' }],
  '5.6': [{ tipo: 'defeito', registro: 'C.01 a C.09 IF/PI', medido: '4 regiões do papel estão desativadas no bundle vivo e 2 dos 3 RPCs que elas chamam não existem no catálogo', artefacto: 'evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json' }],
  '5.10': [{ tipo: 'defeito', registro: 'M.01 a M.04 IF', medido: 'as 6 larguras do papel `monitor` estão TRAVADAS (barra mobile não montou), logo nenhuma porta do monitor foi medida no ar actual', artefacto: 'evidence/p73-cobertura-m5-por-ar-20-11.json' }],
  '5.11': [{ tipo: 'defeito', registro: 'G.01 IF leitor QR, evidência T79/v102-v103', medido: 'o destino servido chama `register_gate_checkin_v2`, que dá 0 em `pg_proc` e 404/PGRST202 pelo fio; calendário com `dia_letivo_confirmado:false`', artefacto: 'evidence/p73-rm52-estado-calendario-20-11.txt' }, { tipo: 'prova_ausente', registro: 'T79 E2E (§CR/§CV)', medido: 'nenhum artefacto com o identificador T79 existe em `evidence/` nem `scripts/`; a citação só vive na prosa do registro', artefacto: 'docs/roadmap-master.md' }],
  '5.12': [{ tipo: 'prova_ausente', registro: 'A2.03 IF realtime 4 canais, evidência V71C/V71D', medido: 'nenhum artefacto com esse identificador em `evidence/`; as ocorrências são 2 documentos de prosa e 1 lista de defeitos', artefacto: 'docs/relatorio-final-auditoria.md' }],
  '5.13': [{ tipo: 'defeito', registro: 'SP.01 IF jogos escolares', medido: '`sports_operator` escreve 0 tabelas e lê 3; as 5 mesas de gestão dos jogos estão fora do papel', artefacto: 'evidence/bu2c-caminhos-de-autorizacao-20-11c.json' }],
  '5.14': [{ tipo: 'defeito', registro: 'CM.04 IF push/FCM/Edge', medido: 'cadeia partida no recetor do service worker (`RM13_CADEIA_PARTIDA 8/14`), medida noutro ar', artefacto: 'evidence/rm13-rotas.json' }],
  '5.16': [{ tipo: 'numero_desactualizado', registro: 'SC.01 RLS em 176/176 · SC.02 475/475 policies', medido: '183/183 com RLS activo, 177 com política, 6 sem política nenhuma e 495 políticas lidas', artefacto: 'evidence/bu4-digestao-para-documentacao-20-11.json' }],
};

const CODIGO_PARA_ESTADO = {
  IF: 'IMPLEMENTADO E TESTADO', ICP: 'IMPLEMENTADO COM ERROS', PI: 'PARCIALMENTE IMPLEMENTADO',
  NI: 'NÃO IMPLEMENTADO', NT: 'IMPLEMENTADO, MAS NÃO TESTADO', NM: 'PARCIALMENTE IMPLEMENTADO', PF: 'NÃO IMPLEMENTADO',
};
const ORDEM = ['NÃO IMPLEMENTADO', 'SOMENTE INTERFACE', 'PARCIALMENTE IMPLEMENTADO', 'IMPLEMENTADO, MAS NÃO TESTADO', 'IMPLEMENTADO COM ERROS', 'IMPLEMENTADO E TESTADO'];
const PEGADA_RE = /"(?:md5|md5_shell|index_md5|shell_md5|md5_do_ar)"\s*:\s*"([0-9a-f]{32})"/g;
const DATA_RE = /"(?:em|started|timestamp)"\s*:\s*"(2026-\d\d-\d\d)/;

function pegadaDeCorrida(caminho) {
  if (!fs.existsSync(`${DIR}/${caminho}`)) return { existe: false, classe: 'FALTA', campos: 0, data: null };
  const txt = fs.readFileSync(`${DIR}/${caminho}`, 'utf8');
  const campos = [...new Set([...txt.matchAll(PEGADA_RE)].map((m) => m[1]))];
  const data = (txt.match(DATA_RE) || [])[1] || null;
  if (campos.length) return { existe: true, classe: campos.includes(AR) ? 'no_ar_servido' : 'noutro_ar', campos: campos.length, data };
  return { existe: true, classe: txt.includes(AR) ? 'ar_citado_em_prosa' : 'sem_pegada_de_ar', campos: 0, data };
}

function papeisDaSessao(caminho) {
  const p = `${DIR}/${caminho}`;
  if (!fs.existsSync(p)) return [];
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
  return [...new Set((Array.isArray(j.unidades) ? j.unidades : []).map((u) => u && u.papel).filter(Boolean))];
}

const estadoAntigo = (codigos) => {
  let pior = 'IMPLEMENTADO E TESTADO';
  for (const c of codigos) {
    const e = CODIGO_PARA_ESTADO[c];
    if (ORDEM.indexOf(e) < ORDEM.indexOf(pior)) pior = e;
  }
  return pior;
};

const linhas = [];
const unidadesOut = [];
const nomesRuim = [];
const regioesUsadas = new Set();
const classesDePegadaVistas = new Set();

for (const [grupo, rotulo, sec, regs, regua] of UNIDADES) {
  for (const r of regs) if (!REGIOES.has(r)) nomesRuim.push(`${grupo}:${r}`);
  for (const r of regs) regioesUsadas.add(r);
  const itens = GRUPO_DE_REGISTRO.get(grupo) || [];
  const codigos = itens.map((i) => i.codigo);
  const por = {};
  for (const c of codigos) por[c] = (por[c] || 0) + 1;
  const implementados = codigos.filter((c) => ['IF', 'ICP', 'NT', 'NM', 'PI'].includes(c)).length;
  const frac = itens.length ? implementados / itens.length : 0;
  const noAr = sec.filter((s) => portasMedidas.has(s));
  const foraDoAr = sec.filter((s) => !portasMedidas.has(s));
  const papeis = [...new Set(noAr.flatMap((s) => [...portasMedidas.get(s)]))].sort();
  const R = regs.map((n) => REGIOES.get(n)).filter(Boolean);
  const tabelas = new Set(R.flatMap((r) => r.tabelas || []));
  const rpcs = new Set(R.flatMap((r) => r.rpcs || []));
  const desat = R.filter((r) => r.desativado).map((r) => r.nome);
  const dif = R.filter((r) => r.diferido).length;
  const corridas = {};
  for (const tipo of ['conteudo', 'superficie', 'banco'])
    corridas[tipo] = (CORRIDAS[grupo]?.[tipo] || []).map((f) => { const p = pegadaDeCorrida(f); classesDePegadaVistas.add(p.classe); return { ficheiro: f, ...p }; });
  const celulasMoveis = papeis.flatMap((p) => Object.entries(p73.tabela[p] || {}).map(([l, v]) => `${p}@${l}=${v}`));
  const contaCelulas = {};
  for (const c of celulasMoveis) { const v = c.split('=')[1]; contaCelulas[v] = (contaCelulas[v] || 0) + 1; }
  const desktop = papeis.flatMap((p) => sm25.celulas.filter((c) => c.papel === p).map((c) => `${p}@${c.largura}=${c.classe}`));
  const alcaNenhum = papeis.flatMap((p) => [...tabelas].filter((t) => !(POR_PAPEL[p]?.leitura || []).includes(t) && !(POR_PAPEL[p]?.escrita || []).includes(t)).map((t) => `${p}/${t}`));
  const alcance = papeis.map((p) => `${p}:L${POR_PAPEL[p]?.leitura_n ?? 'X'}W${POR_PAPEL[p]?.escrita_n ?? 'X'}`);
  const Ls = papeis.map((p) => POR_PAPEL[p]?.leitura_n).filter((n) => typeof n === 'number');
  const Ws = papeis.map((p) => POR_PAPEL[p]?.escrita_n).filter((n) => typeof n === 'number');
  const papeisEfetivos = papeis.filter((p) => p !== PAPEL_DE_PREVIEW);
  const Lfe = papeisEfetivos.map((p) => POR_PAPEL[p]?.leitura_n).filter((n) => typeof n === 'number');
  const Wfe = papeisEfetivos.map((p) => POR_PAPEL[p]?.escrita_n).filter((n) => typeof n === 'number');
  const bandaL = Lfe.length ? `L ${Math.min(...Lfe)}..${Math.max(...Lfe)} · W ${Math.min(...Wfe)}..${Math.max(...Wfe)} (${papeisEfetivos.length} papéis)` : 'só o papel de preview tem porta';
  const bandaComPreview = Ls.length ? `L ${Math.min(...Ls)}..${Math.max(...Ls)} · W ${Math.min(...Ws)}..${Math.max(...Ws)}` : 'nenhum';
  const leituraMaximaEfetiva = Lfe.length ? Math.max(...Lfe) : null;
  const leituraMaximaComPreview = Ls.length ? Math.max(...Ls) : null;
  const soInterface = R.length > 0 && tabelas.size === 0 && rpcs.size >= 1 && [...rpcs].every((f) => HELPERS.has(f)) && noAr.length > 0;
  const provaOk = regua === 'conteudo'
    ? corridas.conteudo.some((c) => c.classe === 'no_ar_servido')
    : corridas.banco.some((c) => c.existe && c.data === DIA_DA_ANALISE);
  const contradiz = (CONTRADICOES[grupo] || []).filter((c) => c.tipo === 'defeito');
  let estado;
  if (soInterface) estado = 'SOMENTE INTERFACE';
  else if (itens.length === 0) estado = 'NÃO FOI POSSÍVEL VERIFICAR';
  else if (implementados === 0) estado = 'NÃO IMPLEMENTADO';
  else if (frac < 0.5) estado = 'PARCIALMENTE IMPLEMENTADO';
  else if (contradiz.length) estado = 'IMPLEMENTADO COM ERROS';
  else if ((por.ICP || 0) > 0) estado = 'IMPLEMENTADO COM ERROS';
  else if ((por.PI || 0) + (por.NM || 0) > 0) estado = 'PARCIALMENTE IMPLEMENTADO';
  else estado = provaOk ? 'IMPLEMENTADO E TESTADO' : 'IMPLEMENTADO, MAS NÃO TESTADO';
  unidadesOut.push({
    grupo, rotulo, rotulo_do_registro: TITULOS_DO_REGISTRO.get(grupo) || null, itens: itens.length, codigos: por,
    frac_implementado: Number(frac.toFixed(2)), portas_proprias_no_ar: noAr.length, portas_declaradas: sec.length,
    portas_fora_do_ar: foraDoAr, papeis_com_porta_propria: papeis, regioes: R.length, regioes_desativadas: desat,
    regioes_diferidas: dif, tabelas_distintas: tabelas.size, rpcs: [...rpcs].sort(), chars_regioes: R.reduce((a, r) => a + r.chars, 0),
    rpcs_sao_todas_predicados_de_autorizacao: [...rpcs].every((f) => HELPERS.has(f)),
    alcance_por_papel: alcance, banda_de_alcance: bandaL, banda_com_preview: bandaComPreview,
    papeis_efetivos_da_banda: papeisEfetivos, leitura_maxima_efetiva: leituraMaximaEfetiva, leitura_maxima_com_preview: leituraMaximaComPreview,
    mesas_da_unidade_fora_do_alcance_dos_papeis: alcaNenhum,
    mobile_celulas: celulasMoveis.length, mobile_por_estado: contaCelulas, desktop_celulas: desktop,
    regua_de_prova: regua, prova_bateu: provaOk, corridas, contradicoes: CONTRADICOES[grupo] || [],
    estado_pela_regra_degenerada_antes_de_3: estadoAntigo(codigos), estado_derivado: estado,
  });
  linhas.push(
    `U ${grupo} ${rotulo} | itens=${itens.length} ${JSON.stringify(por)} implemented_frac=${frac.toFixed(2)}`
    + ` | portas_no_ar=${noAr.length}/${sec.length}${foraDoAr.length ? ` fora=[${foraDoAr.join(',')}]` : ''}`
    + ` | papeis=[${papeis.join('+')}]`
    + ` | regioes=${R.length} (desativadas=${desat.length ? desat.join(',') : '0'}, diferidas=${dif}) tabelas=${tabelas.size} rpcs=${rpcs.size} chars=${R.reduce((a, r) => a + r.chars, 0)}`
  );
  linhas.push(`   mobile=${JSON.stringify(contaCelulas)} em ${celulasMoveis.length} celulas | desktop=${desktop.filter((c) => c.endsWith('MEDIDA_WEB')).length}/${desktop.length} medidas`);
  linhas.push(`   banco_alcance_sem_preview=${bandaL} | com_preview=${bandaComPreview} | detalhe=[${alcance.join(' ')}]`);
  linhas.push(`   mesas_citadas_pelas_regioes_fora_do_alcance_dos_papeis=${alcaNenhum.length ? alcaNenhum.join(',') : 'nenhuma'} | rpcs_sao_so_predicados_de_autorizacao=${[...rpcs].every((f) => HELPERS.has(f)) ? 'sim' : 'nao'} (${rpcs.size})`);
  linhas.push(`   prova=${regua}:${provaOk ? 'bateu' : 'NAO'} | ${corridas[regua].map((c) => `${c.ficheiro}=${c.classe}${c.data ? `@${c.data}` : ''}`).join(' · ') || 'nenhuma'}`);
  linhas.push(`   contradicoes=${(CONTRADICOES[grupo] || []).map((c) => `${c.tipo}(${c.artefacto})`).join(' · ') || 'nenhuma'}`);
  linhas.push(`   estado=${estado}   [regra_antes_de_3_dava=${estadoAntigo(codigos)}]`);
}

const cobertas = new Set([...UNIDADES.flatMap(([, , s]) => s)]);
const portasFora = [...portasMedidas.keys()].filter((s) => !cobertas.has(s)).sort();
const naoAtrib = [...REGIOES.keys()].filter((n) => !regioesUsadas.has(n) && !RUNTIME_COMPARTIDO.includes(n) && !APRESENTACAO_TRANSVERSAL.includes(n)).sort();
const valoresCelula = new Set(Object.values(p73.tabela).flatMap((t) => Object.values(t)));
const CELULAS_PERMITIDAS = ['OK', 'TRAVADA', 'por_medir'];
const foraDoVocabulario = (vals) => vals.filter((v) => !CELULAS_PERMITIDAS.includes(v));
const FALTAS_DE_CORRIDA = unidadesOut.flatMap((u) => Object.values(u.corridas).flat().filter((c) => !c.existe).map((c) => `${u.grupo}:${c.ficheiro}`));
const papeisP73 = Object.keys(p73.tabela).sort();
const papeisBu5 = Object.keys(bu5.portas_por_papel).sort();

const GATES = [];
const gate = (nome, verde, detalhe) => GATES.push({ nome, verde, detalhe });
const FIX = { rota: 'rota-inventada-xyz', papel: 'papel-fora-do-enum', md5: 'deadbeefdeadbeefdeadbeefdeadbeef' };

gate('o_md5_do_ar_e_o_mesmo_em_bu5_p73_e_sm25',
  bu5.bundle.md5 === p73.ar.md5 && p73.ar.md5 === sm25.shell_esperada && sm25.celulas.every((c) => c.md5_shell === bu5.bundle.md5),
  `bu5=${bu5.bundle.md5} p73=${p73.ar.md5} sm25=${sm25.shell_esperada} celulas_diferentes=${sm25.celulas.filter((c) => c.md5_shell !== bu5.bundle.md5).length}`);
gate('a_falsificacao_do_portao_de_md5_dispara', bu5.bundle.md5 !== FIX.md5 && p73.ar.md5 !== FIX.md5, 'comparado com uma pegada inventada');
gate('a_grelha_do_registro_devolve_cinco_colunas_em_cada_item',
  [...GRUPO_DE_REGISTRO.values()].flat().every((i) => i.ncolunas === 5) && nLinhasComPipeEscapado >= 1,
  `itens_lidos=${totalItens} linhas_com_pipe_escapado_no_documento=${nLinhasComPipeEscapado} exemplo_de_split_ingenuo=${(() => { const it = [...GRUPO_DE_REGISTRO.values()].flat().find((i) => i.ncolunas_naive !== 5); return it ? `${it.id}:${it.ncolunas_naive}` : 'nenhuma_linha_partida'; })()}`);
gate('o_numero_de_itens_confere_com_o_titulo_da_seccao_quatro_de_cinco',
  totalItens === Number((registroTxt.find((l) => /^## 5\./.test(l)) || '').match(/\((\d+) itens\)/)?.[1]),
  `lidos_do_corpo=${totalItens} declarados_no_titulo=${(registroTxt.find((l) => /^## 5\./.test(l)) || '').match(/\((\d+) itens\)/)?.[1]}`);
gate('os_rotulos_das_unidades_batem_com_os_titulos_do_registro',
  unidadesOut.filter((u) => u.rotulo_do_registro).every((u) => u.rotulo === u.rotulo_do_registro) && unidadesOut.filter((u) => !u.rotulo_do_registro).length === 1,
  unidadesOut.filter((u) => u.rotulo !== u.rotulo_do_registro).map((u) => `${u.grupo}:declarado="${u.rotulo}" registro="${u.rotulo_do_registro}"`).join(' | ') || '16 de 16 iguais + M2 sem grupo no registro');
gate('toda_porta_propria_de_unidade_existe_no_censo_de_portas_do_ar',
  UNIDADES.every(([, , s]) => s.every((r) => portasMedidas.has(r))) && !portasMedidas.has(FIX.rota),
  `portas_declaradas_fora_do_ar=${UNIDADES.flatMap(([g, , s]) => s.filter((r) => !portasMedidas.has(r)).map((r) => `${g}:${r}`)).join(',') || 'nenhuma'} | inventada_case? ${portasMedidas.has(FIX.rota)}`);
gate('nenhuma_rota_medida_no_ar_fica_fora_do_vocabulario_das_unidades', portasFora.length === 0, `fora=${portasFora.join(',') || 'nenhuma'} de ${portasMedidas.size}`);
gate('nenhuma_regiao_identificada_fica_sem_unidade',
  nomesRuim.length === 0 && naoAtrib.length === 0 && RUNTIME_COMPARTIDO.concat(APRESENTACAO_TRANSVERSAL).every((n) => REGIOES.has(n)),
  `nomes_inexistentes=${nomesRuim.join(',') || 'nenhum'} sem_dono=${naoAtrib.join(',') || 'nenhuma'} regioes=${REGIOES.size} atribuidas=${regioesUsadas.size} excecoes_declaradas=${RUNTIME_COMPARTIDO.length + APRESENTACAO_TRANSVERSAL.length}`);
gate('os_papeis_das_celulas_mobile_sao_os_do_enum_medido', papeisP73.join(',') === papeisBu5.join(','), `p73=${papeisP73.length} bu5=${papeisBu5.length}`);
gate('as_celulas_de_p73_usam_so_o_vocabulario_declarado', foraDoVocabulario([...valoresCelula]).length === 0, `valores_vistos=[${[...valoresCelula].sort().join(',')}] permitidos=[${CELULAS_PERMITIDAS.join(',')}]`);
gate('o_vocabulario_de_celulas_rejeita_um_estado_inedito', foraDoVocabulario(['OK', 'ESTADO_INEDITO']).length === 1, `fixture_OK+inedito devolveu=[${foraDoVocabulario(['OK', 'ESTADO_INEDITO']).join(',')}]`);
gate('o_classificador_de_pegada_distingue_ar_actual_de_outro_ar',
  (() => { const a = pegadaDeCorrida('evidence/p36-browser-supervisao-education_supervisor-390-1280px-19-11.json').classe; const b = pegadaDeCorrida('evidence/fin2a-censo-embeds.json').classe; return a === 'no_ar_servido' && b === 'noutro_ar'; })()
  && classesDePegadaVistas.size >= 2, `ar_actual=${pegadaDeCorrida('evidence/p36-browser-supervisao-education_supervisor-390-1280px-19-11.json').classe} outro_ar=${pegadaDeCorrida('evidence/fin2a-censo-embeds.json').classe} classes_vistas=[${[...classesDePegadaVistas].sort().join(',')}]`);
gate('os_caminhos_de_corrida_apontam_para_ficheiros_que_existem',
  FALTAS_DE_CORRIDA.length === 0, `faltas=${FALTAS_DE_CORRIDA.join(',') || 'nenhuma'} de ${unidadesOut.flatMap((u) => Object.values(u.corridas).flat()).length} corridas citadas`);
const PROVAS_FORA_DA_IDENTIDADE = unidadesOut.flatMap((u) => (u.corridas.conteudo || []).flatMap((c) => papeisDaSessao(c.ficheiro)
  .filter((p) => !u.papeis_com_porta_propria.includes(p)).map((p) => `${u.grupo}:${c.ficheiro}=${p}`)));
const FIXTURE_DE_IDENTIDADE = papeisDaSessao('evidence/p36-browser-supervisao-director-390-1280px-19-11.json')
  .filter((p) => !unidadesOut.find((u) => u.grupo === '5.15').papeis_com_porta_propria.includes(p));
gate('nenhuma_prova_de_conteudo_cita_sessao_de_papel_sem_porta_na_unidade',
  PROVAS_FORA_DA_IDENTIDADE.length === 0 && FIXTURE_DE_IDENTIDADE.join(',') === 'director'
  && papeisDaSessao('evidence/p36-browser-supervisao-secretary-390-1280px-19-11.json').join(',') === 'secretary',
  `fora_da_identidade=${PROVAS_FORA_DA_IDENTIDADE.join(',') || 'nenhuma'} | fixture_5.15_com_a_sessao_do_director_devolve=[${FIXTURE_DE_IDENTIDADE.join(',')}] | papel_lido_do_artefacto_secretary=${papeisDaSessao('evidence/p36-browser-supervisao-secretary-390-1280px-19-11.json').join(',')}`);
gate('as_contradicoes_tem_tipo_declarado_e_artefacto_no_disco',
  Object.values(CONTRADICOES).flat().every((c) => ['defeito', 'prova_ausente', 'numero_desactualizado'].includes(c.tipo) && fs.existsSync(`${DIR}/${c.artefacto}`)),
  `entradas=${Object.values(CONTRADICOES).flat().length} defeito=${Object.values(CONTRADICOES).flat().filter((c) => c.tipo === 'defeito').length} prova_ausente=${Object.values(CONTRADICOES).flat().filter((c) => c.tipo === 'prova_ausente').length} numero_desactualizado=${Object.values(CONTRADICOES).flat().filter((c) => c.tipo === 'numero_desactualizado').length}`);
gate('nenhuma_unidade_com_item_implementado_recebe_NAO_IMPLEMENTADO',
  unidadesOut.every((u) => !(u.estado_derivado === 'NÃO IMPLEMENTADO' && u.frac_implementado > 0)),
  `diferencas_face_a_regra_antes_de_3=${unidadesOut.filter((u) => u.estado_pela_regra_degenerada_antes_de_3 !== u.estado_derivado).map((u) => `${u.grupo}:${u.estado_pela_regra_degenerada_antes_de_3}>${u.estado_derivado}`).join(' | ') || 'nenhuma'}`);
gate('a_regra_antes_de_3_era_degenerada_em_pelo_menos_uma_unidade',
  unidadesOut.some((u) => u.estado_pela_regra_degenerada_antes_de_3 === 'NÃO IMPLEMENTADO' && u.frac_implementado > 0),
  unidadesOut.filter((u) => u.estado_pela_regra_degenerada_antes_de_3 === 'NÃO IMPLEMENTADO').map((u) => `${u.grupo}@frac${u.frac_implementado}`).join(',') || 'nenhuma');
gate('nao_implementado_so_e_emitido_quando_o_registro_nao_afirma_codigo_nenhum',
  unidadesOut.every((u) => !(u.estado_derivado === 'NÃO IMPLEMENTADO' && (u.itens === 0 || u.frac_implementado > 0))),
  `unidades_sem_grupo_no_registro=${unidadesOut.filter((u) => u.itens === 0).map((u) => `${u.grupo}=>${u.estado_derivado}`).join(',') || 'nenhuma'} | com_NAO_IMPLEMENTADO=${unidadesOut.filter((u) => u.estado_derivado === 'NÃO IMPLEMENTADO').map((u) => u.grupo).join(',') || 'nenhuma'}`);
gate('so_interface_exige_caminho_de_dados_so_de_predicado_e_falsifica_numa_funcao_de_dados',
  unidadesOut.filter((u) => u.estado_derivado === 'SOMENTE INTERFACE').every((u) => u.tabelas_distintas === 0 && u.rpcs.length >= 1 && u.rpcs_sao_todas_predicados_de_autorizacao)
  && [['bfr_is_municipal_authority', true], ['register_gate_checkin_v2', false]].every(([nome, esperado]) => HELPERS.has(nome) === esperado),
  `disparou_em=${unidadesOut.filter((u) => u.estado_derivado === 'SOMENTE INTERFACE').map((u) => `${u.grupo}(${u.rpcs.join(',')})`).join(',') || 'nenhuma'} | helper=bfr_is_municipal_authority?${HELPERS.has('bfr_is_municipal_authority')} funcao_de_dados=register_gate_checkin_v2?${HELPERS.has('register_gate_checkin_v2')}`);
gate('as_linhas_do_ledger_pen_tem_cinco_colunas_e_prioridade_do_enum',
  [...PEN.values()].every((p) => p.colunas === 5 && ['C', 'A', 'M', 'B'].includes(p.prioridade)),
  `pen_lidas=${PEN.size} prioridades={${['C', 'A', 'M', 'B'].map((k) => `${k}:${[...PEN.values()].filter((p) => p.prioridade === k).length}`).join(',')}}`);
gate('a_numeracao_das_pen_nao_tem_lacunas',
  Math.max(...[...PEN.keys()].map((n) => Number(n.replace('PEN-', '')))) === PEN.size,
  `maior_identificador=PEN-${Math.max(...[...PEN.keys()].map((n) => Number(n.replace('PEN-', ''))))} linhas=${PEN.size}`);

gate('a_banda_de_alcance_exclui_o_papel_de_preview_e_a_exclusao_e_portante',
  unidadesOut.every((u) => !u.papeis_efetivos_da_banda.includes(PAPEL_DE_PREVIEW))
  && unidadesOut.filter((u) => u.papeis_com_porta_propria.includes(PAPEL_DE_PREVIEW)).length >= 1
  && unidadesOut.some((u) => u.leitura_maxima_efetiva !== null && u.leitura_maxima_com_preview !== null && u.leitura_maxima_efetiva !== u.leitura_maxima_com_preview),
  `unidades_em_que_developer_tem_porta=${unidadesOut.filter((u) => u.papeis_com_porta_propria.includes(PAPEL_DE_PREVIEW)).length} de ${unidadesOut.length}; leitura maxima muda em=${unidadesOut.filter((u) => u.leitura_maxima_efetiva !== u.leitura_maxima_com_preview).length}`);
gate('o_alcance_de_banco_e_lido_para_todo_papel_que_tem_porta_propria',
  unidadesOut.every((u) => u.alcance_por_papel.every((s) => !/LX|WX/.test(s))) && !POR_PAPEL['papel-que-nao-existe'],
  `papeis_sem_numero_de_matriz=${unidadesOut.flatMap((u) => u.alcance_por_papel.filter((s) => /LX|WX/.test(s))).join(',') || 'nenhum'}`);

const ESTADOS = unidadesOut.reduce((a, u) => ({ ...a, [u.estado_derivado]: (a[u.estado_derivado] || 0) + 1 }), {});
const SEM_PROVA_NO_AR = unidadesOut.filter((u) => u.regua_de_prova === 'conteudo' && !u.prova_bateu).map((u) => u.grupo);
gate('os_estados_derivados_nao_sao_todos_o_mesmo_valor', Object.keys(ESTADOS).length >= 2, `distribuicao=${JSON.stringify(ESTADOS)}`);
gate('nenhuma_unidade_de_regua_banco_fica_sem_prova',
  unidadesOut.filter((u) => u.regua_de_prova === 'banco' && !u.prova_bateu).length === 0,
  `sem_prova_de_conteudo_no_ar=[${SEM_PROVA_NO_AR.join(',') || 'nenhuma'}] de ${unidadesOut.filter((u) => u.regua_de_prova === 'conteudo').length} unidades de conteudo`);

const vereditos = GATES.map((g) => `${g.verde ? 'V' : 'R'} ${g.nome} :: ${g.detalhe}`);
const vermelhos = GATES.filter((g) => !g.verde);
const resumo = {
  em: new Date().toISOString(), instrumento: 'scripts/bu5-unidades-do-roadmap-20-11.mjs', ar: { caminho: bu5.bundle.caminho, bytes: bu5.bundle.bytes, md5: AR },
  vocabulario: { portas_no_ar: portasMedidas.size, declaradas_no_documento: bu5.declaradas_n, estaticas: bu5.estaticas_n, por_literal: bu5.por_literal_n, identificadores_de_runtime: bu5.identificadores_de_runtime },
  banco_medido_hoje: { tabelas_rls_ativa: bu4.catalogo.tabelas_rls_ativa, tabelas_com_politica: bu4.catalogo.tabelas_com_politica, politicas_lidas: bu4.autorizacao.politicas_lidas, tabelas_total: bu4.autorizacao.tabelas_total },
  mobile: { grelha: p73.grelha, motivos: p73.motivos, causas: Object.keys(p73.causas_de_trava).length },
  desktop: { total: sm25.total.celulas, medida_web: sm25.total.medida_web, bloqueada: sm25.total.bloqueada, falta: sm25.total.falta },
  unidades: unidadesOut, pen_no_ledger: PEN.size, portoes: GATES,
  veredito_final: `${vermelhos.length ? 'BU5U_VERMELHO' : 'BU5U_VERDE'} ${GATES.length - vermelhos.length}/${vermelhos.length}`,
};
const txtOut = [
  `# bu5-unidades-do-roadmap  em=${resumo.em}`,
  `ar md5=${AR} bytes=${bu5.bundle.bytes} | portas_no_ar=${portasMedidas.size} declaradas=${bu5.declaradas_n} | mobile=${JSON.stringify(p73.motivos)} desktop=${sm25.total.medida_web}/${sm25.total.celulas} medidas, ${sm25.total.bloqueada} bloqueadas`,
  `itens_do_registro=${totalItens} em ${GRUPO_DE_REGISTRO.size} grupos + M2 (sem grupo no registro) = ${UNIDADES.length} unidades | pen_no_ledger=${PEN.size}`,
  `estados_derivados=${JSON.stringify(ESTADOS)} | sem_prova_de_conteudo_no_ar=${SEM_PROVA_NO_AR.join(',') || 'nenhuma'} | helpers_no_catalogo=${HELPERS.size}`,
  ...linhas,
  `portas_fora_do_vocabulario=${portasFora.join(',') || 'nenhuma'} | regioes_sem_dono=${naoAtrib.join(',') || 'nenhuma'} | nomes_inexistentes=${nomesRuim.join(',') || 'nenhum'}`,
  'PORTOES', ...vereditos, resumo.veredito_final,
  'TABELA', '| unidade | itens (códigos do registro) | portas próprias no ar | papéis com porta | alcance no banco desses papéis | regiões (tabelas/RPCs) | mobile | desktop | prova exigida | estado derivado |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...unidadesOut.map((u) => `| ${u.grupo} ${u.rotulo} | ${u.itens} (${Object.entries(u.codigos).map(([k, v]) => `${k} ${v}`).join(' · ')}) | ${u.portas_proprias_no_ar}/${u.portas_declaradas} | ${u.papeis_com_porta_propria.length} | ${u.banda_de_alcance} | ${u.regioes} (${u.tabelas_distintas}t/${u.rpcs.length}r) | ${u.mobile_por_estado.OK || 0}OK/${u.mobile_por_estado.TRAVADA || 0}TR/${u.mobile_por_estado.por_medir || 0}PM de ${u.mobile_celulas} | ${u.desktop_celulas.filter((c) => c.endsWith('MEDIDA_WEB')).length}/${u.desktop_celulas.length} | ${u.regua_de_prova} ${u.prova_bateu ? 'bateu' : 'NÃO'} | ${u.estado_derivado} |`),
].join('\n') + '\n';

fs.writeFileSync(JSON_OUT, `${JSON.stringify(resumo, null, 2)}\n`, 'utf8');
fs.writeFileSync(TXT_OUT, txtOut, 'utf8');
console.log(txtOut);
process.exit(vermelhos.length ? 1 : 0);
