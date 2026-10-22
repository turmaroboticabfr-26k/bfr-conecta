// E2E-2 · Frequência por aula — gravação real via clique no ar (v60).
// Fluxo: abrir app com sessão pedagogical sintética → aba Frequência → turma 9ZY →
// aba "Frequência" do painel → data 2026-10-22 (quinta, aula 1 da grade real) →
// UM=presente DOIS=falta → Salvar → confere status → corrige UM para atrasado com motivo → Salvar.
// Prova final no banco via Management API (2 linhas em bfr_lesson_attendance, status late/absent).
import fs from 'node:fs';
import { abrirApp, fecharApp, irPara, clicar, selecionar, sleep, esperarTexto, salvarJson } from './manual-v59-e2e-lib.mjs';

const DIR = 'C:/Users/pcmac/.kiro/crew/uploads';
const REF = 'yyzqoxlkcvqpessypfjo';
const SQL_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const token = fs.readFileSync('C:/Users/pcmac/.supabase-pat', 'utf8').trim();
const fix = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).fixture;
const contaPed = JSON.parse(fs.readFileSync(`${DIR}/e2e2-fixture.json`, 'utf8')).contas.pedagogical;
const baseline = JSON.parse(fs.readFileSync(`${DIR}/e2e2-baseline.json`, 'utf8')).dados;
const DATA = '2026-10-22';

const diario = {
  em: new Date().toISOString(), ref: REF, fixture: fix, data: DATA,
  baseline_lesson_attendance: baseline.counts.bfr_lesson_attendance,
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
const falhar = (msg) => { diario.falha = msg; salvarJson(`${DIR}/e2e2-frequencia.json`, diario); throw new Error(msg); };

let ctx = null;
try {
  console.log('[1] abre o app (sessão pedagogical sintética, 1280)');
  ctx = await abrirApp({ largura: 1280, altura: 900, porta: 9361 });
  const { p } = ctx;
  diario.boot = ctx.boot;
  if (!ctx.boot || !ctx.boot.ready) falhar('boot não assentou: ' + JSON.stringify(ctx.boot));

  console.log('[2] navega para Frequência');
  const nav = await irPara(p, 'professor-frequencia');
  diario.nav = nav;
  if (!nav.ok) falhar('navegação para professor-frequencia falhou: ' + JSON.stringify(nav));

  console.log('[3] escolhe a turma sintética 9ZY');
  const ini = Date.now();
  let opcoes = null;
  while (Date.now() - ini < 20000) {
    opcoes = await p.avaliar(`
      const s = document.querySelector('[data-bfr-academic-class]');
      if (!s) return null;
      return { valor: s.value, n: s.options.length, tem: [...s.options].some(o => o.value === ${JSON.stringify(fix.classe)}) };
    `).catch(() => null);
    if (opcoes?.tem) break;
    await sleep(600); await p.desgelo();
  }
  diario.opcoes_classe = opcoes;
  if (!opcoes?.tem) falhar('turma 9ZY não apareceu nas opções autorizadas: ' + JSON.stringify(opcoes));
  const selClasse = await selecionar(p, '[data-bfr-academic-class]', fix.classe);
  diario.selecao_classe = selClasse;
  if (!selClasse.ok) falhar('seleção da turma falhou: ' + JSON.stringify(selClasse));

  console.log('[4] ativa a aba Frequência do painel acadêmico');
  const tab = await clicar(p, '#academicPanel [data-academic-tab="attendance"]');
  diario.clique_tab = tab;
  await sleep(1200);

  console.log('[5] fixa a data e espera a aula da grade (quinta · aula 1 · História)');
  const fixData = await p.avaliar(`
    const d = document.getElementById('attendanceDate');
    if (!d) return null;
    d.value = ${JSON.stringify(DATA)};
    d.dispatchEvent(new Event('change', { bubbles: true }));
    return d.value;
  `);
  diario.data_input = fixData;
  const iniAula = Date.now();
  let aula = null;
  while (Date.now() - iniAula < 20000) {
    aula = await p.avaliar(`
      const s = document.getElementById('attendanceLesson');
      const c = document.getElementById('attendanceControls');
      return { opcoes: s ? [...s.options].map(o => ({ v: o.value, t: o.text.slice(0, 60) })) : null,
               desabilitado: s?.disabled, controlesVis: !!c && !c.classList.contains('hidden'),
               linha: ${JSON.stringify(fix.entrada)} };
    `).catch(() => null);
    if (aula?.opcoes?.some(o => o.v === fix.entrada) && aula.controlesVis) break;
    await sleep(700); await p.desgelo();
  }
  diario.aula = aula;
  if (!aula?.opcoes?.some(o => o.v === fix.entrada)) falhar('aula da grade não apareceu: ' + JSON.stringify(aula));
  if (!aula.controlesVis) falhar('controles de frequência não visíveis: ' + JSON.stringify(aula));

  console.log('[6] espera as duas linhas de aluno e marca presente/falta');
  const iniLinhas = Date.now();
  let linhas = null;
  while (Date.now() - iniLinhas < 20000) {
    linhas = await p.avaliar(`
      const rows = [...document.querySelectorAll('#academicTable tbody tr')];
      return { n: rows.length, nomes: rows.map(r => (r.querySelector('td:first-child')?.innerText || '').trim()),
               sels: [...document.querySelectorAll('#academicTable select[data-attendance-student]')].map(s => ({ id: s.dataset.attendanceStudent, valor: s.value, desab: s.disabled })) };
    `).catch(() => null);
    if (linhas?.sels?.length === 2 && linhas.sels.every(s => !s.desab)) break;
    await sleep(700); await p.desgelo();
  }
  diario.linhas = linhas;
  if (linhas?.sels?.length !== 2) falhar('linhas de alunos não assentaram: ' + JSON.stringify(linhas));

  // A evidência do portão (RPC) re-renderiza a tabela ao resolver e zera selects pendentes.
  // Espera o tbody ficar quiescente (3 leituras idênticas, 1s entre elas) antes de marcar.
  const iniQ = Date.now();
  let snap = null, vistos = 0, quies = false;
  while (Date.now() - iniQ < 15000) {
    const atual = await p.avaliar(`
      const t = document.getElementById('academicTable');
      return t ? t.querySelector('tbody').innerHTML.length : null;
    `).catch(() => null);
    if (atual !== null && atual === snap) vistos += 1; else { snap = atual; vistos = 0; }
    if (vistos >= 3) { quies = true; break; }
    await sleep(1000); await p.desgelo();
  }
  diario.quiescencia = { quies, snap };
  if (!quies) falhar('tabela não assentou antes da marcação: ' + JSON.stringify(diario.quiescencia));

  const marcar = await p.avaliar(`
    const um = document.querySelector('#academicTable select[data-attendance-student="${fix.aluno1}"]');
    const dois = document.querySelector('#academicTable select[data-attendance-student="${fix.aluno2}"]');
    if (!um || !dois || um.disabled || dois.disabled) return { ok: false };
    um.value = 'present'; um.dispatchEvent(new Event('change', { bubbles: true }));
    dois.value = 'absent'; dois.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, um: um.value, dois: dois.value };
  `);
  diario.marcacoes = marcar;
  if (!marcar?.ok || marcar.um !== 'present' || marcar.dois !== 'absent') falhar('marcação de status falhou: ' + JSON.stringify(marcar));

  console.log('[7] clica Salvar aula');
  const btn = await clicar(p, '#saveAttendanceBtn', { tentativas: 6, pausa: 600 });
  diario.clique_salvar = btn;
  if (!btn.ok) falhar('clique no Salvar aula bloqueado: ' + JSON.stringify(btn));
  const st1 = await esperarTexto(p, '#attendanceSaveStatus', '2 registro', 20000);
  diario.status_salvo_1 = st1;
  if (!st1.ok) falhar('status de confirmação não apareceu: ' + JSON.stringify(st1));

  console.log('[8] corrige UM para atrasado com motivo (caminho de alteração com justificativa)');
  const c1 = await p.avaliar(`
    const um = document.querySelector('#academicTable select[data-attendance-student="${fix.aluno1}"]');
    const dois = document.querySelector('#academicTable select[data-attendance-student="${fix.aluno2}"]');
    if (!um || !dois) return { ok: false };
    um.value = 'late'; um.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, um: um.value, dois: dois.value };
  `);
  diario.correcao_marca = c1;
  if (!c1?.ok || c1.um !== 'late' || c1.dois !== 'absent') falhar('correção de marca falhou: ' + JSON.stringify(c1));
  const motivo = await p.avaliar(`
    const r = document.getElementById('attendanceChangeReason');
    if (!r) return null;
    r.focus(); r.select();
    document.execCommand('insertText', false, 'Correção do teste E2E-2');
    return r.value;
  `);
  diario.motivo = motivo;
  const btn2 = await clicar(p, '#saveAttendanceBtn', { tentativas: 6, pausa: 600 });
  diario.clique_salvar_2 = btn2;
  if (!btn2.ok) falhar('clique no Salvar (correção) bloqueado: ' + JSON.stringify(btn2));
  const st2 = await esperarTexto(p, '#attendanceSaveStatus', '1 registro', 20000);
  diario.status_salvo_2 = st2;
  if (!st2.ok) falhar('status da correção não apareceu: ' + JSON.stringify(st2));

  console.log('[9] prova final no banco');
  const prova = await rodarSql(`select json_build_object(
    'linhas', (select coalesce(json_agg(json_build_object('student_id',student_id,'status',status,'lesson_date',lesson_date,'schedule_entry_id',schedule_entry_id,'period',period,'subject',subject,'source',source,'entered_by',entered_by,'manual_reason',manual_reason) order by student_id),'[]') from public.bfr_lesson_attendance where class_id='${fix.classe}' and schedule_entry_id='${fix.entrada}' and lesson_date='${DATA}'),
    'total_tabela', (select count(*)::int from public.bfr_lesson_attendance),
    'audit', (select coalesce(json_agg(json_build_object('student_id',student_id,'schedule_entry_id',schedule_entry_id,'lesson_date',lesson_date,'old_status',old_status,'new_status',new_status,'reason',reason,'changed_by',changed_by) order by changed_at),'[]') from public.bfr_lesson_attendance_audit where class_id='${fix.classe}' and schedule_entry_id='${fix.entrada}' and lesson_date='${DATA}')
  ) as dados;`);
  diario.prova_banco = prova[0].dados;
  console.log(JSON.stringify(diario.prova_banco, null, 2));
  const linhasDb = prova[0].dados.linhas;
  if (linhasDb.length !== 2) falhar('banco não tem as 2 linhas esperadas: ' + JSON.stringify(linhasDb));
  const porAluno = Object.fromEntries(linhasDb.map(l => [l.student_id, l]));
  if (porAluno[fix.aluno1]?.status !== 'late') falhar('aluno 1 deveria estar late no banco: ' + JSON.stringify(porAluno));
  if (porAluno[fix.aluno2]?.status !== 'absent') falhar('aluno 2 deveria estar absent no banco: ' + JSON.stringify(porAluno));
  for (const l of linhasDb) {
    if (l.lesson_date !== DATA || l.schedule_entry_id !== fix.entrada || l.source !== 'teacher' || l.entered_by !== contaPed || l.period !== 1 || l.subject !== 'História') {
      falhar('linha com campos fora do esperado: ' + JSON.stringify(l));
    }
  }
  if (porAluno[fix.aluno1]?.manual_reason !== 'Correção do teste E2E-2') falhar('motivo da correção não gravado: ' + JSON.stringify(porAluno[fix.aluno1]));
  const auditDb = prova[0].dados.audit;
  const correcaoAudit = auditDb.find(a => a.student_id === fix.aluno1);
  if (!correcaoAudit || correcaoAudit.old_status !== 'present' || correcaoAudit.new_status !== 'late'
      || correcaoAudit.reason !== 'Correção do teste E2E-2' || correcaoAudit.changed_by !== contaPed) {
    falhar('trilha de auditoria sem a correção esperada: ' + JSON.stringify(auditDb));
  }
  if (prova[0].dados.total_tabela !== diario.baseline_lesson_attendance + 2) {
    falhar(`total da tabela divergente: baseline ${diario.baseline_lesson_attendance} + 2 ≠ ${prova[0].dados.total_tabela}`);
  }

  console.log('[10] confere o estado na tela após o re-render');
  const tela = await p.avaliar(`
    const rows = [...document.querySelectorAll('#academicTable select[data-attendance-student]')].map(s => ({ id: s.dataset.attendanceStudent, valor: s.value }));
    const resumo = [...document.querySelectorAll('#academicTable tbody tr')].map(r => r.innerText.replace(/\\s+/g,' ').trim().slice(0, 160));
    return { rows, resumo };
  `);
  diario.tela_final = tela;

  diario.veredito = 'APROVADO';
  console.log('FREQUÊNCIA E2E APROVADO');
} catch (e) {
  diario.falha = String(e?.message || e);
  diario.veredito = 'FALHOU';
  console.error('FALHOU:', diario.falha);
} finally {
  try { if (ctx) await fecharApp(ctx); } catch {}
  salvarJson(`${DIR}/e2e2-frequencia.json`, diario);
  if (diario.falha) process.exitCode = 1;
}
