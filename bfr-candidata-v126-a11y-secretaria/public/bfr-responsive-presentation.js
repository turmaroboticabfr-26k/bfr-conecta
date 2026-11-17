(() => {
  'use strict';

  if (window.__bfrResponsivePresentation) return;
  window.__bfrResponsivePresentation = true;

  const mobile = matchMedia('(max-width: 800px), (orientation: landscape) and (max-width: 1000px) and (max-height: 500px)');
  const app = () => document.getElementById('appShell');
  const role = () => window.BFR_APP_RUNTIME?.profile?.role || window.BFR_CURRENT_PROFILE?.role || '';
  const menu = () => document.getElementById('mobileMoreMenu');
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const roleLabels = { parent:'Responsável', student:'Estudante', teacher:'Professor', pedagogical:'Professor', coordinator:'Coordenação', developer:'Administrador', director:'Direção', secretary:'Secretaria', monitor:'Monitor', gatekeeper:'Portaria', aee:'Professor do AEE', psychology:'Psicologia', social_work:'Assistente social', sports_operator:'Operador de placar' };
  const quickRoutes = {
    parent:['inicio','notas','agenda','atividades'], student:['inicio','boletim','agenda','jogos'],
    teacher:['professor-inicio','professor-turmas','professor-frequencia','professor-agenda'],
    pedagogical:['professor-inicio','professor-turmas','professor-frequencia','professor-agenda'],
    coordinator:['inicio','coordenacao','horarios','ocorrencias','comunicados'], developer:['inicio','cadastro-alunos','direcao','administracao','notificacoes'],
    director:['director:overview','director:pedagogical','director:students','director:communication','director:reports'],
    secretary:['inicio','secretaria','comunicacao','comunicados'], monitor:['inicio','monitor','ocorrencias','horarios'],
    gatekeeper:['inicio','gate','horarios','comunicados'], aee:['inicio','aee','atividades','horarios'],
    psychology:['inicio','psychology','chat-interno'], social_work:['inicio','multiprofissional','chat-interno'],
    sports_operator:['inicio','jogos-escolares','notificacoes']
  };
  const directorItems = [
    ['Hoje','⌂','director:overview'], ['Alunos','♟','director:students'], ['Frequência','✓','director:pedagogical'],
    ['Professores','♙','director:teachers'], ['Ocorrências','!','director:occurrences'], ['Agenda e comunicação','▣','director:agenda'], ['Comunicação','◌','director:communication'],
    ['Relatórios','▥','director:reports'], ['Acompanhamento','◈','director:followup']
  ];
  const directorScreenLabels = { overview:'Hoje', students:'Alunos', pedagogical:'Frequência', teachers:'Professores', occurrences:'Ocorrências', agenda:'Agenda e comunicação', reports:'Relatórios', followup:'Acompanhamento' };

  // O Chrome emite registro de mutação mesmo quando a escrita não muda nada: classList.add de um
  // token que já está lá e setAttribute com o mesmo valor. Como o sync() se escuta no
  // MutationObserver de class do document.body (debounce de 60ms reiniciado por toda mutação),
  // uma dessas escritas por ciclo realimenta o próprio ciclo para sempre. Medido no celular em
  // 2026-10-14: 15 ciclos por segundo, 2.183 mutações em 2,5s, e o sync() nunca terminava de
  // montar a barra superior e a navegação de baixo — o menu simplesmente não aparecia.
  const addCls = (node, name) => { if (node && !node.classList.contains(name)) node.classList.add(name); };
  const setCls = (node, name, on) => { if (node && node.classList.contains(name) !== Boolean(on)) node.classList.toggle(name, Boolean(on)); };
  const setAttr = (node, name, value) => { if (node && node.getAttribute(name) !== value) node.setAttribute(name, value); };
  const setData = (node, name, value) => { if (node && node.dataset[name] !== value) node.dataset[name] = value; };
  let drawerTrigger = null;

  function setCurrentRoute(route) {
    document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]').forEach(button => {
      setAttr(button, 'aria-current', route && button.dataset.bfrMobileRoute === route ? 'page' : 'false');
    });
  }

  function activateDirectorScreen(screen) {
    const route = `director:${screen}`;
    const label = directorScreenLabels[screen] || 'Direção escolar';
    setCurrentRoute(['overview','students','pedagogical','reports'].includes(screen) ? route : null);
    const breadcrumb = document.querySelector('.breadcrumb b');
    if (breadcrumb && role() === 'director') breadcrumb.textContent = label;
    if (mobile.matches) requestAnimationFrame(() => document.querySelector(`.bfr-direction-executive [data-exec-view="${screen}"]`)?.scrollIntoView({ behavior:'smooth', block:'start' }));
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'B';
  }

  function currentName() {
    const label = document.querySelector('[data-account-display-name]');
    return label?.firstChild?.textContent.trim()
      || label?.textContent.trim()
      || window.BFR_CURRENT_PROFILE?.full_name
      || window.BFR_APP_RUNTIME?.profile?.full_name
      || (role() === 'parent' ? 'Família BFR' : 'Comunidade escolar');
  }

  function drawerItems() {
    const items = [];
    const seen = new Set();
    const teacherRole = ['teacher','pedagogical'].includes(role());
    const selector = teacherRole
      ? '#appShell .sidebar [data-teacher-nav] .nav-item[data-section]:not(.hidden)'
      : '#appShell .sidebar .nav-item[data-section]:not(.hidden),#mobileMoreMenu .mobile-more-option[data-section]:not(.hidden)';
    document.querySelectorAll(selector).forEach(node => {
      if (node.matches('[data-mobile-more],[data-mobile-more-legacy],.mobile-more-item') || node.closest('.hidden')) return;
      const route = node.dataset.section;
      if (!route || seen.has(route)) return;
      const copy = node.cloneNode(true);
      copy.querySelectorAll('.nav-icon,.nav-badge').forEach(child => child.remove());
      if (node.matches('.mobile-more-option')) copy.querySelector('span')?.remove();
      const label = copy.textContent.trim().replace(/\s+/g, ' ');
      if (!label) return;
      const icon = node.querySelector('.nav-icon')?.textContent.trim() || node.querySelector('span')?.textContent.trim() || '•';
      items.push({ label, icon, route });
      seen.add(route);
    });
    return items;
  }

  function activeRoute() {
    const runtime = window.BFR_APP_RUNTIME;
    if (role() === 'director' && runtime?.activeSection === 'direcao') {
      const screen = document.querySelector('.bfr-direction-executive .bfr-exec-tabs [data-exec-screen].active')?.dataset.execScreen;
      return screen ? `director:${screen}` : 'director:overview';
    }
    // A sidebar do HTML continua no documento em 390 px, mas está oculta por media query no
    // ANCESTRAL: `:not(.hidden)` não a filtra, e o `.active` parado em `inicio` (index.html:2502)
    // vencia o activeSection real — 75 das 168 telas mobile destacavam Início (#55). Só entra
    // o que tem altura, que é o critério que o próprio varredor da auditoria usa.
    const comAltura = (el) => !!el && el.getBoundingClientRect().height > 0;
    const sidebarAtiva = document.querySelector('#appShell .sidebar .nav-item.active[data-section]:not(.hidden)');
    const professorAtiva = document.querySelector('#appShell .sidebar .nav-item.active[data-teacher-nav-tab]:not(.hidden)');
    return (comAltura(sidebarAtiva) && sidebarAtiva.dataset.section)
      || (comAltura(professorAtiva) && professorAtiva.dataset.section)
      || runtime?.activeSection
      || '';
  }

  function ensureMobileChrome() {
    const shell = app();
    const main = shell?.querySelector(':scope > main');
    const topbar = main?.querySelector(':scope > .topbar');
    if (!main) return;
    let header = document.getElementById('bfrMobileAppbar');
    if (!header) {
      const logo = shell.querySelector('.sidebar .app-logo')?.getAttribute('src') || 'bfr-app-logo.png';
      const liaAvatar = window.BFR_LIA_AVATAR_PATH || 'lia-avatar.png';
      header = document.createElement('header');
      header.id = 'bfrMobileAppbar';
      header.className = 'bfr-mobile-appbar';
       header.innerHTML = `<button class="bfr-mobile-menu-button" type="button" data-bfr-open-drawer aria-label="Abrir menu" aria-controls="bfrMobileDrawer" aria-expanded="false">☰</button><div class="bfr-mobile-brand"><img src="${esc(logo)}" alt=""><div><span>BFR CONECTA</span><small>Escola Benício Ferreira Reis</small></div></div><button class="bfr-mobile-action" type="button" data-bfr-mobile-notifications aria-label="Notificações"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg></button><button class="bfr-mobile-lia" type="button" data-lia-open aria-label="Abrir a LIA" title="Abrir a LIA"><img src="${esc(liaAvatar)}" alt=""></button><button class="bfr-mobile-avatar" type="button" data-bfr-mobile-profile aria-label="Abrir meu perfil"></button>`;
      if (topbar) topbar.after(header); else main.prepend(header);
    }
    let drawer = document.getElementById('bfrMobileDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'bfrMobileDrawer';
      drawer.className = 'bfr-mobile-drawer';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.inert = true;
      drawer.innerHTML = `<button class="bfr-mobile-drawer-backdrop" type="button" data-bfr-drawer-backdrop aria-label="Fechar menu"></button><aside class="bfr-mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="Menu BFR Conecta" tabindex="-1"><div class="bfr-mobile-drawer-head"><img src="${esc(shell.querySelector('.sidebar .app-logo')?.getAttribute('src') || 'bfr-app-logo.png')}" alt=""><div class="bfr-mobile-drawer-brand">BFR CONECTA<small>Escola Benício Ferreira Reis</small></div><button class="bfr-mobile-drawer-close" type="button" data-bfr-close-drawer aria-label="Fechar menu">×</button></div><div class="bfr-mobile-drawer-identity"><span class="bfr-mobile-avatar" data-bfr-drawer-initials></span><div><strong data-bfr-drawer-name></strong><small data-bfr-drawer-role></small></div></div><div class="bfr-menu-weather" data-bfr-menu-weather></div><div class="bfr-mobile-drawer-section-title">Navegação</div><nav class="bfr-mobile-drawer-links" data-bfr-drawer-links aria-label="Áreas disponíveis"></nav><div class="bfr-mobile-drawer-spacer"></div><div class="bfr-mobile-drawer-section-title">Conta</div><div class="bfr-mobile-drawer-account" data-bfr-drawer-account></div></aside>`;
      document.body.append(drawer);
    }
    updateIdentity();
  }

  function ensureDesktopLia() {
    const actions = document.querySelector('#appShell .topbar .top-actions');
    const bell = actions?.querySelector('#notificationBtn');
    if (!actions || !bell || actions.querySelector('[data-bfr-desktop-lia]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button bfr-topbar-lia';
    button.dataset.bfrDesktopLia = '';
    button.dataset.liaOpen = '';
    button.setAttribute('aria-label', 'Abrir a LIA');
    button.title = 'Abrir a LIA';
    const avatar = document.createElement('img');
    avatar.src = window.BFR_LIA_AVATAR_PATH || 'lia-avatar.png';
    avatar.alt = '';
    button.append(avatar);
    bell.before(button);
  }

  function updateIdentity() {
    const name = currentName();
    const roleName = roleLabels[role()] || 'Comunidade escolar';
    const letters = initials(name);
    const bell = document.querySelector('#notificationBtn .dot');
    const bellVisible = bell && getComputedStyle(bell).display !== 'none' && getComputedStyle(bell).visibility !== 'hidden';
    const header = document.getElementById('bfrMobileAppbar');
    const avatar = header?.querySelector('[data-bfr-mobile-profile]');
    const action = header?.querySelector('[data-bfr-mobile-notifications]');
    if (avatar && avatar.textContent !== letters) avatar.textContent = letters;
    setCls(action, 'has-unread', Boolean(bellVisible));
    const drawer = document.getElementById('bfrMobileDrawer');
    if (!drawer) return;
    const updateText = (selector, value) => {
      const element = drawer.querySelector(selector);
      if (element && element.textContent !== value) element.textContent = value;
    };
    updateText('[data-bfr-drawer-initials]', letters);
    updateText('[data-bfr-drawer-name]', name);
    updateText('[data-bfr-drawer-role]', roleName);
    const links = drawer.querySelector('[data-bfr-drawer-links]');
    const account = drawer.querySelector('[data-bfr-drawer-account]');
    if (!links || !account) return;
    const items = drawerItems();
    const signature = JSON.stringify([role(), name, items]);
    if (drawer.dataset.signature !== signature) {
      drawer.dataset.signature = signature;
      links.innerHTML = items.map(item => `<button class="bfr-mobile-drawer-link" type="button" data-bfr-drawer-route="${esc(item.route)}"><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">${esc(item.icon)}</span><span>${esc(item.label)}</span></button>`).join('');
      account.innerHTML = `<button class="bfr-mobile-drawer-link" type="button" data-bfr-drawer-tool="profile"><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">♙</span><span>Meu perfil</span></button><button class="bfr-mobile-drawer-link" type="button" data-bfr-drawer-tool="preferences"><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">⚙</span><span>Preferências</span></button><button class="bfr-mobile-drawer-link" type="button" data-bfr-drawer-tool="support"><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">?</span><span>Ajuda e suporte</span></button><button class="bfr-mobile-drawer-link" type="button" data-bfr-drawer-tool="about"><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">ⓘ</span><span>Sobre o BFR Conecta</span></button><button class="bfr-mobile-drawer-link is-logout" type="button" data-bfr-drawer-logout><span class="bfr-mobile-drawer-link-icon" aria-hidden="true">↪</span><span>Sair da conta</span></button>`;
    }
    const current = activeRoute();
    const drawerCurrent = String(current).startsWith('director:') ? 'direcao' : current;
    links.querySelectorAll('[data-bfr-drawer-route]').forEach(button => setAttr(button, 'aria-current', button.dataset.bfrDrawerRoute === drawerCurrent ? 'page' : 'false'));
  }

  function setDrawer(open) {
    const drawer = document.getElementById('bfrMobileDrawer');
    const trigger = document.querySelector('[data-bfr-open-drawer]');
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    document.body.classList.toggle('bfr-mobile-drawer-open', open);
    trigger?.setAttribute('aria-expanded', String(open));
    document.querySelector('#bfrMobileBottomNav [data-bfr-mobile-route="more"]')?.setAttribute('aria-expanded', String(open));
    if (open) drawer.querySelector('[data-bfr-close-drawer]')?.focus({ preventScroll:true });
    else if (drawerTrigger?.isConnected) drawerTrigger.focus({ preventScroll:true });
  }

  const style = document.createElement('style');
  style.id = 'bfr-responsive-presentation-style';
  style.textContent = `
    #bfr-platform-toast{position:fixed;z-index:1600;right:20px;bottom:20px;width:max-content;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;border:1px solid #c8e7dc;border-radius:14px;color:#164c3e;background:#f1fbf6;box-shadow:0 12px 32px rgba(17,55,45,.18);font:700 13px/1.4 'DM Sans',sans-serif;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .18s ease,transform .18s ease,visibility .18s}
     #bfr-platform-toast.is-visible{opacity:1;visibility:visible;transform:translateY(0)}
       body:has(#teacherView:not(.hidden)) #liaFab{display:none!important}
       #teacherView .teacher-pro-actions [data-teacher-open-lia]{display:inline-flex!important}
       .bfr-topbar-lia{width:42px!important;min-width:42px!important;height:42px!important;padding:0!important;overflow:hidden;border-radius:50%!important;background:#eff6ff!important}
       .bfr-topbar-lia img{display:block;width:100%;height:100%;object-fit:cover}
    @media(min-width:801px){
      #appShell.ready{grid-template-columns:252px minmax(0,1fr)!important;min-height:100dvh}
      #appShell.ready>.sidebar{position:sticky!important;top:0!important;width:252px!important;height:100dvh!important;max-height:100dvh!important;overflow:auto!important}
      #appShell.ready>main{min-width:0;width:100%;max-width:none}
      #appShell.ready>main>.content{width:100%;max-width:1680px;margin-inline:auto;padding-inline:clamp(24px,3vw,52px)}
      #appShell.ready .topbar{position:sticky;top:0;z-index:30;min-height:66px;padding-inline:clamp(24px,3vw,52px);backdrop-filter:blur(14px)}
      .bfr-direction-executive{max-width:none}
      .bfr-exec-table-wrap{max-width:100%;overflow:auto}
    }
    @media(min-width:801px) and (max-width:1100px){
      #appShell.ready{grid-template-columns:212px minmax(0,1fr)!important}
      #appShell.ready>.sidebar{width:212px!important}
      #appShell.ready>main>.content{padding-inline:22px}
      .bfr-exec-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .bfr-exec-grid{grid-template-columns:1fr!important}
    }
    .bfr-mobile-header,.bfr-mobile-bottom-nav,.bfr-mobile-appbar,.bfr-mobile-drawer{display:none}
    @media(max-width:800px),(orientation:landscape) and (max-width:1000px) and (max-height:500px){
      #appShell.ready{display:block!important;min-height:100dvh;padding:0 0 calc(86px + env(safe-area-inset-bottom))!important;overflow:clip}
      #appShell.ready>.sidebar{display:none!important}
      #appShell.ready>main{min-width:0;padding-top:0!important}
      #appShell.ready>main>.topbar{display:none!important}
      #appShell.ready>main>.content{min-height:calc(100dvh - 60px);padding:16px 14px calc(100px + env(safe-area-inset-bottom))!important;scroll-margin-top:calc(70px + env(safe-area-inset-top))}
      #appShell.ready .content :is(button,select,input:not([type="checkbox"]),textarea,[role="button"]),#appShell.ready .content a.tap-target{min-height:44px}
      .bfr-mobile-header{display:flex!important}
      .bfr-mobile-appbar{position:sticky;top:env(safe-area-inset-top);z-index:1100;display:flex;align-items:center;gap:12px;height:60px;padding:7px 14px;border-bottom:1px solid #e5ebf3;background:rgba(255,255,255,.96);backdrop-filter:blur(18px) saturate(1.08)}
      .bfr-mobile-menu-button,.bfr-mobile-action{position:relative;display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid transparent;border-radius:13px;color:#13336d;background:transparent;font:700 22px/1 'DM Sans',sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .bfr-mobile-menu-button:active,.bfr-mobile-action:active{background:#edf4ff}
      .bfr-mobile-brand{display:flex;align-items:center;gap:8px;flex:1;min-width:0;color:#12346d}
      .bfr-mobile-brand img{width:38px;height:38px;object-fit:contain}
      .bfr-mobile-brand span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 15px/1.05 'DM Sans',sans-serif;letter-spacing:-.04em}
      .bfr-mobile-brand small{display:block;margin-top:3px;color:#6a7b91;font:700 7px/1.1 'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase}
       .bfr-mobile-action svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
       .bfr-mobile-lia{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;padding:0;overflow:hidden;border:1px solid #dbe8fb;border-radius:50%;background:#eff6ff;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
       .bfr-mobile-lia img{display:block;width:100%;height:100%;object-fit:cover}
       .bfr-mobile-lia:active{background:#deebff}
      .bfr-mobile-action.has-unread:after{position:absolute;top:7px;right:8px;width:8px;height:8px;border:2px solid #fff;border-radius:50%;background:#e23b45;content:''}
      .bfr-mobile-avatar{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:2px solid #e3edf9;border-radius:50%;color:#fff;background:#1558bd;font:800 11px/1 'DM Sans',sans-serif}
       .bfr-mobile-bottom-nav{grid-template-columns:repeat(var(--bfr-nav-count,4),minmax(0,1fr));min-height:calc(72px + env(safe-area-inset-bottom));padding:5px 10px calc(5px + env(safe-area-inset-bottom));border-top-color:#e3eaf3;border-radius:17px 17px 0 0;box-shadow:0 -7px 24px rgba(16,41,95,.1)}
      .bfr-mobile-bottom-nav button{grid-template-rows:23px auto;gap:3px;min-height:50px;color:#66758b}
      .bfr-mobile-bottom-nav button:active,.bfr-mobile-bottom-nav button[aria-current="page"]{border-color:#d9e7fa;color:#1558bd;background:#f1f6ff}
      .bfr-mobile-bottom-nav .bfr-mobile-icon{width:23px;height:23px;font-size:18px}
      #mobileMoreMenu{display:none!important}
      .bfr-mobile-drawer{position:fixed;z-index:1500;inset:0;display:block;visibility:hidden;pointer-events:none;transition:visibility .22s}
      .bfr-mobile-drawer.is-open{visibility:visible;pointer-events:auto}
      .bfr-mobile-drawer-backdrop{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(9,24,49,.46);opacity:0;transition:opacity .22s;touch-action:manipulation}
      .bfr-mobile-drawer.is-open .bfr-mobile-drawer-backdrop{opacity:1}
      .bfr-mobile-drawer-panel{position:absolute;inset:0 auto 0 0;display:flex;flex-direction:column;gap:14px;width:min(88vw,360px);max-height:100dvh;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;border-radius:0 22px 22px 0;background:#fff;box-shadow:18px 0 48px rgba(9,24,49,.18);transform:translateX(-102%);transition:transform .24s cubic-bezier(.2,.75,.25,1)}
      .bfr-mobile-drawer.is-open .bfr-mobile-drawer-panel{transform:translateX(0)}
      .bfr-mobile-drawer-head{display:flex;align-items:center;gap:10px;min-height:44px}
      .bfr-mobile-drawer-head img{width:37px;height:37px;object-fit:contain}
      .bfr-mobile-drawer-brand{flex:1;color:#1558bd;font:800 15px/1.1 'DM Sans',sans-serif}
      .bfr-mobile-drawer-brand small{display:block;margin-top:4px;color:#738198;font-size:8px;letter-spacing:.06em;text-transform:uppercase}
      .bfr-mobile-drawer-close{display:grid;place-items:center;width:42px;height:42px;border:1px solid #e3eaf3;border-radius:13px;color:#173b79;background:#fff;font-size:23px;cursor:pointer}
      .bfr-mobile-drawer-identity{display:flex;align-items:center;gap:11px;padding:12px;border:1px solid #e2eaf4;border-radius:15px;background:linear-gradient(115deg,#f4f8ff,#fbfdff)}
      .bfr-mobile-drawer-identity .bfr-mobile-avatar{width:44px;height:44px;flex-basis:44px;font-size:12px}
      .bfr-mobile-drawer-identity strong,.bfr-mobile-drawer-identity small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bfr-mobile-drawer-identity strong{color:#183660;font-size:12px}
      .bfr-mobile-drawer-identity small{margin-top:4px;color:#74839a;font-size:10px}
      .bfr-mobile-drawer-section-title{margin:3px 0 0;color:#71809a;font:800 9px/1.2 'DM Sans',sans-serif;letter-spacing:.11em;text-transform:uppercase}
      .bfr-mobile-drawer-links,.bfr-mobile-drawer-account{display:grid;gap:4px}
      .bfr-mobile-drawer-link{display:flex;align-items:center;gap:11px;width:100%;min-height:46px;padding:9px 10px;border:1px solid transparent;border-radius:11px;color:#344b6d;background:#fff;text-align:left;font:650 12px/1.25 'DM Sans',sans-serif;cursor:pointer;touch-action:manipulation}
      .bfr-mobile-drawer-link:hover,.bfr-mobile-drawer-link[aria-current="page"]{border-color:#dce9fb;color:#1558bd;background:#f2f7ff}
      .bfr-mobile-drawer-link-icon{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;border-radius:9px;color:#1558bd;background:#edf4ff;font-size:16px}
      .bfr-mobile-drawer-spacer{flex:1 0 10px;min-height:10px}
      .bfr-mobile-drawer-account .bfr-mobile-drawer-link{min-height:42px;color:#52637a}
      .bfr-mobile-drawer-link.is-logout{color:#aa3340}
      body.bfr-mobile-drawer-open{overflow:hidden}
       .bfr-mobile-bottom-nav{position:fixed;z-index:1200;right:0;bottom:0;left:0;display:grid;grid-template-columns:repeat(var(--bfr-nav-count,4),minmax(0,1fr));gap:2px;min-height:calc(72px + env(safe-area-inset-bottom));padding:5px 10px calc(5px + env(safe-area-inset-bottom));border-top:1px solid #e3eaf3;border-radius:17px 17px 0 0;background:rgba(255,255,255,.98);box-shadow:0 -7px 24px rgba(16,41,95,.1);backdrop-filter:blur(18px);touch-action:manipulation}
      .bfr-mobile-bottom-nav button{display:grid;grid-template-rows:23px auto;align-content:center;justify-items:center;gap:3px;min-width:0;min-height:50px;margin:0;padding:5px 2px;border:1px solid transparent;border-radius:12px;color:#66758b;background:transparent;font:700 9px/1.1 'DM Sans',sans-serif;white-space:normal;overflow-wrap:anywhere;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .bfr-mobile-bottom-nav button:active,.bfr-mobile-bottom-nav button[aria-current="page"]{border-color:#d4e5fb;color:#1558bd;background:#f1f7ff}
      .bfr-mobile-bottom-nav .bfr-mobile-icon{display:grid;place-items:center;width:23px;height:23px;font-size:18px;line-height:1}
      #mobileMoreMenu{display:none!important}
      .bfr-direction-executive{margin-top:10px!important;padding:10px!important;border-radius:14px!important}
      .bfr-exec-head{display:grid!important;gap:10px!important}
      .bfr-exec-head-actions{justify-content:space-between}
      .bfr-exec-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
      .bfr-exec-metric{min-height:72px!important;padding:10px!important}
      .bfr-exec-metric strong{font-size:19px!important;overflow-wrap:anywhere}
      .bfr-exec-grid{grid-template-columns:1fr!important;gap:8px!important}
      .bfr-exec-card{min-width:0;padding:12px!important;border-radius:13px!important}
      .bfr-exec-card-head{align-items:flex-start;gap:8px}
      .bfr-exec-card-head>button{flex:0 0 auto;min-height:44px}
      .bfr-exec-tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px!important;overflow:visible!important;margin:10px 0!important}
      .bfr-exec-tabs button{min-height:44px;padding:8px!important;border:1px solid #dbe5f1!important;border-radius:10px;background:#fff!important;white-space:normal!important}
      .bfr-exec-tabs button.active{border-color:#1769d2!important;background:#f1f7ff!important}
      .bfr-exec-quick{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important}
      .bfr-mobile-actions,.bfr-mobile-filters{margin-top:9px;border:1px solid #dbe5f1;border-radius:12px;background:#fff}
      .bfr-mobile-actions>summary,.bfr-mobile-filters>summary{min-height:48px;padding:14px 12px;color:#173b79;font-size:12px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .bfr-mobile-actions>.bfr-exec-quick,.bfr-mobile-filters>.bfr-exec-filters{padding:0 11px 11px;border:0;background:transparent}
      .bfr-mobile-actions .bfr-exec-quick>strong{display:none}
      .bfr-exec-quick button,.bfr-exec-head-actions button,.bfr-exec-row-actions button,.bfr-exec-actions button,.bfr-exec-profile-actions button{min-width:0;min-height:44px;padding:9px!important;white-space:normal}
      .bfr-exec-table-wrap{overflow:visible!important}
      .bfr-exec-table,.bfr-exec-table tbody{display:grid;width:100%;min-width:0!important;gap:8px}
      .bfr-exec-table thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      .bfr-exec-table tbody tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:11px;border:1px solid #e1eaf4;border-radius:12px;background:#fff}
      .bfr-exec-table tbody td{display:grid;align-content:start;gap:3px;min-width:0;padding:0!important;border:0!important;font-size:11px;overflow-wrap:anywhere}
      .bfr-exec-table tbody td:first-child{grid-column:1/-1}
      .bfr-exec-table tbody td::before{content:attr(data-label);color:#71809a;font-size:9px;font-weight:700}
      .bfr-exec-table tbody td button{min-height:44px}
      .bfr-exec-global-search input,.bfr-exec-filters select{min-height:44px;font-size:16px!important}
      .bfr-exec-filters{display:grid!important;grid-template-columns:1fr!important}
      .bfr-direction-executive [data-exec-profile-host]:not([hidden]):not(:empty){position:fixed;z-index:1302;inset:calc(12px + env(safe-area-inset-top)) 8px calc(82px + env(safe-area-inset-bottom));overflow:auto;padding:10px;border:1px solid #dbe5f1;border-radius:18px;background:#fff;box-shadow:0 20px 60px rgba(15,35,68,.28)}
      .bfr-direction-executive [data-exec-profile-host]:not([hidden]):not(:empty) .bfr-exec-profile-actions button{min-height:44px}
       #bfrDirectionPanel,#directorView,.content{scroll-margin-bottom:calc(96px + env(safe-area-inset-bottom))}
       .content :is(button,a,input,select,textarea,[role="button"]){scroll-margin-bottom:calc(100px + env(safe-area-inset-bottom))}
        #bfrCommunicationView .bfr-communication-hero [data-communication-back]{min-height:44px;padding:10px 14px;border:1px solid rgba(255,255,255,.55);border-radius:12px;color:#14376e;background:#fff;font:700 12px/1.2 'DM Sans',sans-serif;cursor:pointer}
        #bfrQuickStudentShortcut[hidden]{display:none!important}
        #bfrCommunicationView .bfr-communication-hero{display:grid;align-items:start;gap:12px;padding:18px}
        #bfrCommunicationView .bfr-communication-actions{justify-content:flex-start;align-items:center}
        #bfrCommunicationView .bfr-communication-grid{grid-template-columns:minmax(0,1fr)!important}
        #bfrCommunicationView .bfr-communication-card{min-width:0;padding:14px}
        #bfrCommunicationView .bfr-communication-form :is(input,select,textarea){font-size:16px}
        #bfrCommunicationView .bfr-communication-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        #bfrCommunicationView .bfr-communication-tabs button{min-height:44px;padding:9px 8px;white-space:normal}
        #multiprofessionalView .bfr-mp-hero{display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:12px;padding:17px}
        #multiprofessionalView .bfr-mp-actions{justify-content:flex-start}
        #multiprofessionalView .bfr-mp-metrics,#multiprofessionalView .bfr-mp-student-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        #multiprofessionalView .bfr-mp-grid{grid-template-columns:minmax(0,1fr)!important}
        #multiprofessionalView .bfr-mp-grid>*{min-width:0}
       #multiprofessionalView .bfr-mp :is(input,select,textarea,button){min-width:0;max-width:100%;min-height:44px}
        #bfr-platform-toast{right:12px;bottom:calc(84px + env(safe-area-inset-bottom));max-width:calc(100vw - 24px)}
     }
    @media(max-width:360px){
       .bfr-mobile-appbar{gap:7px;padding-right:9px;padding-left:9px}
      .bfr-mobile-brand{gap:6px}
      .bfr-mobile-brand img{width:34px;height:34px}
      .bfr-mobile-brand span{font-size:13px}
       .bfr-mobile-action,.bfr-mobile-menu-button{flex-basis:38px;width:38px;height:38px}
       .bfr-mobile-lia{flex-basis:36px;width:36px;height:36px}
      .bfr-mobile-bottom-nav{padding-right:5px;padding-left:5px;gap:1px}
      .bfr-mobile-bottom-nav button{font-size:8px}
      .bfr-exec-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important} /* Direção: 2 col ≤360, mantém alvo 44px, -138px de rolagem */
      .bfr-exec-table tbody tr{grid-template-columns:1fr}
      .bfr-exec-table tbody td:first-child{grid-column:auto}
    }
    @media(orientation:landscape) and (max-width:800px){
      .bfr-mobile-appbar{height:52px}
      .bfr-mobile-bottom-nav{min-height:calc(62px + env(safe-area-inset-bottom));padding-top:3px}
      .bfr-mobile-bottom-nav button{min-height:44px}
      #mobileMoreMenu{max-height:calc(100dvh - 84px - env(safe-area-inset-bottom))!important}
      #appShell.ready>main>.content{padding-bottom:calc(94px + env(safe-area-inset-bottom))!important}
    }
    @media(orientation:landscape) and (max-width:1000px) and (max-height:500px){
      .lia-overlay{z-index:1400!important;align-items:stretch!important;padding:0!important;background:#f8fbff!important}
      .lia-chat{width:100%!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important}
      #appShell.ready{display:block!important;min-height:100dvh;padding-bottom:calc(72px + env(safe-area-inset-bottom))!important}
      #appShell.ready>.sidebar{display:none!important}
       #appShell.ready>main>.topbar{display:none!important}
      #appShell.ready>main>.content{padding:10px 12px calc(80px + env(safe-area-inset-bottom))!important}
      .bfr-mobile-header{display:flex!important}
        .bfr-mobile-bottom-nav{position:fixed!important;right:0!important;bottom:0!important;left:0!important;z-index:1200!important;display:grid!important;grid-template-columns:repeat(var(--bfr-nav-count,4),minmax(0,1fr))!important;gap:2px!important;min-height:calc(62px + env(safe-area-inset-bottom))!important;padding:3px 8px calc(4px + env(safe-area-inset-bottom))!important;border-top:1px solid #dbe5f1!important;border-radius:14px 14px 0 0!important;background:rgba(255,255,255,.98)!important;box-shadow:0 -8px 28px rgba(20,45,83,.12)!important}
        .bfr-mobile-bottom-nav button{appearance:none!important;-webkit-appearance:none!important;display:grid!important;grid-template-rows:20px 1fr!important;align-content:center!important;justify-items:center!important;min-width:0!important;min-height:44px!important;margin:0!important;padding:3px 2px!important;border:1px solid transparent!important;border-radius:12px!important;color:#62748d!important;background:transparent!important;font:700 9px/1.1 'DM Sans',sans-serif!important;white-space:normal!important;overflow-wrap:anywhere;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .bfr-mobile-bottom-nav button[aria-current="page"]{border-color:#d4e5fb!important;color:#1558bd!important;background:#f1f7ff!important}
        .bfr-direction-executive [data-exec-view]{scroll-margin-top:calc(58px + env(safe-area-inset-top))}
       #mobileMoreMenu{display:none!important}
      .bfr-direction-executive{padding:9px!important}
    }
    /* Rótulo da barra inferior do professor a 11px: eram 9px (8px no estreito e 9px
       !important no paisagem), abaixo do piso de 11px que o próprio app adota nos demais
       textos móveis. O nav é filho de <body>, não de #appShell, então o escopo vem do
       data-bfr-role que createNav() grava — assim os outros perfis continuam com o
       tamanho que já tinham. A barra é display:none acima de 800px: não alcança o desktop. */
    #bfrMobileBottomNav[data-bfr-role="teacher"] button,#bfrMobileBottomNav[data-bfr-role="pedagogical"] button{font-size:11px!important}
  `;
  document.head.append(style);

  function routes() {
    const seed = role() === 'director' ? directorItems.map(([label, icon, route]) => ({ label, icon, route })) : [];
    const available = new Map([...seed, ...drawerItems()].map(item => [item.route, item]));
    const labels = { inicio:'Início', notas:'Boletim', boletim:'Boletim', agenda:'Agenda', 'agenda-aluno':'Agenda', atividades:'Atividades', jogos:'Jogos', 'professor-inicio':'Início', 'professor-turmas':'Turmas', 'professor-atividades':'Atividades', 'professor-frequencia':'Frequência', 'professor-agenda':'Agenda', coordenacao:'Coordenação', monitor:'Monitor', gate:'Portaria', aee:'AEE', psychology:'Psicologia', multiprofissional:'Equipe de apoio', 'cadastro-alunos':'Alunos', administracao:'Administração', notificacoes:'Avisos', 'jogos-escolares':'Jogos' };
    const icons = {'inicio':'🏠','notas':'📝','boletim':'📊','agenda':'📅','agenda-aluno':'📅','atividades':'📚','jogos':'🎮','coordenacao':'🎯','horarios':'🕐','ocorrencias':'⚠️','comunicados':'📣','relatorios':'📊','fotos':'📷','chat-interno':'💬','cadastro-alunos':'🧑‍🎓','administracao':'🛠️','notificacoes':'🔔','jogos-escolares':'🏆','aee':'🧩','professor-inicio':'🏠','professor-turmas':'🎓','professor-atividades':'📚','professor-frequencia':'✅','professor-agenda':'📅','director:overview':'🏠','director:pedagogical':'📈','director:students':'🎓','director:communication':'💬','director:reports':'📊'};
    const teacherRole = ['teacher','pedagogical'].includes(role());
    const primary = quickRoutes[role()] || [...available.keys()].slice(0, 4);
    const items = primary.map(route => {
      const item = available.get(route);
      return item ? [labels[route] || item.label, icons[route] || item.icon, route] : null;
      }).filter(Boolean).slice(0, 4);
    if (!teacherRole) items.push(['Mais', '⋯', 'more']);
    return items;
  }

  function createNav() {
    let nav = document.getElementById('bfrMobileBottomNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'bfrMobileBottomNav';
      nav.className = 'bfr-mobile-bottom-nav';
      nav.setAttribute('aria-label', 'Navegação Mobile');
      document.body.append(nav);
    }
    const items = routes();
    const signature = `${role()}|${JSON.stringify(items)}`;
    if (nav.dataset.signature !== signature) {
      nav.dataset.signature = signature;
      nav.innerHTML = items.map(([label, icon, route]) => `<button type="button" data-bfr-mobile-route="${esc(route)}" aria-label="${esc(label)}"${route === 'more' ? ' aria-haspopup="dialog" aria-controls="bfrMobileDrawer" aria-expanded="false"' : ''}><span class="bfr-mobile-icon" aria-hidden="true">${esc(icon)}</span><span>${esc(label)}</span></button>`).join('');
    }
    setData(nav, 'bfrRole', String(role() || ''));
    const count = String(items.length);
    if (nav.style.getPropertyValue('--bfr-nav-count') !== count) nav.style.setProperty('--bfr-nav-count', count);
    setCls(document.body, 'bfr-mobile-presentation', mobile.matches);
    setAttr(app(), 'data-presentation', mobile.matches ? 'mobile' : innerWidth <= 1100 ? 'tablet' : 'web');
  }

  function setMenu(open) { setDrawer(open); }

  function navigate(route) {
    if (route === 'comunicacao' && window.BFRCommunication?.open) {
      window.BFRCommunication.open();
      const view = document.querySelector('#bfrCommunicationView');
      if (view?.querySelector('.bfr-communication-shell')) {
        window.setTimeout(() => {
          if (!view.isConnected) return;
          document.querySelectorAll('#appShell .content').forEach(item => item.classList.toggle('hidden', item !== view));
          view.scrollIntoView({ behavior:'smooth', block:'start' });
        }, 0);
      }
      setCurrentRoute(route);
      return;
    }
    if (route === 'director:communication') {
      setCurrentRoute(route);
      window.BFRDirectionOperations?.open?.('comunicacao') ?? window.BFRCommunication?.open?.();
      const breadcrumb = document.querySelector('.breadcrumb b');
      if (breadcrumb) breadcrumb.textContent = 'Comunicação';
      window.setTimeout(() => (document.querySelector('#bfrCommunicationView:not(.hidden)') || document.querySelector('.bfr-communication-form')?.closest('.content'))?.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
      return;
    }
    if (route.startsWith('director:')) {
      const screen = route.slice('director:'.length);
      const runtime = window.BFR_APP_RUNTIME;
      const showScreen = () => {
        const button = document.querySelector(`.bfr-direction-executive [data-exec-screen="${screen}"]`);
        if (button) button.click();
        else window.BFRDirectionOperations?.open?.('relatorios');
      };
      if (runtime?.activeView !== 'director' || runtime.activeSection !== 'direcao') {
        const direction = document.querySelector('#appShell [data-section="direcao"]');
        if (direction) direction.click(); else runtime?.navigate?.('direcao');
        window.setTimeout(showScreen, 0);
      } else showScreen();
      return;
    }
    const candidates = [...document.querySelectorAll('#appShell [data-section]')]
      .filter(node => node.dataset.section === route && !node.classList.contains('hidden'));
    const canonical = candidates.find(node => node.closest('.bfr-platform-nav')) || candidates.find(node => node.closest('.bfr-legacy-nav')) || candidates[0];
    if (canonical) canonical.click();
    else window.BFR_APP_RUNTIME?.navigate?.(route);
    setCurrentRoute(route);
  }

  document.addEventListener('click', event => {
    const openDrawer = event.target.closest('[data-bfr-open-drawer]');
    if (openDrawer) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      drawerTrigger = openDrawer;
      setDrawer(true);
      return;
    }
    if (event.target.closest('[data-bfr-close-drawer],[data-bfr-drawer-backdrop]')) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      setDrawer(false);
      return;
    }
    const drawerRoute = event.target.closest('#bfrMobileDrawer [data-bfr-drawer-route]');
    if (drawerRoute) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      navigate(drawerRoute.dataset.bfrDrawerRoute);
      setDrawer(false);
      return;
    }
    const drawerTool = event.target.closest('#bfrMobileDrawer [data-bfr-drawer-tool]');
    if (drawerTool) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      document.querySelector(`#appShell .sidebar [data-account-tool="${drawerTool.dataset.bfrDrawerTool}"]`)?.click();
      setDrawer(false);
      return;
    }
    if (event.target.closest('#bfrMobileDrawer [data-bfr-drawer-logout]')) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      document.querySelector('#appShell .sidebar #logoutBtn')?.click();
      setDrawer(false);
      return;
    }
    if (event.target.closest('[data-bfr-mobile-notifications]')) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      document.getElementById('notificationBtn')?.click();
      return;
    }
    if (event.target.closest('[data-bfr-mobile-profile]')) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      document.querySelector('#appShell .sidebar [data-account-tool="profile"]')?.click();
      return;
    }
    const routeButton = event.target.closest('#bfrMobileBottomNav [data-bfr-mobile-route]');
    if (routeButton) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const route = routeButton.dataset.bfrMobileRoute;
      if (route === 'more') { drawerTrigger = routeButton; setCurrentRoute(null); setMenu(!document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')); }
      else navigate(route);
      return;
    }
    const moduleButton = event.target.closest('#mobileMoreMenu [data-direction-module]');
    if (moduleButton) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      window.BFRDirectionOperations?.open?.(moduleButton.dataset.directionModule);
      setMenu(false);
      return;
    }
    const menuOption = event.target.closest('#mobileMoreMenu .mobile-more-option[data-section]');
    if (menuOption) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      navigate(menuOption.dataset.section);
      setMenu(false);
      return;
    }
    if (event.target.closest('#mobileMoreMenu [data-mobile-more-close]')) { setMenu(false); return; }
    const executiveScreen = event.target.closest('.bfr-direction-executive [data-exec-screen]');
    if (executiveScreen) window.setTimeout(() => activateDirectorScreen(executiveScreen.dataset.execScreen), 0);
    if (mobile.matches && !event.target.closest('#bfrMobileDrawer,#bfrMobileBottomNav,#bfrMobileAppbar') && document.getElementById('bfrMobileDrawer')?.classList.contains('is-open')) setMenu(false);
  }, true);

  document.addEventListener('keydown', event => {
    const drawer = document.getElementById('bfrMobileDrawer');
    if (!drawer?.classList.contains('is-open')) return;
    if (event.key === 'Escape') { setMenu(false); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...drawer.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.matches('[data-bfr-drawer-backdrop]') && getComputedStyle(node).display !== 'none');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });

  function decorateExecutive() {
    const executive = document.querySelector('.bfr-direction-executive');
    if (!executive) return;
    executive.querySelectorAll('.bfr-exec-table').forEach(table => {
      const labels = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row => { addCls(row, 'bfr-mobile-card'); [...row.cells].forEach((cell, index) => { if (labels[index]) setData(cell, 'label', labels[index]); }); });
    });
    const quick = executive.querySelector('.bfr-exec-quick');
    if (quick && !quick.closest('details')) {
      const details = document.createElement('details');
      details.className = 'bfr-mobile-actions';
      details.innerHTML = '<summary>Ações rápidas</summary>';
      quick.before(details); details.append(quick);
    }
    const filters = executive.querySelector('.bfr-exec-filters');
    if (filters && !filters.closest('details')) {
      const details = document.createElement('details');
      details.className = 'bfr-mobile-filters';
      details.innerHTML = '<summary>Filtros e período</summary>';
      filters.before(details); details.append(filters);
    }
  }

  // O realce da barra de baixo, extraído do corpo do sync() para poder ser chamado sozinho.
  // É idempotente e só escreve quando o valor muda (setAttr é guardado), então chamá-lo sob churn
  // de mutação custa quatro comparações por pintura, não uma reconstrução de painel.
  function paintHighlight() {
    const shell = app();
    if (!shell) return;
    const executive = shell.querySelector('.bfr-direction-executive');
    const activeScreen = role() === 'director' ? executive?.querySelector('.bfr-exec-tabs [data-exec-screen].active')?.dataset.execScreen : '';
    const previousDirectorRoute = document.querySelector('#bfrMobileBottomNav [aria-current="page"][data-bfr-mobile-route^="director:"]')?.dataset.bfrMobileRoute;
    const route = activeScreen ? `director:${activeScreen}` : previousDirectorRoute || activeRoute();
    document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]').forEach(button => setAttr(button, 'aria-current', button.dataset.bfrMobileRoute === route ? 'page' : 'false'));
  }

  const sync = () => {
    const shell = app();
    if (!shell) return;
    if (!shell.classList.contains('ready')) {
      document.getElementById('bfrMobileBottomNav')?.remove();
      document.getElementById('bfrMobileAppbar')?.remove();
      document.getElementById('bfrMobileDrawer')?.remove();
      document.querySelector('[data-bfr-desktop-lia]')?.remove();
      setCls(document.body, 'bfr-mobile-drawer-open', false);
      return;
    }
    ensureDesktopLia();
    if (mobile.matches) ensureMobileChrome();
    else {
      document.getElementById('bfrMobileAppbar')?.remove();
      document.getElementById('bfrMobileDrawer')?.remove();
      setCls(document.body, 'bfr-mobile-drawer-open', false);
    }
    addCls(shell.querySelector(':scope > .sidebar'), 'bfr-web-sidebar');
    setCls(shell.querySelector(':scope > main > .topbar'), 'bfr-mobile-header', mobile.matches);
    setCls(shell.querySelector(':scope > main > .topbar'), 'bfr-web-header', !mobile.matches);
    addCls(shell.querySelector('.bfr-direction-executive'), 'bfr-web-dashboard');
    shell.querySelectorAll('.bfr-exec-table-wrap').forEach(node => addCls(node, 'bfr-web-table'));
    createNav(); decorateExecutive();
    document.getElementById('bfrQuickStudentShortcut')?.toggleAttribute('hidden', mobile.matches && Boolean(document.querySelector('#bfrCommunicationView:not(.hidden)')));
    document.querySelectorAll('#mobileMoreMenu [data-direction-module]').forEach(node => setCls(node, 'hidden', !['developer','director'].includes(role())));
    const executive = shell.querySelector('.bfr-direction-executive');
    const activeScreen = role() === 'director' ? executive?.querySelector('.bfr-exec-tabs [data-exec-screen].active')?.dataset.execScreen : '';
    const previousDirectorRoute = document.querySelector('#bfrMobileBottomNav [aria-current="page"][data-bfr-mobile-route^="director:"]')?.dataset.bfrMobileRoute;
    const route = activeScreen ? `director:${activeScreen}` : previousDirectorRoute || activeRoute();
    // Um único passe: antes era "falso para todos" e depois "page" no atual, o que escrevia
    // duas vezes no mesmo botão a cada ciclo.
    document.querySelectorAll('#bfrMobileBottomNav [data-bfr-mobile-route]').forEach(button => setAttr(button, 'aria-current', button.dataset.bfrMobileRoute === route ? 'page' : 'false'));
    updateIdentity();
  };

  let timer;
  // Debounce puro morre de fome: cronômetro 60 ms rearmandado por ~90 lotes de mutação por segundo
  // nunca vence. O teto garante uma pintura a cada 250 ms mesmo sem página quieta — e no teto só pinta
  // o realce, porque rodar o sync inteiro sob churn amplificaria o próprio churn que o dispara.
  const PISO = 60, TETO = 250;
  let desde = 0;
  const dispara = () => { timer = null; desde = 0; sync(); };
  const pintaSozinho = () => { timer = null; desde = Date.now(); paintHighlight(); };
  const schedule = () => {
    const agora = Date.now();
    if (!desde) desde = agora;
    if (timer) clearTimeout(timer);
    if (agora - desde >= TETO) { pintaSozinho(); return; }
    timer = setTimeout(dispara, PISO);
  };
  mobile.addEventListener('change', schedule);
  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('bfr:app-ready', schedule);
  window.addEventListener('bfr:role-change', schedule);
  // O app emite bfr:navigation em todo navigateToSection (index.html:8813, 8819 e 8885), mas este
  // módulo só se repaintia por Mutação de CLASSE (attributeFilter:['class']) com debounce de 60 ms.
  // A nav de plataforma troca aria-current/hidden, não classe: o destaque da barra de baixo parava
  // na rota anterior. Medido no operador real @390 — em conteudos o destaque ficou em notificacoes e
  // em jogos-escolares nenhum item destacou, com activeSection já correta nos dois casos.
  window.addEventListener('bfr:navigation', schedule);
  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  schedule();
})();
