// E2E-3 · Modal "Lançar nota" — gravação real via clique no ar (v60).
// Fluxo: app com sessão pedagogical sintética → aba Avaliações → "+ Lançar nota"
// (#teacherOpenGrade) → modal #activityModal com o formulário seguro (ensureGradeForm)
// → preenche aluno/disciplina/avaliação/nota/bimestre → Salvar nota → confirma
// #activitySuccess visível → prova no banco: EXATAMENTE 1 linha nova em grades
// (o submit em fase de captura usa stopImmediatePropagation e impede o listener
// legado de gravar em dobro) com os campos esperados; total = baseline + 1.
import fs from 'node:fs';
import { abrirApp, fecharApp, irPara, clicar, sleep, salvarJson } from './manual-v59-e2e-lib.mjs';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const REF = 'yyzqoxlkcvqpessypfjo';
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const token = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const fix = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).fixture;
const contaPed = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).contas.pedagogical;
const baseline = JSON.parse(fs.readFileSync(`${DIR}/e2e2-baseline.json`, 'utf8')).dados;
const AVALIACAO = `Prova E2E-3 ${Date.now()}`;
const NOTA = 8.5;
const TERMO = 1;

const diario = {
  em: new Date().toISOString(), ref: REF, fixture: fix, avaliacao: AVALIACAO, nota: NOTA, termo: TERMO,
  baseline_grades: baseline.counts.grades,
};
const rodarSql = async (query) => {
  const r = await fetch(SQL_URL, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql HTTP ${r.status} ${t.slice(0, 500)}`);
  return JSON.parse(t);
};
const falhar = (msg) => { diario.falha = msg; salvarJson(`${DIR}/e2e3-nota-modal.json`, diario); throw new Error(msg); };

let ctx = null;
try {
  console.log('[1] abre o app (sessão pedagogical sintética, 1280)');
  ctx = await abrirApp({ largura: 1280, altura: 900, porta: 9361 });
  const { p } = ctx;
  diario.boot = ctx.boot;
  if (!ctx.boot || !ctx.boot.ready) falhar('boot não assentou: ' + JSON.stringify(ctx.boot));

  console.log('[2] navega para Avaliações');
  const nav = await irPara(p, 'professor-avaliacoes');
  diario.nav = nav;
  if (!nav.ok) falhar('navegação para professor-avaliacoes falhou: ' + JSON.stringify(nav));

  console.log('[3] espera o botão "+ Lançar nota" e clica');
  const iniBtn = Date.now();
  let btn = null;
  while (Date.now() - iniBtn < 20000) {
    btn = await p.avaliar(`
      const b = document.getElementById('teacherOpenGrade');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { existe: true, w: Math.round(r.width), h: Math.round(r.height), hidden: b.classList.contains('hidden') };
    `).catch(() => null);
    if (btn?.existe && btn.w > 0 && btn.h > 0) break;
    await sleep(700); await p.desgelo();
  }
  diario.botao_lancar = btn;
  if (!btn?.existe || !(btn.w > 0)) falhar('botão Lançar nota não apareceu: ' + JSON.stringify(btn));
  const clic = await clicar(p, '#teacherOpenGrade', { tentativas: 5, pausa: 700 });
  diario.clique_lancar = clic;
  if (!clic.ok) falhar('clique no Lançar nota falhou: ' + JSON.stringify(clic));

  console.log('[4] espera o modal com o formulário seguro preenchido com os 2 alunos');
  const iniForm = Date.now();
  let form = null;
  while (Date.now() - iniForm < 20000) {
    form = await p.avaliar(`
      const modal = document.getElementById('activityModal');
      const aluno = document.getElementById('gradeStudent');
      const disciplina = document.getElementById('gradeSubject');
      if (!modal || modal.classList.contains('hidden')) return { modalVis: false };
      return { modalVis: true,
               aluno: aluno ? [...aluno.options].map(o => ({ v: o.value, t: o.text })) : null,
               disciplina: disciplina ? [...disciplina.options].map(o => ({ v: o.value, t: o.text })) : null,
               classe: document.querySelector('[data-bfr-academic-class]')?.value || null };
    `).catch(() => null);
    if (form?.modalVis && form.aluno?.some(o => o.v === fix.aluno1) && form.aluno?.some(o => o.v === fix.aluno2) && form.disciplina?.length) break;
    await sleep(700); await p.desgelo();
  }
  diario.formulario = form;
  if (!form?.modalVis) falhar('modal não abriu: ' + JSON.stringify(form));
  if (!form.aluno?.some(o => o.v === fix.aluno1 && o.v !== '') || !form.aluno?.some(o => o.v === fix.aluno2)) {
    falhar('opções de aluno não contêm os 2 alunos sintéticos: ' + JSON.stringify(form));
  }
  if (!form.disciplina?.length) falhar('nenhuma disciplina autorizada no formulário: ' + JSON.stringify(form));

  // Escolhe a disciplina: prefere História (a do vínculo do fixture); senão usa a 1ª opção.
  const disciplinaEscolhida = form.disciplina.some(o => o.v === 'História') ? 'História' : form.disciplina[0].v;
  diario.disciplina_escolhida = disciplinaEscolhida;

  console.log('[5] preenche o formulário (aluno 1, disciplina, avaliação única, 8,5, 1º bimestre)');
  const pre2 = await p.avaliar(`
    const aluno = document.getElementById('gradeStudent');
    const disciplina = document.getElementById('gradeSubject');
    const avaliacao = document.getElementById('gradeAssessment');
    const nota = document.getElementById('gradeScore');
    const termo = document.getElementById('gradeTerm');
    if (!aluno || !disciplina || !avaliacao || !nota || !termo) return { ok: false };
    const setValor = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    setValor(aluno, ${JSON.stringify(fix.aluno1)});
    setValor(disciplina, ${JSON.stringify(disciplinaEscolhida)});
    setValor(avaliacao, ${JSON.stringify(AVALIACAO)});
    setValor(nota, ${JSON.stringify(String(NOTA))});
    setValor(termo, ${JSON.stringify(String(TERMO))});
    return { ok: true, aluno: aluno.value, disciplina: disciplina.value, avaliacao: avaliacao.value, nota: nota.value, termo: termo.value };
  `).catch(() => null);
  diario.preenchimento = pre2;
  if (!pre2?.ok) falhar('preenchimento do formulário falhou: ' + JSON.stringify(pre2));
  const confere = await p.avaliar(`
    return { aluno: document.getElementById('gradeStudent')?.value,
             disciplina: document.getElementById('gradeSubject')?.value,
             avaliacao: document.getElementById('gradeAssessment')?.value,
             nota: document.getElementById('gradeScore')?.value,
             termo: document.getElementById('gradeTerm')?.value };
  `).catch(() => null);
  diario.campos_finais = confere;
  if (confere?.aluno !== fix.aluno1 || confere?.avaliacao !== AVALIACAO || confere?.termo !== String(TERMO)) {
    falhar('campos não persistiram no formulário: ' + JSON.stringify(confere));
  }

  console.log('[6] clica Salvar nota e espera a confirmação');
  const salvar = await clicar(p, '#activityForm button[type="submit"]', { tentativas: 5, pausa: 700 });
  diario.clique_salvar = salvar;
  if (!salvar.ok) falhar('clique em Salvar nota falhou: ' + JSON.stringify(salvar));
  const iniOk = Date.now();
  let sucesso = null;
  while (Date.now() - iniOk < 20000) {
    sucesso = await p.avaliar(`
      const form = document.getElementById('activityForm');
      const suc = document.getElementById('activitySuccess');
      const erro = document.getElementById('gradeFormError');
      return { formHidden: form ? form.classList.contains('hidden') : null,
               sucessoVis: suc ? !suc.classList.contains('hidden') : null,
               sucessoTexto: suc ? suc.innerText.replace(/\\s+/g, ' ').trim().slice(0, 120) : null,
               erroVis: erro ? !erro.classList.contains('hidden') : null,
               erroTexto: erro?.innerText?.trim() || null };
    `).catch(() => null);
    if (sucesso?.sucessoVis) break;
    if (sucesso?.erroVis) break;
    await sleep(700); await p.desgelo();
  }
  diario.confirmacao = sucesso;
  if (!sucesso?.sucessoVis) falhar('confirmação de sucesso não apareceu: ' + JSON.stringify(sucesso));

  console.log('[7] prova no banco: exatamente 1 linha nova com os campos esperados');
  const prova = await rodarSql(`select json_build_object(
    'linhas', (select coalesce(json_agg(json_build_object('student_id',student_id,'subject',subject,'assessment',assessment,'score',score,'term',term,'entered_by',entered_by,'created_at',created_at) order by created_at),'[]') from public.grades where student_id='${fix.aluno1}' and assessment='${AVALIACAO}'),
    'total_tabela', (select count(*)::int from public.grades)
  ) as dados;`);
  diario.prova_banco = prova[0].dados;
  const linhasDb = prova[0].dados.linhas;
  if (linhasDb.length !== 1) falhar(`esperava exatamente 1 linha da avaliação, achei ${linhasDb.length}: ` + JSON.stringify(linhasDb));
  const linha = linhasDb[0];
  if (linha.student_id !== fix.aluno1 || linha.subject !== disciplinaEscolhida || linha.score !== NOTA || linha.term !== TERMO || linha.entered_by !== contaPed) {
    falhar('linha gravada com campos divergentes: ' + JSON.stringify(linha));
  }
  if (prova[0].dados.total_tabela !== diario.baseline_grades + 1) {
    falhar(`total de grades divergente: baseline ${diario.baseline_grades} + 1 ≠ ${prova[0].dados.total_tabela}`);
  }

  console.log('[8] confere o estado na tela após o re-render');
  const tela = await p.avaliar(`
    const form = document.getElementById('activityForm');
    const modal = document.getElementById('activityModal');
    return { formHidden: form ? form.classList.contains('hidden') : null,
             modalAberto: modal ? !modal.classList.contains('hidden') : null,
             sucessoVis: !!document.getElementById('activitySuccess') && !document.getElementById('activitySuccess').classList.contains('hidden') };
  `).catch(() => null);
  diario.tela_final = tela;

  diario.veredito = 'APROVADO';
  console.log('NOTA MODAL E2E APROVADO');
} catch (e) {
  diario.falha = String(e?.message || e);
  diario.veredito = 'FALHOU';
  console.error('FALHOU:', diario.falha);
} finally {
  try { if (ctx) await fecharApp(ctx); } catch {}
  salvarJson(`${DIR}/e2e3-nota-modal.json`, diario);
  if (diario.falha) process.exitCode = 1;
}
