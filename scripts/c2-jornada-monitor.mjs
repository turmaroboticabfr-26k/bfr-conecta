// C2-3 perna 1 — monitor registra ocorrência de percurso pela UI viva (Monitor Central).
// Prova gap_1: route_incidents criado, notification_status='pending_guardian', NENHUM student_messages.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIR, sql, stage, criarGates } from './c2-lib.mjs';
import { connect, bootAs } from './c2-cdp.mjs';

const URL = JSON.parse(readFileSync(`${DIR}/docs/v118-swclone-publicacao.json`, 'utf8')).alvo;
const fx = JSON.parse(readFileSync(`${DIR}/docs/c2-fixtures.json`, 'utf8'));
const { gate, resumo } = criarGates();
const out = { perna: 'monitor', em: new Date().toISOString(), url: URL, aluno: fx.aluno };

const cdp = await connect();
try {
  console.log('[1] boot monitor no ar');
  await bootAs(cdp, 'monitor', 'monitor', URL);
  gate('boot monitor (appShell.ready + role)', await cdp.evalJS(`window.BFR_CURRENT_PROFILE?.role === 'monitor'`), true);

  console.log('[2] Monitor Central monta + aluno C2 no select');
  await cdp.waitFor(`!!document.querySelector('#monitorView [data-monitor-central]')`, 60000);
  await cdp.waitFor(`window.BFRMonitorCentral?.state?.loaded === true`, 90000);
  gate('Central do Monitor montada', await cdp.evalJS(`!!document.querySelector('#monitorView [data-monitor-central]')`), true);
  const alunoNoEstado = await cdp.evalJS(`window.BFRMonitorCentral.state.students.some(s => s.id === ${JSON.stringify(fx.aluno)})`);
  gate('aluno C2 no estado do monitor (RLS monitor_read)', alunoNoEstado, true);

  console.log('[3] ação rápida record-route → formulário fonte=route');
  await cdp.evalJS(`document.querySelector('#monitorView [data-mon-action="record-route"]').click()`);
  await cdp.waitFor(`!!document.querySelector('[data-mon-record-form]')`, 15000);
  gate('formulário com source=route pré-selecionado', await cdp.evalJS(`document.querySelector('[data-mon-record-form] select[name="source"]').value`), 'route');
  gate('aluno C2 é opção do select', await cdp.evalJS(`!!document.querySelector('[data-mon-record-form] select[name="student_id"] option[value="${fx.aluno}"]')`), true);

  const metricAntes = await cdp.evalJS(`(() => { const cards = [...document.querySelectorAll('#monitorView .bfr-monitor-card')]; const c = cards.find(x => x.textContent.includes('percursos sem envio confirmado')); return c ? Number(c.querySelector('strong').textContent) : -1; })()`);
  console.log('  métrica percursos sem envio (overview, antes do submit):', metricAntes);

  console.log('[4] preencher + Salvar registro (INSERT real via UI)');
  await cdp.evalJS(`(() => {
    const f = document.querySelector('[data-mon-record-form]');
    f.student_id.value = ${JSON.stringify(fx.aluno)};
    f.type.value = 'Ocorrência';
    f.observation.value = 'C2 sintético: ônibus atrasou 10 min no ponto combinado (fixture do ciclo C2).';
    f.action.value = 'C2 sintético: responsável avisado por telefone na fixture.';
    f.querySelector('button[type="submit"]').click();
    return true;
  })()`);
  // Aguardar status do form (sucesso ou erro) ANTES do re-render periódico (1.8s)
  await new Promise(r => setTimeout(r, 2500));
  const statusText = await cdp.evalJS(`document.querySelector('[data-mon-record-status]')?.textContent || ''`);
  console.log('  status do form após submit:', statusText);
  out.form_status = statusText;

  // Verificar se o INSERT foi bem-sucedido no banco
  const rows = await sql(`select id, incident_type, notification_status, monitor_id, description from public.route_incidents where student_id='${fx.aluno}'::uuid;`);
  if (rows.length === 0) {
    console.log('  ⚠️  INSERT falhou — gap_1 comportamental: monitor não consegue criar route_incidents via UI');
    gate('route_incidents: monitor consegue criar via UI', false, true);
    out.gap1_blocker = 'INSERT falhou (RLS ou outro erro)';
  } else {
    gate('route_incidents: exatamente 1 linha do aluno C2', rows.length, 1);
    gate('notification_status = pending_guardian (não notifica)', rows[0]?.notification_status, 'pending_guardian');
    gate('monitor_id = conta sintética monitor', rows[0]?.monitor_id, JSON.parse(readFileSync(`${DIR}/docs/c2-accounts.json`, 'utf8')).contas.find(c => c.chave === 'monitor').uid);
    const msgs = await sql(`select count(*)::int as n from public.student_messages where student_id='${fx.aluno}'::uuid;`);
    gate('student_messages do aluno C2 = 0 (gap_1 comportamental)', msgs[0].n, 0);
    out.route_incident_id = rows[0]?.id;
    out.notification_status = rows[0]?.notification_status;
    out.gap1_comportamental = 'PROVADO: route_incidents criado, notification_status=pending_guardian, ZERO student_messages';
  }

  console.log('[6] métrica overview incrementou (só se INSERT OK)');
  if (rows.length > 0) {
    await cdp.evalJS(`document.querySelector('#monitorView [data-mon-tab="overview"]').click()`);
    await new Promise(r => setTimeout(r, 800));
    const metricDepois = await cdp.evalJS(`(() => { const cards = [...document.querySelectorAll('#monitorView .bfr-monitor-card')]; const c = cards.find(x => x.textContent.includes('percursos sem envio confirmado')); return c ? Number(c.querySelector('strong').textContent) : -1; })()`);
    gate('métrica percursos sem envio confirmado >= 1', metricDepois >= 1, true);
    out.metrica_percursos_sem_envio = metricDepois;
  } else {
    console.log('  (métrica não verificada — INSERT falhou)');
    out.metrica_percursos_sem_envio = 'N/A (INSERT falhou)';
  }
} finally { cdp.close(); }

const { portoes, falhas } = resumo();
out.portoes = portoes; out.falhas = falhas;
writeFileSync(`${DIR}/docs/c2-jornada-monitor.json`, JSON.stringify(out, null, 2) + '\n');
stage('jornada-monitor', { portoes, falhas: falhas.length, route_incident_id: out.route_incident_id, gap1_comportamental: falhas.length === 0 });
console.log(`\nPORTÕES: ${portoes}  FALHAS: ${falhas.length}`);
falhas.forEach(f => console.log('  VERMELHO: ' + f));
console.log(falhas.length ? 'C2_MONITOR_PAROU' : 'C2_MONITOR_OK');
if (falhas.length) process.exit(1);