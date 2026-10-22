// E2E-4 · Biblioteca — abertura de obra digital pelo professor (somente leitura, sem escrever no banco).
// Fluxo real no v60: nav professor-biblioteca → botão [data-teacher-library="virtual"] →
// bfrOpenReadingLibrary() + bfrUnifiedLibrary.openTab('virtual') → catálogo [data-bfr-unified-catalog]
// dentro de #readingLibraryView → botão "Abrir livro" ([data-library-open-doc]) →
// createSignedUrl('school-documents', path, 900) → window.open da URL assinada em nova aba.
// Provas: (1) nova aba CDP com URL assinada (/storage/v1/object/sign/school-documents/),
// (2) HTTP 200 do documento assinado via fetch do Node, (3) botão volta a "Abrir livro"
// (falha honesta se ficar "Acesso indisponível").
import { abrirApp, fecharApp, clicar, sleep, salvarJson, irPara } from './manual-v59-e2e-lib.mjs';
import { HOST } from './manual-v59-e2e-lib.mjs';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const PORTA = 9361;
const diario = { em: new Date().toISOString(), host: HOST, porta: PORTA };
const falhar = (msg) => { diario.falha = msg; salvarJson(`${DIR}/e2e4-biblioteca.json`, diario); throw new Error(msg); };
const cdpAlvos = async () => {
  const r = await fetch(`http://localhost:${PORTA}/json`);
  if (!r.ok) throw new Error('json HTTP ' + r.status);
  return r.json();
};

let ctx = null;
try {
  console.log('[1] boot pedagogical 1280 (porta ' + PORTA + ')');
  ctx = await abrirApp({ largura: 1280, altura: 900, porta: PORTA });
  const { p } = ctx;
  diario.boot = ctx.boot;
  if (!ctx.boot?.ready) falhar('boot não assentou: ' + JSON.stringify(ctx.boot));

  console.log('[2] navega para professor-biblioteca');
  const nav = await irPara(p, 'professor-biblioteca');
  diario.nav = nav;
  if (!nav.ok) falhar('navegação para a Biblioteca falhou: ' + JSON.stringify(nav));

  const botoes = await p.avaliar(`
    return [...document.querySelectorAll('[data-teacher-library]')].map(b => {
      const q = b.getBoundingClientRect();
      return { kind: b.dataset.teacherLibrary, texto: (b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 50),
               w: Math.round(q.width), h: Math.round(q.height), hidden: b.classList.contains('hidden') };
    });
  `).catch(() => null);
  diario.botoes_entrada = botoes;
  if (!botoes?.some(b => b.kind === 'virtual')) falhar('botão de Biblioteca virtual ausente: ' + JSON.stringify(botoes));

  console.log('[3] clica "Biblioteca virtual"');
  const clicVirtual = await clicar(p, '[data-teacher-library="virtual"]', { tentativas: 4, pausa: 700 });
  diario.clique_virtual = clicVirtual;
  if (!clicVirtual.ok) falhar('clique em Biblioteca virtual falhou: ' + JSON.stringify(clicVirtual));

  const iniCat = Date.now();
  let cat = null;
  while (Date.now() - iniCat < 25000) {
    cat = await p.avaliar(`
      const host = document.querySelector('[data-bfr-unified-catalog]');
      const botoes = [...(host?.querySelectorAll('[data-library-open-doc]') || [])];
      const visiveis = botoes.filter(b => { const q = b.getBoundingClientRect(); return q.width > 0 && q.height > 0; });
      const alvo = visiveis[0] || null;
      const abaAtiva = host?.querySelector('[data-library-tab].is-active');
      return { catalogo: !!host, nBotoes: botoes.length, nVisiveis: visiveis.length,
               abaAtiva: abaAtiva?.dataset.libraryTab || null,
               primeiro: alvo ? { path: alvo.dataset.libraryOpenDoc, texto: alvo.textContent.trim() } : null };
    `).catch(() => null);
    if (cat?.catalogo && cat.nVisiveis > 0) break;
    await sleep(700); await p.desgelo();
  }
  diario.catalogo = cat;
  if (!cat?.catalogo) falhar('catálogo unificado não montou: ' + JSON.stringify(cat));
  if (!cat?.nVisiveis) falhar('nenhum botão "Abrir livro" visível na aba virtual: ' + JSON.stringify(cat));
  const obraPath = cat.primeiro.path;

  console.log('[4] clica "Abrir livro" na primeira obra digital');
  const antes = await cdpAlvos().catch(() => null);
  diario.alvos_antes = antes?.filter(t => t.type === 'page').map(t => t.url.slice(0, 100)) ?? null;
  const clicAbrir = await clicar(p, '[data-library-open-doc]', { tentativas: 4, pausa: 700 });
  diario.clique_abrir = clicAbrir;
  if (!clicAbrir.ok) falhar('clique em Abrir livro falhou: ' + JSON.stringify(clicAbrir));

  // prova 1: nova aba CDP com URL assinada do storage
  const iniAba = Date.now();
  let abaNova = null, alvosPos = null;
  while (Date.now() - iniAba < 20000) {
    alvosPos = await cdpAlvos().catch(() => null);
    abaNova = alvosPos?.find(t => t.type === 'page' && /\/storage\/v1\/object\/sign\/school-documents\//.test(t.url)) || null;
    if (abaNova) break;
    await sleep(500);
  }
  diario.alvos_depois = alvosPos?.filter(t => t.type === 'page').map(t => t.url.slice(0, 160)) ?? null;
  diario.aba_assinada = abaNova ? { url: abaNova.url, titulo: abaNova.title, ms: Date.now() - iniAba } : null;

  // prova 2: transição do texto do botão (Abrindo... → Abrir livro; falha se Acesso indisponível)
  const textoDepois = await p.avaliar(`
    const b = document.querySelector('[data-library-open-doc]');
    return b ? { texto: b.textContent.trim(), disabled: b.disabled } : null;
  `).catch(() => null);
  diario.botao_depois = textoDepois;

  // prova 3: HTTP do documento assinado
  let httpDoc = null;
  if (abaNova) {
    httpDoc = await fetch(abaNova.url, { redirect: 'follow' })
      .then(r => ({ status: r.status, ct: r.headers.get('content-type'), len: r.headers.get('content-length') }))
      .catch(e => ({ erro: String(e?.message || e) }));
  }
  diario.http_doc = httpDoc;

  if (!abaNova) falhar('nova aba com a URL assinada não apareceu: ' + JSON.stringify({ alvosDepois: diario.alvos_depois, botao: textoDepois }));
  if (!httpDoc || (httpDoc.status !== 200 && httpDoc.status !== 206)) falhar('documento assinado não respondeu 200/206: ' + JSON.stringify(httpDoc));
  if (textoDepois?.texto === 'Acesso indisponível') falhar('botão acusou Acesso indisponível: ' + JSON.stringify(textoDepois));

  diario.obra = { path: obraPath, urlAssinada: abaNova.url, status: httpDoc.status, tipo: httpDoc.ct };
  diario.veredito = 'APROVADO';
  console.log('BIBLIOTECA E2E APROVADO');
} catch (e) {
  diario.falha = String(e?.message || e);
  diario.veredito = 'FALHOU';
  console.error('FALHOU:', diario.falha);
} finally {
  try { if (ctx) await fecharApp(ctx); } catch {}
  salvarJson(`${DIR}/e2e4-biblioteca.json`, diario);
  if (diario.falha) process.exitCode = 1;
}
