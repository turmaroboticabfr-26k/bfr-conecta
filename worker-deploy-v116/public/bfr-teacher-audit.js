(() => {
  'use strict';

  const teacherState = () => window.BFR_TEACHER_RUNTIME?.state || null;
  const scheduleSync = () => {
    if (scheduleSync.pending) return;
    scheduleSync.pending = true;
    requestAnimationFrame(() => {
      scheduleSync.pending = false;
      syncWarnings();
      syncPendingCounts();
    });
  };

  function syncWarnings() {
    const shell = document.querySelector('#teacherView [data-teacher-professional]');
    if (!shell) return;
    const data = teacherState();
    let notice = shell.querySelector('[data-teacher-data-warning]');
    const warnings = data?.loaded && Array.isArray(data.warnings) ? data.warnings : [];
    if (!warnings.length) {
      notice?.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement('aside');
      notice.dataset.teacherDataWarning = 'true';
      notice.setAttribute('role', 'status');
      notice.innerHTML = '<span>Alguns dados não puderam ser atualizados. Uma lista vazia pode não significar ausência de registros.</span><button type="button">Tentar novamente</button>';
      notice.querySelector('button').addEventListener('click', () => window.BFR_SECURE_TEACHER_LOADER?.(true));
      shell.querySelector('.teacher-pro-hero')?.after(notice);
    }
  }

  function syncPendingCounts() {
    const command = document.querySelector('#teacherView [data-teacher-command]');
    const metrics = window.BFR_TEACHER_PENDING_METRICS?.();
    if (!command || !metrics) return;
    const cards = command.querySelectorAll('.bfr-teacher-command-pending article');
    const setCard = (card, value, label) => {
      if (!card) return;
      const number = card.querySelector('strong');
      const description = card.querySelector('span');
      if (number) number.textContent = value;
      if (description) description.textContent = label;
    };
    setCard(cards[0], metrics.missing === null ? '—' : String(metrics.missing), metrics.missing === null ? (metrics.hasClassesToday ? 'horário de saída não confirmado' : 'sem aula prevista hoje') : 'alunos sem registro após a última aula');
    setCard(cards[1], String(metrics.activities), 'prazos nos próximos 7 dias');
    setCard(cards[2], metrics.lowAttendance === null ? '—' : String(metrics.lowAttendance), metrics.lowAttendance === null ? 'sem registros de frequência' : 'em atenção nos registros carregados');
  }

  function sync() {
    syncWarnings();
    syncPendingCounts();
  }

  const style = document.createElement('style');
  style.id = 'bfr-teacher-audit-style';
  style.textContent = '#teacherView [data-teacher-data-warning]{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:11px 13px;border:1px solid #f3d18a;border-radius:11px;color:#805b13;background:#fffbeb;font-size:11px;line-height:1.45}#teacherView [data-teacher-data-warning] button{flex:0 0 auto;border:1px solid #e6c06a;border-radius:8px;padding:7px 9px;color:#76510b;background:#fff;font:inherit;font-weight:700}@media(max-width:520px){#teacherView [data-teacher-data-warning]{align-items:flex-start;flex-direction:column}}';
  document.head.appendChild(style);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('bfr:app-ready', scheduleSync);
  window.addEventListener('bfr:role-change', scheduleSync);
  window.addEventListener('bfr:navigation', scheduleSync);
  window.addEventListener('bfr-teacher-scope-ready', scheduleSync);
  scheduleSync();
})();
