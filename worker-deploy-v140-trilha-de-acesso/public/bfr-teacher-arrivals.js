(() => {
  'use strict';

  if (window.__bfrTeacherArrivals) return;
  window.__bfrTeacherArrivals = true;

  const state = {
    channel:null,
    classIds:[],
    classLabels:new Map(),
    students:new Map(),
    studentIds:new Set(),
    rows:[],
    signature:'',
    loading:false,
    loaded:false,
    queued:false,
    pendingNoticeId:'',
    liveStatus:'connecting',
    error:'',
    note:'Carregando as turmas autorizadas...'
  };
  let toastTimer = 0;

  const profile = () => window.BFR_CURRENT_PROFILE || window.BFR_APP_RUNTIME?.profile || null;
  const user = () => window.BFR_CURRENT_USER || window.BFR_APP_RUNTIME?.user || null;
  const client = () => window.BFR_SUPABASE_CLIENT || window.BFR_APP_RUNTIME?.client || null;
  const isTeacher = () => {
    const role = profile()?.role;
    const activeView = window.BFR_APP_RUNTIME?.activeView;
    return ['pedagogical','teacher'].includes(role) && (!activeView || ['pedagogical','teacher'].includes(activeView));
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

  function dayRange() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone:'America/Maceio', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const tomorrow = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1)).toISOString().slice(0, 10);
    return { start:`${today}T00:00:00-03:00`, end:`${tomorrow}T00:00:00-03:00` };
  }

  function timeLabel(value) {
    return value ? new Date(value).toLocaleTimeString('pt-BR', {
      timeZone:'America/Maceio', hour:'2-digit', minute:'2-digit'
    }) : '—';
  }

  function isConfirmedArrival(item) {
    return item?.direction === 'entry' && !['blocked','pending_visual'].includes(String(item.entry_status || '').toLowerCase());
  }

  function classScope() {
    const cards = [...document.querySelectorAll('#teacherView [data-teacher-class-list] .teacher-pro-class-card')];
    const result = new Map();
    cards.forEach(card => {
      const button = card.querySelector('[data-teacher-class-id]');
      const id = button?.dataset.teacherClassId;
      if (id) result.set(id, card.querySelector('h3')?.textContent.trim() || 'Turma');
    });
    return result;
  }

  function makePanel(screen, position) {
    if (!screen) return;
    let panel = screen.querySelector('[data-teacher-arrivals-panel]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'panel bfr-teacher-arrivals-panel';
      panel.dataset.teacherArrivalsPanel = 'true';
      panel.dataset.teacherCommand = 'true';
      panel.innerHTML = `<div class="teacher-arrivals-head"><div><div class="eyebrow">Portaria · chegadas de hoje</div><h2>Chegadas na escola</h2><p>Entradas confirmadas pelo QR nas suas turmas. Atualiza automaticamente.</p></div><span class="teacher-arrivals-live" data-teacher-arrivals-live role="status">CONECTANDO</span></div><div class="teacher-arrivals-list" data-teacher-arrivals-list></div><p class="teacher-arrivals-footnote">Este registro confirma a chegada à escola; não substitui a chamada da aula.</p>`;
    }
    const anchor = position === 'home'
      ? screen.querySelector('[data-teacher-command] .bfr-teacher-command-head') || screen.querySelector('.teacher-pro-metrics')
      : screen.querySelector('.teacher-pro-data-panel');
    if (anchor) {
      if (position === 'home' && anchor.nextElementSibling !== panel) anchor.after(panel);
      else if (position !== 'home' && panel.nextElementSibling !== anchor) anchor.before(panel);
    } else if (!panel.parentElement) screen.prepend(panel);
  }

  function ensurePanels() {
    const root = document.querySelector('#teacherView [data-teacher-professional]');
    if (!root) return false;
    makePanel(root.querySelector('[data-teacher-screen="inicio"]'), 'home');
    makePanel(root.querySelector('[data-teacher-screen="frequencia"]'), 'attendance');
    return true;
  }

  function render() {
    const liveText = state.error ? 'INDISPONÍVEL' : state.liveStatus === 'subscribed' ? 'AO VIVO' : 'ATUALIZANDO';
    let content = '';
    if (state.error) content = `<div class="teacher-arrivals-empty">${escapeHtml(state.error)}</div>`;
    else if (!state.loaded) content = `<div class="teacher-arrivals-empty">${escapeHtml(state.note)}</div>`;
    else if (!state.rows.length) content = '<div class="teacher-arrivals-empty">Nenhuma chegada confirmada pela Portaria hoje.</div>';
    else content = state.rows.slice(0, 12).map(item => `<article class="teacher-arrival-row"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.className)}</span></div><b>Chegou às ${escapeHtml(timeLabel(item.checked_at))}</b></article>`).join('');

    document.querySelectorAll('#teacherView [data-teacher-arrivals-panel]').forEach(panel => {
      panel.querySelector('[data-teacher-arrivals-live]').textContent = liveText;
      panel.querySelector('[data-teacher-arrivals-live]').classList.toggle('is-offline', Boolean(state.error) || state.liveStatus === 'error');
      panel.querySelector('[data-teacher-arrivals-list]').innerHTML = content;
    });
  }

  function showToast(item) {
    if (!item) return;
    let toast = document.getElementById('bfrTeacherArrivalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bfrTeacherArrivalToast';
      toast.className = 'bfr-teacher-arrival-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = `Chegada confirmada: ${item.name}, ${item.className}, às ${timeLabel(item.checked_at)}.`;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 9000);
  }

  async function refresh(noticeId = '') {
    if (state.loading) {
      state.queued = true;
      state.pendingNoticeId = noticeId || state.pendingNoticeId;
      return;
    }
    const db = client();
    const classIds = [...state.classLabels.keys()];
    if (!db || !classIds.length) return;
    const signature = state.signature;
    state.loading = true;
    state.error = '';
    if (!state.loaded) state.note = 'Carregando as chegadas da Portaria...';
    render();
    try {
      const studentsResult = await db.from('students')
        .select('id,official_name,class_id')
        .eq('active', true)
        .in('class_id', classIds)
        .limit(600);
      if (studentsResult.error) throw studentsResult.error;
      if (signature !== state.signature) return;
      state.students = new Map((studentsResult.data || []).map(item => [item.id, item]));
      state.studentIds = new Set(state.students.keys());
      if (!state.studentIds.size) {
        state.rows = [];
        state.loaded = true;
        state.note = 'Nenhum aluno ativo nas turmas vinculadas.';
        startRealtime();
        return;
      }
      const range = dayRange();
      const checkinsResult = await db.from('gate_checkins')
        .select('id,student_id,direction,checked_at,entry_status')
        .in('student_id', [...state.studentIds])
        .gte('checked_at', range.start)
        .lt('checked_at', range.end)
        .eq('direction', 'entry')
        .order('checked_at', { ascending:false })
        .limit(300);
      if (checkinsResult.error) throw checkinsResult.error;
      if (signature !== state.signature) return;
      state.rows = (checkinsResult.data || []).filter(isConfirmedArrival).map(item => {
        const student = state.students.get(item.student_id);
        return {
          ...item,
          name:student?.official_name || 'Aluno identificado',
          className:state.classLabels.get(student?.class_id) || 'Turma vinculada'
        };
      });
      state.loaded = true;
      state.note = '';
      startRealtime();
      if (noticeId) showToast(state.rows.find(item => item.id === noticeId));
    } catch {
      if (signature === state.signature) state.error = 'Não foi possível carregar as chegadas. Verifique a conexão ou o acesso ao registro da Portaria.';
    } finally {
      state.loading = false;
      render();
      if (state.queued) {
        const nextNoticeId = state.pendingNoticeId;
        state.queued = false;
        state.pendingNoticeId = '';
        refresh(nextNoticeId);
      }
    }
  }

  function startRealtime() {
    const db = client();
    if (state.channel || !state.studentIds.size || !db?.channel) return;
    const id = user()?.id || 'teacher';
    state.channel = db.channel(`bfr-teacher-arrivals-${id}`)
      .on('postgres_changes', {
        event:'*', schema:'public', table:'gate_checkins',
        filter:`student_id=in.(${[...state.studentIds].join(',')})`
      }, payload => {
        const row = payload.new || payload.old;
        if (!row?.student_id || !state.studentIds.has(row.student_id)) return;
        const noticeId = payload.eventType !== 'DELETE' && isConfirmedArrival(row) ? row.id : '';
        refresh(noticeId);
      })
      .subscribe(status => {
        state.liveStatus = status === 'SUBSCRIBED' ? 'subscribed' : ['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status) ? 'error' : 'connecting';
        render();
      });
  }

  function clearTeacherData() {
    state.channel?.unsubscribe?.();
    state.channel = null;
    state.classIds = [];
    state.classLabels.clear();
    state.students.clear();
    state.studentIds.clear();
    state.rows = [];
    state.signature = '';
    state.loaded = false;
    state.error = '';
    state.liveStatus = 'connecting';
    document.querySelectorAll('#teacherView [data-teacher-arrivals-panel]').forEach(panel => panel.remove());
    document.getElementById('bfrTeacherArrivalToast')?.remove();
  }

  function sync() {
    if (!isTeacher()) {
      clearTeacherData();
      return;
    }
    if (!ensurePanels()) return;
    const classes = classScope();
    const signature = [...classes.keys()].sort().join('|');
    if (!signature) {
      if (state.signature) {
        state.channel?.unsubscribe?.();
        state.channel = null;
        state.signature = '';
        state.classLabels = new Map();
        state.students.clear();
        state.studentIds.clear();
        state.rows = [];
        state.loaded = false;
        state.error = '';
      }
      const note = document.querySelector('#teacherView [data-teacher-class-list] .teacher-pro-empty')?.textContent.trim() || 'Carregando as turmas autorizadas...';
      if (note !== state.note) { state.note = note; render(); }
      return;
    }
    if (signature !== state.signature) {
      state.signature = signature;
      state.classIds = [...classes.keys()];
      state.classLabels = classes;
      state.students.clear();
      state.studentIds.clear();
      state.rows = [];
      state.loaded = false;
      state.error = '';
      state.note = 'Carregando as chegadas da Portaria...';
      refresh();
    }
  }

  const style = document.createElement('style');
  style.id = 'bfr-teacher-arrivals-style';
  style.textContent = `
    #teacherView .bfr-teacher-arrivals-panel{min-width:0}
    #teacherView .teacher-arrivals-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
    #teacherView .teacher-arrivals-head h2{margin-top:4px;color:#172554;font-size:18px}
    #teacherView .teacher-arrivals-head p{margin-top:4px;color:#64748b;font-size:11px;line-height:1.45}
    #teacherView .teacher-arrivals-live{flex:none;border-radius:999px;padding:5px 8px;color:#166534;background:#ecfdf5;font-size:11px;font-weight:800;letter-spacing:.04em}
    #teacherView .teacher-arrivals-live.is-offline{color:#a16207;background:#fef3c7}
    #teacherView .teacher-arrivals-list{display:grid;gap:6px;min-width:0}
    #teacherView .teacher-arrival-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #edf2f7}
    #teacherView .teacher-arrival-row strong,#teacherView .teacher-arrival-row span{display:block;overflow-wrap:anywhere}
    #teacherView .teacher-arrival-row strong{color:#243b63;font-size:11px}
    #teacherView .teacher-arrival-row span{margin-top:3px;color:#64748b;font-size:11px}
    #teacherView .teacher-arrival-row>b{color:#1d4ed8;font-size:11px;white-space:nowrap}
    #teacherView .teacher-arrivals-empty{padding:13px;border:1px dashed #cbd5e1;border-radius:11px;color:#64748b;background:#f8fafc;font-size:11px;line-height:1.45}
    #teacherView .teacher-arrivals-footnote{margin-top:9px;color:#71809a;font-size:11px;line-height:1.4}
    .bfr-teacher-arrival-toast{position:fixed;z-index:1500;right:20px;bottom:22px;max-width:min(420px,calc(100vw - 32px));padding:13px 16px;border:1px solid #b7d8fa;border-radius:13px;color:#173b79;background:#fff;box-shadow:0 12px 34px rgba(16,41,95,.2);font:700 12px/1.45 'DM Sans',sans-serif;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .2s ease,transform .2s ease}
    .bfr-teacher-arrival-toast.is-visible{opacity:1;transform:translateY(0)}
    @media(max-width:800px){.bfr-teacher-arrival-toast{right:12px;bottom:calc(88px + env(safe-area-inset-bottom));left:12px;max-width:none}}
    @media(max-width:430px){#teacherView .teacher-arrivals-head{gap:7px}#teacherView .teacher-arrival-row{grid-template-columns:minmax(0,1fr);gap:4px}}
  `;
  document.head.append(style);

  window.addEventListener('bfr:app-ready', sync);
  window.addEventListener('bfr:role-change', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && isTeacher()) refresh(); });
  setInterval(sync, 1000);
  setInterval(() => { if (isTeacher() && state.signature) refresh(); }, 30000);
  sync();
})();
