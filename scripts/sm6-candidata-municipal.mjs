// SM6-CANDIDATA — constrói a candidata de interface do MÓDULO 2 e NÃO A PUBLICA.
// Copia a base medida (v121, md5 verificado), injeta `scripts/sm6-modulo-municipal.txt` como um único
// <script> antes de `</body>`, e só escreve se quatro réguas derem verde:
//   (1) sintaxe do payload (vm.Script — nada é executado);
//   (2) toda `from('tabela')` e todo `select('colunas')` do payload batem com o catálogo medido em
//       evidence/sm6-colunas-e-vinculos-17-11.json, e cada embutido tem FK na direção certa. É a classe
//       de defeito 404/PGRST205 que a casa já apanhou três vezes: um nome adivinhado só vive até ao
//       primeiro clique;
//   (3) cada aba declarada tem carregador E renderizador — a régua contra «tela em branco» (§6.364);
//   (4) cada atributo de ação emitido no HTML gerado tem manipulador em `ligarEventos` — a régua contra
//       «o botão aparece mas não faz nada», que é exatamente a recusa do briefing:
//       «Não considere uma aba implementada apenas porque seu botão aparece na interface.»
// Cada régua tem fixture ofensor: sem o vermelho de demonstração, o verde não quer dizer nada.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/bfr-candidata-v121-rotulos-supervisor/index.html`;
const BASE_MD5 = 'd418e7fc917f1fbb1437054b7b531f9b';
const PAYLOAD = `${DIR}/scripts/sm6-modulo-municipal.txt`;
const PONTE = `${DIR}/evidence/sm6-colunas-e-vinculos-17-11.json`;
const V = process.env.SM6_V || '127';
const DESTINO = `${DIR}/bfr-candidata-v${V}-secretaria-municipal/index.html`;
const OUT = `${DIR}/evidence/sm6-candidata-municipal-v${V}-17-11.json`;
// O aborta-se-existe do ARTEFACTO tem de vir antes de qualquer escrita: estava no fim do script, depois
// do writeFileSync(DESTINO), e assim uma corrida com OUT colado deixava uma candidata em disco SEM
// certidão nenhuma. Uma corrida por rótulo, certificado por uma corrida.
if (existsSync(OUT)) { console.log('VERMELHO  já existe ' + OUT + ' — correr com SM6_V noutro número'); process.exit(1); }

const bloqueios = [];
const md5 = (b) => createHash('md5').update(b).digest('hex');

// ── identidade da base ─────────────────────────────────────────────────────
const baseBuf = readFileSync(BASE);
const base = baseBuf.toString('utf8');
const baseMedido = md5(baseBuf);
if (baseMedido !== BASE_MD5) bloqueios.push(`base não é o ficheiro medido: ${baseMedido} != ${BASE_MD5}`);

// ── âncoras: o injeto conta com estas estruturas existirem; se alguma mudar, aborta-se, não se escreve
//    um <script> órfão em cima de um shell diferente.
const ANCORAS = [
  ['id="appShell"', 1, Infinity],
  ['window.BFR_APP_RUNTIME', 1, Infinity],
  ['get client()', 1, Infinity],
  ['roleSectionAccess', 1, Infinity],
  ['.bfr-platform-nav', 1, Infinity],
  ['.mobile-more-grid', 1, Infinity],
  ['data-section="secretaria"', 1, Infinity]
];
const contasAncora = {};
for (const [alvo, min, max] of ANCORAS) {
  const n = base.split(alvo).length - 1;
  contasAncora[alvo] = n;
  if (n < min || n > max) bloqueios.push(`âncora ${alvo}: ${n} ocorrências (esperado ${min}..${max})`);
}
// O ponto de injeção: a base tem 6 ocorrências literais de `</body>` — quatro vivem dentro de strings do
// próprio bundle (janelas de impressão, comentários de injeção) e só a última fecha o documento. Assumir
// «um </body>» seria a minha conveniência, não uma medida; por isso a âncora é a ÚLTIMA ocorrência, com a
// cauda verificada: depois dela só pode vir `</html>` e espaço em branco.
const ocorrenciasBody = [];
for (let i = base.indexOf('</body>'); i >= 0; i = base.indexOf('</body>', i + 1)) ocorrenciasBody.push(i);
const fimBody = base.lastIndexOf('</body>');
const cauda = base.slice(fimBody + '</body>'.length);
if (!ocorrenciasBody.length) bloqueios.push('nenhum </body> na base');
if (!/^\s*<\/html>\s*$/.test(cauda)) bloqueios.push(`o último </body> não fecha o documento (cauda: ${JSON.stringify(cauda.slice(0, 60))}) — injetar ali seria dentro de uma string`);
if (base.includes('secretaria-municipal')) bloqueios.push('a base já contém «secretaria-municipal»: a candidata seria aplicada duas vezes');

const payload = readFileSync(PAYLOAD, 'utf8');
// As réguas que procuram tokens aplicam-se ao CÓDIGO, não à prosa: o cabeçalho do módulo explica que
// `.bfr-platform-nav` é o host errado, e uma régua que lesse comentários acusaria a própria explicação
// como se fosse uso. (É o defeito inverso do «a frase que descreve o ofensor passa a ser a ofensora».)
const semComentariosDeCodigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => (/^\s*\/\//.test(l) ? '' : l)).join('\n')
  .replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
const codigo = semComentariosDeCodigo(payload);
if (payload.includes('</script')) bloqueios.push('o payload contém o fecho de script e partiria o <script> injetado');

// ── régua 1: sintaxe ───────────────────────────────────────────────────────
let sintaxe = { ok: false, erro: '' };
try { new vm.Script(payload, { filename: 'sm6-modulo-municipal.txt' }); sintaxe = { ok: true, erro: '' }; }
catch (e) { sintaxe = { ok: false, erro: String(e.message || e) }; bloqueios.push('sintaxe do payload: ' + sintaxe.erro); }

// ── régua 2: nomes de tabela/coluna/embutido contra o catálogo medido ──────
const ponte = JSON.parse(readFileSync(PONTE, 'utf8'));
const COLUNAS = {};
for (const [t, lista] of Object.entries(ponte.colunas)) COLUNAS[t] = lista.map((c) => c.split(':')[0]);
const FKS = ponte.foreign_keys.map((f) => `${f.de}->${f.para}`);
const separar = (s) => { const out = []; let prof = 0, atual = '';
  for (const ch of s) { if (ch === '(') prof++; if (ch === ')') prof--; if (ch === ',' && prof === 0) { out.push(atual); atual = ''; } else atual += ch; }
  if (atual.trim()) out.push(atual); return out.map((x) => x.trim()).filter(Boolean); };
// Recursivo de propósito: `grades(…,students(…,classes(…)))` tem dois níveis, e uma régua que só desce
// um nível acusaria `classes(...)` de ser uma coluna inexistente — o falso positivo também mata um portão.
const confereTokens = (tabela, cols, prefixo) => {
  const problemas = [];
  for (const token of separar(cols)) {
    const emb = /^([a-z_][a-z0-9_]*)(?:!([a-z_][a-z0-9_]*))?\((.*)\)$/.exec(token);
    if (emb) {
      const [, rel, hint, interior] = emb;
      if (!COLUNAS[rel]) { problemas.push(`${tabela}.${rel}: embutido para tabela não medida`); continue; }
      // A direcção da FK continua a ser régua estática; a AMBIGUIDADE não é. Modelo meu de caminhos
      // (directa + via junção) acusou `students→classes` (9 junções, o backend aceita) e deixou passar
      // `announcements→profiles` (2 junções, o backend recusa com HTTP 300). O que vale é a resposta
      // medida select a select em evidence/sm6-selects-medidos-17-11.json, abaixo.
      if (!FKS.includes(`${tabela}->${rel}`) && !FKS.includes(`${rel}->${tabela}`)) problemas.push(`${tabela}->${rel}: embutido sem foreign key no catálogo (o PostgREST recusa)`);
      problemas.push(...confereTokens(rel, interior, `${prefixo}${tabela}.${rel}/`));
      continue;
    }
    const nome = token.split('::')[0].trim();
    if (!/^[a-z_][a-z0-9_]*$/.test(nome)) { problemas.push(`${tabela}: token de select não reconhecido «${token}»`); continue; }
    if (!COLUNAS[tabela].includes(nome)) problemas.push(`${tabela}.${nome}: coluna não existe no catálogo`);
  }
  return problemas;
};
const confereSuperficie = (src) => {
  const problemas = [];
  for (const m of src.matchAll(/from\('([a-z_][a-z0-9_]*)'\)\s*\.select\('([^']+)'\)/g)) {
    const [, tabela, cols] = m;
    if (!COLUNAS[tabela]) { problemas.push(`${tabela}: tabela não medida no catálogo (evidence/sm6-colunas-e-vinculos-17-11.json)`); continue; }
    problemas.push(...confereTokens(tabela, cols, ''));
  }
  return problemas;
};
const superficie = confereSuperficie(codigo);
for (const p of superficie) bloqueios.push('superfície: ' + p);

// ── régua 2b: cada select do payload tem de estar MEDIDO contra o backend e ter voltado < 300 ─────
// O catálogo de colunas prova que os nomes existem; não prova que o PostgREST aceita o pedido. O
// embed ambíguo vive exactamente nesse vão, por isso a régua lê a resposta real, select a select.
// O nome do catálogo leva a pegada do texto medido: correr sem SM6_MEIDOS passa a exigir o ficheiro
// medido contra ESTE produtor, em vez de apanhar o último que ficou no disco. A «lista lembrada» era
// exactamente o defeito que deixou passar um select recusado.
const MEIDOS = process.env.SM6_MEIDOS || `${DIR}/evidence/sm6-selects-medidos-${md5(readFileSync(PAYLOAD, 'utf8')).slice(0, 8)}.json`;
const FIXURA_OFENSORA = `${DIR}/evidence/sm6-selects-medidos-ANTERIOR-embed-ambiguo-17-11.json`;
const medeChave = (porChave, tabela, cols) => {
  const r = porChave.get(`${tabela} :: ${cols}`);
  if (!r) return `select não medido contra o backend: ${tabela} :: ${cols}`.slice(0, 160);
  if (r.http >= 300) return `select recusado pelo backend (http ${r.http}): ${tabela} :: ${String(r.mensagem || '').slice(0, 130)}`;
  return null;
};
let autotesteSelectsMedidos = null;
let selectsMedidos = null;
if (!existsSync(MEIDOS)) bloqueios.push(`selects medidos: sem catálogo em ${MEIDOS.replace(`${DIR}/`, '')} — rode scripts/sm6-medir-embeds.mjs; sem ele o portão não sabe o que o backend recusa`);
else {
  selectsMedidos = JSON.parse(readFileSync(MEIDOS, 'utf8'));
  // Vínculo de identidade: o catálogo só vale para o texto com que foi medido. Mede-se o ficheiro
  // BRUTO do produtor — o mesmo bytes que `sm6-medir-embeds.mjs` lê — e não o `codigo` sem comentários,
  // porque esse é outra coisa e as duas pegadas nunca bateriam. Sem esta linha, a régua 2b aceitaria um
  // ficheiro velho porque as chaves antigas ainda lá estão: é como o embed ambíguo sobreviveria a uma
  // correção não medida.
  const pegadaDoPayload = md5(payload);
  autotesteSelectsMedidos = { catalogo: MEIDOS.replace(`${DIR}/`, ''), catalogo_md5_8: md5(readFileSync(MEIDOS)).slice(0, 8), payload_medido: selectsMedidos.payload || null, payload_md5_no_catalogo: selectsMedidos.payload_md5 || null, payload_md5_agora: pegadaDoPayload };
  if (!selectsMedidos.payload_md5) bloqueios.push(`selects medidos: o catálogo ${MEIDOS.replace(`${DIR}/`, '')} não regista a pegada do payload — re-medir com scripts/sm6-medir-embeds.mjs`);
  else if (selectsMedidos.payload_md5 !== pegadaDoPayload) bloqueios.push(`selects medidos: catálogo medido noutro texto do produtor (lá ${selectsMedidos.payload_md5.slice(0, 8)} ≠ agora ${pegadaDoPayload.slice(0, 8)}) — re-medir antes de confiar na régua 2b`);
  const porChave = new Map((selectsMedidos.selects || []).map((s) => [s.chave, s]));
  const chavesDoPayload = [...new Set([...codigo.matchAll(/from\('([a-z_][a-z0-9_]*)'\)\s*\.select\('([^']+)'\)/g)].map((m) => `${m[1]} :: ${m[2]}`))];
  for (const chave of chavesDoPayload) {
    const veredicto = medeChave(porChave, ...chave.split(' :: '));
    if (veredicto) bloqueios.push('selects medidos: ' + veredicto);
  }
  // FIXTURE: a régua tem de separar o recusado do aceito numa medição REAL guardada, não numa
  // re-implementação minha do que o PostgREST pensa. Sem ficheiro ofensor, o verde de 2b não vale.
  if (!existsSync(FIXURA_OFENSORA)) bloqueios.push(`selects medidos: sem fixture ofensora em ${FIXURA_OFENSORA.replace(`${DIR}/`, '')} — a régua 2b não tem vermelho demonstrado`);
  else {
    const fx = JSON.parse(readFileSync(FIXURA_OFENSORA, 'utf8'));
    const recus = (fx.selects || []).filter((s) => s.http >= 300);
    const aceite = (fx.selects || []).filter((s) => s.http < 300);
    const porFx = new Map((fx.selects || []).map((s) => [s.chave, s]));
    const acusou = recus.length > 0 && recus.every((s) => medeChave(porFx, ...s.chave.split(' :: ')));
    const poupou = aceite.length > 0 && aceite.every((s) => medeChave(porFx, ...s.chave.split(' :: ')) === null);
    autotesteSelectsMedidos = { ...(autotesteSelectsMedidos || {}), recusados_na_fixture: recus.length, aceitos_na_fixture: aceite.length, acusou_os_recusados: acusou, poupou_os_aceitos: poupou };
    if (!acusou) bloqueios.push(`AUTOTESTE selects medidos: nenhum dos ${recus.length} recusados foi acusado — a régua está cega`);
    if (!poupou) bloqueios.push('AUTOTESTE selects medidos: acusou um select que o backend aceitou — falso positivo, a régua cortaria candidatas boas');
  }
}

// FIXTURE da régua 2: três ofensas têm de ser acusadas (coluna adivinhada, tabela não medida, embutido
// sem FK no catálogo) e o caso correto (grade→students, FK medida) não pode ser acusado. Sem o disparo
// demonstrado, o verde do payload seria apenas a minha ignorância sobre o PostgREST. A ambiguidade do
// embed não está aqui de propósito: um modelo meu de «caminhos» acusou students→classes (que o backend
// aceita) e poupou announcements→profiles (que o backend recusa) — essa ofensa vive na régua 2b.
const FIXTURE2 = [
  "x.from('students').select('id,nope_inventado')",
  "x.from('tabela_fantasma').select('id')",
  "x.from('students').select('id,staff_schools(role)')",
  "x.from('grades').select('id,students(official_name,classes(class_code))')",
  "x.from('announcements').select('id,profiles!announcements_published_by_fkey(full_name)')"
].join(';');
const fx2 = confereSuperficie(FIXTURE2);
const autotesteSuperficie = {
  problemas_no_fixture: fx2.length,
  esperados: 3,
  casos_acusados: { coluna: fx2.some((p) => p.includes('students.nope_inventado')), tabela: fx2.some((p) => p.includes('tabela_fantasma')), embutido_sem_fk: fx2.some((p) => p.includes('students->staff_schools')) },
  // O 4.º caso é o teste da recursão: duas FKs verdadeiras aninhadas (grades→students→classes) não podem
  // gerar queixa nenhuma; se gerarem, a régua está a tratar `classes(...)` como coluna. O 5.º prova que o
  // hint de FK continua a ser parseado como embutido e não como coluna inventada.
  caso_correto_nao_acusado: !fx2.some((p) => p.includes('grades') || p.includes('classes')) && !fx2.some((p) => p.includes('profiles'))
};
for (const [nome, disparou] of Object.entries(autotesteSuperficie.casos_acusados)) {
  if (!disparou) bloqueios.push(`AUTOTESTE superfície: «${nome}» não foi acusado — a régua está cega e o verde do payload não vale nada`);
}
if (!autotesteSuperficie.caso_correto_nao_acusado) bloqueios.push(`AUTOTESTE superfície: acusou a cadeia correta grades→students→classes, cujas duas FKs estão medidas — falso positivo (${JSON.stringify(fx2)})`);
if (fx2.length !== autotesteSuperficie.esperados) bloqueios.push(`AUTOTESTE superfície: fixture com ${fx2.length} problemas, esperado ${autotesteSuperficie.esperados} — a régua mudou de forma`);

// ── régua 3: aba declarada ⇒ carregador + renderizador ─────────────────────
const tabsDeclaradas = [...codigo.matchAll(/\['([a-z]+)',\s*'[^']+?',\s*'[^']*'\]/g)].map((m) => m[1]);
const blocoDe = (inicio, fim) => { const i = codigo.indexOf(inicio); if (i < 0) return ''; const j = codigo.indexOf(fim, i + 1); return codigo.slice(i, j < 0 ? i + 6000 : j); };
const blocoCarreg = blocoDe('const CARREGADORES = {', '\n  };');
const chavesCarreg = [...blocoCarreg.matchAll(/^ {4}([a-z]+):/gm)].map((m) => m[1]);
const blocoRender = blocoDe('const RENDER = {', '};');
const chavesRender = separar(blocoRender.slice(blocoRender.indexOf('{') + 1).replace(/;$/, '')).map((x) => x.split(':')[0].trim());
const lacunasAba = tabsDeclaradas.filter((t) => !chavesCarreg.includes(t) || !chavesRender.includes(t));
for (const t of lacunasAba) bloqueios.push(`aba «${t}» aparece no menu mas não tem ${chavesCarreg.includes(t) ? 'renderizador' : 'carregador'} — ecrã branco garantido (§6.364)`);
// FIXTURE: a mesma função tem de acusar uma aba inventada e não pode acusar as dez reais.
const abasComFantosma = [...tabsDeclaradas, 'abafantasma'];
const autotesteAba = {
  ofensor: 'abafantasma',
  acusado: abasComFantosma.filter((t) => !chavesCarreg.includes(t) || !chavesRender.includes(t)).includes('abafantasma'),
  falsos_positivos: tabsDeclaradas.filter((t) => !chavesCarreg.includes(t) || !chavesRender.includes(t)),
  contadas: tabsDeclaradas.length
};
if (!autotesteAba.acusado) bloqueios.push('AUTOTESTE abas: a régua não acusou uma aba inventada sem carregador — não vale nada');
if (autotesteAba.falsos_positivos.length) bloqueios.push(`AUTOTESTE abas: acusou abas reais sem chave (${autotesteAba.falsos_positivos.join(',')}) — a extração do bloco está errada`);
if (autotesteAba.contadas !== 10) bloqueios.push(`esperava 10 abas no menu (§4.1 a §4.10), encontrei ${autotesteAba.contadas}: ${tabsDeclaradas.join(',')}`);

// ── régua 5: o âncora e as chaves de papel têm de ser os do próprio bundle ──
// Medido na base: `syncRoleNavigation` percorre `.sidebar .nav-item[data-section]` e
// `.mobile-more-option[data-section]`, e converte `developer`→`admin`, `pedagogical`→`teacher`,
// `social_work`→`multiprofessional`. Um botão fora desses contentores não é governado por nada: fica
// visível para quem não tem concessão, ou escondido de quem tem. E registar uma chave que não existe no
// mapa é inventar um papel — a mesma falta de chão em que a casa já caiu com `admin` vs `developer`.
const syncI = base.indexOf('function syncRoleNavigation');
const syncRecorte = syncI < 0 ? '' : base.slice(syncI, syncI + 2200);
const seletorNavReal = /querySelectorAll\('(\.sidebar[^']*)'/.exec(syncRecorte);
const chavesDoMapa = (() => {
  const i = base.indexOf('roleSectionAccess'); const j = base.indexOf('{', i);
  let prof = 0, k = j; for (; k < base.length; k++) { if (base[k] === '{') prof++; else if (base[k] === '}') { prof--; if (!prof) { k++; break; } } }
  return [...base.slice(j, k).matchAll(/([a-z_]+)\s*:\s*\[/g)].map((m) => m[1]);
})();
const papeisPayload = (() => {
  const i = codigo.indexOf('const PAPEIS_MUNICIPAIS = ['); if (i < 0) return [];
  return [...codigo.slice(i, codigo.indexOf(']', i)).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
})();
const mapa = { chaves: chavesDoMapa, registados: papeisPayload, seletor_nav: seletorNavReal ? seletorNavReal[1] : '' };
if (syncI < 0) bloqueios.push('não encontrei `function syncRoleNavigation` na base: a visibilidade dirigida por mapa deixou de existir');
else {
  if (!seletorNavReal) bloqueios.push('o seletor de navegação de `syncRoleNavigation` não é reconhecível no recorte de 2 200 caracteres');
  else if (!/\.sidebar \.nav-item\[data-section\]/.test(mapa.seletor_nav)) bloqueios.push(`o seletor medido na base mudou (${mapa.seletor_nav}) — a régua e o módulo têm de ser relidos contra a base nova`);
  if (!codigo.includes('.sidebar .nav-item[data-section]')) bloqueios.push('o módulo não usa o seletor `.sidebar .nav-item[data-section]` que o mapa percorre — o botão ficaria fora do controle de visibilidade');
  if (codigo.includes('.bfr-platform-nav')) bloqueios.push('o módulo ainda procura host em `.bfr-platform-nav`, que `syncRoleNavigation` não percorre');
  if (!codigo.includes('mobile-more-option')) bloqueios.push('o botão mobile não usa a classe `mobile-more-option`, única que o mapa e `ensureMobileTapTargets` tratam');
  for (const p of papeisPayload) if (!chavesDoMapa.includes(p)) bloqueios.push(`papel «${p}» registado pelo módulo não é chave de roleSectionAccess (${chavesDoMapa.join(',')}) — criar chave nova tira a secção do controle do mapa`);
  if (!papeisPayload.includes('admin')) bloqueios.push('o módulo não regista `admin`, a chave para onde o bundle converte `developer` (o admin geral do §5)');
  if (!papeisPayload.includes('education_supervisor')) bloqueios.push('o módulo não regista `education_supervisor`: ficaria sem a via que hoje já tem rede inteira');
  if (papeisPayload.includes('secretary')) bloqueios.push('o módulo regista `secretary`: §5.377 proíbe dar acesso municipal a todo o secretário escolar');
  // FIXTURE: a régua de chaves tem de acusar uma chave inventada. Sem isto, «0 queixas» podia ser só a
  // lista vazia por erro de extração.
  const fixtureChaves = ['admin', 'education_supervisor', 'papel_inventado_sm6'].filter((p) => !chavesDoMapa.includes(p));
  if (fixtureChaves.length !== 1 || fixtureChaves[0] !== 'papel_inventado_sm6') bloqueios.push(`AUTOTESTE chaves: acusou ${JSON.stringify(fixtureChaves)} em vez de exatamente «papel_inventado_sm6» — a extração do mapa não é fiable`);
  if (!chavesDoMapa.includes('admin') || !chavesDoMapa.includes('education_supervisor') || chavesDoMapa.length < 12) bloqueios.push(`AUTOTESTE chaves: chaves reais ausentes da extração (${chavesDoMapa.length}): ${chavesDoMapa.join(',')}`);
}

// ── régua 4: atributo de ação emitido ⇔ manipulador existente (nos dois sentidos) ─
// Emitido sem manipulador = botão morto, a recusa literal do briefing: a aba precisa abrir, não só
// aparecer. Manipulador sem botão = ação invisível que a interface nunca oferece. Nenhum dos dois
// pode sobreviver ao portão.
const ACOES = ['tab', 'escola', 'volta', 'recarregar', 'export', 'print', 'filtro', 'cache'];
const emitem = {}; const tratam = {};
for (const a of ACOES) {
  emitem[a] = codigo.includes(`data-mun-${a}="`);
  tratam[a] = new RegExp(`closest\\('\\[data-mun-${a}\\]'\\)`).test(codigo);
}
for (const a of ACOES) {
  if (emitem[a] && !tratam[a]) bloqueios.push(`data-mun-${a} é emitido mas nenhum handler o trata — botão que só aparece na interface`);
  if (!emitem[a] && tratam[a]) bloqueios.push(`handler para data-mun-${a} existe mas a interface nunca emite esse botão — ação invisível`);
}
const emissoes = ACOES.filter((a) => emitem[a]);
const tratamentos = ACOES.filter((a) => tratam[a]);
// FIXTURE: inventa um botão sem handler e um handler sem botão; os dois têm de ser acusados pela mesma
// função que olha para o payload real. Sem isto, «0 botões mortos» pode ser só a régua a não ver nada.
const fixtureHandler = (() => {
  const e = { ...emitem, botaoquefaznada: true }; const t = { ...tratam };
  const e2 = { ...emitem }; const t2 = { ...tratam, acaofantasma: true };
  const of1 = ACOES.concat('botaoquefaznada').filter((a) => e[a] && !t[a]).length;
  const of2 = ACOES.concat('acaofantasma').filter((a) => !e2[a] && t2[a]).length;
  return { ofensor_emitido_sem_handler: of1, ofensor_handler_sem_emissao: of2 };
})();
const autotesteHandler = {
  emissoes, tratamentos,
  dispara: fixtureHandler.ofensor_emitido_sem_handler >= 1 && fixtureHandler.ofensor_handler_sem_emissao >= 1
};
if (!autotesteHandler.dispara) bloqueios.push('AUTOTESTE handlers: a régua não acusou os dois fixture (botão sem handler / handler sem botão) — não vale nada');

// ── rótulos: a área nova não pode reclamar o rótulo legado da Secretaria escolar
const ROTULO_NOVO = 'Secretaria Municipal';
const ROTULO_LEGADO = 'Secretaria de Educação';
const usaLegado = codigo.includes(`>${ROTULO_LEGADO}<`) || codigo.includes(`'${ROTULO_LEGADO}'`);
if (usaLegado) bloqueios.push('o módulo reutiliza o rótulo legado «' + ROTULO_LEGADO + '», que já é ambíguo na base (4 marcações, §SM.1)');

// ── escrita ────────────────────────────────────────────────────────────────
const bloco = '\n<!-- SM6: MÓDULO 2 «' + ROTULO_NOVO + '» — candidata, não publicada. Fonte: scripts/sm6-modulo-municipal.txt -->\n<script data-bfr-municipal-module="1">\n' + payload + '\n</script>\n';
// `replace(</body>)` trocaria pela PRIMEIRA ocorrência, que vive dentro de uma string do bundle: a
// injeção é por índice da última, e o resultado é conferido byte a byte.
const saida = base.slice(0, fimBody) + bloco + base.slice(fimBody);
// Prova estrutural da injeção ANTES de escrever: tudo o que precede o ponto tem de ser byte a byte o que
// já era, o documento tem de acabar com a cauda original, e o marcador do módulo tem de aparecer uma vez.
const paridade = {
  prefixo_identico: saida.slice(0, fimBody) === base.slice(0, fimBody),
  sufixo_identico: saida.endsWith(base.slice(fimBody)),
  marcador_uma_vez: saida.split('data-bfr-municipal-module="1"').length - 1 === 1,
  depois_de_ultimo_body: saida.lastIndexOf('data-bfr-municipal-module="1"') > fimBody
};
for (const [nome, ok] of Object.entries(paridade)) if (!ok) bloqueios.push(`injeção: ${nome} falhou — nada é escrito`);
const escreveu = !bloqueios.length;
if (escreveu) {
  if (existsSync(DESTINO)) { console.log('VERMELHO  já existe ' + DESTINO + ' — correr com outro nome'); process.exit(1); }
  mkdirSync(`${DIR}/bfr-candidata-v${V}-secretaria-municipal`, { recursive: true });
  writeFileSync(DESTINO, saida);
}
const bufSaida = escreveu ? readFileSync(DESTINO) : Buffer.alloc(0);
const textoSaida = bufSaida.toString('utf8');
const verifSaida = escreveu ? {
  existe: existsSync(DESTINO), bytes: statSync(DESTINO).size, md5: md5(bufSaida),
  delta_vs_base: statSync(DESTINO).size - baseBuf.length,
  // A paridade de prefixo/sufixo é a prova de que a base não foi tocada fora do ponto de injeção.
  prefixo_igual_a_base: textoSaida.slice(0, fimBody) === base.slice(0, fimBody),
  sufixo_igual_a_base: textoSaida.slice(textoSaida.length - base.slice(fimBody).length) === base.slice(fimBody),
  ocultas_secretaria_municipal: textoSaida.split('secretaria-municipal').length - 1,
  script_injetado: textoSaida.split('data-bfr-municipal-module="1"').length - 1,
  ocorrencias_body_na_saida: textoSaida.split('</body>').length - 1,
  insere_se_apos_o_ultimo_body: textoSaida.lastIndexOf('data-bfr-municipal-module') > textoSaida.indexOf('</body>'),
  base_inalterada: md5(readFileSync(BASE)) === BASE_MD5
} : null;

const diario = {
  programa: 'scripts/sm6-candidata-municipal.mjs',
  em: new Date().toISOString(),
  publicacao: false,
  escrita_no_banco: false,
  origem: 'bfr-candidata-v121-rotulos-supervisor/index.html', origem_md5_medido: BASE_MD5, origem_md5_agora: baseMedido,
  modulo_fonte: 'scripts/sm6-modulo-municipal.txt', modulo_bytes: Buffer.byteLength(payload),
  destino: `bfr-candidata-v${V}-secretaria-municipal/index.html`,
  o_que_prova: 'que o payload é sintaticamente válido; que cada tabela, coluna e embutido que ele pede existem no catálogo medido (31 foreign keys, 16 tabelas); que as 10 abas do menu têm carregador e renderizador; que cada atributo de ação emitido tem manipulador e vice-versa; e que a injeção deixou o prefixo e o sufixo do documento byte a byte idênticos à base, com o marcador do módulo a aparecer exatamente uma vez antes do último </body>.',
  o_que_NAO_prova: 'nada disto abre a página. A aba abrir, carregar e permitir as operações autorizadas só se prova com navegador autenticado por perfil — o que exige OK (§10 do briefing). Sem sessão, a régua mais forte possível é estática: nomes, manipuladores e estrutura.',
  ancora: contasAncora,
  ocorrencias_body_na_base: ocorrenciasBody.length, posicao_da_ultima: fimBody,
  paridade_da_injecao: paridade, mapa_de_papeis: mapa,
  sintaxe: sintaxe,
  abas: tabsDeclaradas, chaves_carregadores: chavesCarreg, chaves_render: chavesRender,
  autoteste_superficie: autotesteSuperficie, autoteste_abas: autotesteAba,
  problemas_de_superficie_encontrados_no_payload: superficie.length,
  dados_nao_escritos: 'nenhum valor numético está no código: todos os cartões e tabelas vêm de chamadas ao cliente Supabase do próprio bundle (BFR_APP_RUNTIME.client), e o painel imprime o escopo efetivo devolvido em vez de um total de rede inventado.',
  saida: verifSaida, bloqueios, veredito: escreveu ? 'CANDIDATA_ESCRITA_SEM_PUBLICAR' : 'CANDIDATA_BLOQUEADA'
};
writeFileSync(OUT, JSON.stringify(diario, null, 1) + '\n');
console.log(diario.veredito);
console.log('ÂNCORAS', JSON.stringify(contasAncora));
console.log('ABAS', tabsDeclaradas.length, '| superfície do payload:', superficie.length, 'problema(s)');
console.log('AUTOTESTES', JSON.stringify({ superficie: autotesteSuperficie, handlers: { emissoes, tratamentos, dispara: autotesteHandler.dispara }, abas: autotesteAba }));
if (escreveu) console.log('SAÍDA', JSON.stringify(verifSaida));
if (bloqueios.length) console.log(JSON.stringify(bloqueios, null, 1));
process.exit(bloqueios.length ? 1 : 0);
